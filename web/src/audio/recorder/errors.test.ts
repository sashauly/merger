import { describe, expect, it } from "vitest";
import { createDiagnostic, getUserMessageForDiagnostic } from "./errors";

describe("recorder diagnostics", () => {
  it("maps diagnostic codes to user-safe messages", () => {
    expect(getUserMessageForDiagnostic("recording.no_armed_track")).toBe("Arm a track before recording.");
    expect(getUserMessageForDiagnostic("midi.permission_denied")).toContain("MIDI permission was denied");
  });

  it("creates structured diagnostic events", () => {
    const diagnostic = createDiagnostic("input.mic_unavailable", { context: { requestedDevice: "default" } });
    expect(diagnostic.category).toBe("input");
    expect(diagnostic.severity).toBe("warning");
    expect(diagnostic.context).toEqual({ requestedDevice: "default" });
    expect(diagnostic.id).toContain("input.mic_unavailable");
  });
});
