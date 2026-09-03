// tests/unit/thor.test.ts
import { describe, it, expect } from 'bun:test';
import { ThorSynth, ThorVoice, DEFAULT_THOR_PATCH, THOR_PSYTRANCE_PRESETS } from '../../devices/thor/thor';

describe('ThorSynth', () => {
  it('produces sound on noteOn', () => {
    const thor = new ThorSynth(44100, DEFAULT_THOR_PATCH);
    thor.noteOn(60, 1);
    const buffer = new Float32Array(4410);
    const activeNotes = new Map([[60, true]]);
    thor.process(buffer, activeNotes);

    let energy = 0;
    for (const sample of buffer) energy += sample * sample;
    expect(energy).toBeGreaterThan(0);
  });

  it('silent when no notes active', () => {
    const thor = new ThorSynth(44100, DEFAULT_THOR_PATCH);
    const buffer = new Float32Array(4410);
    thor.process(buffer, new Map());

    let energy = 0;
    for (const sample of buffer) energy += sample * sample;
    expect(energy).toBe(0);
  });

  it('all presets produce finite output', () => {
    for (const preset of THOR_PSYTRANCE_PRESETS) {
      const thor = new ThorSynth(44100, preset);
      thor.noteOn(45, 1);
      const buffer = new Float32Array(4410);
      thor.process(buffer, new Map([[45, true]]));

      for (const sample of buffer) {
        expect(Number.isFinite(sample)).toBe(true);
      }
    }
  });

  it('envelope releases after gate off', () => {
    const thor = new ThorSynth(44100, { ...DEFAULT_THOR_PATCH, ampEnv: { attack: 0.001, decay: 0.1, sustain: 0.5, release: 0.1, velocity: 0 } });

    // note on
    const buffer1 = new Float32Array(4410);
    thor.process(buffer1, new Map([[60, true]]));

    // gate off
    const buffer2 = new Float32Array(8820);
    thor.process(buffer2, new Map([[60, false]]));

    // energy at end should be near zero
    let endEnergy = 0;
    for (let i = 8000; i < 8820; i++) endEnergy += buffer2[i] * buffer2[i];
    expect(endEnergy).toBeLessThan(0.01);
  });

  it('poly mode handles multiple notes', () => {
    const thor = new ThorSynth(44100, DEFAULT_THOR_PATCH);
    const activeNotes = new Map([[48, true], [52, true], [55, true], [60, true]]);
    const buffer = new Float32Array(4410);
    thor.process(buffer, activeNotes);

    let energy = 0;
    for (const sample of buffer) {
      energy += sample * sample;
      expect(Number.isFinite(sample)).toBe(true);
    }
    expect(energy).toBeGreaterThan(0);
  });

  it('acid preset uses mono mode with high resonance', () => {
    const acid = THOR_PSYTRANCE_PRESETS.find((p) => p.name === 'Acid 303 Style');
    expect(acid).toBeDefined();
    expect(acid?.voiceMode).toBe('mono');
    expect(acid?.filters[0].resonance).toBeGreaterThan(0.7);
    expect(acid?.filters[0].envelopeAmount).toBeGreaterThan(0.5);
  });

  it('rolling bass preset is tuned for sub frequencies', () => {
    const bass = THOR_PSYTRANCE_PRESETS.find((p) => p.name === 'Rolling Bass 145');
    expect(bass).toBeDefined();
    expect(bass?.oscs[0].octave).toBeLessThanOrEqual(-2);
    expect(bass?.filters[0].frequency).toBeLessThan(1500);
  });

  it('patch loading works', () => {
    const thor = new ThorSynth(44100, DEFAULT_THOR_PATCH);
    thor.loadPatch(THOR_PSYTRANCE_PRESETS[0]);
    // Should not throw
    thor.noteOn(60, 1);
    const buffer = new Float32Array(100);
    thor.process(buffer, new Map([[60, true]]));
    expect(true).toBe(true);
  });
});

describe('ThorVoice', () => {
  it('renders all oscillator types without NaN', () => {
    const oscTypes = ['analog-saw', 'analog-square', 'analog-tri', 'wavetable', 'noise'];
    for (const type of oscTypes) {
      const patch = { ...DEFAULT_THOR_PATCH };
      patch.oscs[0] = { ...patch.oscs[0], type: type as 'analog-saw', enabled: true, level: 1 };
      const voice = new ThorVoice(44100, patch);
      for (let i = 0; i < 1000; i++) {
        const out = voice.process(440, true);
        expect(Number.isFinite(out)).toBe(true);
      }
    }
  });
});
