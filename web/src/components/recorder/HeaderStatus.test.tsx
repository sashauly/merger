import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RecorderState } from "../../audio/recorder/types";
import { HeaderStatus } from "./HeaderStatus";

const state: RecorderState = {
  isReady: false,
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

describe("HeaderStatus", () => {
  it("does not render activation or MIDI controls", () => {
    render(
      <HeaderStatus
        state={state}
        loading={false}
        statusSeverity="ok"
        onOpenSettings={vi.fn()}
        onOpenDiagnostics={vi.fn()}
      />,
    );
    expect(screen.queryByText("Activate Engine")).not.toBeInTheDocument();
    expect(screen.queryByText(/MIDI/i)).not.toBeInTheDocument();
    expect(screen.getByText("DSP offline")).toBeInTheDocument();
  });

  it("renders a status indicator that opens diagnostics", () => {
    const onOpenDiagnostics = vi.fn();
    render(
      <HeaderStatus
        state={state}
        loading={false}
        statusSeverity="warning"
        onOpenSettings={vi.fn()}
        onOpenDiagnostics={onOpenDiagnostics}
      />,
    );
    const indicator = screen.getByLabelText("Recorder status");
    expect(indicator).toHaveClass("warning");
    fireEvent.click(indicator);
    expect(onOpenDiagnostics).toHaveBeenCalledTimes(1);
  });
});
