// tests/unit/new-devices.test.ts
import { describe, it, expect } from 'bun:test';
import { MalstromSynth, MalstromVoice, DEFAULT_MALSTROM_PATCH, buildGraintable } from '../../devices/malstrom/malstrom';
import { EuropaSynth, EuropaVoice, DEFAULT_EUROPA_PATCH, buildEuropaWavetable } from '../../devices/europa/europa';
import { Phaser } from '../../devices/effects/phaser';
import { StereoImager, StereoWidthMeter, MonoMaker } from '../../devices/effects/stereo-imager';
import { RPG8Arpeggiator, PSYTRANCE_ARP_PRESETS } from '../../devices/tools/rpg8-arpeggiator';
import { MatrixSequencer } from '../../devices/tools/matrix-sequencer';

describe('MalstromSynth', () => {
  it('produces sound on noteOn', () => {
    const malstrom = new MalstromSynth(44100, DEFAULT_MALSTROM_PATCH);
    malstrom.noteOn(60);
    const buffer = new Float32Array(4410);
    malstrom.process(buffer, new Map([[60, true]]));
    let energy = 0;
    for (const sample of buffer) energy += sample * sample;
    expect(energy).toBeGreaterThan(0);
  });

  it('all graintables produce valid output', () => {
    const tables = ['saw-sweep', 'square-pulse', 'vocal-ah', 'metallic', 'psy-lead', 'dark-drone'];
    for (const name of tables) {
      const table = buildGraintable(name);
      for (const sample of table) {
        expect(Number.isFinite(sample)).toBe(true);
        expect(Math.abs(sample)).toBeLessThanOrEqual(1.001);
      }
    }
  });
});

describe('EuropaSynth', () => {
  it('produces sound on noteOn', () => {
    const europa = new EuropaSynth(44100, DEFAULT_EUROPA_PATCH);
    europa.noteOn(60);
    const buffer = new Float32Array(4410);
    europa.process(buffer, new Map([[60, true]]));
    let energy = 0;
    for (const sample of buffer) energy += sample * sample;
    expect(energy).toBeGreaterThan(0);
  });

  it('wavetable generation produces normalized output', () => {
    const table = buildEuropaWavetable(0.5, 0.5, 0.8);
    let maxVal = 0;
    for (const sample of table) {
      maxVal = Math.max(maxVal, Math.abs(sample));
      expect(Number.isFinite(sample)).toBe(true);
    }
    expect(maxVal).toBeLessThanOrEqual(1.001);
    expect(maxVal).toBeGreaterThan(0.9);
  });

  it('unison creates thicker sound', () => {
    const patch1 = { ...DEFAULT_EUROPA_PATCH };
    patch1.waves[0] = { ...patch1.waves[0], unison: 1 };
    const patch3 = { ...DEFAULT_EUROPA_PATCH };
    patch3.waves[0] = { ...patch3.waves[0], unison: 3 };

    const europa1 = new EuropaSynth(44100, patch1);
    const europa3 = new EuropaSynth(44100, patch3);
    
    europa1.noteOn(60);
    europa3.noteOn(60);
    
    const buffer1 = new Float32Array(4410);
    const buffer3 = new Float32Array(4410);
    europa1.process(buffer1, new Map([[60, true]]));
    europa3.process(buffer3, new Map([[60, true]]));

    let energy1 = 0;
    let energy3 = 0;
    for (let i = 0; i < 4410; i++) {
      energy1 += buffer1[i] * buffer1[i];
      energy3 += buffer3[i] * buffer3[i];
    }
    // Unison should have different energy (thicker)
    expect(energy3).not.toBe(energy1);
  });
});

describe('Phaser', () => {
  it('produces output for impulse input', () => {
    const phaser = new Phaser(44100, { wetLevel: 1, dryLevel: 0 });
    let totalEnergy = 0;
    for (let i = 0; i < 4410; i++) {
      const input = i === 0 ? 1 : 0;
      const [outL, outR] = phaser.process(input, input);
      totalEnergy += outL * outL + outR * outR;
      expect(Number.isFinite(outL)).toBe(true);
      expect(Number.isFinite(outR)).toBe(true);
    }
    expect(totalEnergy).toBeGreaterThan(0);
  });

  it('stereo mode produces different L/R', () => {
    const phaser = new Phaser(44100, { stereo: true, wetLevel: 1, dryLevel: 0, depth: 0.9 });
    let sumDiff = 0;
    for (let i = 0; i < 4410; i++) {
      const input = Math.sin(2 * Math.PI * 440 * i / 44100);
      const [outL, outR] = phaser.process(input, input);
      sumDiff += Math.abs(outL - outR);
    }
    expect(sumDiff).toBeGreaterThan(0);
  });
});

describe('StereoImager', () => {
  it('mono input stays mono with width 0', () => {
    const imager = new StereoImager(44100, { masterWidth: 0 });
    const [outL, outR] = imager.process(0.5, 0.5);
    expect(outL).toBeCloseTo(outR, 5);
  });

  it('width meter measures mono as width 0', () => {
    const meter = new StereoWidthMeter();
    for (let i = 0; i < 100; i++) {
      meter.process(0.5, 0.5); // identical = mono
    }
    expect(meter.getWidth()).toBeCloseTo(0, 1);
  });

  it('mono maker produces identical channels', () => {
    const mono = new MonoMaker();
    const [outL, outR] = mono.process(1, -1);
    expect(outL).toBe(0);
    expect(outR).toBe(0);
    const [outL2, outR2] = mono.process(0.8, 0.4);
    expect(outL2).toBe(outR2);
  });
});

describe('RPG8Arpeggiator', () => {
  it('plays notes in up mode', () => {
    const arp = new RPG8Arpeggiator({ mode: 'up' });
    arp.noteOn(60);
    arp.noteOn(64);
    arp.noteOn(67);

    const notes = [];
    for (let i = 0; i < 6; i++) {
      const note = arp.nextNote();
      if (note) notes.push(note.midi);
    }
    // Up mode: 60, 64, 67, 60, 64, 67
    expect(notes[0]).toBe(60);
    expect(notes[1]).toBe(64);
    expect(notes[2]).toBe(67);
  });

  it('plays notes in down mode', () => {
    const arp = new RPG8Arpeggiator({ mode: 'down' });
    arp.noteOn(60);
    arp.noteOn(64);
    arp.noteOn(67);

    const note = arp.nextNote();
    expect(note?.midi).toBe(67);
  });

  it('all psytrance presets are valid', () => {
    for (const [name, preset] of Object.entries(PSYTRANCE_ARP_PRESETS)) {
      expect(preset.rate).toBeGreaterThan(0);
      expect(preset.gateLength).toBeGreaterThan(0);
      expect(preset.gateLength).toBeLessThanOrEqual(1);
    }
  });

  it('latch mode keeps playing after noteOff', () => {
    const arp = new RPG8Arpeggiator({ latch: true });
    arp.noteOn(60);
    arp.noteOff(60);
    expect(arp.isActive()).toBe(true);
  });

  it('no latch stops after noteOff', () => {
    const arp = new RPG8Arpeggiator({ latch: false });
    arp.noteOn(60);
    arp.noteOff(60);
    expect(arp.isActive()).toBe(false);
  });
});

describe('MatrixSequencer', () => {
  it('has 4 patterns by default', () => {
    const matrix = new MatrixSequencer();
    expect(matrix.patterns.length).toBe(4);
  });

  it('steps through pattern', () => {
    const matrix = new MatrixSequencer();
    matrix.setGate(0, 0, true);
    matrix.setNote(0, 0, 8);
    
    const result = matrix.step();
    expect(result.gate).toBe(true);
    expect(result.midi).toBeGreaterThan(0);
  });

  it('generates psy pattern', () => {
    const matrix = new MatrixSequencer();
    matrix.generatePsyPattern(0, 42);
    
    const pattern = matrix.patterns[0];
    const activeSteps = pattern.gateLane.filter(Boolean).length;
    expect(activeSteps).toBeGreaterThan(4); // should have some activity
  });

  it('serializes and restores', () => {
    const matrix = new MatrixSequencer();
    matrix.setNote(0, 5, 10);
    const data = matrix.serialize();
    expect(data.patterns[0].noteLane[5]).toBe(10);
  });
});
