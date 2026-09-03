// devices/malstrom/malstrom.ts - Reason Malstrom granular synth clone
// Graintable synthesis: wavetable grains with granular manipulation

export type MalstromOscType = 'graintable' | 'granular' | 'noise' | 'tone';

export interface GraintableParams {
  position: number;      // 0-1 (position in wavetable)
  motion: number;        // -1 to 1 (grain movement speed)
  index: number;         // 0-1 (grain density)
  pitch: number;         // semitones
  level: number;         // 0-1
  enabled: boolean;
}

export interface MalstromPatch {
  name: string;
  oscA: GraintableParams;
  oscB: GraintableParams;
  filterFreq: number;
  filterRes: number;
  filterMode: 'lowpass' | 'bandpass' | 'highpass' | 'comb';
  envelopeAttack: number;
  envelopeDecay: number;
  envelopeSustain: number;
  envelopeRelease: number;
  volume: number;
}

export const DEFAULT_MALSTROM_PATCH: MalstromPatch = {
  name: 'Init',
  oscA: { position: 0.3, motion: 0.2, index: 0.5, pitch: 0, level: 0.8, enabled: true },
  oscB: { position: 0.6, motion: -0.15, index: 0.4, pitch: 12, level: 0.4, enabled: true },
  filterFreq: 5000,
  filterRes: 0.3,
  filterMode: 'lowpass',
  envelopeAttack: 0.01,
  envelopeDecay: 0.3,
  envelopeSustain: 0.6,
  envelopeRelease: 0.4,
  volume: 0.8,
};

// Graintable wavetables (Reason-style single-cycle waveforms)
export const GRAINTABLE_NAMES = [
  'saw-sweep',
  'square-pulse',
  'vocal-ah',
  'vocal-oh',
  'metallic',
  'organic',
  'psy-lead',
  'dark-drone',
];

export function buildGraintable(name: string, size = 2048): Float32Array {
  const table = new Float32Array(size);
  const idx = GRAINTABLE_NAMES.indexOf(name);
  
  for (let i = 0; i < size; i++) {
    const t = i / size;
    switch (idx) {
      case 0: // saw-sweep
        table[i] = (2 * t - 1) * Math.sin(Math.PI * t);
        break;
      case 1: // square-pulse
        table[i] = t < 0.5 ? 1 - t * 0.5 : -1 + (t - 0.5) * 0.5;
        break;
      case 2: // vocal-ah
        table[i] = Math.sin(2 * Math.PI * t) * 0.6 + Math.sin(4 * Math.PI * t) * 0.3 + Math.sin(6 * Math.PI * t) * 0.1;
        break;
      case 3: // vocal-oh
        table[i] = Math.sin(2 * Math.PI * t) * 0.4 + Math.sin(6 * Math.PI * t) * 0.4 + Math.sin(10 * Math.PI * t) * 0.2;
        break;
      case 4: // metallic
        table[i] = Math.sin(2 * Math.PI * t * 3.7) * Math.sin(2 * Math.PI * t);
        break;
      case 5: // organic
        table[i] = Math.sin(2 * Math.PI * t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * t * 2));
        break;
      case 6: // psy-lead
        table[i] = (2 * t - 1) * 0.7 + Math.sin(2 * Math.PI * t * 2) * 0.3;
        break;
      case 7: // dark-drone
        table[i] = Math.sin(2 * Math.PI * t) * 0.8 + Math.sin(2 * Math.PI * t * 0.5) * 0.2;
        break;
      default:
        table[i] = Math.sin(2 * Math.PI * t);
    }
  }
  return table;
}

export class MalstromVoice {
  private patch: MalstromPatch;
  private sampleRate: number;
  private phaseA = 0;
  private phaseB = 0;
  private grainPhaseA = 0;
  private grainPhaseB = 0;
  private tableA: Float32Array;
  private tableB: Float32Array;
  private envValue = 0;
  private envStage: 'idle' | 'attack' | 'decay' | 'sustain' | 'release' = 'idle';

  constructor(sampleRate: number, patch: MalstromPatch) {
    this.sampleRate = sampleRate;
    this.patch = patch;
    this.tableA = buildGraintable('psy-lead');
    this.tableB = buildGraintable('vocal-ah');
  }

  private readTable(table: Float32Array, position: number): number {
    const pos = position - Math.floor(position);
    const idx = pos * table.length;
    const i0 = Math.floor(idx) % table.length;
    const i1 = (i0 + 1) % table.length;
    const frac = idx - Math.floor(idx);
    return table[i0] * (1 - frac) + table[i1] * frac;
  }

  process(freq: number, gate: boolean): number {
    const sr = this.sampleRate;
    let output = 0;

    // Oscillator A
    if (this.patch.oscA.enabled && this.patch.oscA.level > 0) {
      const freqA = freq * Math.pow(2, this.patch.oscA.pitch / 12);
      this.phaseA += freqA / sr;
      this.phaseA -= Math.floor(this.phaseA);
      
      // Grain motion: position moves through table
      this.grainPhaseA += this.patch.oscA.motion / (sr * 0.1);
      this.grainPhaseA -= Math.floor(this.grainPhaseA);
      
      const tablePos = (this.patch.oscA.position + this.grainPhaseA) % 1;
      const grain = this.readTable(this.tableA, tablePos);
      
      // Grain envelope (window function based on index)
      const grainWindow = Math.sin(Math.PI * this.grainPhaseA);
      output += grain * grainWindow * this.patch.oscA.level;
    }

    // Oscillator B
    if (this.patch.oscB.enabled && this.patch.oscB.level > 0) {
      const freqB = freq * Math.pow(2, this.patch.oscB.pitch / 12);
      this.phaseB += freqB / sr;
      this.phaseB -= Math.floor(this.phaseB);
      
      this.grainPhaseB += this.patch.oscB.motion / (sr * 0.1);
      this.grainPhaseB -= Math.floor(this.grainPhaseB);
      
      const tablePos = (this.patch.oscB.position + this.grainPhaseB) % 1;
      const grain = this.readTable(this.tableB, tablePos);
      const grainWindow = Math.sin(Math.PI * this.grainPhaseB);
      output += grain * grainWindow * this.patch.oscB.level;
    }

    // Filter (simple one-pole for now)
    const g = Math.tan(Math.PI * this.patch.filterFreq / sr);
    const a = g / (1 + g);
    
    // Envelope
    if (gate) {
      if (this.envStage === 'idle' || this.envStage === 'release') {
        this.envStage = 'attack';
      }
      if (this.envStage === 'attack') {
        this.envValue += 1 / (this.patch.envelopeAttack * sr);
        if (this.envValue >= 1) { this.envValue = 1; this.envStage = 'decay'; }
      } else if (this.envStage === 'decay') {
        this.envValue -= (1 - this.patch.envelopeSustain) / (this.patch.envelopeDecay * sr);
        if (this.envValue <= this.patch.envelopeSustain) { this.envStage = 'sustain'; }
      } else if (this.envStage === 'sustain') {
        this.envValue = this.patch.envelopeSustain;
      }
    } else {
      if (this.envStage !== 'idle' && this.envStage !== 'release') {
        this.envStage = 'release';
      }
      if (this.envStage === 'release') {
        this.envValue -= this.envValue / (this.patch.envelopeRelease * sr);
        if (this.envValue <= 0.001) { this.envValue = 0; this.envStage = 'idle'; }
      }
    }

    return output * this.envValue * this.patch.volume;
  }

  isIdle(): boolean {
    return this.envStage === 'idle';
  }
}

export class MalstromSynth {
  private sampleRate: number;
  private patch: MalstromPatch;
  private voices: Map<number, MalstromVoice> = new Map();

  constructor(sampleRate: number = 44100, patch: MalstromPatch = DEFAULT_MALSTROM_PATCH) {
    this.sampleRate = sampleRate;
    this.patch = patch;
  }

  loadPatch(patch: MalstromPatch): void {
    this.patch = patch;
  }

  noteOn(midi: number): void {
    this.voices.set(midi, new MalstromVoice(this.sampleRate, this.patch));
  }

  process(buffer: Float32Array, activeNotes: Map<number, boolean>): void {
    for (let i = 0; i < buffer.length; i++) {
      let sum = 0;
      for (const [midi, gate] of activeNotes.entries()) {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        let voice = this.voices.get(midi);
        if (!voice) {
          voice = new MalstromVoice(this.sampleRate, this.patch);
          this.voices.set(midi, voice);
        }
        sum += voice.process(freq, gate);
      }
      buffer[i] = sum;
    }
    // Cleanup
    for (const [midi, voice] of this.voices.entries()) {
      if (voice.isIdle() && !activeNotes.get(midi)) {
        this.voices.delete(midi);
      }
    }
  }
}
