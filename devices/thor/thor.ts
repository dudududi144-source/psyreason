// devices/thor/thor.ts - Reason Thor modular synth clone
// 3 oscillator slots, 2 filter slots, modulation matrix, step sequencer

export type ThorOscType = 'analog-saw' | 'analog-square' | 'analog-tri' | 'wavetable' | 'fm' | 'noise' | 'phase-mod';
export type ThorFilterType = 'lowpass' | 'highpass' | 'bandpass' | 'drive' | 'comb' | 'scream';

export interface ThorOscSlot {
  type: ThorOscType;
  octave: number;       // -4 to +4
  semitone: number;     // -12 to +12
  tune: number;         // cents -50 to +50
  wavetablePos: number; // 0-1 (for wavetable)
  fmAmount: number;     // 0-1 (for FM)
  kbd: number;          // keyboard tracking 0-1
  level: number;        // 0-1
  enabled: boolean;
}

export interface ThorFilterSlot {
  type: ThorFilterType;
  frequency: number;   // Hz
  resonance: number;   // 0-1
  drive: number;       // 0-1
  envelopeAmount: number; // 0-1
  kbd: number;         // keyboard tracking
  enabled: boolean;
}

export interface ThorEnvelope {
  attack: number;   // seconds
  decay: number;    // seconds
  sustain: number;  // 0-1
  release: number;  // seconds
  velocity: number; // 0-1
}

export interface ThorLFO {
  waveform: 'sine' | 'triangle' | 'saw' | 'square' | 'random';
  rate: number;      // Hz or beat division
  sync: boolean;
  delay: number;     // seconds
  amount: number;    // 0-1
  destination: string;
}

export interface ThorModMatrixEntry {
  source: string;    // lfo1, lfo2, env1, env2, velocity, modwheel, pitchbend
  destination: string; // osc1-pitch, osc2-pitch, filter1-freq, amp, etc
  amount: number;    // -1 to 1
}

export interface ThorPatch {
  name: string;
  oscs: ThorOscSlot[];
  filters: ThorFilterSlot[];
  filterRouting: 'serial' | 'parallel' | 'osc-split';
  ampEnv: ThorEnvelope;
  filterEnv: ThorEnvelope;
  lfos: ThorLFO[];
  modMatrix: ThorModMatrixEntry[];
  voiceMode: 'mono' | 'poly' | 'legato';
  glideTime: number;
  unison: number;      // 1-7 voices
  unisonDetune: number;
  volume: number;
}

export const DEFAULT_THOR_PATCH: ThorPatch = {
  name: 'Init',
  oscs: [
    { type: 'analog-saw', octave: 0, semitone: 0, tune: 0, wavetablePos: 0, fmAmount: 0, kbd: 1, level: 0.8, enabled: true },
    { type: 'analog-square', octave: -1, semitone: 0, tune: 0, wavetablePos: 0, fmAmount: 0, kbd: 1, level: 0.4, enabled: true },
    { type: 'noise', octave: 0, semitone: 0, tune: 0, wavetablePos: 0, fmAmount: 0, kbd: 0, level: 0, enabled: false },
  ],
  filters: [
    { type: 'lowpass', frequency: 8000, resonance: 0.2, drive: 0, envelopeAmount: 0.3, kbd: 0.5, enabled: true },
    { type: 'highpass', frequency: 30, resonance: 0, drive: 0, envelopeAmount: 0, kbd: 0, enabled: true },
  ],
  filterRouting: 'serial',
  ampEnv: { attack: 0.005, decay: 0.2, sustain: 0.7, release: 0.3, velocity: 0.5 },
  filterEnv: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.3, velocity: 0.5 },
  lfos: [
    { waveform: 'sine', rate: 0.5, sync: false, delay: 0, amount: 0, destination: 'osc1-pitch' },
    { waveform: 'triangle', rate: 2, sync: false, delay: 0, amount: 0, destination: 'filter1-freq' },
  ],
  modMatrix: [],
  voiceMode: 'poly',
  glideTime: 0,
  unison: 1,
  unisonDetune: 0.15,
  volume: 0.8,
};

// Psytrance-specific Thor presets
export const THOR_PSYTRANCE_PRESETS: ThorPatch[] = [
  {
    ...DEFAULT_THOR_PATCH,
    name: 'Psy Lead Screamer',
    oscs: [
      { type: 'analog-saw', octave: 0, semitone: 0, tune: -7, wavetablePos: 0, fmAmount: 0, kbd: 1, level: 0.7, enabled: true },
      { type: 'analog-saw', octave: 0, semitone: 0, tune: 7, wavetablePos: 0, fmAmount: 0, kbd: 1, level: 0.7, enabled: true },
      { type: 'analog-square', octave: 1, semitone: 0, tune: 0, wavetablePos: 0, fmAmount: 0, kbd: 1, level: 0.3, enabled: true },
    ],
    filters: [
      { type: 'lowpass', frequency: 6000, resonance: 0.5, drive: 0.4, envelopeAmount: 0.4, kbd: 0.6, enabled: true },
      { type: 'highpass', frequency: 60, resonance: 0, drive: 0, envelopeAmount: 0, kbd: 0, enabled: true },
    ],
    unison: 3,
    unisonDetune: 0.2,
    ampEnv: { attack: 0.003, decay: 0.15, sustain: 0.85, release: 0.2, velocity: 0.3 },
    filterEnv: { attack: 0.002, decay: 0.25, sustain: 0.5, release: 0.2, velocity: 0.6 },
  },
  {
    ...DEFAULT_THOR_PATCH,
    name: 'Rolling Bass 145',
    oscs: [
      { type: 'analog-saw', octave: -2, semitone: 0, tune: 0, wavetablePos: 0, fmAmount: 0, kbd: 1, level: 0.9, enabled: true },
      { type: 'analog-square', octave: -1, semitone: 0, tune: 0, wavetablePos: 0, fmAmount: 0, kbd: 1, level: 0.3, enabled: true },
      { type: 'analog-tri', octave: -3, semitone: 0, tune: 0, wavetablePos: 0, fmAmount: 0, kbd: 1, level: 0.5, enabled: true },
    ],
    filters: [
      { type: 'lowpass', frequency: 900, resonance: 0.65, drive: 0.3, envelopeAmount: 0.6, kbd: 0.8, enabled: true },
      { type: 'drive', frequency: 4000, resonance: 0.2, drive: 0.5, envelopeAmount: 0.2, kbd: 0.3, enabled: true },
    ],
    voiceMode: 'mono',
    glideTime: 0.02,
    ampEnv: { attack: 0.001, decay: 0.18, sustain: 0.35, release: 0.08, velocity: 0.4 },
    filterEnv: { attack: 0.001, decay: 0.16, sustain: 0.3, release: 0.1, velocity: 0.7 },
  },
  {
    ...DEFAULT_THOR_PATCH,
    name: 'Acid 303 Style',
    oscs: [
      { type: 'analog-saw', octave: -1, semitone: 0, tune: 0, wavetablePos: 0, fmAmount: 0, kbd: 1, level: 1.0, enabled: true },
      { type: 'analog-saw', octave: 0, semitone: 0, tune: 0, wavetablePos: 0, fmAmount: 0, kbd: 1, level: 0, enabled: false },
      { type: 'noise', octave: 0, semitone: 0, tune: 0, wavetablePos: 0, fmAmount: 0, kbd: 0, level: 0, enabled: false },
    ],
    filters: [
      { type: 'lowpass', frequency: 350, resonance: 0.88, drive: 0.6, envelopeAmount: 0.85, kbd: 0.4, enabled: true },
      { type: 'scream', frequency: 3000, resonance: 0.4, drive: 0.4, envelopeAmount: 0.3, kbd: 0.2, enabled: true },
    ],
    voiceMode: 'mono',
    glideTime: 0.04,
    ampEnv: { attack: 0.001, decay: 0.22, sustain: 0.45, release: 0.1, velocity: 0.6 },
    filterEnv: { attack: 0.001, decay: 0.19, sustain: 0.15, release: 0.12, velocity: 0.9 },
  },
  {
    ...DEFAULT_THOR_PATCH,
    name: 'Full-On Pad',
    oscs: [
      { type: 'wavetable', octave: 0, semitone: 0, tune: -10, wavetablePos: 0.3, fmAmount: 0, kbd: 1, level: 0.6, enabled: true },
      { type: 'wavetable', octave: 0, semitone: 0, tune: 10, wavetablePos: 0.5, fmAmount: 0, kbd: 1, level: 0.6, enabled: true },
      { type: 'analog-saw', octave: 1, semitone: 7, tune: 0, wavetablePos: 0, fmAmount: 0, kbd: 1, level: 0.25, enabled: true },
    ],
    filters: [
      { type: 'lowpass', frequency: 4500, resonance: 0.25, drive: 0.1, envelopeAmount: 0.25, kbd: 0.5, enabled: true },
      { type: 'highpass', frequency: 120, resonance: 0, drive: 0, envelopeAmount: 0, kbd: 0, enabled: true },
    ],
    unison: 5,
    unisonDetune: 0.25,
    ampEnv: { attack: 0.8, decay: 0.5, sustain: 0.8, release: 2.0, velocity: 0.4 },
    filterEnv: { attack: 0.6, decay: 0.8, sustain: 0.6, release: 1.5, velocity: 0.5 },
    lfos: [
      { waveform: 'sine', rate: 0.25, sync: false, delay: 0.5, amount: 0.3, destination: 'osc1-pitch' },
      { waveform: 'triangle', rate: 0.15, sync: false, delay: 0, amount: 0.4, destination: 'filter1-freq' },
    ],
  },
];

// Thor voice (single voice with 3 oscs + 2 filters + envs)
export class ThorVoice {
  private patch: ThorPatch;
  private sampleRate: number;
  private oscPhases: number[] = [0, 0, 0];
  private filterState = { ic1eq: 0, ic2eq: 0 };
  private filterState2 = { ic1eq: 0, ic2eq: 0 };
  private ampEnvValue = 0;
  private ampEnvStage: 'idle' | 'attack' | 'decay' | 'sustain' | 'release' = 'idle';
  private filterEnvValue = 0;
  private noiseState = 1;

  constructor(sampleRate: number, patch: ThorPatch) {
    this.sampleRate = sampleRate;
    this.patch = patch;
  }

  // LCG noise (deterministic)
  private nextNoise(): number {
    this.noiseState = (this.noiseState * 1103515245 + 12345) & 0x7fffffff;
    return (this.noiseState / 0x7fffffff) * 2 - 1;
  }

  private polyblep(phase: number, dt: number): number {
    if (phase < dt) {
      const p = phase / dt;
      return 2 * p - p * p - 1;
    }
    if (phase > 1 - dt) {
      const p = (phase - 1) / dt;
      return 2 * p + p * p + 1;
    }
    return 0;
  }

  private renderOsc(osc: ThorOscSlot, freq: number): number {
    if (!osc.enabled || osc.level === 0) return 0;

    const oscFreq = freq * Math.pow(2, osc.octave) * Math.pow(2, osc.semitone / 12);
    const dt = oscFreq / this.sampleRate;
    const slotIndex = this.patch.oscs.indexOf(osc);
    const phase = this.oscPhases[slotIndex];

    let sample = 0;
    switch (osc.type) {
      case 'analog-saw': {
        const ph = phase - Math.floor(phase);
        sample = 2 * ph - 1 - this.polyblep(ph, dt);
        break;
      }
      case 'analog-square': {
        const ph = phase - Math.floor(phase);
        sample = ph < 0.5 ? 1 : -1;
        break;
      }
      case 'analog-tri': {
        const ph = phase - Math.floor(phase);
        sample = ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph;
        break;
      }
      case 'wavetable': {
        // Simple wavetable: morph between saw and square based on position
        const ph = phase - Math.floor(phase);
        const saw = 2 * ph - 1;
        const sq = ph < 0.5 ? 1 : -1;
        sample = saw * (1 - osc.wavetablePos) + sq * osc.wavetablePos;
        break;
      }
      case 'noise': {
        sample = this.nextNoise();
        break;
      }
      default: {
        const ph = phase - Math.floor(phase);
        sample = 2 * ph - 1;
      }
    }

    this.oscPhases[slotIndex] += dt;
    this.oscPhases[slotIndex] -= Math.floor(this.oscPhases[slotIndex]);

    return sample * osc.level;
  }

  private renderFilter(input: number, filter: ThorFilterSlot, state: { ic1eq: number; ic2eq: number }): number {
    if (!filter.enabled) return input;

    // Apply envelope and kbd tracking
    const envMod = this.filterEnvValue * filter.envelopeAmount * 8000;
    const freq = Math.min(Math.max(filter.frequency + envMod, 20), this.sampleRate / 2 - 200);

    // ZDF SVF
    const k = Math.SQRT2 * (1 - filter.resonance);
    const g = Math.tan(Math.PI * freq / this.sampleRate);
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;

    let processed = input;
    if (filter.drive > 0) {
      const dg = 1 + filter.drive * 8;
      processed = Math.tanh(input * dg) / dg;
    }

    const v3 = processed - state.ic2eq;
    const v1 = a1 * state.ic1eq + a2 * v3;
    const v2 = state.ic2eq + a2 * state.ic1eq + a3 * v3;
    state.ic1eq = 2 * v1 - state.ic1eq;
    state.ic2eq = 2 * v2 - state.ic2eq;

    const low = v2;
    const high = processed - k * v1 - v2;
    const band = v1;

    switch (filter.type) {
      case 'lowpass': return low;
      case 'highpass': return high;
      case 'bandpass': return band;
      case 'drive': return Math.tanh(low * (1 + filter.drive * 3));
      case 'comb': return (low + band) * 0.5;
      case 'scream': return Math.tanh((low + high * filter.resonance) * (1 + filter.drive * 2));
      default: return low;
    }
  }

  private processEnvelope(env: ThorEnvelope, gate: boolean, currentValue: number, currentStage: string): { value: number; stage: string } {
    const sr = this.sampleRate;
    let value = currentValue;
    let stage = currentStage;

    if (gate) {
      if (stage === 'idle' || stage === 'release') {
        stage = 'attack';
      }
      if (stage === 'attack') {
        value += 1 / (env.attack * sr);
        if (value >= 1) { value = 1; stage = 'decay'; }
      } else if (stage === 'decay') {
        value -= (1 - env.sustain) / (env.decay * sr);
        if (value <= env.sustain) { value = env.sustain; stage = 'sustain'; }
      } else if (stage === 'sustain') {
        value = env.sustain;
      }
    } else {
      if (stage !== 'idle' && stage !== 'release') {
        stage = 'release';
      }
      if (stage === 'release') {
        value -= value / (env.release * sr) - 0.0001;
        if (value <= 0.001) { value = 0; stage = 'idle'; }
      }
    }

    return { value: Math.max(0, Math.min(1, value)), stage };
  }

  noteOn(freq: number, velocity = 1): void {
    void freq; void velocity;
  }

  process(freq: number, gate: boolean, velocity = 1): number {
    // Sum oscillators
    let sample = 0;
    for (const osc of this.patch.oscs) {
      sample += this.renderOsc(osc, freq);
    }

    // Filter routing
    if (this.patch.filterRouting === 'serial') {
      sample = this.renderFilter(sample, this.patch.filters[0], this.filterState);
      sample = this.renderFilter(sample, this.patch.filters[1], this.filterState2);
    } else {
      // parallel: mix both filters
      const f1 = this.renderFilter(sample, this.patch.filters[0], this.filterState);
      const f2 = this.renderFilter(sample, this.patch.filters[1], this.filterState2);
      sample = (f1 + f2) * 0.5;
    }

    // Envelopes
    const ampResult = this.processEnvelope(this.patch.ampEnv, gate, this.ampEnvValue, this.ampEnvStage);
    this.ampEnvValue = ampResult.value;
    this.ampEnvStage = ampResult.stage as typeof this.ampEnvStage;

    const filtResult = this.processEnvelope(this.patch.filterEnv, gate, this.filterEnvValue, 'attack');
    this.filterEnvValue = filtResult.value;

    // Velocity
    const velScale = 1 - this.patch.ampEnv.velocity + this.patch.ampEnv.velocity * velocity;

    return sample * this.ampEnvValue * velScale * this.patch.volume;
  }

  isIdle(): boolean {
    return this.ampEnvStage === 'idle';
  }
}

// Thor main class with voice pool
export class ThorSynth {
  private sampleRate: number;
  private patch: ThorPatch;
  private voices: Map<number, ThorVoice> = new Map();
  private maxVoices = 8;

  constructor(sampleRate: number = 44100, patch: ThorPatch = DEFAULT_THOR_PATCH) {
    this.sampleRate = sampleRate;
    this.patch = patch;
  }

  loadPatch(patch: ThorPatch): void {
    this.patch = patch;
  }

  noteOn(midi: number, velocity = 1): void {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const voice = new ThorVoice(this.sampleRate, this.patch);
    voice.noteOn(freq, velocity);
    this.voices.set(midi, voice);

    // Voice stealing if needed
    if (this.voices.size > this.maxVoices) {
      const firstKey = this.voices.keys().next().value;
      if (firstKey !== undefined) this.voices.delete(firstKey);
    }
  }

  noteOff(midi: number): void {
    // Voice stays in map until release completes (handled in process)
    void midi;
  }

  process(buffer: Float32Array, activeNotes: Map<number, boolean>): void {
    for (let i = 0; i < buffer.length; i++) {
      let sum = 0;
      for (const [midi, gate] of activeNotes.entries()) {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        let voice = this.voices.get(midi);
        if (!voice) {
          voice = new ThorVoice(this.sampleRate, this.patch);
          this.voices.set(midi, voice);
        }
        sum += voice.process(freq, gate);
      }
      buffer[i] = sum;
    }

    // Cleanup idle voices
    for (const [midi, voice] of this.voices.entries()) {
      if (voice.isIdle() && !activeNotes.get(midi)) {
        this.voices.delete(midi);
      }
    }
  }
}
