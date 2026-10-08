import { NUM_RANKS } from '../shared/RankPolicy.js';
import { getRankAchievementId } from './AchievementCatalog.js';

// Career XP alone does not prove achievement eligibility. Use a saved award
// receipt, an already-earned higher rank, or the player's accepted Steam result.
export function getRankRecoveryIds(progress, unlocked = [], best = null) {
  const ceiling = Math.max(0, Math.min(NUM_RANKS - 1, Math.floor(Number(progress?.pilotRank) || 0)));
  let proven = 0;
  for (const id of [...unlocked, ...(progress?.rankAchievementsUnlocked || [])]) {
    const match = /^ACH_RANK_(\d{2})$/.exec(id);
    if (match && Number(match[1]) < NUM_RANKS) proven = Math.max(proven, Number(match[1]));
  }
  const ownAcceptedEntry = best?.source === 'steam_player_best' ||
    (best?.source === 'steam_downloaded_player_best' && best.entry?.isCurrentPlayer === true);
  if (ownAcceptedEntry && best.score > 0 && !best.entry?.seed) {
    const entry = best.entry;
    const rank = /^\d+$/.test(String(entry?.careerRankExact || ''))
      ? Math.min(NUM_RANKS, Number(entry.careerRankExact)) - 1 : Number(entry?.rankIndex);
    if (Number.isFinite(rank) && rank >= 0) proven = Math.max(proven, Math.floor(rank));
  }
  return Array.from({ length: Math.min(ceiling, proven) }, (_, index) => getRankAchievementId(index + 1));
}
