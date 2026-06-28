import React, { useMemo } from "react";

interface WaveLaneProps {
  wave: number[];
  channel: number;
}

const generateSilhouettePath = (wave: number[]) => {
  const len = wave.length;
  if (len === 0) return "";

  const parts: string[] = [];
  const maxIdx = len - 1;

  // 1. Top outline (left to right)
  for (let i = 0; i < len; i++) {
    const peak = Math.abs(wave[i] || 0);
    const x = (i / maxIdx) * 100;
    const h = Math.pow(peak, 0.7) * 85; // Using natural linear compression
    parts.push(`L ${x.toFixed(1)} ${(50 - h / 2).toFixed(1)}`);
  }

  // 2. Bottom outline (right to left)
  for (let i = len - 1; i >= 0; i--) {
    const peak = Math.abs(wave[i] || 0);
    const x = (i / maxIdx) * 100;
    const h = Math.pow(peak, 0.7) * 85;
    parts.push(`L ${x.toFixed(1)} ${(50 + h / 2).toFixed(1)}`);
  }

  return `M 0 50 ${parts.join(" ")} Z`;
};

export const WaveLane = React.memo(({ wave, channel }: WaveLaneProps) => {
  // Only regenerate the path string if the actual wave data changes
  const pathD = useMemo(() => generateSilhouettePath(wave), [wave]);

  return (
    <div
      className="wave-lane"
      style={{ position: "relative", minHeight: "40px" }}
    >
      <span style={{ position: "absolute", left: "10px", zIndex: 2 }}>
        T{channel + 1}
      </span>
      <svg
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          <linearGradient id={`wf-grad-${channel}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.7" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.15"
        />

        {pathD && (
          <path
            fill={`url(#wf-grad-${channel})`}
            style={{ color: "#f2b84b" }}
            d={pathD}
          />
        )}
      </svg>
    </div>
  );
});

WaveLane.displayName = "WaveLane";
