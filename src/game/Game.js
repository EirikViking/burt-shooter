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
import {
  analyzeGlobalLeaderboardScore,
  analyzeGlobalRivalProjection
} from '../shared/GlobalLeaderboardPlacement.js';
import { createLeaderboardAdapter } from '../leaderboard/LeaderboardAdapter.js';
import { getLeaderboardDescriptorForRunMode } from '../leaderboard/LeaderboardTypes.js';
import { normalizeScoreDelta } from '../shared/ScorePolicy.js';
import { AchievementManager } from '../achievements/AchievementManager.js';
import {
  EARLY_PILOT_ACHIEVEMENT_ID,
  SWARM_ELITE_ACHIEVEMENT_ID,
  getAchievementById,
  getRankAchievementId
} from '../achievements/AchievementCatalog.js';
import { evaluateSwarmEliteEligibility } from '../achievements/SwarmEliteAchievement.js';
import {
  captureNoRepairReceiptsLifeLosses,
  getMilestoneAchievementUnlocks
} from '../achievements/MilestoneAchievements.js';
import { onLanguageChange, translateText } from '../i18n/index.js';
import { MAX_PLAYER_LIVES } from '../config/BalanceConfig.js';
import { RunPacingConfig, getRunPacingDebugState } from '../config/RunPacingConfig.js';
import { RunPressureDirector } from './RunPressureDirector.js';
import { RunContentDirector } from './RunContentDirector.js';
import { GLOBAL_SCORE_TUNING_MULTIPLIER } from '../config/ScoreTuning.js';
import { awardRunClearScoreBonuses } from './RunClearScoreBonuses.js';
import { createRunReport } from './RunReport.js';
import { RunSessionClock } from './RunSessionClock.js';
import { createLateGameExperimentReport } from './LateGameExperimentReport.js';
import { analyzeTacticalDoctrine } from '../config/TacticalDoctrine.js';
import {
  LOGICAL_PLAYFIELD_HEIGHT,
  LOGICAL_PLAYFIELD_WIDTH,
  clampToLogicalPlayfield,
  computeActivePlayfieldRect,
  getLogicalPlayfieldBounds,
  screenToWorld,
  worldToScreen
} from './Playfield.js';
import {
  RUN_MODES,
  OVERRUN_START_SECTOR,
  canRunModeUpdateCareerProgress,
  canRunModeUpdateCompetitiveCareerBests,
  canRunModeSubmitGlobalLeaderboard,
  canRunModeUnlockAchievements,
  getOverrunStartState,
  getSectorStartPlaySector,
  getSectorStartState,
  isOverrunRunMode,
  isRankedRunMode,
  getRunModeProfile,
  normalizeRunMode,
  resolveSectorStartCheckpoint
} from './RunMode.js';
import {
  getCodexCompletionCounts,
  getDiscoveriesThisRun,
  getDiscoveryStats,
  finishThreatDiscoveryRun,
  startThreatDiscoveryRun
} from '../progression/ThreatDiscoveryState.js';
import {
  applyRunProgression,
  getHangarProgressSummary,
  previewRunProgression,
  readHangarProgressState,
  writeHangarProgressState
} from '../progression/HangarProgressState.js';
import { recordScoutRun } from '../progression/ScoutRunRecords.js';
import { getOverrunRunBest, recordOverrunRun } from '../progression/OverrunRunRecords.js';
import { getMayhemModeBestScore, recordMayhemModeScore } from '../progression/MayhemModeRecords.js';
import { getSectorStartChallengeRecord, recordSectorStartChallengeRun } from '../progression/SectorStartChallengeRecords.js';
import {
  getDailySignalBestAttempt,
  getDailySignalBestClear,
  getDailySignalFlightLog,
  recordDailySignalRun
} from '../progression/DailySignalRecords.js';
import { deriveDailySignalContract, validateDailySignalContract } from '../config/DailyCabinetSignal.js';
import { syncGameplayCursorVisibility } from '../ui/GameplayCursor.js';
import { isMayhemPerformanceOptionEnabled } from '../debug/MayhemPerformanceDiagnostics.js';
import { buildShipThreatResponse } from '../config/ShipThreatResponse.js';
import { generateUUID } from '../utils/uuid.js';
import {
  HIGH_SECTOR_PROTOTYPE_AWARD_SUPPRESSION_REASON,
  HIGH_SECTOR_PROTOTYPE_SUPPRESSED_AWARDS,
  migrateLegacyHighSectorPrototypeSettings
} from '../config/HighSectorPrototypeSettings.js';
import {
  applyScoutAnomalyToProfile,
  getScoutAnomaly,
  readScoutAnomalySelection
} from './ScoutAnomalies.js';
import { createRunPolicy } from './RunPolicy.js';
import { flushPersistence, markPersistenceDirty } from '../persistence/PersistenceScheduler.js';
import { warmAccessibilitySettingsRuntimeCache } from '../config/AccessibilitySettings.js';
import { warmRuntimeFeatureSwitchCache } from '../config/isExtrasEnabled.js';
import { warmNovaPerformanceFlagsRuntimeCache } from '../config/PerformanceFlags.js';
import {
  createLateGamePressureExperimentRun,
  isLateGamePressureExperimentActive
} from './LateGamePressureExperiment.js';

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
    this.runTotalElapsedSeconds = 0;
    this.runSessionClock = new RunSessionClock();
    this.runCleared = false;
    this.runClearReason = null;
    this.overrunCompletionEarned = false;
    this.runClearLivesRemaining = 0;
    this.runClearLifeLosses = 0;
    this.noRepairReceiptsLifeLosses = null;
    this.runClearScoreBonusAward = null;
    this.runClearScoreBonusAwards = {};
    this.runFinalized = false;
    this.finalScoreLocked = false;
    this.finalScoreSnapshot = null;
    this.finalScoreLockReason = null;
    this.runSummary = null;
    this.lastRunReport = null;
    this.runProgressionResult = null;
    this.careerRankMetadataRefreshPromise = null;
    this.runPressureDirector = null;
    this.contentDirector = null;
    this.threatResponse = buildShipThreatResponse(getShipMetadata(getDefaultShipKey()), 0);
    this.threatResponseHealthAccumulator = 0;
    this.scoreBreakdown = this.createEmptyScoreBreakdown();
    this.gameOverTransitionPending = false;
    this.gameplayFacade = null;

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
    this.lateGameExperiment = null;
    this.highSectorPrototypeRun = null;
    this.scoutAnomalyId = null;
    this.scoutAnomaly = null;
    this.runStartInputDevice = 'keyboard';
    this.sectorStartCheckpoint = null;
    this.sectorStartPlaySector = null;
    this.sectorStartHighestReached = null;
    this.lastSectorStartChallengeRecord = null;
    this.lastScoutRunRecord = null;
    this.lastOverrunRunRecord = null;
    this.dailySignalContract = null;
    this.dailySignalContractValidation = null;
    this.dailySignalInvalidReason = null;
    this.dailySignalAttemptId = null;
    this.lastDailySignalRecord = null;
    this.globalLeaderboardTargets = null;
    this.globalLeaderboardTargetPromise = null;
    this.globalRivalProjectionCache = null;
    this.globalLeaderboardCueState = {
      global: false,
      top3: false,
      number1: false,
      rivalKey: null,
      rivalTarget: null
    };
    this.highscoreChase = null;
    this.highscoreChaseTargetPromise = null;
    this.personalBestLiveCelebrated = false;
    this.personalBestCelebrationCarry = null;
    this.sceneInputGuardUntil = 0;
    this.menuExitGuardUntil = 0;
    this.lastSceneSwitchAt = 0;
    this.swarmEliteBackfillPromise = null;
    this.leaderboardAdapter = createLeaderboardAdapter({
      onAcceptedPendingSteamSubmission: (submission) => this.handleAcceptedPendingSteamSubmission(submission)
    });
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
    this.backfillSwarmEliteAchievement().catch?.(() => {});
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
    scene.resetTransientGameplayInput?.('scene_teardown', { preserveFire: false });
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
    this.scenes?.play?.inputManager?.resetTransientState?.({
      preserveFire: false,
      suppressUntilReleased: true
    });
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
    if (sceneName === 'gameOver') {
      this.currentScene?.preparePersonalBestCelebrationCarry?.('game_over_transition');
    }
    if (sceneName === 'menu') {
      this.clearLateGameExperimentState('return_to_menu');
    }
    this.teardownCurrentScene();

    this.currentScene = this.scenes[sceneName];
    this.currentSceneName = sceneName;
    this.app.stage.addChild(this.currentScene.container);
    this.currentScene.init();
    this.flushAchievementToasts(this.currentScene);
    if (sceneName === 'menu') {
      this.scenes?.menu?.menuGamepadNavigator?.suppressUntilReleased?.();
    }
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
    warmAccessibilitySettingsRuntimeCache();
    warmRuntimeFeatureSwitchCache();
    warmNovaPerformanceFlagsRuntimeCache();
    migrateLegacyHighSectorPrototypeSettings();
    const lateGameExperiment = createLateGamePressureExperimentRun(options.lateGameExperiment);
    const requestedRunMode = normalizeRunMode(lateGameExperiment?.underlyingRunMode || options.runMode);
    const prototypeEnabled = Boolean(lateGameExperiment);
    const scoutAnomaly = requestedRunMode === RUN_MODES.SCOUT
      ? getScoutAnomaly(options.scoutAnomalyId || readScoutAnomalySelection().id)
      : null;
    let dailySignalContract = null;
    let dailySignalContractValidation = null;
    if (requestedRunMode === RUN_MODES.DAILY_SIGNAL) {
      const suppliedContract = options.dailySignalContract || null;
      const requestedContract = suppliedContract || deriveDailySignalContract();
      dailySignalContractValidation = validateDailySignalContract(requestedContract);
      if (!dailySignalContractValidation.valid) {
        console.warn('[DailySignal] Rejected invalid or expired contract', {
          errors: dailySignalContractValidation.errors,
          requestedDay: requestedContract?.dailyKey || null,
          currentDay: deriveDailySignalContract().dailyKey,
          supplied: Boolean(suppliedContract)
        });
        return false;
      }
      dailySignalContract = requestedContract;
    }
    const candidateSpriteKey = requestedRunMode === RUN_MODES.DAILY_SIGNAL
      ? dailySignalContract.loanerShipKey
      : (isValidShipKey(spriteKey) ? spriteKey : getDefaultShipKey());
    const selectedSpriteKey = requestedRunMode === RUN_MODES.DAILY_SIGNAL
      ? candidateSpriteKey
      : (isShipUnlocked(candidateSpriteKey) ? candidateSpriteKey : getDefaultShipKey());
    const controllerUiActive = typeof document !== 'undefined'
      && document.documentElement?.classList?.contains('controller-input-active');
    const requestedInputDevice = options.inputDevice === 'controller'
      || (options.inputDevice == null && controllerUiActive)
      ? 'controller'
      : 'keyboard';
    const startingProgress = readHangarProgressState();
    const overrunStartState = isOverrunRunMode(requestedRunMode)
      ? getOverrunStartState(startingProgress)
      : null;
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
    if (overrunStartState && !overrunStartState.available) {
      console.warn('[Game] overrun_start blocked', overrunStartState);
      return false;
    }
    const normalRunStartSector = overrunStartState?.available
      ? OVERRUN_START_SECTOR
      : (sectorStartPlaySector || 1);
    const runStartSector = lateGameExperiment
      ? lateGameExperiment.startSector
      : normalRunStartSector;
    console.log(`[Game] starting new game spriteKey=${selectedSpriteKey} runMode=${requestedRunMode} sector=${runStartSector} experiment=${prototypeEnabled}`);
    this.selectedShipSpriteKey = selectedSpriteKey;
    this.refreshThreatResponse(0);

    this.score = 0;
    this.level = runStartSector;
    this.lives = lateGameExperiment?.lives || 3;
    this.isDebugRun = prototypeEnabled;
    this.runMode = requestedRunMode;
    this.runModeReason = prototypeEnabled
      ? 'late_game_pressure_experiment'
      : isOverrunRunMode(requestedRunMode)
        ? 'overrun_sector_51_career'
        : requestedRunMode === RUN_MODES.SECTOR_START
          ? 'sector_start_checkpoint'
          : requestedRunMode === RUN_MODES.DAILY_SIGNAL
            ? 'daily_signal_local_challenge'
            : scoutAnomaly
              ? `scout_anomaly:${scoutAnomaly.id}`
              : null;
    this.lateGameExperiment = lateGameExperiment;
    // Compatibility alias for the already-shipped high-sector safety gates.
    // Gameplay configuration now comes exclusively from the acknowledged,
    // one-run LateGamePressureExperiment state above.
    this.highSectorPrototypeRun = lateGameExperiment
      ? {
          enabled: true,
          quickStart: true,
          eligible: true,
          requestedRunMode,
          startSector: runStartSector,
          baselineAugmentIds: [...lateGameExperiment.baselineAugmentIds],
          experimentVersion: lateGameExperiment.version
        }
      : null;
    this.runPolicy = createRunPolicy({
      runMode: requestedRunMode,
      isDebugRun: this.isDebugRun,
      prototype: prototypeEnabled
    });
    this.scoutAnomalyId = scoutAnomaly?.id || null;
    this.scoutAnomaly = scoutAnomaly;
    this.runStartInputDevice = requestedInputDevice;
    this.sectorStartCheckpoint = sectorStartCheckpoint;
    this.sectorStartPlaySector = sectorStartPlaySector;
    this.sectorStartHighestReached = sectorStartCheckpoint ? getSectorStartState(startingProgress).highestReachedSector : null;
    this.runStartSector = runStartSector;
    this.runStartSource = options.runStartSource === 'game_over_runback'
      ? 'game_over_runback'
      : null;
    this.overrunSeenBossMaxSector = overrunStartState?.available
      ? Math.min(50, overrunStartState.highestReachedSector)
      : null;
    this.lastSectorStartChallengeRecord = null;
    this.lastScoutRunRecord = null;
    this.lastOverrunRunRecord = null;
    this.dailySignalContract = dailySignalContract;
    this.dailySignalContractValidation = dailySignalContractValidation;
    this.dailySignalInvalidReason = null;
    this.dailySignalAttemptId = requestedRunMode === RUN_MODES.DAILY_SIGNAL ? generateUUID() : null;
    this.lastDailySignalRecord = null;
    this.highscoreChase = this.createHighscoreChaseState({
      runMode: prototypeEnabled ? RUN_MODES.UNRANKED : requestedRunMode,
      progress: startingProgress,
      sectorStartCheckpoint,
      dailySignalContract
    });
    this.highscoreChaseTargetPromise = null;
    this.personalBestLiveCelebrated = false;
    this.personalBestCelebrationCarry = null;
    this.resetGlobalLeaderboardCues();
    this.runStartedAtMs = Date.now();
    this.runElapsedSeconds = 0;
    this.runTotalElapsedSeconds = 0;
    this.runSessionClock.start();
    this.runCleared = false;
    this.runClearReason = null;
    this.overrunCompletionEarned = false;
    this.runClearLivesRemaining = 0;
    this.runClearLifeLosses = 0;
    this.noRepairReceiptsLifeLosses = null;
    this.runClearScoreBonusAward = null;
    this.runClearScoreBonusAwards = {};
    this.runFinalized = false;
    this.finalScoreLocked = false;
    this.finalScoreSnapshot = null;
    this.finalScoreLockReason = null;
    this.runSummary = null;
    this.lastRunReport = null;
    this.runProgressionResult = null;
    this.careerRankMetadataRefreshPromise = null;
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
      seed: lateGameExperiment?.seed
        || dailySignalContract?.seed
        || `${Date.now()}-${selectedSpriteKey}-${Math.random().toString(36).slice(2)}`
    });
    if (RunPacingConfig.threatCodexEnabled && (this.runPolicy.allowCodexProgress || this.runPolicy.prototype)) {
      startThreatDiscoveryRun({ allowPersistentProgress: this.runPolicy.allowCodexProgress });
    }
    if (RunPacingConfig.contentDirectorEnabled) {
      this.contentDirector.startRun({ runThemeId: dailySignalContract?.runThemeId || null });
    }

    // Rank System (cross-run pilot career)
    const initialRank = requestedRunMode === RUN_MODES.DAILY_SIGNAL
      ? 0
      : (Number(this.hangarProgressAtRunStart?.pilotRank) || 0);
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

    // A menu bark may still be playing when a successful launch hands audio
    // ownership to gameplay. Clear active and delayed menu voices at the last
    // safe point before PlayScene can start its own pilot/combat callouts.
    AudioManager.silenceVoicePlayback?.('gameplay_start_handoff');
    this.switchScene('play');
    this.prepareGameplayInputFocus();
    if (!isMayhemPerformanceOptionEnabled('noLeaderboardTargets')) {
      this.primeHighscoreChaseTarget();
      this.primeGlobalLeaderboardTargets();
    }
    if (options.countShipUsage !== false && !this.areRunRewardsSuppressed()) incrementShipUsage(selectedSpriteKey);
    return true;
  }

  refreshThreatResponse(tacticalPickCount = 0) {
    const ship = getShipMetadata(this.selectedShipSpriteKey || getDefaultShipKey())
      || getShipMetadata(getDefaultShipKey());
    this.threatResponse = buildShipThreatResponse(ship, tacticalPickCount);
    if ((Number(tacticalPickCount) || 0) <= 0) this.threatResponseHealthAccumulator = 0;
    console.log(
      `[ThreatResponse] ship=${this.threatResponse.shipName}` +
      ` level=${this.threatResponse.responseLevel}` +
      ` dpsRatio=${this.threatResponse.dpsRatio}` +
      ` picks=${this.threatResponse.tacticalPickCount}` +
      ` count=${this.threatResponse.enemyCountMult}` +
      ` bossHp=${this.threatResponse.bossHealthMult}`
    );
    return this.threatResponse;
  }

  markUnrankedRun(reason = 'debug_route') {
    this.isDebugRun = true;
    if (this.runMode === RUN_MODES.DAILY_SIGNAL) {
      this.dailySignalInvalidReason = reason;
      this.runModeReason = reason;
      this.pendingHighscore = null;
      console.log(`[Game] daily signal marked local-invalid reason=${reason}`);
      return;
    }
    this.runMode = RUN_MODES.UNRANKED;
    this.runModeReason = reason;
    this.pendingHighscore = null;
    console.log(`[Game] run marked unranked reason=${reason}`);
  }

  isScoreSubmissionAllowed() {
    return this.runPolicy?.allowGlobalLeaderboardSubmission
      ?? canRunModeSubmitGlobalLeaderboard(this.runMode, { isDebugRun: this.isDebugRun });
  }

  isRankedRun() {
    return this.runPolicy?.ranked
      ?? isRankedRunMode(this.runMode, { isDebugRun: this.isDebugRun });
  }

  isHighSectorPrototypeRun() {
    return isLateGamePressureExperimentActive(this);
  }

  clearLateGameExperimentState(reason = 'cleared') {
    const previous = this.lateGameExperiment;
    this.lateGameExperiment = null;
    this.highSectorPrototypeRun = null;
    this.highSectorEscalationProfile = null;
    if (previous?.active) {
      console.log(`[LateGamePressureExperiment] cleared reason=${reason} version=${previous.version}`);
    }
    return Boolean(previous?.active);
  }

  areRunRewardsSuppressed() {
    return this.runPolicy ? !this.runPolicy.allowPersistentRewards : this.isHighSectorPrototypeRun();
  }

  getRunRewardSuppressionState() {
    const suppressed = this.areRunRewardsSuppressed();
    return {
      suppressed,
      reason: suppressed ? HIGH_SECTOR_PROTOTYPE_AWARD_SUPPRESSION_REASON : null,
      surfaces: suppressed ? [...HIGH_SECTOR_PROTOTYPE_SUPPRESSED_AWARDS] : []
    };
  }

  canUpdateCareerProgressForCurrentRun() {
    return this.runPolicy?.allowCareerProgress
      ?? canRunModeUpdateCareerProgress(this.runMode, { isDebugRun: this.isDebugRun });
  }

  canUpdateCompetitiveCareerBestsForCurrentRun() {
    return this.runPolicy?.allowPersonalBests
      ?? canRunModeUpdateCompetitiveCareerBests(this.runMode, { isDebugRun: this.isDebugRun });
  }

  isDailySignalRun() {
    return this.runMode === RUN_MODES.DAILY_SIGNAL;
  }

  shouldFinishDailySignal(sectorCleared, bossCompletion = true) {
    if (!this.isDailySignalRun() || !bossCompletion || this.runFinalized) return false;
    const finishSector = Math.max(1, Math.floor(Number(this.dailySignalContract?.finishSector) || 10));
    return Math.max(1, Math.floor(Number(sectorCleared) || 1)) >= finishSector;
  }

  getRunModeProfile(mode = this.runMode) {
    const profile = getRunModeProfile(mode);
    return normalizeRunMode(mode) === RUN_MODES.SCOUT
      ? applyScoutAnomalyToProfile(profile, this.scoutAnomalyId)
      : profile;
  }

  getRunLeaderboardDescriptor(mode = this.runMode) {
    return getLeaderboardDescriptorForRunMode(mode);
  }

  canUnlockAchievementsForCurrentRun() {
    return this.runPolicy?.allowAchievements
      ?? canRunModeUnlockAchievements(this.runMode, { isDebugRun: this.isDebugRun });
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

  lockFinalScore(reason = 'run_end') {
    if (this.finalScoreLocked) return this.finalScoreSnapshot;
    const finalScore = Math.max(0, Number(this.score) || 0);
    this.score = finalScore;
    this.finalScoreLocked = true;
    this.finalScoreSnapshot = finalScore;
    this.finalScoreLockReason = reason;
    if (this.scoreBreakdown) this.scoreBreakdown.finalScore = finalScore;
    return finalScore;
  }

  getFinalScore() {
    return this.finalScoreLocked
      ? Math.max(0, Number(this.finalScoreSnapshot) || 0)
      : Math.max(0, Number(this.score) || 0);
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
    this.runClearLifeLosses = Math.max(0, Number(this.scenes?.play?.lifeLossesThisRun) || 0);
    this.updateNoRepairReceiptsQualification();
    return true;
  }

  updateNoRepairReceiptsQualification() {
    this.noRepairReceiptsLifeLosses = captureNoRepairReceiptsLifeLosses({
      capturedLifeLosses: this.noRepairReceiptsLifeLosses,
      runCleared: this.runCleared,
      score: this.score,
      lifeLosses: this.scenes?.play?.lifeLossesThisRun
    });
    return this.noRepairReceiptsLifeLosses;
  }

  awardRunClearScoreBonuses({ clearBonus = 0, livesBonus = 0, awardKey = 'run_clear' } = {}) {
    return awardRunClearScoreBonuses(this, { clearBonus, livesBonus, awardKey });
  }

  completeRun(reason = 'target_sector_clear', overrides = {}) {
    if (this.runFinalized) return;
    this.markRunClear(reason);
    this.finalizeRunProgression({
      runCleared: true,
      clearReason: this.runClearReason || reason,
      clearLivesRemaining: this.runClearLivesRemaining || 0,
      ...overrides
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
      allowAchievements: payload.allowAchievements ?? this.canUnlockAchievementsForCurrentRun(),
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

  unlockSwarmEliteFromEligibility(eligibility, payload = {}) {
    if (!eligibility?.eligible) return null;
    return this.achievementManager?.unlock(SWARM_ELITE_ACHIEVEMENT_ID, {
      source: payload.source || 'accepted_ranked_submission',
      ignoreRunGate: payload.ignoreRunGate === true,
      score: eligibility.acceptedScore,
      acceptedScore: eligibility.acceptedScore,
      runMode: eligibility.runMode,
      globalProvider: payload.globalProvider || null,
      leaderboardName: payload.leaderboardName || null,
      leaderboardKind: payload.leaderboardKind || null,
      submissionStatus: payload.submissionStatus || 'accepted',
      validationSource: payload.validationSource || eligibility.scoreSource || 'accepted_submission',
      historicalBackfill: payload.historicalBackfill === true
    }) || null;
  }

  handleAcceptedPendingSteamSubmission({ entry = null, runResult = null, steam = null } = {}) {
    const acceptedRun = runResult || entry?.runResult || {};
    const eligibility = evaluateSwarmEliteEligibility({
      score: acceptedRun.score,
      runMode: acceptedRun.runMode,
      isDebugRun: acceptedRun.isDebugRun === true,
      allowAchievements: acceptedRun.eligibleForAchievements !== false,
      eligibleRun: acceptedRun.eligibleForSubmission !== false,
      submissionAccepted: true
    });
    return this.unlockSwarmEliteFromEligibility(eligibility, {
      source: 'accepted_pending_steam_submission',
      ignoreRunGate: true,
      globalProvider: 'steam',
      leaderboardName: acceptedRun.leaderboardName || steam?.leaderboardName || null,
      leaderboardKind: acceptedRun.leaderboardKind || steam?.leaderboardKind || null,
      submissionStatus: 'accepted_after_queue',
      validationSource: 'steam_pending_retry'
    });
  }

  async backfillSwarmEliteAchievement() {
    if (this.achievementManager?.isUnlocked?.(SWARM_ELITE_ACHIEVEMENT_ID)) return null;
    if (this.swarmEliteBackfillPromise) return this.swarmEliteBackfillPromise;

    const modes = [RUN_MODES.RANKED, RUN_MODES.MAYHEM_TACTICAL];
    this.swarmEliteBackfillPromise = Promise.all(modes.map(async (runMode) => {
      const leaderboard = this.getRunLeaderboardDescriptor(runMode);
      const best = await this.getLeaderboardAdapter().getKnownPersonalBest({
        useCache: false,
        includeLocal: false,
        ...leaderboard
      });
      return { runMode, leaderboard, best };
    }))
      .then((candidates) => candidates
        .filter((candidate) => String(candidate.best?.source || '').startsWith('steam_'))
        .sort((first, second) => (Number(second.best?.score) || 0) - (Number(first.best?.score) || 0))[0] || null)
      .then((candidate) => {
        if (!candidate) return null;
        const eligibility = evaluateSwarmEliteEligibility({
          runMode: candidate.runMode,
          historicalAccepted: true,
          historicalAcceptedScore: candidate.best?.score
        });
        return this.unlockSwarmEliteFromEligibility(eligibility, {
          source: 'steam_ranked_score_backfill',
          ignoreRunGate: true,
          globalProvider: 'steam',
          leaderboardName: candidate.leaderboard.leaderboardName,
          leaderboardKind: candidate.leaderboard.leaderboardKind,
          submissionStatus: 'historical_accepted',
          validationSource: candidate.best?.source || 'steam_player_best',
          historicalBackfill: true
        });
      })
      .catch((error) => {
        console.warn('[Achievements] Swarm Elite historical backfill unavailable:', error?.message || error);
        return null;
      });

    return this.swarmEliteBackfillPromise;
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
    if (!canRunModeUnlockAchievements(this.runMode, { isDebugRun: this.isDebugRun })) return false;
    const scene = this.currentScene;
    if (scene && typeof scene.showAchievementToast === 'function') {
      try {
        return scene.showAchievementToast(toast) === true;
      } catch {
        return false;
      }
    }
    return false;
  }

  flushAchievementToasts(scene = this.currentScene) {
    if (!canRunModeUnlockAchievements(this.runMode, { isDebugRun: this.isDebugRun })) return [];
    if (!scene || typeof scene.showAchievementToast !== 'function') return [];
    const pending = this.pendingAchievementToasts.splice(0);
    pending.forEach((toast) => {
      try {
        if (scene.showAchievementToast(toast) !== true) {
          this.pendingAchievementToasts.push(toast);
        }
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
      this.leaderboardAdapter = createLeaderboardAdapter({
        onAcceptedPendingSteamSubmission: (submission) => this.handleAcceptedPendingSteamSubmission(submission)
      });
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
    if (this.finalScoreLocked) return 0;
    const base = Number(points) || 0;
    const gameMult = Number(this.scoreMultiplier) || 1;
    const playScene = this.scenes?.play;
    const diagnostics = playScene?.performanceDiagnostics;
    const addScoreStartedAt = diagnostics?.enabled ? performance.now() : 0;
    const measurePerformance = diagnostics?.measure?.bind(diagnostics) || ((_label, callback) => callback());
    const playerMult = playScene?.player?.scoreMultiplier || 1;
    const preDangerAward = normalizeScoreDelta(base, GLOBAL_SCORE_TUNING_MULTIPLIER * gameMult * playerMult);
    const applied = this.getScoreAward(points);
    this.score += applied;
    this.updateNoRepairReceiptsQualification();
    const breakdownKey = this.scoreBreakdown[source] !== undefined ? source : 'baseScore';
    this.scoreBreakdown[breakdownKey] += applied;
    this.scoreBreakdown.dangerMultiplierBonus += Math.max(0, applied - preDangerAward);
    this.scoreBreakdown.finalScore = this.score;

    const deferProgress = Boolean(playScene?.isCollisionHotPathActive || playScene?.shouldDeferActiveGameplayPersistence?.());

    const previousRank = this.rankIndex;
    if (deferProgress) {
      playScene.requestDeferredLiveRankRefresh?.();
    } else {
      measurePerformance('rank_highscore_cue_update.live_rank', () => this.updateLiveRunRank({ force: true }));
    }
    const computedRank = this.rankIndex;

    // Diag Update
    this.diag.asEv++;
    this.diag.asPts = Number(points) || 0;
    this.diag.asComp = computedRank;
    this.diag.asBefore = previousRank;
    this.diag.asAfter = computedRank;
    if (deferProgress) {
      measurePerformance('rank_highscore_cue_update.personal_best', () => this.updateHighscoreChaseCues({ personalBestOnly: true }));
      playScene.requestDeferredScoreCueRefresh?.();
    } else {
      measurePerformance('rank_highscore_cue_update.global_leaderboard', () => this.updateGlobalLeaderboardVoiceCues());
      measurePerformance('rank_highscore_cue_update.highscore_chase', () => this.updateHighscoreChaseCues());
    }
    diagnostics?.mark?.('gameplay.score_award', {
      points: base,
      applied,
      source,
      score: this.score
    });
    if (addScoreStartedAt > 0) diagnostics?.recordSection?.('game.addScore', performance.now() - addScoreStartedAt);
    return applied;
  }

  createHighscoreChaseState({
    runMode = this.runMode,
    progress = null,
    sectorStartCheckpoint = null,
    dailySignalContract = this.dailySignalContract
  } = {}) {
    const isSectorStart = runMode === RUN_MODES.SECTOR_START;
    const isDailySignal = runMode === RUN_MODES.DAILY_SIGNAL;
    const isOverrun = isOverrunRunMode(runMode);
    const sectorRecord = isSectorStart ? getSectorStartChallengeRecord(sectorStartCheckpoint) : null;
    const dailyBestAttempt = isDailySignal ? getDailySignalBestAttempt(dailySignalContract) : null;
    const dailyBestClear = isDailySignal ? getDailySignalBestClear(dailySignalContract) : null;
    const rankedModeBest = isRankedRunMode(runMode)
      ? getMayhemModeBestScore(runMode, { legacyPureBest: progress?.bestScore })
      : 0;
    const overrunBest = isOverrun ? getOverrunRunBest(runMode) : null;
    const targetScore = Math.max(0, Math.floor(Number(
      isSectorStart
        ? sectorRecord?.scoreEarned
        : isDailySignal
          ? dailyBestClear?.score
          : isOverrun
            ? overrunBest?.score
            : rankedModeBest
    ) || 0));
    const targetSector = isDailySignal
      ? Math.max(1, Math.floor(Number(dailySignalContract?.finishSector) || 10))
      : null;
    const targetTimeSeconds = isDailySignal && dailyBestClear
      ? Math.max(0, Math.floor(Number(dailyBestClear.runElapsedSeconds) || 0))
      : null;
    const goalMode = isDailySignal && !dailyBestClear ? 'daily_clear' : 'score';
    return {
      targetScore,
      targetSector,
      targetTimeSeconds,
      goalMode,
      bestAttemptSector: isDailySignal ? Math.max(0, Math.floor(Number(dailyBestAttempt?.sectorReached) || 0)) : null,
      hasDailyClear: Boolean(dailyBestClear),
      runMode,
      source: isSectorStart
        ? 'sector_start_record'
        : isDailySignal
          ? 'daily_signal_local_best'
          : isOverrun
            ? 'overrun_personal_best'
            : 'mayhem_mode_best_score',
      syncingTarget: isRankedRunMode(runMode),
      checkpoint: sectorStartCheckpoint || null,
      surpassed: goalMode === 'daily_clear' ? false : targetScore <= 0,
      celebrationFired: false,
      celebrationScore: 0,
      milestones: new Set(),
      lastTauntAtMs: 0,
      tauntIndex: Math.floor(Math.random() * 1000)
    };
  }

  raiseHighscoreChaseTarget(targetScore, source = 'known_personal_best') {
    const score = Math.max(0, Math.floor(Number(targetScore) || 0));
    const chase = this.highscoreChase;
    if (!chase || !isRankedRunMode(chase.runMode) || score <= chase.targetScore) return false;
    chase.targetScore = score;
    chase.source = source || chase.source;
    chase.surpassed = score <= 0 || this.score > score;
    if (!chase.surpassed) {
      chase.celebrationFired = false;
      chase.celebrationScore = 0;
      chase.milestones?.delete?.('100');
    }
    return true;
  }

  primeHighscoreChaseTarget() {
    if (!this.isRankedRun() || this.highscoreChaseTargetPromise) return this.highscoreChaseTargetPromise;
    const chase = this.highscoreChase;
    if (!chase || !isRankedRunMode(chase.runMode)) return null;
    const leaderboard = this.getRunLeaderboardDescriptor(chase.runMode);
    this.highscoreChaseTargetPromise = this.getLeaderboardAdapter().getKnownPersonalBest({
      useCache: false,
      includeLocal: false,
      ...leaderboard
    })
      .then((best) => {
        if (this.highscoreChase !== chase || !this.isRankedRun()) return null;
        this.raiseHighscoreChaseTarget(best?.score, best?.source || 'known_personal_best');
        if (this.highscoreChase === chase) chase.syncingTarget = false;
        this.updateHighscoreChaseCues();
        return this.highscoreChase?.targetScore ?? null;
      })
      .catch((error) => {
        console.warn('[HighscoreChase] Unable to load known personal best', error?.message || error);
        if (this.highscoreChase === chase) chase.syncingTarget = false;
        this.updateHighscoreChaseCues();
        return null;
      });
    return this.highscoreChaseTargetPromise;
  }

  getHighscoreChaseState() {
    return this.highscoreChase || {
      targetScore: 0,
      targetSector: null,
      targetTimeSeconds: null,
      goalMode: 'score',
      bestAttemptSector: null,
      hasDailyClear: false,
      runMode: this.runMode,
      source: 'none',
      syncingTarget: false,
      checkpoint: null,
      surpassed: true,
      celebrationFired: false,
      celebrationScore: 0,
      milestones: new Set()
    };
  }

  updateHighscoreChaseCues({ personalBestOnly = false } = {}) {
    const chase = this.highscoreChase;
    if (!chase || chase.targetScore <= 0 || !this.currentScene?.enqueueToast) return;
    const score = Math.max(0, Number(this.score) || 0);
    const ratio = score / chase.targetScore;
    const beatPersonalBest = (
      (isRankedRunMode(chase.runMode) || isOverrunRunMode(chase.runMode))
      && !chase.syncingTarget
      && score > chase.targetScore
    );
    if (beatPersonalBest && !chase.celebrationFired) {
      chase.celebrationFired = true;
      chase.celebrationScore = score;
      chase.surpassed = true;
      ['25', '50', '75', '90', '100'].forEach((key) => chase.milestones.add(key));
      const shown = this.currentScene.showPersonalBestCelebration?.({
        previousScore: chase.targetScore,
        newScore: score,
        source: chase.source
      }) === true;
      if (!shown) {
        AudioManager.playSfx('nova_highscore_chime', { force: true, volume: 0.9, minIntervalMs: 0 });
        this.currentScene.enqueueToast(translateText(
          chase.runMode === RUN_MODES.DAILY_SIGNAL ? 'NEW DAILY SIGNAL BEST' : 'NEW PERSONAL BEST'
        ), {
          fontSize: 29,
          fill: '#fff05c',
          slot: 'center',
          type: 'personal_best',
          duration: 2600,
          priority: 8
        });
      }
      this.personalBestLiveCelebrated = true;
      return;
    }
    if (personalBestOnly) return;
    const cues = [
      { key: '25', at: 0.25, text: 'That high score is pretending not to sweat.', sfx: 'combo_tick', volume: 0.42 },
      { key: '50', at: 0.5, text: 'Halfway there. The scoreboard has begun legal review.', sfx: 'combo_breakout', volume: 0.6 },
      { key: '75', at: 0.75, text: 'Three quarters in. The old score is making excuses.', sfx: 'boss_phase_surge', volume: 0.48 },
      { key: '90', at: 0.9, text: 'Close enough to smell the initials. Do not blink.', sfx: 'nova_highscore_chime', volume: 0.62 }
    ];
    const nextCue = cues.find((cue) => ratio >= cue.at && !chase.milestones.has(cue.key));
    if (!nextCue) return;
    chase.milestones.add(nextCue.key);
    const now = Date.now();
    chase.lastTauntAtMs = now;
    AudioManager.playSfx(nextCue.sfx, { force: true, volume: nextCue.volume, minIntervalMs: 0 });
    this.currentScene.enqueueToast(translateText(nextCue.text), {
      fontSize: 22,
      fill: '#ff55d9',
      slot: 'top',
      type: 'highscore_chase',
      duration: 1600,
      priority: 3
    });
  }

  getScoreAward(points) {
    const base = Number(points) || 0;
    // Check both Game's scoreMultiplier (bonus core) and Player's scoreMultiplier (score_x2)
    const gameMult = Number(this.scoreMultiplier) || 1;
    const playerMult = this.scenes?.play?.player?.scoreMultiplier || 1;
    const pressureMult = this.runPressureDirector?.getScoreMultiplier?.() || 1;
    const mult = GLOBAL_SCORE_TUNING_MULTIPLIER * gameMult * playerMult * pressureMult;
    return normalizeScoreDelta(base, mult);
  }

  resetGlobalLeaderboardCues() {
    this.globalLeaderboardTargets = null;
    this.globalLeaderboardTargetPromise = null;
    this.globalRivalProjectionCache = null;
    this.globalLeaderboardCueState = {
      global: false,
      top3: false,
      number1: false,
      rivalKey: null,
      rivalTarget: null
    };
  }

  getGlobalRivalChaseState({ score = this.score } = {}) {
    if (!this.isRankedRun() || !Array.isArray(this.globalLeaderboardTargets) || this.globalLeaderboardTargets.length === 0) {
      return null;
    }
    const chase = this.highscoreChase;
    if (!chase || chase.goalMode !== 'score' || chase.syncingTarget) return null;
    const currentScore = Math.max(0, Math.floor(Number(score) || 0));
    const personalBest = Math.max(0, Math.floor(Number(chase.targetScore) || 0));
    const personalTargetCleared = personalBest > 0 ? currentScore > personalBest : currentScore > 0;
    if (!personalTargetCleared) return null;
    const cache = this.globalRivalProjectionCache;
    if (
      cache?.entries === this.globalLeaderboardTargets
      && cache?.score === currentScore
      && cache?.personalBest === personalBest
      && cache?.runMode === this.runMode
    ) {
      return cache.projection;
    }
    const projection = analyzeGlobalRivalProjection(currentScore, this.globalLeaderboardTargets);
    this.globalRivalProjectionCache = {
      entries: this.globalLeaderboardTargets,
      score: currentScore,
      personalBest,
      runMode: this.runMode,
      projection
    };
    return projection;
  }

  updateGlobalRivalCue() {
    const projection = this.getGlobalRivalChaseState();
    if (!projection) {
      this.globalLeaderboardCueState.rivalKey = null;
      this.globalLeaderboardCueState.rivalTarget = null;
      return null;
    }
    const nextKey = projection.targetKind === 'number_one'
      ? 'number_one'
      : [
        projection.targetKind,
        projection.targetRank || 0,
        projection.targetEntryScore || 0,
        projection.targetName || ''
      ].join('|');
    const previousKey = this.globalLeaderboardCueState.rivalKey;
    const previousTarget = this.globalLeaderboardCueState.rivalTarget;
    if (previousKey && previousKey !== nextKey) {
      this.scenes?.play?.hud?.showGlobalRivalPass?.({
        passedTarget: previousTarget,
        nextProjection: projection
      });
      AudioManager.playSfx('nova_highscore_chime', {
        force: true,
        volume: 0.74,
        minIntervalMs: 320
      });
    }
    this.globalLeaderboardCueState.rivalKey = nextKey;
    this.globalLeaderboardCueState.rivalTarget = projection.targetKind === 'number_one'
      ? { targetKind: 'number_one', targetName: '', targetRank: 1, targetEntryScore: 0 }
      : {
        targetKind: projection.targetKind,
        targetName: projection.targetName,
        targetRank: projection.targetRank,
        targetEntryScore: projection.targetEntryScore
      };
    return projection;
  }

  primeGlobalLeaderboardTargets() {
    if (!this.isRankedRun() || this.globalLeaderboardTargetPromise) return this.globalLeaderboardTargetPromise;
    this.globalLeaderboardTargetPromise = this.getLeaderboardAdapter().getGlobalScoresForPlacement({
      useCache: true,
      ...this.getRunLeaderboardDescriptor()
    })
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
    this.updateGlobalRivalCue();
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

  getCurrentCareerRankProgress() {
    if (this.liveRankProgression?.rankProgress?.displayRankExact) return this.liveRankProgression.rankProgress;
    if (this.runProgressionResult?.rankProgress?.displayRankExact) return this.runProgressionResult.rankProgress;
    const currentProgress = this.currentSceneName === 'play'
      ? (this.hangarProgressAtRunStart || readHangarProgressState())
      : readHangarProgressState();
    return rankManager.getCareerRankProgress(currentProgress.pilotXpExact ?? currentProgress.pilotXp);
  }

  getCareerDisplayRankExact() {
    return this.getCurrentCareerRankProgress().displayRankExact;
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
    return this.getCurrentCareerRankProgress().progress;
  }

  loseLife(options = {}) {
    if (this.currentScene?.isDebugInvincibleActive?.()) {
      this.currentScene.onDebugDamageBlocked?.('game_lose_life');
      return;
    }

    const source = typeof options === 'string'
      ? options
      : String(options?.source || 'unknown');
    const before = this.lives;
    this.lives--;
    const after = this.lives;
    if (this.currentScene && this.currentScene.onLifeLost) {
      this.currentScene.onLifeLost(this.lives, {
        before,
        after,
        source,
        final: after <= 0
      });
    }
    if (this.lives <= 0) {
      if (this.currentScene?.beginGameOverSequence?.()) return;
      this.gameOver();
    }
  }

  gainLife(options = {}) {
    const requested = typeof options === 'number'
      ? options
      : Number(options.count || 1);
    const source = typeof options === 'object' && options?.source
      ? String(options.source)
      : 'extra_life';
    const grantCount = Math.max(1, Math.round(Number(requested) || 1));
    const before = this.lives;
    const maxLives = MAX_PLAYER_LIVES;
    this.lives = Math.min(this.lives + grantCount, maxLives);
    const after = this.lives;
    const applied = after > before;
    const maxLabel = Number.isFinite(maxLives) ? String(maxLives) : 'none';
    console.log(`[Lives] pickup ${source} grant=${grantCount} before=${before} after=${after} max=${maxLabel} applied=${applied}`);

    // Notify scene if needed
    if (this.currentScene && this.currentScene.onLifeGained) {
      this.currentScene.onLifeGained(this.lives, {
        before,
        after,
        grantCount,
        maxLives,
        source,
        reachedMax: applied && Number.isFinite(maxLives) && after >= maxLives
      });
    }
  }

  nextLevel() {
    this.level++;
    this.updateLiveRunRank({ force: true });
    if (this.currentScene && this.currentScene.startLevel) {
      this.currentScene.startLevel();
    }
  }

  buildRunSummary(overrides = {}) {
    const play = this.scenes?.play;
    const finalScore = this.getFinalScore();
    const rewardsSuppressed = this.areRunRewardsSuppressed();
    const discoveryStats = rewardsSuppressed
      ? { totalDiscovered: Math.max(0, Number(this.hangarProgressAtRunStart?.totalCodexDiscoveries) || 0) }
      : getDiscoveryStats();
    const discoveries = rewardsSuppressed ? [] : getDiscoveriesThisRun();
    const elapsed = Number(play?.gameTime) || (this.runStartedAtMs ? (Date.now() - this.runStartedAtMs) / 1000 : 0);
    const totalElapsed = Math.max(
      elapsed,
      Number(overrides.runTotalElapsedSeconds) || 0,
      this.runSessionClock?.elapsedSeconds || 0
    );
    const levelReached = Math.max(1, Number(this.level) || 1, (Number(play?.bossKills) || 0) + 1);
    const ship = getShipMetadata(this.selectedShipSpriteKey);
    const tacticalAugmentIds = Array.isArray(play?.player?.runAugmentIds) ? play.player.runAugmentIds.slice() : [];
    const tacticalConsumedAugmentIds = Array.isArray(play?.player?.consumedRunAugmentIds) ? play.player.consumedRunAugmentIds.slice() : [];
    const summary = {
      score: finalScore,
      finalScore,
      completedAt: overrides.completedAt || new Date().toISOString(),
      levelReached,
      sectorReached: levelReached,
      startSector: Math.max(1, Number(this.runStartSector) || 1),
      runElapsedSeconds: Math.max(0, elapsed),
      runTotalElapsedSeconds: Math.max(0, totalElapsed),
      bossesKilled: Number(play?.bossKills) || 0,
      wavesCleared: Number(play?.wavesCleared) || 0,
      totalKills: Number(play?.totalKills) || 0,
      bestComboCount: Number(play?.bestComboCount) || 0,
      bestDangerDodgeStreak: Number(play?.bestDangerDodgeStreak) || 0,
      nearMissSurges: Number(play?.nearMissSurgesThisRun) || 0,
      grazeBreaks: Number(play?.grazeBreaksThisRun) || 0,
      pointDefenseIntercepts: Number(play?.player?.pointDefenseInterceptCount) || 0,
      lifeLosses: Number(play?.lifeLossesThisRun) || 0,
      respawns: Number(play?.respawnsThisRun) || 0,
      extraLivesEarned: Number(play?.extraLivesEarnedThisRun) || 0,
      repairsGranted: Number(play?.repairsGrantedThisRun) || 0,
      lastLifeLossSource: play?.lastLifeLossSource || null,
      finalDeathSource: play?.finalLifeLossSource || null,
      powerupsCollected: Number(play?.powerupsCollectedThisRun) || 0,
      tacticalDraftPicks: Array.isArray(play?.tacticalDraftHistory) ? play.tacticalDraftHistory.map((entry) => ({ ...entry })) : [],
      tacticalAugmentIds,
      tacticalConsumedAugmentIds,
      tacticalDoctrine: analyzeTacticalDoctrine(tacticalAugmentIds, tacticalConsumedAugmentIds),
      livesRemaining: this.lives,
      runCleared: Boolean(overrides.runCleared ?? this.runCleared),
      overrunCompletionEarned: Boolean(overrides.overrunCompletionEarned ?? this.overrunCompletionEarned),
      isDebugRun: this.isDebugRun === true,
      lateGameExperimentActive: this.lateGameExperiment?.active === true,
      clearReason: overrides.clearReason || this.runClearReason || null,
      clearLivesRemaining: Math.max(0, Number(overrides.clearLivesRemaining ?? this.runClearLivesRemaining) || 0),
      clearLifeLosses: Math.max(0, Number(overrides.clearLifeLosses ?? this.runClearLifeLosses) || 0),
      noRepairReceiptsLifeLosses: Math.max(
        0,
        Number(
          overrides.noRepairReceiptsLifeLosses
          ?? this.noRepairReceiptsLifeLosses
          ?? play?.lifeLossesThisRun
        ) || 0
      ),
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
      scoutAnomalyId: this.scoutAnomaly?.id || null,
      scoutAnomalyName: this.scoutAnomaly?.name || null,
      scoutAnomalyRuleSummary: this.scoutAnomaly?.ruleSummary || null,
      selectedShipSpriteKey: this.selectedShipSpriteKey || null,
      shipId: ship?.id || this.selectedShipSpriteKey || null,
      shipName: ship?.name || null,
      shipTier: ship?.tier || 'standard',
      shipPowerRating: Number.isFinite(ship?.powerRating) ? ship.powerRating : 1,
      sectorStartCheckpoint: this.sectorStartCheckpoint || null,
      sectorStartPlaySector: this.sectorStartPlaySector || null,
      dailySignalContract: this.dailySignalContract ? {
        ...this.dailySignalContract,
        reinforcementSectors: [...(this.dailySignalContract.reinforcementSectors || [])],
        superStormSectors: [...(this.dailySignalContract.superStormSectors || [])]
      } : null,
      dailySignalAttemptId: this.dailySignalAttemptId || null,
      dailySignalContractValid: this.dailySignalContractValidation?.valid === true && !this.dailySignalInvalidReason,
      dailySignalContractErrors: [
        ...(this.dailySignalContractValidation?.errors || []),
        ...(this.dailySignalInvalidReason ? [this.dailySignalInvalidReason] : [])
      ],
      dailySignalInvalidReason: this.dailySignalInvalidReason || null,
      runRewardsSuppressed: rewardsSuppressed,
      runRewardSuppressionReason: rewardsSuppressed ? HIGH_SECTOR_PROTOTYPE_AWARD_SUPPRESSION_REASON : null,
      suppressedAwardSurfaces: rewardsSuppressed ? [...HIGH_SECTOR_PROTOTYPE_SUPPRESSED_AWARDS] : [],
      runContracts: play?.getRunContractDebugState?.() || null,
      tacticalDirectives: play?.getTacticalDirectiveDebugState?.() || null,
      aceBounties: play?.getAceBountyDebugState?.() || null,
      discoveriesThisRun: discoveries,
      codexCompletionCounts: rewardsSuppressed ? null : getCodexCompletionCounts(),
      scoreBreakdown: { ...this.scoreBreakdown },
      combatTelemetry: play?.getCombatTelemetrySummary?.() || null,
      pacing: getRunPacingDebugState(this),
      contentDirectorState: this.contentDirector?.getDebugState?.() || null
    };
    return { ...summary, ...overrides };
  }

  buildLiveRankProgressionSummary() {
    const play = this.scenes?.play;
    const discoveries = getDiscoveriesThisRun();
    const elapsed = Number(play?.gameTime) || (this.runStartedAtMs ? (Date.now() - this.runStartedAtMs) / 1000 : 0);
    const levelReached = Math.max(1, Number(this.level) || 1, (Number(play?.bossKills) || 0) + 1);
    return {
      score: this.score,
      finalScore: this.score,
      levelReached,
      sectorReached: levelReached,
      startSector: Math.max(1, Number(this.runStartSector) || 1),
      runElapsedSeconds: Math.max(0, elapsed),
      bossesKilled: Number(play?.bossKills) || 0,
      wavesCleared: Number(play?.wavesCleared) || 0,
      codexDiscoveries: discoveries.length,
      runThemeDiscoveries: discoveries.filter((entry) => entry.category === 'runThemes').length,
      noHitWaves: Number(play?.noHitWavesThisRun) || 0,
      noHitSectors: Number(play?.noHitSectorsThisRun) || 0,
      livesRemaining: this.lives,
      runCleared: Boolean(this.runCleared),
      clearReason: this.runClearReason || null,
      clearLivesRemaining: Math.max(0, Number(this.runClearLivesRemaining) || 0),
      clearLifeLosses: Math.max(0, Number(this.runClearLifeLosses) || 0),
      noRepairReceiptsLifeLosses: this.noRepairReceiptsLifeLosses,
      runMode: this.runMode,
      runModeReason: this.runModeReason
    };
  }

  updateLiveRunRank({ force = false } = {}) {
    if (!RunPacingConfig.pilotRankProgressionEnabled) return this.liveRankProgression;
    if (this.runFinalized || !this.canUpdateCareerProgressForCurrentRun() || this.currentSceneName !== 'play') return this.liveRankProgression;
    const now = Date.now();
    if (!force && now < (this.nextLiveRankCheckAtMs || 0)) return this.liveRankProgression;
    this.nextLiveRankCheckAtMs = now + 300;

    const result = previewRunProgression(
      this.buildLiveRankProgressionSummary(),
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
    this.currentScene?.flushRunPersistenceAtSafePoint?.('run_finalize');
    const finalScore = this.lockFinalScore('run_finalize');
    this.runFinalized = true;
    this.runTotalElapsedSeconds = (this.runSessionClock?.finalize(this.runElapsedSeconds) || 0) / 1000;
    this.runSummary = this.buildRunSummary({
      ...overrides,
      runTotalElapsedSeconds: overrides.runTotalElapsedSeconds ?? this.runTotalElapsedSeconds
    });
    if (this.isRankedRun()) {
      this.previousMayhemModeBestScore = getMayhemModeBestScore(this.runMode, {
        legacyPureBest: this.hangarProgressAtRunStart?.bestScore
      });
      recordMayhemModeScore(this.runMode, finalScore, {
        legacyPureBest: this.hangarProgressAtRunStart?.bestScore
      });
    }
    finishThreatDiscoveryRun({
      persist: this.runPolicy?.allowCodexProgress === true,
      sync: this.runPolicy?.allowCloudProgressSync === true
    });
    const previousProgress = this.hangarProgressAtRunStart || readHangarProgressState();
    const updatesCareerProgress = this.canUpdateCareerProgressForCurrentRun()
      && RunPacingConfig.pilotRankProgressionEnabled;
    let result = updatesCareerProgress
      ? applyRunProgression(this.runSummary, {
          updateCompetitiveBests: this.canUpdateCompetitiveCareerBestsForCurrentRun(),
          completedAt: this.runSummary.completedAt || new Date().toISOString()
        })
      : { previous: previousProgress, next: previousProgress, xpGained: 0, newRanksThisRun: [], newlyUnlockedShipIds: [], rankProgress: null };
    if (updatesCareerProgress && result?.next) {
      const runStartProgress = this.hangarProgressAtRunStart || result.previous || previousProgress;
      const runStartUnlocked = new Set((runStartProgress.unlockedShipIds || []).map(String));
      const newlyUnlockedShipIds = (result.next.unlockedShipIds || [])
        .map(String)
        .filter((shipId) => shipId && !runStartUnlocked.has(shipId));
      let nextProgress = result.next;
      if (newlyUnlockedShipIds.length > 0) {
        nextProgress = writeHangarProgressState({
          ...result.next,
          lastNewlyUnlockedShipIds: newlyUnlockedShipIds
        });
      }
      result = {
        ...result,
        previous: runStartProgress,
        next: nextProgress,
        newlyUnlockedShipIds
      };
    }
    this.runProgressionResult = result;
    this.rankIndex = result.next?.pilotRank ?? this.rankIndex;
    this.lastRankIndex = this.rankIndex;
    this.scoreBreakdown.pilotXpGained = result.xpGained || 0;
    this.scoreBreakdown.finalScore = finalScore;
    this.runSummary = {
      ...this.runSummary,
      pilotXpGained: result.xpGained || 0,
      pilotXp: result.next?.pilotXp ?? 0,
      pilotXpExact: result.next?.pilotXpExact ?? String(result.next?.pilotXp ?? 0),
      pilotRank: result.next?.pilotRank ?? 0,
      highestPilotRank: result.next?.highestPilotRank ?? 0,
      careerRankBefore: result.careerRankBefore || result.previous?.rankProgress?.displayRankExact || null,
      careerRankAfter: result.careerRankAfter || result.rankProgress?.displayRankExact || null,
      careerRankIncreased: Boolean(result.careerRankIncreased),
      newRanksThisRun: result.newRanksThisRun || [],
      rankProgress: result.rankProgress || null,
      rankAchievementsUnlocked: [],
      milestoneAchievementsUnlocked: [],
      newlyUnlockedShips: result.newlyUnlockedShipIds || [],
      shipMastery: result.shipTour?.current || result.shipMastery?.current || result.shipOverrun?.current || null,
      shipTour: result.shipTour?.current || null,
      shipTourCompletionRecorded: result.shipTour?.recorded === true,
      shipTourCompletionSource: result.shipTour?.source || null,
      shipOverrun: result.shipOverrun?.current || null,
      shipOverrunCompletionRecorded: result.shipOverrun?.recorded === true,
      overrunCompletionRecorded: result.shipOverrun?.recorded === true,
      shipMasteryPrevious: result.shipMastery?.previous || null,
      newShipMasteryTier: result.shipMastery?.newTier || null,
      hangarProgress: getHangarProgressSummary(result.next)
    };
    if (this.runMode === RUN_MODES.SECTOR_START && this.sectorStartCheckpoint) {
      const ship = getShipMetadata(this.selectedShipSpriteKey);
      const challengeRecord = recordSectorStartChallengeRun(this.runSummary, {
        selectedShipSpriteKey: this.selectedShipSpriteKey,
        shipId: ship?.id || this.selectedShipSpriteKey || null,
        shipName: ship?.name || null,
        shipTier: ship?.tier || 'standard',
        shipPowerRating: Number.isFinite(ship?.powerRating) ? ship.powerRating : 1
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
    if (this.runMode === RUN_MODES.SCOUT) {
      const ship = getShipMetadata(this.selectedShipSpriteKey);
      const scoutRecord = recordScoutRun(this.runSummary, {
        selectedShipSpriteKey: this.selectedShipSpriteKey,
        shipId: ship?.id || this.selectedShipSpriteKey || null,
        shipName: ship?.name || null,
        shipTier: ship?.tier || 'standard',
        shipPowerRating: Number.isFinite(ship?.powerRating) ? ship.powerRating : 1
      });
      this.lastScoutRunRecord = scoutRecord;
      this.runSummary = {
        ...this.runSummary,
        scoutRunAttempt: scoutRecord.attemptRecord,
        scoutRunPreviousBest: scoutRecord.previousRecord,
        scoutRunBest: scoutRecord.bestRecord,
        scoutRunNewBest: scoutRecord.isNewBest
      };
    }
    if (isOverrunRunMode(this.runMode) && !this.areRunRewardsSuppressed()) {
      const ship = getShipMetadata(this.selectedShipSpriteKey);
      const overrunRecord = recordOverrunRun(this.runSummary, {
        selectedShipSpriteKey: this.selectedShipSpriteKey,
        shipId: ship?.id || this.selectedShipSpriteKey || null,
        shipName: ship?.name || null
      });
      this.lastOverrunRunRecord = overrunRecord;
      this.runSummary = {
        ...this.runSummary,
        overrunRunAttempt: overrunRecord.attemptRecord,
        overrunRunPreviousBest: overrunRecord.previousRecord,
        overrunRunBest: overrunRecord.bestRecord,
        overrunRunNewBest: overrunRecord.isNewBest,
        overrunRunStored: overrunRecord.stored
      };
    }
    if (this.runMode === RUN_MODES.DAILY_SIGNAL && this.dailySignalContract) {
      const dailyRecord = recordDailySignalRun(this.runSummary, {
        contract: this.dailySignalContract,
        attemptId: this.dailySignalAttemptId
      });
      this.lastDailySignalRecord = dailyRecord;
      this.runSummary = {
        ...this.runSummary,
        dailySignalAttempt: dailyRecord.attemptRecord,
        dailySignalPreviousBest: dailyRecord.previousRecord,
        dailySignalBest: dailyRecord.bestRecord,
        dailySignalNewBest: dailyRecord.isNewBest,
        dailySignalPreviousBestAttempt: dailyRecord.previousBestAttempt,
        dailySignalPreviousBestClear: dailyRecord.previousBestClear,
        dailySignalBestAttempt: dailyRecord.bestAttempt,
        dailySignalBestClear: dailyRecord.bestClear,
        dailySignalAttemptCount: dailyRecord.attemptCount,
        dailySignalNewAttemptBest: dailyRecord.isNewAttemptBest,
        dailySignalNewClearBest: dailyRecord.isNewClearBest,
        dailySignalFlightLog: getDailySignalFlightLog(),
        dailySignalStored: dailyRecord.stored,
        dailySignalRecordSaveFailed: dailyRecord.saveFailed === true
      };
    }
    if (this.isRankedRun()) {
      for (const rankIndex of result.newRanksThisRun || []) {
        const unlock = this.unlockRankAchievement(rankIndex, {
          level: this.level,
          score: finalScore,
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
          score: finalScore,
          source: 'milestone_progression',
          achievementType: achievement.type,
          metric: entry.metric,
          progressValue: entry.value,
          target: entry.target,
          runCleared: this.runSummary.runCleared,
          livesRemaining: this.runSummary.livesRemaining,
          clearLivesRemaining: this.runSummary.clearLivesRemaining,
          clearLifeLosses: this.runSummary.clearLifeLosses,
          noRepairReceiptsLifeLosses: this.runSummary.noRepairReceiptsLifeLosses,
          minimumScore: achievement.minimumScore
        });
        if (unlock?.id) this.runSummary.milestoneAchievementsUnlocked.push(unlock.id);
      }
    }
    this.lastRunReport = this.lateGameExperiment?.active === true
      ? createLateGameExperimentReport(this.lateGameExperiment, this.runSummary)
      : createRunReport(this.runSummary);
    if (
      result.careerRankIncreased === true
      && BigInt(String(result.careerRankAfter || '0')) > 40n
    ) {
      this.careerRankMetadataRefreshPromise = this.getLeaderboardAdapter()
        .refreshCareerRankMetadata(result.careerRankAfter)
        .catch((error) => ({
          status: 'pending',
          reason: error?.message || 'refresh_failed',
          careerRankExact: result.careerRankAfter
        }));
    }
    if (this.runPolicy?.allowCloudProgressSync === true) {
      markPersistenceDirty('runResults', { scheduleFlush: false });
      void flushPersistence({ reason: 'run_finalize', force: true });
    }
    return result;
  }

  update(delta, realDeltaMs = null) {
    if (!this.runFinalized && this.runSessionClock?.running) {
      const frameMs = Number.isFinite(Number(realDeltaMs))
        ? Number(realDeltaMs)
        : Math.max(0, Number(delta) || 0) * (1000 / 60);
      this.runSessionClock.advanceRealFrame(frameMs);
      this.runTotalElapsedSeconds = this.runSessionClock.elapsedSeconds;
    }
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(delta);
    }
    this.updateLiveRunRank();
    this.syncGameplayCursor();
  }

  syncGameplayCursor() {
    return syncGameplayCursorVisibility(this);
  }

  getViewportWidth() {
    return this.app.screen.width;
  }

  getViewportHeight() {
    return this.app.screen.height;
  }

  getGameplayWidth() {
    return LOGICAL_PLAYFIELD_WIDTH;
  }

  getGameplayHeight() {
    return LOGICAL_PLAYFIELD_HEIGHT;
  }

  getGameplayBounds() {
    return getLogicalPlayfieldBounds();
  }

  getActivePlayfieldRect() {
    return computeActivePlayfieldRect(this.getViewportWidth(), this.getViewportHeight());
  }

  screenToGameplay(x, y) {
    return screenToWorld(x, y, this.getViewportWidth(), this.getViewportHeight());
  }

  gameplayToScreen(x, y) {
    return worldToScreen(x, y, this.getViewportWidth(), this.getViewportHeight());
  }

  clampToGameplay(x, y, margin = 0) {
    return clampToLogicalPlayfield(x, y, margin);
  }

  createGameplayFacade() {
    if (this.gameplayFacade) return this.gameplayFacade;
    const game = this;
    this.gameplayFacade = new Proxy(this, {
      get(target, prop, receiver) {
        if (prop === 'getWidth') return target.getGameplayWidth.bind(target);
        if (prop === 'getHeight') return target.getGameplayHeight.bind(target);
        if (prop === 'width') return target.getGameplayWidth();
        if (prop === 'height') return target.getGameplayHeight();
        if (prop === 'getViewportWidth') return target.getViewportWidth.bind(target);
        if (prop === 'getViewportHeight') return target.getViewportHeight.bind(target);
        if (prop === 'getActivePlayfieldRect') return target.getActivePlayfieldRect.bind(target);
        if (prop === 'screenToGameplay') return target.screenToGameplay.bind(target);
        if (prop === 'gameplayToScreen') return target.gameplayToScreen.bind(target);
        if (prop === 'clampToGameplay') return target.clampToGameplay.bind(target);
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value, receiver) {
        if (receiver === game.gameplayFacade) {
          return Reflect.set(target, prop, value, target);
        }
        return Reflect.set(target, prop, value, receiver);
      }
    });
    return this.gameplayFacade;
  }

  getWidth() {
    return this.getViewportWidth();
  }

  getHeight() {
    return this.getViewportHeight();
  }

  // TASK 2 & 4: Rank title and texture helpers
  getRankTitle(rankIndex) {
    return rankManager.getRankTitle(rankIndex);
  }

  getRankTexture(rankIndex) {
    return rankManager.getRankTexture(rankIndex);
  }
}
