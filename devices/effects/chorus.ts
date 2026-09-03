// devices/effects/chorus.ts - CF-100 style chorus/flanger
// LFO-modulated delay for chorus, flanger, and vibrato effects

export interface ChorusParams {
  rate: number;       // LFO rate (Hz)
  depth: number;      // modulation depth (0-1)
  delay: number;      // base delay (ms)
  feedback: number;   // feedback amount (0-0.9)
  wetLevel: number;
  dryLevel: number;
  stereoWidth: number;
  mode: 'chorus' | 'flanger' | 'vibrato';
}

export const DEFAULT_CHORUS_PARAMS: ChorusParams = {
  rate: 0.5,
  depth: 0.5,
  delay: 15,
  feedback: 0.3,
  wetLevel: 0.5,
  dryLevel: 0.5,
  stereoWidth: 0.5,
  mode: 'chorus',
};

export class ChorusFlanger {
  private buffer: Float32Array;
  private writeIndex = 0;
  private lfoPhase = 0;
  private params: ChorusParams;
  private sampleRate: number;

  constructor(sampleRate: number = 44100, params: Partial<ChorusParams> = {}) {
    this.sampleRate = sampleRate;
    this.params = { ...DEFAULT_CHORUS_PARAMS, ...params };
    this.buffer = new Float32Array(sampleRate); // 1 second max delay
  }

  process(inputL: number, inputR: number): [number, number] {
    // LFO (sine wave)
    this.lfoPhase += this.params.rate / this.sampleRate;
    if (this.lfoPhase >= 1) this.lfoPhase -= 1;
    const lfo = Math.sin(2 * Math.PI * this.lfoPhase);

    // Modulated delay time
    const baseDelay = this.params.delay * this.sampleRate / 1000;
    const modDepth = this.params.depth * baseDelay * 0.5;
    const delayL = baseDelay + lfo * modDepth;
    const delayR = baseDelay - lfo * modDepth; // opposite phase for stereo

    // Write to buffer
    this.buffer[this.writeIndex] = inputL;

    // Read with interpolation
    const readIdxL = (this.writeIndex - delayL + this.buffer.length) % this.buffer.length;
    const readIdxR = (this.writeIndex - delayR + this.buffer.length) % this.buffer.length;
    const i0L = Math.floor(readIdxL);
    const i1L = (i0L + 1) % this.buffer.length;
    const fracL = readIdxL - i0L;
    const outL = this.buffer[i0L] * (1 - fracL) + this.buffer[i1L] * fracL;

    const i0R = Math.floor(readIdxR);
    const i1R = (i0R + 1) % this.buffer.length;
    const fracR = readIdxR - i0R;
    const outR = this.buffer[i0R] * (1 - fracR) + this.buffer[i1R] * fracR;

    this.writeIndex = (this.writeIndex + 1) % this.buffer.length;

    // Mix wet/dry
    const wetL = outL * this.params.wetLevel;
    const wetR = outR * this.params.wetLevel;
    const dryL = inputL * this.params.dryLevel;
    const dryR = inputR * this.params.dryLevel;

    return [dryL + wetL, dryR + wetR];
  }

  setParams(params: Partial<ChorusParams>): void {
    Object.assign(this.params, params);
  }
}
