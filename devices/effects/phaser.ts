// devices/effects/phaser.ts - Phaser/Flanger effect
// Multi-stage allpass filter chain with LFO modulation

export interface PhaserParams {
  rate: number;         // LFO rate (Hz)
  depth: number;        // modulation depth 0-1
  feedback: number;     // feedback amount 0-0.9
  stages: number;       // number of allpass stages (2, 4, 6, 8)
  wetLevel: number;     // 0-1
  dryLevel: number;     // 0-1
  mode: 'phaser' | 'flanger';
  stereo: boolean;      // stereo phase offset
}

export const DEFAULT_PHASER_PARAMS: PhaserParams = {
  rate: 0.5,
  depth: 0.7,
  feedback: 0.4,
  stages: 4,
  wetLevel: 0.5,
  dryLevel: 0.5,
  mode: 'phaser',
  stereo: true,
};

class AllpassStage {
  private a1 = 0;
  private z1 = 0;

  process(input: number, coeff: number): number {
    const output = coeff * input + this.z1;
    this.z1 = input - coeff * output;
    return output;
  }

  reset(): void {
    this.z1 = 0;
  }
}

export class Phaser {
  private params: PhaserParams;
  private sampleRate: number;
  private lfoPhase = 0;
  private stagesL: AllpassStage[] = [];
  private stagesR: AllpassStage[] = [];
  private feedbackL = 0;
  private feedbackR = 0;

  constructor(sampleRate: number = 44100, params: Partial<PhaserParams> = {}) {
    this.sampleRate = sampleRate;
    this.params = { ...DEFAULT_PHASER_PARAMS, ...params };
    
    for (let i = 0; i < this.params.stages; i++) {
      this.stagesL.push(new AllpassStage());
      this.stagesR.push(new AllpassStage());
    }
  }

  process(inputL: number, inputR: number): [number, number] {
    const sr = this.sampleRate;
    
    // LFO
    this.lfoPhase += this.params.rate / sr;
    if (this.lfoPhase >= 1) this.lfoPhase -= 1;
    const lfoL = (Math.sin(2 * Math.PI * this.lfoPhase) + 1) / 2;
    const lfoR = this.params.stereo
      ? (Math.sin(2 * Math.PI * this.lfoPhase + Math.PI / 2) + 1) / 2
      : lfoL;

    // Calculate allpass coefficient from LFO
    const minFreq = this.params.mode === 'phaser' ? 200 : 500;
    const maxFreq = this.params.mode === 'phaser' ? 4000 : 6000;
    
    const freqL = minFreq + (maxFreq - minFreq) * lfoL * this.params.depth;
    const freqR = minFreq + (maxFreq - minFreq) * lfoR * this.params.depth;
    
    const coeffL = (1 - Math.tan(Math.PI * freqL / sr)) / (1 + Math.tan(Math.PI * freqL / sr));
    const coeffR = (1 - Math.tan(Math.PI * freqR / sr)) / (1 + Math.tan(Math.PI * freqR / sr));

    // Process left channel
    let procL = inputL + this.feedbackL * this.params.feedback;
    for (const stage of this.stagesL) {
      procL = stage.process(procL, coeffL);
    }
    this.feedbackL = procL;

    // Process right channel
    let procR = inputR + this.feedbackR * this.params.feedback;
    for (const stage of this.stagesR) {
      procR = stage.process(procR, coeffR);
    }
    this.feedbackR = procR;

    // Mix wet/dry
    const outL = inputL * this.params.dryLevel + procL * this.params.wetLevel;
    const outR = inputR * this.params.dryLevel + procR * this.params.wetLevel;

    return [outL, outR];
  }

  setParams(params: Partial<PhaserParams>): void {
    const oldStages = this.params.stages;
    Object.assign(this.params, params);
    
    // Rebuild stages if count changed
    if (this.params.stages !== oldStages) {
      this.stagesL = [];
      this.stagesR = [];
      for (let i = 0; i < this.params.stages; i++) {
        this.stagesL.push(new AllpassStage());
        this.stagesR.push(new AllpassStage());
      }
    }
  }

  reset(): void {
    for (const stage of this.stagesL) stage.reset();
    for (const stage of this.stagesR) stage.reset();
    this.feedbackL = 0;
    this.feedbackR = 0;
    this.lfoPhase = 0;
  }
}
