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
import { getDefaultShipKey, getShipMetadata, incrementShipUsage, isShipUnlocked, isValidShipKey } from '../config/ShipMetadata.js';
import { AudioManager } from '../audio/AudioManager.js';
import { analyzeGlobalLeaderboardScore } from '../shared/GlobalLeaderboardPlacement.js';
import { createLeaderboardAdapter } from '../leaderboard/LeaderboardAdapter.js';
import { normalizeScoreDelta } from '../shared/ScorePolicy.js';
import { AchievementManager } from '../achievements/AchievementManager.js';
import { EARLY_PILOT_ACHIEVEMENT_ID, getAchievementById, getRankAchievementId } from '../achievements/AchievementCatalog.js';
import { getMilestoneAchievementUnlocks } from '../achievements/MilestoneAchievements.js';
import { onLanguageChange, translateText } from '../i18n/index.js';
import { MAX_PLAYER_LIVES } from '../config/BalanceConfig.js';
import { RunPacingConfig, getRunPacingDebugState } from '../config/RunPacingConfig.js';
import { RunPressureDirector } from './RunPressureDirector.js';
import { RunContentDirector } from './RunContentDirector.js';
import { awardRunClearScoreBonuses } from './RunClearScoreBonuses.js';
import {
  RUN_MODES,
  getSectorStartPlaySector,
  getSectorStartState,
  isRankedRunMode,
  normalizeRunMode,
  resolveSectorStartCheckpoint
} from './RunMode.js';
import {
  getCodexCompletionCounts,
  getDiscoveriesThisRun,
  getDiscoveryStats,
  startThreatDiscoveryRun
} from '../progression/ThreatDiscoveryState.js';
import {
  applyRunProgression,
  getHangarProgressSummary,
  previewRunProgression,
  readHangarProgressState,
  updateHangarProgress
} from '../progression/HangarProgressState.js';
import { getSectorStartChallengeRecord, recordSectorStartChallengeRun } from '../progression/SectorStartChallengeRecords.js';
import { syncGameplayCursorVisibility } from '../ui/GameplayCursor.js';

const MENU_EXIT_GUARD_MS = 900;
const SCENE_INPUT_GUARD_MS = 180;

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
    this.runClearScoreBonusAward = null;
    this.runFinalized = false;
    this.runSummary = null;
    this.runProgressionResult = null;
    this.runPressureDirector = null;
    this.contentDirector = null;
    this.scoreBreakdown = this.createEmptyScoreBreakdown();
    this.gameOverTransitionPending = false;

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
    this.shipSelectReturnSpriteKey = null;
    this.isDebugRun = false;
    this.runMode = 'ranked';
    this.runModeReason = null;
    this.sectorStartCheckpoint = null;
    this.sectorStartPlaySector = null;
    this.sectorStartHighestReached = null;
    this.lastSectorStartChallengeRecord = null;
    this.globalLeaderboardTargets = null;
    this.globalLeaderboardTargetPromise = null;
    this.globalLeaderboardCueState = {
      global: false,
      top3: false,
      number1: false
    };
    this.highscoreChase = null;
    this.highscoreChaseTargetPromise = null;
    this.sceneInputGuardUntil = 0;
    this.menuExitGuardUntil = 0;
    this.lastSceneSwitchAt = 0;
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
    this.backfillEarlyPilotAchievement();
  }

  showIntro() {
    this.switchScene('intro');
  }

  showMenu() {
    this.switchScene('menu');
  }

  armSceneInputGuard(durationMs = SCENE_INPUT_GUARD_MS) {
    const duration = Math.max(0, Number(durationMs) || 0);
    this.sceneInputGuardUntil = Math.max(this.sceneInputGuardUntil || 0, Date.now() + duration);
  }

  armMenuExitGuard(durationMs = MENU_EXIT_GUARD_MS) {
    const duration = Math.max(0, Number(durationMs) || 0);
    this.menuExitGuardUntil = Math.max(this.menuExitGuardUntil || 0, Date.now() + duration);
  }

  isMenuExitGuardActive() {
    return Date.now() < (this.menuExitGuardUntil || 0);
  }

  teardownCurrentScene() {
    const scene = this.currentScene;
    if (!scene) return;
    if (scene.container?.parent) {
      scene.container.parent.removeChild(scene.container);
    }
    if (typeof scene.cleanup === 'function') {
      scene.cleanup();
    }
    if (typeof scene.destroy === 'function') {
      scene.destroy();
    }
  }

  prepareGameplayInputFocus() {
    try {
      const active = document?.activeElement || null;
      const tagName = String(active?.tagName || '').toLowerCase();
      if (active && (tagName === 'input' || tagName === 'textarea' || active.isContentEditable)) {
        active.blur();
      }
      const canvas = this.app?.canvas || this.app?.view || null;
      if (canvas && typeof canvas.focus === 'function') {
        if (!canvas.hasAttribute('tabindex')) canvas.setAttribute('tabindex', '-1');
        canvas.focus({ preventScroll: true });
      }
    } catch {
      // Focus can fail in headless/test shells; keyboard listeners still get reset below.
    }
    this.scenes?.play?.inputManager?.resetAllKeys?.();
    this.scenes?.play?.pauseGamepadNavigator?.suppressUntilReleased?.();
  }

  switchScene(sceneName, options = {}) {
    const now = Date.now();
    const inputGuardMs = options.inputGuardMs ?? SCENE_INPUT_GUARD_MS;
    const hadCurrentScene = Boolean(this.currentScene);
    this.lastSceneSwitchAt = now;
    this.sceneInputGuardUntil = Math.max(this.sceneInputGuardUntil || 0, now + Math.max(0, Number(inputGuardMs) || 0));
    if (sceneName === 'menu' && hadCurrentScene) {
      const menuExitGuardMs = options.menuExitGuardMs ?? MENU_EXIT_GUARD_MS;
      this.menuExitGuardUntil = Math.max(this.menuExitGuardUntil || 0, now + Math.max(0, Number(menuExitGuardMs) || 0));
    }
    this.teardownCurrentScene();

    this.currentScene = this.scenes[sceneName];
    this.currentSceneName = sceneName;
    this.app.stage.addChild(this.currentScene.container);
    this.currentScene.init();
    this.syncGameplayCursor();
  }

  async showShipSelect() {
    // Create ship select scene if not exists OR recreate it to ensure fresh input state
    // Fixing bug where returning from Details broke input
    if (this.scenes.shipSelect && this.scenes.shipSelect !== this.currentScene) {
      if (this.scenes.shipSelect.destroy) this.scenes.shipSelect.destroy();
      this.scenes.shipSelect = null;
    }

    const previousScene = this.currentScene;
    const preferredSpriteKey = this.shipSelectReturnSpriteKey;
    this.shipSelectReturnSpriteKey = null;
    this.scenes.shipSelect = new ShipSelectScene(this, { preferredSpriteKey });
    await this.scenes.shipSelect.create();

    this.currentScene = previousScene;
    this.teardownCurrentScene();

    // Show ship select
    this.currentScene = this.scenes.shipSelect;
    this.currentSceneName = 'shipSelect';
    this.app.stage.addChild(this.currentScene.container);
    this.syncGameplayCursor();
  }

  async showShipDetails(spriteKey) {
    this.shipSelectReturnSpriteKey = spriteKey;
    // Create ship details scene
    const detailsScene = new ShipDetailsScene(this, spriteKey);
    await detailsScene.create();

    this.teardownCurrentScene();

    // Show ship details
    this.currentScene = detailsScene;
    this.currentSceneName = 'shipDetails';
    this.app.stage.addChild(this.currentScene.container);
    this.syncGameplayCursor();
  }

  async startGame(spriteKey, options = {}) {
    this.prepareGameplayInputFocus();
    const candidateSpriteKey = isValidShipKey(spriteKey) ? spriteKey : getDefaultShipKey();
    const selectedSpriteKey = isShipUnlocked(candidateSpriteKey) ? candidateSpriteKey : getDefaultShipKey();
    const requestedRunMode = normalizeRunMode(options.runMode);
    const startingProgress = readHangarProgressState();
    const sectorStartCheckpoint = requestedRunMode === RUN_MODES.SECTOR_START
      ? resolveSectorStartCheckpoint(options.startSector, startingProgress)
      : null;
    const sectorStartPlaySector = sectorStartCheckpoint ? getSectorStartPlaySector(sectorStartCheckpoint) : null;
    if (requestedRunMode === RUN_MODES.SECTOR_START && !sectorStartCheckpoint) {
      const state = getSectorStartState(startingProgress, options.startSector);
      console.warn('[Game] sector_start blocked', {
        requested: options.startSector ?? null,
        highestReachedSector: state.highestReachedSector,
        checkpoints: state.checkpoints
      });
      return false;
    }
    console.log(`[Game] starting new game spriteKey=${selectedSpriteKey} runMode=${requestedRunMode} sector=${sectorStartPlaySector || 1}`);
    this.selectedShipSpriteKey = selectedSpriteKey;

    this.score = 0;
    this.level = sectorStartPlaySector || 1;
    this.lives = 3;
    this.isDebugRun = false;
    this.runMode = requestedRunMode;
    this.runModeReason = requestedRunMode === RUN_MODES.SECTOR_START ? 'sector_start_checkpoint' : null;
    this.sectorStartCheckpoint = sectorStartCheckpoint;
    this.sectorStartPlaySector = sectorStartPlaySector;
    this.sectorStartHighestReached = sectorStartCheckpoint ? getSectorStartState(startingProgress).highestReachedSector : null;
    this.lastSectorStartChallengeRecord = null;
    this.highscoreChase = this.createHighscoreChaseState({
      runMode: requestedRunMode,
      progress: startingProgress,
      sectorStartCheckpoint
    });
    this.highscoreChaseTargetPromise = null;
    this.resetGlobalLeaderboardCues();
    this.runStartedAtMs = Date.now();
    this.runElapsedSeconds = 0;
    this.runCleared = false;
    this.runClearReason = null;
    this.runClearLivesRemaining = 0;
    this.runClearScoreBonusAward = null;
    this.runFinalized = false;
    this.runSummary = null;
    this.runProgressionResult = null;
    this.liveRankProgression = null;
    this.liveRankBaseProgress = null;
    this.liveRankNotifiedRanks = new Set();
    this.nextLiveRankCheckAtMs = 0;
    this.scoreBreakdown = this.createEmptyScoreBreakdown();
    this.gameOverTransitionPending = false;
    this.hangarProgressAtRunStart = startingProgress;
    this.liveRankBaseProgress = this.hangarProgressAtRunStart;
    this.runPressureDirector = new RunPressureDirector(this);
    this.contentDirector = new RunContentDirector(this, {
      seed: `${Date.now()}-${selectedSpriteKey}-${Math.random().toString(36).slice(2)}`
    });
    if (this.isRankedRun() && RunPacingConfig.threatCodexEnabled) startThreatDiscoveryRun();
    if (RunPacingConfig.contentDirectorEnabled) this.contentDirector.startRun();

    // Rank System (cross-run pilot career)
    const initialRank = Number(this.hangarProgressAtRunStart?.pilotRank) || 0;
    this.rankIndex = initialRank;
    this.lastRankIndex = this.rankIndex;
    // Pilot XP is saved after the run, but the visible rank previews that same XP live during play.
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
    this.prepareGameplayInputFocus();
    this.primeHighscoreChaseTarget();
    this.primeGlobalLeaderboardTargets();
    if (this.isRankedRun()) incrementShipUsage(selectedSpriteKey);
    return true;
  }

  markUnrankedRun(reason = 'debug_route') {
    this.isDebugRun = true;
    this.runMode = RUN_MODES.UNRANKED;
    this.runModeReason = reason;
    this.pendingHighscore = null;
    console.log(`[Game] run marked unranked reason=${reason}`);
  }

  isScoreSubmissionAllowed() {
    return this.isRankedRun();
  }

  isRankedRun() {
    return isRankedRunMode(this.runMode, { isDebugRun: this.isDebugRun });
  }

  gameOver(options = {}) {
    const fromInterlude = Boolean(options?.fromInterlude);
    const skipInterlude = Boolean(globalThis?.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__);
    const progressionOverrides = {
      runCleared: Boolean(this.runCleared),
      clearReason: this.runClearReason || null,
      clearLivesRemaining: this.runClearLivesRemaining || 0
    };
    if (
      !fromInterlude &&
      !skipInterlude &&
      !this.gameOverTransitionPending &&
      this.currentSceneName === 'play' &&
      typeof this.currentScene?.showGameOverInterlude === 'function'
    ) {
      this.finalizeRunProgression(progressionOverrides);
      this.triggerGameOverInterlude();
      return;
    }
    if (this.state === GameState.GAME_OVER && this.currentScene === this.scenes?.gameOver) return;
    this.gameOverTransitionPending = false;
    this.finalizeRunProgression(progressionOverrides);
    this.state = GameState.GAME_OVER;
    this.switchScene('gameOver');
  }

  triggerGameOverInterlude() {
    if (this.gameOverTransitionPending) return;
    this.gameOverTransitionPending = true;
    const complete = () => {
      if (!this.gameOverTransitionPending) return;
      this.gameOver({ fromInterlude: true });
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

  awardRunClearScoreBonuses({ clearBonus = 0, livesBonus = 0 } = {}) {
    return awardRunClearScoreBonuses(this, { clearBonus, livesBonus });
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

  backfillEarlyPilotAchievement() {
    const progress = readHangarProgressState();
    const playedBefore = (
      (Number(progress.totalRuns) || 0) > 0 ||
      (Number(progress.bestScore) || 0) > 0 ||
      (Number(progress.totalBossesDefeated) || 0) > 0 ||
      (Number(progress.totalWavesCleared) || 0) > 0
    );
    if (!playedBefore) return null;
    return this.achievementManager?.unlock(EARLY_PILOT_ACHIEVEMENT_ID, {
      source: 'early_pilot_backfill',
      ignoreRunGate: true,
      progressValue: Math.max(
        Number(progress.totalRuns) || 0,
        Number(progress.bestScore) || 0,
        Number(progress.totalWavesCleared) || 0
      ),
      target: 1
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

    if (this.isRankedRun()) {
      updateHangarProgress({ bestScore: this.score, bestRank: this.rankIndex, bestLevel: this.level, bestSector: this.level });
    }

    const previousRank = this.rankIndex;
    this.updateLiveRunRank({ force: true });
    const computedRank = this.rankIndex;

    // Diag Update
    this.diag.asEv++;
    this.diag.asPts = Number(points) || 0;
    this.diag.asComp = computedRank;
    this.diag.asBefore = previousRank;
    this.diag.asAfter = computedRank;
    this.updateGlobalLeaderboardVoiceCues();
    this.updateHighscoreChaseCues();
    return applied;
  }

  createHighscoreChaseState({ runMode = this.runMode, progress = null, sectorStartCheckpoint = null } = {}) {
    const isSectorStart = runMode === RUN_MODES.SECTOR_START;
    const sectorRecord = isSectorStart ? getSectorStartChallengeRecord(sectorStartCheckpoint) : null;
    const targetScore = Math.max(0, Math.floor(Number(
      isSectorStart ? sectorRecord?.scoreEarned : progress?.bestScore
    ) || 0));
    return {
      targetScore,
      runMode,
      source: isSectorStart ? 'sector_start_record' : 'ranked_best_score',
      checkpoint: sectorStartCheckpoint || null,
      surpassed: targetScore <= 0,
      milestones: new Set(),
      lastTauntAtMs: 0,
      tauntIndex: Math.floor(Math.random() * 1000)
    };
  }

  raiseHighscoreChaseTarget(targetScore, source = 'known_personal_best') {
    const score = Math.max(0, Math.floor(Number(targetScore) || 0));
    const chase = this.highscoreChase;
    if (!chase || chase.runMode !== RUN_MODES.RANKED || score <= chase.targetScore) return false;
    chase.targetScore = score;
    chase.source = source || chase.source;
    chase.surpassed = score <= 0 || this.score > score;
    return true;
  }

  primeHighscoreChaseTarget() {
    if (!this.isRankedRun() || this.highscoreChaseTargetPromise) return this.highscoreChaseTargetPromise;
    const chase = this.highscoreChase;
    if (!chase || chase.runMode !== RUN_MODES.RANKED) return null;
    this.highscoreChaseTargetPromise = this.getLeaderboardAdapter().getKnownPersonalBest({ useCache: false })
      .then((best) => {
        if (this.highscoreChase !== chase || !this.isRankedRun()) return null;
        this.raiseHighscoreChaseTarget(best?.score, best?.source || 'known_personal_best');
        return this.highscoreChase?.targetScore ?? null;
      })
      .catch((error) => {
        console.warn('[HighscoreChase] Unable to load known personal best', error?.message || error);
        return null;
      });
    return this.highscoreChaseTargetPromise;
  }

  getHighscoreChaseState() {
    return this.highscoreChase || {
      targetScore: 0,
      runMode: this.runMode,
      source: 'none',
      checkpoint: null,
      surpassed: true,
      milestones: new Set()
    };
  }

  updateHighscoreChaseCues() {
    const chase = this.highscoreChase;
    if (!chase || chase.targetScore <= 0 || !this.currentScene?.enqueueToast) return;
    const score = Math.max(0, Number(this.score) || 0);
    const ratio = score / chase.targetScore;
    const cues = [
      { key: '25', at: 0.25, text: 'That high score is pretending not to sweat.', sfx: 'combo_tick', volume: 0.42 },
      { key: '50', at: 0.5, text: 'Halfway there. The scoreboard has begun legal review.', sfx: 'combo_breakout', volume: 0.6 },
      { key: '75', at: 0.75, text: 'Three quarters in. The old score is making excuses.', sfx: 'boss_phase_surge', volume: 0.48 },
      { key: '90', at: 0.9, text: 'Close enough to smell the initials. Do not blink.', sfx: 'nova_highscore_chime', volume: 0.62 },
      { key: '100', at: 1, text: 'HIGH SCORE HUNT COMPLETE. Now embarrass it.', sfx: 'achievement', volume: 0.88 }
    ];
    const nextCue = cues.find((cue) => ratio >= cue.at && !chase.milestones.has(cue.key));
    if (!nextCue) return;
    chase.milestones.add(nextCue.key);
    if (nextCue.key === '100') chase.surpassed = true;
    const now = Date.now();
    chase.lastTauntAtMs = now;
    AudioManager.playSfx(nextCue.sfx, { force: true, volume: nextCue.volume, minIntervalMs: 0 });
    this.currentScene.enqueueToast(translateText(nextCue.text), {
      fontSize: nextCue.key === '100' ? 27 : 22,
      fill: nextCue.key === '100' ? '#fff05c' : '#ff55d9',
      slot: 'top',
      type: 'highscore_chase',
      duration: nextCue.key === '100' ? 2100 : 1600,
      priority: 3
    });
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
    if (!this.isRankedRun() || this.globalLeaderboardTargetPromise) return this.globalLeaderboardTargetPromise;
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
    if (!this.isRankedRun() || !Array.isArray(this.globalLeaderboardTargets)) return;
    const placement = analyzeGlobalLeaderboardScore(this.score, this.globalLeaderboardTargets);
    if ((placement.qualified || placement.nearGlobal) && !this.globalLeaderboardCueState.global) {
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
    if (
      this.currentSceneName === 'play' &&
      !this.runFinalized &&
      this.liveRankProgression?.rankProgress &&
      Number.isFinite(Number(this.liveRankProgression.rankProgress.progress))
    ) {
      return Math.max(0, Math.min(1, Number(this.liveRankProgression.rankProgress.progress)));
    }
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
      if (this.currentScene?.beginGameOverSequence?.()) return;
      this.gameOver();
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
    this.updateLiveRunRank({ force: true });
    if (this.isRankedRun()) {
      updateHangarProgress({ score: this.score, rank: this.rankIndex, bestScore: this.score, bestLevel: this.level, bestSector: this.level });
    }
    if (this.currentScene && this.currentScene.startLevel) {
      this.currentScene.startLevel();
    }
  }

  buildRunSummary(overrides = {}) {
    const play = this.scenes?.play;
    const discoveryStats = getDiscoveryStats();
    const discoveries = getDiscoveriesThisRun();
    const elapsed = Number(play?.gameTime) || (this.runStartedAtMs ? (Date.now() - this.runStartedAtMs) / 1000 : 0);
    const levelReached = Math.max(1, Number(this.level) || 1, (Number(play?.bossKills) || 0) + 1);
    const summary = {
      score: this.score,
      finalScore: this.score,
      levelReached,
      sectorReached: levelReached,
      runElapsedSeconds: Math.max(0, elapsed),
      bossesKilled: Number(play?.bossKills) || 0,
      wavesCleared: Number(play?.wavesCleared) || 0,
      totalKills: Number(play?.totalKills) || 0,
      bestComboCount: Number(play?.bestComboCount) || 0,
      bestDangerDodgeStreak: Number(play?.bestDangerDodgeStreak) || 0,
      grazeBreaks: Number(play?.grazeBreaksThisRun) || 0,
      lifeLosses: Number(play?.lifeLossesThisRun) || 0,
      powerupsCollected: Number(play?.powerupsCollectedThisRun) || 0,
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
      runMode: this.runMode,
      runModeReason: this.runModeReason,
      sectorStartCheckpoint: this.sectorStartCheckpoint || null,
      sectorStartPlaySector: this.sectorStartPlaySector || null,
      discoveriesThisRun: discoveries,
      codexCompletionCounts: getCodexCompletionCounts(),
      scoreBreakdown: { ...this.scoreBreakdown },
      pacing: getRunPacingDebugState(this),
      contentDirectorState: this.contentDirector?.getDebugState?.() || null
    };
    return { ...summary, ...overrides };
  }

  updateLiveRunRank({ force = false } = {}) {
    if (!RunPacingConfig.pilotRankProgressionEnabled) return this.liveRankProgression;
    if (this.runFinalized || !this.isRankedRun() || this.currentSceneName !== 'play') return this.liveRankProgression;
    const now = Date.now();
    if (!force && now < (this.nextLiveRankCheckAtMs || 0)) return this.liveRankProgression;
    this.nextLiveRankCheckAtMs = now + 300;

    const result = previewRunProgression(
      this.buildRunSummary(),
      this.liveRankBaseProgress || this.hangarProgressAtRunStart || readHangarProgressState()
    );
    this.liveRankProgression = result;
    this.scoreBreakdown.pilotXpGained = result.xpGained || 0;
    const targetRank = Math.max(0, Math.floor(Number(result.next?.pilotRank) || 0));
    const currentRank = Math.max(0, Math.floor(Number(this.rankIndex) || 0));
    if (targetRank <= currentRank) return result;

    const ranksToNotify = (result.newRanksThisRun || [])
      .filter((rank) => rank > currentRank && !this.liveRankNotifiedRanks.has(rank));
    if (!ranksToNotify.length) ranksToNotify.push(targetRank);

    for (const rank of ranksToNotify) {
      this.rankIndex = Math.max(this.rankIndex || 0, rank);
      this.lastRankIndex = this.rankIndex;
      this.liveRankNotifiedRanks.add(rank);
      this.currentScene?.onRankUp?.({
        rankIndex: rank,
        previousRank: currentRank,
        pilotXpGained: result.xpGained || 0,
        rankProgress: result.rankProgress || null
      });
    }
    if (this.rankIndex < targetRank) {
      this.rankIndex = targetRank;
      this.lastRankIndex = targetRank;
      this.currentScene?.player?.setRank?.(targetRank, 'live_rank_preview');
    }
    return result;
  }

  finalizeRunProgression(overrides = {}) {
    if (this.runFinalized) return this.runProgressionResult;
    this.runFinalized = true;
    this.runSummary = this.buildRunSummary(overrides);
    const previousProgress = readHangarProgressState();
    const result = this.isRankedRun() && RunPacingConfig.pilotRankProgressionEnabled
      ? applyRunProgression(this.runSummary)
      : { previous: previousProgress, next: previousProgress, xpGained: 0, newRanksThisRun: [], newlyUnlockedShipIds: [], rankProgress: null };
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
    if (this.runMode === RUN_MODES.SECTOR_START && this.sectorStartCheckpoint) {
      const ship = getShipMetadata(this.selectedShipSpriteKey);
      const challengeRecord = recordSectorStartChallengeRun(this.runSummary, {
        selectedShipSpriteKey: this.selectedShipSpriteKey,
        shipId: ship?.id || this.selectedShipSpriteKey || null,
        shipName: ship?.name || null
      });
      this.lastSectorStartChallengeRecord = challengeRecord;
      this.runSummary = {
        ...this.runSummary,
        sectorStartChallengeAttempt: challengeRecord.attemptRecord,
        sectorStartChallengePreviousBest: challengeRecord.previousRecord,
        sectorStartChallengeBest: challengeRecord.bestRecord,
        sectorStartChallengeNewBest: challengeRecord.isNewBest
      };
    }
    if (this.isRankedRun()) {
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
          clearLivesRemaining: this.runSummary.clearLivesRemaining,
          minimumScore: achievement.minimumScore
        });
        if (unlock?.id) this.runSummary.milestoneAchievementsUnlocked.push(unlock.id);
      }
    }
    return result;
  }

  update(delta) {
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(delta);
    }
    this.updateLiveRunRank();
    this.syncGameplayCursor();
  }

  syncGameplayCursor() {
    return syncGameplayCursorVisibility(this);
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
