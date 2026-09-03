// devices/pulsar/vocoder.ts - Reason Pulsar Vocoder clone
// Vocoder with carrier/modulator band analysis

export interface VocoderBand {
  frequency: number;
  level: number;       // current detected level
  gain: number;        // user gain adjustment
}

export interface VocoderParams {
  numBands: number;        // 8, 16, 32 bands
  hold: number;            // envelope hold time (ms)
  attack: number;          // envelope attack (ms)
  release: number;         // envelope release (ms)
  dryWet: number;          // 0-1
  stereoWidth: number;     // 0-1
  bandGains: number[];     // per-band gain
}

export const DEFAULT_VOCODER_PARAMS: VocoderParams = {
  numBands: 16,
  hold: 50,
  attack: 10,
  release: 300,
  dryWet: 0.8,
  stereoWidth: 0.5,
  bandGains: [],
};

export class Vocoder {
  private params: VocoderParams;
  private sampleRate: number;
  private modulatorLevels: number[] = [];
  private bandFilters: { freq: number; q: number }[] = [];
  private envelopeFollowers: number[] = [];

  constructor(sampleRate: number = 44100, params: Partial<VocoderParams> = {}) {
    this.sampleRate = sampleRate;
    this.params = { ...DEFAULT_VOCODER_PARAMS, ...params };
    
    // Initialize bands (logarithmic spacing)
    const minFreq = 80;
    const maxFreq = 12000;
    for (let i = 0; i < this.params.numBands; i++) {
      const t = i / (this.params.numBands - 1);
      const freq = minFreq * Math.pow(maxFreq / minFreq, t);
      this.bandFilters.push({ freq, q: 8 });
      this.envelopeFollowers.push(0);
      this.modulatorLevels.push(0);
    }
    
    if (this.params.bandGains.length === 0) {
      this.params.bandGains = new Array(this.params.numBands).fill(1);
    }
  }

  // Analyze modulator (voice) and apply to carrier (synth)
  process(carrier: number, modulator: number): number {
    const sr = this.sampleRate;
    
    // For each band, analyze modulator level and apply to carrier
    let output = 0;
    
    for (let i = 0; i < this.params.numBands; i++) {
      // Simple envelope follower for modulator
      const modLevel = Math.abs(modulator);
      const attackCoeff = Math.exp(-1 / (this.params.attack * sr / 1000));
      const releaseCoeff = Math.exp(-1 / (this.params.release * sr / 1000));
      
      if (modLevel > this.envelopeFollowers[i]) {
        this.envelopeFollowers[i] = attackCoeff * this.envelopeFollowers[i] + (1 - attackCoeff) * modLevel;
      } else {
        this.envelopeFollowers[i] = releaseCoeff * this.envelopeFollowers[i] + (1 - releaseCoeff) * modLevel;
      }
      
      this.modulatorLevels[i] = this.envelopeFollowers[i];
      
      // Apply band gain and modulator envelope to carrier
      output += carrier * this.envelopeFollowers[i] * this.params.bandGains[i] / this.params.numBands;
    }
    
    // Mix dry/wet
    const wet = output * this.params.dryWet;
    const dry = carrier * (1 - this.params.dryWet);
    
    return wet + dry;
  }

  getModulatorLevels(): number[] {
    return [...this.modulatorLevels];
  }

  setBandGain(band: number, gain: number): void {
    if (band >= 0 && band < this.params.bandGains.length) {
      this.params.bandGains[band] = Math.max(0, Math.min(2, gain));
    }
  }

  setParams(params: Partial<VocoderParams>): void {
    Object.assign(this.params, params);
  }
}

// Robot voice preset (classic vocoder sound)
export const VOCODER_PRESETS = {
  robotVoice: {
    ...DEFAULT_VOCODER_PARAMS,
    numBands: 16,
    attack: 5,
    release: 200,
    dryWet: 0.9,
  },
  choirPad: {
    ...DEFAULT_VOCODER_PARAMS,
    numBands: 32,
    attack: 50,
    release: 800,
    dryWet: 0.7,
  },
  talkingSynth: {
    ...DEFAULT_VOCODER_PARAMS,
    numBands: 16,
    attack: 10,
    release: 100,
    dryWet: 1.0,
  },
};
