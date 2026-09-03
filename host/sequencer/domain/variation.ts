export var VARIATION_SLOT_COUNT = 4;

export interface VariationSlots {
  slots: (boolean[][] | null)[];
}

export function createVariationSlots(count: number): VariationSlots {
  var safeCount = Math.max(1, Math.floor(count));
  var slots: (boolean[][] | null)[] = [];

  for (var i = 0; i < safeCount; i++) {
    slots.push(null);
  }

  return { slots: slots };
}

export function copyGrid(grid: boolean[][]): boolean[][] {
  return grid.map(function (row) {
    return row.slice();
  });
}

export function captureSlot(store: VariationSlots, index: number, grid: boolean[][]): VariationSlots {
  if (!store || !Array.isArray(store.slots)) return store;
  if (index < 0 || index >= store.slots.length) return store;
  if (!Array.isArray(grid)) return store;

  var next = store.slots.slice();
  next[index] = copyGrid(grid);

  return { slots: next };
}

export function loadSlot(store: VariationSlots, index: number): boolean[][] | null {
  if (!store || !Array.isArray(store.slots)) return null;
  if (index < 0 || index >= store.slots.length) return null;

  var grid = store.slots[index];

  return grid ? copyGrid(grid) : null;
}

export function clearSlot(store: VariationSlots, index: number): VariationSlots {
  if (!store || !Array.isArray(store.slots)) return store;
  if (index < 0 || index >= store.slots.length) return store;

  var next = store.slots.slice();
  next[index] = null;

  return { slots: next };
}

export function filledSlotCount(store: VariationSlots): number {
  if (!store || !Array.isArray(store.slots)) return 0;

  var count = 0;

  for (var i = 0; i < store.slots.length; i++) {
    if (store.slots[i]) count++;
  }

  return count;
}
