import type { RecorderDiagnosticEvent } from "./errors";

export const TRACK_COUNT = 4;
export const DEFAULT_SAMPLE_RATE = 44100;
export const DEFAULT_DURATION_SECONDS = 180;
export const DEFAULT_BUFFER_LEN =
  DEFAULT_SAMPLE_RATE * DEFAULT_DURATION_SECONDS;

export type RecordMode = "arrangement" | "overdub";

export interface RecorderState {
  isReady: boolean;
  isPlaying: boolean;
  isRecording: boolean;
  recordArmChannel: number;
  playHead: number;
  playTime: number;
  bufferLen: number;
  durationSeconds: number;
  sampleRate: number;
  volumes: number[];
  pans: number[];
  mutes: boolean[];
  solos: boolean[];
  peaks: number[];
  inputPeak: number;
  bpm: number;
  recordMode: RecordMode;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  startPlaybackWithRecord: boolean;
  insertMarkerSample: number;
  insertMarkerBBM: string;
  currentPlayheadBBM: string;
  engineError: string | null;
  inputError: string | null;
  outputError: string | null;
  diagnostics: RecorderDiagnosticEvent[];
}

export interface RecorderSnapshot {
  tracks: Float32Array[];
  sampleRate: number;
  bufferLen: number;
}

export type RecorderEvent =
  | {
      type: "READY";
      sampleRate: number;
      bufferLen: number;
      durationSeconds: number;
    }
  | { type: "ERROR"; message: string }
  | {
      type: "PLAYHEAD_UPDATE";
      playHead: number;
      playTime: number;
      isPlaying: boolean;
      isRecording: boolean;
      peaks: number[];
      inputPeak: number;
    }
  | {
      type: "EXPORT_RESPONSE";
      tracks: Float32Array[];
      sampleRate: number;
      bufferLen: number;
    };

export type RecorderCommand =
  | {
      type: "INIT_WASM";
      payload: { wasmBytes: ArrayBuffer; sampleRate: number };
    }
  | { type: "PLAY" }
  | { type: "STOP" }
  | { type: "START_RECORDING" }
  | { type: "STOP_RECORDING" }
  | { type: "SET_PLAY_HEAD"; payload: number }
  | { type: "SET_PLAY_TIME"; payload: number }
  | { type: "SET_RECORD_ARM"; payload: number }
  | { type: "SET_RECORD_MODE_OVERDUB"; payload: boolean }
  | { type: "SET_VOLUME"; payload: { channel: number; val: number } }
  | { type: "SET_PAN"; payload: { channel: number; val: number } }
  | { type: "SET_MUTE"; payload: { channel: number; mute: boolean } }
  | { type: "SET_SOLO"; payload: { channel: number; solo: boolean } }
  | { type: "CLEAR_TRACKS" }
  | {
      type: "LOAD_TRACK_DATA";
      payload: { channel: number; data: Float32Array };
    }
  | { type: "REQUEST_EXPORT" };

export type RecorderStateListener = (state: RecorderState) => void;
export type RecorderExportListener = (wavBlob: Blob) => void;
export type RecorderSnapshotListener = (snapshot: RecorderSnapshot) => void;
