export type ArpMode = 'block' | 'up' | 'down' | 'updown' | 'random';

export var ARP_MODES: ArpMode[] = ['block', 'up', 'down', 'updown', 'random'];

export function arpSequence(notes: number[], mode: ArpMode, length: number, random: () => number): number[] {
  if (!Array.isArray(notes) || notes.length === 0) return [];

  var n = Math.max(0, Math.floor(length));
  var sorted = notes.slice().sort(function (a, b) {
    return a - b;
  });

  if (mode === 'random') {
    var out: number[] = [];

    for (var i = 0; i < n; i++) {
      out.push(sorted[Math.floor(random() * sorted.length)]);
    }

    return out;
  }

  var base: number[];

  if (mode === 'down') {
    base = sorted.slice().reverse();
  } else if (mode === 'updown') {
    base = sorted.concat(sorted.slice(1, sorted.length - 1).reverse());
  } else {
    base = sorted;
  }

  if (base.length === 0) return [];

  var seq: number[] = [];

  for (var j = 0; j < n; j++) {
    seq.push(base[j % base.length]);
  }

  return seq;
}
