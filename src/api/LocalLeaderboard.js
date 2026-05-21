import { getRankFromScore } from '../shared/RankPolicy.js';

export const LOCAL_LEADERBOARD_KEY = 'novaSwarm.localLeaderboard.v1';
export const LOCAL_LEADERBOARD_LIMIT = 20;
const LOCAL_LEADERBOARD_STORAGE_LIMIT = 100;
const LOCAL_PILOT_NAME_MAX_LENGTH = 14;

function storageAvailable() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

export function sanitizeLocalPilotName(rawName, fallbackSeed = 0) {
  const cleaned = String(rawName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .slice(0, LOCAL_PILOT_NAME_MAX_LENGTH);
  if (cleaned) return cleaned;
  const seed = Math.abs(Number(fallbackSeed) || 0).toString().slice(-2).padStart(2, '0');
  return `PILOT${seed}`;
}

function normalizeEntry(raw, fallbackIndex = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const score = Math.max(0, Math.floor(Number(raw.score) || 0));
  const level = Math.max(1, Math.floor(Number(raw.level) || 1));
  const rankIndex = Math.max(0, Math.min(19, Math.floor(Number(raw.rankIndex ?? raw.rank_index) || getRankFromScore(score))));
  const timestamp = String(raw.timestamp || raw.created_at || new Date(0).toISOString());
  return {
    name: sanitizeLocalPilotName(raw.name, fallbackIndex),
    score,
    level,
    rankIndex,
    rank_index: rankIndex,
    shipId: raw.shipId ?? raw.ship_id ?? null,
    shipName: raw.shipName ?? raw.ship_name ?? null,
    runTimeSeconds: raw.runTimeSeconds ?? raw.runtimeSeconds ?? null,
    kills: raw.kills ?? null,
    bossKills: raw.bossKills ?? null,
    wavesCleared: raw.wavesCleared ?? null,
    submissionId: raw.submissionId || null,
    timestamp,
    source: 'local'
  };
}

function sortScores(scores) {
  return scores.sort((a, b) => {
    const scoreDelta = (b.score || 0) - (a.score || 0);
    if (scoreDelta !== 0) return scoreDelta;
    return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
  });
}

export const LocalLeaderboard = {
  getScores(limit = LOCAL_LEADERBOARD_LIMIT) {
    if (!storageAvailable()) return [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(LOCAL_LEADERBOARD_KEY) || '[]');
      const normalized = Array.isArray(parsed)
        ? parsed.map((entry, index) => normalizeEntry(entry, index)).filter(Boolean)
        : [];
      return sortScores(normalized).slice(0, Math.max(1, limit));
    } catch {
      return [];
    }
  },

  getCutoff(limit = LOCAL_LEADERBOARD_LIMIT) {
    const scores = this.getScores(limit);
    if (scores.length < limit) return 0;
    return Number(scores[limit - 1]?.score) || 0;
  },

  qualifies(score, limit = LOCAL_LEADERBOARD_LIMIT) {
    const numericScore = Math.max(0, Math.floor(Number(score) || 0));
    const scores = this.getScores(limit);
    if (scores.length < limit) return numericScore > 0;
    return numericScore > (Number(scores[limit - 1]?.score) || 0);
  },

  saveScore(entry = {}) {
    const score = Math.max(0, Math.floor(Number(entry.score) || 0));
    const submissionId = entry.submissionId || null;
    const existingScores = this.getScores(LOCAL_LEADERBOARD_STORAGE_LIMIT);
    const duplicate = submissionId
      ? existingScores.find((scoreEntry) => scoreEntry.submissionId === submissionId)
      : null;
    if (duplicate) {
      const placement = existingScores.findIndex((scoreEntry) => scoreEntry.submissionId === submissionId) + 1;
      return { entry: duplicate, placement, duplicate: true };
    }

    const savedEntry = normalizeEntry({
      name: entry.name,
      score,
      level: entry.level,
      rankIndex: entry.rankIndex ?? entry.rank_index ?? getRankFromScore(score),
      shipId: entry.shipId,
      shipName: entry.shipName,
      runTimeSeconds: entry.runTimeSeconds,
      kills: entry.kills,
      bossKills: entry.bossKills,
      wavesCleared: entry.wavesCleared,
      submissionId,
      timestamp: new Date().toISOString()
    }, score);

    const nextScores = sortScores([savedEntry, ...existingScores]).slice(0, LOCAL_LEADERBOARD_STORAGE_LIMIT);
    if (storageAvailable()) {
      window.localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(nextScores));
    }
    const placement = nextScores.findIndex((scoreEntry) => scoreEntry === savedEntry) + 1;
    return { entry: savedEntry, placement, duplicate: false };
  },

  clear() {
    if (storageAvailable()) {
      window.localStorage.removeItem(LOCAL_LEADERBOARD_KEY);
    }
  }
};
