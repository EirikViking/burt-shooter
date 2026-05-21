import { LocalLeaderboard, LOCAL_LEADERBOARD_LIMIT } from '../api/LocalLeaderboard.js';
import {
  LEADERBOARD_DISPLAY_LIMIT,
  normalizeLeaderboardEntries,
  toPublicPilotName
} from './LeaderboardTypes.js';

export class LocalLeaderboardProvider {
  constructor() {
    this.id = 'local';
    this.displayName = 'Local';
  }

  async isAvailable() {
    return true;
  }

  async getLocalScores(options = {}) {
    const limit = Number(options.limit) || LEADERBOARD_DISPLAY_LIMIT;
    const entries = LocalLeaderboard.getScores(limit);
    return {
      status: entries.length > 0 ? 'available' : 'empty',
      source: 'local',
      sourceLabel: 'Local Memory',
      entries: normalizeLeaderboardEntries(entries, { source: 'local' }),
      message: entries.length > 0 ? 'Local cabinet records loaded.' : 'No local scores yet. First entry is open.'
    };
  }

  async getTopScores(options = {}) {
    return this.getLocalScores(options);
  }

  qualifies(score, limit = LOCAL_LEADERBOARD_LIMIT) {
    return LocalLeaderboard.qualifies(score, limit);
  }

  getCutoff(limit = LOCAL_LEADERBOARD_LIMIT) {
    return LocalLeaderboard.getCutoff(limit);
  }

  async submitScore(runResult = {}, options = {}) {
    const name = toPublicPilotName(
      options.name || runResult.playerName || runResult.name || 'PILOT',
      runResult.score
    );
    const save = LocalLeaderboard.saveScore({
      name,
      score: runResult.score,
      level: runResult.level,
      rankIndex: runResult.rankIndex,
      submissionId: runResult.submissionId,
      shipId: runResult.shipId,
      shipName: runResult.shipName,
      runTimeSeconds: runResult.runTimeSeconds,
      kills: runResult.kills,
      bossKills: runResult.bossKills,
      wavesCleared: runResult.wavesCleared
    });
    return {
      status: 'submitted',
      source: 'local',
      sourceLabel: 'Local Memory',
      playerName: name,
      placement: save.placement,
      entry: save.entry,
      duplicate: Boolean(save.duplicate)
    };
  }

  async getPlayerBest() {
    const [best] = LocalLeaderboard.getScores(1);
    return best || null;
  }
}
