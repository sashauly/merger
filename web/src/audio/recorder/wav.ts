import { TRACK_COUNT } from "./types";

export const encodeStereoWav = (
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
): Blob => {
  const buffer = new ArrayBuffer(44 + left.length * 4);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + left.length * 4, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, left.length * 4, true);

  let offset = 44;
  for (let i = 0; i < left.length; i++, offset += 4) {
    const sampleL = Math.max(-1, Math.min(1, left[i]));
    const sampleR = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7fff, true);
    view.setInt16(offset + 2, sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
};

export const mixTracksToWav = (
  tracks: Float32Array[],
  sampleRate: number,
  volumes: number[],
  pans: number[],
  mutes: boolean[],
  solos: boolean[],
): Blob => {
  const len = tracks[0]?.length || 0;
  const mixedL = new Float32Array(len);
  const mixedR = new Float32Array(len);
  const hasSolo = solos.includes(true);
  const gainsL = Array(TRACK_COUNT).fill(0);
  const gainsR = Array(TRACK_COUNT).fill(0);

  for (let ch = 0; ch < TRACK_COUNT; ch++) {
    const active = (hasSolo ? solos[ch] : true) && !mutes[ch];
    if (!active) continue;
    const angle = ((pans[ch] + 1) * Math.PI) / 4;
    gainsL[ch] = Math.cos(angle) * volumes[ch];
    gainsR[ch] = Math.sin(angle) * volumes[ch];
  }

  for (let i = 0; i < len; i++) {
    let left = 0;
    let right = 0;
    for (let ch = 0; ch < TRACK_COUNT; ch++) {
      const sample = tracks[ch]?.[i] || 0;
      left += sample * gainsL[ch];
      right += sample * gainsR[ch];
    }
    mixedL[i] = Math.max(-1, Math.min(1, left));
    mixedR[i] = Math.max(-1, Math.min(1, right));
  }

  let actualEnd = len;
  for (let i = len - 1; i >= 0; i--) {
    if (Math.abs(mixedL[i]) > 0.0001 || Math.abs(mixedR[i]) > 0.0001) {
      actualEnd = i + 1;
      break;
    }
  }
  actualEnd = Math.min(len, actualEnd + sampleRate);
  if (actualEnd < sampleRate) actualEnd = Math.min(len, sampleRate);

  return encodeStereoWav(mixedL.subarray(0, actualEnd), mixedR.subarray(0, actualEnd), sampleRate);
};

const writeString = (view: DataView, offset: number, value: string): void => {
  for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
};
