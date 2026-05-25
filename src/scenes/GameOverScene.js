import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { getGameOverComment } from '../text/phrasePool.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { createTextLayout, createVerticalStack, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';
import { generateUUID } from '../utils/uuid.js';
import { createText } from '../utils/pixiText.js';
import { AssetManifest } from '../assets/assetManifest.js';
import {
  getSelectableShips,
  getShipUnlockProgress,
  getShipUnlockProgressDetails,
  isShipUnlocked
} from '../config/ShipMetadata.js';
import { GameAssets } from '../utils/GameAssets.js';
import { analyzeGlobalLeaderboardScore, normalizeGlobalScores } from '../shared/GlobalLeaderboardPlacement.js';
import {
  GAME_OVER_CTA_RECENT_HISTORY_KEY,
  GAME_OVER_CTA_RECENT_HISTORY_SIZE,
  gameOverCtaVoiceLines
} from '../config/GameOverCtaVoiceLines.js';
import { createLeaderboardAdapter } from '../leaderboard/LeaderboardAdapter.js';
import { LEADERBOARD_DISPLAY_LIMIT, getPilotNameValidation } from '../leaderboard/LeaderboardTypes.js';
import { GamepadNavigator, hasConnectedGamepad } from '../input/GamepadNavigator.js';
import {
  GLOBAL_LEADERBOARD_ACHIEVEMENT_ID,
  GLOBAL_NUMBER_ONE_ACHIEVEMENT_ID
} from '../achievements/AchievementCatalog.js';
import { translateText } from '../i18n/index.js';

const INPUT_PROMPT = 'ENTER PILOT NAME AND SUBMIT';
const GLOBAL_SUBMIT_TIMEOUT_MS = 9000;
const PILOT_NAME_MAX_LENGTH = 14;
const CONTROLLER_NAME_STORAGE_KEY = 'nova.controllerPilotName.v1';
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
    source: 'post_submit_global_read',
    scoresCount: scores.length
  };
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
    this.unlockText = null;
    this.newlyUnlockedShips = [];
    this.shipUnlockReveal = null;
    this.shipUnlockRevealGlow = null;
    this.shipUnlockRevealBg = null;
    this.shipUnlockRevealSprites = [];
    this.shipUnlockRevealCountText = null;
    this.shipUnlockVoicePlayed = false;
    this.nextGoal = null;
    this.nextGoalGroup = null;
    this.nextGoalBg = null;
    this.nextGoalText = null;
    this.comment = null;
    this.leaderboardStatusText = null;
    this.notQualifiedText = null;
    this.promptText = null;
    this.nameDisplay = null;
    this.instructions = null;
    this.retryButton = null;
    this.retryButtonBg = null;
    this.retryButtonGlow = null;
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
    this.runbackReason = null;
    this.selectedCtaLine = null;
    this.ctaVoicePlayed = false;
    this.runbackStartedAt = 0;
    // HTML overlay for mobile input
    this.inputOverlay = null;
    this.inputField = null;
    this.submitButton = null;
    this.boundVisibleInput = null;
    this.boundVisibleInputKeyDown = null;
    this.boundHiddenKeyDown = null;
    this.backdrop = null;
    this.backdropShade = null;
    this.backdropLoaded = false;
    this.ceremonyFrame = null;
    this.ceremonyGlow = null;
    this.fanfareParticles = [];
    this.ceremonyPulse = 0;
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
    this.canEnterName = false;
    this.globalQualificationPromise = null;
    this.leaderboardResult = null;
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

  async init() {
    this.clearSceneTimeouts();
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
    this.canEnterName = false;
    this.globalQualificationPromise = null;
    this.leaderboardResult = null;
    this.leaderboardAdapter = typeof this.game.getLeaderboardAdapter === 'function'
      ? this.game.getLeaderboardAdapter()
      : createLeaderboardAdapter();
    await this.leaderboardAdapter.refreshAvailability();
    this.leaderboardRuntime = this.leaderboardAdapter.getRuntimeSummary();
    this.steamSubmissionMode = Boolean(this.leaderboardAdapter.shouldUseSteamSubmission());
    this.steamPlayerName = this.steamSubmissionMode
      ? await this.leaderboardAdapter.getSteamPlayerName().catch(() => null)
      : null;
    this.isRankedRun = typeof this.game.isScoreSubmissionAllowed === 'function'
      ? this.game.isScoreSubmissionAllowed()
      : !this.game.isDebugRun;
    this.lastInputDevice = hasConnectedGamepad() ? 'controller' : 'keyboard';
    this.controllerNameCursor = 0;

    // FREEZE final score and level immediately
    this.finalScore = Number(this.game.score) || 0;
    this.finalLevel = Number(this.game.level) || 0;
    if (this.isRankedRun) {
      this.localQualified = this.steamSubmissionMode
        ? this.finalScore > 0
        : this.leaderboardAdapter.qualifiesLocal(this.finalScore);
      this.globalStatus = this.steamSubmissionMode ? 'steam_ready' : 'checking';
      this.updateCanEnterName();
    }
    const previousProgress = this.game.runProgressionResult?.previous || getShipUnlockProgress();
    this.isPersonalBest = this.finalScore > (Number(previousProgress.bestScore) || 0);
    this.qualificationFanfarePlayed = false;
    this.personalBestVoicePlayed = false;
    this.nearMissVoicePlayed = false;
    const currentProgress = this.game.runProgressionResult?.next || getShipUnlockProgress();
    this.game.rankIndex = currentProgress.pilotRank || this.game.rankIndex || 0;
    this.newlyUnlockedShips = this.getNewlyUnlockedShips(previousProgress, currentProgress);
    this.levelSummary = this.createLevelSummary(previousProgress, currentProgress);
    this.unlockSummary = this.createUnlockSummary(previousProgress, currentProgress, this.newlyUnlockedShips);
    this.nextGoal = this.createNextGoal(previousProgress, currentProgress);

    // Generate unique submissionId for this run (reused across retries)
    this.submissionId = generateUUID();
    console.log('[GameOver] Generated submissionId:', this.submissionId);

    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);
    this.createFallbackBackdrop(width, height);
    this.initBackdrop(width, height);
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
    this.scoreText = createText(`SCORE: ${this.finalScore}`, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: scoreSize,
      fill: '#ffff00'
    });
    this.scoreText.anchor.set(0.5);
    this.container.addChild(this.scoreText);

    const levelSize = getResponsiveFontSize(layout, 'subtitle');
    this.levelText = createText(this.levelSummary, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: levelSize,
      fill: '#ffffff',
      align: 'center',
      lineHeight: Math.round(levelSize * 1.12)
    });
    this.levelText.anchor.set(0.5);
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

    if (!this.isRankedRun) {
      this.promptText.eventMode = 'none';
      this.promptText.cursor = 'default';
      this.promptText.style.fill = '#ffb35c';
      this.promptText.text = 'PRACTICE RUN - SCORE NOT LOGGED';
      this.submitBlockedReason = this.game.runModeReason || 'unranked_run';
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

    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = addResponsiveListener(() => this.layoutScreen());
    this.layoutScreen();

    this.updateNameDisplay();
    this.setupKeyboard();

    AudioManager.playSfx('nova_game_over_drop');
    if (this.newlyUnlockedShips.length > 0) {
      AudioManager.playSfx('nova_highscore_chime', { force: true, volume: 0.72, minIntervalMs: 0 });
      this.scheduleSceneTimeout(() => this.playShipUnlockVoice(), 720);
    } else {
      AudioManager.playVoice('mission_control_game_over', { cooldownMs: 2400, duckMs: 2600 });
    }
    AudioManager.playMusicContext('gameover', { resetPlaylist: true });

    if (!this.isRankedRun) {
      console.log(`[GameOver] Unranked run blocked from leaderboard reason=${this.submitBlockedReason}`);
      this.enterRunbackStage('practice');
      return;
    }

    if (this.steamSubmissionMode) {
      this.state = 'submitting';
      this.globalStatus = 'submitting';
      this.updateLeaderboardStatusText();
      this.updatePromptMessage('STEAM SCORE SYNC');
      this.refreshPrimaryCta();
      this.layoutScreen();
      this.scheduleSceneTimeout(() => this.submitSteamScore(), 220);
      return;
    }

    this.updateLeaderboardStatusText();
    this.updateQualificationPromptState();
    if (this.localQualified) {
      this.scheduleSceneTimeout(() => {
        if (this.isSceneActive() && this.state === 'prompt' && this.updateCanEnterName()) {
          this.enterInputMode();
        }
      }, 180);
    }
    this.globalQualificationPromise = this.checkGlobalQualification();
  }

  updateCanEnterName() {
    this.canEnterName = Boolean(!this.steamSubmissionMode && this.isRankedRun && (this.localQualified || this.globalQualified));
    this.isQualified = this.canEnterName;
    return this.canEnterName;
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
      if (this.state === 'runback' || this.state === 'submitted' || this.state === 'skipped' || this.state === 'unranked') {
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
    if (this.state === 'runback' || this.state === 'submitted' || this.state === 'skipped' || this.state === 'unranked') {
      return 'ENTER / SPACE / CLICK: RELAUNCH  |  L / GAMEPAD Y: LEADERBOARD  |  ESC: MENU';
    }
    return 'LEADERBOARD FIRST: ENTER / CLICK  |  ESC: SKIP SCORE';
  }

  getEntryPromptText(layout = getCurrentLayout()) {
    const mobile = Boolean(layout?.isMobile);
    if (!this.isRankedRun) return 'PRACTICE RUN - SCORE NOT LOGGED';
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
    if (!this.isRankedRun) return 'LOCAL BOARD: PRACTICE RUN\nGLOBAL BOARD: PRACTICE RUN';
    if (this.steamSubmissionMode) {
      const pilot = this.steamPlayerName ? ` (${this.steamPlayerName})` : '';
      const steamLine = {
        steam_ready: `STEAM BOARD: READY${pilot}`,
        submitting: `STEAM BOARD: SUBMITTING${pilot}`,
        submitted: 'STEAM BOARD: SUBMITTED',
        failed: 'STEAM BOARD: FAILED - LOCAL SAVED'
      }[this.globalStatus] || `STEAM BOARD: ${String(this.globalStatus || 'READY').replace(/_/g, ' ').toUpperCase()}`;
      const localLine = this.finalScore > 0 ? 'LOCAL BOARD: BACKUP READY' : 'LOCAL BOARD: NO SCORE';
      return `${localLine}\n${steamLine}`;
    }
    const localLine = this.localQualified
      ? 'LOCAL BOARD: QUALIFIED'
      : `LOCAL BOARD: NEED ${Math.max(1, this.leaderboardAdapter.getLocalCutoff() + 1).toLocaleString('en-US')}`;
    let globalLine = {
      idle: 'GLOBAL BOARD: IDLE',
      checking: 'GLOBAL BOARD: CHECKING...',
      qualified: 'GLOBAL BOARD: QUALIFIED',
      missed: 'GLOBAL BOARD: NO SLOT',
      offline: 'GLOBAL BOARD: OFFLINE - LOCAL STILL WORKS',
      submitting: 'GLOBAL BOARD: SUBMITTING...',
      submitted: 'GLOBAL BOARD: SUBMITTED',
      failed: 'GLOBAL BOARD: FAILED - LOCAL SAVED',
      unranked: 'GLOBAL BOARD: PRACTICE RUN'
    }[this.globalStatus] || `GLOBAL BOARD: ${String(this.globalStatus || 'UNKNOWN').toUpperCase()}`;
    if (this.globalPlacement?.qualified && this.globalPlacement.placement) {
      globalLine = `GLOBAL BOARD: RANK #${this.globalPlacement.placement}`;
      if (this.globalPlacement.numberOne) globalLine += ' - NUMBER ONE';
      else if (this.globalPlacement.top3) globalLine += ' - TOP THREE';
    } else if (this.globalPlacement?.nearGlobal) {
      globalLine = `GLOBAL BOARD: CLOSE - NEED ${this.globalPlacement.scoreToGlobal.toLocaleString('en-US')}`;
    }
    return `${localLine}\n${globalLine}`;
  }

  updateLeaderboardStatusText() {
    if (!this.leaderboardStatusText) return;
    this.leaderboardStatusText.text = this.getLeaderboardStatusMessage();
    if (this.globalQualified) {
      this.leaderboardStatusText.style.fill = '#ffe86a';
    } else if (this.globalPlacement?.nearGlobal || this.globalPlacement?.nearTop3 || this.globalPlacement?.nearNumberOne) {
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
    if (this.game?.runSummary?.runCleared) return 'RUN CLEAR';
    if (this.globalPlacementTier === 'number1') return 'NUMBER ONE';
    if (this.globalPlacementTier === 'top3') return 'TOP THREE';
    if (this.globalPlacementTier === 'global') return 'GLOBAL SLOT SECURED';
    if (this.globalPlacementTier === 'near_global') return 'GLOBAL BOARD IN SIGHT';
    if (this.localQualified) return 'LOCAL LEGEND';
    if (this.isPersonalBest) return 'PERSONAL BEST';
    return 'RUN COMPLETE';
  }

  getCeremonyComment() {
    const placement = this.globalPlacement;
    if (placement?.numberOne) {
      return 'The global board has a new name at the top. Let the cabinet remember it loudly.';
    }
    if (placement?.top3) {
      return `Global rank #${placement.placement}. That is the kind of run people pretend was easy.`;
    }
    if (placement?.qualified) {
      return `Global rank #${placement.placement}. Your score now travels farther than the swarm wanted.`;
    }
    if (placement?.nearGlobal) {
      return `Only ${placement.scoreToGlobal.toLocaleString('en-US')} more points for a global slot. This was not a miss, it was a warning shot.`;
    }
    if (this.localQualified) {
      return 'Local board claimed. The machine has been informed who owns this corner of space.';
    }
    if (this.isPersonalBest) {
      return 'Personal best archived. The next run starts with evidence.';
    }
    return getGameOverComment(this.finalScore, this.finalLevel);
  }

  updateCeremonyPresentation() {
    if (this.state === 'runback') return;
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
    if (placement.nearNumberOne && placement.scoreToNumberOne > 0) {
      this.nextGoal = { text: `NUMBER ONE: ${this.formatGoalNumber(placement.scoreToNumberOne)} MORE`, tone: 'leaderboard' };
    } else if (placement.nearTop3 && placement.scoreToTop3 > 0) {
      this.nextGoal = { text: `TOP THREE: ${this.formatGoalNumber(placement.scoreToTop3)} MORE`, tone: 'leaderboard' };
    } else if (placement.nearGlobal && placement.scoreToGlobal > 0) {
      this.nextGoal = { text: `GLOBAL SLOT: ${this.formatGoalNumber(placement.scoreToGlobal)} MORE`, tone: 'leaderboard' };
    } else if (placement.qualified && placement.placement && placement.placement > 1) {
      this.nextGoal = { text: 'NEXT GOAL: CLIMB ONE GLOBAL RANK', tone: 'leaderboard' };
    }
    if (this.nextGoalText) this.nextGoalText.text = this.nextGoal?.text || '';
  }

  updateQualificationPromptState() {
    if (this.state === 'runback') return;
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
      const scores = await this.leaderboardAdapter.getGlobalScoresForPlacement({ useCache: false });
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
        if (this.state === 'prompt' && this.updateCanEnterName()) {
          this.scheduleSceneTimeout(() => {
            if (this.isSceneActive() && this.state === 'prompt') this.enterInputMode();
          }, 120);
        }
      }
    }
  }

  layoutScreen() {
    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);
    const safeMargin = responsiveLayout.safeArea;

    // Update font sizes
    const titleSize = getResponsiveFontSize(layout, 'title');
    const scoreSize = getResponsiveFontSize(layout, 'score');
    const levelSize = getResponsiveFontSize(layout, 'subtitle');
    const unlockSize = layout.isMobile ? 15 : 18;
    const bodySize = getResponsiveFontSize(layout, 'body');
    const leaderboardStatusSize = layout.isMobile ? 13 : 16;
    const promptSize = layout.isMobile ? 18 : 20;
    const nameSize = layout.isMobile ? 22 : 26;
    const smallSize = getResponsiveFontSize(layout, 'small');

    this.title.style.fontSize = titleSize;
    const titleStroke = this.globalQualified ? '#4c2400' : '#042033';
    this.title.style.stroke = { color: titleStroke, width: layout.isMobile ? 2 : 3 };
    this.title.style.wordWrap = true;
    this.title.style.wordWrapWidth = clampTextWidth(width * 0.88, layout);
    this.title.style.lineHeight = Math.round(titleSize * 1.08);
    this.scoreText.style.fontSize = scoreSize;
    this.levelText.style.fontSize = levelSize;
    this.levelText.style.align = 'center';
    this.levelText.style.lineHeight = Math.round(levelSize * 1.12);
    this.unlockText.style.fontSize = unlockSize;
    this.unlockText.style.wordWrap = true;
    this.unlockText.style.wordWrapWidth = clampTextWidth(width * 0.9, layout);
    this.unlockText.style.lineHeight = Math.round(unlockSize * 1.25);
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
    this.drawRetryButton(layout);
    this.drawLeaderboardButton(layout);
    this.drawNextGoalStrip(layout);
    this.drawShipUnlockReveal(layout);

    // Calculate content height for centering
    const spacing = layout.isMobile ? 8 : 14;
    const sectionGap = layout.isMobile ? 16 : 24;

    // Estimate heights
    const titleHeight = titleSize * 1.2;
    const scoreHeight = scoreSize * 1.2;
    const levelHeight = levelSize * 1.2;
    const unlockRevealVisible = Boolean(this.shipUnlockReveal?.visible);
    const unlockRevealHeight = unlockRevealVisible ? (layout.isMobile ? 48 : 62) : 0;
    const unlockHeight = unlockSize * 2.3 + unlockRevealHeight;
    const nextGoalHeight = this.nextGoalGroup?.visible ? Math.max(this.nextGoalGroup.height || 0, layout.isMobile ? 32 : 38) : 0;
    const commentHeight = bodySize * 2 * 1.4; // ~2 lines
    const leaderboardStatusHeight = leaderboardStatusSize * 2.5;
    const promptHeight = promptSize * 1.2;
    const nameHeight = nameSize * 1.2;
    const retryHeight = this.retryButtonHeight || (layout.isMobile ? 58 : 66);
    const leaderboardVisible = this.shouldShowLeaderboardButton();
    const leaderboardHeight = leaderboardVisible ? (this.leaderboardButtonHeight || (layout.isMobile ? 42 : 48)) : 0;

    const totalHeight = titleHeight + scoreHeight + levelHeight + unlockHeight + nextGoalHeight + commentHeight + leaderboardStatusHeight + promptHeight + retryHeight + leaderboardHeight + nameHeight + spacing * (leaderboardVisible ? 10 : 9) + sectionGap * 2;

    // Calculate starting Y for vertical centering with safe margin
    const footerSpace = layout.isMobile ? 40 : 50;
    const availableHeight = height - footerSpace - safeMargin.top;
    const startY = Math.max(safeMargin.top, safeMargin.top + (availableHeight - totalHeight) / 2 * (layout.isMobile ? 0.5 : 0.7));

    const stack = createVerticalStack(layout, { startY, spacing });

    this.title.x = width / 2;
    const titleMaxWidth = clampTextWidth(width * 0.9, layout);
    if (this.title.width > titleMaxWidth) {
      const minTitleSize = layout.isMobile ? 22 : 30;
      const fittedSize = Math.max(minTitleSize, Math.floor(titleSize * (titleMaxWidth / this.title.width)));
      this.title.style.fontSize = fittedSize;
      this.title.style.lineHeight = Math.round(fittedSize * 1.08);
    }
    this.title.y = stack.placeElement(this.title, spacing);

    this.scoreText.x = width / 2;
    this.scoreText.y = stack.placeElement(this.scoreText, spacing * 0.5);

    this.levelText.x = width / 2;
    this.levelText.y = stack.placeElement(this.levelText, sectionGap);

    this.unlockText.x = width / 2;
    this.unlockText.y = stack.placeText(this.unlockText, spacing);

    if (unlockRevealVisible) {
      this.shipUnlockReveal.x = width / 2;
      this.shipUnlockReveal.y = stack.placeElement(this.shipUnlockReveal, spacing * 0.5);
    }

    if (this.nextGoalGroup?.visible) {
      this.nextGoalGroup.x = width / 2;
      this.nextGoalGroup.y = stack.placeElement(this.nextGoalGroup, spacing);
    }

    this.comment.x = width / 2;
    this.comment.y = stack.placeText(this.comment, spacing);

    this.leaderboardStatusText.x = width / 2;
    this.leaderboardStatusText.y = stack.placeText(this.leaderboardStatusText, spacing * 0.8);

    this.promptText.x = width / 2;
    this.promptText.y = stack.placeElement(this.promptText, spacing);

    this.notQualifiedText.x = width / 2;
    this.notQualifiedText.y = this.promptText.y;

    stack.addGap(this.state === 'runback' ? (layout.isMobile ? 22 : 36) : (layout.isMobile ? 8 : 18));
    this.retryButton.x = width / 2;
    this.retryButton.y = stack.placeElement(this.retryButton, spacing);

    if (this.leaderboardButton) {
      this.leaderboardButton.visible = leaderboardVisible;
      this.leaderboardButton.x = width / 2;
      this.leaderboardButton.y = leaderboardVisible ? stack.placeElement(this.leaderboardButton, spacing * 0.8) : this.retryButton.y;
    }

    this.nameDisplay.x = width / 2;
    this.nameDisplay.y = stack.getCurrentY();

    this.instructions.x = width / 2;
    this.instructions.y = height - safeMargin.bottom - (layout.isMobile ? 32 : 40);
  }

  createRetryButton(layout) {
    this.retryButton = new PIXI.Container();
    this.retryButton.zIndex = 8;
    this.retryButton.eventMode = 'static';
    this.retryButton.cursor = 'pointer';

    this.retryButtonGlow = new PIXI.Graphics();
    this.retryButtonBg = new PIXI.Graphics();

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

    this.retryButton.addChild(this.retryButtonGlow, this.retryButtonBg, this.retryButtonLabel, this.retryButtonHint);
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
    this.retryButtonMode = config.mode;
    const buttonWidth = config.runback
      ? Math.min(layout.width * (layout.isMobile ? 0.9 : 0.58), layout.isMobile ? 360 : 560)
      : Math.min(layout.width * (layout.isMobile ? 0.82 : 0.4), layout.isMobile ? 320 : 390);
    const buttonHeight = config.runback
      ? (layout.isMobile ? 76 : 94)
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
    const pulse = config.runback ? (0.5 + Math.sin(Date.now() * 0.006) * 0.5) : 0;

    this.retryButtonGlow.clear();
    this.retryButtonGlow.roundRect(-halfWidth - 12, -halfHeight - 8, buttonWidth + 24, buttonHeight + 16, radius + 4);
    this.retryButtonGlow.fill({ color: glowColor, alpha: config.disabled ? 0.08 : config.runback ? 0.28 + pulse * 0.16 : 0.18 });
    this.retryButtonGlow.roundRect(-halfWidth - 5, -halfHeight - 4, buttonWidth + 10, buttonHeight + 8, radius + 2);
    this.retryButtonGlow.stroke({ color: 0x00ffff, width: config.runback ? 4 : 2, alpha: config.disabled ? 0.2 : config.runback ? 0.52 + pulse * 0.22 : 0.42 });

    this.retryButtonBg.clear();
    this.retryButtonBg.roundRect(-halfWidth, -halfHeight, buttonWidth, buttonHeight, radius);
    this.retryButtonBg.fill({ color: 0x091523, alpha: 0.94 });
    this.retryButtonBg.roundRect(-halfWidth, -halfHeight, buttonWidth, buttonHeight, radius);
    this.retryButtonBg.stroke({ color: frameColor, width: 3, alpha: config.disabled ? 0.55 : 0.96 });
    this.retryButtonBg.rect(-halfWidth + 16, -halfHeight + 7, buttonWidth - 32, 3);
    this.retryButtonBg.fill({ color: 0x00ffff, alpha: config.disabled ? 0.22 : 0.5 });
    this.retryButtonBg.rect(-halfWidth + 16, halfHeight - 10, buttonWidth - 32, 2);
    this.retryButtonBg.fill({ color: frameColor, alpha: config.disabled ? 0.2 : 0.46 });

    if (this.retryButtonLabel) {
      this.retryButtonLabel.text = config.label;
      this.retryButtonLabel.style.fontSize = config.runback ? (layout.isMobile ? 30 : 44) : (layout.isMobile ? 24 : 30);
      this.retryButtonLabel.style.fill = config.mode === 'restart' ? '#fff3a2' : '#d9fdff';
      this.retryButtonLabel.style.dropShadowColor = config.mode === 'restart' ? '#ffc94a' : '#00ffff';
      this.retryButtonLabel.y = config.runback ? (layout.isMobile ? -12 : -16) : (layout.isMobile ? -9 : -10);
    }
    if (this.retryButtonHint) {
      this.retryButtonHint.text = config.hint;
      this.retryButtonHint.style.fontSize = config.runback ? (layout.isMobile ? 12 : 15) : (layout.isMobile ? 11 : 13);
      this.retryButtonHint.y = config.runback ? (layout.isMobile ? 20 : 24) : (layout.isMobile ? 15 : 17);
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
    return this.state === 'runback' || this.state === 'submitted' || this.state === 'skipped' || this.state === 'unranked';
  }

  drawLeaderboardButton(layout) {
    if (!this.leaderboardButton || !this.leaderboardButtonBg || !this.leaderboardButtonGlow) return;
    const visible = this.shouldShowLeaderboardButton();
    const buttonWidth = Math.min(layout.width * (layout.isMobile ? 0.72 : 0.34), layout.isMobile ? 280 : 340);
    const buttonHeight = layout.isMobile ? 48 : 54;
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
    const text = String(this.nextGoal?.text || '').trim();
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
    this.shipUnlockReveal.addChild(this.shipUnlockRevealGlow, this.shipUnlockRevealBg);

    this.shipUnlockRevealSprites = [];
    this.newlyUnlockedShips.slice(0, 4).forEach((ship) => {
      const shipPath = GameAssets.getRankShipPath(ship.textureIndex)
        || AssetManifest.sprites.playerRankShips?.[ship.textureIndex]
        || null;
      const texture = GameAssets.getRankShipTexture(ship.textureIndex)
        || PIXI.Texture.EMPTY;
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.alpha = 0.98;
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
    const count = this.newlyUnlockedShips.length;
    this.shipUnlockReveal.visible = count > 0;
    if (count <= 0) {
      this.shipUnlockRevealBg.clear();
      this.shipUnlockRevealGlow.clear();
      return;
    }

    const width = Math.min(layout.width * (layout.isMobile ? 0.78 : 0.48), layout.isMobile ? 330 : 460);
    const height = layout.isMobile ? 44 : 56;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const pulse = 0.5 + Math.sin(Date.now() * 0.006) * 0.5;

    this.shipUnlockRevealGlow.clear();
    this.shipUnlockRevealGlow.roundRect(-halfWidth - 10, -halfHeight - 6, width + 20, height + 12, layout.isMobile ? 12 : 14);
    this.shipUnlockRevealGlow.fill({ color: 0xffd75f, alpha: 0.12 + pulse * 0.12 });
    this.shipUnlockRevealGlow.roundRect(-halfWidth - 4, -halfHeight - 3, width + 8, height + 6, layout.isMobile ? 10 : 12);
    this.shipUnlockRevealGlow.stroke({ color: 0x37f5ff, width: 2, alpha: 0.5 + pulse * 0.22 });

    this.shipUnlockRevealBg.clear();
    this.shipUnlockRevealBg.roundRect(-halfWidth, -halfHeight, width, height, layout.isMobile ? 8 : 10);
    this.shipUnlockRevealBg.fill({ color: 0x06101c, alpha: 0.86 });
    this.shipUnlockRevealBg.stroke({ color: 0xffd75f, width: 2, alpha: 0.9 });
    this.shipUnlockRevealBg.rect(-halfWidth + 16, -halfHeight + 7, width - 32, 2);
    this.shipUnlockRevealBg.fill({ color: 0x37f5ff, alpha: 0.38 });

    const spriteSize = layout.isMobile ? 32 : 42;
    const gap = layout.isMobile ? 42 : 54;
    const sprites = this.shipUnlockRevealSprites || [];
    const totalSpriteWidth = Math.max(0, (sprites.length - 1) * gap);
    const startX = -totalSpriteWidth / 2;
    sprites.forEach((sprite, index) => {
      const textureWidth = Math.max(1, sprite.texture.width || sprite.width || spriteSize);
      const textureHeight = Math.max(1, sprite.texture.height || sprite.height || spriteSize);
      const scale = Math.min(spriteSize / textureWidth, spriteSize / textureHeight);
      sprite.scale.set(scale);
      sprite.x = startX + index * gap;
      sprite.y = 1 + Math.sin(Date.now() * 0.004 + index) * 2;
      sprite.rotation = Math.sin(Date.now() * 0.003 + index) * 0.035;
    });

    const remaining = Math.max(0, count - sprites.length);
    if (this.shipUnlockRevealCountText) {
      this.shipUnlockRevealCountText.visible = remaining > 0;
      this.shipUnlockRevealCountText.text = remaining > 0 ? `+${remaining}` : '';
      this.shipUnlockRevealCountText.style.fontSize = layout.isMobile ? 15 : 18;
      this.shipUnlockRevealCountText.x = startX + sprites.length * gap + (layout.isMobile ? 8 : 10);
      this.shipUnlockRevealCountText.y = 0;
    }
  }

  getPrimaryCtaConfig() {
    if (this.state === 'runback' || this.state === 'submitted' || this.state === 'skipped' || this.state === 'unranked') {
      return {
        mode: 'restart',
        label: 'ONE MORE RUN',
        hint: this.lastInputDevice === 'controller' ? 'A: SAME SHIP  |  Y: LEADERBOARD' : 'ENTER / SPACE / CLICK - SAME SHIP',
        disabled: false,
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

    if (config.mode === 'restart') {
      this.restartRun();
    }
  }

  refreshPrimaryCta() {
    if (!this.game?.app?.screen || !this.retryButton) return;
    const { width, height } = this.game.app.screen;
    const layout = createTextLayout(width, height, getCurrentLayout());
    this.drawRetryButton(layout);
    this.drawLeaderboardButton(layout);
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

    this.ceremonyFrame = new PIXI.Graphics();
    this.ceremonyFrame.zIndex = -6;
    this.container.addChild(this.ceremonyFrame);

    this.fanfareParticles = Array.from({ length: 56 }, (_, index) => {
      const particle = new PIXI.Graphics();
      particle.zIndex = -4;
      particle.eventMode = 'none';
      particle.alpha = 0.25 + (index % 7) * 0.08;
      particle.__fanfare = {
        seed: index * 37.7,
        lane: index % 2 === 0 ? -1 : 1,
        speed: 0.45 + (index % 9) * 0.035
      };
      this.container.addChild(particle);
      return particle;
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
    const panelWidth = Math.min(width * (layout.isMobile ? 0.92 : 0.58), layout.isMobile ? 560 : 760);
    const panelHeight = Math.min(height * (layout.isMobile ? 0.68 : 0.58), layout.isMobile ? 520 : 560);
    const x = (width - panelWidth) / 2;
    const y = Math.max(layout.safeArea?.top || 0, (height - panelHeight) * (layout.isMobile ? 0.42 : 0.46));
    const accent = this.globalPlacement?.numberOne
      ? 0xffe86a
      : this.globalPlacement?.top3
        ? 0xffb84a
        : this.globalQualified
          ? 0x00ffff
          : this.globalPlacement?.nearGlobal
            ? 0xff9b42
            : 0x23d8ff;

    if (this.ceremonyGlow) {
      this.ceremonyGlow.clear();
      this.ceremonyGlow.ellipse(width / 2, y + panelHeight * 0.5, panelWidth * 0.72, panelHeight * 0.56);
      this.ceremonyGlow.fill({ color: accent, alpha: this.globalQualified ? 0.14 : 0.08 });
    }

    if (this.ceremonyFrame) {
      this.ceremonyFrame.clear();
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

      if (this.state === 'submitting' && !isRestartKey && !isEscape) {
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
        this.restartRun();
        return;
      }

      if (this.state === 'prompt') {
        if (isSubmitKey) {
          e.preventDefault();
          if (this.isRankedRun && this.updateCanEnterName()) {
            this.enterInputMode();
          } else if (!this.isRankedRun || this.globalStatus !== 'checking') {
            this.enterRunbackStage('no_slot');
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

  update() {
    this.updateCeremonyEffects();
    if (this.shipUnlockReveal?.visible) {
      this.drawShipUnlockReveal(createTextLayout(this.game.app.screen.width, this.game.app.screen.height, getCurrentLayout()));
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
    if (this.state === 'submitting') return;
    if (this.state === 'input') {
      this.handleGamepadNameInput(nav);
      return;
    }

    if (nav.pressed.y && this.shouldShowLeaderboardButton()) {
      this.openLeaderboard();
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
      this.enterRunbackStage(this.globalStatus === 'offline' ? 'offline_no_slot' : 'no_slot');
      return;
    }

    this.restartRun();
  }

  updateCeremonyEffects() {
    if (!this.fanfareParticles?.length) return;
    const { width, height } = this.game.app.screen;
    this.ceremonyPulse += 1;
    const activeBoost = this.globalQualified ? 1 : 0.45;
    const color = this.globalPlacement?.numberOne
      ? 0xfff08a
      : this.globalPlacement?.top3
        ? 0xffba57
        : this.globalQualified
          ? 0x65f7ff
          : 0x7ca6ff;
    for (const particle of this.fanfareParticles) {
      const config = particle.__fanfare || { seed: 0, lane: 1, speed: 0.5 };
      const drift = ((this.ceremonyPulse * config.speed + config.seed) % 220) / 220;
      const sideBase = config.lane < 0 ? width * 0.12 : width * 0.88;
      const x = sideBase + Math.sin((this.ceremonyPulse + config.seed) * 0.025) * width * 0.08;
      const y = height * (0.1 + drift * 0.78);
      const size = (2 + (config.seed % 5)) * activeBoost;
      particle.clear();
      particle.rect(-size * 0.5, -size * 0.5, size * 2.6, size);
      particle.fill({ color, alpha: (this.globalQualified ? 0.76 : 0.28) * (1 - drift * 0.55) });
      particle.position.set(x, y);
      particle.rotation += 0.035 + config.speed * 0.01;
    }
    if (this.state === 'runback') {
      this.refreshPrimaryCta();
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

  createUnlockSummary(previousProgress, currentProgress, newlyUnlocked = this.getNewlyUnlockedShips(previousProgress, currentProgress)) {
    const ships = getSelectableShips();
    const summary = this.game?.runSummary || {};
    if (newlyUnlocked.length > 0) {
      const names = newlyUnlocked.slice(0, 2).map(ship => ship.name).join(' + ');
      const suffix = newlyUnlocked.length > 2 ? ` +${newlyUnlocked.length - 2} MORE` : '';
      const verb = newlyUnlocked.length === 1 ? 'SHIP' : 'SHIPS';
      const cta = newlyUnlocked.length === 1 ? 'VISIT THE HANGAR TO TRY IT' : 'VISIT THE HANGAR TO TRY THEM';
      return `NEW ${verb} UNLOCKED: ${names}${suffix}\n${cta}\nPILOT XP +${summary.pilotXpGained || 0}  RANK ${currentProgress.pilotRank || 0}`;
    }

    const nextShip = ships
      .filter(ship =>
        !isShipUnlocked(ship.spriteKey, currentProgress)
      )
      .sort((a, b) => {
        const aLevel = Number(a.unlock?.level) || 1;
        const bLevel = Number(b.unlock?.level) || 1;
        return aLevel - bLevel;
      })[0];

    if (!nextShip) {
      const bestLevel = Math.max(1, Math.floor(Number(currentProgress.bestLevel) || 1));
      return `HANGAR COMPLETE: ALL SHIPS UNLOCKED\nCAREER BEST: SECTOR ${bestLevel}`;
    }

    const details = getShipUnlockProgressDetails(nextShip.spriteKey, currentProgress);
    const requirementLine = details.requirements?.length
      ? details.requirements
        .slice(0, 2)
        .map(item => `${item.key.toUpperCase()} ${Math.min(Number(item.current) || 0, Number(item.target) || 0)}/${item.target}`)
        .join('  ')
      : details.label;
    return `NEXT SHIP: ${nextShip.name}\n${details.label.toUpperCase()}\n${requirementLine}`;
  }

  playShipUnlockVoice() {
    if (this.shipUnlockVoicePlayed || this.newlyUnlockedShips.length <= 0) return false;
    this.shipUnlockVoicePlayed = true;
    const voiceKey = this.newlyUnlockedShips.length === 1
      ? 'mission_control_ship_unlocked'
      : 'mission_control_ships_unlocked';
    return AudioManager.playVoice(voiceKey, {
      force: true,
      stopOtherVoices: true,
      exclusiveGroup: 'announcer',
      cooldownMs: 8000,
      eventCooldownMs: 0,
      duckMs: 3200,
      duckFactor: 0.34,
      volume: 0.98
    });
  }

  getShipUnlockRevealDebugState() {
    const ships = this.newlyUnlockedShips || [];
    return {
      count: ships.length,
      names: ships.map(ship => ship.name),
      spriteKeys: ships.map(ship => ship.spriteKey),
      visible: Boolean(this.shipUnlockReveal?.visible),
      voiceKey: ships.length === 1
        ? 'mission_control_ship_unlocked'
        : ships.length > 1
          ? 'mission_control_ships_unlocked'
          : null,
      voicePlayed: Boolean(this.shipUnlockVoicePlayed)
    };
  }

  createNextGoal(previousProgress = {}, currentProgress = {}) {
    if (!this.isRankedRun) {
      return { text: 'NEXT GOAL: RUN RANKED FOR THE BOARDS', tone: 'practice' };
    }

    const previousBestScore = Math.max(0, Number(previousProgress.bestScore) || 0);
    const scoreGap = previousBestScore - this.finalScore;
    if (previousBestScore > 0 && scoreGap > 0 && scoreGap <= Math.max(1000, previousBestScore * 0.18)) {
      return { text: `BEAT YOUR BEST: ${this.formatGoalNumber(scoreGap)} MORE`, tone: 'score' };
    }

    const bestSector = Math.max(1, Number(currentProgress.bestSector || currentProgress.bestLevel) || this.finalLevel || 1);
    const nextSector = this.getNextLevelGoal(bestSector);
    if (nextSector > bestSector) {
      return { text: `NEXT CAREER GOAL: REACH SECTOR ${nextSector}`, tone: 'level' };
    }

    return { text: 'NEXT GOAL: CLIMB THE GLOBAL BOARD', tone: 'leaderboard' };
  }

  createLevelSummary(previousProgress = {}, currentProgress = {}) {
    const summary = this.game?.runSummary || {};
    const previousBestLevel = Math.max(1, Math.floor(Number(previousProgress.bestSector || previousProgress.bestLevel) || 1));
    const bestLevel = Math.max(1, Math.floor(Number(currentProgress.bestSector || currentProgress.bestLevel) || this.finalLevel || 1));
    const newBest = bestLevel > previousBestLevel && this.finalLevel >= bestLevel;
    const suffix = newBest ? ' - NEW BEST' : '';
    const clearLabel = summary.runCleared ? 'CLEAR' : 'GAME OVER';
    return `${clearLabel}: SECTOR ${this.finalLevel}  ${Math.floor(summary.runElapsedSeconds || 0)}s\nCAREER BEST: SECTOR ${bestLevel}${suffix}\nPILOT XP +${summary.pilotXpGained || 0}  RANK ${summary.pilotRank ?? currentProgress.pilotRank ?? 0}`;
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

    if (!this.isRankedRun) {
      this.submitBlockedReason = this.game.runModeReason || 'unranked_run';
      console.log(`[GameOver] Blocking score input for unranked run reason=${this.submitBlockedReason}`);
      if (this.promptText) {
        this.promptText.visible = true;
        this.promptText.text = 'PRACTICE RUN - SCORE NOT LOGGED';
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
        this.enterRunbackStage(this.globalStatus === 'offline' ? 'offline_no_slot' : 'no_slot');
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
    this.game.startGame(this.game.selectedShipSpriteKey);
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
        : 'nova_global_slot_fanfare';
    const fanfareMs = placement?.numberOne ? 10000 : placement?.top3 ? 8000 : 6000;
    AudioManager.duckMusic(placement?.numberOne ? 0.18 : placement?.top3 ? 0.22 : 0.28, fanfareMs);
    AudioManager.playSfx(fanfareKey, { force: true, volume: placement?.numberOne ? 1.0 : placement?.top3 ? 0.94 : 0.88, minIntervalMs: 0 });
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
        duckMs: placement?.numberOne ? 4300 : placement?.top3 ? 3800 : 3400,
        duckFactor: placement?.numberOne ? 0.24 : placement?.top3 ? 0.28 : 0.32,
        volume: placement?.numberOne ? 1.06 : placement?.top3 ? 1.02 : 0.96
      });
    }, placement?.numberOne ? 2600 : placement?.top3 ? 2200 : 1700);
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
    if (!achievement?.name) return;
    if (this.achievementToast) {
      const id = achievement.id || toast?.id || achievement.name;
      const duplicateQueued = this.achievementToastQueue.some((queued) => {
        const queuedAchievement = queued?.achievement || queued;
        return (queuedAchievement?.id || queued?.id || queuedAchievement?.name) === id;
      });
      if (!duplicateQueued) this.achievementToastQueue.push(toast);
      return;
    }

    const { width, height } = this.game.app.screen;
    const compact = width < 720;
    const bannerWidth = Math.min(width * 0.86, compact ? 430 : 520);
    const bannerHeight = compact ? 70 : 78;
    const banner = new PIXI.Container();
    banner.zIndex = 60;
    banner.x = width / 2;
    banner.y = Math.max(52, height * 0.09);
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
      fontSize: compact ? 14 : 16,
      fontWeight: 'bold',
      fill: '#fff3a2',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center'
    });
    title.anchor.set(0.5);
    title.y = compact ? -14 : -17;
    banner.addChild(title);

    const name = createText(achievement.name, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 18 : 22,
      fontWeight: 'bold',
      fill: '#9cfbff',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: bannerWidth - 44
    });
    name.anchor.set(0.5);
    name.y = compact ? 13 : 15;
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
    if (placement.numberOne) {
      this.game.unlockAchievement?.(GLOBAL_NUMBER_ONE_ACHIEVEMENT_ID, payload);
    }
  }

  async confirmGlobalLeaderboardAchievements(result) {
    if (!this.isRankedRun || this.game?.runMode === 'unranked' || this.game?.isDebugRun) return null;
    if (result?.globalStatus !== 'submitted') return null;

    const provider = result.globalProvider || (this.steamSubmissionMode ? 'steam' : null);
    if (provider === 'steam') {
      const steamRank = Number(result.steamRank ?? result.rank ?? result.globalRank);
      const placement = {
        score: this.finalScore,
        placement: Number.isFinite(steamRank) && steamRank > 0 ? Math.floor(steamRank) : null,
        qualified: true,
        numberOne: Number.isFinite(steamRank) && Math.floor(steamRank) === 1,
        source: 'steam_submit_result'
      };
      result.confirmedGlobalPlacement = placement;
      this.unlockConfirmedLeaderboardAchievements(placement, provider);
      return placement;
    }

    if (provider !== 'cloud') return null;

    try {
      const entries = await this.leaderboardAdapter.getGlobalScoresForPlacement({ useCache: false });
      const placement = getConfirmedGlobalPlacement(this.finalScore, entries);
      result.confirmedGlobalPlacement = placement;
      result.achievementConfirmationStatus = placement.qualified ? 'confirmed' : 'not_qualified_after_submit';
      this.unlockConfirmedLeaderboardAchievements(placement, provider);
      return placement;
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
    const map = {
      score_submitted: 'SCORE SUBMITTED',
      score_saved: 'SCORE SAVED',
      global_failed: 'LOCAL SCORE SAVED\nGLOBAL SUBMIT FAILED - RUN IT BACK',
      score_skipped: 'SCORE SUBMISSION SKIPPED',
      no_slot: 'NO BOARD SLOT THIS TIME',
      offline_no_slot: 'GLOBAL BOARD OFFLINE\nNO LOCAL SLOT THIS TIME',
      practice: 'PRACTICE RUN - SCORE NOT LOGGED'
    };
    return map[reason] || 'RUN COMPLETE';
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
    this.ctaVoicePlayed = false;
    this.selectedCtaLine = this.selectRunbackCtaLine();

    if (this.title) {
      this.title.text = 'ONE MORE RUN?';
      this.title.style.fill = '#fff3a2';
      this.title.style.dropShadowColor = '#ffc94a';
    }
    if (this.leaderboardStatusText) {
      this.leaderboardStatusText.text = this.getRunbackStatusText(reason);
      this.leaderboardStatusText.style.fill = reason === 'global_failed' ? '#ffb35c' : '#ffe86a';
    }
    if (this.comment) {
      this.comment.text = `Score ${Number(this.finalScore || 0).toLocaleString('en-US')} | Level ${this.finalLevel || 0}`;
      this.comment.style.fill = '#d8e6ff';
    }
    if (this.promptText) {
      this.promptText.visible = true;
      this.promptText.eventMode = 'none';
      this.promptText.cursor = 'default';
      this.promptText.text = this.selectedCtaLine?.text || 'One more run.';
      this.promptText.style.fill = '#fff3a2';
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

    AudioManager.playSfx('swarm_chatter_stinger', { force: true, volume: 0.72, minIntervalMs: 0 });
    this.scheduleSceneTimeout(() => this.playRunbackVoice(), 420);
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
    this.clearSceneTimeouts();
    AudioManager.stopVoiceGroup('runback');
    this.game.showHighscores();
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

  async submitSteamScore() {
    if (!this.steamSubmissionMode || !this.isRankedRun || this.isSubmitting || this.state === 'runback') return;
    if (this.finalScore <= 0) {
      this.game.pendingHighscore = null;
      this.enterRunbackStage('no_slot');
      return;
    }

    this.isSubmitting = true;
    this.state = 'submitting';
    this.globalStatus = 'submitting';
    this.stopCaretBlink();
    this.hideHiddenInput();
    this.updatePromptMessage('SAVING TO STEAM...');
    this.updateNameDisplay();
    this.updateLeaderboardStatusText();
    this.refreshPrimaryCta();

    const playerName = this.steamPlayerName || await this.leaderboardAdapter.getSteamPlayerName().catch(() => null) || 'STEAM PILOT';
    const runResult = this.leaderboardAdapter.createRunResult(this.game, {
      name: playerName,
      playerName,
      score: this.finalScore,
      level: this.finalLevel,
      rankIndex: this.game.rankIndex || 0,
      submissionId: this.submissionId
    });

    const result = await this.leaderboardAdapter.submitScore(runResult, {
      target: 'steam',
      saveLocal: true,
      name: playerName
    });

    this.globalStatus = result.steamStatus === 'submitted' ? 'submitted' : 'failed';
    result.globalStatus = this.globalStatus === 'submitted' ? 'submitted' : 'failed';
    result.globalQualified = true;
    result.localQualified = true;
    result.steamSubmissionMode = true;
    result.updatedAt = new Date().toISOString();
    await this.confirmGlobalLeaderboardAchievements(result);
    this.leaderboardResult = result;
    this.game.lastLeaderboardResult = result;
    this.game.leaderboardView = this.globalStatus === 'submitted' ? 'global' : 'local';
    this.game.pendingHighscore = null;
    this.isSubmitting = false;
    this.state = 'submitted';
    this.removeInputOverlay();
    this.updateLeaderboardStatusText();
    this.enterRunbackStage(this.globalStatus === 'submitted' ? 'score_submitted' : 'global_failed');
  }

  ensureHiddenInput() {
    if (this.hiddenInput) return this.hiddenInput;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = PILOT_NAME_MAX_LENGTH;
    input.autocapitalize = 'characters';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.style.position = 'absolute';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    input.style.zIndex = '-1';
    input.style.left = '0';
    input.style.top = '0';
    input.style.width = '1px';
    input.style.height = '1px';
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
        this.promptText.text = 'PRACTICE RUN - SCORE NOT LOGGED';
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
    const result = {
      name,
      score: this.finalScore,
      level: this.finalLevel,
      rankIndex: this.game.rankIndex || 0,
      submissionId: this.submissionId,
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
      level: this.finalLevel,
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
      if (!this.globalQualified) {
        this.playLocalHighscoreVoice();
      }
    }

    this.leaderboardResult = result;
    this.game.lastLeaderboardResult = result;
    this.game.leaderboardView = this.localQualified ? 'local' : 'global';
    this.game.pendingHighscore = null;

    if (this.globalQualified || this.globalStatus === 'checking') {
      await this.startGlobalSubmissionWhenReady(name, result);
      if (!this.isSceneActive()) return;
    }

    this.isSubmitting = false;
    this.state = 'submitted';
    this.removeInputOverlay();
    this.stopCaretBlink();
    this.hideHiddenInput();
    const reason = result.globalStatus === 'failed'
      ? 'global_failed'
      : result.globalStatus === 'submitted'
        ? 'score_submitted'
        : 'score_saved';
    this.enterRunbackStage(reason);
  }

  async startGlobalSubmissionWhenReady(name, result) {
    let timeoutId = null;
    try {
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
      const runResult = this.leaderboardAdapter.createRunResult(this.game, {
        name,
        playerName: name,
        score: this.finalScore,
        level: this.finalLevel,
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
      await this.confirmGlobalLeaderboardAchievements(result);
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
    this.achievementToastQueue = [];
    AudioManager.stopVoiceGroup('runback');
    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = null;
  }
}
