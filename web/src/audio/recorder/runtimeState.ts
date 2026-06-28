import type { RecorderCommand, RecorderState } from "./types";

export const buildRuntimeStateCommands = (state: RecorderState): RecorderCommand[] => [
  { type: "SET_RECORD_ARM", payload: state.recordArmChannel },
  { type: "SET_RECORD_MODE_OVERDUB", payload: state.recordMode === "overdub" },
  { type: "SET_PLAY_HEAD", payload: state.playHead },
  ...state.volumes.map((val, channel) => ({
    type: "SET_VOLUME" as const,
    payload: { channel, val },
  })),
  ...state.pans.map((val, channel) => ({
    type: "SET_PAN" as const,
    payload: { channel, val },
  })),
  ...state.mutes.map((mute, channel) => ({
    type: "SET_MUTE" as const,
    payload: { channel, mute },
  })),
  ...state.solos.map((solo, channel) => ({
    type: "SET_SOLO" as const,
    payload: { channel, solo },
  })),
];
