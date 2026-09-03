// devices/grain/grain.ts - Reason Grain granular sampler clone
// Granular synthesis with multiple algorithms

export type GrainAlgorithm = 'spectral' | 'grain' | 'long-grain' | 'texture';
export type GrainManipulateMode = 'pitch' | 'formant' | 'spectral';

export interface GrainParams {
  algorithm: GrainAlgorithm;
  grainSize: number;        // ms (10-500)
  grainSpacing: number;     // ms (5-200)
  grainJitter: number;      // 0-1 (randomness)
  spray: number;            // 0-1 (stereo spread)
  pitch: number;            // semitones -24 to 24
  formant: number;          // 0-1
  position: number;         // 0-1 (sample position)
  speed: number;            // playback speed
  volume: number;
  attack: number;
  release: number;
}

export const DEFAULT_GRAIN_PARAMS: GrainParams = {
  algorithm: 'grain',
  grainSize: 80,
  grainSpacing: 40,
  grainJitter: 0.2,
  spray: 0.3,
  pitch: 0,
  formant: 0.5,
  position: 0,
  speed: 1,
  volume: 0.8,
  attack: 0.01,
  release: 0.1,
};

interface ActiveGrain {
  startTime: number;
  duration: number;
  position: number;
  pitchMult: number;
  panL: number;
  panR: number;
  phase: number;
}

export class GranularEngine {
  private params: GrainParams;
  private sampleRate: number;
  private sample: Float32Array | null = null;
  private grains: ActiveGrain[] = [];
  private timeSinceLastGrain = 0;
  private rngState = 1;

  constructor(sampleRate: number = 44100, params: Partial<GrainParams> = {}) {
    this.sampleRate = sampleRate;
    this.params = { ...DEFAULT_GRAIN_PARAMS, ...params };
  }

  private rng(): number {
    this.rngState = (this.rngState * 1664525 + 1013904223) >>> 0;
    return this.rngState / 4294967296;
  }

  setSample(sample: Float32Array): void {
    this.sample = sample;
  }

  setParams(params: Partial<GrainParams>): void {
    Object.assign(this.params, params);
  }

  process(output: Float32Array, outputR?: Float32Array): void {
    if (!this.sample || this.sample.length === 0) return;

    const sr = this.sampleRate;
    const grainSizeSec = this.params.grainSize / 1000;
    const grainSpacingSec = this.params.grainSpacing / 1000;

    for (let i = 0; i < output.length; i++) {
      const currentTime = i / sr;
      this.timeSinceLastGrain += 1 / sr;

      // Spawn new grain
      if (this.timeSinceLastGrain >= grainSpacingSec) {
        this.timeSinceLastGrain = 0;
        this.spawnGrain();
      }

      // Process active grains
      let sumL = 0;
      let sumR = 0;

      for (let g = this.grains.length - 1; g >= 0; g--) {
        const grain = this.grains[g];
        const grainTime = currentTime - grain.startTime;

        if (grainTime > grain.duration) {
          this.grains.splice(g, 1);
          continue;
        }

        // Grain envelope (raised cosine window)
        const windowPos = grainTime / grain.duration;
        const envelope = 0.5 * (1 - Math.cos(2 * Math.PI * windowPos));

        // Read sample at grain position
        const samplePos = grain.position + grainTime * grain.pitchMult * this.params.speed;
        const idx = Math.floor(samplePos * this.sample.length) % this.sample.length;
        const sampleVal = this.sample[Math.abs(idx)];

        sumL += sampleVal * envelope * grain.panL;
        if (outputR) sumR += sampleVal * envelope * grain.panR;
      }

      output[i] += sumL * this.params.volume;
      if (outputR) outputR[i] += sumR * this.params.volume;
    }
  }

  private spawnGrain(): void {
    if (!this.sample) return;

    const jitter = (this.rng() * 2 - 1) * this.params.grainJitter;
    const position = (this.params.position + jitter + 1) % 1;
    const spray = (this.rng() * 2 - 1) * this.params.spray;
    
    // Stereo panning based on spray
    const panAngle = (spray + 1) * Math.PI / 4;
    const panL = Math.cos(panAngle);
    const panR = Math.sin(panAngle);

    const pitchMult = Math.pow(2, this.params.pitch / 12);

    this.grains.push({
      startTime: 0, // relative time
      duration: this.params.grainSize / 1000,
      position,
      pitchMult,
      panL,
      panR,
      phase: 0,
    });

    // Limit active grains
    if (this.grains.length > 32) {
      this.grains.shift();
    }
  }
}

export class GrainSampler {
  private engine: GranularEngine;
  private sampleRate: number;

  constructor(sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
    this.engine = new GranularEngine(sampleRate);
    // Generate a default procedural sample (psy-style tone)
    const defaultSample = new Float32Array(sampleRate);
    for (let i = 0; i < defaultSample.length; i++) {
      const t = i / sampleRate;
      defaultSample[i] = Math.sin(2 * Math.PI * 220 * t) * 0.5 +
                        Math.sin(2 * Math.PI * 440 * t) * 0.3 +
                        Math.sin(2 * Math.PI * 660 * t) * 0.2;
    }
    this.engine.setSample(defaultSample);
  }

  loadSample(sample: Float32Array): void {
    this.engine.setSample(sample);
  }

  setParams(params: Partial<GrainParams>): void {
    this.engine.setParams(params);
  }

  process(buffer: Float32Array, bufferR?: Float32Array): void {
    this.engine.process(buffer, bufferR);
  }
}
