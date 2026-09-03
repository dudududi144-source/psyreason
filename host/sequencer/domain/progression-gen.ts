export type HarmonicFunction = 'T' | 'SD' | 'D';

export var DEGREE_FUNCTIONS: Record<number, HarmonicFunction> = {
  1: 'T',
  2: 'SD',
  3: 'T',
  4: 'SD',
  5: 'D',
  6: 'T',
  7: 'D'
};

export function nextDegreeCandidates(current: number): number[] {
  var fn = DEGREE_FUNCTIONS[current] || 'T';

  if (fn === 'T') return [2, 4, 5, 6];
  if (fn === 'SD') return [5, 7, 6];

  return [1, 6];
}

export function generateProgression(length: number, random: () => number): number[] {
  var n = Math.max(2, Math.floor(length));
  var degrees: number[] = [1];

  for (var i = 1; i < n - 1; i++) {
    var current = degrees[degrees.length - 1];
    var candidates = nextDegreeCandidates(current);

    degrees.push(candidates[Math.floor(random() * candidates.length)]);
  }

  var last = degrees[degrees.length - 1];
  var closers = nextDegreeCandidates(last);
  var closer = closers[Math.floor(random() * closers.length)];

  if (closers.indexOf(1) !== -1 && random() < 0.7) {
    closer = 1;
  }

  degrees.push(closer);

  return degrees;
}
