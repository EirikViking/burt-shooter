import {
  ACHIEVEMENTS,
  getAchievementById,
  getAchievementIds,
  isValidAchievementId
} from './AchievementCatalog.js';
import { createSteamAchievementSync } from './SteamAchievementSync.js';
import { isRankedRunMode } from '../game/RunMode.js';
import { evidenceFromOnslaughtRun, getOnslaughtAchievementProgress, mergeOnslaughtEvidence, normalizeOnslaughtEvidence } from './OnslaughtAchievementProgress.js';

export const ACHIEVEMENT_STORAGE_KEY = 'nova_swarm_achievements_v1';

function getDefaultStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readStoredIds(storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(ACHIEVEMENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const ids = Array.isArray(parsed) ? parsed : parsed?.unlocked;
    return Array.isArray(ids) ? ids.filter(isValidAchievementId) : [];
  } catch {
    return [];
  }
}

function readStoredEvidence(storage) {
  try {
    return normalizeOnslaughtEvidence(JSON.parse(storage?.getItem(ACHIEVEMENT_STORAGE_KEY) || 'null')?.onslaughtRuns);
  } catch {
    return [];
  }
}

function compactPayload(payload = {}) {
  const allowed = [
    'source',
    'rankIndex',
    'rankTitle',
    'level',
    'score',
    'acceptedScore',
    'runMode',
    'globalProvider',
    'leaderboardName',
    'leaderboardKind',
    'submissionStatus',
    'validationSource',
    'historicalBackfill',
    'placement',
    'numberOne',
    'achievementType',
    'metric',
    'progressValue',
    'target',
    'runCleared',
    'livesRemaining',
    'clearLivesRemaining',
    'clearLifeLosses',
    'noRepairReceiptsLifeLosses',
    'minimumScore'
  ];
  return Object.fromEntries(
    allowed
      .filter((key) => payload[key] !== undefined)
      .map((key) => [key, payload[key]])
  );
}

export class AchievementManager {
  constructor(options = {}) {
    this.storage = options.storage ?? getDefaultStorage();
    this.getRunState = typeof options.getRunState === 'function' ? options.getRunState : null;
    this.onUnlock = typeof options.onUnlock === 'function' ? options.onUnlock : null;
    this.steamSync = options.steamSync === false
      ? null
      : options.steamSync || createSteamAchievementSync({ storage: this.storage });
    this.unlockedIds = new Set(readStoredIds(this.storage));
    this.onslaughtRuns = readStoredEvidence(this.storage);
    this.lastUnlocked = null;
    this.lastSteamSync = null;
  }

  configure(options = {}) {
    if (typeof options.getRunState === 'function') this.getRunState = options.getRunState;
    if (typeof options.onUnlock === 'function') this.onUnlock = options.onUnlock;
  }

  canUnlockFromCurrentRun(id, payload = {}) {
    const definition = getAchievementById(id);
    if (!definition) return false;
    if (payload.runMode && !definition.completeModes.includes(payload.runMode)) return false;
    if (payload.ignoreRunGate === true) return true;
    const explicitOnslaughtGrant = payload.onslaughtTacticalEligible === true
      && payload.runMode === 'overrun_tactical'
      && payload.isDebugRun !== true;
    if (payload.allowAchievements === false && !explicitOnslaughtGrant) return false;

    if (!explicitOnslaughtGrant && !isRankedRunMode(payload.runMode, { isDebugRun: payload.isDebugRun })) {
      return false;
    }

    let runState = null;
    try {
      runState = this.getRunState?.() || null;
    } catch {
      runState = null;
    }

    const matchingOnslaughtRun = explicitOnslaughtGrant
      && runState?.runMode === 'overrun_tactical'
      && runState?.isDebugRun !== true;
    if (!matchingOnslaughtRun && !isRankedRunMode(runState?.runMode, { isDebugRun: runState?.isDebugRun })) {
      return false;
    }
    if (runState?.runMode !== payload.runMode) return false;

    return true;
  }

  persist() {
    if (!this.storage) return;
    try {
      this.onslaughtRuns = mergeOnslaughtEvidence(this.onslaughtRuns, readStoredEvidence(this.storage));
      this.storage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify({
        version: 2,
        unlocked: this.getUnlocked(),
        onslaughtRuns: this.onslaughtRuns,
        updatedAt: new Date().toISOString()
      }));
      if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.()?.catch?.(() => {});
    } catch {
      // Achievement persistence is best effort and must never affect gameplay.
    }
  }

  unlock(id, payload = {}) {
    try {
      if (!isValidAchievementId(id)) return null;
      if (!this.canUnlockFromCurrentRun(id, payload)) return null;
      if (this.unlockedIds.has(id)) return null;

      this.unlockedIds.add(id);
      this.persist();

      const achievement = getAchievementById(id);
      this.lastUnlocked = {
        id,
        achievement,
        unlockedAt: new Date().toISOString(),
        payload: compactPayload(payload)
      };

      try {
        this.onUnlock?.(this.lastUnlocked);
      } catch {
        // UI notification hooks are optional; never let them break gameplay.
      }

      this.steamSync?.unlock?.(id)?.catch?.(() => {});

      return this.lastUnlocked;
    } catch {
      return null;
    }
  }

  isUnlocked(id) {
    return isValidAchievementId(id) && this.unlockedIds.has(id);
  }

  getUnlocked() {
    return getAchievementIds().filter((id) => this.unlockedIds.has(id));
  }

  recordOnslaughtSnakeDefeat(summary = {}) {
    const evidence = evidenceFromOnslaughtRun(summary);
    if (!evidence || !evidence.snakeDefeats?.length) return null;
    const id = 'ACH_OS_SNAKE_DUEL';
    const progress = getOnslaughtAchievementProgress(getAchievementById(id), [evidence]);
    if (!progress.complete) return null;
    // This event has full run provenance. Persist the earned unlock now, but
    // leave the run open for its later, complete collection evidence.
    const award = this.unlock(id, {
      source: 'onslaught_snake_defeat', runMode: evidence.mode, runId: evidence.runId,
      ignoreRunGate: true, progressValue: progress.value, target: progress.target
    });
    const collection = getAchievementById('ACH_OS_COMPLETE_SET');
    const collectionProgress = getOnslaughtAchievementProgress(collection, this.onslaughtRuns, this.getUnlocked());
    if (collectionProgress.complete) this.unlock(collection.id, {
      source: 'onslaught_collection', runMode: evidence.mode, runId: evidence.runId,
      ignoreRunGate: true, progressValue: collectionProgress.value, target: collectionProgress.target
    });
    return award;
  }

  recordOnslaughtRun(summary = {}) {
    const evidence = evidenceFromOnslaughtRun(summary);
    if (!evidence) return { recorded: false, reason: 'ineligible_run', unlocked: [] };
    this.onslaughtRuns = mergeOnslaughtEvidence(this.onslaughtRuns, readStoredEvidence(this.storage));
    if (this.onslaughtRuns.some(run => run.runId === evidence.runId)) {
      return { recorded: false, reason: 'duplicate_run', unlocked: [] };
    }
    this.onslaughtRuns = mergeOnslaughtEvidence(this.onslaughtRuns, [evidence]);
    this.persist();
    const unlocked = [];
    for (const achievement of ACHIEVEMENTS.filter(entry => entry.type === 'onslaught')) {
      if (!achievement.allowedModes.includes(evidence.mode)) continue;
      const progress = getOnslaughtAchievementProgress(achievement, this.onslaughtRuns, this.getUnlocked());
      if (!progress.complete || this.isUnlocked(achievement.id)) continue;
      const award = this.unlock(achievement.id, {
        source: 'onslaught_run_evidence', runMode: evidence.mode, runId: evidence.runId,
        ignoreRunGate: true, progressValue: progress.value, target: progress.target
      });
      if (award) unlocked.push(award.id);
    }
    return { recorded: true, unlocked, evidence };
  }

  getOnslaughtProgress(id) {
    this.onslaughtRuns = mergeOnslaughtEvidence(this.onslaughtRuns, readStoredEvidence(this.storage));
    return getOnslaughtAchievementProgress(getAchievementById(id), this.onslaughtRuns, this.getUnlocked());
  }

  getDebugState() {
    const unlocked = this.getUnlocked();
    return {
      unlocked,
      lastUnlocked: this.lastUnlocked,
      steam: this.steamSync?.getDebugState?.() || null,
      lastSteamSync: this.lastSteamSync,
      count: unlocked.length,
      total: ACHIEVEMENTS.length
    };
  }

  importUnlocked(ids = [], options = {}) {
    const added = [];
    for (const id of ids) {
      if (!isValidAchievementId(id) || this.unlockedIds.has(id)) continue;
      this.unlockedIds.add(id);
      added.push(id);
    }
    if (!added.length) return [];
    this.persist();
    this.lastSteamSync = {
      direction: 'steam_to_local',
      added,
      source: options.source || 'steam',
      suppressToast: options.suppressToast !== false,
      syncedAt: new Date().toISOString()
    };
    return added;
  }

  async syncWithSteam() {
    if (!this.steamSync?.syncWithLocal) return null;
    try {
      const result = await this.steamSync.syncWithLocal(this);
      this.lastSteamSync = {
        direction: 'bidirectional',
        result,
        syncedAt: new Date().toISOString()
      };
      return result;
    } catch (error) {
      this.lastSteamSync = {
        direction: 'bidirectional',
        ok: false,
        error: error?.message || String(error),
        syncedAt: new Date().toISOString()
      };
      return null;
    }
  }

  resetForDebugOnly() {
    try {
      this.unlockedIds.clear();
      this.lastUnlocked = null;
      this.persist();
      return true;
    } catch {
      return false;
    }
  }
}
