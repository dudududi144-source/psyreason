// devices/synchronous/synchronous.ts - Reason Synchronous Step FX clone
// Step-based multi-effect with per-step parameter modulation

export interface SyncStep {
  enabled: boolean;
  filterFreq: number;   // 0-1
  filterRes: number;    // 0-1
  drive: number;        // 0-1
  volume: number;       // 0-1
  pan: number;          // -1 to 1
  filterType: 'lowpass' | 'highpass' | 'bandpass';
}

export interface SynchronousParams {
  steps: SyncStep[];
  rate: number;         // beat division
  sync: boolean;
  mode: 'gate' | 'toggle';  // gate follows notes, toggle always on
}

export function createDefaultStep(): SyncStep {
  return {
    enabled: true,
    filterFreq: 0.5,
    filterRes: 0.3,
    drive: 0,
    volume: 1,
    pan: 0,
    filterType: 'lowpass',
  };
}

export function createDefaultSynchronous(): SynchronousParams {
  const steps: SyncStep[] = [];
  for (let i = 0; i < 16; i++) {
    const step = createDefaultStep();
    // Create a simple pattern: every 4th step has different filter
    if (i % 4 === 0) {
      step.filterFreq = 0.8;
      step.filterRes = 0.5;
    } else if (i % 4 === 2) {
      step.filterFreq = 0.3;
      step.filterRes = 0.7;
    }
    steps.push(step);
  }
  return {
    steps,
    rate: 0.25,
    sync: true,
    mode: 'toggle',
  };
}

export class SynchronousFX {
  private params: SynchronousParams;
  private sampleRate: number;
  private currentStep = 0;
  private samplesInStep = 0;
  private filterState = { ic1eq: 0, ic2eq: 0 };
  private bpm: number;

  constructor(sampleRate: number = 44100, params?: SynchronousParams) {
    this.sampleRate = sampleRate;
    this.params = params || createDefaultSynchronous();
    this.bpm = 145;
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
  }

  setStep(index: number, step: Partial<SyncStep>): void {
    if (index >= 0 && index < this.params.steps.length) {
      Object.assign(this.params.steps[index], step);
    }
  }

  getSamplesPerStep(): number {
    const beatDuration = 60 / this.bpm;
    const stepDuration = beatDuration * this.params.rate;
    return Math.floor(stepDuration * this.sampleRate);
  }

  process(inputL: number, inputR: number): [number, number] {
    const samplesPerStep = this.getSamplesPerStep();
    this.samplesInStep++;

    if (this.samplesInStep >= samplesPerStep) {
      this.samplesInStep = 0;
      this.currentStep = (this.currentStep + 1) % 16;
      this.filterState = { ic1eq: 0, ic2eq: 0 };
    }

    const step = this.params.steps[this.currentStep];
    if (!step || !step.enabled) {
      return [0, 0];
    }

    let sample = (inputL + inputR) / 2;

    // Apply drive
    if (step.drive > 0) {
      sample = Math.tanh(sample * (1 + step.drive * 10));
    }

    // Apply filter (ZDF SVF)
    const freq = 50 + step.filterFreq * 15000;
    const k = Math.SQRT2 * (1 - step.filterRes);
    const g = Math.tan(Math.PI * freq / this.sampleRate);
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;

    const v3 = sample - this.filterState.ic2eq;
    const v1 = a1 * this.filterState.ic1eq + a2 * v3;
    const v2 = this.filterState.ic2eq + a2 * this.filterState.ic1eq + a3 * v3;
    this.filterState.ic1eq = 2 * v1 - this.filterState.ic1eq;
    this.filterState.ic2eq = 2 * v2 - this.filterState.ic2eq;

    const low = v2;
    const high = sample - k * v1 - v2;
    const band = v1;

    let filtered: number;
    switch (step.filterType) {
      case 'lowpass': filtered = low; break;
      case 'highpass': filtered = high; break;
      case 'bandpass': filtered = band; break;
      default: filtered = low;
    }

    // Apply volume and pan
    const panL = Math.cos((step.pan + 1) * Math.PI / 4);
    const panR = Math.sin((step.pan + 1) * Math.PI / 4);

    return [
      filtered * step.volume * panL,
      filtered * step.volume * panR,
    ];
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  reset(): void {
    this.currentStep = 0;
    this.samplesInStep = 0;
    this.filterState = { ic1eq: 0, ic2eq: 0 };
  }
}

// Psytrance-specific Synchronous presets
export const PSY_SYNC_PRESETS = {
  rollingFilter: {
    ...createDefaultSynchronous(),
    steps: Array.from({ length: 16 }, (_, i) => ({
      ...createDefaultStep(),
      filterFreq: i % 2 === 0 ? 0.8 : 0.2,
      filterRes: 0.6,
    })),
  },
  acidSweep: {
    ...createDefaultSynchronous(),
    steps: Array.from({ length: 16 }, (_, i) => ({
      ...createDefaultStep(),
      filterFreq: 0.1 + (i / 16) * 0.8,
      filterRes: 0.85,
      drive: 0.3,
    })),
  },
  rhythmicGate: {
    ...createDefaultSynchronous(),
    steps: Array.from({ length: 16 }, (_, i) => ({
      ...createDefaultStep(),
      enabled: i % 4 !== 0,
      volume: i % 4 === 0 ? 0 : 1,
    })),
  },
};
