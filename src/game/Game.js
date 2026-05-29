import * as PIXI from 'pixi.js';
import { GameState } from './GameState.js';
import { MenuScene } from '../scenes/MenuScene.js';
import { IntroScene } from '../scenes/IntroScene.js';
import { PlayScene } from '../scenes/PlayScene.js';
import { GameOverScene } from '../scenes/GameOverScene.js';
import { ShipSelectScene } from '../scenes/ShipSelectScene.js';
import { ShipDetailsScene } from '../scenes/ShipDetailsScene.js';
import { HighscoreScene } from '../scenes/HighscoreScene.js';
import { AchievementsScene } from '../scenes/AchievementsScene.js';
import { ThreatCodexScene } from '../scenes/ThreatCodexScene.js';
import { rankManager } from '../managers/RankManager.js';
import { getDefaultShipKey, incrementShipUsage, isShipUnlocked, isValidShipKey } from '../config/ShipMetadata.js';
import { AudioManager } from '../audio/AudioManager.js';
import { analyzeGlobalLeaderboardScore } from '../shared/GlobalLeaderboardPlacement.js';
import { createLeaderboardAdapter } from '../leaderboard/LeaderboardAdapter.js';
import { normalizeScoreDelta } from '../shared/ScorePolicy.js';
import { AchievementManager } from '../achievements/AchievementManager.js';
import { getAchievementById, getRankAchievementId } from '../achievements/AchievementCatalog.js';
import { getMilestoneAchievementUnlocks } from '../achievements/MilestoneAchievements.js';
import { onLanguageChange } from '../i18n/index.js';
import { MAX_PLAYER_LIVES } from '../config/BalanceConfig.js';
import { RunPacingConfig, getRunPacingDebugState } from '../config/RunPacingConfig.js';
import { RunPressureDirector } from './RunPressureDirector.js';
import { RunContentDirector } from './RunContentDirector.js';
import {
  getCodexCompletionCounts,
  getDiscoveriesThisRun,
  getDiscoveryStats,
  startThreatDiscoveryRun
} from '../progression/ThreatDiscoveryState.js';
import {
  applyRunProgression,
  getHangarProgressSummary,
  readHangarProgressState,
  updateHangarProgress
} from '../progression/HangarProgressState.js';

export class Game {
  constructor(app) {
    this.app = app;
    this.state = GameState.MENU;
    this.currentScene = null;
    this.currentSceneName = 'boot';
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.scoreMultiplier = 1;
    this.runStartedAtMs = 0;
    this.runElapsedSeconds = 0;
    this.runCleared = false;
    this.runClearReason = null;
    this.runClearLivesRemaining = 0;
    this.runFinalized = false;
    this.runSummary = null;
    this.runProgressionResult = null;
    this.runPressureDirector = null;
    this.contentDirector = null;
    this.gameOverTransitionPending = false;
    this.scoreBreakdown = this.createEmptyScoreBreakdown();

    this.scenes = {
      intro: new IntroScene(this),
      menu: new MenuScene(this),
      shipSelect: null, // Created on demand
      play: new PlayScene(this),
      gameOver: new GameOverScene(this),
      highscore: new HighscoreScene(this),
      achievements: new AchievementsScene(this),
      threatCodex: new ThreatCodexScene(this)
    };
    this.selectedShipId = null;
    this.isDebugRun = false;
    this.runMode = 'ranked';
    this.runModeReason = null;
    this.globalLeaderboardTargets = null;
    this.globalLeaderboardTargetPromise = null;
    this.globalLeaderboardCueState = {
      global: false,
      top3: false,
      number1: false
    };
    this.leaderboardAdapter = createLeaderboardAdapter();
    this.pendingAchievementToasts = [];
    this.achievementManager = new AchievementManager({
      getRunState: () => ({
        runMode: this.runMode,
        isDebugRun: this.isDebugRun
      }),
      onUnlock: (unlock) => this.handleAchievementUnlocked(unlock)
    });
    this.languageUnsubscribe = onLanguageChange(() => this.handleLanguageChanged());
  }

  start() {
    this.switchScene('menu');
    this.achievementManager?.syncWithSteam?.().catch?.(() => {});
  }

  showIntro() {
    this.switchScene('intro');
  }

  showMenu() {
    this.switchScene('menu');
  }

  switchScene(sceneName) {
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene.container);
      if (this.currentScene.cleanup) {
        this.currentScene.cleanup();
      }
      if (typeof this.currentScene.destroy === 'function') {
        this.currentScene.destroy();
      }
    }

    this.currentScene = this.scenes[sceneName];
    this.currentSceneName = sceneName;
    this.app.stage.addChild(this.currentScene.container);
    this.currentScene.init();
  }

  async showShipSelect() {
    // Create ship select scene if not exists OR recreate it to ensure fresh input state
    // Fixing bug where returning from Details broke input
    if (this.scenes.shipSelect) {
      if (this.scenes.shipSelect.destroy) this.scenes.shipSelect.destroy();
      this.scenes.shipSelect = null;
    }

    this.scenes.shipSelect = new ShipSelectScene(this);
    await this.scenes.shipSelect.create();

    // Remove current scene
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene.container);
      if (this.currentScene.cleanup) {
        this.currentScene.cleanup();
      }
    }

    // Show ship select
    this.currentScene = this.scenes.shipSelect;
    this.currentSceneName = 'shipSelect';
    this.app.stage.addChild(this.currentScene.container);
  }

  async showShipDetails(spriteKey) {
    // Create ship details scene
    const detailsScene = new ShipDetailsScene(this, spriteKey);
    await detailsScene.create();

    // Remove current scene
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene.container);
      if (this.currentScene.cleanup) {
        this.currentScene.cleanup();
      }
    }

    // Show ship details
    this.currentScene = detailsScene;
    this.currentSceneName = 'shipDetails';
    this.app.stage.addChild(this.currentScene.container);
  }

  async startGame(spriteKey) {
    const candidateSpriteKey = isValidShipKey(spriteKey) ? spriteKey : getDefaultShipKey();
    const selectedSpriteKey = isShipUnlocked(candidateSpriteKey) ? candidateSpriteKey : getDefaultShipKey();
    console.log('[Game] starting new game spriteKey=' + selectedSpriteKey);
    this.selectedShipSpriteKey = selectedSpriteKey;

    // Increment ship usage count
    incrementShipUsage(selectedSpriteKey);

    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.isDebugRun = false;
    this.runMode = 'ranked';
    this.runModeReason = null;
    this.resetGlobalLeaderboardCues();
    this.runStartedAtMs = Date.now();
    this.runElapsedSeconds = 0;
    this.runCleared = false;
    this.runClearReason = null;
    this.runClearLivesRemaining = 0;
    this.runFinalized = false;
    this.runSummary = null;
    this.runProgressionResult = null;
    this.gameOverTransitionPending = false;
    this.scoreBreakdown = this.createEmptyScoreBreakdown();
    this.hangarProgressAtRunStart = readHangarProgressState();
    this.runPressureDirector = new RunPressureDirector(this);
    this.contentDirector = new RunContentDirector(this, {
      seed: `${Date.now()}-${selectedSpriteKey}-${Math.random().toString(36).slice(2)}`
    });
    if (RunPacingConfig.threatCodexEnabled) startThreatDiscoveryRun();
    if (RunPacingConfig.contentDirectorEnabled) this.contentDirector.startRun();

    // Rank System (cross-run pilot career)
    const initialRank = Number(this.hangarProgressAtRunStart?.pilotRank) || 0;
    this.rankIndex = initialRank;
    this.lastRankIndex = this.rankIndex;
    // Rank progression is finalized from pilot XP after the run; score remains the leaderboard value.
    this.pendingHighscore = null;

    // Diagnostics
    this.gameId = Math.random().toString(36).substring(7);
    this.diag = {
      asEv: 0,
      asPts: 0,
      asComp: 0,
      asBefore: 0,
      asAfter: 0,
      rkFromAdd: 0
    };

    this.switchScene('play');
    const playScene = this.scenes?.play;
    const armGameplayInput = () => {
      if (this.currentSceneName !== 'play') return;
      playScene?.inputManager?.armForGameplay?.();
      playScene?.focusGameplayCanvas?.();
    };
    armGameplayInput();
    globalThis.requestAnimationFrame?.(armGameplayInput);
    setTimeout(armGameplayInput, 0);
    setTimeout(armGameplayInput, 160);
    setTimeout(armGameplayInput, 640);
    this.primeGlobalLeaderboardTargets();
  }

  markUnrankedRun(reason = 'debug_route') {
    this.isDebugRun = true;
    this.runMode = 'unranked';
    this.runModeReason = reason;
    this.pendingHighscore = null;
    console.log(`[Game] run marked unranked reason=${reason}`);
  }

  isScoreSubmissionAllowed() {
    return this.runMode !== 'unranked' && !this.isDebugRun;
  }

  gameOver() {
    if (this.state === GameState.GAME_OVER && this.currentScene === this.scenes?.gameOver) return;
    this.gameOverTransitionPending = false;
    this.finalizeRunProgression({
      runCleared: Boolean(this.runCleared),
      clearReason: this.runClearReason || null,
      clearLivesRemaining: this.runClearLivesRemaining || 0
    });
    this.state = GameState.GAME_OVER;
    this.switchScene('gameOver');
  }

  triggerGameOverInterlude() {
    if (this.gameOverTransitionPending) return;
    this.gameOverTransitionPending = true;
    const complete = () => {
      if (!this.gameOverTransitionPending) return;
      this.gameOver();
    };
    const shown = this.currentScene?.showGameOverInterlude?.(complete);
    if (!shown) complete();
  }

  markRunClear(reason = 'target_sector_clear') {
    if (this.runCleared) return false;
    this.runCleared = true;
    this.runClearReason = reason;
    this.runClearLivesRemaining = Math.max(0, Number(this.lives) || 0);
    return true;
  }

  completeRun(reason = 'target_sector_clear') {
    if (this.runFinalized) return;
    this.markRunClear(reason);
    this.finalizeRunProgression({
      runCleared: true,
      clearReason: this.runClearReason || reason,
      clearLivesRemaining: this.runClearLivesRemaining || 0
    });
    this.state = GameState.GAME_OVER;
    this.switchScene('gameOver');
  }

  showHighscores() {
    this.switchScene('highscore');
  }

  showAchievements() {
    this.switchScene('achievements');
  }

  showThreatCodex() {
    this.switchScene('threatCodex');
  }

  unlockAchievement(id, payload = {}) {
    return this.achievementManager?.unlock(id, {
      ...payload,
      runMode: payload.runMode ?? this.runMode,
      isDebugRun: payload.isDebugRun ?? this.isDebugRun
    }) || null;
  }

  unlockRankAchievement(rankIndex, payload = {}) {
    const id = getRankAchievementId(rankIndex);
    if (!id) return null;
    return this.unlockAchievement(id, {
      ...payload,
      source: payload.source || 'rank_up',
      rankIndex,
      rankTitle: this.getRankTitle(rankIndex)
    });
  }

  handleAchievementUnlocked(unlock) {
    const achievement = unlock?.achievement || getAchievementById(unlock?.id);
    if (!achievement) return;
    const toast = {
      id: achievement.id,
      name: achievement.name,
      achievement,
      unlockedAt: unlock.unlockedAt || new Date().toISOString()
    };
    if (this.displayAchievementToast(toast)) return;
    if (!this.pendingAchievementToasts.some((entry) => entry.id === toast.id)) {
      this.pendingAchievementToasts.push(toast);
    }
  }

  handleLanguageChanged() {
    if (this.currentScene && typeof this.currentScene.handleLanguageChanged === 'function') {
      this.currentScene.handleLanguageChanged();
    }
  }

  displayAchievementToast(toast) {
    const scene = this.currentScene;
    if (scene && typeof scene.showAchievementToast === 'function') {
      try {
        scene.showAchievementToast(toast);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  flushAchievementToasts(scene = this.currentScene) {
    if (!scene || typeof scene.showAchievementToast !== 'function') return [];
    const pending = this.pendingAchievementToasts.splice(0);
    pending.forEach((toast) => {
      try {
        scene.showAchievementToast(toast);
      } catch {
        this.pendingAchievementToasts.push(toast);
      }
    });
    return pending;
  }

  getAchievementDebugState() {
    return this.achievementManager?.getDebugState?.() || {
      unlocked: [],
      lastUnlocked: null,
      count: 0,
      total: 0
    };
  }

  getLeaderboardAdapter() {
    if (!this.leaderboardAdapter) {
      this.leaderboardAdapter = createLeaderboardAdapter();
    }
    return this.leaderboardAdapter;
  }

  createEmptyScoreBreakdown() {
    return {
      baseScore: 0,
      enemyScore: 0,
      waveClearBonus: 0,
      sectorClearBonus: 0,
      bossBonus: 0,
      bossSpeedBonus: 0,
      noHitBonus: 0,
      discoveryBonus: 0,
      dangerMultiplierBonus: 0,
      remainingLivesBonus: 0,
      runClearBonus: 0,
      pilotXpGained: 0,
      finalScore: 0
    };
  }

  addScore(points, source = 'baseScore') {
    const base = Number(points) || 0;
    const gameMult = Number(this.scoreMultiplier) || 1;
    const playerMult = this.scenes?.play?.player?.scoreMultiplier || 1;
    const preDangerAward = normalizeScoreDelta(base, gameMult * playerMult);
    const applied = this.getScoreAward(points);
    this.score += applied;
    const breakdownKey = this.scoreBreakdown[source] !== undefined ? source : 'baseScore';
    this.scoreBreakdown[breakdownKey] += applied;
    this.scoreBreakdown.dangerMultiplierBonus += Math.max(0, applied - preDangerAward);
    this.scoreBreakdown.finalScore = this.score;

    updateHangarProgress({ bestScore: this.score, bestRank: this.rankIndex, bestLevel: this.level, bestSector: this.level });

    // Current rank index is cross-run pilot rank; it updates during post-run finalization.
    const computedRank = this.rankIndex;

    // Diag Update
    this.diag.asEv++;
    this.diag.asPts = Number(points) || 0;
    this.diag.asComp = computedRank;
    this.diag.asBefore = this.lastRankIndex;
    this.diag.asAfter = this.lastRankIndex;
    this.updateGlobalLeaderboardVoiceCues();
    return applied;
  }

  getScoreAward(points) {
    const base = Number(points) || 0;
    // Check both Game's scoreMultiplier (bonus core) and Player's scoreMultiplier (score_x2)
    const gameMult = Number(this.scoreMultiplier) || 1;
    const playerMult = this.scenes?.play?.player?.scoreMultiplier || 1;
    const pressureMult = this.runPressureDirector?.getScoreMultiplier?.() || 1;
    const mult = gameMult * playerMult * pressureMult;
    return normalizeScoreDelta(base, mult);
  }

  resetGlobalLeaderboardCues() {
    this.globalLeaderboardTargets = null;
    this.globalLeaderboardTargetPromise = null;
    this.globalLeaderboardCueState = {
      global: false,
      top3: false,
      number1: false
    };
  }

  primeGlobalLeaderboardTargets() {
    if (this.runMode === 'unranked' || this.globalLeaderboardTargetPromise) return this.globalLeaderboardTargetPromise;
    this.globalLeaderboardTargetPromise = this.getLeaderboardAdapter().getGlobalScoresForPlacement({ useCache: true })
      .then((scores) => {
        this.globalLeaderboardTargets = Array.isArray(scores) ? scores : [];
        this.updateGlobalLeaderboardVoiceCues();
        return this.globalLeaderboardTargets;
      })
      .catch((error) => {
        console.warn('[GlobalLeaderboardCue] Unable to load global targets', error);
        this.globalLeaderboardTargets = [];
        return this.globalLeaderboardTargets;
      });
    return this.globalLeaderboardTargetPromise;
  }

  updateGlobalLeaderboardVoiceCues() {
    if (this.runMode === 'unranked' || !Array.isArray(this.globalLeaderboardTargets)) return;
    const placement = analyzeGlobalLeaderboardScore(this.score, this.globalLeaderboardTargets);
    if (!placement.qualified && placement.nearGlobal && !this.globalLeaderboardCueState.global) {
      this.globalLeaderboardCueState.global = true;
      AudioManager.playVoice('mission_control_global_close', {
        cooldownMs: 42000,
        duckMs: 2100,
        duckFactor: 0.42,
        volume: 0.9
      });
    }
    if (!placement.top3 && placement.nearTop3 && !this.globalLeaderboardCueState.top3) {
      this.globalLeaderboardCueState.top3 = true;
      AudioManager.playVoice('mission_control_top3_close', {
        cooldownMs: 42000,
        duckMs: 2300,
        duckFactor: 0.38,
        volume: 0.94
      });
    }
    if (!placement.numberOne && placement.nearNumberOne && !this.globalLeaderboardCueState.number1) {
      this.globalLeaderboardCueState.number1 = true;
      AudioManager.playVoice('mission_control_number_one_close', {
        cooldownMs: 42000,
        duckMs: 2600,
        duckFactor: 0.34,
        volume: 0.98
      });
    }
  }

  activateScoreBoost(multiplier, duration) {
    if (this.currentScene && this.currentScene.scoreMultiplier !== undefined) {
      this.currentScene.scoreMultiplier = multiplier;
      this.currentScene.scoreBoostTimer = duration;
    }
    this.scoreMultiplier = multiplier;
  }

  // --- Rank System ---

  // Legacy addRankXp removed - progression rank is level based now.
  // Compatibility shim if needed by old calls, redirect to addScore if appropriate
  // or just return true/false to prevent crash, but better to update callsites.
  addRankXp(amount) {
    this.addScore(amount); // Convert XP to Score directly
    return false; // Handling rank up in addScore event now
  }

  getRankProgress() {
    const currentPilotXp = this.runProgressionResult?.next?.pilotXp ?? readHangarProgressState().pilotXp;
    return rankManager.getPilotRankProgress(currentPilotXp).progress;
  }

  loseLife() {
    if (this.currentScene?.isDebugInvincibleActive?.()) {
      this.currentScene.onDebugDamageBlocked?.('game_lose_life');
      return;
    }

    this.lives--;
    if (this.currentScene && this.currentScene.onLifeLost) {
      this.currentScene.onLifeLost(this.lives);
    }
    if (this.lives <= 0) {
      this.triggerGameOverInterlude();
    }
  }

  gainLife() {
    const before = this.lives;
    const maxLives = MAX_PLAYER_LIVES;
    this.lives = Math.min(this.lives + 1, maxLives);
    const after = this.lives;
    const applied = after > before;
    console.log(`[Lives] pickup extra_life before=${before} after=${after} max=${maxLives} applied=${applied}`);

    // Notify scene if needed
    if (this.currentScene && this.currentScene.onLifeGained) {
      this.currentScene.onLifeGained(this.lives, {
        before,
        after,
        maxLives,
        source: 'extra_life',
        reachedMax: applied && after >= maxLives
      });
    }
  }

  nextLevel() {
    this.level++;
    updateHangarProgress({ score: this.score, rank: this.rankIndex, bestScore: this.score, bestLevel: this.level, bestSector: this.level });
    if (this.currentScene && this.currentScene.startLevel) {
      this.currentScene.startLevel();
    }
  }

  buildRunSummary(overrides = {}) {
    const play = this.scenes?.play;
    const discoveryStats = getDiscoveryStats();
    const discoveries = getDiscoveriesThisRun();
    const elapsed = Number(play?.gameTime) || (this.runStartedAtMs ? (Date.now() - this.runStartedAtMs) / 1000 : 0);
    const summary = {
      score: this.score,
      finalScore: this.score,
      levelReached: this.level,
      sectorReached: this.level,
      runElapsedSeconds: Math.max(0, elapsed),
      bossesKilled: Number(play?.bossKills) || 0,
      wavesCleared: Number(play?.wavesCleared) || 0,
      totalKills: Number(play?.totalKills) || 0,
      livesRemaining: this.lives,
      runCleared: Boolean(overrides.runCleared ?? this.runCleared),
      clearReason: overrides.clearReason || this.runClearReason || null,
      clearLivesRemaining: Math.max(0, Number(overrides.clearLivesRemaining ?? this.runClearLivesRemaining) || 0),
      codexDiscoveries: discoveries.length,
      totalCodexDiscoveries: discoveryStats.totalDiscovered,
      runThemeDiscoveries: discoveries.filter((entry) => entry.category === 'runThemes').length,
      discoveredThreatIds: discoveries.map((entry) => entry.id),
      defeatedBossIds: Array.isArray(play?.defeatedBossIds) ? play.defeatedBossIds.slice() : [],
      runTheme: this.contentDirector?.runTheme?.id || null,
      noHitWaves: Number(play?.noHitWavesThisRun) || 0,
      noHitSectors: Number(play?.noHitSectorsThisRun) || 0,
      highestScoreMultiplier: Math.max(1, Number(this.runPressureDirector?.getScoreMultiplier?.()) || 1),
      discoveriesThisRun: discoveries,
      codexCompletionCounts: getCodexCompletionCounts(),
      scoreBreakdown: { ...this.scoreBreakdown },
      pacing: getRunPacingDebugState(this),
      contentDirectorState: this.contentDirector?.getDebugState?.() || null
    };
    return { ...summary, ...overrides };
  }

  finalizeRunProgression(overrides = {}) {
    if (this.runFinalized) return this.runProgressionResult;
    this.runFinalized = true;
    this.runSummary = this.buildRunSummary(overrides);
    const result = RunPacingConfig.pilotRankProgressionEnabled
      ? applyRunProgression(this.runSummary)
      : { previous: readHangarProgressState(), next: readHangarProgressState(), xpGained: 0, newRanksThisRun: [], newlyUnlockedShipIds: [] };
    this.runProgressionResult = result;
    this.rankIndex = result.next?.pilotRank ?? this.rankIndex;
    this.lastRankIndex = this.rankIndex;
    this.scoreBreakdown.pilotXpGained = result.xpGained || 0;
    this.scoreBreakdown.finalScore = this.score;
    this.runSummary = {
      ...this.runSummary,
      pilotXpGained: result.xpGained || 0,
      pilotXp: result.next?.pilotXp ?? 0,
      pilotRank: result.next?.pilotRank ?? 0,
      highestPilotRank: result.next?.highestPilotRank ?? 0,
      newRanksThisRun: result.newRanksThisRun || [],
      rankProgress: result.rankProgress || null,
      rankAchievementsUnlocked: [],
      milestoneAchievementsUnlocked: [],
      newlyUnlockedShips: result.newlyUnlockedShipIds || [],
      hangarProgress: getHangarProgressSummary(result.next)
    };
    for (const rankIndex of result.newRanksThisRun || []) {
      const unlock = this.unlockRankAchievement(rankIndex, {
        level: this.level,
        score: this.score,
        source: 'pilot_rank_progression'
      });
      if (unlock?.id) this.runSummary.rankAchievementsUnlocked.push(unlock.id);
    }
    const milestoneUnlocks = getMilestoneAchievementUnlocks({
      summary: this.runSummary,
      progress: result.next
    });
    for (const entry of milestoneUnlocks) {
      const achievement = entry.achievement;
      const unlock = this.unlockAchievement(achievement.id, {
        level: this.level,
        score: this.score,
        source: 'milestone_progression',
        achievementType: achievement.type,
        metric: entry.metric,
        progressValue: entry.value,
        target: entry.target,
        runCleared: this.runSummary.runCleared,
        livesRemaining: this.runSummary.livesRemaining,
        clearLivesRemaining: this.runSummary.clearLivesRemaining
      });
      if (unlock?.id) this.runSummary.milestoneAchievementsUnlocked.push(unlock.id);
    }
    window.__novaSteamCloudDiagnostics?.sync?.().catch?.(() => {});
    return result;
  }

  update(delta) {
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(delta);
    }
  }

  getWidth() {
    return this.app.screen.width;
  }

  getHeight() {
    return this.app.screen.height;
  }

  // TASK 2 & 4: Rank title and texture helpers
  getRankTitle(rankIndex) {
    return rankManager.getRankTitle(rankIndex);
  }

  getRankTexture(rankIndex) {
    return rankManager.getRankTexture(rankIndex);
  }
}
