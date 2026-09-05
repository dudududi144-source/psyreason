// PsyReason Sound Library v2 - HUNDREDS of presets, procedurally curated
// 3 synth engines for leads (analog / fm / wavetable), 5 bass characters, full drum tuning

import { buildForms as buildFormsGen } from './generator';

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
  const chars = ['pluck', 'flat', 'acid', 'sub', 'growl'];
  const waves = ['sawtooth', 'square'];
  const BW = ['Rolling', 'Night', 'Acid', 'Sub', 'Growl', 'Hypno', 'Punch', 'Twang', 'Deep', 'Square'];
  const base: Record<string, any> = { pluck: { pluck: 1, sub: 0.3 }, flat: { pluck: 0.25, sub: 0.5 }, acid: { pluck: 0.85, sub: 0.2 }, sub: { pluck: 0.3, sub: 0.95 }, growl: { pluck: 0.6, sub: 0.6 } };
  for (let i = 0; i < 300; i++) {
    const t1 = (i % 10) / 9, t2 = (Math.floor(i / 10) % 10) / 9, t3 = (Math.floor(i / 100) % 3) / 2;
    const ch = chars[i % 5]; const bb = base[ch];
    out.push({
      name: BW[i % BW.length] + ' Bass ' + String(i + 1).padStart(3, '0'),
      p: {
        wave: waves[i % 2],
        ftype: ch === 'acid' && t3 > 0.5 ? 'bp' : 'lp',
        cutoff: Math.round(350 + t1 * 1100),
        res: Math.round(2 + t2 * 13),
        drive: +(0.15 + t3 * 0.7).toFixed(2),
        pluck: +Math.min(1, bb.pluck * (0.7 + t2 * 0.6)).toFixed(2),
        sub: +Math.min(1, bb.sub * (0.7 + t1 * 0.6)).toFixed(2),
        glide: ch === 'acid' ? +(0.2 + t1 * 0.4).toFixed(2) : 0,
      },
    });
  }
  return out;
}
function buildLead(): SoundPreset[] {
  const out: SoundPreset[] = [];
  const engines = ['analog', 'fm', 'wave'];
  const waves = ['sawtooth', 'square', 'triangle'];
  const LW = ['Scream', 'Anthem', 'Pluck', 'Twist', 'Air', 'Acid', 'Rise', 'Hook', 'Stab', 'Echo', 'Bell', 'Siren'];
  for (let i = 0; i < 300; i++) {
    const t1 = (i % 10) / 9, t2 = (Math.floor(i / 10) % 10) / 9, t3 = (Math.floor(i / 100) % 3) / 2;
    const en = engines[i % 3];
    const p: any = {
      engine: en,
      ftype: [0, 0, 1, 2][i % 4],
      sus: t3,
      cutoff: Math.round(2000 + t1 * 4500),
      res: Math.round(2 + t2 * 12),
      decay: +(0.12 + t3 * 0.45).toFixed(2),
      voices: [1, 2, 2, 3][i % 4],
      detune: Math.round(4 + t2 * 16),
      vib: t3 > 0.5 ? 0.5 : 0,
    };
    if (en === 'analog') p.wave = waves[i % 3];
    if (en === 'fm') { p.fmRatio = [1, 1.5, 2, 2.5, 3][i % 5]; p.fmAmt = +(0.8 + t1 * 2.2).toFixed(2); }
    if (en === 'wave') p.wt = +t2.toFixed(2);
    out.push({ name: LW[i % LW.length] + ' ' + (en === 'fm' ? 'FM' : en === 'wave' ? 'WT' : 'AN') + ' ' + String(i + 1).padStart(3, '0'), p });
  }
  return out;
}
function buildPad(): SoundPreset[] {
  const out: SoundPreset[] = [];
  const waves = ['sawtooth', 'triangle', 'sine'];
  const PW = ['Blanket', 'Atmos', 'Walls', 'Fog', 'Stack', 'Space', 'Shimmer', 'Drone', 'Air', 'Velvet'];
  for (let i = 0; i < 200; i++) {
    const r = rng(7000 + i * 131);
    const wv = waves[Math.floor(r() * 3)];
    out.push({
      name: PW[i % PW.length] + ' ' + String(i + 1).padStart(3, '0'),
      p: {
        wave: wv,
        cutoff: Math.round(350 + r() * 2050),
        det: Math.round(4 + r() * 10),
        bright: +(0.65 + r() * 0.5).toFixed(2),
        width: +(0.25 + r() * 0.6).toFixed(2),
        rSend: +(0.3 + r() * 0.35).toFixed(2),
      },
    });
  }
  return out;
}
function buildKick(): SoundPreset[] {
  const out: SoundPreset[] = [];
  const KW = ['Thump', 'Punch', 'Round', 'Tight', 'Deep', 'Click', 'Big', 'Soft', 'Hard', 'Sub'];
  for (let i = 0; i < 160; i++) {
    const t1 = (i % 10) / 9, t2 = (Math.floor(i / 10) % 10) / 9, t3 = (Math.floor(i / 100) % 2);
    out.push({
      name: KW[i % KW.length] + ' Kick ' + String(i + 1).padStart(3, '0'),
      p: { decay: +(0.18 + t1 * 0.24).toFixed(2), punch: +(0.3 + t2 * 0.6).toFixed(2), body: +(0.2 + t3 * 0.6).toFixed(2), subk: +(0.3 + t1 * 0.5).toFixed(2), sat: +(0.2 + t2 * 0.6).toFixed(2) },
    });
  }
  return out;
}
function buildHats(): SoundPreset[] {
  const out: SoundPreset[] = [];
  const HW = ['Classic', 'Tight', 'Loose', 'Metal', 'Soft', 'Busy', 'Airy', 'Dark'];
  for (let i = 0; i < 140; i++) {
    const t1 = (i % 10) / 9, t2 = (Math.floor(i / 10) % 10) / 9;
    out.push({ name: HW[i % HW.length] + ' Hat ' + String(i + 1).padStart(3, '0'), p: { tone: Math.round(5500 + t1 * 4000), metal: +(0.2 + t2 * 0.7).toFixed(2), decay: +t2.toFixed(2) } });
  }
  return out;
}
const FW = ['Riser', 'Impact', 'Downlift', 'EchoThrow', 'SpaceWash', 'Tunnel', 'Shimmer', 'Void'];
function buildFx(): SoundPreset[] {
  const out: SoundPreset[] = [];
  for (let i = 0; i < 120; i++) {
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
  for (let i = 0; i < 120; i++) {
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
  for (let i = 0; i < 72; i++) {
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
  for (let i = 0; i < 48; i++) {
    const r = rng(33000 + i);
    out.push({
      name: MW[i % MW.length] + ' ' + String(i + 1).padStart(2, '0'),
      p: { low: +r2(r, -2, 4).toFixed(1), mid: +r2(r, -2, 2).toFixed(1), high: +r2(r, -1, 3).toFixed(1), thresh: Math.round(r2(r, -20, -8)), ratio: +r2(r, 1.5, 4).toFixed(1) },
    });
  }
  return out;
}

const KW2 = ['Full Kit', 'Tight Kit', 'Round Kit', 'Hard Kit', 'Soft Kit', 'Club Kit', 'Forest Kit', 'Goa Kit'];
function buildKits(): SoundPreset[] {
  const out: SoundPreset[] = [];
  for (let i = 0; i < 48; i++) {
    const r = rng(37000 + i);
    out.push({
      name: KW2[i % KW2.length] + ' ' + String(i + 1).padStart(2, '0'),
      p: {
        kick: { decay: +r2(r, 0.2, 0.4).toFixed(2), punch: +r2(r, 0.3, 0.9).toFixed(2), body: +r2(r, 0.2, 0.8).toFixed(2), subk: +r2(r, 0.3, 0.8).toFixed(2) },
        hats: { tone: Math.round(r2(r, 6000, 9000)), metal: +r2(r, 0.2, 0.8).toFixed(2) },
        clap: r() > 0.6, shaker: r() > 0.5,
      },
    });
  }
  return out;
}
const KN = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
function buildKeys(): SoundPreset[] {
  const out: SoundPreset[] = [];
  const modes = ['Minor', 'Phrygian', 'Harmonic', 'Dorian', 'Major'];
  for (let i = 0; i < 48; i++) {
    const shift = (i % 12) - 0;
    out.push({ name: KN[i % 12] + ' ' + modes[Math.floor(i / 12) % modes.length], p: { shift: shift > 5 ? shift - 12 : shift } });
  }
  return out;
}

const AW = ['Up Runner', 'Down Fall', 'Up-Down Wave', 'Random Spark', 'Pump 16', 'Octave Jump'];
function buildArp(): SoundPreset[] {
  const out: SoundPreset[] = [];
  const modes = ['up', 'down', 'updown', 'random'];
  for (let i = 0; i < 48; i++) {
    const r = rng(41000 + i);
    out.push({
      name: AW[i % AW.length] + ' ' + String(i + 1).padStart(2, '0'),
      p: { mode: modes[Math.floor(r() * modes.length)], rate: r() > 0.5 ? 0.25 : 0.5 },
    });
  }
  return out;
}

const SW = ['Pump Light', 'Pump Heavy', 'Tight Duck', 'Deep Suck', 'Groove Pump', 'Sub Duck'];
function buildSidechain(): SoundPreset[] {
  const out: SoundPreset[] = [];
  for (let i = 0; i < 24; i++) {
    const r = rng(45000 + i);
    out.push({ name: SW[i % SW.length] + ' ' + String(i + 1).padStart(2, '0'), p: { depth: +r2(r, 0.4, 0.95).toFixed(2) } });
  }
  return out;
}
const AW2 = ['Deep Space', 'Temple Wind', 'Sub Air', 'Night Drone', 'Cave Echo', 'Aurora'];
function buildAtmos(): SoundPreset[] {
  const out: SoundPreset[] = [];
  for (let i = 0; i < 24; i++) {
    const r = rng(49000 + i);
    out.push({ name: AW2[i % AW2.length] + ' ' + String(i + 1).padStart(2, '0'), p: { level: +r2(r, 0.03, 0.09).toFixed(3), ratio: pick(r, [0.5, 1, 1.5, 2]) } });
  }
  return out;
}

const BPW = ['Rolling', 'Offbeat Bounce', 'KBB Punch', 'Hypnotic 16', 'Driving 8'];
function buildBassPat(): SoundPreset[] {
  const out: SoundPreset[] = [];
  const styles = ['rolling', 'offbeat', 'kbb', 'hypnotic', 'driving'];
  for (let i = 0; i < 48; i++) {
    const r = rng(53000 + i);
    out.push({ name: BPW[i % BPW.length] + ' ' + String(i + 1).padStart(2, '0'), p: { style: styles[Math.floor(r() * styles.length)], density: +r2(r, 0.7, 1).toFixed(2) } });
  }
  return out;
}
const DPW = ['Offbeat Hats', 'Busy Hats', 'Sparse Air', 'Shuffle Hats'];
function buildDrumPat(): SoundPreset[] {
  const out: SoundPreset[] = [];
  const hs = ['offbeat', 'busy', 'sparse', 'shuffle'];
  for (let i = 0; i < 48; i++) {
    const r = rng(57000 + i);
    out.push({ name: DPW[i % DPW.length] + ' ' + String(i + 1).padStart(2, '0'), p: { hatStyle: hs[Math.floor(r() * hs.length)], openPos: pick(r, [8, 12, 14]) } });
  }
  return out;
}
const HW2 = ['Rising Hook', 'Falling Hook', 'Wave Hook', 'Jump Hook', 'Anthem Hook'];
function buildHooks(): SoundPreset[] {
  const out: SoundPreset[] = [];
  const ms = ['rising', 'falling', 'wave', 'jump', 'anthem'];
  for (let i = 0; i < 48; i++) {
    out.push({ name: HW2[i % HW2.length] + ' ' + String(i + 1).padStart(2, '0'), p: { motif: ms[i % ms.length] } });
  }
  return out;
}
const TW = ['Short Roll', 'Long Roll', 'Open Into Drop', 'Soft Roll', 'Hard Roll'];
function buildTrans(): SoundPreset[] {
  const out: SoundPreset[] = [];
  for (let i = 0; i < 36; i++) {
    const r = rng(61000 + i);
    out.push({ name: TW[i % TW.length] + ' ' + String(i + 1).padStart(2, '0'), p: { rollLen: pick(r, [4, 6, 8]), openIntoDrop: r() > 0.5, rollVel: +r2(r, 0.7, 1.2).toFixed(2) } });
  }
  return out;
}
const F_FULL = ['kick', 'bass', 'hats', 'open', 'lead', 'pad'];
const F_GROOVE = ['kick', 'bass', 'hats'];
const F_AIR = ['lead', 'pad'];
const F_MIN = ['kick', 'hats'];
const F_BUILD = ['kick', 'bass', 'hats', 'open', 'lead'];
const FS = (name: string, bars: number, active: string[]) => ({ name, bars, active });
function buildForms(): SoundPreset[] {
  const T: [string, any[]][] = [
    ['Classic Full-On', [FS('INTRO', 8, F_GROOVE), FS('BUILD', 4, F_BUILD), FS('DROP', 24, F_FULL), FS('BREAK', 16, F_AIR), FS('BUILD 2', 4, F_BUILD), FS('DROP 2', 24, F_FULL), FS('OUTRO', 8, F_MIN)]],
    ['Peak Time Club', [FS('DROP', 32, F_FULL), FS('BREAK', 16, F_AIR), FS('DROP 2', 32, F_FULL), FS('OUTRO', 8, F_MIN)]],
    ['Progressive Journey', [FS('INTRO', 16, F_GROOVE), FS('BUILD', 8, F_BUILD), FS('DROP', 32, F_FULL), FS('BREAK', 24, F_AIR), FS('BUILD 2', 8, F_BUILD), FS('DROP 2', 32, F_FULL), FS('OUTRO', 16, F_MIN)]],
    ['Morning Uplift', [FS('INTRO', 8, F_AIR), FS('BUILD', 4, F_BUILD), FS('DROP', 24, F_FULL), FS('BREAK', 16, F_AIR), FS('BUILD 2', 4, F_BUILD), FS('DROP 2', 32, F_FULL), FS('OUTRO', 8, F_AIR)]],
    ['Dark Hypnotic', [FS('INTRO', 16, F_GROOVE), FS('DROP', 48, F_FULL), FS('BREAK', 16, F_AIR), FS('DROP 2', 48, F_FULL), FS('OUTRO', 8, F_MIN)]],
    ['Radio Edit', [FS('INTRO', 4, F_GROOVE), FS('BUILD', 4, F_BUILD), FS('DROP', 16, F_FULL), FS('BREAK', 8, F_AIR), FS('BUILD 2', 4, F_BUILD), FS('DROP 2', 16, F_FULL), FS('OUTRO', 4, F_MIN)]],
    ['Afterhours Deep', [FS('INTRO', 16, F_AIR), FS('BUILD', 8, F_BUILD), FS('DROP', 32, F_FULL), FS('BREAK', 24, F_AIR), FS('DROP 2', 32, F_FULL), FS('OUTRO', 16, F_AIR)]],
    ['Double Drop', [FS('INTRO', 8, F_GROOVE), FS('BUILD', 4, F_BUILD), FS('DROP', 16, F_FULL), FS('MID', 8, F_GROOVE), FS('DROP 2', 16, F_FULL), FS('BREAK', 16, F_AIR), FS('DROP 3', 24, F_FULL), FS('OUTRO', 8, F_MIN)]],
    ['Minimal Tool', [FS('INTRO', 16, F_MIN), FS('DROP', 32, F_GROOVE), FS('BREAK', 16, F_AIR), FS('DROP 2', 32, F_GROOVE), FS('OUTRO', 16, F_MIN)]],
    ['Uplifting Anthem', [FS('INTRO', 8, F_AIR), FS('BUILD', 8, F_BUILD), FS('DROP', 24, F_FULL), FS('BREAK', 24, F_AIR), FS('BUILD 2', 8, F_BUILD), FS('DROP 2', 32, F_FULL), FS('OUTRO', 8, F_AIR)]],
    ['Forest Ritual', [FS('INTRO', 16, F_GROOVE), FS('BUILD', 4, F_BUILD), FS('DROP', 32, F_FULL), FS('BREAK', 24, F_AIR), FS('DROP 2', 32, F_FULL), FS('OUTRO', 16, F_MIN)]],
    ['Goa Ceremony', [FS('INTRO', 16, F_AIR), FS('BUILD', 8, F_BUILD), FS('DROP', 32, F_FULL), FS('BREAK', 24, F_AIR), FS('BUILD 2', 8, F_BUILD), FS('DROP 2', 32, F_FULL), FS('OUTRO', 16, F_AIR)]],
    ['Psycore Blast', [FS('INTRO', 4, F_GROOVE), FS('DROP', 24, F_FULL), FS('BREAK', 8, F_AIR), FS('DROP 2', 24, F_FULL), FS('BREAK 2', 8, F_AIR), FS('DROP 3', 24, F_FULL), FS('OUTRO', 4, F_MIN)]],
    ['Chill Descent', [FS('INTRO', 16, F_AIR), FS('BUILD', 8, F_BUILD), FS('DROP', 24, F_FULL), FS('BREAK', 24, F_AIR), FS('OUTRO', 16, F_AIR)]],
    ['Sunrise Set', [FS('INTRO', 16, F_AIR), FS('BUILD', 8, F_BUILD), FS('DROP', 32, F_FULL), FS('BREAK', 16, F_AIR), FS('BUILD 2', 8, F_BUILD), FS('DROP 2', 40, F_FULL), FS('OUTRO', 16, F_AIR)]],
    ['Warehouse Loop', [FS('DROP', 48, F_GROOVE), FS('BREAK', 16, F_AIR), FS('DROP 2', 48, F_GROOVE), FS('OUTRO', 8, F_MIN)]],
  ];
  return T.map(([name, form]) => ({ name: 'FORM • ' + name, p: { form } }));
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
  kits: buildKits(),
  keys: buildKeys(),
  arp: buildArp(),
  sidechain: buildSidechain(),
  atmos: buildAtmos(),
  basspat: buildBassPat(),
  drumpat: buildDrumPat(),
  hooks: buildHooks(),
  transitions: buildTrans(),
  form: buildFormsGen(),
};

export function soundCount(): number {
  return Object.values(SOUND_LIB).reduce((a, l) => a + l.length, 0);
}
