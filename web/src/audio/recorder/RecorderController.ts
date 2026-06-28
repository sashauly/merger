import wasmUrl from "../../wasm/core_audio_bg.wasm?url";
import { getRecorderEnvironmentDiagnostics } from "./environment";
import {
  createDiagnostic,
  logDiagnostic,
  type RecorderDiagnosticCode,
} from "./errors";
import { decodeFileToMono } from "./importAudio";
import { getSilentInputDecision } from "./inputSignal";
import { buildRuntimeStateCommands } from "./runtimeState";
import { clamp, sampleToBBM, sampleToSeconds, secondsToSample } from "./time";
import {
  DEFAULT_BUFFER_LEN,
  DEFAULT_DURATION_SECONDS,
  DEFAULT_SAMPLE_RATE,
  TRACK_COUNT,
  type RecordMode,
  type RecorderEvent,
  type RecorderExportListener,
  type RecorderSnapshot,
  type RecorderSnapshotListener,
  type RecorderState,
  type RecorderStateListener,
} from "./types";
import { mixTracksToWav } from "./wav";

const initialState = (): RecorderState => ({
  isReady: false,
  isPlaying: false,
  isRecording: false,
  recordArmChannel: -1,
  playHead: 0,
  playTime: 0,
  bufferLen: DEFAULT_BUFFER_LEN,
  durationSeconds: DEFAULT_DURATION_SECONDS,
  sampleRate: DEFAULT_SAMPLE_RATE,
  volumes: Array(TRACK_COUNT).fill(1),
  pans: Array(TRACK_COUNT).fill(0),
  mutes: Array(TRACK_COUNT).fill(false),
  solos: Array(TRACK_COUNT).fill(false),
  peaks: Array(TRACK_COUNT).fill(0),
  inputPeak: 0,
  bpm: 120,
  recordMode: "overdub",
  noiseSuppression: true,
  echoCancellation: true,
  startPlaybackWithRecord: true,
  insertMarkerSample: 0,
  insertMarkerBBM: "1.1.1",
  currentPlayheadBBM: "1.1.1",
  engineError: null,
  inputError: null,
  outputError: null,
  diagnostics: [],
});

export class RecorderController {
  private audioCtx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private wasmBytes: ArrayBuffer | null = null;
  private initPromise: Promise<void> | null = null;
  private readyPromise: Promise<void> | null = null;
  private resolveReady: (() => void) | null = null;
  private rejectReady: ((error: Error) => void) | null = null;
  private state: RecorderState = initialState();
  private stateListeners = new Set<RecorderStateListener>();
  private exportListeners = new Set<RecorderExportListener>();
  private snapshotListeners = new Set<RecorderSnapshotListener>();
  private pendingExport = false;
  private pendingRecordingSnapshotChannel: number | null = null;
  private recordingStartedAt = 0;
  private noInputWarningActive = false;
  private readonly inputSignalThreshold = 0.0001;
  private readonly noInputGraceMs = 2000;

  subscribe(listener: RecorderStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  subscribeExport(listener: RecorderExportListener): () => void {
    this.exportListeners.add(listener);
    return () => this.exportListeners.delete(listener);
  }

  subscribeSnapshot(listener: RecorderSnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    return () => this.snapshotListeners.delete(listener);
  }

  getState(): RecorderState {
    return this.state;
  }

  getAudioContext(): AudioContext | null {
    return this.audioCtx;
  }

  async init(options?: { inputId?: string; outputId?: string }): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      if (options?.inputId) await this.setInputDevice(options.inputId);
      if (options?.outputId) await this.setOutputDevice(options.outputId);
      return;
    }

    this.initPromise = this.initialize(options).catch((error) => {
      this.initPromise = null;
      throw error;
    });
    await this.initPromise;
  }

  async play(): Promise<void> {
    await this.ensureReady();
    await this.resumeContext();
    this.post({ type: "PLAY" });
    this.patchState({ isPlaying: true, isRecording: false });
  }

  async pause(): Promise<void> {
    await this.ensureReady();
    await this.resumeContext();
    this.post({ type: "STOP" });
    this.patchState({ isPlaying: false, isRecording: false });
  }

  async stop(): Promise<void> {
    await this.ensureReady();
    this.post({ type: "STOP" });
    this.seekSample(0);
    this.patchState({
      isPlaying: false,
      isRecording: false,
      insertMarkerSample: 0,
    });
  }

  async record(): Promise<void> {
    await this.ensureReady();
    await this.resumeContext();
    if (this.state.isRecording) {
      this.post({ type: "STOP_RECORDING" });
      this.patchState({ isRecording: false, isPlaying: this.state.isPlaying });
      this.pendingRecordingSnapshotChannel = this.state.recordArmChannel;
      this.requestTrackSnapshot();
      return;
    }
    if (this.state.recordArmChannel === -1) {
      this.addDiagnostic("recording.no_armed_track");
      return;
    }
    if (this.state.inputError) {
      this.addDiagnostic("recording.no_input_signal");
    }
    this.recordingStartedAt = Date.now();
    this.noInputWarningActive = false;
    this.clearDiagnostic("recording.no_input_signal");
    this.clearDiagnostic("recording.no_recorded_input");
    this.post({ type: "START_RECORDING" });
    this.patchState({ isRecording: true, isPlaying: true });
  }

  stopRecording(): void {
    this.post({ type: "STOP_RECORDING" });
    this.pendingRecordingSnapshotChannel = this.state.recordArmChannel;
    this.patchState({ isRecording: false });
    this.requestTrackSnapshot();
  }

  rewind(): void {
    this.seekSample(0);
  }

  setInsertMarker(sampleIndex: number): void {
    const insertMarkerSample = clamp(
      Math.floor(sampleIndex),
      0,
      this.state.bufferLen - 1,
    );
    const patch: Partial<RecorderState> = { insertMarkerSample };
    if (!this.state.isPlaying) {
      this.seekSample(insertMarkerSample);
      patch.playHead = insertMarkerSample;
      patch.playTime = sampleToSeconds(
        insertMarkerSample,
        this.state.sampleRate,
      );
    }
    this.patchState(patch);
  }

  setPlayTime(seconds: number): void {
    this.seekSample(
      secondsToSample(seconds, this.state.sampleRate, this.state.bufferLen),
    );
  }

  setBpm(bpm: number): void {
    this.patchState({ bpm: clamp(Math.floor(bpm), 20, 300) });
  }

  setRecordMode(recordMode: RecordMode): void {
    this.post({
      type: "SET_RECORD_MODE_OVERDUB",
      payload: recordMode === "overdub",
    });
    this.patchState({ recordMode });
  }

  setNoiseSuppression(enabled: boolean): void {
    this.patchState({ noiseSuppression: enabled });
  }

  setEchoCancellation(enabled: boolean): void {
    this.patchState({ echoCancellation: enabled });
  }

  setStartPlaybackWithRecord(startPlaybackWithRecord: boolean): void {
    this.patchState({ startPlaybackWithRecord });
  }

  setRecordArm(recordArmChannel: number): void {
    const next =
      recordArmChannel >= -1 && recordArmChannel < TRACK_COUNT
        ? recordArmChannel
        : -1;
    this.post({ type: "SET_RECORD_ARM", payload: next });
    this.patchState({ recordArmChannel: next });
  }

  setVolume(channel: number, value: number): void {
    const val = clamp(value, 0, 1.5);
    this.updateChannelArray("volumes", channel, val);
    this.post({ type: "SET_VOLUME", payload: { channel, val } });
  }

  setPan(channel: number, value: number): void {
    const val = clamp(value, -1, 1);
    this.updateChannelArray("pans", channel, val);
    this.post({ type: "SET_PAN", payload: { channel, val } });
  }

  setMute(channel: number, mute: boolean): void {
    this.updateChannelArray("mutes", channel, mute);
    this.post({ type: "SET_MUTE", payload: { channel, mute } });
  }

  setSolo(channel: number, solo: boolean): void {
    this.updateChannelArray("solos", channel, solo);
    this.post({ type: "SET_SOLO", payload: { channel, solo } });
  }

  clearTrack(channel: number): void {
    if (channel === -1) {
      this.post({ type: "CLEAR_TRACKS" });
      this.setInsertMarker(0);
      return;
    }
    const emptyData = new Float32Array(this.state.bufferLen);
    this.post(
      { type: "LOAD_TRACK_DATA", payload: { channel, data: emptyData } },
      [emptyData.buffer],
    );
  }

  async importAudioFile(channel: number, file: File): Promise<Float32Array> {
    await this.ensureReady("engine.worklet_init_failed");
    if (!this.audioCtx) throw new Error("Audio engine is not initialized.");
    try {
      const monoData = await decodeFileToMono(
        this.audioCtx,
        file,
        this.state.bufferLen,
      );
      const transferData = new Float32Array(monoData);
      this.post(
        { type: "LOAD_TRACK_DATA", payload: { channel, data: transferData } },
        [transferData.buffer],
      );
      return monoData;
    } catch (error) {
      this.addDiagnostic("import.decode_failed", error, {
        channel,
        fileType: file.type,
        fileSize: file.size,
      });
      throw error;
    }
  }

  requestExportWav(): void {
    this.pendingExport = true;
    this.post({ type: "REQUEST_EXPORT" });
  }

  requestTrackSnapshot(): void {
    this.post({ type: "REQUEST_EXPORT" });
  }

  async setInputDevice(deviceId: string): Promise<void> {
    if (!this.audioCtx || !this.workletNode) return;
    this.disconnectMic();
    if (!navigator.mediaDevices?.getUserMedia) {
      this.addDiagnostic("input.media_devices_unsupported");
      this.patchState({
        inputError:
          "This browser cannot access microphone input. Playback, import, and export still work.",
      });
      return;
    }
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId:
            deviceId && deviceId !== "default"
              ? { exact: deviceId }
              : undefined,
          echoCancellation: this.state.echoCancellation,
          noiseSuppression: this.state.noiseSuppression,
          // TODO
          autoGainControl: false,
        },
      });
      this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
      this.micSource.connect(this.workletNode);
      this.patchState({ inputError: null });
    } catch (error) {
      this.addDiagnostic("input.mic_unavailable", error, {
        requestedDevice: deviceId ? "selected" : "default",
      });
      this.patchState({
        inputError:
          "Microphone is unavailable. Playback, import, and export still work.",
      });
    }
  }

  async setOutputDevice(deviceId: string): Promise<boolean> {
    if (!this.audioCtx) return false;
    if (!deviceId || deviceId === "default") {
      this.patchState({ outputError: null });
      return true;
    }
    const audioCtxWithSink = this.audioCtx as AudioContext & {
      setSinkId?: (sinkId: string) => Promise<void>;
    };
    if (!audioCtxWithSink.setSinkId) {
      this.addDiagnostic("output.routing_unsupported");
      this.patchState({
        outputError: "This browser cannot choose a separate output device.",
      });
      return false;
    }
    try {
      await audioCtxWithSink.setSinkId(deviceId);
      this.patchState({ outputError: null });
      return true;
    } catch (error) {
      this.addDiagnostic("output.routing_failed", error, {
        requestedDevice: "selected",
      });
      this.patchState({
        outputError:
          "Could not switch audio output. The default output is still available.",
      });
      return false;
    }
  }

  dismissDiagnostic(id: string): void {
    this.patchState({
      diagnostics: this.state.diagnostics.map((diagnostic) =>
        diagnostic.id === id ? { ...diagnostic, dismissed: true } : diagnostic,
      ),
    });
  }

  destroy(): void {
    this.disconnectMic();
    this.workletNode?.disconnect();
    void this.audioCtx?.close();
    this.audioCtx = null;
    this.workletNode = null;
    this.initPromise = null;
    this.readyPromise = null;
    this.patchState({ isReady: false, isPlaying: false, isRecording: false });
  }

  private async initialize(options?: {
    inputId?: string;
    outputId?: string;
  }): Promise<void> {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    const environmentDiagnostics = getRecorderEnvironmentDiagnostics({
      isSecureContext: window.isSecureContext,
      hasAudioContext: Boolean(AudioContextCtor),
      hasAudioWorklet: Boolean(AudioContextCtor),
      hasMediaDevices: Boolean(navigator.mediaDevices?.getUserMedia),
    });
    environmentDiagnostics.forEach((code) => this.addDiagnostic(code));
    if (!AudioContextCtor) {
      throw new Error("Web Audio is not supported in this browser.");
    }

    if (window.isSecureContext === false) {
      throw new Error("Audio engine requires a secure browser context.");
    }

    this.audioCtx = new AudioContextCtor();
    if (!this.audioCtx.audioWorklet) {
      this.addDiagnostic("engine.audio_worklet_unsupported");
      throw new Error("AudioWorklet is not supported in this browser.");
    }
    const sampleRate = this.audioCtx.sampleRate;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    try {
      if (!this.wasmBytes) {
        const wasmResponse = await fetch(wasmUrl);
        this.wasmBytes = await wasmResponse.arrayBuffer();
      }
    } catch (error) {
      this.addDiagnostic("engine.wasm_fetch_failed", error);
      throw error;
    }

    try {
      await this.audioCtx.audioWorklet.addModule(
        new URL("./processor.ts", import.meta.url).href,
      );
      this.workletNode = new AudioWorkletNode(
        this.audioCtx,
        "four-track-recorder-processor",
        {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        },
      );
      this.workletNode.port.onmessage = (
        event: MessageEvent<RecorderEvent>,
      ) => {
        this.handleWorkletEvent(event.data);
      };
      this.workletNode.connect(this.audioCtx.destination);
      this.post({
        type: "INIT_WASM",
        payload: { wasmBytes: this.wasmBytes, sampleRate },
      });
      await this.readyPromise;
      this.syncRuntimeStateToWorklet();
    } catch (error) {
      this.addDiagnostic("engine.worklet_init_failed", error);
      throw error;
    }

    if (options?.outputId && options.outputId !== "default") {
      await this.setOutputDevice(options.outputId);
    }
    await this.setInputDevice(options?.inputId || "default");
  }

  private handleWorkletEvent(event: RecorderEvent): void {
    if (event.type === "READY") {
      this.patchState({
        isReady: true,
        sampleRate: event.sampleRate,
        bufferLen: event.bufferLen,
        durationSeconds: event.durationSeconds,
        engineError: null,
      });
      this.resolveReady?.();
    } else if (event.type === "ERROR") {
      const error = new Error(event.message);
      this.addDiagnostic("engine.worklet_error", error, {
        workletMessage: event.message,
      });
      this.patchState({
        engineError: "The audio engine reported an internal error.",
      });
      this.rejectReady?.(error);
    } else if (event.type === "PLAYHEAD_UPDATE") {
      this.patchState({
        playHead: event.playHead,
        playTime: event.playTime,
        isPlaying: event.isPlaying,
        isRecording: event.isRecording,
        peaks: event.peaks,
        inputPeak: event.inputPeak,
      });
      this.updateRecordingInputSignal(event.isRecording, event.inputPeak);
    } else if (event.type === "EXPORT_RESPONSE") {
      const snapshot: RecorderSnapshot = {
        tracks: event.tracks,
        sampleRate: event.sampleRate,
        bufferLen: event.bufferLen,
      };
      this.snapshotListeners.forEach((listener) => listener(snapshot));
      this.checkRecordingSnapshot(event.tracks);
      if (!this.pendingExport) return;
      this.pendingExport = false;
      const hasAudio = event.tracks.some((track) =>
        track.some((sample) => Math.abs(sample) > 0.0001),
      );
      if (!hasAudio) {
        this.addDiagnostic("export.empty_tape");
        return;
      }
      try {
        const wavBlob = mixTracksToWav(
          event.tracks,
          event.sampleRate,
          this.state.volumes,
          this.state.pans,
          this.state.mutes,
          this.state.solos,
        );
        this.exportListeners.forEach((listener) => listener(wavBlob));
      } catch (error) {
        this.addDiagnostic("export.snapshot_failed", error);
      }
    }
  }

  private async ensureReady(code?: RecorderDiagnosticCode): Promise<void> {
    if (!this.workletNode || !this.audioCtx) {
      if (code) this.addDiagnostic(code);
      await this.init();
    }
    if (this.readyPromise) await this.readyPromise;
  }

  private seekSample(sampleIndex: number): void {
    const playHead = clamp(
      Math.floor(sampleIndex),
      0,
      this.state.bufferLen - 1,
    );
    this.post({ type: "SET_PLAY_HEAD", payload: playHead });
    this.patchState({
      playHead,
      playTime: sampleToSeconds(playHead, this.state.sampleRate),
    });
  }

  private updateChannelArray<
    Key extends "volumes" | "pans" | "mutes" | "solos",
  >(key: Key, channel: number, value: RecorderState[Key][number]): void {
    if (channel < 0 || channel >= TRACK_COUNT) return;
    const next = [...this.state[key]] as RecorderState[Key];
    next[channel] = value as never;
    this.patchState({ [key]: next });
  }

  private addDiagnostic(
    code: RecorderDiagnosticCode,
    cause?: unknown,
    context?: Record<string, unknown>,
  ): void {
    const previous = this.state.diagnostics.find(
      (diagnostic) => diagnostic.code === code && !diagnostic.dismissed,
    );
    if (previous && Date.now() - previous.timestamp < 1500) return;
    const diagnostic = createDiagnostic(code, { cause, context });
    logDiagnostic(diagnostic);
    this.patchState({
      diagnostics: [diagnostic, ...this.state.diagnostics].slice(0, 12),
    });
  }

  private clearDiagnostic(code: RecorderDiagnosticCode): void {
    if (
      !this.state.diagnostics.some(
        (diagnostic) => diagnostic.code === code && !diagnostic.dismissed,
      )
    )
      return;
    const nextDiagnostics = this.state.diagnostics.map((diagnostic) =>
      diagnostic.code === code && !diagnostic.dismissed
        ? { ...diagnostic, dismissed: true }
        : diagnostic,
    );
    this.patchState({ diagnostics: nextDiagnostics });
  }

  private updateRecordingInputSignal(
    isRecording: boolean,
    inputPeak: number,
  ): void {
    const decision = getSilentInputDecision({
      isRecording,
      inputPeak,
      recordingStartedAt: this.recordingStartedAt,
      now: Date.now(),
      threshold: this.inputSignalThreshold,
      graceMs: this.noInputGraceMs,
      warningActive: this.noInputWarningActive,
    });
    if (decision === "clear") {
      this.noInputWarningActive = false;
      this.clearDiagnostic("recording.no_input_signal");
      return;
    }
    if (decision === "wait") return;
    this.noInputWarningActive = true;
    this.addDiagnostic("recording.no_input_signal", undefined, {
      armedTrack: this.state.recordArmChannel,
    });
  }

  private checkRecordingSnapshot(tracks: Float32Array[]): void {
    const channel = this.pendingRecordingSnapshotChannel;
    if (channel === null || channel < 0) return;
    this.pendingRecordingSnapshotChannel = null;
    const track = tracks[channel];
    const hasAudio = track?.some(
      (sample) => Math.abs(sample) > this.inputSignalThreshold,
    );
    if (!hasAudio)
      this.addDiagnostic("recording.no_recorded_input", undefined, {
        armedTrack: channel,
      });
  }

  private patchState(patch: Partial<RecorderState>): void {
    const next = { ...this.state, ...patch };
    next.insertMarkerBBM = sampleToBBM(
      next.insertMarkerSample,
      next.sampleRate,
      next.bpm,
    );
    next.currentPlayheadBBM = sampleToBBM(
      next.playHead,
      next.sampleRate,
      next.bpm,
    );
    this.state = next;
    this.stateListeners.forEach((listener) => listener(this.state));
  }

  private post(command: unknown, transfer?: Transferable[]): void {
    this.workletNode?.port.postMessage(command, transfer || []);
  }

  private syncRuntimeStateToWorklet(): void {
    buildRuntimeStateCommands(this.state).forEach((command) =>
      this.post(command),
    );
  }

  private async resumeContext(): Promise<void> {
    if (this.audioCtx?.state !== "suspended") return;
    try {
      await this.audioCtx.resume();
    } catch (error) {
      this.addDiagnostic("engine.audio_context_resume_failed", error);
      throw error;
    }
  }

  private disconnectMic(): void {
    this.micSource?.disconnect();
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.micSource = null;
    this.micStream = null;
  }
}
