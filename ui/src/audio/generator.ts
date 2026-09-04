// PsyReason Generator v3 - full style library
// 10 styles x sub-styles x 4 sessions, each sub-style has its own SOUND (timbre).

import { SongData, Section, TrackId } from './engine';

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];

export interface SubStyle {
  bassChar: string; leadChar: string; drumChar: string; clap: boolean;
  id: string; name: string; bpm: number; scale: number[];
  bassStyle: string; bassWave: string; bassCut: number; bassRes: number; bassDrive: number;
  leadWave: string; leadCut: number; leadRes: number; leadDecay: number;
  kickDecay: number; punch: number; hatTone: number; kickMode: string;
  leadDensity: number; leadLeap: number; hatBusy: number; openProb: number; padProb: number;
  desc: string;
}
export interface StyleDef { id: string; name: string; color: string; desc: string; family: string; subs: SubStyle[]; }
export const FAMILIES = ['PSY MAIN', 'GOA & CLASSICS', 'DARK', 'HYPNOTIC', 'CHILL', 'TRANCE', 'TECH', 'WILD'];

const PHR = [0, 1, 3, 5, 7, 8, 10];
const MIN = [0, 2, 3, 5, 7, 8, 10];
const HARM = [0, 1, 4, 5, 7, 8, 10];
const DOR = [0, 2, 3, 5, 7, 9, 10];
const MAJ = [0, 2, 4, 5, 7, 9, 11];

function sub(o: any): SubStyle {
  return { scale: PHR, bassStyle: 'rolling', bassWave: 'sawtooth', bassCut: 900, bassRes: 6, bassDrive: 0.4,
    leadWave: 'sawtooth', leadCut: 4200, leadRes: 5, leadDecay: 0.3, kickDecay: 0.28, punch: 0.5, hatTone: 7500, kickMode: 'four',
    bassChar: 'pluck', leadChar: 'pluck', drumChar: 'punch', clap: false,
    leadDensity: 0.6, leadLeap: 0.3, hatBusy: 0.5, openProb: 0.7, padProb: 0.6, desc: '', ...o };
}

export const STYLES: StyleDef[] = [
  { id: 'fullon', name: 'FULL-ON', color: '#00ff88', family: 'PSY MAIN', desc: 'driving 145-ish energy', subs: [
    sub({ id: 'classic', name: 'Classic Full-On', bpm: 145, leadDensity: 0.7, desc: 'the standard rolling sound' }),
    sub({ id: 'night', name: 'Night Full-On', bpm: 148, bassChar: 'growl', leadChar: 'twist', bassCut: 700, bassDrive: 0.6, leadRes: 8, leadDensity: 0.6, padProb: 0.4, desc: 'darker edge, harder drive' }),
    sub({ id: 'melodic', name: 'Melodic Full-On', bpm: 143, scale: MIN, bassChar: 'flat', leadChar: 'super', drumChar: 'round', leadDensity: 0.8, leadLeap: 0.4, padProb: 0.9, leadCut: 5200, desc: 'big melodic hooks + pads' }),
  ]},
  { id: 'goa', name: 'GOA', color: '#ff8800', family: 'GOA & CLASSICS', desc: 'acid psychedelic roots', subs: [
    sub({ id: 'classic', name: 'Classic Goa', bpm: 140, scale: HARM, bassChar: 'acid', leadChar: 'acid', drumChar: 'round', leadRes: 9, leadCut: 3800, leadLeap: 0.45, desc: '303 acid lines, harmonic scale' }),
    sub({ id: 'morning', name: 'Morning Goa', bpm: 144, scale: MAJ, leadChar: 'super', leadDensity: 0.7, padProb: 0.8, leadWave: 'square', desc: 'uplifting major morning energy' }),
    sub({ id: 'acid', name: 'Acid Goa', bpm: 138, scale: HARM, bassChar: 'acid', leadChar: 'acid', leadRes: 14, leadCut: 3000, bassRes: 10, bassDrive: 0.7, desc: 'screaming resonance acid' }),
  ]},
  { id: 'dubpsy', name: 'DUB PSY', color: '#88ccaa', family: 'PSY MAIN', desc: 'spaced dub echoes 140s', subs: [
    sub({ id: 'dubpsy', name: 'Dub Psy', bpm: 140, bassChar: 'flat', leadChar: 'air', drumChar: 'round', leadDensity: 0.3, padProb: 0.6, leadWave: 'triangle', hatBusy: 0.3, desc: 'echo-heavy spacious' }),
    sub({ id: 'dubforest', name: 'Dub Forest', bpm: 146, scale: DOR, bassChar: 'growl', leadChar: 'twist', drumChar: 'round', bassStyle: 'kbb', leadDensity: 0.35, padProb: 0.4, desc: 'forest with dub space' }),
  ]},
  { id: 'morning', name: 'MORNING', color: '#ffee66', family: 'PSY MAIN', desc: 'euphoric sunrise', subs: [
    sub({ id: 'morningtrance', name: 'Morning Trance', bpm: 142, scale: MAJ, bassChar: 'flat', leadChar: 'super', clap: true, leadDensity: 0.75, padProb: 0.9, leadCut: 5600, desc: 'hands-up euphoria' }),
    sub({ id: 'sunrise', name: 'Sunrise Anthem', bpm: 144, scale: MAJ, bassChar: 'flat', leadChar: 'super', clap: true, leadDensity: 0.8, leadLeap: 0.4, padProb: 1, leadWave: 'square', desc: 'peak sunrise moment' }),
  ]},
  { id: 'dark', name: 'DARK PSY', color: '#8866ff', family: 'DARK', desc: 'phrygian tension 150+', subs: [
    sub({ id: 'dark', name: 'Dark', bpm: 150, bassChar: 'growl', leadChar: 'twist', drumChar: 'hard', leadDensity: 0.4, leadLeap: 0.55, padProb: 0.3, bassStyle: 'kbb', desc: 'twisted sparse leads' }),
    sub({ id: 'twilight', name: 'Twilight', bpm: 147, scale: DOR, bassChar: 'flat', leadChar: 'air', drumChar: 'round', padProb: 0.5, leadDensity: 0.5, desc: 'dusk atmosphere, modal' }),
    sub({ id: 'abyss', name: 'Abyss', bpm: 154, bassChar: 'sub', leadChar: 'twist', drumChar: 'hard', bassCut: 600, bassDrive: 0.8, leadRes: 10, leadDensity: 0.35, padProb: 0.2, desc: 'deep driving darkness' }),
  ]},
  { id: 'forest', name: 'FOREST', color: '#66cc66', family: 'DARK', desc: 'modal darkness 150s', subs: [
    sub({ id: 'forest', name: 'Forest', bpm: 152, scale: DOR, bassChar: 'growl', leadChar: 'twist', bassStyle: 'kbb', leadDensity: 0.45, padProb: 0.4, desc: 'echoing forest motifs' }),
    sub({ id: 'darkforest', name: 'Dark Forest', bpm: 158, scale: PHR, bassChar: 'sub', leadChar: 'twist', drumChar: 'hard', bassCut: 650, leadRes: 9, padProb: 0.3, desc: 'deeper, harder forest' }),
  ]},
  { id: 'zenone', name: 'ZENONE', color: '#7788ff', family: 'HYPNOTIC', desc: 'mid-tempo dark 128-132', subs: [
    sub({ id: 'zenone', name: 'Zenone', bpm: 132, bassChar: 'growl', leadChar: 'twist', drumChar: 'round', bassStyle: 'hypnotic', bassCut: 700, bassRes: 8, leadDensity: 0.4, padProb: 0.5, desc: 'dark mid-tempo pulse' }),
    sub({ id: 'darkprog', name: 'Dark Prog', bpm: 128, bassChar: 'flat', leadChar: 'air', drumChar: 'soft', bassStyle: 'offbeat', leadDensity: 0.25, padProb: 0.6, bassCut: 650, desc: 'slow burning darkness' }),
  ]},
  { id: 'psychill', name: 'PSYCHILL', color: '#66ccff', family: 'CHILL', desc: 'downtempo 85-100', subs: [
    sub({ id: 'chill', name: 'Psychill', bpm: 95, scale: MIN, bassChar: 'sub', leadChar: 'air', drumChar: 'soft', bassStyle: 'offbeat', leadDensity: 0.4, leadWave: 'triangle', padProb: 1, kickDecay: 0.35, punch: 0.3, hatTone: 6000, desc: 'relaxed floating' }),
    sub({ id: 'ambient', name: 'Ambient Psy', bpm: 85, bassChar: 'sub', leadChar: 'air', drumChar: 'soft', bassStyle: 'offbeat', leadDensity: 0.3, padProb: 1, hatBusy: 0.1, openProb: 0.3, desc: 'beatless-ish textures' }),
    sub({ id: 'dubchill', name: 'Dub Chill', bpm: 90, scale: DOR, bassChar: 'sub', leadChar: 'air', drumChar: 'soft', kickMode: 'half', bassStyle: 'driving', padProb: 0.9, desc: 'dubbed half-time space' }),
  ]},
  { id: 'uplifting', name: 'UPLIFTING', color: '#ff99cc', family: 'TRANCE', desc: 'trance euphoria 138-140', subs: [
    sub({ id: 'uplifting', name: 'Uplifting Trance', bpm: 138, scale: MAJ, bassChar: 'flat', leadChar: 'super', clap: true, leadDensity: 0.7, padProb: 1, leadCut: 5600, desc: 'soaring supersaws' }),
    sub({ id: 'anthem', name: 'Anthem', bpm: 140, scale: MAJ, bassChar: 'flat', leadChar: 'super', clap: true, leadDensity: 0.8, leadLeap: 0.4, padProb: 1, leadWave: 'square', desc: 'festival anthem energy' }),
  ]},
  { id: 'classictrance', name: 'CLASSIC TRANCE', color: '#99ccff', family: 'GOA & CLASSICS', desc: '90s trance 136-142', subs: [
    sub({ id: 'classic', name: 'Classic Trance', bpm: 136, scale: MAJ, bassChar: 'flat', leadChar: 'air', drumChar: 'round', leadWave: 'triangle', padProb: 1, leadDensity: 0.6, desc: '90s emotional lines' }),
    sub({ id: 'euro', name: 'Euro Trance', bpm: 142, scale: MAJ, bassChar: 'flat', leadChar: 'super', clap: true, leadDensity: 0.75, leadCut: 5200, padProb: 0.9, desc: 'euro dance energy' }),
  ]},
  { id: 'psytech', name: 'PSY-TECH', color: '#aaaacc', family: 'HYPNOTIC', desc: 'techy groove 130s', subs: [
    sub({ id: 'psytech', name: 'Psy-Tech', bpm: 136, scale: MIN, bassChar: 'flat', leadChar: 'pluck', bassStyle: 'offbeat', leadDensity: 0.3, bassWave: 'square', bassCut: 800, hatBusy: 0.6, desc: 'minimal tech groove' }),
    sub({ id: 'minimaltech', name: 'Minimal Tech', bpm: 130, bassChar: 'flat', leadChar: 'pluck', drumChar: 'soft', bassStyle: 'hypnotic', leadDensity: 0.2, hatBusy: 0.4, padProb: 0.4, bassCut: 700, desc: 'hypnotic 16th pulse' }),
  ]},
  { id: 'acidtechno', name: 'ACID TECHNO', color: '#ccff00', family: 'TECH', desc: '303 warehouse 140-150', subs: [
    sub({ id: 'acidtechno', name: 'Acid Techno', bpm: 140, bassChar: 'acid', leadChar: 'acid', bassWave: 'square', leadRes: 15, leadCut: 2800, bassDrive: 0.7, bassRes: 10, desc: 'relentless 303 squelch' }),
    sub({ id: 'rave', name: 'Rave', bpm: 150, bassChar: 'acid', leadChar: 'pluck', drumChar: 'hard', clap: true, hatBusy: 0.8, openProb: 0.9, leadWave: 'square', leadRes: 8, desc: 'stabs + sirens energy' }),
  ]},
  { id: 'hitech', name: 'HI-TECH', color: '#ff2bd6', family: 'WILD', desc: 'frantic 165+', subs: [
    sub({ id: 'hitech', name: 'Hi-Tech', bpm: 165, leadChar: 'twist', drumChar: 'hard', leadDensity: 0.85, leadLeap: 0.6, hatBusy: 0.8, desc: 'wild fast squiggles' }),
    sub({ id: 'psycore', name: 'Psycore', bpm: 175, bassChar: 'growl', leadChar: 'twist', drumChar: 'hard', bassStyle: 'kbb', bassDrive: 0.9, leadDensity: 0.7, leadLeap: 0.7, kickDecay: 0.22, desc: 'extreme speed aggression' }),
    sub({ id: 'darkhitech', name: 'Dark Hi-Tech', bpm: 170, scale: PHR, bassChar: 'sub', leadChar: 'twist', drumChar: 'hard', bassCut: 650, leadRes: 11, padProb: 0.2, desc: 'fast + dark' }),
  ]},
  { id: 'suomi', name: 'SUOMI', color: '#ffcc00', family: 'WILD', desc: 'playful weird 140s', subs: [
    sub({ id: 'suomisaundi', name: 'Suomisaundi', bpm: 145, scale: MAJ, leadChar: 'twist', drumChar: 'breaky', clap: true, leadLeap: 0.7, leadDensity: 0.65, leadWave: 'square', desc: 'freeform playful melodies' }),
    sub({ id: 'freeform', name: 'Freeform', bpm: 150, scale: DOR, bassChar: 'growl', leadChar: 'twist', drumChar: 'breaky', clap: true, leadLeap: 0.8, hatBusy: 0.7, desc: 'anything goes' }),
  ]},
  { id: 'psybreaks', name: 'PSY BREAKS', color: '#ffaa88', family: 'WILD', desc: 'broken beat psy 150', subs: [
    sub({ id: 'breaks', name: 'Psy Breaks', bpm: 150, kickMode: 'breaks', bassChar: 'growl', leadChar: 'twist', drumChar: 'breaky', clap: true, bassStyle: 'driving', leadDensity: 0.5, hatBusy: 0.6, desc: 'broken beat psychedelia' }),
  ]},
  { id: 'nightpsy', name: 'NIGHT PSY', color: '#5566ff', family: 'DARK', desc: 'deep night drive 148-150', subs: [
    sub({ id: 'deepnight', name: 'Deep Night', bpm: 148, bassChar: 'sub', leadChar: 'twist', drumChar: 'hard', bassCut: 650, leadDensity: 0.4, padProb: 0.3, desc: 'sub-heavy night drive' }),
    sub({ id: 'predator', name: 'Predator', bpm: 150, bassChar: 'growl', leadChar: 'twist', drumChar: 'hard', bassRes: 9, leadRes: 10, leadDensity: 0.45, desc: 'hunting dark energy' }),
  ]},
  { id: 'goatech', name: 'GOA TECH', color: '#ddaa00', family: 'TECH', desc: 'goa meets techno 140-144', subs: [
    sub({ id: 'goatech', name: 'Goa Tech', bpm: 140, scale: HARM, bassChar: 'acid', leadChar: 'acid', bassStyle: 'hypnotic', bassWave: 'square', leadDensity: 0.35, desc: 'hypnotic acid techno' }),
    sub({ id: 'warehouse', name: 'Warehouse', bpm: 144, bassChar: 'acid', leadChar: 'pluck', drumChar: 'hard', clap: true, bassDrive: 0.8, leadDensity: 0.3, desc: 'dark warehouse rave' }),
  ]},
  { id: 'psycore', name: 'PSYCORE', color: '#ff0055', family: 'WILD', desc: 'extreme 178-182', subs: [
    sub({ id: 'core', name: 'Core', bpm: 178, bassChar: 'growl', leadChar: 'twist', drumChar: 'hard', bassStyle: 'kbb', bassDrive: 0.95, leadDensity: 0.7, leadLeap: 0.7, kickDecay: 0.2, desc: 'relentless core speed' }),
    sub({ id: 'speedball', name: 'Speedball', bpm: 182, bassChar: 'growl', leadChar: 'twist', drumChar: 'hard', bassStyle: 'kbb', hatBusy: 0.9, leadDensity: 0.8, desc: 'maximum velocity' }),
  ]},
  { id: 'ambientpsy', name: 'AMBIENT PSY', color: '#88ddee', family: 'CHILL', desc: 'beatless depths 78-84', subs: [
    sub({ id: 'deepambient', name: 'Deep Ambient', bpm: 78, bassChar: 'sub', leadChar: 'air', drumChar: 'soft', kickMode: 'half', bassStyle: 'driving', leadDensity: 0.25, padProb: 1, hatBusy: 0.05, openProb: 0.2, desc: 'oceanic depths' }),
    sub({ id: 'floating', name: 'Floating', bpm: 84, scale: DOR, bassChar: 'sub', leadChar: 'air', drumChar: 'soft', kickMode: 'half', leadDensity: 0.35, padProb: 1, desc: 'weightless floating' }),
  ]},
  { id: 'upliftinggoa', name: 'UPLIFTING GOA', color: '#ffbb44', family: 'TRANCE', desc: 'euphoric goa 141-143', subs: [
    sub({ id: 'sunrisegoa', name: 'Sunrise Goa', bpm: 141, scale: MAJ, bassChar: 'flat', leadChar: 'super', clap: true, leadDensity: 0.75, padProb: 0.9, leadCut: 5400, desc: 'goa sunrise euphoria' }),
    sub({ id: 'euphoria', name: 'Euphoria', bpm: 143, scale: MAJ, bassChar: 'flat', leadChar: 'super', clap: true, leadDensity: 0.8, leadLeap: 0.45, padProb: 1, leadWave: 'square', desc: 'peak-time hands up' }),
  ]},
  { id: 'forestprog', name: 'FOREST PROG', color: '#44aa77', family: 'HYPNOTIC', desc: 'organic hypnotic 134-137', subs: [
    sub({ id: 'greenprog', name: 'Green Prog', bpm: 134, scale: DOR, bassChar: 'flat', leadChar: 'air', drumChar: 'round', bassStyle: 'hypnotic', leadDensity: 0.3, padProb: 0.6, desc: 'organic forest groove' }),
    sub({ id: 'mossy', name: 'Mossy', bpm: 137, scale: DOR, bassChar: 'growl', leadChar: 'twist', drumChar: 'round', bassStyle: 'hypnotic', leadDensity: 0.35, padProb: 0.5, desc: 'deep mossy textures' }),
  ]},
];



export const SESSIONS_PER_SUB = 8;

export function styleById(id: string): StyleDef { return STYLES.find((s) => s.id === id) || STYLES[0]; }
export function subById(styleId: string, subId: string): SubStyle {
  const st = styleById(styleId);
  return st.subs.find((s) => s.id === subId) || st.subs[0];
}
export function sessionSeed(subId: string, session: number): number {
  let h = 2166136261;
  for (let i = 0; i < subId.length; i++) { h ^= subId.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) + session * 104729 + 13;
}

const LEAD_ROOT = 69;

function genLead(rng: () => number, st: SubStyle): (number | null)[] {
  const lead: (number | null)[] = Array(16).fill(null);
  let deg = Math.floor(rng() * 3);
  for (let i = 0; i < 16; i++) {
    const prob = i % 4 === 0 ? 0.9 : st.leadDensity;
    if (rng() < prob) {
      const leap = rng() < st.leadLeap;
      const move = leap ? pick(rng, [-3, -2, 2, 3, 4]) : (rng() < 0.5 ? 1 : -1);
      deg = Math.max(0, Math.min(st.scale.length * 2 - 1, deg + move));
      lead[i] = LEAD_ROOT + st.scale[deg % st.scale.length] + Math.floor(deg / st.scale.length) * 12;
    }
  }
  if (lead[0] === null) lead[0] = LEAD_ROOT;
  if (rng() < 0.85) lead[15] = LEAD_ROOT + pick(rng, [0, 7, 12]);
  return lead;
}

function genBass(rng: () => number, st: SubStyle): { on: boolean; semi: number }[] {
  const vars = st.scale === HARM ? [0, 0, 3, 8, 7] : st.scale === PHR ? [0, 0, 1, 6] : [0, 0, 0, 1, 3, 5, 7];
  const bass: { on: boolean; semi: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const isKick = i % 4 === 0;
    let on = false;
    if (st.bassStyle === 'rolling') on = !isKick || rng() < 0.15;
    if (st.bassStyle === 'offbeat') on = i % 4 === 2 || (i % 2 === 1 && rng() < 0.3);
    if (st.bassStyle === 'kbb') on = i % 4 === 2 || i % 4 === 3;
    if (st.bassStyle === 'hypnotic') on = true;
    if (st.bassStyle === 'driving') on = i % 2 === 0;
    let semi = 0;
    if (i >= 12 && rng() < 0.6) semi = pick(rng, vars);
    else if (rng() < 0.12) semi = pick(rng, vars);
    bass.push({ on, semi });
  }
  return bass;
}

function genDrums(rng: () => number, st: SubStyle) {
  const kick = Array(16).fill(false);
  if (st.kickMode === 'breaks') { kick[0] = true; kick[7] = true; kick[10] = true; if (rng() < 0.4) kick[14] = true; }
  else if (st.kickMode === 'half') { kick[0] = true; kick[8] = true; if (rng() < 0.3) kick[14] = true; }
  else { for (let i = 0; i < 16; i += 4) kick[i] = true; if (rng() < 0.3) kick[14] = true; }
  const hats = Array(16).fill(false);
  for (let i = 2; i < 16; i += 4) hats[i] = true;
  if (rng() < st.hatBusy) hats[7] = true;
  if (rng() < st.hatBusy * 0.7) hats[15] = true;
  const open = Array(16).fill(false);
  if (rng() < st.openProb) open[pick(rng, [14, 8, 12])] = true;
  return { kick, hats, open };
}

function chordAt(scale: number[], root: number, deg: number): number[] {
  const n = scale.length;
  return [0, 2, 4].map((off) => { const d = deg + off; return root + scale[d % n] + Math.floor(d / n) * 12; });
}
function genChords(rng: () => number, st: SubStyle): number[][] {
  const roots = st.scale === MAJ ? [0, 3, 4, 5] : st.scale === HARM ? [0, 3, 0, 4] : [0, 0, 3, 4];
  return roots.map((d) => chordAt(st.scale, 57, d));
}

export function generateSongForSub(st: SubStyle, seed: number): SongData {
  const rng = mulberry32(seed);
  const lead = genLead(rng, st); const leadB = genLead(rng, st);
  const bass = genBass(rng, st); const bassB = genBass(rng, st);
  const d = genDrums(rng, st);
  return { kick: d.kick, bass, hats: d.hats, open: d.open, lead, padChord: genChords(rng, st)[0], bassB, leadB, chords: genChords(rng, st) } as SongData;
}

export function generateArrangementForSub(st: SubStyle, seed: number): Section[] {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const all: TrackId[] = ['kick', 'bass', 'hats', 'open', 'lead', 'pad'];
  const intro: TrackId[] = st.padProb > 0.7 ? ['bass', 'hats', 'lead', 'pad'] : ['kick', 'bass', 'hats'];
  const build: TrackId[] = ['kick', 'bass', 'hats', 'open', 'lead'];
  const breakSec: TrackId[] = st.padProb > 0.4 ? ['lead', 'pad'] : ['lead', 'hats'];
  const b1 = pick(rng, [4, 4, 8]); const d1 = pick(rng, [8, 8, 16]); const br = pick(rng, [4, 8]); const d2 = pick(rng, [8, 16]);
  const mid: TrackId[] = ['kick', 'bass', 'hats', 'open'];
  const outro: TrackId[] = ['kick', 'hats'];
  return [
    { name: 'INTRO', bars: b1, active: intro },
    { name: 'BUILD', bars: 4, active: build },
    { name: 'DROP', bars: d1, active: all },
    { name: 'MID', bars: 4, active: mid },
    { name: 'BREAK', bars: br, active: breakSec },
    { name: 'BUILD 2', bars: 2, active: build },
    { name: 'DROP 2', bars: d2, active: all },
    { name: 'OUTRO', bars: 4, active: outro },
  ];
}

// legacy wrappers
export function generateSongForStyle(styleId: string, seed: number): SongData { return generateSongForSub(subById(styleId, 'classic'), seed); }
export function generateArrangementForStyle(styleId: string, seed: number): Section[] { return generateArrangementForSub(subById(styleId, 'classic'), seed); }
export function generateSong(seed: number): SongData { return generateSongForSub(STYLES[0].subs[0], seed); }
export function generateArrangement(seed: number): Section[] { return generateArrangementForSub(STYLES[0].subs[0], seed); }
export function generateTrack(id: TrackId, seed: number, current: SongData): SongData {
  const rng = mulberry32(seed); const st = STYLES[0].subs[0];
  const s: any = { ...current, bass: current.bass.map((b) => ({ ...b })), kick: [...current.kick], hats: [...current.hats], open: [...current.open], lead: [...current.lead], padChord: [...current.padChord] };
  if (id === 'lead') { s.lead = genLead(rng, st); s.leadB = genLead(rng, st); }
  if (id === 'bass') { s.bass = genBass(rng, st); s.bassB = genBass(rng, st); }
  if (id === 'kick' || id === 'hats' || id === 'open') { const d = genDrums(rng, st); s.kick = d.kick; s.hats = d.hats; s.open = d.open; }
  if (id === 'pad') s.chords = genChords(rng, st);
  return s as SongData;
}

export function libraryStats() {
  const subs = STYLES.reduce((a, s) => a + s.subs.length, 0);
  return { styles: STYLES.length, subs, sessions: subs * SESSIONS_PER_SUB };
}
