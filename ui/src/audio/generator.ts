// PsyReason Generator - generative composition engine (real, seeded, musical)
// Produces complete SongData + arrangement using psytrance grammar.

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

// A minor / phrygian flavor scale degrees
const SCALE = [0, 1, 3, 5, 7, 8, 10];
const LEAD_ROOT = 69; // A4
const BASS_ROOT = 33; // A1

function pick<T>(rng: () => number, arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

// melodic random walk over scale with phrase resolution
function genLead(rng: () => number): (number | null)[] {
  const lead: (number | null)[] = Array(16).fill(null);
  let deg = Math.floor(rng() * 3); // start low degrees
  const density = pick(rng, [0.5, 0.625, 0.75]);
  for (let i = 0; i < 16; i++) {
    const onBeat = i % 4 === 0;
    const prob = onBeat ? 0.9 : density;
    if (rng() < prob) {
      // step motion mostly, occasional leap
      const move = rng() < 0.7 ? (rng() < 0.5 ? 1 : -1) : (rng() < 0.5 ? 2 : -2);
      deg = Math.max(0, Math.min(SCALE.length * 2 - 1, deg + move));
      const oct = Math.floor(deg / SCALE.length);
      const note = LEAD_ROOT + SCALE[deg % SCALE.length] + oct * 12;
      lead[i] = note;
    }
  }
  // resolve phrase: last active note to root or 5th
  if (rng() < 0.8) lead[15] = LEAD_ROOT + pick(rng, [0, 7, 12]);
  if (lead[0] === null) lead[0] = LEAD_ROOT;
  return lead;
}

function genBass(rng: () => number, lead: (number | null)[]): { on: boolean; semi: number }[] {
  const bass: { on: boolean; semi: number }[] = [];
  const style = pick(rng, ['rolling', 'rolling', 'offbeat', 'kbb']);
  const rootSemi = 0;
  const variations = [0, 0, 0, 1, 3, 5, 7, 8, 10];
  for (let i = 0; i < 16; i++) {
    const isKick = i % 4 === 0;
    let on = false;
    if (style === 'rolling') on = !isKick || rng() < 0.15;
    if (style === 'offbeat') on = i % 4 === 2 || (i % 2 === 1 && rng() < 0.3);
    if (style === 'kbb') on = i % 4 === 2 || i % 4 === 3;
    // harmony follow: at bar ends use a scale degree from lead
    let semi = rootSemi;
    if (i >= 12 && rng() < 0.6) semi = pick(rng, variations);
    else if (rng() < 0.12) semi = pick(rng, variations);
    bass.push({ on, semi });
  }
  return bass;
}

function genDrums(rng: () => number) {
  const kick = Array(16).fill(false);
  for (let i = 0; i < 16; i += 4) kick[i] = true;
  if (rng() < 0.3) kick[14] = true; // fill
  if (rng() < 0.15) kick[15] = true;
  const hats = Array(16).fill(false);
  for (let i = 2; i < 16; i += 4) hats[i] = true;
  if (rng() < 0.5) hats[7] = rng() < 0.5;
  if (rng() < 0.4) hats[15] = true;
  const open = Array(16).fill(false);
  open[pick(rng, [14, 8, 12])] = true;
  return { kick, hats, open };
}

function genPad(rng: () => number): number[] {
  const chords = [
    [57, 60, 64], // Am
    [53, 57, 60], // F
    [55, 59, 62], // G
    [52, 56, 59], // E (phrygian tension)
    [57, 60, 64, 71], // Am add9-ish
  ];
  return pick(rng, chords);
}

export function generateSong(seed: number): SongData {
  const rng = mulberry32(seed);
  const lead = genLead(rng);
  const bass = genBass(rng, lead);
  const d = genDrums(rng);
  return { kick: d.kick, bass, hats: d.hats, open: d.open, lead, padChord: genPad(rng) };
}

export function generateTrack(id: TrackId, seed: number, current: SongData): SongData {
  const rng = mulberry32(seed);
  const s: SongData = { ...current, bass: current.bass.map((b) => ({ ...b })), kick: [...current.kick], hats: [...current.hats], open: [...current.open], lead: [...current.lead], padChord: [...current.padChord] };
  if (id === 'lead') s.lead = genLead(rng);
  if (id === 'bass') s.bass = genBass(rng, s.lead);
  if (id === 'kick' || id === 'hats' || id === 'open') { const d = genDrums(rng); s.kick = d.kick; s.hats = d.hats; s.open = d.open; }
  if (id === 'pad') s.padChord = genPad(rng);
  return s;
}

export function generateArrangement(seed: number): Section[] {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const all: TrackId[] = ['kick', 'bass', 'hats', 'open', 'lead', 'pad'];
  const intro: TrackId[] = pick(rng, [['kick', 'bass', 'hats'], ['kick', 'bass'], ['bass', 'hats', 'lead']]);
  const build: TrackId[] = ['kick', 'bass', 'hats', 'open', 'lead'];
  const drop: TrackId[] = all;
  const breakSec: TrackId[] = pick(rng, [['lead', 'pad'], ['pad', 'lead', 'hats'], ['lead', 'pad', 'open']]);
  const b1 = pick(rng, [4, 8]); const d1 = pick(rng, [8, 16]); const br = pick(rng, [4, 8]); const d2 = pick(rng, [8, 16]);
  return [
    { name: 'INTRO', bars: b1, active: intro },
    { name: 'BUILD', bars: 4, active: build },
    { name: 'DROP', bars: d1, active: drop },
    { name: 'BREAK', bars: br, active: breakSec },
    { name: 'DROP 2', bars: d2, active: drop },
  ];
}
