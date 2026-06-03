import { getRankFromLevel } from '../shared/RankPolicy.js';
import { estimateLeaderboardLevelFromScore, readLeaderboardLevel } from '../leaderboard/LeaderboardTypes.js';

export const LOCAL_LEADERBOARD_KEY = 'novaSwarm.localLeaderboard.v2';
export const LOCAL_LEADERBOARD_LIMIT = 20;
const LOCAL_LEADERBOARD_STORAGE_LIMIT = 100;
const LOCAL_PILOT_NAME_MAX_LENGTH = 14;

export const PRE_RELEASE_SEED_SCORES = [
  { name: 'NOVAROOK', score: 500, level: 2 },
  { name: 'VOIDCADET', score: 900, level: 3 },
  { name: 'PIXELPILOT', score: 1200, level: 4 },
  { name: 'ORBITKID', score: 1800, level: 5 },
  { name: 'COMETACE', score: 2400, level: 6 },
  { name: 'NEONRIDER', score: 3100, level: 7 },
  { name: 'STARRUNNER', score: 3900, level: 8 },
  { name: 'QUANTUMQ', score: 4800, level: 9 },
  { name: 'SIGNALACE', score: 6200, level: 10 },
  { name: 'ARCADEZERO', score: 7900, level: 11 }
];

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
  const level = readLeaderboardLevel(raw, estimateLeaderboardLevelFromScore(score));
  const rawRankIndex = Number(raw.rankIndex ?? raw.rank_index);
  const rankIndex = Math.max(0, Math.min(19, Number.isFinite(rawRankIndex)
    ? Math.floor(rawRankIndex)
    : getRankFromLevel(level)));
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
    source: raw.source || 'local',
    seed: Boolean(raw.seed)
  };
}

function getSeedScores() {
  return PRE_RELEASE_SEED_SCORES.map((entry, index) => normalizeEntry({
    ...entry,
    rankIndex: getRankFromLevel(entry.level),
    submissionId: `pre-release-seed-${index + 1}`,
    timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    source: 'pre_release_seed',
    seed: true
  }, index)).filter(Boolean);
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
      const scores = normalized.length > 0 ? normalized : getSeedScores();
      return sortScores(scores).slice(0, Math.max(1, limit));
    } catch {
      return [];
    }
  },

  getCutoff(limit = LOCAL_LEADERBOARD_LIMIT) {
    const scores = this.getScores(limit);
    if (scores.length === 0) return 0;
    const cutoffIndex = Math.max(0, Math.min(scores.length, limit) - 1);
    return Number(scores[cutoffIndex]?.score) || 0;
  },

  qualifies(score, limit = LOCAL_LEADERBOARD_LIMIT) {
    const numericScore = Math.max(0, Math.floor(Number(score) || 0));
    const scores = this.getScores(limit);
    if (scores.length === 0) return numericScore > 0;
    const cutoffIndex = Math.max(0, Math.min(scores.length, limit) - 1);
    return numericScore > (Number(scores[cutoffIndex]?.score) || 0);
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
      level: readLeaderboardLevel(entry, estimateLeaderboardLevelFromScore(score)),
      rankIndex: entry.rankIndex ?? entry.rank_index ?? getRankFromLevel(readLeaderboardLevel(entry, estimateLeaderboardLevelFromScore(score))),
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
      window.__novaSteamCloudDiagnostics?.sync?.()?.catch?.(() => {});
    }
    const placement = nextScores.findIndex((scoreEntry) => scoreEntry === savedEntry) + 1;
    return { entry: savedEntry, placement, duplicate: false };
  },

  clear() {
    if (storageAvailable()) {
      window.localStorage.removeItem(LOCAL_LEADERBOARD_KEY);
      window.__novaSteamCloudDiagnostics?.sync?.()?.catch?.(() => {});
    }
  }
};
