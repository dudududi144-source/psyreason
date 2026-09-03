// devices/effects/filter.ts - ECF-42 style state variable filter
// Multimode filter with envelope follower and LFO modulation

export type FilterMode = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

export interface FilterParams {
  frequency: number;    // Hz
  resonance: number;    // 0-1
  mode: FilterMode;
  envelopeAmount: number;  // 0-1
  envelopeAttack: number;  // seconds
  envelopeDecay: number;   // seconds
  lfoRate: number;         // Hz
  lfoAmount: number;       // 0-1
  drive: number;           // 0-1 (pre-filter saturation)
}

export const DEFAULT_FILTER_PARAMS: FilterParams = {
  frequency: 1000,
  resonance: 0.3,
  mode: 'lowpass',
  envelopeAmount: 0,
  envelopeAttack: 0.01,
  envelopeDecay: 0.3,
  lfoRate: 0,
  lfoAmount: 0,
  drive: 0,
};

export class StateVariableFilter {
  private ic1eq = 0;
  private ic2eq = 0;
  private params: FilterParams;
  private sampleRate: number;
  private envelopeValue = 0;
  private lfoPhase = 0;

  constructor(sampleRate: number = 44100, params: Partial<FilterParams> = {}) {
    this.sampleRate = sampleRate;
    this.params = { ...DEFAULT_FILTER_PARAMS, ...params };
  }

  process(input: number, trigger: boolean = false): number {
    // Envelope follower
    if (trigger) {
      this.envelopeValue = 1;
    } else {
      const decayRate = 1 / (this.params.envelopeDecay * this.sampleRate);
      this.envelopeValue = Math.max(0, this.envelopeValue - decayRate);
    }

    // LFO
    this.lfoPhase += this.params.lfoRate / this.sampleRate;
    if (this.lfoPhase >= 1) this.lfoPhase -= 1;
    const lfo = Math.sin(2 * Math.PI * this.lfoPhase);

    // Calculate modulated frequency
    const envMod = this.envelopeValue * this.params.envelopeAmount * 8000;
    const lfoMod = lfo * this.params.lfoAmount * 2000;
    const freq = Math.min(this.params.frequency + envMod + lfoMod, this.sampleRate / 2 - 100);

    // Pre-filter drive (saturation)
    let processed = input;
    if (this.params.drive > 0) {
      const g = 1 + this.params.drive * 10;
      processed = Math.tanh(input * g) / g;
    }

    // ZDF SVF (Simper)
    const k = Math.SQRT2 * (1 - this.params.resonance);
    const g = Math.tan(Math.PI * freq / this.sampleRate);
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;

    const v3 = processed - this.ic2eq;
    const v1 = a1 * this.ic1eq + a2 * v3;
    const v2 = this.ic2eq + a2 * this.ic1eq + a3 * v3;
    this.ic1eq = 2 * v1 - this.ic1eq;
    this.ic2eq = 2 * v2 - this.ic2eq;

    const low = v2;
    const band = v1;
    const high = processed - k * v1 - v2;
    const notch = high + low;

    switch (this.params.mode) {
      case 'lowpass': return low;
      case 'highpass': return high;
      case 'bandpass': return band;
      case 'notch': return notch;
      default: return low;
    }
  }

  setParams(params: Partial<FilterParams>): void {
    Object.assign(this.params, params);
  }

  reset(): void {
    this.ic1eq = 0;
    this.ic2eq = 0;
    this.envelopeValue = 0;
    this.lfoPhase = 0;
  }
}
