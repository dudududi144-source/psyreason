// devices/kong/kong.ts - Reason Kong Drum Designer clone
// Hybrid drum synthesizer with 16 pads, each pad can be synth or sample

export type KongPadType = 'synth' | 'sample';
export type KongDrumType = 'kick' | 'snare' | 'hat' | 'cymbal' | 'perc' | 'tom' | 'clap' | 'fx';

export interface KongPadSynth {
  drumType: KongDrumType;
  pitch: number;       // 0-1
  decay: number;       // 0-1
  tone: number;        // 0-1
  drive: number;       // 0-1
  transient: number;   // 0-1 (click/attack)
  resonance: number;   // 0-1
}

export interface KongPad {
  id: number;
  type: KongPadType;
  name: string;
  synth: KongPadSynth;
  sampleName?: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  busGroup: number;  // for bus sends
}

export interface KongPattern {
  name: string;
  steps: boolean[][];  // 16 pads x 16 steps
}

export interface KongState {
  pads: KongPad[];
  patterns: KongPattern[];
  currentPattern: number;
  masterVolume: number;
  busSend1: number;
  busSend2: number;
}

export const KONG_PAD_NAMES = [
  'KICK 1', 'KICK 2', 'SNARE 1', 'SNARE 2',
  'HAT C', 'HAT O', 'RIDE', 'CRASH',
  'TOM H', 'TOM M', 'TOM L', 'CLAP',
  'PERC 1', 'PERC 2', 'FX 1', 'FX 2',
];

export function createDefaultKongState(): KongState {
  const pads: KongPad[] = [];
  const drumTypes: KongDrumType[] = [
    'kick', 'kick', 'snare', 'snare',
    'hat', 'hat', 'cymbal', 'cymbal',
    'tom', 'tom', 'tom', 'clap',
    'perc', 'perc', 'fx', 'fx',
  ];
  
  for (let i = 0; i < 16; i++) {
    pads.push({
      id: i,
      type: 'synth',
      name: KONG_PAD_NAMES[i],
      synth: {
        drumType: drumTypes[i],
        pitch: 0.5,
        decay: 0.5,
        tone: 0.5,
        drive: 0.2,
        transient: 0.5,
        resonance: 0.3,
      },
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      busGroup: i < 8 ? 0 : 1,
    });
  }
  
  return {
    pads,
    patterns: [{
      name: 'Pattern 1',
      steps: Array.from({ length: 16 }, () => new Array(16).fill(false)),
    }],
    currentPattern: 0,
    masterVolume: 0.9,
    busSend1: 0.3,
    busSend2: 0.3,
  };
}

export class KongDrumSynth {
  private sampleRate: number;

  constructor(sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
  }

  // Synthesize a drum hit based on drum type and parameters
  renderDrum(pad: KongPad, buffer: Float32Array): void {
    const sr = this.sampleRate;
    const synth = pad.synth;
    const baseFreq = this.getBaseFrequency(synth.drumType, synth.pitch);
    const decayTime = 0.05 + synth.decay * 1.5;
    const decaySamples = Math.floor(decayTime * sr);
    const len = Math.min(buffer.length, decaySamples);
    
    let noiseState = 1;
    const rng = () => {
      noiseState = (noiseState * 1103515245 + 12345) & 0x7fffffff;
      return (noiseState / 0x7fffffff) * 2 - 1;
    };
    
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t / (decayTime / 4));
      let sample = 0;
      
      switch (synth.drumType) {
        case 'kick': {
          // Sine wave with pitch envelope (click + body)
          const pitchEnv = baseFreq * (1 + synth.transient * 3 * Math.exp(-t * 40));
          const phase = 2 * Math.PI * pitchEnv * t;
          sample = Math.sin(phase) * env;
          // Add click transient
          if (t < 0.002) sample += rng() * synth.transient * 0.5;
          break;
        }
        case 'snare': {
          // Tone + noise
          const tone = Math.sin(2 * Math.PI * baseFreq * t) * 0.4;
          const noise = rng() * 0.6;
          const noiseEnv = Math.exp(-t / (decayTime / 6));
          sample = (tone * env + noise * noiseEnv);
          break;
        }
        case 'hat': {
          // Highpass filtered noise (short for closed, longer for open)
          const noise = rng();
          const isOpen = synth.decay > 0.5;
          const hatEnv = Math.exp(-t / (isOpen ? decayTime / 3 : decayTime / 10));
          sample = noise * hatEnv;
          // Simulate highpass by subtracting lowpassed version
          break;
        }
        case 'cymbal': {
          // Metallic noise with multiple partials
          let cym = 0;
          const partials = [3.4, 5.2, 7.1, 9.3, 11.7];
          for (const p of partials) {
            cym += Math.sin(2 * Math.PI * baseFreq * p * t) * (1 / p);
          }
          sample = (cym * 0.3 + rng() * 0.4) * env;
          break;
        }
        case 'tom': {
          // Sine with pitch bend down
          const pitchBend = baseFreq * (1 + 0.3 * Math.exp(-t * 20));
          sample = Math.sin(2 * Math.PI * pitchBend * t) * env;
          break;
        }
        case 'clap': {
          // Multiple noise bursts
          const burstCount = 4;
          const burstSpacing = 0.008;
          let clap = 0;
          for (let b = 0; b < burstCount; b++) {
            const burstTime = t - b * burstSpacing;
            if (burstTime >= 0) {
              clap += rng() * Math.exp(-burstTime * 200) * 0.3;
            }
          }
          sample = clap;
          break;
        }
        case 'perc': {
          // FM metallic percussion
          const modFreq = baseFreq * 1.5;
          const mod = Math.sin(2 * Math.PI * modFreq * t) * synth.tone * 3;
          sample = Math.sin(2 * Math.PI * baseFreq * t + mod) * env;
          break;
        }
        case 'fx': {
          // FX: filtered noise sweep
          const sweep = Math.sin(2 * Math.PI * (baseFreq + t * 1000) * t);
          sample = sweep * env * 0.5 + rng() * env * 0.3;
          break;
        }
      }
      
      // Apply drive
      if (synth.drive > 0) {
        sample = Math.tanh(sample * (1 + synth.drive * 5));
      }
      
      buffer[i] = sample * pad.volume;
    }
  }

  private getBaseFrequency(drumType: KongDrumType, pitch: number): number {
    const ranges: Record<KongDrumType, [number, number]> = {
      kick: [40, 120],
      snare: [150, 300],
      hat: [6000, 12000],
      cymbal: [3000, 8000],
      tom: [80, 250],
      clap: [1000, 3000],
      perc: [400, 2000],
      fx: [200, 2000],
    };
    const [min, max] = ranges[drumType];
    return min + (max - min) * pitch;
  }
}

export class KongDrumMachine {
  private state: KongState;
  private synth: KongDrumSynth;
  private sampleRate: number;

  constructor(sampleRate: number = 44100, state?: KongState) {
    this.sampleRate = sampleRate;
    this.state = state || createDefaultKongState();
    this.synth = new KongDrumSynth(sampleRate);
  }

  triggerPad(padId: number, velocity = 1): Float32Array {
    const pad = this.state.pads[padId];
    if (!pad || pad.muted) return new Float32Array(0);
    
    const buffer = new Float32Array(this.sampleRate * 2); // 2 seconds max
    this.synth.renderDrum(pad, buffer);
    
    // Apply velocity
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] *= velocity;
    }
    
    return buffer;
  }

  setPadParam(padId: number, param: keyof KongPadSynth, value: number): void {
    const pad = this.state.pads[padId];
    if (pad) {
      (pad.synth as unknown as Record<string, number>)[param] = Math.max(0, Math.min(1, value));
    }
  }

  getState(): KongState {
    return this.state;
  }

  loadState(state: KongState): void {
    this.state = state;
  }
}
