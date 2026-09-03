// devices/tools/rpg8-arpeggiator.ts - Reason RPG-8 arpeggiator clone
// MIDI-driven arpeggiator with multiple modes and latch

export type ArpMode = 'up' | 'down' | 'updown' | 'random' | 'asplayed' | 'chord';
export type ArpOctaveMode = 'single' | 'up2' | 'up3' | 'updown2';

export interface ArpeggiatorParams {
  mode: ArpMode;
  octaveMode: ArpOctaveMode;
  rate: number;          // beat division (0.25 = 16th, 0.5 = 8th)
  gateLength: number;    // 0-1 (percentage of step)
  latch: boolean;        // keep playing after keys released
  velocity: number;      // 0-1 (fixed velocity) or use played velocity
  sync: boolean;         // tempo sync
}

export const DEFAULT_ARP_PARAMS: ArpeggiatorParams = {
  mode: 'up',
  octaveMode: 'single',
  rate: 0.25,
  gateLength: 0.5,
  latch: false,
  velocity: 0,
  sync: true,
};

export interface ArpNote {
  midi: number;
  velocity: number;
}

export class RPG8Arpeggiator {
  private params: ArpeggiatorParams;
  private heldNotes: ArpNote[] = [];
  private stepIndex = 0;
  private randomSeed = 1;
  private pattern: ArpNote[] = [];

  constructor(params: Partial<ArpeggiatorParams> = {}) {
    this.params = { ...DEFAULT_ARP_PARAMS, ...params };
  }

  noteOn(midi: number, velocity = 100): void {
    // Remove existing same midi
    this.heldNotes = this.heldNotes.filter((n) => n.midi !== midi);
    this.heldNotes.push({ midi, velocity });
    this.rebuildPattern();
  }

  noteOff(midi: number): void {
    this.heldNotes = this.heldNotes.filter((n) => n.midi !== midi);
    if (!this.params.latch) {
      this.rebuildPattern();
    }
  }

  setParams(params: Partial<ArpeggiatorParams>): void {
    Object.assign(this.params, params);
    this.rebuildPattern();
  }

  // Get next note in sequence (called every step)
  nextNote(): ArpNote | null {
    if (this.pattern.length === 0) return null;

    const note = this.pattern[this.stepIndex % this.pattern.length];
    this.stepIndex++;

    // Apply velocity override
    if (this.params.velocity > 0) {
      return { midi: note.midi, velocity: Math.round(this.params.velocity * 127) };
    }
    return { ...note };
  }

  // Reset step counter
  reset(): void {
    this.stepIndex = 0;
  }

  // Advance by step duration (for sync)
  getStepDurationBeats(): number {
    return this.params.rate;
  }

  getGateDurationBeats(): number {
    return this.params.rate * this.params.gateLength;
  }

  isActive(): boolean {
    return this.heldNotes.length > 0 || (this.params.latch && this.pattern.length > 0);
  }

  private rebuildPattern(): void {
    if (this.heldNotes.length === 0) {
      this.pattern = [];
      return;
    }

    // Sort notes ascending
    const sorted = [...this.heldNotes].sort((a, b) => a.midi - b.midi);

    // Expand octaves
    const expanded: ArpNote[] = [];
    const octaveRange = this.getOctaveRange();
    for (let oct = 0; oct < octaveRange.length; oct++) {
      const octaveShift = octaveRange[oct] * 12;
      for (const note of sorted) {
        expanded.push({ midi: note.midi + octaveShift, velocity: note.velocity });
      }
    }

    // Apply mode
    switch (this.params.mode) {
      case 'up':
        this.pattern = expanded;
        break;
      case 'down':
        this.pattern = [...expanded].reverse();
        break;
      case 'updown': {
        const up = expanded;
        const down = [...expanded].reverse().slice(1, -1);
        this.pattern = [...up, ...down];
        break;
      }
      case 'random': {
        // Deterministic shuffle using seed
        this.randomSeed = (this.randomSeed * 1103515245 + 12345) & 0x7fffffff;
        const rng = () => {
          this.randomSeed = (this.randomSeed * 1664525 + 1013904223) >>> 0;
          return this.randomSeed / 4294967296;
        };
        this.pattern = [...expanded];
        for (let i = this.pattern.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [this.pattern[i], this.pattern[j]] = [this.pattern[j], this.pattern[i]];
        }
        break;
      }
      case 'asplayed':
        this.pattern = [...this.heldNotes];
        break;
      case 'chord':
        // All notes at once (special case - return first, others via getChord)
        this.pattern = expanded;
        break;
    }
  }

  private getOctaveRange(): number[] {
    switch (this.params.octaveMode) {
      case 'single': return [0];
      case 'up2': return [0, 1];
      case 'up3': return [0, 1, 2];
      case 'updown2': return [0, 1, 0];
      default: return [0];
    }
  }

  // For chord mode: get all notes to play simultaneously
  getChordNotes(): ArpNote[] {
    if (this.params.mode !== 'chord') return [];
    return [...this.pattern];
  }
}

// Psytrance-specific arpeggiator presets
export const PSYTRANCE_ARP_PRESETS = {
  classicPsyArp: {
    mode: 'updown' as ArpMode,
    octaveMode: 'up2' as ArpOctaveMode,
    rate: 0.25,
    gateLength: 0.6,
    latch: false,
    velocity: 0,
    sync: true,
  },
  rollingSixteenths: {
    mode: 'asplayed' as ArpMode,
    octaveMode: 'single' as ArpOctaveMode,
    rate: 0.25,
    gateLength: 0.5,
    latch: true,
    velocity: 0.75,
    sync: true,
  },
  progressiveSweep: {
    mode: 'up' as ArpMode,
    octaveMode: 'up3' as ArpOctaveMode,
    rate: 0.5,
    gateLength: 0.8,
    latch: false,
    velocity: 0,
    sync: true,
  },
  randomPsy: {
    mode: 'random' as ArpMode,
    octaveMode: 'up2' as ArpOctaveMode,
    rate: 0.25,
    gateLength: 0.4,
    latch: false,
    velocity: 0,
    sync: true,
  },
};
