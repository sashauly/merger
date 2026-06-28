export type RecorderActionName =
  | "play"
  | "pause"
  | "stop"
  | "record"
  | "rewind"
  | "cycleArm"
  | "toggleMute"
  | "toggleSolo"
  | "setVolume"
  | "setPan";

export interface ControlCommand {
  action: RecorderActionName;
  channel?: number;
  value?: number;
}

export const mapKeyboardEventToCommand = (event: KeyboardEvent): ControlCommand | null => {
  switch (event.code) {
    case "Space":
      return { action: event.shiftKey ? "pause" : "play" };
    case "Escape":
    case "Backspace":
      return { action: "stop" };
    case "KeyR":
      return event.shiftKey || event.ctrlKey || event.metaKey ? null : { action: "record" };
    case "KeyA":
      return { action: "cycleArm" };
    case "Digit1":
    case "Numpad1":
    case "Digit2":
    case "Numpad2":
    case "Digit3":
    case "Numpad3":
    case "Digit4":
    case "Numpad4": {
      const parsed = Number.parseInt(event.key, 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 4) return null;
      return { action: event.shiftKey ? "toggleSolo" : "toggleMute", channel: parsed - 1 };
    }
    default:
      return null;
  }
};

export const mapMidiMessageToCommand = (data: Uint8Array | number[]): ControlCommand | null => {
  const [status, data1, data2] = data;
  const msgType = status & 0xf0;
  const channel = status & 0x0f;

  if (msgType === 0xb0) {
    if (data1 === 7 && channel < 4) return { action: "setVolume", channel, value: (data2 / 127) * 1.5 };
    if (data1 === 10 && channel < 4) return { action: "setPan", channel, value: (data2 / 127) * 2 - 1 };
    if (data1 >= 14 && data1 <= 17) return { action: "setVolume", channel: data1 - 14, value: (data2 / 127) * 1.5 };
    if (data1 >= 20 && data1 <= 23) return { action: "setPan", channel: data1 - 20, value: (data2 / 127) * 2 - 1 };
    if (data1 >= 102 && data1 <= 105 && data2 > 64) return { action: "toggleMute", channel: data1 - 102 };
    if (data1 >= 106 && data1 <= 109 && data2 > 64) return { action: "toggleSolo", channel: data1 - 106 };
    if (data1 === 115 && data2 > 64) return { action: "rewind" };
    if (data1 === 116 && data2 > 64) return { action: "play" };
    if (data1 === 117 && data2 > 64) return { action: "stop" };
    if (data1 === 118 && data2 > 64) return { action: "record" };
  }

  if (msgType === 0x90 && data2 > 0) {
    if (data1 === 24) return { action: "rewind" };
    if (data1 === 26) return { action: "play" };
    if (data1 === 28) return { action: "stop" };
    if (data1 === 29) return { action: "record" };
  }

  return null;
};
