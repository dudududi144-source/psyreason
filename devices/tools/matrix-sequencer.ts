// devices/tools/matrix-sequencer.ts - Reason Matrix pattern sequencer clone
// 16-step pattern sequencer with 3 lanes (notes, gates, velocity)

export interface MatrixPattern {
  noteLane: number[];    // 16 values: 0-15 representing note rows
  gateLane: boolean[];   // 16 booleans: gate on/off
  velocityLane: number[]; // 16 values: 0-127
}

export const EMPTY_MATRIX_PATTERN: MatrixPattern = {
  noteLane: new Array(16).fill(8),
  gateLane: new Array(16).fill(false),
  velocityLane: new Array(16).fill(100),
};

export class MatrixSequencer {
  patterns: MatrixPattern[] = [];
  currentPattern = 0;
  currentStep = 0;
  private numPatterns: number;
  private baseMidi: number;
  private scaleNotes: number[];

  constructor(numPatterns = 4, baseMidi = 36, scaleNotes = [0, 3, 5, 7, 10]) {
    this.numPatterns = numPatterns;
    this.baseMidi = baseMidi;
    this.scaleNotes = scaleNotes; // minor pentatonic by default
    for (let i = 0; i < numPatterns; i++) {
      this.patterns.push({
        noteLane: [...EMPTY_MATRIX_PATTERN.noteLane],
        gateLane: [...EMPTY_MATRIX_PATTERN.gateLane],
        velocityLane: [...EMPTY_MATRIX_PATTERN.velocityLane],
      });
    }
  }

  // Set note row for a step (0-15, bottom to top)
  setNote(patternIndex: number, step: number, row: number): void {
    if (patternIndex < 0 || patternIndex >= this.numPatterns) return;
    if (step < 0 || step >= 16) return;
    this.patterns[patternIndex].noteLane[step] = Math.max(0, Math.min(15, row));
  }

  setGate(patternIndex: number, step: number, gate: boolean): void {
    if (patternIndex < 0 || patternIndex >= this.numPatterns) return;
    if (step < 0 || step >= 16) return;
    this.patterns[patternIndex].gateLane[step] = gate;
  }

  setVelocity(patternIndex: number, step: number, velocity: number): void {
    if (patternIndex < 0 || patternIndex >= this.numPatterns) return;
    if (step < 0 || step >= 16) return;
    this.patterns[patternIndex].velocityLane[step] = Math.max(0, Math.min(127, velocity));
  }

  toggleGate(patternIndex: number, step: number): void {
    this.setGate(patternIndex, step, !this.patterns[patternIndex].gateLane[step]);
  }

  // Advance to next step, returns MIDI note or -1 if no gate
  step(): { midi: number; velocity: number; gate: boolean } {
    const pattern = this.patterns[this.currentPattern];
    const row = pattern.noteLane[this.currentStep];
    const gate = pattern.gateLane[this.currentStep];
    const velocity = pattern.velocityLane[this.currentStep];

    // Convert row to MIDI via scale
    const octave = Math.floor(row / this.scaleNotes.length);
    const degree = row % this.scaleNotes.length;
    const midi = this.baseMidi + octave * 12 + this.scaleNotes[degree];

    const result = { midi, velocity, gate };
    this.currentStep = (this.currentStep + 1) % 16;
    if (this.currentStep === 0) {
      // Pattern complete - could advance to next pattern here
    }
    return result;
  }

  selectPattern(index: number): void {
    if (index >= 0 && index < this.numPatterns) {
      this.currentPattern = index;
      this.currentStep = 0;
    }
  }

  reset(): void {
    this.currentStep = 0;
  }

  // Generate a random psytrance pattern
  generatePsyPattern(patternIndex: number, seed = 42): void {
    let rngState = seed >>> 0;
    const rng = () => {
      rngState = (rngState * 1664525 + 1013904223) >>> 0;
      return rngState / 4294967296;
    };

    const pattern = this.patterns[patternIndex];
    for (let step = 0; step < 16; step++) {
      // Psytrance: gates on off-beats (skip kick positions)
      const beatInBar = step % 4;
      pattern.gateLane[step] = beatInBar !== 0 || rng() < 0.3;
      pattern.noteLane[step] = Math.floor(rng() * 12);
      pattern.velocityLane[step] = 80 + Math.floor(rng() * 40);
    }
  }

  serialize(): { patterns: MatrixPattern[]; baseMidi: number; scaleNotes: number[] } {
    return {
      patterns: this.patterns.map((p) => ({
        noteLane: [...p.noteLane],
        gateLane: [...p.gateLane],
        velocityLane: [...p.velocityLane],
      })),
      baseMidi: this.baseMidi,
      scaleNotes: [...this.scaleNotes],
    };
  }
}
