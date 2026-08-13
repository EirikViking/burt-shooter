import { BUILD_ID } from '../buildInfo.js';
import { MAX_RANK_INDEX, getRankFromLevel } from '../shared/RankPolicy.js';
import { getSelectableShips, getShipMetadata } from '../config/ShipMetadata.js';
import {
  canRunModeSubmitGlobalLeaderboard,
  canRunModeUnlockAchievements,
  parseRunMode
} from '../game/RunMode.js';

export const LEADERBOARD_DISPLAY_LIMIT = 50;
export const STEAM_LEADERBOARD_NAME = 'nova_swarm_global_score_v2';
export const STEAM_LEADERBOARD_COMMUNITY_NAME = 'Global High Score';
export const STEAM_TACTICAL_LEADERBOARD_NAME = 'nova_swarm_tactical_score_v1';
export const STEAM_TACTICAL_LEADERBOARD_COMMUNITY_NAME = 'Tactical Mayhem Score';
export const STEAM_SECTOR_LEADERBOARD_NAME = 'nova_swarm_sector_start_score_v1';
export const STEAM_SECTOR_LEADERBOARD_COMMUNITY_NAME = 'Sector Run Score';

export const LeaderboardView = {
  GLOBAL: 'global',
  TACTICAL: 'tactical',
  SECTOR: 'sector',
  FRIENDS: 'friends',
  LOCAL: 'local'
};

export function getLeaderboardDescriptorForRunMode(runMode = 'ranked') {
  if (String(runMode || '') === 'ranked_tactical') {
    return {
      leaderboardName: STEAM_TACTICAL_LEADERBOARD_NAME,
      leaderboardKind: 'mayhem_tactical',
      view: LeaderboardView.TACTICAL,
      sourceLabel: 'Steam Tactical'
    };
  }
  return {
    leaderboardName: STEAM_LEADERBOARD_NAME,
    leaderboardKind: 'global',
    view: LeaderboardView.GLOBAL,
    sourceLabel: 'Steam Pure'
  };
}

const BLOCKED_PUBLIC_NAME_TERMS = [
  ['K', 'LAUS'].join(''),
  ['F', 'ITTE'].join(''),
  ['K', 'UKEN'].join(''),
  ['FAT', 'MAN'].join(''),
  ['MOR', 'DER'].join('')
];
const PUBLIC_PILOT_NAME_MAX_LENGTH = 14;

export function sanitizePilotName(rawName) {
  return String(rawName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .slice(0, PUBLIC_PILOT_NAME_MAX_LENGTH);
}

export function getPilotNameValidation(rawName, { allowBlank = false } = {}) {
  const cleaned = sanitizePilotName(rawName);
  if (!cleaned) {
    return allowBlank
      ? { valid: true, publicName: '', reason: null }
      : { valid: false, publicName: '', reason: 'blank' };
  }
  const compact = cleaned.replace(/\s+/g, '');
  if (BLOCKED_PUBLIC_NAME_TERMS.some(term => compact.includes(term))) {
    return { valid: false, publicName: cleaned, reason: 'blocked' };
  }
  return { valid: true, publicName: cleaned, reason: null };
}

export function toPublicPilotName(rawName, fallbackSeed = 0) {
  const validation = getPilotNameValidation(rawName, { allowBlank: false });
  const seed = Math.abs(Number(fallbackSeed) || 0).toString().slice(-2).padStart(2, '0');
  if (!validation.valid) return `PILOT${seed}`;
  return validation.publicName;
}

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function numericInt(value, fallback = 0) {
  return Math.floor(numeric(value, fallback));
}

function firstFiniteInt(values = [], fallback = 0) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.floor(parsed);
  }
  return fallback;
}

function parseHexDetailsString(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  const compact = text.replace(/^0x/i, '').replace(/[^0-9a-f]/gi, '');
  if (compact.length < 8 || compact.length % 8 !== 0) return [];
  const details = [];
  for (let index = 0; index + 8 <= compact.length && details.length < 64; index += 8) {
    const chunk = compact.slice(index, index + 8);
    const b0 = Number.parseInt(chunk.slice(0, 2), 16);
    const b1 = Number.parseInt(chunk.slice(2, 4), 16);
    const b2 = Number.parseInt(chunk.slice(4, 6), 16);
    const b3 = Number.parseInt(chunk.slice(6, 8), 16);
    if ([b0, b1, b2, b3].some(byte => !Number.isFinite(byte))) continue;
    details.push(b0 | (b1 << 8) | (b2 << 16) | (b3 << 24));
  }
  return details;
}

function parseDetailsValue(value) {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value;
  if (ArrayBuffer.isView(value) && typeof value.length === 'number') return Array.from(value);
  if (typeof value === 'string') {
    const hexDetails = parseHexDetailsString(value);
    if (hexDetails.length) return hexDetails;
    return (value.match(/-?\d+/g) || []).map(Number);
  }
  if (typeof value === 'object' && Number.isFinite(Number(value.length))) {
    return Array.from({ length: Number(value.length) }, (_, index) => value[index]);
  }
  return [];
}

export function readLeaderboardDetails(raw = {}) {
  const directDetails = parseDetailsValue(raw);
  if (directDetails.length) {
    return directDetails
      .map((value) => Number(value))
      .filter(Number.isFinite)
      .map((value) => Math.floor(value))
      .slice(0, 64);
  }
  const sources = [
    raw.details,
    raw.scoreDetails,
    raw.m_pDetails,
    raw.detailsHex,
    raw.scoreDetailsHex,
    raw.metadata?.details,
    raw.metadata?.scoreDetails,
    raw.detailsMetadata?.details,
    raw.data?.details,
    raw.values
  ];
  for (const source of sources) {
    const details = parseDetailsValue(source)
      .map((value) => Number(value))
      .filter(Number.isFinite)
      .map((value) => Math.floor(value))
      .slice(0, 64);
    if (details.length) return details;
  }
  return [];
}

export function estimateLeaderboardLevelFromScore(score) {
  const normalizedScore = Math.max(0, numericInt(score, 0));
  if (normalizedScore <= 0) return 1;
  return Math.max(1, Math.min(99, Math.floor(normalizedScore / 5000) + 1));
}

export function readExplicitLeaderboardLevel(raw = {}, options = {}) {
  const details = Array.isArray(options.details) ? options.details : readLeaderboardDetails(raw);
  const explicit = firstFiniteInt([
    raw.metadata?.level,
    raw.metadata?.levelReached,
    raw.detailsMetadata?.level,
    raw.detailsMetadata?.levelReached,
    details[0],
    raw.level,
    raw.levelReached
  ], 0);
  return explicit > 0 ? Math.max(1, explicit) : null;
}

export function readLeaderboardLevel(raw = {}, fallback = 1) {
  return readExplicitLeaderboardLevel(raw) || Math.max(1, numericInt(fallback, 1));
}

export function getShipNumericId(spriteKey) {
  const ships = getSelectableShips();
  const resolved = getShipMetadata(spriteKey)?.spriteKey || spriteKey;
  const index = ships.findIndex(ship => ship.spriteKey === resolved || ship.id === resolved);
  return index >= 0 ? index + 1 : 0;
}

function isSectorLeaderboardEntry(raw = {}, options = {}) {
  const candidates = [
    options.leaderboardKind,
    options.view,
    raw.leaderboardKind,
    raw.kind,
    raw.metadata?.leaderboardKind,
    raw.metadata?.source,
    raw.source,
    raw.leaderboardName,
    raw.metadata?.leaderboardName
  ].map(value => String(value || '').toLowerCase());
  return candidates.some(value => (
    value === LeaderboardView.SECTOR ||
    value === 'sector_start' ||
    value === 'sector-start' ||
    value.includes('sector_start') ||
    value === STEAM_SECTOR_LEADERBOARD_NAME
  ));
}

export function normalizeLeaderboardEntry(raw = {}, options = {}) {
  const fallbackRank = Number.isFinite(Number(options.rankFallback)) ? Number(options.rankFallback) : null;
  const rawRank = raw.rank ?? raw.globalRank ?? raw.m_nGlobalRank ?? fallbackRank;
  const rawScore = raw.score ?? raw.m_nScore;
  const score = Math.max(0, numericInt(rawScore, 0));
  if (score <= 0 && options.dropZero !== false) return null;

  const details = readLeaderboardDetails(raw);
  const sectorEntry = isSectorLeaderboardEntry(raw, options);
  const source = String(raw.source || options.source || '').toLowerCase();
  const steamLike = source.includes('steam') || Boolean(raw.steamId || raw.m_steamIDUser || raw.globalRank);
  const encodedLevel = firstFiniteInt([
    raw.metadata?.level,
    raw.metadata?.levelReached,
    raw.detailsMetadata?.level,
    raw.detailsMetadata?.levelReached,
    details[0]
  ], 0);
  let explicitLevel = readExplicitLeaderboardLevel(raw, { details });
  const fallbackLevel = estimateLeaderboardLevelFromScore(score);
  if (steamLike && details.length === 0 && encodedLevel <= 0) {
    explicitLevel = null;
  }
  if (steamLike && explicitLevel === 1 && details.length === 0 && fallbackLevel > 1) {
    explicitLevel = null;
  }
  let level = explicitLevel || fallbackLevel || readLeaderboardLevel(raw, fallbackLevel);
  const rank = rawRank != null ? Math.max(1, numericInt(rawRank, fallbackRank || 1)) : fallbackRank;
  const playerName = toPublicPilotName(
    raw.playerName ?? raw.name ?? raw.personaName ?? raw.displayName ?? raw.steamName,
    raw.id ?? raw.steamId ?? score
  );
  const shipId = raw.shipId ?? raw.ship_id ?? raw.metadata?.shipId ?? null;
  const shipName = raw.shipName ?? raw.ship_name ?? raw.metadata?.shipName ?? null;
  const shipTier = raw.shipTier ?? raw.ship_tier ?? raw.metadata?.shipTier ?? null;
  const shipPowerRating = raw.shipPowerRating ?? raw.ship_power_rating ?? raw.metadata?.shipPowerRating ?? null;
  const sectorStart = sectorEntry
    ? firstFiniteInt([
      raw.sectorStart,
      raw.startSector,
      raw.metadata?.sectorStart,
      raw.metadata?.startSector,
      details[0]
    ], 0)
    : null;
  const highestSectorReached = sectorEntry
    ? firstFiniteInt([
      raw.highestSectorReached,
      raw.metadata?.highestSectorReached,
      raw.sectorReached,
      raw.metadata?.sectorReached,
      details[1]
    ], 0)
    : null;
  const finalSector = sectorEntry
    ? firstFiniteInt([
      raw.finalSector,
      raw.metadata?.finalSector,
      raw.metadata?.levelReached,
      raw.levelReached,
      details[2]
    ], 0)
    : null;
  if (sectorEntry) {
    const sectorLevel = highestSectorReached || finalSector || sectorStart;
    if (sectorLevel > 0) {
      explicitLevel = sectorLevel;
      level = sectorLevel;
    }
  }
  const rankIndex = Math.max(0, Math.min(MAX_RANK_INDEX, numericInt(raw.rankIndex ?? raw.rank_index, getRankFromLevel(level))));
  const runTimeSeconds = sectorEntry
    ? (raw.runTimeSeconds ?? raw.runtimeSeconds ?? raw.metadata?.runTimeSeconds ?? details[4] ?? null)
    : (raw.runTimeSeconds ?? raw.runtimeSeconds ?? raw.metadata?.runTimeSeconds ?? null);
  const kills = raw.kills ?? raw.metadata?.kills ?? null;
  const bossKills = sectorEntry
    ? (raw.bossKills ?? raw.metadata?.bossKills ?? details[5] ?? null)
    : (raw.bossKills ?? raw.metadata?.bossKills ?? null);
  const wavesCleared = sectorEntry
    ? (raw.wavesCleared ?? raw.metadata?.wavesCleared ?? details[6] ?? null)
    : (raw.wavesCleared ?? raw.metadata?.wavesCleared ?? null);

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
    shipTier,
    shipPowerRating: shipPowerRating == null ? null : Number(shipPowerRating),
    runTimeSeconds: runTimeSeconds == null ? null : Math.max(0, numericInt(runTimeSeconds, 0)),
    kills: kills == null ? null : Math.max(0, numericInt(kills, 0)),
    bossKills: bossKills == null ? null : Math.max(0, numericInt(bossKills, 0)),
    wavesCleared: wavesCleared == null ? null : Math.max(0, numericInt(wavesCleared, 0)),
    leaderboardKind: sectorEntry ? 'sector_start' : (raw.leaderboardKind || raw.metadata?.leaderboardKind || null),
    sectorStart: sectorStart ? Math.max(1, sectorStart) : null,
    highestSectorReached: highestSectorReached ? Math.max(1, highestSectorReached) : null,
    finalSector: finalSector ? Math.max(1, finalSector) : null,
    levelSource: explicitLevel ? 'encoded' : 'score_estimate',
    source: raw.source || options.source || 'unknown',
    isCurrentPlayer: Boolean(raw.isCurrentPlayer),
    timestamp: raw.timestamp || raw.created_at || raw.createdAt || null,
    metadata: raw.metadata || (details.length ? { details } : raw.details || null),
    details,
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
  const levelReached = Math.max(1, numericInt(overrides.levelReached ?? overrides.level ?? game?.level, 1));
  const runModeSource = overrides.runMode ?? game?.runSummary?.runMode ?? game?.runMode ?? null;
  const canonicalRunMode = parseRunMode(runModeSource);
  const runMode = canonicalRunMode || (String(runModeSource ?? '').trim() || null);
  const isDebugRun = overrides.isDebugRun ?? game?.isDebugRun === true;
  const submissionEligible = canRunModeSubmitGlobalLeaderboard(canonicalRunMode, { isDebugRun });
  const achievementEligible = canRunModeUnlockAchievements(canonicalRunMode, { isDebugRun });
  const leaderboard = submissionEligible
    ? getLeaderboardDescriptorForRunMode(canonicalRunMode)
    : {
        leaderboardName: null,
        leaderboardKind: 'ineligible',
        view: null,
        sourceLabel: null
      };
  return {
    score: Math.max(0, numericInt(overrides.score ?? game?.score, 0)),
    level: levelReached,
    levelReached,
    rankIndex: Math.max(0, numericInt(overrides.rankIndex ?? game?.rankIndex, 0)),
    playerName: overrides.playerName || overrides.name || null,
    submissionId: overrides.submissionId || null,
    shipId: shipMetadata?.id || selectedShipSpriteKey || null,
    shipNumericId: getShipNumericId(selectedShipSpriteKey),
    shipName: shipMetadata?.name || null,
    shipTier: shipMetadata?.tier || 'standard',
    shipPowerRating: Number.isFinite(shipMetadata?.powerRating) ? shipMetadata.powerRating : 1,
    selectedShipSpriteKey,
    runTimeSeconds: Math.max(0, numericInt(overrides.runTimeSeconds ?? playScene?.gameTime, 0)),
    kills: Math.max(0, numericInt(overrides.kills ?? playScene?.totalKills, 0)),
    bossKills: Math.max(0, numericInt(overrides.bossKills ?? playScene?.bossKills, 0)),
    wavesCleared: Math.max(0, numericInt(overrides.wavesCleared ?? playScene?.wavesCleared, 0)),
    runMode,
    runModeSource: runModeSource == null ? null : String(runModeSource),
    isDebugRun,
    eligibleForSubmission: submissionEligible,
    eligibleForAchievements: achievementEligible,
    submissionEligibilityVersion: 1,
    leaderboardName: overrides.leaderboardName || leaderboard.leaderboardName,
    leaderboardKind: overrides.leaderboardKind || leaderboard.leaderboardKind,
    buildId: BUILD_ID,
    source: overrides.source || 'run'
  };
}

export function createSectorStartRunResultFromGame(game, overrides = {}) {
  const playScene = game?.scenes?.play || null;
  const summary = game?.runSummary || {};
  const attempt = summary.sectorStartChallengeAttempt || summary.sectorStartChallengeBest || {};
  const selectedShipSpriteKey = game?.selectedShipSpriteKey || null;
  const shipMetadata = getShipMetadata(selectedShipSpriteKey);
  const startSector = Math.max(1, firstFiniteInt([
    overrides.startSector,
    overrides.sectorStart,
    attempt.startSector,
    summary.sectorStartCheckpoint,
    game?.sectorStartCheckpoint
  ], 1));
  const highestSectorReached = Math.max(startSector, firstFiniteInt([
    overrides.highestSectorReached,
    attempt.highestSectorReached,
    summary.sectorReached,
    summary.levelReached,
    game?.level
  ], startSector));
  const finalSector = Math.max(startSector, firstFiniteInt([
    overrides.finalSector,
    attempt.finalSector,
    summary.finalSector,
    summary.levelReached,
    game?.level
  ], highestSectorReached));
  return {
    score: Math.max(0, numericInt(overrides.score ?? attempt.scoreEarned ?? game?.score, 0)),
    level: highestSectorReached,
    levelReached: highestSectorReached,
    rankIndex: Math.max(0, numericInt(overrides.rankIndex ?? game?.rankIndex, 0)),
    playerName: overrides.playerName || overrides.name || null,
    submissionId: overrides.submissionId || null,
    shipId: shipMetadata?.id || selectedShipSpriteKey || null,
    shipNumericId: getShipNumericId(selectedShipSpriteKey),
    shipName: shipMetadata?.name || null,
    shipTier: shipMetadata?.tier || 'standard',
    shipPowerRating: Number.isFinite(shipMetadata?.powerRating) ? shipMetadata.powerRating : 1,
    selectedShipSpriteKey,
    runTimeSeconds: Math.max(0, numericInt(overrides.runTimeSeconds ?? summary.runElapsedSeconds ?? playScene?.gameTime, 0)),
    kills: Math.max(0, numericInt(overrides.kills ?? summary.kills ?? playScene?.totalKills, 0)),
    bossKills: Math.max(0, numericInt(overrides.bossKills ?? attempt.bossesDefeated ?? summary.bossKills ?? playScene?.bossKills, 0)),
    wavesCleared: Math.max(0, numericInt(overrides.wavesCleared ?? attempt.wavesCleared ?? summary.wavesCleared ?? playScene?.wavesCleared, 0)),
    startSector,
    sectorStart: startSector,
    highestSectorReached,
    finalSector,
    leaderboardName: STEAM_SECTOR_LEADERBOARD_NAME,
    leaderboardKind: 'sector_start',
    buildId: BUILD_ID,
    source: overrides.source || 'sector_start_challenge'
  };
}

export function encodeSteamLeaderboardDetails(runResult = {}) {
  const levelReached = runResult.levelReached ?? runResult.level;
  return [
    Math.max(0, numericInt(levelReached, 0)),
    Math.max(0, numericInt(runResult.shipNumericId ?? getShipNumericId(runResult.selectedShipSpriteKey), 0)),
    Math.max(0, numericInt(runResult.runTimeSeconds, 0)),
    Math.max(0, numericInt(runResult.kills, 0)),
    Math.max(0, numericInt(runResult.bossKills, 0)),
    Math.max(0, numericInt(runResult.wavesCleared, 0))
  ].map(value => Math.max(0, Math.min(2147483647, value)));
}

export function encodeSteamSectorLeaderboardDetails(runResult = {}) {
  return [
    Math.max(0, numericInt(runResult.startSector ?? runResult.sectorStart, 0)),
    Math.max(0, numericInt(runResult.highestSectorReached ?? runResult.levelReached ?? runResult.level, 0)),
    Math.max(0, numericInt(runResult.finalSector ?? runResult.levelReached ?? runResult.level, 0)),
    Math.max(0, numericInt(runResult.shipNumericId ?? getShipNumericId(runResult.selectedShipSpriteKey), 0)),
    Math.max(0, numericInt(runResult.runTimeSeconds, 0)),
    Math.max(0, numericInt(runResult.bossKills, 0)),
    Math.max(0, numericInt(runResult.wavesCleared, 0))
  ].map(value => Math.max(0, Math.min(2147483647, value)));
}
