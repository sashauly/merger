import { afterEach, describe, expect, it, vi } from "vitest";
import { enumerateAudioDevices } from "./devices";

describe("enumerateAudioDevices", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds one synthetic default device and removes browser default duplicates", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: "audioinput", deviceId: "default", label: "Default" },
          { kind: "audioinput", deviceId: "mic-1", label: "USB Mic" },
          { kind: "audiooutput", deviceId: "default", label: "Default" },
          { kind: "audiooutput", deviceId: "speaker-1", label: "Speakers" },
        ]),
      },
    });

    const devices = await enumerateAudioDevices();

    expect(devices.inputs.map((device) => device.deviceId)).toEqual(["default", "mic-1"]);
    expect(devices.outputs.map((device) => device.deviceId)).toEqual(["default", "speaker-1"]);
    expect(devices.inputs[0].label).toBe("Default Input");
    expect(devices.outputs[0].label).toBe("Default Output");
  });
});
