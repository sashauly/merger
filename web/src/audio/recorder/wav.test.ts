import { describe, expect, it } from "vitest";
import { encodeStereoWav, mixTracksToWav } from "./wav";

describe("wav utilities", () => {
  it("writes a stereo wav header and payload", async () => {
    const blob = encodeStereoWav(new Float32Array([0, 1]), new Float32Array([0, -1]), 44100);
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBe(52);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe("WAVE");
  });

  it("mixes four tracks to a non-empty wav", () => {
    const tracks = [
      new Float32Array([0.5, 0]),
      new Float32Array([0, 0]),
      new Float32Array([0, 0]),
      new Float32Array([0, 0]),
    ];
    const blob = mixTracksToWav(tracks, 44100, [1, 1, 1, 1], [0, 0, 0, 0], [false, false, false, false], [false, false, false, false]);
    expect(blob.size).toBeGreaterThan(44);
  });
});
