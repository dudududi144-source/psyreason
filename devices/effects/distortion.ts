// devices/effects/distortion.ts - Scream 4 style distortion
// Multiple distortion algorithms with tone shaping

export type DistortionMode = 'tube' | 'digital' | 'fuzz' | 'scream' | 'bitcrush';

export interface DistortionParams {
  drive: number;      // 0-1
  tone: number;       // 0-1 (dark to bright)
  mode: DistortionMode;
  wetLevel: number;
  dryLevel: number;
  outputGain: number;
}

export const DEFAULT_DISTORTION_PARAMS: DistortionParams = {
  drive: 0.5,
  tone: 0.5,
  mode: 'tube',
  wetLevel: 1.0,
  dryLevel: 0.0,
  outputGain: 0.8,
};

export class Distortion {
  private params: DistortionParams;
  private sampleRate: number;
  private toneFilterState = 0;
  private dcBlockerPrev = 0;

  constructor(sampleRate: number = 44100, params: Partial<DistortionParams> = {}) {
    this.sampleRate = sampleRate;
    this.params = { ...DEFAULT_DISTORTION_PARAMS, ...params };
  }

  private tubeSaturate(x: number, drive: number): number {
    // Asymmetric tube saturation (even harmonics)
    const g = 1 + drive * 10;
    const positive = x >= 0;
    const absX = Math.abs(x);
    let saturated: number;
    if (positive) {
      saturated = 1 - Math.exp(-g * absX);
    } else {
      saturated = -(1 - Math.exp(-g * absX * 0.7)); // asymmetric
    }
    return saturated;
  }

  private digitalDistort(x: number, drive: number): number {
    // Hard clipping with waveshaping
    const g = 1 + drive * 20;
    const shaped = Math.tanh(g * x);
    return shaped;
  }

  private fuzzDistort(x: number, drive: number): number {
    // Fuzz: heavy square wave shaping
    const g = 1 + drive * 50;
    const shaped = Math.sign(x) * (1 - Math.pow(1 - Math.abs(x), g));
    return shaped;
  }

  private bitcrush(x: number, drive: number): number {
    // Bit reduction
    const bits = Math.max(1, Math.floor(16 - drive * 12));
    const levels = Math.pow(2, bits);
    return Math.round(x * levels) / levels;
  }

  process(input: number): number {
    let output: number;
    const drive = this.params.drive;

    switch (this.params.mode) {
      case 'tube':
        output = this.tubeSaturate(input, drive);
        break;
      case 'digital':
        output = this.digitalDistort(input, drive);
        break;
      case 'fuzz':
        output = this.fuzzDistort(input, drive);
        break;
      case 'bitcrush':
        output = this.bitcrush(input, drive);
        break;
      default:
        output = this.tubeSaturate(input, drive);
    }

    // Tone filter (one-pole lowpass/highpass blend)
    const toneFreq = 200 + this.params.tone * 8000;
    const g = Math.tan(Math.PI * toneFreq / this.sampleRate);
    const a = g / (1 + g);
    this.toneFilterState = this.toneFilterState + a * (output - this.toneFilterState);
    output = this.toneFilterState * this.params.tone + output * (1 - this.params.tone);

    // DC blocker
    const dcBlocked = output - this.dcBlockerPrev * 0.995;
    this.dcBlockerPrev = output;

    return dcBlocked * this.params.outputGain;
  }

  setParams(params: Partial<DistortionParams>): void {
    Object.assign(this.params, params);
  }
}
