// devices/effects/index.ts - Effects module exports
export * from './reverb';
export * from './delay';
export * from './chorus';
export * from './distortion';
export * from './filter';
export * from './compressor';
export * from './eq';
export * from './phaser';
export * from './stereo-imager';

// Effect chain builder for creating custom FX chains
export type EffectType = 'reverb' | 'delay' | 'chorus' | 'distortion' | 'filter' | 'compressor' | 'eq' | 'phaser' | 'imager';

export interface EffectNode {
  type: EffectType;
  params: Record<string, unknown>;
}

export class EffectChain {
  private effects: EffectNode[] = [];

  addEffect(type: EffectType, params: Record<string, unknown> = {}): this {
    this.effects.push({ type, params });
    return this;
  }

  removeEffect(index: number): this {
    this.effects.splice(index, 1);
    return this;
  }

  getEffects(): EffectNode[] {
    return [...this.effects];
  }
}

// Psytrance-specific effect presets (expanded)
export const PSYTRANCE_FX_PRESETS = {
  acidDelay: [
    { type: 'filter' as EffectType, params: { frequency: 800, resonance: 0.7, mode: 'lowpass' } },
    { type: 'delay' as EffectType, params: { division: 0.25, feedback: 0.5, pingPong: true } },
  ],
  psychedelicSpace: [
    { type: 'phaser' as EffectType, params: { rate: 0.3, depth: 0.7, stages: 6 } },
    { type: 'chorus' as EffectType, params: { rate: 0.3, depth: 0.6, mode: 'chorus' } },
    { type: 'reverb' as EffectType, params: { roomSize: 0.8, wetLevel: 0.4 } },
  ],
  fullOnDrive: [
    { type: 'distortion' as EffectType, params: { drive: 0.4, mode: 'tube' } },
    { type: 'compressor' as EffectType, params: { threshold: -12, ratio: 4 } },
    { type: 'imager' as EffectType, params: { masterWidth: 1.2 } },
  ],
  darkProgressive: [
    { type: 'filter' as EffectType, params: { frequency: 500, resonance: 0.5, mode: 'lowpass' } },
    { type: 'delay' as EffectType, params: { division: 0.375, feedback: 0.6 } },
    { type: 'reverb' as EffectType, params: { roomSize: 0.9, wetLevel: 0.5 } },
  ],
  masteringChain: [
    { type: 'eq' as EffectType, params: {} },
    { type: 'compressor' as EffectType, params: { threshold: -6, ratio: 2, attack: 0.03, release: 0.3 } },
    { type: 'imager' as EffectType, params: { masterWidth: 1.1 } },
    { type: 'eq' as EffectType, params: {} },
  ],
  psyLeadChain: [
    { type: 'distortion' as EffectType, params: { drive: 0.2, mode: 'tube' } },
    { type: 'phaser' as EffectType, params: { rate: 0.5, depth: 0.5, stages: 4 } },
    { type: 'delay' as EffectType, params: { division: 0.25, feedback: 0.4, pingPong: true } },
    { type: 'reverb' as EffectType, params: { roomSize: 0.6, wetLevel: 0.3 } },
  ],
};
