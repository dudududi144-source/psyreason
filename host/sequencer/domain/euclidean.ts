export function euclidean(pulses: number, steps: number, rotation: number): boolean[] {
  if (steps <= 0) return [];

  var safeSteps = Math.max(1, Math.floor(steps));
  var safePulses = Math.max(0, Math.min(Math.floor(pulses), safeSteps));

  var pattern: boolean[] = [];
  for (var i = 0; i < safeSteps; i++) {
    pattern.push((i * safePulses) % safeSteps < safePulses);
  }

  var safeRotation = ((Math.floor(rotation) % safeSteps) + safeSteps) % safeSteps;
  if (safeRotation === 0) return pattern;

  var rotated: boolean[] = [];
  for (var j = 0; j < safeSteps; j++) {
    rotated.push(pattern[(j - safeRotation + safeSteps) % safeSteps]);
  }

  return rotated;
}

export function euclideanDensity(pulses: number, steps: number): number {
  if (steps <= 0) return 0;
  var safePulses = Math.max(0, Math.min(Math.floor(pulses), Math.floor(steps)));
  return safePulses / Math.floor(steps);
}
