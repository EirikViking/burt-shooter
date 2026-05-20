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
    this.comment.visible = this.status !== 'LOADED';
    this.stateMessage.style.fontSize = getResponsiveFontSize(layout, 'body');
    this.stateMessage.style.fontSize = getResponsiveFontSize(layout, 'body');
    this.statusText.style.fontSize = getResponsiveFontSize(layout, 'small');

    // Title block
    this.title.x = width / 2;
    {
      const titleTop = stack.placeElement(this.title, layout.spacing * 0.15);
      this.title.y = titleTop + this.title.height / 2;
    }

    this.subtitle.x = width / 2;
    {
      const subtitleTop = stack.placeElement(this.subtitle, layout.spacing * 0.1);
      this.subtitle.y = subtitleTop + this.subtitle.height / 2;
    }
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
    if (this.comment.visible) {
      const commentTop = stack.placeElement(this.comment, layout.spacing * 0.4);
      this.comment.y = commentTop + this.comment.height / 2;
    } else {
      this.comment.y = stack.getCurrentY();
      stack.addGap(layout.spacing * (layout.isMobile ? 0.35 : 0.45));
    }

    this.stateMessage.visible = this.status !== 'LOADED';
    let headerY = stack.getCurrentY() + layout.spacing * 0.25;
    if (this.stateMessage.visible) {
      const stateTop = stack.placeElement(this.stateMessage, layout.spacing * 0.2);
      this.stateMessage.y = stateTop + this.stateMessage.height / 2;
      headerY = stateTop + this.stateMessage.height;
    } else {
      this.stateMessage.y = headerY;
    }
    this.stateMessage.x = width / 2;

    // Rows start after status message
    const baseRowsStartY = headerY + (this.stateMessage.visible ? layout.lineHeight * 0.9 : layout.lineHeight * 0.15) + layout.spacing * (layout.isMobile ? 0.2 : 0.35);
    const rowsStartY = Math.max(baseRowsStartY, toggleY + (layout.isMobile ? 76 : 78));

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
        fontSize: Math.max(
          layout.isMobile ? 11 : 14,
          Math.min(
            getResponsiveFontSize(layout, 'tableRow') - (layout.isMobile ? 3 : 1),
            layout.isMobile ? 13 : (layout.height < 820 ? 15 : 17)
          )
        ),
        fill: '#e8fcff',
        stroke: '#00131b',
        strokeThickness: 2
      };

      const metrics = this.tableMetrics || {
        innerX: layout.padding,
        innerY: startY,
        innerWidth: layout.width - layout.padding * 2,
        width: layout.width - layout.padding * 2,
        y: startY,
        bottom: layout.height - layout.padding
      };
      const rowInset = layout.isMobile ? 10 : 18;
      const rowX = metrics.x + rowInset;
      const rowW = metrics.width - rowInset * 2;
      const rightPad = layout.isMobile ? 8 : 18;
      const rankBlockWidth = layout.isMobile ? 34 : 54;
      const badgeColumnWidth = layout.isMobile ? 30 : 52;
      const badgeGap = layout.isMobile ? 8 : 14;
      const scoreBlockWidth = layout.isMobile ? 82 : 158;
      const levelBlockWidth = layout.isMobile ? 34 : 58;
      const nameBlockWidth = clamp(
        rowW * (layout.isMobile ? 0.32 : 0.24),
        layout.isMobile ? 92 : 190,
        layout.isMobile ? 126 : 340
      );
      const scoreX = rowX + rowW - rightPad - levelBlockWidth - (layout.isMobile ? 8 : 18);
      const levelCenterX = rowX + rowW - rightPad - levelBlockWidth / 2;
      const nameX = rowX + rankBlockWidth + badgeColumnWidth + badgeGap;
      const railX = nameX + nameBlockWidth + (layout.isMobile ? 8 : 18);
      const railW = Math.max(44, scoreX - scoreBlockWidth - railX - (layout.isMobile ? 6 : 18));
      const columns = {
        rank: rowX + rankBlockWidth / 2,
        badge: rowX + rankBlockWidth + badgeGap + badgeColumnWidth / 2,
        name: nameX,
        rail: railX,
        score: scoreX,
        level: levelCenterX
      };
      const visibleTargetRows = Math.max(1, Math.min(10, entriesToDisplay.length || 10));
      const headerHeight = Math.max(layout.isMobile ? 24 : 30, layout.lineHeight * (layout.isMobile ? 1.18 : 1.05));
      const rowsBaseY = startY + headerHeight + (layout.isMobile ? 4 : 8);
      const availableRowsHeight = Math.max(120, metrics.bottom - rowsBaseY - (layout.isMobile ? 4 : 8));
      const minRowHeight = Math.max(layout.isMobile ? 37 : 35, layout.lineHeight * (layout.isMobile ? 1.45 : 1.26));
      const maxRowHeight = layout.isMobile ? 50 : 64;
      const rowSpace = Math.max(minRowHeight, availableRowsHeight / visibleTargetRows);
      const rowHeight = Math.max(minRowHeight, Math.min(maxRowHeight, rowSpace));
      const maxRows = Math.max(4, Math.min(10, Math.floor((metrics.bottom - rowsBaseY + 4) / rowHeight)));
      const topScore = Math.max(1, ...entriesToDisplay.map(entry => Number(entry?.score) || 0));

      const headerStyle = {
        ...rowStyle,
        fill: '#ffdf8a',
        fontSize: Math.max(9, rowStyle.fontSize - (layout.isMobile ? 3 : 4)),
        strokeThickness: 2
      };
      const headerBar = new PIXI.Graphics();
      headerBar.roundRect(rowX, startY - 7, rowW, headerHeight, 5);
      headerBar.fill({ color: 0x061f36, alpha: 0.78 });
      headerBar.stroke({ color: 0xffd166, width: 1, alpha: 0.35 });
      headerBar.rect(columns.rail, startY + headerHeight - 11, railW, 2);
      headerBar.fill({ color: 0x00f6ff, alpha: 0.42 });
      this.rowsContainer.addChild(headerBar);

      const headers = [
        { text: 'POS', x: columns.rank, anchorX: 0.5 },
        { text: 'PILOT ID', x: columns.name, anchorX: 0 },
        { text: layout.isMobile ? 'VECTOR' : 'RANK SIGNAL / SCORE VECTOR', x: columns.rail, anchorX: 0 },
        { text: 'SCORE', x: columns.score, anchorX: 1 },
        { text: layout.isMobile ? 'LV' : 'LEVEL', x: columns.level, anchorX: 0.5 }
      ];
      headers.forEach(entry => {
        const text = createText(entry.text, headerStyle);
        text.x = entry.x;
        text.y = startY;
        text.anchor.set(entry.anchorX, 0);
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
        const y = rowsBaseY + rowHeight * index;
        const isTop3 = index < 3 && !score.isPending;
        const isPending = score.isPending || false;
        const rowY = y;
        const primaryY = rowY + (layout.isMobile ? 3 : 7);
        const rowMidY = rowY + rowHeight * 0.5;
        const rowBg = new PIXI.Graphics();
        const medalAccents = [0xffd166, 0x9fefff, 0xff9b5c];
        const medalFills = [0x4d3107, 0x143650, 0x4a2417];
        const accent = isPending ? 0xffaa44 : (isTop3 ? medalAccents[index] : (index % 2 === 0 ? 0x00f6ff : 0x59b6ff));
        const rowColor = isTop3 ? medalFills[index] : (index % 2 === 0 ? 0x041522 : 0x061d2b);

        if (isTop3) {
          const rowAura = new PIXI.Graphics();
          rowAura.roundRect(rowX - 3, rowY - 3, rowW + 6, rowHeight - 2, 7);
          rowAura.fill({ color: accent, alpha: index === 0 ? 0.22 : 0.15 });
          rowAura.filters = [new PIXI.BlurFilter(index === 0 ? 8 : 5)];
          this.rowsContainer.addChild(rowAura);
        }

        rowBg.roundRect(rowX, rowY, rowW, rowHeight - 5, 6);
        rowBg.fill({ color: rowColor, alpha: isTop3 ? 0.84 : 0.7 });
        rowBg.stroke({
          color: accent,
          width: isTop3 ? 2 : 1,
          alpha: isTop3 ? 0.9 : 0.36
        });
        rowBg.roundRect(rowX + 5, rowY + 5, rankBlockWidth - 10, rowHeight - 15, 5);
        rowBg.fill({ color: accent, alpha: isTop3 ? 0.34 : 0.18 });
        rowBg.stroke({ color: 0xffffff, width: 1, alpha: isTop3 ? 0.22 : 0.12 });
        rowBg.rect(rowX + rankBlockWidth + 6, rowY + 8, 1, rowHeight - 21);
        rowBg.fill({ color: accent, alpha: 0.42 });
        rowBg.rect(scoreX - scoreBlockWidth + 6, rowY + 8, 1, rowHeight - 21);
        rowBg.fill({ color: 0xffffff, alpha: 0.1 });
        this.rowsContainer.addChild(rowBg);

        const scoreRatio = clamp((Number(score.score) || 0) / topScore, 0.04, 1);
        const railHeight = clamp(rowHeight * 0.27, layout.isMobile ? 8 : 10, layout.isMobile ? 12 : 16);
        const railY = rowY + rowHeight * (layout.isMobile ? 0.58 : 0.56) - railHeight / 2;
        const rail = new PIXI.Graphics();
        rail.roundRect(columns.rail, railY, railW, railHeight, railHeight / 2);
        rail.fill({ color: 0x010812, alpha: 0.84 });
        rail.stroke({ color: accent, width: 1, alpha: isTop3 ? 0.66 : 0.36 });
        const fillWidth = Math.max(8, (railW - 4) * scoreRatio);
        rail.roundRect(columns.rail + 2, railY + 2, fillWidth, railHeight - 4, Math.max(2, (railHeight - 4) / 2));
        rail.fill({ color: accent, alpha: isTop3 ? 0.82 : 0.62 });
        if (railW > 110) {
          for (let tick = 1; tick < 5; tick += 1) {
            const tickX = columns.rail + (railW / 5) * tick;
            rail.rect(tickX, railY - 3, 1, railHeight + 6);
            rail.fill({ color: 0xffffff, alpha: 0.13 });
          }
        }
        rail.rect(columns.rail + fillWidth, railY - 4, 2, railHeight + 8);
        rail.fill({ color: 0xffffff, alpha: isTop3 ? 0.82 : 0.48 });
        this.rowsContainer.addChild(rail);

        const rankStyle = isTop3 ? { ...rowStyle, fill: '#fff3a0' } : (isPending ? { ...rowStyle, fill: '#ffb45a' } : rowStyle);
        const nameStyle = isTop3 ? { ...rowStyle, fill: '#ffffff' } : (isPending ? { ...rowStyle, fill: '#ffaa44' } : rowStyle);

        const playerRankIndex = (score.rank_index !== null && score.rank_index !== undefined)
          ? score.rank_index
          : getRankFromScore(score.score || 0);
        const clampedRank = Math.max(0, Math.min(19, playerRankIndex));
        const rankTitle = getRankTitle(clampedRank);
        const displayName = (score.name || '??').slice(0, layout.isMobile ? 14 : 20).toUpperCase();

        const rankText = createText(`#${index + 1}`, {
          ...rankStyle,
          fontSize: rowStyle.fontSize + (isTop3 && !layout.isMobile ? 2 : 0)
        });
        const nameText = createText(displayName, nameStyle);
        const rankNameText = createText(rankTitle, {
          fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
          fontSize: Math.max(layout.isMobile ? 8 : 10, rowStyle.fontSize - (layout.isMobile ? 4 : 3)),
          fill: isTop3 ? '#ffefaa' : '#9fd7e3',
          stroke: '#00131b',
          strokeThickness: 1
        });
        const scoreText = createText((score.score || 0).toLocaleString('en-US'), {
          ...(isTop3 ? nameStyle : (isPending ? nameStyle : rowStyle)),
          fontSize: rowStyle.fontSize + (layout.isMobile ? 0 : 1)
        });
        const scoreLabel = createText(index === 0 ? 'LEADER' : 'SCORE', {
          fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
          fontSize: Math.max(8, rowStyle.fontSize - (layout.isMobile ? 5 : 4)),
          fill: isTop3 ? '#ffe7a8' : '#6fb6c8',
          stroke: '#00131b',
          strokeThickness: 1
        });
        const levelText = createText((score.level || 0).toString(), {
          ...rankStyle,
          fontSize: Math.max(11, rowStyle.fontSize - (layout.isMobile ? 1 : 0))
        });
        const levelLabel = createText('LV', {
          fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
          fontSize: Math.max(7, rowStyle.fontSize - (layout.isMobile ? 6 : 5)),
          fill: '#7fdbe7',
          stroke: '#00131b',
          strokeThickness: 1
        });
        const ratioText = createText(index === 0 ? 'TOP SIGNAL' : `${Math.round(scoreRatio * 100)}% OF LEAD`, {
          fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
          fontSize: Math.max(layout.isMobile ? 7 : 9, rowStyle.fontSize - (layout.isMobile ? 5 : 4)),
          fill: isTop3 ? '#fff7c6' : '#b8faff',
          stroke: '#00131b',
          strokeThickness: 1
        });

        rankText.anchor.set(0.5);
        rankText.x = columns.rank;
        rankText.y = rowMidY - 2;
        nameText.x = columns.name;
        nameText.y = primaryY;
        fitTextToWidth(nameText, nameBlockWidth, layout.isMobile ? 9 : 11);

        const rankOnRail = railW > (layout.isMobile ? 74 : 160);
        rankNameText.x = rankOnRail ? columns.rail + (layout.isMobile ? 6 : 10) : columns.name;
        rankNameText.y = rankOnRail ? rowY + 7 : rowY + rowHeight - rankNameText.height - (layout.isMobile ? 3 : 7);
        fitTextToWidth(rankNameText, rankOnRail ? Math.max(42, railW * (layout.isMobile ? 0.58 : 0.52)) : nameBlockWidth, layout.isMobile ? 7 : 9);

        scoreText.x = columns.score;
        scoreText.y = primaryY - 1;
        scoreLabel.x = columns.score;
        scoreLabel.y = rowY + rowHeight - scoreLabel.height - 7;
        levelText.x = columns.level;
        levelText.y = rowMidY + 1;
        levelLabel.x = columns.level;
        levelLabel.y = rowY + 7;
        scoreText.anchor.set(1, 0);
        scoreLabel.anchor.set(1, 0);
        levelText.anchor.set(0.5);
        levelLabel.anchor.set(0.5, 0);
        fitTextToWidth(scoreText, scoreBlockWidth, layout.isMobile ? 10 : 12);

        if (railW > (layout.isMobile ? 120 : 58)) {
          ratioText.anchor.set(1, 0.5);
          ratioText.x = columns.rail + railW - 8;
          ratioText.y = railY + railHeight / 2;
          fitTextToWidth(ratioText, Math.max(36, railW * 0.42), layout.isMobile ? 6 : 8);
          this.rowsContainer.addChild(ratioText);
        }

        const levelPill = new PIXI.Graphics();
        const pillWidth = layout.isMobile ? 28 : 42;
        const pillHeight = layout.isMobile ? 24 : 30;
        levelPill.roundRect(columns.level - pillWidth / 2, rowMidY - pillHeight / 2, pillWidth, pillHeight, 5);
        levelPill.fill({ color: 0x031725, alpha: 0.8 });
        levelPill.stroke({ color: accent, width: 1, alpha: isTop3 ? 0.72 : 0.34 });
        this.rowsContainer.addChild(levelPill);

        const rankTexture = rankTextures[index];
        const displayRank = computeDisplayRank(score);
        if (rankTexture) {
          const rankSprite = new PIXI.Sprite(rankTexture);
          rankSprite.anchor.set(0.5);

          const targetHeight = Math.min(rowHeight * 0.62, layout.isMobile ? 28 : 42);
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

        this.rowsContainer.addChild(rankText, nameText, rankNameText, scoreText, scoreLabel, levelText, levelLabel);
        this.rowLayoutDebug.push({
          index,
          row: {
            x: Math.round(rowX),
            y: Math.round(rowY),
            width: Math.round(rowW),
            height: Math.round(rowHeight - 5),
            right: Math.round(rowX + rowW),
            bottom: Math.round(rowY + rowHeight - 5)
          },
          rank: debugBounds(rankText),
          name: debugBounds(nameText),
          rankTitle: debugBounds(rankNameText),
          score: debugBounds(scoreText),
          level: debugBounds(levelText),
          scoreRail: {
            x: Math.round(columns.rail),
            y: Math.round(railY),
            width: Math.round(railW),
            height: Math.round(railHeight),
            right: Math.round(columns.rail + railW),
            bottom: Math.round(railY + railHeight)
          }
        });
      });

      if (entriesToDisplay.length > maxRows) {
        const more = createText('...', rowStyle);
        more.x = columns.name;
        more.y = rowsBaseY + rowHeight * maxRows + 3;
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
    this.backdropShade.fill({ color: 0x020611, alpha: 0.46 });

    this.backdropShade.rect(0, 0, width, height * 0.26);
    this.backdropShade.fill({ color: 0x000000, alpha: 0.28 });

    this.backdropShade.rect(0, height * 0.72, width, height * 0.28);
    this.backdropShade.fill({ color: 0x000000, alpha: 0.34 });

    const centerW = Math.min(width * 0.86, 1480);
    this.backdropShade.rect((width - centerW) / 2, height * 0.16, centerW, height * 0.68);
    this.backdropShade.fill({ color: 0x020817, alpha: 0.3 });

    this.backdropShade.rect(0, height * 0.34, width, height * 0.34);
    this.backdropShade.fill({ color: 0x00162a, alpha: 0.14 });
  }

  drawTitlePlate(width, layout) {
    if (!this.titlePlate || !this.title) return;
    this.titlePlate.clear();
    const plateWidth = Math.min(width - layout.padding * 2, layout.isMobile ? 460 : 760);
    const plateHeight = layout.isMobile ? 82 : 108;
    const x = width / 2 - plateWidth / 2;
    const y = Math.max(8, this.title.y - plateHeight * 0.42);

    this.titlePlate.roundRect(x - 5, y - 5, plateWidth + 10, plateHeight + 10, 8);
    this.titlePlate.fill({ color: 0x00f6ff, alpha: 0.06 });

    this.titlePlate.roundRect(x, y, plateWidth, plateHeight, 6);
    this.titlePlate.fill({ color: 0x020b18, alpha: 0.68 });
    this.titlePlate.stroke({ color: 0x00f6ff, width: 2, alpha: 0.64 });

    this.titlePlate.rect(x + 18, y + 8, plateWidth - 36, 3);
    this.titlePlate.fill({ color: 0xff37d6, alpha: 0.72 });
    this.titlePlate.rect(x + 42, y + plateHeight - 11, plateWidth - 84, 2);
    this.titlePlate.fill({ color: 0xffd166, alpha: 0.8 });

    const notch = layout.isMobile ? 18 : 30;
    this.titlePlate.rect(x + 10, y + 18, notch, 2);
    this.titlePlate.fill({ color: 0x00f6ff, alpha: 0.82 });
    this.titlePlate.rect(x + plateWidth - notch - 10, y + 18, notch, 2);
    this.titlePlate.fill({ color: 0x00f6ff, alpha: 0.82 });
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

    this.leaderboardPanel.roundRect(panelPadding - 12, panelY - 12, panelWidth + 24, panelHeight + 24, 10);
    this.leaderboardPanel.fill({ color: 0x00f6ff, alpha: 0.1 });

    this.leaderboardPanel.roundRect(panelPadding, panelY, panelWidth, panelHeight, 8);
    this.leaderboardPanel.fill({ color: 0x020814, alpha: 0.88 });
    this.leaderboardPanel.stroke({ color: 0x4dfff7, width: 2, alpha: 0.86 });

    this.leaderboardPanel.roundRect(panelPadding + 8, panelY + 8, panelWidth - 16, panelHeight - 16, 5);
    this.leaderboardPanel.fill({ color: 0x031729, alpha: 0.22 });
    this.leaderboardPanel.stroke({ color: 0xff37d6, width: 1, alpha: 0.46 });

    this.leaderboardPanel.rect(panelPadding + 16, panelY + 14, panelWidth - 32, 3);
    this.leaderboardPanel.fill({ color: 0xffd166, alpha: 0.86 });
    this.leaderboardPanel.rect(panelPadding + 16, panelY + panelHeight - 17, panelWidth - 32, 2);
    this.leaderboardPanel.fill({ color: 0x00f6ff, alpha: 0.62 });

    const corner = layout.isMobile ? 20 : 34;
    const cornerAlpha = 0.82;
    [
      [panelPadding + 15, panelY + 22, 1, 0],
      [panelPadding + panelWidth - 15 - corner, panelY + 22, 1, 0],
      [panelPadding + 15, panelY + panelHeight - 24, 1, 0],
      [panelPadding + panelWidth - 15 - corner, panelY + panelHeight - 24, 1, 0]
    ].forEach(([cx, cy]) => {
      this.leaderboardPanel.rect(cx, cy, corner, 2);
      this.leaderboardPanel.fill({ color: 0x00f6ff, alpha: cornerAlpha });
    });
    [
      [panelPadding + 22, panelY + 15],
      [panelPadding + panelWidth - 24, panelY + 15],
      [panelPadding + 22, panelY + panelHeight - 15 - corner],
      [panelPadding + panelWidth - 24, panelY + panelHeight - 15 - corner]
    ].forEach(([cx, cy]) => {
      this.leaderboardPanel.rect(cx, cy, 2, corner);
      this.leaderboardPanel.fill({ color: 0xffd166, alpha: 0.58 });
    });

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
    const deckHeight = layout.isMobile ? 22 : 26;
    const x = width / 2 - deckWidth / 2;
    const minY = this.comment?.visible ? (this.comment.y + layout.lineHeight * 0.55) : 0;
    const y = Math.max(metrics.y - deckHeight - 8, minY);
    const loadedCount = this.status === 'LOADED' ? this.entries.length : 0;
    const topScore = loadedCount
      ? Math.max(...this.entries.map(entry => Number(entry?.score) || 0)).toLocaleString('en-US')
      : '0';
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
    this.statsText.text = `${syncLabel}  //  ${countLabel}  //  BEST ${topScore}  //  TINYFOUNDRY GAMES`;
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
