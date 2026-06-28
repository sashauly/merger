import { Settings } from "lucide-react";
import type { RecorderState } from "../../audio/recorder/types";
import { formatSampleTime } from "../../audio/recorder/time";
import type { RecorderStatusSeverity } from "../../hooks/recorder/status";

interface HeaderStatusProps {
  state: RecorderState;
  loading: boolean;
  statusSeverity: RecorderStatusSeverity;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
}

export const HeaderStatus = ({
  state,
  loading,
  statusSeverity,
  onOpenSettings,
  onOpenDiagnostics,
}: HeaderStatusProps) => (
  <header className="studio-header">
    <div>
      <h1>MERGER</h1>
      <span>{state.isReady ? "DSP ready" : "DSP offline"}</span>
    </div>
    <div className="status-strip">
      <span>{formatSampleTime(state.playHead, state.sampleRate)}</span>
      <span className={state.isRecording ? "recording" : ""}>
        {state.isRecording ? "REC" : state.isPlaying ? "PLAY" : "STOP"}
      </span>
      {loading && <span>Starting...</span>}
      <button
        type="button"
        className={`status-indicator ${statusSeverity}`}
        onClick={onOpenDiagnostics}
        aria-label="Recorder status"
        title="Recorder status"
      />
      <button type="button" onClick={onOpenSettings} aria-label="Settings">
        <Settings size={16} />
      </button>
    </div>
  </header>
);
