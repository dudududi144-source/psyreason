// devices/effects/compressor.ts - MClass style compressor/limiter
// Feed-forward compressor with lookahead, knee, and makeup gain

export interface CompressorParams {
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  knee: number;
  makeupGain: number;
  lookahead: number;
  sidechain: boolean;
}

export const DEFAULT_COMPRESSOR_PARAMS: CompressorParams = {
  threshold: -18,
  ratio: 4,
  attack: 0.01,
  release: 0.25,
  knee: 6,
  makeupGain: 6,
  lookahead: 0.005,
  sidechain: false,
};

export class Compressor {
  private params: CompressorParams;
  private sampleRate: number;
  private envelope = 0;
  private lookaheadBuffer: Float32Array;
  private lookaheadIndex = 0;
  private gainReduction = 0;

  constructor(sampleRate: number = 44100, params: Partial<CompressorParams> = {}) {
    this.sampleRate = sampleRate;
    this.params = { ...DEFAULT_COMPRESSOR_PARAMS, ...params };
    const lookaheadSamples = Math.floor(this.params.lookahead * sampleRate);
    this.lookaheadBuffer = new Float32Array(lookaheadSamples);
  }

  private dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  private linearToDb(linear: number): number {
    if (linear <= 0) return -100;
    return 20 * Math.log10(linear);
  }

  private computeGainReduction(inputDb: number): number {
    const threshold = this.params.threshold;
    const ratio = this.params.ratio;
    const knee = this.params.knee;
    if (inputDb < threshold - knee / 2) {
      return 0;
    } else if (inputDb > threshold + knee / 2) {
      return (threshold - inputDb) * (1 - 1 / ratio);
    } else {
      const x = inputDb - threshold + knee / 2;
      return -(x * x) / (2 * knee) * (1 - 1 / ratio);
    }
  }

  process(input: number, sidechainInput?: number): number {
    this.lookaheadBuffer[this.lookaheadIndex] = input;
    const delayedIndex = (this.lookaheadIndex + 1) % this.lookaheadBuffer.length;
    const delayed = this.lookaheadBuffer[delayedIndex];
    this.lookaheadIndex = (this.lookaheadIndex + 1) % this.lookaheadBuffer.length;
    const detectInput = this.params.sidechain && sidechainInput !== undefined ? sidechainInput : input;
    const inputDb = this.linearToDb(Math.abs(detectInput));
    const targetReduction = this.computeGainReduction(inputDb);
    const attackCoeff = Math.exp(-1 / (this.params.attack * this.sampleRate));
    const releaseCoeff = Math.exp(-1 / (this.params.release * this.sampleRate));
    if (targetReduction < this.gainReduction) {
      this.gainReduction = attackCoeff * this.gainReduction + (1 - attackCoeff) * targetReduction;
    } else {
      this.gainReduction = releaseCoeff * this.gainReduction + (1 - releaseCoeff) * targetReduction;
    }
    const gainDb = this.gainReduction + this.params.makeupGain;
    const gain = this.dbToLinear(gainDb);
    return delayed * gain;
  }

  getGainReductionDb(): number {
    return this.gainReduction;
  }

  setParams(params: Partial<CompressorParams>): void {
    Object.assign(this.params, params);
  }
}

export class BrickwallLimiter {
  private compressor: Compressor;

  constructor(sampleRate: number = 44100) {
    this.compressor = new Compressor(sampleRate, {
      threshold: -0.3,
      ratio: 20,
      attack: 0.001,
      release: 0.1,
      knee: 0,
      makeupGain: 0,
      lookahead: 0.005,
    });
  }

  process(input: number): number {
    const output = this.compressor.process(input);
    return Math.max(-1, Math.min(1, output));
  }
}
