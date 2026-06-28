import { useRef } from "react";
import type { PointerEvent } from "react";
import type { RecordMode, RecorderState } from "../../audio/recorder/types";
import { formatSampleTime } from "../../audio/recorder/time";
import type { GridResolution } from "../../hooks/recorder/preferences";
import { WaveLane } from "./WaveLane";

interface TimelinePanelProps {
  state: RecorderState;
  waveforms: number[][];
  gridResolution: GridResolution;
  tempoValidation: string | null;
  onSetPlayheadFromTimelineRatio: (ratio: number) => void;
  onSetBpm: (bpm: number) => void;
  onSetGridResolution: (resolution: GridResolution) => void;
  onSetRecordMode: (mode: RecordMode) => void;
  onTimelineCommit: () => void;
}

export const TimelinePanel = ({
  state,
  waveforms,
  gridResolution,
  tempoValidation,
  onSetPlayheadFromTimelineRatio,
  onSetBpm,
  onSetGridResolution,
  onSetRecordMode,
  onTimelineCommit,
}: TimelinePanelProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const draggingPointerRef = useRef<number | null>(null);
  const beatsByGrid: Record<GridResolution, number> = {
    "1/4": 0.25,
    "1/2": 0.5,
    "1 bar": 4,
    "2 bars": 8,
    "4 bars": 16,
  };
  const secondsPerGrid =
    (60 / Math.max(20, state.bpm)) * beatsByGrid[gridResolution];
  const gridCount = Math.min(
    240,
    Math.floor(state.durationSeconds / secondsPerGrid),
  );

  const updateFromClientX = (clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    onSetPlayheadFromTimelineRatio((clientX - rect.left) / rect.width);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    draggingPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
    onTimelineCommit();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingPointerRef.current !== event.pointerId) return;
    updateFromClientX(event.clientX);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingPointerRef.current !== event.pointerId) return;
    draggingPointerRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
    onTimelineCommit();
  };

  return (
    <section className="panel timeline-panel">
      <div className="timeline-controls">
        <strong>{formatSampleTime(state.playHead, state.sampleRate)}</strong>
        <label>
          BPM
          <input
            type="number"
            min="20"
            max="300"
            value={state.bpm}
            onChange={(event) => onSetBpm(Number(event.target.value))}
          />
        </label>
        {tempoValidation && (
          <span className="validation-message">{tempoValidation}</span>
        )}
        <label>
          Grid
          <select
            value={gridResolution}
            onChange={(event) =>
              onSetGridResolution(event.target.value as GridResolution)
            }
          >
            <option value="1/4">1/4</option>
            <option value="1/2">1/2</option>
            <option value="1 bar">1 bar</option>
            <option value="2 bars">2 bars</option>
            <option value="4 bars">4 bars</option>
          </select>
        </label>
        <label>
          Mode
          <select
            value={state.recordMode}
            onChange={(event) =>
              onSetRecordMode(event.target.value as RecordMode)
            }
          >
            <option value="overdub">Overdub</option>
            <option value="arrangement">Arrangement</option>
          </select>
        </label>
      </div>
      <div
        ref={timelineRef}
        className="timeline"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {Array.from({ length: gridCount }).map((_, gridIndex) => {
          if (gridIndex === 0) return null;
          const left =
            ((gridIndex * secondsPerGrid) / state.durationSeconds) * 100;
          return (
            <div
              className="bar-line"
              key={gridIndex}
              style={{ left: `${left}%` }}
            />
          );
        })}
        {waveforms.map((wave, channel) => (
          <WaveLane key={channel} wave={wave} channel={channel} />
        ))}
        <div
          className="playhead"
          style={{ left: `${(state.playHead / state.bufferLen) * 100}%` }}
        />
      </div>
    </section>
  );
};
