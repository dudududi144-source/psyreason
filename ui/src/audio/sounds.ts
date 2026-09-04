// PsyReason Sound Library v2 - HUNDREDS of presets, procedurally curated
// 3 synth engines for leads (analog / fm / wavetable), 5 bass characters, full drum tuning

export interface SoundPreset { name: string; p: Record<string, any>; }

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const r2 = (r: () => number, a: number, b: number) => a + r() * (b - a);
const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];

const BW = ['Acid', 'Rolling', 'Sub', 'Growl', 'Hypno', 'Punch', 'Twang', 'Deep', 'Night', 'Zen', 'Forest', 'Prog'];
const LW = ['Scream', 'Anthem', 'Pluck', 'Twist', 'Air', 'Acid', 'Rise', 'Hook', 'Stab', 'Echo', 'Bell', 'Siren'];
const PW = ['Blanket', 'Atmos', 'Walls', 'Fog', 'Stack', 'Space', 'Shimmer', 'Drone'];
const KW = ['Thump', 'Punch', 'Round', 'Tight', 'Deep', 'Click', 'Big', 'Soft'];
const HW = ['Classic', 'Tight', 'Loose', 'Metal', 'Soft', 'Busy'];

function buildBass(): SoundPreset[] {
  const out: SoundPreset[] = [];
  const waves = ['sawtooth', 'square'];
  for (let i = 0; i < 160; i++) {
    const r = rng(1000 + i);
    const ch = pick(r, ['pluck', 'flat', 'acid', 'sub', 'growl']);
    const base: any = { pluck: { pluck: 1, sub: 0.3 }, flat: { pluck: 0.25, sub: 0.5 }, acid: { pluck: 0.85, sub: 0.2 }, sub: { pluck: 0.3, sub: 0.95 }, growl: { pluck: 0.6, sub: 0.6 } }[ch];
    out.push({
      name: BW[i % BW.length] + ' Bass ' + String(i + 1).padStart(3, '0'),
      p: { wave: pick(r, waves), cutoff: Math.round(r2(r, 350, 1400)), res: Math.round(r2(r, 2, 15)), drive: +r2(r, 0.2, 0.85).toFixed(2), pluck: +r2(r, base.pluck * 0.7, Math.min(1, base.pluck * 1.3)).toFixed(2), sub: +r2(r, base.sub * 0.7, Math.min(1, base.sub * 1.3)).toFixed(2), glide: ch === 'acid' ? +r2(r, 0.3, 0.6).toFixed(2) : 0 },
    });
  }
  return out;
}

function buildLead(): SoundPreset[] {
  const out: SoundPreset[] = [];
  for (let i = 0; i < 160; i++) {
    const r = rng(5000 + i);
    const engine = pick(r, ['analog', 'analog', 'fm', 'wave']);
    const p: any = {
      cutoff: Math.round(r2(r, 2200, 6000)), res: Math.round(r2(r, 2, 14)),
      decay: +r2(r, 0.12, 0.55).toFixed(2),
      voices: pick(r, [1, 1, 2, 2, 3]), detune: Math.round(r2(r, 4, 20)),
      engine,
    };
    if (engine === 'fm') { p.fmRatio = pick(r, [1.5, 2, 2.5, 3]); p.fmAmt = +r2(r, 0.8, 3).toFixed(2); }
    if (engine === 'wave') { p.wt = +r().toFixed(2); }
    if (engine === 'analog') { p.wave = pick(r, ['sawtooth', 'square', 'triangle']); }
    out.push({ name: LW[i % LW.length] + ' ' + (engine === 'fm' ? 'FM' : engine === 'wave' ? 'WT' : 'AN') + ' ' + String(i + 1).padStart(3, '0'), p });
  }
  return out;
}

function buildPad(): SoundPreset[] {
  const out: SoundPreset[] = [];
  for (let i = 0; i < 80; i++) {
    const r = rng(9000 + i);
    out.push({ name: PW[i % PW.length] + ' ' + String(i + 1).padStart(2, '0'), p: { cutoff: Math.round(r2(r, 500, 2600)), rSend: +r2(r, 0.4, 0.85).toFixed(2) } });
  }
  return out;
}

function buildKick(): SoundPreset[] {
  const out: SoundPreset[] = [];
  for (let i = 0; i < 80; i++) {
    const r = rng(13000 + i);
    out.push({ name: KW[i % KW.length] + ' Kick ' + String(i + 1).padStart(2, '0'), p: { decay: +r2(r, 0.18, 0.42).toFixed(2), punch: +r2(r, 0.25, 0.9).toFixed(2), body: +r2(r, 0.2, 0.8).toFixed(2), subk: +r2(r, 0.3, 0.8).toFixed(2) } });
  }
  return out;
}

function buildHats(): SoundPreset[] {
  const out: SoundPreset[] = [];
  for (let i = 0; i < 60; i++) {
    const r = rng(17000 + i);
    out.push({ name: HW[i % HW.length] + ' Hat ' + String(i + 1).padStart(2, '0'), p: { tone: Math.round(r2(r, 5500, 9500)), metal: +r2(r, 0.2, 0.9).toFixed(2) } });
  }
  return out;
}


const FW = ['Riser', 'Impact', 'Downlift', 'EchoThrow', 'SpaceWash', 'Tunnel', 'Shimmer', 'Void'];
function buildFx(): SoundPreset[] {
  const out: SoundPreset[] = [];
  for (let i = 0; i < 40; i++) {
    const r = rng(21000 + i);
    out.push({ name: FW[i % FW.length] + ' ' + String(i + 1).padStart(2, '0'), p: { delayFb: +r2(r, 0.2, 0.62).toFixed(2), delayTone: Math.round(r2(r, 1500, 6000)), space: +r2(r, 0.5, 1.4).toFixed(2) } });
  }
  return out;
}

const CW = ['Minor Fall', 'Dark Rise', 'Epic', 'Hypno', 'Sunrise', 'Twist', 'Deep', 'Anthemic'];
const MIN = [0, 2, 3, 5, 7, 8, 10]; const PHR = [0, 1, 3, 5, 7, 8, 10]; const MAJ = [0, 2, 4, 5, 7, 9, 11]; const DOR = [0, 2, 3, 5, 7, 9, 10];
function chordAt(scale: number[], root: number, deg: number): number[] {
  const n = scale.length;
  return [0, 2, 4].map((off) => { const d = deg + off; return root + scale[d % n] + Math.floor(d / n) * 12; });
}
function buildChords(): SoundPreset[] {
  const out: SoundPreset[] = [];
  const progs: number[][] = [
    [0, 5, 3, 4], [0, 3, 0, 4], [0, 0, 3, 4], [0, 5, 0, 6], [0, 2, 3, 4], [0, 6, 5, 4], [0, 3, 5, 4], [0, 1, 3, 4],
  ];
  const scales = [MIN, PHR, MAJ, DOR];
  for (let i = 0; i < 48; i++) {
    const r = rng(25000 + i);
    const scale = pick(r, scales);
    const prog = pick(r, progs);
    const shift = Math.floor(r() * 3);
    out.push({ name: CW[i % CW.length] + ' ' + String(i + 1).padStart(2, '0'), p: { chords: prog.map((d) => chordAt(scale, 57 + shift, d)) } });
  }
  return out;
}

const GW = ['Straight', 'Swing 16', 'Shuffle', 'Lazy', 'Push', 'Shaker', 'Tight', 'Loose'];
function buildGrooves(): SoundPreset[] {
  const out: SoundPreset[] = [];
  for (let i = 0; i < 36; i++) {
    const r = rng(29000 + i);
    out.push({
      name: GW[i % GW.length] + ' Groove ' + String(i + 1).padStart(2, '0'),
      p: { swing: +r2(r, 0, 0.6).toFixed(2), humanize: +r2(r, 0, 1).toFixed(2), shaker: r() > 0.5 },
    });
  }
  return out;
}
const MW = ['Club Loud', 'Warm', 'Bright', 'Radio', 'Dark Room', 'Festival', 'Punchy', 'Smooth'];
function buildMaster(): SoundPreset[] {
  const out: SoundPreset[] = [];
  for (let i = 0; i < 24; i++) {
    const r = rng(33000 + i);
    out.push({
      name: MW[i % MW.length] + ' ' + String(i + 1).padStart(2, '0'),
      p: { low: +r2(r, -2, 4).toFixed(1), mid: +r2(r, -2, 2).toFixed(1), high: +r2(r, -1, 3).toFixed(1), thresh: Math.round(r2(r, -20, -8)), ratio: +r2(r, 1.5, 4).toFixed(1) },
    });
  }
  return out;
}
export const SOUND_LIB: Record<string, SoundPreset[]> = {
  bass: buildBass(),
  lead: buildLead(),
  pad: buildPad(),
  kick: buildKick(),
  hats: buildHats(),
  fx: buildFx(),
  chords: buildChords(),
  grooves: buildGrooves(),
  master: buildMaster(),
};

export function soundCount(): number {
  return Object.values(SOUND_LIB).reduce((a, l) => a + l.length, 0);
}
