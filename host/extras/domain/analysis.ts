export interface GridAnalysis {
  density: number;
  syncopation: number;
  energyCurve: number[];
  activeSteps: number;
}

export function gridDensity(grid: boolean[][]): number {
  if (!Array.isArray(grid) || grid.length === 0) return 0;

  var total = 0;
  var active = 0;

  for (var r = 0; r < grid.length; r++) {
    if (!Array.isArray(grid[r])) continue;

    for (var c = 0; c < grid[r].length; c++) {
      total++;
      if (grid[r][c]) active++;
    }
  }

  return total === 0 ? 0 : active / total;
}

export function energyCurve(grid: boolean[][]): number[] {
  var steps = 16;

  if (Array.isArray(grid) && grid.length > 0 && Array.isArray(grid[0])) {
    steps = grid[0].length;
  }

  var curve: number[] = [];

  for (var c = 0; c < steps; c++) {
    var active = 0;
    var rows = 0;

    for (var r = 0; r < grid.length; r++) {
      if (!Array.isArray(grid[r])) continue;

      rows++;
      if (grid[r][c]) active++;
    }

    curve.push(rows === 0 ? 0 : active / rows);
  }

  return curve;
}

export function syncopationScore(grid: boolean[][]): number {
  if (!Array.isArray(grid) || grid.length === 0) return 0;

  var weighted = 0;
  var total = 0;

  for (var r = 0; r < grid.length; r++) {
    if (!Array.isArray(grid[r])) continue;

    for (var c = 0; c < grid[r].length; c++) {
      if (!grid[r][c]) continue;

      total++;

      if (c % 4 === 0) {
        weighted += 0;
      } else if (c % 2 === 1) {
        weighted += 1;
      } else {
        weighted += 0.5;
      }
    }
  }

  return total === 0 ? 0 : weighted / total;
}

export function analyzeGrid(grid: boolean[][]): GridAnalysis {
  var curve = energyCurve(grid);
  var activeSteps = 0;

  for (var i = 0; i < curve.length; i++) {
    if (curve[i] > 0) activeSteps++;
  }

  return {
    density: gridDensity(grid),
    syncopation: syncopationScore(grid),
    energyCurve: curve,
    activeSteps: activeSteps
  };
}

export type MelodicContour = 'ascending' | 'descending' | 'arch' | 'wave' | 'static';

export interface MelodyAnalysis {
  noteCount: number;
  range: number;
  averageInterval: number;
  contour: MelodicContour;
}

export function analyzeMelody(roll: number[]): MelodyAnalysis {
  if (!Array.isArray(roll)) {
    return { noteCount: 0, range: 0, averageInterval: 0, contour: 'static' };
  }

  var notes: number[] = [];

  for (var i = 0; i < roll.length; i++) {
    if (roll[i] >= 0) notes.push(roll[i]);
  }

  if (notes.length === 0) {
    return { noteCount: 0, range: 0, averageInterval: 0, contour: 'static' };
  }

  var min = notes[0];
  var max = notes[0];

  for (var j = 0; j < notes.length; j++) {
    if (notes[j] < min) min = notes[j];
    if (notes[j] > max) max = notes[j];
  }

  var intervals: number[] = [];

  for (var k = 1; k < notes.length; k++) {
    intervals.push(notes[k] - notes[k - 1]);
  }

  var averageInterval = 0;

  if (intervals.length > 0) {
    var sum = 0;

    for (var m = 0; m < intervals.length; m++) {
      sum += Math.abs(intervals[m]);
    }

    averageInterval = sum / intervals.length;
  }

  var contour: MelodicContour = 'static';

  if (notes.length >= 2) {
    var rises = 0;
    var falls = 0;
    var changes = 0;
    var lastSign = 0;

    for (var n = 0; n < intervals.length; n++) {
      var sign = intervals[n] > 0 ? 1 : intervals[n] < 0 ? -1 : 0;

      if (sign > 0) rises++;
      if (sign < 0) falls++;

      if (sign !== 0 && lastSign !== 0 && sign !== lastSign) changes++;
      if (sign !== 0) lastSign = sign;
    }

    if (rises === 0 && falls === 0) {
      contour = 'static';
    } else if (falls === 0 && rises > 0) {
      contour = 'ascending';
    } else if (rises === 0 && falls > 0) {
      contour = 'descending';
    } else if (changes === 1) {
      contour = 'arch';
    } else {
      contour = 'wave';
    }
  }

  return {
    noteCount: notes.length,
    range: max - min,
    averageInterval: averageInterval,
    contour: contour
  };
}
