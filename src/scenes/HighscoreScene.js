import * as PIXI from 'pixi.js';
import { BUILD_ID } from '../buildInfo.js';
import { addResponsiveListener } from '../ui/responsiveLayout.js';
import { createTextLayout, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';
import { BonusAsset } from '../utils/BonusAsset.js';
import { getRankFromLevel, getRankTitle } from '../shared/RankPolicy.js';
import { RankAssets } from '../utils/RankAssets.js';
import { createText } from '../utils/pixiText.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { createLeaderboardAdapter } from '../leaderboard/LeaderboardAdapter.js';
import {
  LEADERBOARD_DISPLAY_LIMIT,
  LeaderboardView,
  normalizeLeaderboardEntry
} from '../leaderboard/LeaderboardTypes.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { translateText } from '../i18n/index.js';


const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, Eurostile, Bank Gothic, sans-serif';
const FONT_ARCADE = 'Rajdhani, Orbitron, Bahnschrift, Segoe UI, sans-serif';
const MOBILE_LEADERBOARD_VISIBLE_LIMIT = 10;
const DESKTOP_TWO_COLUMN_MIN_WIDTH = 980;

function debugBounds(displayObject) {
  if (!displayObject?.getBounds) return null;
  try {
    const bounds = displayObject.getBounds();
    return {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
      right: Math.round(bounds.x + bounds.width),
      bottom: Math.round(bounds.y + bounds.height)
    };
  } catch {
    return null;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fitTextToWidth(textObject, maxWidth, minFontSize = 9) {
  if (!textObject?.style || !Number.isFinite(maxWidth) || maxWidth <= 0) return;
  let nextSize = Number(textObject.style.fontSize) || 12;
  while (textObject.width > maxWidth && nextSize > minFontSize) {
    nextSize -= 1;
    textObject.style.fontSize = nextSize;
  }
}

export class HighscoreScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.layoutUnsubscribe = null;
    this.title = null;
    this.subtitle = null;
    this.comment = null;
    this.rowsContainer = new PIXI.Container();
    this.stateMessage = null;
    this.statusText = null;
    this.retryBtn = null;
    this.backBtn = null;
    this.runAgainBtn = null;
    this.globalBtn = null;
    this.friendsBtn = null;
    this.localBtn = null;
    this.tabButtons = {};
    this.leaderboardTabs = [];
    this.leaderboardAdapter = null;
    this.activeLeaderboardResult = null;
    this.buildStamp = null;
    this.status = 'LOADING';
    this.activeLeaderboard = LeaderboardView.GLOBAL;
    this.entries = [];
    this.entriesNormalized = [];
    this.lastError = 'none';
    this.loadingTimer = null;
    this.fetchToken = 0;
    this.fetchController = null;
    this.rowsFadeTicker = null;
    this.retryAttempt = 0; // Track retry attempts for UI feedback
    this.gamepadNavigator = new GamepadNavigator();
    this.focusableControls = [];
    this.focusedControlIndex = 0;
    this.keyHandler = null;

    // Trophy Room Assets
    this.bonusDronesContainer = new PIXI.Container();
    this.partyHeadsContainer = new PIXI.Container();
    this.largeBonusDronesContainer = new PIXI.Container();
    this.confettiContainer = new PIXI.Container();
    this.scanlineOverlay = null;
    this.animationTicker = null;
    this.bonusDrones = [];
    this.largeBonusDrones = [];
    this.partyHeads = [];
    this.confettiParticles = [];
    this.leaderboardPanel = null;
    this.backdropSprite = null;
    this.backdropShade = null;
    this.titlePlate = null;
    this.holoRails = null;
    this.statsDeck = null;
    this.statsText = null;
    this.tableMetrics = null;
    this.rowLayoutDebug = [];

    this.boardOpenTime = 0;
  }

  async init() {
    this.gamepadNavigator.suppressUntilReleased();
    this.container.removeChildren();
    this.backdropSprite = null;
    this.backdropShade = null;
    this.titlePlate = null;
    this.holoRails = null;
    this.statsDeck = null;
    this.statsText = null;
    this.tableMetrics = null;
    this.rowLayoutDebug = [];
    this.entries = [];
    this.entriesNormalized = [];
    this.activeLeaderboardResult = null;
    this.status = 'LOADING';
    this.lastError = 'none';
    this.boardOpenTime = Date.now();
    this.leaderboardAdapter = typeof this.game.getLeaderboardAdapter === 'function'
      ? this.game.getLeaderboardAdapter()
      : createLeaderboardAdapter();
    await this.leaderboardAdapter.refreshAvailability();
    this.leaderboardTabs = this.leaderboardAdapter.getTabs();
    this.activeLeaderboard = this.leaderboardAdapter.normalizeView(this.game.leaderboardView || LeaderboardView.GLOBAL);
    this.game.leaderboardView = this.activeLeaderboard;

    // Load bonus-core texture and rank textures
    await BonusAsset.ensureLoaded();
    await RankAssets.preloadHighscoreBadges();

    const { width, height } = this.game.app.screen;
    const layout = createTextLayout(width, height);

    this.backdropSprite = await this.createLeaderboardBackdrop(width, height);
    if (this.backdropSprite) {
      this.backdropSprite.zIndex = -60;
      this.container.addChild(this.backdropSprite);
    }

    this.backdropShade = new PIXI.Graphics();
    this.backdropShade.zIndex = -55;
    this.container.addChild(this.backdropShade);

    this.holoRails = new PIXI.Graphics();
    this.holoRails.zIndex = -8;
    this.container.addChild(this.holoRails);

    this.titlePlate = new PIXI.Graphics();
    this.titlePlate.zIndex = 1;
    this.container.addChild(this.titlePlate);

    this.statsDeck = new PIXI.Graphics();
    this.statsDeck.zIndex = 2;
    this.container.addChild(this.statsDeck);

    // Layer setup: backdrop -> bonus cores -> confetti -> leaderboard panel -> content -> scanline
    this.largeBonusDronesContainer = new PIXI.Container();
    this.largeBonusDronesContainer.zIndex = -15;
    this.container.addChild(this.largeBonusDronesContainer);

    this.bonusDronesContainer = new PIXI.Container();
    this.bonusDronesContainer.zIndex = -10;
    this.container.addChild(this.bonusDronesContainer);

    this.partyHeadsContainer = new PIXI.Container();
    this.partyHeadsContainer.zIndex = -5;
    this.container.addChild(this.partyHeadsContainer);

    this.confettiContainer = new PIXI.Container();
    this.confettiContainer.zIndex = -4;
    this.container.addChild(this.confettiContainer);

    // Dark panel behind leaderboard for readability
    this.leaderboardPanel = new PIXI.Graphics();
    this.leaderboardPanel.zIndex = 0;
    this.container.addChild(this.leaderboardPanel);

    this.setupLargeBonusDrones(width, height);
    this.setupBonusDrones(width, height);
    this.setupConfetti(width, height);

    this.title = createText('NOVA LEADERBOARD', {
      fontFamily: FONT_DISPLAY,
      fontSize: getResponsiveFontSize(layout, 'score'),
      fill: '#faffd7',
      stroke: '#00f6ff',
      strokeThickness: 6,
      dropShadow: true,
      dropShadowColor: '#00ffff',
      dropShadowBlur: 14,
      dropShadowDistance: 0,
      dropShadowAlpha: 0.85
    });
    this.title.anchor.set(0.5);
    this.title.zIndex = 4;
    this.container.addChild(this.title);

    this.subtitle = createText('Arcade legends and brave initials', {
      fontFamily: FONT_ARCADE,
      fontSize: getResponsiveFontSize(layout, 'subtitle'),
      fill: '#ffd15c',
      stroke: '#00131b',
      strokeThickness: 3
    });
    this.subtitle.anchor.set(0.5);
    this.subtitle.zIndex = 4;
    this.container.addChild(this.subtitle);

    this.comment = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: getResponsiveFontSize(layout, 'small'),
      fill: '#ffffff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.9, layout),
      lineHeight: layout.lineHeight * 1.2
    });
    this.comment.anchor.set(0.5);
    this.comment.zIndex = 4;
    this.container.addChild(this.comment);

    this.rowsContainer = new PIXI.Container();
    this.rowsContainer.zIndex = 10; // Above leaderboard panel but below overlays
    this.container.addChild(this.rowsContainer);

    this.stateMessage = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: getResponsiveFontSize(layout, 'body'),
      fill: '#ffdd55',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.8, layout)
    });
    this.stateMessage.anchor.set(0.5);
    this.stateMessage.anchor.set(0.5);
    this.stateMessage.zIndex = 12;
    this.container.addChild(this.stateMessage);

    this.statusText = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: getResponsiveFontSize(layout, 'small'),
      fill: '#ffffff',
      align: 'left',
      wordWrap: false
    });
    this.statusText.anchor.set(0, 0.5);
    this.container.addChild(this.statusText);

    this.retryBtn = this.createButton('Retry');
    this.retryBtn.on('pointerdown', () => this.fetchHighscores());
    this.container.addChild(this.retryBtn);

    this.backBtn = this.createButton('BACK');
    this.backBtn.on('pointerdown', () => {
      this.game.switchScene('menu');
    });
    this.container.addChild(this.backBtn);

    this.runAgainBtn = this.createButton('ONE MORE RUN');
    this.runAgainBtn.on('pointerdown', () => {
      this.game.startGame(this.game.selectedShipSpriteKey);
    });
    this.container.addChild(this.runAgainBtn);

    this.globalBtn = this.createButton('GLOBAL');
    this.globalBtn.on('pointerdown', () => this.setLeaderboardView(LeaderboardView.GLOBAL));
    this.globalBtn.zIndex = 5;
    this.container.addChild(this.globalBtn);

    this.friendsBtn = this.createButton('FRIENDS');
    this.friendsBtn.on('pointerdown', () => this.setLeaderboardView(LeaderboardView.FRIENDS));
    this.friendsBtn.zIndex = 5;
    this.container.addChild(this.friendsBtn);

    this.localBtn = this.createButton('LOCAL');
    this.localBtn.on('pointerdown', () => this.setLeaderboardView(LeaderboardView.LOCAL));
    this.localBtn.zIndex = 5;
    this.container.addChild(this.localBtn);
    this.tabButtons = {
      [LeaderboardView.GLOBAL]: this.globalBtn,
      [LeaderboardView.FRIENDS]: this.friendsBtn,
      [LeaderboardView.LOCAL]: this.localBtn
    };
    this.focusableControls = [
      { id: LeaderboardView.GLOBAL, button: this.globalBtn, activate: () => this.setLeaderboardView(LeaderboardView.GLOBAL) },
      { id: LeaderboardView.FRIENDS, button: this.friendsBtn, activate: () => this.setLeaderboardView(LeaderboardView.FRIENDS) },
      { id: LeaderboardView.LOCAL, button: this.localBtn, activate: () => this.setLeaderboardView(LeaderboardView.LOCAL) },
      { id: 'retry', button: this.retryBtn, activate: () => this.fetchHighscores() },
      { id: 'back', button: this.backBtn, activate: () => this.game.switchScene('menu') },
      { id: 'runAgain', button: this.runAgainBtn, activate: () => this.game.startGame(this.game.selectedShipSpriteKey) }
    ];
    this.focusableControls.forEach((control) => {
      if (control.button) control.button.activate = control.activate;
    });

    // TASK C: Build stamp removed from HighscoreScene (only allowed on MenuScene)
    // this.buildStamp = createText(`build: ${BUILD_ID}`, {
    //   fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
    //   fontSize: getResponsiveFontSize(layout, 'small') - 1,
    //   fill: '#66fffe',
    //   align: 'right'
    // });
    // this.buildStamp.anchor.set(1, 1);
    // this.container.addChild(this.buildStamp);

    // Scanline overlay
    this.scanlineOverlay = new PIXI.Graphics();
    this.scanlineOverlay.zIndex = 100;
    this.container.addChild(this.scanlineOverlay);
    this.drawScanline(width, height);

    // Enable sortable children for zIndex
    this.container.sortableChildren = true;

    // Start animation loop
    this.startAnimationLoop();

    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = addResponsiveListener(() => this.layoutHighscore());
    this.layoutHighscore();
    this.setupKeyboardNavigation();
    this.setHighscoreFocus(0);
    console.log(`HighscoreScene build:${BUILD_ID}`);
    this.loadActiveLeaderboard();
  }

  async createLeaderboardBackdrop(width, height) {
    try {
      const texture = await PIXI.Assets.load(AssetManifest.generated.leaderboardHall);
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.alpha = 0.98;
      this.layoutBackdrop(sprite, width, height);
      return sprite;
    } catch (error) {
      console.warn('[HighscoreScene] Leaderboard backdrop failed to load:', error);
      return null;
    }
  }

  layoutBackdrop(sprite = this.backdropSprite, width = this.game.app.screen.width, height = this.game.app.screen.height) {
    if (!sprite?.texture) return;
    const textureWidth = sprite.texture.width || 1;
    const textureHeight = sprite.texture.height || 1;
    const scale = Math.max(width / textureWidth, height / textureHeight);
    sprite.scale.set(scale);
    sprite.position.set(width / 2, height / 2);
  }

  setLeaderboardView(view) {
    const nextView = this.leaderboardAdapter?.normalizeView
      ? this.leaderboardAdapter.normalizeView(view)
      : (view === LeaderboardView.LOCAL ? LeaderboardView.LOCAL : LeaderboardView.GLOBAL);
    if (this.activeLeaderboard === nextView && this.status !== 'ERROR') return;
    this.activeLeaderboard = nextView;
    this.game.leaderboardView = nextView;
    this.loadActiveLeaderboard();
  }

  loadActiveLeaderboard() {
    this.fetchHighscores();
    this.updateLeaderboardChrome();
  }

  async loadLocalHighscores() {
    this.fetchToken += 1;
    this.lastError = 'none';
    const result = await this.leaderboardAdapter.getScores(LeaderboardView.LOCAL, { limit: LEADERBOARD_DISPLAY_LIMIT });
    this.applyLeaderboardResult(result);
  }

  updateLeaderboardChrome() {
    const tabs = this.leaderboardAdapter?.getTabs?.() || this.leaderboardTabs || [];
    this.leaderboardTabs = tabs;
    const activeTab = this.leaderboardAdapter?.getTab?.(this.activeLeaderboard) || tabs.find(tab => tab.id === this.activeLeaderboard);
    if (this.title) {
      this.title.text = translateText(activeTab?.title || (this.activeLeaderboard === LeaderboardView.LOCAL ? 'LOCAL SCORE DECK' : 'GLOBAL SCORE DECK'));
    }
    if (this.subtitle) {
      const source = (activeTab?.sourceLabel || this.leaderboardAdapter?.getSourceLabel?.(this.activeLeaderboard) || 'Score Signal').toUpperCase();
      this.subtitle.text = `${translateText('PILOT RANK SIGNAL')} // ${translateText(source)}`;
    }
    Object.entries(this.tabButtons || {}).forEach(([view, button]) => {
      if (!button) return;
      button.visible = tabs.some(tab => tab.id === view);
    });
    this.updateToggleStyles();
  }

  updateToggleStyles() {
    Object.entries(this.tabButtons || {}).forEach(([view, button]) => {
      this.setButtonActive(button, this.activeLeaderboard === view);
    });
  }

  async layoutHighscore() {
    const { width, height } = this.game.app.screen;
    const layout = createTextLayout(width, height);
    this.layoutBackdrop(this.backdropSprite, width, height);
    this.drawBackdropShade(width, height);

    const isMobile = layout.isMobile || width < 720;
    const deckWidth = isMobile
      ? Math.min(width - 28, 430)
      : Math.min(Math.max(1040, width * 0.68), 1320);
    const deckLeft = isMobile
      ? (width - deckWidth) / 2
      : Math.max(24, Math.min(width * 0.06, width - deckWidth - 28));
    const deckTop = isMobile ? Math.max(10, layout.padding * 0.55) : Math.max(28, layout.padding * 0.8);
    const backReserve = isMobile ? 88 : 76;
    const deckBottom = height - backReserve;
    const deckHeight = Math.max(320, deckBottom - deckTop);
    this.tableMetrics = {
      x: deckLeft,
      y: deckTop,
      width: deckWidth,
      height: deckHeight,
      innerX: deckLeft + (isMobile ? 14 : 30),
      innerY: deckTop + (isMobile ? 14 : 24),
      innerWidth: deckWidth - (isMobile ? 28 : 60),
      bottom: deckTop + deckHeight,
      rowsBottom: deckTop + deckHeight - (isMobile ? 48 : 36),
      footerY: deckTop + deckHeight - (isMobile ? 24 : 20)
    };

    this.title.style.fontSize = Math.min(getResponsiveFontSize(layout, 'title') * (isMobile ? 0.66 : 0.76), isMobile ? 30 : 48);
    this.title.style.stroke = { color: '#031527', width: isMobile ? 5 : 8 };
    this.title.style.dropShadowColor = '#00ffff';
    this.subtitle.style.fontSize = Math.min(getResponsiveFontSize(layout, 'subtitle') * (isMobile ? 0.88 : 0.96), isMobile ? 15 : 22);
    this.comment.style.fontSize = Math.min(getResponsiveFontSize(layout, 'body'), isMobile ? 14 : 18);
    this.comment.style.wordWrapWidth = Math.min(clampTextWidth(width * 0.86, layout), this.tableMetrics.innerWidth * 0.74);
    this.comment.visible = this.status !== 'LOADED';
    this.stateMessage.style.fontSize = getResponsiveFontSize(layout, 'body');
    this.stateMessage.style.wordWrap = true;
    this.stateMessage.style.wordWrapWidth = Math.min(clampTextWidth(width * 0.86, layout), this.tableMetrics.innerWidth * 0.78);
    this.statusText.style.fontSize = getResponsiveFontSize(layout, 'small');

    const centerX = deckLeft + deckWidth / 2;
    const titleY = deckTop + (isMobile ? 56 : 70);
    this.title.x = centerX;
    this.title.y = titleY;
    this.subtitle.x = centerX;
    this.subtitle.y = titleY + (isMobile ? 34 : 42);
    this.drawTitlePlate(width, layout);

    const toggleY = this.subtitle.y + (isMobile ? 40 : 46);
    const visibleTabs = (this.leaderboardTabs || []).filter(tab => this.tabButtons?.[tab.id]?.visible !== false);
    if (visibleTabs.length > 0) {
      const buttonW = isMobile
        ? Math.min(118, Math.max(92, deckWidth / Math.max(3.5, visibleTabs.length + 0.7)))
        : (visibleTabs.length > 2 ? 150 : 172);
      const buttonH = isMobile ? 32 : 38;
      const gap = isMobile ? 8 : 14;
      const totalWidth = visibleTabs.length * buttonW + (visibleTabs.length - 1) * gap;
      visibleTabs.forEach((tab, index) => {
        const button = this.tabButtons?.[tab.id];
        if (!button) return;
        button.x = centerX - totalWidth / 2 + buttonW / 2 + index * (buttonW + gap);
        button.y = toggleY;
        this.resizeButton(button, buttonW, buttonH);
      });
    }

    this.comment.x = centerX;
    if (this.comment.visible) {
      this.comment.y = toggleY + (isMobile ? 42 : 50);
    } else {
      this.comment.y = toggleY + 36;
    }

    this.stateMessage.visible = this.status !== 'LOADED';
    let rowsStartY = toggleY + (isMobile ? 46 : 52);
    if (this.stateMessage.visible) {
      this.stateMessage.y = this.comment.visible
        ? this.comment.y + Math.max(isMobile ? 28 : 34, this.comment.height + (isMobile ? 10 : 12))
        : toggleY + (isMobile ? 46 : 52);
      rowsStartY = this.stateMessage.y + Math.max(isMobile ? 30 : 38, this.stateMessage.height + (isMobile ? 14 : 18));
    } else {
      this.stateMessage.y = rowsStartY;
    }
    this.stateMessage.x = centerX;
    rowsStartY = Math.min(rowsStartY, this.tableMetrics.rowsBottom - (isMobile ? 410 : 390));
    rowsStartY = Math.max(rowsStartY, toggleY + (isMobile ? 42 : 48));

    this.drawLeaderboardPanel(width, height, rowsStartY, layout);
    this.drawStatsDeck(width, height, layout);

    await this.renderHighscoreRows(rowsStartY, layout);

    // Retry/back & diag
    const panelBottom = this.tableMetrics?.bottom || (height - (isMobile ? 88 : 76));
    const buttonY = Math.min(height - (isMobile ? 34 : 28), panelBottom + (isMobile ? 42 : 38));
    this.retryBtn.x = width / 2 - 80;
    this.retryBtn.y = buttonY;
    this.retryBtn.visible = this.status === 'ERROR';

    const backButtonW = isMobile ? 112 : 140;
    const runAgainButtonW = isMobile ? Math.min(176, deckWidth * 0.5) : 210;
    this.resizeButton(this.backBtn, backButtonW, isMobile ? 36 : 40);
    this.resizeButton(this.runAgainBtn, runAgainButtonW, isMobile ? 40 : 44);

    if (isMobile) {
      const buttonGap = 10;
      const totalButtonWidth = backButtonW + runAgainButtonW + buttonGap;
      this.backBtn.x = width / 2 - totalButtonWidth / 2 + backButtonW / 2;
      this.runAgainBtn.x = width / 2 + totalButtonWidth / 2 - runAgainButtonW / 2;
    } else {
      this.backBtn.x = deckLeft + Math.min(deckWidth - 110, 155);
      this.runAgainBtn.x = deckLeft + deckWidth - Math.min(deckWidth - 130, 165);
    }
    this.backBtn.y = buttonY;
    this.runAgainBtn.y = buttonY;
    this.setButtonActive(this.runAgainBtn, true);

    this.statusText.x = layout.padding;
    this.statusText.y = height - layout.padding * 1.5;
    this.statusText.text = ''; // Debug line removed

    // TASK C: Build stamp layout removed
    // this.buildStamp.x = width - layout.padding / 2;
    // this.buildStamp.y = height - layout.padding / 2;
  }

  async fetchHighscores() {
    this.fetchToken += 1;
    const token = this.fetchToken;
    this.setState('LOADING');
    this.lastError = 'none';
    this.retryAttempt = 0;

    const startTime = Date.now();
    const isDev = window.location.search.includes('debug=1');
    if (isDev) console.log('[HighscoreScene] Fetching highscores with retry logic');

    try {
      const result = await this.leaderboardAdapter.getScores(this.activeLeaderboard, {
        limit: LEADERBOARD_DISPLAY_LIMIT,
        useCache: true, // Fast path: use cached data if available
        onRetry: (attempt, delay) => {
          if (token !== this.fetchToken) return;
          this.retryAttempt = attempt;
          // Silent retry - only update state message if not first attempt
          if (attempt > 0) {
            this.stateMessage.text = `Loading... (attempt ${attempt + 1}/4)`;
          }
        }
      });

      if (isDev) {
        const fetchTime = Date.now() - startTime;
        console.log(`[HighscoreScene] Fetch completed in ${fetchTime}ms`);
      }

      if (token !== this.fetchToken) return;
      this.applyLeaderboardResult(result);

      if (isDev) {
        const totalTime = Date.now() - startTime;
        console.log(`[HighscoreScene] Render completed. Total: ${totalTime}ms`);
      }
    } catch (error) {
      this.handleFetchError(error, token);
    }
  }

  applyLeaderboardResult(result = {}) {
    this.activeLeaderboardResult = result;
    this.entries = Array.isArray(result.entries) ? result.entries.slice(0, LEADERBOARD_DISPLAY_LIMIT) : [];
    this.entriesNormalized = this.normalizeEntries(this.entries);
    this.comment.text = translateText(result.message || (this.entries.length > 0
      ? `${result.sourceLabel || 'Leaderboard'} records loaded.`
      : `${result.sourceLabel || 'Leaderboard'} has no scores yet.`));
    const status = result.status === 'available'
      ? 'LOADED'
      : result.status === 'empty'
        ? 'EMPTY'
        : 'ERROR';
    this.lastError = result.error || 'none';
    this.setState(status);
  }

  handleFetchError(error, token) {
    if (token && token !== this.fetchToken) return;
    this.fetchToken += 1;
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
    if (this.fetchController) {
      this.fetchController.abort();
      this.fetchController = null;
    }
    this.entries = [];
    this.entriesNormalized = [];
    this.lastError = (error && error.message) ? error.message : 'unknown';
    this.stateMessage.text = `Last error: ${this.lastError}`;
    this.setState('ERROR');
    console.error('[HighscoreScene] fetch failed:', this.lastError);
  }

  setState(newState) {
    this.status = newState;
    const lastResult = this.game.lastLeaderboardResult || null;
    const globalResult = lastResult?.globalStatus ? String(lastResult.globalStatus).replace(/_/g, ' ').toUpperCase() : null;
    const sourceLabel = this.leaderboardAdapter?.getSourceLabel?.(this.activeLeaderboard) || 'Leaderboard';
    switch (newState) {
      case 'LOADED':
        if (this.activeLeaderboard === LeaderboardView.LOCAL) {
          this.stateMessage.text = globalResult
            ? translateText('Local board loaded. Global: {status}.', { status: globalResult })
            : translateText('Local board loaded.');
        } else {
          this.stateMessage.text = globalResult
            ? translateText('{source} loaded. Last run: {status}.', { source: translateText(sourceLabel), status: globalResult })
            : translateText('{source} loaded.', { source: translateText(sourceLabel) });
        }
        break;
      case 'EMPTY':
        if (this.activeLeaderboard === LeaderboardView.FRIENDS) {
          this.stateMessage.text = translateText('No friends scores yet.');
        } else {
          this.stateMessage.text = translateText(this.activeLeaderboard === LeaderboardView.LOCAL
            ? 'No local scores yet. Be the first legend here.'
            : 'No global scores yet. Be the first legend online.');
        }
        break;
      case 'ERROR':
        this.stateMessage.text = translateText(this.activeLeaderboard === LeaderboardView.LOCAL
          ? `Local scores unavailable.`
          : this.activeLeaderboard === LeaderboardView.FRIENDS
            ? 'Could not load Steam friends scores.'
            : `Global board offline. Local scores are safe.`);
        break;
      default:
        this.stateMessage.text = translateText(this.activeLeaderboard === LeaderboardView.FRIENDS
          ? 'Loading Steam friends scores...'
          : this.activeLeaderboard === LeaderboardView.LOCAL
            ? 'Loading local board...'
            : `Loading ${sourceLabel.toLowerCase()}...`);
    }
    this.updateLeaderboardChrome();
    this.layoutHighscore();
  }

  normalizeEntry(raw) {
    const normalized = normalizeLeaderboardEntry(raw, { source: this.activeLeaderboard });
    if (!normalized) return null;
    return {
      ...normalized,
      rank_index: normalized.rank_index ?? getRankFromLevel(normalized.level || 1)
    };
  }

  normalizeEntries(entries) {
    if (!Array.isArray(entries)) return [];

    const normalized = [];
    entries.forEach((entry) => {
      const normalizedEntry = this.normalizeEntry(entry);
      if (normalizedEntry) {
        normalized.push(normalizedEntry);
      }
    });
    return normalized;
  }

  async renderHighscoreRows(startY, layout) {
    this.rowsContainer.removeChildren();
    this.rowLayoutDebug = [];
    const isMobile = layout.isMobile || layout.width < 720;
    const metrics = this.tableMetrics || {
      x: layout.padding,
      y: startY,
      width: layout.width - layout.padding * 2,
      height: layout.height - startY - layout.padding,
      innerX: layout.padding,
      innerY: startY,
      innerWidth: layout.width - layout.padding * 2,
      bottom: layout.height - layout.padding,
      rowsBottom: layout.height - layout.padding * 2
    };

    if (this.status === 'LOADED') {
      const isDebug = window.location.search.includes('debug=1');
      let entriesToDisplay = [...this.entries];

      const desktopTwoColumn = !isMobile && layout.width >= DESKTOP_TWO_COLUMN_MIN_WIDTH && entriesToDisplay.length > MOBILE_LEADERBOARD_VISIBLE_LIMIT;
      const columnCount = desktopTwoColumn ? 2 : 1;
      const displayLimit = desktopTwoColumn ? LEADERBOARD_DISPLAY_LIMIT : MOBILE_LEADERBOARD_VISIBLE_LIMIT;
      entriesToDisplay = entriesToDisplay.slice(0, displayLimit);
      const rowsPerColumnTarget = desktopTwoColumn
        ? Math.ceil(displayLimit / columnCount)
        : Math.min(displayLimit, entriesToDisplay.length || displayLimit);
      const columnGap = desktopTwoColumn ? (layout.width < 1500 ? 20 : 28) : 0;
      const columnWidth = (metrics.innerWidth - columnGap * (columnCount - 1)) / columnCount;
      const headerHeight = isMobile ? 22 : 24;
      const rowsBaseY = startY + headerHeight + (isMobile ? 4 : 7);
      const rowsBottom = Math.min(metrics.rowsBottom || metrics.bottom - 48, metrics.bottom - (isMobile ? 44 : 54));
      const availableRowsHeight = Math.max(120, rowsBottom - rowsBaseY);
      const minRowHeight = isMobile ? 45 : 36;
      const maxRowHeight = isMobile ? 52 : (layout.height >= 880 ? 56 : 42);
      const visibleTargetRows = Math.max(1, Math.min(rowsPerColumnTarget, entriesToDisplay.length || rowsPerColumnTarget));
      const rowSpace = Math.max(minRowHeight, availableRowsHeight / visibleTargetRows);
      const rowHeight = Math.max(minRowHeight, Math.min(maxRowHeight, rowSpace));
      const maxRowsPerColumn = Math.max(4, Math.min(rowsPerColumnTarget, Math.floor((availableRowsHeight + 8) / rowHeight)));
      const maxRows = Math.max(4, Math.min(displayLimit, entriesToDisplay.length, maxRowsPerColumn * columnCount));
      const rowStyle = {
        fontFamily: FONT_ARCADE,
        fontSize: isMobile ? 13 : (layout.height < 820 ? 12 : 14),
        fill: '#e8fcff',
        stroke: '#00131b',
        strokeThickness: 2
      };

      const headerStyle = {
        ...rowStyle,
        fill: '#ffdf8a',
        fontSize: isMobile ? 9 : (layout.height < 820 ? 9 : 10),
        strokeThickness: 2
      };

      const getColumnGeometry = (columnIndex = 0) => {
        const rowX = metrics.innerX + columnIndex * (columnWidth + columnGap);
        const rowW = columnWidth;
        const rankBlockWidth = isMobile ? 38 : (desktopTwoColumn ? 42 : 52);
        const badgeColumnWidth = isMobile ? 30 : (desktopTwoColumn ? 34 : 42);
        const badgeGap = isMobile ? 8 : (desktopTwoColumn ? 8 : 12);
        const scoreBlockWidth = isMobile ? 96 : (desktopTwoColumn ? 110 : 142);
        const levelBlockWidth = isMobile ? 38 : (desktopTwoColumn ? 42 : 46);
        const rightPad = isMobile ? 8 : 10;
        const contentX = rowX + rankBlockWidth + badgeColumnWidth + badgeGap;
        const levelCenterX = rowX + rowW - rightPad - levelBlockWidth / 2;
        const scoreX = levelCenterX - levelBlockWidth / 2 - (isMobile ? 8 : 10);
        const nameBlockWidth = Math.max(isMobile ? 76 : 92, scoreX - scoreBlockWidth - contentX - (isMobile ? 10 : 12));
        return {
          rowX,
          rowW,
          rankBlockWidth,
          badgeColumnWidth,
          badgeGap,
          scoreBlockWidth,
          levelBlockWidth,
          rightPad,
          nameBlockWidth,
          columns: {
            rank: rowX + rankBlockWidth / 2,
            badge: rowX + rankBlockWidth + badgeGap + badgeColumnWidth / 2,
            name: contentX,
            score: scoreX,
            level: levelCenterX
          }
        };
      };

      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        const geometry = getColumnGeometry(columnIndex);
        const headerBar = new PIXI.Graphics();
        headerBar.rect(geometry.rowX, startY + headerHeight - 3, geometry.rowW, 1);
        headerBar.fill({ color: 0x7fffd8, alpha: 0.42 });
        headerBar.rect(geometry.rowX, startY + headerHeight - 1, geometry.rowW * 0.38, 2);
        headerBar.fill({ color: 0xffd15c, alpha: 0.38 });
        this.rowsContainer.addChild(headerBar);

        const manifestLabel = desktopTwoColumn && columnIndex === 1 ? 'PILOT MANIFEST 11-20' : 'PILOT MANIFEST';
        const headers = [
          { text: manifestLabel, x: geometry.rowX, anchorX: 0 },
          { text: 'SCORE / LEVEL', x: geometry.rowX + geometry.rowW, anchorX: 1 }
        ];
        headers.forEach(entry => {
          const text = createText(entry.text, headerStyle);
          text.x = entry.x;
          text.y = startY;
          text.anchor.set(entry.anchorX, 0);
          this.rowsContainer.addChild(text);
        });
      }

      const computeDisplayRank = (entry) => {
        const fallbackRank = Number(entry?.rank_index ?? entry?.rankIndex ?? entry?.rank);
        if (Number.isFinite(fallbackRank)) {
          return Math.max(0, Math.min(19, Math.floor(fallbackRank)));
        }
        const levelValue = Number(entry?.level ?? entry?.levelReached);
        if (Number.isFinite(levelValue)) {
          return Math.max(0, Math.min(19, Math.floor(getRankFromLevel(levelValue))));
        }
        return 0;
      };

      // Preload rank textures for visible entries
      const entriesToRender = entriesToDisplay.slice(0, maxRows);
      const rankTextures = await Promise.all(
        entriesToRender.map(async (entry) => {
          const displayRank = computeDisplayRank(entry);
          return RankAssets.loadRankTexture(displayRank).catch(() => null);
        })
      );

      entriesToRender.forEach((score, index) => {
        const columnIndex = desktopTwoColumn ? Math.floor(index / maxRowsPerColumn) : 0;
        const rowIndex = desktopTwoColumn ? index % maxRowsPerColumn : index;
        const {
          rowX,
          rowW,
          scoreBlockWidth,
          levelBlockWidth,
          rightPad,
          nameBlockWidth,
          columns
        } = getColumnGeometry(columnIndex);
        const y = rowsBaseY + rowHeight * rowIndex;
        const isTop3 = index < 3 && !score.isPending;
        const isPending = score.isPending || false;
        const rowY = y;
        const primaryY = rowY + (isMobile ? 6 : 7);
        const rowMidY = rowY + rowHeight * 0.5;
        const rowBg = new PIXI.Graphics();
        const medalAccents = [0xffd15c, 0x9fefff, 0xff9b5c];
        const medalFills = [0x1e1607, 0x081d2d, 0x261109];
        const accent = isPending ? 0xffaa44 : (isTop3 ? medalAccents[index] : (index % 2 === 0 ? 0x37f5ff : 0x7fffd8));
        const rowColor = isTop3 ? medalFills[index] : (index % 2 === 0 ? 0x03111f : 0x061827);

        if (isTop3) {
          const rowAura = new PIXI.Graphics();
          rowAura.roundRect(rowX - 2, rowY - 2, rowW + 4, rowHeight - 4, 7);
          rowAura.fill({ color: accent, alpha: index === 0 ? 0.15 : 0.1 });
          rowAura.filters = [new PIXI.BlurFilter(index === 0 ? 6 : 4)];
          this.rowsContainer.addChild(rowAura);
        }

        rowBg.roundRect(rowX, rowY, rowW, rowHeight - 2, 7);
        rowBg.fill({ color: rowColor, alpha: isTop3 ? 0.8 : 0.66 });
        rowBg.stroke({
          color: accent,
          width: isTop3 ? 1.5 : 1,
          alpha: isTop3 ? 0.74 : 0.32
        });
        rowBg.rect(rowX + 8, rowY + 6, 3, rowHeight - 14);
        rowBg.fill({ color: accent, alpha: isTop3 ? 0.78 : 0.42 });
        rowBg.rect(rowX + rowW - scoreBlockWidth - levelBlockWidth - 18, rowY + 8, 1, rowHeight - 18);
        rowBg.fill({ color: 0xffffff, alpha: 0.1 });
        rowBg.rect(rowX + 18, rowY + rowHeight - 10, rowW - 36, 1);
        rowBg.fill({ color: 0x7fffd8, alpha: isTop3 ? 0.22 : 0.1 });
        this.rowsContainer.addChild(rowBg);

        const rankStyle = isTop3 ? { ...rowStyle, fill: '#fff3a0' } : (isPending ? { ...rowStyle, fill: '#ffb45a' } : rowStyle);
        const nameStyle = isTop3 ? { ...rowStyle, fill: '#ffffff' } : (isPending ? { ...rowStyle, fill: '#ffaa44' } : rowStyle);

        const playerRankIndex = (score.rank_index !== null && score.rank_index !== undefined)
          ? score.rank_index
          : getRankFromLevel(score.level || 1);
        const clampedRank = Math.max(0, Math.min(19, playerRankIndex));
        const rankTitle = getRankTitle(clampedRank);
        const displayName = (score.name || '??').slice(0, isMobile ? 13 : 18).toUpperCase();

        const rankText = createText(`#${index + 1}`, {
          ...rankStyle,
          fontFamily: FONT_ARCADE,
          fontSize: rowStyle.fontSize + (isTop3 && !isMobile ? 1 : 0)
        });
        const nameText = createText(displayName, nameStyle);
        const rankNameText = createText(rankTitle, {
          fontFamily: FONT_ARCADE,
          fontSize: Math.max(isMobile ? 8 : 8, rowStyle.fontSize - (isMobile ? 4 : 4)),
          fill: isTop3 ? '#ffefaa' : '#9fd7e3',
          stroke: '#00131b',
          strokeThickness: 1
        });
        const scoreText = createText((score.score || 0).toLocaleString('en-US'), {
          ...(isTop3 ? nameStyle : (isPending ? nameStyle : rowStyle)),
          fontFamily: FONT_ARCADE,
          fontSize: rowStyle.fontSize + (isMobile ? 0 : 1)
        });
        const scoreLabel = createText(index === 0 ? 'LEAD' : 'SCORE', {
          fontFamily: FONT_ARCADE,
          fontSize: Math.max(8, rowStyle.fontSize - (isMobile ? 5 : 4)),
          fill: isTop3 ? '#ffe7a8' : '#6fb6c8',
          stroke: '#00131b',
          strokeThickness: 1
        });
        const levelText = createText(`LV ${score.level || 0}`, {
          ...rankStyle,
          fontSize: Math.max(10, rowStyle.fontSize - (isMobile ? 3 : 2))
        });

        rankText.anchor.set(0.5);
        rankText.x = columns.rank;
        rankText.y = rowMidY - 2;
        nameText.x = columns.name;
        nameText.y = primaryY;
        fitTextToWidth(nameText, nameBlockWidth, layout.isMobile ? 9 : 11);

        rankNameText.x = columns.name;
        rankNameText.y = Math.max(
          nameText.y + nameText.height + 1,
          rowY + rowHeight - rankNameText.height - (isMobile ? 8 : 5)
        );
        fitTextToWidth(rankNameText, nameBlockWidth, isMobile ? 7 : 9);

        scoreText.x = columns.score;
        scoreText.y = primaryY - 1;
        scoreLabel.x = columns.score;
        scoreLabel.y = Math.max(
          scoreText.y + scoreText.height + 1,
          rowY + rowHeight - scoreLabel.height - (isMobile ? 8 : 5)
        );
        levelText.x = columns.level;
        levelText.y = rowMidY;
        scoreText.anchor.set(1, 0);
        scoreLabel.anchor.set(1, 0);
        levelText.anchor.set(0.5);
        fitTextToWidth(scoreText, scoreBlockWidth, isMobile ? 10 : 12);

        const levelPill = new PIXI.Graphics();
        const pillWidth = isMobile ? 38 : 46;
        const pillHeight = isMobile ? 24 : 28;
        levelPill.roundRect(columns.level - pillWidth / 2, rowMidY - pillHeight / 2, pillWidth, pillHeight, 5);
        levelPill.fill({ color: 0x031725, alpha: 0.8 });
        levelPill.stroke({ color: accent, width: 1, alpha: isTop3 ? 0.72 : 0.34 });
        this.rowsContainer.addChild(levelPill);

        const rankTexture = rankTextures[index];
        const displayRank = computeDisplayRank(score);
        if (rankTexture) {
          const badgeGlow = new PIXI.Graphics();
          const glowSize = Math.min(rowHeight * 0.82, layout.isMobile ? 34 : 52);
          badgeGlow.circle(columns.badge, rowMidY, glowSize * 0.54);
          badgeGlow.fill({ color: accent, alpha: isTop3 ? 0.18 : 0.09 });
          badgeGlow.circle(columns.badge, rowMidY, glowSize * 0.36);
          badgeGlow.stroke({ color: 0xffffff, width: 1, alpha: isTop3 ? 0.26 : 0.14 });
          this.rowsContainer.addChild(badgeGlow);

          const rankSprite = new PIXI.Sprite(rankTexture);
          rankSprite.anchor.set(0.5);

          const targetHeight = Math.min(rowHeight * 0.72, layout.isMobile ? 32 : 48);
          const scale = targetHeight / rankTexture.height;
          rankSprite.scale.set(scale);

          rankSprite.x = columns.badge;
          rankSprite.y = rowMidY;
          rankSprite.alpha = 1;
          rankSprite.visible = true;

          this.rowsContainer.addChild(rankSprite);

          if (isDebug && index < 2) {
            // Debug log removed for stable release
          }
        } else if (isDebug) {
          const placeholder = new PIXI.Sprite(PIXI.Texture.WHITE);
          const size = layout.isMobile ? 10 : 12;
          placeholder.width = size;
          placeholder.height = size;
          placeholder.tint = 0xff3355;
          placeholder.alpha = 0.6;
          placeholder.anchor.set(0.5);
          placeholder.x = columns.badge;
          placeholder.y = rowMidY;
          this.rowsContainer.addChild(placeholder);
        }

        this.rowsContainer.addChild(rankText, nameText, rankNameText, scoreText, scoreLabel, levelText);
        this.rowLayoutDebug.push({
          index,
          row: {
            x: Math.round(rowX),
            y: Math.round(rowY),
            width: Math.round(rowW),
            height: Math.round(rowHeight - 2),
            right: Math.round(rowX + rowW),
            bottom: Math.round(rowY + rowHeight - 2)
          },
          rank: debugBounds(rankText),
          name: debugBounds(nameText),
          rankTitle: debugBounds(rankNameText),
          score: debugBounds(scoreText),
          scoreLabel: debugBounds(scoreLabel),
          level: debugBounds(levelText),
          scoreGroup: {
            x: Math.round(columns.score - scoreBlockWidth),
            y: Math.round(rowY + 4),
            width: Math.round(scoreBlockWidth + levelBlockWidth + 18),
            height: Math.round(rowHeight - 13),
            right: Math.round(rowX + rowW - rightPad),
            bottom: Math.round(rowY + rowHeight - 9)
          }
        });
      });

      if (entriesToDisplay.length > maxRows) {
        const moreGeometry = getColumnGeometry(columnCount - 1);
        const more = createText('...', rowStyle);
        more.x = moreGeometry.columns.name;
        more.y = rowsBaseY + rowHeight * Math.min(maxRowsPerColumn, maxRows) + 3;
        this.rowsContainer.addChild(more);
      }

      this.fadeInRows();
    } else {
      this.rowsContainer.alpha = 1;
      if (this.status === 'EMPTY') return;
      const message = translateText(this.status === 'EMPTY' ? 'No highscores yet. Be first!' : 'No data.');
      const empty = createText(message, {
        fontFamily: FONT_ARCADE,
        fontSize: getResponsiveFontSize(layout, 'body'),
        fill: '#ffffff',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: clampTextWidth(metrics.innerWidth, layout)
      });
      empty.anchor.set(0.5, 0);
      empty.x = metrics.x + metrics.width / 2;
      empty.y = startY;
      this.rowsContainer.addChild(empty);
    }
  }

  fadeInRows() {
    if (!this.game?.app?.ticker) return;
    if (this.rowsFadeTicker) {
      this.game.app.ticker.remove(this.rowsFadeTicker);
      this.rowsFadeTicker = null;
    }

    // Set initial state for staggered animation
    const children = this.rowsContainer.children;
    children.forEach((child, i) => {
      child.alpha = 0;
      child.y += 10; // Start slightly below final position
      child._startDelay = Math.min(i * 7, 160);
      child._animStart = 0;
      child._finalY = child.y - 10;
    });

    let elapsed = 0;
    const duration = 220;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;

      children.forEach((child) => {
        if (elapsed < child._startDelay) return;

        const localElapsed = elapsed - child._startDelay;
        const progress = Math.min(1, localElapsed / duration);

        // Ease out cubic for smooth entrance
        const eased = 1 - Math.pow(1 - progress, 3);

        child.alpha = eased;
        child.y = child._finalY + (1 - eased) * 10;
      });

      if (elapsed >= duration + children[children.length - 1]?._startDelay || 0) {
        children.forEach(child => {
          child.alpha = 1;
          child.y = child._finalY;
        });
        this.game.app.ticker.remove(ticker);
        this.rowsFadeTicker = null;
      }
    };
    this.rowsFadeTicker = ticker;
    this.game.app.ticker.add(ticker);
  }

  setupLargeBonusDrones(width, height) {
    this.largeBonusDrones = [];
    const texture = BonusAsset.getTexture();
    if (!texture || texture === PIXI.Texture.EMPTY) return;

    const largeBonusCoreCount = 3;
    for (let i = 0; i < largeBonusCoreCount; i++) {
      const can = new PIXI.Sprite(texture);
      const scale = 0.7 + Math.random() * 0.5; // 0.7-1.2 (much larger)
      can.scale.set(scale);
      can.anchor.set(0.5);
      can.alpha = 0.12 + Math.random() * 0.08; // 0.12-0.2 (more subtle)

      // Position near edges for background effect
      const edge = Math.random();
      if (edge < 0.5) {
        // Left side
        can.x = -can.width * 0.3 + Math.random() * 120;
      } else {
        // Right side
        can.x = width - 120 + Math.random() * 120 + can.width * 0.3;
      }
      can.y = Math.random() * height;

      // Very slow animation for big bonus cores - in units per second
      can._driftX = (Math.random() - 0.5) * 24; // pixels per second (±12 px/s, slower)
      can._driftY = (Math.random() - 0.5) * 24;
      can._rotSpeed = (Math.random() - 0.5) * 0.06; // radians per second (±0.03 rad/s, very slow)

      this.largeBonusDronesContainer.addChild(can);
      this.largeBonusDrones.push(can);
    }
  }

  setupBonusDrones(width, height) {
    this.bonusDrones = [];
    const texture = BonusAsset.getTexture();
    if (!texture || texture === PIXI.Texture.EMPTY) return;

    const canCount = 5;
    for (let i = 0; i < canCount; i++) {
      const can = new PIXI.Sprite(texture);
      const scale = 0.3 + Math.random() * 0.4; // 0.3-0.7
      can.scale.set(scale);
      can.anchor.set(0.5);
      can.alpha = 0.2 + Math.random() * 0.15; // 0.2-0.35

      // Random position
      const edge = Math.random();
      if (edge < 0.3) {
        // Left edge
        can.x = -can.width / 2 + Math.random() * 80;
      } else if (edge < 0.6) {
        // Right edge
        can.x = width - Math.random() * 80 + can.width / 2;
      } else {
        // Random across screen
        can.x = Math.random() * width;
      }
      can.y = Math.random() * height;

      // Animation properties (gentle floating) - in units per second
      can._driftX = (Math.random() - 0.5) * 40; // pixels per second (±20 px/s)
      can._driftY = (Math.random() - 0.5) * 40;
      can._rotSpeed = (Math.random() - 0.5) * 0.08; // radians per second (±0.04 rad/s)

      this.bonusDronesContainer.addChild(can);
      this.bonusDrones.push(can);
    }
  }

  setupPartyHeads(width, height) {
    this.partyHeads = [];
    const maxHeads = 10;
    const images = [];
    const headCount = images.length ? maxHeads : 0;

    for (let i = 0; i < headCount; i++) {
      const imagePath = images[i % images.length];
      const sprite = PIXI.Sprite.from(imagePath);
      const scale = 0.08 + Math.random() * 0.12; // 0.08-0.2
      sprite.scale.set(scale);
      sprite.anchor.set(0.5);
      sprite.alpha = 0.15 + Math.random() * 0.2; // 0.15-0.35
      sprite.x = Math.random() * width;
      sprite.y = Math.random() * height;

      // Animation properties (gentle floating) - in units per second
      sprite._driftX = (Math.random() - 0.5) * 50; // pixels per second (±25 px/s)
      sprite._driftY = (Math.random() - 0.5) * 50;
      sprite._rotSpeed = (Math.random() - 0.5) * 0.2; // radians per second (±0.1 rad/s)

      this.partyHeadsContainer.addChild(sprite);
      this.partyHeads.push(sprite);
    }
  }

  setupConfetti(width, height) {
    this.confettiParticles = [];
    const confettiColors = [0xffaa00, 0xff00ff, 0x00ffff, 0xffff00, 0xff4400, 0x00ff88];
    const particleCount = 12; // Fixed pool, intentionally quiet on the score deck

    for (let i = 0; i < particleCount; i++) {
      const particle = new PIXI.Graphics();
      const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      const size = 3 + Math.random() * 4; // 3-7 pixels

      // Simple rectangle confetti
      particle.rect(0, 0, size, size * 1.5);
      particle.fill({ color, alpha: 0.34 });

      particle.x = Math.random() * width;
      particle.y = Math.random() * -height; // Start above screen
      particle.rotation = Math.random() * Math.PI * 2;

      // Physics properties - in units per second
      particle._vy = 40 + Math.random() * 60; // Fall speed (40-100 px/s)
      particle._vx = (Math.random() - 0.5) * 30; // Horizontal drift (±15 px/s)
      particle._rotSpeed = (Math.random() - 0.5) * 4; // Rotation speed (±2 rad/s)

      this.confettiContainer.addChild(particle);
      this.confettiParticles.push(particle);
    }
  }

  drawScanline(width, height) {
    if (!this.scanlineOverlay) return;
    this.scanlineOverlay.clear();

    // Subtle scanline effect
    for (let y = 0; y < height; y += 4) {
      this.scanlineOverlay.rect(0, y, width, 2);
      this.scanlineOverlay.fill({ color: 0x000000, alpha: 0.05 });
    }

    // Shimmer gradient
    this.scanlineOverlay.rect(0, 0, width, height);
    this.scanlineOverlay.fill({ color: 0xffffff, alpha: 0.02 });
  }

  drawBackdropShade(width, height) {
    if (!this.backdropShade) return;
    this.backdropShade.clear();
    this.backdropShade.rect(0, 0, width, height);
    this.backdropShade.fill({ color: 0x020711, alpha: 0.1 });

    const leftWash = Math.min(width * 0.54, 780);
    this.backdropShade.rect(0, 0, leftWash, height);
    this.backdropShade.fill({ color: 0x020711, alpha: width < 720 ? 0.58 : 0.44 });

    this.backdropShade.rect(0, height * 0.68, width, height * 0.32);
    this.backdropShade.fill({ color: 0x000000, alpha: 0.16 });
  }

  drawTitlePlate(width, layout) {
    if (!this.titlePlate || !this.title) return;
    this.titlePlate.clear();
    const metrics = this.tableMetrics;
    if (!metrics) return;
    const x = metrics.x;
    const y = metrics.y;
    const w = metrics.width;
    const h = Math.min(metrics.height, layout.isMobile ? 164 : 188);
    const pad = layout.isMobile ? 18 : 24;
    const plateX = x + pad;
    const plateY = y + (layout.isMobile ? 12 : 10);
    const plateW = w - pad * 2;
    const plateH = layout.isMobile ? 108 : 126;
    const centerX = plateX + plateW / 2;
    const accent = this.activeLeaderboard === LeaderboardView.LOCAL
      ? 0xffd166
      : this.activeLeaderboard === LeaderboardView.FRIENDS
        ? 0xff55d9
        : 0x00f6ff;

    this.titlePlate.roundRect(plateX - 10, plateY - 8, plateW + 20, plateH + 16, 10);
    this.titlePlate.fill({ color: accent, alpha: 0.06 });
    this.titlePlate.roundRect(plateX, plateY, plateW, plateH, 8);
    this.titlePlate.fill({ color: 0x02101e, alpha: 0.42 });
    this.titlePlate.roundRect(plateX, plateY, plateW, plateH, 8);
    this.titlePlate.stroke({ color: 0x37f5ff, width: 1.5, alpha: 0.5 });
    this.titlePlate.roundRect(plateX + 8, plateY + 8, plateW - 16, plateH - 16, 6);
    this.titlePlate.stroke({ color: 0xff55d9, width: 1, alpha: 0.22 });

    this.titlePlate.rect(plateX + 24, plateY + 14, plateW - 48, 2);
    this.titlePlate.fill({ color: 0x7fffd8, alpha: 0.42 });
    this.titlePlate.rect(plateX + 52, plateY + plateH - 18, plateW - 104, 2);
    this.titlePlate.fill({ color: accent, alpha: 0.42 });
    this.titlePlate.rect(plateX + 24, plateY + 38, plateW - 48, 1);
    this.titlePlate.fill({ color: 0xff55d9, alpha: 0.2 });

    const bracketW = layout.isMobile ? 34 : 48;
    const bracketH = layout.isMobile ? 24 : 32;
    const cornerY = plateY + plateH * 0.5;
    this.titlePlate.poly([
      plateX + 16, cornerY,
      plateX + 16 + bracketW, cornerY - bracketH,
      plateX + 16 + bracketW + 10, cornerY - bracketH + 8,
      plateX + 28, cornerY,
      plateX + 16 + bracketW + 10, cornerY + bracketH - 8,
      plateX + 16 + bracketW, cornerY + bracketH
    ]);
    this.titlePlate.stroke({ color: accent, width: 2, alpha: 0.48 });
    this.titlePlate.poly([
      plateX + plateW - 16, cornerY,
      plateX + plateW - 16 - bracketW, cornerY - bracketH,
      plateX + plateW - 16 - bracketW - 10, cornerY - bracketH + 8,
      plateX + plateW - 28, cornerY,
      plateX + plateW - 16 - bracketW - 10, cornerY + bracketH - 8,
      plateX + plateW - 16 - bracketW, cornerY + bracketH
    ]);
    this.titlePlate.stroke({ color: 0xff55d9, width: 2, alpha: 0.38 });

    this.titlePlate.circle(centerX, plateY + 16, layout.isMobile ? 4 : 5);
    this.titlePlate.fill({ color: accent, alpha: 0.64 });
    this.titlePlate.circle(centerX, plateY + plateH - 16, layout.isMobile ? 3 : 4);
    this.titlePlate.fill({ color: 0xffd15c, alpha: 0.54 });
    this.titlePlate.roundRect(centerX - (layout.isMobile ? 58 : 74), plateY + plateH - 7, layout.isMobile ? 116 : 148, 6, 3);
    this.titlePlate.fill({ color: 0xffd15c, alpha: 0.2 });
  }

  drawLeaderboardPanel(width, height, rowsStartY, layout) {
    if (!this.leaderboardPanel) return;
    this.leaderboardPanel.clear();
    const metrics = this.tableMetrics;
    if (!metrics) return;

    const panelX = metrics.x;
    const panelY = metrics.y;
    const panelWidth = metrics.width;
    const panelHeight = metrics.height;
    const innerPad = layout.isMobile ? 9 : 10;

    this.leaderboardPanel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    this.leaderboardPanel.fill({ color: 0x020711, alpha: layout.isMobile ? 0.62 : 0.46 });
    this.leaderboardPanel.stroke({ color: 0x37f5ff, width: 1, alpha: 0.48 });

    this.leaderboardPanel.roundRect(panelX + innerPad, panelY + innerPad, panelWidth - innerPad * 2, panelHeight - innerPad * 2, 6);
    this.leaderboardPanel.fill({ color: 0x02101e, alpha: 0.16 });
    this.leaderboardPanel.stroke({ color: 0xff55d9, width: 1, alpha: 0.2 });

    this.leaderboardPanel.rect(panelX, panelY + 28, 4, panelHeight - 56);
    this.leaderboardPanel.fill({ color: 0x37f5ff, alpha: 0.56 });
    this.leaderboardPanel.rect(panelX + panelWidth - 4, panelY + 54, 4, panelHeight - 108);
    this.leaderboardPanel.fill({ color: 0xff55d9, alpha: 0.42 });
    this.leaderboardPanel.rect(panelX + 24, panelY + panelHeight - 22, panelWidth - 48, 2);
    this.leaderboardPanel.fill({ color: 0xffd15c, alpha: 0.32 });

    if (this.holoRails) {
      this.holoRails.clear();
      const railTop = panelY + 42;
      const railHeight = panelHeight - 84;
      this.holoRails.roundRect(panelX - 7, railTop, 5, railHeight, 3);
      this.holoRails.fill({ color: 0x37f5ff, alpha: 0.2 });
      this.holoRails.roundRect(panelX + panelWidth + 2, railTop + 26, 5, railHeight - 52, 3);
      this.holoRails.fill({ color: 0xff55d9, alpha: 0.18 });
    }

    this.panelBottomY = panelY + panelHeight;
  }

  drawStatsDeck(width, height, layout) {
    if (!this.statsDeck || !this.tableMetrics) return;
    this.statsDeck.clear();
    const metrics = this.tableMetrics;
    const deckWidth = metrics.innerWidth;
    const deckHeight = layout.isMobile ? 18 : 22;
    const x = metrics.innerX;
    const y = metrics.footerY - deckHeight / 2;
    const loadedCount = this.status === 'LOADED' ? this.entries.length : 0;
    const topScore = loadedCount
      ? Math.max(...this.entries.map(entry => Number(entry?.score) || 0)).toLocaleString('en-US')
      : '0';
    const viewColor = this.activeLeaderboard === LeaderboardView.LOCAL
      ? 0xffd166
      : this.activeLeaderboard === LeaderboardView.FRIENDS
        ? 0xff55d9
        : 0x00f6ff;

    this.statsDeck.rect(x, y, deckWidth, 1);
    this.statsDeck.fill({ color: 0x7fffd8, alpha: 0.22 });
    this.statsDeck.rect(x, y + deckHeight, deckWidth * 0.44, 1);
    this.statsDeck.fill({ color: viewColor, alpha: 0.32 });

    if (!this.statsText) {
      this.statsText = createText('', {
        fontFamily: FONT_ARCADE,
        fontSize: 13,
        fill: '#caffff',
        align: 'left'
      });
      this.statsText.anchor.set(0, 0.5);
      this.statsText.zIndex = 6;
      this.container.addChild(this.statsText);
    } else if (!this.statsText.parent) {
      this.container.addChild(this.statsText);
    }

    const syncLabel = (this.leaderboardAdapter?.getSourceLabel?.(this.activeLeaderboard) || (
      this.activeLeaderboard === LeaderboardView.LOCAL ? 'LOCAL MEMORY' : 'LIVE ORBIT'
    )).toUpperCase();
    const countLabel = loadedCount ? `${loadedCount} ${translateText('SIGNALS')}` : translateText(this.status);
    const translatedSyncLabel = translateText(syncLabel);
    const bestLabel = translateText('BEST');
    this.statsText.text = layout.isMobile
      ? `TFG // ${translatedSyncLabel} // ${countLabel} // ${bestLabel} ${topScore}`
      : `TINYFOUNDRY GAMES // ${translatedSyncLabel} // ${countLabel} // ${bestLabel} ${topScore}`;
      this.statsText.style.fontSize = layout.isMobile ? 9 : 12;
    this.statsText.anchor.set(0, 0.5);
    this.statsText.style.align = 'left';
    this.statsText.x = x;
    this.statsText.y = y + deckHeight / 2;
    fitTextToWidth(this.statsText, deckWidth, layout.isMobile ? 7 : 9);
  }

  startAnimationLoop() {
    if (!this.game?.app?.ticker) return;
    if (this.animationTicker) {
      this.game.app.ticker.remove(this.animationTicker);
    }

    this.animationTicker = (delta) => {
      // Use delta.deltaMS for milliseconds, clamp to avoid huge jumps when tab is inactive
      const dtSec = Math.min(0.05, (delta.deltaMS || 16.67) / 1000);
      const { width, height } = this.game.app.screen;

      // Animate large bonus cores (background)
      this.largeBonusDrones.forEach(can => {
        can.x += can._driftX * dtSec;
        can.y += can._driftY * dtSec;
        can.rotation += can._rotSpeed * dtSec;

        // Wrap around
        if (can.x < -can.width) can.x = width + can.width / 2;
        if (can.x > width + can.width) can.x = -can.width / 2;
        if (can.y < -can.height) can.y = height + can.height / 2;
        if (can.y > height + can.height) can.y = -can.height / 2;
      });

      // Animate bonus cores
      this.bonusDrones.forEach(can => {
        can.x += can._driftX * dtSec;
        can.y += can._driftY * dtSec;
        can.rotation += can._rotSpeed * dtSec;

        // Wrap around
        if (can.x < -can.width) can.x = width + can.width / 2;
        if (can.x > width + can.width) can.x = -can.width / 2;
        if (can.y < -can.height) can.y = height + can.height / 2;
        if (can.y > height + can.height) can.y = -can.height / 2;
      });

      // Animate party heads
      this.partyHeads.forEach(head => {
        head.x += head._driftX * dtSec;
        head.y += head._driftY * dtSec;
        head.rotation += head._rotSpeed * dtSec;

        // Wrap around
        if (head.x < -head.width) head.x = width + head.width / 2;
        if (head.x > width + head.width) head.x = -head.width / 2;
        if (head.y < -head.height) head.y = height + head.height / 2;
        if (head.y > height + head.height) head.y = -head.height / 2;
      });

      // Animate confetti
      this.confettiParticles.forEach(particle => {
        particle.x += particle._vx * dtSec;
        particle.y += particle._vy * dtSec;
        particle.rotation += particle._rotSpeed * dtSec;

        // Recycle when off screen
        if (particle.y > height + 20) {
          particle.y = -20;
          particle.x = Math.random() * width;
        }
        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
      });

      // Title pulse glow
      if (this.title) {
        const pulse = 0.7 + Math.sin(Date.now() * 0.002) * 0.3;
        this.title.style.dropShadowAlpha = pulse * 0.7;
      }

    };

    this.game.app.ticker.add(this.animationTicker);
  }

  createButton(text) {
    const container = new PIXI.Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container._buttonWidth = 160;
    container._buttonHeight = 40;

    const bg = new PIXI.Graphics();
    container.addChild(bg);

    const label = createText(text, {
      fontFamily: FONT_DISPLAY,
      fontSize: 16,
      fontWeight: '800',
      fill: '#c9fbff',
      stroke: '#031323',
      strokeThickness: 3,
      padding: 8
    });
    label.anchor.set(0.5);
    container.addChild(label);

    const glow = new PIXI.Graphics();
    glow.filters = [new PIXI.BlurFilter(8)];
    const focus = new PIXI.Graphics();
    container.addChildAt(focus, 0);
    container.addChildAt(glow, 0);
    container._bg = bg;
    container._label = label;
    container._glow = glow;
    container._focus = focus;
    this.setButtonActive(container, false);

    container.on('pointerover', () => {
      this.setHighscoreFocusByButton(container);
      this.drawButtonChrome(container, {
        active: Boolean(container._active),
        hover: true
      });
    });

    container.on('pointerout', () => {
      this.setButtonActive(container, Boolean(container._active));
    });

    container.on('pointerdown', () => {
      container.scale.set(0.95);
    });

    container.on('pointerup', () => {
      container.scale.set(1);
    });

    return container;
  }

  resizeButton(button, width = 160, height = 40) {
    if (!button) return;
    button._buttonWidth = width;
    button._buttonHeight = height;
    if (button._label) {
      button._label.style.fontSize = Math.max(12, Math.min(18, height * 0.42));
    }
    this.setButtonActive(button, Boolean(button._active));
  }

  drawButtonChrome(button, { active = false, hover = false } = {}) {
    if (!button?._bg || !button?._glow) return;
    const width = button._buttonWidth || 160;
    const height = button._buttonHeight || 40;
    const x = -width / 2;
    const y = -height / 2;
    const frameColor = active ? 0xffd15c : (hover ? 0xffffff : 0x37f5ff);
    const fillColor = active ? 0x10203b : (hover ? 0x06314f : 0x04182d);
    const fillAlpha = hover ? 0.82 : (active ? 0.74 : 0.6);
    const focused = Boolean(button._focused);

    if (button._focus) {
      button._focus.clear();
      if (focused) {
        button._focus.roundRect(x - 5, y - 5, width + 10, height + 10, 8);
        button._focus.stroke({ color: 0xffef7e, width: 2, alpha: 0.86 });
      }
    }

    button._bg.clear();
    button._bg.roundRect(x, y, width, height, 7);
    button._bg.fill({ color: fillColor, alpha: fillAlpha });
    button._bg.stroke({ color: focused ? 0xffffff : frameColor, width: active || hover || focused ? 2 : 1.5, alpha: active || hover || focused ? 0.82 : 0.5 });
    button._bg.rect(x + 10, y + 7, 4, height - 14);
    button._bg.fill({ color: active ? 0xffd15c : 0xff55d9, alpha: hover ? 0.9 : 0.62 });
    button._bg.rect(x + width - 14, y + 7, 4, height - 14);
    button._bg.fill({ color: active ? 0x37f5ff : 0xffd15c, alpha: hover ? 0.82 : 0.48 });
    button._bg.moveTo(x + 22, y);
    button._bg.lineTo(x + width - 22, y);
    button._bg.stroke({ color: 0xffffff, width: 1, alpha: hover ? 0.18 : 0.08 });
    button._bg.moveTo(x + 22, y + height - 7);
    button._bg.lineTo(x + width - 22, y + height - 7);
    button._bg.stroke({ color: 0x7fffd8, width: 1, alpha: hover ? 0.38 : 0.18 });

    button._glow.clear();
    button._glow.roundRect(x - 2, y - 2, width + 4, height + 4, 8);
    button._glow.fill({ color: active ? 0xffd15c : 0x37f5ff, alpha: active ? 0.18 : (hover ? 0.16 : 0) });
  }

  setButtonActive(button, active = false) {
    if (!button?._bg || !button?._label || !button?._glow) return;
    button._active = Boolean(active);
    this.drawButtonChrome(button, { active });
    button._label.style.fill = active ? '#faffd7' : '#c9fbff';
  }

  getVisibleControls() {
    return (this.focusableControls || []).filter((control) =>
      control?.button && control.button.visible !== false && control.button.eventMode !== 'none'
    );
  }

  setHighscoreFocusByButton(button) {
    const visible = this.getVisibleControls();
    const index = visible.findIndex((control) => control.button === button);
    if (index >= 0) this.setHighscoreFocus(index);
  }

  setHighscoreFocus(index) {
    const visible = this.getVisibleControls();
    if (!visible.length) return;
    const next = ((index % visible.length) + visible.length) % visible.length;
    this.focusableControls.forEach((control) => {
      if (!control.button) return;
      control.button._focused = visible[next]?.button === control.button;
      this.drawButtonChrome(control.button, { active: Boolean(control.button._active) });
    });
    this.focusedControlIndex = next;
  }

  moveHighscoreFocus(delta) {
    this.setHighscoreFocus(this.focusedControlIndex + delta);
  }

  activateHighscoreFocus() {
    const visible = this.getVisibleControls();
    visible[this.focusedControlIndex]?.activate?.();
  }

  setupKeyboardNavigation() {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler, true);
    this.keyHandler = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.game.switchScene('menu');
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.moveHighscoreFocus(-1);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'Tab') {
        event.preventDefault();
        this.moveHighscoreFocus(event.shiftKey ? -1 : 1);
      } else if (event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        this.activateHighscoreFocus();
      }
    };
    window.addEventListener('keydown', this.keyHandler, true);
  }

  update() {
    const nav = this.gamepadNavigator.update();
    if (!nav.connected || !nav.active) return;
    if (nav.pressed.left || nav.pressed.up) this.moveHighscoreFocus(-1);
    if (nav.pressed.right || nav.pressed.down) this.moveHighscoreFocus(1);
    if (nav.pressed.confirm) this.activateHighscoreFocus();
    if (nav.pressed.cancel || nav.pressed.back || nav.pressed.menu) this.game.switchScene('menu');
  }

  destroy() {
    if (this.layoutUnsubscribe) {
      this.layoutUnsubscribe();
      this.layoutUnsubscribe = null;
    }
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
    if (this.rowsFadeTicker && this.game?.app?.ticker) {
      this.game.app.ticker.remove(this.rowsFadeTicker);
      this.rowsFadeTicker = null;
    }
    if (this.animationTicker && this.game?.app?.ticker) {
      this.game.app.ticker.remove(this.animationTicker);
      this.animationTicker = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
    this.largeBonusDrones = [];
    this.bonusDrones = [];
    this.partyHeads = [];
    this.confettiParticles = [];
  }
}
