export function transposeDegrees(roll: number[], degrees: number, maxDegree: number): number[] {
  if (!Array.isArray(roll)) return [];

  return roll.map(function (d) {
    if (d < 0) return d;

    return Math.max(0, Math.min(maxDegree, d + degrees));
  });
}

export function reverseRoll(roll: number[]): number[] {
  if (!Array.isArray(roll)) return [];

  return roll.slice().reverse();
}

export function rollAxis(roll: number[]): number {
  if (!Array.isArray(roll)) return 0;

  var active = roll.filter(function (d) {
    return d >= 0;
  });

  if (active.length === 0) return 0;

  var min = Math.min.apply(null, active);
  var max = Math.max.apply(null, active);

  return Math.floor((min + max) / 2);
}

export function invertRoll(roll: number[], axis: number): number[] {
  if (!Array.isArray(roll)) return [];

  return roll.map(function (d) {
    if (d < 0) return d;

    return axis * 2 - d;
  });
}

export function randomRoll(length: number, maxDegree: number, density: number, random: () => number): number[] {
  var len = Math.max(0, Math.floor(length));
  var dens = Math.max(0, Math.min(1, density));
  var maxDeg = Math.max(0, Math.floor(maxDegree));
  var out: number[] = [];

  for (var i = 0; i < len; i++) {
    if (random() < dens) {
      out.push(Math.floor(random() * (maxDeg + 1)));
    } else {
      out.push(-1);
    }
  }

  return out;
}
