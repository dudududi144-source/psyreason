// devices/effects/eq.ts - Parametric EQ (MClass EQ style)
// 4-band parametric EQ with bell, shelf, and filter types

export type EqBandType = 'bell' | 'lowShelf' | 'highShelf' | 'lowpass' | 'highpass' | 'notch';

export interface EqBand {
  frequency: number;
  gain: number;
  q: number;
  type: EqBandType;
  enabled: boolean;
}

export const DEFAULT_EQ_BANDS: EqBand[] = [
  { frequency: 80, gain: 0, q: 0.707, type: 'lowShelf', enabled: true },
  { frequency: 500, gain: 0, q: 1.0, type: 'bell', enabled: true },
  { frequency: 3000, gain: 0, q: 1.0, type: 'bell', enabled: true },
  { frequency: 10000, gain: 0, q: 0.707, type: 'highShelf', enabled: true },
];

export interface BiquadCoeffs {
  b0: number; b1: number; b2: number;
  a0: number; a1: number; a2: number;
}

export function computeBiquadCoeffs(type: EqBandType, frequency: number, gainDb: number, q: number, sampleRate: number): BiquadCoeffs {
  const w0 = 2 * Math.PI * frequency / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const A = Math.pow(10, gainDb / 40);
  const cosw0 = Math.cos(w0);

  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

  switch (type) {
    case 'bell':
      b0 = 1 + alpha * A; b1 = -2 * cosw0; b2 = 1 - alpha * A;
      a0 = 1 + alpha / A; a1 = -2 * cosw0; a2 = 1 - alpha / A;
      break;
    case 'lowShelf': {
      const t = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) - (A - 1) * cosw0 + t);
      b1 = 2 * A * ((A - 1) - (A + 1) * cosw0);
      b2 = A * ((A + 1) - (A - 1) * cosw0 - t);
      a0 = (A + 1) + (A - 1) * cosw0 + t;
      a1 = -2 * ((A - 1) + (A + 1) * cosw0);
      a2 = (A + 1) + (A - 1) * cosw0 - t;
      break;
    }
    case 'highShelf': {
      const t = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) + (A - 1) * cosw0 + t);
      b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
      b2 = A * ((A + 1) + (A - 1) * cosw0 - t);
      a0 = (A + 1) - (A - 1) * cosw0 + t;
      a1 = 2 * ((A - 1) - (A + 1) * cosw0);
      a2 = (A + 1) - (A - 1) * cosw0 - t;
      break;
    }
    case 'lowpass':
      b0 = (1 - cosw0) / 2; b1 = 1 - cosw0; b2 = (1 - cosw0) / 2;
      a0 = 1 + alpha; a1 = -2 * cosw0; a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cosw0) / 2; b1 = -(1 + cosw0); b2 = (1 + cosw0) / 2;
      a0 = 1 + alpha; a1 = -2 * cosw0; a2 = 1 - alpha;
      break;
    case 'notch':
      b0 = 1; b1 = -2 * cosw0; b2 = 1;
      a0 = 1 + alpha; a1 = -2 * cosw0; a2 = 1 - alpha;
      break;
  }
  return { b0, b1, b2, a0, a1, a2 };
}

export class BiquadFilter {
  private x1 = 0; x2 = 0;
  private y1 = 0; y2 = 0;
  private coeffs: BiquadCoeffs;

  constructor(coeffs: BiquadCoeffs) { this.coeffs = coeffs; }

  process(input: number): number {
    const { b0, b1, b2, a0, a1, a2 } = this.coeffs;
    const output = (b0 / a0) * input + (b1 / a0) * this.x1 + (b2 / a0) * this.x2
                 - (a1 / a0) * this.y1 - (a2 / a0) * this.y2;
    this.x2 = this.x1; this.x1 = input;
    this.y2 = this.y1; this.y1 = output;
    return output;
  }

  setCoeffs(coeffs: BiquadCoeffs): void { this.coeffs = coeffs; }

  reset(): void { this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0; }
}

export class ParametricEQ {
  private bands: EqBand[];
  private filters: BiquadFilter[];
  private sampleRate: number;

  constructor(sampleRate: number = 44100, bands: EqBand[] = DEFAULT_EQ_BANDS) {
    this.sampleRate = sampleRate;
    this.bands = bands.map(b => ({ ...b }));
    this.filters = this.bands.map(band => {
      const coeffs = computeBiquadCoeffs(band.type, band.frequency, band.gain, band.q, sampleRate);
      return new BiquadFilter(coeffs);
    });
  }

  process(input: number): number {
    let output = input;
    for (let i = 0; i < this.bands.length; i++) {
      if (this.bands[i].enabled) {
        output = this.filters[i].process(output);
      }
    }
    return output;
  }

  setBand(index: number, params: Partial<EqBand>): void {
    if (index < 0 || index >= this.bands.length) return;
    Object.assign(this.bands[index], params);
    const band = this.bands[index];
    const coeffs = computeBiquadCoeffs(band.type, band.frequency, band.gain, band.q, this.sampleRate);
    this.filters[index].setCoeffs(coeffs);
  }

  reset(): void {
    for (const filter of this.filters) filter.reset();
  }
}
