export interface MasteringPreset {
  name: string;
  masterDb: number;
  eqLowDb: number;
  eqMidDb: number;
  eqHighDb: number;
  compThreshold: number;
  compRatio: number;
}

export function isValidMasteringPreset(preset: MasteringPreset): boolean {
  if (!preset || typeof preset.name !== 'string' || preset.name.length === 0) return false;

  var fields = ['masterDb', 'eqLowDb', 'eqMidDb', 'eqHighDb', 'compThreshold', 'compRatio'];

  for (var i = 0; i < fields.length; i++) {
    var value = preset[fields[i] as keyof MasteringPreset];

    if (typeof value !== 'number' || isNaN(value)) return false;
  }

  return true;
}

export function encodeMasteringPreset(preset: MasteringPreset): string {
  return JSON.stringify(preset);
}

export function decodeMasteringPreset(raw: string): MasteringPreset | null {
  try {
    var parsed = JSON.parse(raw);

    if (!isValidMasteringPreset(parsed)) return null;

    return parsed as MasteringPreset;
  } catch {
    return null;
  }
}

export function defaultMasteringPresets(): MasteringPreset[] {
  return [
    { name: 'שטוח', masterDb: -2, eqLowDb: 0, eqMidDb: 0, eqHighDb: 0, compThreshold: -14, compRatio: 8 },
    { name: 'חם', masterDb: -2, eqLowDb: 4, eqMidDb: -1, eqHighDb: -3, compThreshold: -16, compRatio: 6 },
    { name: 'בהיר', masterDb: -2, eqLowDb: -2, eqMidDb: 1, eqHighDb: 5, compThreshold: -14, compRatio: 8 },
    { name: 'דחוס', masterDb: -1, eqLowDb: 0, eqMidDb: 0, eqHighDb: 0, compThreshold: -24, compRatio: 14 },
    { name: 'מרווח', masterDb: -4, eqLowDb: 1, eqMidDb: -2, eqHighDb: 2, compThreshold: -10, compRatio: 4 }
  ];
}
