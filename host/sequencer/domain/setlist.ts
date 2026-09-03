export interface PerformanceState {
  grid: boolean[][];
  velocity: number[][];
  accents: boolean[][];
  roll: number[];
}

export interface SetlistEntry {
  name: string;
  state: PerformanceState;
}

export function isValidPerformanceState(state: PerformanceState): boolean {
  if (!state) return false;
  if (!Array.isArray(state.grid) || state.grid.length === 0) return false;
  if (!Array.isArray(state.velocity)) return false;
  if (!Array.isArray(state.accents)) return false;
  if (!Array.isArray(state.roll)) return false;

  for (var i = 0; i < state.grid.length; i++) {
    if (!Array.isArray(state.grid[i])) return false;
  }

  return true;
}

export function isValidSetlistEntry(entry: SetlistEntry): boolean {
  if (!entry || typeof entry.name !== 'string' || entry.name.length === 0) return false;

  return isValidPerformanceState(entry.state);
}

export function encodeSetlistEntry(entry: SetlistEntry): string {
  return JSON.stringify(entry);
}

export function decodeSetlistEntry(raw: string): SetlistEntry | null {
  try {
    var parsed = JSON.parse(raw);

    if (!isValidSetlistEntry(parsed)) return null;

    return parsed as SetlistEntry;
  } catch {
    return null;
  }
}

export function setlistNames(entries: SetlistEntry[]): string[] {
  if (!Array.isArray(entries)) return [];

  return entries.map(function (e) {
    return e.name;
  });
}
