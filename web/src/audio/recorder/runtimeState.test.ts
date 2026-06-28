import { describe, expect, it } from "vitest";
import type { RecorderState } from "./types";
import { buildRuntimeStateCommands } from "./runtimeState";

const state: RecorderState = {
  isReady: false,
  isPlaying: false,
  isRecording: false,
  recordArmChannel: 2,
  playHead: 128,
  playTime: 0,
  bufferLen: 44100,
  durationSeconds: 1,
  sampleRate: 44100,
  volumes: [0.5, 0.75, 1, 1.25],
  pans: [-1, -0.5, 0.5, 1],
  mutes: [false, true, false, true],
  solos: [false, false, true, false],
  peaks: [0, 0, 0, 0],
  inputPeak: 0,
  bpm: 120,
  recordMode: "arrangement",
  startPlaybackWithRecord: true,
  insertMarkerSample: 0,
  insertMarkerBBM: "1.1.1",
  currentPlayheadBBM: "1.1.1",
  engineError: null,
  inputError: null,
  outputError: null,
  diagnostics: [],
};

describe("buildRuntimeStateCommands", () => {
  it("replays record arm and transport-critical state for a new worklet", () => {
    const commands = buildRuntimeStateCommands(state);

    expect(commands).toContainEqual({ type: "SET_RECORD_ARM", payload: 2 });
    expect(commands).toContainEqual({ type: "SET_RECORD_MODE_OVERDUB", payload: false });
    expect(commands).toContainEqual({ type: "SET_PLAY_HEAD", payload: 128 });
    expect(commands).toContainEqual({ type: "SET_VOLUME", payload: { channel: 0, val: 0.5 } });
    expect(commands).toContainEqual({ type: "SET_PAN", payload: { channel: 3, val: 1 } });
    expect(commands).toContainEqual({ type: "SET_MUTE", payload: { channel: 1, mute: true } });
    expect(commands).toContainEqual({ type: "SET_SOLO", payload: { channel: 2, solo: true } });
  });
});
