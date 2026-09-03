// host/rack/patch-graph.ts - Reason-style patching system
// Audio cables + CV cables between devices

export type PortType = 'audio-in' | 'audio-out' | 'cv-in' | 'cv-out';
export type CableType = 'audio' | 'cv';

export interface Port {
  id: string;
  deviceId: string;
  name: string;
  type: PortType;
  channel?: number; // for stereo: 0=L, 1=R
}

export interface Cable {
  id: string;
  type: CableType;
  fromPort: string;   // port id (must be an output)
  toPort: string;     // port id (must be an input)
  color?: string;
}

export interface DeviceNode {
  id: string;
  type: string;
  name: string;
  ports: Port[];
  position: { x: number; y: number };
  flipped: boolean; // rack flip (front/back view)
}

export interface PatchGraph {
  devices: Map<string, DeviceNode>;
  cables: Cable[];
}

export class PatchingEngine {
  private devices = new Map<string, DeviceNode>();
  private cables: Cable[] = [];
  private audioContext: AudioContext | null = null;
  private audioNodes = new Map<string, AudioNode>();
  private cvValues = new Map<string, number>();

  constructor(audioContext?: AudioContext) {
    this.audioContext = audioContext ?? null;
  }

  // Add a device to the rack
  addDevice(device: DeviceNode): void {
    this.devices.set(device.id, device);
  }

  removeDevice(deviceId: string): void {
    // Remove all cables connected to this device
    this.cables = this.cables.filter((cable) => {
      const fromPort = this.findPort(cable.fromPort);
      const toPort = this.findPort(cable.toPort);
      const fromDevice = fromPort?.deviceId;
      const toDevice = toPort?.deviceId;
      return fromDevice !== deviceId && toDevice !== deviceId;
    });
    this.devices.delete(deviceId);
    this.audioNodes.delete(deviceId);
  }

  // Connect two ports with a cable
  connect(fromPortId: string, toPortId: string, type: CableType): Cable | null {
    const fromPort = this.findPort(fromPortId);
    const toPort = this.findPort(toPortId);

    if (!fromPort || !toPort) return null;

    // Validate: output -> input only
    const isFromOutput = fromPort.type === 'audio-out' || fromPort.type === 'cv-out';
    const isToInput = toPort.type === 'audio-in' || toPort.type === 'cv-in';
    if (!isFromOutput || !isToInput) return null;

    // Validate type match
    const fromIsAudio = fromPort.type === 'audio-out';
    const toIsAudio = toPort.type === 'audio-in';
    if (type === 'audio' && (!fromIsAudio || !toIsAudio)) return null;
    if (type === 'cv' && (fromIsAudio || toIsAudio)) return null;

    // Disconnect existing cable to this input (one cable per input)
    this.cables = this.cables.filter((cable) => cable.toPort !== toPortId);

    const cable: Cable = {
      id: 'cable-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      type,
      fromPort: fromPortId,
      toPort: toPortId,
      color: type === 'audio' ? '#ff6600' : '#00aaff',
    };
    this.cables.push(cable);

    // If audio context available, wire actual audio
    if (this.audioContext && type === 'audio') {
      this.wireAudio(fromPort, toPort);
    }

    return cable;
  }

  disconnect(cableId: string): void {
    this.cables = this.cables.filter((cable) => cable.id !== cableId);
  }

  disconnectPort(portId: string): void {
    this.cables = this.cables.filter(
      (cable) => cable.fromPort !== portId && cable.toPort !== portId
    );
  }

  // Get all cables connected to a device
  getCablesForDevice(deviceId: string): Cable[] {
    return this.cables.filter((cable) => {
      const fromPort = this.findPort(cable.fromPort);
      const toPort = this.findPort(cable.toPort);
      return fromPort?.deviceId === deviceId || toPort?.deviceId === deviceId;
    });
  }

  // Get signal chain from a device (follow cables downstream)
  getSignalChain(startDeviceId: string, maxDepth = 20): string[] {
    const chain: string[] = [startDeviceId];
    let current = startDeviceId;
    let depth = 0;

    while (depth < maxDepth) {
      const outCables = this.cables.filter((cable) => {
        const port = this.findPort(cable.fromPort);
        return port?.deviceId === current && cable.type === 'audio';
      });

      if (outCables.length === 0) break;

      const nextPort = this.findPort(outCables[0].toPort);
      if (!nextPort || chain.includes(nextPort.deviceId)) break; // loop detection

      chain.push(nextPort.deviceId);
      current = nextPort.deviceId;
      depth++;
    }

    return chain;
  }

  // CV modulation: set a CV value on a port
  setCV(portId: string, value: number): void {
    this.cvValues.set(portId, value);
  }

  getCV(portId: string): number {
    return this.cvValues.get(portId) ?? 0;
  }

  // Get CV sources connected to a given CV input
  getCVSources(cvInPortId: string): number[] {
    const sources: number[] = [];
    for (const cable of this.cables) {
      if (cable.type === 'cv' && cable.toPort === cvInPortId) {
        sources.push(this.getCV(cable.fromPort));
      }
    }
    return sources;
  }

  // Serialize for save/load
  serialize(): { devices: DeviceNode[]; cables: Cable[] } {
    return {
      devices: Array.from(this.devices.values()),
      cables: this.cables,
    };
  }

  static deserialize(data: { devices: DeviceNode[]; cables: Cable[] }): PatchingEngine {
    const engine = new PatchingEngine();
    for (const device of data.devices) {
      engine.addDevice(device);
    }
    for (const cable of data.cables) {
      engine.cables.push(cable);
    }
    return engine;
  }

  private findPort(portId: string): Port | null {
    for (const device of this.devices.values()) {
      const port = device.ports.find((p) => p.id === portId);
      if (port) return port;
    }
    return null;
  }

  private wireAudio(fromPort: Port, toPort: Port): void {
    // Real audio wiring via Web Audio API
    if (!this.audioContext) return;
    const fromNode = this.audioNodes.get(fromPort.deviceId);
    const toNode = this.audioNodes.get(toPort.deviceId);
    if (fromNode && toNode) {
      try {
        fromNode.connect(toNode, fromPort.channel ?? 0, toPort.channel ?? 0);
      } catch {
        // connection may already exist
      }
    }
  }

  registerAudioNode(deviceId: string, node: AudioNode): void {
    this.audioNodes.set(deviceId, node);
  }
}

// Spider utilities (audio/CV mergers and splitters)
export class SpiderAudioMerger {
  // Merges 4 mono signals into 2 stereo pairs
  process(inputs: number[]): [number, number] {
    const l = (inputs[0] ?? 0) + (inputs[2] ?? 0);
    const r = (inputs[1] ?? 0) + (inputs[3] ?? 0);
    return [l, r];
  }
}

export class SpiderAudioSplitter {
  // Splits stereo into 4 mono signals
  process(inputL: number, inputR: number): number[] {
    return [inputL, inputR, inputL, inputR];
  }
}

export class SpiderCVMerger {
  // Merges multiple CV signals (sum)
  process(inputs: number[]): number {
    let sum = 0;
    for (const input of inputs) sum += input;
    return Math.max(-1, Math.min(1, sum));
  }
}

export class SpiderCVSplitter {
  // Splits one CV signal to multiple outputs
  process(input: number, outputs = 4): number[] {
    return new Array(outputs).fill(input);
  }
}

// Standard device port templates (Reason-style)
export const PORT_TEMPLATES = {
  synth: (deviceId: string): Port[] => [
    { id: deviceId + '-audio-out-l', deviceId, name: 'Audio Out L', type: 'audio-out', channel: 0 },
    { id: deviceId + '-audio-out-r', deviceId, name: 'Audio Out R', type: 'audio-out', channel: 1 },
    { id: deviceId + '-cv-gate-in', deviceId, name: 'Gate In', type: 'cv-in' },
    { id: deviceId + '-cv-pitch-in', deviceId, name: 'Pitch CV In', type: 'cv-in' },
    { id: deviceId + '-cv-mod-in', deviceId, name: 'Mod CV In', type: 'cv-in' },
  ],
  effect: (deviceId: string): Port[] => [
    { id: deviceId + '-audio-in-l', deviceId, name: 'Audio In L', type: 'audio-in', channel: 0 },
    { id: deviceId + '-audio-in-r', deviceId, name: 'Audio In R', type: 'audio-in', channel: 1 },
    { id: deviceId + '-audio-out-l', deviceId, name: 'Audio Out L', type: 'audio-out', channel: 0 },
    { id: deviceId + '-audio-out-r', deviceId, name: 'Audio Out R', type: 'audio-out', channel: 1 },
  ],
  lfo: (deviceId: string): Port[] => [
    { id: deviceId + '-cv-out', deviceId, name: 'CV Out', type: 'cv-out' },
    { id: deviceId + '-cv-sync-in', deviceId, name: 'Sync In', type: 'cv-in' },
  ],
  mixer: (deviceId: string, channels = 14): Port[] => {
    const ports: Port[] = [];
    for (let i = 0; i < channels; i++) {
      ports.push({ id: deviceId + '-in-' + i + '-l', deviceId, name: 'In ' + (i + 1) + ' L', type: 'audio-in', channel: 0 });
      ports.push({ id: deviceId + '-in-' + i + '-r', deviceId, name: 'In ' + (i + 1) + ' R', type: 'audio-in', channel: 1 });
    }
    ports.push({ id: deviceId + '-out-l', deviceId, name: 'Master Out L', type: 'audio-out', channel: 0 });
    ports.push({ id: deviceId + '-out-r', deviceId, name: 'Master Out R', type: 'audio-out', channel: 1 });
    return ports;
  },
};
