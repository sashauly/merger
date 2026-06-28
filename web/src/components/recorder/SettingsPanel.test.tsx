import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RecorderState } from "../../audio/recorder/types";
import { SettingsPanel } from "./SettingsPanel";

const state: RecorderState = {
  isReady: true,
  isPlaying: false,
  isRecording: false,
  recordArmChannel: -1,
  playHead: 0,
  playTime: 0,
  bufferLen: 44100,
  durationSeconds: 1,
  sampleRate: 44100,
  volumes: [1, 1, 1, 1],
  pans: [0, 0, 0, 0],
  mutes: [false, false, false, false],
  solos: [false, false, false, false],
  peaks: [0, 0, 0, 0],
  inputPeak: 0,
  bpm: 120,
  recordMode: "overdub",
  startPlaybackWithRecord: true,
  insertMarkerSample: 0,
  insertMarkerBBM: "1.1.1",
  currentPlayheadBBM: "1.1.1",
  engineError: null,
  inputError: null,
  outputError: null,
  diagnostics: [],
};

describe("SettingsPanel", () => {
  it("renders MIDI opt-in control", () => {
    const onEnableMidi = vi.fn();
    render(
      <SettingsPanel
        open
        state={state}
        devices={{ inputs: [], outputs: [] }}
        selectedInputId="default"
        selectedOutputId="default"
        midiInputs={[]}
        lastMidiMessage=""
        midiEnabled={false}
        midiPermission="disabled"
        hapticsEnabled
        onClose={vi.fn()}
        onSetInputDevice={vi.fn()}
        onSetOutputDevice={vi.fn()}
        onEnableMidi={onEnableMidi}
        onSetHapticsEnabled={vi.fn()}
        onDismissDiagnostic={vi.fn()}
        onRetryEngine={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Enable MIDI control"));
    expect(onEnableMidi).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Engine: Ready")).toBeInTheDocument();
    expect(screen.getByText("Haptics")).toBeInTheDocument();
  });
});
