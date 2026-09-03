// devices/effects/delay.ts - DDL-1 style digital delay
// Tempo-synced delay with ping-pong, filtering, and feedback

export interface DelayParams {
  time: number;
  feedback: number;
  wetLevel: number;
  dryLevel: number;
  filterFreq: number;
  sync: boolean;
  division: number;
  pingPong: boolean;
}

export const DEFAULT_DELAY_PARAMS: DelayParams = {
  time: 0.375,
  feedback: 0.4,
  wetLevel: 0.35,
  dryLevel: 0.8,
  filterFreq: 4000,
  sync: true,
  division: 0.25,
  pingPong: false,
};

export function divisionToTime(division: number, bpm: number): number {
  const beatDuration = 60 / bpm;
  return beatDuration * division * 4;
}

export class DigitalDelay {
  private bufferL: Float32Array;
  private bufferR: Float32Array;
  private writeIndex = 0;
  private params: DelayParams;
  private sampleRate: number;
  private filterStateL = 0;
  private filterStateR = 0;
  private bpm: number;

  constructor(sampleRate: number = 44100, params: Partial<DelayParams> = {}) {
    this.sampleRate = sampleRate;
    this.params = { ...DEFAULT_DELAY_PARAMS, ...params };
    this.bpm = 145;
    const bufferSize = Math.floor(sampleRate * 2);
    this.bufferL = new Float32Array(bufferSize);
    this.bufferR = new Float32Array(bufferSize);
  }

  setBpm(bpm: number): void { this.bpm = bpm; }

  getDelaySamples(): number {
    let delayTime: number;
    if (this.params.sync) {
      delayTime = divisionToTime(this.params.division, this.bpm);
    } else {
      delayTime = this.params.time;
    }
    return Math.floor(delayTime * this.sampleRate);
  }

  process(inputL: number, inputR: number): [number, number] {
    const delaySamples = this.getDelaySamples();
    const readIndex = (this.writeIndex - delaySamples + this.bufferL.length) % this.bufferL.length;
    let delayL = this.bufferL[readIndex];
    let delayR = this.bufferR[readIndex];
    const g = Math.tan(Math.PI * this.params.filterFreq / this.sampleRate);
    const a = g / (1 + g);
    this.filterStateL = this.filterStateL + a * (delayL - this.filterStateL);
    this.filterStateR = this.filterStateR + a * (delayR - this.filterStateR);
    if (this.params.pingPong) {
      this.bufferL[this.writeIndex] = inputL + this.filterStateR * this.params.feedback;
      this.bufferR[this.writeIndex] = inputR + this.filterStateL * this.params.feedback;
    } else {
      this.bufferL[this.writeIndex] = inputL + this.filterStateL * this.params.feedback;
      this.bufferR[this.writeIndex] = inputR + this.filterStateR * this.params.feedback;
    }
    this.writeIndex = (this.writeIndex + 1) % this.bufferL.length;
    const outL = inputL * this.params.dryLevel + delayL * this.params.wetLevel;
    const outR = inputR * this.params.dryLevel + delayR * this.params.wetLevel;
    return [outL, outR];
  }

  setParams(params: Partial<DelayParams>): void {
    Object.assign(this.params, params);
  }

  reset(): void {
    this.bufferL.fill(0);
    this.bufferR.fill(0);
    this.filterStateL = 0;
    this.filterStateR = 0;
  }
}
