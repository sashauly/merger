import { X } from "lucide-react";
import type { RecorderDiagnosticEvent } from "../../audio/recorder/errors";
import type { RecorderState } from "../../audio/recorder/types";

interface StatusPanelProps {
  state: RecorderState;
  onDismissDiagnostic: (id: string) => void;
  onRetryEngine: () => void;
  onOpenSettings: () => void;
}

export const StatusPanel = ({
  state,
  onDismissDiagnostic,
  onRetryEngine,
  onOpenSettings,
}: StatusPanelProps) => {
  const visibleDiagnostics = state.diagnostics.filter((diagnostic) => !diagnostic.dismissed);
  return (
    <section className="status-panel" aria-label="Recorder status">
      <div className="status-summary">
        <StatusPill label="Engine" value={state.isReady ? "Ready" : "Offline"} tone={state.isReady ? "ok" : "warn"} />
        <StatusPill label="Input" value={state.inputError ? "Issue" : "Available"} tone={state.inputError ? "warn" : "ok"} />
        <StatusPill label="Output" value={state.outputError ? "Default" : "Ready"} tone={state.outputError ? "warn" : "ok"} />
      </div>
      {visibleDiagnostics.length > 0 && (
        <div className="diagnostic-list">
          {visibleDiagnostics.map((diagnostic) => (
            <DiagnosticItem
              key={diagnostic.id}
              diagnostic={diagnostic}
              onDismiss={() => onDismissDiagnostic(diagnostic.id)}
              onRetryEngine={onRetryEngine}
              onOpenSettings={onOpenSettings}
            />
          ))}
        </div>
      )}
    </section>
  );
};

interface StatusPillProps {
  label: string;
  value: string;
  tone: "ok" | "warn";
}

const StatusPill = ({ label, value, tone }: StatusPillProps) => (
  <span className={`status-pill ${tone}`}>
    {label}: {value}
  </span>
);

interface DiagnosticItemProps {
  diagnostic: RecorderDiagnosticEvent;
  onDismiss: () => void;
  onRetryEngine: () => void;
  onOpenSettings: () => void;
}

const DiagnosticItem = ({
  diagnostic,
  onDismiss,
  onRetryEngine,
  onOpenSettings,
}: DiagnosticItemProps) => (
  <div className={`diagnostic-item ${diagnostic.severity}`}>
    <span>{diagnostic.userMessage}</span>
    <div className="diagnostic-actions">
      {diagnostic.category === "engine" && (
        <button type="button" onClick={onRetryEngine}>
          Retry
        </button>
      )}
      {(diagnostic.category === "input" || diagnostic.category === "output") && (
        <button type="button" onClick={onOpenSettings}>
          Settings
        </button>
      )}
      <button type="button" onClick={onDismiss} aria-label="Dismiss message">
        <X size={14} />
      </button>
    </div>
  </div>
);
