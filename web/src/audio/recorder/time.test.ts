import { describe, expect, it } from "vitest";
import { formatSampleTime, sampleToBBM, sampleToSeconds, secondsToSample, snapSampleToBar } from "./time";

describe("time utilities", () => {
  it("converts samples and seconds", () => {
    expect(sampleToSeconds(44100, 44100)).toBe(1);
    expect(secondsToSample(1.5, 44100, 44100 * 10)).toBe(66150);
  });

  it("formats sample time", () => {
    expect(formatSampleTime(44100 * 65 + 22050, 44100)).toBe("01:05.50");
  });

  it("converts samples to BBM", () => {
    expect(sampleToBBM(0, 44100, 120)).toBe("1.1.1");
    expect(sampleToBBM(44100 * 2, 44100, 120)).toBe("2.1.1");
  });

  it("snaps samples to nearest musical bar", () => {
    expect(snapSampleToBar(44100 * 2.1, 44100, 120, 44100 * 180)).toBe(44100 * 2);
  });
});
