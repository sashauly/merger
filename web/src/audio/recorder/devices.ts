export interface AudioDeviceList {
  inputs: AudioDeviceOption[];
  outputs: AudioDeviceOption[];
}

export interface AudioDeviceOption {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput";
  isDefault?: boolean;
}

export const requestMicAccess = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
};

export const enumerateAudioDevices = async (): Promise<AudioDeviceList> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      inputs: normalizeDevices(devices, "audioinput", "Default Input"),
      outputs: normalizeDevices(devices, "audiooutput", "Default Output"),
    };
  } catch {
    return {
      inputs: [{ deviceId: "default", label: "Default Input", kind: "audioinput", isDefault: true }],
      outputs: [{ deviceId: "default", label: "Default Output", kind: "audiooutput", isDefault: true }],
    };
  }
};

const normalizeDevices = (
  devices: MediaDeviceInfo[],
  kind: AudioDeviceOption["kind"],
  defaultLabel: string,
): AudioDeviceOption[] => {
  const seen = new Set(["", "default"]);
  const normalized = devices
    .filter((device) => device.kind === kind)
    .filter((device) => {
      if (seen.has(device.deviceId)) return false;
      seen.add(device.deviceId);
      return true;
    })
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `${kind === "audioinput" ? "Input" : "Output"} ${index + 1}`,
      kind,
    }));

  return [{ deviceId: "default", label: defaultLabel, kind, isDefault: true }, ...normalized];
};
