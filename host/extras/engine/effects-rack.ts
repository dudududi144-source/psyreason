export type EffectType = 'filter' | 'phaser' | 'crusher' | 'delay' | 'reverb' | 'limiter';

export interface EffectNode {
  type: EffectType;
  enabled: boolean;
  params: Record<string, number>;
}

export function createDefaultRack(): EffectNode[] {
  return [
    { type: 'filter', enabled: true, params: { cutoff: 1100, resonance: 3 } },
    { type: 'phaser', enabled: false, params: { depth: 0, rate: 0.3 } },
    { type: 'crusher', enabled: false, params: { amount: 0 } },
    { type: 'delay', enabled: true, params: { time: 0.34, feedback: 0.42, send: 0.5 } },
    { type: 'reverb', enabled: true, params: { size: 2.6, send: 0.28 } },
    { type: 'limiter', enabled: true, params: { threshold: -12, ratio: 6 } }
  ];
}

export function getEffect(rack: EffectNode[], type: EffectType): EffectNode | null {
  for (var i = 0; i < rack.length; i++) {
    if (rack[i].type === type) return rack[i];
  }
  return null;
}

export function setEffectEnabled(rack: EffectNode[], type: EffectType, enabled: boolean): EffectNode[] {
  return rack.map(function (node) {
    if (node.type !== type) return node;
    return { type: node.type, enabled: enabled, params: Object.assign({}, node.params) };
  });
}

export function setEffectParam(rack: EffectNode[], type: EffectType, key: string, value: number): EffectNode[] {
  return rack.map(function (node) {
    if (node.type !== type) return node;
    var nextParams = Object.assign({}, node.params);
    nextParams[key] = value;
    return { type: node.type, enabled: node.enabled, params: nextParams };
  });
}

export function activeEffects(rack: EffectNode[]): EffectNode[] {
  return rack.filter(function (node) {
    return node.enabled;
  });
}
