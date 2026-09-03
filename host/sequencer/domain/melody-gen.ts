export function generateMelody(length: number, maxDegree: number, random: () => number): number[] {
  if (length <= 0 || maxDegree <= 0) return [];

  var melody: number[] = [];
  var current = Math.floor(random() * (maxDegree + 1));

  for (var i = 0; i < length; i++) {
    if (random() < 0.2) {
      melody.push(-1);
      continue;
    }

    var rollValue = random();
    var step: number;

    if (rollValue < 0.6) {
      step = random() < 0.5 ? 1 : -1;
    } else if (rollValue < 0.85) {
      step = (random() < 0.5 ? 1 : -1) * 2;
    } else {
      step = (random() < 0.5 ? 1 : -1) * (3 + Math.floor(random() * 2));
    }

    current = current + step;

    if (current < 0) current = 0;
    if (current > maxDegree) current = maxDegree;

    melody.push(current);
  }

  return melody;
}

export function melodyNoteCount(melody: number[]): number {
  if (!Array.isArray(melody)) return 0;

  var count = 0;

  for (var i = 0; i < melody.length; i++) {
    if (melody[i] >= 0) count++;
  }

  return count;
}
