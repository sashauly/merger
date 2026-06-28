export type RecorderErrorCategory =
  | "engine"
  | "input"
  | "output"
  | "recording"
  | "import"
  | "export"
  | "midi";

export type RecorderSeverity = "info" | "warning" | "error";

export type RecorderDiagnosticCode =
  | "engine.web_audio_unsupported"
  | "engine.insecure_context"
  | "engine.audio_worklet_unsupported"
  | "engine.audio_context_resume_failed"
  | "engine.wasm_fetch_failed"
  | "engine.worklet_init_failed"
  | "engine.worklet_error"
  | "input.mic_unavailable"
  | "input.media_devices_unsupported"
  | "output.routing_unsupported"
  | "output.routing_failed"
  | "recording.engine_not_ready"
  | "recording.no_armed_track"
  | "recording.no_input_signal"
  | "recording.no_recorded_input"
  | "import.decode_failed"
  | "export.empty_tape"
  | "export.snapshot_failed"
  | "midi.unsupported"
  | "midi.permission_denied"
  | "midi.access_failed";

export interface RecorderDiagnosticEvent {
  id: string;
  code: RecorderDiagnosticCode;
  category: RecorderErrorCategory;
  severity: RecorderSeverity;
  message: string;
  userMessage: string;
  cause?: unknown;
  context?: Record<string, unknown>;
  timestamp: number;
  dismissed?: boolean;
}

const codeDefaults: Record<
  RecorderDiagnosticCode,
  Pick<RecorderDiagnosticEvent, "category" | "severity" | "message" | "userMessage">
> = {
  "engine.web_audio_unsupported": {
    category: "engine",
    severity: "error",
    message: "Web Audio is not supported by this browser.",
    userMessage: "This browser cannot run the audio engine.",
  },
  "engine.insecure_context": {
    category: "engine",
    severity: "error",
    message: "Audio engine requires a secure browser context.",
    userMessage: "Audio needs HTTPS or localhost on this browser.",
  },
  "engine.audio_worklet_unsupported": {
    category: "engine",
    severity: "error",
    message: "AudioWorklet is not supported by this browser.",
    userMessage: "This browser cannot run the low-latency audio engine.",
  },
  "engine.audio_context_resume_failed": {
    category: "engine",
    severity: "error",
    message: "Failed to resume the AudioContext.",
    userMessage: "Audio could not start. Tap again or check browser audio permissions.",
  },
  "engine.wasm_fetch_failed": {
    category: "engine",
    severity: "error",
    message: "Failed to load the WASM audio engine.",
    userMessage: "The audio engine could not be loaded. Try refreshing the page.",
  },
  "engine.worklet_init_failed": {
    category: "engine",
    severity: "error",
    message: "Failed to initialize the AudioWorklet.",
    userMessage: "The audio engine could not start. Try refreshing the page.",
  },
  "engine.worklet_error": {
    category: "engine",
    severity: "error",
    message: "AudioWorklet reported an error.",
    userMessage: "The audio engine reported an internal error.",
  },
  "input.mic_unavailable": {
    category: "input",
    severity: "warning",
    message: "Microphone input is unavailable.",
    userMessage: "Microphone is unavailable. Playback, import, and export still work.",
  },
  "input.media_devices_unsupported": {
    category: "input",
    severity: "warning",
    message: "MediaDevices microphone APIs are unavailable.",
    userMessage: "This browser cannot access microphone input. Playback, import, and export still work.",
  },
  "output.routing_unsupported": {
    category: "output",
    severity: "warning",
    message: "Output routing is not supported.",
    userMessage: "This browser cannot choose a separate output device.",
  },
  "output.routing_failed": {
    category: "output",
    severity: "warning",
    message: "Failed to change output device.",
    userMessage: "Could not switch audio output. The default output is still available.",
  },
  "recording.engine_not_ready": {
    category: "recording",
    severity: "warning",
    message: "Recording command was requested before the engine was ready.",
    userMessage: "Activate the engine before recording.",
  },
  "recording.no_armed_track": {
    category: "recording",
    severity: "warning",
    message: "Recording was requested without an armed track.",
    userMessage: "Arm a track before recording.",
  },
  "recording.no_input_signal": {
    category: "recording",
    severity: "warning",
    message: "Recording is active but no input signal has been detected.",
    userMessage: "No input signal detected. Check your microphone or input device.",
  },
  "recording.no_recorded_input": {
    category: "recording",
    severity: "warning",
    message: "Recording stopped but the armed track snapshot was silent.",
    userMessage: "No recorded input captured.",
  },
  "import.decode_failed": {
    category: "import",
    severity: "error",
    message: "Failed to decode imported audio.",
    userMessage: "Could not import this audio file.",
  },
  "export.empty_tape": {
    category: "export",
    severity: "warning",
    message: "Export was requested for an empty tape.",
    userMessage: "There is no recorded or imported audio to export.",
  },
  "export.snapshot_failed": {
    category: "export",
    severity: "error",
    message: "Failed to snapshot tracks for export.",
    userMessage: "Could not export the tape. Try again after stopping playback.",
  },
  "midi.access_failed": {
    category: "midi",
    severity: "warning",
    message: "MIDI access failed.",
    userMessage: "MIDI controls are unavailable in this browser session.",
  },
  "midi.unsupported": {
    category: "midi",
    severity: "warning",
    message: "MIDI is not supported by this browser.",
    userMessage: "MIDI control is not supported in this browser.",
  },
  "midi.permission_denied": {
    category: "midi",
    severity: "warning",
    message: "MIDI permission was denied.",
    userMessage: "MIDI permission was denied. You can enable it later from browser settings.",
  },
};

export const createDiagnostic = (
  code: RecorderDiagnosticCode,
  options: {
    cause?: unknown;
    context?: Record<string, unknown>;
    userMessage?: string;
    severity?: RecorderSeverity;
  } = {},
): RecorderDiagnosticEvent => {
  const defaults = codeDefaults[code];
  return {
    id: `${code}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    code,
    category: defaults.category,
    severity: options.severity || defaults.severity,
    message: defaults.message,
    userMessage: options.userMessage || defaults.userMessage,
    cause: options.cause,
    context: options.context,
    timestamp: Date.now(),
  };
};

export const getUserMessageForDiagnostic = (code: RecorderDiagnosticCode): string =>
  codeDefaults[code].userMessage;

export const logDiagnostic = (diagnostic: RecorderDiagnosticEvent): void => {
  if (!import.meta.env.DEV) return;
  const payload = {
    code: diagnostic.code,
    category: diagnostic.category,
    severity: diagnostic.severity,
    context: diagnostic.context,
    cause: diagnostic.cause,
  };
  if (diagnostic.severity === "error") {
    console.error(`[recorder:${diagnostic.code}] ${diagnostic.message}`, payload);
  } else {
    console.warn(`[recorder:${diagnostic.code}] ${diagnostic.message}`, payload);
  }
};
