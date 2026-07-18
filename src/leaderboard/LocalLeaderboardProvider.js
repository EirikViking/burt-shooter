import { LocalLeaderboard, LOCAL_LEADERBOARD_KEY, LOCAL_LEADERBOARD_LIMIT } from '../api/LocalLeaderboard.js';
import {
  LEADERBOARD_DISPLAY_LIMIT,
  normalizeLeaderboardEntries,
  toPublicPilotName
} from './LeaderboardTypes.js';

function safeWindow() {
  try {
    return typeof window !== 'undefined' ? window : null;
  } catch {
    return null;
  }
}

function isDesktopRuntime() {
  const win = safeWindow();
  if (!win) return false;
  try {
    const params = new URLSearchParams(win.location?.search || '');
    return params.get('desktop') === '1' || win.__NOVA_SWARM_DESKTOP__ === true;
  } catch {
    return false;
  }
}

function localHighscoreUrl(limit = null) {
  const win = safeWindow();
  if (!win?.location?.origin) return null;
  const url = new URL('/api/highscores', win.location.origin);
  if (limit) url.searchParams.set('limit', String(limit));
  return url.toString();
}

function extractScoreEntries(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.scores)) return payload.scores;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.highscores)) return payload.highscores;
  return [];
}

function mirrorDesktopScoresToLocalStorage(entries = []) {
  const win = safeWindow();
  const nonSeedEntries = entries.filter((entry) => !entry?.seed);
  if (!win?.localStorage || nonSeedEntries.length === 0) return;
  try {
    win.localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(nonSeedEntries));
    win.__novaSteamCloudDiagnostics?.sync?.()?.catch?.(() => {});
  } catch {
    // Local display must continue even if renderer storage is unavailable.
  }
}

async function getDesktopLocalScores(limit) {
  if (!isDesktopRuntime()) return null;
  const url = localHighscoreUrl(limit);
  if (!url || typeof fetch !== 'function') return null;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Desktop local leaderboard read failed: ${response.status}`);
  const entries = extractScoreEntries(await response.json());
  mirrorDesktopScoresToLocalStorage(entries);
  return entries;
}

async function saveDesktopLocalScore(entry) {
  if (!isDesktopRuntime()) return null;
  const url = localHighscoreUrl();
  if (!url || typeof fetch !== 'function') return null;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
  if (!response.ok) throw new Error(`Desktop local leaderboard write failed: ${response.status}`);
  return response.json();
}

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
    let entries = null;
    try {
      entries = await getDesktopLocalScores(limit);
    } catch (error) {
      console.warn('[LocalLeaderboardProvider] Desktop local read failed, using renderer storage:', error?.message || error);
    }
    if (!entries) entries = LocalLeaderboard.getScores(limit);
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
    const levelReached = runResult.levelReached ?? runResult.level;
    const entry = {
      name,
      score: runResult.score,
      level: levelReached,
      levelReached,
      rankIndex: runResult.rankIndex,
      submissionId: runResult.submissionId,
      shipId: runResult.shipId,
      shipName: runResult.shipName,
      runTimeSeconds: runResult.runTimeSeconds,
      kills: runResult.kills,
      bossKills: runResult.bossKills,
      wavesCleared: runResult.wavesCleared
    };
    let save = LocalLeaderboard.saveScore(entry);
    try {
      const desktopSave = await saveDesktopLocalScore(entry);
      if (desktopSave?.ok) {
        const scores = await getDesktopLocalScores(100).catch(() => null);
        const savedEntry = desktopSave.score || desktopSave.entry || save.entry;
        save = {
          entry: savedEntry,
          placement: desktopSave.placement || (scores || []).findIndex((scoreEntry) => scoreEntry === savedEntry) + 1 || save.placement,
          duplicate: Boolean(desktopSave.duplicate)
        };
      }
    } catch (error) {
      console.warn('[LocalLeaderboardProvider] Desktop local write failed, renderer storage kept:', error?.message || error);
    }
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
    let entries = null;
    try {
      entries = await getDesktopLocalScores(1);
    } catch (error) {
      console.warn('[LocalLeaderboardProvider] Desktop local best read failed, using renderer storage:', error?.message || error);
    }
    if (!entries) entries = LocalLeaderboard.getScores(1);
    const [best] = normalizeLeaderboardEntries(entries.filter((entry) => !entry?.seed), { source: 'local' });
    return best || null;
  }
}
