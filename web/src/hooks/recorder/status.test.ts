import { describe, expect, it } from "vitest";
import type { RecorderDiagnosticEvent } from "../../audio/recorder/errors";
import { getRecorderStatusSeverity } from "./status";

const diagnostic = (
  severity: RecorderDiagnosticEvent["severity"],
  dismissed = false,
): RecorderDiagnosticEvent => ({
  id: `${severity}-${dismissed}`,
  code: severity === "error" ? "engine.worklet_error" : "recording.no_input_signal",
  category: severity === "error" ? "engine" : "recording",
  severity,
  message: severity,
  userMessage: severity,
  timestamp: Date.now(),
  dismissed,
});

describe("getRecorderStatusSeverity", () => {
  it("returns ok when there are no active diagnostics", () => {
    expect(getRecorderStatusSeverity([])).toBe("ok");
    expect(getRecorderStatusSeverity([diagnostic("error", true)])).toBe("ok");
  });

  it("prefers error over warning", () => {
    expect(getRecorderStatusSeverity([diagnostic("warning"), diagnostic("error")])).toBe("error");
  });

  it("returns warning for active warnings", () => {
    expect(getRecorderStatusSeverity([diagnostic("warning")])).toBe("warning");
  });
});
