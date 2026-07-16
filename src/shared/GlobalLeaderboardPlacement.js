const DEFAULT_MAX_ENTRIES = 40;

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
  const tenthScore = scores[9] || 0;
  const qualifyingScore = scores.length >= maxEntries ? cutoffScore + 1 : 1;
  const top3Score = thirdScore > 0 ? thirdScore + 1 : 1;
  const top10Score = tenthScore > 0 ? tenthScore + 1 : 1;
  const numberOneScore = firstScore > 0 ? firstScore + 1 : 1;
  const placement = finalScore > 0 ? scores.filter(existingScore => existingScore >= finalScore).length + 1 : null;
  const qualified = finalScore >= qualifyingScore;
  const top3 = qualified && placement != null && placement <= 3;
  const top10 = qualified && placement != null && placement <= 10;
  const numberOne = qualified && placement === 1;
  const nearGlobal = !qualified && qualifyingScore > 1 && finalScore >= Math.ceil(qualifyingScore * 0.82);
  const nearTop10 = !top10 && top10Score > 1 && finalScore >= Math.ceil(top10Score * 0.82);
  const nearTop3 = !top3 && top3Score > 1 && finalScore >= Math.ceil(top3Score * 0.82);
  const nearNumberOne = !numberOne && numberOneScore > 1 && finalScore >= Math.ceil(numberOneScore * 0.9);

  let tier = 'none';
  if (numberOne) tier = 'number1';
  else if (top3) tier = 'top3';
  else if (top10) tier = 'top10';
  else if (qualified) tier = 'global';
  else if (nearGlobal) tier = 'near_global';

  return {
    score: finalScore,
    placement,
    tier,
    qualified,
    top3,
    top10,
    numberOne,
    nearGlobal,
    nearTop10,
    nearTop3,
    nearNumberOne,
    cutoffScore,
    firstScore,
    thirdScore,
    tenthScore,
    qualifyingScore,
    top3Score,
    top10Score,
    numberOneScore,
    scoreToGlobal: Math.max(0, qualifyingScore - finalScore),
    scoreToTop3: Math.max(0, top3Score - finalScore),
    scoreToTop10: Math.max(0, top10Score - finalScore),
    scoreToNumberOne: Math.max(0, numberOneScore - finalScore),
    scoresCount: scores.length
  };
}

function normalizeRivalEntries(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry, index) => {
      const entryScore = Math.max(0, Math.floor(Number(entry?.score) || 0));
      if (entryScore <= 0) return null;
      const rawRank = Number(entry?.rank);
      return {
        entry,
        score: entryScore,
        rank: Number.isFinite(rawRank) && rawRank > 0 ? Math.floor(rawRank) : index + 1,
        name: String(entry?.name || entry?.playerName || '').trim(),
        isCurrentPlayer: Boolean(entry?.isCurrentPlayer)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || b.score - a.score || a.name.localeCompare(b.name));
}

/**
 * Builds a read-only target from the downloaded leaderboard snapshot.
 * This intentionally does not participate in qualification, score submission,
 * achievements, or stored leaderboard state.
 */
export function analyzeGlobalRivalProjection(score, entries = [], options = {}) {
  const maxEntries = Math.max(1, Math.floor(Number(options.maxEntries) || DEFAULT_MAX_ENTRIES));
  const currentScore = Math.max(0, Math.floor(Number(score) || 0));
  const normalized = normalizeRivalEntries(entries);
  if (normalized.length === 0) return null;

  const boardFull = normalized.length >= maxEntries;
  const visibleBoard = normalized.slice(0, maxEntries);
  const nonSelfEntries = visibleBoard.filter((entry) => !entry.isCurrentPlayer);
  const cutoffEntry = visibleBoard[visibleBoard.length - 1] || null;
  const cutoffScore = Math.max(0, Number(cutoffEntry?.score) || 0);
  const outsideDownloadedBoard = boardFull && currentScore <= cutoffScore;

  let target = null;
  let targetKind = 'number_one';
  if (outsideDownloadedBoard) {
    target = cutoffEntry?.isCurrentPlayer
      ? [...nonSelfEntries].reverse().find((entry) => entry.score >= currentScore) || null
      : cutoffEntry;
    targetKind = target ? 'board_gate' : 'number_one';
  } else {
    target = nonSelfEntries
      .filter((entry) => entry.score >= currentScore)
      .sort((a, b) => a.score - b.score || a.rank - b.rank || a.name.localeCompare(b.name))[0] || null;
    targetKind = target ? 'next_rival' : 'number_one';
  }

  const targetScore = target ? target.score + 1 : 0;
  const projectedPlacement = outsideDownloadedBoard
    ? null
    : nonSelfEntries.filter((entry) => entry.score >= currentScore).length + 1;

  return {
    available: true,
    currentScore,
    targetKind,
    target: target ? target.entry : null,
    targetName: target?.name || '',
    targetRank: target?.rank || null,
    targetEntryScore: target?.score || 0,
    targetScore,
    scoreToPass: Math.max(0, targetScore - currentScore),
    projectedPlacement,
    projectedNumberOne: targetKind === 'number_one',
    boardFull,
    boardCount: visibleBoard.length,
    cutoffScore,
    snapshotOnly: true
  };
}
