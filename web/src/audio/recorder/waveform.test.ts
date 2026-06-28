import { describe, expect, it } from "vitest";
import { createEmptyWaveforms, downsamplePeaks, updateWaveformPoint } from "./waveform";

describe("waveform utilities", () => {
  it("creates empty waveforms", () => {
    expect(createEmptyWaveforms(2, 3)).toEqual([
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });

  it("downsamples peaks", () => {
    expect(downsamplePeaks(new Float32Array([0, -0.5, 0.25, 1]), 2)).toEqual([0.5, 1]);
  });

  it("spreads short audio across the requested waveform points", () => {
    expect(downsamplePeaks(new Float32Array([0, 1, 0, 0]), 8)).toEqual([0, 0, 1, 1, 0, 0, 0, 0]);
  });

  it("updates a waveform point without mutating the original", () => {
    const original = createEmptyWaveforms(1, 4);
    const next = updateWaveformPoint(original, 0, 50, 100, 0.75);
    expect(original[0]).toEqual([0, 0, 0, 0]);
    expect(next[0][2]).toBe(0.75);
  });
});
