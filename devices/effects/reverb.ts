// devices/effects/reverb.ts - RV-7 style digital reverb
// Based on Schroeder/Moorer reverb architecture with psychoacoustic tuning

export interface ReverbParams {
  roomSize: number;      // 0-1 (small room to hall)
  damping: number;       // 0-1 (high frequency absorption)
  wetLevel: number;      // 0-1
  dryLevel: number;      // 0-1
  predelay: number;      // seconds (0-0.1)
  stereoWidth: number;   // 0-1
  earlyReflections: number; // 0-1
}

export const DEFAULT_REVERB_PARAMS: ReverbParams = {
  roomSize: 0.7,
  damping: 0.5,
  wetLevel: 0.3,
  dryLevel: 0.7,
  predelay: 0.02,
  stereoWidth: 0.5,
  earlyReflections: 0.6,
};

// Comb filter for reverb tail
export class CombFilter {
  private buffer: Float32Array;
  private index = 0;
  private feedback: number;
  private filterStore = 0;
  private damp1: number;
  private damp2: number;

  constructor(size: number, feedback: number, damping: number) {
    this.buffer = new Float32Array(size);
    this.feedback = feedback;
    this.damp1 = damping;
    this.damp2 = 1 - damping;
  }

  process(input: number): number {
    const output = this.buffer[this.index];
    // One-pole lowpass for damping
    this.filterStore = output * this.damp2 + this.filterStore * this.damp1;
    this.buffer[this.index] = input + this.filterStore * this.feedback;
    this.index = (this.index + 1) % this.buffer.length;
    return output;
  }

  setDamping(damping: number): void {
    this.damp1 = damping;
    this.damp2 = 1 - damping;
  }

  setFeedback(feedback: number): void {
    this.feedback = feedback;
  }
}

// Allpass filter for diffusion
export class AllpassFilter {
  private buffer: Float32Array;
  private index = 0;
  private feedback: number;

  constructor(size: number, feedback: number = 0.5) {
    this.buffer = new Float32Array(size);
    this.feedback = feedback;
  }

  process(input: number): number {
    const buffered = this.buffer[this.index];
    const output = -input + buffered;
    this.buffer[this.index] = input + buffered * this.feedback;
    this.index = (this.index + 1) % this.buffer.length;
    return output;
  }
}

// Stereo reverb with 8 comb + 4 allpass per channel
export class StereoReverb {
  private combsL: CombFilter[] = [];
  private combsR: CombFilter[] = [];
  private allpassesL: AllpassFilter[] = [];
  private allpassesR: AllpassFilter[] = [];
  private params: ReverbParams;
  private sampleRate: number;

  // Freeverb comb filter sizes (tuned for 44100Hz)
  private static readonly COMB_TUNING = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  private static readonly ALLPASS_TUNING = [556, 441, 341, 225];
  private static readonly STEREO_SPREAD = 23;

  constructor(sampleRate: number = 44100, params: Partial<ReverbParams> = {}) {
    this.sampleRate = sampleRate;
    this.params = { ...DEFAULT_REVERB_PARAMS, ...params };
    this.initialize();
  }

  private initialize(): void {
    const scale = this.params.roomSize;
    
    for (let i = 0; i < 8; i++) {
      const sizeL = Math.floor(CombFilter.prototype.constructor ? StereoReverb.COMB_TUNING[i] * scale : 1000);
      const sizeR = Math.floor((StereoReverb.COMB_TUNING[i] + StereoReverb.STEREO_SPREAD) * scale);
      this.combsL.push(new CombFilter(Math.max(1, sizeL), 0.84, this.params.damping));
      this.combsR.push(new CombFilter(Math.max(1, sizeR), 0.84, this.params.damping));
    }

    for (let i = 0; i < 4; i++) {
      const sizeL = Math.floor(StereoReverb.ALLPASS_TUNING[i] * scale);
      const sizeR = Math.floor((StereoReverb.ALLPASS_TUNING[i] + StereoReverb.STEREO_SPREAD) * scale);
      this.allpassesL.push(new AllpassFilter(Math.max(1, sizeL), 0.5));
      this.allpassesR.push(new AllpassFilter(Math.max(1, sizeR), 0.5));
    }
  }

  process(inputL: number, inputR: number): [number, number] {
    const input = (inputL + inputR) * 0.5;
    
    // Process through comb filters in parallel
    let outL = 0;
    let outR = 0;
    
    for (let i = 0; i < this.combsL.length; i++) {
      outL += this.combsL[i].process(input);
      outR += this.combsR[i].process(input);
    }

    // Process through allpass filters in series
    for (let i = 0; i < this.allpassesL.length; i++) {
      outL = this.allpassesL[i].process(outL);
      outR = this.allpassesR[i].process(outR);
    }

    // Mix wet/dry
    const wetL = outL * this.params.wetLevel;
    const wetR = outR * this.params.wetLevel;
    const dryL = inputL * this.params.dryLevel;
    const dryR = inputR * this.params.dryLevel;

    return [dryL + wetL, dryR + wetR];
  }

  setParams(params: Partial<ReverbParams>): void {
    Object.assign(this.params, params);
    if (params.damping !== undefined) {
      for (const comb of this.combsL) comb.setDamping(params.damping);
      for (const comb of this.combsR) comb.setDamping(params.damping);
    }
  }

  reset(): void {
    this.combsL = [];
    this.combsR = [];
    this.allpassesL = [];
    this.allpassesR = [];
    this.initialize();
  }
}

// Early reflections generator
export class EarlyReflections {
  private taps: { delay: number; gain: number; pan: number }[] = [];
  private buffer: Float32Array;
  private index = 0;
  private sampleRate: number;

  constructor(sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
    this.buffer = new Float32Array(sampleRate); // 1 second buffer
    
    // Psychoacoustically-tuned early reflection pattern
    this.taps = [
      { delay: 0.004, gain: 0.8, pan: 0.3 },
      { delay: 0.008, gain: 0.7, pan: -0.2 },
      { delay: 0.012, gain: 0.6, pan: 0.5 },
      { delay: 0.017, gain: 0.5, pan: -0.4 },
      { delay: 0.021, gain: 0.45, pan: 0.1 },
      { delay: 0.026, gain: 0.4, pan: -0.6 },
      { delay: 0.031, gain: 0.35, pan: 0.7 },
      { delay: 0.038, gain: 0.3, pan: -0.1 },
    ];
  }

  process(input: number): [number, number] {
    this.buffer[this.index] = input;
    let outL = 0;
    let outR = 0;

    for (const tap of this.taps) {
      const delaySamples = Math.floor(tap.delay * this.sampleRate);
      const readIndex = (this.index - delaySamples + this.buffer.length) % this.buffer.length;
      const sample = this.buffer[readIndex] * tap.gain;
      outL += sample * (1 - tap.pan * 0.5);
      outR += sample * (1 + tap.pan * 0.5);
    }

    this.index = (this.index + 1) % this.buffer.length;
    return [outL, outR];
  }
}
