export interface Groove {
  name: string;
  rows: boolean[][];
}

export type GrooveMergeMode = 'replace' | 'or' | 'and';

function row(bits: number[]): boolean[] {
  return bits.map(function (b) {
    return b === 1;
  });
}

export var GROOVES: Groove[] = [
  {
    name: 'Four on the Floor',
    rows: [
      row([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
      row([0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]),
      row([1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]),
      row([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0])
    ]
  },
  {
    name: 'Breakbeat',
    rows: [
      row([1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0]),
      row([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]),
      row([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      row([0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1])
    ]
  },
  {
    name: 'Half-Time',
    rows: [
      row([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]),
      row([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]),
      row([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      row([0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1])
    ]
  },
  {
    name: 'Psytrance Gallop',
    rows: [
      row([1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
      row([0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]),
      row([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      row([0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0])
    ]
  },
  {
    name: 'Dub Step',
    rows: [
      row([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]),
      row([0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]),
      row([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      row([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1])
    ]
  },
  {
    name: 'Tribal',
    rows: [
      row([1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0]),
      row([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
      row([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      row([0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1])
    ]
  }
];

export function isValidGroove(groove: Groove): boolean {
  if (!groove || typeof groove.name !== 'string') return false;
  if (!Array.isArray(groove.rows) || groove.rows.length !== 4) return false;

  for (var r = 0; r < groove.rows.length; r++) {
    var rowArr = groove.rows[r];
    if (!Array.isArray(rowArr) || rowArr.length !== 16) return false;

    for (var c = 0; c < rowArr.length; c++) {
      if (typeof rowArr[c] !== 'boolean') return false;
    }
  }

  return true;
}

export function grooveNames(): string[] {
  return GROOVES.map(function (g) {
    return g.name;
  });
}

export function grooveByName(name: string): Groove | null {
  for (var i = 0; i < GROOVES.length; i++) {
    if (GROOVES[i].name === name) return GROOVES[i];
  }

  return null;
}

export function grooveDensity(groove: Groove): number {
  if (!isValidGroove(groove)) return 0;

  var active = 0;
  var total = 0;

  for (var r = 0; r < groove.rows.length; r++) {
    for (var c = 0; c < groove.rows[r].length; c++) {
      total++;
      if (groove.rows[r][c]) active++;
    }
  }

  return total === 0 ? 0 : active / total;
}

export function mergeGroove(current: boolean[][], groove: Groove, mode: GrooveMergeMode): boolean[][] {
  if (!isValidGroove(groove)) return current.map(function (rowArr) { return rowArr.slice(); });

  return groove.rows.map(function (grooveRow, r) {
    var currentRow = Array.isArray(current[r]) ? current[r] : [];

    return grooveRow.map(function (grooveCell, c) {
      var currentCell = currentRow[c] === true;

      if (mode === 'or') return currentCell || grooveCell;
      if (mode === 'and') return currentCell && grooveCell;

      return grooveCell;
    });
  });
}
