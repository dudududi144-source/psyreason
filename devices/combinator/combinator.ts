// devices/combinator/combinator.ts - Reason Combinator clone
// Combines multiple devices into a single patchable unit

export interface CombinatorDevice {
  id: string;
  type: string;
  name: string;
  params: Record<string, unknown>;
}

export interface CombinatorConnection {
  fromDevice: string;
  fromPort: string;
  toDevice: string;
  toPort: string;
  type: 'audio' | 'cv';
}

export class Combinator {
  name = 'Combinator';
  devices: CombinatorDevice[] = [];
  connections: CombinatorConnection[] = [];
  macros: { name: string; min: number; max: number; value: number }[] = [];

  constructor(name: string = 'Combinator') {
    this.name = name;
    // Initialize 4 macro controls (like Reason's Combinator)
    for (let i = 1; i <= 4; i++) {
      this.macros.push({ name: 'Macro ' + i, min: 0, max: 1, value: 0.5 });
    }
  }

  addDevice(device: CombinatorDevice): void {
    this.devices.push(device);
  }

  removeDevice(id: string): void {
    this.devices = this.devices.filter(d => d.id !== id);
    this.connections = this.connections.filter(
      c => c.fromDevice !== id && c.toDevice !== id
    );
  }

  connect(fromDevice: string, fromPort: string, toDevice: string, toPort: string, type: 'audio' | 'cv' = 'audio'): void {
    this.connections.push({ fromDevice, fromPort, toDevice, toPort, type });
  }

  disconnect(fromDevice: string, fromPort: string): void {
    this.connections = this.connections.filter(
      c => !(c.fromDevice === fromDevice && c.fromPort === fromPort)
    );
  }

  setMacro(index: number, value: number): void {
    if (index >= 0 && index < this.macros.length) {
      this.macros[index].value = Math.max(0, Math.min(1, value));
    }
  }

  serialize(): Record<string, unknown> {
    return {
      name: this.name,
      devices: this.devices,
      connections: this.connections,
      macros: this.macros,
    };
  }

  static deserialize(data: Record<string, unknown>): Combinator {
    const c = new Combinator(data.name as string);
    c.devices = data.devices as CombinatorDevice[];
    c.connections = data.connections as CombinatorConnection[];
    c.macros = data.macros as { name: string; min: number; max: number; value: number }[];
    return c;
  }
}

// Psytrance Combinator presets
export const PSYTRANCE_COMBINATORS = {
  acidBass: {
    name: 'Acid Bass Station',
    devices: [
      { id: 'subtractor', type: 'synth', name: 'Subtractor', params: {} },
      { id: 'filter', type: 'effect', name: 'ECF-42 Filter', params: {} },
      { id: 'delay', type: 'effect', name: 'DDL-1 Delay', params: {} },
      { id: 'compressor', type: 'effect', name: 'MClass Compressor', params: {} },
    ],
    connections: [
      { fromDevice: 'subtractor', fromPort: 'out', toDevice: 'filter', toPort: 'in', type: 'audio' },
      { fromDevice: 'filter', fromPort: 'out', toDevice: 'delay', toPort: 'in', type: 'audio' },
      { fromDevice: 'delay', fromPort: 'out', toDevice: 'compressor', toPort: 'in', type: 'audio' },
    ],
  },
  psyLead: {
    name: 'Psy Lead Machine',
    devices: [
      { id: 'subtractor', type: 'synth', name: 'Subtractor', params: {} },
      { id: 'chorus', type: 'effect', name: 'CF-100 Chorus', params: {} },
      { id: 'reverb', type: 'effect', name: 'RV-7 Reverb', params: {} },
    ],
    connections: [
      { fromDevice: 'subtractor', fromPort: 'out', toDevice: 'chorus', toPort: 'in', type: 'audio' },
      { fromDevice: 'chorus', fromPort: 'out', toDevice: 'reverb', toPort: 'in', type: 'audio' },
    ],
  },
  fullOnDrums: {
    name: 'Full-On Drum Kit',
    devices: [
      { id: 'redrum', type: 'drum', name: 'Redrum', params: {} },
      { id: 'eq', type: 'effect', name: 'MClass EQ', params: {} },
      { id: 'compressor', type: 'effect', name: 'MClass Compressor', params: {} },
    ],
    connections: [
      { fromDevice: 'redrum', fromPort: 'out', toDevice: 'eq', toPort: 'in', type: 'audio' },
      { fromDevice: 'eq', fromPort: 'out', toDevice: 'compressor', toPort: 'in', type: 'audio' },
    ],
  },
};
