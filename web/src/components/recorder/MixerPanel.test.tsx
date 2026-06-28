import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RecorderState } from "../../audio/recorder/types";
import { MixerPanel } from "./MixerPanel";

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
  peaks: [0.42, 0, 0, 0],
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

describe("MixerPanel", () => {
  it("does not show track percentage and passes raw slider values", () => {
    const onSetVolume = vi.fn();
    render(
      <MixerPanel
        state={state}
        onSetVolume={onSetVolume}
        onSetPan={vi.fn()}
        onToggleMute={vi.fn()}
        onToggleSolo={vi.fn()}
        onSetRecordArm={vi.fn()}
        onClearTrack={vi.fn()}
        onImportAudioFile={vi.fn()}
      />,
    );
    expect(screen.queryByText("42%")).not.toBeInTheDocument();
    fireEvent.change(screen.getAllByRole("slider")[0], { target: { value: "1.5" } });
    expect(onSetVolume).toHaveBeenCalledWith(0, 1.5);
  });
});
