import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { getGameOverComment } from '../text/phrasePool.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { createTextLayout, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';
import { generateUUID } from '../utils/uuid.js';
import { createText } from '../utils/pixiText.js';
import { AssetManifest } from '../assets/assetManifest.js';
import {
  getSelectableShips,
  getShipMetadata,
  getShipUnlockHistoryReason,
  getShipUnlockProgress,
  getShipUnlockProgressDetails,
  isShipUnlocked
} from '../config/ShipMetadata.js';
import { GameAssets } from '../utils/GameAssets.js';
import {
  analyzeGlobalLeaderboardScore,
  analyzeGlobalRivalProjection,
  normalizeGlobalScores
} from '../shared/GlobalLeaderboardPlacement.js';
import {
  GAME_OVER_CTA_RECENT_HISTORY_KEY,
  GAME_OVER_CTA_RECENT_HISTORY_SIZE,
  gameOverCtaVoiceLines
} from '../config/GameOverCtaVoiceLines.js';
import { createLeaderboardAdapter } from '../leaderboard/LeaderboardAdapter.js';
import { LEADERBOARD_DISPLAY_LIMIT, LeaderboardView, getPilotNameValidation } from '../leaderboard/LeaderboardTypes.js';
import { GamepadNavigator, hasConnectedGamepad } from '../input/GamepadNavigator.js';
import { GLOBAL_LEADERBOARD_ACHIEVEMENT_ID } from '../achievements/AchievementCatalog.js';
import {
  evaluateSwarmEliteEligibility,
  isAcceptedLeaderboardSubmission
} from '../achievements/SwarmEliteAchievement.js';
import { translateText } from '../i18n/index.js';
import { CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID } from '../progression/HangarProgressState.js';
import { formatRunContractProgressValue } from '../progression/RunContracts.js';
import { MAX_RANK_INDEX, getPilotRankProgress, getRankTitle } from '../shared/RankPolicy.js';
import { LocalLeaderboard } from '../api/LocalLeaderboard.js';
import { RUN_MODES, getRunModeProfile, isOverrunRunMode } from '../game/RunMode.js';
import { getDeathCoachAdvice as getRunDeathCoachAdvice } from '../game/RunReport.js';
import { destroyMenuFx, installMenuFx, resizeMenuFx, updateMenuFx } from '../ui/MenuFxLayer.js';
import { getRecoverySectorGoal } from '../config/RetentionPresentation.js';
import { formatDailySignalFlightLogSymbols } from '../progression/DailySignalRecords.js';
import {
  copyDailySignalCaption,
  createDailySignalCardCopy,
  createDailySignalCardModel,
  getDailySignalCardFilename,
  renderDailySignalCard,
  saveDailySignalCard
} from '../ui/DailySignalCard.js';

const INPUT_PROMPT = 'ENTER PILOT NAME AND SUBMIT';
const GLOBAL_SUBMIT_TIMEOUT_MS = 9000;
const STEAM_PLAYER_NAME_TIMEOUT_MS = 1800;
const LOCAL_SCORE_BACKUP_TIMEOUT_MS = 1800;
const SUBMITTED_REPORT_MIN_MS = 4800;
const SUBMITTED_POST_RESULT_MIN_MS = 1200;
const RESULT_REPORT_MIN_MS = 2600;
const CONTINUE_INPUT_ARM_MS = 500;
const PILOT_NAME_MAX_LENGTH = 14;
const CONTROLLER_NAME_STORAGE_KEY = 'nova.controllerPilotName.v1';
const GAME_OVER_EFFECT_COUNT = 100;
const GAME_OVER_EFFECT_PALETTES = [
  [0xff315f, 0xffd35c, 0x55f7ff],
  [0x8f5cff, 0xff4fd8, 0xfff06a],
  [0x39ffb6, 0x66b6ff, 0xff566d],
  [0xff7a36, 0xffee88, 0x47f4ff],
  [0xc77dff, 0xffdf5a, 0x60ffea]
];
const GAME_OVER_EFFECT_PROFILES = Array.from({ length: GAME_OVER_EFFECT_COUNT }, (_, index) => {
  const palette = GAME_OVER_EFFECT_PALETTES[index % GAME_OVER_EFFECT_PALETTES.length];
  return {
    id: `game_over_fx_${String(index + 1).padStart(3, '0')}`,
    primary: palette[0],
    secondary: palette[1],
    accent: palette[2],
    ringCount: 2 + (index % 5),
    glitchCount: 4 + (index % 7),
    shardCount: 32 + (index % 7) * 6,
    sweepSpeed: 0.009 + (index % 11) * 0.0014,
    ringSpeed: 0.72 + (index % 13) * 0.035,
    jitter: 0.7 + (index % 9) * 0.11,
    tilt: -0.35 + (index % 8) * 0.1,
    pulseOffset: index * 17
  };
});

const RUN_REPORT_SECTION_LABELS = Object.freeze({
  run: 'Run',
  dailySignal: 'Daily Signal Contract',
  combat: 'Combat',
  survival: 'Survival',
  rewards: 'Run Progress'
});

const RUN_REPORT_FIELD_LABELS = Object.freeze({
  mode: 'Mode',
  ship: 'Ship',
  score: 'Score',
  sector: 'Sector',
  time: 'Time',
  kills: 'Kills',
  bossKills: 'Boss kills',
  waves: 'Waves cleared',
  nearMissSurges: 'Near-miss surges',
  grazeBreaks: 'Graze breaks',
  pointDefenseIntercepts: 'Shots intercepted',
  damage: 'Effective damage',
  dps: 'Damage per second',
  accuracy: 'Shot accuracy',
  topDamageSource: 'Top damage source',
  livesLost: 'Lives lost',
  respawns: 'Respawns',
  extraLives: 'Extra lives earned',
  finalHit: 'Final hit',
  deathCoach: 'COUNTER ADVICE: LAST DEATH',
  powerups: 'Powerups',
  careerXp: 'Career XP',
  shipMastery: 'Ship mastery',
  newRanks: 'New ranks',
  codex: 'Codex discoveries',
  tacticalDrafts: 'Tactical upgrades',
  tacticalDirectives: 'SIDE DIRECTIVES',
  aceBounties: 'ACE BOUNTIES',
  nemesisProtocols: 'NEMESIS PROTOCOLS',
  pilotOrders: 'PILOT ORDERS',
  dailyDate: 'UTC Date',
  dailyRules: 'Rules fingerprint',
  dailyTemplate: 'Route directive',
  dailyFinish: 'Finish sector',
  dailyRecord: 'Daily local best',
  dailyAttempts: 'Valid attempts',
  dailyBestAttempt: 'Best attempt',
  dailyBestClear: 'Best clear',
  dailyFlightLog: '7-day flight log',
  scoutAnomaly: 'Scout anomaly'
});

function formatUnlockRequirementProgress(item) {
  const current = Math.min(Number(item?.current) || 0, Number(item?.target) || 0);
  const target = Number(item?.target) || 0;
  const suffix = item?.key === 'survivedSeconds' ? 's' : '';
  return `${current.toLocaleString('en-US')}${suffix}/${target.toLocaleString('en-US')}${suffix}`;
}

function formatUnlockRequirementsProgress(requirements = []) {
  const visible = Array.isArray(requirements) ? requirements.slice(0, 3) : [];
  return visible.length ? visible.map(item => formatUnlockRequirementProgress(item)).join('  ') : '';
}

function fitDisplayToBox(displayObject, maxWidth, maxHeight, { minScale = 0.58 } = {}) {
  if (!displayObject || !Number.isFinite(maxWidth) || !Number.isFinite(maxHeight) || maxWidth <= 0 || maxHeight <= 0) return 1;
  displayObject.scale.set(1);
  displayObject.updateText?.(false);
  const measuredWidth = displayObject.width || 0;
  const measuredHeight = displayObject.height || 0;
  const scale = measuredWidth > 0 && measuredHeight > 0
    ? Math.min(1, Math.max(minScale, Math.min(maxWidth / measuredWidth, maxHeight / measuredHeight)))
    : 1;
  displayObject.scale.set(scale);
  return scale;
}
const CONTROLLER_NAME_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CONTROLLER_INITIALS_LENGTH = 3;

function getConfirmedGlobalPlacement(score, entries = []) {
  const finalScore = Math.max(0, Number(score) || 0);
  const scores = normalizeGlobalScores(entries);
  const scoreAppears = finalScore > 0 && scores.some((entryScore) => entryScore === finalScore);
  const placement = scoreAppears
    ? scores.filter((entryScore) => entryScore > finalScore).length + 1
    : null;
  const qualified = Boolean(scoreAppears && placement && placement <= LEADERBOARD_DISPLAY_LIMIT);
  return {
    score: finalScore,
    placement,
    qualified,
    numberOne: Boolean(qualified && placement === 1),
    top3: Boolean(qualified && placement <= 3),
    top10: Boolean(qualified && placement <= 10),
    source: 'post_submit_global_read',
    scoresCount: scores.length
  };
}

function getDisplayRankNumber(rankIndex) {
  return Math.min(MAX_RANK_INDEX + 1, Math.max(1, Math.floor(Number(rankIndex) || 0) + 1));
}

function getValidPlacementNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
}

export class GameOverScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.nameInput = '';
    this.state = 'prompt';
    this.hiddenInput = null;
    this.boundHiddenInput = null;
    this.keyHandler = null;
    this.caretInterval = null;
    this.caretVisible = true;
    this.promptPointer = null;
    this.layoutUnsubscribe = null;
    this.title = null;
    this.scoreText = null;
    this.levelText = null;
    this.runSectionBg = null;
    this.unlockText = null;
    this.rankProgressBg = null;
    this.rankProgressText = null;
    this.shipUnlockProgressBg = null;
    this.shipUnlockProgressText = null;
    this.newlyUnlockedShips = [];
    this.shipUnlockReveal = null;
    this.shipUnlockRevealGlow = null;
    this.shipUnlockRevealBg = null;
    this.shipUnlockRevealFx = null;
    this.shipUnlockRevealSprites = [];
    this.shipUnlockRevealCountText = null;
    this.shipUnlockRevealStartedAt = 0;
    this.shipUnlockRevealDebugLayout = null;
    this.shipUnlockVoicePlayed = false;
    this.nextGoal = null;
    this.currentProgressForResult = null;
    this.runbackProgressSummary = '';
    this.nextGoalGroup = null;
    this.nextGoalBg = null;
    this.nextGoalText = null;
    this.comment = null;
    this.counterAdviceCard = null;
    this.counterAdviceCardBg = null;
    this.counterAdviceLabel = null;
    this.counterAdviceBody = null;
    this.counterAdviceCardWidth = 0;
    this.counterAdviceCardHeight = 0;
    this.counterAdviceCardDebug = null;
    this.leaderboardStatusText = null;
    this.leaderboardStatusBg = null;
    this.notQualifiedText = null;
    this.promptText = null;
    this.nameDisplay = null;
    this.instructions = null;
    this.retryButton = null;
    this.retryButtonBg = null;
    this.retryButtonGlow = null;
    this.retryButtonEnergy = null;
    this.retryButtonSheen = null;
    this.retryButtonLabel = null;
    this.retryButtonHint = null;
    this.retryButtonWidth = 0;
    this.retryButtonHeight = 0;
    this.retryButtonMode = 'restart';
    this.leaderboardButton = null;
    this.leaderboardButtonBg = null;
    this.leaderboardButtonGlow = null;
    this.leaderboardButtonLabel = null;
    this.leaderboardButtonHint = null;
    this.leaderboardButtonWidth = 0;
    this.leaderboardButtonHeight = 0;
    this.hangarButton = null;
    this.hangarButtonBg = null;
    this.hangarButtonGlow = null;
    this.hangarButtonLabel = null;
    this.hangarButtonHint = null;
    this.hangarButtonWidth = 0;
    this.hangarButtonHeight = 0;
    this.mainMenuButton = null;
    this.mainMenuButtonBg = null;
    this.mainMenuButtonGlow = null;
    this.mainMenuButtonLabel = null;
    this.mainMenuButtonHint = null;
    this.mainMenuButtonWidth = 0;
    this.mainMenuButtonHeight = 0;
    this.runbackReason = null;
    this.selectedCtaLine = null;
    this.ctaVoicePlayed = false;
    this.runbackStartedAt = 0;
    this.reportShownAt = 0;
    this.pendingRunbackReason = null;
    this.submittedHoldContinueReadyAt = 0;
    this.resultHoldContinueReadyAt = 0;
    this.continueInputArmedAt = 0;
    // HTML overlay for mobile input
    this.inputOverlay = null;
    this.inputField = null;
    this.submitButton = null;
    this.boundVisibleInput = null;
    this.boundVisibleInputKeyDown = null;
    this.boundHiddenKeyDown = null;
    this.backdrop = null;
    this.backdropShade = null;
    this.menuFx = null;
    this.backdropLoaded = false;
    this.ceremonyFrame = null;
    this.ceremonyGlow = null;
    this.ceremonyBurst = null;
    this.ceremonyMedal = null;
    this.ceremonyMedalBg = null;
    this.ceremonyMedalText = null;
    this.ceremonyMedalSubtext = null;
    this.fanfareParticles = [];
    this.ceremonyPulse = 0;
    this.gameOverEffectProfile = null;
    this.gameOverDoomLayer = null;
    this.gameOverAlarmSweep = null;
    this.gameOverRings = [];
    this.gameOverGlitchBars = [];
    this.gameOverShards = [];
    this.gameOverTauntPlayed = false;
    this.runReportOpen = false;
    this.runReportButton = null;
    this.runReportButtonBg = null;
    this.runReportButtonLabel = null;
    this.runReportButtonHint = null;
    this.runReportOverlay = null;
    this.runReportOverlayBg = null;
    this.runReportPanel = null;
    this.runReportCloseButton = null;
    this.runReportOverlayDebug = null;
    this.dailySignalShareBusy = false;
    this.dailySignalShareStatus = null;
    this.dailySignalShareDebug = null;
    // Frozen final values
    this.finalScore = 0;
    this.finalLevel = 0;
    this.cachedHighscores = null;
    this.isQualified = false;
    this.localQualified = false;
    this.globalQualified = false;
    this.globalStatus = 'idle';
    this.globalPlacement = null;
    this.globalPlacementTier = 'none';
    this.localPlacement = null;
    this.localPlacementSource = null;
    this.canEnterName = false;
    this.globalQualificationPromise = null;
    this.leaderboardResult = null;
    this.sectorLeaderboardResult = null;
    this.sectorSteamStatus = 'idle';
    this.sectorSteamRank = null;
    this.sectorSteamError = null;
    this.sectorSteamSubmitting = false;
    this.previousSteamBestScore = 0;
    this.steamBestUnchanged = false;
    this.leaderboardAdapter = null;
    this.leaderboardRuntime = null;
    this.steamSubmissionMode = false;
    this.steamPlayerName = null;
    this.isRankedRun = true;
    this.submitBlockedReason = null;
    this.isPersonalBest = false;
    this.qualificationFanfarePlayed = false;
    this.personalBestVoicePlayed = false;
    this.nearMissVoicePlayed = false;
    this.shipUnlockVoicePlayed = false;
    this.gameOverTauntPlayed = false;
    this.gameOverEffectProfile = GAME_OVER_EFFECT_PROFILES[Math.floor(Math.random() * GAME_OVER_EFFECT_PROFILES.length)];
    this.sceneTimeouts = new Set();
    // Submission deduplication
    this.submissionId = null;
    this.gamepadActionWasPressed = false;
    this.gamepadLeaderboardWasPressed = false;
    this.gamepadNavigator = new GamepadNavigator();
    this.lastInputDevice = 'keyboard';
    this.controllerNameCursor = 0;
    this.controllerNameAlphabet = CONTROLLER_NAME_ALPHABET;
    this.achievementToast = null;
    this.achievementToastTicker = null;
    this.achievementToastQueue = [];
    this.personalBestCarryBanner = null;
    this.personalBestCarryState = null;
    this.personalBestCarryBg = null;
    this.personalBestCarryTitle = null;
    this.personalBestCarryScore = null;
    this.personalBestCarryDelta = null;
    this.steamSubmissionToken = 0;
  }

  scheduleSceneTimeout(callback, delayMs) {
    const id = window.setTimeout(() => {
      this.sceneTimeouts.delete(id);
      callback();
    }, delayMs);
    this.sceneTimeouts.add(id);
    return id;
  }

  clearSceneTimeouts() {
    for (const id of this.sceneTimeouts || []) {
      window.clearTimeout(id);
    }
    this.sceneTimeouts?.clear();
  }

  getSubmittedLevelReached() {
    if (this.isDailySignalResult()) {
      const summary = this.game?.runSummary || {};
      if (summary.runCleared) {
        return Math.max(1, Math.floor(Number(
          summary.dailySignalFinishSector ||
          summary.dailySignalContract?.finishSector ||
          this.game?.dailySignalContract?.finishSector ||
          summary.sectorReached ||
          this.game?.level ||
          10
        ) || 10));
      }
      const failedRunValues = [summary.sectorReached, summary.levelReached, this.finalLevel, this.game?.level]
        .map((value) => Math.floor(Number(value)))
        .filter((value) => Number.isFinite(value) && value > 0);
      return Math.max(1, ...failedRunValues);
    }
    const play = this.game?.scenes?.play || null;
    const values = [
      this.game?.runSummary?.levelReached,
      this.game?.runSummary?.sectorReached,
      this.finalLevel,
      this.game?.level,
      (Number(play?.bossKills) || 0) + 1
    ];
    return Math.max(1, ...values
      .map((value) => Math.floor(Number(value)))
      .filter((value) => Number.isFinite(value) && value > 0));
  }

  getRunLeaderboardQuery() {
    return this.game?.getRunLeaderboardDescriptor?.() || {
      view: LeaderboardView.GLOBAL,
      leaderboardKind: 'global'
    };
  }

  async init() {
    this.clearSceneTimeouts();
    this.removePersonalBestCarry({ clearGameCarry: false, relayout: false });
    this.steamSubmissionToken += 1;
    this.gamepadNavigator.suppressUntilReleased();
    this.container.sortableChildren = true;
    this.container.removeChildren();
    this.removeInputOverlay();
    this.nameInput = '';
    this.state = 'prompt';
    this.runbackReason = null;
    this.selectedCtaLine = null;
    this.ctaVoicePlayed = false;
    this.runbackStartedAt = 0;
    this.reportShownAt = Date.now();
    this.runReportOpen = false;
    this.runReportOverlayDebug = null;
    this.dailySignalShareBusy = false;
    this.dailySignalShareStatus = null;
    this.dailySignalShareDebug = null;
    this.counterAdviceCardDebug = null;
    this.pendingRunbackReason = null;
    this.submittedHoldContinueReadyAt = 0;
    this.resultHoldContinueReadyAt = 0;
    this.continueInputArmedAt = 0;
    this.newlyUnlockedShips = [];
    this.shipUnlockVoicePlayed = false;
    this.caretVisible = true;
    this.isSubmitting = false;
    this.submitRetries = 0;
    this.submitBlockedReason = null;
    this.cachedHighscores = null;
    this.backdropLoaded = false;
    this.localQualified = false;
    this.globalQualified = false;
    this.globalStatus = 'idle';
    this.globalPlacement = null;
    this.globalPlacementTier = 'none';
    this.localPlacement = null;
    this.localPlacementSource = null;
    this.canEnterName = false;
    this.globalQualificationPromise = null;
    this.leaderboardResult = null;
    this.sectorLeaderboardResult = null;
    this.sectorSteamStatus = 'idle';
    this.sectorSteamRank = null;
    this.sectorSteamError = null;
    this.sectorSteamSubmitting = false;
    this.previousSteamBestScore = 0;
    this.steamBestUnchanged = false;
    if (this.game) this.game.lastLeaderboardResult = null;
    if (this.game) this.game.lastSectorLeaderboardResult = null;
    this.leaderboardAdapter = typeof this.game.getLeaderboardAdapter === 'function'
      ? this.game.getLeaderboardAdapter()
      : createLeaderboardAdapter();
    if (!this.isDailySignalResult()) {
      await this.leaderboardAdapter.refreshAvailability();
    }
    this.leaderboardRuntime = this.leaderboardAdapter.getRuntimeSummary();
    this.isRankedRun = typeof this.game.isScoreSubmissionAllowed === 'function'
      ? this.game.isScoreSubmissionAllowed()
      : !this.game.isDebugRun;
    const tacticalSteamLane = this.game?.runMode === RUN_MODES.MAYHEM_TACTICAL;
    this.steamSubmissionMode = Boolean(
      this.isRankedRun
      && (this.leaderboardAdapter.shouldUseSteamSubmission() || tacticalSteamLane)
    );
    this.steamPlayerName = this.steamSubmissionMode
      ? await this.leaderboardAdapter.getSteamPlayerName().catch(() => null)
      : null;
    this.lastInputDevice = hasConnectedGamepad() ? 'controller' : 'keyboard';
    this.controllerNameCursor = 0;

    // FREEZE final score and level immediately
    this.finalScore = typeof this.game.getFinalScore === 'function'
      ? this.game.getFinalScore()
      : Number(this.game.score) || 0;
    this.finalLevel = Number(this.game.level) || 0;
    this.finalLevel = this.getSubmittedLevelReached();
    if (this.isRankedRun) {
      this.localQualified = this.steamSubmissionMode
        ? this.finalScore > 0
        : this.leaderboardAdapter.qualifiesLocal(this.finalScore);
      this.globalStatus = this.steamSubmissionMode ? 'steam_ready' : 'checking';
      this.updateCanEnterName();
      if (this.localQualified) {
        this.rememberLocalPlacement(this.estimateLocalPlacement(), 'preview');
      }
    }
    const previousProgress = this.game.runProgressionResult?.previous || getShipUnlockProgress();
    const previousModeBest = Math.max(0, Number(this.game?.previousMayhemModeBestScore) || 0);
    this.isPersonalBest = (this.isRankedRun && this.finalScore > previousModeBest)
      || (this.isOverrunResult() && this.game?.runSummary?.overrunRunNewBest === true);
    this.qualificationFanfarePlayed = false;
    this.personalBestVoicePlayed = Boolean(this.game?.personalBestLiveCelebrated);
    this.nearMissVoicePlayed = false;
    const currentProgress = this.game.runProgressionResult?.next || getShipUnlockProgress();
    this.currentProgressForResult = currentProgress;
    this.game.rankIndex = currentProgress.pilotRank || this.game.rankIndex || 0;
    this.newlyUnlockedShips = this.getNewlyUnlockedShips(previousProgress, currentProgress);
    this.levelSummary = this.createLevelSummary(previousProgress, currentProgress);
    this.unlockSummary = this.createUnlockSummary(previousProgress, currentProgress, this.newlyUnlockedShips);
    this.nextGoal = this.createNextGoal(previousProgress, currentProgress);
    this.runbackProgressSummary = this.createRunbackProgressSummary(currentProgress);

    // Generate unique submissionId for this run (reused across retries)
    this.submissionId = this.isDailySignalResult()
      ? (this.game?.runSummary?.dailySignalAttemptId || this.game?.dailySignalAttemptId || generateUUID())
      : generateUUID();
    console.log('[GameOver] Generated submissionId:', this.submissionId);

    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);
    this.createFallbackBackdrop(width, height);
    this.initBackdrop(width, height);
    installMenuFx(this, {
      label: 'ui_menuFxGameOver',
      zIndex: -9,
      accent: this.game?.runSummary?.runCleared ? 0xffd15c : 0x37f5ff,
      secondary: 0xff55d9,
      gold: 0xffef7e,
      intensity: this.game?.runSummary?.runCleared ? 0.82 : 0.68,
      density: 0.76,
      alpha: 0.46,
      openVolume: 0.2
    });
    this.createCeremonyVisuals();

    const ceremonyTitle = this.getCeremonyTitle();

    const titleSize = getResponsiveFontSize(layout, 'title');
    this.title = createText(ceremonyTitle, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: titleSize,
      fill: '#fff3a2',
      stroke: '#4c2400',
      strokeThickness: layout.isMobile ? 2 : 3,
      dropShadow: true,
      dropShadowColor: '#ffc94a',
      dropShadowBlur: layout.isMobile ? 4 : 8,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.88, layout),
      lineHeight: Math.round(titleSize * 1.08)
    });
    this.title.anchor.set(0.5);
    this.container.addChild(this.title);

    const scoreSize = getResponsiveFontSize(layout, 'score');
    this.scoreText = createText(this.getScoreResultText(), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: scoreSize,
      fill: '#ffff00'
    });
    this.scoreText.anchor.set(0.5);
    this.container.addChild(this.scoreText);

    this.runSectionBg = new PIXI.Graphics();
    this.runSectionBg.zIndex = 1;
    this.container.addChild(this.runSectionBg);

    const levelSize = layout.isMobile ? 13 : 17;
    this.levelText = createText(this.levelSummary, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: levelSize,
      fill: '#ffffff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.76, layout),
      lineHeight: Math.round(levelSize * 1.18)
    });
    this.levelText.anchor.set(0.5);
    this.levelText.zIndex = 2;
    this.container.addChild(this.levelText);

    const unlockSize = layout.isMobile ? 15 : 18;
    this.unlockText = createText(this.unlockSummary, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: unlockSize,
      fontWeight: 'bold',
      fill: '#9cfbff',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.9, layout),
      lineHeight: Math.round(unlockSize * 1.25)
    });
    this.unlockText.anchor.set(0.5);
    this.container.addChild(this.unlockText);

    this.rankProgressBg = new PIXI.Graphics();
    this.rankProgressBg.zIndex = 1;
    this.container.addChild(this.rankProgressBg);

    this.rankProgressText = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 13 : 16,
      fontWeight: 'bold',
      fill: '#ffeeb0',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.62, layout),
      lineHeight: Math.round((layout.isMobile ? 13 : 16) * 1.28)
    });
    this.rankProgressText.anchor.set(0.5);
    this.rankProgressText.visible = false;
    this.rankProgressText.zIndex = 2;
    this.container.addChild(this.rankProgressText);

    this.shipUnlockProgressBg = new PIXI.Graphics();
    this.shipUnlockProgressBg.zIndex = 1;
    this.container.addChild(this.shipUnlockProgressBg);

    this.shipUnlockProgressText = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 13 : 16,
      fontWeight: 'bold',
      fill: '#9cfbff',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.64, layout),
      lineHeight: Math.round((layout.isMobile ? 13 : 16) * 1.28)
    });
    this.shipUnlockProgressText.anchor.set(0.5);
    this.shipUnlockProgressText.visible = false;
    this.shipUnlockProgressText.zIndex = 2;
    this.container.addChild(this.shipUnlockProgressText);

    this.createShipUnlockReveal(layout);

    this.nextGoalGroup = new PIXI.Container();
    this.nextGoalBg = new PIXI.Graphics();
    this.nextGoalText = createText(this.nextGoal?.text || '', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 14 : 17,
      fontWeight: 'bold',
      fill: '#fff3a2',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.78, layout)
    });
    this.nextGoalText.anchor.set(0.5);
    this.nextGoalGroup.addChild(this.nextGoalBg, this.nextGoalText);
    this.container.addChild(this.nextGoalGroup);

    const bodySize = getResponsiveFontSize(layout, 'body');
    this.comment = createText(this.getCeremonyComment(), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: bodySize,
      fill: '#aaaaaa',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.9, layout),
      lineHeight: Math.round(bodySize * 1.4)
    });
    this.comment.anchor.set(0.5);
    this.container.addChild(this.comment);

    this.createCounterAdviceCard(layout);
    this.container.addChild(this.counterAdviceCard);

    this.leaderboardStatusBg = new PIXI.Graphics();
    this.leaderboardStatusBg.zIndex = 1;
    this.container.addChild(this.leaderboardStatusBg);

    const leaderboardStatusSize = layout.isMobile ? 13 : 16;
    this.leaderboardStatusText = createText(this.getLeaderboardStatusMessage(), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: leaderboardStatusSize,
      fontWeight: 'bold',
      fill: '#9cfbff',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.88, layout),
      lineHeight: Math.round(leaderboardStatusSize * 1.25)
    });
    this.leaderboardStatusText.anchor.set(0.5);
    this.leaderboardStatusText.zIndex = 2;
    this.container.addChild(this.leaderboardStatusText);

    this.notQualifiedText = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 18 : 22,
      fontWeight: 'bold',
      fill: '#8fa6b8',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.86, layout)
    });
    this.notQualifiedText.anchor.set(0.5);
    this.notQualifiedText.visible = false;
    this.container.addChild(this.notQualifiedText);

    const promptSize = layout.isMobile ? 18 : 20;
    const promptText = this.getEntryPromptText(layout);
    this.promptText = createText(promptText, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: promptSize,
      fill: '#00ffff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.85, layout)
    });
    this.promptText.anchor.set(0.5);
    this.promptText.eventMode = 'static';
    this.promptText.cursor = 'pointer';
    this.promptPointer = () => {
      this.setInputDevice('keyboard');
      this.enterInputMode();
    };
    this.promptText.on('pointerdown', this.promptPointer);
    this.container.addChild(this.promptText);

    this.createRetryButton(layout);
    this.container.addChild(this.retryButton);
    this.createLeaderboardButton(layout);
    this.container.addChild(this.leaderboardButton);
    this.createHangarButton(layout);
    this.container.addChild(this.hangarButton);
    this.createMainMenuButton(layout);
    this.container.addChild(this.mainMenuButton);
    this.createRunReportButton(layout);
    this.container.addChild(this.runReportButton);
    this.createRunReportOverlay(layout);
    this.container.addChild(this.runReportOverlay);

    if (!this.isRankedRun) {
      this.promptText.eventMode = 'none';
      this.promptText.cursor = 'default';
      this.promptText.style.fill = '#ffb35c';
      this.promptText.text = this.getUnrankedScoreBlockedText();
      this.submitBlockedReason = this.game.runModeReason || 'unranked_run';
      this.sectorSteamStatus = this.isSectorStartChallengeResult()
        ? (this.leaderboardAdapter.isSteamAvailable() ? 'ready' : 'unavailable')
        : 'idle';
      this.isQualified = false;
      this.localQualified = false;
      this.globalQualified = false;
      this.globalStatus = 'unranked';
      this.canEnterName = false;
      this.cachedHighscores = [];
      this.state = 'unranked';
      this.updateLeaderboardStatusText();
    }

    const nameSize = layout.isMobile ? 22 : 26;
    this.nameDisplay = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: nameSize,
      fill: '#ffffff'
    });
    this.nameDisplay.anchor.set(0.5);
    this.nameDisplay.visible = false;
    this.container.addChild(this.nameDisplay);

    const smallSize = getResponsiveFontSize(layout, 'small');
    const levelVisible = this.levelText?.visible !== false;
    const unlockVisible = this.unlockText?.visible !== false;
    let nextGoalVisible = Boolean(this.nextGoalGroup?.visible);
    let commentVisible = this.comment?.visible !== false;
    const leaderboardStatusVisible = this.leaderboardStatusText?.visible !== false;
    const promptVisible = this.promptText?.visible !== false;
    const nameVisible = this.nameDisplay?.visible !== false;
    this.instructions = createText(this.getInstructionsText(), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: smallSize,
      fill: '#9cfbff',
      stroke: '#031323',
      strokeThickness: 3,
      dropShadow: true,
      dropShadowColor: '#00ffff',
      dropShadowBlur: 5
    });
    this.instructions.anchor.set(0.5);
    this.container.addChild(this.instructions);

    this.createPersonalBestCarryBanner();
    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = addResponsiveListener(() => this.layoutScreen());
    this.layoutScreen();
    this.reportShownAt = Date.now();

    this.updateNameDisplay();
    this.setupKeyboard();

    AudioManager.playSfx('nova_game_over_drop');
    AudioManager.playSfx('boss_phase_surge', { force: true, volume: 0.5, minIntervalMs: 0 });
    this.scheduleSceneTimeout(() => this.playGameOverTaunt(), 360);
    if (this.newlyUnlockedShips.length > 0) {
      AudioManager.playSfx('nova_highscore_chime', { force: true, volume: 0.72, minIntervalMs: 0 });
      this.scheduleSceneTimeout(() => this.playShipUnlockVoice(), 3200);
    }
    AudioManager.playMusicContext('gameover', { resetPlaylist: true });

    if (!this.isRankedRun) {
      console.log(`[GameOver] Unranked run blocked from leaderboard reason=${this.submitBlockedReason}`);
      this.enterRunbackStage('practice');
      if (this.isSectorStartChallengeResult()) {
        this.submitSectorStartSteamScore();
      }
      return;
    }

    if (this.steamSubmissionMode) {
      this.globalStatus = 'submitting';
      this.canEnterName = false;
      this.enterRunbackStage('steam_submitting');
      void this.submitSteamScore();
      return;
    }

    if (this.leaderboardRuntime?.cloud) {
      this.globalQualificationPromise = this.checkGlobalQualification();
    } else {
      this.globalQualified = false;
      this.globalStatus = 'offline';
    }
    this.updateLeaderboardStatusText();
    this.updateQualificationPromptState();
  }

  updateCanEnterName() {
    this.canEnterName = Boolean(!this.steamSubmissionMode && this.isRankedRun && (this.localQualified || this.globalQualified));
    this.isQualified = this.canEnterName;
    return this.canEnterName;
  }

  estimateLocalPlacement() {
    const finalScore = Math.max(0, Math.floor(Number(this.finalScore) || 0));
    if (finalScore <= 0) return null;
    try {
      const scores = LocalLeaderboard.getScores(100);
      const betterScores = Array.isArray(scores)
        ? scores.filter((entry) => Number(entry?.score) > finalScore).length
        : 0;
      return Math.max(1, betterScores + 1);
    } catch {
      return null;
    }
  }

  rememberLocalPlacement(placement, source = 'local') {
    const rank = getValidPlacementNumber(placement);
    if (!rank) return null;
    this.localPlacement = rank;
    this.localPlacementSource = source;
    return rank;
  }

  getCurrentLeaderboardResult() {
    const isCurrentRunResult = (result) => {
      if (!result) return false;
      if (result.submissionId && this.submissionId) return result.submissionId === this.submissionId;
      const resultScore = Number(result.score);
      return Number.isFinite(resultScore)
        ? Math.floor(resultScore) === Math.floor(Number(this.finalScore) || 0)
        : false;
    };
    if (isCurrentRunResult(this.leaderboardResult)) return this.leaderboardResult;
    const result = this.game?.lastLeaderboardResult || null;
    if (!isCurrentRunResult(result)) return null;
    return result;
  }

  getLocalPlacementRank() {
    const result = this.getCurrentLeaderboardResult();
    return getValidPlacementNumber(result?.localPlacement)
      || getValidPlacementNumber(result?.localRank)
      || getValidPlacementNumber(this.localPlacement)
      || (this.localQualified ? this.rememberLocalPlacement(this.estimateLocalPlacement(), 'preview') : null);
  }

  getVisibleLocalPlacementRank() {
    const rank = this.getLocalPlacementRank();
    return rank && rank <= LEADERBOARD_DISPLAY_LIMIT ? rank : null;
  }

  formatScoreNumber(value) {
    return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
  }

  formatElapsedTime(seconds) {
    const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(totalSeconds / 60);
    const remainder = totalSeconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  }

  normalizeNextGoalLine(text = '') {
    const cleaned = String(text || '')
      .replace(/^NEXT\s+CAREER\s+GOAL:\s*/i, '')
      .replace(/^NEXT\s+GOAL:\s*/i, '')
      .replace(/^BEAT\s+YOUR\s+BEST:\s*/i, 'Beat your best: ')
      .replace(/^GLOBAL\s+SLOT:\s*/i, 'Global slot: ')
      .replace(/^TOP\s+THREE:\s*/i, 'Top three: ')
      .replace(/^NUMBER\s+ONE:\s*/i, 'Number one: ')
      .trim();
    if (!cleaned) return 'Next goal: Climb one global rank';
    const readable = cleaned
      .toLowerCase()
      .replace(/\bxp\b/g, 'XP')
      .replace(/\b\d+\b/g, (match) => match)
      .replace(/(^|[.:]\s+)([a-z])/g, (_, prefix, char) => `${prefix}${char.toUpperCase()}`);
    return `Next goal: ${readable}`;
  }

  getSteamPreviousBestScore(result = this.getCurrentLeaderboardResult()) {
    const candidates = [
      result?.steamPreviousBestScore,
      result?.steamPreviousBest?.score,
      result?.steamPreviousBest?.m_nScore,
      this.previousSteamBestScore
    ];
    for (const value of candidates) {
      const score = Math.max(0, Math.floor(Number(value) || 0));
      if (score > 0) return score;
    }
    return 0;
  }

  isSteamBestUnchangedResult(result = this.getCurrentLeaderboardResult()) {
    if (!this.steamSubmissionMode && result?.globalProvider !== 'steam') return false;
    const previousBestScore = this.getSteamPreviousBestScore(result);
    return Boolean(
      this.steamBestUnchanged ||
      result?.steamBestUnchanged ||
      (previousBestScore > 0 && this.finalScore <= previousBestScore && (result?.steamStatus === 'submitted' || result?.globalStatus === 'submitted'))
    );
  }

  clearGlobalPlacement(status = this.globalStatus) {
    this.globalPlacement = null;
    this.globalPlacementTier = 'none';
    this.globalQualified = false;
    if (status) this.globalStatus = status;
    this.updateLeaderboardStatusText();
    this.updateCeremonyPresentation();
  }

  getGlobalPlacementRank() {
    const result = this.getCurrentLeaderboardResult();
    if (this.isSteamBestUnchangedResult(result)) return null;
    const scenePlacement = this.globalPlacement?.qualified
      ? getValidPlacementNumber(this.globalPlacement?.placement)
      : null;
    return scenePlacement
      || (result?.globalStatus === 'submitted' ? getValidPlacementNumber(result?.confirmedGlobalPlacement?.placement) : null)
      || (result?.globalStatus === 'submitted' ? getValidPlacementNumber(result?.globalPlacement?.placement) : null)
      || (result?.globalStatus === 'submitted' ? getValidPlacementNumber(result?.globalRank) : null)
      || (result?.globalStatus === 'submitted' ? getValidPlacementNumber(result?.steamRank) : null);
  }

  isSectorStartChallengeResult() {
    return !this.isRankedRun && this.game?.runMode === RUN_MODES.SECTOR_START;
  }

  isDailySignalResult() {
    return this.game?.runSummary?.runMode === RUN_MODES.DAILY_SIGNAL || this.game?.runMode === RUN_MODES.DAILY_SIGNAL;
  }

  isOverrunResult() {
    return isOverrunRunMode(this.game?.runSummary?.runMode || this.game?.runMode);
  }

  isResultActionStage() {
    return this.state === 'runback' || this.state === 'submitted' || this.state === 'skipped' || this.state === 'unranked';
  }

  getLocalPlacementLine() {
    if (this.isDailySignalResult()) {
      return this.getDailySignalResultLines()[0] || translateText('DAILY SIGNAL // LOCAL RECORD');
    }
    if (this.isSectorStartChallengeResult()) {
      return this.getSectorStartChallengeRecordLine() || translateText('SECTOR RUN');
    }
    if (this.isOverrunResult()) {
      return translateText('OVERRUN // CAREER PROGRESS ACTIVE');
    }
    if (!this.isRankedRun && this.game?.runMode === RUN_MODES.SCOUT) {
      return this.getScoutRunBestLine() || translateText('Local: Scout practice score only');
    }
    if (!this.isRankedRun) return translateText('Local: Scout practice score only');
    const rank = this.getVisibleLocalPlacementRank();
    const rawRank = this.getLocalPlacementRank();
    const result = this.getCurrentLeaderboardResult();
    if (rank && (this.localQualified || result?.localStatus === 'saved' || this.steamSubmissionMode)) {
      return `Local: #${rank}`;
    }
    if (rawRank && rawRank > LEADERBOARD_DISPLAY_LIMIT && (this.localQualified || result?.localStatus === 'saved' || this.steamSubmissionMode)) {
      return `Local: Not in local top ${LEADERBOARD_DISPLAY_LIMIT}`;
    }
    if (this.finalScore <= 0) return 'Local: No score';
    if (this.localQualified) return 'Local: Qualified';
    if (this.steamSubmissionMode) return 'Local: Backup ready';
    return `Local: Need ${Math.max(1, this.leaderboardAdapter.getLocalCutoff() + 1).toLocaleString('en-US')}`;
  }

  getGlobalPlacementLine() {
    if (this.isDailySignalResult()) return translateText('PUBLIC DAILY BOARD: NOT ENABLED');
    if (this.isSectorStartChallengeResult()) return this.getSectorStartChallengeReachedLine();
    if (this.isOverrunResult()) return translateText('LEADERBOARD: DISABLED FOR OVERRUN');
    if (!this.isRankedRun) return translateText('Global: Scout unranked - no submission');
    if (this.steamSubmissionMode) return this.getSteamPlacementLine();
    const rank = this.getGlobalPlacementRank();
    if (rank) {
      return `Global: #${rank}`;
    }
    if (this.globalPlacement?.nearGlobal) {
      return `Global: Close - need ${this.globalPlacement.scoreToGlobal.toLocaleString('en-US')}`;
    }
    if (this.globalStatus === 'submitted') return 'Global: Score submitted';
    return {
      idle: 'Global: Idle',
      steam_ready: 'Global: Idle',
      checking: 'Global: Checking...',
      qualified: 'Global: Qualified',
      missed: 'Global: No slot',
      offline: translateText('Steam leaderboard unavailable. Local score is saved.'),
      submitting: 'Global: Submitting...',
      failed: translateText('Steam leaderboard unavailable. Local score is saved.'),
      unranked: 'Global: Practice run'
    }[this.globalStatus] || `Global: ${String(this.globalStatus || 'unknown')}`;
  }

  getSteamPlacementLine() {
    const result = this.getCurrentLeaderboardResult();
    if (this.isSteamBestUnchangedResult(result) || this.globalStatus === 'steam_best_unchanged') {
      const best = this.getSteamPreviousBestScore(result);
      return best > 0
        ? `Steam: Best unchanged\nBest: ${this.formatScoreNumber(best)} | This run: ${this.formatScoreNumber(this.finalScore)}`
        : 'Steam: Best unchanged';
    }
    const rank = this.getGlobalPlacementRank();
    if (rank) {
      return result?.steamStatus === 'submitted' || this.globalStatus === 'submitted'
        ? `New Steam best: #${rank}`
        : `Steam: #${rank}`;
    }
    if (this.globalStatus === 'submitting') return 'Steam: Rank updating...';
    if (this.globalStatus === 'failed' || result?.steamStatus === 'failed') return 'Steam: Unavailable - local backup saved';
    if (result?.steamStatus === 'submitted' || this.globalStatus === 'submitted') return 'Steam: Score submitted';
    if (this.globalStatus === 'steam_ready' || this.globalStatus === 'idle') return 'Steam: Ready';
    return `Steam: ${String(this.globalStatus || 'unknown')}`;
  }

  getLeaderboardPlacementLines() {
    if (this.isDailySignalResult()) {
      return this.getDailySignalResultLines();
    }
    if (this.isSectorStartChallengeResult()) {
      return this.getSectorStartChallengeResultLines();
    }
    if (this.isOverrunResult()) {
      const summary = this.game?.runSummary || {};
      const gained = Math.max(0, Math.floor(Number(summary.pilotXpGained) || 0));
      const best = summary.overrunRunBest || summary.overrunRunAttempt || null;
      return [
        translateText('OVERRUN // SECTOR {sector}', {
          sector: Math.max(51, Math.floor(Number(summary.sectorReached || summary.levelReached || this.finalLevel || 51) || 51))
        }),
        [
          summary.overrunRunNewBest ? translateText('NEW PERSONAL BEST') : translateText('PERSONAL BEST'),
          this.formatScoreNumber(best?.score || this.finalScore)
        ].join(' · '),
        translateText('CAREER XP +{xp}', { xp: gained.toLocaleString('en-US') }),
        translateText('LEADERBOARDS / ACHIEVEMENTS / CHECKPOINTS OFF')
      ];
    }
    if (!this.isRankedRun && this.game?.runMode === RUN_MODES.SCOUT) {
      return this.getScoutRunResultLines();
    }
    return [
      this.getLocalPlacementLine(),
      this.getGlobalPlacementLine()
    ];
  }

  getUnrankedScoreBlockedText() {
    return this.isDailySignalResult()
      ? translateText('DAILY SIGNAL - LOCAL UTC CHALLENGE - NO PUBLIC SUBMISSION')
      : this.game?.runMode === RUN_MODES.SECTOR_START
      ? translateText('SECTOR RUN - MAIN SCORE NOT LOGGED - NO ACHIEVEMENTS')
      : this.isOverrunResult()
      ? translateText('OVERRUN - CAREER ACTIVE - NO LEADERBOARD')
      : translateText('SCOUT RUN - UNRANKED LOCAL SCORE ONLY');
  }

  getDailySignalResultLines() {
    const summary = this.game?.runSummary || {};
    const contract = summary.dailySignalContract || this.game?.dailySignalContract || {};
    const attempt = summary.dailySignalAttempt || null;
    const bestAttempt = summary.dailySignalBestAttempt || (!summary.dailySignalBest?.runCleared ? summary.dailySignalBest : null);
    const bestClear = summary.dailySignalBestClear || (summary.dailySignalBest?.runCleared ? summary.dailySignalBest : null);
    const flightLog = summary.dailySignalFlightLog || null;
    const reached = Math.max(1, Math.floor(Number(summary.sectorReached || summary.levelReached || this.finalLevel || 1) || 1));
    const lines = [];
    if (summary.runCleared) {
      if (bestClear) {
        const bestClearLine = summary.dailySignalNewClearBest
          ? translateText('NEW BEST CLEAR: {score}', { score: this.formatScoreNumber(bestClear.score) })
          : translateText('BEST CLEAR: {score}', { score: this.formatScoreNumber(bestClear.score) });
        lines.push(`${bestClearLine} // ${translateText('TIME')} ${this.formatElapsedTime(bestClear.runElapsedSeconds)}`);
      }
      lines.push(`${translateText('THIS RUN: {score}', { score: this.formatScoreNumber(this.finalScore || summary.score || 0) })} // ${translateText('TIME')} ${this.formatElapsedTime(attempt?.runElapsedSeconds ?? summary.runElapsedSeconds)}`);
      lines.push(translateText('CONTRACT CLEARED // SECTOR {sector}', { sector: contract.finishSector || reached }));
    } else {
      if (bestAttempt) {
        const bestAttemptSector = Math.max(1, Math.floor(Number(bestAttempt.sectorReached) || 1));
        const bestAttemptLine = summary.dailySignalNewAttemptBest
          ? translateText('NEW BEST ATTEMPT: S{sector} // {score}', {
            sector: bestAttemptSector,
            score: this.formatScoreNumber(bestAttempt.score)
          })
          : translateText('BEST ATTEMPT: S{sector} // {score}', {
            sector: bestAttemptSector,
            score: this.formatScoreNumber(bestAttempt.score)
          });
        lines.push(`${bestAttemptLine} // ${translateText('TIME')} ${this.formatElapsedTime(bestAttempt.runElapsedSeconds)}`);
      }
      lines.push(`${translateText('THIS RUN: S{sector} // {score}', {
        sector: reached,
        score: this.formatScoreNumber(this.finalScore || summary.score || 0)
      })} // ${translateText('TIME')} ${this.formatElapsedTime(attempt?.runElapsedSeconds ?? summary.runElapsedSeconds)}`);
      lines.push(translateText('NEXT GOAL: CLEAR SECTOR {sector}', { sector: contract.finishSector || 10 }));
    }
    if (flightLog) {
      lines.push(translateText('7-DAY FLIGHT LOG // {signals} // {clears}/7 CLEARED', {
        signals: formatDailySignalFlightLogSymbols(flightLog),
        clears: flightLog.clears
      }));
    }
    lines.push(translateText('LOCAL UTC RECORD // NO PUBLIC SUBMISSION'));
    if (!summary.dailySignalContractValid) {
      lines.push(translateText('PRACTICE RESULT // CONTRACT VALIDITY FAILED'));
    }
    if (summary.dailySignalRecordSaveFailed) {
      lines.push(translateText('LOCAL RECORD SAVE FAILED // THIS RUN WAS NOT STORED'));
    }
    return lines;
  }

  getScoutRunBestLine() {
    const summary = this.game?.runSummary || {};
    const best = summary.scoutRunBest || summary.scoutRunAttempt || null;
    if (!best) return null;
    return translateText('Scout Best: {score}', { score: this.formatScoreNumber(best.score) });
  }

  getScoutRunResultLines() {
    const summary = this.game?.runSummary || {};
    const best = summary.scoutRunBest || summary.scoutRunAttempt || null;
    const lines = [
      translateText('Unranked practice'),
      translateText('Scout Best: {score}', { score: this.formatScoreNumber(best?.score || 0) }),
      translateText('This Run: {score}', { score: this.formatScoreNumber(this.finalScore || summary.score || 0) }),
      translateText('No leaderboard submission')
    ];
    if (summary.scoutRunNewBest) lines.splice(1, 0, translateText('New Scout Best'));
    return lines;
  }

  getSectorStartChallengeRecordLine() {
    const summary = this.game?.runSummary || {};
    const record = summary.sectorStartChallengeBest || summary.sectorStartChallengeAttempt || null;
    const checkpoint = record?.startSector || summary.sectorStartCheckpoint || this.game?.sectorStartCheckpoint || null;
    if (!record || !checkpoint) return null;
    const label = summary.sectorStartChallengeNewBest
      ? 'NEW SECTOR {sector} BEST: {score}'
      : 'SECTOR {sector} BEST: {score}';
    return translateText(label, {
      sector: checkpoint,
      score: this.formatScoreNumber(record.scoreEarned)
    });
  }

  getSectorStartChallengeReachedLine() {
    const summary = this.game?.runSummary || {};
    const record = summary.sectorStartChallengeBest || summary.sectorStartChallengeAttempt || null;
    const checkpoint = record?.startSector || summary.sectorStartCheckpoint || this.game?.sectorStartCheckpoint || null;
    const reached = Math.max(
      1,
      Math.floor(Number(record?.highestSectorReached || summary.sectorReached || summary.levelReached || this.finalLevel || checkpoint || 1) || 1)
    );
    return translateText('REACHED SECTOR {sector}', { sector: reached });
  }

  getCurrentSectorLeaderboardResult() {
    return this.sectorLeaderboardResult || this.game?.lastSectorLeaderboardResult || null;
  }

  getSectorSteamLine() {
    if (!this.isSectorStartChallengeResult()) return null;
    const result = this.getCurrentSectorLeaderboardResult();
    const status = this.sectorSteamStatus || result?.sectorSteamStatus || 'idle';
    const rank = getValidPlacementNumber(this.sectorSteamRank || result?.sectorSteamRank);
    if (!this.leaderboardAdapter?.isSteamAvailable?.() && status !== 'submitted' && status !== 'best_unchanged') {
      return translateText('STEAM SECTOR: OFFLINE');
    }
    if (status === 'submitting') return translateText('STEAM SECTOR: SUBMITTING...');
    if (status === 'submitted') {
      return rank
        ? translateText('STEAM SECTOR: #{rank}', { rank })
        : translateText('STEAM SECTOR: SUBMITTED');
    }
    if (status === 'best_unchanged') return translateText('STEAM SECTOR: BEST UNCHANGED');
    if (status === 'failed') return translateText('STEAM SECTOR: UNAVAILABLE');
    if (status === 'skipped') return translateText('STEAM SECTOR: NO SCORE');
    return translateText('STEAM SECTOR: READY');
  }

  getSectorStartChallengeResultLines() {
    return [
      this.getSectorStartChallengeRecordLine() || translateText('SECTOR RUN'),
      this.getSectorStartChallengeReachedLine(),
      this.getSectorSteamLine(),
      translateText('UNRANKED SECTOR RUN | NO ACHIEVEMENTS')
    ].filter(Boolean);
  }

  isSceneActive() {
    return this.game?.currentScene === this;
  }

  setInputDevice(device) {
    if (device !== 'controller' && device !== 'keyboard') return;
    if (this.lastInputDevice === device) return;
    this.lastInputDevice = device;
    this.updateInputPrompts();
  }

  updateInputPrompts() {
    const layout = getCurrentLayout();
    if (this.promptText) {
      if (this.state === 'prompt') {
        this.promptText.text = this.getEntryPromptText(layout);
      } else if (this.state === 'input') {
        this.promptText.text = this.lastInputDevice === 'controller'
          ? 'PICK PILOT INITIALS'
          : INPUT_PROMPT;
      }
    }
    if (this.instructions) {
      this.instructions.text = this.getInstructionsText();
    }
    this.updateNameDisplay();
    this.refreshPrimaryCta();
  }

  getInstructionsText() {
    if (this.lastInputDevice === 'controller') {
      if (this.state === 'input') {
        return 'D-PAD/STICK: LETTER  |  LB/RB: SLOT  |  A/Y: SUBMIT  |  B: BACK';
      }
      if (this.state === 'submitted_hold') {
        return 'SCORE SUBMITTED...';
      }
      if (this.state === 'result_hold') {
        return 'PLACEMENT READY...';
      }
      if (this.state === 'runback' || this.state === 'submitted' || this.state === 'skipped' || this.state === 'unranked') {
        if (this.shouldShowMainMenuButton()) {
          if (this.shouldShowLeaderboardButton()) {
            return this.shouldShowHangarButton()
              ? translateText('A: RELAUNCH  |  Y: SECTOR BOARD  |  X: HANGAR  |  B/START: MENU')
              : translateText('A: RELAUNCH  |  Y: SECTOR BOARD  |  B/START: MENU');
          }
          return this.shouldShowHangarButton()
            ? translateText('A: RELAUNCH  |  X: HANGAR  |  B/START: MENU')
            : translateText('A: RELAUNCH  |  B/START: MENU');
        }
        return 'A: RELAUNCH  |  Y: LEADERBOARD  |  B/START: MENU';
      }
      if (this.state === 'submitting') {
        return 'SAVING SCORE...';
      }
      if (this.isRankedRun && this.updateCanEnterName()) {
        return 'A: PICK PILOT NAME  |  B: SKIP SCORE';
      }
      return 'A: RELAUNCH  |  B/START: MENU';
    }

    if (this.state === 'input') {
      return 'TYPE NAME  |  ENTER: SUBMIT  |  ESC: SKIP SCORE';
    }
    if (this.state === 'submitting') {
      return this.steamSubmissionMode ? 'AUTO-SUBMITTING WITH STEAM NAME' : 'SAVING SCORE...';
    }
    if (this.state === 'submitted_hold') {
      return 'SCORE SUBMITTED...';
    }
    if (this.state === 'result_hold') {
      return 'PLACEMENT READY...';
    }
    if (this.state === 'runback' || this.state === 'submitted' || this.state === 'skipped' || this.state === 'unranked') {
      if (this.shouldShowMainMenuButton()) {
        if (this.shouldShowLeaderboardButton()) {
          return this.shouldShowHangarButton()
            ? translateText('ENTER / SPACE / CLICK: RELAUNCH  |  L: SECTOR BOARD  |  H: HANGAR  |  ESC: MAIN MENU')
            : translateText('ENTER / SPACE / CLICK: RELAUNCH  |  L: SECTOR BOARD  |  ESC: MAIN MENU');
        }
        return this.shouldShowHangarButton()
          ? translateText('ENTER / SPACE / CLICK: RELAUNCH  |  H: HANGAR  |  ESC: MAIN MENU')
          : translateText('ENTER / SPACE / CLICK: RELAUNCH  |  ESC: MAIN MENU');
      }
      return this.shouldShowHangarButton()
        ? 'ENTER / SPACE / CLICK: RELAUNCH  |  L: LEADERBOARD  |  H: HANGAR  |  ESC: MENU'
        : 'ENTER / SPACE / CLICK: RELAUNCH  |  L / GAMEPAD Y: LEADERBOARD  |  ESC: MENU';
    }
    return 'LEADERBOARD FIRST: ENTER / CLICK  |  ESC: SKIP SCORE';
  }

  getEntryPromptText(layout = getCurrentLayout()) {
    const mobile = Boolean(layout?.isMobile);
    if (!this.isRankedRun) return this.getUnrankedScoreBlockedText();
    if (this.steamSubmissionMode) {
      if (this.globalStatus === 'steam_best_unchanged') return 'STEAM BEST UNCHANGED';
      if (this.globalStatus === 'submitted') return 'SCORE SUBMITTED WITH STEAM NAME';
      if (this.globalStatus === 'failed') return 'STEAM SUBMIT FAILED - LOCAL BACKUP SAVED';
      return 'AUTO-SUBMITTING WITH STEAM NAME';
    }
    if (!this.updateCanEnterName()) {
      return this.globalStatus === 'checking'
        ? 'CHECKING GLOBAL BOARD...'
        : 'NO BOARD SLOT';
    }
    if (this.lastInputDevice === 'controller') {
      if (this.localQualified && this.globalQualified) return 'A: PICK PILOT INITIALS  |  LOCAL + GLOBAL SLOT';
      if (this.globalQualified) return 'A: PICK PILOT INITIALS  |  GLOBAL SLOT';
      return 'A: PICK PILOT INITIALS  |  LOCAL SLOT';
    }
    if (mobile) {
      if (this.localQualified && this.globalQualified) return 'TAP SCORE  |  LOCAL + GLOBAL SLOT';
      if (this.globalQualified) return 'TAP SCORE  |  GLOBAL SLOT';
      return 'TAP SCORE  |  LOCAL SLOT';
    }
    if (this.localQualified && this.globalQualified) {
      return 'ENTER: LOG LOCAL + GLOBAL SCORE';
    }
    if (this.globalQualified) {
      return 'ENTER: LOG GLOBAL SCORE';
    }
    return 'ENTER: LOG LOCAL SCORE';
  }

  sanitizeControllerName(value) {
    return String(value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, CONTROLLER_INITIALS_LENGTH);
  }

  getControllerDefaultName() {
    let stored = '';
    try {
      stored = localStorage.getItem(CONTROLLER_NAME_STORAGE_KEY) || '';
    } catch {
      stored = '';
    }
    const fromStored = this.sanitizeControllerName(stored);
    if (fromStored.length === CONTROLLER_INITIALS_LENGTH) return fromStored;

    const fromSteam = this.sanitizeControllerName(this.steamPlayerName);
    if (fromSteam.length > 0) {
      return (fromSteam + 'ACE').slice(0, CONTROLLER_INITIALS_LENGTH);
    }
    return 'ACE';
  }

  storeControllerName(name) {
    const sanitized = this.sanitizeControllerName(name);
    if (sanitized.length !== CONTROLLER_INITIALS_LENGTH) return;
    try {
      localStorage.setItem(CONTROLLER_NAME_STORAGE_KEY, sanitized);
    } catch {
      // Best-effort convenience only; score submission should continue.
    }
  }

  formatControllerNameDisplay() {
    const chars = (this.sanitizeControllerName(this.nameInput) + 'ACE').slice(0, CONTROLLER_INITIALS_LENGTH).split('');
    return `PILOT: ${chars.map((char, index) => (index === this.controllerNameCursor ? `[${char}]` : ` ${char} `)).join(' ')}`;
  }

  moveControllerNameCursor(delta) {
    const next = (this.controllerNameCursor + delta + CONTROLLER_INITIALS_LENGTH) % CONTROLLER_INITIALS_LENGTH;
    this.controllerNameCursor = next;
    this.updateNameDisplay();
  }

  cycleControllerNameChar(delta) {
    const chars = (this.sanitizeControllerName(this.nameInput) + 'ACE').slice(0, CONTROLLER_INITIALS_LENGTH).split('');
    const current = chars[this.controllerNameCursor] || 'A';
    const alphabetIndex = Math.max(0, this.controllerNameAlphabet.indexOf(current));
    const nextIndex = (alphabetIndex + delta + this.controllerNameAlphabet.length) % this.controllerNameAlphabet.length;
    chars[this.controllerNameCursor] = this.controllerNameAlphabet[nextIndex];
    this.nameInput = chars.join('');
    this.syncHiddenInput();
    this.updateNameDisplay();
  }

  getLeaderboardStatusMessage() {
    return this.getLeaderboardPlacementLines()
      .filter(Boolean)
      .map((line) => translateText(line))
      .join('\n');
  }

  getHoldStatusText(reason = this.pendingRunbackReason) {
    if (this.state === 'submitting' || this.globalStatus === 'submitting') return 'Steam: Rank updating...';
    if (reason === 'global_failed' || this.globalStatus === 'failed') return 'Steam: Unavailable - local backup saved';
    if (reason === 'steam_best_unchanged' || this.isSteamBestUnchangedResult()) return this.getSteamPlacementLine();
    if (reason === 'offline_no_slot') return translateText('Steam leaderboard unavailable. Local score is saved.');
    if (reason === 'no_slot') return this.getLeaderboardStatusMessage();
    return this.getGlobalPlacementLine();
  }

  getRunbackRunSummaryText() {
    const summary = this.game?.runSummary || {};
    const elapsedSeconds = Math.max(0, Math.floor(Number(summary.runElapsedSeconds) || 0));
    if (this.isDailySignalResult()) {
      const contract = summary.dailySignalContract || {};
      return [
        translateText('DAILY SIGNAL // {date}', { date: contract.dailyKey || 'UTC' }),
        `${translateText('LOANER')}: ${contract.loanerShipName || summary.shipName || ''}`,
        `${translateText('SECTOR')} ${this.finalLevel || 1} | ${this.formatElapsedTime(elapsedSeconds)}`
      ].filter(Boolean).join('\n');
    }
    if (this.isSectorStartChallengeResult()) {
      const checkpoint = summary.sectorStartCheckpoint || this.game?.sectorStartCheckpoint || this.finalLevel || 1;
      return [
        translateText('SECTOR {sector} RUN', { sector: checkpoint }),
        this.formatElapsedTime(elapsedSeconds)
      ].filter(Boolean).join('\n');
    }
    if (!this.isRankedRun && this.game?.runMode === RUN_MODES.SCOUT) {
      return [
        translateText('SCOUT RUN') + ` | ${this.formatElapsedTime(elapsedSeconds)} | Level ${this.finalLevel || 1}`,
        translateText('NO CAREER XP')
      ].join('\n');
    }
    const gained = Math.max(0, Math.floor(Number(summary.pilotXpGained) || 0));
    if (this.isOverrunResult()) {
      return [
        translateText('OVERRUN // SECTOR {sector}', { sector: this.finalLevel || 51 }),
        `${this.formatElapsedTime(elapsedSeconds)} | ${translateText('CAREER XP +{xp}', { xp: gained.toLocaleString('en-US') })}`
      ].join('\n');
    }
    return [
      `Sector ${this.finalLevel || 1} | ${this.formatElapsedTime(elapsedSeconds)} | Level ${this.finalLevel || 1}`,
      `XP +${gained.toLocaleString('en-US')}`
    ].join('\n');
  }

  createRunbackProgressSummary(currentProgress = this.currentProgressForResult || {}) {
    return [
      this.createRunbackRankProgressSummary(currentProgress),
      this.createRunbackShipProgressSummary(currentProgress)
    ].filter(Boolean).join('\n');
  }

  createRunbackRankProgressSummary(currentProgress = this.currentProgressForResult || {}) {
    if (this.isDailySignalResult()) return translateText('DAILY SIGNAL: NO CAREER XP OR RANKED PROGRESS');
    if (this.isSectorStartChallengeResult()) return '';
    if (!this.isRankedRun && this.game?.runMode === RUN_MODES.SCOUT) {
      return translateText('SCOUT RUN: NO CAREER XP OR RANKED PROGRESS');
    }
    const rankProgress = getPilotRankProgress(currentProgress.pilotXp || 0);
    if (rankProgress.rankIndex >= MAX_RANK_INDEX || rankProgress.progress >= 1) {
      return `${translateText('NEXT RANK')}: ${getRankTitle(MAX_RANK_INDEX)}  |  ${translateText('XP TO NEXT')}: 0`;
    }
    const nextTitle = getRankTitle(Math.min(MAX_RANK_INDEX, rankProgress.rankIndex + 1));
    return `${translateText('NEXT RANK')}: ${nextTitle}  |  ${translateText('XP TO NEXT')}: ${Number(rankProgress.xpToNextRank || 0).toLocaleString('en-US')}`;
  }

  createRunbackShipProgressSummary(currentProgress = this.currentProgressForResult || {}) {
    if (this.isDailySignalResult()) return '';
    if (this.isSectorStartChallengeResult()) return '';
    if (!this.isRankedRun && this.game?.runMode === RUN_MODES.SCOUT) return '';
    return this.createShipUnlockProgressLines(currentProgress, {
      newlyUnlocked: this.newlyUnlockedShips || []
    }).filter(Boolean).join('\n');
  }

  getRunbackProgressText() {
    return this.runbackProgressSummary || this.createRunbackProgressSummary();
  }

  getRunbackLeaderboardText() {
    return this.getLeaderboardPlacementLines().join('\n');
  }

  getRunbackNextGoalText() {
    if (this.isDailySignalResult()) {
      const summary = this.game?.runSummary || {};
      return summary.runCleared
        ? translateText('NEXT GOAL: BEAT BEST CLEAR')
        : translateText('NEXT GOAL: CLEAR SECTOR {sector}', { sector: summary.dailySignalContract?.finishSector || 10 });
    }
    if (this.isSectorStartChallengeResult()) return '';
    if (this.isOverrunResult()) return translateText('NEXT GOAL: PUSH ONE SECTOR DEEPER');
    const rivalGoal = this.getGlobalRivalNextGoalText();
    if (rivalGoal) return rivalGoal;
    const rank = this.getGlobalPlacementRank();
    if (rank && rank > 1) return 'Next goal: Climb one global rank';
    if (rank === 1) return 'Next goal: Defend #1';
    return this.normalizeNextGoalLine(this.nextGoal?.text || '');
  }

  getFinalResultScreenLines() {
    return {
      title: this.getRunbackTitle(),
      score: this.getScoreResultText(),
      runSummary: this.getRunbackRunSummaryText(),
      rankProgress: this.createRunbackRankProgressSummary(this.currentProgressForResult || {}),
      shipProgress: this.createRunbackShipProgressSummary(this.currentProgressForResult || {}),
      progress: this.getRunbackProgressText(),
      leaderboard: this.getRunbackLeaderboardText(),
      nextGoal: this.getRunbackNextGoalText()
    };
  }

  getScoreResultText() {
    return translateText('SCORE') + ': ' + this.formatScoreNumber(this.finalScore);
  }

  syncResultStagePresentation() {
    if (!this.title || !this.scoreText) return;
    this.scoreText.text = this.getScoreResultText();

    const holdStage = this.state === 'submitted_hold' || this.state === 'result_hold' || this.state === 'submitting';
    if (holdStage) {
      this.title.text = translateText(this.state === 'submitting' ? 'SAVING SCORE' : 'SCORE STATUS');
      this.scoreText.visible = false;
      if (this.levelText) this.levelText.visible = false;
      if (this.unlockText) this.unlockText.visible = false;
      if (this.rankProgressText) this.rankProgressText.visible = false;
      if (this.shipUnlockProgressText) this.shipUnlockProgressText.visible = false;
      if (this.shipUnlockReveal) this.shipUnlockReveal.visible = false;
      if (this.nextGoalGroup) this.nextGoalGroup.visible = false;
      if (this.comment) {
        this.comment.text = '';
        this.comment.visible = false;
      }
      if (this.counterAdviceCard) this.counterAdviceCard.visible = false;
      if (this.leaderboardStatusText) {
        this.leaderboardStatusText.text = this.getHoldStatusText();
        this.leaderboardStatusText.visible = true;
      }
      if (this.promptText) {
        this.promptText.text = '';
        this.promptText.visible = false;
      }
      if (this.nameDisplay) this.nameDisplay.visible = false;
      if (this.notQualifiedText) this.notQualifiedText.visible = false;
      if (this.instructions) this.instructions.visible = false;
      return;
    }

    if (this.state !== 'runback') return;
    const finalLines = this.getFinalResultScreenLines();
    this.title.text = finalLines.title;
    this.scoreText.visible = true;
    if (this.levelText) {
      this.levelText.text = finalLines.runSummary;
      this.levelText.visible = true;
    }
    if (this.unlockText) {
      this.unlockText.text = finalLines.progress;
      this.unlockText.visible = false;
    }
    if (this.rankProgressText) {
      this.rankProgressText.text = finalLines.rankProgress;
      this.rankProgressText.visible = Boolean(finalLines.rankProgress);
    }
    if (this.shipUnlockProgressText) {
      this.shipUnlockProgressText.text = finalLines.shipProgress;
      this.shipUnlockProgressText.visible = Boolean(finalLines.shipProgress);
    }
    if (this.shipUnlockReveal) this.shipUnlockReveal.visible = this.newlyUnlockedShips.length > 0;
    if (this.comment) {
      this.comment.text = finalLines.leaderboard;
      this.comment.visible = true;
    }
    if (this.counterAdviceCard) this.counterAdviceCard.visible = this.shouldShowCounterAdviceCard();
    if (this.nextGoal) this.nextGoal = { text: finalLines.nextGoal, tone: 'leaderboard' };
    if (this.nextGoalText) this.nextGoalText.text = finalLines.nextGoal;
    if (this.nextGoalGroup) this.nextGoalGroup.visible = Boolean(finalLines.nextGoal);
    if (this.leaderboardStatusText) {
      this.leaderboardStatusText.text = finalLines.leaderboard;
      this.leaderboardStatusText.visible = false;
    }
    if (this.promptText) {
      this.promptText.text = '';
      this.promptText.visible = false;
      this.promptText.eventMode = 'none';
      this.promptText.cursor = 'default';
    }
    if (this.notQualifiedText) this.notQualifiedText.visible = false;
    if (this.nameDisplay) this.nameDisplay.visible = false;
    if (this.instructions) this.instructions.visible = false;
  }

  updateLeaderboardStatusText() {
    if (!this.leaderboardStatusText) return;
    if (this.state === 'submitted_hold' || this.state === 'result_hold' || this.state === 'submitting' || this.state === 'runback') {
      this.syncResultStagePresentation();
      return;
    }
    this.leaderboardStatusText.text = this.getLeaderboardStatusMessage();
    if (this.globalQualified) {
      this.leaderboardStatusText.style.fill = '#ffe86a';
    } else if (this.globalPlacement?.nearGlobal || this.globalPlacement?.nearTop10 || this.globalPlacement?.nearTop3 || this.globalPlacement?.nearNumberOne) {
      this.leaderboardStatusText.style.fill = '#ffcf7a';
    } else if (this.localQualified) {
      this.leaderboardStatusText.style.fill = '#9cfbff';
    } else if (this.globalStatus === 'offline' || this.globalStatus === 'failed') {
      this.leaderboardStatusText.style.fill = '#ffb35c';
    } else {
      this.leaderboardStatusText.style.fill = '#8fa6b8';
    }
  }

  getCeremonyTitle() {
    if (this.isDailySignalResult()) {
      return translateText(this.game?.runSummary?.runCleared ? 'DAILY SIGNAL CLEARED' : 'DAILY SIGNAL ENDED');
    }
    if (this.isOverrunResult()) return translateText('OVERRUN COMPLETE');
    if (!this.isRankedRun && this.game?.runMode === RUN_MODES.SECTOR_START) return translateText('SECTOR RUN');
    if (!this.isRankedRun && this.game?.runMode === RUN_MODES.SCOUT) return translateText('SCOUT RUN COMPLETE');
    if (!this.isRankedRun) return translateText('PRACTICE COMPLETE');
    if (this.game?.runSummary?.runCleared) return 'RUN CLEAR';
    if (this.globalPlacementTier === 'number1') return 'NUMBER ONE';
    if (this.globalPlacementTier === 'top3') return this.getSteamGlobalLeaderboardTitle();
    if (this.globalPlacementTier === 'top10') return this.getSteamGlobalLeaderboardTitle();
    if (this.globalPlacementTier === 'global') return 'GLOBAL SLOT SECURED';
    if (this.globalPlacementTier === 'near_global') return 'GLOBAL BOARD IN SIGHT';
    if (this.localQualified) {
      const localRank = this.getVisibleLocalPlacementRank();
      return localRank ? `LOCAL BOARD RANK #${localRank}` : 'LOCAL BOARD SLOT';
    }
    if (this.isPersonalBest) return 'PERSONAL BEST';
    return 'RUN COMPLETE';
  }

  getCeremonyComment() {
    if (!this.isRankedRun) {
      if (this.isDailySignalResult()) {
        const contract = this.game?.runSummary?.dailySignalContract || {};
        const resultText = this.getDailySignalResultLines().join('\n');
        const base = translateText('Today\'s UTC contract used one loaner ship, one route theme, and one local record. Career progress and Steam leaderboards stayed untouched.');
        return [base, contract.templateLabel ? translateText(contract.templateLabel) : '', resultText].filter(Boolean).join('\n');
      }
      if (this.game?.runMode === RUN_MODES.SECTOR_START) {
        const resultText = this.getSectorStartChallengeResultLines().join('\n');
        const base = translateText('Sector Run complete. Checkpoint context saved separately; achievements, Mayhem leaderboard, and career progress stayed untouched. Sector board records are separate.');
        return resultText ? `${base}\n${resultText}` : base;
      }
      if (this.isOverrunResult()) {
        const resultText = this.getLeaderboardPlacementLines().join('\n');
        const base = translateText('Overrun complete. Career XP and cumulative Pilot Orders advanced; leaderboards, achievements, and checkpoint unlocks stayed off.');
        return resultText ? `${base}\n${resultText}` : base;
      }
      const resultText = this.getScoutRunResultLines().join('\n');
      const base = translateText('Scout Run complete. Local practice score only: no leaderboard submission, no achievements, no career XP, and no Mayhem checkpoint unlocks.');
      return resultText ? `${base}\n${resultText}` : base;
    }
    const placement = this.globalPlacement;
    const localRank = this.getVisibleLocalPlacementRank();
    const localPrefix = localRank ? `Local board rank #${localRank}. ` : '';
    if (this.isSteamBestUnchangedResult()) {
      const best = this.getSteamPreviousBestScore();
      return best > 0
        ? `Steam best unchanged. This run did not beat your Steam best: ${this.formatScoreNumber(best)}.`
        : 'Steam best unchanged.';
    }
    if (placement?.numberOne) {
      return `${localPrefix}Global rank #1. The cabinet has a new global name at the top.`;
    }
    if (placement?.top3) {
      return `${localPrefix}Global rank #${placement.placement}. That is the kind of run people pretend was easy.`;
    }
    if (placement?.top10) {
      return `${localPrefix}${translateText('Global rank #{rank}. Top ten. The swarm now has to learn your initials.', {
        rank: placement.placement
      })}`;
    }
    if (placement?.qualified) {
      return `${localPrefix}Global rank #${placement.placement}. Your score now travels farther than the swarm wanted.`;
    }
    if (placement?.nearGlobal) {
      return `${localPrefix}Only ${placement.scoreToGlobal.toLocaleString('en-US')} more points for a global slot. This was not a miss, it was a warning shot.`;
    }
    if (this.localQualified) {
      const globalRank = this.getGlobalPlacementRank();
      if (localRank && globalRank) return `Local board rank #${localRank}. Global board rank #${globalRank}.`;
      if (localRank && this.globalStatus === 'submitted') return `Local board rank #${localRank}. Global board rank pending.`;
      if (localRank) return `Local board rank #${localRank}. Global status: ${this.getGlobalPlacementLine().replace(/^Global: /, '')}.`;
      return 'Local board slot secured. Global board status is shown below.';
    }
    if (this.isPersonalBest) {
      return 'Personal best archived. The next run starts with evidence.';
    }
    return getGameOverComment(this.finalScore, this.finalLevel);
  }

  getDeathCoachAdvice() {
    return getRunDeathCoachAdvice(this.game?.runSummary?.finalDeathSource || this.game?.runSummary?.lastLifeLossSource);
  }

  getDeathCoachLine() {
    if (!this.isRankedRun || this.game?.runSummary?.runCleared) return '';
    const advice = this.getDeathCoachAdvice();
    const text = String(advice?.advice || '').trim();
    return text ? `${translateText('COUNTER ADVICE: LAST DEATH')}: ${translateText(text)}` : '';
  }

  getCounterAdviceText() {
    if (!this.isRankedRun || this.game?.runSummary?.runCleared) return '';
    const advice = this.getDeathCoachAdvice();
    const text = String(advice?.advice || '').trim();
    return text ? translateText(text) : '';
  }

  shouldShowCounterAdviceCard() {
    if (this.state === 'submitting' || this.state === 'submitted_hold' || this.state === 'result_hold') return false;
    return this.isResultActionStage() && Boolean(this.getCounterAdviceText());
  }

  getCeremonyCommentWithCoach(baseComment = this.getCeremonyComment()) {
    return [
      baseComment,
      this.getDeathCoachLine()
    ].filter(Boolean).join('\n');
  }

  updateCeremonyPresentation() {
    if (this.state === 'submitting' || this.state === 'submitted_hold' || this.state === 'result_hold' || this.state === 'runback') {
      this.syncResultStagePresentation();
      return;
    }
    if (!this.title || !this.comment) return;
    const placement = this.globalPlacement;
    this.refreshNextGoalFromLeaderboard();
    this.title.text = this.getCeremonyTitle();
    this.comment.text = this.getCeremonyComment();
    if (placement?.numberOne) {
      this.title.style.fill = '#fff8b8';
      this.title.style.stroke = { color: '#6b3200', width: 4 };
      this.title.style.dropShadowColor = '#ffd454';
      this.comment.style.fill = '#ffeeb0';
    } else if (placement?.top3) {
      this.title.style.fill = '#ffe86a';
      this.title.style.stroke = { color: '#4c2400', width: 4 };
      this.title.style.dropShadowColor = '#ffb84a';
      this.comment.style.fill = '#ffd98a';
    } else if (placement?.top10) {
      this.title.style.fill = '#c7f7ff';
      this.title.style.stroke = { color: '#003e58', width: 4 };
      this.title.style.dropShadowColor = '#4ef8ff';
      this.comment.style.fill = '#d9fbff';
    } else if (placement?.qualified) {
      this.title.style.fill = '#9cfbff';
      this.title.style.stroke = { color: '#004c58', width: 3 };
      this.title.style.dropShadowColor = '#00ffff';
      this.comment.style.fill = '#c8fdff';
    } else if (placement?.nearGlobal) {
      this.title.style.fill = '#ffcf7a';
      this.title.style.stroke = { color: '#5f2500', width: 3 };
      this.title.style.dropShadowColor = '#ff9b42';
      this.comment.style.fill = '#ffd7a3';
    } else {
      this.title.style.fill = this.localQualified || this.isPersonalBest ? '#9cfbff' : '#d8e6ff';
      this.title.style.stroke = { color: '#042033', width: 3 };
      this.title.style.dropShadowColor = '#00aaff';
      this.comment.style.fill = '#aebed0';
    }
    this.layoutScreen();
  }

  refreshNextGoalFromLeaderboard() {
    const placement = this.globalPlacement;
    if (!placement || !this.isRankedRun) return;
    const rivalGoal = this.getGlobalRivalNextGoalText();
    if (rivalGoal) {
      this.nextGoal = { text: rivalGoal, tone: 'leaderboard' };
    } else if (placement.nearNumberOne && placement.scoreToNumberOne > 0) {
      this.nextGoal = { text: `NUMBER ONE: ${this.formatGoalNumber(placement.scoreToNumberOne)} MORE`, tone: 'leaderboard' };
    } else if (placement.nearTop3 && placement.scoreToTop3 > 0) {
      this.nextGoal = { text: `TOP THREE: ${this.formatGoalNumber(placement.scoreToTop3)} MORE`, tone: 'leaderboard' };
    } else if (placement.nearTop10 && placement.scoreToTop10 > 0) {
      this.nextGoal = {
        text: translateText('TOP TEN: {score} MORE', { score: this.formatGoalNumber(placement.scoreToTop10) }),
        tone: 'leaderboard'
      };
    } else if (placement.nearGlobal && placement.scoreToGlobal > 0) {
      this.nextGoal = { text: `GLOBAL SLOT: ${this.formatGoalNumber(placement.scoreToGlobal)} MORE`, tone: 'leaderboard' };
    } else if (placement.qualified && placement.placement && placement.placement > 1) {
      this.nextGoal = { text: 'NEXT GOAL: CLIMB ONE GLOBAL RANK', tone: 'leaderboard' };
    }
    if (this.nextGoalText) this.nextGoalText.text = this.nextGoal?.text || '';
  }

  getGlobalRivalProjection() {
    if (!this.isRankedRun || !Array.isArray(this.cachedHighscores) || this.cachedHighscores.length === 0) return null;
    return analyzeGlobalRivalProjection(this.finalScore, this.cachedHighscores, {
      maxEntries: LEADERBOARD_DISPLAY_LIMIT
    });
  }

  getGlobalRivalNextGoalText() {
    const projection = this.getGlobalRivalProjection();
    if (!projection || projection.targetKind === 'number_one' || !projection.targetRank || !projection.targetName) return '';
    const values = {
      rank: projection.targetRank,
      name: projection.targetName,
      score: this.formatGoalNumber(projection.scoreToPass)
    };
    return projection.targetKind === 'board_gate'
      ? translateText('TOP 40 GATE: #{rank} {name} // {score} MORE', values)
      : translateText('NEXT RIVAL #{rank}: {name} // {score} MORE', values);
  }

  updateQualificationPromptState() {
    if (this.state === 'runback' || this.state === 'submitted_hold' || this.state === 'result_hold') return;
    const layout = getCurrentLayout();
    this.updateCanEnterName();
    if (this.promptText) {
      this.promptText.text = this.getEntryPromptText(layout);
      this.promptText.visible = true;
      this.promptText.eventMode = this.canEnterName ? 'static' : 'none';
      this.promptText.cursor = this.canEnterName ? 'pointer' : 'default';
      this.promptText.style.fill = this.canEnterName ? '#00ffff' : '#8fa6b8';
    }
    if (this.notQualifiedText) {
      const noSlot = this.isRankedRun && !this.canEnterName && this.globalStatus !== 'checking';
      this.notQualifiedText.visible = noSlot;
      this.notQualifiedText.text = noSlot ? 'NO LOCAL OR GLOBAL SLOT' : '';
    }
    if (this.instructions) {
      this.instructions.text = this.getInstructionsText();
    }
    this.refreshPrimaryCta();
    this.layoutScreen();
    if (this.state === 'prompt' && this.isRankedRun && !this.canEnterName && this.globalStatus !== 'checking') {
      this.enterRunbackStage(this.globalStatus === 'offline' ? 'offline_no_slot' : 'no_slot');
    }
  }

  async checkGlobalQualification() {
    try {
      if (!this.leaderboardRuntime?.cloud) {
        this.cachedHighscores = [];
        this.globalPlacement = null;
        this.globalPlacementTier = 'none';
        this.globalQualified = false;
        this.globalStatus = 'offline';
        return;
      }
      const scores = await this.leaderboardAdapter.getGlobalScoresForPlacement({
        useCache: false,
        ...this.getRunLeaderboardQuery()
      });
      this.cachedHighscores = Array.isArray(scores) ? [...scores] : [];
      this.cachedHighscores.sort((a, b) => b.score - a.score);
      if (this.cachedHighscores.length === 0) {
        this.globalPlacement = null;
        this.globalPlacementTier = 'none';
        this.globalQualified = false;
        this.globalStatus = 'offline';
        console.log(`[GameOver] Global Qualification: Score ${this.finalScore} -> offline/empty board, local board only`);
      } else {
        this.globalPlacement = analyzeGlobalLeaderboardScore(this.finalScore, this.cachedHighscores);
        this.globalPlacementTier = this.globalPlacement.tier;
        this.globalQualified = this.globalPlacement.qualified;
        this.globalStatus = this.globalQualified ? 'qualified' : 'missed';
        console.log(`[GameOver] Global Qualification: Score ${this.finalScore} vs cutoff ${this.globalPlacement.cutoffScore || 0} -> ${this.globalQualified}`, this.globalPlacement);
      }

      if (this.globalQualified && this.isSceneActive()) {
        this.playGlobalQualificationFanfare();
      } else if (this.globalPlacement?.nearGlobal && this.isSceneActive()) {
        this.playNearMissVoice();
      } else if (this.isPersonalBest && !this.localQualified && this.isSceneActive()) {
        this.playPersonalBestVoice();
      }
    } catch (error) {
      console.warn('Failed to pre-fetch global scores', error);
      this.cachedHighscores = [];
      this.globalQualified = false;
      this.globalStatus = 'offline';
      if (this.isPersonalBest && !this.localQualified && this.isSceneActive()) {
        this.playPersonalBestVoice();
      }
    } finally {
      this.updateCanEnterName();
      if (this.isSceneActive()) {
        this.updateCeremonyPresentation();
        this.updateLeaderboardStatusText();
        this.updateQualificationPromptState();
      }
    }
  }

  createPersonalBestCarryBanner() {
    const carry = this.game?.personalBestCelebrationCarry;
    if (
      !carry
      || Math.max(0, Number(carry.previousScore) || 0) <= 0
      || Math.max(0, Number(carry.currentScore) || 0) <= Math.max(0, Number(carry.previousScore) || 0)
    ) return false;

    const previousScore = Math.max(0, Math.floor(Number(carry.previousScore) || 0));
    const currentScore = Math.max(previousScore + 1, Math.floor(Number(carry.currentScore) || 0));
    const durationMs = Math.max(4200, Math.min(5200, Number(carry.durationMs) || 4200));
    const source = carry.source || 'ranked_best_score';
    const formatScore = (value) => Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');

    const banner = new PIXI.Container();
    banner.label = 'ui_personal_best_carry';
    banner.zIndex = 9800;
    banner.eventMode = 'none';
    banner.alpha = 0;

    const bg = new PIXI.Graphics();
    banner.addChild(bg);

    const title = createText(translateText(source === 'daily_signal_local_best' ? 'NEW DAILY SIGNAL BEST' : 'NEW PERSONAL BEST'), {
      fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
      fontSize: 20,
      fontWeight: '900',
      fill: '#fff4a3',
      stroke: '#261400',
      strokeThickness: 4,
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#ffe66d',
      dropShadowBlur: 7
    });
    title.anchor.set(0.5);
    banner.addChild(title);

    const score = createText(translateText('OLD RECORD {oldScore} // LIVE RECORD {liveScore}', {
      oldScore: formatScore(previousScore),
      liveScore: formatScore(currentScore)
    }), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 13,
      fontWeight: '800',
      fill: '#d9feff',
      stroke: '#001018',
      strokeThickness: 3,
      align: 'center',
      wordWrap: true
    });
    score.anchor.set(0.5);
    banner.addChild(score);

    const delta = createText(translateText('RECORD ADVANTAGE +{score}', {
      score: formatScore(currentScore - previousScore)
    }), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 15,
      fontWeight: '900',
      fill: '#ff7ee8',
      stroke: '#190018',
      strokeThickness: 3,
      align: 'center'
    });
    delta.anchor.set(0.5);
    banner.addChild(delta);

    this.personalBestCarryBanner = banner;
    this.personalBestCarryBg = bg;
    this.personalBestCarryTitle = title;
    this.personalBestCarryScore = score;
    this.personalBestCarryDelta = delta;
    this.personalBestCarryState = {
      previousScore,
      currentScore,
      delta: currentScore - previousScore,
      source,
      reducedMotion: Boolean(carry.reducedMotion),
      scoreNeutral: carry.scoreNeutral !== false,
      handoffReason: carry.handoffReason || 'game_over_transition',
      elapsedMs: 0,
      durationMs,
      phase: 'intro'
    };
    this.container.addChild(banner);
    this.container.sortChildren?.();
    return true;
  }

  layoutPersonalBestCarryBanner(width = this.game.app.screen.width, height = this.game.app.screen.height, layout = getCurrentLayout()) {
    const banner = this.personalBestCarryBanner;
    if (!banner || !this.personalBestCarryState) return;
    const mobile = Boolean(layout.isMobile || width < 720);
    const bannerWidth = Math.min(width - (mobile ? 20 : 48), mobile ? 520 : 344);
    const bannerHeight = mobile ? 92 : 104;
    const safeTop = Math.max(0, Number(layout.safeArea?.top) || 0);
    banner.__layoutWidth = bannerWidth;
    banner.__layoutHeight = bannerHeight;
    banner.x = mobile ? width / 2 : 24 + bannerWidth / 2;
    banner.y = safeTop + (mobile ? 10 : 20) + bannerHeight / 2;

    this.personalBestCarryBg.clear();
    this.personalBestCarryBg.roundRect(-bannerWidth / 2 - 5, -bannerHeight / 2 - 5, bannerWidth + 10, bannerHeight + 10, 14);
    this.personalBestCarryBg.stroke({ color: 0x4ef8ff, width: 5, alpha: 0.16 });
    this.personalBestCarryBg.roundRect(-bannerWidth / 2, -bannerHeight / 2, bannerWidth, bannerHeight, 11);
    this.personalBestCarryBg.fill({ color: 0x031421, alpha: 0.96 });
    this.personalBestCarryBg.stroke({ color: 0xffe66d, width: 3, alpha: 0.94 });
    this.personalBestCarryBg.rect(-bannerWidth / 2 + 15, -bannerHeight / 2 + 8, bannerWidth - 30, 2);
    this.personalBestCarryBg.fill({ color: 0x4ef8ff, alpha: 0.62 });

    this.personalBestCarryTitle.style.fontSize = mobile ? 18 : 20;
    this.personalBestCarryTitle.style.wordWrap = true;
    this.personalBestCarryTitle.style.wordWrapWidth = bannerWidth - 30;
    this.personalBestCarryTitle.position.set(0, mobile ? -27 : -31);

    this.personalBestCarryScore.style.fontSize = mobile ? 11 : 13;
    this.personalBestCarryScore.style.wordWrap = true;
    this.personalBestCarryScore.style.wordWrapWidth = bannerWidth - 24;
    this.personalBestCarryScore.position.set(0, mobile ? 2 : 1);

    this.personalBestCarryDelta.style.fontSize = mobile ? 13 : 15;
    this.personalBestCarryDelta.position.set(0, mobile ? 29 : 32);
  }

  updatePersonalBestCarry(delta = 1) {
    const banner = this.personalBestCarryBanner;
    const state = this.personalBestCarryState;
    if (!banner || !state) return;
    const deltaFrames = Number(delta?.deltaTime) || Number(delta) || 0;
    state.elapsedMs += deltaFrames * 16.67;
    const intro = Math.min(1, state.elapsedMs / 260);
    const outro = Math.max(0, Math.min(1, (state.elapsedMs - (state.durationMs - 620)) / 620));
    state.phase = intro < 1 ? 'intro' : outro > 0 ? 'outro' : 'hold';
    banner.alpha = (1 - Math.pow(1 - intro, 3)) * (1 - outro);
    const pulse = state.reducedMotion ? 1 : 1 + Math.sin(state.elapsedMs * 0.008) * 0.006;
    banner.scale.set(pulse);
    if (state.elapsedMs >= state.durationMs) {
      this.removePersonalBestCarry({ clearGameCarry: true, relayout: true });
    }
  }

  removePersonalBestCarry({ clearGameCarry = true, relayout = false } = {}) {
    const hadBanner = Boolean(this.personalBestCarryBanner);
    if (this.personalBestCarryBanner?.parent) {
      this.personalBestCarryBanner.parent.removeChild(this.personalBestCarryBanner);
    }
    this.personalBestCarryBanner?.destroy?.({ children: true });
    this.personalBestCarryBanner = null;
    this.personalBestCarryBg = null;
    this.personalBestCarryTitle = null;
    this.personalBestCarryScore = null;
    this.personalBestCarryDelta = null;
    this.personalBestCarryState = null;
    if (clearGameCarry && this.game) this.game.personalBestCelebrationCarry = null;
    if (hadBanner && relayout && this.game?.currentScene === this && this.title) {
      this.layoutScreen();
    }
  }

  getPersonalBestCarryDebugState() {
    const banner = this.personalBestCarryBanner;
    const state = this.personalBestCarryState;
    return {
      active: Boolean(banner?.parent && state),
      visible: Boolean(banner?.visible && banner?.renderable && banner?.alpha > 0.02),
      previousScore: state?.previousScore || 0,
      currentScore: state?.currentScore || 0,
      delta: state?.delta || 0,
      source: state?.source || null,
      scoreNeutral: state?.scoreNeutral !== false,
      handoffReason: state?.handoffReason || null,
      elapsedMs: Math.round(Math.max(0, Number(state?.elapsedMs) || 0)),
      durationMs: Math.round(Math.max(0, Number(state?.durationMs) || 0)),
      remainingMs: Math.round(Math.max(0, (Number(state?.durationMs) || 0) - (Number(state?.elapsedMs) || 0))),
      phase: state?.phase || null,
      bounds: banner ? {
        x: Math.round(banner.x - (Number(banner.__layoutWidth) || 0) / 2),
        y: Math.round(banner.y - (Number(banner.__layoutHeight) || 0) / 2),
        width: Math.round(Number(banner.__layoutWidth) || 0),
        height: Math.round(Number(banner.__layoutHeight) || 0)
      } : null
    };
  }

  layoutScreen() {
    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);
    const safeMargin = responsiveLayout.safeArea;
    resizeMenuFx(this, width, height);
    this.syncResultStagePresentation();

    // Update font sizes
    const titleSize = getResponsiveFontSize(layout, 'title');
    const scoreSize = getResponsiveFontSize(layout, 'score');
    const levelSize = layout.isMobile ? 13 : 17;
    const unlockSize = layout.isMobile ? 15 : 18;
    const rankProgressSize = layout.isMobile ? 13 : 16;
    const shipProgressSize = layout.isMobile ? 13 : 16;
    const bodySize = getResponsiveFontSize(layout, 'body');
    const leaderboardStatusSize = layout.isMobile ? 13 : 16;
    const promptSize = layout.isMobile ? 18 : 20;
    const nameSize = layout.isMobile ? 22 : 26;
    const smallSize = getResponsiveFontSize(layout, 'small');
    const scoreVisible = this.scoreText?.visible !== false;
    const levelVisible = this.levelText?.visible !== false;
    const unlockVisible = this.unlockText?.visible !== false;
    const rankProgressVisible = this.rankProgressText?.visible !== false;
    const shipProgressVisible = this.shipUnlockProgressText?.visible !== false;
    let nextGoalVisible = Boolean(this.nextGoalGroup?.visible);
    let commentVisible = this.comment?.visible !== false;
    const leaderboardStatusVisible = this.leaderboardStatusText?.visible !== false;
    const promptVisible = this.promptText?.visible !== false;
    const nameVisible = this.nameDisplay?.visible !== false;

    this.title.style.fontSize = titleSize;
    const titleStroke = this.globalQualified ? '#4c2400' : '#042033';
    this.title.style.stroke = { color: titleStroke, width: layout.isMobile ? 2 : 3 };
    this.title.style.wordWrap = true;
    this.title.style.wordWrapWidth = clampTextWidth(width * 0.88, layout);
    this.title.style.lineHeight = Math.round(titleSize * 1.08);
    this.scoreText.style.fontSize = scoreSize;
    this.levelText.style.fontSize = levelSize;
    this.levelText.style.align = 'center';
    this.levelText.style.wordWrap = true;
    this.levelText.style.wordWrapWidth = clampTextWidth(width * (layout.isMobile ? 0.86 : 0.58), layout);
    this.levelText.style.lineHeight = Math.round(levelSize * 1.18);
    this.unlockText.style.fontSize = unlockSize;
    this.unlockText.style.wordWrap = true;
    this.unlockText.style.wordWrapWidth = clampTextWidth(width * 0.9, layout);
    this.unlockText.style.lineHeight = Math.round(unlockSize * 1.25);
    if (this.rankProgressText) {
      this.rankProgressText.style.fontSize = rankProgressSize;
      this.rankProgressText.style.wordWrap = true;
      this.rankProgressText.style.wordWrapWidth = clampTextWidth(width * (layout.isMobile ? 0.82 : 0.54), layout);
      this.rankProgressText.style.lineHeight = Math.round(rankProgressSize * 1.28);
    }
    if (this.shipUnlockProgressText) {
      this.shipUnlockProgressText.style.fontSize = shipProgressSize;
      this.shipUnlockProgressText.style.wordWrap = true;
      this.shipUnlockProgressText.style.wordWrapWidth = clampTextWidth(width * (layout.isMobile ? 0.84 : 0.56), layout);
      this.shipUnlockProgressText.style.lineHeight = Math.round(shipProgressSize * 1.28);
    }
    if (this.nextGoalText) {
      this.nextGoalText.style.fontSize = layout.isMobile ? 14 : 17;
      this.nextGoalText.style.wordWrap = true;
      this.nextGoalText.style.wordWrapWidth = clampTextWidth(width * (layout.isMobile ? 0.78 : 0.54), layout);
    }
    this.comment.style.fontSize = bodySize;
    this.comment.style.lineHeight = Math.round(bodySize * 1.4);
    this.comment.style.wordWrapWidth = clampTextWidth(width * 0.9, layout);
    this.leaderboardStatusText.style.fontSize = leaderboardStatusSize;
    this.leaderboardStatusText.style.lineHeight = Math.round(leaderboardStatusSize * 1.25);
    this.leaderboardStatusText.style.wordWrapWidth = clampTextWidth(width * 0.88, layout);
    this.notQualifiedText.style.fontSize = layout.isMobile ? 18 : 22;
    this.notQualifiedText.style.wordWrapWidth = clampTextWidth(width * 0.86, layout);
    this.promptText.style.fontSize = promptSize;
    this.promptText.style.wordWrapWidth = clampTextWidth(width * 0.85, layout);
    this.nameDisplay.style.fontSize = nameSize;
    this.instructions.style.fontSize = smallSize;
    this.instructions.style.fill = '#9cfbff';
    this.instructions.style.stroke = { color: '#031323', width: layout.isMobile ? 2 : 3 };
    this.layoutBackdrop(width, height);
    this.layoutCeremonyVisuals(width, height, layout);
    this.layoutPersonalBestCarryBanner(width, height, responsiveLayout);
    this.drawCounterAdviceCard(layout);
    const counterAdviceVisible = Boolean(this.counterAdviceCard?.visible);
    this.drawRetryButton(layout);
    this.drawLeaderboardButton(layout);
    this.drawHangarButton(layout);
    this.drawMainMenuButton(layout);
    this.drawRunReportButton(layout);
    this.drawNextGoalStrip(layout);
    this.drawShipUnlockReveal(layout);
    if (counterAdviceVisible && this.state === 'runback' && (layout.isMobile || height < 820)) {
      if (this.comment) this.comment.visible = false;
      if (this.nextGoalGroup) this.nextGoalGroup.visible = false;
      commentVisible = false;
      nextGoalVisible = false;
    } else {
      nextGoalVisible = Boolean(this.nextGoalGroup?.visible);
      commentVisible = this.comment?.visible !== false;
    }
    [
      this.title,
      this.scoreText,
      this.levelText,
      this.unlockText,
      this.rankProgressText,
      this.shipUnlockProgressText,
      this.nextGoalText,
      this.comment,
      this.counterAdviceLabel,
      this.counterAdviceBody,
      this.leaderboardStatusText,
      this.promptText,
      this.notQualifiedText,
      this.nameDisplay
    ].forEach(node => node?.updateText?.(false));

    // Calculate content height for centering
    const compactRunbackDesktop = !layout.isMobile && this.state === 'runback' && height < 820;
    const spacing = layout.isMobile ? 7 : compactRunbackDesktop ? 7 : 11;
    const sectionGap = layout.isMobile ? 12 : compactRunbackDesktop ? 12 : 18;

    // Use measured text heights so extra unlock/rank lines cannot collide.
    const titleHeight = Math.max(titleSize * 1.2, this.title.height || 0);
    const scoreHeight = scoreVisible ? Math.max(scoreSize * 1.2, this.scoreText.height || 0) : 0;
    const levelHeight = levelVisible ? Math.max(layout.isMobile ? 52 : 62, levelSize * 1.2, this.levelText.height || 0) : 0;
    const unlockRevealVisible = Boolean(this.shipUnlockReveal?.visible);
    const unlockRevealHeight = unlockRevealVisible
      ? Math.max(this.shipUnlockRevealDebugLayout?.height || 0, layout.isMobile ? 78 : 90)
      : 0;
    const unlockHeight = unlockVisible ? Math.max(unlockSize * 1.42, this.unlockText.height || 0) : 0;
    const rankProgressHeight = rankProgressVisible ? Math.max(layout.isMobile ? 46 : 52, this.rankProgressText.height || 0) : 0;
    const shipProgressHeight = shipProgressVisible ? Math.max(layout.isMobile ? 50 : 58, this.shipUnlockProgressText.height || 0) : 0;
    const nextGoalHeight = nextGoalVisible ? Math.max(this.nextGoalGroup.height || 0, layout.isMobile ? 32 : 38) : 0;
    const commentHeight = commentVisible ? Math.max(bodySize * 1.4, this.comment.height || 0) : 0;
    const counterAdviceHeight = counterAdviceVisible ? Math.max(this.counterAdviceCardHeight || 0, layout.isMobile ? 68 : 76) : 0;
    const leaderboardStatusHeight = leaderboardStatusVisible ? Math.max(layout.isMobile ? 52 : 62, leaderboardStatusSize * 1.5, this.leaderboardStatusText.height || 0) : 0;
    const promptHeight = promptVisible ? Math.max(promptSize * 1.2, this.promptText.height || 0) : 0;
    const nameHeight = nameVisible ? Math.max(nameSize * 1.2, this.nameDisplay.height || 0) : 0;
    const leaderboardVisible = this.shouldShowLeaderboardButton();
    const hangarVisible = this.shouldShowHangarButton();
    const mainMenuVisible = this.shouldShowMainMenuButton();
    const runReportVisible = this.shouldShowRunReportButton();
    const secondaryVisibleCount = [leaderboardVisible, hangarVisible, mainMenuVisible].filter(Boolean).length;
    const secondaryButtonsShareRow = secondaryVisibleCount > 1 && !layout.isMobile;
    const retryHeight = this.retryButtonHeight || (layout.isMobile ? 58 : 66);
    const rawLeaderboardHeight = this.leaderboardButtonHeight || (layout.isMobile ? 42 : 48);
    const rawHangarHeight = this.hangarButtonHeight || (layout.isMobile ? 42 : 48);
    const rawMainMenuHeight = this.mainMenuButtonHeight || (layout.isMobile ? 42 : 48);
    const rawRunReportHeight = this.runReportButtonHeight || (layout.isMobile ? 48 : 54);
    const runReportBesideCounter = Boolean(runReportVisible && counterAdviceVisible && !layout.isMobile && width >= 980);
    const counterAdviceRowHeight = counterAdviceVisible
      ? Math.max(counterAdviceHeight, runReportBesideCounter ? rawRunReportHeight : 0)
      : 0;
    const secondaryRowHeight = secondaryButtonsShareRow
      ? Math.max(rawLeaderboardHeight, rawHangarHeight, rawMainMenuHeight)
      : 0;
    const leaderboardHeight = leaderboardVisible
      ? (secondaryButtonsShareRow ? secondaryRowHeight : rawLeaderboardHeight)
      : 0;
    const hangarHeight = hangarVisible && !secondaryButtonsShareRow ? rawHangarHeight : 0;
    const mainMenuHeight = mainMenuVisible && !secondaryButtonsShareRow ? rawMainMenuHeight : 0;
    const runReportHeight = runReportVisible && !runReportBesideCounter ? rawRunReportHeight : 0;

    const totalHeight = titleHeight + scoreHeight + levelHeight + unlockHeight + rankProgressHeight + shipProgressHeight + unlockRevealHeight + nextGoalHeight + commentHeight + counterAdviceRowHeight + leaderboardStatusHeight + promptHeight + retryHeight + leaderboardHeight + hangarHeight + mainMenuHeight + runReportHeight + nameHeight + spacing * (secondaryVisibleCount || runReportVisible ? 12 : 9) + (counterAdviceVisible ? spacing : 0) + sectionGap * 2;

    // Calculate starting Y for vertical centering with safe margin
    const footerSpace = layout.isMobile ? 40 : 50;
    const availableHeight = height - footerSpace - safeMargin.top;
    const personalBestCarryBottom = layout.isMobile && this.personalBestCarryBanner
      ? this.personalBestCarryBanner.y + (Number(this.personalBestCarryBanner.__layoutHeight) || 0) / 2 + 8
      : safeMargin.top;
    const startY = Math.max(
      safeMargin.top,
      personalBestCarryBottom,
      safeMargin.top + (availableHeight - totalHeight) / 2 * (layout.isMobile ? 0.5 : 0.7)
    );

    let stackY = startY;
    const elementHeight = (element, fallback = spacing) => Math.max(1, element?.height || element?.style?.fontSize || fallback);
    const placeCenteredElement = (element, spacingAfter = spacing, fallback = spacing) => {
      const measuredHeight = Math.max(elementHeight(element, fallback), fallback);
      const y = stackY + measuredHeight / 2;
      stackY += measuredHeight + spacingAfter;
      return y;
    };
    const addStackGap = (amount) => {
      stackY += amount;
    };
    const placeCounterAdviceRow = (spacingAfter, fallbackHeight) => {
      const rowY = placeCenteredElement(this.counterAdviceCard, spacingAfter, fallbackHeight);
      if (runReportBesideCounter && this.runReportButton) {
        const gap = 16;
        const cardWidth = this.counterAdviceCardWidth || this.counterAdviceCard.width || 0;
        const reportWidth = this.runReportButtonWidth || this.runReportButton.width || 0;
        const rowWidth = cardWidth + reportWidth + gap;
        let cursorX = width / 2 - rowWidth / 2;
        this.counterAdviceCard.x = cursorX + cardWidth / 2;
        this.counterAdviceCard.y = rowY;
        cursorX += cardWidth + gap;
        this.runReportButton.visible = true;
        this.runReportButton.x = cursorX + reportWidth / 2;
        this.runReportButton.y = rowY;
      } else {
        this.counterAdviceCard.x = width / 2;
        this.counterAdviceCard.y = rowY;
      }
      return rowY;
    };

    this.title.x = width / 2;
    const titleMaxWidth = clampTextWidth(width * 0.9, layout);
    if (this.title.width > titleMaxWidth) {
      const minTitleSize = layout.isMobile ? 22 : 30;
      const fittedSize = Math.max(minTitleSize, Math.floor(titleSize * (titleMaxWidth / this.title.width)));
      this.title.style.fontSize = fittedSize;
      this.title.style.lineHeight = Math.round(fittedSize * 1.08);
    }
    const holdStage = this.state === 'submitted_hold' || this.state === 'result_hold' || this.state === 'submitting';
    const titleSpacingAfter = holdStage
      ? (layout.isMobile ? 28 : 42)
      : this.state === 'runback' && this.globalPlacement?.qualified
        ? (layout.isMobile ? 14 : 24)
        : spacing * 0.5;
    this.title.y = placeCenteredElement(this.title, titleSpacingAfter, titleHeight);

    if (scoreVisible) {
      this.scoreText.x = width / 2;
      this.scoreText.y = placeCenteredElement(
        this.scoreText,
        this.state === 'runback' ? (layout.isMobile ? 10 : 15) : spacing * 0.9,
        scoreHeight
      );
    }

    if (levelVisible) {
      this.levelText.x = width / 2;
      this.levelText.y = placeCenteredElement(this.levelText, sectionGap, levelHeight);
    }

    if (unlockVisible) {
      this.unlockText.x = width / 2;
      this.unlockText.y = placeCenteredElement(this.unlockText, this.state === 'runback' ? spacing * 1.35 : spacing, unlockHeight);
    }

    if (rankProgressVisible) {
      this.rankProgressText.x = width / 2;
      this.rankProgressText.y = placeCenteredElement(this.rankProgressText, layout.isMobile ? 14 : 18, rankProgressHeight);
    }

    if (shipProgressVisible) {
      this.shipUnlockProgressText.x = width / 2;
      this.shipUnlockProgressText.y = placeCenteredElement(this.shipUnlockProgressText, this.state === 'runback' ? (layout.isMobile ? 14 : 18) : spacing, shipProgressHeight);
    }

    if (unlockRevealVisible) {
      this.shipUnlockReveal.x = width / 2;
      this.shipUnlockReveal.y = placeCenteredElement(this.shipUnlockReveal, spacing * 0.5, unlockRevealHeight);
    }

    if (this.state === 'runback') {
      if (commentVisible) {
        this.comment.x = width / 2;
        this.comment.y = placeCenteredElement(this.comment, layout.isMobile ? 14 : 18, commentHeight);
      }

      if (counterAdviceVisible) {
        placeCounterAdviceRow(layout.isMobile ? 14 : 18, counterAdviceRowHeight);
      }

      if (nextGoalVisible) {
        this.nextGoalGroup.x = width / 2;
        this.nextGoalGroup.y = placeCenteredElement(this.nextGoalGroup, spacing * 1.15, nextGoalHeight);
      }
    } else {
      if (nextGoalVisible) {
        this.nextGoalGroup.x = width / 2;
        this.nextGoalGroup.y = placeCenteredElement(this.nextGoalGroup, spacing, nextGoalHeight);
      }

      if (commentVisible) {
        this.comment.x = width / 2;
        this.comment.y = placeCenteredElement(this.comment, spacing, commentHeight);
      }

      if (counterAdviceVisible) {
        placeCounterAdviceRow(spacing, counterAdviceRowHeight);
      }
    }

    if (leaderboardStatusVisible) {
      this.leaderboardStatusText.x = width / 2;
      this.leaderboardStatusText.y = placeCenteredElement(this.leaderboardStatusText, spacing * 0.8, leaderboardStatusHeight);
    }

    if (promptVisible) {
      this.promptText.x = width / 2;
      this.promptText.y = placeCenteredElement(this.promptText, spacing, promptHeight);
    }

    this.notQualifiedText.x = width / 2;
    this.notQualifiedText.y = promptVisible ? this.promptText.y : stackY;

    addStackGap(this.state === 'runback'
      ? (unlockRevealVisible ? (layout.isMobile ? 12 : compactRunbackDesktop ? 8 : 18) : (layout.isMobile ? 30 : compactRunbackDesktop ? 24 : 54))
      : (layout.isMobile ? 8 : 18));
    this.retryButton.x = width / 2;
    this.retryButton.y = placeCenteredElement(this.retryButton, compactRunbackDesktop ? 0 : spacing, retryHeight);

    if (this.runReportButton && !runReportBesideCounter) {
      this.runReportButton.visible = runReportVisible;
      if (runReportVisible) {
        this.runReportButton.x = width / 2;
        this.runReportButton.y = placeCenteredElement(this.runReportButton, compactRunbackDesktop ? spacing * 0.4 : spacing * 0.85, rawRunReportHeight);
      } else {
        this.runReportButton.x = width / 2;
        this.runReportButton.y = this.retryButton.y;
      }
    }

    const secondaryButtons = [
      { node: this.leaderboardButton, visible: leaderboardVisible, width: this.leaderboardButtonWidth || 0, height: rawLeaderboardHeight },
      { node: this.hangarButton, visible: hangarVisible, width: this.hangarButtonWidth || 0, height: rawHangarHeight },
      { node: this.mainMenuButton, visible: mainMenuVisible, width: this.mainMenuButtonWidth || 0, height: rawMainMenuHeight }
    ].filter((entry) => entry.node);
    secondaryButtons.forEach((entry) => {
      entry.node.visible = entry.visible;
      if (!entry.visible) {
        entry.node.x = width / 2;
        entry.node.y = this.retryButton.y;
      }
    });
    const visibleSecondaryButtons = secondaryButtons.filter((entry) => entry.visible);
    if (secondaryButtonsShareRow && visibleSecondaryButtons.length) {
      const gap = 18;
      const rowY = placeCenteredElement(visibleSecondaryButtons[0].node, compactRunbackDesktop ? 0 : spacing * 0.8, secondaryRowHeight);
      const rowWidth = visibleSecondaryButtons.reduce((sum, entry) => sum + entry.width, 0) + gap * Math.max(0, visibleSecondaryButtons.length - 1);
      let cursorX = width / 2 - rowWidth / 2;
      visibleSecondaryButtons.forEach((entry) => {
        entry.node.x = cursorX + entry.width / 2;
        entry.node.y = rowY;
        cursorX += entry.width + gap;
      });
    } else {
      visibleSecondaryButtons.forEach((entry) => {
        entry.node.x = width / 2;
        entry.node.y = placeCenteredElement(entry.node, spacing * 0.8, entry.height);
      });
    }

    if (nameVisible) {
      this.nameDisplay.x = width / 2;
      this.nameDisplay.y = stackY + nameHeight / 2;
    }

    this.instructions.x = width / 2;
    this.instructions.y = height - safeMargin.bottom - (layout.isMobile ? 32 : 40);
    this.drawResultSectionCard(this.runSectionBg, this.levelText, layout, 0x37f5ff);
    this.drawResultSectionCard(this.rankProgressBg, this.rankProgressText, layout, 0xffd45c, { minHeight: layout.isMobile ? 44 : 50, widthRatio: layout.isMobile ? 0.88 : 0.56 });
    this.drawResultSectionCard(this.shipUnlockProgressBg, this.shipUnlockProgressText, layout, 0x37f5ff, { minHeight: layout.isMobile ? 48 : 56, widthRatio: layout.isMobile ? 0.9 : 0.58 });
    this.drawResultSectionCard(this.leaderboardStatusBg, this.leaderboardStatusText, layout, 0xff55d9);
    this.layoutRunReportOverlay(layout);
  }

  drawResultSectionCard(graphics, textNode, layout, accent = 0x37f5ff, options = {}) {
    if (!graphics || !textNode || textNode.visible === false) {
      graphics?.clear?.();
      return;
    }
    const padX = layout.isMobile ? 20 : 28;
    const padY = layout.isMobile ? 10 : 12;
    const widthRatio = Number.isFinite(options.widthRatio) ? options.widthRatio : (layout.isMobile ? 0.88 : 0.58);
    const minHeight = Number.isFinite(options.minHeight) ? options.minHeight : (layout.isMobile ? 52 : 62);
    const width = Math.min(layout.width * widthRatio, Math.max(260, textNode.width + padX * 2));
    const height = Math.max(minHeight, textNode.height + padY * 2);
    const x = textNode.x - width / 2;
    const y = textNode.y - height / 2;
    graphics.clear();
    graphics.roundRect(x, y, width, height, layout.isMobile ? 8 : 10);
    graphics.fill({ color: 0x03101c, alpha: 0.74 });
    graphics.roundRect(x, y, width, height, layout.isMobile ? 8 : 10);
    graphics.stroke({ color: accent, width: 1.6, alpha: 0.68 });
    graphics.rect(x + 16, y + 7, width - 32, 2);
    graphics.fill({ color: accent, alpha: 0.24 });
  }

  createRetryButton(layout) {
    this.retryButton = new PIXI.Container();
    this.retryButton.zIndex = 8;
    this.retryButton.eventMode = 'static';
    this.retryButton.cursor = 'pointer';

    this.retryButtonGlow = new PIXI.Graphics();
    this.retryButtonBg = new PIXI.Graphics();
    this.retryButtonEnergy = new PIXI.Graphics();
    this.retryButtonSheen = new PIXI.Graphics();

    this.retryButtonLabel = createText('ONE MORE RUN', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 24 : 30,
      fontWeight: 'bold',
      fill: '#fff3a2',
      stroke: '#371800',
      strokeThickness: layout.isMobile ? 3 : 4,
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#ffc94a',
      dropShadowBlur: 6
    });
    this.retryButtonLabel.anchor.set(0.5);

    this.retryButtonHint = createText('CLICK / R / SPACE / GAMEPAD A', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 11 : 13,
      fontWeight: 'bold',
      fill: '#9cfbff',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'center'
    });
    this.retryButtonHint.anchor.set(0.5);

    this.retryButton.addChild(
      this.retryButtonGlow,
      this.retryButtonEnergy,
      this.retryButtonBg,
      this.retryButtonSheen,
      this.retryButtonLabel,
      this.retryButtonHint
    );
    this.retryButton.on('pointerdown', () => {
      this.setInputDevice('keyboard');
      this.handlePrimaryCtaPress();
    });
    this.retryButton.on('pointerover', () => this.retryButton.scale.set(1.03));
    this.retryButton.on('pointerout', () => this.retryButton.scale.set(1));
    this.drawRetryButton(layout);
  }

  drawRetryButton(layout) {
    if (!this.retryButton || !this.retryButtonBg || !this.retryButtonGlow) return;

    const config = this.getPrimaryCtaConfig();
    const compactRunbackDesktop = config.runback && !layout.isMobile && layout.height < 820;
    this.retryButtonMode = config.mode;
    const buttonWidth = config.runback
      ? Math.min(layout.width * (layout.isMobile ? 0.9 : compactRunbackDesktop ? 0.52 : 0.58), layout.isMobile ? 360 : compactRunbackDesktop ? 510 : 560)
      : Math.min(layout.width * (layout.isMobile ? 0.82 : 0.4), layout.isMobile ? 320 : 390);
    const buttonHeight = config.runback
      ? (layout.isMobile ? 76 : compactRunbackDesktop ? 74 : 94)
      : (layout.isMobile ? 58 : 66);
    const radius = layout.isMobile ? 10 : 12;
    const halfWidth = buttonWidth / 2;
    const halfHeight = buttonHeight / 2;
    this.retryButtonWidth = buttonWidth;
    this.retryButtonHeight = buttonHeight;
    this.retryButton.hitArea = new PIXI.Rectangle(-halfWidth, -halfHeight, buttonWidth, buttonHeight);
    this.retryButton.alpha = config.disabled ? 0.72 : 1;
    this.retryButton.cursor = config.disabled ? 'default' : 'pointer';
    this.retryButton.eventMode = config.disabled ? 'none' : 'static';

    const frameColor = config.mode === 'restart' ? 0xffd75f : 0x00ffff;
    const glowColor = config.mode === 'restart' ? 0xffc94a : 0x37f5ff;
    const now = Date.now();
    const pulse = config.runback ? (0.5 + Math.sin(now * 0.006) * 0.5) : 0;
    const fastPulse = config.runback ? (0.5 + Math.sin(now * 0.017) * 0.5) : 0;
    const orbit = config.runback ? (now * 0.0024) % (Math.PI * 2) : 0;
    const drawArc = (target, radiusX, radiusY, start, length, color, alpha, width) => {
      const steps = 18;
      for (let step = 0; step < steps; step += 1) {
        const t0 = start + (length * step) / steps;
        const t1 = start + (length * (step + 1)) / steps;
        target.moveTo(Math.cos(t0) * radiusX, Math.sin(t0) * radiusY);
        target.lineTo(Math.cos(t1) * radiusX, Math.sin(t1) * radiusY);
      }
      target.stroke({ color, width, alpha });
    };

    this.retryButtonGlow.clear();
    const glowPadX = compactRunbackDesktop ? 12 : 18;
    const glowPadY = compactRunbackDesktop ? 9 : 14;
    this.retryButtonGlow.roundRect(-halfWidth - glowPadX, -halfHeight - glowPadY, buttonWidth + glowPadX * 2, buttonHeight + glowPadY * 2, radius + 9);
    this.retryButtonGlow.fill({ color: glowColor, alpha: config.disabled ? 0.08 : config.runback ? 0.34 + pulse * 0.2 : 0.18 });
    this.retryButtonGlow.roundRect(-halfWidth - 8, -halfHeight - (compactRunbackDesktop ? 5 : 7), buttonWidth + 16, buttonHeight + (compactRunbackDesktop ? 10 : 14), radius + 4);
    this.retryButtonGlow.stroke({ color: 0xffffff, width: config.runback ? 3.8 : 2, alpha: config.disabled ? 0.2 : config.runback ? 0.5 + pulse * 0.26 : 0.42 });
    if (config.runback && !config.disabled) {
      const outerPadX = compactRunbackDesktop ? 17 : 27;
      const outerPadY = compactRunbackDesktop ? 13 : 22;
      this.retryButtonGlow.roundRect(-halfWidth - outerPadX, -halfHeight - outerPadY, buttonWidth + outerPadX * 2, buttonHeight + outerPadY * 2, radius + 13);
      this.retryButtonGlow.stroke({ color: glowColor, width: 8, alpha: 0.11 + pulse * 0.09 });
    }

    this.retryButtonBg.clear();
    this.retryButtonBg.roundRect(-halfWidth, -halfHeight, buttonWidth, buttonHeight, radius);
    this.retryButtonBg.fill({ color: config.runback ? 0x071726 : 0x091523, alpha: 0.96 });
    this.retryButtonBg.roundRect(-halfWidth, -halfHeight, buttonWidth, buttonHeight, radius);
    this.retryButtonBg.stroke({ color: frameColor, width: config.runback ? 4 : 3, alpha: config.disabled ? 0.55 : 0.98 });
    this.retryButtonBg.rect(-halfWidth + 16, -halfHeight + 7, buttonWidth - 32, 3);
    this.retryButtonBg.fill({ color: 0x00ffff, alpha: config.disabled ? 0.22 : config.runback ? 0.72 : 0.5 });
    this.retryButtonBg.rect(-halfWidth + 16, halfHeight - 10, buttonWidth - 32, 2);
    this.retryButtonBg.fill({ color: frameColor, alpha: config.disabled ? 0.2 : config.runback ? 0.68 : 0.46 });

    this.retryButtonEnergy?.clear();
    this.retryButtonSheen?.clear();
    if (config.runback && !config.disabled && this.retryButtonEnergy && this.retryButtonSheen) {
      this.retryButtonEnergy.blendMode = 'add';
      this.retryButtonSheen.blendMode = 'add';
      drawArc(this.retryButtonEnergy, halfWidth + 12, halfHeight + 9, orbit, Math.PI * 0.48, 0xfff3a2, 0.82, 5.5);
      drawArc(this.retryButtonEnergy, halfWidth + 12, halfHeight + 9, orbit + Math.PI, Math.PI * 0.48, 0x37f5ff, 0.74, 5);
      drawArc(this.retryButtonEnergy, halfWidth + 22, halfHeight + 17, -orbit * 0.84, Math.PI * 0.28, 0xffffff, 0.36, 3);
      drawArc(this.retryButtonEnergy, halfWidth + 22, halfHeight + 17, Math.PI - orbit * 0.84, Math.PI * 0.28, 0xff55d9, 0.32, 3);

      const sweepWidth = Math.max(76, buttonWidth * 0.18);
      const sweepX = -halfWidth - sweepWidth + ((now * 0.28) % (buttonWidth + sweepWidth * 2));
      const sheenLeft = Math.max(-halfWidth + 14, sweepX);
      const sheenRight = Math.min(halfWidth - 14, sweepX + sweepWidth);
      const visibleSheenWidth = sheenRight - sheenLeft;
      if (visibleSheenWidth > 16) {
        this.retryButtonSheen.moveTo(sheenLeft, -halfHeight + 10);
        this.retryButtonSheen.lineTo(sheenLeft + visibleSheenWidth * 0.52, -halfHeight + 10);
        this.retryButtonSheen.lineTo(sheenRight, halfHeight - 10);
        this.retryButtonSheen.lineTo(sheenLeft + visibleSheenWidth * 0.48, halfHeight - 10);
        this.retryButtonSheen.closePath();
        this.retryButtonSheen.fill({ color: 0xffffff, alpha: 0.12 + fastPulse * 0.06 });
      }

      const tickCount = 10;
      for (let i = 0; i < tickCount; i += 1) {
        const x = -halfWidth + 30 + i * ((buttonWidth - 60) / Math.max(1, tickCount - 1));
        const tickAlpha = 0.28 + Math.sin(now * 0.01 + i * 0.7) * 0.16;
        this.retryButtonEnergy.rect(x - 3, -halfHeight - 6, 6, 12);
        this.retryButtonEnergy.fill({ color: i % 2 ? 0xfff3a2 : 0x37f5ff, alpha: tickAlpha });
      }
    }

    if (this.retryButtonLabel) {
      this.retryButtonLabel.text = config.label;
      this.retryButtonLabel.style.fontSize = config.runback ? (layout.isMobile ? 30 : compactRunbackDesktop ? 36 : 44) : (layout.isMobile ? 24 : 30);
      this.retryButtonLabel.style.fill = config.mode === 'restart' ? '#fff3a2' : '#f8ffff';
      this.retryButtonLabel.style.dropShadowColor = config.mode === 'restart' ? '#ffc94a' : '#00ffff';
      this.retryButtonLabel.style.dropShadowBlur = config.runback ? (compactRunbackDesktop ? 8 : 10) + pulse * (compactRunbackDesktop ? 5 : 8) : 6;
      this.retryButtonLabel.y = config.runback ? (layout.isMobile ? -12 : compactRunbackDesktop ? -12 : -16) : (layout.isMobile ? -9 : -10);
      this.retryButtonLabel.scale.set(config.runback ? 1 + pulse * 0.025 : 1);
    }
    if (this.retryButtonHint) {
      this.retryButtonHint.text = config.hint;
      this.retryButtonHint.style.fontSize = config.runback ? (layout.isMobile ? 12 : compactRunbackDesktop ? 13 : 15) : (layout.isMobile ? 11 : 13);
      this.retryButtonHint.style.fill = config.runback ? '#c8ffff' : '#9cfbff';
      this.retryButtonHint.y = config.runback ? (layout.isMobile ? 20 : compactRunbackDesktop ? 18 : 24) : (layout.isMobile ? 15 : 17);
    }
  }

  createLeaderboardButton(layout) {
    this.leaderboardButton = new PIXI.Container();
    this.leaderboardButton.zIndex = 8;
    this.leaderboardButton.eventMode = 'static';
    this.leaderboardButton.cursor = 'pointer';

    this.leaderboardButtonGlow = new PIXI.Graphics();
    this.leaderboardButtonBg = new PIXI.Graphics();

    this.leaderboardButtonLabel = createText('VIEW LEADERBOARD', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 18 : 22,
      fontWeight: 'bold',
      fill: '#d9fdff',
      stroke: '#031323',
      strokeThickness: layout.isMobile ? 2 : 3,
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#00ffff',
      dropShadowBlur: 4
    });
    this.leaderboardButtonLabel.anchor.set(0.5);

    this.leaderboardButtonHint = createText('L / GAMEPAD Y', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 10 : 12,
      fontWeight: 'bold',
      fill: '#ffd15c',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'center'
    });
    this.leaderboardButtonHint.anchor.set(0.5);

    this.leaderboardButton.addChild(this.leaderboardButtonGlow, this.leaderboardButtonBg, this.leaderboardButtonLabel, this.leaderboardButtonHint);
    this.leaderboardButton.on('pointerdown', () => {
      this.setInputDevice('keyboard');
      this.openLeaderboard();
    });
    this.leaderboardButton.on('pointerover', () => this.leaderboardButton.scale.set(1.02));
    this.leaderboardButton.on('pointerout', () => this.leaderboardButton.scale.set(1));
    this.drawLeaderboardButton(layout);
  }

  shouldShowLeaderboardButton() {
    if (this.isSubmitting) return false;
    if (this.game?.runMode === RUN_MODES.SCOUT || this.isDailySignalResult() || this.isOverrunResult()) return false;
    return this.isResultActionStage() && (
      !this.isSectorStartChallengeResult() ||
      Boolean(this.leaderboardAdapter?.isSteamAvailable?.())
    );
  }

  shouldShowHangarButton() {
    return !this.isSubmitting && this.isResultActionStage() && typeof this.game?.showShipSelect === 'function';
  }

  shouldShowMainMenuButton() {
    return !this.isSubmitting && this.isResultActionStage();
  }

  drawLeaderboardButton(layout) {
    if (!this.leaderboardButton || !this.leaderboardButtonBg || !this.leaderboardButtonGlow) return;
    const visible = this.shouldShowLeaderboardButton();
    const compactRunbackDesktop = this.state === 'runback' && !layout.isMobile && layout.height < 820;
    const buttonWidth = Math.min(layout.width * (layout.isMobile ? 0.72 : 0.34), layout.isMobile ? 280 : 340);
    const buttonHeight = layout.isMobile ? 48 : compactRunbackDesktop ? 46 : 54;
    const halfWidth = buttonWidth / 2;
    const halfHeight = buttonHeight / 2;
    const radius = layout.isMobile ? 8 : 10;
    this.leaderboardButtonWidth = buttonWidth;
    this.leaderboardButtonHeight = buttonHeight;
    this.leaderboardButton.hitArea = new PIXI.Rectangle(-halfWidth, -halfHeight, buttonWidth, buttonHeight);
    this.leaderboardButton.visible = visible;
    this.leaderboardButton.alpha = visible ? 0.94 : 0;
    this.leaderboardButton.cursor = visible ? 'pointer' : 'default';
    this.leaderboardButton.eventMode = visible ? 'static' : 'none';

    this.leaderboardButtonGlow.clear();
    this.leaderboardButtonGlow.roundRect(-halfWidth - 7, -halfHeight - 5, buttonWidth + 14, buttonHeight + 10, radius + 4);
    this.leaderboardButtonGlow.fill({ color: 0x00ffff, alpha: visible ? 0.11 : 0 });
    this.leaderboardButtonGlow.roundRect(-halfWidth - 2, -halfHeight - 2, buttonWidth + 4, buttonHeight + 4, radius + 2);
    this.leaderboardButtonGlow.stroke({ color: 0xff55d9, width: 1.5, alpha: visible ? 0.34 : 0 });

    this.leaderboardButtonBg.clear();
    this.leaderboardButtonBg.roundRect(-halfWidth, -halfHeight, buttonWidth, buttonHeight, radius);
    this.leaderboardButtonBg.fill({ color: 0x041323, alpha: 0.92 });
    this.leaderboardButtonBg.roundRect(-halfWidth, -halfHeight, buttonWidth, buttonHeight, radius);
    this.leaderboardButtonBg.stroke({ color: 0x37f5ff, width: 2, alpha: 0.82 });
    this.leaderboardButtonBg.rect(-halfWidth + 14, -halfHeight + 7, buttonWidth - 28, 2);
    this.leaderboardButtonBg.fill({ color: 0x37f5ff, alpha: 0.34 });
    this.leaderboardButtonBg.rect(-halfWidth + 18, halfHeight - 8, buttonWidth - 36, 1);
    this.leaderboardButtonBg.fill({ color: 0xffd15c, alpha: 0.34 });

    if (this.leaderboardButtonLabel) {
      this.leaderboardButtonLabel.text = translateText(this.isSectorStartChallengeResult() ? 'VIEW SECTOR BOARD' : 'VIEW LEADERBOARD');
      this.leaderboardButtonLabel.style.fontSize = layout.isMobile ? 18 : 22;
      this.leaderboardButtonLabel.y = layout.isMobile ? -7 : -8;
    }
    if (this.leaderboardButtonHint) {
      this.leaderboardButtonHint.style.fontSize = layout.isMobile ? 10 : 12;
      this.leaderboardButtonHint.y = layout.isMobile ? 14 : 16;
    }
  }

  drawNextGoalStrip(layout) {
    if (!this.nextGoalGroup || !this.nextGoalBg || !this.nextGoalText) return;
    const canShow = !(this.state === 'submitted_hold' || this.state === 'result_hold' || this.state === 'submitting');
    const text = canShow ? String(this.nextGoal?.text || '').trim() : '';
    this.nextGoalGroup.visible = Boolean(text);
    if (!text) {
      this.nextGoalBg.clear();
      this.nextGoalText.text = '';
      return;
    }

    const tone = this.nextGoal?.tone || 'level';
    const accent = {
      score: 0xffd75f,
      level: 0x37f5ff,
      unlock: 0x9cfbff,
      rank: 0xffd15c,
      leaderboard: 0xff55d9,
      practice: 0xffb35c
    }[tone] || 0x37f5ff;
    const stripWidth = Math.min(layout.width * (layout.isMobile ? 0.82 : 0.52), layout.isMobile ? 340 : 500);
    const stripHeight = layout.isMobile ? 34 : 40;
    const halfWidth = stripWidth / 2;
    const halfHeight = stripHeight / 2;

    this.nextGoalText.text = text;
    this.nextGoalText.style.fontSize = layout.isMobile ? 14 : 17;
    this.nextGoalText.style.wordWrapWidth = Math.max(160, stripWidth - 28);
    this.nextGoalText.y = -1;

    this.nextGoalBg.clear();
    this.nextGoalBg.roundRect(-halfWidth, -halfHeight, stripWidth, stripHeight, layout.isMobile ? 8 : 10);
    this.nextGoalBg.fill({ color: 0x041323, alpha: 0.78 });
    this.nextGoalBg.roundRect(-halfWidth, -halfHeight, stripWidth, stripHeight, layout.isMobile ? 8 : 10);
    this.nextGoalBg.stroke({ color: accent, width: 1.8, alpha: 0.86 });
    this.nextGoalBg.rect(-halfWidth + 14, -halfHeight + 5, stripWidth - 28, 2);
    this.nextGoalBg.fill({ color: accent, alpha: 0.28 });
    this.nextGoalBg.rect(-halfWidth + 18, halfHeight - 6, stripWidth - 36, 1);
    this.nextGoalBg.fill({ color: 0xffffff, alpha: 0.14 });
  }

  createShipUnlockReveal(layout) {
    this.shipUnlockReveal = new PIXI.Container();
    this.shipUnlockReveal.visible = this.newlyUnlockedShips.length > 0;
    this.shipUnlockReveal.zIndex = 7;
    this.shipUnlockRevealGlow = new PIXI.Graphics();
    this.shipUnlockRevealBg = new PIXI.Graphics();
    this.shipUnlockRevealFx = new PIXI.Graphics();
    this.shipUnlockReveal.addChild(this.shipUnlockRevealGlow, this.shipUnlockRevealBg, this.shipUnlockRevealFx);

    this.shipUnlockRevealSprites = [];
    this.shipUnlockRevealStartedAt = Date.now();
    this.shipUnlockRevealDebugLayout = null;
    this.newlyUnlockedShips.slice(0, 4).forEach((ship, index) => {
      const shipPath = GameAssets.getRankShipPath(ship.textureIndex)
        || AssetManifest.sprites.playerRankShips?.[ship.textureIndex]
        || null;
      const texture = GameAssets.getRankShipTexture(ship.textureIndex)
        || PIXI.Texture.EMPTY;
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.alpha = 0.98;
      sprite.__unlockIndex = index;
      sprite.__unlockSeed = index * 1.37 + (Number(ship.textureIndex) || 0) * 0.11;
      if ((!texture || texture === PIXI.Texture.EMPTY || texture.width <= 1 || texture.height <= 1) && shipPath) {
        PIXI.Assets.load(shipPath)
          .then((loadedTexture) => {
            if (loadedTexture && loadedTexture.width > 0 && loadedTexture.height > 0) sprite.texture = loadedTexture;
          })
          .catch((error) => console.warn('[GameOverScene] Ship unlock texture failed:', shipPath, error));
      }
      this.shipUnlockRevealSprites.push(sprite);
      this.shipUnlockReveal.addChild(sprite);
    });

    this.shipUnlockRevealCountText = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 15 : 18,
      fontWeight: 'bold',
      fill: '#fff3a2',
      stroke: '#371800',
      strokeThickness: 3,
      align: 'center'
    });
    this.shipUnlockRevealCountText.anchor.set(0.5);
    this.shipUnlockReveal.addChild(this.shipUnlockRevealCountText);
    this.container.addChild(this.shipUnlockReveal);
  }

  drawShipUnlockReveal(layout) {
    if (!this.shipUnlockReveal || !this.shipUnlockRevealBg || !this.shipUnlockRevealGlow) return;
    const canShow = !(this.state === 'submitted_hold' || this.state === 'result_hold' || this.state === 'submitting');
    const count = canShow ? this.newlyUnlockedShips.length : 0;
    this.shipUnlockReveal.visible = count > 0;
    if (count <= 0) {
      this.shipUnlockRevealBg.clear();
      this.shipUnlockRevealGlow.clear();
      this.shipUnlockRevealFx?.clear();
      this.shipUnlockRevealDebugLayout = null;
      return;
    }

    if (!this.shipUnlockRevealStartedAt) this.shipUnlockRevealStartedAt = Date.now();
    const width = Math.min(layout.width * (layout.isMobile ? 0.84 : 0.52), layout.isMobile ? 350 : 600);
    const height = layout.isMobile ? 76 : 78;
    const visualHeight = height + (layout.isMobile ? 18 : 20);
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const now = Date.now();
    const pulse = 0.5 + Math.sin(now * 0.006) * 0.5;
    const revealAge = Math.max(0, now - this.shipUnlockRevealStartedAt);
    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const easeOutBack = (value) => {
      const x = clamp01(value);
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    };

    this.shipUnlockRevealGlow.clear();
    this.shipUnlockRevealGlow.roundRect(-halfWidth - 16, -halfHeight - 10, width + 32, height + 20, layout.isMobile ? 14 : 18);
    this.shipUnlockRevealGlow.fill({ color: 0xffd75f, alpha: 0.12 + pulse * 0.13 });
    this.shipUnlockRevealGlow.roundRect(-halfWidth - 7, -halfHeight - 6, width + 14, height + 12, layout.isMobile ? 12 : 16);
    this.shipUnlockRevealGlow.stroke({ color: 0x37f5ff, width: layout.isMobile ? 2 : 2.6, alpha: 0.52 + pulse * 0.22 });

    this.shipUnlockRevealBg.clear();
    this.shipUnlockRevealBg.roundRect(-halfWidth, -halfHeight, width, height, layout.isMobile ? 10 : 14);
    this.shipUnlockRevealBg.fill({ color: 0x06101c, alpha: 0.9 });
    this.shipUnlockRevealBg.stroke({ color: 0xffd75f, width: layout.isMobile ? 2 : 2.8, alpha: 0.92 });
    this.shipUnlockRevealBg.rect(-halfWidth + 20, -halfHeight + 8, width - 40, 2);
    this.shipUnlockRevealBg.fill({ color: 0x37f5ff, alpha: 0.42 });
    this.shipUnlockRevealBg.rect(-halfWidth + 20, halfHeight - 9, width - 40, 1.4);
    this.shipUnlockRevealBg.fill({ color: 0xffffff, alpha: 0.16 + pulse * 0.06 });

    const spriteSize = layout.isMobile ? 52 : 64;
    const gap = layout.isMobile ? 64 : 82;
    const sprites = this.shipUnlockRevealSprites || [];
    const totalSpriteWidth = Math.max(0, (sprites.length - 1) * gap);
    const startX = -totalSpriteWidth / 2;
    this.shipUnlockRevealFx?.clear();
    sprites.forEach((sprite, index) => {
      const textureWidth = Math.max(1, sprite.texture.width || sprite.width || spriteSize);
      const textureHeight = Math.max(1, sprite.texture.height || sprite.height || spriteSize);
      const baseScale = Math.min(spriteSize / textureWidth, spriteSize / textureHeight);
      const localAge = revealAge - index * 120;
      const pop = easeOutBack(localAge / 520);
      const settle = clamp01(localAge / 700);
      const hover = Math.sin(now * 0.004 + (sprite.__unlockSeed || index)) * (layout.isMobile ? 2.2 : 3.2);
      const breathing = 1 + Math.sin(now * 0.005 + index * 0.8) * 0.025;
      const scale = baseScale * (0.58 + pop * 0.42) * breathing;
      const x = startX + index * gap;
      const y = hover - (1 - settle) * (layout.isMobile ? 11 : 16);
      sprite.scale.set(scale);
      sprite.x = x;
      sprite.y = y;
      sprite.alpha = 0.28 + clamp01(localAge / 360) * 0.72;
      sprite.rotation = Math.sin(now * 0.003 + index) * 0.045 + (1 - settle) * (index % 2 === 0 ? -0.09 : 0.09);

      if (this.shipUnlockRevealFx) {
        const ringPulse = 0.5 + Math.sin(now * 0.007 + index * 0.9) * 0.5;
        const ringRadius = spriteSize * (0.43 + ringPulse * 0.08);
        const exhaustY = y + spriteSize * 0.43;
        this.shipUnlockRevealFx.circle(x, y, ringRadius);
        this.shipUnlockRevealFx.stroke({ color: index % 2 === 0 ? 0x37f5ff : 0xffd75f, width: layout.isMobile ? 1.4 : 1.9, alpha: 0.22 + ringPulse * 0.22 });
        this.shipUnlockRevealFx.moveTo(x - spriteSize * 0.23, exhaustY);
        this.shipUnlockRevealFx.lineTo(x - spriteSize * 0.33, exhaustY + spriteSize * (0.12 + ringPulse * 0.06));
        this.shipUnlockRevealFx.moveTo(x + spriteSize * 0.23, exhaustY);
        this.shipUnlockRevealFx.lineTo(x + spriteSize * 0.33, exhaustY + spriteSize * (0.12 + ringPulse * 0.06));
        this.shipUnlockRevealFx.stroke({ color: 0x9cfbff, width: layout.isMobile ? 1.8 : 2.4, alpha: 0.26 + ringPulse * 0.18 });
      }
    });

    const remaining = Math.max(0, count - sprites.length);
    if (this.shipUnlockRevealCountText) {
      this.shipUnlockRevealCountText.visible = remaining > 0;
      this.shipUnlockRevealCountText.text = remaining > 0 ? `+${remaining}` : '';
      this.shipUnlockRevealCountText.style.fontSize = layout.isMobile ? 19 : 25;
      this.shipUnlockRevealCountText.x = startX + sprites.length * gap + (layout.isMobile ? 5 : 8);
      this.shipUnlockRevealCountText.y = 0;
      this.shipUnlockRevealCountText.scale.set(1 + pulse * 0.04);
    }
    this.shipUnlockRevealDebugLayout = {
      width,
      height: visualHeight,
      frameHeight: height,
      spriteSize,
      spriteCount: sprites.length,
      state: this.state
    };
  }

  getPrimaryCtaConfig() {
    if (this.state === 'runback' || this.state === 'submitted' || this.state === 'skipped' || this.state === 'unranked') {
      return {
        mode: 'restart',
        label: translateText(getRunModeProfile(this.game?.runMode).oneMoreLabel || 'ONE MORE RUN'),
        hint: this.isSubmitting
          ? translateText('SAVING SCORE')
          : this.isDailySignalResult()
          ? (this.lastInputDevice === 'controller'
              ? translateText('A: SAME DAILY CONTRACT  |  B: MENU')
              : translateText('ENTER / SPACE / CLICK - RETRY TODAY'))
          : this.isSectorStartChallengeResult()
          ? (this.lastInputDevice === 'controller'
              ? translateText('A: SAME CHECKPOINT  |  B: MENU')
              : translateText('SPACE / CLICK - SAME CHECKPOINT'))
          : (this.lastInputDevice === 'controller' ? 'A: SAME SHIP  |  Y: LEADERBOARD' : 'ENTER / SPACE / CLICK - SAME SHIP'),
        disabled: this.isSubmitting,
        runback: true
      };
    }

    if (this.state === 'submitting') {
      return {
        mode: 'submitting',
        label: 'SAVING SCORE',
        hint: this.lastInputDevice === 'controller' ? 'SAVING...' : 'LEADERBOARD FIRST',
        disabled: true
      };
    }

    if (this.state === 'submitted_hold') {
      return {
        mode: 'submitted_hold',
        label: translateText('CONTINUE'),
        hint: this.lastInputDevice === 'controller' ? `A: ${translateText('CONTINUE')}` : 'ENTER / SPACE / CLICK',
        disabled: !this.isSubmittedHoldContinueReady()
      };
    }

    if (this.state === 'result_hold') {
      return {
        mode: 'result_hold',
        label: translateText('CONTINUE'),
        hint: this.lastInputDevice === 'controller' ? `A: ${translateText('CONTINUE')}` : 'ENTER / SPACE / CLICK',
        disabled: !this.isResultHoldContinueReady()
      };
    }

    if (this.state === 'input') {
      return {
        mode: 'submit',
        label: 'SUBMIT SCORE',
        hint: this.lastInputDevice === 'controller'
          ? (this.nameInput.length > 0 ? 'A / Y: SUBMIT  |  B: BACK' : 'D-PAD: PICK NAME')
          : (this.nameInput.length > 0 ? 'ENTER / CLICK' : 'TYPE NAME FIRST'),
        disabled: this.nameInput.length === 0
      };
    }

    if (this.isRankedRun && this.globalStatus === 'checking' && !this.localQualified) {
      return {
        mode: 'checking',
        label: 'CHECKING BOARD',
        hint: this.lastInputDevice === 'controller' ? 'WAITING FOR BOARD' : 'LEADERBOARD FIRST',
        disabled: true
      };
    }

    if (this.isRankedRun && this.updateCanEnterName()) {
      const boardSlot = this.localQualified && this.globalQualified
        ? 'LOCAL + GLOBAL SLOT'
        : this.globalQualified
          ? 'GLOBAL SLOT'
          : 'LOCAL SLOT';
      return {
        mode: 'leaderboard',
        label: 'SUBMIT SCORE',
        hint: this.lastInputDevice === 'controller' ? `${boardSlot} - A: PICK NAME` : `${boardSlot} - PILOT NAME FIRST`,
        disabled: false
      };
    }

    return {
      mode: 'restart',
      label: 'ONE MORE RUN',
      hint: this.lastInputDevice === 'controller' ? 'A: RESTART  |  B: MENU' : 'CLICK / R / SPACE / GAMEPAD A',
      disabled: false
    };
  }

  handlePrimaryCtaPress() {
    const config = this.getPrimaryCtaConfig();
    if (config.disabled) return;

    if (config.mode === 'leaderboard') {
      this.enterInputMode();
      return;
    }

    if (config.mode === 'submit') {
      if (this.nameInput.length > 0) {
        this.submitScore();
      }
      return;
    }

    if (config.mode === 'submitted_hold') {
      this.continueFromSubmittedHold();
      return;
    }

    if (config.mode === 'result_hold') {
      this.continueFromResultHold();
      return;
    }

    if (config.mode === 'restart') {
      this.restartRun();
    }
  }

  refreshPrimaryCta() {
    if (!this.game?.app?.screen || !this.retryButton) return;
    const { width, height } = this.game.app.screen;
    const layout = createTextLayout(width, height, getCurrentLayout());
    this.drawCounterAdviceCard(layout);
    this.drawRetryButton(layout);
    this.drawLeaderboardButton(layout);
    this.drawHangarButton(layout);
    this.drawMainMenuButton(layout);
    this.drawRunReportButton(layout);
    this.layoutRunReportOverlay(layout);
  }

  createFallbackBackdrop(width, height) {
    this.backdropShade = new PIXI.Graphics();
    this.backdropShade.zIndex = -10;
    this.container.addChild(this.backdropShade);
    this.layoutBackdrop(width, height);
  }

  createCeremonyVisuals() {
    this.ceremonyGlow = new PIXI.Graphics();
    this.ceremonyGlow.zIndex = -8;
    this.container.addChild(this.ceremonyGlow);

    this.ceremonyBurst = new PIXI.Graphics();
    this.ceremonyBurst.zIndex = -7;
    this.ceremonyBurst.blendMode = 'add';
    this.container.addChild(this.ceremonyBurst);

    this.ceremonyFrame = new PIXI.Graphics();
    this.ceremonyFrame.zIndex = -6;
    this.container.addChild(this.ceremonyFrame);

    this.ceremonyMedal = new PIXI.Container();
    this.ceremonyMedal.zIndex = -2;
    this.ceremonyMedal.visible = false;
    this.ceremonyMedalBg = new PIXI.Graphics();
    this.ceremonyMedalText = createText('', {
      fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
      fontSize: 86,
      fontWeight: '900',
      fill: '#fff8b8',
      stroke: '#3b1700',
      strokeThickness: 7,
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#ffc94a',
      dropShadowBlur: 12
    });
    this.ceremonyMedalText.anchor.set(0.5);
    this.ceremonyMedalSubtext = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 22,
      fontWeight: '900',
      fill: '#d9fdff',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center',
      letterSpacing: 0
    });
    this.ceremonyMedalSubtext.anchor.set(0.5);
    this.ceremonyMedal.addChild(this.ceremonyMedalBg, this.ceremonyMedalText, this.ceremonyMedalSubtext);
    this.container.addChild(this.ceremonyMedal);

    this.fanfareParticles = Array.from({ length: 112 }, (_, index) => {
      const particle = new PIXI.Graphics();
      particle.zIndex = -4;
      particle.eventMode = 'none';
      particle.alpha = 0.28 + (index % 9) * 0.07;
      particle.__fanfare = {
        seed: index * 37.7,
        lane: index % 3 === 0 ? 0 : index % 2 === 0 ? -1 : 1,
        speed: 0.45 + (index % 9) * 0.035
      };
      this.container.addChild(particle);
      return particle;
    });
    this.createGameOverDoomFx();
  }

  createGameOverDoomFx() {
    this.gameOverDoomLayer = new PIXI.Container();
    this.gameOverDoomLayer.zIndex = -5;
    this.gameOverDoomLayer.eventMode = 'none';
    this.container.addChild(this.gameOverDoomLayer);

    this.gameOverAlarmSweep = new PIXI.Graphics();
    this.gameOverAlarmSweep.blendMode = 'add';
    this.gameOverDoomLayer.addChild(this.gameOverAlarmSweep);

    this.gameOverRings = Array.from({ length: 7 }, () => {
      const ring = new PIXI.Graphics();
      ring.blendMode = 'add';
      this.gameOverDoomLayer.addChild(ring);
      return ring;
    });

    this.gameOverGlitchBars = Array.from({ length: 10 }, () => {
      const bar = new PIXI.Graphics();
      bar.blendMode = 'add';
      this.gameOverDoomLayer.addChild(bar);
      return bar;
    });

    this.gameOverShards = Array.from({ length: 72 }, (_, index) => {
      const shard = new PIXI.Graphics();
      shard.blendMode = index % 3 === 0 ? 'normal' : 'add';
      shard.__doom = {
        seed: 19 + index * 41,
        speed: 0.6 + (index % 11) * 0.06,
        lane: index % 4
      };
      this.gameOverDoomLayer.addChild(shard);
      return shard;
    });
  }

  async initBackdrop(width, height) {
    const backdropSrc = AssetManifest.generated?.gameOverCeremony || AssetManifest.generated?.menuBackdrop;
    if (!backdropSrc) return;
    try {
      const texture = await PIXI.Assets.load({
        alias: 'gameover_ceremony_backdrop',
        src: backdropSrc
      });
      if (!this.container?.parent && this.game.currentScene !== this) return;
      this.backdrop = new PIXI.Sprite(texture);
      this.backdrop.anchor.set(0.5);
      this.backdrop.alpha = 0.72;
      this.backdrop.zIndex = -20;
      this.container.addChild(this.backdrop);
      this.backdropLoaded = true;
      this.layoutBackdrop(width, height);
    } catch (error) {
      if (this.game?.currentScene === this) {
        console.warn('[GameOverScene] Generated backdrop failed to load:', error);
      }
    }
  }

  layoutBackdrop(width = this.game.app.screen.width, height = this.game.app.screen.height) {
    if (this.backdrop) {
      const textureWidth = this.backdrop.texture?.width || width;
      const textureHeight = this.backdrop.texture?.height || height;
      const scale = Math.max(width / textureWidth, height / textureHeight);
      this.backdrop.scale.set(scale);
      this.backdrop.position.set(width / 2, height / 2);
    }
    if (this.backdropShade) {
      this.backdropShade.clear();
      this.backdropShade.rect(0, 0, width, height);
      this.backdropShade.fill({ color: 0x020713, alpha: 0.34 });
      this.backdropShade.rect(0, 0, width, height);
      this.backdropShade.fill({ color: 0x000000, alpha: 0.1 });
    }
  }

  layoutCeremonyVisuals(width = this.game.app.screen.width, height = this.game.app.screen.height, layout = getCurrentLayout()) {
    const holdStage = this.state === 'submitted_hold' || this.state === 'result_hold' || this.state === 'submitting';
    const runbackStage = this.state === 'runback';
    const resultCelebrationStage = this.state === 'runback' || holdStage;
    const panelWidth = Math.min(width * (layout.isMobile ? 0.92 : 0.58), layout.isMobile ? 560 : 760);
    const panelHeight = runbackStage
      ? Math.min(height * (layout.isMobile ? 0.5 : 0.46), layout.isMobile ? 420 : 430)
      : Math.min(height * (layout.isMobile ? 0.72 : 0.64), layout.isMobile ? 560 : 590);
    const x = (width - panelWidth) / 2;
    const y = runbackStage
      ? Math.max(layout.safeArea?.top || 0, height * (layout.isMobile ? 0.15 : 0.14))
      : Math.max(layout.safeArea?.top || 0, (height - panelHeight) * (layout.isMobile ? 0.34 : 0.4));
    const accent = this.globalPlacement?.numberOne
      ? 0xffe86a
      : this.globalPlacement?.top3
        ? 0xffb84a
        : this.globalPlacement?.top10
          ? 0x87f8ff
          : this.globalQualified
            ? 0x00ffff
            : this.globalPlacement?.nearGlobal
              ? 0xff9b42
              : 0x23d8ff;

    if (this.ceremonyGlow) {
      this.ceremonyGlow.clear();
      this.ceremonyGlow.ellipse(width / 2, y + panelHeight * 0.5, panelWidth * 0.72, panelHeight * 0.56);
      const celebrationAlpha = holdStage
        ? (this.globalPlacement?.numberOne ? 0.26 : 0.2)
        : (this.globalPlacement?.numberOne ? 0.18 : 0.14);
      this.ceremonyGlow.fill({ color: accent, alpha: this.globalQualified ? celebrationAlpha : 0.08 });
    }

    if (this.ceremonyBurst) {
      this.ceremonyBurst.clear();
      const celebration = resultCelebrationStage && this.globalPlacement?.qualified;
      if (celebration) {
        const centerX = width / 2;
        const centerY = y + panelHeight * (holdStage ? 0.48 : 0.56);
        const rayCount = this.globalPlacement?.numberOne
          ? (holdStage ? 34 : 28)
          : this.globalPlacement?.top10
            ? (holdStage ? 30 : 24)
            : (holdStage ? 28 : 22);
        const inner = panelWidth * (this.globalPlacement?.numberOne ? 0.18 : this.globalPlacement?.top10 ? 0.15 : 0.13);
        const outer = panelWidth * (this.globalPlacement?.numberOne ? 0.78 : this.globalPlacement?.top10 ? 0.7 : 0.62);
        const rayAlpha = holdStage
          ? (this.globalPlacement?.numberOne ? 0.14 : this.globalPlacement?.top10 ? 0.11 : 0.1)
          : (this.globalPlacement?.numberOne ? 0.065 : this.globalPlacement?.top10 ? 0.052 : 0.045);
        for (let i = 0; i < rayCount; i += 1) {
          const a0 = (Math.PI * 2 * i) / rayCount + (this.ceremonyPulse || 0) * 0.004;
          const a1 = a0 + Math.PI / rayCount * 0.72;
          this.ceremonyBurst.moveTo(centerX + Math.cos(a0) * inner, centerY + Math.sin(a0) * inner);
          this.ceremonyBurst.lineTo(centerX + Math.cos(a0) * outer, centerY + Math.sin(a0) * outer);
          this.ceremonyBurst.lineTo(centerX + Math.cos(a1) * (outer * 0.72), centerY + Math.sin(a1) * (outer * 0.72));
          this.ceremonyBurst.closePath();
          this.ceremonyBurst.fill({ color: i % 2 ? 0xfff08a : 0x37f5ff, alpha: rayAlpha });
        }
        this.ceremonyBurst.circle(centerX, centerY, panelWidth * (this.globalPlacement?.numberOne ? 0.28 : this.globalPlacement?.top10 ? 0.25 : 0.22));
        this.ceremonyBurst.stroke({ color: accent, width: this.globalPlacement?.numberOne ? 7 : this.globalPlacement?.top10 ? 6 : 5, alpha: holdStage ? 0.26 : 0.12 });
        this.ceremonyBurst.circle(centerX, centerY, panelWidth * (this.globalPlacement?.numberOne ? 0.36 : this.globalPlacement?.top10 ? 0.33 : 0.3));
        this.ceremonyBurst.stroke({ color: 0xffffff, width: 2, alpha: holdStage ? (this.globalPlacement?.numberOne ? 0.22 : this.globalPlacement?.top10 ? 0.18 : 0.16) : 0.08 });
      }
    }

    if (this.ceremonyFrame) {
      this.ceremonyFrame.clear();
      if (runbackStage) {
        // Final result cards and the side medal carry the structure; an outer border can cross rows/buttons.
      } else {
        this.ceremonyFrame.roundRect(x, y, panelWidth, panelHeight, 18);
        this.ceremonyFrame.fill({ color: 0x020914, alpha: 0.52 });
        this.ceremonyFrame.roundRect(x, y, panelWidth, panelHeight, 18);
        this.ceremonyFrame.stroke({ color: accent, alpha: 0.82, width: this.globalQualified ? 3 : 2 });
        this.ceremonyFrame.rect(x + 20, y + 12, panelWidth - 40, 3);
        this.ceremonyFrame.fill({ color: accent, alpha: 0.54 });
        this.ceremonyFrame.rect(x + 20, y + panelHeight - 15, panelWidth - 40, 2);
        this.ceremonyFrame.fill({ color: accent, alpha: 0.38 });
      }
    }

    if (this.ceremonyMedal && this.ceremonyMedalBg && this.ceremonyMedalText && this.ceremonyMedalSubtext) {
      const placement = this.globalPlacement;
      const celebration = resultCelebrationStage && placement?.qualified && (placement.numberOne || placement.top3 || placement.top10);
      this.ceremonyMedal.visible = Boolean(celebration);
      if (celebration) {
        const badgeRadius = layout.isMobile
          ? (placement.numberOne ? 72 : placement.top3 ? 60 : 54)
          : (placement.numberOne ? (holdStage ? 118 : 96) : placement.top3 ? (holdStage ? 96 : 78) : (holdStage ? 86 : 68));
        const pulse = 0.5 + Math.sin(Date.now() * 0.006) * 0.5;
        const badgeX = layout.isMobile
          ? width / 2
          : Math.min(width - badgeRadius - 28, x + panelWidth + badgeRadius + 28);
        const badgeY = layout.isMobile
          ? y + panelHeight * (holdStage ? 0.74 : 0.24)
          : y + panelHeight * (holdStage ? 0.48 : 0.44);
        this.ceremonyMedal.position.set(badgeX, badgeY);
        this.ceremonyMedal.scale.set(1 + pulse * (placement.numberOne ? 0.035 : placement.top3 ? 0.022 : 0.016));
        this.ceremonyMedalBg.clear();
        this.ceremonyMedalBg.circle(0, 0, badgeRadius + 14);
        this.ceremonyMedalBg.fill({ color: placement.numberOne ? 0xffd75f : placement.top3 ? 0xff9b42 : 0x37f5ff, alpha: placement.numberOne ? 0.28 : placement.top3 ? 0.2 : 0.16 });
        this.ceremonyMedalBg.circle(0, 0, badgeRadius);
        this.ceremonyMedalBg.fill({ color: 0x071523, alpha: 0.82 });
        this.ceremonyMedalBg.circle(0, 0, badgeRadius);
        this.ceremonyMedalBg.stroke({ color: placement.numberOne ? 0xfff3a2 : placement.top3 ? 0xffc264 : 0x87f8ff, width: placement.numberOne ? 6 : placement.top3 ? 4 : 3, alpha: 0.95 });
        this.ceremonyMedalBg.circle(0, 0, badgeRadius - 13);
        this.ceremonyMedalBg.stroke({ color: 0x37f5ff, width: 2, alpha: 0.58 });
        this.ceremonyMedalText.text = placement.numberOne ? '#1' : `#${placement.placement || 3}`;
        this.ceremonyMedalText.style.fontSize = layout.isMobile
          ? (placement.numberOne ? 66 : placement.top3 ? 54 : 46)
          : (placement.numberOne ? 104 : placement.top3 ? 78 : 66);
        this.ceremonyMedalText.y = placement.numberOne ? -5 : -3;
        this.ceremonyMedalSubtext.text = translateText('STEAM BEST');
        this.ceremonyMedalSubtext.style.fontSize = layout.isMobile ? 14 : 18;
        this.ceremonyMedalSubtext.y = badgeRadius * 0.46;
      } else {
        this.ceremonyMedalBg.clear();
      }
    }
  }

  setupKeyboard() {
    this.keyHandler = (e) => {
      const isSubmitKey = e.key === 'Enter' || e.key === 'Return' || e.code === 'NumpadEnter';
      const isRestartKey = e.code === 'KeyR' || e.key === 'r' || e.key === 'R' || e.code === 'Space';
      const isEscape = e.key === 'Escape';
      const isLeaderboardKeyTarget = this.isLeaderboardInputFocused();

      if (isLeaderboardKeyTarget) {
        return;
      }

      this.setInputDevice('keyboard');

      if (this.runReportOpen) {
        if (this.isDailySignalResult() && (e.code === 'KeyS' || e.key === 's' || e.key === 'S')) {
          e.preventDefault();
          if (!e.repeat) void this.saveDailySignalShareCard();
          return;
        }
        if (this.isDailySignalResult() && (e.code === 'KeyC' || e.key === 'c' || e.key === 'C')) {
          e.preventDefault();
          if (!e.repeat) void this.copyDailySignalShareCaption();
          return;
        }
        if (isEscape || isSubmitKey || isRestartKey) {
          e.preventDefault();
          this.closeRunReport();
        }
        return;
      }

      if (this.state === 'submitting' && !isRestartKey && !isEscape) {
        return;
      }

      if (this.state === 'submitted_hold') {
        if (isSubmitKey || isRestartKey) {
          e.preventDefault();
          if (e.repeat) {
            this.refreshPrimaryCta();
            return;
          }
          this.continueFromSubmittedHold();
        } else if (isEscape) {
          e.preventDefault();
          this.returnToMenu();
        }
        return;
      }

      if (this.state === 'result_hold') {
        if (isSubmitKey || isRestartKey) {
          e.preventDefault();
          if (e.repeat) {
            this.refreshPrimaryCta();
            return;
          }
          this.continueFromResultHold();
        } else if (isEscape) {
          e.preventDefault();
          this.returnToMenu();
        }
        return;
      }

      if (isEscape) {
        e.preventDefault();
        if (this.state === 'input') {
          this.skipScoreSubmission('escape_input');
        } else if (this.state === 'prompt' && this.isRankedRun && this.updateCanEnterName()) {
          this.skipScoreSubmission('escape_prompt');
        } else {
          this.returnToMenu();
        }
        return;
      }

      if (this.state === 'runback' && (isRestartKey || isSubmitKey)) {
        e.preventDefault();
        this.restartRun();
        return;
      }

      if (this.shouldShowLeaderboardButton() && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        this.openLeaderboard();
        return;
      }

      if (this.shouldShowHangarButton() && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        this.openHangar();
        return;
      }

      if (this.state !== 'input' && isRestartKey) {
        e.preventDefault();
        if (this.state === 'prompt' && this.isRankedRun && this.globalStatus === 'checking' && !this.localQualified) {
          this.updatePromptMessage('CHECKING GLOBAL BOARD...');
          this.refreshPrimaryCta();
          return;
        }
        if (this.state === 'prompt' && this.isRankedRun && this.updateCanEnterName()) {
          this.enterInputMode();
          return;
        }
        if (this.state === 'prompt' && this.isRankedRun && !this.updateCanEnterName()) {
          this.enterResultHoldStage(this.globalStatus === 'offline' ? 'offline_no_slot' : 'no_slot');
          return;
        }
        this.restartRun();
        return;
      }

      if (this.state === 'prompt') {
        if (isSubmitKey) {
          e.preventDefault();
          if (this.isRankedRun && this.updateCanEnterName()) {
            this.enterInputMode();
          } else if (!this.isRankedRun || this.globalStatus !== 'checking') {
            this.enterResultHoldStage(this.globalStatus === 'offline' ? 'offline_no_slot' : 'no_slot');
          }
        }
        return;
      }

      if (this.state === 'input') {
        if (isSubmitKey && this.nameInput.length > 0) {
          e.preventDefault();
          this.submitScore();
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          this.nameInput = this.nameInput.slice(0, -1);
          this.syncHiddenInput();
          this.updateNameDisplay();
          return;
        }
        const char = e.key.toUpperCase();
        if (/^[A-Z0-9 ]$/.test(char) && this.nameInput.length < PILOT_NAME_MAX_LENGTH) {
          e.preventDefault();
          this.nameInput += char;
          this.syncHiddenInput();
          this.updateNameDisplay();
        }
      }
    };

    window.addEventListener('keydown', this.keyHandler);
  }

  update(delta = 1) {
    updateMenuFx(this, delta);
    this.updateCeremonyEffects();
    this.updatePersonalBestCarry(delta);
    if (this.shipUnlockReveal?.visible) {
      this.drawShipUnlockReveal(createTextLayout(this.game.app.screen.width, this.game.app.screen.height, getCurrentLayout()));
    }
    if (this.state === 'runback' && this.retryButton?.visible) {
      this.drawRetryButton(createTextLayout(this.game.app.screen.width, this.game.app.screen.height, getCurrentLayout()));
    }
    const nav = this.gamepadNavigator.update();
    if (nav.connected && nav.active) {
      this.setInputDevice('controller');
      this.handleGamepadNavigation(nav);
    }
  }

  handleGamepadNameInput(nav) {
    if (nav.pressed.cancel || nav.pressed.back || nav.pressed.menu) {
      this.exitInputMode();
      return true;
    }
    if (nav.pressed.left || nav.pressed.lb) {
      this.moveControllerNameCursor(-1);
      return true;
    }
    if (nav.pressed.right || nav.pressed.rb) {
      this.moveControllerNameCursor(1);
      return true;
    }
    if (nav.pressed.up) {
      this.cycleControllerNameChar(-1);
      return true;
    }
    if (nav.pressed.down) {
      this.cycleControllerNameChar(1);
      return true;
    }
    if (nav.pressed.confirm || nav.pressed.y) {
      if (this.nameInput.length > 0) this.submitScore();
      return true;
    }
    return false;
  }

  handleGamepadNavigation(nav) {
    if (this.runReportOpen) {
      if (this.isDailySignalResult() && nav.pressed.x) {
        void this.saveDailySignalShareCard();
      } else if (this.isDailySignalResult() && nav.pressed.y) {
        void this.copyDailySignalShareCaption();
      } else if (nav.pressed.cancel || nav.pressed.back || nav.pressed.menu || nav.pressed.confirm) {
        this.closeRunReport();
      }
      return;
    }
    if (this.state === 'submitting') return;
    if (this.state === 'submitted_hold') {
      if (nav.pressed.menu || nav.pressed.back || nav.pressed.cancel) {
        this.returnToMenu();
      } else if (nav.pressed.confirm) {
        this.continueFromSubmittedHold();
      }
      return;
    }
    if (this.state === 'result_hold') {
      if (nav.pressed.menu || nav.pressed.back || nav.pressed.cancel) {
        this.returnToMenu();
      } else if (nav.pressed.confirm) {
        this.continueFromResultHold();
      }
      return;
    }
    if (this.state === 'input') {
      this.handleGamepadNameInput(nav);
      return;
    }

    if (nav.pressed.y && this.shouldShowLeaderboardButton()) {
      this.openLeaderboard();
      return;
    }

    if (nav.pressed.x && this.shouldShowHangarButton()) {
      this.openHangar();
      return;
    }

    if (nav.pressed.menu || nav.pressed.back) {
      this.returnToMenu();
      return;
    }

    if (nav.pressed.cancel) {
      if (this.state === 'prompt' && this.isRankedRun && this.updateCanEnterName()) {
        this.skipScoreSubmission('controller_cancel_prompt');
      } else {
        this.returnToMenu();
      }
      return;
    }

    if (!nav.pressed.confirm) return;

    if (this.state === 'prompt' && this.isRankedRun && this.globalStatus === 'checking' && !this.localQualified) {
      this.updatePromptMessage('CHECKING GLOBAL BOARD...');
      this.refreshPrimaryCta();
      return;
    }

    if (this.state === 'prompt' && this.isRankedRun && this.updateCanEnterName()) {
      this.enterInputMode();
      return;
    }

    if (this.state === 'prompt' && this.isRankedRun && !this.updateCanEnterName()) {
      this.enterResultHoldStage(this.globalStatus === 'offline' ? 'offline_no_slot' : 'no_slot');
      return;
    }

    this.restartRun();
  }

  updateCeremonyEffects() {
    if (!this.fanfareParticles?.length) return;
    const { width, height } = this.game.app.screen;
    this.ceremonyPulse += 1;
    this.updateGameOverDoomEffects(width, height);
    const activeBoost = this.globalQualified ? 1 : 0.45;
    const color = this.globalPlacement?.numberOne
      ? 0xfff08a
      : this.globalPlacement?.top3
        ? 0xffba57
        : this.globalPlacement?.top10
          ? 0x9cfbff
          : this.globalQualified
            ? 0x65f7ff
            : 0x7ca6ff;
    for (const particle of this.fanfareParticles) {
      const config = particle.__fanfare || { seed: 0, lane: 1, speed: 0.5 };
      const drift = ((this.ceremonyPulse * config.speed + config.seed) % 220) / 220;
      const sideBase = config.lane === 0 ? width * 0.5 : config.lane < 0 ? width * 0.1 : width * 0.9;
      const x = sideBase + Math.sin((this.ceremonyPulse + config.seed) * 0.025) * width * (config.lane === 0 ? 0.22 : 0.08);
      const y = height * (0.06 + drift * 0.84);
      const placementBoost = this.globalPlacement?.numberOne ? 1.35 : this.globalPlacement?.top3 ? 1.16 : this.globalPlacement?.top10 ? 1.08 : 1;
      const size = (2.4 + (config.seed % 6)) * activeBoost * placementBoost;
      particle.clear();
      if (this.globalPlacement?.numberOne && config.seed % 2 > 1) {
        for (let point = 0; point < 10; point += 1) {
          const radius = point % 2 === 0 ? size * 1.7 : size * 0.72;
          const angle = -Math.PI / 2 + point * Math.PI / 5;
          const px = Math.cos(angle) * radius;
          const py = Math.sin(angle) * radius;
          if (point === 0) particle.moveTo(px, py);
          else particle.lineTo(px, py);
        }
        particle.closePath();
      } else {
        particle.rect(-size * 0.5, -size * 0.5, size * 2.8, size);
      }
      particle.fill({ color, alpha: (this.globalQualified ? 0.76 : 0.28) * (1 - drift * 0.55) });
      particle.position.set(x, y);
      particle.rotation += 0.035 + config.speed * 0.01;
    }
    if (this.state === 'runback') {
      this.refreshPrimaryCta();
    }
  }

  updateGameOverDoomEffects(width, height) {
    const profile = this.gameOverEffectProfile || GAME_OVER_EFFECT_PROFILES[0];
    const pulse = this.ceremonyPulse + profile.pulseOffset;
    const centerX = width * 0.5 + Math.sin(pulse * 0.011) * width * 0.018 * profile.jitter;
    const centerY = height * 0.43 + Math.cos(pulse * 0.014) * height * 0.018 * profile.jitter;
    const maxRadius = Math.hypot(width, height) * 0.42;
    const resultStage = this.state === 'runback'
      || this.state === 'submitted_hold'
      || this.state === 'result_hold'
      || this.state === 'submitting';
    const dangerAlpha = resultStage ? 0.08 : 0.14;

    if (this.gameOverAlarmSweep) {
      const sweep = this.gameOverAlarmSweep;
      const angle = pulse * profile.sweepSpeed;
      const length = Math.max(width, height) * 0.92;
      const thickness = 8 + (profile.pulseOffset % 7);
      sweep.clear();
      sweep.position.set(centerX, centerY);
      sweep.rotation = angle + profile.tilt;
      sweep.rect(-length * 0.5, -thickness * 0.5, length, thickness);
      sweep.fill({ color: profile.secondary, alpha: dangerAlpha * (0.42 + Math.sin(pulse * 0.045) * 0.12) });
      sweep.rect(-length * 0.5, -1, length, 2);
      sweep.fill({ color: profile.accent, alpha: resultStage ? 0.1 : 0.18 });
    }

    for (let index = 0; index < this.gameOverRings.length; index += 1) {
      const ring = this.gameOverRings[index];
      const visible = index < Math.min(profile.ringCount, resultStage ? 3 : 4);
      ring.visible = visible;
      ring.clear();
      if (!visible) continue;
      const phase = ((pulse * profile.ringSpeed + index * 41) % 180) / 180;
      const radius = 42 + phase * maxRadius;
      const alpha = (1 - phase) * (0.18 + (index % 2) * 0.05);
      ring.circle(centerX, centerY, radius);
      ring.stroke({ color: index % 2 ? profile.accent : profile.primary, alpha, width: 1.2 + (index % 2) * 0.8 });
      ring.circle(centerX, centerY, radius * 0.62);
      ring.stroke({ color: profile.secondary, alpha: alpha * 0.32, width: 1 });
    }

    for (let index = 0; index < this.gameOverGlitchBars.length; index += 1) {
      const bar = this.gameOverGlitchBars[index];
      const visible = index < profile.glitchCount;
      bar.visible = visible;
      bar.clear();
      if (!visible) continue;
      const bandPhase = (Math.sin(pulse * 0.037 + index * 2.1) + 1) * 0.5;
      const y = height * (0.12 + ((index * 0.137 + bandPhase * 0.19 + pulse * 0.0009) % 0.78));
      const xJitter = Math.sin(pulse * 0.071 + index) * 26 * profile.jitter;
      const barHeight = 3 + (index % 4) * 2;
      const barWidth = width * (0.18 + (index % 5) * 0.045);
      bar.rect(width * (index % 2 ? 0.58 : 0.08) + xJitter, y, barWidth, barHeight);
      bar.fill({ color: index % 3 === 0 ? profile.primary : profile.accent, alpha: 0.06 + bandPhase * 0.08 });
      if (index % 2 === 0) {
        bar.rect(width * 0.02, y + barHeight + 5, width * (0.08 + bandPhase * 0.18), 1);
        bar.fill({ color: profile.secondary, alpha: 0.14 });
      }
    }

    for (let index = 0; index < this.gameOverShards.length; index += 1) {
      const shard = this.gameOverShards[index];
      const config = shard.__doom || { seed: index * 17, speed: 0.8, lane: 0 };
      const visible = index < profile.shardCount;
      shard.visible = visible;
      shard.clear();
      if (!visible) continue;
      const drift = ((pulse * config.speed + config.seed) % 260) / 260;
      const side = config.lane < 2 ? -0.08 : 1.08;
      const x = width * side + (config.lane < 2 ? 1 : -1) * drift * width * 1.16;
      const y = height * (0.1 + ((config.seed * 0.0037 + drift * 0.78) % 0.82));
      const size = 3 + (config.seed % 11) * 0.45;
      const alpha = 0.12 + (1 - Math.abs(drift - 0.5) * 2) * 0.38;
      shard.moveTo(0, -size);
      shard.lineTo(size * 0.58, size * 0.75);
      shard.lineTo(-size * 0.58, size * 0.75);
      shard.closePath();
      shard.fill({ color: index % 5 === 0 ? profile.secondary : index % 2 ? profile.accent : profile.primary, alpha });
      shard.position.set(x, y);
      shard.rotation = pulse * 0.018 * (index % 2 ? 1 : -1) + config.seed;
      shard.scale.set(1, 0.72 + (index % 4) * 0.08);
    }
  }

  isGamepadActionPressed() {
    const override = typeof window !== 'undefined' ? window.__burtGamepadOverride : null;
    const snapshot = override || (typeof navigator !== 'undefined' && navigator.getGamepads
      ? Array.from(navigator.getGamepads()).find(pad => pad && pad.connected)
      : null);
    const buttons = snapshot?.buttons || [];
    const pressed = (index) => {
      const button = buttons[index];
      if (button == null) return false;
      if (typeof button === 'number') return button > 0.5;
      return Boolean(button.pressed || button.value > 0.5);
    };
    return pressed(0) || pressed(7);
  }

  isGamepadLeaderboardPressed() {
    const override = typeof window !== 'undefined' ? window.__burtGamepadOverride : null;
    const snapshot = override || (typeof navigator !== 'undefined' && navigator.getGamepads
      ? Array.from(navigator.getGamepads()).find(pad => pad && pad.connected)
      : null);
    const buttons = snapshot?.buttons || [];
    const button = buttons[3];
    if (button == null) return false;
    if (typeof button === 'number') return button > 0.5;
    return Boolean(button.pressed || button.value > 0.5);
  }

  getNewlyUnlockedShips(previousProgress, currentProgress) {
    const ships = getSelectableShips();
    return ships
      .filter(ship =>
        isShipUnlocked(ship.spriteKey, currentProgress) &&
        !isShipUnlocked(ship.spriteKey, previousProgress)
      )
      .sort((a, b) => (Number(a.unlock?.level) || 1) - (Number(b.unlock?.level) || 1));
  }

  getNextLockedShip(currentProgress = this.currentProgressForResult || {}) {
    const ships = getSelectableShips();
    return ships
      .filter(ship => !isShipUnlocked(ship.spriteKey, currentProgress))
      .sort((a, b) => {
        const aLevel = Number(a.unlock?.level) || 1;
        const bLevel = Number(b.unlock?.level) || 1;
        return aLevel - bLevel;
      })[0] || null;
  }

  createShipUnlockProgressLines(currentProgress = this.currentProgressForResult || {}, { newlyUnlocked = [] } = {}) {
    if (Array.isArray(newlyUnlocked) && newlyUnlocked.length > 0) {
      const names = newlyUnlocked.slice(0, 2).map(ship => ship.name).join(' + ');
      const suffix = newlyUnlocked.length > 2 ? ` +${newlyUnlocked.length - 2} MORE` : '';
      const prefix = newlyUnlocked.length === 1 ? 'SHIP UNLOCKED' : 'SHIPS UNLOCKED';
      const reason = newlyUnlocked.length === 1
        ? getShipUnlockHistoryReason(newlyUnlocked[0].spriteKey, currentProgress, { translate: translateText })
        : null;
      return [
        translateText(`${prefix}: ${names}${suffix}`),
        reason ? translateText('Reason: {reason}', { reason }) : translateText('VISIT THE HANGAR TO TRY THEM')
      ];
    }

    const nextShip = this.getNextLockedShip(currentProgress);
    if (!nextShip) return [translateText('ALL SHIPS UNLOCKED')];

    const details = getShipUnlockProgressDetails(nextShip.spriteKey, currentProgress);
    const requirementLine = details.requirements?.length
      ? formatUnlockRequirementsProgress(details.requirements)
      : details.label;
    const requirementLabel = String(details.label || 'SHIP PROGRESS').toUpperCase();
    return [
      translateText(`NEXT SHIP UNLOCK: ${nextShip.name}`),
      `${translateText(requirementLabel)}: ${requirementLine}`
    ];
  }

  createUnlockSummary(previousProgress, currentProgress, newlyUnlocked = this.getNewlyUnlockedShips(previousProgress, currentProgress)) {
    if (newlyUnlocked.length > 0) {
      return this.createShipUnlockProgressLines(currentProgress, { newlyUnlocked }).join('\n');
    }

    const nextShip = this.getNextLockedShip(currentProgress);

    if (!nextShip) {
      const bestLevel = Math.max(1, Math.floor(Number(currentProgress.bestLevel) || 1));
      return `HANGAR COMPLETE: ALL SHIPS UNLOCKED\nBEST SECTOR ${bestLevel}`;
    }

    return this.createShipUnlockProgressLines(currentProgress).join('\n');
  }

  createPilotRankLine(currentProgress = {}) {
    const rankProgress = getPilotRankProgress(currentProgress.pilotXp || 0);
    const rankTitle = String(rankProgress.title || getRankTitle(currentProgress.pilotRank || 0)).toUpperCase();
    const displayRank = getDisplayRankNumber(rankProgress.rankIndex);
    if (rankProgress.rankIndex >= MAX_RANK_INDEX || rankProgress.progress >= 1) {
      return `${translateText('RANK')} ${displayRank}: ${rankTitle} ${translateText('MAX')}`;
    }
    const nextTitle = getRankTitle(Math.min(MAX_RANK_INDEX, rankProgress.rankIndex + 1)).toUpperCase();
    const percent = Math.max(0, Math.min(99, Math.round((rankProgress.progress || 0) * 100)));
    return `${translateText('RANK')} ${displayRank}: ${rankTitle}\n${percent}% ${translateText('TO')} ${nextTitle}`;
  }

  createPilotXpLine(currentProgress = {}) {
    const summary = this.game?.runSummary || {};
    const gained = Math.max(0, Number(summary.pilotXpGained) || 0);
    const rankProgress = getPilotRankProgress(currentProgress.pilotXp || 0);
    const rankTitle = String(rankProgress.title || getRankTitle(currentProgress.pilotRank || 0)).toUpperCase();
    const displayRank = getDisplayRankNumber(rankProgress.rankIndex);
    if (rankProgress.rankIndex >= MAX_RANK_INDEX || rankProgress.progress >= 1) {
      return [
        `${translateText('CAREER XP')}: +${gained.toLocaleString('en-US')}`,
        `${translateText('RANK')} ${displayRank}: ${rankTitle}`,
        translateText('MAX RANK')
      ].join('\n');
    }
    const nextTitle = getRankTitle(Math.min(MAX_RANK_INDEX, rankProgress.rankIndex + 1)).toUpperCase();
    const percent = Math.max(0, Math.min(99, Math.round((rankProgress.progress || 0) * 100)));
    return [
      `${translateText('CAREER XP')}: +${gained.toLocaleString('en-US')}`,
      `${translateText('RANK')} ${displayRank}: ${rankTitle}`,
      `${translateText('NEXT RANK')}: ${nextTitle}`,
      `${translateText('XP TO NEXT')}: ${Number(rankProgress.xpToNextRank || 0).toLocaleString('en-US')}`,
      `${percent}% ${translateText('TO')} ${nextTitle}`
    ].join('\n');
  }

  playShipUnlockVoice() {
    if (this.shipUnlockVoicePlayed || this.newlyUnlockedShips.length <= 0) return false;
    this.shipUnlockVoicePlayed = true;
    const voiceKey = this.getShipUnlockVoiceKey();
    return AudioManager.playVoice(voiceKey, {
      force: true,
      stopOtherVoices: true,
      exclusiveGroup: 'announcer',
      cooldownMs: 8000,
      eventCooldownMs: 0,
      duckMs: voiceKey === 'mission_control_viking_legend_unlocked' ? 4300 : 3200,
      duckFactor: voiceKey === 'mission_control_viking_legend_unlocked' ? 0.26 : 0.34,
      volume: voiceKey === 'mission_control_viking_legend_unlocked' ? 1.04 : 0.98
    });
  }

  getShipUnlockVoiceKey() {
    const ships = this.newlyUnlockedShips || [];
    const includesEirik = ships.some(ship => (ship?.baseId || ship?.id || null) === CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID);
    if (includesEirik) return 'mission_control_viking_legend_unlocked';
    return ships.length === 1
      ? 'mission_control_ship_unlocked'
      : 'mission_control_ships_unlocked';
  }

  playGameOverTaunt() {
    if (this.gameOverTauntPlayed) return false;
    this.gameOverTauntPlayed = true;
    return AudioManager.playVoice('game_over_taunt', {
      force: true,
      stopOtherVoices: true,
      exclusiveGroup: 'game_over_taunt',
      cooldownMs: 0,
      eventCooldownMs: 0,
      duckMs: 3400,
      duckFactor: 0.24,
      volume: 1.06
    });
  }

  getShipUnlockRevealDebugState() {
    const ships = this.newlyUnlockedShips || [];
    const bounds = this.shipUnlockReveal?.visible ? this.shipUnlockReveal.getBounds() : null;
    return {
      count: ships.length,
      names: ships.map(ship => ship.name),
      spriteKeys: ships.map(ship => ship.spriteKey),
      spriteCount: this.shipUnlockRevealSprites?.length || 0,
      visible: Boolean(this.shipUnlockReveal?.visible),
      animated: Boolean(this.shipUnlockRevealStartedAt && ships.length > 0),
      state: this.state,
      layout: this.shipUnlockRevealDebugLayout,
      bounds: bounds
        ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
        : null,
      voiceKey: ships.length > 0 ? this.getShipUnlockVoiceKey() : null,
      voicePlayed: Boolean(this.shipUnlockVoicePlayed)
    };
  }

  createNextGoal(previousProgress = {}, currentProgress = {}) {
    if (!this.isRankedRun) {
      if (this.isDailySignalResult()) {
        return {
          text: this.game?.runSummary?.runCleared
            ? translateText('NEXT GOAL: BEAT BEST CLEAR')
            : translateText('NEXT GOAL: CLEAR SECTOR {sector}', { sector: this.game?.runSummary?.dailySignalContract?.finishSector || 10 }),
          tone: 'daily'
        };
      }
      return { text: 'NEXT GOAL: RUN RANKED FOR THE BOARDS', tone: 'practice' };
    }

    const previousBestScore = Math.max(0, Number(previousProgress.bestScore) || 0);
    const scoreGap = previousBestScore - this.finalScore;
    if (previousBestScore > 0 && scoreGap > 0 && scoreGap <= Math.max(1000, previousBestScore * 0.18)) {
      return { text: `BEAT YOUR BEST: ${this.formatGoalNumber(scoreGap)} MORE`, tone: 'score' };
    }

    const bestSector = Math.max(1, Number(currentProgress.bestSector || currentProgress.bestLevel) || this.finalLevel || 1);
    const recoverySector = getRecoverySectorGoal({
      currentSector: this.finalLevel || 1,
      bestSector
    });
    if (recoverySector) {
      return { text: `NEXT CAREER GOAL: REACH SECTOR ${recoverySector}`, tone: 'level' };
    }
    const nextSector = this.getNextLevelGoal(bestSector);
    if (nextSector > bestSector) {
      return { text: `NEXT CAREER GOAL: REACH SECTOR ${nextSector}`, tone: 'level' };
    }

    return { text: 'NEXT GOAL: CLIMB THE GLOBAL BOARD', tone: 'leaderboard' };
  }

  createLevelSummary(previousProgress = {}, currentProgress = {}) {
    const summary = this.game?.runSummary || {};
    if (this.isDailySignalResult()) {
      const contract = summary.dailySignalContract || {};
      const elapsedSeconds = Math.max(0, Math.floor(Number(summary.runElapsedSeconds) || 0));
      return [
        translateText('DAILY CABINET SIGNAL'),
        translateText(summary.runCleared ? 'CONTRACT CLEARED // SECTOR {sector}' : 'REACHED SECTOR {sector}', {
          sector: summary.runCleared ? (contract.finishSector || this.finalLevel || 10) : (this.finalLevel || 1)
        }),
        `${translateText('TIME')} ${this.formatElapsedTime(elapsedSeconds)}  //  ${translateText('LOCAL ONLY')}`,
        `${translateText('LOANER')}: ${contract.loanerShipName || summary.shipName || ''}`
      ].filter(Boolean).join('\n');
    }
    const previousBestLevel = Math.max(1, Math.floor(Number(previousProgress.bestSector || previousProgress.bestLevel) || 1));
    const bestLevel = Math.max(1, Math.floor(Number(currentProgress.bestSector || currentProgress.bestLevel) || this.finalLevel || 1));
    const newBest = bestLevel > previousBestLevel && this.finalLevel >= bestLevel;
    const suffix = newBest ? ' - NEW BEST' : '';
    const clearLabel = summary.runCleared ? 'RUN CLEAR' : 'GAME OVER';
    const elapsedSeconds = Math.max(0, Math.floor(Number(summary.runElapsedSeconds) || 0));
    const gained = Math.max(0, Number(summary.pilotXpGained) || 0);
    const rankProgress = getPilotRankProgress(currentProgress.pilotXp || 0);
    const rankTitle = String(rankProgress.title || getRankTitle(currentProgress.pilotRank || 0)).toUpperCase();
    const displayRank = getDisplayRankNumber(rankProgress.rankIndex);
    const modeLabel = translateText(getRunModeProfile(this.game?.runMode).resultLabel || 'RUN');
    const mastery = summary.shipMastery;
    const masteryTier = mastery?.tier?.label ? translateText(mastery.tier.label) : null;
    const masteryLine = masteryTier
      ? translateText(
          summary.newShipMasteryTier
            ? 'SHIP MASTERY: {tier} // NEW // BEST SECTOR {sector}'
            : 'SHIP MASTERY: {tier} // BEST SECTOR {sector}',
          {
            tier: masteryTier,
            sector: Math.max(1, Math.floor(Number(mastery.bestSector) || this.finalLevel || 1))
          }
        )
      : `${translateText('BEST SECTOR')} ${bestLevel}${suffix}`;
    return [
      modeLabel,
      `${clearLabel}: ${translateText('SECTOR')} ${this.finalLevel}  ${translateText('TIME')} ${elapsedSeconds}s`,
      `${translateText('RANK')} ${displayRank}: ${rankTitle}  ${translateText('CAREER XP')}: +${gained.toLocaleString('en-US')}`,
      masteryLine
    ].join('\n');
  }

  getNextLevelGoal(bestLevel) {
    const level = Math.max(1, Math.floor(Number(bestLevel) || 1));
    if (level < 3) return level + 1;
    if (level < 10) return Math.min(10, level + 2);
    return level + 1;
  }

  formatGoalNumber(value) {
    return Math.max(0, Math.ceil(Number(value) || 0)).toLocaleString('en-US');
  }

  enterInputMode() {
    if (this.state === 'input' || this.state === 'submitting' || this.state === 'rejected') return;

    if (this.steamSubmissionMode) {
      console.log('[GameOver] Steam leaderboard available. Manual name entry is disabled; score uses Steam persona.');
      this.canEnterName = false;
      this.updatePromptMessage(this.globalStatus === 'submitted'
        ? 'SCORE SUBMITTED WITH STEAM NAME'
        : 'AUTO-SUBMITTING WITH STEAM NAME');
      this.refreshPrimaryCta();
      return;
    }

    if (!this.isRankedRun) {
      this.submitBlockedReason = this.game.runModeReason || 'unranked_run';
      console.log(`[GameOver] Blocking score input for unranked run reason=${this.submitBlockedReason}`);
      if (this.promptText) {
        this.promptText.visible = true;
        this.promptText.text = this.getUnrankedScoreBlockedText();
      }
      this.refreshPrimaryCta();
      return;
    }

    if (!this.updateCanEnterName()) {
      console.log('[GameOver] Player not qualified for local/global board yet. Blocking submission.');

      if (this.globalStatus === 'checking') {
        this.updatePromptMessage('GLOBAL BOARD CHECKING...');
        this.scheduleSceneTimeout(() => this.updateQualificationPromptState(), 900);
      } else {
        this.enterResultHoldStage(this.globalStatus === 'offline' ? 'offline_no_slot' : 'no_slot');
      }
      return;
    }

    console.log('[GameOver] Player qualified. Allowing name entry.', {
      localQualified: this.localQualified,
      globalQualified: this.globalQualified,
      globalStatus: this.globalStatus
    });

    this.state = 'input';
    const usingController = this.lastInputDevice === 'controller';
    this.nameInput = usingController ? this.getControllerDefaultName() : '';
    this.controllerNameCursor = 0;
    this.caretVisible = true;
    this.submitRetries = 0;

    const layout = getCurrentLayout();

    if (layout.isMobile && !usingController) {
      // Show HTML overlay for mobile
      this.showInputOverlay();
      this.promptText.visible = false;
      this.nameDisplay.visible = false;
    } else {
      // Desktop: use PIXI text display with hidden input
      this.updatePromptMessage(usingController ? 'PICK PILOT INITIALS' : INPUT_PROMPT);
      this.nameDisplay.visible = true;
      if (!usingController) {
        this.ensureHiddenInput();
        if (this.hiddenInput) {
          this.hiddenInput.value = '';
          this.hiddenInput.focus();
        }
        this.startCaretBlink();
      } else {
        this.hideHiddenInput();
        this.stopCaretBlink();
      }
      this.updateNameDisplay();
    }
    if (this.instructions) {
      this.instructions.text = this.getInstructionsText();
    }
    this.refreshPrimaryCta();
  }

  exitInputMode() {
    if (this.state !== 'input') return;
    this.state = 'prompt';
    this.stopCaretBlink();
    this.hideHiddenInput();
    this.removeInputOverlay();

    const layout = getCurrentLayout();
    const promptText = this.getEntryPromptText(layout);
    this.updatePromptMessage(promptText);
    this.promptText.visible = true;
    this.nameDisplay.visible = false;
    this.updateNameDisplay();
    if (this.instructions) {
      this.instructions.text = this.getInstructionsText();
    }
    this.refreshPrimaryCta();
  }

  returnToMenu() {
    if (this.isSubmitting) return;
    this.clearSceneTimeouts();
    AudioManager.stopVoiceGroup('runback');
    AudioManager.playMusicContext('menu', { resetPlaylist: true });
    this.game.switchScene('menu');
    this.scheduleSceneTimeout(() => {
      if (this.game?.currentScene === this.game?.scenes?.menu) {
        AudioManager.playMusicContext('menu', { resetPlaylist: true });
      }
    }, 120);
  }

  restartRun() {
    if (this.isSubmitting) return;
    this.clearSceneTimeouts();
    this.removeInputOverlay();
    this.stopCaretBlink();
    this.hideHiddenInput();
    AudioManager.stopVoiceGroup('runback');
    AudioManager.playSfx('start_game_confirm');
    AudioManager.playVoice('mission_control_restart', {
      force: true,
      stopOtherVoices: true,
      cooldownMs: 3200,
      duckMs: 1100,
      duckFactor: 0.6,
      volume: 0.72
    });
    AudioManager.playMusicContext('gameplay', { resetForNewRun: true });
    const summary = this.game?.runSummary || {};
    const challengeRecord = summary.sectorStartChallengeAttempt || summary.sectorStartChallengeBest || {};
    const sectorStartCheckpoint = [
      this.game?.sectorStartCheckpoint,
      summary.sectorStartCheckpoint,
      challengeRecord.startSector,
      summary.sectorStartPlaySector ? Number(summary.sectorStartPlaySector) - 1 : null
    ]
      .map((value) => Number(value))
      .find((value) => Number.isFinite(value) && value > 0);
    const restartOptions = this.game?.runMode === RUN_MODES.SECTOR_START && sectorStartCheckpoint
      ? {
          runMode: RUN_MODES.SECTOR_START,
          startSector: sectorStartCheckpoint,
          inputDevice: this.lastInputDevice
        }
      : this.isDailySignalResult()
        ? {
            runMode: RUN_MODES.DAILY_SIGNAL,
            dailySignalContract: summary.dailySignalContract || this.game?.dailySignalContract,
            inputDevice: this.lastInputDevice
          }
      : this.game?.runMode === RUN_MODES.SCOUT
        ? {
            runMode: RUN_MODES.SCOUT,
            scoutAnomalyId: summary.scoutAnomalyId || this.game?.scoutAnomalyId,
            inputDevice: this.lastInputDevice
          }
        : this.isOverrunResult()
          ? {
              runMode: this.game?.runMode,
              inputDevice: this.lastInputDevice
            }
        : {
            runMode: this.game?.runMode === RUN_MODES.MAYHEM_TACTICAL
              ? RUN_MODES.MAYHEM_TACTICAL
              : RUN_MODES.RANKED,
            inputDevice: this.lastInputDevice
          };
    Promise.resolve(this.game.startGame(this.game.selectedShipSpriteKey, restartOptions))
      .then((started) => {
        if (started === false) this.returnToMenu();
      })
      .catch((error) => {
        console.error('[GameOverScene] Restart failed:', error);
        this.returnToMenu();
      });
  }

  playGlobalQualificationFanfare() {
    if (this.qualificationFanfarePlayed) return;
    this.qualificationFanfarePlayed = true;
    const placement = this.globalPlacement;
    const voiceKey = placement?.numberOne
      ? 'mission_control_number_one_highscore'
      : placement?.top3
        ? 'mission_control_top3_highscore'
        : 'mission_control_global_highscore';
    AudioManager.playMusicContext('victory', { resetPlaylist: true });
    const fanfareKey = placement?.numberOne
      ? 'nova_number_one_fanfare'
      : placement?.top3
        ? 'nova_top3_fanfare'
        : placement?.top10
          ? 'nova_top10_fanfare'
          : 'nova_global_slot_fanfare';
    const fanfareMs = placement?.numberOne ? 10000 : placement?.top3 ? 8000 : placement?.top10 ? 7000 : 6000;
    AudioManager.duckMusic(placement?.numberOne ? 0.18 : placement?.top3 ? 0.22 : placement?.top10 ? 0.24 : 0.28, fanfareMs);
    AudioManager.playSfx(fanfareKey, { force: true, volume: placement?.numberOne ? 1.0 : placement?.top3 ? 0.94 : placement?.top10 ? 0.9 : 0.88, minIntervalMs: 0 });
    if (placement?.numberOne) {
      this.scheduleSceneTimeout(() => {
        AudioManager.playSfx('nova_highscore_chime', { force: true, volume: 0.82, minIntervalMs: 0 });
      }, 3200);
    }
    this.scheduleSceneTimeout(() => {
      AudioManager.playVoice(voiceKey, {
        force: true,
        stopOtherVoices: true,
        exclusiveGroup: 'announcer',
        cooldownMs: 9000,
        duckMs: placement?.numberOne ? 4300 : placement?.top3 ? 3800 : placement?.top10 ? 3600 : 3400,
        duckFactor: placement?.numberOne ? 0.24 : placement?.top3 ? 0.28 : placement?.top10 ? 0.3 : 0.32,
        volume: placement?.numberOne ? 1.06 : placement?.top3 ? 1.02 : placement?.top10 ? 0.99 : 0.96
      });
    }, placement?.numberOne ? 2600 : placement?.top3 ? 2200 : placement?.top10 ? 1900 : 1700);
  }

  playNearMissVoice() {
    if (this.nearMissVoicePlayed || this.qualificationFanfarePlayed) return;
    this.nearMissVoicePlayed = true;
    AudioManager.duckMusic(0.38, 4000);
    AudioManager.playSfx('nova_global_near_fanfare', { force: true, volume: 0.76, minIntervalMs: 0 });
    this.scheduleSceneTimeout(() => {
      AudioManager.playVoice('mission_control_near_miss', {
        cooldownMs: 9000,
        duckMs: 2300,
        duckFactor: 0.46,
        volume: 0.84
      });
    }, 1400);
  }

  showAchievementToast(toast) {
    const achievement = toast?.achievement || toast;
    if (!achievement?.name || !this.container || !this.game?.app?.ticker) return false;
    if (this.achievementToast) {
      const id = achievement.id || toast?.id || achievement.name;
      const duplicateQueued = this.achievementToastQueue.some((queued) => {
        const queuedAchievement = queued?.achievement || queued;
        return (queuedAchievement?.id || queued?.id || queuedAchievement?.name) === id;
      });
      if (!duplicateQueued) this.achievementToastQueue.push(toast);
      return true;
    }

    const { width, height } = this.game.app.screen;
    const compact = width < 720;
    const celebrationMode = Boolean(this.globalPlacement?.qualified || this.globalQualified);
    const bannerWidth = compact
      ? Math.min(width * 0.86, 390)
      : Math.min(width * 0.32, 360);
    const bannerHeight = compact ? (celebrationMode ? 56 : 70) : (celebrationMode ? 58 : 78);
    const banner = new PIXI.Container();
    banner.zIndex = 60;
    banner.x = !compact
      ? width - bannerWidth / 2 - 28
      : width / 2;
    banner.y = celebrationMode
      ? Math.max(compact ? 36 : 40, height * 0.055)
      : Math.max(52, height * 0.09);
    banner.alpha = 0;

    const bg = new PIXI.Graphics();
    bg.roundRect(-bannerWidth / 2, -bannerHeight / 2, bannerWidth, bannerHeight, 8);
    bg.fill({ color: 0x041323, alpha: 0.94 });
    bg.roundRect(-bannerWidth / 2, -bannerHeight / 2, bannerWidth, bannerHeight, 8);
    bg.stroke({ color: 0xffd15c, width: 2, alpha: 0.9 });
    bg.rect(-bannerWidth / 2 + 18, -bannerHeight / 2 + 8, bannerWidth - 36, 2);
    bg.fill({ color: 0x37f5ff, alpha: 0.42 });
    banner.addChild(bg);

    const title = createText('ACHIEVEMENT UNLOCKED', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? (celebrationMode ? 11 : 14) : 13,
      fontWeight: 'bold',
      fill: '#fff3a2',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center'
    });
    title.anchor.set(0.5);
    title.y = compact ? (celebrationMode ? -11 : -14) : (celebrationMode ? -12 : -17);
    banner.addChild(title);

    const name = createText(achievement.name, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? (celebrationMode ? 15 : 18) : 19,
      fontWeight: 'bold',
      fill: '#9cfbff',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: bannerWidth - 44
    });
    name.anchor.set(0.5);
    name.y = compact ? (celebrationMode ? 10 : 13) : (celebrationMode ? 11 : 15);
    banner.addChild(name);

    this.container.addChild(banner);
    this.achievementToast = banner;

    let elapsed = 0;
    const duration = 3400;
    this.achievementToastTicker = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      if (!this.achievementToast) return;
      if (elapsed < 240) {
        banner.alpha = elapsed / 240;
      } else if (elapsed > duration - 420) {
        banner.alpha = Math.max(0, (duration - elapsed) / 420);
      } else {
        banner.alpha = 1;
      }
      if (elapsed >= duration) {
        this.removeAchievementToast({ showNext: true });
      }
    };
    this.game.app.ticker.add(this.achievementToastTicker);
    return true;
  }

  removeAchievementToast({ showNext = false } = {}) {
    if (this.achievementToastTicker && this.game?.app?.ticker) {
      this.game.app.ticker.remove(this.achievementToastTicker);
    }
    this.achievementToastTicker = null;
    if (this.achievementToast?.parent) {
      this.achievementToast.parent.removeChild(this.achievementToast);
    }
    this.achievementToast = null;
    if (showNext && this.achievementToastQueue.length > 0) {
      const next = this.achievementToastQueue.shift();
      this.scheduleSceneTimeout(() => this.showAchievementToast(next), 120);
    }
  }

  unlockConfirmedLeaderboardAchievements(placement, provider) {
    if (!placement?.qualified) return;
    const payload = {
      source: 'global_leaderboard_submit',
      globalProvider: provider,
      placement: placement.placement,
      numberOne: Boolean(placement.numberOne),
      score: this.finalScore,
      level: this.finalLevel
    };
    this.game.unlockAchievement?.(GLOBAL_LEADERBOARD_ACHIEVEMENT_ID, payload);
  }

  unlockSwarmEliteForAcceptedSubmission(result, provider) {
    const accepted = isAcceptedLeaderboardSubmission(result, provider);
    const previousBestScore = provider === 'steam' && accepted
      ? this.getSteamPreviousBestScore(result)
      : 0;
    const runMode = result?.runMode ?? this.game?.runSummary?.runMode ?? this.game?.runMode ?? null;
    const eligibility = evaluateSwarmEliteEligibility({
      score: result?.score ?? this.finalScore,
      runMode,
      isDebugRun: result?.isDebugRun ?? this.game?.isDebugRun === true,
      allowAchievements: result?.eligibleForAchievements ?? this.game?.canUnlockAchievementsForCurrentRun?.() ?? false,
      eligibleRun: result?.eligibleForSubmission ?? this.game?.isScoreSubmissionAllowed?.() ?? false,
      submissionAccepted: accepted,
      historicalAccepted: accepted && previousBestScore > 0,
      historicalAcceptedScore: previousBestScore,
      queued: result?.steamPendingQueued === true,
      rejected: Boolean(result?.steamError || result?.globalError)
    });
    result.swarmEliteEligibility = {
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      acceptedScore: eligibility.acceptedScore,
      scoreSource: eligibility.scoreSource || null,
      runMode: eligibility.runMode
    };
    if (!eligibility.eligible) return null;
    return this.game?.unlockSwarmEliteFromEligibility?.(eligibility, {
      source: eligibility.scoreSource === 'historical_accepted_score'
        ? 'steam_accepted_historical_best'
        : 'accepted_ranked_submission',
      globalProvider: provider,
      leaderboardName: result?.leaderboardName || null,
      leaderboardKind: result?.leaderboardKind || null,
      submissionStatus: result?.globalStatus || result?.steamStatus || 'accepted',
      validationSource: provider === 'steam' ? 'steam_upload_callback' : 'cloud_submit_response',
      historicalBackfill: eligibility.scoreSource === 'historical_accepted_score'
    }) || null;
  }

  applyConfirmedGlobalPlacement(placement, provider = 'global') {
    if (!placement) return null;
    const rawPlacement = Number(placement.placement);
    const placementRank = Number.isFinite(rawPlacement) && rawPlacement > 0
      ? Math.floor(rawPlacement)
      : null;
    const qualified = Boolean(placement.qualified && placementRank);
    const numberOne = Boolean(qualified && placementRank === 1);
    const top3 = Boolean(qualified && placementRank <= 3);
    const top10 = Boolean(qualified && placementRank <= 10);
    const normalizedPlacement = {
      ...placement,
      placement: placementRank,
      qualified,
      numberOne,
      top3,
      top10
    };
    this.globalPlacement = normalizedPlacement;
    this.globalPlacementTier = normalizedPlacement.numberOne
      ? 'number1'
      : normalizedPlacement.top3
        ? 'top3'
        : normalizedPlacement.top10
          ? 'top10'
          : normalizedPlacement.qualified
            ? 'global'
            : 'none';
    this.globalQualified = Boolean(normalizedPlacement.qualified);
    this.globalStatus = normalizedPlacement.qualified ? 'submitted' : this.globalStatus;
    this.unlockConfirmedLeaderboardAchievements(normalizedPlacement, provider);
    this.updateLeaderboardStatusText();
    this.updateCeremonyPresentation();
    if (normalizedPlacement.qualified) {
      this.playGlobalQualificationFanfare();
    }
    return normalizedPlacement;
  }

  createHangarButton(layout) {
    this.hangarButton = new PIXI.Container();
    this.hangarButton.zIndex = 8;
    this.hangarButton.eventMode = 'static';
    this.hangarButton.cursor = 'pointer';

    this.hangarButtonGlow = new PIXI.Graphics();
    this.hangarButtonBg = new PIXI.Graphics();

    this.hangarButtonLabel = createText('BACK TO HANGAR', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 17 : 21,
      fontWeight: 'bold',
      fill: '#d9fdff',
      stroke: '#031323',
      strokeThickness: layout.isMobile ? 2 : 3,
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#00ffff',
      dropShadowBlur: 4
    });
    this.hangarButtonLabel.anchor.set(0.5);

    this.hangarButtonHint = createText('H', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 10 : 12,
      fontWeight: 'bold',
      fill: '#ffd15c',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'center'
    });
    this.hangarButtonHint.anchor.set(0.5);

    this.hangarButton.addChild(this.hangarButtonGlow, this.hangarButtonBg, this.hangarButtonLabel, this.hangarButtonHint);
    this.hangarButton.on('pointerdown', () => {
      this.setInputDevice('keyboard');
      this.openHangar();
    });
    this.hangarButton.on('pointerover', () => this.hangarButton.scale.set(1.02));
    this.hangarButton.on('pointerout', () => this.hangarButton.scale.set(1));
    this.drawHangarButton(layout);
  }

  drawHangarButton(layout) {
    if (!this.hangarButton || !this.hangarButtonBg || !this.hangarButtonGlow) return;
    const visible = this.shouldShowHangarButton();
    const compact = visible && this.shouldShowMainMenuButton();
    const compactRunbackDesktop = this.state === 'runback' && !layout.isMobile && layout.height < 820;
    const buttonWidth = compact
      ? Math.min(layout.width * (layout.isMobile ? 0.72 : 0.26), layout.isMobile ? 280 : 300)
      : Math.min(layout.width * (layout.isMobile ? 0.72 : 0.34), layout.isMobile ? 280 : 340);
    const buttonHeight = layout.isMobile ? 46 : compactRunbackDesktop ? 44 : 52;
    const halfWidth = buttonWidth / 2;
    const halfHeight = buttonHeight / 2;
    const radius = layout.isMobile ? 8 : 10;
    this.hangarButtonWidth = buttonWidth;
    this.hangarButtonHeight = buttonHeight;
    this.hangarButton.hitArea = new PIXI.Rectangle(-halfWidth, -halfHeight, buttonWidth, buttonHeight);
    this.hangarButton.visible = visible;
    this.hangarButton.alpha = visible ? 0.9 : 0;
    this.hangarButton.cursor = visible ? 'pointer' : 'default';
    this.hangarButton.eventMode = visible ? 'static' : 'none';

    this.hangarButtonGlow.clear();
    this.hangarButtonGlow.roundRect(-halfWidth - 6, -halfHeight - 4, buttonWidth + 12, buttonHeight + 8, radius + 4);
    this.hangarButtonGlow.fill({ color: 0xffd15c, alpha: visible ? 0.09 : 0 });
    this.hangarButtonGlow.roundRect(-halfWidth - 2, -halfHeight - 2, buttonWidth + 4, buttonHeight + 4, radius + 2);
    this.hangarButtonGlow.stroke({ color: 0x37f5ff, width: 1.4, alpha: visible ? 0.28 : 0 });

    this.hangarButtonBg.clear();
    this.hangarButtonBg.roundRect(-halfWidth, -halfHeight, buttonWidth, buttonHeight, radius);
    this.hangarButtonBg.fill({ color: 0x041323, alpha: 0.88 });
    this.hangarButtonBg.roundRect(-halfWidth, -halfHeight, buttonWidth, buttonHeight, radius);
    this.hangarButtonBg.stroke({ color: 0xffd15c, width: 1.8, alpha: 0.74 });
    this.hangarButtonBg.rect(-halfWidth + 14, -halfHeight + 7, buttonWidth - 28, 2);
    this.hangarButtonBg.fill({ color: 0xffd15c, alpha: 0.26 });

    if (this.hangarButtonLabel) {
      this.hangarButtonLabel.style.fontSize = layout.isMobile ? 17 : 21;
      this.hangarButtonLabel.y = layout.isMobile ? -7 : -8;
    }
    if (this.hangarButtonHint) {
      this.hangarButtonHint.style.fontSize = layout.isMobile ? 10 : 12;
      this.hangarButtonHint.y = layout.isMobile ? 13 : 15;
    }
  }

  createMainMenuButton(layout) {
    this.mainMenuButton = new PIXI.Container();
    this.mainMenuButton.zIndex = 8;
    this.mainMenuButton.eventMode = 'static';
    this.mainMenuButton.cursor = 'pointer';

    this.mainMenuButtonGlow = new PIXI.Graphics();
    this.mainMenuButtonBg = new PIXI.Graphics();

    this.mainMenuButtonLabel = createText(translateText('BACK TO MAIN MENU'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 17 : 21,
      fontWeight: 'bold',
      fill: '#d9fdff',
      stroke: '#031323',
      strokeThickness: layout.isMobile ? 2 : 3,
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#00ffff',
      dropShadowBlur: 4
    });
    this.mainMenuButtonLabel.anchor.set(0.5);

    this.mainMenuButtonHint = createText(translateText('ESC / B'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 10 : 12,
      fontWeight: 'bold',
      fill: '#ffd15c',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'center'
    });
    this.mainMenuButtonHint.anchor.set(0.5);

    this.mainMenuButton.addChild(this.mainMenuButtonGlow, this.mainMenuButtonBg, this.mainMenuButtonLabel, this.mainMenuButtonHint);
    this.mainMenuButton.on('pointerdown', () => {
      this.setInputDevice('keyboard');
      this.returnToMenu();
    });
    this.mainMenuButton.on('pointerover', () => this.mainMenuButton.scale.set(1.02));
    this.mainMenuButton.on('pointerout', () => this.mainMenuButton.scale.set(1));
    this.drawMainMenuButton(layout);
  }

  drawMainMenuButton(layout) {
    if (!this.mainMenuButton || !this.mainMenuButtonBg || !this.mainMenuButtonGlow) return;
    const visible = this.shouldShowMainMenuButton();
    const compact = visible && this.shouldShowHangarButton();
    const compactRunbackDesktop = this.state === 'runback' && !layout.isMobile && layout.height < 820;
    const buttonWidth = compact
      ? Math.min(layout.width * (layout.isMobile ? 0.72 : 0.26), layout.isMobile ? 280 : 300)
      : Math.min(layout.width * (layout.isMobile ? 0.72 : 0.34), layout.isMobile ? 280 : 340);
    const buttonHeight = layout.isMobile ? 46 : compactRunbackDesktop ? 44 : 52;
    const halfWidth = buttonWidth / 2;
    const halfHeight = buttonHeight / 2;
    const radius = layout.isMobile ? 8 : 10;
    this.mainMenuButtonWidth = buttonWidth;
    this.mainMenuButtonHeight = buttonHeight;
    this.mainMenuButton.hitArea = new PIXI.Rectangle(-halfWidth, -halfHeight, buttonWidth, buttonHeight);
    this.mainMenuButton.visible = visible;
    this.mainMenuButton.alpha = visible ? 0.94 : 0;
    this.mainMenuButton.cursor = visible ? 'pointer' : 'default';
    this.mainMenuButton.eventMode = visible ? 'static' : 'none';

    this.mainMenuButtonGlow.clear();
    this.mainMenuButtonGlow.roundRect(-halfWidth - 6, -halfHeight - 4, buttonWidth + 12, buttonHeight + 8, radius + 4);
    this.mainMenuButtonGlow.fill({ color: 0x7dffcc, alpha: visible ? 0.1 : 0 });
    this.mainMenuButtonGlow.roundRect(-halfWidth - 2, -halfHeight - 2, buttonWidth + 4, buttonHeight + 4, radius + 2);
    this.mainMenuButtonGlow.stroke({ color: 0xffef7e, width: 1.4, alpha: visible ? 0.32 : 0 });

    this.mainMenuButtonBg.clear();
    this.mainMenuButtonBg.roundRect(-halfWidth, -halfHeight, buttonWidth, buttonHeight, radius);
    this.mainMenuButtonBg.fill({ color: 0x041323, alpha: 0.9 });
    this.mainMenuButtonBg.roundRect(-halfWidth, -halfHeight, buttonWidth, buttonHeight, radius);
    this.mainMenuButtonBg.stroke({ color: 0x7dffcc, width: 1.8, alpha: 0.78 });
    this.mainMenuButtonBg.rect(-halfWidth + 14, -halfHeight + 7, buttonWidth - 28, 2);
    this.mainMenuButtonBg.fill({ color: 0x7dffcc, alpha: 0.26 });

    if (this.mainMenuButtonLabel) {
      this.mainMenuButtonLabel.text = translateText('BACK TO MAIN MENU');
      this.mainMenuButtonLabel.style.fontSize = layout.isMobile ? 17 : 21;
      this.mainMenuButtonLabel.y = layout.isMobile ? -7 : -8;
    }
    if (this.mainMenuButtonHint) {
      this.mainMenuButtonHint.text = translateText('ESC / B');
      this.mainMenuButtonHint.style.fontSize = layout.isMobile ? 10 : 12;
      this.mainMenuButtonHint.y = layout.isMobile ? 13 : 15;
    }
  }

  createCounterAdviceCard(layout) {
    this.counterAdviceCard = new PIXI.Container();
    this.counterAdviceCard.zIndex = 7;

    this.counterAdviceCardBg = new PIXI.Graphics();
    this.counterAdviceLabel = createText(translateText('COUNTER ADVICE: LAST DEATH'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 13 : 15,
      fontWeight: '900',
      fill: '#fff3a2',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'left',
      letterSpacing: 0
    });
    this.counterAdviceLabel.anchor.set(0, 0);

    this.counterAdviceBody = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 14 : 17,
      fontWeight: 'bold',
      fill: '#e8fbff',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'left',
      wordWrap: true,
      lineHeight: layout.isMobile ? 17 : 21,
      letterSpacing: 0
    });
    this.counterAdviceBody.anchor.set(0, 0);

    this.counterAdviceCard.addChild(this.counterAdviceCardBg, this.counterAdviceLabel, this.counterAdviceBody);
    this.drawCounterAdviceCard(layout);
  }

  drawCounterAdviceCard(layout) {
    if (!this.counterAdviceCard || !this.counterAdviceCardBg || !this.counterAdviceLabel || !this.counterAdviceBody) return;
    const visible = this.shouldShowCounterAdviceCard();
    const cardWidth = Math.min(layout.width * (layout.isMobile ? 0.88 : 0.5), layout.isMobile ? 500 : 560);
    const padX = layout.isMobile ? 16 : 20;
    const padTop = layout.isMobile ? 11 : 12;
    const labelSize = layout.isMobile ? 13 : 15;
    const bodySize = layout.isMobile ? 14 : 17;
    const adviceText = visible ? this.getCounterAdviceText() : '';
    const labelText = translateText('COUNTER ADVICE: LAST DEATH').toLocaleUpperCase();

    this.counterAdviceLabel.text = labelText;
    this.counterAdviceLabel.style.fontSize = labelSize;
    this.counterAdviceLabel.x = -cardWidth / 2 + padX;
    this.counterAdviceLabel.y = 0;

    this.counterAdviceBody.text = adviceText;
    this.counterAdviceBody.style.fontSize = bodySize;
    this.counterAdviceBody.style.wordWrap = true;
    this.counterAdviceBody.style.wordWrapWidth = Math.max(180, cardWidth - padX * 2 - 10);
    this.counterAdviceBody.style.lineHeight = Math.round(bodySize * 1.24);
    this.counterAdviceBody.x = -cardWidth / 2 + padX;
    this.counterAdviceBody.y = padTop + labelSize + (layout.isMobile ? 4 : 5);

    this.counterAdviceLabel.updateText?.(false);
    this.counterAdviceBody.updateText?.(false);
    const bodyHeight = adviceText ? (this.counterAdviceBody.height || bodySize) : 0;
    const cardHeight = visible
      ? Math.max(layout.isMobile ? 68 : 76, padTop * 2 + labelSize + (layout.isMobile ? 6 : 8) + bodyHeight)
      : 0;
    const halfWidth = cardWidth / 2;
    const halfHeight = cardHeight / 2;

    this.counterAdviceCardWidth = cardWidth;
    this.counterAdviceCardHeight = cardHeight;
    this.counterAdviceCard.visible = visible;
    this.counterAdviceCard.alpha = visible ? 0.98 : 0;

    this.counterAdviceLabel.y = -halfHeight + padTop;
    this.counterAdviceBody.y = -halfHeight + padTop + labelSize + (layout.isMobile ? 4 : 5);
    fitDisplayToBox(this.counterAdviceBody, cardWidth - padX * 2 - 10, Math.max(bodySize + 4, cardHeight - padTop * 2 - labelSize - 6), { minScale: 0.7 });

    this.counterAdviceCardBg.clear();
    if (visible) {
      const radius = layout.isMobile ? 8 : 10;
      this.counterAdviceCardBg.roundRect(-halfWidth - 7, -halfHeight - 5, cardWidth + 14, cardHeight + 10, radius + 4);
      this.counterAdviceCardBg.fill({ color: 0xffd15c, alpha: 0.1 });
      this.counterAdviceCardBg.roundRect(-halfWidth, -halfHeight, cardWidth, cardHeight, radius);
      this.counterAdviceCardBg.fill({ color: 0x041323, alpha: 0.92 });
      this.counterAdviceCardBg.roundRect(-halfWidth, -halfHeight, cardWidth, cardHeight, radius);
      this.counterAdviceCardBg.stroke({ color: 0xffef7e, width: 1.6, alpha: 0.78 });
      this.counterAdviceCardBg.rect(-halfWidth, -halfHeight, 7, cardHeight);
      this.counterAdviceCardBg.fill({ color: 0xffef7e, alpha: 0.86 });
      this.counterAdviceCardBg.rect(-halfWidth + padX, -halfHeight + padTop + labelSize + 4, cardWidth - padX * 2, 1);
      this.counterAdviceCardBg.fill({ color: 0xffef7e, alpha: 0.24 });
    }

    this.counterAdviceCardDebug = {
      visible,
      label: this.counterAdviceLabel.text || null,
      text: adviceText,
      source: this.getDeathCoachAdvice()?.source || null,
      width: Math.round(cardWidth),
      height: Math.round(cardHeight)
    };
  }

  getRunReport() {
    return this.game?.lastRunReport || null;
  }

  shouldShowRunReportButton() {
    return this.isResultActionStage() && Boolean(this.getRunReport());
  }

  createRunReportButton(layout) {
    this.runReportButton = new PIXI.Container();
    this.runReportButton.zIndex = 8;
    this.runReportButton.eventMode = 'static';
    this.runReportButton.cursor = 'pointer';

    this.runReportButtonBg = new PIXI.Graphics();
    this.runReportButtonLabel = createText(translateText('RUN REPORT'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 18 : 22,
      fontWeight: 'bold',
      fill: '#fff3a2',
      stroke: '#031323',
      strokeThickness: layout.isMobile ? 2 : 3,
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#ffd15c',
      dropShadowBlur: 4
    });
    this.runReportButtonLabel.anchor.set(0.5);

    this.runReportButtonHint = createText(translateText('Counter advice'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: layout.isMobile ? 10 : 12,
      fontWeight: 'bold',
      fill: '#9cfbff',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'center'
    });
    this.runReportButtonHint.anchor.set(0.5);

    this.runReportButton.addChild(this.runReportButtonBg, this.runReportButtonLabel, this.runReportButtonHint);
    this.runReportButton.on('pointerdown', () => {
      this.setInputDevice('keyboard');
      this.toggleRunReport();
    });
    this.runReportButton.on('pointerover', () => this.runReportButton.scale.set(1.02));
    this.runReportButton.on('pointerout', () => this.runReportButton.scale.set(1));
    this.drawRunReportButton(layout);
  }

  drawRunReportButton(layout) {
    if (!this.runReportButton || !this.runReportButtonBg || !this.runReportButtonLabel) return;
    const visible = this.shouldShowRunReportButton();
    const compactRunbackDesktop = this.state === 'runback' && !layout.isMobile && layout.height < 820;
    const buttonWidth = Math.min(layout.width * (layout.isMobile ? 0.72 : 0.34), layout.isMobile ? 280 : 340);
    const buttonHeight = layout.isMobile ? 48 : compactRunbackDesktop ? 46 : 54;
    const halfWidth = buttonWidth / 2;
    const halfHeight = buttonHeight / 2;
    const radius = layout.isMobile ? 8 : 10;
    this.runReportButtonWidth = buttonWidth;
    this.runReportButtonHeight = buttonHeight;
    this.runReportButton.hitArea = new PIXI.Rectangle(-halfWidth, -halfHeight, buttonWidth, buttonHeight);
    this.runReportButton.visible = visible;
    this.runReportButton.alpha = visible ? 0.94 : 0;
    this.runReportButton.cursor = visible ? 'pointer' : 'default';
    this.runReportButton.eventMode = visible ? 'static' : 'none';

    this.runReportButtonBg.clear();
    this.runReportButtonBg.roundRect(-halfWidth - 7, -halfHeight - 5, buttonWidth + 14, buttonHeight + 10, radius + 4);
    this.runReportButtonBg.fill({ color: 0xffd15c, alpha: visible ? 0.1 : 0 });
    this.runReportButtonBg.roundRect(-halfWidth, -halfHeight, buttonWidth, buttonHeight, radius);
    this.runReportButtonBg.fill({ color: 0x041323, alpha: 0.92 });
    this.runReportButtonBg.roundRect(-halfWidth, -halfHeight, buttonWidth, buttonHeight, radius);
    this.runReportButtonBg.stroke({ color: 0xffef7e, width: 1.8, alpha: visible ? 0.82 : 0 });
    this.runReportButtonBg.rect(-halfWidth + 14, -halfHeight + 7, buttonWidth - 28, 2);
    this.runReportButtonBg.fill({ color: 0xffef7e, alpha: visible ? 0.28 : 0 });
    this.runReportButtonBg.rect(-halfWidth + 18, halfHeight - 8, buttonWidth - 36, 1);
    this.runReportButtonBg.fill({ color: 0x37f5ff, alpha: visible ? 0.24 : 0 });

    const dailySignal = this.isDailySignalResult();
    this.runReportButtonLabel.text = translateText(dailySignal ? 'FLIGHT REPORT' : 'RUN REPORT');
    this.runReportButtonLabel.style.fontSize = layout.isMobile ? 18 : 22;
    this.runReportButtonLabel.y = layout.isMobile ? -7 : -8;
    if (this.runReportButtonHint) {
      this.runReportButtonHint.text = translateText(dailySignal ? 'VIEW + SAVE SHARE CARD' : 'Counter advice');
      this.runReportButtonHint.style.fontSize = layout.isMobile ? 10 : 12;
      this.runReportButtonHint.y = layout.isMobile ? 14 : 16;
    }
  }

  createRunReportOverlay(layout) {
    this.runReportOverlay = new PIXI.Container();
    this.runReportOverlay.zIndex = 80;
    this.runReportOverlay.visible = false;
    this.runReportOverlay.eventMode = 'none';

    this.runReportOverlayBg = new PIXI.Graphics();
    this.runReportOverlayBg.eventMode = 'static';
    this.runReportOverlayBg.cursor = 'pointer';
    this.runReportOverlayBg.on('pointerdown', () => this.closeRunReport());

    this.runReportPanel = new PIXI.Container();
    this.runReportPanel.eventMode = 'static';
    this.runReportPanel.cursor = 'default';

    this.runReportOverlay.addChild(this.runReportOverlayBg, this.runReportPanel);
    this.layoutRunReportOverlay(layout);
  }

  toggleRunReport() {
    if (this.runReportOpen) {
      this.closeRunReport();
    } else {
      this.openRunReport();
    }
  }

  openRunReport() {
    if (!this.getRunReport()) return;
    this.runReportOpen = true;
    if (this.runReportOverlay) {
      this.runReportOverlay.visible = true;
      this.runReportOverlay.eventMode = 'static';
    }
    this.layoutRunReportOverlay(createTextLayout(this.game.app.screen.width, this.game.app.screen.height, getCurrentLayout()));
  }

  closeRunReport() {
    this.runReportOpen = false;
    if (this.runReportOverlay) {
      this.runReportOverlay.visible = false;
      this.runReportOverlay.eventMode = 'none';
    }
    this.runReportOverlayDebug = this.getRunReportOverlayDebugState();
  }

  getDailySignalShareModel() {
    return createDailySignalCardModel(this.getRunReport());
  }

  getDailySignalShareAssetUrls(model = this.getDailySignalShareModel()) {
    const metadata = model?.shipId ? getShipMetadata(model.shipId) : null;
    const textureIndex = Math.max(0, Math.floor(Number(metadata?.textureIndex) || 0));
    return {
      backdropUrl: AssetManifest.generated?.gameOverCeremony || AssetManifest.generated?.menuBackdrop || null,
      shipUrl: AssetManifest.generated?.playerShips?.[textureIndex] || AssetManifest.generated?.playerShips?.[0] || null
    };
  }

  setDailySignalShareStatus(source, tone = 'info') {
    this.dailySignalShareStatus = source ? { source, tone } : null;
    if (this.runReportOpen) {
      this.layoutRunReportOverlay(createTextLayout(this.game.app.screen.width, this.game.app.screen.height, getCurrentLayout()));
    }
  }

  async saveDailySignalShareCard() {
    const model = this.getDailySignalShareModel();
    if (!model || this.dailySignalShareBusy) return null;
    this.dailySignalShareBusy = true;
    this.setDailySignalShareStatus('BUILDING SIGNAL CARD...', 'info');
    const copy = createDailySignalCardCopy(model, translateText);
    const filename = getDailySignalCardFilename(model);
    try {
      const canvas = await renderDailySignalCard(model, copy, this.getDailySignalShareAssetUrls(model));
      const result = await saveDailySignalCard(canvas, filename);
      if (result?.canceled) {
        this.setDailySignalShareStatus('SIGNAL CARD SAVE CANCELED', 'muted');
      } else if (result?.ok === true) {
        this.setDailySignalShareStatus(result.downloaded ? 'SIGNAL CARD DOWNLOAD STARTED' : 'SIGNAL CARD SAVED', 'success');
      } else {
        throw new Error(result?.error || 'signal_card_save_failed');
      }
      this.dailySignalShareDebug = {
        action: 'save',
        ok: result?.ok === true,
        canceled: result?.canceled === true,
        downloaded: result?.downloaded === true,
        filename,
        model
      };
      return result;
    } catch (error) {
      console.warn('[DailySignalCard] Save failed:', error?.message || String(error));
      this.setDailySignalShareStatus('SIGNAL CARD SAVE FAILED', 'error');
      this.dailySignalShareDebug = {
        action: 'save',
        ok: false,
        filename,
        error: error?.message || String(error),
        model
      };
      return { ok: false, error: error?.message || String(error) };
    } finally {
      this.dailySignalShareBusy = false;
      if (this.runReportOpen) {
        this.layoutRunReportOverlay(createTextLayout(this.game.app.screen.width, this.game.app.screen.height, getCurrentLayout()));
      }
    }
  }

  async copyDailySignalShareCaption() {
    const model = this.getDailySignalShareModel();
    if (!model || this.dailySignalShareBusy) return null;
    const copy = createDailySignalCardCopy(model, translateText);
    this.dailySignalShareBusy = true;
    this.setDailySignalShareStatus('COPYING CAPTION...', 'info');
    try {
      const result = await copyDailySignalCaption(copy.caption);
      if (result?.ok !== true) throw new Error(result?.error || 'signal_caption_copy_failed');
      this.setDailySignalShareStatus('CAPTION COPIED', 'success');
      this.dailySignalShareDebug = {
        action: 'copy',
        ok: true,
        captionLength: copy.caption.length,
        model
      };
      return result;
    } catch (error) {
      console.warn('[DailySignalCard] Caption copy failed:', error?.message || String(error));
      this.setDailySignalShareStatus('CAPTION COPY FAILED', 'error');
      this.dailySignalShareDebug = {
        action: 'copy',
        ok: false,
        error: error?.message || String(error),
        model
      };
      return { ok: false, error: error?.message || String(error) };
    } finally {
      this.dailySignalShareBusy = false;
      if (this.runReportOpen) {
        this.layoutRunReportOverlay(createTextLayout(this.game.app.screen.width, this.game.app.screen.height, getCurrentLayout()));
      }
    }
  }

  getRunReportSectionLabel(sectionId) {
    return translateText(RUN_REPORT_SECTION_LABELS[sectionId] || sectionId);
  }

  getRunReportFieldLabel(fieldId) {
    return translateText(RUN_REPORT_FIELD_LABELS[fieldId] || fieldId);
  }

  getRunReportDeathSourceLabel(rawValue) {
    const source = String(rawValue || '').trim().toLowerCase();
    if (source === 'enemy_bullet') return 'Enemy bullet';
    if (source === 'boss_bullet') return 'Boss bullet';
    if (source === 'enemy_contact') return 'Enemy contact';
    if (source === 'boss_contact') return 'Boss contact';
    if (source === 'ambient_hazard_contact') return 'Hazard contact';
    if (source === 'unknown') return 'Unknown';
    return String(rawValue || 'Unknown').replace(/[_-]+/g, ' ');
  }

  getRunReportModeLabel(rawValue, fallback) {
    const mode = String(rawValue || '').trim().toLowerCase();
    if (mode === 'scout') return 'Scout Run';
    if (mode === 'sector_start') return 'Sector Run';
    if (mode === 'daily_signal') return 'Daily Cabinet Signal';
    if (mode === 'unranked') return 'Practice Run';
    if (mode === 'ranked_tactical') return 'Mayhem Tactical';
    if (mode === 'ranked') return 'Mayhem Pure';
    return fallback || (mode ? 'Unknown Run Mode' : 'Legacy Ranked Run');
  }

  formatRunReportValue(row = {}) {
    if (row.id === 'mode') return translateText(this.getRunReportModeLabel(row.rawValue, row.value));
    if (row.id === 'finalHit') return translateText(this.getRunReportDeathSourceLabel(row.rawValue || row.value));
    if (row.id === 'deathCoach') return translateText(row.value || row.rawValue?.advice || '');
    if (row.id === 'dps') {
      return translateText('AVG {average} // PEAK {peak}', {
        average: Math.round(Number(row.rawValue?.averageDps) || 0).toLocaleString('en-US'),
        peak: Math.round(Number(row.rawValue?.peakDps) || 0).toLocaleString('en-US')
      });
    }
    if (row.id === 'accuracy') {
      return translateText('{accuracy}% // {hits}/{shots} PROJECTILES', {
        accuracy: Math.round(Number(row.rawValue?.accuracyPercent) || 0),
        hits: Math.max(0, Math.floor(Number(row.rawValue?.projectilesHit) || 0)).toLocaleString('en-US'),
        shots: Math.max(0, Math.floor(Number(row.rawValue?.projectilesFired) || 0)).toLocaleString('en-US')
      });
    }
    if (row.id === 'topDamageSource') {
      return translateText('{source} // {percent}%', {
        source: translateText(row.value || 'Other damage'),
        percent: Math.round(Number(row.rawValue?.topSourcePercent) || 0)
      });
    }
    if (row.id === 'shipMastery') {
      const tier = translateText(row.rawValue?.tierLabel || row.value || 'NO MEDAL');
      const sector = Math.max(1, Math.floor(Number(row.rawValue?.bestSector) || 1));
      return translateText(
        row.rawValue?.newTier
          ? '{tier} // NEW // BEST S{sector}'
          : '{tier} // BEST S{sector}',
        { tier, sector }
      );
    }
    if (row.id === 'scoutAnomaly') {
      const name = translateText(row.rawValue?.name || row.value || 'CALIBRATION');
      const rule = translateText(row.rawValue?.ruleSummary || '');
      return [name, rule].filter(Boolean).join(' // ');
    }
    if (row.id === 'dailyTemplate') return translateText(row.value || '');
    if (row.id === 'dailyFinish') return translateText('SECTOR {sector}', { sector: row.value || 10 });
    if (row.id === 'dailyBestAttempt') {
      const score = this.formatScoreNumber(row.rawValue?.score ?? row.value);
      const sector = Math.max(1, Math.floor(Number(row.rawValue?.sector) || 1));
      const bestLine = row.rawValue?.newBest
        ? translateText('NEW BEST ATTEMPT: S{sector} // {score}', { sector, score })
        : translateText('BEST ATTEMPT: S{sector} // {score}', { sector, score });
      const bestTime = Math.max(0, Math.floor(Number(row.rawValue?.time) || 0));
      return `${bestLine} // ${translateText('TIME')} ${this.formatElapsedTime(bestTime)}`;
    }
    if (row.id === 'dailyBestClear') {
      const score = this.formatScoreNumber(row.rawValue?.score ?? row.value);
      const bestLine = row.rawValue?.newBest
        ? translateText('NEW BEST CLEAR: {score}', { score })
        : translateText('BEST CLEAR: {score}', { score });
      const bestTime = Math.max(0, Math.floor(Number(row.rawValue?.time) || 0));
      return bestTime > 0
        ? `${bestLine} // ${translateText('TIME')} ${this.formatElapsedTime(bestTime)}`
        : bestLine;
    }
    if (row.id === 'dailyFlightLog') {
      const statuses = Array.isArray(row.rawValue?.statuses) ? row.rawValue.statuses : [];
      return translateText('{signals} // {clears}/7 CLEARED', {
        signals: formatDailySignalFlightLogSymbols({ entries: statuses.map((status) => ({ status })) }),
        clears: Math.max(0, Math.floor(Number(row.rawValue?.clears) || 0))
      });
    }
    if (row.id === 'dailyRecord') {
      const score = this.formatScoreNumber(row.rawValue?.score ?? row.value);
      return row.rawValue?.newBest
        ? translateText('NEW DAILY SIGNAL BEST: {score}', { score })
        : translateText('DAILY SIGNAL BEST: {score}', { score });
    }
    if (Array.isArray(row.value)) {
      const separator = row.id === 'pilotOrders' ? '\n' : ', ';
      return row.value.map((value) => {
        if (value && typeof value === 'object' && value.type === 'pilotOrderComplete') {
          return translateText('COMPLETE');
        }
        if (value && typeof value === 'object' && value.type === 'pilotOrderTrack') {
          const progress = String(value.progressLabel || '').trim();
          return progress
            ? translateText('COMPLETED: {count}', { count: progress })
            : translateText('DONE');
        }
        if (value && typeof value === 'object' && value.type === 'pilotOrderDone') {
          const title = translateText(value.title || '');
          const rewardXp = Math.max(0, Math.floor(Number(value.reward?.pilotXp ?? value.rewardXp) || 0));
          const reward = rewardXp > 0
            ? translateText('+{xp} XP', { xp: rewardXp.toLocaleString('en-US') })
            : '';
          return [title.trim(), reward].filter(Boolean).join(' ');
        }
        if (value && typeof value === 'object' && value.type === 'pilotOrderProgress') {
          const title = translateText(value.title || '');
          const progress = translateText('{progress}/{target}', formatRunContractProgressValue(value.progress, value.target));
          return `${title} ${progress}`.trim();
        }
        if (value && typeof value === 'object' && value.type === 'pilotOrderNext') {
          const title = translateText(value.title || '');
          const progress = translateText('{progress}/{target}', formatRunContractProgressValue(value.progress, value.target));
          return `${translateText('NEXT')}: ${title} ${progress}`.trim();
        }
        return translateText(value);
      }).join(separator);
    }
    if (typeof row.value === 'number') {
      return row.value.toLocaleString('en-US');
    }
    return String(row.value ?? '');
  }

  getRunReportTacticalLoadout(report = null) {
    const summaryPicks = Array.isArray(report?.summary?.tacticalDraftPicks)
      ? report.summary.tacticalDraftPicks
      : [];
    const tacticalRow = (report?.sections || [])
      .flatMap((section) => Array.isArray(section?.rows) ? section.rows : [])
      .find((row) => row?.id === 'tacticalDrafts');
    const picks = summaryPicks.length > 0
      ? summaryPicks
      : Array.isArray(tacticalRow?.value) ? tacticalRow.value : [];
    const grouped = new Map();

    picks.forEach((rawPick) => {
      const sourceName = String(rawPick?.name || rawPick || '').trim();
      if (!sourceName) return;
      const key = String(rawPick?.id || sourceName).toLocaleLowerCase();
      const existing = grouped.get(key);
      if (existing) {
        existing.count += 1;
        existing.consumed = existing.consumed || rawPick?.consumed === true;
        existing.sourceName = sourceName;
        existing.label = translateText(sourceName);
        return;
      }
      grouped.set(key, {
        id: rawPick?.id || null,
        sourceName,
        label: translateText(sourceName),
        count: 1,
        consumed: rawPick?.consumed === true
      });
    });

    return Array.from(grouped.values());
  }

  layoutRunReportOverlay(layout) {
    if (!this.runReportOverlay || !this.runReportOverlayBg || !this.runReportPanel) return;
    const report = this.getRunReport();
    const { width, height } = this.game.app.screen;
    this.runReportOverlay.visible = Boolean(this.runReportOpen && report);
    this.runReportOverlay.eventMode = this.runReportOverlay.visible ? 'static' : 'none';

    this.runReportOverlayBg.clear();
    this.runReportOverlayBg.rect(0, 0, width, height);
    this.runReportOverlayBg.fill({ color: 0x020712, alpha: this.runReportOverlay.visible ? 0.62 : 0 });
    this.runReportOverlayBg.hitArea = new PIXI.Rectangle(0, 0, width, height);

    const removed = this.runReportPanel.removeChildren();
    removed.forEach((child) => child.destroy?.({ children: true }));

    if (!report) {
      this.runReportOverlayDebug = { visible: false, localOnly: true, sectionIds: [] };
      return;
    }

    const safeMargin = layout.safeArea || { top: 0, bottom: 0 };
    const compact = Boolean(width < 1200 || height < 820);
    const narrow = Boolean(layout.isMobile && width < 720);
    const panelWidth = Math.min(width - 28, 1120);
    const panelHeight = Math.min(height - safeMargin.top - safeMargin.bottom - 28, 860);
    const columns = narrow ? 1 : 2;
    const gap = compact ? 8 : 14;
    const innerPad = compact ? 14 : 26;
    const titleSize = compact ? 22 : 28;
    const sectionTitleSize = compact ? 13 : 16;
    const rowSize = compact ? 11 : 14;
    const dailyShareModel = createDailySignalCardModel(report);
    const dailyShareAvailable = Boolean(dailyShareModel);
    const closeHeight = dailyShareAvailable ? (compact ? 42 : 46) : (compact ? 32 : 36);
    const shareStatusHeight = dailyShareAvailable ? (compact ? 18 : 22) : 0;
    const tacticalLoadout = this.getRunReportTacticalLoadout(report);
    const tacticalBandWidth = panelWidth - innerPad * 2;
    const chipGap = compact ? 6 : 8;
    const chipHeight = compact ? 22 : 26;
    const chipMinWidth = compact ? 110 : 160;
    const chipColumns = tacticalLoadout.length > 0
      ? Math.max(1, Math.floor((tacticalBandWidth - 24 + chipGap) / (chipMinWidth + chipGap)))
      : 0;
    const chipRows = chipColumns > 0 ? Math.ceil(tacticalLoadout.length / chipColumns) : 0;
    const tacticalBandHeight = tacticalLoadout.length > 0
      ? (compact ? 42 : 48) + chipRows * chipHeight + Math.max(0, chipRows - 1) * chipGap
      : 0;
    const deathCoachRow = (report.sections || [])
      .flatMap((section) => Array.isArray(section.rows) ? section.rows : [])
      .find((row) => row?.id === 'deathCoach') || null;
    const pilotOrdersRow = (report.sections || [])
      .flatMap((section) => Array.isArray(section.rows) ? section.rows : [])
      .find((row) => row?.id === 'pilotOrders') || null;
    const counterBandHeight = deathCoachRow ? (compact ? 62 : 78) : 0;
    const pilotBandHeight = pilotOrdersRow ? (compact ? 78 : 86) : 0;
    const contentTop = -panelHeight / 2 + innerPad + titleSize + (compact ? 18 : 26);
    const footerButtonTop = panelHeight / 2 - innerPad - closeHeight;
    const closeTop = footerButtonTop - shareStatusHeight;
    const pilotBandY = pilotOrdersRow ? closeTop - (compact ? 14 : 18) - pilotBandHeight : null;
    const counterBandY = deathCoachRow
      ? (pilotOrdersRow ? pilotBandY - gap - counterBandHeight : closeTop - (compact ? 14 : 18) - counterBandHeight)
      : null;
    const tacticalBandY = tacticalLoadout.length > 0
      ? (deathCoachRow
        ? counterBandY - gap - tacticalBandHeight
        : pilotOrdersRow
          ? pilotBandY - gap - tacticalBandHeight
          : closeTop - (compact ? 12 : 18) - tacticalBandHeight)
      : null;
    const sectionAreaBottom = tacticalLoadout.length > 0
      ? tacticalBandY - gap
      : deathCoachRow
        ? counterBandY - gap
        : pilotOrdersRow
          ? pilotBandY - gap
          : closeTop - (compact ? 12 : 18);
    const sectionAreaHeight = Math.max(0, sectionAreaBottom - contentTop);
    const sectionWidth = (panelWidth - innerPad * 2 - gap * (columns - 1)) / columns;
    const sectionRows = Math.max(1, Math.ceil((report.sections || []).length / columns));
    const sectionHeight = (sectionAreaHeight - gap * (sectionRows - 1)) / sectionRows;

    this.runReportPanel.x = width / 2;
    this.runReportPanel.y = Math.max(safeMargin.top + panelHeight / 2 + 10, height / 2);

    const panelBg = new PIXI.Graphics();
    panelBg.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 10);
    panelBg.fill({ color: 0x03101c, alpha: 0.97 });
    panelBg.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 10);
    panelBg.stroke({ color: 0x37f5ff, width: 2, alpha: 0.72 });
    panelBg.rect(-panelWidth / 2 + innerPad, -panelHeight / 2 + innerPad + titleSize + 8, panelWidth - innerPad * 2, 2);
    panelBg.fill({ color: 0x37f5ff, alpha: 0.3 });
    panelBg.rect(-panelWidth / 2 + innerPad, closeTop - 14, panelWidth - innerPad * 2, 1);
    panelBg.fill({ color: 0xffd15c, alpha: 0.22 });
    this.runReportPanel.addChild(panelBg);

    const title = createText(translateText(dailyShareAvailable ? 'FLIGHT REPORT' : 'RUN REPORT'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: titleSize,
      fontWeight: 'bold',
      fill: '#fff3a2',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center'
    });
    title.anchor.set(0.5);
    title.x = 0;
    title.y = -panelHeight / 2 + innerPad + titleSize / 2;
    this.runReportPanel.addChild(title);

    const textLines = [];
    const sectionBounds = [];
    const sectionAccents = {
      run: 0xffd15c,
      combat: 0xff6b8a,
      survival: 0x7dffcc,
      rewards: 0x37f5ff
    };
    (report.sections || []).forEach((section, index) => {
      const column = columns === 1 ? 0 : index % columns;
      const row = columns === 1 ? index : Math.floor(index / columns);
      const x = -panelWidth / 2 + innerPad + column * (sectionWidth + gap);
      const y = contentTop + row * (sectionHeight + gap);
      const sectionAccent = sectionAccents[section.id] || 0x37f5ff;
      const sectionBox = new PIXI.Graphics();
      sectionBox.roundRect(x, y, sectionWidth, sectionHeight, 8);
      sectionBox.fill({ color: 0x06182a, alpha: 0.92 });
      sectionBox.roundRect(x, y, sectionWidth, sectionHeight, 8);
      sectionBox.stroke({ color: sectionAccent, width: 1.2, alpha: 0.52 });
      sectionBox.rect(x, y, 6, sectionHeight);
      sectionBox.fill({ color: sectionAccent, alpha: 0.82 });
      sectionBox.rect(x + 18, y + 29, sectionWidth - 32, 1);
      sectionBox.fill({ color: sectionAccent, alpha: 0.24 });
      this.runReportPanel.addChild(sectionBox);
      sectionBounds.push({
        id: section.id,
        x: Math.round(this.runReportPanel.x + x),
        y: Math.round(this.runReportPanel.y + y),
        width: Math.round(sectionWidth),
        height: Math.round(sectionHeight)
      });

      const header = createText(this.getRunReportSectionLabel(section.id), {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: sectionTitleSize,
        fontWeight: '900',
        fill: sectionAccent,
        stroke: '#031323',
        strokeThickness: 2,
        align: 'left'
      });
      header.x = x + 18;
      header.y = y + 8;
      fitDisplayToBox(header, sectionWidth - 36, sectionTitleSize + 10, { minScale: 0.62 });
      this.runReportPanel.addChild(header);
      textLines.push(header.text);

      const rows = (section.rows || [])
        .filter((entry) => entry?.id !== 'pilotOrders' && entry?.id !== 'deathCoach' && entry?.id !== 'tacticalDrafts');
      const metricColumns = narrow || sectionWidth < 390 ? 1 : compact ? 3 : 2;
      const metricGap = compact ? 3 : 7;
      const metricAreaX = x + 14;
      const metricAreaY = y + 37;
      const metricAreaWidth = sectionWidth - 26;
      const metricAreaHeight = Math.max(1, sectionHeight - 47);
      const metricRows = Math.max(1, Math.ceil(rows.length / metricColumns));
      const metricWidth = (metricAreaWidth - metricGap * (metricColumns - 1)) / metricColumns;
      const metricHeight = Math.max(11, (metricAreaHeight - metricGap * (metricRows - 1)) / metricRows);
      const denseMetrics = metricHeight < 38;
      rows.forEach((entry, rowIndex) => {
        const metricColumn = rowIndex % metricColumns;
        const metricRow = Math.floor(rowIndex / metricColumns);
        const metricX = metricAreaX + metricColumn * (metricWidth + metricGap);
        const metricY = metricAreaY + metricRow * (metricHeight + metricGap);
        const label = this.getRunReportFieldLabel(entry.id);
        const value = this.formatRunReportValue(entry);
        const rowText = [label, value].join(': ');

        const metricBg = new PIXI.Graphics();
        metricBg.roundRect(metricX, metricY, metricWidth, metricHeight, 5);
        metricBg.fill({ color: 0x03111f, alpha: 0.9 });
        metricBg.roundRect(metricX, metricY, metricWidth, metricHeight, 5);
        metricBg.stroke({ color: sectionAccent, width: 0.8, alpha: 0.24 });
        metricBg.rect(metricX + 8, metricY + metricHeight - 3, Math.max(12, metricWidth * 0.28), 1);
        metricBg.fill({ color: sectionAccent, alpha: 0.5 });
        this.runReportPanel.addChild(metricBg);

        const metricLabel = createText(label.toUpperCase(), {
          fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
          fontSize: denseMetrics ? 7 : compact ? 9 : 11,
          fontWeight: '900',
          fill: sectionAccent,
          stroke: '#031323',
          strokeThickness: 2,
          align: 'left',
          letterSpacing: 0.5
        });
        metricLabel.anchor.set(0, denseMetrics ? 0.5 : 0);
        metricLabel.x = metricX + 9;
        metricLabel.y = denseMetrics ? metricY + metricHeight / 2 : metricY + 5;
        fitDisplayToBox(
          metricLabel,
          denseMetrics ? metricWidth * 0.58 : metricWidth - 18,
          denseMetrics ? metricHeight - 5 : Math.max(7, metricHeight * 0.32),
          { minScale: 0.52 }
        );

        const metricValue = createText(value, {
          fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
          fontSize: denseMetrics ? 10 : compact ? 13 : 17,
          fontWeight: '900',
          fill: '#eefcff',
          stroke: '#031323',
          strokeThickness: 2,
          align: 'left',
          wordWrap: true,
          wordWrapWidth: metricWidth - 18,
          lineHeight: denseMetrics ? 10 : compact ? 14 : 18
        });
        metricValue.anchor.set(denseMetrics ? 1 : 0, denseMetrics ? 0.5 : 0);
        metricValue.x = denseMetrics ? metricX + metricWidth - 9 : metricX + 9;
        metricValue.y = denseMetrics
          ? metricY + metricHeight / 2
          : metricY + Math.max(16, metricHeight * 0.38);
        fitDisplayToBox(
          metricValue,
          denseMetrics ? metricWidth * 0.37 : metricWidth - 18,
          denseMetrics ? metricHeight - 5 : Math.max(8, metricHeight * 0.5),
          { minScale: 0.52 }
        );
        this.runReportPanel.addChild(metricLabel, metricValue);
        textLines.push(rowText);
      });
    });

    const tacticalChipBounds = [];
    if (tacticalLoadout.length > 0) {
      const x = -panelWidth / 2 + innerPad;
      const y = tacticalBandY;
      const bandWidth = tacticalBandWidth;
      const band = new PIXI.Graphics();
      band.roundRect(x, y, bandWidth, tacticalBandHeight, 8);
      band.fill({ color: 0x061827, alpha: 0.96 });
      band.roundRect(x, y, bandWidth, tacticalBandHeight, 8);
      band.stroke({ color: 0x7dffcc, width: 1.4, alpha: 0.7 });
      band.rect(x, y, 7, tacticalBandHeight);
      band.fill({ color: 0x7dffcc, alpha: 0.88 });
      band.rect(x + 18, y + (compact ? 29 : 33), bandWidth - 36, 1);
      band.fill({ color: 0x7dffcc, alpha: 0.24 });
      this.runReportPanel.addChild(band);

      const tacticalLabel = this.getRunReportFieldLabel('tacticalDrafts');
      const doctrine = report.summary?.tacticalDoctrine;
      const doctrineLabel = doctrine?.name
        ? translateText('{name} // {stage}', { name: translateText(doctrine.name), stage: translateText(doctrine.stage || '') })
        : '';
      const headingText = doctrineLabel
        ? translateText('{label} // {doctrine}', { label: tacticalLabel, doctrine: doctrineLabel })
        : tacticalLabel;
      const heading = createText(headingText, {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: compact ? 13 : 16,
        fontWeight: '900',
        fill: '#7dffcc',
        stroke: '#031323',
        strokeThickness: 2,
        align: 'left',
        letterSpacing: 0
      });
      heading.x = x + 18;
      heading.y = y + (compact ? 8 : 9);
      fitDisplayToBox(heading, bandWidth - 36, compact ? 18 : 22, { minScale: 0.7 });
      this.runReportPanel.addChild(heading);

      const chipAreaX = x + 14;
      const chipAreaY = y + (compact ? 35 : 40);
      const chipAreaWidth = bandWidth - 28;
      const chipWidth = (chipAreaWidth - chipGap * (chipColumns - 1)) / chipColumns;
      tacticalLoadout.forEach((entry, index) => {
        const column = index % chipColumns;
        const row = Math.floor(index / chipColumns);
        const chipX = chipAreaX + column * (chipWidth + chipGap);
        const chipY = chipAreaY + row * (chipHeight + chipGap);
        const chip = new PIXI.Graphics();
        chip.roundRect(chipX, chipY, chipWidth, chipHeight, 5);
        chip.fill({ color: 0x0a2940, alpha: 0.94 });
        chip.roundRect(chipX, chipY, chipWidth, chipHeight, 5);
        chip.stroke({ color: entry.consumed ? 0xff8f6a : entry.count > 1 ? 0xffef7e : 0x37f5ff, width: 1, alpha: 0.72 });

        const chipText = `${entry.label}${entry.count > 1 ? ` x${entry.count}` : ''}${entry.consumed ? ` - ${translateText('CONSUMED')}` : ''}`;
        const label = createText(chipText, {
          fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
          fontSize: compact ? 11 : 13,
          fontWeight: 'bold',
          fill: entry.consumed ? '#ffd0bd' : entry.count > 1 ? '#fff3a2' : '#d8fbff',
          stroke: '#031323',
          strokeThickness: 2,
          align: 'center',
          letterSpacing: 0
        });
        label.anchor.set(0.5);
        label.x = chipX + chipWidth / 2;
        label.y = chipY + chipHeight / 2;
        fitDisplayToBox(label, chipWidth - 12, chipHeight - 4, { minScale: 0.66 });
        this.runReportPanel.addChild(chip, label);
        tacticalChipBounds.push({
          label: entry.label,
          count: entry.count,
          consumed: entry.consumed,
          x: Math.round(this.runReportPanel.x + chipX),
          y: Math.round(this.runReportPanel.y + chipY),
          width: Math.round(chipWidth),
          height: Math.round(chipHeight)
        });
      });
      textLines.push(`${tacticalLabel}: ${tacticalLoadout.map((entry) => `${entry.label}${entry.count > 1 ? ` x${entry.count}` : ''}${entry.consumed ? ` - ${translateText('CONSUMED')}` : ''}`).join(', ')}`);
    }

    if (deathCoachRow) {
      const x = -panelWidth / 2 + innerPad;
      const y = counterBandY;
      const bandWidth = panelWidth - innerPad * 2;
      const band = new PIXI.Graphics();
      band.roundRect(x, y, bandWidth, counterBandHeight, 8);
      band.fill({ color: 0x041323, alpha: 0.94 });
      band.roundRect(x, y, bandWidth, counterBandHeight, 8);
      band.stroke({ color: 0xffef7e, width: 1.5, alpha: 0.72 });
      band.rect(x, y, 7, counterBandHeight);
      band.fill({ color: 0xffef7e, alpha: 0.9 });
      band.rect(x + 18, y + (compact ? 29 : 32), bandWidth - 36, 1);
      band.fill({ color: 0xffef7e, alpha: 0.24 });
      this.runReportPanel.addChild(band);

      const label = this.getRunReportFieldLabel('deathCoach');
      const value = this.formatRunReportValue(deathCoachRow);
      const heading = createText(label, {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: compact ? 13 : 16,
        fontWeight: '900',
        fill: '#fff3a2',
        stroke: '#031323',
        strokeThickness: 2,
        align: 'left',
        letterSpacing: 0
      });
      heading.x = x + 18;
      heading.y = y + (compact ? 9 : 10);
      fitDisplayToBox(heading, bandWidth - 36, compact ? 18 : 22, { minScale: 0.64 });

      const body = createText(value, {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: compact ? 13 : 16,
        fontWeight: 'bold',
        fill: '#e8fbff',
        stroke: '#031323',
        strokeThickness: 2,
        align: 'left',
        wordWrap: true,
        wordWrapWidth: bandWidth - 36,
        lineHeight: compact ? 16 : 20,
        letterSpacing: 0
      });
      body.x = x + 18;
      body.y = y + (compact ? 36 : 39);
      fitDisplayToBox(body, bandWidth - 36, counterBandHeight - (compact ? 42 : 46), { minScale: 0.66 });
      this.runReportPanel.addChild(heading, body);
      textLines.push(`${label}: ${value}`);
    }

    if (pilotOrdersRow) {
      const x = -panelWidth / 2 + innerPad;
      const y = pilotBandY;
      const bandWidth = panelWidth - innerPad * 2;
      const band = new PIXI.Graphics();
      band.roundRect(x, y, bandWidth, pilotBandHeight, 8);
      band.fill({ color: 0x041a26, alpha: 0.9 });
      band.roundRect(x, y, bandWidth, pilotBandHeight, 8);
      band.stroke({ color: 0xffef7e, width: 1.3, alpha: 0.62 });
      band.rect(x, y, 7, pilotBandHeight);
      band.fill({ color: 0xffef7e, alpha: 0.86 });
      this.runReportPanel.addChild(band);

      const label = this.getRunReportFieldLabel('pilotOrders');
      const value = this.formatRunReportValue(pilotOrdersRow);
      const heading = createText(label, {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: compact ? 12 : 14,
        fontWeight: 'bold',
        fill: '#fff3a2',
        stroke: '#031323',
        strokeThickness: 2,
        align: 'left'
      });
      heading.x = x + 18;
      heading.y = y + 10;
      fitDisplayToBox(heading, bandWidth - 36, compact ? 18 : 20, { minScale: 0.64 });

      const body = createText(value, {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: compact ? 11 : 13,
        fontWeight: 'bold',
        fill: '#d8fbff',
        stroke: '#031323',
        strokeThickness: 2,
        align: 'left',
        wordWrap: true,
        wordWrapWidth: bandWidth - 36,
        lineHeight: compact ? 13 : 16
      });
      body.x = x + 18;
      body.y = y + (compact ? 30 : 32);
      fitDisplayToBox(body, bandWidth - 36, pilotBandHeight - (compact ? 38 : 40), { minScale: 0.58 });
      this.runReportPanel.addChild(heading, body);
      textLines.push(`${label}: ${value}`);
    }

    const footerGap = compact ? 8 : 12;
    const footerSpecs = dailyShareAvailable
      ? [
          {
            id: 'save',
            label: 'SAVE SIGNAL CARD',
            hint: 'S / X',
            preferredWidth: 230,
            accent: 0x37f5ff,
            fill: '#d8fbff',
            activate: () => void this.saveDailySignalShareCard()
          },
          {
            id: 'copy',
            label: 'COPY CAPTION',
            hint: 'C / Y',
            preferredWidth: 205,
            accent: 0x7dffcc,
            fill: '#d8fff0',
            activate: () => void this.copyDailySignalShareCaption()
          },
          {
            id: 'close',
            label: 'CLOSE',
            hint: 'ENTER / A',
            preferredWidth: 150,
            accent: 0xffd15c,
            fill: '#fff3a2',
            activate: () => this.closeRunReport()
          }
        ]
      : [{
          id: 'close',
          label: 'CLOSE',
          hint: null,
          preferredWidth: layout.isMobile ? 142 : 150,
          accent: 0xffd15c,
          fill: '#fff3a2',
          activate: () => this.closeRunReport()
        }];
    const footerAvailableWidth = panelWidth - innerPad * 2;
    const footerPreferredButtonWidth = footerSpecs.reduce((total, spec) => total + spec.preferredWidth, 0);
    const footerGapWidth = footerGap * Math.max(0, footerSpecs.length - 1);
    const footerScale = Math.min(1, Math.max(0.4, (footerAvailableWidth - footerGapWidth) / Math.max(1, footerPreferredButtonWidth)));
    const footerWidths = footerSpecs.map((spec) => Math.max(92, spec.preferredWidth * footerScale));
    const footerTotalWidth = footerWidths.reduce((total, value) => total + value, 0)
      + footerGap * Math.max(0, footerSpecs.length - 1);
    let footerX = -footerTotalWidth / 2;
    const footerButtonY = footerButtonTop + closeHeight / 2;
    const footerActionBounds = {};

    footerSpecs.forEach((spec, index) => {
      const buttonWidth = footerWidths[index];
      const button = new PIXI.Container();
      const disabled = this.dailySignalShareBusy && spec.id !== 'close';
      button.eventMode = disabled ? 'none' : 'static';
      button.cursor = disabled ? 'default' : 'pointer';
      button.on('pointerdown', spec.activate);

      const background = new PIXI.Graphics();
      background.roundRect(-buttonWidth / 2, -closeHeight / 2, buttonWidth, closeHeight, 8);
      background.fill({ color: 0x07192b, alpha: disabled ? 0.72 : 0.96 });
      background.roundRect(-buttonWidth / 2, -closeHeight / 2, buttonWidth, closeHeight, 8);
      background.stroke({ color: spec.accent, width: 1.5, alpha: disabled ? 0.34 : 0.82 });

      const label = createText(translateText(spec.label), {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: layout.isMobile ? 13 : compact ? 14 : 16,
        fontWeight: 'bold',
        fill: spec.fill,
        stroke: '#031323',
        strokeThickness: 2,
        align: 'center'
      });
      label.anchor.set(0.5);
      label.y = spec.hint ? -5 : 0;
      fitDisplayToBox(label, buttonWidth - 18, spec.hint ? closeHeight * 0.54 : closeHeight - 8, { minScale: 0.58 });
      button.addChild(background, label);

      if (spec.hint) {
        const hint = createText(spec.hint, {
          fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
          fontSize: compact ? 9 : 10,
          fontWeight: 'bold',
          fill: '#8fd8e7',
          stroke: '#031323',
          strokeThickness: 2,
          align: 'center'
        });
        hint.anchor.set(0.5);
        hint.y = closeHeight * 0.27;
        button.addChild(hint);
      }

      button.hitArea = new PIXI.Rectangle(-buttonWidth / 2, -closeHeight / 2, buttonWidth, closeHeight);
      button.x = footerX + buttonWidth / 2;
      button.y = footerButtonY;
      this.runReportPanel.addChild(button);
      footerActionBounds[spec.id] = {
        x: button.x - buttonWidth / 2,
        y: button.y - closeHeight / 2,
        width: buttonWidth,
        height: closeHeight
      };
      if (spec.id === 'close') this.runReportCloseButton = button;
      footerX += buttonWidth + footerGap;
    });

    if (dailyShareAvailable) {
      const statusSource = this.dailySignalShareStatus?.source || 'LOCAL SIGNAL // NO PUBLIC RANK';
      const tone = this.dailySignalShareStatus?.tone || 'info';
      const statusColor = tone === 'success'
        ? '#7dffcc'
        : tone === 'error'
          ? '#ff8b9b'
          : tone === 'muted'
            ? '#9ab4bf'
            : '#9cfbff';
      const status = createText(translateText(statusSource), {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: compact ? 11 : 13,
        fontWeight: 'bold',
        fill: statusColor,
        stroke: '#031323',
        strokeThickness: 2,
        align: 'center'
      });
      status.anchor.set(0.5);
      status.x = 0;
      status.y = footerButtonTop - shareStatusHeight / 2;
      fitDisplayToBox(status, footerAvailableWidth, shareStatusHeight, { minScale: 0.66 });
      this.runReportPanel.addChild(status);
      textLines.push(status.text);
    }

    const toScreenRect = (x, y, rectWidth, rectHeight) => ({
      x: Math.round(this.runReportPanel.x + x),
      y: Math.round(this.runReportPanel.y + y),
      width: Math.round(rectWidth),
      height: Math.round(rectHeight)
    });

    this.runReportOverlayDebug = {
      visible: Boolean(this.runReportOverlay.visible),
      localOnly: Boolean(report.localOnly),
      sectionIds: (report.sections || []).map((section) => section.id),
      text: textLines.join('\n'),
      x: Math.round(this.runReportPanel.x - panelWidth / 2),
      y: Math.round(this.runReportPanel.y - panelHeight / 2),
      width: Math.round(panelWidth),
      height: Math.round(panelHeight),
      viewport: { width: Math.round(width), height: Math.round(height) },
      sections: sectionBounds,
      tacticalLoadout: {
        totalPicks: tacticalLoadout.reduce((total, entry) => total + entry.count, 0),
        uniquePicks: tacticalLoadout.length,
        bounds: tacticalLoadout.length > 0
          ? toScreenRect(-panelWidth / 2 + innerPad, tacticalBandY, tacticalBandWidth, tacticalBandHeight)
          : null,
        chips: tacticalChipBounds
      },
      deathCoachBounds: deathCoachRow
        ? toScreenRect(-panelWidth / 2 + innerPad, counterBandY, panelWidth - innerPad * 2, counterBandHeight)
        : null,
      pilotOrdersBounds: pilotOrdersRow
        ? toScreenRect(-panelWidth / 2 + innerPad, pilotBandY, panelWidth - innerPad * 2, pilotBandHeight)
        : null,
      dailySignalShare: dailyShareAvailable ? {
        available: true,
        busy: this.dailySignalShareBusy,
        status: translateText(this.dailySignalShareStatus?.source || 'LOCAL SIGNAL // NO PUBLIC RANK'),
        filename: getDailySignalCardFilename(dailyShareModel),
        saveButtonLabel: translateText('SAVE SIGNAL CARD'),
        copyButtonLabel: translateText('COPY CAPTION'),
        model: dailyShareModel,
        saveButtonBounds: footerActionBounds.save
          ? toScreenRect(footerActionBounds.save.x, footerActionBounds.save.y, footerActionBounds.save.width, footerActionBounds.save.height)
          : null,
        copyButtonBounds: footerActionBounds.copy
          ? toScreenRect(footerActionBounds.copy.x, footerActionBounds.copy.y, footerActionBounds.copy.width, footerActionBounds.copy.height)
          : null,
        lastAction: this.dailySignalShareDebug
      } : { available: false },
      closeButtonBounds: footerActionBounds.close
        ? toScreenRect(footerActionBounds.close.x, footerActionBounds.close.y, footerActionBounds.close.width, footerActionBounds.close.height)
        : null
    };
  }

  async confirmGlobalLeaderboardAchievements(result) {
    if (!this.isRankedRun || this.game?.runMode === 'unranked' || this.game?.isDebugRun) return null;
    const provider = result.globalProvider || (this.steamSubmissionMode ? 'steam' : null);
    if (!isAcceptedLeaderboardSubmission(result, provider)) return null;
    this.unlockSwarmEliteForAcceptedSubmission(result, provider);

    if (provider === 'steam') {
      if (this.isSteamBestUnchangedResult(result)) {
        const previousBestScore = this.getSteamPreviousBestScore(result);
        result.globalStatus = 'steam_best_unchanged';
        result.globalQualified = false;
        result.globalRank = null;
        result.confirmedGlobalPlacement = null;
        result.achievementConfirmationStatus = 'steam_best_unchanged';
        result.steamPreviousBestScore = previousBestScore;
        this.previousSteamBestScore = previousBestScore;
        this.steamBestUnchanged = true;
        this.leaderboardResult = result;
        if (this.game) this.game.lastLeaderboardResult = result;
        this.clearGlobalPlacement('steam_best_unchanged');
        return null;
      }
      const steamRank = getValidPlacementNumber(result.steamRank ?? result.rank ?? result.globalRank);
      const placement = {
        score: this.finalScore,
        placement: steamRank,
        qualified: Boolean(steamRank),
        numberOne: Boolean(steamRank === 1),
        top3: Boolean(steamRank && steamRank <= 3),
        top10: Boolean(steamRank && steamRank <= 10),
        source: 'steam_submit_result'
      };
      result.confirmedGlobalPlacement = placement;
      result.achievementConfirmationStatus = steamRank ? 'confirmed' : 'steam_rank_missing';
      this.leaderboardResult = result;
      if (this.game) this.game.lastLeaderboardResult = result;
      return this.applyConfirmedGlobalPlacement(placement, provider);
    }

    if (provider !== 'cloud') return null;

    try {
      const entries = await this.leaderboardAdapter.getGlobalScoresForPlacement({
        useCache: false,
        ...this.getRunLeaderboardQuery()
      });
      const placement = getConfirmedGlobalPlacement(this.finalScore, entries);
      result.confirmedGlobalPlacement = placement;
      result.achievementConfirmationStatus = placement.qualified ? 'confirmed' : 'not_qualified_after_submit';
      this.leaderboardResult = result;
      if (this.game) this.game.lastLeaderboardResult = result;
      return this.applyConfirmedGlobalPlacement(placement, provider);
    } catch (error) {
      result.achievementConfirmationStatus = 'post_submit_global_read_failed';
      result.achievementConfirmationError = error?.message || 'unknown';
      return null;
    }
  }

  playPersonalBestVoice() {
    if (this.personalBestVoicePlayed || this.qualificationFanfarePlayed) return;
    this.personalBestVoicePlayed = true;
    this.scheduleSceneTimeout(() => {
      AudioManager.playVoice('mission_control_personal_best', {
        cooldownMs: 7000,
        duckMs: 2200,
        duckFactor: 0.48,
        volume: 0.82
      });
    }, 900);
  }

  playLocalHighscoreVoice() {
    AudioManager.playSfx('nova_highscore_chime', { force: true, volume: 0.82, minIntervalMs: 0 });
    AudioManager.playVoice('mission_control_local_highscore', {
      force: true,
      stopOtherVoices: true,
      exclusiveGroup: 'announcer',
      cooldownMs: 7000,
      duckMs: 2200,
      duckFactor: 0.46,
      volume: 0.82
    });
  }

  isLeaderboardInputFocused() {
    if (typeof document === 'undefined') return false;
    const active = document.activeElement;
    return Boolean(active && (active === this.inputField || active === this.hiddenInput));
  }

  readRecentCtaIds() {
    try {
      const parsed = JSON.parse(localStorage.getItem(GAME_OVER_CTA_RECENT_HISTORY_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(Boolean).slice(-GAME_OVER_CTA_RECENT_HISTORY_SIZE) : [];
    } catch {
      return [];
    }
  }

  rememberCtaId(id) {
    if (!id) return;
    try {
      const recent = this.readRecentCtaIds().filter((entry) => entry !== id);
      recent.push(id);
      localStorage.setItem(GAME_OVER_CTA_RECENT_HISTORY_KEY, JSON.stringify(recent.slice(-GAME_OVER_CTA_RECENT_HISTORY_SIZE)));
    } catch { }
  }

  selectRunbackCtaLine() {
    const lines = gameOverCtaVoiceLines;
    const recent = this.readRecentCtaIds();
    const candidates = lines.filter((line) => !recent.includes(line.id));
    const pool = candidates.length ? candidates : lines.filter((line) => line.id !== recent[recent.length - 1]);
    const selected = (pool.length ? pool : lines)[Math.floor(Math.random() * (pool.length || lines.length))] || lines[0];
    this.rememberCtaId(selected?.id);
    return selected;
  }

  getRunbackStatusText(reason = this.runbackReason) {
    return this.getRunbackLeaderboardText(reason);
  }

  getRunbackTitle() {
    if (this.isDailySignalResult()) return this.getCeremonyTitle();
    if (this.isOverrunResult()) return translateText('OVERRUN COMPLETE');
    if (!this.isRankedRun && this.game?.runMode === RUN_MODES.SECTOR_START) return translateText('SECTOR RUN');
    if (!this.isRankedRun && this.game?.runMode === RUN_MODES.SCOUT) return translateText('SCOUT RUN');
    if (this.globalPlacement?.qualified && this.globalPlacement?.numberOne) return 'NUMBER ONE';
    if (this.globalPlacement?.qualified && this.globalPlacement?.top3) return this.getSteamGlobalLeaderboardTitle();
    if (this.globalPlacement?.qualified && this.globalPlacement?.top10) return this.getSteamGlobalLeaderboardTitle();
    return 'ONE MORE RUN?';
  }

  getSteamGlobalLeaderboardTitle() {
    const rank = getValidPlacementNumber(this.globalPlacement?.placement);
    return rank
      ? translateText('Steam Global Leaderboard #{rank}', { rank })
      : translateText('Steam Global Leaderboard');
  }

  getRunbackComment() {
    return this.getRunbackLeaderboardText();
  }

  getSubmittedReportHoldMs() {
    const elapsed = Date.now() - (this.reportShownAt || Date.now());
    return Math.max(SUBMITTED_POST_RESULT_MIN_MS, SUBMITTED_REPORT_MIN_MS - elapsed);
  }

  isSubmittedHoldContinueReady() {
    const now = Date.now();
    return (!this.submittedHoldContinueReadyAt || now >= this.submittedHoldContinueReadyAt)
      && (!this.continueInputArmedAt || now >= this.continueInputArmedAt);
  }

  getSubmittedHoldRemainingMs() {
    const now = Date.now();
    return Math.max(
      0,
      this.submittedHoldContinueReadyAt ? this.submittedHoldContinueReadyAt - now : 0,
      this.continueInputArmedAt ? this.continueInputArmedAt - now : 0
    );
  }

  isResultHoldContinueReady() {
    const now = Date.now();
    return (!this.resultHoldContinueReadyAt || now >= this.resultHoldContinueReadyAt)
      && (!this.continueInputArmedAt || now >= this.continueInputArmedAt);
  }

  getResultHoldRemainingMs() {
    const now = Date.now();
    return Math.max(
      0,
      this.resultHoldContinueReadyAt ? this.resultHoldContinueReadyAt - now : 0,
      this.continueInputArmedAt ? this.continueInputArmedAt - now : 0
    );
  }

  enterRunbackStageAfterReportHold(reason = 'score_submitted') {
    const remainingMs = this.getSubmittedReportHoldMs();

    this.pendingRunbackReason = reason;
    this.submittedHoldContinueReadyAt = Date.now() + remainingMs;
    this.continueInputArmedAt = Date.now() + CONTINUE_INPUT_ARM_MS;
    this.state = 'submitted_hold';
    this.removeInputOverlay();
    this.stopCaretBlink();
    this.hideHiddenInput();
    this.updatePromptMessage('SCORE SUBMITTED');
    this.updateLeaderboardStatusText();
    if (this.instructions) {
      this.instructions.text = this.getInstructionsText();
    }
    this.refreshPrimaryCta();
    this.layoutScreen();
    if (remainingMs > 0) {
      this.scheduleSceneTimeout(() => {
        if (!this.isSceneActive() || this.state !== 'submitted_hold') return;
        this.updateInputPrompts();
        this.refreshPrimaryCta();
        this.layoutScreen();
      }, remainingMs);
    }
  }

  enterResultHoldStage(reason = 'no_slot') {
    if (this.state === 'result_hold' || this.state === 'runback') return;
    const now = Date.now();
    this.pendingRunbackReason = reason;
    this.resultHoldContinueReadyAt = now + RESULT_REPORT_MIN_MS;
    this.continueInputArmedAt = now + CONTINUE_INPUT_ARM_MS;
    this.state = 'result_hold';
    this.removeInputOverlay();
    this.stopCaretBlink();
    this.hideHiddenInput();
    this.updatePromptMessage('PLACEMENT READY');
    this.updateLeaderboardStatusText();
    this.updateCeremonyPresentation();
    if (this.notQualifiedText) {
      this.notQualifiedText.visible = false;
    }
    if (this.instructions) {
      this.instructions.text = this.getInstructionsText();
    }
    this.refreshPrimaryCta();
    this.layoutScreen();
    this.scheduleSceneTimeout(() => {
      if (!this.isSceneActive() || this.state !== 'result_hold') return;
      this.updateInputPrompts();
      this.refreshPrimaryCta();
      this.layoutScreen();
    }, RESULT_REPORT_MIN_MS);
  }

  continueFromSubmittedHold() {
    if (this.state !== 'submitted_hold') return;
    if (!this.isSubmittedHoldContinueReady()) {
      this.refreshPrimaryCta();
      return;
    }
    const nextReason = this.pendingRunbackReason || 'score_submitted';
    this.pendingRunbackReason = null;
    this.submittedHoldContinueReadyAt = 0;
    this.continueInputArmedAt = 0;
    this.enterRunbackStage(nextReason);
  }

  continueFromResultHold() {
    if (this.state !== 'result_hold') return;
    if (!this.isResultHoldContinueReady()) {
      this.refreshPrimaryCta();
      return;
    }
    const nextReason = this.pendingRunbackReason || 'no_slot';
    this.pendingRunbackReason = null;
    this.resultHoldContinueReadyAt = 0;
    this.continueInputArmedAt = 0;
    this.enterRunbackStage(nextReason);
  }

  refreshVisibleRunbackAfterSubmission(reason = 'score_saved') {
    if (!this.isSceneActive() || this.state !== 'runback') return;
    this.runbackReason = reason;
    if (this.title) {
      this.title.text = this.getRunbackTitle();
      this.title.style.fill = this.globalPlacement?.qualified ? '#fff8b8' : '#fff3a2';
      this.title.style.dropShadowColor = this.globalPlacement?.qualified ? '#ffd454' : '#ffc94a';
    }
    this.syncResultStagePresentation();
    this.updateCeremonyPresentation();
    this.updateLeaderboardStatusText();
    this.refreshPrimaryCta();
    this.layoutScreen();
  }

  enterRunbackStage(reason = 'runback') {
    if (this.state === 'runback') return;
    this.clearSceneTimeouts();
    this.removeInputOverlay();
    this.stopCaretBlink();
    this.hideHiddenInput();

    this.state = 'runback';
    this.runbackReason = reason;
    this.runbackStartedAt = Date.now();
    this.submittedHoldContinueReadyAt = 0;
    this.resultHoldContinueReadyAt = 0;
    this.continueInputArmedAt = 0;
    this.ctaVoicePlayed = false;
    this.selectedCtaLine = this.selectRunbackCtaLine();

    if (this.title) {
      this.title.text = this.getRunbackTitle();
      this.title.style.fill = this.globalPlacement?.qualified ? '#fff8b8' : '#fff3a2';
      this.title.style.dropShadowColor = this.globalPlacement?.qualified ? '#ffd454' : '#ffc94a';
    }
    this.syncResultStagePresentation();
    if (this.comment) this.comment.style.fill = this.globalPlacement?.qualified ? '#ffeeb0' : '#d8e6ff';
    if (this.leaderboardStatusText) {
      this.leaderboardStatusText.style.fill = reason === 'global_failed'
        ? '#ffb35c'
        : this.globalPlacement?.qualified
          ? '#fff3a2'
          : '#ffe86a';
    }
    if (this.notQualifiedText) {
      this.notQualifiedText.visible = false;
    }
    if (this.nameDisplay) {
      this.nameDisplay.visible = false;
    }
    if (this.instructions) {
      this.instructions.text = this.getInstructionsText();
    }

    if (this.globalPlacement?.qualified) {
      this.playGlobalQualificationFanfare();
    } else {
      AudioManager.playSfx('swarm_chatter_stinger', { force: true, volume: 0.72, minIntervalMs: 0 });
      this.scheduleSceneTimeout(() => this.playRunbackVoice(), 420);
    }
    this.refreshPrimaryCta();
    this.layoutScreen();
  }

  playRunbackVoice() {
    if (this.ctaVoicePlayed || this.state !== 'runback' || !this.selectedCtaLine?.id) return false;
    this.ctaVoicePlayed = true;
    if (AudioManager.isCtaVoiceEnabled && !AudioManager.isCtaVoiceEnabled()) return false;
    return AudioManager.playVoice(this.selectedCtaLine.id, {
      force: true,
      stopOtherVoices: true,
      exclusiveGroup: 'runback',
      cooldownMs: 0,
      eventCooldownMs: 0,
      duckMs: 2200,
      duckFactor: 0.38,
      volume: 0.92
    });
  }

  skipScoreSubmission(reason = 'skip') {
    if (this.state === 'submitting') return;
    this.game.pendingHighscore = null;
    this.leaderboardResult = {
      name: null,
      score: this.finalScore,
      level: this.finalLevel,
      skipped: true,
      reason,
      updatedAt: new Date().toISOString()
    };
    this.game.lastLeaderboardResult = this.leaderboardResult;
    this.enterRunbackStage('score_skipped');
  }

  openLeaderboard() {
    if (this.isSubmitting) return;
    this.clearSceneTimeouts();
    AudioManager.stopVoiceGroup('runback');
    if (this.isSectorStartChallengeResult()) {
      this.game.leaderboardView = LeaderboardView.SECTOR;
    }
    this.game.showHighscores();
  }

  openHangar() {
    if (this.isSubmitting) return;
    if (!this.shouldShowHangarButton()) return;
    this.clearSceneTimeouts();
    AudioManager.stopVoiceGroup('runback');
    this.game.showShipSelect();
  }

  updatePromptMessage(text) {
    if (this.promptText) {
      this.promptText.text = text;
    }
  }

  getRetryCtaDebugState() {
    const fallback = {
      label: this.retryButtonLabel?.text || null,
      hint: this.retryButtonHint?.text || null,
      mode: this.retryButtonMode || null,
      visible: Boolean(this.retryButton?.visible && this.retryButton?.parent)
    };
    try {
      if (!this.retryButton?.getBounds) return fallback;
      const bounds = this.retryButton.getBounds();
      return {
        ...fallback,
        disabled: this.retryButton?.eventMode === 'none',
        x: Math.round(bounds.x || 0),
        y: Math.round(bounds.y || 0),
        width: Math.round(bounds.width || 0),
        height: Math.round(bounds.height || 0)
      };
    } catch {
      return fallback;
    }
  }

  getLeaderboardCtaDebugState() {
    const fallback = {
      label: this.leaderboardButtonLabel?.text || null,
      hint: this.leaderboardButtonHint?.text || null,
      visible: Boolean(this.leaderboardButton?.visible && this.leaderboardButton?.parent)
    };
    try {
      if (!this.leaderboardButton?.getBounds) return fallback;
      const bounds = this.leaderboardButton.getBounds();
      return {
        ...fallback,
        x: Math.round(bounds.x || 0),
        y: Math.round(bounds.y || 0),
        width: Math.round(bounds.width || 0),
        height: Math.round(bounds.height || 0)
      };
    } catch {
      return fallback;
    }
  }

  getHangarCtaDebugState() {
    const fallback = {
      label: this.hangarButtonLabel?.text || null,
      hint: this.hangarButtonHint?.text || null,
      visible: Boolean(this.hangarButton?.visible && this.hangarButton?.parent)
    };
    try {
      if (!this.hangarButton?.getBounds) return fallback;
      const bounds = this.hangarButton.getBounds();
      return {
        ...fallback,
        x: Math.round(bounds.x || 0),
        y: Math.round(bounds.y || 0),
        width: Math.round(bounds.width || 0),
        height: Math.round(bounds.height || 0)
      };
    } catch {
      return fallback;
    }
  }

  getMainMenuCtaDebugState() {
    const fallback = {
      label: this.mainMenuButtonLabel?.text || null,
      hint: this.mainMenuButtonHint?.text || null,
      visible: Boolean(this.mainMenuButton?.visible && this.mainMenuButton?.parent)
    };
    try {
      if (!this.mainMenuButton?.getBounds) return fallback;
      const bounds = this.mainMenuButton.getBounds();
      return {
        ...fallback,
        x: Math.round(bounds.x || 0),
        y: Math.round(bounds.y || 0),
        width: Math.round(bounds.width || 0),
        height: Math.round(bounds.height || 0)
      };
    } catch {
      return fallback;
    }
  }

  getCounterAdviceCardDebugState() {
    const advice = this.getDeathCoachAdvice();
    const fallback = {
      label: this.counterAdviceLabel?.text || translateText('COUNTER ADVICE: LAST DEATH'),
      text: this.counterAdviceBody?.text || this.getCounterAdviceText(),
      source: advice?.source || null,
      visible: Boolean(this.counterAdviceCard?.visible && this.counterAdviceCard?.parent)
    };
    try {
      if (!this.counterAdviceCard?.getBounds) return fallback;
      const bounds = this.counterAdviceCard.getBounds();
      return {
        ...fallback,
        x: Math.round(bounds.x || 0),
        y: Math.round(bounds.y || 0),
        width: Math.round(bounds.width || this.counterAdviceCardWidth || 0),
        height: Math.round(bounds.height || this.counterAdviceCardHeight || 0)
      };
    } catch {
      return fallback;
    }
  }

  getRunReportCtaDebugState() {
    const fallback = {
      label: this.runReportButtonLabel?.text || null,
      hint: this.runReportButtonHint?.text || null,
      visible: Boolean(this.runReportButton?.visible && this.runReportButton?.parent),
      hasReport: Boolean(this.getRunReport())
    };
    try {
      if (!this.runReportButton?.getBounds) return fallback;
      const bounds = this.runReportButton.getBounds();
      return {
        ...fallback,
        x: Math.round(bounds.x || 0),
        y: Math.round(bounds.y || 0),
        width: Math.round(bounds.width || 0),
        height: Math.round(bounds.height || 0)
      };
    } catch {
      return fallback;
    }
  }

  getRunReportOverlayDebugState() {
    const report = this.getRunReport();
    const base = {
      visible: Boolean(this.runReportOverlay?.visible && this.runReportOverlay?.parent),
      open: Boolean(this.runReportOpen),
      localOnly: Boolean(report?.localOnly),
      sectionIds: Array.isArray(report?.sections) ? report.sections.map((section) => section.id) : [],
      text: this.runReportOverlayDebug?.text || ''
    };
    if (this.runReportOverlayDebug) {
      return {
        ...this.runReportOverlayDebug,
        ...base,
        text: this.runReportOverlayDebug.text || base.text
      };
    }
    return base;
  }

  getRunReportDebugState() {
    const report = this.getRunReport();
    if (!report) return null;
    return {
      localOnly: Boolean(report.localOnly),
      summary: report.summary || null,
      deathCoach: report.summary?.deathCoach || this.getDeathCoachAdvice(),
      sectionIds: Array.isArray(report.sections) ? report.sections.map((section) => section.id) : [],
      overlay: this.getRunReportOverlayDebugState()
    };
  }

  showInputOverlay() {
    if (this.inputOverlay) return;

    const { width, height } = this.game.app.screen;

    // Create overlay container
    this.inputOverlay = document.createElement('div');
    this.inputOverlay.id = 'name-input-overlay';
    this.inputOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: rgba(0, 0, 0, 0.85);
      z-index: 10000;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Label
    const label = document.createElement('div');
    label.textContent = translateText('ENTER PILOT NAME');
    label.style.cssText = `
      font-family: 'Rajdhani', 'Orbitron', 'Segoe UI', sans-serif;
      font-weight: 700;
      font-size: 20px;
      color: #00ffff;
      margin-bottom: 16px;
      text-align: center;
    `;
    this.inputOverlay.appendChild(label);

    // Input field
    this.inputField = document.createElement('input');
    this.inputField.type = 'text';
    this.inputField.maxLength = PILOT_NAME_MAX_LENGTH;
    this.inputField.autocapitalize = 'characters';
    this.inputField.autocomplete = 'off';
    this.inputField.spellcheck = false;
    this.inputField.placeholder = translateText('PILOT');
    this.inputField.style.cssText = `
      font-family: 'Rajdhani', 'Orbitron', 'Segoe UI', sans-serif;
      font-weight: 700;
      font-size: 28px;
      color: #ffffff;
      background: #111111;
      border: 3px solid #00ffff;
      border-radius: 8px;
      padding: 14px 20px;
      width: 280px;
      max-width: 90%;
      text-align: center;
      text-transform: uppercase;
      outline: none;
      box-sizing: border-box;
    `;
    this.boundVisibleInput = (e) => {
      this.setInputDevice('keyboard');
      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
      e.target.value = value.slice(0, PILOT_NAME_MAX_LENGTH);
      this.nameInput = e.target.value;
      this.refreshPrimaryCta();
    };
    this.boundVisibleInputKeyDown = (e) => {
      e.stopPropagation();
      this.setInputDevice('keyboard');
      if (e.key === 'Enter' && this.nameInput.length > 0) {
        e.preventDefault();
        this.submitScore();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.skipScoreSubmission('visible_input_escape');
      }
    };
    this.inputField.addEventListener('input', this.boundVisibleInput);
    this.inputField.addEventListener('keydown', this.boundVisibleInputKeyDown);
    this.inputOverlay.appendChild(this.inputField);

    // Button container
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      display: flex;
      gap: 12px;
      margin-top: 20px;
    `;

    // Submit button
    this.submitButton = document.createElement('button');
    this.submitButton.textContent = translateText('SUBMIT SCORE');
    this.submitButton.style.cssText = `
      font-family: 'Orbitron', 'Rajdhani', sans-serif;
      font-size: 22px;
      color: #000000;
      background: #00ffff;
      border: none;
      border-radius: 8px;
      padding: 14px 40px;
      cursor: pointer;
      font-weight: bold;
      min-width: 120px;
    `;
    this.submitButton.addEventListener('click', () => {
      this.setInputDevice('keyboard');
      if (this.nameInput.length > 0) {
        this.submitScore();
      }
    });
    btnContainer.appendChild(this.submitButton);

    // Skip button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = translateText('SKIP');
    cancelButton.style.cssText = `
      font-family: 'Rajdhani', 'Orbitron', sans-serif;
      font-weight: 700;
      font-size: 18px;
      color: #888888;
      background: #333333;
      border: 2px solid #666666;
      border-radius: 8px;
      padding: 14px 20px;
      cursor: pointer;
    `;
    cancelButton.addEventListener('click', () => {
      this.setInputDevice('keyboard');
      this.skipScoreSubmission('visible_skip_button');
    });
    btnContainer.appendChild(cancelButton);

    this.inputOverlay.appendChild(btnContainer);

    document.body.appendChild(this.inputOverlay);

    // Focus the input field after a short delay (for mobile keyboard)
    this.scheduleSceneTimeout(() => {
      if (this.inputField) {
        this.inputField.focus();
      }
    }, 100);
  }

  removeInputOverlay() {
    if (this.inputField) {
      if (this.boundVisibleInput) this.inputField.removeEventListener('input', this.boundVisibleInput);
      if (this.boundVisibleInputKeyDown) this.inputField.removeEventListener('keydown', this.boundVisibleInputKeyDown);
    }
    if (this.inputOverlay && this.inputOverlay.parentNode) {
      this.inputOverlay.parentNode.removeChild(this.inputOverlay);
    }
    this.inputOverlay = null;
    this.inputField = null;
    this.submitButton = null;
    this.boundVisibleInput = null;
    this.boundVisibleInputKeyDown = null;
  }

  async submitSectorStartSteamScore() {
    if (!this.isSectorStartChallengeResult() || this.sectorSteamSubmitting) return;
    if (this.finalScore <= 0) {
      this.sectorSteamStatus = 'skipped';
      this.updateLeaderboardStatusText();
      this.updateCeremonyPresentation();
      return;
    }

    this.sectorSteamSubmitting = true;
    this.sectorSteamStatus = 'submitting';
    this.updateLeaderboardStatusText();
    this.updateCeremonyPresentation();

    const playerName = this.steamPlayerName || await this.leaderboardAdapter.getSteamPlayerName().catch(() => null) || 'STEAM PILOT';
    const runResult = this.leaderboardAdapter.createSectorStartRunResult(this.game, {
      name: playerName,
      playerName,
      score: this.finalScore,
      rankIndex: this.game.rankIndex || 0,
      submissionId: this.submissionId
    });
    let result = null;
    try {
      result = await this.leaderboardAdapter.submitSectorStartScore(runResult, {
        name: playerName
      });
    } catch (error) {
      result = {
        name: playerName,
        score: this.finalScore,
        level: runResult.level,
        levelReached: runResult.levelReached,
        startSector: runResult.startSector,
        highestSectorReached: runResult.highestSectorReached,
        finalSector: runResult.finalSector,
        submissionId: this.submissionId,
        sectorSteamStatus: 'failed',
        sectorSteamError: error?.message || 'unknown'
      };
    }

    this.sectorLeaderboardResult = {
      ...result,
      mainLeaderboardStatus: 'unranked',
      updatedAt: new Date().toISOString()
    };
    this.game.lastSectorLeaderboardResult = this.sectorLeaderboardResult;
    this.game.leaderboardView = LeaderboardView.SECTOR;
    this.sectorSteamRank = result.sectorSteamRank || null;
    this.sectorSteamError = result.sectorSteamError || null;
    this.sectorSteamStatus = result.sectorSteamStatus === 'submitted'
      ? (result.sectorSteamBestUnchanged ? 'best_unchanged' : 'submitted')
      : (result.sectorSteamStatus || 'failed');
    this.sectorLeaderboardResult.sectorSteamStatus = this.sectorSteamStatus;
    this.sectorSteamSubmitting = false;
    this.updateLeaderboardStatusText();
    this.updateCeremonyPresentation();
    this.refreshPrimaryCta();
    this.layoutScreen();
  }

  async submitSteamScore() {
    if (!this.steamSubmissionMode || !this.isRankedRun || this.isSubmitting) return;
    if (this.finalScore <= 0) {
      this.game.pendingHighscore = null;
      if (this.state !== 'runback') this.enterRunbackStage('no_slot');
      return;
    }

    const runbackAlreadyVisible = this.state === 'runback';
    const submissionToken = this.steamSubmissionToken + 1;
    this.steamSubmissionToken = submissionToken;
    this.isSubmitting = true;
    if (!runbackAlreadyVisible) this.state = 'submitting';
    this.globalStatus = 'submitting';
    this.stopCaretBlink();
    this.hideHiddenInput();
    if (!runbackAlreadyVisible) this.updatePromptMessage('SAVING TO STEAM...');
    this.updateNameDisplay();
    if (!runbackAlreadyVisible) this.updateLeaderboardStatusText();
    this.refreshPrimaryCta();

    const isCurrentSubmission = () => this.steamSubmissionToken === submissionToken && this.isSceneActive();
    const playerName = this.steamPlayerName || await this.withSubmissionTimeout(
      this.leaderboardAdapter.getSteamPlayerName(),
      STEAM_PLAYER_NAME_TIMEOUT_MS,
      'Steam player name timeout'
    ).catch(() => null) || 'STEAM PILOT';
    const submittedLevel = this.getSubmittedLevelReached();
    const runResult = this.leaderboardAdapter.createRunResult(this.game, {
      name: playerName,
      playerName,
      score: this.finalScore,
      level: submittedLevel,
      levelReached: submittedLevel,
      rankIndex: this.game.rankIndex || 0,
      submissionId: this.submissionId
    });
    let result = null;
    try {
      result = await this.withSubmissionTimeout(
        this.leaderboardAdapter.submitScore(runResult, {
          target: 'steam',
          saveLocal: true,
          name: playerName
        }),
        this.getSteamSubmitTimeoutMs(),
        'Steam submit timeout'
      );
      if (!isCurrentSubmission()) return;

      this.previousSteamBestScore = this.getSteamPreviousBestScore(result);
      this.steamBestUnchanged = this.isSteamBestUnchangedResult(result);
      this.globalStatus = result.steamStatus === 'submitted'
        ? (this.steamBestUnchanged ? 'steam_best_unchanged' : 'submitted')
        : 'failed';
      result.globalStatus = this.globalStatus;
      result.globalQualified = false;
      result.localQualified = result.localStatus === 'saved';
      result.steamSubmissionMode = true;
      result.updatedAt = new Date().toISOString();
      this.rememberLocalPlacement(result.localPlacement, 'steam_local_backup');
      const confirmedPlacement = await this.confirmGlobalLeaderboardAchievements(result);
      if (!isCurrentSubmission()) return;
      result.globalQualified = Boolean(confirmedPlacement?.qualified);
      result.globalPlacement = confirmedPlacement || null;
      result.globalPlacementTier = this.globalPlacementTier;
      result.globalRank = confirmedPlacement?.placement || null;
    } catch (error) {
      const localBackup = await this.withSubmissionTimeout(
        this.leaderboardAdapter.localProvider?.submitScore?.(runResult, { name: playerName }) || Promise.resolve(null),
        LOCAL_SCORE_BACKUP_TIMEOUT_MS,
        'Local score backup timeout'
      ).catch(() => null);
      const pending = this.leaderboardAdapter.enqueuePendingSteamSubmission(runResult, {
        reason: error?.message || 'steam_submit_failed',
        target: 'global'
      });
      result = {
        name: playerName,
        score: this.finalScore,
        level: submittedLevel,
        levelReached: submittedLevel,
        rankIndex: this.game.rankIndex || 0,
        submissionId: this.submissionId,
        localStatus: localBackup ? 'saved' : 'failed',
        localPlacement: localBackup?.placement || null,
        localEntry: localBackup?.entry || null,
        globalStatus: 'failed',
        globalProvider: 'steam',
        globalQualified: false,
        localQualified: Boolean(localBackup),
        steamStatus: 'failed',
        steamError: error?.message || 'unknown',
        steamPendingQueued: pending.queued,
        steamPendingCount: pending.pendingCount,
        steamSubmissionMode: true,
        updatedAt: new Date().toISOString()
      };
      if (!isCurrentSubmission()) return;
      this.previousSteamBestScore = 0;
      this.steamBestUnchanged = false;
      this.globalStatus = 'failed';
      this.clearGlobalPlacement('failed');
      this.rememberLocalPlacement(result.localPlacement, 'steam_local_backup');
    } finally {
      if (isCurrentSubmission()) this.isSubmitting = false;
    }

    if (!isCurrentSubmission() || !result) return;
    this.leaderboardResult = result;
    this.game.lastLeaderboardResult = result;
    this.game.leaderboardView = this.globalStatus === 'failed'
      ? LeaderboardView.LOCAL
      : this.getRunLeaderboardQuery().view;
    this.game.pendingHighscore = null;
    this.removeInputOverlay();
    const reason = this.globalStatus === 'failed'
      ? 'global_failed'
      : this.globalStatus === 'steam_best_unchanged'
        ? 'steam_best_unchanged'
        : 'score_submitted';
    if (runbackAlreadyVisible) {
      this.runbackReason = reason;
      if (this.leaderboardStatusText) {
        this.leaderboardStatusText.text = this.getRunbackStatusText(reason);
        this.leaderboardStatusText.style.fill = reason === 'global_failed' ? '#ffb35c' : '#ffe86a';
      }
      this.refreshPrimaryCta();
      this.layoutScreen();
      return;
    }
    this.state = 'submitted';
    this.updateLeaderboardStatusText();
    this.enterRunbackStage(reason);
  }

  getSteamSubmitTimeoutMs() {
    const mockOverride = window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ === true
      ? Number(window.__NOVA_SWARM_STEAM_SUBMIT_TIMEOUT_MS__)
      : NaN;
    return Number.isFinite(mockOverride)
      ? Math.max(250, Math.min(GLOBAL_SUBMIT_TIMEOUT_MS, mockOverride))
      : GLOBAL_SUBMIT_TIMEOUT_MS;
  }

  async withSubmissionTimeout(promise, timeoutMs, message) {
    let timeoutId = null;
    try {
      const timeout = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      });
      return await Promise.race([promise, timeout]);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  }

  ensureHiddenInput() {
    if (this.hiddenInput) return this.hiddenInput;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = PILOT_NAME_MAX_LENGTH;
    input.autocapitalize = 'characters';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    input.style.zIndex = '-1';
    input.style.left = '-10000px';
    input.style.top = '-10000px';
    input.style.width = '1px';
    input.style.height = '1px';
    input.style.color = 'transparent';
    input.style.background = 'transparent';
    input.style.border = '0';
    input.style.outline = '0';
    this.boundHiddenInput = this.boundHiddenInput || this.handleHiddenInput.bind(this);
    this.boundHiddenKeyDown = this.boundHiddenKeyDown || this.handleHiddenKeyDown.bind(this);
    input.addEventListener('input', this.boundHiddenInput);
    input.addEventListener('keydown', this.boundHiddenKeyDown);
    document.body.appendChild(input);
    this.hiddenInput = input;
    return input;
  }

  handleHiddenKeyDown(event) {
    event.stopPropagation();
    this.setInputDevice('keyboard');
    const isSubmitKey = event.key === 'Enter' || event.key === 'Return' || event.code === 'NumpadEnter';
    if (isSubmitKey) {
      event.preventDefault();
      if (this.nameInput.length > 0) this.submitScore();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.skipScoreSubmission('hidden_input_escape');
    }
  }

  handleHiddenInput(event) {
    if (!event.target) return;
    this.setInputDevice('keyboard');
    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    this.nameInput = value.slice(0, PILOT_NAME_MAX_LENGTH);
    event.target.value = this.nameInput;
    this.caretVisible = true;
    this.updateNameDisplay();
    this.refreshPrimaryCta();
  }

  syncHiddenInput() {
    if (this.hiddenInput) {
      this.hiddenInput.value = this.nameInput;
    }
  }

  hideHiddenInput() {
    if (this.hiddenInput) {
      this.hiddenInput.blur();
    }
  }

  startCaretBlink() {
    this.stopCaretBlink();
    this.caretInterval = setInterval(() => {
      this.caretVisible = !this.caretVisible;
      this.updateNameDisplay();
    }, 500);
  }

  stopCaretBlink() {
    if (this.caretInterval) {
      clearInterval(this.caretInterval);
      this.caretInterval = null;
    }
    this.caretVisible = true;
  }

  updateNameDisplay() {
    if (!this.nameDisplay) return;
    if (this.state === 'input') {
      if (this.lastInputDevice === 'controller') {
        this.nameDisplay.text = this.formatControllerNameDisplay();
        this.nameDisplay.visible = true;
        this.refreshPrimaryCta();
        return;
      }
      const caret = this.caretVisible ? '|' : '';
      this.nameDisplay.text = `NAME: ${this.nameInput}${caret}`;
      this.nameDisplay.visible = true;
    } else if (this.state === 'submitting') {
      this.nameDisplay.text = 'SAVING...';
      this.nameDisplay.visible = true;
    } else {
      this.nameDisplay.visible = false;
    }
    this.refreshPrimaryCta();
  }

  validatePilotNameForSubmit() {
    const validation = getPilotNameValidation(this.nameInput);
    if (!validation.valid) {
      this.isSubmitting = false;
      this.state = 'input';
      const message = validation.reason === 'blocked'
        ? 'NAME NOT AVAILABLE - TRY ANOTHER'
        : 'ENTER A VALID PILOT NAME';
      if (this.inputOverlay && this.submitButton) {
        this.submitButton.textContent = message;
        this.submitButton.disabled = false;
      }
      this.updatePromptMessage(message);
      this.updateNameDisplay();
      this.refreshPrimaryCta();
      return null;
    }
    this.nameInput = validation.publicName;
    this.syncHiddenInput();
    if (this.inputField) this.inputField.value = this.nameInput;
    this.updateNameDisplay();
    return validation.publicName;
  }

  async submitScore() {
    if (this.state !== 'input' || this.nameInput.length === 0) {
      return;
    }
    if (!this.validatePilotNameForSubmit()) {
      return;
    }
    await this.submitScoreFinal();
  }

  async submitScoreFinal() {
    if (!this.isRankedRun) {
      this.submitBlockedReason = this.game.runModeReason || 'unranked_run';
      this.isSubmitting = false;
      this.state = 'unranked';
      this.game.pendingHighscore = null;
      console.log(`[GameOverScene] Blocked score submit for unranked run reason=${this.submitBlockedReason}`);
      if (this.promptText) {
        this.promptText.visible = true;
        this.promptText.text = this.getUnrankedScoreBlockedText();
      }
      this.refreshPrimaryCta();
      return;
    }

    if (!this.updateCanEnterName()) {
      console.log('[GameOverScene] Blocked submit because no local/global slot is available');
      this.updateQualificationPromptState();
      return;
    }

    if (this.isSubmitting) {
      console.log('[GameOverScene] Already submitting, ignoring duplicate call');
      return;
    }
    this.isSubmitting = true;
    this.state = 'submitting';
    this.stopCaretBlink();
    this.hideHiddenInput();
    this.refreshPrimaryCta();

    // Update UI to show submitting state
    if (this.inputOverlay) {
      if (this.submitButton) {
        this.submitButton.textContent = 'SAVING...';
        this.submitButton.disabled = true;
      }
    } else {
      this.updatePromptMessage('SAVING...');
      this.updateNameDisplay();
    }

    const name = this.validatePilotNameForSubmit();
    if (!name) {
      return;
    }
    if (this.lastInputDevice === 'controller') {
      this.storeControllerName(name);
    }
    const submittedLevel = this.getSubmittedLevelReached();
    const result = {
      name,
      score: this.finalScore,
      level: submittedLevel,
      levelReached: submittedLevel,
      rankIndex: this.game.rankIndex || 0,
      submissionId: this.submissionId,
      runMode: this.game?.runSummary?.runMode ?? this.game?.runMode ?? null,
      isDebugRun: this.game?.isDebugRun === true,
      eligibleForSubmission: this.game?.isScoreSubmissionAllowed?.() === true,
      eligibleForAchievements: this.game?.canUnlockAchievementsForCurrentRun?.() === true,
      localQualified: this.localQualified,
      globalQualified: this.globalQualified,
      localStatus: this.localQualified ? 'saving' : 'not_qualified',
      globalStatus: this.globalStatus,
      updatedAt: new Date().toISOString()
    };

    console.log('[GameOverScene] Saving score...', result);

    const runResult = this.leaderboardAdapter.createRunResult(this.game, {
      name,
      playerName: name,
      score: this.finalScore,
      level: submittedLevel,
      levelReached: submittedLevel,
      rankIndex: this.game.rankIndex || 0,
      submissionId: this.submissionId
    });

    if (this.localQualified) {
      const localSave = await this.leaderboardAdapter.submitScore(runResult, {
        target: 'local',
        saveLocal: true,
        name
      });
      result.localStatus = localSave.localStatus || 'saved';
      result.localPlacement = localSave.localPlacement;
      result.localEntry = localSave.localEntry;
      this.rememberLocalPlacement(localSave.localPlacement, 'saved');
      if (!this.globalQualified) {
        this.playLocalHighscoreVoice();
      }
    }

    this.leaderboardResult = result;
    this.game.lastLeaderboardResult = result;
    this.game.leaderboardView = this.localQualified ? 'local' : 'global';
    this.game.pendingHighscore = null;

    this.isSubmitting = false;
    this.removeInputOverlay();
    this.stopCaretBlink();
    this.hideHiddenInput();
    const initialReason = result.globalStatus === 'failed'
      ? 'global_failed'
      : result.globalStatus === 'submitted'
        ? 'score_submitted'
        : 'score_saved';
    this.enterRunbackStage(initialReason);

    const canUseCloud = Boolean(
      this.leaderboardRuntime?.cloud
      && this.leaderboardAdapter?.availability?.cloud !== false
    );
    if (canUseCloud && (this.globalQualified || this.globalStatus === 'checking')) {
      void this.startGlobalSubmissionWhenReady(name, result).finally(() => {
        const finalReason = result.globalStatus === 'failed'
          ? 'global_failed'
          : result.globalStatus === 'submitted'
            ? 'score_submitted'
            : 'score_saved';
        this.refreshVisibleRunbackAfterSubmission(finalReason);
      });
    }
  }

  async startGlobalSubmissionWhenReady(name, result) {
    let timeoutId = null;
    try {
      if (!this.leaderboardRuntime?.cloud || this.leaderboardAdapter?.availability?.cloud === false) {
        this.globalQualified = false;
        this.globalStatus = 'offline';
        result.globalQualified = false;
        result.globalStatus = 'offline';
        result.updatedAt = new Date().toISOString();
        this.game.lastLeaderboardResult = result;
        return;
      }
      if (this.globalStatus === 'checking' && this.globalQualificationPromise) {
        await this.globalQualificationPromise.catch(() => null);
      }

      if (!this.globalQualified) {
        result.globalQualified = false;
        result.globalStatus = this.globalStatus === 'offline' ? 'offline' : 'not_qualified';
        result.updatedAt = new Date().toISOString();
        this.game.lastLeaderboardResult = result;
        return;
      }

      this.globalStatus = 'submitting';
      result.globalStatus = 'submitting';
      result.globalQualified = true;
      result.updatedAt = new Date().toISOString();
      this.game.lastLeaderboardResult = result;
      this.updateLeaderboardStatusText();

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('Global submit timeout')), GLOBAL_SUBMIT_TIMEOUT_MS);
      });
      const submittedLevel = this.getSubmittedLevelReached();
      const runResult = this.leaderboardAdapter.createRunResult(this.game, {
        name,
        playerName: name,
        score: this.finalScore,
        level: submittedLevel,
        levelReached: submittedLevel,
        rankIndex: this.game.rankIndex,
        submissionId: this.submissionId
      });
      const response = await Promise.race([
        this.leaderboardAdapter.submitScore(runResult, {
          target: 'cloud',
          saveLocal: false,
          name
        }),
        timeoutPromise
      ]);
      if (timeoutId) window.clearTimeout(timeoutId);

      this.globalStatus = 'submitted';
      result.globalStatus = 'submitted';
      result.globalProvider = response?.globalProvider || response?.source || 'cloud';
      result.globalResponse = response || null;
      result.updatedAt = new Date().toISOString();
      const confirmedPlacement = await this.confirmGlobalLeaderboardAchievements(result);
      result.globalQualified = Boolean(confirmedPlacement?.qualified);
      result.globalPlacement = confirmedPlacement || null;
      result.globalPlacementTier = this.globalPlacementTier;
      result.globalRank = confirmedPlacement?.placement || null;
      this.game.lastLeaderboardResult = result;
      this.updateLeaderboardStatusText();
      console.log('[GameOverScene] Global submit success.');
    } catch (error) {
      if (timeoutId) window.clearTimeout(timeoutId);
      console.warn('[GameOverScene] Global submit failed:', error.message);
      this.globalStatus = 'failed';
      result.globalStatus = 'failed';
      result.globalError = error.message || 'unknown';
      result.updatedAt = new Date().toISOString();
      this.game.lastLeaderboardResult = result;
      this.updateLeaderboardStatusText();
    }
  }

  destroy() {
    this.steamSubmissionToken += 1;
    this.clearSceneTimeouts();
    if (this.promptText && this.promptPointer) {
      this.promptText.off('pointerdown', this.promptPointer);
      this.promptPointer = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.hiddenInput) {
      if (this.boundHiddenInput) {
        this.hiddenInput.removeEventListener('input', this.boundHiddenInput);
      }
      if (this.boundHiddenKeyDown) {
        this.hiddenInput.removeEventListener('keydown', this.boundHiddenKeyDown);
      }
      if (this.hiddenInput.parentNode) {
        this.hiddenInput.parentNode.removeChild(this.hiddenInput);
      }
      this.hiddenInput = null;
    }
    this.removeInputOverlay();
    this.stopCaretBlink();
    this.removeAchievementToast();
    this.removePersonalBestCarry({ clearGameCarry: true, relayout: false });
    this.achievementToastQueue = [];
    AudioManager.stopVoiceGroup('runback');
    destroyMenuFx(this);
    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = null;
  }
}
