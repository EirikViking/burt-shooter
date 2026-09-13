export function awardRunClearScoreBonuses(game, { clearBonus = 0, livesBonus = 0, awardKey = 'run_clear' } = {}) {
  if (!game) {
    return {
      awardKey: 'run_clear',
      clearBonus: 0,
      livesBonus: 0,
      appliedClearBonus: 0,
      appliedLivesBonus: 0,
      appliedTotal: 0,
      scoreAfter: 0,
      alreadyApplied: false
    };
  }

  const normalizedAwardKey = String(awardKey || 'run_clear').trim().slice(0, 80) || 'run_clear';
  if (!game.runClearScoreBonusAwards || typeof game.runClearScoreBonusAwards !== 'object') {
    game.runClearScoreBonusAwards = {};
  }
  if (game.runClearScoreBonusAward && !game.runClearScoreBonusAwards.run_clear) {
    game.runClearScoreBonusAwards.run_clear = game.runClearScoreBonusAward;
  }
  if (game.runClearScoreBonusAwards[normalizedAwardKey]) {
    return { ...game.runClearScoreBonusAwards[normalizedAwardKey], alreadyApplied: true };
  }

  const baseClearBonus = Math.max(0, Math.floor(Number(clearBonus) || 0));
  const baseLivesBonus = Math.max(0, Math.floor(Number(livesBonus) || 0));
  const appliedClearBonus = applyExactScoreBonus(game, baseClearBonus, 'runClearBonus');
  const appliedLivesBonus = applyExactScoreBonus(game, baseLivesBonus, 'remainingLivesBonus');

  const award = {
    awardKey: normalizedAwardKey,
    clearBonus: baseClearBonus,
    livesBonus: baseLivesBonus,
    appliedClearBonus,
    appliedLivesBonus,
    appliedTotal: appliedClearBonus + appliedLivesBonus,
    scoreAfter: game.score
  };
  game.runClearScoreBonusAwards[normalizedAwardKey] = award;
  if (normalizedAwardKey === 'run_clear') {
    game.runClearScoreBonusAward = award;
  }
  return { ...award, alreadyApplied: false };
}

function applyExactScoreBonus(game, amount, source) {
  const applied = Math.max(0, Math.floor(Number(amount) || 0));
  if (applied <= 0) return 0;

  game.score = Math.max(0, Math.floor(Number(game.score) || 0)) + applied;
  if (!game.scoreBreakdown && typeof game.createEmptyScoreBreakdown === 'function') {
    game.scoreBreakdown = game.createEmptyScoreBreakdown();
  }
  if (game.scoreBreakdown) {
    const breakdownKey = game.scoreBreakdown[source] !== undefined ? source : 'baseScore';
    game.scoreBreakdown[breakdownKey] += applied;
    game.scoreBreakdown.finalScore = game.score;
  }
  game.updateLiveRunRank?.({ force: true });
  game.updateGlobalLeaderboardVoiceCues?.();
  return applied;
}
