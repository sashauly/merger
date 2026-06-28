import { clamp } from "./time";

export const snapGainToDbStep = (gain: number): number => {
  if (gain <= 0.05) return 0;
  const db = 20 * Math.log10(gain);
  const step = 1.5;
  const snappedDb = Math.round(db / step) * step;
  return clamp(Math.pow(10, snappedDb / 20), 0, 1.5);
};

export const gainToDbString = (gain: number): string => {
  if (gain <= 0.0001) return "-inf";
  const db = 20 * Math.log10(gain);
  return db > 0 ? `+${db.toFixed(1)}` : db.toFixed(1);
};

export const dbStringToGain = (dbStr: string): number => {
  const clean = dbStr.trim().toLowerCase();
  if (clean === "" || clean.includes("inf") || parseFloat(clean) <= -60) return 0;
  const dbVal = parseFloat(clean.replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(dbVal)) return 1.0;
  return clamp(Math.pow(10, dbVal / 20), 0, 1.5);
};

export const panToPanString = (pan: number): string => {
  if (Math.abs(pan) < 0.05) return "C";
  return pan < 0 ? `L${Math.round(Math.abs(pan) * 100)}` : `R${Math.round(pan * 100)}`;
};

export const panStringToPan = (panStr: string): number => {
  const clean = panStr.trim().toUpperCase();
  if (clean === "C" || clean === "0" || clean === "") return 0;

  const hasL = clean.includes("L");
  const hasR = clean.includes("R");
  const val = parseFloat(clean.replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(val)) return 0;
  if (hasL) return -clamp(Math.abs(val), 0, 100) / 100;
  if (hasR) return clamp(Math.abs(val), 0, 100) / 100;
  if (clean.startsWith("+")) return clamp(val, 0, 100) / 100;
  if (clean.startsWith("-")) return -clamp(Math.abs(val), 0, 100) / 100;
  if (Math.abs(val) > 1) return clamp(val, -100, 100) / 100;
  return clamp(val, -1, 1);
};
