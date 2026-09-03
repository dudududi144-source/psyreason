// devices/index.ts - All device exports
export * from './subtractor';
export * from './nn-xt';
export * from './redrum';
export * from './thor/thor';
export * from './malstrom/malstrom';
export * from './europa/europa';
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
}

export const DEVICE_REGISTRY: DeviceInfo[] = [
  { id: 'subtractor', name: 'Subtractor', type: 'synth', category: 'Synthesizers', color: '#ff6600' },
  { id: 'thor', name: 'Thor', type: 'synth', category: 'Synthesizers', color: '#ff2bd6' },
  { id: 'malstrom', name: 'Malstrom', type: 'synth', category: 'Synthesizers', color: '#ffaa00' },
  { id: 'europa', name: 'Europa', type: 'synth', category: 'Synthesizers', color: '#00ffcc' },
  { id: 'nn-xt', name: 'NN-XT', type: 'sampler', category: 'Samplers', color: '#00aaff' },
  { id: 'redrum', name: 'Redrum', type: 'drum', category: 'Drums', color: '#ffcc00' },
  { id: 'mixer', name: 'Mixer 14:2', type: 'mixer', category: 'Mixing', color: '#00ff88' },
  { id: 'combinator', name: 'Combinator', type: 'combinator', category: 'Routing', color: '#88ff00' },
  { id: 'reverb', name: 'RV-7 Reverb', type: 'effect', category: 'Effects', color: '#aa66ff' },
  { id: 'delay', name: 'DDL-1 Delay', type: 'effect', category: 'Effects', color: '#aa66ff' },
  { id: 'chorus', name: 'CF-100 Chorus', type: 'effect', category: 'Effects', color: '#aa66ff' },
  { id: 'distortion', name: 'Scream 4', type: 'effect', category: 'Effects', color: '#aa66ff' },
  { id: 'filter', name: 'ECF-42 Filter', type: 'effect', category: 'Effects', color: '#aa66ff' },
  { id: 'compressor', name: 'MClass Compressor', type: 'effect', category: 'Mastering', color: '#ff4444' },
  { id: 'eq', name: 'MClass EQ', type: 'effect', category: 'Mastering', color: '#ff4444' },
  { id: 'phaser', name: 'Phaser', type: 'effect', category: 'Effects', color: '#aa66ff' },
  { id: 'imager', name: 'MClass Imager', type: 'effect', category: 'Mastering', color: '#ff4444' },
  { id: 'arp', name: 'RPG-8 Arpeggiator', type: 'tool', category: 'Tools', color: '#66ffcc' },
  { id: 'matrix', name: 'Matrix Sequencer', type: 'tool', category: 'Tools', color: '#66ffcc' },
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
