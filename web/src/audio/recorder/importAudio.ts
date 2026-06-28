export const decodeFileToMono = async (
  audioCtx: AudioContext,
  file: File,
  maxLength: number,
): Promise<Float32Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const monoData = new Float32Array(audioBuffer.length);

  if (audioBuffer.numberOfChannels === 1) {
    monoData.set(audioBuffer.getChannelData(0));
  } else {
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    for (let i = 0; i < audioBuffer.length; i++) monoData[i] = (left[i] + right[i]) * 0.5;
  }

  return monoData.length > maxLength ? monoData.subarray(0, maxLength) : monoData;
};
