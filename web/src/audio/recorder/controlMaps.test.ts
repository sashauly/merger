import { describe, expect, it } from "vitest";
import { mapKeyboardEventToCommand, mapMidiMessageToCommand } from "./controlMaps";

const keyboardEvent = (code: string, key = "", shiftKey = false) =>
  ({ code, key, shiftKey, ctrlKey: false, metaKey: false }) as KeyboardEvent;

describe("control maps", () => {
  it("maps keyboard transport commands", () => {
    expect(mapKeyboardEventToCommand(keyboardEvent("Space"))).toEqual({ action: "play" });
    expect(mapKeyboardEventToCommand(keyboardEvent("Space", " ", true))).toEqual({ action: "pause" });
    expect(mapKeyboardEventToCommand(keyboardEvent("Digit2", "2"))).toEqual({ action: "toggleMute", channel: 1 });
    expect(mapKeyboardEventToCommand(keyboardEvent("Digit2", "2", true))).toEqual({ action: "toggleSolo", channel: 1 });
  });

  it("maps MIDI controls", () => {
    expect(mapMidiMessageToCommand([0xb0, 116, 127])).toEqual({ action: "play" });
    expect(mapMidiMessageToCommand([0xb0, 14, 127])).toEqual({ action: "setVolume", channel: 0, value: 1.5 });
    expect(mapMidiMessageToCommand([0x90, 29, 100])).toEqual({ action: "record" });
  });
});
