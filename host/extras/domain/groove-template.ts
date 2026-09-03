export var GROOVE_ROWS = 4;
export var GROOVE_STEPS = 16;

export interface GrooveTemplate {
  name: string;
  accents: boolean[][];
}

export type GrooveMergeMode = 'replace' | 'or' | 'and';

function bitsToRow(bits: number[]): boolean[] {
  return bits.map(function (b) {
    return b === 1;
  });
}

export var GROOVE_TEMPLATES: GrooveTemplate[] = [
  {
    name: 'Four-on-the-Floor',
    accents: [
      bitsToRow([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
      bitsToRow([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
      bitsToRow([1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]),
      bitsToRow([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0])
    ]
  },
  {
    name: 'Backbeat',
    accents: [
      bitsToRow([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]),
      bitsToRow([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]),
      bitsToRow([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]),
      bitsToRow([0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1])
    ]
  },
  {
    name: 'Offbeat Pulse',
    accents: [
      bitsToRow([0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]),
      bitsToRow([0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]),
      bitsToRow([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      bitsToRow([0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0])
    ]
  },
  {
    name: 'Half-Time',
    accents: [
      bitsToRow([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]),
      bitsToRow([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]),
      bitsToRow([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      bitsToRow([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
    ]
  }
];

export function isValidGrooveTemplate(template: GrooveTemplate): boolean {
  if (!template || typeof template.name !== 'string' || template.name.length === 0) return false;
  if (!Array.isArray(template.accents) || template.accents.length !== GROOVE_ROWS) return false;

  for (var r = 0; r < template.accents.length; r++) {
    var row = template.accents[r];

    if (!Array.isArray(row) || row.length !== GROOVE_STEPS) return false;

    for (var c = 0; c < row.length; c++) {
      if (typeof row[c] !== 'boolean') return false;
    }
  }

  return true;
}

export function grooveNames(): string[] {
  return GROOVE_TEMPLATES.map(function (t) {
    return t.name;
  });
}

export function applyGrooveTemplate(current: boolean[][], template: GrooveTemplate, mode: GrooveMergeMode): boolean[][] {
  if (!isValidGrooveTemplate(template)) {
    return current.map(function (row) {
      return row.slice();
    });
  }

  return template.accents.map(function (grooveRow, r) {
    var currentRow = Array.isArray(current[r]) ? current[r] : [];

    return grooveRow.map(function (grooveCell, c) {
      var currentCell = currentRow[c] === true;

      if (mode === 'or') return currentCell || grooveCell;
      if (mode === 'and') return currentCell && grooveCell;

      return grooveCell;
    });
  });
}
