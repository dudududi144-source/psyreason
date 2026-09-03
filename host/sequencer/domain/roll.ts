export interface Roll {
  steps: number[];
}

export function createEmptyRoll(steps: number): Roll {
  var safeSteps = Math.max(0, Math.floor(steps));
  var arr: number[] = [];

  for (var i = 0; i < safeSteps; i++) {
    arr.push(-1);
  }

  return { steps: arr };
}

export function isValidRoll(roll: Roll, maxDegree: number): boolean {
  if (!roll || !Array.isArray(roll.steps)) return false;

  for (var i = 0; i < roll.steps.length; i++) {
    var v = roll.steps[i];

    if (typeof v !== 'number' || isNaN(v)) return false;
    if (v !== -1 && (v < 0 || v > maxDegree)) return false;
  }

  return true;
}

export function rollSetNote(roll: Roll, step: number, degree: number): Roll {
  if (!roll || !Array.isArray(roll.steps)) return roll;
  if (step < 0 || step >= roll.steps.length) return roll;

  var next = roll.steps.slice();
  next[step] = degree;

  return { steps: next };
}

export function rollClearStep(roll: Roll, step: number): Roll {
  return rollSetNote(roll, step, -1);
}

export function rollNoteAt(roll: Roll, step: number): number {
  if (!roll || !Array.isArray(roll.steps)) return -1;
  if (step < 0 || step >= roll.steps.length) return -1;

  var v = roll.steps[step];
  return typeof v === 'number' ? v : -1;
}

export function rollDensity(roll: Roll): number {
  if (!roll || !Array.isArray(roll.steps) || roll.steps.length === 0) return 0;

  var active = 0;

  for (var i = 0; i < roll.steps.length; i++) {
    if (roll.steps[i] !== -1) active++;
  }

  return active / roll.steps.length;
}

export function encodeRoll(roll: Roll): string {
  return JSON.stringify(roll);
}

export function decodeRoll(raw: string, maxDegree: number): Roll | null {
  try {
    var parsed = JSON.parse(raw);

    if (!isValidRoll(parsed, maxDegree)) return null;

    return parsed as Roll;
  } catch {
    return null;
  }
}
