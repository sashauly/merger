// src/audio/audio-processor.rs
//
// -----------------------------------------------------------------------------
// MVP 4-Track Portastudio (Rust/WASM DSP Engine)
// -----------------------------------------------------------------------------
// Этот модуль написан на Rust и предназначен для компиляции в WebAssembly с помощью
// wasm-pack. Он содержит ядро звуковой обработки (DSP), хранит буферы дорожек,
// управляет позицией воспроизведения/записи (play/record heads), микширует каналы
// с учетом индивидуальной громкости и панорамы, а также записывает входящие сэмплы.
//
// Для обеспечения максимальной производительности мы используем прямую передачу
// указателей (raw pointers) на массивы f32 между JS и WASM, избегая лишнего
// копирования в AudioWorkletProcessor.

use wasm_bindgen::prelude::*;

// Константа максимальной длины записи (например, 180 секунд при 44.1кГц)
// 180 * 44100 = ~7,938,000 сэмплов на дорожку.
const MAX_TRACK_SECONDS: usize = 180;
const DEFAULT_SAMPLE_RATE: usize = 44100;

#[wasm_bindgen]
pub struct FourTrackStudio {
    sample_rate: usize,
    buffer_len: usize, // Length of each buffer in samples

    // 4 independent audio buffers (mono)
    track_1: Vec<f32>,
    track_2: Vec<f32>,
    track_3: Vec<f32>,
    track_4: Vec<f32>,

    play_head: usize,   // Read index (shared across tracks)
    is_playing: bool,   // Transport state
    is_recording: bool, // Recording state

    // Channel armed for recording (0-3). If -1, recording is disabled.
    record_arm_channel: i32,
    record_mode_overdub: bool, // true = overdub, false = arrangement

    // Channel volume gains
    volume_1: f32,
    volume_2: f32,
    volume_3: f32,
    volume_4: f32,

    // Pans (-1.0 to 1.0)
    pan_1: f32,
    pan_2: f32,
    pan_3: f32,
    pan_4: f32,

    mute_1: bool,
    mute_2: bool,
    mute_3: bool,
    mute_4: bool,

    solo_1: bool,
    solo_2: bool,
    solo_3: bool,
    solo_4: bool,

    // Peak levels for VU Meters
    peak_1: f32,
    peak_2: f32,
    peak_3: f32,
    peak_4: f32,
    input_peak: f32,

    input_buffer: Vec<f32>,
    output_mix_l: Vec<f32>,
    output_mix_r: Vec<f32>,
}

#[wasm_bindgen]
impl FourTrackStudio {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: usize) -> Self {
        let actual_sr = if sample_rate == 0 {
            DEFAULT_SAMPLE_RATE
        } else {
            sample_rate
        };
        let buffer_len = actual_sr * MAX_TRACK_SECONDS;

        FourTrackStudio {
            sample_rate: actual_sr,
            buffer_len,
            track_1: vec![0.0; buffer_len],
            track_2: vec![0.0; buffer_len],
            track_3: vec![0.0; buffer_len],
            track_4: vec![0.0; buffer_len],
            play_head: 0,
            is_playing: false,
            is_recording: false,
            record_arm_channel: -1,
            record_mode_overdub: true,
            volume_1: 1.0,
            volume_2: 1.0,
            volume_3: 1.0,
            volume_4: 1.0,
            pan_1: 0.0,
            pan_2: 0.0,
            pan_3: 0.0,
            pan_4: 0.0,
            mute_1: false,
            mute_2: false,
            mute_3: false,
            mute_4: false,
            solo_1: false,
            solo_2: false,
            solo_3: false,
            solo_4: false,
            peak_1: 0.0,
            peak_2: 0.0,
            peak_3: 0.0,
            peak_4: 0.0,
            input_peak: 0.0,
            input_buffer: vec![0.0; 128],
            output_mix_l: vec![0.0; 128],
            output_mix_r: vec![0.0; 128],
        }
    }

    // --- Transport & Config ---

    pub fn play(&mut self) {
        self.is_playing = true;
    }

    pub fn stop(&mut self) {
        self.is_playing = false;
    }

    pub fn start_recording(&mut self) {
        if self.record_arm_channel >= 0 && self.record_arm_channel < 4 {
            self.is_recording = true;
            self.is_playing = true;
        }
    }

    pub fn stop_recording(&mut self) {
        self.is_recording = false;
    }

    pub fn set_play_head(&mut self, sample_index: usize) {
        if sample_index < self.buffer_len {
            self.play_head = sample_index;
        }
    }

    pub fn get_play_head(&self) -> usize {
        self.play_head
    }

    /// Returns the active sample rate of the studio engine.
    pub fn get_sample_rate(&self) -> usize {
        self.sample_rate
    }

    /// Returns the current playhead position represented in seconds.
    pub fn get_play_time_seconds(&self) -> f32 {
        self.play_head as f32 / self.sample_rate as f32
    }

    /// Sets the playhead position using a seconds value.
    pub fn set_play_time_seconds(&mut self, seconds: f32) {
        let sample_index = (seconds * self.sample_rate as f32) as usize;
        if sample_index < self.buffer_len {
            self.play_head = sample_index;
        }
    }

    /// Returns the maximum allowed recording duration in seconds.
    pub fn get_duration_seconds(&self) -> f32 {
        self.buffer_len as f32 / self.sample_rate as f32
    }

    pub fn set_record_arm(&mut self, channel: i32) {
        if channel >= -1 && channel < 4 {
            self.record_arm_channel = channel;
        }
    }

    pub fn get_record_arm(&self) -> i32 {
        self.record_arm_channel
    }

    pub fn set_record_mode_overdub(&mut self, overdub: bool) {
        self.record_mode_overdub = overdub;
    }

    // --- Mixer Setters & Getters ---

    pub fn set_volume(&mut self, channel: usize, val: f32) {
        let clamped = if val < 0.0 { 0.0 } else { val };
        match channel {
            0 => self.volume_1 = clamped,
            1 => self.volume_2 = clamped,
            2 => self.volume_3 = clamped,
            3 => self.volume_4 = clamped,
            _ => {}
        }
    }

    pub fn get_volume(&self, channel: usize) -> f32 {
        match channel {
            0 => self.volume_1,
            1 => self.volume_2,
            2 => self.volume_3,
            3 => self.volume_4,
            _ => 0.0,
        }
    }

    pub fn set_pan(&mut self, channel: usize, val: f32) {
        let clamped = val.clamp(-1.0, 1.0);
        match channel {
            0 => self.pan_1 = clamped,
            1 => self.pan_2 = clamped,
            2 => self.pan_3 = clamped,
            3 => self.pan_4 = clamped,
            _ => {}
        }
    }

    pub fn set_mute(&mut self, channel: usize, mute: bool) {
        match channel {
            0 => self.mute_1 = mute,
            1 => self.mute_2 = mute,
            2 => self.mute_3 = mute,
            3 => self.mute_4 = mute,
            _ => {}
        }
    }

    pub fn set_solo(&mut self, channel: usize, solo: bool) {
        match channel {
            0 => self.solo_1 = solo,
            1 => self.solo_2 = solo,
            2 => self.solo_3 = solo,
            3 => self.solo_4 = solo,
            _ => {}
        }
    }

    // Peak levels getters for Web Audio thread communication
    pub fn get_peak(&self, channel: usize) -> f32 {
        match channel {
            0 => self.peak_1,
            1 => self.peak_2,
            2 => self.peak_3,
            3 => self.peak_4,
            _ => 0.0,
        }
    }

    pub fn get_input_peak(&self) -> f32 {
        self.input_peak
    }

    // Expose a method to clear the peaks after they are read by the UI thread
    pub fn reset_peaks(&mut self) {
        self.peak_1 = 0.0;
        self.peak_2 = 0.0;
        self.peak_3 = 0.0;
        self.peak_4 = 0.0;
        self.input_peak = 0.0;
    }

    // --- Memory Pointer Exports ---

    pub fn get_track_pointer(&self, channel: usize) -> *const f32 {
        match channel {
            0 => self.track_1.as_ptr(),
            1 => self.track_2.as_ptr(),
            2 => self.track_3.as_ptr(),
            3 => self.track_4.as_ptr(),
            _ => std::ptr::null(),
        }
    }

    pub fn get_track_mut_pointer(&mut self, channel: usize) -> *mut f32 {
        match channel {
            0 => self.track_1.as_mut_ptr(),
            1 => self.track_2.as_mut_ptr(),
            2 => self.track_3.as_mut_ptr(),
            3 => self.track_4.as_mut_ptr(),
            _ => std::ptr::null_mut(),
        }
    }

    pub fn get_input_buffer_pointer(&mut self) -> *mut f32 {
        self.input_buffer.as_mut_ptr()
    }

    pub fn get_output_buffer_pointer(&self, is_right: bool) -> *const f32 {
        if is_right {
            self.output_mix_r.as_ptr()
        } else {
            self.output_mix_l.as_ptr()
        }
    }

    pub fn get_buffer_len(&self) -> usize {
        self.buffer_len
    }

    // --- Core DSP Mixing & Recording Loop ---

    // Inside the process_audio_block method:

    pub fn process_audio_block(&mut self, block_size: usize) {
        if block_size == 0 {
            return;
        }

        if self.input_buffer.len() != block_size {
            self.input_buffer.resize(block_size, 0.0);
            self.output_mix_l.resize(block_size, 0.0);
            self.output_mix_r.resize(block_size, 0.0);
        }

        for i in 0..block_size {
            self.output_mix_l[i] = 0.0;
            self.output_mix_r[i] = 0.0;
        }

        if !self.is_playing {
            for i in 0..block_size {
                let abs_val = self.input_buffer[i].abs();
                if abs_val > self.input_peak {
                    self.input_peak = abs_val;
                }
            }
            return;
        }

        let head = self.play_head;
        let limit = self.buffer_len;
        let has_solo = self.solo_1 || self.solo_2 || self.solo_3 || self.solo_4;

        // Pre-calculate Stereo Panning coefficients outside the loop
        let (g1_l, g1_r) = self.calculate_pan_gains(0, has_solo);
        let (g2_l, g2_r) = self.calculate_pan_gains(1, has_solo);
        let (g3_l, g3_r) = self.calculate_pan_gains(2, has_solo);
        let (g4_l, g4_r) = self.calculate_pan_gains(3, has_solo);

        // Fetch overdub flag before the loop to avoid borrowing self later
        let overdub = self.record_mode_overdub;

        for i in 0..block_size {
            let current_idx = (head + i) % limit;

            // 1. Record incoming input signal if recording is active
            if self.is_recording && self.record_arm_channel >= 0 && self.record_arm_channel < 4 {
                let mic_sample = self.input_buffer[i];
                let abs_mic = mic_sample.abs();
                if abs_mic > self.input_peak {
                    self.input_peak = abs_mic;
                }

                // FIX: Call using Self:: passing the extracted overdub flag
                match self.record_arm_channel {
                    0 => Self::record_to_track(&mut self.track_1, current_idx, mic_sample, overdub),
                    1 => Self::record_to_track(&mut self.track_2, current_idx, mic_sample, overdub),
                    2 => Self::record_to_track(&mut self.track_3, current_idx, mic_sample, overdub),
                    3 => Self::record_to_track(&mut self.track_4, current_idx, mic_sample, overdub),
                    _ => {}
                }
            }

            // 2. Read tracks
            let s1 = self.track_1[current_idx];
            let s2 = self.track_2[current_idx];
            let s3 = self.track_3[current_idx];
            let s4 = self.track_4[current_idx];

            // 3. Track absolute peaks for metering
            if s1.abs() > self.peak_1 {
                self.peak_1 = s1.abs();
            }
            if s2.abs() > self.peak_2 {
                self.peak_2 = s2.abs();
            }
            if s3.abs() > self.peak_3 {
                self.peak_3 = s3.abs();
            }
            if s4.abs() > self.peak_4 {
                self.peak_4 = s4.abs();
            }

            // 4. Stereo mix with individual channel pan and volume
            self.output_mix_l[i] = s1 * g1_l + s2 * g2_l + s3 * g3_l + s4 * g4_l;
            self.output_mix_r[i] = s1 * g1_r + s2 * g2_r + s3 * g3_r + s4 * g4_r;
        }

        self.play_head = (head + block_size) % limit;
    }

    // --- Helpers ---

    fn record_to_track(track: &mut [f32], index: usize, sample: f32, overdub: bool) {
        if overdub {
            let existing = track[index];
            track[index] = (existing + sample).clamp(-1.0, 1.0);
        } else {
            track[index] = sample;
        }
    }

    fn calculate_pan_gains(&self, channel: usize, has_solo: bool) -> (f32, f32) {
        let (vol, pan, mute, solo) = match channel {
            0 => (self.volume_1, self.pan_1, self.mute_1, self.solo_1),
            1 => (self.volume_2, self.pan_2, self.mute_2, self.solo_2),
            2 => (self.volume_3, self.pan_3, self.mute_3, self.solo_3),
            3 => (self.volume_4, self.pan_4, self.mute_4, self.solo_4),
            _ => (0.0, 0.0, true, false),
        };

        let is_active = if has_solo { solo } else { !mute };
        if !is_active {
            return (0.0, 0.0);
        }

        // Constant Power Panning formula
        let angle = (pan + 1.0) * std::f32::consts::FRAC_PI_4;
        (angle.cos() * vol, angle.sin() * vol)
    }

    pub fn clear_all_tracks(&mut self) {
        self.track_1.fill(0.0);
        self.track_2.fill(0.0);
        self.track_3.fill(0.0);
        self.track_4.fill(0.0);
        self.play_head = 0;
    }
}
