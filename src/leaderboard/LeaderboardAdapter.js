import { CloudLeaderboardProvider } from './CloudLeaderboardProvider.js';
import { LocalLeaderboardProvider } from './LocalLeaderboardProvider.js';
import { SteamLeaderboardProvider } from './SteamLeaderboardProvider.js';
import {
  LEADERBOARD_DISPLAY_LIMIT,
  STEAM_LEADERBOARD_NAME,
  STEAM_TACTICAL_LEADERBOARD_NAME,
  STEAM_SECTOR_LEADERBOARD_NAME,
  LeaderboardView,
  createSectorStartRunResultFromGame,
  createRunResultFromGame,
  normalizeLeaderboardEntries
} from './LeaderboardTypes.js';
import {
  canRunModeSubmitGlobalLeaderboard,
  canRunModeUnlockAchievements
} from '../game/RunMode.js';
import {
  comparePilotXpExact,
  maxPilotXpExact,
  normalizePilotXpExact
} from '../shared/RankPolicy.js';

const STEAM_UPLOAD_DIAGNOSTICS_KEY = 'novaSwarm.lastSteamUploadDiagnostics.v1';
export const PENDING_STEAM_SUBMISSIONS_KEY = 'novaSwarm.pendingSteamLeaderboardSubmits.v1';
export const PENDING_CAREER_RANK_METADATA_KEY = 'novaSwarm.pendingCareerRankMetadata.v1';
const MAX_PENDING_STEAM_SUBMISSIONS = 8;

function safeWindow() {
  try {
    return typeof window !== 'undefined' ? window : null;
  } catch {
    return null;
  }
}

function compactScoreRead(result) {
  if (!result) return null;
  return {
    status: result.status || null,
    source: result.source || null,
    sourceLabel: result.sourceLabel || null,
    message: result.message || null,
    count: Array.isArray(result.entries) ? result.entries.length : 0,
    error: result.error || null,
    currentPlayerObserved: Boolean((result.entries || []).some(entry => entry?.isCurrentPlayer))
  };
}

function scoreFromPersonalBest(value) {
  if (value == null) return 0;
  const rawScore = typeof value === 'number'
    ? value
    : value.score ?? value.m_nScore ?? value.value ?? value.bestScore ?? value.highScore;
  return Math.max(0, Math.floor(Number(rawScore) || 0));
}

function readJsonStorage(key, fallback) {
  const win = safeWindow();
  if (!win) return fallback;
  try {
    const parsed = JSON.parse(win.localStorage?.getItem(key) || 'null');
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  const win = safeWindow();
  if (!win) return false;
  try {
    win.localStorage?.setItem(key, JSON.stringify(value));
    win.__novaSteamCloudDiagnostics?.sync?.()?.catch?.(() => {});
    return true;
  } catch {
    return false;
  }
}

function clampScore(value) {
  return Math.max(0, Math.min(2147483647, Math.floor(Number(value) || 0)));
}

function sanitizePendingRunResult(runResult = {}) {
  const runMode = runResult.runMode || null;
  const isDebugRun = runResult.isDebugRun === true;
  return {
    name: runResult.playerName || runResult.name || null,
    playerName: runResult.playerName || runResult.name || null,
    score: clampScore(runResult.score),
    level: Math.max(1, Math.floor(Number(runResult.level ?? runResult.levelReached) || 1)),
    levelReached: Math.max(1, Math.floor(Number(runResult.levelReached ?? runResult.level) || 1)),
    rankIndex: Math.max(0, Math.floor(Number(runResult.rankIndex) || 0)),
    careerRankExact: normalizePilotXpExact(runResult.careerRankExact ?? String(Math.max(1, Number(runResult.rankIndex || 0) + 1)), '1'),
    submissionId: runResult.submissionId || null,
    shipId: runResult.shipId || null,
    shipNumericId: Math.max(0, Math.floor(Number(runResult.shipNumericId) || 0)),
    selectedShipSpriteKey: runResult.selectedShipSpriteKey || null,
    shipName: runResult.shipName || null,
    runTimeSeconds: Math.max(0, Math.floor(Number(runResult.runTimeSeconds) || 0)),
    kills: Math.max(0, Math.floor(Number(runResult.kills) || 0)),
    bossKills: Math.max(0, Math.floor(Number(runResult.bossKills) || 0)),
    wavesCleared: Math.max(0, Math.floor(Number(runResult.wavesCleared) || 0)),
    startSector: runResult.startSector ?? runResult.sectorStart ?? null,
    sectorStart: runResult.sectorStart ?? runResult.startSector ?? null,
    highestSectorReached: runResult.highestSectorReached ?? null,
    finalSector: runResult.finalSector ?? null,
    runMode,
    runModeSource: runResult.runModeSource || null,
    isDebugRun,
    eligibleForSubmission: runResult.eligibleForSubmission ?? canRunModeSubmitGlobalLeaderboard(runMode, { isDebugRun }),
    eligibleForAchievements: runResult.eligibleForAchievements ?? canRunModeUnlockAchievements(runMode, { isDebugRun }),
    submissionEligibilityVersion: Math.max(0, Math.floor(Number(runResult.submissionEligibilityVersion) || 0)),
    leaderboardName: runResult.leaderboardName || null,
    leaderboardKind: runResult.leaderboardKind || null,
    buildId: runResult.buildId || null,
    source: runResult.source || null
  };
}

function pendingBoardKind(runResult = {}) {
  if (runResult.leaderboardKind === 'sector_start' || runResult.leaderboardName === STEAM_SECTOR_LEADERBOARD_NAME) {
    return 'sector_start';
  }
  if (runResult.leaderboardKind === 'mayhem_tactical' || runResult.leaderboardName === STEAM_TACTICAL_LEADERBOARD_NAME) {
    return 'mayhem_tactical';
  }
  return 'global';
}

function pendingDedupeKey(runResult = {}) {
  const kind = pendingBoardKind(runResult);
  if (kind === 'sector_start') {
    const start = Math.max(1, Math.floor(Number(runResult.startSector ?? runResult.sectorStart) || 1));
    return `${STEAM_SECTOR_LEADERBOARD_NAME}:start-${start}`;
  }
  const leaderboardName = runResult.leaderboardName || STEAM_LEADERBOARD_NAME;
  return `${leaderboardName}:${kind}`;
}

function normalizePendingQueue(raw) {
  const entries = Array.isArray(raw?.entries) ? raw.entries : (Array.isArray(raw) ? raw : []);
  return entries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      ...entry,
      key: String(entry.key || pendingDedupeKey(entry.runResult || entry)),
      score: clampScore(entry.score ?? entry.runResult?.score),
      attempts: Math.max(0, Math.floor(Number(entry.attempts) || 0)),
      queuedAt: entry.queuedAt || new Date().toISOString(),
      updatedAt: entry.updatedAt || entry.queuedAt || new Date().toISOString(),
      runResult: sanitizePendingRunResult(entry.runResult || entry)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PENDING_STEAM_SUBMISSIONS);
}

function personalBestCandidate(source, value) {
  if (value?.seed) return null;
  const score = scoreFromPersonalBest(value);
  if (score <= 0) return null;
  return {
    source,
    score,
    entry: value && typeof value === 'object' ? value : null
  };
}

function mergeSteamUploadDiagnostics(extra = {}) {
  const win = safeWindow();
  if (!win) return;
  try {
    const existing = win.__novaLastSteamUploadDiagnostics ||
      JSON.parse(win.localStorage?.getItem(STEAM_UPLOAD_DIAGNOSTICS_KEY) || 'null') ||
      {};
    const next = {
      ...existing,
      ...extra,
      updatedAt: new Date().toISOString()
    };
    win.__novaLastSteamUploadDiagnostics = next;
    win.localStorage?.setItem(STEAM_UPLOAD_DIAGNOSTICS_KEY, JSON.stringify(next));
  } catch {
    // Diagnostics are best effort and must not affect the runback flow.
  }
}

export class LeaderboardAdapter {
  constructor(options = {}) {
    this.localProvider = new LocalLeaderboardProvider();
    this.cloudProvider = new CloudLeaderboardProvider();
    this.steamProvider = new SteamLeaderboardProvider();
    this.onAcceptedPendingSteamSubmission = typeof options.onAcceptedPendingSteamSubmission === 'function'
      ? options.onAcceptedPendingSteamSubmission
      : null;
    this.availability = {
      steam: false,
      steamFriends: false,
      cloud: true,
      local: true
    };
    this.refreshed = false;
  }

  async refreshAvailability() {
    const [steam, cloud, local] = await Promise.all([
      this.steamProvider.isAvailable().catch(() => false),
      this.cloudProvider.isAvailable().catch(() => false),
      this.localProvider.isAvailable().catch(() => true)
    ]);
    const steamFriends = steam
      ? await this.steamProvider.hasFriendLeaderboardEntries({ limit: LEADERBOARD_DISPLAY_LIMIT }).catch(() => false)
      : false;
    this.availability = { steam, steamFriends, cloud, local };
    this.refreshed = true;
    if (steam) {
      this.retryPendingSteamSubmissions({ reason: 'availability' }).catch((error) => {
        console.warn('[LeaderboardAdapter] pending Steam retry failed:', error?.message || error);
      });
      this.retryPendingCareerRankMetadata({ reason: 'availability' }).catch((error) => {
        console.warn('[LeaderboardAdapter] pending Career Rank refresh failed:', error?.message || error);
      });
    }
    return this.availability;
  }

  async ensureAvailability() {
    if (!this.refreshed) await this.refreshAvailability();
    return this.availability;
  }

  isSteamAvailable() {
    return Boolean(this.availability.steam);
  }

  shouldUseSteamSubmission() {
    return this.isSteamAvailable();
  }

  getRuntimeSummary() {
    return {
      steam: Boolean(this.availability.steam),
      steamFriends: Boolean(this.availability.steamFriends),
      cloud: Boolean(this.availability.cloud),
      local: Boolean(this.availability.local),
      globalProvider: this.availability.steam ? 'steam' : (this.availability.cloud ? 'cloud' : 'local')
    };
  }

  getTabs() {
    if (this.availability.steam) {
      return [
        { id: LeaderboardView.GLOBAL, label: 'PURE', title: 'MAYHEM PURE DECK', sourceLabel: 'Steam Pure' },
        { id: LeaderboardView.TACTICAL, label: 'TACTICAL', title: 'MAYHEM TACTICAL DECK', sourceLabel: 'Steam Tactical' },
        { id: LeaderboardView.SECTOR, label: 'SECTOR', title: 'SECTOR RUN DECK', sourceLabel: 'Steam Sector' },
        { id: LeaderboardView.FRIENDS, label: 'FRIENDS', title: 'FRIENDS SCORE DECK', sourceLabel: 'Steam Friends' },
        { id: LeaderboardView.LOCAL, label: 'LOCAL', title: 'LOCAL SCORE DECK', sourceLabel: 'Local Memory' }
      ];
    }
    if (this.availability.cloud) {
      return [
        { id: LeaderboardView.GLOBAL, label: 'GLOBAL', title: 'GLOBAL SCORE DECK', sourceLabel: 'Cloud Global' },
        { id: LeaderboardView.LOCAL, label: 'LOCAL', title: 'LOCAL SCORE DECK', sourceLabel: 'Local Memory' }
      ];
    }
    return [
      { id: LeaderboardView.LOCAL, label: 'LOCAL', title: 'LOCAL SCORE DECK', sourceLabel: 'Local Memory' }
    ];
  }

  getTab(view) {
    return this.getTabs().find(tab => tab.id === view) || this.getTabs()[0];
  }

  normalizeView(view) {
    const tabs = this.getTabs();
    return tabs.some(tab => tab.id === view) ? view : tabs[0]?.id || LeaderboardView.LOCAL;
  }

  getSourceLabel(view) {
    return this.getTab(view)?.sourceLabel || 'Local Memory';
  }

  async getScores(view = LeaderboardView.GLOBAL, options = {}) {
    await this.ensureAvailability();
    if (this.availability.steam && this.getPendingCareerRankMetadata()) {
      await this.retryPendingCareerRankMetadata({ reason: 'leaderboard_read' }).catch(() => null);
    }
    const normalizedView = this.normalizeView(view);
    const limit = Number(options.limit) || LEADERBOARD_DISPLAY_LIMIT;
    try {
      if (normalizedView === LeaderboardView.LOCAL) {
        return await this.localProvider.getLocalScores({ ...options, limit });
      }
      if (normalizedView === LeaderboardView.FRIENDS) {
        if (!this.availability.steam) {
          return {
            status: 'unavailable',
            source: 'steam-friends',
            sourceLabel: 'Steam Friends',
            entries: [],
            message: 'Steam leaderboard unavailable. Local score is saved.'
          };
        }
        return await this.steamProvider.getFriendsScores({ ...options, limit });
      }
      if (normalizedView === LeaderboardView.SECTOR) {
        if (!this.availability.steam) {
          return {
            status: 'unavailable',
            source: 'steam',
            sourceLabel: 'Steam Sector',
            entries: [],
            message: 'Steam leaderboard unavailable. Local score is saved.'
          };
        }
        return await this.steamProvider.getTopScores({
          ...options,
          limit,
          leaderboardName: STEAM_SECTOR_LEADERBOARD_NAME,
          leaderboardKind: 'sector_start',
          view: LeaderboardView.SECTOR,
          sourceLabel: 'Steam Sector'
        });
      }
      if (normalizedView === LeaderboardView.TACTICAL) {
        if (!this.availability.steam) {
          return {
            status: 'unavailable',
            source: 'steam',
            sourceLabel: 'Steam Tactical',
            entries: [],
            message: 'Steam Tactical leaderboard unavailable. Your score can retry when Steam reconnects.'
          };
        }
        return await this.steamProvider.getTopScores({
          ...options,
          limit,
          leaderboardName: STEAM_TACTICAL_LEADERBOARD_NAME,
          leaderboardKind: 'mayhem_tactical',
          view: LeaderboardView.TACTICAL,
          sourceLabel: 'Steam Tactical'
        });
      }
      if (this.availability.steam) {
        return await this.steamProvider.getTopScores({
          ...options,
          limit,
          leaderboardName: STEAM_LEADERBOARD_NAME,
          leaderboardKind: 'global',
          view: LeaderboardView.GLOBAL,
          sourceLabel: 'Steam Pure'
        });
      }
      if (this.availability.cloud) {
        return await this.cloudProvider.getTopScores({ ...options, limit });
      }
      return await this.localProvider.getLocalScores({ ...options, limit });
    } catch (error) {
      console.warn(`[LeaderboardAdapter] ${normalizedView} provider failed:`, error?.message || error);
      return {
        status: 'failed',
        source: normalizedView,
        sourceLabel: this.getSourceLabel(normalizedView),
        entries: [],
        message: normalizedView === LeaderboardView.FRIENDS
          ? 'Steam leaderboard unavailable. Local score is saved.'
          : normalizedView === LeaderboardView.SECTOR
            ? 'Steam leaderboard unavailable. Local score is saved.'
          : normalizedView === LeaderboardView.TACTICAL
            ? 'Steam Tactical leaderboard unavailable. Your score can retry when Steam reconnects.'
          : normalizedView === LeaderboardView.GLOBAL
            ? 'Steam leaderboard unavailable. Local score is saved.'
            : 'Could not load local scores.',
        error: error?.message || 'unknown'
      };
    }
  }

  async submitScore(runResult = {}, options = {}) {
    await this.ensureAvailability();
    const steamOnlyBoard = runResult.leaderboardName === STEAM_TACTICAL_LEADERBOARD_NAME
      || runResult.leaderboardKind === 'mayhem_tactical';
    const target = options.target || (this.availability.steam || steamOnlyBoard ? 'steam' : 'cloud');
    const levelReached = runResult.levelReached ?? runResult.level;
    const result = {
      name: options.name || runResult.playerName || runResult.name || null,
      score: runResult.score,
      level: levelReached,
      levelReached,
      rankIndex: runResult.rankIndex,
      submissionId: runResult.submissionId,
      runMode: runResult.runMode || null,
      isDebugRun: runResult.isDebugRun === true,
      eligibleForSubmission: runResult.eligibleForSubmission !== false,
      eligibleForAchievements: runResult.eligibleForAchievements !== false,
      leaderboardName: runResult.eligibleForSubmission === false
        ? null
        : runResult.leaderboardName || STEAM_LEADERBOARD_NAME,
      leaderboardKind: runResult.eligibleForSubmission === false
        ? 'ineligible'
        : runResult.leaderboardKind || 'global',
      updatedAt: new Date().toISOString()
    };

    if (target === 'steam' && !result.name) {
      result.name = await this.steamProvider.getPlayerName().catch(() => null);
    }

    if (options.saveLocal) {
      try {
        const local = await this.localProvider.submitScore(runResult, { name: options.name || result.name });
        result.localStatus = 'saved';
        result.localPlacement = local.placement;
        result.localEntry = local.entry;
      } catch (error) {
        result.localStatus = 'failed';
        result.localError = error?.message || 'unknown';
      }
    }

    if (target === 'local') return result;

    if (result.eligibleForSubmission === false) {
      result.globalStatus = 'blocked';
      result.globalProvider = target;
      result.submissionBlockedReason = 'ineligible_run_mode';
      return result;
    }

    if (target === 'steam') {
      try {
        const steam = await this.steamProvider.submitScore(runResult);
        result.name = steam.playerName || result.name;
        result.globalStatus = 'submitted';
        result.globalProvider = 'steam';
        result.steamStatus = 'submitted';
        result.steamRank = steam.rank;
        result.steamDetails = steam.details;
        result.steamLevelReached = steam.levelReached;
        result.steamUploadMethod = steam.uploadMethod;
        result.steamPreviousBest = steam.previousBest || null;
        result.steamPreviousBestScore = steam.previousBestScore || 0;
        result.steamPersonalBestBeaten = Boolean(steam.personalBestBeaten);
        result.steamBestUnchanged = Boolean(steam.bestUnchanged);
        result.steamResponse = steam.response || null;
        result.leaderboardName = steam.leaderboardName || result.leaderboardName;
        result.leaderboardKind = steam.leaderboardKind || result.leaderboardKind;
      } catch (error) {
        result.globalStatus = 'failed';
        result.globalProvider = 'steam';
        result.steamStatus = 'failed';
        result.steamError = error?.message || 'unknown';
        const pending = this.enqueuePendingSteamSubmission(runResult, {
          reason: result.steamError,
          target: pendingBoardKind(runResult)
        });
        result.steamPendingQueued = pending.queued;
        result.steamPendingCount = pending.pendingCount;
      }
      result.steamPostSubmitDownload = await this.getSteamPostSubmitDownloadSnapshot({
        leaderboardName: result.leaderboardName,
        leaderboardKind: result.leaderboardKind
      });
      mergeSteamUploadDiagnostics({
        source: 'LeaderboardAdapter.submitScore',
        steamSubmissionResult: {
          globalStatus: result.globalStatus,
          steamStatus: result.steamStatus,
          steamError: result.steamError || null,
          steamRank: result.steamRank || null,
          steamBestUnchanged: Boolean(result.steamBestUnchanged),
          steamPreviousBestScore: result.steamPreviousBestScore || null,
          score: result.score ?? null,
          level: result.level ?? null,
          submissionId: result.submissionId || null
        },
        postSubmitDownload: result.steamPostSubmitDownload
      });
      return result;
    }

    if (target === 'cloud') {
      try {
        const cloud = await this.cloudProvider.submitScore(runResult, { name: options.name || result.name });
        result.name = cloud.playerName || result.name;
        result.globalStatus = 'submitted';
        result.globalProvider = 'cloud';
        result.globalResponse = cloud.response || null;
      } catch (error) {
        result.globalStatus = 'failed';
        result.globalProvider = 'cloud';
        result.globalError = error?.message || 'unknown';
      }
      return result;
    }

    return result;
  }

  async submitSectorStartScore(runResult = {}, options = {}) {
    await this.ensureAvailability();
    const result = {
      name: options.name || runResult.playerName || runResult.name || null,
      score: runResult.score,
      level: runResult.highestSectorReached ?? runResult.levelReached ?? runResult.level,
      levelReached: runResult.highestSectorReached ?? runResult.levelReached ?? runResult.level,
      startSector: runResult.startSector ?? runResult.sectorStart ?? null,
      highestSectorReached: runResult.highestSectorReached ?? null,
      finalSector: runResult.finalSector ?? null,
      rankIndex: runResult.rankIndex,
      submissionId: runResult.submissionId,
      sectorSteamStatus: this.availability.steam ? 'ready' : 'unavailable',
      updatedAt: new Date().toISOString()
    };
    if (!this.availability.steam) {
      result.sectorSteamError = 'Steam leaderboard unavailable';
      const pending = this.enqueuePendingSteamSubmission({
        ...runResult,
        playerName: result.name,
        name: result.name,
        leaderboardName: STEAM_SECTOR_LEADERBOARD_NAME,
        leaderboardKind: 'sector_start'
      }, {
        reason: result.sectorSteamError,
        target: 'sector_start'
      });
      result.sectorSteamPendingQueued = pending.queued;
      result.sectorSteamPendingCount = pending.pendingCount;
      return result;
    }
    if (!result.name) {
      result.name = await this.steamProvider.getPlayerName().catch(() => null);
    }
    try {
      const steam = await this.steamProvider.submitScore({
        ...runResult,
        playerName: result.name,
        name: result.name,
        leaderboardName: STEAM_SECTOR_LEADERBOARD_NAME,
        leaderboardKind: 'sector_start'
      });
      result.name = steam.playerName || result.name;
      result.sectorSteamStatus = 'submitted';
      result.sectorSteamRank = steam.rank;
      result.sectorSteamDetails = steam.details;
      result.sectorSteamUploadMethod = steam.uploadMethod;
      result.sectorSteamPreviousBest = steam.previousBest || null;
      result.sectorSteamPreviousBestScore = steam.previousBestScore || 0;
      result.sectorSteamPersonalBestBeaten = Boolean(steam.personalBestBeaten);
      result.sectorSteamBestUnchanged = Boolean(steam.bestUnchanged);
      result.sectorSteamResponse = steam.response || null;
      result.leaderboardName = steam.leaderboardName || STEAM_SECTOR_LEADERBOARD_NAME;
      result.leaderboardKind = steam.leaderboardKind || 'sector_start';
    } catch (error) {
      result.sectorSteamStatus = 'failed';
      result.sectorSteamError = error?.message || 'unknown';
      result.leaderboardName = STEAM_SECTOR_LEADERBOARD_NAME;
      result.leaderboardKind = 'sector_start';
      const pending = this.enqueuePendingSteamSubmission({
        ...runResult,
        playerName: result.name,
        name: result.name,
        leaderboardName: STEAM_SECTOR_LEADERBOARD_NAME,
        leaderboardKind: 'sector_start'
      }, {
        reason: result.sectorSteamError,
        target: 'sector_start'
      });
      result.sectorSteamPendingQueued = pending.queued;
      result.sectorSteamPendingCount = pending.pendingCount;
    }
    mergeSteamUploadDiagnostics({
      source: 'LeaderboardAdapter.submitSectorStartScore',
      sectorSteamSubmissionResult: {
        sectorSteamStatus: result.sectorSteamStatus,
        sectorSteamError: result.sectorSteamError || null,
        sectorSteamRank: result.sectorSteamRank || null,
        sectorSteamBestUnchanged: Boolean(result.sectorSteamBestUnchanged),
        score: result.score ?? null,
        startSector: result.startSector ?? null,
        highestSectorReached: result.highestSectorReached ?? null,
        submissionId: result.submissionId || null,
        leaderboardName: STEAM_SECTOR_LEADERBOARD_NAME
      }
    });
    return result;
  }

  async getGlobalScoresForPlacement(options = {}) {
    const view = options.view === LeaderboardView.TACTICAL
      || options.leaderboardName === STEAM_TACTICAL_LEADERBOARD_NAME
      || options.leaderboardKind === 'mayhem_tactical'
      ? LeaderboardView.TACTICAL
      : LeaderboardView.GLOBAL;
    const result = await this.getScores(view, {
      ...options,
      useCache: options.useCache ?? false
    });
    return normalizeLeaderboardEntries(result.entries || [], { source: result.source || 'global' });
  }

  async getKnownPersonalBest(options = {}) {
    await this.ensureAvailability();
    const reads = [];
    if (options.includeLocal !== false) {
      reads.push(this.localProvider.getPlayerBest()
        .then((best) => personalBestCandidate('local', best))
        .catch(() => null));
    }
    if (this.availability.steam) {
      reads.push(
        this.steamProvider.getPlayerBest(options)
          .then((best) => personalBestCandidate('steam_player_best', best))
          .catch(() => null),
        this.steamProvider.getDownloadedPlayerBest(options)
          .then((best) => personalBestCandidate('steam_downloaded_player_best', best))
          .catch(() => null)
      );
    }

    const settled = await Promise.allSettled(reads);
    const candidates = settled
      .map((result) => result.status === 'fulfilled' ? result.value : null)
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    return candidates[0] || { source: 'none', score: 0, entry: null };
  }

  async getSteamPostSubmitDownloadSnapshot(options = {}) {
    const [globalResult, friendsResult] = await Promise.allSettled([
      this.steamProvider.getTopScores({ limit: 10, useCache: false, ...options }),
      this.steamProvider.getFriendsScores({ limit: 10, useCache: false, ...options })
    ]);
    return {
      generatedAt: new Date().toISOString(),
      global: globalResult.status === 'fulfilled'
        ? compactScoreRead(globalResult.value)
        : { status: 'failed', error: globalResult.reason?.message || String(globalResult.reason) },
      friends: friendsResult.status === 'fulfilled'
        ? compactScoreRead(friendsResult.value)
        : { status: 'failed', error: friendsResult.reason?.message || String(friendsResult.reason) }
    };
  }

  qualifiesLocal(score) {
    return this.localProvider.qualifies(score);
  }

  getLocalCutoff() {
    return this.localProvider.getCutoff();
  }

  async getSteamPlayerName() {
    await this.ensureAvailability();
    if (!this.availability.steam) return null;
    return this.steamProvider.getPlayerName();
  }

  createRunResult(game, overrides = {}) {
    return createRunResultFromGame(game, overrides);
  }

  getPendingSteamSubmissions() {
    return normalizePendingQueue(readJsonStorage(PENDING_STEAM_SUBMISSIONS_KEY, { version: 1, entries: [] }));
  }

  getPendingCareerRankMetadata() {
    const raw = readJsonStorage(PENDING_CAREER_RANK_METADATA_KEY, null);
    if (!raw?.careerRankExact) return null;
    return {
      careerRankExact: normalizePilotXpExact(raw.careerRankExact, '1'),
      attempts: Math.max(0, Math.floor(Number(raw.attempts) || 0)),
      queuedAt: raw.queuedAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.queuedAt || new Date().toISOString(),
      lastError: raw.lastError || null
    };
  }

  writePendingCareerRankMetadata(value = null) {
    const win = safeWindow();
    if (!win) return false;
    try {
      if (!value) {
        win.localStorage?.removeItem(PENDING_CAREER_RANK_METADATA_KEY);
        return true;
      }
      return writeJsonStorage(PENDING_CAREER_RANK_METADATA_KEY, value);
    } catch {
      return false;
    }
  }

  queueCareerRankMetadataRefresh(careerRankExact, options = {}) {
    const existing = this.getPendingCareerRankMetadata();
    const requested = normalizePilotXpExact(careerRankExact, '1');
    const latest = existing
      ? maxPilotXpExact(existing.careerRankExact, requested)
      : requested;
    const now = new Date().toISOString();
    const value = {
      careerRankExact: latest,
      attempts: Math.max(0, Number(existing?.attempts) || 0) + (options.incrementAttempt ? 1 : 0),
      queuedAt: existing?.queuedAt || now,
      updatedAt: now,
      lastError: options.lastError || existing?.lastError || null
    };
    this.writePendingCareerRankMetadata(value);
    return value;
  }

  async refreshCareerRankMetadata(careerRankExact, options = {}) {
    const requested = normalizePilotXpExact(careerRankExact, '1');
    await this.ensureAvailability();
    if (!this.availability.steam) {
      const pending = this.queueCareerRankMetadataRefresh(requested, {
        lastError: 'Steam leaderboard unavailable'
      });
      return { status: 'pending', reason: 'steam_unavailable', careerRankExact: pending.careerRankExact, results: [] };
    }
    const boards = [
      { leaderboardName: STEAM_LEADERBOARD_NAME, leaderboardKind: 'global', view: LeaderboardView.GLOBAL },
      { leaderboardName: STEAM_TACTICAL_LEADERBOARD_NAME, leaderboardKind: 'mayhem_tactical', view: LeaderboardView.TACTICAL },
      { leaderboardName: STEAM_SECTOR_LEADERBOARD_NAME, leaderboardKind: 'sector_start', view: LeaderboardView.SECTOR }
    ];
    const results = [];
    let firstError = null;
    for (const board of boards) {
      try {
        results.push(await this.steamProvider.refreshCareerRankMetadata({
          ...board,
          careerRankExact: requested
        }));
      } catch (error) {
        firstError ||= error;
        results.push({
          status: 'failed',
          leaderboardName: board.leaderboardName,
          leaderboardKind: board.leaderboardKind,
          error: error?.message || 'unknown'
        });
      }
    }
    if (firstError) {
      if (options.queueOnFailure !== false) {
        this.queueCareerRankMetadataRefresh(requested, {
          incrementAttempt: true,
          lastError: firstError.message || 'unknown'
        });
      }
      return { status: 'pending', reason: firstError.message || 'refresh_failed', careerRankExact: requested, results };
    }
    const pending = this.getPendingCareerRankMetadata();
    if (!pending || comparePilotXpExact(pending.careerRankExact, requested) <= 0) {
      this.writePendingCareerRankMetadata(null);
    }
    return { status: 'refreshed', careerRankExact: requested, results };
  }

  async retryPendingCareerRankMetadata(options = {}) {
    const pending = this.getPendingCareerRankMetadata();
    if (!pending) return { status: 'empty', reason: options.reason || null };
    const result = await this.refreshCareerRankMetadata(pending.careerRankExact, { queueOnFailure: false });
    if (result.status !== 'refreshed') {
      this.queueCareerRankMetadataRefresh(pending.careerRankExact, {
        incrementAttempt: true,
        lastError: result.reason || 'refresh_failed'
      });
    }
    return result;
  }

  writePendingSteamSubmissions(entries = []) {
    const normalized = normalizePendingQueue({ entries });
    const current = normalizePendingQueue(
      readJsonStorage(PENDING_STEAM_SUBMISSIONS_KEY, { version: 1, entries: [] })
    );
    if (JSON.stringify(current) === JSON.stringify(normalized)) {
      return normalized;
    }
    writeJsonStorage(PENDING_STEAM_SUBMISSIONS_KEY, {
      version: 1,
      updatedAt: new Date().toISOString(),
      entries: normalized
    });
    return normalized;
  }

  enqueuePendingSteamSubmission(runResult = {}, options = {}) {
    const sanitized = sanitizePendingRunResult(runResult);
    if (sanitized.score <= 0) {
      return { queued: false, reason: 'no_score', pendingCount: this.getPendingSteamSubmissions().length };
    }
    const key = pendingDedupeKey(sanitized);
    const now = new Date().toISOString();
    const queue = this.getPendingSteamSubmissions();
    const existing = queue.find((entry) => entry.key === key);
    if (existing && existing.score > sanitized.score) {
      return { queued: false, reason: 'existing_pending_is_better', pendingCount: queue.length };
    }
    const nextEntry = {
      key,
      score: sanitized.score,
      target: options.target || pendingBoardKind(sanitized),
      reason: options.reason || 'steam_unavailable',
      attempts: existing?.attempts || 0,
      queuedAt: existing?.queuedAt || now,
      updatedAt: now,
      runResult: sanitized
    };
    const next = [
      nextEntry,
      ...queue.filter((entry) => entry.key !== key)
    ];
    const written = this.writePendingSteamSubmissions(next);
    return { queued: true, reason: nextEntry.reason, pendingCount: written.length, key };
  }

  clearPendingSteamSubmission(key) {
    const queue = this.getPendingSteamSubmissions();
    const next = this.writePendingSteamSubmissions(queue.filter((entry) => entry.key !== key));
    return { pendingCount: next.length };
  }

  async retryPendingSteamSubmissions(options = {}) {
    await this.ensureAvailability();
    if (!this.availability.steam) {
      return { attempted: 0, submitted: 0, remaining: this.getPendingSteamSubmissions().length, reason: 'steam_unavailable' };
    }
    const queue = this.getPendingSteamSubmissions();
    if (queue.length === 0) {
      return { attempted: 0, submitted: 0, remaining: 0, reason: 'empty_queue' };
    }
    let submitted = 0;
    const remaining = [];
    for (const entry of queue) {
      try {
        const steam = await this.steamProvider.submitScore(entry.runResult);
        submitted += 1;
        try {
          this.onAcceptedPendingSteamSubmission?.({
            entry,
            runResult: entry.runResult,
            steam
          });
        } catch (error) {
          console.warn('[LeaderboardAdapter] accepted pending Steam callback failed:', error?.message || error);
        }
      } catch (error) {
        remaining.push({
          ...entry,
          attempts: Math.max(0, Number(entry.attempts) || 0) + 1,
          lastError: error?.message || 'unknown',
          updatedAt: new Date().toISOString()
        });
      }
    }
    const written = this.writePendingSteamSubmissions(remaining);
    mergeSteamUploadDiagnostics({
      source: 'LeaderboardAdapter.retryPendingSteamSubmissions',
      pendingRetry: {
        reason: options.reason || null,
        attempted: queue.length,
        submitted,
        remaining: written.length
      }
    });
    return { attempted: queue.length, submitted, remaining: written.length };
  }

  createSectorStartRunResult(game, overrides = {}) {
    return createSectorStartRunResultFromGame(game, overrides);
  }
}

export function createLeaderboardAdapter(options = {}) {
  return new LeaderboardAdapter(options);
}
