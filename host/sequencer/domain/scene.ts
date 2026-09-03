export interface Scene {
  name: string;
  rows: boolean[][];
}

export const ROW_COUNT = 4;
export const STEP_COUNT = 16;

function rowFromBits(bits: number[]): boolean[] {
  return bits.map(function (b) {
    return b === 1;
  });
}

export function isValidScene(scene: Scene): boolean {
  if (!scene || typeof scene.name !== 'string') return false;
  if (!Array.isArray(scene.rows) || scene.rows.length !== ROW_COUNT) return false;

  for (const row of scene.rows) {
    if (!Array.isArray(row) || row.length !== STEP_COUNT) return false;

    for (const cell of row) {
      if (typeof cell !== 'boolean') return false;
    }
  }

  return true;
}

export const builtInScenes: Scene[] = [
  {
    name: 'שער ראשית',
    rows: [
      rowFromBits([1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0]),
      rowFromBits([0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0]),
      rowFromBits([1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]),
      rowFromBits([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1])
    ]
  },
  {
    name: 'נהר מגנטה',
    rows: [
      rowFromBits([1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]),
      rowFromBits([0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1]),
      rowFromBits([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]),
      rowFromBits([0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0])
    ]
  },
  {
    name: 'ספירלת ציאן',
    rows: [
      rowFromBits([1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]),
      rowFromBits([0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0]),
      rowFromBits([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]),
      rowFromBits([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1])
    ]
  },
  {
    name: 'לב התהום',
    rows: [
      rowFromBits([1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]),
      rowFromBits([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]),
      rowFromBits([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      rowFromBits([0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0])
    ]
  }
];
