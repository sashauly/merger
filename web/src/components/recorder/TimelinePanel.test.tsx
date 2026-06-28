import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RecorderState } from "../../audio/recorder/types";
import { TimelinePanel } from "./TimelinePanel";

const state: RecorderState = {
  isReady: true,
  isPlaying: false,
  isRecording: false,
  recordArmChannel: -1,
  playHead: 0,
  playTime: 0,
  bufferLen: 44100 * 180,
  durationSeconds: 180,
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

describe("TimelinePanel", () => {
  it("exposes mode and grid controls", () => {
    render(
      <TimelinePanel
        state={state}
        waveforms={[[], [], [], []]}
        gridResolution="1 bar"
        tempoValidation={null}
        onSetPlayheadFromTimelineRatio={vi.fn()}
        onSetBpm={vi.fn()}
        onSetGridResolution={vi.fn()}
        onSetRecordMode={vi.fn()}
        onTimelineCommit={vi.fn()}
      />,
    );
    expect(screen.getByText("Grid")).toBeInTheDocument();
    expect(screen.queryByText("Loop brace / locators: future feature")).not.toBeInTheDocument();
    expect(screen.getByText("Overdub")).toBeInTheDocument();
  });

  it("scrubs playhead from timeline clicks", () => {
    const onSetPlayheadFromTimelineRatio = vi.fn();
    const { container } = render(
      <TimelinePanel
        state={state}
        waveforms={[[], [], [], []]}
        gridResolution="1 bar"
        tempoValidation={null}
        onSetPlayheadFromTimelineRatio={onSetPlayheadFromTimelineRatio}
        onSetBpm={vi.fn()}
        onSetGridResolution={vi.fn()}
        onSetRecordMode={vi.fn()}
        onTimelineCommit={vi.fn()}
      />,
    );
    const timeline = container.querySelector(".timeline") as HTMLDivElement;
    vi.spyOn(timeline, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 200,
      top: 0,
      right: 200,
      bottom: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => "",
    });
    timeline.setPointerCapture = vi.fn();
    timeline.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(timeline, { clientX: 100, pointerId: 1 });
    expect(onSetPlayheadFromTimelineRatio).toHaveBeenCalledWith(0.5);
  });

  it("scrubs playhead while dragging with a pointer", () => {
    const onSetPlayheadFromTimelineRatio = vi.fn();
    const onTimelineCommit = vi.fn();
    const { container } = render(
      <TimelinePanel
        state={state}
        waveforms={[[], [], [], []]}
        gridResolution="1 bar"
        tempoValidation={null}
        onSetPlayheadFromTimelineRatio={onSetPlayheadFromTimelineRatio}
        onSetBpm={vi.fn()}
        onSetGridResolution={vi.fn()}
        onSetRecordMode={vi.fn()}
        onTimelineCommit={onTimelineCommit}
      />,
    );
    const timeline = container.querySelector(".timeline") as HTMLDivElement;
    timeline.setPointerCapture = vi.fn();
    timeline.releasePointerCapture = vi.fn();
    vi.spyOn(timeline, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 200,
      top: 0,
      right: 200,
      bottom: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => "",
    });
    fireEvent.pointerDown(timeline, { clientX: 50, pointerId: 2 });
    fireEvent.pointerMove(timeline, { clientX: 150, pointerId: 2 });
    fireEvent.pointerUp(timeline, { clientX: 200, pointerId: 2 });
    expect(onSetPlayheadFromTimelineRatio).toHaveBeenLastCalledWith(1);
    expect(onTimelineCommit).toHaveBeenCalledTimes(2);
  });

  it("renders svg waveform bars for non-empty waveform data", () => {
    const { container } = render(
      <TimelinePanel
        state={state}
        waveforms={[[0, 0.5, 1], [], [], []]}
        gridResolution="1 bar"
        tempoValidation={null}
        onSetPlayheadFromTimelineRatio={vi.fn()}
        onSetBpm={vi.fn()}
        onSetGridResolution={vi.fn()}
        onSetRecordMode={vi.fn()}
        onTimelineCommit={vi.fn()}
      />,
    );

    expect(container.querySelector(".wave-lane path")?.getAttribute("d")).toContain("Z");
  });
});
