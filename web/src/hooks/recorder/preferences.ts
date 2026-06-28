import type { RecordMode } from "../../audio/recorder/types";

export type GridResolution = "1/4" | "1/2" | "1 bar" | "2 bars" | "4 bars";

const STORAGE_KEY = "merger.recorder.preferences.v1";

export interface RecorderPreferences {
  bpm: number;
  gridResolution: GridResolution;
  recordMode: RecordMode;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  selectedInputId: string;
  selectedOutputId: string;
  volumes: number[];
  pans: number[];
  hapticsEnabled: boolean;
  midiEnabled: boolean;
}

export const defaultRecorderPreferences: RecorderPreferences = {
  bpm: 120,
  gridResolution: "1 bar",
  recordMode: "overdub",
  noiseSuppression: localStorage.getItem("noiseSuppression") === "true",
  echoCancellation: localStorage.getItem("echoCancellation") === "true",
  selectedInputId: "default",
  selectedOutputId: "default",
  volumes: [1, 1, 1, 1],
  pans: [0, 0, 0, 0],
  hapticsEnabled: true,
  midiEnabled: false,
};

export const loadRecorderPreferences = (): RecorderPreferences => {
  if (typeof localStorage === "undefined") return defaultRecorderPreferences;
  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "null",
    ) as Partial<RecorderPreferences> | null;
    if (!parsed || typeof parsed !== "object")
      return defaultRecorderPreferences;
    return normalizePreferences(parsed);
  } catch {
    return defaultRecorderPreferences;
  }
};

export const saveRecorderPreferences = (
  preferences: RecorderPreferences,
): void => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(normalizePreferences(preferences)),
    );
  } catch {
    // Preference persistence must not affect recorder operation.
  }
};

const normalizePreferences = (
  value: Partial<RecorderPreferences>,
): RecorderPreferences => ({
  bpm: clampNumber(value.bpm, 20, 300, defaultRecorderPreferences.bpm),
  gridResolution: isGridResolution(value.gridResolution)
    ? value.gridResolution
    : defaultRecorderPreferences.gridResolution,
  recordMode:
    value.recordMode === "arrangement" || value.recordMode === "overdub"
      ? value.recordMode
      : defaultRecorderPreferences.recordMode,
  noiseSuppression:
    typeof value.noiseSuppression === "boolean" ? value.noiseSuppression : true,
  echoCancellation:
    typeof value.echoCancellation === "boolean" ? value.echoCancellation : true,
  selectedInputId:
    typeof value.selectedInputId === "string" && value.selectedInputId
      ? value.selectedInputId
      : "default",
  selectedOutputId:
    typeof value.selectedOutputId === "string" && value.selectedOutputId
      ? value.selectedOutputId
      : "default",
  volumes: normalizeNumberArray(value.volumes, 4, 0, 1.5, 1),
  pans: normalizeNumberArray(value.pans, 4, -1, 1, 0),
  hapticsEnabled:
    typeof value.hapticsEnabled === "boolean" ? value.hapticsEnabled : true,
  midiEnabled:
    typeof value.midiEnabled === "boolean" ? value.midiEnabled : false,
});

const normalizeNumberArray = (
  value: unknown,
  length: number,
  min: number,
  max: number,
  fallback: number,
): number[] => {
  if (!Array.isArray(value)) return Array(length).fill(fallback);
  return Array.from({ length }, (_, index) =>
    clampNumber(value[index], min, max, fallback),
  );
};

const clampNumber = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
};

const isGridResolution = (value: unknown): value is GridResolution =>
  value === "1/4" ||
  value === "1/2" ||
  value === "1 bar" ||
  value === "2 bars" ||
  value === "4 bars";
