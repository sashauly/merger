export type HapticType = "tap" | "heavy" | "double";

export const triggerHaptic = (type: HapticType = "tap"): void => {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    if (type === "tap") navigator.vibrate(10);
    else if (type === "heavy") navigator.vibrate(25);
    else navigator.vibrate([15, 30, 15]);
  } catch {
    // Haptics are optional browser affordances.
  }
};
