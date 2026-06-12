import { CloudLeaderboardProvider } from './CloudLeaderboardProvider.js';
import { LocalLeaderboardProvider } from './LocalLeaderboardProvider.js';
import { SteamLeaderboardProvider } from './SteamLeaderboardProvider.js';
import {
  LEADERBOARD_DISPLAY_LIMIT,
  STEAM_SECTOR_LEADERBOARD_NAME,
  LeaderboardView,
  createSectorStartRunResultFromGame,
  createRunResultFromGame,
  normalizeLeaderboardEntries
} from './LeaderboardTypes.js';

const STEAM_UPLOAD_DIAGNOSTICS_KEY = 'novaSwarm.lastSteamUploadDiagnostics.v1';

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
  constructor() {
    this.localProvider = new LocalLeaderboardProvider();
    this.cloudProvider = new CloudLeaderboardProvider();
    this.steamProvider = new SteamLeaderboardProvider();
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
        { id: LeaderboardView.GLOBAL, label: 'GLOBAL', title: 'GLOBAL SCORE DECK', sourceLabel: 'Steam Global' },
        { id: LeaderboardView.SECTOR, label: 'SECTOR', title: 'SECTOR CHALLENGE DECK', sourceLabel: 'Steam Sector' },
        ...(this.availability.steamFriends
          ? [{ id: LeaderboardView.FRIENDS, label: 'FRIENDS', title: 'FRIENDS SCORE DECK', sourceLabel: 'Steam Friends' }]
          : []),
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
    const normalizedView = this.normalizeView(view);
    const limit = Number(options.limit) || LEADERBOARD_DISPLAY_LIMIT;
    try {
      if (normalizedView === LeaderboardView.LOCAL) {
        return this.localProvider.getLocalScores({ ...options, limit });
      }
      if (normalizedView === LeaderboardView.FRIENDS) {
        if (!this.availability.steam) {
          return {
            status: 'unavailable',
            source: 'steam-friends',
            sourceLabel: 'Steam Friends',
            entries: [],
            message: 'Steam unavailable. Friends scores cannot load.'
          };
        }
        return this.steamProvider.getFriendsScores({ ...options, limit });
      }
      if (normalizedView === LeaderboardView.SECTOR) {
        if (!this.availability.steam) {
          return {
            status: 'unavailable',
            source: 'steam',
            sourceLabel: 'Steam Sector',
            entries: [],
            message: 'Steam unavailable. Sector challenge scores cannot load.'
          };
        }
        return this.steamProvider.getTopScores({
          ...options,
          limit,
          leaderboardName: STEAM_SECTOR_LEADERBOARD_NAME,
          leaderboardKind: 'sector_start',
          view: LeaderboardView.SECTOR,
          sourceLabel: 'Steam Sector'
        });
      }
      if (this.availability.steam) {
        return this.steamProvider.getTopScores({ ...options, limit });
      }
      if (this.availability.cloud) {
        return this.cloudProvider.getTopScores({ ...options, limit });
      }
      return this.localProvider.getLocalScores({ ...options, limit });
    } catch (error) {
      console.warn(`[LeaderboardAdapter] ${normalizedView} provider failed:`, error?.message || error);
      return {
        status: 'failed',
        source: normalizedView,
        sourceLabel: this.getSourceLabel(normalizedView),
        entries: [],
        message: normalizedView === LeaderboardView.FRIENDS
          ? 'Could not load Steam friends scores.'
          : normalizedView === LeaderboardView.SECTOR
            ? 'Could not load Steam sector challenge scores.'
          : normalizedView === LeaderboardView.GLOBAL
            ? 'Global board offline. Local scores are safe.'
            : 'Could not load local scores.',
        error: error?.message || 'unknown'
      };
    }
  }

  async submitScore(runResult = {}, options = {}) {
    await this.ensureAvailability();
    const target = options.target || (this.availability.steam ? 'steam' : 'cloud');
    const levelReached = runResult.levelReached ?? runResult.level;
    const result = {
      name: options.name || runResult.playerName || runResult.name || null,
      score: runResult.score,
      level: levelReached,
      levelReached,
      rankIndex: runResult.rankIndex,
      submissionId: runResult.submissionId,
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
      } catch (error) {
        result.globalStatus = 'failed';
        result.globalProvider = 'steam';
        result.steamStatus = 'failed';
        result.steamError = error?.message || 'unknown';
      }
      result.steamPostSubmitDownload = await this.getSteamPostSubmitDownloadSnapshot();
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
    const result = await this.getScores(LeaderboardView.GLOBAL, {
      ...options,
      useCache: options.useCache ?? false
    });
    return normalizeLeaderboardEntries(result.entries || [], { source: result.source || 'global' });
  }

  async getSteamPostSubmitDownloadSnapshot() {
    const [globalResult, friendsResult] = await Promise.allSettled([
      this.steamProvider.getTopScores({ limit: 10, useCache: false }),
      this.steamProvider.getFriendsScores({ limit: 10, useCache: false })
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

  createSectorStartRunResult(game, overrides = {}) {
    return createSectorStartRunResultFromGame(game, overrides);
  }
}

export function createLeaderboardAdapter() {
  return new LeaderboardAdapter();
}
