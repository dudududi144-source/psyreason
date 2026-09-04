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
  { id: 'vertigo', name: 'VERTIGO', color: '#66ddff', family: 'HYPNOTIC', desc: 'spinning hypnotic 138', subs: [
    sub({ id: 'spin', name: 'Spin', bpm: 138, bassChar: 'flat', leadChar: 'twist', bassStyle: 'hypnotic', leadDensity: 0.45, padProb: 0.5, desc: 'rotating hypnotic layers' }),
    sub({ id: 'spiral', name: 'Spiral', bpm: 139, scale: DOR, bassChar: 'growl', leadChar: 'air', bassStyle: 'hypnotic', leadDensity: 0.4, padProb: 0.6, desc: 'descending spiral motion' }),
  ]},
  { id: 'blackout', name: 'BLACKOUT', color: '#3344aa', family: 'DARK', desc: 'pitch black 152', subs: [
    sub({ id: 'void', name: 'Void', bpm: 152, bassChar: 'sub', leadChar: 'twist', drumChar: 'hard', bassCut: 600, leadDensity: 0.35, padProb: 0.2, desc: 'empty void pressure' }),
    sub({ id: 'eclipse', name: 'Eclipse', bpm: 153, bassChar: 'growl', leadChar: 'twist', drumChar: 'hard', bassRes: 10, leadRes: 11, leadDensity: 0.4, desc: 'total eclipse darkness' }),
  ]},
  { id: 'classicpsy', name: 'CLASSIC PSY', color: '#ffdd66', family: 'GOA & CLASSICS', desc: '90s psy essence 145', subs: [
    sub({ id: 'nineties', name: '90s Psy', bpm: 145, bassChar: 'pluck', leadChar: 'acid', drumChar: 'round', leadDensity: 0.6, padProb: 0.5, desc: 'the original psy sound' }),
    sub({ id: 'oldgoa', name: 'Old Goa', bpm: 143, scale: HARM, bassChar: 'acid', leadChar: 'acid', drumChar: 'round', leadRes: 12, leadDensity: 0.65, desc: 'raw goa energy' }),
  ]},
  { id: 'darkprog', name: 'DARK PROGRESSIVE', color: '#5577aa', family: 'HYPNOTIC', desc: 'slow dark burn 128-131', subs: [
    sub({ id: 'slowburn', name: 'Slow Burn', bpm: 129, bassChar: 'flat', leadChar: 'air', drumChar: 'soft', bassStyle: 'hypnotic', leadDensity: 0.25, padProb: 0.7, desc: 'patient dark tension' }),
    sub({ id: 'deepprog', name: 'Deep Prog', bpm: 131, scale: DOR, bassChar: 'sub', leadChar: 'air', drumChar: 'soft', bassStyle: 'offbeat', leadDensity: 0.3, padProb: 0.6, desc: 'submerged progression' }),
  ]},
  { id: 'deeppsy', name: 'DEEP PSY', color: '#33bb99', family: 'PSY MAIN', desc: 'deep rolling 140', subs: [
    sub({ id: 'deeproll', name: 'Deep Roll', bpm: 140, bassChar: 'sub', leadChar: 'air', drumChar: 'round', bassStyle: 'rolling', leadDensity: 0.45, padProb: 0.6, desc: 'submerged rolling groove' }),
    sub({ id: 'ocean', name: 'Ocean', bpm: 141, scale: MIN, bassChar: 'flat', leadChar: 'air', drumChar: 'round', leadDensity: 0.4, padProb: 0.7, desc: 'wide oceanic layers' }),
  ]},
  { id: 'ravepsy', name: 'RAVE PSY', color: '#ffcc33', family: 'TECH', desc: 'stabs and sirens 150', subs: [
    sub({ id: 'stabs', name: 'Stab Machine', bpm: 150, bassChar: 'acid', leadChar: 'pluck', drumChar: 'hard', clap: true, leadDensity: 0.5, desc: 'relentless rave stabs' }),
    sub({ id: 'siren', name: 'Siren Night', bpm: 151, bassChar: 'acid', leadChar: 'twist', drumChar: 'hard', clap: true, leadRes: 10, leadDensity: 0.55, desc: 'siren-led warehouse' }),
  ]},
  { id: 'acidforest', name: 'ACID FOREST', color: '#77cc44', family: 'DARK', desc: 'squelching woods 150', subs: [
    sub({ id: 'mushroom', name: 'Mushroom', bpm: 150, scale: DOR, bassChar: 'acid', leadChar: 'acid', drumChar: 'hard', bassStyle: 'kbb', leadDensity: 0.45, desc: 'acid squelch in the forest' }),
    sub({ id: 'spore', name: 'Spore', bpm: 152, bassChar: 'growl', leadChar: 'acid', drumChar: 'hard', leadRes: 12, leadDensity: 0.4, desc: 'dark spore trails' }),
  ]},
  { id: 'sunrisetrance', name: 'SUNRISE TRANCE', color: '#ff9966', family: 'TRANCE', desc: 'golden hour 146', subs: [
    sub({ id: 'golden', name: 'Golden Hour', bpm: 146, scale: MAJ, bassChar: 'flat', leadChar: 'super', clap: true, leadDensity: 0.75, padProb: 1, desc: 'golden hour euphoria' }),
    sub({ id: 'horizon', name: 'Horizon', bpm: 147, scale: MAJ, bassChar: 'flat', leadChar: 'super', clap: true, leadLeap: 0.5, padProb: 1, leadWave: 'square', desc: 'endless horizon anthem' }),
  ]},
  { id: 'hypnoforest', name: 'HYPNO FOREST', color: '#55aa88', family: 'HYPNOTIC', desc: 'forest hypnosis 144-147', subs: [
    sub({ id: 'canopy', name: 'Canopy', bpm: 145, scale: DOR, bassChar: 'growl', leadChar: 'twist', drumChar: 'round', bassStyle: 'hypnotic', leadDensity: 0.4, padProb: 0.5, desc: 'layers under the canopy' }),
    sub({ id: 'roots', name: 'Roots', bpm: 147, bassChar: 'sub', leadChar: 'air', drumChar: 'hard', bassStyle: 'hypnotic', leadDensity: 0.35, padProb: 0.4, desc: 'deep root pressure' }),
  ]},
  { id: 'morningfull', name: 'MORNING FULL-ON', color: '#ffcc77', family: 'PSY MAIN', desc: 'sunrise full-on 146-148', subs: [
    sub({ id: 'firstlight', name: 'First Light', bpm: 146, scale: MAJ, bassChar: 'pluck', leadChar: 'super', clap: true, leadDensity: 0.7, padProb: 0.8, desc: 'first light energy' }),
    sub({ id: 'daybreak', name: 'Daybreak', bpm: 148, scale: MAJ, bassChar: 'flat', leadChar: 'super', clap: true, leadLeap: 0.45, padProb: 0.9, desc: 'full daybreak rush' }),
  ]},
  { id: 'darktech', name: 'DARK TECH', color: '#8899bb', family: 'TECH', desc: 'industrial dark 138-141', subs: [
    sub({ id: 'machine', name: 'Machine', bpm: 139, bassChar: 'flat', leadChar: 'pluck', drumChar: 'hard', bassWave: 'square', bassStyle: 'hypnotic', leadDensity: 0.25, desc: 'mechanical dark pulse' }),
    sub({ id: 'factory', name: 'Factory', bpm: 141, bassChar: 'growl', leadChar: 'twist', drumChar: 'hard', bassDrive: 0.8, leadDensity: 0.3, desc: 'industrial clang' }),
  ]},
  { id: 'chillgoa', name: 'CHILL GOA', color: '#99ddbb', family: 'CHILL', desc: 'goa flavors downtempo 92-98', subs: [
    sub({ id: 'oasisc', name: 'Oasis', bpm: 96, scale: HARM, bassChar: 'sub', leadChar: 'acid', drumChar: 'soft', kickMode: 'half', leadDensity: 0.4, padProb: 0.9, desc: 'goa oasis chill' }),
    sub({ id: 'temple', name: 'Temple', bpm: 92, scale: HARM, bassChar: 'sub', leadChar: 'air', drumChar: 'soft', kickMode: 'half', leadDensity: 0.35, padProb: 1, desc: 'temple ambience' }),
  ]},
  { id: 'fullondark', name: 'FULL-ON DARK', color: '#6655cc', family: 'DARK', desc: 'dark full-on 147-149', subs: [
    sub({ id: 'shadow', name: 'Shadow', bpm: 147, bassChar: 'growl', leadChar: 'twist', drumChar: 'hard', leadDensity: 0.5, padProb: 0.3, desc: 'full-on with a dark blade' }),
    sub({ id: 'nightfall', name: 'Nightfall', bpm: 149, bassChar: 'sub', leadChar: 'twist', drumChar: 'hard', bassCut: 650, leadDensity: 0.45, desc: 'nightfall pressure' }),
  ]},
  { id: 'psybreakspro', name: 'PSY BREAKS PRO', color: '#ffbb77', family: 'WILD', desc: 'pro broken psy 152-155', subs: [
    sub({ id: 'breakcore', name: 'Break Psy', bpm: 152, kickMode: 'breaks', bassChar: 'growl', leadChar: 'twist', drumChar: 'breaky', clap: true, bassStyle: 'driving', leadDensity: 0.5, desc: 'broken but psy' }),
    sub({ id: 'halftime', name: 'Half-Time Psy', bpm: 155, kickMode: 'half', bassChar: 'sub', leadChar: 'twist', drumChar: 'hard', leadDensity: 0.4, desc: 'half-time heaviness' }),
  ]},
  { id: 'ambienttechno', name: 'AMBIENT TECHNO', color: '#aabbcc', family: 'TECH', desc: 'spacey techno 126-130', subs: [
    sub({ id: 'orbit', name: 'Orbit', bpm: 127, bassChar: 'flat', leadChar: 'air', drumChar: 'soft', bassStyle: 'hypnotic', leadDensity: 0.2, padProb: 0.8, desc: 'orbital ambient techno' }),
    sub({ id: 'station', name: 'Station', bpm: 130, bassChar: 'flat', leadChar: 'pluck', drumChar: 'soft', bassStyle: 'hypnotic', leadDensity: 0.25, padProb: 0.7, desc: 'deep space station' }),
  ]},
  { id: 'upliftingforest', name: 'UPLIFTING FOREST', color: '#88ddaa', family: 'HYPNOTIC', desc: 'green uplift 140-143', subs: [
    sub({ id: 'meadow', name: 'Meadow', bpm: 141, scale: DOR, bassChar: 'flat', leadChar: 'super', drumChar: 'round', bassStyle: 'rolling', leadDensity: 0.6, padProb: 0.7, desc: 'uplifting forest meadow' }),
    sub({ id: 'sunbeams', name: 'Sunbeams', bpm: 143, scale: MAJ, bassChar: 'pluck', leadChar: 'super', drumChar: 'round', leadDensity: 0.65, padProb: 0.8, desc: 'sunbeams through trees' }),
  ]},
  { id: 'goapsy', name: 'GOA PSY', color: '#ffaa55', family: 'GOA & CLASSICS', desc: 'modern goa-psy 142-145', subs: [
    sub({ id: 'fusion', name: 'Fusion', bpm: 143, scale: HARM, bassChar: 'acid', leadChar: 'super', drumChar: 'round', clap: true, leadDensity: 0.65, padProb: 0.7, desc: 'goa meets full-on' }),
    sub({ id: 'ritual', name: 'Ritual', bpm: 145, scale: HARM, bassChar: 'acid', leadChar: 'acid', drumChar: 'round', leadRes: 11, leadDensity: 0.6, desc: 'psychedelic ritual' }),
  ]},
  { id: 'darkzen', name: 'DARK ZEN', color: '#7788aa', family: 'DARK', desc: 'zen darkness 134-137', subs: [
    sub({ id: 'still', name: 'Still', bpm: 135, bassChar: 'sub', leadChar: 'air', drumChar: 'soft', bassStyle: 'hypnotic', leadDensity: 0.3, padProb: 0.6, desc: 'still dark water' }),
    sub({ id: 'koan', name: 'Koan', bpm: 137, scale: DOR, bassChar: 'growl', leadChar: 'twist', drumChar: 'round', bassStyle: 'hypnotic', leadDensity: 0.35, desc: 'dark zen koan' }),
  ]},
  { id: 'sunpsy', name: 'SUN PSY', color: '#ffdd44', family: 'PSY MAIN', desc: 'solar energy 144-147', subs: [
    sub({ id: 'solar', name: 'Solar', bpm: 145, scale: MAJ, bassChar: 'pluck', leadChar: 'super', clap: true, leadDensity: 0.7, padProb: 0.8, desc: 'solar flare energy' }),
    sub({ id: 'flare', name: 'Flare', bpm: 147, scale: MAJ, bassChar: 'flat', leadChar: 'super', clap: true, leadLeap: 0.5, padProb: 0.9, leadWave: 'square', desc: 'blinding flare' }),
  ]},
  { id: 'icepsy', name: 'ICE PSY', color: '#aaddff', family: 'CHILL', desc: 'frozen atmospheres 100-108', subs: [
    sub({ id: 'glacier', name: 'Glacier', bpm: 104, bassChar: 'sub', leadChar: 'air', drumChar: 'soft', kickMode: 'half', leadDensity: 0.35, padProb: 1, desc: 'glacier slow motion' }),
    sub({ id: 'frost', name: 'Frost', bpm: 108, scale: DOR, bassChar: 'sub', leadChar: 'air', drumChar: 'soft', kickMode: 'half', leadDensity: 0.4, padProb: 0.9, desc: 'frost crystals' }),
  ]},
];















export const SESSIONS_PER_SUB = 16;

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
  const vars = st.scale === HARM ? [0, 0, 3, 7, 12] : st.scale === PHR ? [0, 0, 1, 12] : [0, 0, 0, 7, 12];
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
  const roots = st.scale === MAJ ? [0, 5, 3, 4] : st.scale === PHR ? [0, 0, 5, 0] : st.scale === HARM ? [0, 5, 2, 6] : [0, 5, 2, 6];
  return roots.map((d) => chordAt(st.scale, 57, d));
}

function genLeadForChord(rng: () => number, st: SubStyle, chord: number[]): (number | null)[] {
  const lead: (number | null)[] = Array(16).fill(null);
  const tones = chord.map((t) => t + 12);
  let cur = tones[0];
  for (let i = 0; i < 16; i++) {
    const prob = i % 4 === 0 ? 0.9 : st.leadDensity;
    if (rng() < prob) {
      const r = rng();
      if (i % 4 === 0 || r < 0.35) cur = tones[Math.floor(rng() * tones.length)];
      else if (r < 0.75) cur = cur + pick(rng, [-2, -1, 1, 2]);
      else cur = tones[Math.floor(rng() * tones.length)] + pick(rng, [0, 12]);
      lead[i] = cur;
    }
  }
  if (lead[0] === null) lead[0] = tones[0];
  return lead;
}

export function generateSongForSub(st: SubStyle, seed: number): SongData {
  const rng = mulberry32(seed);
  const lead = genLead(rng, st); const leadB = genLead(rng, st);
  const bass = genBass(rng, st); const bassB = genBass(rng, st);
  const d = genDrums(rng, st);
  const chords = genChords(rng, st);
  return { kick: d.kick, bass, hats: d.hats, open: d.open, lead, padChord: chords[0], bassB, leadB, chords } as SongData;
}

export function generateArrangementForSub(st: SubStyle, seed: number): Section[] {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const all: TrackId[] = ['kick', 'bass', 'hats', 'open', 'lead', 'pad'];
  const intro: TrackId[] = ['kick', 'bass', 'hats', 'open', 'lead', 'pad', 'atmos']; // full set; engine layers them in gradually
  const build: TrackId[] = ['kick', 'bass', 'hats', 'open', 'lead'];
  const breakSec: TrackId[] = st.padProb > 0.4 ? ['lead', 'pad', 'atmos'] : ['lead', 'hats', 'atmos'];
  const b1 = pick(rng, [4, 4, 8]); const d1 = pick(rng, [24, 24, 32]); const br = pick(rng, [8, 16]); const d2 = pick(rng, [24, 32]);
  const outro: TrackId[] = ['kick', 'bass', 'hats'];
  return [
    { name: 'INTRO', bars: 16, active: intro, role: 'intro' },
    { name: 'BUILD', bars: 4, active: build, role: 'build' },
    { name: 'DROP', bars: d1, active: all, role: 'drop' },
    { name: 'BREAK', bars: br, active: breakSec, role: 'break' },
    { name: 'BUILD 2', bars: 4, active: build, role: 'build' },
    { name: 'DROP 2', bars: d2, active: all, role: 'drop2' },
    { name: 'OUTRO', bars: 8, active: outro, role: 'outro' },
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
}function buildForms(): SoundPreset[] {
  const FULL = ['kick', 'bass', 'hats', 'open', 'lead', 'pad'];
  const GROOVE = ['kick', 'bass', 'hats'];
  const AIR = ['lead', 'pad'];
  const MIN = ['kick', 'hats'];
  const BUILD = ['kick', 'bass', 'hats', 'open', 'lead'];
  const PERC = ['kick', 'hats', 'open'];
  const ACID = ['bass', 'lead'];
  const HALF = ['kick', 'bass', 'pad'];
  const FS = (name: string, bars: number, active: string[], role: string) => ({ name, bars, active, role });
  const T: [string, any[]][] = [
    ['Classic Full-On', [FS('INTRO',16,FULL,'intro'),FS('TEASER',16,FULL,'intro'),FS('BUILD',4,BUILD,'build'),FS('DROP',24,FULL,'drop'),FS('BREAK',16,AIR,'break'),FS('BUILD 2',4,BUILD,'build'),FS('DROP 2',24,FULL,'drop2'),FS('CLIMAX',8,FULL,'climax'),FS('OUTRO',8,MIN,'outro')]],
    ['Peak Time Club', [FS('DROP',32,FULL,'drop'),FS('PERC TRIBAL',8,PERC,'perc'),FS('DROP 2',32,FULL,'drop2'),FS('CLIMAX',8,FULL,'climax'),FS('DJ OUTRO',8,MIN,'outro')]],
    ['Progressive Journey', [FS('AMBIENT TEXTURE',8,['pad'],'ambient'),FS('INTRO',16,GROOVE,'intro'),FS('BUILD',8,BUILD,'build'),FS('DROP',32,FULL,'drop'),FS('ACID BREAK',16,ACID,'acid'),FS('BUILD 2',8,BUILD,'build'),FS('CLIMAX',32,FULL,'climax'),FS('OUTRO',16,MIN,'outro')]],
    ['Morning Uplift', [FS('AMBIENT TEXTURE',8,['pad'],'ambient'),FS('TEASER',16,FULL,'intro'),FS('BUILD',4,BUILD,'build'),FS('DROP',24,FULL,'drop'),FS('HALF-TIME',8,HALF,'half'),FS('BUILD 2',4,BUILD,'build'),FS('CLIMAX',32,FULL,'climax'),FS('OUTRO',8,AIR,'outro')]],
    ['Dark Hypnotic', [FS('INTRO',16,GROOVE,'intro'),FS('DROP',48,FULL,'drop'),FS('PERC TRIBAL',8,PERC,'perc'),FS('ACID BREAK',8,ACID,'acid'),FS('DROP 2',48,FULL,'drop2'),FS('OUTRO',8,MIN,'outro')]],
    ['Radio Edit', [FS('TEASER',12,FULL,'intro'),FS('BUILD',4,BUILD,'build'),FS('DROP',16,FULL,'drop'),FS('BREAK',8,AIR,'break'),FS('DROP 2',16,FULL,'drop2'),FS('OUTRO',4,MIN,'outro')]],
    ['Afterhours Deep', [FS('AMBIENT TEXTURE',16,['pad'],'ambient'),FS('BUILD',8,BUILD,'build'),FS('DROP',32,FULL,'drop'),FS('HALF-TIME',8,HALF,'half'),FS('ACID BREAK',8,ACID,'acid'),FS('CLIMAX',32,FULL,'climax'),FS('OUTRO',16,AIR,'outro')]],
    ['Double Drop', [FS('INTRO',16,FULL,'intro'),FS('BUILD',4,BUILD,'build'),FS('DROP',16,FULL,'drop'),FS('PERC TRIBAL',8,PERC,'perc'),FS('DROP 2',16,FULL,'drop2'),FS('BREAK',16,AIR,'break'),FS('CLIMAX',24,FULL,'climax'),FS('OUTRO',8,MIN,'outro')]],
    ['Minimal Tool', [FS('INTRO',16,MIN,'intro'),FS('DROP',32,GROOVE,'drop'),FS('PERC TRIBAL',16,PERC,'perc'),FS('DROP 2',32,GROOVE,'drop2'),FS('DJ OUTRO',16,MIN,'outro')]],
    ['Uplifting Anthem', [FS('AMBIENT TEXTURE',8,['pad'],'ambient'),FS('TEASER',16,FULL,'intro'),FS('BUILD',8,BUILD,'build'),FS('DROP',24,FULL,'drop'),FS('BREAK',24,AIR,'break'),FS('BUILD 2',8,BUILD,'build'),FS('CLIMAX',32,FULL,'climax'),FS('OUTRO',8,AIR,'outro')]],
    ['Forest Ritual', [FS('PERC TRIBAL',16,PERC,'perc'),FS('INTRO',16,GROOVE,'intro'),FS('BUILD',4,BUILD,'build'),FS('DROP',32,FULL,'drop'),FS('ACID BREAK',16,ACID,'acid'),FS('CLIMAX',32,FULL,'climax'),FS('OUTRO',16,MIN,'outro')]],
    ['Goa Ceremony', [FS('AMBIENT TEXTURE',16,['pad'],'ambient'),FS('ACID BREAK',16,ACID,'acid'),FS('BUILD',8,BUILD,'build'),FS('DROP',32,FULL,'drop'),FS('HALF-TIME',8,HALF,'half'),FS('BUILD 2',8,BUILD,'build'),FS('CLIMAX',32,FULL,'climax'),FS('OUTRO',16,AIR,'outro')]],
    ['Psycore Blast', [FS('INTRO',4,GROOVE,'intro'),FS('DROP',24,FULL,'drop'),FS('PERC TRIBAL',8,PERC,'perc'),FS('DROP 2',24,FULL,'drop2'),FS('ACID BREAK',8,ACID,'acid'),FS('CLIMAX',24,FULL,'climax'),FS('OUTRO',4,MIN,'outro')]],
    ['Chill Descent', [FS('AMBIENT TEXTURE',16,['pad'],'ambient'),FS('HALF-TIME',16,HALF,'half'),FS('BUILD',8,BUILD,'build'),FS('DROP',24,FULL,'drop'),FS('BREAK',24,AIR,'break'),FS('OUTRO',16,AIR,'outro')]],
    ['Sunrise Set', [FS('AMBIENT TEXTURE',16,['pad'],'ambient'),FS('TEASER',16,FULL,'intro'),FS('BUILD',8,BUILD,'build'),FS('DROP',32,FULL,'drop'),FS('BREAK',16,AIR,'break'),FS('BUILD 2',8,BUILD,'build'),FS('CLIMAX',40,FULL,'climax'),FS('OUTRO',16,AIR,'outro')]],
    ['Warehouse Loop', [FS('DROP',48,GROOVE,'drop'),FS('PERC TRIBAL',16,PERC,'perc'),FS('ACID BREAK',8,ACID,'acid'),FS('DROP 2',48,GROOVE,'drop2'),FS('DJ OUTRO',8,MIN,'outro')]],
    ['Tribal Opening', [FS('PERC TRIBAL',16,PERC,'perc'),FS('ACID BREAK',16,ACID,'acid'),FS('BUILD',8,BUILD,'build'),FS('DROP',32,FULL,'drop'),FS('HALF-TIME',8,HALF,'half'),FS('CLIMAX',32,FULL,'climax'),FS('OUTRO',8,MIN,'outro')]],
    ['Acid Odyssey', [FS('ACID BREAK',16,ACID,'acid'),FS('BUILD',8,BUILD,'build'),FS('DROP',32,FULL,'drop'),FS('PERC TRIBAL',8,PERC,'perc'),FS('ACID BREAK',8,ACID,'acid'),FS('CLIMAX',32,FULL,'climax'),FS('OUTRO',8,MIN,'outro')]],
    ['Epic Climax', [FS('INTRO',16,FULL,'intro'),FS('BUILD',4,BUILD,'build'),FS('DROP',24,FULL,'drop'),FS('BREAK',16,AIR,'break'),FS('BUILD 2',4,BUILD,'build'),FS('DROP 2',24,FULL,'drop2'),FS('PERC TRIBAL',8,PERC,'perc'),FS('CLIMAX',24,FULL,'climax'),FS('OUTRO',8,MIN,'outro')]],
    ['Deep Space', [FS('AMBIENT TEXTURE',24,['pad'],'ambient'),FS('HALF-TIME',16,HALF,'half'),FS('BUILD',8,BUILD,'build'),FS('DROP',32,FULL,'drop'),FS('AMBIENT TEXTURE',8,['pad'],'ambient'),FS('CLIMAX',32,FULL,'climax'),FS('OUTRO',16,AIR,'outro')]],
    ['Festival Closer', [FS('TEASER',16,FULL,'intro'),FS('BUILD',8,BUILD,'build'),FS('DROP',32,FULL,'drop'),FS('PERC TRIBAL',8,PERC,'perc'),FS('BREAK',16,AIR,'break'),FS('BUILD 2',8,BUILD,'build'),FS('CLIMAX',40,FULL,'climax'),FS('DJ OUTRO',16,MIN,'outro')]],
    ['Tension & Release', [FS('INTRO',16,FULL,'intro'),FS('BUILD',4,['kick','bass','hats','open','lead'],'build'),FS('DROP',16,['kick','bass','hats','open','lead','pad'],'drop'),FS('BREAK',8,['lead','pad'],'break'),FS('DROP',16,['kick','bass','hats','open','lead','pad'],'drop'),FS('BREAK',8,['lead','pad'],'break'),FS('CLIMAX',24,['kick','bass','hats','open','lead','pad'],'climax'),FS('OUTRO',8,['kick','hats'],'outro')]],
    ['Layered Re-Entry', [FS('AMBIENT TEXTURE',16,['pad'],'ambient'),FS('BUILD',8,['kick','bass','hats','open','lead'],'build'),FS('RE-ENTRY',16,['kick','bass','hats','open','lead','pad'],'dropin'),FS('CLIMAX',16,['kick','bass','hats','open','lead','pad'],'climax'),FS('OUTRO',8,['kick','hats'],'outro')]],
    ['Acid Marathon', [FS('ACID BREAK',16,['bass','lead'],'acid'),FS('BUILD',8,['kick','bass','hats','open','lead'],'build'),FS('DROP',32,['kick','bass','hats','open','lead'],'drop'),FS('ACID BREAK',16,['bass','lead'],'acid'),FS('CLIMAX',32,['kick','bass','hats','open','lead','pad'],'climax'),FS('OUTRO',8,['kick','hats'],'outro')]],
    ['Sunrise Peak', [FS('AMBIENT TEXTURE',16,['pad'],'ambient'),FS('TEASER',16,FULL,'intro'),FS('BUILD',8,['kick','bass','hats','open','lead'],'build'),FS('DROP',24,['kick','bass','hats','open','lead','pad'],'drop'),FS('BREAK',16,['lead','pad'],'break'),FS('CLIMAX',48,['kick','bass','hats','open','lead','pad'],'climax'),FS('OUTRO',16,['lead','pad'],'outro')]],
    ['Anthem Re-Entry', [FS('TEASER',16,FULL,'intro'),FS('BUILD',8,['kick','bass','hats','open','lead'],'build'),FS('DROP',24,['kick','bass','hats','open','lead','pad'],'drop'),FS('BREAK',16,['lead','pad'],'break'),FS('RE-ENTRY',16,['kick','bass','hats','open','lead','pad'],'dropin'),FS('CLIMAX',24,['kick','bass','hats','open','lead','pad'],'climax'),FS('OUTRO',8,['kick','hats'],'outro')]],
    ['Hypnotic Layers', [FS('INTRO',16,FULL,'intro'),FS('DROPIN',24,['kick','bass','hats','open','lead'],'dropin'),FS('DROP',32,['kick','bass','hats','open','lead','pad'],'drop'),FS('PERC TRIBAL',8,['kick','hats','open'],'perc'),FS('DROPIN',24,['kick','bass','hats','open','lead','pad'],'dropin'),FS('OUTRO',8,['kick','hats'],'outro')]],
    ['Peak Builder', [FS('INTRO',16,FULL,'intro'),FS('BUILD',4,['kick','bass','hats','open','lead'],'build'),FS('DROPIN',16,['kick','bass','hats','open','lead'],'dropin'),FS('DROP',24,['kick','bass','hats','open','lead','pad'],'drop'),FS('BREAK',16,['lead','pad'],'break'),FS('RE-ENTRY',16,['kick','bass','hats','open','lead','pad'],'dropin'),FS('CLIMAX',24,['kick','bass','hats','open','lead','pad'],'climax'),FS('DJ OUTRO',8,['kick','hats'],'outro')]],
    ['Melodic Voyage', [FS('INTRO',16,FULL,'intro'),FS('BUILD',8,BUILD,'build'),FS('DROP',32,FULL,'drop'),FS('AMBIENT',16,['pad'],'ambient'),FS('ACID BREAK',8,ACID,'acid'),FS('BUILD 2',8,BUILD,'build'),FS('RE-ENTRY',16,FULL,'dropin'),FS('CLIMAX',32,FULL,'climax')]],
    ['Deep Forest Ritual', [FS('PERC TRIBAL',16,PERC,'perc'),FS('INTRO',16,FULL,'intro'),FS('BUILD',8,BUILD,'build'),FS('DROP',32,FULL,'drop'),FS('HALF-TIME',8,HALF,'half'),FS('PERC TRIBAL',8,PERC,'perc'),FS('CLIMAX',32,FULL,'climax')]],
    ['Sunrise Anthem Extended', [FS('AMBIENT',16,['pad'],'ambient'),FS('TEASER',16,FULL,'intro'),FS('BUILD',8,BUILD,'build'),FS('DROP',24,FULL,'drop'),FS('BREAK',16,AIR,'break'),FS('BUILD 2',8,BUILD,'build'),FS('CLIMAX',40,FULL,'climax')]],
    ['Minimal Deep Tech', [FS('INTRO',16,MIN,'intro_drum'),FS('DROP',32,GROOVE,'drop'),FS('PERC TRIBAL',16,PERC,'perc'),FS('DROP 2',32,GROOVE,'drop2')]],
    ['Twilight Journey', [FS('AMBIENT',16,['pad'],'ambient'),FS('INTRO',16,FULL,'intro'),FS('BUILD',8,BUILD,'build'),FS('DROP',24,FULL,'drop'),FS('HALF-TIME',8,HALF,'half'),FS('ACID BREAK',8,ACID,'acid'),FS('DROP 2',32,FULL,'drop2')]],
    ['Peak Festival', [FS('TEASER',8,FULL,'intro'),FS('BUILD',4,BUILD,'build'),FS('DROP',24,FULL,'drop'),FS('PERC TRIBAL',8,PERC,'perc'),FS('DROP 2',24,FULL,'drop2'),FS('BREAK',8,AIR,'break'),FS('BUILD 2',4,BUILD,'build'),FS('CLIMAX',32,FULL,'climax')]],
    ['Ambient Descent', [FS('AMBIENT',24,['pad'],'ambient'),FS('HALF-TIME',16,HALF,'half'),FS('BUILD',8,BUILD,'build'),FS('DROP',24,FULL,'drop'),FS('AMBIENT',8,['pad'],'ambient'),FS('CLIMAX',24,FULL,'climax')]],
    ['Goa Sunrise Ceremony', [FS('AMBIENT',16,['pad'],'ambient'),FS('ACID BREAK',16,ACID,'acid'),FS('BUILD',8,BUILD,'build'),FS('DROP',32,FULL,'drop'),FS('PERC TRIBAL',8,PERC,'perc'),FS('RE-ENTRY',16,FULL,'dropin'),FS('CLIMAX',32,FULL,'climax')]],
  ];
  return T.map(([name, form]) => ({ name: 'FORM • ' + name, p: { form } }));
}


export function composeForm(seed: number) {
  const r = mulberry32(seed);
  const pk = <T,>(arr: T[]): T => arr[Math.floor(r() * arr.length)];
  const FULL = ['kick', 'bass', 'hats', 'open', 'lead', 'pad'];
  const GROOVE = ['kick', 'bass', 'hats'];
  const AIR = ['lead', 'pad'];
  const MIN = ['kick', 'hats'];
  const BUILD = ['kick', 'bass', 'hats', 'open', 'lead'];
  const PERC = ['kick', 'hats', 'open'];
  const ACID = ['bass', 'lead'];
  const HALF = ['kick', 'bass', 'pad'];
  const FS = (name: string, bars: number, active: string[], role: string) => ({ name, bars, active, role });
  const f: any[] = [];
  f.push(FS('INTRO', 16, FULL, pk(['intro', 'intro', 'intro', 'intro_drum']))); // pad-first layered build (mostly)
  if (r() > 0.5) f.push(FS('TEASER', 8, [...GROOVE, 'lead'], 'intro'));
  f.push(FS('BUILD', pk([4, 8]), BUILD, 'build'));
  f.push(FS('DROP', pk([16, 24, 32]), FULL, 'drop'));
  const midRole = pk(['break', 'perc', 'acid', 'ambient', 'half']);
  const midAct: any = { break: AIR, perc: PERC, acid: ACID, ambient: ['pad'], half: HALF }[midRole];
  const midName: any = { break: 'BREAK', perc: 'PERC TRIBAL', acid: 'ACID BREAK', ambient: 'AMBIENT', half: 'HALF-TIME' }[midRole];
  f.push(FS(midName, pk([8, 16]), midAct, midRole));
  if (r() > 0.5) f.push(FS('BUILD 2', pk([4, 8]), BUILD, 'build'));
  f.push(FS(r() > 0.5 ? 'RE-ENTRY' : 'DROP 2', pk([16, 24, 32]), FULL, r() > 0.5 ? 'dropin' : 'drop2'));
  if (r() > 0.55) f.push(FS('CLIMAX', pk([16, 24, 32]), FULL, 'climax'));
  f.push(FS('OUTRO', pk([8, 16]), MIN, 'outro'));
  return f;
}
