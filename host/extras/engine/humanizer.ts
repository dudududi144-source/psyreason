export function mulberry32(seed: number): () => number {
  var state = seed >>> 0;

  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    var t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function jitterVelocity(velocity: number, amount: number, random: () => number): number {
  var clampedAmount = Math.max(0, Math.min(1, amount));
  var jitter = (random() * 2 - 1) * clampedAmount * 0.18;

  return Math.max(0.2, Math.min(1.6, velocity * (1 + jitter)));
}

export function driftTime(amount: number, random: () => number): number {
  var clampedAmount = Math.max(0, Math.min(1, amount));

  return (random() * 2 - 1) * clampedAmount * 0.018;
}

export function shouldSkip(row: number, amount: number, random: () => number): boolean {
  if (row === 0) return false;

  var clamped = Math.max(0, Math.min(1, amount));
  if (clamped <= 0.5) return false;

  var skipChance = (clamped - 0.5) * 0.3;
  return random() < skipChance;
}
