import { Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { dbStringToGain, gainToDbString, panStringToPan, panToPanString } from "../../audio/recorder/mixerFormat";
import type { RecorderState } from "../../audio/recorder/types";

interface MixerPanelProps {
  state: RecorderState;
  onSetVolume: (channel: number, value: number) => void;
  onSetPan: (channel: number, value: number) => void;
  onToggleMute: (channel: number) => void;
  onToggleSolo: (channel: number) => void;
  onSetRecordArm: (channel: number) => void;
  onClearTrack: (channel: number) => void;
  onImportAudioFile: (channel: number, file: File) => Promise<void>;
}

export const MixerPanel = ({
  state,
  onSetVolume,
  onSetPan,
  onToggleMute,
  onToggleSolo,
  onSetRecordArm,
  onClearTrack,
  onImportAudioFile,
}: MixerPanelProps) => {
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [typedVols, setTypedVols] = useState(() => state.volumes.map(gainToDbString));
  const [typedPans, setTypedPans] = useState(() => state.pans.map(panToPanString));
  const [focusedVol, setFocusedVol] = useState<number | null>(null);
  const [focusedPan, setFocusedPan] = useState<number | null>(null);

  useEffect(() => {
    setTypedVols((current) => current.map((value, index) => (focusedVol === index ? value : gainToDbString(state.volumes[index]))));
    setTypedPans((current) => current.map((value, index) => (focusedPan === index ? value : panToPanString(state.pans[index]))));
  }, [focusedPan, focusedVol, state.pans, state.volumes]);

  const handleFile = (channel: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void onImportAudioFile(channel, file);
    event.target.value = "";
  };

  return (
    <section className="mixer-grid">
      {state.volumes.map((volume, channel) => {
        const isArmed = state.recordArmChannel === channel;
        const isMuted = state.mutes[channel];
        const isSoloed = state.solos[channel];
        return (
          <article className="panel track-strip" key={channel}>
            <span className="track-id">T{channel + 1}</span>
            <input
              value={typedVols[channel]}
              onFocus={() => setFocusedVol(channel)}
              onBlur={() => setFocusedVol(null)}
              onChange={(event) => {
                const value = event.target.value;
                setTypedVols((current) => current.map((item, index) => (index === channel ? value : item)));
                onSetVolume(channel, dbStringToGain(value));
              }}
            />
            <input
              className="volume-fader"
              type="range"
              min="0"
              max="1.5"
              step="0.01"
              value={volume}
              onChange={(event) => onSetVolume(channel, Number(event.target.value))}
            />
            <input
              value={typedPans[channel]}
              onFocus={() => setFocusedPan(channel)}
              onBlur={() => setFocusedPan(null)}
              onChange={(event) => {
                const value = event.target.value;
                setTypedPans((current) => current.map((item, index) => (index === channel ? value : item)));
                onSetPan(channel, panStringToPan(value));
              }}
            />
            <input
              className="pan-slider"
              type="range"
              min="-1"
              max="1"
              step="0.05"
              value={state.pans[channel]}
              onChange={(event) => onSetPan(channel, Number(event.target.value))}
            />
            <div className="track-buttons">
              <button type="button" className={isMuted ? "" : "active"} onClick={() => onToggleMute(channel)}>
                {channel + 1}
              </button>
              <button type="button" className={isSoloed ? "solo" : ""} onClick={() => onToggleSolo(channel)}>
                S
              </button>
              <button type="button" className={isArmed ? "recording" : ""} onClick={() => onSetRecordArm(isArmed ? -1 : channel)}>
                R
              </button>
            </div>
            <div className="track-buttons">
              <button type="button" onClick={() => fileRefs[channel].current?.click()} aria-label={`Import track ${channel + 1}`}>
                <Upload size={16} />
              </button>
              <button type="button" onClick={() => onClearTrack(channel)} aria-label={`Clear track ${channel + 1}`}>
                <Trash2 size={16} />
              </button>
            </div>
            <input ref={fileRefs[channel]} type="file" accept="audio/*" hidden onChange={(event) => handleFile(channel, event)} />
          </article>
        );
      })}
    </section>
  );
};
