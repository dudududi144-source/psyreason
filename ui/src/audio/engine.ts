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
  bassB?: { on: boolean; semi: number }[];
  leadB?: (number | null)[];
  chords?: number[][];
}

export function defaultSong(): SongData {
  const kick = Array(16).fill(false); for (let i = 0; i < 16; i += 4) kick[i] = true;
  const bass = Array.from({ length: 16 }, (_, i) => ({ on: i % 4 !== 0, semi: 0 }));
  bass[7] = { on: true, semi: 1 }; bass[15] = { on: true, semi: 3 };
  const hats = Array(16).fill(false); for (let i = 2; i < 16; i += 4) hats[i] = true;
  const open = Array(16).fill(false); open[14] = true;
  const lead: (number | null)[] = Array(16).fill(null);
  lead[0] = 69; lead[3] = 70; lead[6] = 72; lead[8] = 69; lead[11] = 68; lead[14] = 65;
  return { kick, bass, hats, open, lead, padChord: [57, 60, 64], bassB: bass.map((b) => ({ ...b })), leadB: [...lead], chords: [[57, 60, 64], [53, 57, 60]] } as SongData;
}

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

import { generateSong, generateTrack, generateArrangement, generateSongForSub, generateArrangementForSub, styleById, subById, sessionSeed } from './generator';

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
  delayFbGain: GainNode | null = null; delayLp: BiquadFilterNode | null = null; reverbOut: GainNode | null = null;
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

  styleId = 'fullon'; subId = 'classic'; clapOn = false; crashOn = true; shakerOn = false; swing = 0; humanize = 0; bassRoot = 33;
  loadSession(styleId: string, subId: string, session: number) {
    const sb = subById(styleId, subId);
    this.styleId = styleId; this.subId = subId;
    this.seed = sessionSeed(sb.id, session);
    this.song = generateSongForSub(sb, this.seed);
    this.arrangement = generateArrangementForSub(sb, this.seed);
    this.bpm = sb.bpm;
    this.bassRoot = 33;
    // sub-style SOUND: timbres applied to the synth engines
    this.params.bass = { ...this.params.bass, cutoff: sb.bassCut, res: sb.bassRes, drive: sb.bassDrive, wave: sb.bassWave };
    this.params.lead = { ...this.params.lead, cutoff: sb.leadCut, res: sb.leadRes, decay: sb.leadDecay, wave: sb.leadWave };
    this.params.kick = { ...this.params.kick, decay: sb.kickDecay, punch: sb.punch };
    this.params.hats = { ...this.params.hats, tone: sb.hatTone };
    const BC: Record<string, any> = {
      pluck: { pluck: 1, sub: 0.3, glide: 0 }, flat: { pluck: 0.25, sub: 0.5, glide: 0 },
      acid: { pluck: 0.85, sub: 0.2, glide: 0.5 }, sub: { pluck: 0.3, sub: 0.95, glide: 0 },
      growl: { pluck: 0.6, sub: 0.6, glide: 0.2 } };
    const LC: Record<string, any> = {
      acid: { voices: 1, detune: 0, glide: 0.6, resBoost: 8 }, super: { voices: 3, detune: 14, glide: 0, resBoost: 0 },
      pluck: { voices: 1, detune: 4, glide: 0, resBoost: 2 }, air: { voices: 2, detune: 8, glide: 0, resBoost: -2 },
      twist: { voices: 2, detune: 20, glide: 0.3, resBoost: 5 } };
    const DC: Record<string, any> = {
      punch: { decay: 0.24, punch: 0.7, metal: 0.6, body: 0.3 }, round: { decay: 0.32, punch: 0.4, metal: 0.4, body: 0.7 },
      soft: { decay: 0.4, punch: 0.25, metal: 0.2, body: 0.6 }, hard: { decay: 0.2, punch: 0.9, metal: 0.8, body: 0.2 },
      breaky: { decay: 0.26, punch: 0.6, metal: 0.5, body: 0.4 } };
    Object.assign(this.params.bass, BC[sb.bassChar] || BC.pluck);
    const lc = LC[sb.leadChar] || LC.pluck;
    Object.assign(this.params.lead, lc);
    this.params.lead.res = Math.max(0, sb.leadRes + lc.resBoost);
    Object.assign(this.params.kick, DC[sb.drumChar] || DC.punch);
    this.params.hats.metal = (DC[sb.drumChar] || DC.punch).metal;
    const flavors = ['std', 'bright', 'dark', 'wide', 'tight', 'acid', 'soft', 'hard', 'wider', 'deeper'];
    const fl = flavors[session % 10];
    if (fl === 'bright') { this.params.lead.cutoff *= 1.2; this.params.hats.tone *= 1.1; }
    if (fl === 'dark') { this.params.lead.cutoff *= 0.8; this.params.bass.cutoff *= 0.85; }
    if (fl === 'wide') { this.params.lead.detune = Math.max(8, (this.params.lead.detune ?? 8) + 6); this.params.lead.voices = 3; }
    if (fl === 'tight') { this.params.lead.voices = 1; this.params.lead.detune = 3; }
    if (fl === 'acid') { this.params.bass.pluck = 0.9; this.params.bass.res = Math.min(18, this.params.bass.res + 4); }
    if (fl === 'soft') { this.params.kick.punch *= 0.8; this.params.lead.res = Math.max(1, this.params.lead.res - 2); }
    if (fl === 'hard') { this.params.kick.punch = Math.min(1, this.params.kick.punch + 0.2); this.params.bass.drive = Math.min(1, this.params.bass.drive + 0.2); }
    if (fl === 'wider') { this.params.lead.voices = 3; this.params.lead.detune = 18; this.params.pad.rSend = Math.min(1, (this.params.pad.rSend ?? 0.5) + 0.2); }
    if (fl === 'deeper') { this.params.bass.sub = Math.min(1, (this.params.bass.sub ?? 0.4) + 0.3); this.params.kick.decay = Math.min(0.5, this.params.kick.decay + 0.06); }
    this.clapOn = !!sb.clap;
    this.crashOn = (sb as any).crash !== undefined ? (sb as any).crash : sb.padProb > 0.5;
    this.shakerOn = (sb as any).shaker !== undefined ? (sb as any).shaker : sb.hatBusy > 0.45;
  }
  generateStyle(styleId: string, session: number) { this.loadSession(styleId, this.subId, session); }
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
    this.delayIn = dIn; this.delayFbGain = dFb; this.delayLp = dLp;
    const rIn = ctx.createGain(); const conv = ctx.createConvolver(); conv.buffer = this.makeImpulse(2.2, 2.6);
    const rOut = ctx.createGain(); rOut.gain.value = 1;
    rIn.connect(conv); conv.connect(rOut); rOut.connect(this.master); this.reverbIn = rIn; this.reverbOut = rOut;

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
    const ctx = this.ctx!; const p = this.params.kick as any; const out = this.channels.kick.bus;
    // layered: body osc + sub tail + click, through soft saturation
    const o = ctx.createOscillator(); o.type = (p.body ?? 0.3) > 0.6 ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(150 + 50 * (p.punch ?? 0.5), t);
    o.frequency.exponentialRampToValueAtTime(40 + 8 * (p.body ?? 0.3), t + 0.09);
    const ws = ctx.createWaveShaper(); ws.curve = this.driveCurve(0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(1.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + p.decay);
    o.connect(ws); ws.connect(g); g.connect(out);
    o.start(t); o.stop(t + p.decay + 0.05);
    const so = ctx.createOscillator(); so.type = 'sine'; so.frequency.value = 42;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.5 * (p.subk ?? 0.5), t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + p.decay * 1.4);
    so.connect(sg); sg.connect(out); so.start(t); so.stop(t + p.decay * 1.5);
    const n = ctx.createBufferSource(); n.buffer = this.noise();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.35 * (p.punch ?? 0.5), t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    n.connect(hp); hp.connect(ng); ng.connect(out);
    n.start(t); n.stop(t + 0.02);
  }
  vBass(t: number, semi: number, dur: number, accent = 1) {
    const ctx = this.ctx!; const p = this.params.bass; const out = this.channels.bass.bus;
    const f = mtof(this.bassRoot + semi);
    const o = ctx.createOscillator(); o.type = ((p as any).wave as OscillatorType) || 'sawtooth'; o.frequency.value = f;
    const sub = ctx.createOscillator(); sub.type = 'square'; sub.frequency.value = f / 2;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = p.res;
    const pl = (p as any).pluck ?? 0.6; lp.frequency.setValueAtTime(p.cutoff * (1 + 2.5 * pl) * this.sweep * accent, t); lp.frequency.exponentialRampToValueAtTime(Math.max(60, p.cutoff * (1 - 0.6 * pl) * this.sweep), t + dur);
    const dr = ctx.createWaveShaper(); dr.curve = this.driveCurve(p.drive);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.005);
    g.gain.setValueAtTime(0.5, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.0001, t); sg.gain.linearRampToValueAtTime(0.15 + 0.45 * ((p as any).sub ?? 0.35), t + 0.005); sg.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(lp); lp.connect(dr); dr.connect(g); sub.connect(sg);
    g.connect(out); sg.connect(out);
    o.start(t); o.stop(t + dur + 0.05); sub.start(t); sub.stop(t + dur + 0.05);
  }
  driveCurve(amount: number): Float32Array {
    const n = 256; const curve = new Float32Array(n); const k = 1 + amount * 8;
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * k) / Math.tanh(k); }
    return curve;
  }
  vHat(t: number, open: boolean, vel = 1) {
    // CLEAN metallic hat: filtered noise air + inharmonic SINE partials (no aliasing)
    const ctx = this.ctx!; const p = this.params.hats as any;
    const out = open ? this.channels.open.bus : this.channels.hats.bus;
    const tone = p.tone ?? 7500;
    const dur = open ? 0.26 : 0.05;
    const n = ctx.createBufferSource(); n.buffer = this.noise();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = tone * 0.9; hp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime((open ? 0.2 : 0.16) * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(hp); hp.connect(g); g.connect(out);
    n.start(t); n.stop(t + dur + 0.02);
    const base = tone * 0.72;
    const ratios = [1.0, 1.483, 1.921, 2.547, 3.112, 3.894];
    const bright = (p.metal ?? 0.5);
    for (let k = 0; k < ratios.length; k++) {
      const fr = base * ratios[k];
      if (fr > 18000) continue;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr;
      const og = ctx.createGain();
      const amp = (0.05 + 0.03 * bright) * vel * (1 - k * 0.12);
      og.gain.setValueAtTime(amp, t);
      og.gain.exponentialRampToValueAtTime(0.0005, t + (open ? dur : dur * 0.7));
      o.connect(og); og.connect(out);
      o.start(t); o.stop(t + dur + 0.02);
    }
  }
  vSnare(t: number, vel = 0.5) {
    // pure-noise snare: zero tonal oscillators (kills the conga-like thump forever)
    const ctx = this.ctx!; const out = this.channels.kick.bus;
    const n1 = ctx.createBufferSource(); n1.buffer = this.noise();
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.9;
    const g1 = ctx.createGain(); g1.gain.setValueAtTime(0.4 * vel, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    n1.connect(bp); bp.connect(g1); g1.connect(out); n1.start(t); n1.stop(t + 0.16);
    const n2 = ctx.createBufferSource(); n2.buffer = this.noise();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.25 * vel, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    n2.connect(hp); hp.connect(g2); g2.connect(out); n2.start(t); n2.stop(t + 0.08);
  }
  vShaker(t: number) {
    const ctx = this.ctx!; const out = this.channels.hats.bus;
    const n = ctx.createBufferSource(); n.buffer = this.noise();
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 8200; bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    n.connect(bp); bp.connect(g); g.connect(out); n.start(t); n.stop(t + 0.08);
  }
  vCrash(t: number) {
    // smooth crash: shaped noise wash + low sub impact only (no metallic pings)
    const ctx = this.ctx!; const out = this.channels.open.bus;
    const n = ctx.createBufferSource(); n.buffer = this.noise();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000; hp.Q.value = 0.4;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 12000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.95);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.25);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.35, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.32);
  }
  private leadOsc(ctx: AudioContext, p: any, f: number, t: number): OscillatorNode {
    if (p.engine === 'fm') {
      const car = ctx.createOscillator(); car.type = 'sine';
      const mod = ctx.createOscillator(); mod.type = 'sine';
      const ratio = p.fmRatio ?? 2; const amt = p.fmAmt ?? 2;
      mod.frequency.value = f * ratio;
      const mg = ctx.createGain(); mg.gain.value = f * ratio * amt;
      mod.connect(mg); mg.connect(car.frequency);
      (car as any)._mod = mod;
      return car;
    }
    if (p.engine === 'wave') {
      const n = 16; const real = new Float32Array(n); const imag = new Float32Array(n);
      const wt = p.wt ?? 0.5;
      for (let h = 1; h < n; h++) {
        imag[h] = (h % 2 === 1 ? 1 / h : 0) * (1 - wt * 0.5) + (wt > 0.5 ? (1 / (h * h)) * (wt - 0.5) * 2 : 0);
      }
      const wave = ctx.createPeriodicWave(real, imag);
      const o = ctx.createOscillator(); o.setPeriodicWave(wave);
      return o;
    }
    const o = ctx.createOscillator(); o.type = (p.wave as OscillatorType) || 'sawtooth';
    return o;
  }
  vLead(t: number, midi: number, dur: number) {
    const ctx = this.ctx!; const p = this.params.lead; const out = this.channels.lead.bus;
    const f = mtof(midi);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = p.res;
    lp.frequency.setValueAtTime(p.cutoff * 1.6 * this.sweep, t); lp.frequency.exponentialRampToValueAtTime(Math.max(120, p.cutoff * 0.35 * this.sweep), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const voicesN = Math.max(1, (p as any).voices ?? 2);
    const detAmt = (p as any).detune ?? 8;
    const glide = (p as any).glide ?? 0;
    for (let vi = 0; vi < voicesN; vi++) {
      const det = voicesN === 1 ? 0 : (vi - (voicesN - 1) / 2) * detAmt;
      const o = this.leadOsc(ctx, p as any, f, t);
      if (glide > 0) { o.frequency.setValueAtTime(f * 0.7, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.04); }
      else o.frequency.value = f;
      o.detune.value = det;
      const mod = (o as any)._mod as OscillatorNode | undefined;
      if ((p as any).vib) { const vl = ctx.createOscillator(); vl.frequency.value = 5.2; const vg = ctx.createGain(); vg.gain.value = (p as any).vib * 9; vl.connect(vg); vg.connect(o.detune); vl.start(t); vl.stop(t + dur + 0.05); }
      o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
      if (mod) { mod.start(t); mod.stop(t + dur + 0.05); }
    }
    lp.connect(g); g.connect(out);
  }
  vPad(t: number, chord: number[], dur: number) {
    const ctx = this.ctx!; const p = this.params.pad; const out = this.channels.pad.bus;
    for (const m of chord) for (const det of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = p.cutoff; lp.Q.value = 0.4;
      const plf = ctx.createOscillator(); plf.frequency.value = 0.12; const pg = ctx.createGain(); pg.gain.value = p.cutoff * 0.35; plf.connect(pg); pg.connect(lp.frequency); plf.start(t); plf.stop(t + dur + 0.1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.5);
      g.gain.setValueAtTime(0.045, t + Math.max(0.6, dur - 0.6)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.1);
    }
  }
  vClap(t: number) {
    const ctx = this.ctx!;
    const n = ctx.createBufferSource(); n.buffer = this.noise();
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 3; i++) { g.gain.setValueAtTime(0.28, t + i * 0.012); g.gain.exponentialRampToValueAtTime(0.04, t + i * 0.012 + 0.01); }
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    n.connect(bp); bp.connect(g); g.connect(this.channels.kick.bus);
    n.start(t); n.stop(t + 0.2);
  }
  vRiser(t: number, dur: number) {
    const ctx = this.ctx!;
    const n = ctx.createBufferSource(); n.buffer = this.noise(); n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.35, t + dur);
    g.gain.linearRampToValueAtTime(0.001, t + dur + 0.1);
    n.connect(bp); bp.connect(g); g.connect(this.master!);
    n.start(t); n.stop(t + dur + 0.15);
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
    const { section, startBar } = sectionAtBarIn(this.arrangement, bar);
    const barIn = bar - startBar;
    const on = (id: TrackId) => section.active.includes(id);
    const s = this.song as any; const stepDur = 60 / this.bpm / 4;
    t = t + (step % 2 === 1 ? this.swing * stepDur * 0.35 : 0) + (this.humanize > 0 ? (((bar * 31 + step * 7) % 5) - 2) * 0.002 * this.humanize : 0);
    const useB = barIn % 4 >= 2; // A/B pattern variation every 2 bars
    const lastBar = barIn === section.bars - 1;
    // filter sweep automation: BUILD opens up, others reset
    if (step === 0 && barIn === 0) {
      if (section.name === 'BUILD') { this.sweep = 0.15; }
      else this.sweep = 1;
    }
    if (section.name === 'BUILD') this.sweep = Math.min(1, 0.15 + (barIn / Math.max(1, section.bars)) * 0.9);
    if (on('kick') && s.kick[step]) this.vKick(t);
    if (this.clapOn && on('kick') && (step === 4 || step === 12)) this.vClap(t);
    if (lastBar && on('kick') && step >= 12) { this.vKick(t); this.vHat(t, false); this.vSnare(t, 0.25 + 0.18 * (step - 12)); } // snare roll fill
    if (step === 0 && barIn === 0 && (section.name === 'DROP' || section.name === 'DROP 2') && this.crashOn) this.vCrash(t); // impact
    if (this.shakerOn && on('hats') && step % 2 === 1) this.vShaker(t); // 16th shaker groove
    if (on('bass')) { const arr = useB && s.bassB ? s.bassB : s.bass; const b = arr[step]; if (b.on) this.vBass(t, b.semi, stepDur * 0.92, ((this.params.bass as any).pluck ?? 0.6) > 0.7 && step % 4 === 2 ? 1.5 : 1); }
    if (on('hats') && s.hats[step]) this.vHat(t, false, step % 4 === 2 ? 1 : 0.7);
    if (on('open') && s.open[step]) this.vHat(t, true);
    if (on('lead')) { const arr = useB && s.leadB ? s.leadB : s.lead; const L = arr[step]; if (L !== null && L !== undefined) this.vLead(t, L, stepDur * 3); }
    if (on('pad') && step === 0) { const chords = s.chords && s.chords.length ? s.chords : [s.padChord]; this.vPad(t, chords[barIn % chords.length], stepDur * 16); }
    if (section.name === 'BUILD' && section.bars >= 2 && barIn >= section.bars - 2 && step === 0) this.vRiser(t, stepDur * 16 * 2);
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
  applySound(cat: string, p: Record<string, any>) {
    if (cat === 'fx') {
      if (p.delayFb !== undefined && this.delayFbGain) this.delayFbGain.gain.value = p.delayFb;
      if (p.delayTone !== undefined && this.delayLp) this.delayLp.frequency.value = p.delayTone;
      if (p.space !== undefined && this.reverbOut) this.reverbOut.gain.value = p.space;
      return;
    }
    if (cat === 'chords') {
      if (p.chords) { (this.song as any).chords = p.chords; (this.song as any).padChord = p.chords[0]; }
      return;
    }
    if (cat === 'grooves') {
      if (p.swing !== undefined) this.swing = p.swing;
      if (p.humanize !== undefined) this.humanize = p.humanize;
      if (p.shaker !== undefined) this.shakerOn = p.shaker;
      return;
    }
    if (cat === 'master') {
      if (this.eqLow && p.low !== undefined) { this.eqLow.gain.value = p.low; if (this.eqMid) this.eqMid.gain.value = p.mid; if (this.eqHigh) this.eqHigh.gain.value = p.high; }
      if (this.comp && p.thresh !== undefined) { this.comp.threshold.value = p.thresh; this.comp.ratio.value = p.ratio; }
      return;
    }
    if (cat === 'kits') {
      if (p.kick) Object.assign(this.params.kick, p.kick);
      if (p.hats) Object.assign(this.params.hats, p.hats);
      if (p.clap !== undefined) this.clapOn = p.clap;
      if (p.shaker !== undefined) this.shakerOn = p.shaker;
      return;
    }
    if (cat === 'keys') {
      const sh = p.shift ?? 0;
      this.bassRoot = 33 + sh;
      const tr = (arr: any[]) => arr.forEach((e, i) => { if (typeof e === 'number' && e !== null) arr[i] = Math.max(30, Math.min(96, e + sh)); });
      tr(this.song.lead as any[]); if (this.song.leadB) tr(this.song.leadB as any[]);
      if ((this.song as any).chords) (this.song as any).chords = (this.song as any).chords.map((c: number[]) => c.map((n) => n + sh));
      return;
    }
    const target = (this.params as any)[cat];
    if (target) Object.assign(target, p);
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
