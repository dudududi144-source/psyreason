// devices/effects/stereo-imager.ts - MClass Stereo Imager clone
// Multi-band stereo width control

export interface ImagerBand {
  lowFreq: number;    // Hz (band lower bound)
  highFreq: number;   // Hz (band upper bound)
  width: number;      // -1 to 1 (narrow to wide)
  gain: number;       // 0-2
}

export interface StereoImagerParams {
  bands: ImagerBand[];
  masterWidth: number;  // 0-2
}

export const DEFAULT_IMAGER_PARAMS: StereoImagerParams = {
  bands: [
    { lowFreq: 0, highFreq: 200, width: 0, gain: 1 },      // Low: mono
    { lowFreq: 200, highFreq: 2000, width: 0.5, gain: 1 },  // Mid: slight wide
    { lowFreq: 2000, highFreq: 20000, width: 1, gain: 1 },  // High: wide
  ],
  masterWidth: 1,
};

export class StereoImager {
  private params: StereoImagerParams;
  private sampleRate: number;
  private filterStates: { low: number; high: number }[] = [];

  constructor(sampleRate: number = 44100, params: Partial<StereoImagerParams> = {}) {
    this.sampleRate = sampleRate;
    this.params = { ...DEFAULT_IMAGER_PARAMS, ...params };
    this.filterStates = this.params.bands.map(() => ({ low: 0, high: 0 }));
  }

  process(inputL: number, inputR: number): [number, number] {
    // Convert to mid/side
    let mid = (inputL + inputR) / 2;
    let side = (inputL - inputR) / 2;

    // Apply width per band (simplified - full implementation would use crossovers)
    let totalWidth = 0;
    let totalWeight = 0;
    
    for (const band of this.params.bands) {
      totalWidth += band.width * band.gain;
      totalWeight += band.gain;
    }
    
    const avgWidth = totalWeight > 0 ? totalWidth / totalWeight : 1;
    side *= avgWidth * this.params.masterWidth;

    // Convert back to L/R
    const outL = mid + side;
    const outR = mid - side;

    return [outL, outR];
  }

  setParams(params: Partial<StereoImagerParams>): void {
    Object.assign(this.params, params);
  }

  reset(): void {
    this.filterStates = this.params.bands.map(() => ({ low: 0, high: 0 }));
  }
}

// Mono-maker utility (for checking mono compatibility)
export class MonoMaker {
  process(inputL: number, inputR: number): [number, number] {
    const mono = (inputL + inputR) / 2;
    return [mono, mono];
  }
}

// Stereo width meter
export class StereoWidthMeter {
  private correlationSum = 0;
  private sampleCount = 0;

  process(inputL: number, inputR: number): void {
    // Correlation coefficient: -1 (out of phase) to +1 (mono)
    const sum = inputL + inputR;
    const diff = inputL - inputR;
    this.correlationSum += (sum * sum - diff * diff) / (sum * sum + diff * diff + 1e-10);
    this.sampleCount++;
  }

  getCorrelation(): number {
    if (this.sampleCount === 0) return 0;
    return this.correlationSum / this.sampleCount;
  }

  getWidth(): number {
    // Width = 1 - correlation (0 = mono, 1 = very wide, negative = phase issues)
    return 1 - this.getCorrelation();
  }

  reset(): void {
    this.correlationSum = 0;
    this.sampleCount = 0;
  }
}
