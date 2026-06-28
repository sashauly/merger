export const createEmptyWaveforms = (tracks = 4, points = 150): number[][] =>
  Array.from({ length: tracks }, () => Array(points).fill(0));

export const downsamplePeaks = (data: Float32Array, points = 150): number[] => {
  if (points <= 0) return [];
  if (data.length === 0) return Array(points).fill(0);
  const result: number[] = [];
  for (let i = 0; i < points; i++) {
    let max = 0;
    const start = Math.floor((i / points) * data.length);
    const end = Math.max(
      start + 1,
      Math.floor(((i + 1) / points) * data.length),
    );
    for (let j = start; j < end; j++) {
      // Math.abs is already used here, which is correct
      const abs = Math.abs(data[j] || 0);
      if (abs > max) max = abs;
    }
    result.push(max);
  }
  return result;
};
export const updateWaveformPointRange = (
  waveforms: number[][],
  channel: number,
  startSample: number,
  endSample: number,
  bufferLen: number,
  peak: number,
  isOverdub: boolean, // Pass overdub state from React
): number[][] => {
  if (!waveforms[channel] || bufferLen <= 0) return waveforms;

  // OPTIMIZATION: Only clone the array of the track being recorded.
  // This keeps the reference of other tracks unchanged so they NEVER re-render.
  const next = waveforms.map((wave, index) =>
    index === channel ? [...wave] : wave,
  );

  const length = next[channel].length;

  const startX = Math.floor((startSample / bufferLen) * length);
  const endX = Math.floor((endSample / bufferLen) * length);

  const minX = Math.max(0, Math.min(length - 1, Math.min(startX, endX)));
  const maxX = Math.max(0, Math.min(length - 1, Math.max(startX, endX)));

  const cleanPeak = Math.abs(peak);

  for (let x = minX; x <= maxX; x++) {
    if (isOverdub) {
      // Sound-on-sound: Accumulate the incoming sound on top of the existing waveform peaks
      next[channel][x] = Math.min(
        1.0,
        (waveforms[channel][x] || 0) + cleanPeak,
      );
    } else {
      next[channel][x] = cleanPeak;
    }
  }

  return next;
};
