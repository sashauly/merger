import { describe, expect, it } from "vitest";
import { getSilentInputDecision } from "./inputSignal";

describe("getSilentInputDecision", () => {
  it("does not warn immediately after recording starts", () => {
    expect(
      getSilentInputDecision({
        isRecording: true,
        inputPeak: 0,
        recordingStartedAt: 1000,
        now: 2500,
        threshold: 0.0001,
        graceMs: 2000,
        warningActive: false,
      }),
    ).toBe("wait");
  });

  it("warns after sustained silence", () => {
    expect(
      getSilentInputDecision({
        isRecording: true,
        inputPeak: 0,
        recordingStartedAt: 1000,
        now: 3100,
        threshold: 0.0001,
        graceMs: 2000,
        warningActive: false,
      }),
    ).toBe("show");
  });

  it("clears when input signal appears", () => {
    expect(
      getSilentInputDecision({
        isRecording: true,
        inputPeak: 0.2,
        recordingStartedAt: 1000,
        now: 3100,
        threshold: 0.0001,
        graceMs: 2000,
        warningActive: true,
      }),
    ).toBe("clear");
  });
});
