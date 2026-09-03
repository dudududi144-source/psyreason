// tests/unit/patch-graph.test.ts
import { describe, it, expect } from 'bun:test';
import { PatchingEngine, PORT_TEMPLATES, SpiderCVMerger, SpiderAudioSplitter } from '../../host/rack/patch-graph';

function makeTestDevice(id: string, type: string) {
  return {
    id,
    type,
    name: id.toUpperCase(),
    ports: PORT_TEMPLATES[type as 'synth' | 'effect'](id),
    position: { x: 0, y: 0 },
    flipped: false,
  };
}

describe('PatchingEngine', () => {
  it('adds and removes devices', () => {
    const engine = new PatchingEngine();
    engine.addDevice(makeTestDevice('synth1', 'synth'));
    expect(engine.serialize().devices.length).toBe(1);
    engine.removeDevice('synth1');
    expect(engine.serialize().devices.length).toBe(0);
  });

  it('connects audio output to audio input', () => {
    const engine = new PatchingEngine();
    engine.addDevice(makeTestDevice('synth1', 'synth'));
    engine.addDevice(makeTestDevice('fx1', 'effect'));

    const cable = engine.connect('synth1-audio-out-l', 'fx1-audio-in-l', 'audio');
    expect(cable).not.toBeNull();
    expect(cable?.type).toBe('audio');
  });

  it('rejects invalid connections (input to input)', () => {
    const engine = new PatchingEngine();
    engine.addDevice(makeTestDevice('synth1', 'synth'));
    engine.addDevice(makeTestDevice('fx1', 'effect'));

    const cable = engine.connect('fx1-audio-in-l', 'synth1-audio-out-l', 'audio');
    expect(cable).toBeNull();
  });

  it('rejects type mismatch (audio cable to CV port)', () => {
    const engine = new PatchingEngine();
    engine.addDevice(makeTestDevice('synth1', 'synth'));

    const cable = engine.connect('synth1-audio-out-l', 'synth1-cv-gate-in', 'audio');
    expect(cable).toBeNull();
  });

  it('one cable per input (replaces existing)', () => {
    const engine = new PatchingEngine();
    engine.addDevice(makeTestDevice('synth1', 'synth'));
    engine.addDevice(makeTestDevice('synth2', 'synth'));
    engine.addDevice(makeTestDevice('fx1', 'effect'));

    engine.connect('synth1-audio-out-l', 'fx1-audio-in-l', 'audio');
    engine.connect('synth2-audio-out-l', 'fx1-audio-in-l', 'audio');

    const cables = engine.serialize().cables;
    const toThatInput = cables.filter((c) => c.toPort === 'fx1-audio-in-l');
    expect(toThatInput.length).toBe(1);
    expect(toThatInput[0].fromPort).toBe('synth2-audio-out-l');
  });

  it('removing device removes its cables', () => {
    const engine = new PatchingEngine();
    engine.addDevice(makeTestDevice('synth1', 'synth'));
    engine.addDevice(makeTestDevice('fx1', 'effect'));

    engine.connect('synth1-audio-out-l', 'fx1-audio-in-l', 'audio');
    expect(engine.serialize().cables.length).toBe(1);

    engine.removeDevice('synth1');
    expect(engine.serialize().cables.length).toBe(0);
  });

  it('tracks signal chain', () => {
    const engine = new PatchingEngine();
    engine.addDevice(makeTestDevice('synth1', 'synth'));
    engine.addDevice(makeTestDevice('fx1', 'effect'));
    engine.addDevice(makeTestDevice('fx2', 'effect'));

    engine.connect('synth1-audio-out-l', 'fx1-audio-in-l', 'audio');
    engine.connect('fx1-audio-out-l', 'fx2-audio-in-l', 'audio');

    const chain = engine.getSignalChain('synth1');
    expect(chain).toEqual(['synth1', 'fx1', 'fx2']);
  });

  it('CV values propagate', () => {
    const engine = new PatchingEngine();
    engine.addDevice(makeTestDevice('lfo1', 'lfo'));
    engine.addDevice(makeTestDevice('synth1', 'synth'));

    engine.connect('lfo1-cv-out', 'synth1-cv-mod-in', 'cv');
    engine.setCV('lfo1-cv-out', 0.75);

    const sources = engine.getCVSources('synth1-cv-mod-in');
    expect(sources.length).toBe(1);
    expect(sources[0]).toBe(0.75);
  });
});

describe('Spider Utilities', () => {
  it('CV merger sums and clamps', () => {
    const merger = new SpiderCVMerger();
    expect(merger.process([0.3, 0.4])).toBeCloseTo(0.7);
    expect(merger.process([0.8, 0.8])).toBe(1); // clamped
    expect(merger.process([-0.8, -0.8])).toBe(-1); // clamped
  });

  it('audio splitter duplicates stereo', () => {
    const splitter = new SpiderAudioSplitter();
    const out = splitter.process(0.5, -0.3);
    expect(out).toEqual([0.5, -0.3, 0.5, -0.3]);
  });
});
