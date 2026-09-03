import { MAJOR_DEGREE_QUALITIES, MINOR_DEGREE_QUALITIES } from './harmony.ts';

export var PROGRESSION_VERSION = 1;

export function isValidDegrees(degrees: number[]): boolean {
  if (!Array.isArray(degrees) || degrees.length === 0) return false;

  for (var i = 0; i < degrees.length; i++) {
    var d = degrees[i];

    if (typeof d !== 'number' || !isFinite(d)) return false;
    if (Math.floor(d) !== d) return false;
    if (d < 1 || d > 7) return false;
  }

  return true;
}

export function encodeProgression(degrees: number[], name: string): string {
  return JSON.stringify({
    version: PROGRESSION_VERSION,
    name: name || 'progression',
    degrees: degrees
  });
}

export function decodeProgression(raw: string): number[] | null {
  try {
    var parsed = JSON.parse(raw);

    if (!parsed || parsed.version !== PROGRESSION_VERSION) return null;
    if (!isValidDegrees(parsed.degrees)) return null;

    return parsed.degrees.slice();
  } catch {
    return null;
  }
}

export function degreeRoman(degree: number, isMinor: boolean): string {
  if (degree < 1 || degree > 7) return '?';

  var romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  var qualities = isMinor ? MINOR_DEGREE_QUALITIES : MAJOR_DEGREE_QUALITIES;
  var quality = qualities[degree - 1];
  var roman = romans[degree - 1];

  if (quality === 'min') return roman.toLowerCase();
  if (quality === 'dim') return roman.toLowerCase() + '°';

  return roman;
}

export function progressionLabel(degrees: number[], isMinor: boolean): string {
  if (!isValidDegrees(degrees)) return '';

  return degrees
    .map(function (d) {
      return degreeRoman(d, isMinor);
    })
    .join(' → ');
}
