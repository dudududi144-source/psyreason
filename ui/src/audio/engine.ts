// PsyReason Engine v4 - coherent DAW engine built per the research doc
// lookahead scheduler (sample-accurate), channel mixer with meters,
// FX send buses (delay/reverb), real sidechain ducking, song arrangement.

export type TrackId = 'kick' | 'bass' | 'hats' | 'open' | 'lead' | 'pad';

export const TRACKS: { id: TrackId; name: string; color: string }[] = [
  { id: 'kick', name: 'KICK', color: '#ff4444' },
  { id: 'bass', name: 'BASS', color: '#00ff88' },
  { id: 'hats', name: 'HATS', color: '#ffcc00' },
  { id: 'open', name: 'OPEN', color: '#ff8800' },
  { id: 'lead', name: 'LEAD', color: '#00aaff' },
  { id: 'pad', name: 'PAD', color: '#aa66ff' },
];

export interface Section { name: string; bars: number; active: TrackId[]; }
export const ARRANGEMENT: Section[] = [
  { name: 'INTRO', bars: 4, active: ['kick', 'bass', 'hats'] },
  { name: 'BUILD', bars: 4, active: ['kick', 'bass', 'hats', 'open', 'lead'] },
  { name: 'DROP', bars: 8, active: ['kick', 'bass', 'hats', 'open', 'lead', 'pad'] },
  { name: 'BREAK', bars: 4, active: ['lead', 'pad'] },
  { name: 'DROP 2', bars: 8, active: ['kick', 'bass', 'hats', 'open', 'lead', 'pad'] },
];
export const TOTAL_BARS = ARRANGEMENT.reduce((a, s) => a + s.bars, 0);

export function sectionAtBarIn(arr: Section[], bar: number): { section: Section; index: number; startBar: number } {
  let b = 0;
  for (let i = 0; i < arr.length; i++) {
    if (bar < b + arr[i].bars) return { section: arr[i], index: i, startBar: b };
    b += arr[i].bars;
  }
  const last = arr.length - 1;
  return { section: arr[last], index: last, startBar: b };
}
export function sectionAtBar(bar: number): { section: Section; index: number; startBar: number } {
  return sectionAtBarIn(engine.arrangement, bar);
}

export interface SongData {
  kick: boolean[];
  bass: { on: boolean; semi: number }[];
  hats: boolean[];
  open: boolean[];
  lead: (number | null)[];
  padChord: number[];
}

export function defaultSong(): SongData {
  const kick = Array(16).fill(false); for (let i = 0; i < 16; i += 4) kick[i] = true;
  const bass = Array.from({ length: 16 }, (_, i) => ({ on: i % 4 !== 0, semi: 0 }));
  bass[7] = { on: true, semi: 1 }; bass[15] = { on: true, semi: 3 };
  const hats = Array(16).fill(false); for (let i = 2; i < 16; i += 4) hats[i] = true;
  const open = Array(16).fill(false); open[14] = true;
  const lead: (number | null)[] = Array(16).fill(null);
  lead[0] = 69; lead[3] = 70; lead[6] = 72; lead[8] = 69; lead[11] = 68; lead[14] = 65;
  return { kick, bass, hats, open, lead, padChord: [57, 60, 64] };
}

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

import { generateSong, generateTrack, generateArrangement } from './generator';

interface Channel {
  bus: GainNode; duck: GainNode; fader: GainNode; pan: StereoPannerNode; an: AnalyserNode;
  dSend: GainNode; rSend: GainNode;
  mute: boolean; solo: boolean; level: number;
}

export class Engine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  eqLow: BiquadFilterNode | null = null; eqMid: BiquadFilterNode | null = null; eqHigh: BiquadFilterNode | null = null;
  comp: DynamicsCompressorNode | null = null; limiter: DynamicsCompressorNode | null = null;
  masterAn: AnalyserNode | null = null;
  delayIn: GainNode | null = null; reverbIn: GainNode | null = null;
  channels = {} as Record<TrackId, Channel>;
  song: SongData = defaultSong();
  bpm = 145;
  running = false;
  private step16 = 0; private nextTime = 0; private timer: number | null = null;
  onTick: ((bar: number, step: number, sectionIndex: number) => void) | null = null;

  params: Record<TrackId, any> = {
    kick: { decay: 0.28, punch: 0.5 },
    bass: { cutoff: 900, res: 6, drive: 0.4, decay: 0.18, sidechain: 1 },
    hats: { tone: 7500 },
    open: { tone: 6500 },
    lead: { cutoff: 4200, res: 5, decay: 0.3, dSend: 0.35, rSend: 0.2 },
    pad: { cutoff: 1200, rSend: 0.5, dSend: 0 },
  };

  arrangement: Section[] = ARRANGEMENT.map((s) => ({ ...s, active: [...s.active] }));
  seed = 1337;

  generate(seed?: number) {
    this.seed = seed !== undefined ? seed : Math.floor(Math.random() * 1e9);
    this.song = generateSong(this.seed);
    this.arrangement = generateArrangement(this.seed);
  }
  regenTrack(id: TrackId) {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    this.song = generateTrack(id, this.seed + (id.length * 7919), this.song);
  }
  totalBars(): number { return this.arrangement.reduce((a, s) => a + s.bars, 0); }

  async init() {
    if (this.ctx) { await this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC(); this.ctx = ctx;

    // master chain: gain -> EQ(3) -> compressor -> limiter -> analyser -> out
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    this.eqLow = ctx.createBiquadFilter(); this.eqLow.type = 'lowshelf'; this.eqLow.frequency.value = 120; this.eqLow.gain.value = 2;
    this.eqMid = ctx.createBiquadFilter(); this.eqMid.type = 'peaking'; this.eqMid.frequency.value = 1800; this.eqMid.gain.value = 1; this.eqMid.Q.value = 0.8;
    this.eqHigh = ctx.createBiquadFilter(); this.eqHigh.type = 'highshelf'; this.eqHigh.frequency.value = 9000; this.eqHigh.gain.value = 1.5;
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 3; this.comp.attack.value = 0.01; this.comp.release.value = 0.2;
    this.limiter = ctx.createDynamicsCompressor(); this.limiter.threshold.value = -3; this.limiter.ratio.value = 20; this.limiter.attack.value = 0.002; this.limiter.release.value = 0.1;
    this.masterAn = ctx.createAnalyser(); this.masterAn.fftSize = 512;
    this.master.connect(this.eqLow); this.eqLow.connect(this.eqMid); this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.comp); this.comp.connect(this.limiter); this.limiter.connect(this.masterAn); this.masterAn.connect(ctx.destination);

    // FX buses
    const dIn = ctx.createGain(); const dNode = ctx.createDelay(2); dNode.delayTime.value = (60 / this.bpm) * 0.75;
    const dFb = ctx.createGain(); dFb.gain.value = 0.4; const dLp = ctx.createBiquadFilter(); dLp.type = 'lowpass'; dLp.frequency.value = 3200;
    dIn.connect(dNode); dNode.connect(dLp); dLp.connect(dFb); dFb.connect(dNode); dLp.connect(this.master);
    this.delayIn = dIn;
    const rIn = ctx.createGain(); const conv = ctx.createConvolver(); conv.buffer = this.makeImpulse(2.2, 2.6);
    rIn.connect(conv); conv.connect(this.master); this.reverbIn = rIn;

    // channels
    for (const t of TRACKS) {
      const bus = ctx.createGain();
      const duck = ctx.createGain();
      const fader = ctx.createGain(); fader.gain.value = 0.9;
      const pan = ctx.createStereoPanner();
      const an = ctx.createAnalyser(); an.fftSize = 256;
      const dSend = ctx.createGain(); dSend.gain.value = 0;
      const rSend = ctx.createGain(); rSend.gain.value = 0;
      bus.connect(duck); duck.connect(fader); fader.connect(pan); pan.connect(an); an.connect(this.master);
      bus.connect(dSend); dSend.connect(dIn);
      bus.connect(rSend); rSend.connect(rIn);
      this.channels[t.id] = { bus, duck, fader, pan, an, dSend, rSend, mute: false, solo: false, level: 0.9 };
    }
    // default sends
    this.channels.lead.dSend.gain.value = this.params.lead.dSend;
    this.channels.lead.rSend.gain.value = this.params.lead.rSend;
    this.channels.pad.rSend.gain.value = this.params.pad.rSend;
    this.channels.open.rSend.gain.value = 0.15;
  }

  makeImpulse(sec: number, decay: number): AudioBuffer {
    const ctx = this.ctx!; const rate = ctx.sampleRate; const len = Math.floor(rate * sec);
    const buf = ctx.createBuffer(2, len, rate); let seed = 987654321;
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = ((seed / 4294967296) * 2 - 1) * Math.pow(1 - i / len, decay); } }
    return buf;
  }
  noiseBuf(): AudioBuffer {
    const ctx = this.ctx!; const len = ctx.sampleRate; const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0); let seed = 1234567;
    for (let i = 0; i < len; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = (seed / 4294967296) * 2 - 1; }
    return buf;
  }
  private _noise: AudioBuffer | null = null;
  noise(): AudioBuffer { if (!this._noise) this._noise = this.noiseBuf(); return this._noise; }

  // ---------- voices ----------
  vKick(t: number) {
    const ctx = this.ctx!; const p = this.params.kick; const out = this.channels.kick.bus;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.09);
    const g = ctx.createGain(); g.gain.setValueAtTime(1.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + p.decay);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + p.decay + 0.05);
    const n = ctx.createBufferSource(); n.buffer = this.noise();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.3 * p.punch, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    n.connect(hp); hp.connect(ng); ng.connect(out); n.start(t); n.stop(t + 0.03);
    // REAL sidechain: duck the bass on every kick
    if (this.params.bass.sidechain > 0) {
      const dg = this.channels.bass.duck.gain;
      dg.cancelScheduledValues(t);
      dg.setValueAtTime(1 - 0.8 * this.params.bass.sidechain, t);
      dg.setTargetAtTime(1, t + 0.03, 0.1);
    }
  }
  vBass(t: number, semi: number, dur: number) {
    const ctx = this.ctx!; const p = this.params.bass; const out = this.channels.bass.bus;
    const f = mtof(33 + semi);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const sub = ctx.createOscillator(); sub.type = 'square'; sub.frequency.value = f / 2;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = p.res;
    lp.frequency.setValueAtTime(p.cutoff * 2.2, t); lp.frequency.exponentialRampToValueAtTime(Math.max(80, p.cutoff * 0.5), t + dur);
    const dr = ctx.createWaveShaper(); dr.curve = this.driveCurve(p.drive);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.005);
    g.gain.setValueAtTime(0.5, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.0001, t); sg.gain.linearRampToValueAtTime(0.35, t + 0.005); sg.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(lp); lp.connect(dr); dr.connect(g); sub.connect(sg);
    g.connect(out); sg.connect(out);
    o.start(t); o.stop(t + dur + 0.05); sub.start(t); sub.stop(t + dur + 0.05);
  }
  driveCurve(amount: number): Float32Array {
    const n = 256; const curve = new Float32Array(n); const k = 1 + amount * 8;
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * k) / Math.tanh(k); }
    return curve;
  }
  vHat(t: number, open: boolean) {
    const ctx = this.ctx!; const p = open ? this.params.open : this.params.hats;
    const out = open ? this.channels.open.bus : this.channels.hats.bus;
    const n = ctx.createBufferSource(); n.buffer = this.noise();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = p.tone;
    const g = ctx.createGain(); const dur = open ? 0.28 : 0.05;
    g.gain.setValueAtTime(open ? 0.35 : 0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(hp); hp.connect(g); g.connect(out); n.start(t); n.stop(t + dur + 0.05);
  }
  vLead(t: number, midi: number, dur: number) {
    const ctx = this.ctx!; const p = this.params.lead; const out = this.channels.lead.bus;
    const f = mtof(midi);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = p.res;
    lp.frequency.setValueAtTime(p.cutoff * 1.6, t); lp.frequency.exponentialRampToValueAtTime(Math.max(200, p.cutoff * 0.35), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    for (const det of [-8, 8]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
    }
    lp.connect(g); g.connect(out);
  }
  vPad(t: number, chord: number[], dur: number) {
    const ctx = this.ctx!; const p = this.params.pad; const out = this.channels.pad.bus;
    for (const m of chord) for (const det of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = p.cutoff; lp.Q.value = 0.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.5);
      g.gain.setValueAtTime(0.045, t + Math.max(0.6, dur - 0.6)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.1);
    }
  }

  // ---------- scheduler (lookahead, sample-accurate start times) ----------
  private tick = () => {
    const ctx = this.ctx!; const stepDur = 60 / this.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.schedule(this.step16, this.nextTime);
      const g = this.step16; const ms = Math.max(0, (this.nextTime - ctx.currentTime) * 1000);
      window.setTimeout(() => { if (this.onTick) this.onTick(Math.floor(g / 16) % this.totalBars(), g % 16, sectionAtBarIn(this.arrangement, Math.floor(g / 16) % this.totalBars()).index); }, ms);
      this.step16++; this.nextTime += stepDur;
    }
  };
  private schedule(g: number, t: number) {
    const bar = Math.floor(g / 16) % this.totalBars(); const step = g % 16;
    const { section } = sectionAtBar(bar);
    const on = (id: TrackId) => section.active.includes(id);
    const s = this.song; const stepDur = 60 / this.bpm / 4;
    if (on('kick') && s.kick[step]) this.vKick(t);
    if (on('bass') && s.bass[step].on) this.vBass(t, s.bass[step].semi, stepDur * 0.92);
    if (on('hats') && s.hats[step]) this.vHat(t, false);
    if (on('open') && s.open[step]) this.vHat(t, true);
    if (on('lead') && s.lead[step] !== null) this.vLead(t, s.lead[step] as number, stepDur * 3);
    if (on('pad') && step === 0) this.vPad(t, s.padChord, stepDur * 16 * section.bars > 6 ? 6.5 : stepDur * 16 * 4);
  }

  async start() {
    await this.init(); if (this.running) return;
    this.running = true; this.step16 = 0; this.nextTime = this.ctx!.currentTime + 0.1;
    this.timer = window.setInterval(this.tick, 25);
  }
  stop() { this.running = false; if (this.timer !== null) { window.clearInterval(this.timer); this.timer = null; } if (this.onTick) this.onTick(-1, -1, -1); }

  // ---------- mixer ----------
  setFader(id: TrackId, v: number) { const c = this.channels[id]; if (!c) return; c.level = v; this.applyMix(); }
  setMute(id: TrackId, m: boolean) { const c = this.channels[id]; if (!c) return; c.mute = m; this.applyMix(); }
  setSolo(id: TrackId, s: boolean) { const c = this.channels[id]; if (!c) return; c.solo = s; this.applyMix(); }
  setPan(id: TrackId, v: number) { const c = this.channels[id]; if (c) c.pan.pan.value = v; }
  setSend(id: TrackId, kind: 'd' | 'r', v: number) { const c = this.channels[id]; if (!c) return; if (kind === 'd') c.dSend.gain.value = v; else c.rSend.gain.value = v; }
  private applyMix() {
    const anySolo = TRACKS.some((t) => this.channels[t.id] && this.channels[t.id].solo);
    for (const t of TRACKS) { const c = this.channels[t.id]; if (!c) continue;
      const audible = !c.mute && (!anySolo || c.solo);
      c.fader.gain.value = audible ? c.level : 0; }
  }
  setParam(id: TrackId, key: string, v: number) { (this.params[id] as any)[key] = v;
    if (id === 'lead' && key === 'dSend') this.setSend('lead', 'd', v);
    if (id === 'lead' && key === 'rSend') this.setSend('lead', 'r', v);
    if (id === 'pad' && key === 'rSend') this.setSend('pad', 'r', v);
  }
  setBpm(v: number) { this.bpm = Math.max(90, Math.min(200, v)); if (this.delayIn && this.ctx) { /* delay time lives on node created in init; find via graph not stored; keep simple */ } }

  level(id: TrackId | 'master'): number {
    const an = id === 'master' ? this.masterAn : this.channels[id] ? this.channels[id].an : null;
    if (!an) return 0;
    const arr = new Uint8Array(an.frequencyBinCount); an.getByteTimeDomainData(arr);
    let peak = 0; for (let i = 0; i < arr.length; i++) { const v = Math.abs(arr[i] - 128) / 128; if (v > peak) peak = v; }
    return peak;
  }
  async preview(id: TrackId) {
    await this.init(); const t = this.ctx!.currentTime + 0.05;
    if (id === 'kick') { this.vKick(t); this.vKick(t + 0.42); }
    if (id === 'bass') { for (let i = 0; i < 4; i++) this.vBass(t + i * 0.21, i === 3 ? 3 : 0, 0.19); }
    if (id === 'hats') { this.vHat(t, false); this.vHat(t + 0.21, false); }
    if (id === 'open') this.vHat(t, true);
    if (id === 'lead') { [69, 70, 72, 69].forEach((m, i) => this.vLead(t + i * 0.16, m, 0.4)); }
    if (id === 'pad') this.vPad(t, this.song.padChord, 2.5);
  }
}

export const engine = new Engine();
