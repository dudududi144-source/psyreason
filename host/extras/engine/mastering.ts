export var MASTER_DB_MIN = -60;
export var MASTER_DB_MAX = 12;
export var THRESHOLD_DB_MIN = -60;
export var THRESHOLD_DB_MAX = 0;
export var RATIO_MIN = 1;
export var RATIO_MAX = 20;

export function dbToLinear(db: number): number {
  if (!isFinite(db)) return 1;

  var clamped = Math.max(MASTER_DB_MIN, Math.min(MASTER_DB_MAX, db));

  return Math.pow(10, clamped / 20);
}

export function linearToDb(linear: number): number {
  var v = Math.max(0.000001, linear);

  return 20 * Math.log10(v);
}

export interface CompressorSettings {
  thresholdDb: number;
  ratio: number;
  attackSec: number;
  releaseSec: number;
}

export function clampCompressorSettings(settings: CompressorSettings): CompressorSettings {
  return {
    thresholdDb: Math.max(THRESHOLD_DB_MIN, Math.min(THRESHOLD_DB_MAX, settings.thresholdDb)),
    ratio: Math.max(RATIO_MIN, Math.min(RATIO_MAX, settings.ratio)),
    attackSec: Math.max(0.001, Math.min(0.5, settings.attackSec)),
    releaseSec: Math.max(0.01, Math.min(2, settings.releaseSec))
  };
}

export function estimateMakeupGainDb(thresholdDb: number, ratio: number): number {
  var t = Math.max(THRESHOLD_DB_MIN, Math.min(THRESHOLD_DB_MAX, thresholdDb));
  var r = Math.max(RATIO_MIN, Math.min(RATIO_MAX, ratio));

  return -t * (1 - 1 / r) * 0.6 + 0;
}
