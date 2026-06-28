import type { RecorderDiagnosticCode } from "./errors";

export interface RecorderEnvironmentProbe {
  isSecureContext?: boolean;
  hasAudioContext: boolean;
  hasAudioWorklet: boolean;
  hasMediaDevices: boolean;
}

export const getRecorderEnvironmentDiagnostics = (
  probe: RecorderEnvironmentProbe,
): RecorderDiagnosticCode[] => {
  const diagnostics: RecorderDiagnosticCode[] = [];
  if (probe.isSecureContext === false) diagnostics.push("engine.insecure_context");
  if (!probe.hasAudioContext) diagnostics.push("engine.web_audio_unsupported");
  if (probe.hasAudioContext && !probe.hasAudioWorklet) diagnostics.push("engine.audio_worklet_unsupported");
  if (!probe.hasMediaDevices) diagnostics.push("input.media_devices_unsupported");
  return diagnostics;
};
