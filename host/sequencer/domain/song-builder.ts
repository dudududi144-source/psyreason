import { generateMelody } from './melody-gen.ts';

export interface SongPlan {
  melody: number[];
  progressionIndex: number;
  grooveIndex: number;
}

export function buildSongPlan(melodyLength: number, maxDegree: number, progressionCount: number, grooveCount: number, random: () => number): SongPlan {
  var melody = generateMelody(melodyLength, maxDegree, random);
  var progressionIndex = progressionCount > 0 ? Math.floor(random() * progressionCount) % progressionCount : 0;
  var grooveIndex = grooveCount > 0 ? Math.floor(random() * grooveCount) % grooveCount : 0;

  return {
    melody: melody,
    progressionIndex: progressionIndex,
    grooveIndex: grooveIndex
  };
}

export function isValidSongPlan(plan: SongPlan): boolean {
  if (!plan) return false;
  if (!Array.isArray(plan.melody)) return false;
  if (typeof plan.progressionIndex !== 'number' || plan.progressionIndex < 0) return false;
  if (typeof plan.grooveIndex !== 'number' || plan.grooveIndex < 0) return false;

  return true;
}
