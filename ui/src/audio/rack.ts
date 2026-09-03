// ui/src/audio/rack.ts - THE BRIDGE between the architecture and the product
// Imports the REAL device engines from devices/ and renders them to audio buffers

import { ThorVoice, THOR_PSYTRANCE_PRESETS, DEFAULT_THOR_PATCH } from '../../../devices/thor/thor';
import { MalstromVoice, DEFAULT_MALSTROM_PATCH } from '../../../devices/malstrom/malstrom';
import { EuropaVoice, DEFAULT_EUROPA_PATCH } from '../../../devices/europa/europa';
import { KongDrumSynth } from '../../../devices/kong/kong';
import { Phaser } from '../../../devices/effects/phaser';
import { DigitalDelay } from '../../../devices/effects/delay';
import { StereoReverb } from '../../../devices/effects/reverb';

export function mtof(m: number): number { return 440 * Math.pow(2, (m - 69) / 12); }

// Render any per-sample voice to a Float32Array
function renderVoice(voice: { process(f: number, g: boolean): number }, freq: number, sr: number, dur: number, gate: number): Float32Array {
  const n = Math.floor(sr * dur);
  const off = Math.floor(sr * gate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = voice.process(freq, i < off);
  return out;
}

// THOR - modular synth (used for BASS and LEAD)
export function renderThor(sr: number, midi: number, dur: number, gate: number, presetIdx: number): Float32Array {
  const preset = THOR_PSYTRANCE_PRESETS[presetIdx] || DEFAULT_THOR_PATCH;
  const v = new ThorVoice(sr, preset);
  return renderVoice(v, mtof(midi), sr, dur, gate);
}

// EUROPA - wavetable synth (used for PAD)
export function renderEuropa(sr: number, midi: number, dur: number, gate: number): Float32Array {
  const v = new EuropaVoice(sr, DEFAULT_EUROPA_PATCH);
  return renderVoice(v, mtof(midi), sr, dur, gate);
}

// MALSTROM - graintable synth (alt pad / textures)
export function renderMalstrom(sr: number, midi: number, dur: number, gate: number): Float32Array {
  const v = new MalstromVoice(sr, DEFAULT_MALSTROM_PATCH);
  return renderVoice(v, mtof(midi), sr, dur, gate);
}

// KONG - drum designer (used for KICK / HAT / OPEN)
export function renderKong(sr: number, padId: number): Float32Array {
  const k = new KongDrumSynth(sr);
  const buf = k.triggerPad(padId, 1);
  // trim to 1.2s max
  return buf.length > sr * 1.2 ? buf.slice(0, Math.floor(sr * 1.2)) : buf;
}

// REAL effects chain from devices/effects - runs live per-sample
export function makeFxChain(sr: number) {
  return {
    phaser: new Phaser(sr, { rate: 0.35, depth: 0.55, stages: 4, wetLevel: 0.5, dryLevel: 0.5, feedback: 0.3 }),
    delay: new DigitalDelay(sr, { sync: false, time: 0.31, feedback: 0.42, wetLevel: 1, dryLevel: 0, pingPong: false }),
    reverb: new StereoReverb(sr, { roomSize: 0.72, wetLevel: 1, dryLevel: 0, damping: 0.5 }),
  };
}
export type FxChain = ReturnType<typeof makeFxChain>;
