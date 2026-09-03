// PsyReason Engine v3 - full first-architecture build, everything wired
// devices/ code produces sound; cables/ patching really rewires the graph

import { renderThor, renderEuropa, renderMalstrom, renderKong, makeFxChain, mtof, FxChain } from './rack';
import { THOR_PSYTRANCE_PRESETS } from '../../../devices/thor/thor';

export interface PatternData {
  kick: boolean[]; bass: boolean[]; hat: boolean[]; openhat: boolean[];
  lead: (number | null)[]; pad: (number[] | null)[];
}
export function createDefaultPattern(): PatternData {
  const kick = Array(16).fill(false); for (let i = 0; i < 16; i += 4) kick[i] = true;
  const bass = Array(16).fill(false); for (let i = 0; i < 16; i++) if (i % 4 !== 0) bass[i] = true;
  const hat = Array(16).fill(false); for (let i = 2; i < 16; i += 4) hat[i] = true;
  const openhat = Array(16).fill(false); openhat[14] = true;
  const lead: (number | null)[] = Array(16).fill(null);
  lead[0] = 69; lead[3] = 70; lead[6] = 72; lead[8] = 69; lead[11] = 68; lead[14] = 65;
  const pad: (number[] | null)[] = Array(16).fill(null); pad[0] = [57, 60, 64];
  return { kick, bass, hat, openhat, lead, pad };
}

export type DeviceId = 'thor-bass' | 'thor-lead' | 'europa' | 'malstrom' | 'kong';
export type TargetId = 'master' | 'phaser' | 'delay' | 'reverb';
export interface Cable { id: string; from: DeviceId; to: TargetId; }

export const DEVICE_META: { id: DeviceId; name: string; type: string; color: string }[] = [
  { id: 'thor-bass', name: 'THOR', type: 'Bass Synth', color: '#ff2bd6' },
  { id: 'thor-lead', name: 'THOR', type: 'Lead Synth', color: '#ff2bd6' },
  { id: 'europa', name: 'EUROPA', type: 'Wavetable Pad', color: '#00ffcc' },
  { id: 'malstrom', name: 'MALSTROM', type: 'Graintable', color: '#ffaa00' },
  { id: 'kong', name: 'KONG', type: 'Drum Designer', color: '#ff8800' },
];

export class PsyAudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  comp: DynamicsCompressorNode | null = null;
  analyser: AnalyserNode | null = null;
  busFilter: BiquadFilterNode | null = null;
  fx: FxChain | null = null;
  fxProcs: Record<string, ScriptProcessorNode> = {};
  fxIn: Record<string, GainNode> = {};
  channels: Record<string, GainNode> = {};
  cables: Cable[] = [
    { id: 'c1', from: 'thor-bass', to: 'master' },
    { id: 'c2', from: 'thor-lead', to: 'master' },
    { id: 'c3', from: 'thor-lead', to: 'delay' },
    { id: 'c4', from: 'europa', to: 'reverb' },
    { id: 'c5', from: 'europa', to: 'master' },
    { id: 'c6', from: 'malstrom', to: 'phaser' },
    { id: 'c7', from: 'kong', to: 'master' },
    { id: 'c8', from: 'kong', to: 'reverb' },
  ];

  running = false; bpm = 145; step = 0; nextTime = 0; timer: number | null = null;
  pattern: PatternData = createDefaultPattern();
  onStep: ((s: number) => void) | null = null;
  private cache = new Map<string, AudioBuffer>();
  private leadPreset = 2; private bassPreset = 1;

  async init() {
    if (this.ctx) { await this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC();
    const ctx = this.ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0.85;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 5;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 512;
    this.master.connect(this.comp); this.comp.connect(this.analyser); this.analyser.connect(ctx.destination);
    this.busFilter = ctx.createBiquadFilter();
    this.busFilter.type = 'lowpass'; this.busFilter.frequency.value = 6000; this.busFilter.Q.value = 4;
    this.busFilter.connect(this.master);

    // real FX units from devices/effects, each in its own processor
    this.fx = makeFxChain(ctx.sampleRate);
    const units: (keyof FxChain)[] = ['phaser', 'delay', 'reverb'];
    for (const u of units) {
      const inp = ctx.createGain(); inp.gain.value = 1;
      const proc = ctx.createScriptProcessor(1024, 2, 2);
      const unit = (this.fx as any)[u];
      proc.onaudioprocess = (e) => {
        const iL = e.inputBuffer.getChannelData(0), iR = e.inputBuffer.getChannelData(1);
        const oL = e.outputBuffer.getChannelData(0), oR = e.outputBuffer.getChannelData(1);
        for (let i = 0; i < oL.length; i++) {
          const o = unit.process(iL[i], iR[i]);
          oL[i] = o[0]; oR[i] = o[1];
        }
      };
      inp.connect(proc); proc.connect(this.master);
      this.fxIn[u] = inp; this.fxProcs[u] = proc;
    }

    // device channel gains
    for (const d of DEVICE_META) {
      const g = ctx.createGain(); g.gain.value = 0.9;
      this.channels[d.id] = g;
    }
    this.applyCables();
  }

  // CABLE PATCHING - really rewires the graph
  applyCables() {
    if (!this.ctx) return;
    const dest: Record<TargetId, AudioNode> = {
      master: this.busFilter as AudioNode,
      phaser: this.fxIn.phaser, delay: this.fxIn.delay, reverb: this.fxIn.reverb,
    };
    for (const d of DEVICE_META) {
      const g = this.channels[d.id];
      g.disconnect();
      // drums go straight to master comp bus, synths through busFilter or fx
      const targets = new Set<TargetId>();
      for (const c of this.cables) if (c.from === d.id) targets.add(c.to);
      if (targets.size === 0) targets.add('master');
      for (const t of targets) {
        if (d.id === 'kong' && t === 'master') g.connect(this.master!);
        else g.connect(dest[t]);
      }
    }
  }
  connect(from: DeviceId, to: TargetId) {
    this.cables.push({ id: 'c' + Date.now() + Math.floor(Math.random() * 999), from, to });
    this.applyCables();
  }
  disconnect(id: string) { this.cables = this.cables.filter((c) => c.id !== id); this.applyCables(); }

  private toBuffer(key: string, render: () => Float32Array): AudioBuffer {
    const hit = this.cache.get(key); if (hit) return hit;
    const data = render();
    const buf = this.ctx!.createBuffer(1, data.length, this.ctx!.sampleRate);
    buf.getChannelData(0).set(data);
    this.cache.set(key, buf); return buf;
  }
  private play(buf: AudioBuffer, t: number, gain: number, chan: GainNode) {
    const src = this.ctx!.createBufferSource(); src.buffer = buf;
    const g = this.ctx!.createGain(); g.gain.value = gain;
    src.connect(g); g.connect(chan); src.start(t);
  }

  private kickBuf() { return this.toBuffer('k', () => renderKong(this.ctx!.sampleRate, 0)); }
  private hatBuf() { return this.toBuffer('h', () => renderKong(this.ctx!.sampleRate, 4)); }
  private openBuf() { return this.toBuffer('o', () => renderKong(this.ctx!.sampleRate, 5)); }
  private bassBuf() { return this.toBuffer('b' + this.bassPreset, () => renderThor(this.ctx!.sampleRate, 33, 0.24, 0.2, this.bassPreset)); }
  private leadBuf(m: number) { return this.toBuffer('l' + this.leadPreset + '-' + m, () => renderThor(this.ctx!.sampleRate, m, 0.5, 0.32, this.leadPreset)); }
  private padBuf(chord: number[]) {
    return this.toBuffer('p' + chord.join('.'), () => {
      const sr = this.ctx!.sampleRate; const n = Math.floor(sr * 1.6);
      const sum = new Float32Array(n);
      for (const m of chord) { const p = renderEuropa(sr, m, 1.6, 1.2); for (let i = 0; i < n; i++) sum[i] += p[i] * 0.5; }
      return sum;
    });
  }
  private malBuf(m: number) { return this.toBuffer('m' + m, () => renderMalstrom(this.ctx!.sampleRate, m, 0.8, 0.5)); }

  scheduleStep(s: number, t: number) {
    const p = this.pattern; const c = this.channels;
    if (p.kick[s]) this.play(this.kickBuf(), t, 1, c.kong);
    if (p.hat[s]) this.play(this.hatBuf(), t, 0.5, c.kong);
    if (p.openhat[s]) this.play(this.openBuf(), t, 0.45, c.kong);
    if (p.bass[s]) this.play(this.bassBuf(), t, 1, c['thor-bass']);
    if (p.lead[s] !== null) this.play(this.leadBuf(p.lead[s] as number), t, 0.9, c['thor-lead']);
    if (p.pad[s] !== null) this.play(this.padBuf(p.pad[s] as number[]), t, 0.6, c.europa);
  }

  scheduler = () => {
    const ctx = this.ctx!; const stepDur = 60 / this.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.scheduleStep(this.step, this.nextTime);
      const s = this.step;
      const ms = Math.max(0, (this.nextTime - ctx.currentTime) * 1000);
      window.setTimeout(() => { if (this.onStep) this.onStep(s); }, ms);
      this.step = (this.step + 1) % 16; this.nextTime += stepDur;
    }
  };

  async start() { await this.init(); if (this.running) return; this.running = true; this.step = 0; this.nextTime = this.ctx!.currentTime + 0.1; this.timer = window.setInterval(this.scheduler, 40); }
  stop() { this.running = false; if (this.timer !== null) { window.clearInterval(this.timer); this.timer = null; } if (this.onStep) this.onStep(-1); }

  async playNote(m: number) { await this.init(); this.play(this.leadBuf(m), this.ctx!.currentTime + 0.02, 0.9, this.channels['thor-lead']); }
  async testDevice(id: string) {
    await this.init(); const t = this.ctx!.currentTime + 0.05; const c = this.channels;
    if (id === 'thor-bass') { for (let i = 0; i < 4; i++) this.play(this.bassBuf(), t + i * 0.21, 1, c['thor-bass']); }
    if (id === 'thor-lead') { [69, 70, 72, 69].forEach((m, i) => this.play(this.leadBuf(m), t + i * 0.16, 0.9, c['thor-lead'])); }
    if (id === 'europa') this.play(this.padBuf([57, 60, 64]), t, 0.8, c.europa);
    if (id === 'malstrom') this.play(this.malBuf(69), t, 0.9, c.malstrom);
    if (id === 'kong') { this.play(this.kickBuf(), t, 1, c.kong); this.play(this.hatBuf(), t + 0.21, 0.6, c.kong); this.play(this.openBuf(), t + 0.42, 0.5, c.kong); }
  }

  // BROWSER - load real presets into engines
  loadPreset(kind: string, idx: number) {
    if (kind === 'lead') { this.leadPreset = idx; this.cache.clear(); }
    if (kind === 'bass') { this.bassPreset = idx; this.cache.clear(); }
    if (kind === 'fx' && this.fx) {
      if (idx === 0) { this.fx.delay.setParams({ time: 0.31, feedback: 0.42 }); this.fx.reverb.setParams({ roomSize: 0.7 }); }
      if (idx === 1) { this.fx.delay.setParams({ time: 0.21, feedback: 0.6 }); this.fx.reverb.setParams({ roomSize: 0.85 }); }
      if (idx === 2) { this.fx.phaser.setParams({ rate: 0.8, depth: 0.8 }); }
    }
  }
  presetNames(): string[] { return THOR_PSYTRANCE_PRESETS.map((p) => p.name); }

  getLevels() {
    if (!this.analyser) return { l: 0 };
    const arr = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(arr);
    let peak = 0;
    for (let i = 0; i < arr.length; i++) { const v = Math.abs(arr[i] - 128) / 128; if (v > peak) peak = v; }
    return { l: peak };
  }
  setBpm(v: number) { this.bpm = Math.max(60, Math.min(200, v)); }
  setCutoff(v: number) { if (this.busFilter) this.busFilter.frequency.value = v; }
  setResonance(v: number) { if (this.busFilter) this.busFilter.Q.value = v; }
  setDeviceLevel(id: DeviceId, v: number) { if (this.channels[id]) this.channels[id].gain.value = v; }
  setDelayTime(v: number) { if (this.fx) this.fx.delay.setParams({ time: v }); }
  setReverbSize(v: number) { if (this.fx) this.fx.reverb.setParams({ roomSize: v }); }
}

export const engine = new PsyAudioEngine();
