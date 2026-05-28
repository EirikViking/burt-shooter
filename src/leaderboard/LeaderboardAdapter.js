import { CloudLeaderboardProvider } from './CloudLeaderboardProvider.js';
import { LocalLeaderboardProvider } from './LocalLeaderboardProvider.js';
import { SteamLeaderboardProvider } from './SteamLeaderboardProvider.js';
import {
  LEADERBOARD_DISPLAY_LIMIT,
  LeaderboardView,
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
    this.availability = { steam, cloud, local };
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
    const win = safeWindow();
    let desktop = false;
    let steamBridgePresent = false;
    try {
      const params = new URLSearchParams(win?.location?.search || '');
      desktop = params.get('desktop') === '1' || win?.__NOVA_SWARM_DESKTOP__ === true;
      steamBridgePresent = Boolean(
        win?.__novaSteamLeaderboard ||
        win?.novaSteamLeaderboard ||
        win?.__novaSteam?.leaderboards ||
        win?.novaSteam?.leaderboards ||
        win?.__novaSteamBridge?.leaderboards
      );
    } catch {
      desktop = false;
      steamBridgePresent = false;
    }
    return {
      steam: Boolean(this.availability.steam),
      cloud: Boolean(this.availability.cloud),
      local: Boolean(this.availability.local),
      desktop,
      steamBridgePresent,
      globalProvider: this.availability.steam ? 'steam' : (this.availability.cloud ? 'cloud' : 'local')
    };
  }

  getTabs() {
    if (this.availability.steam) {
      return [
        { id: LeaderboardView.GLOBAL, label: 'GLOBAL', title: 'GLOBAL SCORE DECK', sourceLabel: 'Steam Global' },
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
    const result = {
      name: options.name || runResult.playerName || runResult.name || null,
      score: runResult.score,
      level: runResult.level,
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
        result.steamResponse = steam.response || null;
        if (!Number.isFinite(Number(result.steamRank))) {
          const playerBest = await this.steamProvider.getPlayerBest().catch(() => null);
          const playerBestRank = Number(playerBest?.rank ?? playerBest?.globalRank);
          if (Number.isFinite(playerBestRank) && playerBestRank > 0) {
            result.steamRank = Math.floor(playerBestRank);
            result.steamPlayerBest = playerBest;
          }
        }
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

  async getGlobalScoresForPlacement(options = {}) {
    await this.ensureAvailability();
    if (!this.availability.steam && !this.availability.cloud) {
      return [];
    }
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

  async getBestEffortSteamPlayerName() {
    return this.steamProvider.getPlayerName();
  }

  createRunResult(game, overrides = {}) {
    return createRunResultFromGame(game, overrides);
  }
}

export function createLeaderboardAdapter() {
  return new LeaderboardAdapter();
}
