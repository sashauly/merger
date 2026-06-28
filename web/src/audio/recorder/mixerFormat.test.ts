import { describe, expect, it } from "vitest";
import { dbStringToGain, gainToDbString, panStringToPan, panToPanString } from "./mixerFormat";

describe("mixer formatting", () => {
  it("round-trips center and directional pan strings", () => {
    expect(panToPanString(0)).toBe("C");
    expect(panStringToPan("L50")).toBe(-0.5);
    expect(panStringToPan("R25")).toBe(0.25);
  });

  it("converts gain and dB strings", () => {
    expect(gainToDbString(1)).toBe("0.0");
    expect(dbStringToGain("-inf")).toBe(0);
    expect(dbStringToGain("0")).toBe(1);
  });
});
