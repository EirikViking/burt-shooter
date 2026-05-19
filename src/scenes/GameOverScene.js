import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { API } from '../api/API.js';
import { LocalLeaderboard } from '../api/LocalLeaderboard.js';
import { extendGameOverTexts, getGameOverComment } from '../text/phrasePool.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { createTextLayout, createVerticalStack, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';
import { generateUUID } from '../utils/uuid.js';
import { createText } from '../utils/pixiText.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { getSelectableShips, getShipUnlockProgress, isShipUnlocked, updateShipUnlockProgress } from '../config/ShipMetadata.js';

const ENTRY_PROMPT_DESKTOP = 'ENTER: LOG SCORE  |  R/SPACE/GAMEPAD A: RESTART';
const ENTRY_PROMPT_MOBILE = 'TAP SCORE  |  R/SPACE/GAMEPAD A RESTART';
const INPUT_PROMPT = 'ENTER INITIALS AND PRESS OK';
const GLOBAL_SUBMIT_TIMEOUT_MS = 9000;

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
    this.comment = null;
    this.leaderboardStatusText = null;
    this.notQualifiedText = null;
    this.promptText = null;
    this.nameDisplay = null;
    this.instructions = null;
    // HTML overlay for mobile input
    this.inputOverlay = null;
    this.inputField = null;
    this.submitButton = null;
    this.backdrop = null;
    this.backdropShade = null;
    // Frozen final values
    this.finalScore = 0;
    this.finalLevel = 0;
    this.cachedHighscores = null;
    this.isQualified = false;
    this.localQualified = false;
    this.globalQualified = false;
    this.globalStatus = 'idle';
    this.canEnterName = false;
    this.globalQualificationPromise = null;
    this.leaderboardResult = null;
    this.isRankedRun = true;
    this.submitBlockedReason = null;
    this.isPersonalBest = false;
    this.qualificationFanfarePlayed = false;
    this.personalBestVoicePlayed = false;
    // Submission deduplication
    this.submissionId = null;
    this.gamepadActionWasPressed = false;
  }

  init() {
    this.container.sortableChildren = true;
    this.container.removeChildren();
    this.removeInputOverlay();
    this.nameInput = '';
    this.state = 'prompt';
    this.caretVisible = true;
    this.isSubmitting = false;
    this.submitRetries = 0;
    this.submitBlockedReason = null;
    this.cachedHighscores = null;
    this.localQualified = false;
    this.globalQualified = false;
    this.globalStatus = 'idle';
    this.canEnterName = false;
    this.globalQualificationPromise = null;
    this.leaderboardResult = null;
    this.isRankedRun = typeof this.game.isScoreSubmissionAllowed === 'function'
      ? this.game.isScoreSubmissionAllowed()
      : !this.game.isDebugRun;

    // FREEZE final score and level immediately
    this.finalScore = Number(this.game.score) || 0;
    this.finalLevel = Number(this.game.level) || 0;
    if (this.isRankedRun) {
      this.localQualified = LocalLeaderboard.qualifies(this.finalScore);
      this.globalStatus = 'checking';
      this.updateCanEnterName();
    }
    const previousProgress = getShipUnlockProgress();
    this.isPersonalBest = this.finalScore > (Number(previousProgress.bestScore) || 0);
    this.qualificationFanfarePlayed = false;
    this.personalBestVoicePlayed = false;
    const currentProgress = updateShipUnlockProgress({
      score: this.finalScore,
      rank: this.game.rankIndex || 0,
      level: this.finalLevel
    });
    this.unlockSummary = this.createUnlockSummary(previousProgress, currentProgress);

    // Generate unique submissionId for this run (reused across retries)
    this.submissionId = generateUUID();
    console.log('[GameOver] Generated submissionId:', this.submissionId);

    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);
    this.createFallbackBackdrop(width, height);
    this.initBackdrop(width, height);

    const gameOverTexts = [
      'SWARM GOT COCKY!',
      'HITBOX INCIDENT!',
      'BOSS MUSIC WON!',
      'QUARTER EJECTED!',
      'FORMATION OVERLOAD!'
    ];
    const gameOverPool = extendGameOverTexts(gameOverTexts);
    const randomText = gameOverPool[Math.floor(Math.random() * gameOverPool.length)];

    const titleSize = getResponsiveFontSize(layout, 'title');
    this.title = createText(randomText, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: titleSize,
      fill: '#ff0000',
      stroke: '#880000',
      strokeThickness: layout.isMobile ? 2 : 3,
      dropShadow: true,
      dropShadowColor: '#ff0000',
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
    this.levelText = createText(`REACHED LEVEL: ${this.finalLevel}`, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: levelSize,
      fill: '#ffffff'
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

    const bodySize = getResponsiveFontSize(layout, 'body');
    this.comment = createText(getGameOverComment(this.finalScore, this.finalLevel), {
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
    this.promptPointer = () => this.enterInputMode();
    this.promptText.on('pointerdown', this.promptPointer);
    this.container.addChild(this.promptText);

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
    this.instructions = createText('R / SPACE / GAMEPAD A: RESTART  |  ESC: MENU', {
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
    AudioManager.playVoice('mission_control_game_over', { cooldownMs: 2400, duckMs: 2600 });
    AudioManager.playMusicContext('gameover', { resetPlaylist: true });

    if (!this.isRankedRun) {
      console.log(`[GameOver] Unranked run blocked from leaderboard reason=${this.submitBlockedReason}`);
      return;
    }

    this.updateLeaderboardStatusText();
    this.updateQualificationPromptState();
    this.globalQualificationPromise = this.checkGlobalQualification();
  }

  updateCanEnterName() {
    this.canEnterName = Boolean(this.isRankedRun && (this.localQualified || this.globalQualified));
    this.isQualified = this.canEnterName;
    return this.canEnterName;
  }

  isSceneActive() {
    return this.game?.currentScene === this;
  }

  getEntryPromptText(layout = getCurrentLayout()) {
    const mobile = Boolean(layout?.isMobile);
    if (!this.isRankedRun) return 'PRACTICE RUN - SCORE NOT LOGGED';
    if (!this.updateCanEnterName()) {
      return this.globalStatus === 'checking'
        ? 'CHECKING GLOBAL BOARD...'
        : 'NO BOARD SLOT - R/SPACE/GAMEPAD A: RESTART';
    }
    if (mobile) {
      if (this.localQualified && this.globalQualified) return 'TAP SCORE  |  LOCAL + GLOBAL SLOT';
      if (this.globalQualified) return 'TAP SCORE  |  GLOBAL SLOT';
      return 'TAP SCORE  |  LOCAL SLOT';
    }
    if (this.localQualified && this.globalQualified) {
      return 'ENTER: LOG LOCAL + GLOBAL SCORE  |  R/SPACE/GAMEPAD A: RESTART';
    }
    if (this.globalQualified) {
      return 'ENTER: LOG GLOBAL SCORE  |  R/SPACE/GAMEPAD A: RESTART';
    }
    return 'ENTER: LOG LOCAL SCORE  |  R/SPACE/GAMEPAD A: RESTART';
  }

  getLeaderboardStatusMessage() {
    if (!this.isRankedRun) return 'LOCAL BOARD: PRACTICE RUN\nGLOBAL BOARD: PRACTICE RUN';
    const localLine = this.localQualified
      ? 'LOCAL BOARD: QUALIFIED'
      : `LOCAL BOARD: NEED ${Math.max(1, LocalLeaderboard.getCutoff() + 1).toLocaleString('en-US')}`;
    const globalLine = {
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
    return `${localLine}\n${globalLine}`;
  }

  updateLeaderboardStatusText() {
    if (!this.leaderboardStatusText) return;
    this.leaderboardStatusText.text = this.getLeaderboardStatusMessage();
    if (this.globalQualified) {
      this.leaderboardStatusText.style.fill = '#ffe86a';
    } else if (this.localQualified) {
      this.leaderboardStatusText.style.fill = '#9cfbff';
    } else if (this.globalStatus === 'offline' || this.globalStatus === 'failed') {
      this.leaderboardStatusText.style.fill = '#ffb35c';
    } else {
      this.leaderboardStatusText.style.fill = '#8fa6b8';
    }
  }

  updateQualificationPromptState() {
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
      this.notQualifiedText.text = noSlot ? 'NO LOCAL OR GLOBAL SLOT\nONE MORE RUN' : '';
    }
    this.layoutScreen();
  }

  async checkGlobalQualification() {
    try {
      const scores = await API.getHighscores({ useCache: false });
      this.cachedHighscores = Array.isArray(scores) ? [...scores] : [];
      this.cachedHighscores.sort((a, b) => b.score - a.score);
      if (this.cachedHighscores.length < 10) {
        this.globalQualified = this.finalScore > 0;
      } else {
        const tenth = Number(this.cachedHighscores[9]?.score) || 0;
        this.globalQualified = this.finalScore > tenth;
      }
      this.globalStatus = this.globalQualified ? 'qualified' : 'missed';
      console.log(`[GameOver] Global Qualification: Score ${this.finalScore} vs 10th ${this.cachedHighscores[9]?.score || 0} -> ${this.globalQualified}`);

      if (this.globalQualified && this.isSceneActive()) {
        this.playGlobalQualificationFanfare();
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
        this.updateLeaderboardStatusText();
        this.updateQualificationPromptState();
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
    this.title.style.stroke = { color: '#880000', width: layout.isMobile ? 2 : 3 };
    this.title.style.wordWrap = true;
    this.title.style.wordWrapWidth = clampTextWidth(width * 0.88, layout);
    this.title.style.lineHeight = Math.round(titleSize * 1.08);
    this.scoreText.style.fontSize = scoreSize;
    this.levelText.style.fontSize = levelSize;
    this.unlockText.style.fontSize = unlockSize;
    this.unlockText.style.wordWrap = true;
    this.unlockText.style.wordWrapWidth = clampTextWidth(width * 0.9, layout);
    this.unlockText.style.lineHeight = Math.round(unlockSize * 1.25);
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

    // Calculate content height for centering
    const spacing = layout.isMobile ? 8 : 14;
    const sectionGap = layout.isMobile ? 16 : 24;

    // Estimate heights
    const titleHeight = titleSize * 1.2;
    const scoreHeight = scoreSize * 1.2;
    const levelHeight = levelSize * 1.2;
    const unlockHeight = unlockSize * 2.3;
    const commentHeight = bodySize * 2 * 1.4; // ~2 lines
    const leaderboardStatusHeight = leaderboardStatusSize * 2.5;
    const promptHeight = promptSize * 1.2;
    const nameHeight = nameSize * 1.2;

    const totalHeight = titleHeight + scoreHeight + levelHeight + unlockHeight + commentHeight + leaderboardStatusHeight + promptHeight + nameHeight + spacing * 7 + sectionGap * 2;

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

    this.comment.x = width / 2;
    this.comment.y = stack.placeText(this.comment, spacing);

    this.leaderboardStatusText.x = width / 2;
    this.leaderboardStatusText.y = stack.placeText(this.leaderboardStatusText, spacing * 0.8);

    this.promptText.x = width / 2;
    this.promptText.y = stack.placeElement(this.promptText, spacing);

    this.notQualifiedText.x = width / 2;
    this.notQualifiedText.y = this.promptText.y;

    this.nameDisplay.x = width / 2;
    this.nameDisplay.y = stack.getCurrentY();

    this.instructions.x = width / 2;
    this.instructions.y = height - safeMargin.bottom - (layout.isMobile ? 32 : 40);
  }

  createFallbackBackdrop(width, height) {
    this.backdropShade = new PIXI.Graphics();
    this.backdropShade.zIndex = -10;
    this.container.addChild(this.backdropShade);
    this.layoutBackdrop(width, height);
  }

  async initBackdrop(width, height) {
    if (!AssetManifest.generated?.menuBackdrop) return;
    try {
      const texture = await PIXI.Assets.load({
        alias: 'gameover_menu_backdrop',
        src: AssetManifest.generated.menuBackdrop
      });
      if (!this.container?.parent && this.game.currentScene !== this) return;
      this.backdrop = new PIXI.Sprite(texture);
      this.backdrop.anchor.set(0.5);
      this.backdrop.alpha = 0.32;
      this.backdrop.zIndex = -20;
      this.container.addChild(this.backdrop);
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
      this.backdropShade.fill({ color: 0x020713, alpha: 0.82 });
      this.backdropShade.rect(0, 0, width, height);
      this.backdropShade.fill({ color: 0x000000, alpha: 0.28 });
    }
  }

  setupKeyboard() {
    this.keyHandler = (e) => {
      const isSubmitKey = e.key === 'Enter' || e.key === 'Return' || e.code === 'NumpadEnter';
      const isRestartKey = e.code === 'KeyR' || e.key === 'r' || e.key === 'R' || e.code === 'Space';
      const isEscape = e.key === 'Escape';

      if (this.state === 'submitting' && !isRestartKey && !isEscape) {
        return;
      }

      if (isEscape) {
        e.preventDefault();
        if (this.state === 'input') {
          this.exitInputMode();
        } else {
          this.returnToMenu();
        }
        return;
      }

      if (this.state !== 'input' && isRestartKey) {
        e.preventDefault();
        this.restartRun();
        return;
      }

      if (this.state === 'prompt') {
        if (isSubmitKey) {
          e.preventDefault();
          this.enterInputMode();
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
        if (/^[A-Z0-9 ]$/.test(char) && this.nameInput.length < 10) {
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
    if (this.state === 'input' || this.state === 'submitting') return;
    const actionPressed = this.isGamepadActionPressed();
    if (actionPressed && !this.gamepadActionWasPressed) {
      this.restartRun();
    }
    this.gamepadActionWasPressed = actionPressed;
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

  createUnlockSummary(previousProgress, currentProgress) {
    const ships = getSelectableShips();
    const newlyUnlocked = ships.find(ship =>
      isShipUnlocked(ship.spriteKey, currentProgress) &&
      !isShipUnlocked(ship.spriteKey, previousProgress)
    );
    if (newlyUnlocked) {
      return `NEW SHIP UNLOCKED: ${newlyUnlocked.name}\nOPEN HANGAR FROM MENU OR PRESS RESTART`;
    }

    const nextShip = ships
      .filter(ship => !isShipUnlocked(ship.spriteKey, currentProgress))
      .sort((a, b) => {
        const aScore = Number(a.unlock?.score) || 0;
        const bScore = Number(b.unlock?.score) || 0;
        const aRank = Number(a.unlock?.rank) || 0;
        const bRank = Number(b.unlock?.rank) || 0;
        return aScore - bScore || aRank - bRank;
      })[0];

    if (!nextShip) {
      return 'HANGAR COMPLETE: ALL SHIPS UNLOCKED\nCHASE A CLEANER RUN';
    }

    const requirement = nextShip.unlock || {};
    const scoreNeed = Math.max(0, (Number(requirement.score) || 0) - (currentProgress.bestScore || 0));
    const rankNeed = Math.max(0, (Number(requirement.rank) || 0) - (currentProgress.bestRank || 0));
    const scorePart = scoreNeed > 0 ? `${scoreNeed.toLocaleString('en-US')} SCORE` : null;
    const rankPart = rankNeed > 0 ? `${rankNeed} RANK` : null;
    const needed = [scorePart, rankPart].filter(Boolean).join(' OR ') || 'ONE BETTER RUN';
    return `NEXT SHIP: ${nextShip.name}\nNEED ${needed}`;
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
      return;
    }

    if (!this.updateCanEnterName()) {
      console.log('[GameOver] Player not qualified for local/global board yet. Blocking submission.');

      AudioManager.playVoice('mission_control_restart', { cooldownMs: 3600, duckMs: 1100 });

      if (this.globalStatus === 'checking') {
        this.updatePromptMessage('GLOBAL BOARD CHECKING...');
        window.setTimeout(() => this.updateQualificationPromptState(), 900);
      } else {
        this.updateQualificationPromptState();
      }
      return;
    }

    console.log('[GameOver] Player qualified. Allowing name entry.', {
      localQualified: this.localQualified,
      globalQualified: this.globalQualified,
      globalStatus: this.globalStatus
    });

    this.state = 'input';
    this.nameInput = '';
    this.caretVisible = true;
    this.submitRetries = 0;

    const layout = getCurrentLayout();

    if (layout.isMobile) {
      // Show HTML overlay for mobile
      this.showInputOverlay();
      this.promptText.visible = false;
      this.nameDisplay.visible = false;
    } else {
      // Desktop: use PIXI text display with hidden input
      this.updatePromptMessage(INPUT_PROMPT);
      this.nameDisplay.visible = true;
      this.ensureHiddenInput();
      if (this.hiddenInput) {
        this.hiddenInput.value = '';
        this.hiddenInput.focus();
      }
      this.startCaretBlink();
      this.updateNameDisplay();
    }
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
  }

  returnToMenu() {
    AudioManager.playMusicContext('menu', { resetPlaylist: true });
    this.game.switchScene('menu');
    window.setTimeout(() => {
      if (this.game?.currentScene === this.game?.scenes?.menu) {
        AudioManager.playMusicContext('menu', { resetPlaylist: true });
      }
    }, 120);
  }

  restartRun() {
    this.removeInputOverlay();
    this.stopCaretBlink();
    this.hideHiddenInput();
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
    AudioManager.playSfx('nova_highscore_chime', { force: true, volume: 0.95 });
    window.setTimeout(() => {
      AudioManager.playVoice('mission_control_global_highscore', {
        force: true,
        stopOtherVoices: true,
        exclusiveGroup: 'announcer',
        cooldownMs: 9000,
        duckMs: 3400,
        duckFactor: 0.32,
        volume: 0.96
      });
    }, 180);
  }

  playPersonalBestVoice() {
    if (this.personalBestVoicePlayed || this.qualificationFanfarePlayed) return;
    this.personalBestVoicePlayed = true;
    window.setTimeout(() => {
      AudioManager.playVoice('mission_control_personal_best', {
        cooldownMs: 7000,
        duckMs: 2200,
        duckFactor: 0.48,
        volume: 0.82
      });
    }, 900);
  }

  playLocalHighscoreVoice() {
    AudioManager.playSfx('achievement', { force: true, volume: 0.82 });
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

  updatePromptMessage(text) {
    if (this.promptText) {
      this.promptText.text = text;
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
    label.textContent = 'ENTER PILOT NAME';
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
    this.inputField.maxLength = 10;
    this.inputField.autocapitalize = 'characters';
    this.inputField.autocomplete = 'off';
    this.inputField.spellcheck = false;
    this.inputField.placeholder = 'PILOT';
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
    this.inputField.addEventListener('input', (e) => {
      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
      e.target.value = value.slice(0, 10);
      this.nameInput = e.target.value;
    });
    this.inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.nameInput.length > 0) {
        e.preventDefault();
        this.submitScore();
      }
    });
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
    this.submitButton.textContent = 'OK';
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
      if (this.nameInput.length > 0) {
        this.submitScore();
      }
    });
    btnContainer.appendChild(this.submitButton);

    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'CANCEL';
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
      this.exitInputMode();
    });
    btnContainer.appendChild(cancelButton);

    this.inputOverlay.appendChild(btnContainer);

    document.body.appendChild(this.inputOverlay);

    // Focus the input field after a short delay (for mobile keyboard)
    setTimeout(() => {
      if (this.inputField) {
        this.inputField.focus();
      }
    }, 100);
  }

  removeInputOverlay() {
    if (this.inputOverlay && this.inputOverlay.parentNode) {
      this.inputOverlay.parentNode.removeChild(this.inputOverlay);
    }
    this.inputOverlay = null;
    this.inputField = null;
    this.submitButton = null;
  }

  ensureHiddenInput() {
    if (this.hiddenInput) return this.hiddenInput;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 10;
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
    input.addEventListener('input', this.boundHiddenInput);
    document.body.appendChild(input);
    this.hiddenInput = input;
    return input;
  }

  handleHiddenInput(event) {
    if (!event.target) return;
    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    this.nameInput = value.slice(0, 10);
    event.target.value = this.nameInput;
    this.caretVisible = true;
    this.updateNameDisplay();
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
      const caret = this.caretVisible ? '|' : '';
      this.nameDisplay.text = `NAME: ${this.nameInput}${caret}`;
      this.nameDisplay.visible = true;
    } else if (this.state === 'submitting') {
      this.nameDisplay.text = 'SAVING...';
      this.nameDisplay.visible = true;
    } else {
      this.nameDisplay.visible = false;
    }
  }

  async submitScore() {
    if (this.state !== 'input' || this.nameInput.length === 0) {
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

    const name = this.nameInput;
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

    if (this.localQualified) {
      const localSave = LocalLeaderboard.saveScore({
        name,
        score: this.finalScore,
        level: this.finalLevel,
        rankIndex: this.game.rankIndex || 0,
        submissionId: this.submissionId
      });
      result.localStatus = 'saved';
      result.localPlacement = localSave.placement;
      result.localEntry = localSave.entry;
      if (!this.globalQualified) {
        this.playLocalHighscoreVoice();
      }
    }

    this.leaderboardResult = result;
    this.game.lastLeaderboardResult = result;
    this.game.leaderboardView = this.localQualified ? 'local' : 'global';
    this.game.pendingHighscore = null;

    if (this.globalQualified || this.globalStatus === 'checking') {
      this.startGlobalSubmissionWhenReady(name, result);
    }

    this.isSubmitting = false;
    this.state = 'submitted';
    this.removeInputOverlay();
    this.stopCaretBlink();
    this.hideHiddenInput();
    this.game.showHighscores();
  }

  async startGlobalSubmissionWhenReady(name, result) {
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

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Global submit timeout')), GLOBAL_SUBMIT_TIMEOUT_MS)
      );
      const response = await Promise.race([
        API.submitScore(name, this.finalScore, this.finalLevel, this.game.rankIndex, this.submissionId),
        timeoutPromise
      ]);

      this.globalStatus = 'submitted';
      result.globalStatus = 'submitted';
      result.globalResponse = response || null;
      result.updatedAt = new Date().toISOString();
      this.game.lastLeaderboardResult = result;
      this.updateLeaderboardStatusText();
      console.log('[GameOverScene] Global submit success.');
    } catch (error) {
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
      if (this.hiddenInput.parentNode) {
        this.hiddenInput.parentNode.removeChild(this.hiddenInput);
      }
      this.hiddenInput = null;
    }
    this.removeInputOverlay();
    this.stopCaretBlink();
    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = null;
  }
}
