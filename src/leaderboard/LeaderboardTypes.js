import { BUILD_ID } from '../buildInfo.js';
import { getRankFromScore } from '../shared/RankPolicy.js';
import { getSelectableShips, getShipMetadata } from '../config/ShipMetadata.js';

export const LEADERBOARD_DISPLAY_LIMIT = 20;
export const STEAM_LEADERBOARD_NAME = 'nova_swarm_global_score';
export const STEAM_LEADERBOARD_COMMUNITY_NAME = 'Global High Score';

export const LeaderboardView = {
  GLOBAL: 'global',
  FRIENDS: 'friends',
  LOCAL: 'local'
};

const BLOCKED_PUBLIC_NAME_TERMS = [
  ['E', 'IRIK'].join(''),
  ['K', 'LAUS'].join(''),
  ['F', 'ITTE'].join(''),
  ['K', 'UKEN'].join(''),
  ['FAT', 'MAN'].join(''),
  ['MOR', 'DER'].join('')
];

export function toPublicPilotName(rawName, fallbackSeed = 0) {
  const cleaned = String(rawName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .slice(0, 14);
  const seed = Math.abs(Number(fallbackSeed) || 0).toString().slice(-2).padStart(2, '0');
  if (!cleaned) return `PILOT${seed}`;
  if (BLOCKED_PUBLIC_NAME_TERMS.some(term => cleaned.replace(/\s+/g, '').includes(term))) return `PILOT${seed}`;
  return cleaned;
}

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function numericInt(value, fallback = 0) {
  return Math.floor(numeric(value, fallback));
}

export function getShipNumericId(spriteKey) {
  const ships = getSelectableShips();
  const resolved = getShipMetadata(spriteKey)?.spriteKey || spriteKey;
  const index = ships.findIndex(ship => ship.spriteKey === resolved || ship.id === resolved);
  return index >= 0 ? index + 1 : 0;
}

export function normalizeLeaderboardEntry(raw = {}, options = {}) {
  const fallbackRank = Number.isFinite(Number(options.rankFallback)) ? Number(options.rankFallback) : null;
  const rawRank = raw.rank ?? raw.globalRank ?? raw.m_nGlobalRank ?? fallbackRank;
  const rawScore = raw.score ?? raw.m_nScore;
  const score = Math.max(0, numericInt(rawScore, 0));
  if (score <= 0 && options.dropZero !== false) return null;

  const level = Math.max(1, numericInt(raw.level ?? raw.levelReached ?? raw.metadata?.levelReached, 1));
  const rank = rawRank != null ? Math.max(1, numericInt(rawRank, fallbackRank || 1)) : fallbackRank;
  const rankIndex = Math.max(0, Math.min(19, numericInt(raw.rankIndex ?? raw.rank_index ?? raw.rank_index, getRankFromScore(score))));
  const playerName = toPublicPilotName(
    raw.playerName ?? raw.name ?? raw.personaName ?? raw.displayName ?? raw.steamName,
    raw.id ?? raw.steamId ?? score
  );
  const shipId = raw.shipId ?? raw.ship_id ?? raw.metadata?.shipId ?? null;
  const shipName = raw.shipName ?? raw.ship_name ?? raw.metadata?.shipName ?? null;
  const runTimeSeconds = raw.runTimeSeconds ?? raw.runtimeSeconds ?? raw.metadata?.runTimeSeconds ?? null;
  const kills = raw.kills ?? raw.metadata?.kills ?? null;
  const bossKills = raw.bossKills ?? raw.metadata?.bossKills ?? null;
  const wavesCleared = raw.wavesCleared ?? raw.metadata?.wavesCleared ?? null;

  return {
    rank,
    name: playerName,
    playerName,
    score,
    level,
    rank_index: rankIndex,
    rankIndex,
    shipId,
    shipName,
    runTimeSeconds: runTimeSeconds == null ? null : Math.max(0, numericInt(runTimeSeconds, 0)),
    kills: kills == null ? null : Math.max(0, numericInt(kills, 0)),
    bossKills: bossKills == null ? null : Math.max(0, numericInt(bossKills, 0)),
    wavesCleared: wavesCleared == null ? null : Math.max(0, numericInt(wavesCleared, 0)),
    source: raw.source || options.source || 'unknown',
    isCurrentPlayer: Boolean(raw.isCurrentPlayer),
    timestamp: raw.timestamp || raw.created_at || raw.createdAt || null,
    metadata: raw.metadata || raw.details || null,
    steamId: raw.steamId || raw.m_steamIDUser || null
  };
}

export function normalizeLeaderboardEntries(entries = [], options = {}) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry, index) => normalizeLeaderboardEntry(entry, {
      ...options,
      rankFallback: entry?.rank ?? entry?.globalRank ?? entry?.m_nGlobalRank ?? index + 1
    }))
    .filter(Boolean)
    .sort((a, b) => {
      const rankA = Number(a.rank);
      const rankB = Number(b.rank);
      if (Number.isFinite(rankA) && Number.isFinite(rankB) && rankA !== rankB) return rankA - rankB;
      return (b.score || 0) - (a.score || 0);
    });
}

export function createRunResultFromGame(game, overrides = {}) {
  const playScene = game?.scenes?.play || null;
  const selectedShipSpriteKey = game?.selectedShipSpriteKey || null;
  const shipMetadata = getShipMetadata(selectedShipSpriteKey);
  return {
    score: Math.max(0, numericInt(overrides.score ?? game?.score, 0)),
    level: Math.max(1, numericInt(overrides.level ?? game?.level, 1)),
    rankIndex: Math.max(0, numericInt(overrides.rankIndex ?? game?.rankIndex, 0)),
    playerName: overrides.playerName || overrides.name || null,
    submissionId: overrides.submissionId || null,
    shipId: shipMetadata?.id || selectedShipSpriteKey || null,
    shipNumericId: getShipNumericId(selectedShipSpriteKey),
    shipName: shipMetadata?.name || null,
    selectedShipSpriteKey,
    runTimeSeconds: Math.max(0, numericInt(overrides.runTimeSeconds ?? playScene?.gameTime, 0)),
    kills: Math.max(0, numericInt(overrides.kills ?? playScene?.totalKills, 0)),
    bossKills: Math.max(0, numericInt(overrides.bossKills ?? playScene?.bossKills, 0)),
    wavesCleared: Math.max(0, numericInt(overrides.wavesCleared ?? playScene?.wavesCleared, 0)),
    buildId: BUILD_ID,
    source: overrides.source || 'run'
  };
}

export function encodeSteamLeaderboardDetails(runResult = {}) {
  return [
    Math.max(0, numericInt(runResult.level, 0)),
    Math.max(0, numericInt(runResult.shipNumericId ?? getShipNumericId(runResult.selectedShipSpriteKey), 0)),
    Math.max(0, numericInt(runResult.runTimeSeconds, 0)),
    Math.max(0, numericInt(runResult.kills, 0)),
    Math.max(0, numericInt(runResult.bossKills, 0)),
    Math.max(0, numericInt(runResult.wavesCleared, 0))
  ].map(value => Math.max(0, Math.min(2147483647, value)));
}
