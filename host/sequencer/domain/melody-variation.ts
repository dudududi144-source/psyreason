export function varyMelody(melody: number[], amount: number, maxDegree: number, random: () => number): number[] {
  if (!Array.isArray(melody)) return [];

  var amt = Math.max(0, Math.min(1, amount));

  return melody.map(function (note) {
    if (random() < amt) {
      if (note < 0) return note;

      var rollValue = random();
      var shift: number;

      if (rollValue < 0.7) {
        shift = random() < 0.5 ? 1 : -1;
      } else {
        shift = (random() < 0.5 ? 1 : -1) * 2;
      }

      var newNote = note + shift;

      if (newNote < 0) newNote = 0;
      if (newNote > maxDegree) newNote = maxDegree;

      return newNote;
    }

    return note;
  });
}

export function melodyChanged(original: number[], varied: number[]): boolean {
  if (!Array.isArray(original) || !Array.isArray(varied)) return true;
  if (original.length !== varied.length) return true;

  for (var i = 0; i < original.length; i++) {
    if (original[i] !== varied[i]) return true;
  }

  return false;
}
