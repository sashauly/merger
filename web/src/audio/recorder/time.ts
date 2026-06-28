export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const sampleToSeconds = (sampleIndex: number, sampleRate: number): number => {
  if (sampleRate <= 0) return 0;
  return sampleIndex / sampleRate;
};

export const secondsToSample = (
  seconds: number,
  sampleRate: number,
  bufferLen: number,
): number => clamp(Math.floor(seconds * sampleRate), 0, Math.max(0, bufferLen - 1));

export const sampleToBBM = (
  sampleIndex: number,
  sampleRate: number,
  bpm: number,
): string => {
  const safeBpm = clamp(bpm, 20, 300);
  const samplesPerBeat = sampleRate / (safeBpm / 60);
  const samplesPer16th = samplesPerBeat / 4;
  const total16ths = Math.floor(sampleIndex / samplesPer16th);
  const bar = Math.floor(total16ths / 16) + 1;
  const beat = Math.floor((total16ths % 16) / 4) + 1;
  const sixteenth = (total16ths % 4) + 1;
  return `${bar}.${beat}.${sixteenth}`;
};

export const snapSampleToBar = (
  sampleIndex: number,
  sampleRate: number,
  bpm: number,
  bufferLen: number,
): number => {
  const samplesPerBar = (240 * sampleRate) / clamp(bpm, 20, 300);
  const nearestBarIndex = Math.round(sampleIndex / samplesPerBar);
  return clamp(Math.floor(nearestBarIndex * samplesPerBar), 0, Math.max(0, bufferLen - 1));
};

export const formatSampleTime = (sampleIndex: number, sampleRate: number): string => {
  const totalSecs = Math.floor(sampleToSeconds(sampleIndex, sampleRate));
  const min = Math.floor(totalSecs / 60);
  const sec = totalSecs % 60;
  const ms = Math.floor(((sampleIndex % sampleRate) / sampleRate) * 100);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
};

export const formatSecondsTime = (totalSeconds: number): string => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
};
