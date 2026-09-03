// host/sequencer/piano-roll.ts - Piano Roll note model and operations

export interface Note {
  id: string;
  midi: number;        // 0-127
  startBeat: number;   // in beats
  durationBeats: number;
  velocity: number;    // 0-127
  track: string;
}

export interface PianoRollState {
  notes: Note[];
  lengthBeats: number;
  snapGrid: number;    // in beats (1/16 = 0.25)
}

export class PianoRoll {
  notes: Note[] = [];
  lengthBeats: number;
  snapGrid: number;
  private history: Note[][] = [];
  private historyIndex = -1;

  constructor(lengthBeats = 16, snapGrid = 0.25) {
    this.lengthBeats = lengthBeats;
    this.snapGrid = snapGrid;
    this.pushHistory();
  }

  // Quantize a value to the snap grid
  quantize(value: number): number {
    return Math.round(value / this.snapGrid) * this.snapGrid;
  }

  addNote(midi: number, startBeat: number, durationBeats: number, velocity = 100, track = 'lead'): Note {
    const note: Note = {
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      midi: Math.max(0, Math.min(127, Math.round(midi))),
      startBeat: this.quantize(Math.max(0, startBeat)),
      durationBeats: Math.max(this.snapGrid, this.quantize(durationBeats)),
      velocity: Math.max(1, Math.min(127, Math.round(velocity))),
      track,
    };
    this.notes.push(note);
    this.pushHistory();
    return note;
  }

  removeNote(noteId: string): void {
    this.notes = this.notes.filter((n) => n.id !== noteId);
    this.pushHistory();
  }

  moveNote(noteId: string, newMidi: number, newStartBeat: number): void {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note) return;
    note.midi = Math.max(0, Math.min(127, Math.round(newMidi)));
    note.startBeat = this.quantize(Math.max(0, newStartBeat));
    this.pushHistory();
  }

  resizeNote(noteId: string, newDuration: number): void {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note) return;
    note.durationBeats = Math.max(this.snapGrid, this.quantize(newDuration));
    this.pushHistory();
  }

  setVelocity(noteId: string, velocity: number): void {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note) return;
    note.velocity = Math.max(1, Math.min(127, Math.round(velocity)));
  }

  // Get notes active at a given beat
  getNotesAtBeat(beat: number): Note[] {
    return this.notes.filter(
      (n) => beat >= n.startBeat && beat < n.startBeat + n.durationBeats
    );
  }

  // Get notes in a beat range
  getNotesInRange(startBeat: number, endBeat: number): Note[] {
    return this.notes.filter(
      (n) => n.startBeat < endBeat && n.startBeat + n.durationBeats > startBeat
    );
  }

  // Quantize all notes to grid
  quantizeAll(): void {
    for (const note of this.notes) {
      note.startBeat = this.quantize(note.startBeat);
      note.durationBeats = Math.max(this.snapGrid, this.quantize(note.durationBeats));
    }
    this.pushHistory();
  }

  // Humanize timing (micro-timing, psytrance-style)
  humanize(amount = 0.02, seed = 42): void {
    // Deterministic humanize using seeded RNG
    let rngState = seed >>> 0;
    const rng = () => {
      rngState = (rngState * 1664525 + 1013904223) >>> 0;
      return rngState / 4294967296;
    };
    for (const note of this.notes) {
      const offset = (rng() * 2 - 1) * amount;
      note.startBeat = Math.max(0, note.startBeat + offset);
    }
  }

  // Transpose all notes by semitones
  transpose(semitones: number): void {
    for (const note of this.notes) {
      note.midi = Math.max(0, Math.min(127, note.midi + semitones));
    }
    this.pushHistory();
  }

  // Reverse pattern
  reverse(): void {
    for (const note of this.notes) {
      const end = note.startBeat + note.durationBeats;
      note.startBeat = this.lengthBeats - end;
    }
    this.pushHistory();
  }

  // Copy pattern to another position
  duplicate(offsetBeats: number): void {
    const newNotes: Note[] = this.notes.map((note) => ({
      ...note,
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      startBeat: note.startBeat + offsetBeats,
    }));
    this.notes.push(...newNotes);
    this.pushHistory();
  }

  // Select notes in a region
  selectInRegion(startBeat: number, endBeat: number, lowMidi: number, highMidi: number): Note[] {
    return this.notes.filter(
      (n) =>
        n.startBeat < endBeat &&
        n.startBeat + n.durationBeats > startBeat &&
        n.midi >= lowMidi &&
        n.midi <= highMidi
    );
  }

  // Undo/Redo
  private pushHistory(): void {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(this.notes.map((n) => ({ ...n })));
    this.historyIndex = this.history.length - 1;
    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.notes = this.history[this.historyIndex].map((n) => ({ ...n }));
    }
  }

  redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.notes = this.history[this.historyIndex].map((n) => ({ ...n }));
    }
  }

  serialize(): { notes: Note[]; lengthBeats: number; snapGrid: number } {
    return {
      notes: this.notes.map((n) => ({ ...n })),
      lengthBeats: this.lengthBeats,
      snapGrid: this.snapGrid,
    };
  }

  static deserialize(data: { notes: Note[]; lengthBeats: number; snapGrid: number }): PianoRoll {
    const roll = new PianoRoll(data.lengthBeats, data.snapGrid);
    roll.notes = data.notes.map((n) => ({ ...n }));
    return roll;
  }
}

// Psytrance pattern generators for piano roll
export function generatePsyBassline(rootMidi = 33, lengthBeats = 16, style: 'rolling' | 'offbeat' | 'kbb' = 'rolling'): Note[] {
  const notes: Note[] = [];
  if (style === 'rolling') {
    // Classic rolling psy bass: 16th notes between kicks
    for (let beat = 0; beat < lengthBeats; beat += 0.25) {
      const beatInBar = beat % 1;
      if (beatInBar > 0.01) { // skip the kick position
        notes.push({
          id: 'bass-' + beat,
          midi: rootMidi,
          startBeat: beat,
          durationBeats: 0.2,
          velocity: 110,
          track: 'bass',
        });
      }
    }
  } else if (style === 'offbeat') {
    // Offbeat bass (progressive style)
    for (let beat = 0.5; beat < lengthBeats; beat += 1) {
      notes.push({
        id: 'bass-' + beat,
        midi: rootMidi,
        startBeat: beat,
        durationBeats: 0.45,
        velocity: 115,
        track: 'bass',
      });
    }
  } else if (style === 'kbb') {
    // K-B-B pattern (Kick-Bass-Bass)
    for (let bar = 0; bar < lengthBeats / 4; bar++) {
      const barStart = bar * 4;
      notes.push({ id: 'bass-k' + bar, midi: rootMidi, startBeat: barStart + 0.5, durationBeats: 0.4, velocity: 110, track: 'bass' });
      notes.push({ id: 'bass-b1-' + bar, midi: rootMidi, startBeat: barStart + 1.5, durationBeats: 0.4, velocity: 105, track: 'bass' });
      notes.push({ id: 'bass-b2-' + bar, midi: rootMidi + 12, startBeat: barStart + 2.5, durationBeats: 0.4, velocity: 100, track: 'bass' });
      notes.push({ id: 'bass-b3-' + bar, midi: rootMidi, startBeat: barStart + 3.5, durationBeats: 0.4, velocity: 105, track: 'bass' });
    }
  }
  return notes;
}

export function generateFourOnFloorKick(lengthBeats = 16): Note[] {
  const notes: Note[] = [];
  for (let beat = 0; beat < lengthBeats; beat += 1) {
    notes.push({
      id: 'kick-' + beat,
      midi: 36,
      startBeat: beat,
      durationBeats: 0.2,
      velocity: 127,
      track: 'kick',
    });
  }
  return notes;
}

export function generatePsyArp(rootMidi = 57, scale: number[] = [0, 1, 4, 5, 7, 8, 11], lengthBeats = 16): Note[] {
  // Phrygian-dominant arp (classic psytrance)
  const notes: Note[] = [];
  let degree = 0;
  let octaveShift = 0;
  for (let beat = 0; beat < lengthBeats; beat += 0.25) {
    const scaleNote = scale[degree % scale.length];
    const midi = rootMidi + scaleNote + octaveShift * 12;
    notes.push({
      id: 'arp-' + beat,
      midi: Math.max(0, Math.min(127, midi)),
      startBeat: beat,
      durationBeats: 0.2,
      velocity: 90 + Math.floor(Math.sin(beat) * 15),
      track: 'arp',
    });
    degree++;
    if (degree % scale.length === 0) {
      octaveShift = octaveShift === 0 ? 1 : 0;
    }
  }
  return notes;
}
