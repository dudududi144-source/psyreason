// PsyReason Audio Engine v2 - NOW POWERED BY THE REAL DEVICE CODE
// drums = Kong, bass/lead = Thor, pad = Europa, fx = Phaser/Delay/Reverb from devices/effects

import { renderThor, renderEuropa, renderMalstrom, renderKong, makeFxChain, mtof, FxChain } from './rack';

export interface PatternData {
  kick: boolean[]; bass: boolean[]; hat: boolean[]; openhat: boolean[];
  lead: (number | null)[]; pad: (number[] | null)[];
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
  sendFx: GainNode | null = null;
  fxProc: ScriptProcessorNode | null = null;
  fx: FxChain | null = null;

  running = false;
  bpm = 145;
  step = 0;
  nextTime = 0;
  timer: number | null = null;
  pattern: PatternData = createDefaultPattern();
  cutoff = 6000;
  resonance = 4;
  delayMix = 0.35;
  reverbMix = 0.3;
  bassLevel = 0.85;
  onStep: ((s: number) => void) | null = null;
  private cache = new Map<string, AudioBuffer>();

  async init() {
    if (this.ctx) { await this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC();
    const ctx = this.ctx;

    this.master = ctx.createGain(); this.master.gain.value = 0.85;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 5;
    this.comp.attack.value = 0.003; this.comp.release.value = 0.25;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 512;
    this.master.connect(this.comp); this.comp.connect(this.analyser); this.analyser.connect(ctx.destination);

    // CUTOFF/RESO knob controls this - bass+lead bus
    this.busFilter = ctx.createBiquadFilter();
    this.busFilter.type = 'lowpass';
    this.busFilter.frequency.value = this.cutoff;
    this.busFilter.Q.value = this.resonance;
    this.busFilter.connect(this.master);

    // REAL effects from devices/effects, run live per-sample
    this.fx = makeFxChain(ctx.sampleRate);
    this.sendFx = ctx.createGain(); this.sendFx.gain.value = 1;
    this.fxProc = ctx.createScriptProcessor(1024, 2, 2);
    const fx = this.fx;
    const self = this;
    this.fxProc.onaudioprocess = (e) => {
      const iL = e.inputBuffer.getChannelData(0);
      const iR = e.inputBuffer.getChannelData(1);
      const oL = e.outputBuffer.getChannelData(0);
      const oR = e.outputBuffer.getChannelData(1);
      for (let i = 0; i < oL.length; i++) {
        const p = fx.phaser.process(iL[i], iR[i]);
        const d = fx.delay.process(iL[i], iR[i]);
        const r = fx.reverb.process(iL[i], iR[i]);
        oL[i] = p[0] * 0.35 + d[0] * self.delayMix + r[0] * self.reverbMix;
        oR[i] = p[1] * 0.35 + d[1] * self.delayMix + r[1] * self.reverbMix;
      }
    };
    this.sendFx.connect(this.fxProc);
    this.fxProc.connect(this.master);
  }

  private toBuffer(key: string, render: () => Float32Array): AudioBuffer {
    const hit = this.cache.get(key);
    if (hit) return hit;
    const data = render();
    const buf = this.ctx!.createBuffer(1, data.length, this.ctx!.sampleRate);
    buf.getChannelData(0).set(data);
    this.cache.set(key, buf);
    return buf;
  }

  private play(buf: AudioBuffer, t: number, gain: number, dest: AudioNode, alsoFx: boolean) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(g); g.connect(dest);
    if (alsoFx) { g.connect(this.sendFx!); }
    src.start(t);
  }

  // device buffers (cached)
  private kickBuf() { return this.toBuffer('kong-kick', () => renderKong(this.ctx!.sampleRate, 0)); }
  private hatBuf() { return this.toBuffer('kong-hat', () => renderKong(this.ctx!.sampleRate, 4)); }
  private openBuf() { return this.toBuffer('kong-open', () => renderKong(this.ctx!.sampleRate, 5)); }
  private bassBuf() { return this.toBuffer('thor-bass', () => renderThor(this.ctx!.sampleRate, 33, 0.24, 0.2, 1)); }
  private leadBuf(midi: number) { return this.toBuffer('thor-lead-' + midi, () => renderThor(this.ctx!.sampleRate, midi, 0.5, 0.32, 2)); }
  private padBuf(chord: number[]) {
    return this.toBuffer('europa-pad-' + chord.join('.'), () => {
      const sr = this.ctx!.sampleRate;
      const parts = chord.map((m) => renderEuropa(sr, m, 1.6, 1.2));
      const n = Math.floor(sr * 1.6);
      const sum = new Float32Array(n);
      for (const p of parts) for (let i = 0; i < n; i++) sum[i] += p[i] * 0.5;
      return sum;
    });
  }
  private malstromBuf(midi: number) { return this.toBuffer('malstrom-' + midi, () => renderMalstrom(this.ctx!.sampleRate, midi, 0.8, 0.5)); }

  scheduleStep(s: number, t: number) {
    const p = this.pattern;
    const m = this.master!;
    const bf = this.busFilter!;
    if (p.kick[s]) this.play(this.kickBuf(), t, 1.0, m, false);
    if (p.bass[s]) this.play(this.bassBuf(), t, this.bassLevel, bf, false);
    if (p.hat[s]) this.play(this.hatBuf(), t, 0.5, m, false);
    if (p.openhat[s]) this.play(this.openBuf(), t, 0.45, m, true);
    if (p.lead[s] !== null) this.play(this.leadBuf(p.lead[s] as number), t, 0.8, bf, true);
    if (p.pad[s] !== null) this.play(this.padBuf(p.pad[s] as number[]), t, 0.5, m, true);
  }

  scheduler = () => {
    const ctx = this.ctx!;
    const stepDur = 60 / this.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.scheduleStep(this.step, this.nextTime);
      const s = this.step;
      const ms = Math.max(0, (this.nextTime - ctx.currentTime) * 1000);
      window.setTimeout(() => { if (this.onStep) this.onStep(s); }, ms);
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

  // TEST buttons in the rack - each device plays through ITS OWN engine
  async testDevice(id: string) {
    await this.init();
    const t = this.ctx!.currentTime + 0.05;
    const m = this.master!;
    if (id === 'thor-bass') { this.play(this.bassBuf(), t, 1, this.busFilter!, false); this.play(this.bassBuf(), t + 0.21, 1, this.busFilter!, false); this.play(this.bassBuf(), t + 0.42, 1, this.busFilter!, false); }
    if (id === 'thor-lead') { [69, 70, 72, 69].forEach((n2, i) => this.play(this.leadBuf(n2), t + i * 0.16, 0.9, this.busFilter!, true)); }
    if (id === 'europa') this.play(this.padBuf([57, 60, 64]), t, 0.8, m, true);
    if (id === 'malstrom') this.play(this.malstromBuf(69), t, 0.9, m, true);
    if (id === 'kong') { this.play(this.kickBuf(), t, 1, m, false); this.play(this.hatBuf(), t + 0.21, 0.6, m, false); this.play(this.openBuf(), t + 0.42, 0.5, m, true); }
  }

  // keyboard plays Thor lead
  async playNote(midi: number) {
    await this.init();
    this.play(this.leadBuf(midi), this.ctx!.currentTime + 0.02, 0.9, this.busFilter!, true);
  }

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

  setBpm(v: number) { this.bpm = Math.max(60, Math.min(200, v)); }
  setCutoff(v: number) { this.cutoff = v; if (this.busFilter) this.busFilter.frequency.value = v; }
  setResonance(v: number) { this.resonance = v; if (this.busFilter) this.busFilter.Q.value = v; }
  setDelayMix(v: number) { this.delayMix = v; }
  setReverbMix(v: number) { this.reverbMix = v; }
  setBassLevel(v: number) { this.bassLevel = v; }
}

export const engine = new PsyAudioEngine();
