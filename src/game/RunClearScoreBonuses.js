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
  const appliedClearBonus = baseClearBonus > 0
    ? game.addScore(baseClearBonus, 'runClearBonus')
    : 0;
  const appliedLivesBonus = baseLivesBonus > 0
    ? game.addScore(baseLivesBonus, 'remainingLivesBonus')
    : 0;

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
