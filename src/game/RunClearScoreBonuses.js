export function awardRunClearScoreBonuses(game, { clearBonus = 0, livesBonus = 0 } = {}) {
  if (!game) {
    return {
      clearBonus: 0,
      livesBonus: 0,
      appliedClearBonus: 0,
      appliedLivesBonus: 0,
      appliedTotal: 0,
      scoreAfter: 0,
      alreadyApplied: false
    };
  }

  if (game.runClearScoreBonusAward) {
    return { ...game.runClearScoreBonusAward, alreadyApplied: true };
  }

  const baseClearBonus = Math.max(0, Math.floor(Number(clearBonus) || 0));
  const baseLivesBonus = Math.max(0, Math.floor(Number(livesBonus) || 0));
  const appliedClearBonus = applyExactScoreBonus(game, baseClearBonus, 'runClearBonus');
  const appliedLivesBonus = applyExactScoreBonus(game, baseLivesBonus, 'remainingLivesBonus');

  game.runClearScoreBonusAward = {
    clearBonus: baseClearBonus,
    livesBonus: baseLivesBonus,
    appliedClearBonus,
    appliedLivesBonus,
    appliedTotal: appliedClearBonus + appliedLivesBonus,
    scoreAfter: game.score
  };
  return { ...game.runClearScoreBonusAward, alreadyApplied: false };
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
