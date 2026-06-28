import { describe, expect, it } from "vitest";
import { getRecorderEnvironmentDiagnostics } from "./environment";

describe("getRecorderEnvironmentDiagnostics", () => {
  it("reports insecure and missing browser capabilities", () => {
    expect(
      getRecorderEnvironmentDiagnostics({
        isSecureContext: false,
        hasAudioContext: false,
        hasAudioWorklet: false,
        hasMediaDevices: false,
      }),
    ).toEqual([
      "engine.insecure_context",
      "engine.web_audio_unsupported",
      "input.media_devices_unsupported",
    ]);
  });

  it("reports missing AudioWorklet only when Web Audio exists", () => {
    expect(
      getRecorderEnvironmentDiagnostics({
        isSecureContext: true,
        hasAudioContext: true,
        hasAudioWorklet: false,
        hasMediaDevices: true,
      }),
    ).toEqual(["engine.audio_worklet_unsupported"]);
  });
});
