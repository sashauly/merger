import { X } from "lucide-react";
import type { AudioDeviceList } from "../../audio/recorder/devices";
import type { RecorderState } from "../../audio/recorder/types";
import { StatusPanel } from "./StatusPanel";

interface SettingsPanelProps {
  open: boolean;
  state: RecorderState;
  devices: AudioDeviceList;
  selectedInputId: string;
  selectedOutputId: string;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  midiInputs: string[];
  lastMidiMessage: string;
  midiEnabled: boolean;
  midiPermission: "disabled" | "unsupported" | "prompt" | "granted" | "denied";
  hapticsEnabled: boolean;
  onClose: () => void;
  onSetInputDevice: (deviceId: string) => void;
  onSetOutputDevice: (deviceId: string) => void;
  onSetNoiseSuppression: (enabled: boolean) => Promise<void>;
  onSetEchoCancellation: (enabled: boolean) => Promise<void>;
  onEnableMidi: () => void;
  onSetHapticsEnabled: (enabled: boolean) => void;
  onDismissDiagnostic: (id: string) => void;
  onRetryEngine: () => void;
}

export const SettingsPanel = ({
  open,
  state,
  devices,
  selectedInputId,
  selectedOutputId,
  noiseSuppression,
  echoCancellation,
  midiInputs,
  lastMidiMessage,
  midiEnabled,
  midiPermission,
  hapticsEnabled,
  onClose,
  onSetInputDevice,
  onSetOutputDevice,
  onSetNoiseSuppression,
  onSetEchoCancellation,
  onEnableMidi,
  onSetHapticsEnabled,
  onDismissDiagnostic,
  onRetryEngine,
}: SettingsPanelProps) => {
  if (!open) return null;
  return (
    <aside className="settings-panel">
      <div className="panel-title">
        <span>Settings</span>
        <button type="button" onClick={onClose} aria-label="Close settings">
          <X size={16} />
        </button>
      </div>
      <label>
        Input
        <select
          value={selectedInputId}
          onChange={(event) => onSetInputDevice(event.target.value)}
        >
          {devices.inputs.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Output
        <select
          value={selectedOutputId}
          onChange={(event) => onSetOutputDevice(event.target.value)}
        >
          {devices.outputs.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </label>
      <label className="toggle-setting">
        <input
          type="checkbox"
          checked={noiseSuppression}
          onChange={(e) => void onSetNoiseSuppression(e.target.checked)}
        />
        <span>Enable Noise Suppression (reduces background hum)</span>
      </label>

      <label className="toggle-setting">
        <input
          type="checkbox"
          checked={echoCancellation}
          onChange={(e) => void onSetEchoCancellation(e.target.checked)}
        />
        <span>Enable Echo Cancellation</span>
      </label>
      <div className="settings-meta">
        <StatusPanel
          state={state}
          onDismissDiagnostic={onDismissDiagnostic}
          onRetryEngine={onRetryEngine}
          onOpenSettings={() => undefined}
        />
        <button
          type="button"
          onClick={onEnableMidi}
          disabled={midiPermission === "prompt" || midiPermission === "granted"}
        >
          {midiPermission === "granted"
            ? "MIDI enabled"
            : midiPermission === "prompt"
              ? "Requesting MIDI..."
              : "Enable MIDI control"}
        </button>
        <label>
          Haptics
          <input
            type="checkbox"
            checked={hapticsEnabled}
            onChange={(event) => onSetHapticsEnabled(event.target.checked)}
          />
        </label>
        <span>
          MIDI:{" "}
          {midiEnabled
            ? midiInputs.length
              ? midiInputs.join(", ")
              : "enabled, no inputs"
            : "disabled"}
        </span>
        <span>MIDI permission: {midiPermission}</span>
        {midiEnabled && <span>Last MIDI: {lastMidiMessage || "none"}</span>}
        {state.inputError && <span>Input: {state.inputError}</span>}
        {state.outputError && <span>Output: {state.outputError}</span>}
      </div>
    </aside>
  );
};
