export interface Step {
  active: boolean;
  velocity: number;
  note?: number;
  channel?: number;
}

export interface Pattern {
  steps: Step[];
}

export function createPattern(steps: Step[]): Pattern {
  return { steps };
}

export function stepAt(pattern: Pattern, index: number): Step {
  if (pattern.steps.length === 0) {
    return { active: false, velocity: 0 };
  }

  const safeIndex = ((index % pattern.steps.length) + pattern.steps.length) % pattern.steps.length;
  return pattern.steps[safeIndex];
}
