const DEFAULT_MAX_ENTRIES = 10;

export function normalizeGlobalScores(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .map(entry => Number(entry?.score) || 0)
    .filter(score => score > 0)
    .sort((a, b) => b - a);
}

export function analyzeGlobalLeaderboardScore(score, entries = [], options = {}) {
  const maxEntries = Number(options.maxEntries) || DEFAULT_MAX_ENTRIES;
  const finalScore = Math.max(0, Number(score) || 0);
  const scores = normalizeGlobalScores(entries);
  const cutoffScore = scores.length >= maxEntries ? scores[maxEntries - 1] : 0;
  const firstScore = scores[0] || 0;
  const thirdScore = scores[2] || 0;
  const qualifyingScore = scores.length >= maxEntries ? cutoffScore + 1 : 1;
  const top3Score = thirdScore > 0 ? thirdScore + 1 : 1;
  const numberOneScore = firstScore > 0 ? firstScore + 1 : 1;
  const placement = finalScore > 0 ? scores.filter(existingScore => existingScore >= finalScore).length + 1 : null;
  const qualified = finalScore >= qualifyingScore;
  const top3 = qualified && placement != null && placement <= 3;
  const numberOne = qualified && placement === 1;
  const nearGlobal = !qualified && qualifyingScore > 1 && finalScore >= Math.ceil(qualifyingScore * 0.82);
  const nearTop3 = !top3 && top3Score > 1 && finalScore >= Math.ceil(top3Score * 0.82);
  const nearNumberOne = !numberOne && numberOneScore > 1 && finalScore >= Math.ceil(numberOneScore * 0.9);

  let tier = 'none';
  if (numberOne) tier = 'number1';
  else if (top3) tier = 'top3';
  else if (qualified) tier = 'global';
  else if (nearGlobal) tier = 'near_global';

  return {
    score: finalScore,
    placement,
    tier,
    qualified,
    top3,
    numberOne,
    nearGlobal,
    nearTop3,
    nearNumberOne,
    cutoffScore,
    firstScore,
    thirdScore,
    qualifyingScore,
    top3Score,
    numberOneScore,
    scoreToGlobal: Math.max(0, qualifyingScore - finalScore),
    scoreToTop3: Math.max(0, top3Score - finalScore),
    scoreToNumberOne: Math.max(0, numberOneScore - finalScore),
    scoresCount: scores.length
  };
}
