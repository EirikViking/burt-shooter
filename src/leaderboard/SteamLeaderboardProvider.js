import {
  LEADERBOARD_DISPLAY_LIMIT,
  STEAM_LEADERBOARD_NAME,
  STEAM_SECTOR_LEADERBOARD_NAME,
  LeaderboardView,
  encodeSteamLeaderboardDetails,
  encodeSteamSectorLeaderboardDetails,
  normalizeLeaderboardEntries,
  readExplicitLeaderboardLevel,
  toPublicPilotName
} from './LeaderboardTypes.js';

const MOCK_STORAGE_KEY = 'novaSwarm.mockSteamLeaderboard.v1';
const MOCK_PERSONA_KEY = 'novaSwarm.mockSteamPersona.v1';

function safeWindow() {
  try {
    return typeof window !== 'undefined' ? window : null;
  } catch {
    return null;
  }
}

function hasMockSteamFlag(win) {
  if (!win) return false;
  if (win.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ === true) return true;
  try {
    const params = new URLSearchParams(win.location?.search || '');
    return params.get('mockSteamLeaderboard') === '1' || params.get('steamLeaderboardMock') === '1';
  } catch {
    return false;
  }
}

function readMockScores(win) {
  try {
    const parsed = JSON.parse(win.localStorage?.getItem(MOCK_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMockScores(win, scores) {
  try {
    win.localStorage?.setItem(MOCK_STORAGE_KEY, JSON.stringify(scores.slice(0, 100)));
  } catch {
    // Mock persistence is best effort only.
  }
}

async function readLastUploadDiagnostics(bridge) {
  if (typeof bridge?.getLastUploadDiagnostics !== 'function') return null;
  try {
    return await bridge.getLastUploadDiagnostics();
  } catch {
    return null;
  }
}

async function readSteamRuntimeInfo(bridge) {
  if (typeof bridge?.getRuntimeInfo !== 'function') return null;
  try {
    return await bridge.getRuntimeInfo();
  } catch {
    return null;
  }
}

function storeLastUploadDiagnostics(error, diagnostics) {
  const win = safeWindow();
  if (!win) return;
  const summary = {
    recordedAt: new Date().toISOString(),
    error: error?.message || String(error),
    diagnostics: diagnostics || error?.steamUpload || null
  };
  try {
    win.__novaLastSteamUploadDiagnostics = summary;
    win.localStorage?.setItem('novaSwarm.lastSteamUploadDiagnostics.v1', JSON.stringify(summary));
  } catch {
    // Diagnostics are best effort and must never block game-over flow.
  }
  console.warn('[SteamLeaderboardProvider] submit failed diagnostics:', summary);
}

function normalizePublicNameForCompare(value) {
  if (!String(value || '').trim()) return '';
  return toPublicPilotName(value, 0).replace(/\s+/g, '');
}

function isNonCurrentFriendEntry(entry = {}, currentPlayerName = null) {
  if (!entry || entry.isCurrentPlayer) return false;
  const current = normalizePublicNameForCompare(currentPlayerName);
  const entryName = normalizePublicNameForCompare(entry.playerName || entry.name || entry.personaName || entry.displayName);
  if (current && entryName && entryName === current) return false;
  return true;
}

function isCurrentPlayerEntry(entry = {}, currentPlayerName = null) {
  if (!entry) return false;
  if (entry.isCurrentPlayer) return true;
  const current = normalizePublicNameForCompare(currentPlayerName);
  const entryName = normalizePublicNameForCompare(entry.playerName || entry.name || entry.personaName || entry.displayName);
  return Boolean(current && entryName && entryName === current);
}

function pickBestCurrentPlayerEntry(entries = [], currentPlayerName = null) {
  return entries
    .filter((entry) => isCurrentPlayerEntry(entry, currentPlayerName))
    .sort((a, b) => {
      const scoreDelta = (Number(b?.score ?? b?.m_nScore) || 0) - (Number(a?.score ?? a?.m_nScore) || 0);
      if (scoreDelta) return scoreDelta;
      return (Number(a?.rank ?? a?.globalRank ?? a?.m_nGlobalRank) || Number.MAX_SAFE_INTEGER) -
        (Number(b?.rank ?? b?.globalRank ?? b?.m_nGlobalRank) || Number.MAX_SAFE_INTEGER);
    })[0] || null;
}

function resolveLeaderboardName(value) {
  return String(value || STEAM_LEADERBOARD_NAME);
}

function isSectorLeaderboardName(value) {
  return resolveLeaderboardName(value) === STEAM_SECTOR_LEADERBOARD_NAME;
}

function resolveLeaderboardKind({ leaderboardName, leaderboardKind, view } = {}) {
  const rawKind = String(leaderboardKind || view || '').toLowerCase();
  if (rawKind === 'sector_start' || rawKind === LeaderboardView.SECTOR) return 'sector_start';
  return isSectorLeaderboardName(leaderboardName) ? 'sector_start' : 'global';
}

function hasForceRepairFlag(win) {
  if (!win) return false;
  if (win.__NOVA_SWARM_FORCE_STEAM_LEADERBOARD_UPDATE__ === true) return true;
  try {
    return win.localStorage?.getItem('novaSwarm.forceSteamLeaderboardUpdate.v1') === '1';
  } catch {
    return false;
  }
}

function resolveSteamUploadMethod({ score, details, previousBest = null } = {}) {
  const win = safeWindow();
  const incomingScore = Math.max(0, Math.floor(Number(score) || 0));
  const previousScore = Math.max(0, Math.floor(Number(previousBest?.score ?? previousBest?.m_nScore) || 0));
  const incomingLevel = Math.max(1, Math.floor(Number(details?.[0]) || 1));
  const previousLevel = readExplicitLeaderboardLevel(previousBest || {});
  const sameOrBetter = !previousScore || incomingScore >= previousScore;
  if (hasForceRepairFlag(win) && sameOrBetter) return 'force_update';
  if (previousScore > 0 && sameOrBetter && (!previousLevel || previousLevel !== incomingLevel)) return 'force_update';
  return 'keep_best';
}

function createMockSteamBridge(win) {
  const personaName = () => {
    try {
      return win.localStorage?.getItem(MOCK_PERSONA_KEY) || win.__novaMockSteamPersonaName || 'STEAM PILOT';
    } catch {
      return 'STEAM PILOT';
    }
  };

  const mockBoardName = (payload = {}) => resolveLeaderboardName(payload.leaderboardName);
  const entryBoardName = (entry = {}) => resolveLeaderboardName(entry.leaderboardName);
  const sorted = (payload = {}) => {
    const leaderboardName = mockBoardName(payload);
    return readMockScores(win)
    .filter(entry => entryBoardName(entry) === leaderboardName)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((entry, index) => ({ ...entry, rank: index + 1, globalRank: index + 1 }));
  };
  const writeBoardScores = (leaderboardName, nextBoardScores) => {
    const otherScores = readMockScores(win).filter(entry => entryBoardName(entry) !== leaderboardName);
    writeMockScores(win, [...nextBoardScores, ...otherScores]);
  };

  return {
    async isAvailable() {
      return true;
    },
    async getPersonaName() {
      return personaName();
    },
    async getTopScores(payload = {}) {
      const { limit = LEADERBOARD_DISPLAY_LIMIT } = payload;
      return sorted(payload).slice(0, limit);
    },
    async getFriendsScores(payload = {}) {
      const { limit = LEADERBOARD_DISPLAY_LIMIT } = payload;
      return sorted(payload)
        .filter((entry, index) => index < Math.max(1, Math.min(limit, 8)))
        .map(entry => ({ ...entry, source: 'steam-friends' }));
    },
    async submitScore(payload = {}) {
      const leaderboardName = mockBoardName(payload);
      const leaderboardKind = resolveLeaderboardKind({ leaderboardName, leaderboardKind: payload.metadata?.leaderboardKind });
      const scores = sorted(payload).filter(entry => !entry.isCurrentPlayer);
      const playerName = toPublicPilotName(personaName(), payload.score);
      const existing = sorted(payload).find(entry => entry.isCurrentPlayer);
      const incomingScore = Math.max(0, Math.floor(Number(payload.score) || 0));
      const existingScore = Math.max(0, Math.floor(Number(existing?.score) || 0));
      const forceUpdate = String(payload.uploadMethod || '').toLowerCase() === 'force_update';
      const keepExisting = existing && !forceUpdate && existingScore > incomingScore;
      const nextEntry = keepExisting
        ? { ...existing, playerName, name: playerName, isCurrentPlayer: true, source: 'steam' }
        : {
          playerName,
          name: playerName,
          score: forceUpdate ? incomingScore : Math.max(existingScore, incomingScore),
          level: payload.metadata?.level ?? payload.details?.[0] ?? 1,
          levelReached: payload.metadata?.levelReached ?? payload.details?.[0] ?? 1,
          shipId: payload.metadata?.shipId ?? (leaderboardKind === 'sector_start' ? payload.details?.[3] : payload.details?.[1]) ?? null,
          runTimeSeconds: payload.metadata?.runTimeSeconds ?? (leaderboardKind === 'sector_start' ? payload.details?.[4] : payload.details?.[2]) ?? null,
          kills: payload.metadata?.kills ?? (leaderboardKind === 'sector_start' ? null : payload.details?.[3]) ?? null,
          bossKills: payload.metadata?.bossKills ?? (leaderboardKind === 'sector_start' ? payload.details?.[5] : payload.details?.[4]) ?? null,
          wavesCleared: payload.metadata?.wavesCleared ?? (leaderboardKind === 'sector_start' ? payload.details?.[6] : payload.details?.[5]) ?? null,
          startSector: payload.metadata?.startSector ?? payload.details?.[0] ?? null,
          highestSectorReached: payload.metadata?.highestSectorReached ?? payload.details?.[1] ?? null,
          finalSector: payload.metadata?.finalSector ?? payload.details?.[2] ?? null,
          details: payload.details,
          metadata: payload.metadata,
          leaderboardName,
          leaderboardKind,
          uploadMethod: payload.uploadMethod,
          isCurrentPlayer: true,
          source: 'steam',
          timestamp: new Date().toISOString()
        };
      const nextScores = [nextEntry, ...scores].sort((a, b) => (b.score || 0) - (a.score || 0));
      writeBoardScores(leaderboardName, nextScores);
      const rank = nextScores.findIndex(entry => entry === nextEntry) + 1;
      return { success: true, rank, entry: nextEntry, mock: true };
    },
    async getPlayerBest(payload = {}) {
      return sorted(payload).find(entry => entry.isCurrentPlayer) || null;
    }
  };
}

function resolveBridge() {
  const win = safeWindow();
  if (!win) return null;
  if (win.__novaSteamLeaderboard) return win.__novaSteamLeaderboard;
  if (win.novaSteamLeaderboard) return win.novaSteamLeaderboard;
  if (win.__novaSteam?.leaderboards) return win.__novaSteam.leaderboards;
  if (win.novaSteam?.leaderboards) return win.novaSteam.leaderboards;
  if (win.__novaSteamBridge?.leaderboards) return win.__novaSteamBridge.leaderboards;
  if (hasMockSteamFlag(win)) {
    if (!win.__novaMockSteamLeaderboardBridge) {
      win.__novaMockSteamLeaderboardBridge = createMockSteamBridge(win);
    }
    return win.__novaMockSteamLeaderboardBridge;
  }
  return null;
}

async function callFirst(bridge, methodNames, payload) {
  for (const name of methodNames) {
    const fn = bridge?.[name];
    if (typeof fn === 'function') {
      return fn.call(bridge, payload);
    }
  }
  throw new Error(`Steam leaderboard bridge is missing ${methodNames.join('/')}`);
}

export class SteamLeaderboardProvider {
  constructor() {
    this.id = 'steam';
    this.displayName = 'Steam';
    this.leaderboardName = STEAM_LEADERBOARD_NAME;
    this.bridge = null;
    this.available = false;
  }

  getBridge() {
    this.bridge = resolveBridge();
    return this.bridge;
  }

  async isAvailable() {
    const bridge = this.getBridge();
    if (!bridge) {
      this.available = false;
      return false;
    }
    try {
      if (typeof bridge.isAvailable === 'function') {
        this.available = Boolean(await bridge.isAvailable());
      } else {
        this.available = true;
      }
    } catch (error) {
      console.warn('[SteamLeaderboardProvider] availability check failed:', error?.message || error);
      this.available = false;
    }
    return this.available;
  }

  async getPlayerName() {
    const bridge = this.getBridge();
    if (!bridge) return null;
    try {
      const value = await callFirst(bridge, [
        'getPersonaName',
        'getUserName',
        'getPlayerName',
        'getSteamName'
      ]);
      return toPublicPilotName(value, 0);
    } catch {
      const win = safeWindow();
      return toPublicPilotName(win?.__novaSteamPersonaName || 'STEAM PILOT', 0);
    }
  }

  supportsFriendsScores() {
    const bridge = this.getBridge();
    return Boolean(
      bridge &&
      (
        typeof bridge.getFriendsScores === 'function' ||
        typeof bridge.getFriendScores === 'function' ||
        typeof bridge.downloadFriendsScores === 'function' ||
        typeof bridge.getScores === 'function' ||
        typeof bridge.downloadEntries === 'function'
      )
    );
  }

  async hasFriendLeaderboardEntries(options = {}) {
    if (!this.supportsFriendsScores()) return false;
    try {
      const [friends, currentPlayerName] = await Promise.all([
        this.getFriendsScores({
          limit: Number(options.limit) || LEADERBOARD_DISPLAY_LIMIT,
          useCache: false
        }),
        this.getPlayerName().catch(() => null)
      ]);
      return Boolean((friends.entries || []).some((entry) => isNonCurrentFriendEntry(entry, currentPlayerName)));
    } catch (error) {
      console.warn('[SteamLeaderboardProvider] friends availability check failed:', error?.message || error);
      return false;
    }
  }

  async getTopScores(options = {}) {
    if (!await this.isAvailable()) {
      return {
        status: 'unavailable',
        source: 'steam',
        sourceLabel: options.sourceLabel || 'Steam Global',
        entries: [],
        message: 'Steam leaderboard unavailable. Local score is saved.'
      };
    }
    const limit = Number(options.limit) || LEADERBOARD_DISPLAY_LIMIT;
    const leaderboardName = resolveLeaderboardName(options.leaderboardName || this.leaderboardName);
    const leaderboardKind = resolveLeaderboardKind({ leaderboardName, leaderboardKind: options.leaderboardKind, view: options.view });
    const sourceLabel = options.sourceLabel || (leaderboardKind === 'sector_start' ? 'Steam Sector' : 'Steam Global');
    const payload = {
      leaderboardName,
      leaderboardKind,
      request: 'global',
      limit,
      start: 1,
      end: limit
    };
    const raw = await callFirst(this.bridge, [
      'getTopScores',
      'getGlobalScores',
      'downloadGlobalScores',
      'getScores',
      'downloadEntries'
    ], payload);
    const entries = normalizeLeaderboardEntries(Array.isArray(raw) ? raw : raw?.entries, {
      source: 'steam',
      leaderboardKind,
      view: leaderboardKind === 'sector_start' ? LeaderboardView.SECTOR : LeaderboardView.GLOBAL
    }).slice(0, limit);
    return {
      status: entries.length > 0 ? 'available' : 'empty',
      source: 'steam',
      sourceLabel,
      entries,
      message: entries.length > 0
        ? (leaderboardKind === 'sector_start' ? 'Steam sector run records loaded.' : 'Steam global records loaded.')
        : (leaderboardKind === 'sector_start' ? 'Steam sector run board has no entries yet.' : 'Steam global board has no entries yet.')
    };
  }

  async getFriendsScores(options = {}) {
    if (!await this.isAvailable()) {
      return {
        status: 'unavailable',
        source: 'steam-friends',
        sourceLabel: 'Steam Friends',
        entries: [],
        message: 'Steam unavailable. Friends scores cannot load.'
      };
    }
    const limit = Number(options.limit) || LEADERBOARD_DISPLAY_LIMIT;
    const leaderboardName = resolveLeaderboardName(options.leaderboardName || this.leaderboardName);
    const payload = {
      leaderboardName,
      request: 'friends',
      limit
    };
    const raw = await callFirst(this.bridge, [
      'getFriendsScores',
      'getFriendScores',
      'downloadFriendsScores',
      'getScores',
      'downloadEntries'
    ], payload);
    const entries = normalizeLeaderboardEntries(Array.isArray(raw) ? raw : raw?.entries, { source: 'steam-friends' }).slice(0, limit);
    return {
      status: entries.length > 0 ? 'available' : 'empty',
      source: 'steam-friends',
      sourceLabel: 'Steam Friends',
      entries,
      message: entries.length > 0
        ? 'Steam friends records loaded.'
        : 'Steam friends who play Nova Swarm and submit scores will appear here.'
    };
  }

  async submitScore(runResult = {}) {
    if (!await this.isAvailable()) {
      throw new Error('Steam leaderboard unavailable');
    }
    const leaderboardName = resolveLeaderboardName(runResult.leaderboardName || this.leaderboardName);
    const leaderboardKind = resolveLeaderboardKind({
      leaderboardName,
      leaderboardKind: runResult.leaderboardKind,
      view: runResult.view
    });
    const details = leaderboardKind === 'sector_start'
      ? encodeSteamSectorLeaderboardDetails(runResult)
      : encodeSteamLeaderboardDetails(runResult);
    const score = Math.max(0, Math.min(2147483647, Math.floor(Number(runResult.score) || 0)));
    const previousBest = await this.getPlayerBest({ leaderboardName });
    const previousBestScore = Math.max(0, Math.floor(Number(previousBest?.score ?? previousBest?.m_nScore) || 0));
    const uploadMethod = resolveSteamUploadMethod({ score, details, previousBest });
    const payload = {
      leaderboardName,
      score,
      details,
      uploadMethod,
      sortMethod: 'descending',
      displayType: 'numeric',
      metadata: leaderboardKind === 'sector_start' ? {
        leaderboardKind,
        leaderboardName,
        startSector: details[0],
        sectorStart: details[0],
        highestSectorReached: details[1],
        finalSector: details[2],
        level: details[1],
        levelReached: details[1],
        detailsVersion: 1,
        oneEntryPerPlayer: true,
        uploadMethod,
        shipId: runResult.shipId || details[3],
        shipNumericId: details[3],
        runTimeSeconds: details[4],
        bossKills: details[5],
        wavesCleared: details[6],
        source: runResult.source || 'sector_start_challenge'
      } : {
        leaderboardKind,
        leaderboardName,
        level: details[0],
        levelReached: details[0],
        detailsVersion: 2,
        oneEntryPerPlayer: true,
        uploadMethod,
        shipId: details[1],
        runTimeSeconds: details[2],
        kills: details[3],
        bossKills: details[4],
        wavesCleared: details[5]
      }
    };
    let response = null;
    try {
      response = await callFirst(this.bridge, [
        'submitScore',
        'uploadScore',
        'uploadLeaderboardScore'
      ], payload);
    } catch (error) {
      const [diagnostics, runtimeInfo] = await Promise.all([
        readLastUploadDiagnostics(this.bridge),
        readSteamRuntimeInfo(this.bridge)
      ]);
      storeLastUploadDiagnostics(error, {
        ...(diagnostics || error?.steamUpload || {}),
        runtimeInfo
      });
      throw error;
    }
    const responseScore = Math.max(
      0,
      Math.floor(Number(
        response?.entry?.score ??
        response?.score ??
        response?.m_nScore ??
        response?.currentScore ??
        0
      ) || 0)
    );
    const scoreChangedRaw = response?.scoreChanged ?? response?.m_bScoreChanged ?? response?.score_changed ?? null;
    const scoreChangedFalse = scoreChangedRaw === false || scoreChangedRaw === 0 || scoreChangedRaw === '0';
    const postSubmitBest = previousBestScore > 0
      ? previousBest
      : await this.getDownloadedPlayerBest({ leaderboardName, leaderboardKind }).catch(() => null);
    const postSubmitBestScore = Math.max(0, Math.floor(Number(postSubmitBest?.score ?? postSubmitBest?.m_nScore) || 0));
    const responseBestScore = responseScore > score ? responseScore : 0;
    const retainedBestScore = Math.max(previousBestScore, postSubmitBestScore, responseBestScore);
    const retainedHigherBest = retainedBestScore > score;
    const retainedEqualBest = retainedBestScore === score &&
      previousBestScore > 0 &&
      (previousBestScore >= score || scoreChangedFalse);
    const bestUnchanged = retainedBestScore > 0 && (retainedHigherBest || retainedEqualBest);

    return {
      status: 'submitted',
      source: 'steam',
      sourceLabel: leaderboardKind === 'sector_start' ? 'Steam Sector' : 'Steam Global',
      playerName: await this.getPlayerName(),
      details,
      levelReached: leaderboardKind === 'sector_start' ? details[1] : details[0],
      leaderboardName,
      leaderboardKind,
      startSector: leaderboardKind === 'sector_start' ? details[0] : null,
      highestSectorReached: leaderboardKind === 'sector_start' ? details[1] : null,
      finalSector: leaderboardKind === 'sector_start' ? details[2] : null,
      uploadMethod,
      previousBest: previousBest || (bestUnchanged ? postSubmitBest : null) || null,
      previousBestScore: bestUnchanged ? retainedBestScore : previousBestScore,
      retainedBestScore,
      personalBestBeaten: !bestUnchanged && (previousBestScore <= 0 || score > previousBestScore),
      bestUnchanged,
      response,
      rank: response?.rank ?? response?.globalRank ?? response?.m_nGlobalRank ?? null
    };
  }

  async getPlayerBest(options = {}) {
    const bridge = this.getBridge();
    if (!bridge || !await this.isAvailable()) return null;
    try {
      return await callFirst(bridge, ['getPlayerBest', 'getBestScore'], {
        leaderboardName: resolveLeaderboardName(options.leaderboardName || this.leaderboardName)
      });
    } catch {
      return null;
    }
  }

  async getDownloadedPlayerBest(options = {}) {
    const bridge = this.getBridge();
    if (!bridge || !await this.isAvailable()) return null;
    const currentPlayerName = await this.getPlayerName().catch(() => null);
    const leaderboardName = resolveLeaderboardName(options.leaderboardName || this.leaderboardName);
    const leaderboardKind = resolveLeaderboardKind({ leaderboardName, leaderboardKind: options.leaderboardKind });
    const reads = await Promise.allSettled([
      leaderboardKind === 'sector_start'
        ? Promise.resolve({ entries: [] })
        : this.getFriendsScores({ limit: 100, useCache: false, leaderboardName }),
      this.getTopScores({ limit: 100, useCache: false, leaderboardName, leaderboardKind })
    ]);
    const entries = reads.flatMap((read) => (
      read.status === 'fulfilled' && Array.isArray(read.value?.entries)
        ? read.value.entries
        : []
    ));
    return pickBestCurrentPlayerEntry(entries, currentPlayerName);
  }
}
