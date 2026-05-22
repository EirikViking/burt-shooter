export const SCORE_NORMALIZATION_FACTOR = 0.1;
export const SCORE_NORMALIZATION_ROUNDING = 'Math.round';

export function normalizeScoreDelta(points, multiplier = 1) {
  const base = Number(points) || 0;
  const mult = Number(multiplier) || 1;
  return Math.max(0, Math.round(base * mult * SCORE_NORMALIZATION_FACTOR));
}

export function normalizeLegacyScoreForReset(score) {
  return Math.max(0, Math.round((Number(score) || 0) * SCORE_NORMALIZATION_FACTOR));
}
