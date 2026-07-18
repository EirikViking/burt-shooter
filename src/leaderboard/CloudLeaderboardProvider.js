import { API } from '../api/API.js';
import {
  LEADERBOARD_DISPLAY_LIMIT,
  normalizeLeaderboardEntries,
  toPublicPilotName
} from './LeaderboardTypes.js';

function cloudDisabledByRuntime() {
  try {
    if (window.__novaLeaderboardMode === 'local') return true;
    const params = new URLSearchParams(window.location.search || '');
    return params.get('leaderboard') === 'local' || params.get('offlineLeaderboard') === '1';
  } catch {
    return false;
  }
}

export class CloudLeaderboardProvider {
  constructor() {
    this.id = 'cloud';
    this.displayName = 'Cloud Global';
  }

  async isAvailable() {
    return !cloudDisabledByRuntime();
  }

  async getTopScores(options = {}) {
    if (cloudDisabledByRuntime()) {
      return {
        status: 'unavailable',
        source: 'cloud',
        sourceLabel: 'Cloud Global',
        entries: [],
        message: 'Global board unavailable. Local scores are safe.'
      };
    }

    const limit = Number(options.limit) || LEADERBOARD_DISPLAY_LIMIT;
    const data = await API.getHighscores({
      useCache: options.useCache !== false,
      onRetry: options.onRetry || null
    });
    const entries = normalizeLeaderboardEntries(data, { source: 'cloud' }).slice(0, limit);
    return {
      status: entries.length > 0 ? 'available' : 'empty',
      source: 'cloud',
      sourceLabel: 'Cloud Global',
      entries,
      message: entries.length > 0
        ? 'Global leaderboard records loaded.'
        : 'Global board is ready for its first signal.'
    };
  }

  async submitScore(runResult = {}, options = {}) {
    const name = toPublicPilotName(
      options.name || runResult.playerName || runResult.name || 'PILOT',
      runResult.score
    );
    const levelReached = runResult.levelReached ?? runResult.level;
    const response = await API.submitScore(
      name,
      runResult.score,
      levelReached,
      runResult.rankIndex,
      runResult.submissionId
    );
    return {
      status: 'submitted',
      source: 'cloud',
      sourceLabel: 'Cloud Global',
      playerName: name,
      response
    };
  }
}
