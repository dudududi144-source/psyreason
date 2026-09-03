export interface ScheduledStep {
  step: number;
  time: number;
}

export interface SchedulerWindow {
  due: ScheduledStep[];
  nextStep: number;
  nextStepTime: number;
}

export function secondsPerStep(bpm: number, subdivisionsPerBeat: number): number {
  if (bpm <= 0 || subdivisionsPerBeat <= 0) return 0.125;
  return 60 / bpm / subdivisionsPerBeat;
}

export function applySwing(time: number, step: number, swing: number, stepSeconds: number): number {
  if (step % 2 === 1 && swing > 0) {
    return time + swing * stepSeconds * 0.5;
  }
  return time;
}

export function collectWindow(
  nextStep: number,
  nextStepTime: number,
  horizonTime: number,
  stepSeconds: number,
  totalSteps: number,
  swing: number
): SchedulerWindow {
  const due: ScheduledStep[] = [];
  let step = nextStep;
  let time = nextStepTime;

  while (time < horizonTime) {
    due.push({ step: step, time: applySwing(time, step, swing, stepSeconds) });
    step = (step + 1) % totalSteps;
    time = time + stepSeconds;
  }

  return { due: due, nextStep: step, nextStepTime: time };
}
