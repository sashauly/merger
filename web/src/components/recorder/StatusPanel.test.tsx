import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDiagnostic } from "../../audio/recorder/errors";
import type { RecorderState } from "../../audio/recorder/types";
import { StatusPanel } from "./StatusPanel";

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
  inputError: "Microphone unavailable",
  outputError: null,
  diagnostics: [createDiagnostic("recording.no_armed_track")],
};

describe("StatusPanel", () => {
  it("renders status and user-safe diagnostic messages", () => {
    render(
      <StatusPanel
        state={state}
        onDismissDiagnostic={vi.fn()}
        onRetryEngine={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );
    expect(screen.getByText("Engine: Offline")).toBeInTheDocument();
    expect(screen.getByText("Input: Issue")).toBeInTheDocument();
    expect(screen.getByText("Arm a track before recording.")).toBeInTheDocument();
  });
});
