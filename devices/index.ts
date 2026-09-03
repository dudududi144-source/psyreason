// devices/index.ts - All device exports
export * from './subtractor';
export * from './nn-xt';
export * from './redrum';
export * from './thor/thor';
export * from './malstrom/malstrom';
export * from './europa/europa';
export * from './kong/kong';
export * from './grain/grain';
export * from './synchronous/synchronous';
export * from './pulsar/vocoder';
export * from './mixer/mixer-14-2';
export * from './combinator/combinator';
export * from './effects';
export * from './tools';

// Device registry for the rack
export interface DeviceInfo {
  id: string;
  name: string;
  type: 'synth' | 'sampler' | 'drum' | 'effect' | 'mixer' | 'combinator' | 'tool';
  category: string;
  color: string;
  description: string;
}

export const DEVICE_REGISTRY: DeviceInfo[] = [
  // Synthesizers
  { id: 'subtractor', name: 'Subtractor', type: 'synth', category: 'Synthesizers', color: '#ff6600', description: 'Subtractive synthesizer' },
  { id: 'thor', name: 'Thor', type: 'synth', category: 'Synthesizers', color: '#ff2bd6', description: 'Modular synthesizer' },
  { id: 'malstrom', name: 'Malstrom', type: 'synth', category: 'Synthesizers', color: '#ffaa00', description: 'Graintable synthesizer' },
  { id: 'europa', name: 'Europa', type: 'synth', category: 'Synthesizers', color: '#00ffcc', description: 'Wavetable synthesizer' },
  // Samplers
  { id: 'nn-xt', name: 'NN-XT', type: 'sampler', category: 'Samplers', color: '#00aaff', description: 'Advanced sampler' },
  { id: 'grain', name: 'Grain', type: 'sampler', category: 'Samplers', color: '#66ccff', description: 'Granular sampler' },
  // Drums
  { id: 'redrum', name: 'Redrum', type: 'drum', category: 'Drums', color: '#ffcc00', description: 'Classic drum machine' },
  { id: 'kong', name: 'Kong', type: 'drum', category: 'Drums', color: '#ff8800', description: 'Drum designer with 16 pads' },
  // Effects
  { id: 'synchronous', name: 'Synchronous', type: 'effect', category: 'Effects', color: '#cc66ff', description: 'Step-based multi-FX' },
  { id: 'vocoder', name: 'Pulsar Vocoder', type: 'effect', category: 'Effects', color: '#ff66cc', description: 'Vocoder with band analysis' },
  { id: 'reverb', name: 'RV-7 Reverb', type: 'effect', category: 'Effects', color: '#aa66ff', description: 'Digital reverb' },
  { id: 'delay', name: 'DDL-1 Delay', type: 'effect', category: 'Effects', color: '#aa66ff', description: 'Digital delay' },
  { id: 'chorus', name: 'CF-100 Chorus', type: 'effect', category: 'Effects', color: '#aa66ff', description: 'Chorus/Flanger' },
  { id: 'distortion', name: 'Scream 4', type: 'effect', category: 'Effects', color: '#aa66ff', description: 'Distortion unit' },
  { id: 'filter', name: 'ECF-42 Filter', type: 'effect', category: 'Effects', color: '#aa66ff', description: 'Envelope filter' },
  { id: 'phaser', name: 'Phaser', type: 'effect', category: 'Effects', color: '#aa66ff', description: 'Phaser/Flanger' },
  // Mastering
  { id: 'compressor', name: 'MClass Compressor', type: 'effect', category: 'Mastering', color: '#ff4444', description: 'Mastering compressor' },
  { id: 'eq', name: 'MClass EQ', type: 'effect', category: 'Mastering', color: '#ff4444', description: 'Parametric EQ' },
  { id: 'imager', name: 'MClass Imager', type: 'effect', category: 'Mastering', color: '#ff4444', description: 'Stereo imager' },
  // Mixing
  { id: 'mixer', name: 'Mixer 14:2', type: 'mixer', category: 'Mixing', color: '#00ff88', description: '14-channel mixer' },
  { id: 'combinator', name: 'Combinator', type: 'combinator', category: 'Mixing', color: '#88ff00', description: 'Device combiner' },
  // Tools
  { id: 'arp', name: 'RPG-8 Arpeggiator', type: 'tool', category: 'Tools', color: '#66ffcc', description: 'MIDI arpeggiator' },
  { id: 'matrix', name: 'Matrix Sequencer', type: 'tool', category: 'Tools', color: '#66ffcc', description: 'Pattern sequencer' },
];

export function getDeviceById(id: string): DeviceInfo | undefined {
  return DEVICE_REGISTRY.find((d) => d.id === id);
}

export function getDevicesByType(type: DeviceInfo['type']): DeviceInfo[] {
  return DEVICE_REGISTRY.filter((d) => d.type === type);
}

export function getDevicesByCategory(category: string): DeviceInfo[] {
  return DEVICE_REGISTRY.filter((d) => d.category === category);
}

export function getDeviceCount(): number {
  return DEVICE_REGISTRY.length;
}
