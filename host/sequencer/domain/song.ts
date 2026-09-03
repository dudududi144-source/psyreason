export interface SongStep {
  sceneIndex: number;
  bars: number;
}

export interface Song {
  steps: SongStep[];
  loop: boolean;
}

export function createSong(steps: SongStep[], loop: boolean): Song {
  return { steps: steps, loop: loop };
}

export function totalBars(song: Song): number {
  var sum = 0;
  for (var i = 0; i < song.steps.length; i++) {
    sum += Math.max(0, song.steps[i].bars);
  }
  return sum;
}

export function sceneAtBar(song: Song, bar: number): number {
  if (song.steps.length === 0) return -1;

  var total = totalBars(song);
  if (total === 0) return -1;

  var b = bar;
  if (song.loop) {
    b = ((bar % total) + total) % total;
  } else if (bar < 0 || bar >= total) {
    return -1;
  }

  var acc = 0;
  for (var i = 0; i < song.steps.length; i++) {
    if (b < acc + song.steps[i].bars) {
      return song.steps[i].sceneIndex;
    }
    acc += song.steps[i].bars;
  }

  return -1;
}
