export var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface NoteInfo {
  name: string;
  octave: number;
}

export function midiToNoteName(midi: number): NoteInfo {
  var clamped = Math.max(0, Math.min(127, Math.floor(midi)));

  return {
    name: NOTE_NAMES[clamped % 12],
    octave: Math.floor(clamped / 12) - 1
  };
}

export function noteToMidi(name: string, octave: number): number {
  var idx = NOTE_NAMES.indexOf(name);
  if (idx === -1) return -1;

  return (octave + 1) * 12 + idx;
}

export type ScaleType =
  | 'major'
  | 'naturalMinor'
  | 'pentatonicMajor'
  | 'pentatonicMinor'
  | 'dorian'
  | 'phrygian'
  | 'mixolydian';

export var SCALE_INTERVALS: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10]
};

export function buildScale(rootMidi: number, scaleType: ScaleType): number[] {
  var intervals = SCALE_INTERVALS[scaleType];

  return intervals.map(function (interval) {
    return rootMidi + interval;
  });
}

export function buildScaleSpanning(rootMidi: number, scaleType: ScaleType, octaves: number): number[] {
  var notes: number[] = [];
  var span = Math.max(1, Math.floor(octaves));

  for (var o = 0; o < span; o++) {
    var base = rootMidi + o * 12;
    var intervals = SCALE_INTERVALS[scaleType];

    for (var i = 0; i < intervals.length; i++) {
      notes.push(base + intervals[i]);
    }
  }

  return notes;
}

export type ChordType = 'maj' | 'min' | 'dim' | 'aug' | 'maj7' | 'min7' | 'dom7';

export var CHORD_INTERVALS: Record<ChordType, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10]
};

export function buildChord(rootMidi: number, chordType: ChordType): number[] {
  return CHORD_INTERVALS[chordType].map(function (interval) {
    return rootMidi + interval;
  });
}

export var MAJOR_DEGREE_QUALITIES: ChordType[] = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];
export var MINOR_DEGREE_QUALITIES: ChordType[] = ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'];

export function diatonicChord(rootMidi: number, scaleType: ScaleType, degree: number): number[] {
  var scale = buildScale(rootMidi, scaleType);
  if (scale.length === 0) return [];

  var isMinorFamily = scaleType === 'naturalMinor' || scaleType === 'phrygian' || scaleType === 'dorian';
  var qualities = isMinorFamily ? MINOR_DEGREE_QUALITIES : MAJOR_DEGREE_QUALITIES;

  var deg = ((degree - 1) % scale.length + scale.length) % scale.length;
  var chordRoot = scale[deg];
  var quality = qualities[deg % qualities.length];

  return buildChord(chordRoot, quality);
}

export var PROGRESSIONS: Record<string, number[]> = {
  'I-IV-V-I': [1, 4, 5, 1],
  'I-V-vi-IV': [1, 5, 6, 4],
  'ii-V-I': [2, 5, 1],
  'i-VI-III-VII': [1, 6, 3, 7],
  '12-bar': [1, 1, 1, 1, 4, 4, 1, 1, 5, 4, 1, 5]
};

export function buildProgression(rootMidi: number, scaleType: ScaleType, progressionName: string): number[][] {
  var degrees = PROGRESSIONS[progressionName];
  if (!degrees) return [];

  return degrees.map(function (degree) {
    return diatonicChord(rootMidi, scaleType, degree);
  });
}

export function scaleNoteNames(rootMidi: number, scaleType: ScaleType): string[] {
  return buildScale(rootMidi, scaleType).map(function (midi) {
    return midiToNoteName(midi).name;
  });
}


export function progressionChordAt(progression: number[][], bar: number, barsPerChord: number): number[] {
  if (!Array.isArray(progression) || progression.length === 0) return [];

  var per = Math.max(1, Math.floor(barsPerChord));
  var idx = Math.floor(Math.max(0, bar) / per) % progression.length;

  return progression[idx];
}
