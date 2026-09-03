// PsyReason Generator v2 - style sessions + variation engine
// 6 psytrance styles, 3 curated sessions each, A/B pattern variants,
// fills, risers, chord progressions -> interesting sequences, not loops.

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

export interface StyleDef {
  id: string; name: string; color: string; bpm: number;
  scale: number[]; bassStyles: string[];
  leadDensity: number; leadLeap: number;
  hatBusy: number; openProb: number; padProb: number;
  desc: string;
}

export const STYLES: StyleDef[] = [
  { id: 'fullon', name: 'FULL-ON', color: '#00ff88', bpm: 145, scale: [0, 1, 3, 5, 7, 8, 10], bassStyles: ['rolling', 'rolling', 'kbb'], leadDensity: 0.7, leadLeap: 0.3, hatBusy: 0.6, openProb: 0.9, padProb: 0.8, desc: '145 BPM, driving rolling bass, energetic leads' },
  { id: 'goa', name: 'GOA', color: '#ff8800', bpm: 140, scale: [0, 1, 4, 5, 7, 8, 10], bassStyles: ['rolling', 'offbeat'], leadDensity: 0.6, leadLeap: 0.45, hatBusy: 0.5, openProb: 0.7, padProb: 0.6, desc: '140 BPM, harmonic flavor, acid 303 lines' },
  { id: 'dark', name: 'DARK PSY', color: '#8866ff', bpm: 150, scale: [0, 1, 3, 5, 7, 8, 10], bassStyles: ['kbb', 'rolling'], leadDensity: 0.4, leadLeap: 0.55, hatBusy: 0.4, openProb: 0.5, padProb: 0.3, desc: '150 BPM, phrygian tension, sparse twisted leads' },
  { id: 'prog', name: 'PROGRESSIVE', color: '#00aaff', bpm: 132, scale: [0, 2, 3, 5, 7, 8, 10], bassStyles: ['offbeat', 'offbeat', 'rolling'], leadDensity: 0.35, leadLeap: 0.25, hatBusy: 0.3, openProb: 0.6, padProb: 0.9, desc: '132 BPM, open grooves, long pads, space' },
  { id: 'hitech', name: 'HI-TECH', color: '#ff2bd6', bpm: 165, scale: [0, 1, 3, 5, 7, 8, 10], bassStyles: ['rolling'], leadDensity: 0.85, leadLeap: 0.6, hatBusy: 0.8, openProb: 0.8, padProb: 0.2, desc: '165 BPM, frantic density, wild leaps' },
  { id: 'forest', name: 'FOREST', color: '#66cc66', bpm: 152, scale: [0, 1, 3, 5, 7, 9, 10], bassStyles: ['kbb', 'kbb', 'rolling'], leadDensity: 0.45, leadLeap: 0.5, hatBusy: 0.45, openProb: 0.5, padProb: 0.4, desc: '152 BPM, modal darkness, echoing motifs' },
];

export function styleById(id: string): StyleDef { return STYLES.find((s) => s.id === id) || STYLES[0]; }

const LEAD_ROOT = 69; const BASS_ROOT = 33;

function genLeadStyle(rng: () => number, st: StyleDef, variant: number): (number | null)[] {
  const lead: (number | null)[] = Array(16).fill(null);
  let deg = Math.floor(rng() * 3);
  const density = Math.min(0.9, st.leadDensity + (variant === 2 ? 0.1 : 0));
  for (let i = 0; i < 16; i++) {
    const prob = i % 4 === 0 ? 0.9 : density;
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

function genBassStyle(rng: () => number, st: StyleDef): { on: boolean; semi: number }[] {
  const style = pick(rng, st.bassStyles);
  const vars = st.id === 'goa' ? [0, 0, 3, 8, 7] : st.id === 'dark' ? [0, 0, 1, 6] : [0, 0, 0, 1, 3, 5, 7, 8, 10];
  const bass: { on: boolean; semi: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const isKick = i % 4 === 0;
    let on = false;
    if (style === 'rolling') on = !isKick || rng() < 0.15;
    if (style === 'offbeat') on = i % 4 === 2 || (i % 2 === 1 && rng() < 0.3);
    if (style === 'kbb') on = i % 4 === 2 || i % 4 === 3;
    let semi = 0;
    if (i >= 12 && rng() < 0.6) semi = pick(rng, vars);
    else if (rng() < 0.12) semi = pick(rng, vars);
    bass.push({ on, semi });
  }
  return bass;
}

function genDrumsStyle(rng: () => number, st: StyleDef) {
  const kick = Array(16).fill(false);
  for (let i = 0; i < 16; i += 4) kick[i] = true;
  if (rng() < 0.3) kick[14] = true;
  const hats = Array(16).fill(false);
  for (let i = 2; i < 16; i += 4) hats[i] = true;
  if (rng() < st.hatBusy) hats[7] = true;
  if (rng() < st.hatBusy * 0.7) hats[15] = true;
  if (rng() < st.hatBusy * 0.4) { hats[3] = true; hats[11] = true; }
  const open = Array(16).fill(false);
  if (rng() < st.openProb) open[pick(rng, [14, 8, 12])] = true;
  return { kick, hats, open };
}

function chordAt(scale: number[], root: number, deg: number): number[] {
  const n = scale.length;
  return [0, 2, 4].map((off) => { const d = deg + off; return root + scale[d % n] + Math.floor(d / n) * 12; });
}

function genChords(rng: () => number, st: StyleDef): number[][] {
  const roots = st.id === 'prog' ? [0, 5, 3, 4] : st.id === 'goa' ? [0, 3, 0, 4] : [0, 0, 3, 4];
  return roots.map((d) => chordAt(st.scale, 57, d));
}

export function generateSongForStyle(styleId: string, seed: number): SongData {
  const st = styleById(styleId); const rng = mulberry32(seed);
  const variant = seed % 3;
  const lead = genLeadStyle(rng, st, variant);
  const bass = genBassStyle(rng, st);
  // B variants for A/B variation across bars
  const leadB = genLeadStyle(rng, st, variant + 1);
  const bassB = genBassStyle(rng, st);
  const d = genDrumsStyle(rng, st);
  return { kick: d.kick, bass, hats: d.hats, open: d.open, lead, padChord: genChords(rng, st)[0], bassB, leadB, chords: genChords(rng, st) } as SongData;
}

export function generateArrangementForStyle(styleId: string, seed: number): Section[] {
  const st = styleById(styleId); const rng = mulberry32(seed ^ 0x9e3779b9);
  const all: TrackId[] = ['kick', 'bass', 'hats', 'open', 'lead', 'pad'];
  const noPad = all.filter((t) => t !== 'pad');
  const intro: TrackId[] = st.padProb > 0.7 ? ['bass', 'hats', 'lead', 'pad'] : ['kick', 'bass', 'hats'];
  const build: TrackId[] = ['kick', 'bass', 'hats', 'open', 'lead'];
  const breakSec: TrackId[] = st.padProb > 0.4 ? ['lead', 'pad'] : ['lead', 'hats'];
  const b1 = pick(rng, [4, 4, 8]); const d1 = pick(rng, [8, 8, 16]); const br = pick(rng, [4, 8]); const d2 = pick(rng, [8, 16]);
  return [
    { name: 'INTRO', bars: b1, active: intro },
    { name: 'BUILD', bars: 4, active: build },
    { name: 'DROP', bars: d1, active: all },
    { name: 'BREAK', bars: br, active: breakSec },
    { name: 'DROP 2', bars: d2, active: st.padProb > 0.5 ? all : noPad.concat('pad') },
  ];
}

// curated session seeds: 3 quality sessions per style
export function sessionSeed(styleId: string, session: number): number {
  let h = 2166136261;
  for (let i = 0; i < styleId.length; i++) { h ^= styleId.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) + session * 104729 + 13;
}

export function generateTrack(id: TrackId, seed: number, current: SongData): SongData {
  const rng = mulberry32(seed);
  const st = STYLES[0];
  const s: any = { ...current, bass: current.bass.map((b) => ({ ...b })), kick: [...current.kick], hats: [...current.hats], open: [...current.open], lead: [...current.lead], padChord: [...current.padChord] };
  if (id === 'lead') { s.lead = genLeadStyle(rng, st, 0); s.leadB = genLeadStyle(rng, st, 1); }
  if (id === 'bass') { s.bass = genBassStyle(rng, st); s.bassB = genBassStyle(rng, st); }
  if (id === 'kick' || id === 'hats' || id === 'open') { const d = genDrumsStyle(rng, st); s.kick = d.kick; s.hats = d.hats; s.open = d.open; }
  if (id === 'pad') s.chords = genChords(rng, st);
  return s as SongData;
}

export function generateSong(seed: number): SongData { return generateSongForStyle('fullon', seed); }
export function generateArrangement(seed: number): Section[] { return generateArrangementForStyle('fullon', seed); }
