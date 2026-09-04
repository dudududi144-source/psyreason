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
  formGain: GainNode | null = null;
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

  styleId = 'fullon'; subId = 'classic'; clapOn = false; crashOn = true; shakerOn = false; swing = 0; humanize = 0; bassRoot = 33; droneOn = false; droneLevel = 0.05; droneRatio = 1; pumpDepth = 0.8; rollLen = 4; openIntoDrop = false; rollVel = 1; followChords = false; phraseFills = false; breakEcho = true;
  loadSession(styleId: string, subId: string, session: number) {
    const sb = subById(styleId, subId);
    this.styleId = styleId; this.subId = subId;
    this.seed = sessionSeed(sb.id, session);
    this.song = generateSongForSub(sb, this.seed);
    this.arrangement = this.stripOutro(generateArrangementForSub(sb, this.seed));
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
    const flavors = ['std', 'bright', 'dark', 'wide', 'tight', 'acid', 'soft', 'hard', 'wider', 'deeper', 'punchy', 'airy'];
    const fl = flavors[session % 12];
    if (fl === 'bright') { this.params.lead.cutoff *= 1.2; this.params.hats.tone *= 1.1; }
    if (fl === 'dark') { this.params.lead.cutoff *= 0.8; this.params.bass.cutoff *= 0.85; }
    if (fl === 'wide') { this.params.lead.detune = Math.max(8, (this.params.lead.detune ?? 8) + 6); this.params.lead.voices = 3; }
    if (fl === 'tight') { this.params.lead.voices = 1; this.params.lead.detune = 3; }
    if (fl === 'acid') { this.params.bass.pluck = 0.9; this.params.bass.res = Math.min(18, this.params.bass.res + 4); }
    if (fl === 'soft') { this.params.kick.punch *= 0.8; this.params.lead.res = Math.max(1, this.params.lead.res - 2); }
    if (fl === 'hard') { this.params.kick.punch = Math.min(1, this.params.kick.punch + 0.2); this.params.bass.drive = Math.min(1, this.params.bass.drive + 0.2); }
    if (fl === 'wider') { this.params.lead.voices = 3; this.params.lead.detune = 18; this.params.pad.rSend = Math.min(1, (this.params.pad.rSend ?? 0.5) + 0.2); }
    if (fl === 'deeper') { this.params.bass.sub = Math.min(1, (this.params.bass.sub ?? 0.4) + 0.3); this.params.kick.decay = Math.min(0.5, this.params.kick.decay + 0.06); }
    if (fl === 'punchy') { this.params.kick.punch = Math.min(1, this.params.kick.punch + 0.25); this.params.bass.drive = Math.min(1, this.params.bass.drive + 0.15); }
    if (fl === 'airy') { this.params.lead.cutoff *= 1.25; this.params.pad.rSend = Math.min(1, (this.params.pad.rSend ?? 0.5) + 0.25); this.params.hats.tone *= 1.15; }
    this.clapOn = !!sb.clap;
    if (sb.kickMode === 'half') { this.params.lead.dSend = 0.5; this.params.pad.rSend = 0.55; this.swing = 0.2; this.pumpDepth = 0.6; }
    if ((sb as any).dSend !== undefined) this.params.lead.dSend = (sb as any).dSend;
    if ((sb as any).rSend !== undefined) { this.params.lead.rSend = (sb as any).rSend; this.params.pad.rSend = (sb as any).rSend; }
    const fam = styleById(styleId).family;
    this.followChords = fam === 'TRANCE' || fam === 'CHILL' || fam === 'HYPNOTIC';
    this.phraseFills = fam === 'TRANCE' || fam === 'CHILL' || fam === 'GOA & CLASSICS';
    this.breakEcho = fam !== 'DARK' && fam !== 'TECH';
    // family drum + pad taste: each family's default drums/pads sound distinct
    const drumTaste: Record<string, any> = {
      'PSY MAIN': { kick: { sat: 0.5, punch: 0.7, decay: 0.26 }, hats: { tone: 7500, metal: 0.5, decay: 0.5 } },
      'GOA & CLASSICS': { kick: { sat: 0.4, punch: 0.5, decay: 0.3 }, hats: { tone: 7000, metal: 0.4, decay: 0.6 } },
      'DARK': { kick: { sat: 0.7, punch: 0.9, decay: 0.22 }, hats: { tone: 8000, metal: 0.7, decay: 0.4 } },
      'HYPNOTIC': { kick: { sat: 0.4, punch: 0.6, decay: 0.28 }, hats: { tone: 7000, metal: 0.4, decay: 0.5 } },
      'CHILL': { kick: { sat: 0.2, punch: 0.3, decay: 0.4 }, hats: { tone: 6000, metal: 0.3, decay: 0.8 } },
      'TRANCE': { kick: { sat: 0.4, punch: 0.6, decay: 0.28 }, hats: { tone: 7500, metal: 0.5, decay: 0.5 } },
      'TECH': { kick: { sat: 0.6, punch: 0.8, decay: 0.24 }, hats: { tone: 8000, metal: 0.6, decay: 0.4 } },
      'WILD': { kick: { sat: 0.8, punch: 0.9, decay: 0.2 }, hats: { tone: 8500, metal: 0.8, decay: 0.3 } },
    };
    const dt = drumTaste[fam]; if (dt) { Object.assign(this.params.kick, dt.kick); Object.assign(this.params.hats, dt.hats); }
    const padTaste: Record<string, any> = {
      'TRANCE': { width: 0.9, bright: 1.4 }, 'CHILL': { width: 0.8, bright: 0.8 },
      'DARK': { width: 0.4, bright: 0.7 }, 'WILD': { width: 0.6, bright: 1.1 },
      'GOA & CLASSICS': { width: 0.6, bright: 1.2 }, 'HYPNOTIC': { width: 0.5, bright: 0.9 },
      'PSY MAIN': { width: 0.6, bright: 1.1 }, 'TECH': { width: 0.4, bright: 0.9 },
    };
    const pt = padTaste[fam]; if (pt) Object.assign(this.params.pad, pt);
    // PER-FAMILY SIGNATURE: genuine sonic identity per family (lead/bass/drums/feel/FX)
    const sig: Record<string, any> = {
      'PSY MAIN': { swing: 0, lead: { ftype: 0, sus: 0.2, voices: 2 }, bass: { ftype: 'lp' }, kick: { sat: 0.5, decay: 0.26, punch: 0.7 }, hats: { tone: 7500, metal: 0.5, decay: 0.5 }, dFb: 0.4, dSend: 0.35, rSend: 0.2 },
      'GOA & CLASSICS': { swing: 0.15, lead: { ftype: 1, sus: 0.3, voices: 1, wave: 'sawtooth' }, bass: { ftype: 'bp' }, kick: { sat: 0.4, decay: 0.3, punch: 0.5 }, hats: { tone: 7000, metal: 0.35, decay: 0.6 }, dFb: 0.5, dSend: 0.45, rSend: 0.25 },
      'DARK': { swing: 0, lead: { ftype: 2, sus: 0.1, voices: 2 }, bass: { ftype: 'lp', drive: 0.7 }, kick: { sat: 0.75, decay: 0.21, punch: 0.9 }, hats: { tone: 8200, metal: 0.7, decay: 0.35 }, dFb: 0.35, dSend: 0.3, rSend: 0.3 },
      'HYPNOTIC': { swing: 0, lead: { ftype: 0, sus: 0.5, voices: 2 }, bass: { ftype: 'lp' }, kick: { sat: 0.4, decay: 0.28, punch: 0.6 }, hats: { tone: 7000, metal: 0.4, decay: 0.5 }, dFb: 0.45, dSend: 0.4, rSend: 0.3 },
      'CHILL': { swing: 0.25, lead: { ftype: 0, sus: 0.8, voices: 1, wave: 'triangle' }, bass: { ftype: 'lp', sub: 0.9 }, kick: { sat: 0.2, decay: 0.4, punch: 0.3 }, hats: { tone: 6000, metal: 0.25, decay: 0.8 }, dFb: 0.5, dSend: 0.5, rSend: 0.6 },
      'TRANCE': { swing: 0, lead: { ftype: 0, sus: 0.6, voices: 3 }, bass: { ftype: 'lp' }, kick: { sat: 0.4, decay: 0.28, punch: 0.6 }, hats: { tone: 7500, metal: 0.5, decay: 0.5 }, dFb: 0.4, dSend: 0.4, rSend: 0.45 },
      'TECH': { swing: 0, lead: { ftype: 1, sus: 0.2, voices: 1 }, bass: { ftype: 'bp' }, kick: { sat: 0.6, decay: 0.24, punch: 0.8 }, hats: { tone: 8000, metal: 0.6, decay: 0.4 }, dFb: 0.3, dSend: 0.3, rSend: 0.2 },
      'WILD': { swing: 0, lead: { ftype: 2, sus: 0.2, voices: 2 }, bass: { ftype: 'lp', drive: 0.8 }, kick: { sat: 0.85, decay: 0.2, punch: 0.9 }, hats: { tone: 8500, metal: 0.8, decay: 0.3 }, dFb: 0.3, dSend: 0.35, rSend: 0.25 },
    };
    const sg = sig[fam];
    if (sg) {
      Object.assign(this.params.lead, sg.lead);
      Object.assign(this.params.bass, sg.bass);
      Object.assign(this.params.kick, sg.kick);
      Object.assign(this.params.hats, sg.hats);
      this.swing = sg.swing;
      if (this.delayFbGain) this.delayFbGain.gain.value = sg.dFb;
      this.params.lead.dSend = sg.dSend; this.params.pad.rSend = sg.rSend;
      if ((this.channels as any).lead) { (this.channels as any).lead.dSend.gain.value = sg.dSend; }
      if ((this.channels as any).pad) { (this.channels as any).pad.rSend.gain.value = sg.rSend; }
    }
    // commercial polish: tame harshness so everything sits musically
    this.params.lead.res = Math.min(this.params.lead.res ?? 6, 12);
    this.params.lead.cutoff = Math.min(this.params.lead.cutoff ?? 4000, 6000);
    this.params.bass.res = Math.min(this.params.bass.res ?? 6, 10);
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
    this.formGain = ctx.createGain(); this.formGain.gain.value = 1;
    this.master.connect(this.formGain); this.formGain.connect(this.eqLow); this.eqLow.connect(this.eqMid); this.eqMid.connect(this.eqHigh);
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
      const LV: Record<string, number> = { kick: 1.0, bass: 0.85, hats: 0.5, open: 0.5, lead: 0.7, pad: 0.5 };
      const fader = ctx.createGain(); fader.gain.value = LV[t.id] ?? 0.8;
      const pan = ctx.createStereoPanner();
      const an = ctx.createAnalyser(); an.fftSize = 256;
      const dSend = ctx.createGain(); dSend.gain.value = 0;
      const rSend = ctx.createGain(); rSend.gain.value = 0;
      const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 18000;
      const drv = ctx.createWaveShaper(); drv.curve = this.driveCurve(0.0001);
      bus.connect(duck); duck.connect(tone); tone.connect(drv); drv.connect(fader); fader.connect(pan); pan.connect(an); an.connect(this.master);
      bus.connect(dSend); dSend.connect(dIn);
      bus.connect(rSend); rSend.connect(rIn);
      this.channels[t.id] = { bus, duck, tone, drv, fader, pan, an, dSend, rSend, mute: false, solo: false, level: 0.9 };
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
  vKick(t: number, vel = 1) {
    const ctx = this.ctx!; const p = this.params.kick as any; const out = this.channels.kick.bus;
    // layered: body osc + sub tail + click, through soft saturation
    const o = ctx.createOscillator(); o.type = (p.body ?? 0.3) > 0.6 ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(150 + 50 * (p.punch ?? 0.5), t);
    o.frequency.exponentialRampToValueAtTime(40 + 8 * (p.body ?? 0.3), t + 0.09);
    const ws = ctx.createWaveShaper(); ws.curve = this.driveCurve(0.3 + ((this.params.kick as any).sat ?? 0.4));
    const g = ctx.createGain();
    g.gain.setValueAtTime(1.15 * vel, t);
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
    if (this.params.bass.sidechain > 0) {
      const dg = this.channels.bass.duck.gain;
      dg.cancelScheduledValues(t);
      dg.setValueAtTime(1 - this.pumpDepth * this.params.bass.sidechain, t);
      dg.setTargetAtTime(1, t + 0.03, 0.1);
      const ld = this.channels.lead.duck.gain;
      ld.cancelScheduledValues(t);
      ld.setValueAtTime(1 - 0.2 * this.params.bass.sidechain, t);
      ld.setTargetAtTime(1, t + 0.03, 0.08);
    }
  }
  vBass(t: number, semi: number, dur: number, accent = 1) {
    const ctx = this.ctx!; const p = this.params.bass; const out = this.channels.bass.bus;
    const f = mtof(this.bassRoot + semi);
    const o = ctx.createOscillator(); o.type = ((p as any).wave as OscillatorType) || 'sawtooth'; o.frequency.value = f;
    const sub = ctx.createOscillator(); sub.type = 'square'; sub.frequency.value = f / 2;
    const lp = ctx.createBiquadFilter(); lp.type = ((p as any).ftype === 'bp' ? 'bandpass' : 'lowpass'); lp.Q.value = (p as any).ftype === 'bp' ? Math.max(p.res, 10) : p.res;
    const pl = (p as any).pluck ?? 0.6; lp.frequency.setValueAtTime(p.cutoff * (1 + 2.5 * pl) * this.sweep * accent, t); lp.frequency.exponentialRampToValueAtTime(Math.max(60, p.cutoff * (1 - 0.6 * pl) * this.sweep), t + dur);
    const dr = ctx.createWaveShaper(); dr.curve = this.driveCurve(p.drive);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.005);
    g.gain.setValueAtTime(0.5, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.0001, t); sg.gain.linearRampToValueAtTime(0.15 + 0.45 * ((p as any).sub ?? 0.35), t + 0.005); sg.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(lp); lp.connect(dr); dr.connect(g); sub.connect(sg);
    g.connect(out); sg.connect(out);
    const ck = ctx.createBufferSource(); ck.buffer = this.noise();
    const chp = ctx.createBiquadFilter(); chp.type = 'highpass'; chp.frequency.value = 2500;
    const cg = ctx.createGain(); cg.gain.setValueAtTime(0.12 * accent, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    ck.connect(chp); chp.connect(cg); cg.connect(out);
    ck.start(t); ck.stop(t + 0.03);
    o.start(t); o.stop(t + dur + 0.05); sub.start(t); sub.stop(t + dur + 0.05);
  }
  private curveCache = new Map<number, Float32Array>();
  driveCurve(amount: number): Float32Array {
    const key = Math.round(amount * 50) / 50;
    const hit = this.curveCache.get(key); if (hit) return hit;
    const n = 256; const curve = new Float32Array(n); const k = 1 + amount * 8;
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * k) / Math.tanh(k); }
    if (this.curveCache.size > 60) this.curveCache.clear();
    this.curveCache.set(key, curve);
    return curve;
  }
  vHat(t: number, open: boolean, vel = 1) {
    // CLEAN metallic hat: filtered noise air + inharmonic SINE partials (no aliasing)
    const ctx = this.ctx!; const p = this.params.hats as any;
    const out = open ? this.channels.open.bus : this.channels.hats.bus;
    const tone = p.tone ?? 7500;
    const dur = open ? 0.26 : 0.03 + 0.06 * ((p as any).decay ?? 0.5);
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
  vLead(t: number, midi: number, dur: number, vel = 1) {
    const ctx = this.ctx!; const p = this.params.lead; const out = this.channels.lead.bus;
    const f = mtof(midi);
    const lp = ctx.createBiquadFilter(); lp.type = ((p as any).ftype === 1 ? 'bandpass' : ((p as any).ftype === 2 ? 'peaking' : 'lowpass')); lp.Q.value = p.res;
    lp.frequency.setValueAtTime(p.cutoff * 1.6 * this.sweep, t); lp.frequency.exponentialRampToValueAtTime(Math.max(120, p.cutoff * 0.35 * this.sweep), t + dur);
    const g = ctx.createGain();
    const sus = (p as any).sus ?? 0;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2 * vel, t + 0.012);
    if (sus > 0.3) g.gain.setValueAtTime(0.22 * vel * (0.4 + 0.5 * sus), t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
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
    const sh = ctx.createOscillator(); sh.type = 'sine'; sh.frequency.value = f * 2;
    const shg = ctx.createGain(); shg.gain.value = 0.06; sh.connect(shg); shg.connect(lp);
    sh.start(t); sh.stop(t + dur + 0.05);
    const ap = ctx.createStereoPanner();
    const al = ctx.createOscillator(); al.frequency.value = 0.4; const alg = ctx.createGain(); alg.gain.value = 0.35; al.connect(alg); alg.connect(ap.pan);
    al.start(t); al.stop(t + dur + 0.05);
    lp.connect(g); g.connect(ap); ap.connect(out);
  }
  vPad(t: number, chord: number[], dur: number) {
    const ctx = this.ctx!; const p = this.params.pad; const out = this.channels.pad.bus;
    for (const m of chord) for (const det of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = ((p as any).wave as OscillatorType) || 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det * ((p as any).det ?? 1);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = p.cutoff * ((p as any).bright ?? 1); lp.Q.value = 0.4;
      const plf = ctx.createOscillator(); plf.frequency.value = 0.12; const pg = ctx.createGain(); pg.gain.value = p.cutoff * 0.35; plf.connect(pg); pg.connect(lp.frequency); plf.start(t); plf.stop(t + dur + 0.1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.08);
      g.gain.setValueAtTime(0.045, t + Math.max(0.1, dur - 0.08)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(lp); lp.connect(g);
      const pn = ctx.createStereoPanner(); pn.pan.value = (det < 0 ? -1 : 1) * (0.25 + 0.5 * ((p as any).width ?? 0.5));
      g.connect(pn); pn.connect(out);
      o.start(t); o.stop(t + dur + 0.1);
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
  private tick = () => {
    const ctx = this.ctx!;
    const stepDur = 60 / this.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.2) {
      if (this.pendingJump !== null && this.step16 % 16 === 0) { this.step16 = this.pendingJump; this.pendingJump = null; }
      if (this.pendingSession && this.step16 % 16 === 0) { const ps = this.pendingSession; this.pendingSession = null; this.loadSession(ps.s, ps.sb, ps.ss); this.sweep = 1; this.vHat(this.nextTime, true, 0.7); } // DJ-style switch at bar
      this.schedule(this.step16, this.nextTime);
      const g = this.step16;
      const ms = Math.max(0, (this.nextTime - ctx.currentTime) * 1000);
      window.setTimeout(() => { if (this.onTick) this.onTick(Math.floor(g / 16) % this.totalBars(), g % 16, sectionAtBarIn(this.arrangement, Math.floor(g / 16) % this.totalBars()).index); }, ms);
      this.step16++;
      this.nextTime += stepDur;
    }
  };
  private schedule(g: number, t: number) {
    const bar = Math.floor(g / 16) % this.totalBars(); const step = g % 16;
    const { section, startBar } = sectionAtBarIn(this.arrangement, bar);
    const barIn = bar - startBar;
    const roleNow = ((section as any).role || '');
    const on = (id: TrackId) => {
      if (!section.active.includes(id)) return false;
      if (roleNow === 'dropin') {
        if (id === 'bass') return barIn >= 1;
        if (id === 'hats' || id === 'open') return barIn >= 2;
        if (id === 'lead' || id === 'pad') return barIn >= 4;
      }
      if (roleNow === 'intro') {
        const frac = barIn / Math.max(1, section.bars);
        if (id === 'pad') return true;
        if (id === 'bass') return frac >= 0.3;
        if (id === 'kick' || id === 'hats' || id === 'open') return frac >= 0.55;
        if (id === 'lead') return frac >= 0.8;
      }
      return true;
    };
    const s = this.song as any; const stepDur = 60 / this.bpm / 4;
    t = t + (step % 2 === 1 ? this.swing * stepDur * 0.35 : 0) + (this.humanize > 0 ? (((bar * 31 + step * 7) % 5) - 2) * 0.002 * this.humanize : 0);
    // role-based section detection (smart: new section types plug in without breaking old names)
    const rn = (section as any).role || '';
    const isDrop = rn === 'drop' || rn === 'drop2' || rn === 'climax' || rn === 'dropin' || section.name.startsWith('DROP');
    const isDrop2 = rn === 'drop2' || rn === 'climax' || section.name === 'DROP 2';
    const isBuild = rn === 'build' || section.name.startsWith('BUILD');
    const isBreak = rn === 'break' || rn === 'ambient' || rn === 'acid' || rn === 'half' || section.name === 'BREAK';
    const isPerc = rn === 'perc';
    const isOutro = rn === 'outro' || section.name === 'OUTRO';
    const en = (section as any).energy ?? (isDrop ? 1 : isBuild ? 0.6 : isBreak ? 0.3 : isPerc ? 0.55 : isOutro ? 0.35 : 0.5);
    if (step === 0 && barIn === 0 && this.formGain) this.formGain.gain.setTargetAtTime(0.78 + 0.28 * en, t, 0.3); // macro energy arc
    if (isDrop && bar % 8 === 7 && step === 14) this.vHat(t, true, 0.4); // 8-bar ear candy
    const useB = barIn % 4 >= 2 || isDrop2;
    const lastBar = barIn === section.bars - 1;
    if (step === 0 && barIn === 0) { if (isBuild) this.sweep = 0.15; else this.sweep = 1; }
    if (isBuild) this.sweep = Math.min(1, 0.15 + (barIn / Math.max(1, section.bars)) * 0.9);
    if (on('kick') && s.kick[step]) this.vKick(t);
    if (this.clapOn && on('kick') && (step === 4 || step === 12)) this.vClap(t);
    if (lastBar && (on('kick') || isBreak) && step >= 16 - this.rollLen) { this.vSnare(t, (0.2 + 0.15 * (step - (16 - this.rollLen))) * this.rollVel); }
    if (this.shakerOn && on('hats') && step % 2 === 1) this.vShaker(t);
    if (isBreak && barIn >= 4 && step % 2 === 1) this.vShaker(t);
    if (isDrop2 && step % 2 === 1) this.vShaker(t);
    if (isPerc && step % 2 === 1) this.vShaker(t);
    if (isPerc && step % 4 === 2) this.vHat(t, false, 0.8);
    if (this.openIntoDrop && step === 0 && barIn === 0 && isDrop) this.vHat(t, true, 0.8);
    if (isBuild && lastBar && step === 12) { this.master!.gain.cancelScheduledValues(t); this.master!.gain.setTargetAtTime(0.72, t, 0.08); }
    if (step === 0 && barIn === 0 && isDrop) { this.master!.gain.cancelScheduledValues(t); this.master!.gain.setTargetAtTime(0.9, t, 0.04); }
    if (step === 0 && barIn === 0 && isDrop) this.vBass(t, -12, stepDur * 2, 1);
    const chordsG = s.chords && s.chords.length ? s.chords : [s.padChord];
    const chordRoot = chordsG[bar % chordsG.length][0];
    const rootShift = this.followChords ? chordRoot - 24 - this.bassRoot : 0;
    const phraseLast = bar % 4 === 3;
    if (on('bass') && !(isOutro && barIn >= 4)) { const arr = useB && s.bassB ? s.bassB : s.bass; const b = arr[step]; if (b.on) { const oct = this.phraseFills && phraseLast && step >= 12 ? 12 : 0; this.vBass(t, b.semi + rootShift + oct, stepDur * 0.92, ((this.params.bass as any).pluck ?? 0.6) > 0.7 && step % 4 === 2 ? 1.5 : 1); } }
    if (on('hats') && s.hats[step] && !(isOutro && barIn >= 6)) { const dropExit = isDrop && lastBar && step > 8; if (!dropExit) this.vHat(t, false, (step % 4 === 2 ? 1 : 0.7) * (0.85 + 0.3 * (((step * 13 + bar) % 4) / 3))); }
    if (on('open') && s.open[step]) this.vHat(t, true);
    if (on('lead')) { const arr = useB && s.leadB ? s.leadB : s.lead; const L = arr[step]; if (L !== null && L !== undefined) { this.vLead(t, L, stepDur * 3); if (isBreak && this.breakEcho) this.vLead(t + stepDur * 4, L, stepDur * 2, 0.4); } }
    if (isBreak && step === 0) { const prog = barIn / Math.max(1, section.bars); (this.params.pad as any).bright = 1.1 - 0.4 * prog; }
    if ((isBuild || isDrop2) && step === 0 && barIn === 0) (this.params.pad as any).bright = 1.1;
    if (roleNow === 'intro' && step === 0 && barIn === 0) this.vDrone(t, 33, stepDur * 16 * section.bars); // intro atmosphere
    if (this.droneOn && on('pad') && step === 0 && barIn === 0) this.vDrone(t, 33, stepDur * 16 * section.bars);
    if (isBreak && step === 0 && barIn >= 2 && barIn % 2 === 0) this.vKick(t, 0.32);
    if (on('pad') && step === 0) { const chords = s.chords && s.chords.length ? s.chords : [s.padChord]; const ch = chords[bar % chords.length]; this.vPad(t, isBreak ? [ch[0], ch[1] + 12, ch[2] + 12] : ch, stepDur * 16); }
  }
  async start() {
    await this.init();
    if (this.ctx && this.ctx.state !== 'running') {
      try { await this.ctx.resume(); } catch (e) {}
      // watchdog: retry resume a few times (some browsers need it post-gesture)
      for (let i = 0; i < 5 && this.ctx.state !== 'running'; i++) {
        await new Promise((res) => setTimeout(res, 120));
        try { await this.ctx.resume(); } catch (e) {}
      }
    }
    if (this.running) return;
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
    if (cat === 'arp') {
      const stepsPer = (p.rate ?? 0.25) === 0.25 ? 1 : 2;
      const mode = p.mode ?? 'up';
      const lead = this.song.lead as (number | null)[];
      const anchors: number[] = [];
      lead.forEach((v, i) => { if (v !== null) anchors.push(i); });
      if (anchors.length === 0) anchors.push(0);
      const out: (number | null)[] = Array(16).fill(null);
      for (let a2 = 0; a2 < anchors.length; a2++) {
        const start = anchors[a2];
        const end2 = a2 + 1 < anchors.length ? anchors[a2 + 1] : 16;
        const root = lead[anchors[a2]] as number;
        const tones = [root, root + 3, root + 7, root + 12];
        let seq: number[] = [0, 1, 2, 3];
        if (mode === 'down') seq = [3, 2, 1, 0];
        if (mode === 'updown') seq = [0, 1, 2, 3, 2, 1];
        if (mode === 'random') seq = [0, 2, 1, 3, 3, 1, 2, 0];
        for (let s2 = start; s2 < end2; s2 += stepsPer) {
          out[s2] = Math.min(96, tones[seq[(s2 - start) % seq.length] % 4]);
        }
      }
      this.song.lead = out;
      return;
    }
    if (cat === 'sidechain') {
      this.params.bass.sidechain = 1;
      if (p.depth !== undefined) this.pumpDepth = p.depth;
      return;
    }
    if (cat === 'atmos') {
      this.droneOn = true;
      if (p.level !== undefined) this.droneLevel = p.level;
      if (p.ratio !== undefined) this.droneRatio = p.ratio;
      return;
    }
    if (cat === 'basspat') {
      const st = p.style ?? 'rolling'; const dens = p.density ?? 0.9;
      const bass: { on: boolean; semi: number }[] = [];
      for (let i = 0; i < 16; i++) {
        const isKick = i % 4 === 0; let on = false;
        if (st === 'rolling') on = !isKick;
        if (st === 'offbeat') on = i % 4 === 2 || (i % 2 === 1 && Math.random() < 0.3);
        if (st === 'kbb') on = i % 4 === 2 || i % 4 === 3;
        if (st === 'hypnotic') on = true;
        if (st === 'driving') on = i % 2 === 0;
        if (Math.random() > dens) on = false;
        const semi = i >= 12 && Math.random() < 0.5 ? [0, 1, 3, 5, 7][Math.floor(Math.random() * 5)] : 0;
        bass.push({ on, semi });
      }
      this.song.bass = bass; this.song.bassB = bass.map((b) => ({ ...b }));
      return;
    }
    if (cat === 'drumpat') {
      const hs = p.hatStyle ?? 'offbeat';
      const hats = Array(16).fill(false);
      if (hs === 'offbeat') for (let i = 2; i < 16; i += 4) hats[i] = true;
      if (hs === 'busy') { for (let i = 2; i < 16; i += 4) hats[i] = true; hats[3] = true; hats[7] = true; hats[15] = true; }
      if (hs === 'sparse') { hats[2] = true; hats[10] = true; }
      if (hs === 'shuffle') { for (let i = 2; i < 16; i += 4) hats[i] = true; hats[6] = true; hats[14] = true; }
      const open = Array(16).fill(false); open[p.openPos ?? 14] = true;
      this.song.hats = hats; this.song.open = open;
      return;
    }
    if (cat === 'hooks') {
      const m = p.motif ?? 'rising'; const base = 69;
      const shapes: Record<string, (number | null)[]> = {
        rising: [0, null, null, 3, null, null, 7, null, 12, null, null, 7, null, null, 3, null],
        falling: [12, null, null, 7, null, null, 3, null, 0, null, null, 3, null, null, 7, null],
        wave: [0, null, 3, null, 7, null, 3, null, 0, null, 3, null, 7, null, 12, null],
        jump: [0, null, 12, null, 7, null, 15, null, 12, null, 7, null, 3, null, 0, null],
        anthem: [0, 0, null, 3, null, 7, null, 12, 12, null, 7, null, 3, null, 0, null],
      };
      const sh = shapes[m] ?? shapes.rising;
      const lead = sh.map((v) => (v === null ? null : base + v));
      this.song.lead = lead; this.song.leadB = [...lead];
      return;
    }
    if (cat === 'transitions') {
      if (p.rollLen !== undefined) this.rollLen = p.rollLen;
      if (p.openIntoDrop !== undefined) this.openIntoDrop = p.openIntoDrop;
      if (p.rollVel !== undefined) this.rollVel = p.rollVel;
      return;
    }
    const target = (this.params as any)[cat];
    if (target) {
      Object.assign(target, p);
      if (cat === 'lead') { target.res = Math.min(target.res ?? 6, 13); target.cutoff = Math.min(target.cutoff ?? 4000, 6500); }
      if (cat === 'bass') { target.res = Math.min(target.res ?? 6, 11); }
    }
  }
  setBpm(v: number) { this.bpm = Math.max(90, Math.min(200, v)); if (this.delayIn && this.ctx) { /* delay time lives on node created in init; find via graph not stored; keep simple */ } }

  pendingJump: number | null = null;
  pendingSession: { s: string; sb: string; ss: number } | null = null;
  queueSession(s: string, sb: string, ss: number) { this.pendingSession = { s, sb, ss }; }
  newSessionKeepForm(session: number) {
    const arr = this.arrangement;
    this.loadSession(this.styleId, this.subId, session);
    this.arrangement = arr;
  }
  private stripOutro(arr: any[]) { return arr.filter((s) => (s.role || '') !== 'outro' && s.name !== 'OUTRO' && !String(s.name).includes('OUTRO')); }
  loadArrangement(sections: { name: string; bars: number; active: string[] }[]) {
    this.arrangement = this.stripOutro(sections as any);
    this.step16 = 0; this.pendingJump = null;
  }
  jumpToSection(index: number) { let b = 0; for (let i = 0; i < index && i < this.arrangement.length; i++) b += this.arrangement[i].bars; this.pendingJump = b * 16; }
  setMasterLevel(v: number) { if (this.master) this.master.gain.value = 0.5 + v * 0.6; }
  setTone(id: string, v: number) { const c = (this.channels as any)[id]; if (c) c.tone.frequency.value = 200 + v * 16000; }
  setDrive(id: string, v: number) { const c = (this.channels as any)[id]; if (c) c.drv.curve = this.driveCurve(v); }
  async playVoice(track: string, midi: number) {
    await this.init(); if (this.ctx && this.ctx.state !== 'running') { try { await this.ctx.resume(); } catch (e) {} }
    const t = this.ctx!.currentTime + 0.02; const sd = 60 / this.bpm / 4;
    if (track === 'lead') this.vLead(t, midi, sd * 3);
    else if (track === 'bass') this.vBass(t, midi - 33, sd * 4);
    else if (track === 'pad') this.vPad(t, [midi, midi + 3, midi + 7], sd * 8);
  }
  audioState(): string { return this.ctx ? this.ctx.state : 'off'; }
  level(id: TrackId | 'master'): number {
    const an = id === 'master' ? this.masterAn : this.channels[id] ? this.channels[id].an : null;
    if (!an) return 0;
    const arr = new Uint8Array(an.frequencyBinCount); an.getByteTimeDomainData(arr);
    let peak = 0; for (let i = 0; i < arr.length; i++) { const v = Math.abs(arr[i] - 128) / 128; if (v > peak) peak = v; }
    return peak;
  }
  vDrone(t: number, rootMidi: number, dur: number) {
    const ctx = this.ctx!; const out = this.channels.pad.bus;
    const f = mtof(rootMidi - 12) * this.droneRatio;
    for (const det of [-4, 4]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = 0.5;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(lp.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(this.droneLevel, t + 0.8);
      g.gain.setValueAtTime(this.droneLevel, t + Math.max(1, dur - 1)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(lp); lp.connect(g); g.connect(out);
      o.start(t); o.stop(t + dur + 0.1); lfo.start(t); lfo.stop(t + dur + 0.1);
    }
  }
  async previewSound(cat: string, p: any) {
    await this.init();
    if (this.ctx && this.ctx.state !== 'running') { try { await this.ctx.resume(); } catch (e) {} }
    this.applySound(cat, p);
    const t0 = this.ctx!.currentTime + 0.05;
    const sd = 60 / this.bpm / 4;
    if (cat === 'bass') { for (let i = 0; i < 8; i++) this.vBass(t0 + i * sd, i === 6 ? 3 : 0, sd * 0.9, i % 4 === 2 ? 1.4 : 1); }
    else if (cat === 'lead' || cat === 'arp' || cat === 'fx') { [69, 72, 76, 72].forEach((m, i) => this.vLead(t0 + i * sd * 2, m, sd * 3)); }
    else if (cat === 'pad') this.vPad(t0, [57, 60, 64], 2.0);
    else if (cat === 'chords' && p.chords) this.vPad(t0, p.chords[0], 2.0);
    else if (cat === 'kick') { this.vKick(t0); this.vKick(t0 + sd * 4); }
    else if (cat === 'hats') { for (let i = 0; i < 8; i++) this.vHat(t0 + i * sd * 2, false, i % 2 === 0 ? 1 : 0.7); }
    else if (cat === 'kits') { this.vKick(t0); this.vHat(t0 + sd * 2, false, 1); this.vSnare(t0 + sd * 4, 0.5); this.vHat(t0 + sd * 6, false, 0.7); }
    else if (cat === 'grooves') { for (let i = 0; i < 8; i++) { if (i % 4 === 0) this.vKick(t0 + i * sd * 2); this.vBass(t0 + i * sd * 2 + (i % 2 === 1 ? this.swing * sd * 0.35 : 0), 0, sd * 0.9); } }
    else if (cat === 'master') { this.vKick(t0); this.vKick(t0 + sd * 4); for (let i = 0; i < 8; i++) this.vBass(t0 + i * sd, 0, sd * 0.9); }
    else if (cat === 'keys') { const sh = p.shift ?? 0; this.vLead(t0, 69 + sh, sd * 4); this.vBass(t0, sh, sd * 6); }
    else if (cat === 'sidechain') { this.vKick(t0); this.vKick(t0 + sd * 4); for (let i = 0; i < 8; i++) this.vBass(t0 + i * sd, 0, sd * 0.95); }
    else if (cat === 'atmos') { this.vDrone(t0, 33, 3.0); this.vPad(t0, [57, 60, 64], 3.0); }
    else if (cat === 'basspat') { for (let i = 0; i < 16; i++) { const b = this.song.bass[i]; if (b.on) this.vBass(t0 + i * sd, b.semi, sd * 0.9, i % 4 === 2 ? 1.3 : 1); } this.vKick(t0); this.vKick(t0 + sd * 4); this.vKick(t0 + sd * 8); this.vKick(t0 + sd * 12); }
    else if (cat === 'drumpat') { this.vKick(t0); this.vKick(t0 + sd * 4); this.vKick(t0 + sd * 8); this.vKick(t0 + sd * 12); for (let i = 0; i < 16; i++) { if (this.song.hats[i]) this.vHat(t0 + i * sd, false, i % 4 === 2 ? 1 : 0.7); if (this.song.open[i]) this.vHat(t0 + i * sd, true); } }
    else if (cat === 'hooks') { for (let i = 0; i < 16; i++) { const L = this.song.lead[i]; if (L !== null) this.vLead(t0 + i * sd, L, sd * 2); } }
    else if (cat === 'transitions') { for (let i = 16 - this.rollLen; i < 16; i++) this.vSnare(t0 + (i - (16 - this.rollLen)) * sd, (0.2 + 0.15 * (i - (16 - this.rollLen))) * this.rollVel); this.vKick(t0 + sd * 16); if (this.openIntoDrop) this.vHat(t0 + sd * 16, true, 0.8); }
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
