export interface SilentInputCheck {
  isRecording: boolean;
  inputPeak: number;
  recordingStartedAt: number;
  now: number;
  threshold: number;
  graceMs: number;
  warningActive: boolean;
}

export type SilentInputDecision = "clear" | "show" | "wait";

export const getSilentInputDecision = ({
  isRecording,
  inputPeak,
  recordingStartedAt,
  now,
  threshold,
  graceMs,
  warningActive,
}: SilentInputCheck): SilentInputDecision => {
  if (!isRecording || inputPeak >= threshold) return "clear";
  if (warningActive || now - recordingStartedAt < graceMs) return "wait";
  return "show";
};
