// devices/europa/europa.ts - Reason Europa wavetable synth clone
// Wavetable synthesis with dynamic modulation and harmonic manipulation

export interface EuropaWaveSlot {
  position: number;      // 0-1 wavetable position
  shape: number;         // 0-1 (morph between shapes)
  harmonics: number;     // 0-1 (harmonic content)
  unison: number;        // 1-7
  unisonDetune: number;  // 0-1
  level: number;         // 0-1
  enabled: boolean;
}

export interface EuropaPatch {
  name: string;
  waves: EuropaWaveSlot[];
  filterFreq: number;
  filterRes: number;
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  ampAttack: number;
  ampDecay: number;
  ampSustain: number;
  ampRelease: number;
  lfoRate: number;
  lfoAmount: number;
  volume: number;
}

export const DEFAULT_EUROPA_PATCH: EuropaPatch = {
  name: 'Init',
  waves: [
    { position: 0, shape: 0, harmonics: 0.5, unison: 1, unisonDetune: 0.1, level: 0.8, enabled: true },
    { position: 0.5, shape: 0.5, harmonics: 0.3, unison: 1, unisonDetune: 0.1, level: 0.4, enabled: false },
  ],
  filterFreq: 8000,
  filterRes: 0.2,
  filterType: 'lowpass',
  ampAttack: 0.01,
  ampDecay: 0.3,
  ampSustain: 0.7,
  ampRelease: 0.3,
  lfoRate: 0.5,
  lfoAmount: 0,
  volume: 0.8,
};

// Wavetable generation with harmonic morphing
export function buildEuropaWavetable(position: number, shape: number, harmonics: number, size = 2048): Float32Array {
  const table = new Float32Array(size);
  const numHarmonics = Math.floor(1 + harmonics * 32);
  
  for (let i = 0; i < size; i++) {
    const t = i / size;
    let sample = 0;
    
    for (let h = 1; h <= numHarmonics; h++) {
      // Morph between saw-like and square-like harmonic content
      const sawAmp = 1 / h;
      const squareAmp = h % 2 === 1 ? 1 / h : 0;
      const amp = sawAmp * (1 - shape) + squareAmp * shape;
      
      // Position affects phase of each harmonic (creates movement)
      const phase = t * h + position * h * 0.5;
      sample += Math.sin(2 * Math.PI * phase) * amp / numHarmonics;
    }
    
    table[i] = sample * 2;
  }
  
  // Normalize
  let maxVal = 0;
  for (let i = 0; i < size; i++) {
    maxVal = Math.max(maxVal, Math.abs(table[i]));
  }
  if (maxVal > 0) {
    for (let i = 0; i < size; i++) {
      table[i] /= maxVal;
    }
  }
  
  return table;
}

export class EuropaVoice {
  private patch: EuropaPatch;
  private sampleRate: number;
  private phase = 0;
  private lfoPhase = 0;
  private envValue = 0;
  private envStage: 'idle' | 'attack' | 'decay' | 'sustain' | 'release' = 'idle';
  private tables: Float32Array[] = [];

  constructor(sampleRate: number, patch: EuropaPatch) {
    this.sampleRate = sampleRate;
    this.patch = patch;
    // Pre-build wavetables for each wave slot
    for (const wave of patch.waves) {
      if (wave.enabled) {
        this.tables.push(buildEuropaWavetable(wave.position, wave.shape, wave.harmonics));
      }
    }
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

    // LFO for wavetable modulation
    this.lfoPhase += this.patch.lfoRate / sr;
    if (this.lfoPhase >= 1) this.lfoPhase -= 1;
    const lfo = Math.sin(2 * Math.PI * this.lfoPhase) * this.patch.lfoAmount;

    // Process each wave slot
    let tableIdx = 0;
    for (const wave of this.patch.waves) {
      if (!wave.enabled || wave.level === 0) continue;
      
      const table = this.tables[tableIdx];
      if (!table) { tableIdx++; continue; }
      
      // Unison voices
      for (let u = 0; u < wave.unison; u++) {
        const detune = wave.unison > 1 ? (u - (wave.unison - 1) / 2) * wave.unisonDetune * 0.01 : 0;
        const voiceFreq = freq * (1 + detune);
        const dt = voiceFreq / sr;
        
        this.phase += dt;
        this.phase -= Math.floor(this.phase);
        
        const readPos = (this.phase + lfo) % 1;
        output += this.readTable(table, readPos) * wave.level / wave.unison;
      }
      tableIdx++;
    }

    // Envelope
    if (gate) {
      if (this.envStage === 'idle' || this.envStage === 'release') {
        this.envStage = 'attack';
      }
      if (this.envStage === 'attack') {
        this.envValue += 1 / (this.patch.ampAttack * sr);
        if (this.envValue >= 1) { this.envValue = 1; this.envStage = 'decay'; }
      } else if (this.envStage === 'decay') {
        this.envValue -= (1 - this.patch.ampSustain) / (this.patch.ampDecay * sr);
        if (this.envValue <= this.patch.ampSustain) { this.envStage = 'sustain'; }
      } else if (this.envStage === 'sustain') {
        this.envValue = this.patch.ampSustain;
      }
    } else {
      if (this.envStage !== 'idle' && this.envStage !== 'release') {
        this.envStage = 'release';
      }
      if (this.envStage === 'release') {
        this.envValue -= this.envValue / (this.patch.ampRelease * sr);
        if (this.envValue <= 0.001) { this.envValue = 0; this.envStage = 'idle'; }
      }
    }

    return output * this.envValue * this.patch.volume;
  }

  isIdle(): boolean {
    return this.envStage === 'idle';
  }
}

export class EuropaSynth {
  private sampleRate: number;
  private patch: EuropaPatch;
  private voices: Map<number, EuropaVoice> = new Map();

  constructor(sampleRate: number = 44100, patch: EuropaPatch = DEFAULT_EUROPA_PATCH) {
    this.sampleRate = sampleRate;
    this.patch = patch;
  }

  loadPatch(patch: EuropaPatch): void {
    this.patch = patch;
  }

  noteOn(midi: number): void {
    this.voices.set(midi, new EuropaVoice(this.sampleRate, this.patch));
  }

  process(buffer: Float32Array, activeNotes: Map<number, boolean>): void {
    for (let i = 0; i < buffer.length; i++) {
      let sum = 0;
      for (const [midi, gate] of activeNotes.entries()) {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        let voice = this.voices.get(midi);
        if (!voice) {
          voice = new EuropaVoice(this.sampleRate, this.patch);
          this.voices.set(midi, voice);
        }
        sum += voice.process(freq, gate);
      }
      buffer[i] = sum;
    }
    for (const [midi, voice] of this.voices.entries()) {
      if (voice.isIdle() && !activeNotes.get(midi)) {
        this.voices.delete(midi);
      }
    }
  }
}
