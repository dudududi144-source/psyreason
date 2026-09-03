export function mutateGrid(rows: boolean[][], rate: number, random: () => number): boolean[][] {
  var clamped = Math.max(0, Math.min(1, rate));

  return rows.map(function (row) {
    return row.map(function (cell) {
      return random() < clamped ? !cell : cell;
    });
  });
}

export function rotateRow(row: boolean[], shift: number): boolean[] {
  var n = row.length;
  if (n === 0) return [];

  var s = ((shift % n) + n) % n;
  var out: boolean[] = [];

  for (var i = 0; i < n; i++) {
    out.push(row[(i - s + n) % n]);
  }

  return out;
}

export function rotateGrid(rows: boolean[][], shift: number): boolean[][] {
  return rows.map(function (row) {
    return rotateRow(row, shift);
  });
}

export function invertGrid(rows: boolean[][]): boolean[][] {
  return rows.map(function (row) {
    return row.map(function (cell) {
      return !cell;
    });
  });
}

export function retrogradeGrid(rows: boolean[][]): boolean[][] {
  return rows.map(function (row) {
    return row.slice().reverse();
  });
}

export function gridDensity(rows: boolean[][]): number {
  var total = 0;
  var active = 0;

  for (var r = 0; r < rows.length; r++) {
    for (var c = 0; c < rows[r].length; c++) {
      total++;
      if (rows[r][c]) active++;
    }
  }

  return total === 0 ? 0 : active / total;
}

export function evolveGrid(rows: boolean[][], rate: number, random: () => number): boolean[][] {
  var mutated = mutateGrid(rows, rate, random);

  if (mutated.length > 0 && mutated[0].length > 0) {
    mutated[0][0] = true;
  }

  return mutated;
}
