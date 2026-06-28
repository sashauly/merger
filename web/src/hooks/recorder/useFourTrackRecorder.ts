import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RecorderController } from "../../audio/recorder/RecorderController";
import {
  mapKeyboardEventToCommand,
  mapMidiMessageToCommand,
  type ControlCommand,
} from "../../audio/recorder/controlMaps";
import {
  enumerateAudioDevices,
  type AudioDeviceList,
} from "../../audio/recorder/devices";
import { createDiagnostic, logDiagnostic } from "../../audio/recorder/errors";
import { triggerHaptic } from "../../audio/recorder/haptics";
import {
  DEFAULT_BUFFER_LEN,
  DEFAULT_SAMPLE_RATE,
  type RecordMode,
  type RecorderState,
} from "../../audio/recorder/types";
import {
  createEmptyWaveforms,
  downsamplePeaks,
  updateWaveformPointRange,
} from "../../audio/recorder/waveform";
import {
  loadRecorderPreferences,
  saveRecorderPreferences,
  type GridResolution,
} from "./preferences";
import {
  getRecorderStatusSeverity,
  type RecorderStatusSeverity,
} from "./status";

const fallbackState: RecorderState = {
  isReady: false,
  isPlaying: false,
  isRecording: false,
  recordArmChannel: -1,
  playHead: 0,
  playTime: 0,
  bufferLen: DEFAULT_BUFFER_LEN,
  durationSeconds: 180,
  sampleRate: DEFAULT_SAMPLE_RATE,
  volumes: [1, 1, 1, 1],
  pans: [0, 0, 0, 0],
  mutes: [false, false, false, false],
  solos: [false, false, false, false],
  peaks: [0, 0, 0, 0],
  inputPeak: 0,
  bpm: 120,
  recordMode: "overdub",
  noiseSuppression:true,
  echoCancellation:true,
  startPlaybackWithRecord: true,
  insertMarkerSample: 0,
  insertMarkerBBM: "1.1.1",
  currentPlayheadBBM: "1.1.1",
  engineError: null,
  inputError: null,
  outputError: null,
  diagnostics: [],
};

export interface UseFourTrackRecorderResult {
  state: RecorderState;
  devices: AudioDeviceList;
  selectedInputId: string;
  selectedOutputId: string;
  waveforms: number[][];
  loading: boolean;
  exporting: boolean;
  hasTapeContent: boolean;
  lastExportUrl: string | null;
  gridResolution: GridResolution;
  tempoValidation: string | null;
  statusSeverity: RecorderStatusSeverity;
  hapticsEnabled: boolean;
  midiInputs: string[];
  lastMidiMessage: string;
  midiActive: boolean;
  midiEnabled: boolean;
  midiPermission: "disabled" | "unsupported" | "prompt" | "granted" | "denied";
  actions: {
    init: () => Promise<void>;
    play: () => Promise<void>;
    pause: () => Promise<void>;
    stop: () => Promise<void>;
    record: () => Promise<void>;
    stopRecording: () => void;
    rewind: () => void;
    setPlayheadFromTimelineRatio: (ratio: number) => void;
    setPlayTime: (seconds: number) => void;
    setBpm: (bpm: number) => void;
    setGridResolution: (resolution: GridResolution) => void;
    setRecordMode: (mode: RecordMode) => void;
    setNoiseSuppression: (enabled: boolean) => Promise<void>;
    setEchoCancellation: (enabled: boolean) => Promise<void>;
    setRecordArm: (channel: number) => void;
    cycleArm: () => void;
    setVolume: (channel: number, value: number) => void;
    setPan: (channel: number, value: number) => void;
    setMute: (channel: number, mute: boolean) => void;
    setSolo: (channel: number, solo: boolean) => void;
    toggleMute: (channel: number) => void;
    toggleSolo: (channel: number) => void;
    clearTrack: (channel: number) => void;
    clearAll: () => void;
    importAudioFile: (channel: number, file: File) => Promise<void>;
    exportWav: () => void;
    setInputDevice: (deviceId: string) => Promise<void>;
    setOutputDevice: (deviceId: string) => Promise<void>;
    refreshDevices: () => Promise<void>;
    dismissDiagnostic: (id: string) => void;
    enableMidi: () => Promise<void>;
    setHapticsEnabled: (enabled: boolean) => void;
  };
}

export const useFourTrackRecorder = (): UseFourTrackRecorderResult => {
  const initialPreferencesRef = useRef(loadRecorderPreferences());
  const controllerRef = useRef<RecorderController | null>(null);
  const stateRef = useRef<RecorderState>(fallbackState);
  const activityTimeout = useRef<number | null>(null);
  const exportingRef = useRef(false);
  const [state, setState] = useState<RecorderState>(() => ({
    ...fallbackState,
    bpm: initialPreferencesRef.current.bpm,
    recordMode: initialPreferencesRef.current.recordMode,
    volumes: initialPreferencesRef.current.volumes,
    pans: initialPreferencesRef.current.pans,
  }));
  const [noiseSuppression, setNoiseSuppression] = useState(
    initialPreferencesRef.current.noiseSuppression,
  );
  const [echoCancellation, setEchoCancellation] = useState(
    initialPreferencesRef.current.echoCancellation,
  );
  const [devices, setDevices] = useState<AudioDeviceList>({
    inputs: [],
    outputs: [],
  });
  const [selectedInputId, setSelectedInputId] = useState(
    initialPreferencesRef.current.selectedInputId,
  );
  const [selectedOutputId, setSelectedOutputId] = useState(
    initialPreferencesRef.current.selectedOutputId,
  );
  // Inside useFourTrackRecorder.ts
  const [waveforms, setWaveforms] = useState<number[][]>(
    () => createEmptyWaveforms(4, 800), // Changed from default 150 to 800 for high-fidelity detail
  );
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasTapeContent, setHasTapeContent] = useState(false);
  const [lastExportUrl, setLastExportUrl] = useState<string | null>(null);
  const [gridResolution, setGridResolution] = useState<GridResolution>(
    initialPreferencesRef.current.gridResolution,
  );
  const [tempoValidation, setTempoValidation] = useState<string | null>(null);
  const [midiInputs, setMidiInputs] = useState<string[]>([]);
  const [lastMidiMessage, setLastMidiMessage] = useState("");
  const [midiActive, setMidiActive] = useState(false);
  const [midiEnabled, setMidiEnabled] = useState(
    initialPreferencesRef.current.midiEnabled,
  );
  const [midiPermission, setMidiPermission] =
    useState<UseFourTrackRecorderResult["midiPermission"]>("disabled");
  const [hapticsEnabled, setHapticsEnabled] = useState(
    initialPreferencesRef.current.hapticsEnabled,
  );
  const midiAccessRef = useRef<MIDIAccess | null>(null);

  const setExportingState = useCallback((next: boolean) => {
    exportingRef.current = next;
    setExporting(next);
  }, []);

  const snapshotHasAudio = useCallback(
    (tracks: Float32Array[]) =>
      tracks.some((track) => track.some((sample) => Math.abs(sample) > 0.0001)),
    [],
  );

  useEffect(() => {
    const controller = new RecorderController();
    const preferences = initialPreferencesRef.current;
    controller.setBpm(preferences.bpm);
    controller.setRecordMode(preferences.recordMode);
    preferences.volumes.forEach((volume, channel) =>
      controller.setVolume(channel, volume),
    );
    preferences.pans.forEach((pan, channel) => controller.setPan(channel, pan));
    controllerRef.current = controller;

    // 1. Update the state subscription to draw recording data in real-time
    const unsubscribeState = controller.subscribe((nextState) => {
      const oldPlayHead = stateRef.current.playHead;

      stateRef.current = nextState;
      setState(nextState);

      if (nextState.isRecording && nextState.recordArmChannel >= 0) {
        setWaveforms((current) =>
          updateWaveformPointRange(
            current,
            nextState.recordArmChannel,
            oldPlayHead,
            nextState.playHead,
            nextState.bufferLen,
            nextState.inputPeak,
            nextState.recordMode === "overdub",
          ),
        );
      }
    });

    const unsubscribeExport = controller.subscribeExport((blob) => {
      setExportingState(false);
      const url = URL.createObjectURL(blob);
      setLastExportUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `portastudio-mix-${Date.now()}.wav`;
      anchor.click();
    });

    // 2. Add a guard to the snapshot subscription
    const unsubscribeSnapshot = controller.subscribeSnapshot((snapshot) => {
      // Safety Guard: Avoid overwriting the live drawing with an incomplete
      // snapshot while we are still actively writing to the tape.
      if (stateRef.current.isRecording) return;

      const hasAudio = snapshotHasAudio(snapshot.tracks);
      setHasTapeContent(hasAudio);
      if (exportingRef.current && !hasAudio) setExportingState(false);
      setWaveforms((current) =>
        current.map((wave, index) =>
          downsamplePeaks(
            snapshot.tracks[index] || new Float32Array(),
            wave.length,
          ),
        ),
      );
    });

    return () => {
      unsubscribeState();
      unsubscribeExport();
      unsubscribeSnapshot();
      controller.destroy();
      if (activityTimeout.current) window.clearTimeout(activityTimeout.current);
      if (midiAccessRef.current) {
        Array.from(midiAccessRef.current.inputs.values()).forEach((input) => {
          input.onmidimessage = null;
        });
        midiAccessRef.current.onstatechange = null;
      }
    };
  }, [setExportingState, snapshotHasAudio]);

  useEffect(() => {
    saveRecorderPreferences({
      bpm: state.bpm,
      gridResolution,
      recordMode: state.recordMode,
      noiseSuppression,
      echoCancellation,
      selectedInputId,
      selectedOutputId,
      volumes: state.volumes,
      pans: state.pans,
      hapticsEnabled,
      midiEnabled,
    });
  }, [
    gridResolution,
    hapticsEnabled,
    midiEnabled,
    selectedInputId,
    selectedOutputId,
    noiseSuppression,
    echoCancellation,
    state.bpm,
    state.pans,
    state.recordMode,
    state.volumes,
  ]);

  const refreshDevices = useCallback(async () => {
    const list = await enumerateAudioDevices();
    setDevices(list);
    setSelectedInputId((current) =>
      list.inputs.some((device) => device.deviceId === current)
        ? current
        : "default",
    );
    setSelectedOutputId((current) =>
      list.outputs.some((device) => device.deviceId === current)
        ? current
        : "default",
    );
  }, []);

  const init = useCallback(async () => {
    if (loading || stateRef.current.isReady) return;
    setLoading(true);
    try {
      await controllerRef.current?.init({
        inputId: selectedInputId,
        outputId: selectedOutputId,
      });
      await refreshDevices();
    } finally {
      setLoading(false);
    }
  }, [loading, refreshDevices, selectedInputId, selectedOutputId]);

  const runCommand = useCallback(async (command: ControlCommand | null) => {
    if (!command) return;
    const controller = controllerRef.current;
    const current = stateRef.current;
    if (!controller) return;
    switch (command.action) {
      case "play":
        await controller.play();
        break;
      case "pause":
        await controller.pause();
        break;
      case "stop":
        await controller.stop();
        break;
      case "record":
        await controller.record();
        break;
      case "rewind":
        controller.rewind();
        break;
      case "cycleArm":
        controller.setRecordArm(((current.recordArmChannel + 2) % 6) - 1);
        break;
      case "toggleMute":
        if (command.channel !== undefined)
          controller.setMute(command.channel, !current.mutes[command.channel]);
        break;
      case "toggleSolo":
        if (command.channel !== undefined)
          controller.setSolo(command.channel, !current.solos[command.channel]);
        break;
      case "setVolume":
        if (command.channel !== undefined && command.value !== undefined)
          controller.setVolume(command.channel, command.value);
        break;
      case "setPan":
        if (command.channel !== undefined && command.value !== undefined)
          controller.setPan(command.channel, command.value);
        break;
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
    navigator.mediaDevices?.addEventListener("devicechange", refreshDevices);
    return () =>
      navigator.mediaDevices?.removeEventListener(
        "devicechange",
        refreshDevices,
      );
  }, [refreshDevices]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(
          document.activeElement?.tagName || "",
        )
      )
        return;
      const command = mapKeyboardEventToCommand(event);
      if (!command) return;
      event.preventDefault();
      triggerHaptic(
        command.action === "stop" || command.action === "record"
          ? "heavy"
          : "tap",
      );
      void runCommand(command);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [runCommand]);

  const attachMidiAccess = useCallback(
    (access: MIDIAccess) => {
      const onMIDIMessage = (event: MIDIMessageEvent) => {
        const command = event.data ? mapMidiMessageToCommand(event.data) : null;
        setMidiActive(true);
        if (activityTimeout.current)
          window.clearTimeout(activityTimeout.current);
        activityTimeout.current = window.setTimeout(
          () => setMidiActive(false),
          150,
        );
        if (event.data) setLastMidiMessage(Array.from(event.data).join(" "));
        void runCommand(command);
      };
      const updateInputs = () => {
        const inputs = Array.from(access.inputs.values());
        setMidiInputs(inputs.map((input) => input.name || "Unknown Device"));
        inputs.forEach((input) => {
          input.onmidimessage = onMIDIMessage;
        });
      };
      midiAccessRef.current = access;
      updateInputs();
      access.onstatechange = updateInputs;
    },
    [runCommand],
  );

  const enableMidi = useCallback(async () => {
    if (!navigator.requestMIDIAccess) {
      setMidiPermission("unsupported");
      logDiagnostic(createDiagnostic("midi.unsupported"));
      return;
    }
    setMidiPermission("prompt");
    try {
      const access = await navigator.requestMIDIAccess();
      setMidiEnabled(true);
      setMidiPermission("granted");
      attachMidiAccess(access);
    } catch (error) {
      setMidiEnabled(false);
      setMidiPermission("denied");
      logDiagnostic(
        createDiagnostic("midi.permission_denied", { cause: error }),
      );
    }
  }, [attachMidiAccess]);

  const actions = useMemo<UseFourTrackRecorderResult["actions"]>(
    () => ({
      init,
      play: async () => {
        await controllerRef.current?.play();
      },
      pause: async () => {
        await controllerRef.current?.pause();
      },
      stop: async () => {
        await controllerRef.current?.stop();
      },
      record: async () => {
        await controllerRef.current?.record();
      },
      stopRecording: () => controllerRef.current?.stopRecording(),
      rewind: () => controllerRef.current?.rewind(),
      setPlayheadFromTimelineRatio: (ratio) => {
        const current = stateRef.current;
        const rawSample = Math.floor(
          Math.max(0, Math.min(1, ratio)) * current.bufferLen,
        );
        controllerRef.current?.setPlayTime(rawSample / current.sampleRate);
      },
      setPlayTime: (seconds) => controllerRef.current?.setPlayTime(seconds),
      setBpm: (bpm) => {
        if (!Number.isFinite(bpm)) {
          setTempoValidation("Enter a BPM between 20 and 300.");
          return;
        }
        setTempoValidation(
          bpm < 20 || bpm > 300 ? "BPM is clamped to 20-300." : null,
        );
        controllerRef.current?.setBpm(bpm);
      },
      setGridResolution,
      setRecordMode: (mode) => controllerRef.current?.setRecordMode(mode),
      setNoiseSuppression: async (enabled) => {
        setNoiseSuppression(enabled);
        controllerRef.current?.setNoiseSuppression(enabled);
        // Force-recreate mic stream using the current device ID to apply constraints securely
        await controllerRef.current?.setInputDevice(selectedInputId);
      },
      setEchoCancellation: async (enabled) => {
        setEchoCancellation(enabled);
        controllerRef.current?.setEchoCancellation(enabled);
        // Force-recreate mic stream using the current device ID to apply constraints securely
        await controllerRef.current?.setInputDevice(selectedInputId);
      },
      setRecordArm: (channel) => controllerRef.current?.setRecordArm(channel),
      cycleArm: () => {
        void runCommand({ action: "cycleArm" });
      },
      setVolume: (channel, value) =>
        controllerRef.current?.setVolume(channel, value),
      setPan: (channel, value) => controllerRef.current?.setPan(channel, value),
      setMute: (channel, mute) => controllerRef.current?.setMute(channel, mute),
      setSolo: (channel, solo) => controllerRef.current?.setSolo(channel, solo),
      toggleMute: (channel) => {
        void runCommand({ action: "toggleMute", channel });
      },
      toggleSolo: (channel) => {
        void runCommand({ action: "toggleSolo", channel });
      },
      clearTrack: (channel) => {
        controllerRef.current?.clearTrack(channel);
        if (channel >= 0) {
          setWaveforms((current) =>
            current.map((wave, index) =>
              index === channel ? Array(wave.length).fill(0) : wave,
            ),
          );
          controllerRef.current?.requestTrackSnapshot();
        }
      },
      clearAll: () => {
        controllerRef.current?.clearTrack(-1);
        setWaveforms(createEmptyWaveforms());
        setHasTapeContent(false);
        setExportingState(false);
        setLastExportUrl(null);
      },
      importAudioFile: async (channel, file) => {
        setLoading(true);
        try {
          const mono = await controllerRef.current?.importAudioFile(
            channel,
            file,
          );
          if (mono) {
            if (mono.some((sample) => Math.abs(sample) > 0.0001))
              setHasTapeContent(true);
            setWaveforms((current) =>
              current.map((wave, index) =>
                index === channel ? downsamplePeaks(mono, wave.length) : wave,
              ),
            );
          }
        } finally {
          setLoading(false);
        }
      },
      exportWav: () => {
        if (!hasTapeContent) {
          setExportingState(false);
          return;
        }
        setExportingState(true);
        setLastExportUrl(null);
        controllerRef.current?.requestExportWav();
      },
      setInputDevice: async (deviceId) => {
        setSelectedInputId(deviceId);
        await controllerRef.current?.setInputDevice(deviceId);
        await refreshDevices();
      },
      setOutputDevice: async (deviceId) => {
        setSelectedOutputId(deviceId);
        await controllerRef.current?.setOutputDevice(deviceId);
      },
      refreshDevices,
      dismissDiagnostic: (id) => controllerRef.current?.dismissDiagnostic(id),
      enableMidi,
      setHapticsEnabled,
    }),
    [
      enableMidi,
      hasTapeContent,
      init,
      refreshDevices,
      runCommand,
      setExportingState,
    ],
  );

  const statusSeverity = useMemo<RecorderStatusSeverity>(
    () => getRecorderStatusSeverity(state.diagnostics),
    [state.diagnostics],
  );

  return {
    state,
    devices,
    selectedInputId,
    selectedOutputId,
    waveforms,
    loading,
    exporting,
    hasTapeContent,
    lastExportUrl,
    gridResolution,
    tempoValidation,
    statusSeverity,
    hapticsEnabled,
    midiInputs,
    lastMidiMessage,
    midiActive,
    midiEnabled,
    midiPermission,
    actions,
  };
};
