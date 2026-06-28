import "../worklet-polyfill.ts";
import init, { FourTrackStudio } from "../../wasm/core_audio.js";
import type { RecorderCommand } from "./types";

interface AudioWorkletProcessor {
  readonly port: MessagePort;
}

declare const AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (): AudioWorkletProcessor;
};

declare function registerProcessor(
  name: string,
  processorCtor: new (...args: never[]) => AudioWorkletProcessor,
): void;

class FourTrackRecorderProcessor extends AudioWorkletProcessor {
  private studio: FourTrackStudio | null = null;
  private wasmMemory: WebAssembly.Memory | null = null;
  private isReady = false;
  private isPlaying = false;
  private isRecording = false;
  private blockCounter = 0;

  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent<RecorderCommand>) => {
      void this.handleMessage(event.data);
    };
  }

  private async handleMessage(command: RecorderCommand): Promise<void> {
    if (command.type === "INIT_WASM") {
      try {
        const { wasmBytes, sampleRate } = command.payload;
        const wasmInstance = await init({ module_or_path: wasmBytes });
        this.wasmMemory = wasmInstance.memory;
        this.studio = new FourTrackStudio(sampleRate);
        this.isReady = true;
        this.port.postMessage({
          type: "READY",
          sampleRate,
          bufferLen: this.studio.get_buffer_len(),
          durationSeconds: this.studio.get_duration_seconds(),
        });
      } catch (error) {
        this.port.postMessage({
          type: "ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (!this.isReady || !this.studio) return;

    switch (command.type) {
      case "PLAY":
        this.studio.play();
        this.isPlaying = true;
        break;
      case "STOP":
        this.studio.stop();
        this.isPlaying = false;
        this.isRecording = false;
        break;
      case "START_RECORDING":
        this.studio.start_recording();
        this.isPlaying = true;
        this.isRecording = this.studio.get_record_arm() >= 0;
        break;
      case "STOP_RECORDING":
        this.studio.stop_recording();
        this.isRecording = false;
        break;
      case "SET_PLAY_HEAD":
        this.studio.set_play_head(Math.floor(command.payload));
        break;
      case "SET_PLAY_TIME":
        this.studio.set_play_time_seconds(command.payload);
        break;
      case "SET_RECORD_ARM":
        this.studio.set_record_arm(command.payload);
        break;
      case "SET_RECORD_MODE_OVERDUB":
        this.studio.set_record_mode_overdub(command.payload);
        break;
      case "SET_VOLUME":
        this.studio.set_volume(command.payload.channel, command.payload.val);
        break;
      case "SET_PAN":
        this.studio.set_pan(command.payload.channel, command.payload.val);
        break;
      case "SET_MUTE":
        this.studio.set_mute(command.payload.channel, command.payload.mute);
        break;
      case "SET_SOLO":
        this.studio.set_solo(command.payload.channel, command.payload.solo);
        break;
      case "CLEAR_TRACKS":
        this.studio.clear_all_tracks();
        break;
      case "LOAD_TRACK_DATA":
        this.loadTrackData(command.payload.channel, command.payload.data);
        break;
      case "REQUEST_EXPORT":
        this.postTrackSnapshot();
        break;
    }
  }

  private loadTrackData(channel: number, data: Float32Array): void {
    if (!this.studio || !this.wasmMemory) return;
    const trackPtr = this.studio.get_track_mut_pointer(channel);
    if (!trackPtr) return;
    const trackView = new Float32Array(
      this.wasmMemory.buffer,
      trackPtr,
      this.studio.get_buffer_len(),
    );
    trackView.fill(0);
    trackView.set(
      data.length > trackView.length
        ? data.subarray(0, trackView.length)
        : data,
    );
  }

  private postTrackSnapshot(): void {
    if (!this.studio || !this.wasmMemory) return;
    const bufferLen = this.studio.get_buffer_len();
    const tracks: Float32Array[] = [];
    const transfers: ArrayBuffer[] = [];

    for (let channel = 0; channel < 4; channel++) {
      const trackPtr = this.studio.get_track_pointer(channel);
      const trackView = new Float32Array(
        this.wasmMemory.buffer,
        trackPtr,
        bufferLen,
      );
      const copy = new Float32Array(trackView);
      tracks.push(copy);
      transfers.push(copy.buffer);
    }

    this.port.postMessage(
      {
        type: "EXPORT_RESPONSE",
        tracks,
        sampleRate: this.studio.get_sample_rate(),
        bufferLen,
      },
      transfers,
    );
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    if (!this.isReady || !this.studio || !this.wasmMemory) {
      const output = outputs[0];
      if (output?.[0]) output[0].fill(0);
      if (output?.[1]) output[1].fill(0);
      return true;
    }

    const blockLen = 128;
    const output = outputs[0];
    const outputL = output?.[0];
    const outputR = output?.[1];
    if (!outputL || !outputR) return true;

    const micInput = inputs[0]?.[0];
    if (micInput) {
      const inputPtr = this.studio.get_input_buffer_pointer();
      new Float32Array(this.wasmMemory.buffer, inputPtr, blockLen).set(
        micInput,
      );
    }

    this.studio.process_audio_block(blockLen);

    const outLPtr = this.studio.get_output_buffer_pointer(false);
    const outRPtr = this.studio.get_output_buffer_pointer(true);
    outputL.set(new Float32Array(this.wasmMemory.buffer, outLPtr, blockLen));
    outputR.set(new Float32Array(this.wasmMemory.buffer, outRPtr, blockLen));

    this.blockCounter++;
    if (this.blockCounter >= 15) {
      this.blockCounter = 0;
      this.port.postMessage({
        type: "PLAYHEAD_UPDATE",
        playHead: this.studio.get_play_head(),
        playTime: this.studio.get_play_time_seconds(),
        isPlaying: this.isPlaying,
        isRecording: this.isRecording,
        peaks: [0, 1, 2, 3].map(
          (channel) => this.studio?.get_peak(channel) || 0,
        ),
        inputPeak: this.studio.get_input_peak(),
      });

      this.studio.reset_peaks();
    }

    return true;
  }
}

registerProcessor("four-track-recorder-processor", FourTrackRecorderProcessor);
