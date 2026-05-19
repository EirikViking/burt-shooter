import * as PIXI from 'pixi.js';
import { API } from '../api/API.js';
import { LocalLeaderboard } from '../api/LocalLeaderboard.js';
import { BUILD_ID } from '../buildInfo.js';
import { addResponsiveListener } from '../ui/responsiveLayout.js';
import { createTextLayout, createVerticalStack, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';
import { BonusAsset } from '../utils/BonusAsset.js';
import { getRankFromScore, getRankTitle } from '../shared/RankPolicy.js';
import { RankAssets } from '../utils/RankAssets.js';
import { createText } from '../utils/pixiText.js';
import { AssetManifest } from '../assets/assetManifest.js';


const API_PATH = '/api/highscores';
// Timeout now handled by API retry logic
const BLOCKED_PUBLIC_NAME_TERMS = [
  ['E', 'IRIK'].join(''),
  ['K', 'LAUS'].join(''),
  ['F', 'ITTE'].join(''),
  ['K', 'UKEN'].join(''),
  ['FAT', 'MAN'].join(''),
  ['MOR', 'DER'].join('')
];

function toPublicPilotName(rawName, fallbackSeed = 0) {
  const cleaned = String(rawName || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
  const seed = Math.abs(Number(fallbackSeed) || 0).toString().slice(-2).padStart(2, '0');
  if (!cleaned) return `PILOT${seed}`;
  if (BLOCKED_PUBLIC_NAME_TERMS.some(term => cleaned.includes(term))) return `PILOT${seed}`;
  return cleaned;
}

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
    this.globalBtn = null;
    this.localBtn = null;
    this.buildStamp = null;
    this.status = 'LOADING';
    this.activeLeaderboard = 'global';
    this.entries = [];
    this.entriesNormalized = [];
    this.lastError = 'none';
    this.loadingTimer = null;
    this.apiUrl = new URL(API_PATH, window.location.origin).toString();
    this.fetchToken = 0;
    this.fetchController = null;
    this.rowsFadeTicker = null;
    this.retryAttempt = 0; // Track retry attempts for UI feedback

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
    this.status = 'LOADING';
    this.lastError = 'none';
    this.boardOpenTime = Date.now();
    this.activeLeaderboard = this.game.leaderboardView === 'local' ? 'local' : 'global';

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
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: getResponsiveFontSize(layout, 'score'),
      fill: '#faffd7',
      stroke: '#00f6ff',
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: '#ff37d6',
      dropShadowBlur: 12,
      dropShadowDistance: 0,
      dropShadowAlpha: 0.7
    });
    this.title.anchor.set(0.5);
    this.title.zIndex = 4;
    this.container.addChild(this.title);

    this.subtitle = createText('Arcade legends and brave initials', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: getResponsiveFontSize(layout, 'subtitle'),
      fill: '#9cfbff',
      stroke: '#00131b',
      strokeThickness: 2
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

    this.globalBtn = this.createButton('GLOBAL');
    this.globalBtn.on('pointerdown', () => this.setLeaderboardView('global'));
    this.globalBtn.zIndex = 5;
    this.container.addChild(this.globalBtn);

    this.localBtn = this.createButton('LOCAL');
    this.localBtn.on('pointerdown', () => this.setLeaderboardView('local'));
    this.localBtn.zIndex = 5;
    this.container.addChild(this.localBtn);

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
    const nextView = view === 'local' ? 'local' : 'global';
    if (this.activeLeaderboard === nextView && this.status !== 'ERROR') return;
    this.activeLeaderboard = nextView;
    this.game.leaderboardView = nextView;
    this.loadActiveLeaderboard();
  }

  loadActiveLeaderboard() {
    if (this.activeLeaderboard === 'local') {
      this.loadLocalHighscores();
    } else {
      this.fetchHighscores();
    }
    this.updateLeaderboardChrome();
  }

  loadLocalHighscores() {
    this.fetchToken += 1;
    this.lastError = 'none';
    const scores = LocalLeaderboard.getScores(10);
    this.entries = scores;
    this.entriesNormalized = this.normalizeEntries(scores);
    this.comment.text = scores.length > 0
      ? 'Local cabinet records loaded.'
      : 'No local scores yet. First entry is open.';
    this.setState(scores.length > 0 ? 'LOADED' : 'EMPTY');
  }

  updateLeaderboardChrome() {
    if (this.title) {
      this.title.text = this.activeLeaderboard === 'local' ? 'LOCAL SCORES' : 'GLOBAL SCORES';
    }
    this.updateToggleStyles();
  }

  updateToggleStyles() {
    this.setButtonActive(this.globalBtn, this.activeLeaderboard === 'global');
    this.setButtonActive(this.localBtn, this.activeLeaderboard === 'local');
  }

  async layoutHighscore() {
    const { width, height } = this.game.app.screen;
    const layout = createTextLayout(width, height);
    const stack = createVerticalStack(layout, { startY: layout.padding, spacing: layout.spacing });
    this.layoutBackdrop(this.backdropSprite, width, height);
    this.drawBackdropShade(width, height);

    this.title.style.fontSize = Math.min(getResponsiveFontSize(layout, 'score'), layout.isMobile ? 34 : 58);
    this.subtitle.style.fontSize = Math.min(getResponsiveFontSize(layout, 'subtitle'), layout.isMobile ? 15 : 22);
    this.comment.style.fontSize = Math.min(getResponsiveFontSize(layout, 'body'), layout.isMobile ? 14 : 18);
    this.comment.style.wordWrapWidth = clampTextWidth(width * 0.9, layout);
    this.stateMessage.style.fontSize = getResponsiveFontSize(layout, 'body');
    this.stateMessage.style.fontSize = getResponsiveFontSize(layout, 'body');
    this.statusText.style.fontSize = getResponsiveFontSize(layout, 'small');

    // Title block
    this.title.x = width / 2;
    this.title.y = stack.placeElement(this.title, layout.spacing * 0.15);

    this.subtitle.x = width / 2;
    this.subtitle.y = stack.placeElement(this.subtitle, layout.spacing * 0.1);
    this.drawTitlePlate(width, layout);

    const toggleY = stack.getCurrentY() + (layout.isMobile ? 12 : 20);
    if (this.globalBtn && this.localBtn) {
      const toggleGap = layout.isMobile ? 76 : 96;
      this.globalBtn.x = width / 2 - toggleGap;
      this.globalBtn.y = toggleY;
      this.localBtn.x = width / 2 + toggleGap;
      this.localBtn.y = toggleY;
      this.resizeButton(this.globalBtn, layout.isMobile ? 132 : 168, layout.isMobile ? 34 : 40);
      this.resizeButton(this.localBtn, layout.isMobile ? 132 : 168, layout.isMobile ? 34 : 40);
      stack.addGap(layout.isMobile ? 42 : 52);
    }

    this.comment.x = width / 2;
    this.comment.y = stack.placeElement(this.comment, layout.spacing * 0.4);

    this.stateMessage.visible = this.status !== 'LOADED';
    const headerY = this.stateMessage.visible
      ? stack.placeElement(this.stateMessage, layout.spacing * 0.2)
      : stack.getCurrentY() + layout.spacing * 0.25;
    this.stateMessage.y = headerY;
    this.stateMessage.x = width / 2;

    // Rows start after status message
    const rowsStartY = headerY + (this.stateMessage.visible ? layout.lineHeight * 0.9 : layout.lineHeight * 0.15) + layout.spacing * (layout.isMobile ? 0.2 : 0.35);

    // Draw dark panel behind leaderboard for readability
    this.drawLeaderboardPanel(width, height, rowsStartY, layout);
    this.drawStatsDeck(width, height, layout);

    await this.renderHighscoreRows(rowsStartY, layout);

    // Retry/back & diag
    const buttonY = height - layout.padding - (layout.isMobile ? 70 : 50);
    this.retryBtn.x = width / 2 - 80;
    this.retryBtn.y = buttonY;
    this.retryBtn.visible = this.status === 'ERROR';

    this.backBtn.x = width / 2 + 80;
    this.backBtn.y = buttonY;

    this.statusText.x = layout.padding;
    this.statusText.y = height - layout.padding * 1.5;
    this.statusText.text = ''; // Debug line removed

    // TASK C: Build stamp layout removed
    // this.buildStamp.x = width - layout.padding / 2;
    // this.buildStamp.y = height - layout.padding / 2;
  }

  async fetchHighscores() {
    if (this.activeLeaderboard === 'local') {
      this.loadLocalHighscores();
      return;
    }
    this.fetchToken += 1;
    const token = this.fetchToken;
    this.setState('LOADING');
    this.lastError = 'none';
    this.retryAttempt = 0;

    const startTime = Date.now();
    const isDev = window.location.search.includes('debug=1');
    if (isDev) console.log('[HighscoreScene] Fetching highscores with retry logic');

    try {
      // Use cache for fast display - 30 second TTL in API client
      const data = await API.getHighscores({
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

      const parseStart = Date.now();

      // TASK A: Enforce max 10 entries
      let rawEntries = Array.isArray(data) ? data : [];
      rawEntries.sort((a, b) => (b.score || 0) - (a.score || 0)); // Sort descending by score
      this.entries = rawEntries.slice(0, 10); // Keep only top 10
      this.entriesNormalized = this.normalizeEntries(this.entries);

      if (isDev) {
        const parseTime = Date.now() - parseStart;
        console.log(`[HighscoreScene] Parse/normalize completed in ${parseTime}ms`);
      }

      const renderStart = Date.now();

      this.comment.text = this.entries.length > 0
        ? 'Global leaderboard records loaded.'
        : 'Global board is ready for its first signal.';
      if (this.entries.length > 0) {
        this.setState('LOADED');
      } else {
        this.setState('EMPTY');
      }

      if (isDev) {
        const renderTime = Date.now() - renderStart;
        const totalTime = Date.now() - startTime;
        console.log(`[HighscoreScene] Render completed in ${renderTime}ms, Total: ${totalTime}ms`);
      }
    } catch (error) {
      this.handleFetchError(error, token);
    }
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
    switch (newState) {
      case 'LOADED':
        if (this.activeLeaderboard === 'local') {
          this.stateMessage.text = globalResult
            ? `Local board loaded. Global: ${globalResult}.`
            : 'Local board loaded.';
        } else {
          this.stateMessage.text = globalResult
            ? `Global board loaded. Last run: ${globalResult}.`
            : 'Global board loaded.';
        }
        break;
      case 'EMPTY':
        this.stateMessage.text = this.activeLeaderboard === 'local'
          ? 'No local scores yet. Be the first legend here.'
          : 'No global scores yet. Be the first legend online.';
        break;
      case 'ERROR':
        this.stateMessage.text = this.activeLeaderboard === 'global'
          ? `Global board offline. Local scores are safe.`
          : `Error: ${this.lastError}`;
        break;
      default:
        this.stateMessage.text = this.activeLeaderboard === 'global' ? 'Loading global board...' : 'Loading local board...';
    }
    this.updateLeaderboardChrome();
    this.layoutHighscore();
  }

  normalizeEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const scoreNum = Number(raw.score);
    const levelNum = Number(raw.level);
    const rankValue = raw.rank_index ?? raw.rankIndex ?? raw.rank;
    const rankNum = Number(rankValue);
    const safeScore = Number.isFinite(scoreNum) ? scoreNum : 0;
    const safeLevel = Number.isFinite(levelNum) ? levelNum : 0;
    const safeRank = Number.isFinite(rankNum) ? rankNum : getRankFromScore(safeScore);
    const nameValue = raw.name ?? raw.playerName ?? '';
    const name = toPublicPilotName(nameValue, raw.id ?? safeScore);
    if (!name) return null;

    return {
      name,
      score: safeScore,
      level: safeLevel,
      rank_index: safeRank  // CRITICAL FIX: Must be rank_index not rank!
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
    if (this.status === 'LOADED') {
      const isDebug = window.location.search.includes('debug=1');
      let entriesToDisplay = [...this.entries];

      const rowStyle = {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: Math.max(10, Math.min(getResponsiveFontSize(layout, 'tableRow'), layout.isMobile ? 12 : 13)),
        fill: '#e8fcff',
        stroke: '#00131b',
        strokeThickness: 2
      };

      // TASK C: Dynamic column positioning based on longest name
      // Calculate the longest name width to ensure proper spacing
      let maxNameWidth = 120; // Minimum name column width
      if (entriesToDisplay.length > 0) {
        const tempText = createText('', rowStyle);
        entriesToDisplay.forEach(entry => {
          const displayName = (entry.name || 'NoName').slice(0, 20).toUpperCase();
          tempText.text = displayName;
          maxNameWidth = Math.max(maxNameWidth, tempText.width);
        });
        tempText.destroy();
      }

      // Add buffer space after name column
      const metrics = this.tableMetrics || {
        innerX: layout.padding,
        innerY: startY,
        innerWidth: layout.width - layout.padding * 2,
        width: layout.width - layout.padding * 2,
        y: startY,
        bottom: layout.height - layout.padding
      };
      const contentX = metrics.innerX;
      const contentWidth = metrics.innerWidth;
      const nameColumnEnd = contentX + contentWidth * (layout.isMobile ? 0.23 : 0.2) + maxNameWidth + 20;
      const scoreColumnWidth = layout.isMobile ? 102 : 150;
      const columns = {
        rank: contentX,
        badge: contentX + (layout.isMobile ? 32 : 48),
        name: contentX + contentWidth * (layout.isMobile ? 0.18 : 0.16),
        score: Math.max(nameColumnEnd + 24, contentX + contentWidth - scoreColumnWidth - (layout.isMobile ? 44 : 82)),
        level: contentX + contentWidth
      };
      const visibleTargetRows = Math.max(1, Math.min(10, entriesToDisplay.length || 10));
      const minRowHeight = Math.max(layout.isMobile ? 39 : 38, layout.lineHeight * (layout.isMobile ? 1.55 : 1.45));
      const maxRowHeight = layout.isMobile ? 46 : 58;
      const rowSpace = Math.max(minRowHeight, (metrics.bottom - startY - 10) / (visibleTargetRows + 1));
      const rowHeight = Math.max(minRowHeight, Math.min(maxRowHeight, rowSpace));
      const maxRows = Math.max(4, Math.min(10, Math.floor((metrics.bottom - startY + 4) / rowHeight) - 1));

      const headerStyle = {
        ...rowStyle,
        fill: '#ffdf8a',
        fontSize: Math.max(10, rowStyle.fontSize - 3),
        strokeThickness: 2
      };
      const headerBar = new PIXI.Graphics();
      headerBar.roundRect(metrics.x + 14, startY - 7, metrics.width - 28, layout.lineHeight * 1.05, 4);
      headerBar.fill({ color: 0x062845, alpha: 0.72 });
      headerBar.stroke({ color: 0xffd166, width: 1, alpha: 0.35 });
      this.rowsContainer.addChild(headerBar);

      const headers = [
        { text: 'POS', x: columns.rank },
        { text: 'PILOT', x: columns.name },
        { text: 'SCORE', x: columns.score },
        { text: layout.isMobile ? 'LV' : 'LEVEL', x: columns.level }
      ];
      headers.forEach(entry => {
        const text = createText(entry.text, headerStyle);
        text.x = entry.x;
        text.y = startY;
        if (entry.text === 'SCORE' || entry.text === 'LEVEL') {
          text.anchor.set(1, 0);
        }
        this.rowsContainer.addChild(text);
      });

      const computeDisplayRank = (entry) => {
        const scoreValue = Number(entry?.score);
        if (Number.isFinite(scoreValue)) {
          const rankFromScore = getRankFromScore(scoreValue);
          return Math.max(0, Math.min(19, Math.floor(rankFromScore)));
        }
        const fallbackRank = Number(entry?.rank_index ?? entry?.rankIndex ?? entry?.rank);
        if (Number.isFinite(fallbackRank)) {
          return Math.max(0, Math.min(19, Math.floor(fallbackRank)));
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
        const y = startY + rowHeight * (index + 1);
        const isTop3 = index < 3 && !score.isPending;
        const isPending = score.isPending || false;
        const rowX = metrics.x + 14;
        const rowW = metrics.width - 28;
        const rowY = y - 5;
        const primaryY = rowY + 5;
        const secondaryY = rowY + 24;
        const rowBg = new PIXI.Graphics();
        const rowColors = [0x5c3604, 0x283c54, 0x4a2719];
        const rowColor = isTop3 ? rowColors[index] : (index % 2 === 0 ? 0x05192b : 0x06111e);
        rowBg.roundRect(rowX, rowY, rowW, rowHeight - 4, 5);
        rowBg.fill({ color: rowColor, alpha: isTop3 ? 0.72 : 0.56 });
        rowBg.stroke({
          color: isTop3 ? [0xffd166, 0xbce9ff, 0xff8f4d][index] : 0x1d6f93,
          width: isTop3 ? 1.5 : 1,
          alpha: isTop3 ? 0.78 : 0.28
        });
        this.rowsContainer.addChild(rowBg);

        // Premium glow for top 3 (enhanced VIP treatment)
        if (isTop3) {
          // Base glow
          const glow = new PIXI.Graphics();
          glow.roundRect(rowX, rowY, rowW, rowHeight - 4, 5);
          glow.fill({ color: index === 0 ? 0xffd166 : (index === 1 ? 0x66e6ff : 0xff7a47), alpha: 0.16 });
          glow.filters = [new PIXI.BlurFilter(6)];
          this.rowsContainer.addChild(glow);

          // Extra sparkle for #1
          if (index === 0) {
            const sparkle = new PIXI.Graphics();
            sparkle.roundRect(rowX + 4, rowY + 4, rowW - 8, rowHeight - 12, 5);
            sparkle.fill({ color: 0xffff9b, alpha: 0.14 });
            sparkle.filters = [new PIXI.BlurFilter(8)];
            this.rowsContainer.addChild(sparkle);
          }
        }

        const rankStyle = isTop3 ? { ...rowStyle, fill: '#fff3a0' } : (isPending ? { ...rowStyle, fill: '#ffb45a' } : rowStyle);
        const nameStyle = isTop3 ? { ...rowStyle, fill: '#ffffff' } : (isPending ? { ...rowStyle, fill: '#ffaa44' } : rowStyle);

        const rankText = createText(`#${index + 1}`, rankStyle);
        const nameText = createText((score.name || '??').slice(0, 20), nameStyle);
        const scoreText = createText((score.score || 0).toLocaleString('en-US'), isTop3 ? nameStyle : (isPending ? nameStyle : rowStyle));
        const levelText = createText((score.level || 0).toString(), isTop3 ? nameStyle : (isPending ? nameStyle : rowStyle));

        rankText.x = columns.rank;
        rankText.y = primaryY;
        nameText.x = columns.name;
        nameText.y = primaryY;
        scoreText.x = columns.score;
        scoreText.y = primaryY;
        levelText.x = columns.level;
        levelText.y = primaryY;
        scoreText.anchor.set(1, 0);
        levelText.anchor.set(1, 0);

        this.rowsContainer.addChild(rankText, nameText, scoreText, levelText);

        // Add rank sprite using preloaded texture
        const rankTexture = rankTextures[index];
        // The badge shows player progression rank, not leaderboard placement
        const displayRank = computeDisplayRank(score);
        if (rankTexture) {
          const rankSprite = new PIXI.Sprite(rankTexture);
          rankSprite.anchor.set(0, 0.5); // Anchor left-center for consistent positioning

          const targetHeight = rowHeight * 0.75;
          const scale = targetHeight / rankTexture.height;
          rankSprite.scale.set(scale);

          rankSprite.x = columns.badge;
          rankSprite.y = y + rowHeight * 0.5;
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
          placeholder.anchor.set(0, 0.5);
          placeholder.x = columns.badge;
          placeholder.y = y + rowHeight * 0.5;
          this.rowsContainer.addChild(placeholder);
        }

        // TASK 1: Use getRankTitle from RankPolicy (single source of truth)
        const playerRankIndex = (score.rank_index !== null && score.rank_index !== undefined)
          ? score.rank_index
          : getRankFromScore(score.score || 0);
        const clampedRank = Math.max(0, Math.min(19, playerRankIndex));

        const rankNameText = createText(getRankTitle(clampedRank), {
          fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
          fontSize: Math.max(layout.isMobile ? 7 : 8, rowStyle.fontSize - (layout.isMobile ? 5 : 4)),
          fill: isTop3 ? '#ffdf8a' : '#8fb9c4',
          stroke: '#00131b',
          strokeThickness: 1
        });
        rankNameText.x = columns.name;
        rankNameText.y = secondaryY;
        this.rowsContainer.addChild(rankNameText);
        this.rowLayoutDebug.push({
          index,
          row: {
            x: Math.round(rowX),
            y: Math.round(rowY),
            width: Math.round(rowW),
            height: Math.round(rowHeight - 4),
            right: Math.round(rowX + rowW),
            bottom: Math.round(rowY + rowHeight - 4)
          },
          rank: debugBounds(rankText),
          name: debugBounds(nameText),
          rankTitle: debugBounds(rankNameText),
          score: debugBounds(scoreText),
          level: debugBounds(levelText)
        });
      });

      if (entriesToDisplay.length > maxRows) {
        const more = createText('...', rowStyle);
        more.x = columns.name;
        more.y = startY + layout.lineHeight * 1.4 * (maxRows + 1);
        this.rowsContainer.addChild(more);
      }

      this.fadeInRows();
    } else {
      this.rowsContainer.alpha = 1;
      const message = this.status === 'EMPTY' ? 'No highscores yet. Be first!' : 'No data.';
      const empty = createText(message, {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: getResponsiveFontSize(layout, 'body'),
        fill: '#ffffff',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: clampTextWidth(layout.width * 0.8, layout)
      });
      empty.anchor.set(0.5, 0);
      empty.x = layout.width / 2;
      empty.y = startY;
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
      child._startDelay = i * 35; // Stagger delay (35ms per row)
      child._animStart = 0;
      child._finalY = child.y - 10;
    });

    let elapsed = 0;
    const duration = 320;
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
    const particleCount = 25; // Fixed pool

    for (let i = 0; i < particleCount; i++) {
      const particle = new PIXI.Graphics();
      const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      const size = 3 + Math.random() * 4; // 3-7 pixels

      // Simple rectangle confetti
      particle.rect(0, 0, size, size * 1.5);
      particle.fill({ color, alpha: 0.6 });

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
    this.backdropShade.fill({ color: 0x020611, alpha: 0.38 });

    this.backdropShade.rect(0, 0, width, height * 0.26);
    this.backdropShade.fill({ color: 0x000000, alpha: 0.28 });

    this.backdropShade.rect(0, height * 0.72, width, height * 0.28);
    this.backdropShade.fill({ color: 0x000000, alpha: 0.34 });

    const centerW = width * 0.58;
    this.backdropShade.rect((width - centerW) / 2, height * 0.18, centerW, height * 0.62);
    this.backdropShade.fill({ color: 0x020817, alpha: 0.34 });
  }

  drawTitlePlate(width, layout) {
    if (!this.titlePlate || !this.title) return;
    this.titlePlate.clear();
    const plateWidth = Math.min(width - layout.padding * 2, layout.isMobile ? 460 : 760);
    const plateHeight = layout.isMobile ? 82 : 108;
    const x = width / 2 - plateWidth / 2;
    const y = Math.max(8, this.title.y - plateHeight * 0.42);

    this.titlePlate.roundRect(x, y, plateWidth, plateHeight, 6);
    this.titlePlate.fill({ color: 0x020b18, alpha: 0.54 });
    this.titlePlate.stroke({ color: 0x00f6ff, width: 2, alpha: 0.5 });

    this.titlePlate.rect(x + 18, y + 8, plateWidth - 36, 3);
    this.titlePlate.fill({ color: 0xff37d6, alpha: 0.72 });
    this.titlePlate.rect(x + 42, y + plateHeight - 11, plateWidth - 84, 2);
    this.titlePlate.fill({ color: 0xffd166, alpha: 0.8 });
  }

  drawLeaderboardPanel(width, height, rowsStartY, layout) {
    if (!this.leaderboardPanel) return;
    this.leaderboardPanel.clear();

    const panelPadding = Math.max(14, layout.padding * (layout.isMobile ? 0.45 : 1.1));
    const panelY = rowsStartY - layout.lineHeight * 0.5;
    const panelWidth = width - panelPadding * 2;
    const panelHeight = Math.min(
      height - panelY - layout.padding * 2.5,
      layout.isMobile ? layout.lineHeight * 16.2 : layout.lineHeight * 17.6
    );
    this.tableMetrics = {
      x: panelPadding,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
      innerX: panelPadding + Math.max(14, panelWidth * 0.035),
      innerY: panelY + Math.max(16, layout.lineHeight * 0.75),
      innerWidth: panelWidth - Math.max(28, panelWidth * 0.07),
      bottom: panelY + panelHeight
    };

    this.leaderboardPanel.roundRect(panelPadding - 9, panelY - 9, panelWidth + 18, panelHeight + 18, 8);
    this.leaderboardPanel.fill({ color: 0x00f6ff, alpha: 0.08 });

    this.leaderboardPanel.roundRect(panelPadding, panelY, panelWidth, panelHeight, 8);
    this.leaderboardPanel.fill({ color: 0x020814, alpha: 0.82 });
    this.leaderboardPanel.stroke({ color: 0x4dfff7, width: 2, alpha: 0.78 });

    this.leaderboardPanel.roundRect(panelPadding + 8, panelY + 8, panelWidth - 16, panelHeight - 16, 5);
    this.leaderboardPanel.stroke({ color: 0xff37d6, width: 1, alpha: 0.42 });

    this.leaderboardPanel.rect(panelPadding + 16, panelY + 14, panelWidth - 32, 3);
    this.leaderboardPanel.fill({ color: 0xffd166, alpha: 0.86 });
    this.leaderboardPanel.rect(panelPadding + 16, panelY + panelHeight - 17, panelWidth - 32, 2);
    this.leaderboardPanel.fill({ color: 0x00f6ff, alpha: 0.62 });

    if (this.holoRails) {
      this.holoRails.clear();
      const railY = panelY + panelHeight * 0.5;
      const railHeight = Math.min(panelHeight * 0.78, 500);
      const railTop = railY - railHeight / 2;
      [
        { x: panelPadding - 26, color: 0x00f6ff },
        { x: panelPadding + panelWidth + 26, color: 0xff37d6 }
      ].forEach((rail) => {
        this.holoRails.roundRect(rail.x - 4, railTop, 8, railHeight, 4);
        this.holoRails.fill({ color: rail.color, alpha: 0.22 });
        this.holoRails.rect(rail.x - 10, railTop + 24, 20, 3);
        this.holoRails.fill({ color: 0xffd166, alpha: 0.8 });
        this.holoRails.rect(rail.x - 10, railTop + railHeight - 27, 20, 3);
        this.holoRails.fill({ color: 0xffd166, alpha: 0.8 });
      });
    }

    // Store panel bottom for footer layout
    this.panelBottomY = panelY + panelHeight;
  }

  drawStatsDeck(width, height, layout) {
    if (!this.statsDeck || !this.tableMetrics) return;
    this.statsDeck.clear();
    const metrics = this.tableMetrics;
    const deckWidth = Math.min(metrics.width, layout.isMobile ? width - 30 : 820);
    const deckHeight = layout.isMobile ? 28 : 34;
    const x = width / 2 - deckWidth / 2;
    const y = Math.max(metrics.y - deckHeight - 10, (this.comment?.y || 0) + layout.lineHeight * 0.55);
    const loadedCount = this.status === 'LOADED' ? this.entries.length : 0;
    const viewColor = this.activeLeaderboard === 'local' ? 0xffd166 : 0x00f6ff;

    this.statsDeck.roundRect(x, y, deckWidth, deckHeight, 5);
    this.statsDeck.fill({ color: 0x020814, alpha: 0.72 });
    this.statsDeck.stroke({ color: viewColor, width: 1.5, alpha: 0.66 });

    const segments = layout.isMobile ? 3 : 5;
    for (let i = 1; i < segments; i += 1) {
      const sx = x + (deckWidth / segments) * i;
      this.statsDeck.rect(sx, y + 6, 1, deckHeight - 12);
      this.statsDeck.fill({ color: 0xffffff, alpha: 0.12 });
    }

    if (!this.statsText) {
      this.statsText = createText('', {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: 13,
        fill: '#caffff',
        align: 'center'
      });
      this.statsText.anchor.set(0.5);
      this.statsText.zIndex = 6;
      this.container.addChild(this.statsText);
    } else if (!this.statsText.parent) {
      this.container.addChild(this.statsText);
    }

    const syncLabel = this.activeLeaderboard === 'local' ? 'LOCAL MEMORY' : 'LIVE ORBIT';
    const countLabel = loadedCount ? `${loadedCount} SIGNALS` : this.status;
    this.statsText.text = `${syncLabel}  //  ${countLabel}  //  TINYFOUNDRY GAMES`;
    this.statsText.style.fontSize = layout.isMobile ? 10 : 13;
    this.statsText.x = width / 2;
    this.statsText.y = y + deckHeight / 2;
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
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 16,
      fill: '#00ffff'
    });
    label.anchor.set(0.5);
    container.addChild(label);

    const glow = new PIXI.Graphics();
    glow.filters = [new PIXI.BlurFilter(8)];
    container.addChildAt(glow, 0);
    container._bg = bg;
    container._label = label;
    container._glow = glow;
    this.setButtonActive(container, false);

    container.on('pointerover', () => {
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
      button._label.style.fontSize = Math.max(12, Math.min(16, height * 0.42));
    }
    this.setButtonActive(button, Boolean(button._active));
  }

  drawButtonChrome(button, { active = false, hover = false } = {}) {
    if (!button?._bg || !button?._glow) return;
    const width = button._buttonWidth || 160;
    const height = button._buttonHeight || 40;
    const x = -width / 2;
    const y = -height / 2;
    const frameColor = active ? 0xffd166 : (hover ? 0xffffff : 0x00f6ff);
    const fillColor = active ? 0x00f6ff : (hover ? 0x113b52 : 0x06182c);
    const fillAlpha = active ? 0.48 : (hover ? 0.58 : 0.42);

    button._bg.clear();
    button._bg.roundRect(x, y, width, height, 5);
    button._bg.fill({ color: fillColor, alpha: fillAlpha });
    button._bg.stroke({ color: frameColor, width: active ? 3 : 2, alpha: 0.9 });
    button._bg.rect(x + 10, y + 5, width - 20, 2);
    button._bg.fill({ color: 0xff37d6, alpha: active || hover ? 0.75 : 0.36 });

    button._glow.clear();
    button._glow.roundRect(x - 2, y - 2, width + 4, height + 4, 6);
    button._glow.fill({ color: active ? 0xffd166 : 0x00f6ff, alpha: active ? 0.24 : (hover ? 0.2 : 0) });
  }

  setButtonActive(button, active = false) {
    if (!button?._bg || !button?._label || !button?._glow) return;
    button._active = Boolean(active);
    this.drawButtonChrome(button, { active });
    button._label.style.fill = active ? '#031323' : '#9cfbff';
  }

  update() {}

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
    this.largeBonusDrones = [];
    this.bonusDrones = [];
    this.partyHeads = [];
    this.confettiParticles = [];
  }
}
