// PsyReason Real Audio Engine - Web Audio API
// This engine actually produces sound: synths, drums, effects, sequencer

export interface PatternData {
  kick: boolean[];
  bass: boolean[];
  hat: boolean[];
  openhat: boolean[];
  lead: (number | null)[];
  pad: (number[] | null)[];
}

export function createDefaultPattern(): PatternData {
  const kick = Array(16).fill(false);
  for (let i = 0; i < 16; i += 4) kick[i] = true;
  const bass = Array(16).fill(false);
  for (let i = 0; i < 16; i++) if (i % 4 !== 0) bass[i] = true;
  const hat = Array(16).fill(false);
  for (let i = 2; i < 16; i += 4) hat[i] = true;
  const openhat = Array(16).fill(false);
  openhat[14] = true;
  const lead: (number | null)[] = Array(16).fill(null);
  lead[0] = 69; lead[3] = 70; lead[6] = 72; lead[8] = 69; lead[11] = 68; lead[14] = 65;
  const pad: (number[] | null)[] = Array(16).fill(null);
  pad[0] = [57, 60, 64];
  return { kick, bass, hat, openhat, lead, pad };
}

export class PsyAudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  comp: DynamicsCompressorNode | null = null;
  analyser: AnalyserNode | null = null;
  busFilter: BiquadFilterNode | null = null;
  delaySend: GainNode | null = null;
  delayNode: DelayNode | null = null;
  delayFb: GainNode | null = null;
  delayFilter: BiquadFilterNode | null = null;
  reverbSend: GainNode | null = null;
  reverbNode: ConvolverNode | null = null;
  noiseBuf: AudioBuffer | null = null;

  running = false;
  bpm = 145;
  step = 0;
  nextTime = 0;
  timer: number | null = null;
  pattern: PatternData = createDefaultPattern();
  cutoff = 6000;
  resonance = 0.3;
  delayMix = 0.3;
  reverbMix = 0.25;
  bassLevel = 0.85;
  onStep: ((step: number) => void) | null = null;

  async init() {
    if (this.ctx) { await this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC();
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 5;
    this.comp.attack.value = 0.003;
    this.comp.release.value = 0.25;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.master.connect(this.comp);
    this.comp.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    this.busFilter = ctx.createBiquadFilter();
    this.busFilter.type = 'lowpass';
    this.busFilter.frequency.value = this.cutoff;
    this.busFilter.Q.value = this.resonance;
    this.busFilter.connect(this.master);

    this.delaySend = ctx.createGain();
    this.delaySend.gain.value = this.delayMix;
    this.delayNode = ctx.createDelay(2);
    this.delayNode.delayTime.value = (60 / this.bpm) * 0.75;
    this.delayFb = ctx.createGain();
    this.delayFb.gain.value = 0.38;
    this.delayFilter = ctx.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.value = 3200;
    this.delaySend.connect(this.delayNode);
    this.delayNode.connect(this.delayFilter);
    this.delayFilter.connect(this.delayFb);
    this.delayFb.connect(this.delayNode);
    this.delayFilter.connect(this.master);

    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = this.reverbMix;
    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = this.makeImpulse(2.0, 2.5);
    this.reverbSend.connect(this.reverbNode);
    this.reverbNode.connect(this.master);

    this.noiseBuf = this.makeNoise();
  }

  makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 1;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 4294967296) * 2 - 1;
    }
    return buf;
  }

  makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    let seed = 777;
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const n = (seed / 4294967296) * 2 - 1;
        data[i] = n * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  mtof(m: number): number { return 440 * Math.pow(2, (m - 69) / 12); }

  // KICK: sine with pitch drop - the psytrance thump
  kick(t: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    g.gain.setValueAtTime(1.0, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(g); g.connect(this.master!);
    osc.start(t); osc.stop(t + 0.3);
    // click transient
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf!;
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(0.25, t);
    hg.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1500;
    src.connect(hp); hp.connect(hg); hg.connect(this.master!);
    src.start(t); src.stop(t + 0.03);
  }

  // BASS: rolling offbeat saw + sub through the bus filter
  bass(t: number, freq: number, dur: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const sub = ctx.createOscillator();
    sub.type = 'square';
    sub.frequency.value = freq / 2;
    const g = ctx.createGain();
    const sg = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(this.bassLevel * 0.5, t + 0.004);
    g.gain.setValueAtTime(this.bassLevel * 0.5, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.linearRampToValueAtTime(this.bassLevel * 0.4, t + 0.004);
    sg.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); sub.connect(sg);
    g.connect(this.busFilter!); sg.connect(this.busFilter!);
    osc.start(t); osc.stop(t + dur + 0.05);
    sub.start(t); sub.stop(t + dur + 0.05);
  }

  // HAT: noise through highpass
  hat(t: number, open: boolean) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf!;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7500;
    const g = ctx.createGain();
    const dur = open ? 0.3 : 0.05;
    g.gain.setValueAtTime(open ? 0.3 : 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hp); hp.connect(g); g.connect(this.master!);
    src.start(t); src.stop(t + dur + 0.05);
  }

  // LEAD: saw through filter + delay send
  lead(t: number, freq: number, dur: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = freq;
    osc2.detune.value = 9;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(4500, t);
    f.frequency.exponentialRampToValueAtTime(900, t + dur);
    f.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(f); osc2.connect(f); f.connect(g);
    g.connect(this.master!);
    g.connect(this.delaySend!);
    g.connect(this.reverbSend!);
    osc.start(t); osc.stop(t + dur + 0.05);
    osc2.start(t); osc2.stop(t + dur + 0.05);
  }

  // PAD: detuned saws, slow attack
  pad(t: number, freqs: number[], dur: number) {
    const ctx = this.ctx!;
    for (const fr of freqs) {
      for (const det of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = this.mtof(fr);
        osc.detune.value = det;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 1200; f.Q.value = 0.5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.4);
        g.gain.setValueAtTime(0.05, t + dur - 0.5);
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        osc.connect(f); f.connect(g);
        g.connect(this.master!);
        g.connect(this.reverbSend!);
        osc.start(t); osc.stop(t + dur + 0.1);
      }
    }
  }

  scheduleStep(s: number, t: number) {
    const p = this.pattern;
    const stepDur = 60 / this.bpm / 4;
    if (p.kick[s]) this.kick(t);
    if (p.bass[s]) this.bass(t, this.mtof(33), stepDur * 0.9);
    if (p.hat[s]) this.hat(t, false);
    if (p.openhat[s]) this.hat(t, true);
    if (p.lead[s] !== null) this.lead(t, this.mtof(p.lead[s] as number), stepDur * 2.5);
    if (p.pad[s] !== null) this.pad(t, p.pad[s] as number[], stepDur * 16);
  }

  scheduler = () => {
    const ctx = this.ctx!;
    const stepDur = 60 / this.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.scheduleStep(this.step, this.nextTime);
      const stepForUi = this.step;
      const delayMs = Math.max(0, (this.nextTime - ctx.currentTime) * 1000);
      window.setTimeout(() => { if (this.onStep) this.onStep(stepForUi); }, delayMs);
      this.step = (this.step + 1) % 16;
      this.nextTime += stepDur;
    }
  };

  async start() {
    await this.init();
    if (this.running) return;
    this.running = true;
    this.step = 0;
    this.nextTime = this.ctx!.currentTime + 0.1;
    this.timer = window.setInterval(this.scheduler, 40);
  }

  stop() {
    this.running = false;
    if (this.timer !== null) { window.clearInterval(this.timer); this.timer = null; }
    if (this.onStep) this.onStep(-1);
  }

  playNote(midi: number) {
    if (!this.ctx) return;
    this.lead(this.ctx.currentTime, this.mtof(midi), 0.35);
  }

  setBpm(v: number) {
    this.bpm = Math.max(60, Math.min(200, v));
    if (this.delayNode && this.ctx) this.delayNode.delayTime.value = (60 / this.bpm) * 0.75;
  }
  setCutoff(v: number) {
    this.cutoff = v;
    if (this.busFilter) this.busFilter.frequency.value = v;
  }
  setResonance(v: number) {
    this.resonance = v;
    if (this.busFilter) this.busFilter.Q.value = v;
  }
  setDelayMix(v: number) {
    this.delayMix = v;
    if (this.delaySend) this.delaySend.gain.value = v;
  }
  setReverbMix(v: number) {
    this.reverbMix = v;
    if (this.reverbSend) this.reverbSend.gain.value = v;
  }
  setBassLevel(v: number) { this.bassLevel = v; }

  getLevels(): { l: number; r: number } {
    if (!this.analyser) return { l: 0, r: 0 };
    const arr = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(arr);
    let peak = 0;
    for (let i = 0; i < arr.length; i++) {
      const v = Math.abs(arr[i] - 128) / 128;
      if (v > peak) peak = v;
    }
    return { l: peak, r: peak * 0.95 };
  }
}

export const engine = new PsyAudioEngine();
