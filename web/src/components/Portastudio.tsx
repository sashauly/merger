import { Save, Trash2, Type, Volume2 } from "lucide-react";
import { useState } from "react";
import { triggerHaptic } from "../audio/recorder/haptics";
import { useFourTrackRecorder } from "../hooks/recorder/useFourTrackRecorder";
import { HeaderStatus } from "./recorder/HeaderStatus";
import { MasterActions } from "./recorder/MasterActions";
import { MixerPanel } from "./recorder/MixerPanel";
import { SettingsPanel } from "./recorder/SettingsPanel";
import { TimelinePanel } from "./recorder/TimelinePanel";
import { TransportPanel } from "./recorder/TransportPanel";

export const Portastudio = () => {
  const recorder = useFourTrackRecorder();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const withHaptic = (
    fn: () => void | Promise<void>,
    type: "tap" | "heavy" | "double" = "tap",
  ) => {
    if (recorder.hapticsEnabled) triggerHaptic(type);
    void fn();
  };

  return (
    <div className="studio-app">
      <HeaderStatus
        state={recorder.state}
        loading={recorder.loading}
        statusSeverity={recorder.statusSeverity}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDiagnostics={() => setSettingsOpen(true)}
      />

      <main className="studio-layout">
        <div className="studio-toolbar">
          <TransportPanel
            state={recorder.state}
            onPlay={() => withHaptic(recorder.actions.play)}
            onPause={() => withHaptic(recorder.actions.pause)}
            onStop={() => withHaptic(recorder.actions.stop, "heavy")}
            onRecord={() => withHaptic(recorder.actions.record, "heavy")}
            onRewind={() => withHaptic(recorder.actions.rewind)}
          />
          <MasterActions
            exporting={recorder.exporting}
            hasTapeContent={recorder.hasTapeContent}
            lastExportUrl={recorder.lastExportUrl}
            onClearAll={() => withHaptic(recorder.actions.clearAll, "heavy")}
            onExportWav={() => withHaptic(recorder.actions.exportWav)}
          />
          <div
            className="panel future-actions"
            aria-label="Future project controls"
          >
            <button type="button" disabled title="Future feature: save project">
              <Save size={16} />
            </button>
            <button
              type="button"
              disabled
              title="Future feature: rename project"
            >
              <Type size={16} />
            </button>
            <button
              type="button"
              disabled
              title="Future feature: delete project"
            >
              <Trash2 size={16} />
            </button>
            <button type="button" disabled title="Future feature: metronome">
              <Volume2 size={16} />
            </button>
          </div>
        </div>
        <div className="studio-main">
          <TimelinePanel
            state={recorder.state}
            waveforms={recorder.waveforms}
            gridResolution={recorder.gridResolution}
            tempoValidation={recorder.tempoValidation}
            onSetPlayheadFromTimelineRatio={
              recorder.actions.setPlayheadFromTimelineRatio
            }
            onTimelineCommit={() => {
              if (recorder.hapticsEnabled) triggerHaptic("tap");
            }}
            onSetBpm={recorder.actions.setBpm}
            onSetGridResolution={recorder.actions.setGridResolution}
            onSetRecordMode={recorder.actions.setRecordMode}
          />
          <MixerPanel
            state={recorder.state}
            onSetVolume={recorder.actions.setVolume}
            onSetPan={recorder.actions.setPan}
            onToggleMute={(channel) =>
              withHaptic(() => recorder.actions.toggleMute(channel))
            }
            onToggleSolo={(channel) =>
              withHaptic(() => recorder.actions.toggleSolo(channel), "heavy")
            }
            onSetRecordArm={(channel) =>
              withHaptic(() => recorder.actions.setRecordArm(channel))
            }
            onClearTrack={(channel) =>
              withHaptic(() => recorder.actions.clearTrack(channel), "heavy")
            }
            onImportAudioFile={recorder.actions.importAudioFile}
          />
        </div>
      </main>

      <SettingsPanel
        open={settingsOpen}
        state={recorder.state}
        devices={recorder.devices}
        selectedInputId={recorder.selectedInputId}
        selectedOutputId={recorder.selectedOutputId}
        noiseSuppression={recorder.state.noiseSuppression}
        echoCancellation={recorder.state.echoCancellation}
        midiInputs={recorder.midiInputs}
        lastMidiMessage={recorder.lastMidiMessage}
        midiEnabled={recorder.midiEnabled}
        midiPermission={recorder.midiPermission}
        hapticsEnabled={recorder.hapticsEnabled}
        onClose={() => setSettingsOpen(false)}
        onSetInputDevice={(deviceId) =>
          void recorder.actions.setInputDevice(deviceId)
        }
        onSetOutputDevice={(deviceId) =>
          void recorder.actions.setOutputDevice(deviceId)
        }
        onSetNoiseSuppression={recorder.actions.setNoiseSuppression}
        onSetEchoCancellation={recorder.actions.setEchoCancellation}
        onEnableMidi={() => void recorder.actions.enableMidi()}
        onSetHapticsEnabled={(enabled) =>
          recorder.actions.setHapticsEnabled(enabled)
        }
        onDismissDiagnostic={recorder.actions.dismissDiagnostic}
        onRetryEngine={() => void recorder.actions.init()}
      />
    </div>
  );
};
