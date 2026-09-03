// tests/unit/piano-roll.test.ts
import { describe, it, expect } from 'bun:test';
import { PianoRoll, generatePsyBassline, generateFourOnFloorKick, generatePsyArp } from '../../host/sequencer/piano-roll';

describe('PianoRoll', () => {
  it('creates empty piano roll', () => {
    const roll = new PianoRoll(16, 0.25);
    expect(roll.notes.length).toBe(0);
    expect(roll.lengthBeats).toBe(16);
    expect(roll.snapGrid).toBe(0.25);
  });

  it('adds note with quantization', () => {
    const roll = new PianoRoll(16, 0.25);
    const note = roll.addNote(60, 1.13, 0.3);
    expect(note.startBeat).toBe(1.25); // quantized to grid
    expect(note.durationBeats).toBe(0.25);
    expect(note.midi).toBe(60);
  });

  it('clamps midi to valid range', () => {
    const roll = new PianoRoll();
    const note = roll.addNote(200, 0, 1);
    expect(note.midi).toBe(127);
    const note2 = roll.addNote(-10, 0, 1);
    expect(note2.midi).toBe(0);
  });

  it('removes notes', () => {
    const roll = new PianoRoll();
    const note = roll.addNote(60, 0, 1);
    expect(roll.notes.length).toBe(1);
    roll.removeNote(note.id);
    expect(roll.notes.length).toBe(0);
  });

  it('gets notes at beat', () => {
    const roll = new PianoRoll();
    roll.addNote(60, 0, 1);
    roll.addNote(64, 2, 1);
    expect(roll.getNotesAtBeat(0.5).length).toBe(1);
    expect(roll.getNotesAtBeat(2.5).length).toBe(1);
    expect(roll.getNotesAtBeat(1.5).length).toBe(0);
  });

  it('supports undo/redo', () => {
    const roll = new PianoRoll();
    roll.addNote(60, 0, 1);
    expect(roll.notes.length).toBe(1);
    roll.undo();
    expect(roll.notes.length).toBe(0);
    roll.redo();
    expect(roll.notes.length).toBe(1);
  });

  it('transposes all notes', () => {
    const roll = new PianoRoll();
    roll.addNote(60, 0, 1);
    roll.addNote(64, 1, 1);
    roll.transpose(3);
    expect(roll.notes[0].midi).toBe(63);
    expect(roll.notes[1].midi).toBe(67);
  });

  it('serializes and deserializes', () => {
    const roll = new PianoRoll();
    roll.addNote(60, 0, 1);
    roll.addNote(64, 1, 1);
    const data = roll.serialize();
    const restored = PianoRoll.deserialize(data);
    expect(restored.notes.length).toBe(2);
    expect(restored.lengthBeats).toBe(16);
  });

  it('humanize is deterministic with same seed', () => {
    const roll1 = new PianoRoll();
    roll1.addNote(60, 0, 0.25);
    roll1.addNote(60, 0.25, 0.25);
    roll1.humanize(0.02, 42);

    const roll2 = new PianoRoll();
    roll2.addNote(60, 0, 0.25);
    roll2.addNote(60, 0.25, 0.25);
    roll2.humanize(0.02, 42);

    expect(roll1.notes[0].startBeat).toBe(roll2.notes[0].startBeat);
    expect(roll1.notes[1].startBeat).toBe(roll2.notes[1].startBeat);
  });
});

describe('Psytrance Pattern Generators', () => {
  it('generates four-on-floor kick', () => {
    const kicks = generateFourOnFloorKick(16);
    expect(kicks.length).toBe(16);
    for (let i = 0; i < kicks.length; i++) {
      expect(kicks[i].startBeat).toBe(i);
      expect(kicks[i].midi).toBe(36);
      expect(kicks[i].velocity).toBe(127);
    }
  });

  it('generates rolling bass without kick collisions', () => {
    const bass = generatePsyBassline(33, 4, 'rolling');
    // No bass notes on integer beats (kick positions)
    for (const note of bass) {
      expect(note.startBeat % 1).not.toBe(0);
    }
    expect(bass.length).toBe(12); // 16 sixteenths minus 4 kicks per 4 beats
  });

  it('generates offbeat bass', () => {
    const bass = generatePsyBassline(33, 4, 'offbeat');
    expect(bass.length).toBe(4);
    for (const note of bass) {
      expect(note.startBeat % 1).toBe(0.5);
    }
  });

  it('generates KBB pattern', () => {
    const bass = generatePsyBassline(33, 4, 'kbb');
    expect(bass.length).toBe(4); // 4 notes per bar in KBB
  });

  it('generates phrygian arp within MIDI range', () => {
    const arp = generatePsyArp(57, [0, 1, 4, 5, 7, 8, 11], 16);
    expect(arp.length).toBe(64); // 16 beats * 4 sixteenths
    for (const note of arp) {
      expect(note.midi).toBeGreaterThanOrEqual(0);
      expect(note.midi).toBeLessThanOrEqual(127);
    }
  });
});
