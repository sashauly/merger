import { Circle, Pause, Play, Rewind, Square } from "lucide-react";
import type { RecorderState } from "../../audio/recorder/types";

interface TransportPanelProps {
  state: RecorderState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRecord: () => void;
  onRewind: () => void;
}

export const TransportPanel = ({
  state,
  onPlay,
  onPause,
  onStop,
  onRecord,
  onRewind,
}: TransportPanelProps) => (
  <section className="panel transport-panel">
    <div className="transport-buttons">
      <button type="button" onClick={onRewind} title="Rewind">
        <Rewind size={18} />
      </button>
      <button type="button" onClick={onPlay} title="Play">
        <Play size={18} />
      </button>
      <button type="button" onClick={onPause} title="Pause">
        <Pause size={18} />
      </button>
      <button type="button" onClick={onStop} title="Stop">
        <Square size={18} />
      </button>
      <button type="button" onClick={onRecord} title={state.isRecording ? "Stop recording" : "Record"}>
        <Circle size={18} className={state.isRecording ? "recording" : ""} />
      </button>
    </div>
  </section>
);
