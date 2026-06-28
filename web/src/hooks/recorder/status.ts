import type { RecorderDiagnosticEvent } from "../../audio/recorder/errors";

export type RecorderStatusSeverity = "ok" | "warning" | "error";

export const getRecorderStatusSeverity = (
  diagnostics: RecorderDiagnosticEvent[],
): RecorderStatusSeverity => {
  const active = diagnostics.filter((diagnostic) => !diagnostic.dismissed);
  if (active.some((diagnostic) => diagnostic.severity === "error")) return "error";
  if (active.some((diagnostic) => diagnostic.severity === "warning")) return "warning";
  return "ok";
};
