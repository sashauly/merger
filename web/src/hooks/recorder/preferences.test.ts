import { afterEach, describe, expect, it } from "vitest";
import { loadRecorderPreferences, saveRecorderPreferences } from "./preferences";

describe("recorder preferences", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("hydrates valid saved preferences", () => {
    saveRecorderPreferences({
      bpm: 95,
      gridResolution: "1/2",
      recordMode: "arrangement",
      selectedInputId: "mic-1",
      selectedOutputId: "speaker-1",
      volumes: [0.5, 0.7, 1.1, 1.3],
      pans: [-1, -0.5, 0.5, 1],
      hapticsEnabled: false,
      midiEnabled: true,
    });

    expect(loadRecorderPreferences()).toMatchObject({
      bpm: 95,
      gridResolution: "1/2",
      recordMode: "arrangement",
      selectedInputId: "mic-1",
      selectedOutputId: "speaker-1",
      hapticsEnabled: false,
      midiEnabled: true,
    });
  });

  it("falls back for invalid saved preferences", () => {
    localStorage.setItem(
      "merger.recorder.preferences.v1",
      JSON.stringify({
        bpm: 900,
        gridResolution: "bad",
        recordMode: "bad",
        volumes: ["loud"],
      }),
    );

    const preferences = loadRecorderPreferences();

    expect(preferences.bpm).toBe(300);
    expect(preferences.gridResolution).toBe("1 bar");
    expect(preferences.recordMode).toBe("overdub");
    expect(preferences.volumes).toEqual([1, 1, 1, 1]);
  });
});
