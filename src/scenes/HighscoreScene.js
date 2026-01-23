import * as PIXI from 'pixi.js';
import { API } from '../api/API.js';
import { getHighscoreComment, getEnhancedLeaderboardTaunt } from '../text/phrasePool.js';
import { BUILD_ID } from '../buildInfo.js';
import { addResponsiveListener } from '../ui/responsiveLayout.js';
import { createTextLayout, createVerticalStack, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';
import { BeerAsset } from '../utils/BeerAsset.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { getRankFromScore, getRankTitle } from '../shared/RankPolicy.js';
import { RankAssets } from '../utils/RankAssets.js';
// PART B & C: Dynamic text rotation and speech bubbles
import { tauntDirector } from '../game/TauntDirector.js';
import { TypewriterText } from '../utils/TypewriterText.js';
import { TauntBubble } from '../ui/TauntBubble.js';


const API_PATH = '/api/highscores';
// Timeout now handled by API retry logic

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
    this.buildStamp = null;
    this.status = 'LOADING';
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
    this.beerCansContainer = new PIXI.Container();
    this.partyHeadsContainer = new PIXI.Container();
    this.largeBeerCansContainer = new PIXI.Container();
    this.confettiContainer = new PIXI.Container();
    this.scanlineOverlay = null;
    this.tauntBanner = null;
    this.tauntTimer = 0;
    this.tauntInterval = 5000 + Math.random() * 3000; // 5-8s
    this.animationTicker = null;
    this.beerCans = [];
    this.largeBeerCans = [];
    this.partyHeads = [];
    this.confettiParticles = [];
    this.leaderboardPanel = null;

    // PART B: Dynamic text rotation
    this.bannerTypewriter = null;
    this.commentTypewriter = null;
    this.bannerRotationTimer = null;
    this.commentRotationTimer = null;

    // PART C: Speech bubble system
    this.currentBubble = null;
    this.bubbleTimer = 0;
    this.bubbleInterval = 4000 + Math.random() * 4000; // 4-8s
    this.bubbleTimerMs = null;
    this.bubbleLifetimeMs = 5000;
    this.lastBubbleErrorAt = 0;
  }

  async init() {
    this.container.removeChildren();
    this.entries = [];
    this.entriesNormalized = [];
    this.status = 'LOADING';
    this.lastError = 'none';
    this.currentBubble = null;
    this.bubbleTimer = 0;
    this.bubbleTimerMs = null;

    // Load beer can texture and rank textures
    await BeerAsset.ensureLoaded();
    await RankAssets.preloadAll();

    const { width, height } = this.game.app.screen;
    const layout = createTextLayout(width, height);

    // Layer setup: large beer cans -> beer cans -> party heads -> confetti -> leaderboard panel -> content -> taunt banner -> scanline
    this.largeBeerCansContainer = new PIXI.Container();
    this.largeBeerCansContainer.zIndex = -15;
    this.container.addChild(this.largeBeerCansContainer);

    this.beerCansContainer = new PIXI.Container();
    this.beerCansContainer.zIndex = -10;
    this.container.addChild(this.beerCansContainer);

    this.partyHeadsContainer = new PIXI.Container();
    this.partyHeadsContainer.zIndex = -5;
    this.container.addChild(this.partyHeadsContainer);

    this.confettiContainer = new PIXI.Container();
    this.confettiContainer.zIndex = -4;
    this.container.addChild(this.confettiContainer);

    // Dark panel behind leaderboard for readability
    this.leaderboardPanel = new PIXI.Graphics();
    this.leaderboardPanel.zIndex = -3;
    this.container.addChild(this.leaderboardPanel);

    this.setupLargeBeerCans(width, height);
    this.setupBeerCans(width, height);
    this.setupPartyHeads(width, height);
    this.setupConfetti(width, height);

    this.title = new PIXI.Text('HIGHSCORES', {
      fontFamily: 'Courier New',
      fontSize: getResponsiveFontSize(layout, 'score'),
      fill: '#ffff00',
      stroke: '#ff8800',
      strokeThickness: 3,
      dropShadow: true,
      dropShadowColor: '#ffaa33',
      dropShadowBlur: 8,
      dropShadowDistance: 0,
      dropShadowAlpha: 0.7
    });
    this.title.anchor.set(0.5);
    this.container.addChild(this.title);

    this.subtitle = new PIXI.Text('Stokmarknes sine beste', {
      fontFamily: 'Courier New',
      fontSize: getResponsiveFontSize(layout, 'subtitle'),
      fill: '#00ffff'
    });
    this.subtitle.anchor.set(0.5);
    this.container.addChild(this.subtitle);

    this.comment = new PIXI.Text('', {
      fontFamily: 'Courier New',
      fontSize: getResponsiveFontSize(layout, 'small'),
      fill: '#ffffff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.9, layout),
      lineHeight: layout.lineHeight * 1.2
    });
    this.comment.anchor.set(0.5);
    this.container.addChild(this.comment);

    this.rowsContainer = new PIXI.Container();
    this.rowsContainer.zIndex = 10; // Above leaderboard panel but below overlays
    this.container.addChild(this.rowsContainer);

    this.stateMessage = new PIXI.Text('', {
      fontFamily: 'Courier New',
      fontSize: getResponsiveFontSize(layout, 'body'),
      fill: '#ffdd55',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.8, layout)
    });
    this.stateMessage.anchor.set(0.5);
    this.container.addChild(this.stateMessage);

    this.statusText = new PIXI.Text('', {
      fontFamily: 'Courier New',
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

    this.backBtn = this.createButton('TILBAKE');
    this.backBtn.on('pointerdown', () => {
      this.game.switchScene('menu');
    });
    this.container.addChild(this.backBtn);

    // TASK C: Build stamp removed from HighscoreScene (only allowed on MenuScene)
    // this.buildStamp = new PIXI.Text(`build: ${BUILD_ID}`, {
    //   fontFamily: 'Courier New',
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

    // Taunt banner (hidden initially)
    this.tauntBanner = new PIXI.Container();
    this.tauntBanner.visible = false;
    this.tauntBanner.zIndex = 50;
    this.container.addChild(this.tauntBanner);

    // Enable sortable children for zIndex
    this.container.sortableChildren = true;

    // Start animation loop
    this.startAnimationLoop();

    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = addResponsiveListener(() => this.layoutHighscore());
    this.layoutHighscore();
    console.log(`HighscoreScene build:${BUILD_ID}`);
    this.fetchHighscores();

    // PART B & C: Initialize dynamic text and speech bubbles
    this.initDynamicText();
  }

  // PART B: Dynamic text rotation for banner and comment
  initDynamicText() {
    tauntDirector.setScene(this);

    // Start with fresh lines
    this.rotateBanner();
    this.rotateComment();

    // Banner rotates every 15 seconds
    this.bannerRotationTimer = setInterval(() => {
      this.rotateBanner();
    }, 15000);

    // Comment rotates every 8-12 seconds (random)
    const rotateCommentWithRandomInterval = () => {
      this.rotateComment();
      const nextInterval = 8000 + Math.random() * 4000;
      this.commentRotationTimer = setTimeout(rotateCommentWithRandomInterval, nextInterval);
    };
    this.commentRotationTimer = setTimeout(rotateCommentWithRandomInterval, 8000 + Math.random() * 4000);
  }

  rotateBanner() {
    if (!this.subtitle) return;
    const line = tauntDirector.getRotatingText('highscore_banner');
    this.subtitle.text = '';
    this.bannerTypewriter = new TypewriterText(this.subtitle, line, { charDelay: 30 });
  }

  rotateComment() {
    if (!this.comment) return;
    const line = tauntDirector.getRotatingText('highscore_comment');
    this.comment.text = '';
    this.commentTypewriter = new TypewriterText(this.comment, line, { charDelay: 30 });
  }

  async layoutHighscore() {
    const { width, height } = this.game.app.screen;
    const layout = createTextLayout(width, height);
    const stack = createVerticalStack(layout, { startY: layout.padding, spacing: layout.spacing });

    this.title.style.fontSize = getResponsiveFontSize(layout, 'score');
    this.subtitle.style.fontSize = getResponsiveFontSize(layout, 'subtitle');
    this.comment.style.fontSize = getResponsiveFontSize(layout, 'body');
    this.comment.style.wordWrapWidth = clampTextWidth(width * 0.9, layout);
    this.stateMessage.style.fontSize = getResponsiveFontSize(layout, 'body');
    this.statusText.style.fontSize = getResponsiveFontSize(layout, 'small');

    // Title block
    this.title.x = width / 2;
    this.title.y = stack.placeElement(this.title, layout.spacing * 0.2);

    this.subtitle.x = width / 2;
    this.subtitle.y = stack.placeElement(this.subtitle, layout.spacing * 0.1);

    this.comment.x = width / 2;
    this.comment.y = stack.placeElement(this.comment, layout.spacing * 0.4);

    const headerY = stack.placeElement(this.stateMessage, layout.spacing * 0.2);
    this.stateMessage.y = headerY;
    this.stateMessage.x = width / 2;

    // Rows start after status message
    const rowsStartY = headerY + layout.lineHeight * 0.9 + layout.spacing * 0.3;

    // Draw dark panel behind leaderboard for readability
    this.drawLeaderboardPanel(width, height, rowsStartY, layout);

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
            this.stateMessage.text = `Laster... (forsøk ${attempt + 1}/4)`;
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

      this.comment.text = getHighscoreComment(this.entries.length > 0);
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
    switch (newState) {
      case 'LOADED':
        this.stateMessage.text = 'Highscores loaded.';
        break;
      case 'EMPTY':
        this.stateMessage.text = 'Ingen scores ennå! Vær den første.';
        break;
      case 'ERROR':
        this.stateMessage.text = `Feil: ${this.lastError}`;
        break;
      default:
        this.stateMessage.text = 'Laster...';
    }
    this.layoutHighscore();
  }

  normalizeEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const nameValue = raw.name ?? raw.playerName ?? '';
    const name = String(nameValue ?? '').trim();
    if (!name) return null;

    const scoreNum = Number(raw.score);
    const levelNum = Number(raw.level);
    const rankValue = raw.rank_index ?? raw.rankIndex ?? raw.rank;
    const rankNum = Number(rankValue);

    const safeScore = Number.isFinite(scoreNum) ? scoreNum : 0;
    const safeLevel = Number.isFinite(levelNum) ? levelNum : 0;
    const safeRank = Number.isFinite(rankNum) ? rankNum : getRankFromScore(safeScore);

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

  handleBubbleError(error, context = '') {
    const now = Date.now();
    if (!this.lastBubbleErrorAt || now - this.lastBubbleErrorAt > 5000) {
      const message = error && error.message ? error.message : String(error || 'unknown');
      console.warn('[HighscoreScene] Bubble error:', message, context);
      this.lastBubbleErrorAt = now;
    }

    if (this.currentBubble) {
      try {
        this.currentBubble.exit(() => {
          this.currentBubble = null;
        });
      } catch {
        this.currentBubble = null;
      }
    }

    this.bubbleTimerMs = 5000;
  }

  isFiniteBounds(bounds) {
    return !!bounds &&
      Number.isFinite(bounds.x) &&
      Number.isFinite(bounds.y) &&
      Number.isFinite(bounds.width) &&
      Number.isFinite(bounds.height) &&
      bounds.width > 0 &&
      bounds.height > 0;
  }

  getTableBounds(layout, entriesCount) {
    const bounds = this.rowsContainer?.getBounds ? this.rowsContainer.getBounds() : null;
    if (this.isFiniteBounds(bounds)) {
      return bounds;
    }

    const rowCount = Math.max(0, Math.min(10, Number(entriesCount) || 0));
    const rowHeight = layout.lineHeight * 1.4;
    const firstRow = this.getRowAnchor(0);
    const top = Math.max(layout.padding, (firstRow?.y || layout.padding) - rowHeight);
    const height = rowHeight * Math.max(1, rowCount + 1);

    return {
      x: layout.padding,
      y: top,
      width: layout.width - layout.padding * 2,
      height
    };
  }

  resolveBubblePlacement(bubble, tableBounds, layout, anchorX, anchorY) {
    if (!bubble || !bubble.container) return;

    const width = layout.width;
    const height = layout.height;
    const padding = Math.max(12, layout.padding || 0);
    const bubbleWidth = bubble.width > 0 ? bubble.width : 220;
    const bubbleHeight = bubble.height > 0 ? bubble.height : 90;
    const halfW = bubbleWidth / 2;
    const halfH = bubbleHeight / 2;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const clampX = (value) => clamp(value, padding + halfW, width - padding - halfW);
    const clampY = (value) => clamp(value, padding + halfH, height - padding - halfH);
    const safeAnchorX = Number.isFinite(anchorX) ? anchorX : width / 2;
    const safeAnchorY = Number.isFinite(anchorY) ? anchorY : height / 2;

    const paddedTable = this.isFiniteBounds(tableBounds)
      ? {
        x: tableBounds.x - padding,
        y: tableBounds.y - padding,
        width: tableBounds.width + padding * 2,
        height: tableBounds.height + padding * 2
      }
      : null;

    const isIntersecting = (rect, other) => {
      if (!other) return false;
      return rect.x < other.x + other.width &&
        rect.x + rect.width > other.x &&
        rect.y < other.y + other.height &&
        rect.y + rect.height > other.y;
    };

    const candidates = [];
    if (paddedTable) {
      candidates.push({
        x: clampX(safeAnchorX),
        y: clampY(paddedTable.y - halfH - padding)
      });
      candidates.push({
        x: clampX(paddedTable.x + paddedTable.width + halfW + padding),
        y: clampY(safeAnchorY)
      });
      candidates.push({
        x: clampX(paddedTable.x - halfW - padding),
        y: clampY(safeAnchorY)
      });
      candidates.push({
        x: clampX(safeAnchorX),
        y: clampY(paddedTable.y + paddedTable.height + halfH + padding)
      });
    } else {
      candidates.push({
        x: clampX(safeAnchorX),
        y: clampY(height * 0.3)
      });
    }

    candidates.push({
      x: clampX(width / 2),
      y: clampY(height * 0.3)
    });

    let chosen = candidates[0];
    if (paddedTable) {
      for (const candidate of candidates) {
        const rect = {
          x: candidate.x - halfW,
          y: candidate.y - halfH,
          width: bubbleWidth,
          height: bubbleHeight
        };
        if (!isIntersecting(rect, paddedTable)) {
          chosen = candidate;
          break;
        }
      }
    }

    bubble.x = chosen.x;
    bubble.y = chosen.y;
  }

  async renderHighscoreRows(startY, layout) {
    this.rowsContainer.removeChildren();
    if (this.status === 'LOADED') {
      const isDebug = window.location.search.includes('debug=1');
      // Check for pending highscore and prepare combined list
      let entriesToDisplay = [...this.entries];
      let pendingEntry = null;

      if (this.game.pendingHighscore) {
        const pending = this.game.pendingHighscore;
        pendingEntry = {
          name: `${pending.name} (pending)`,
          score: pending.score || 0,
          level: pending.level || 0,
          rank_index: pending.rankIndex ?? getRankFromScore(pending.score || 0),
          isPending: true
        };
        // Add pending entry at the start
        entriesToDisplay.unshift(pendingEntry);
      }

      const rowStyle = {
        fontFamily: 'Courier New',
        fontSize: getResponsiveFontSize(layout, 'tableRow'),
        fill: '#ffffff'
      };

      // TASK C: Dynamic column positioning based on longest name
      // Calculate the longest name width to ensure proper spacing
      let maxNameWidth = 120; // Minimum name column width
      if (entriesToDisplay.length > 0) {
        const tempText = new PIXI.Text('', rowStyle);
        entriesToDisplay.forEach(entry => {
          const displayName = (entry.name || 'NoName').slice(0, 20).toUpperCase();
          tempText.text = displayName;
          maxNameWidth = Math.max(maxNameWidth, tempText.width);
        });
        tempText.destroy();
      }

      // Add buffer space after name column
      const nameColumnEnd = layout.padding + layout.width * 0.14 + maxNameWidth + 20;
      const scoreColumnWidth = layout.isMobile ? 120 : 150;

      const columns = {
        rank: layout.padding,
        name: layout.padding + layout.width * 0.14,
        score: Math.max(nameColumnEnd + 40, layout.width - layout.padding - scoreColumnWidth - 80),
        level: layout.width - layout.padding
      };
      const maxRows = Math.max(4, Math.min(12, Math.floor((layout.height - startY - layout.padding * 2) / (layout.lineHeight * 1.2))));

      const headerStyle = {
        ...rowStyle,
        fill: '#888888'
      };
      const headers = [
        { text: 'RANK', x: columns.rank },
        { text: 'NAVN', x: columns.name },
        { text: 'SCORE', x: columns.score },
        { text: 'LEVEL', x: columns.level }
      ];
      headers.forEach(entry => {
        const text = new PIXI.Text(entry.text, headerStyle);
        text.x = entry.x;
        text.y = startY;
        if (entry.text === 'SCORE' || entry.text === 'LEVEL') {
          text.anchor.set(1, 0);
        }
        this.rowsContainer.addChild(text);
      });

      // Preload rank textures for visible entries
      const entriesToRender = entriesToDisplay.slice(0, maxRows);
      const rankTextures = await Promise.all(
        entriesToRender.map(async (entry) => {
          const rIndex = (entry.rank_index !== null && entry.rank_index !== undefined)
            ? entry.rank_index
            : 0;
          return RankAssets.loadRankTexture(rIndex).catch(() => null);
        })
      );

      entriesToRender.forEach((score, index) => {
        const y = startY + layout.lineHeight * 1.4 * (index + 1);
        const isTop3 = index < 3 && !score.isPending;
        const isPending = score.isPending || false;

        // Premium glow for top 3 (enhanced VIP treatment)
        if (isTop3) {
          // Base glow
          const glow = new PIXI.Graphics();
          glow.rect(layout.padding - 5, y - 2, layout.width - layout.padding * 2 + 10, layout.lineHeight * 1.2);
          glow.fill({ color: 0xffaa00, alpha: 0.2 });
          glow.filters = [new PIXI.BlurFilter(6)];
          this.rowsContainer.addChild(glow);

          // Extra sparkle for #1
          if (index === 0) {
            const sparkle = new PIXI.Graphics();
            sparkle.rect(layout.padding - 5, y - 2, layout.width - layout.padding * 2 + 10, layout.lineHeight * 1.2);
            sparkle.fill({ color: 0xffff00, alpha: 0.12 });
            sparkle.filters = [new PIXI.BlurFilter(8)];
            this.rowsContainer.addChild(sparkle);
          }
        }

        const rankStyle = isTop3 ? { ...rowStyle, fill: '#ffdd00', fontSize: rowStyle.fontSize + 2 } : (isPending ? { ...rowStyle, fill: '#ff8800' } : rowStyle);
        const nameStyle = isTop3 ? { ...rowStyle, fill: '#ffff88', fontSize: rowStyle.fontSize + 1 } : (isPending ? { ...rowStyle, fill: '#ffaa44' } : rowStyle);

        const rankText = new PIXI.Text((index + 1).toString().padStart(2, '0'), rankStyle);
        const nameText = new PIXI.Text((score.name || '??').slice(0, 20), nameStyle);
        const scoreText = new PIXI.Text((score.score || 0).toString(), isTop3 ? nameStyle : (isPending ? nameStyle : rowStyle));
        const levelText = new PIXI.Text((score.level || 0).toString(), isTop3 ? nameStyle : (isPending ? nameStyle : rowStyle));

        rankText.x = columns.rank;
        rankText.y = y;
        nameText.x = columns.name;
        nameText.y = y;
        scoreText.x = columns.score;
        scoreText.y = y;
        levelText.x = columns.level;
        levelText.y = y;
        scoreText.anchor.set(1, 0);
        levelText.anchor.set(1, 0);

        this.rowsContainer.addChild(rankText, nameText, scoreText, levelText);

        // Add rank sprite using preloaded texture
        const rankTexture = rankTextures[index];
        if (rankTexture) {
          const rankSprite = new PIXI.Sprite(rankTexture);
          rankSprite.anchor.set(0, 0.5); // Anchor left-center for consistent positioning

          // CRITICAL: Scale by HEIGHT only to maintain aspect ratio
          const targetHeight = layout.isMobile ? 28 : 36;
          const scale = targetHeight / rankTexture.height;
          rankSprite.scale.set(scale);

          rankSprite.x = columns.rank + 40;
          rankSprite.y = y + rowStyle.fontSize / 2;
          rankSprite.alpha = 1;
          rankSprite.visible = true;

          this.rowsContainer.addChild(rankSprite);
          if (isDebug && index === 0) {
            const alias = RankAssets.getRankAlias(score.rank_index);
            const badgePath = RankAssets.getRankPath(score.rank_index);
            const resourceUrl = rankTexture?.baseTexture?.resource?.url || 'unknown';
            console.log(`[HighscoreScene] Rank badge row=${index + 1} alias=${alias} url=${resourceUrl} path=${badgePath}`);
          }
        } else if (isDebug) {
          const placeholder = new PIXI.Sprite(PIXI.Texture.WHITE);
          const size = layout.isMobile ? 10 : 12;
          placeholder.width = size;
          placeholder.height = size;
          placeholder.tint = 0xff3355;
          placeholder.alpha = 0.6;
          placeholder.anchor.set(0, 0.5);
          placeholder.x = columns.rank + 40;
          placeholder.y = y + rowStyle.fontSize / 2;
          this.rowsContainer.addChild(placeholder);
        }

        // TASK 1: Use getRankTitle from RankPolicy (single source of truth)
        const playerRankIndex = (score.rank_index !== null && score.rank_index !== undefined)
          ? score.rank_index
          : getRankFromScore(score.score || 0);
        const clampedRank = Math.max(0, Math.min(19, playerRankIndex));

        const rankNameText = new PIXI.Text(getRankTitle(clampedRank), {
          fontFamily: 'Courier New',
          fontSize: Math.max(8, rowStyle.fontSize - 4),
          fill: '#aaaaaa'
        });
        rankNameText.x = columns.name;
        rankNameText.y = y + layout.lineHeight * 0.7;
        this.rowsContainer.addChild(rankNameText);
      });

      if (entriesToDisplay.length > maxRows) {
        const more = new PIXI.Text('...', rowStyle);
        more.x = columns.name;
        more.y = startY + layout.lineHeight * 1.4 * (maxRows + 1);
        this.rowsContainer.addChild(more);
      }
      this.fadeInRows();
    } else {
      this.rowsContainer.alpha = 1;
      const message = this.status === 'EMPTY' ? 'Ingen highscores enda. Vær først!' : 'Ingen data.';
      const empty = new PIXI.Text(message, {
        fontFamily: 'Courier New',
        fontSize: getResponsiveFontSize(layout, 'body'),
        fill: '#ffffff',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: clampTextWidth(layout.width * 0.8, layout)
      });
      empty.anchor.set(0.5, 0);
      empty.x = layout.width / 2;
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

  setupLargeBeerCans(width, height) {
    this.largeBeerCans = [];
    const texture = BeerAsset.getTexture();
    if (!texture || texture === PIXI.Texture.EMPTY) return;

    const largeCanCount = 3;
    for (let i = 0; i < largeCanCount; i++) {
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

      // Very slow animation for big cans - in units per second
      can._driftX = (Math.random() - 0.5) * 24; // pixels per second (±12 px/s, slower)
      can._driftY = (Math.random() - 0.5) * 24;
      can._rotSpeed = (Math.random() - 0.5) * 0.06; // radians per second (±0.03 rad/s, very slow)

      this.largeBeerCansContainer.addChild(can);
      this.largeBeerCans.push(can);
    }
  }

  setupBeerCans(width, height) {
    this.beerCans = [];
    const texture = BeerAsset.getTexture();
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

      this.beerCansContainer.addChild(can);
      this.beerCans.push(can);
    }
  }

  setupPartyHeads(width, height) {
    this.partyHeads = [];
    const maxHeads = 10;
    const images = AssetManifest.loreImages;

    for (let i = 0; i < Math.min(maxHeads, images.length); i++) {
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

  drawLeaderboardPanel(width, height, rowsStartY, layout) {
    if (!this.leaderboardPanel) return;
    this.leaderboardPanel.clear();

    // Calculate panel dimensions based on table area
    // TASK A FIX: Increased from lineHeight * 15 to * 17 to fit all 10 rows + header + rank names
    const panelPadding = layout.padding * 0.8;
    const panelY = rowsStartY - layout.lineHeight * 0.5;
    const panelHeight = Math.min(
      height - panelY - layout.padding * 2.5,
      layout.lineHeight * 17
    );

    // Dark semi-transparent panel with subtle gradient
    this.leaderboardPanel.rect(
      panelPadding,
      panelY,
      width - panelPadding * 2,
      panelHeight
    );
    this.leaderboardPanel.fill({ color: 0x000000, alpha: 0.65 });

    // Neon arcade frame
    this.leaderboardPanel.rect(
      panelPadding,
      panelY,
      width - panelPadding * 2,
      panelHeight
    );
    this.leaderboardPanel.stroke({ color: 0x00ffff, width: 2, alpha: 0.6 });

    // Inner glow
    this.leaderboardPanel.rect(
      panelPadding + 4,
      panelY + 4,
      width - panelPadding * 2 - 8,
      panelHeight - 8
    );
    this.leaderboardPanel.stroke({ color: 0x0088ff, width: 1, alpha: 0.4 });
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

      // Animate large beer cans (background)
      this.largeBeerCans.forEach(can => {
        can.x += can._driftX * dtSec;
        can.y += can._driftY * dtSec;
        can.rotation += can._rotSpeed * dtSec;

        // Wrap around
        if (can.x < -can.width) can.x = width + can.width / 2;
        if (can.x > width + can.width) can.x = -can.width / 2;
        if (can.y < -can.height) can.y = height + can.height / 2;
        if (can.y > height + can.height) can.y = -can.height / 2;
      });

      // Animate beer cans
      this.beerCans.forEach(can => {
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

      // PART B: Update typewriters
      if (this.bannerTypewriter) {
        this.bannerTypewriter.update(delta.deltaTime);
      }
      if (this.commentTypewriter) {
        this.commentTypewriter.update(delta.deltaTime);
      }

      // Speech bubbles are driven by the scene update loop to avoid duplicates
    };

    this.game.app.ticker.add(this.animationTicker);
  }

  // PART C: Spawn speech bubble taunt
  spawnSpeechBubble() {
    this.spawnTauntBubble();
  }

  createButton(text) {
    const container = new PIXI.Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.rect(-80, -20, 160, 40);
    bg.fill({ color: 0x0088ff, alpha: 0.3 });
    bg.stroke({ color: 0x00ffff, width: 2 });
    container.addChild(bg);

    const label = new PIXI.Text(text, {
      fontFamily: 'Courier New',
      fontSize: 16,
      fill: '#00ffff'
    });
    label.anchor.set(0.5);
    container.addChild(label);

    const glow = new PIXI.Graphics();
    glow.rect(-80, -20, 160, 40);
    glow.fill({ color: 0x00ffff, alpha: 0 });
    glow.filters = [new PIXI.BlurFilter(8)];
    container.addChildAt(glow, 0);

    container.on('pointerover', () => {
      bg.clear();
      bg.rect(-80, -20, 160, 40);
      bg.fill({ color: 0x00ffff, alpha: 0.5 });
      bg.stroke({ color: 0x00ffff, width: 2 });
      glow.clear();
      glow.rect(-80, -20, 160, 40);
      glow.fill({ color: 0x00ffff, alpha: 0.4 });
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.rect(-80, -20, 160, 40);
      bg.fill({ color: 0x0088ff, alpha: 0.3 });
      bg.stroke({ color: 0x00ffff, width: 2 });
      glow.clear();
      glow.rect(-80, -20, 160, 40);
      glow.fill({ color: 0x00ffff, alpha: 0 });
    });

    container.on('pointerdown', () => {
      container.scale.set(0.95);
    });

    container.on('pointerup', () => {
      container.scale.set(1);
    });

    return container;
  }

  // PART A: Update loop for bubble timer and updates
  update(delta) {
    // Normalize delta to milliseconds (delta is in frames, ~60fps)
    const dtMs = delta * (1000 / 60);

    // PART B: Update typewriters
    if (this.bannerTypewriter) {
      this.bannerTypewriter.update(delta);
    }
    if (this.commentTypewriter) {
      this.commentTypewriter.update(delta);
    }

    // PART D: Don't spawn bubbles during name entry
    const isEnteringName = this.game.pendingHighscore && !this.game.pendingHighscore.submitted;
    if (isEnteringName) {
      return; // Pause bubble system during name entry
    }

    const entries = Array.isArray(this.entriesNormalized) ? this.entriesNormalized : [];
    try {
      // PART A: Update current bubble
      if (this.currentBubble) {
        this.currentBubble.update(delta);
        if (this.currentBubble.animationTime > this.bubbleLifetimeMs) {
          this.currentBubble.exit(() => {
            this.currentBubble = null;
            this.bubbleTimerMs = 4000 + Math.random() * 4000; // 4-8s
          });
        }
      }
      // PART A: Countdown to next bubble
      else if (this.status === 'LOADED' && entries.length >= 4) {
        if (this.bubbleTimerMs === undefined || this.bubbleTimerMs === null) {
          // Initialize timer on first update after load
          this.bubbleTimerMs = 1500 + Math.random() * 1000; // 1.5-2.5s initial
        }

        this.bubbleTimerMs -= dtMs;
        if (this.bubbleTimerMs <= 0) {
          this.spawnTauntBubble();
          this.bubbleTimerMs = 4000 + Math.random() * 4000; // 4-8s
        }
      } else {
        this.bubbleTimerMs = null;
      }
    } catch (error) {
      this.handleBubbleError(error, 'update');
    }
  }

  // PART 3: Spawn taunt bubble with center positioning
  spawnTauntBubble() {
    try {
      const entries = Array.isArray(this.entriesNormalized) ? this.entriesNormalized : [];
      // Need at least 4 normalized entries for top-3-taunts-rest to work
      if (entries.length < 4) {
        this.bubbleTimerMs = 3000;
        return;
      }

      const { width, height } = this.game.app.screen;

      // Speaker selection (top 3 only)
      const speakerMax = Math.min(3, entries.length);
      const speakerIndex = Math.floor(Math.random() * speakerMax); // Always 0, 1, or 2

      // FIX: Target selection (ranks 4-10 ONLY, never top 3)
      const minTarget = 3; // Index 3 = rank 4
      const maxTarget = Math.min(9, entries.length - 1); // Max index 9 = rank 10
      if (maxTarget < minTarget) {
        this.bubbleTimerMs = 3000;
        return;
      }
      const targetIndex = minTarget + Math.floor(Math.random() * (maxTarget - minTarget + 1));

      const speaker = entries[speakerIndex];
      const target = entries[targetIndex];

      // FIX: Validate entries exist
      if (!speaker || !target) {
        this.bubbleTimerMs = 3000;
        return;
      }

      // FIX: Safely extract names with fallback to playerName
      const speakerName = String(speaker.name ?? '').trim();
      const targetName = String(target.name ?? '').trim();

      // FIX: Validate names are non-empty strings
      if (!speakerName || speakerName.length === 0) {
        this.bubbleTimerMs = 3000;
        return;
      }

      if (!targetName || targetName.length === 0) {
        this.bubbleTimerMs = 3000;
        return;
      }

      // Build context - guaranteed valid
      const ctx = {
        speakerName: speakerName.slice(0, 14).toUpperCase(),
        targetName: targetName.slice(0, 14).toUpperCase(),
        speakerRank: speakerIndex + 1,
        targetRank: targetIndex + 1
      };

      // Get taunt text with context (context is guaranteed valid)
      const tauntText = String(tauntDirector.getRotatingText('highscore_taunt', ctx) ?? '').trim();
      if (!tauntText || tauntText.length === 0) {
        this.bubbleTimerMs = 3000;
        return;
      }

      const layout = createTextLayout(width, height);
      const speakerAnchor = this.getRowAnchor(speakerIndex);
      const bubbleX = speakerAnchor?.x ?? width / 2;
      const bubbleY = speakerAnchor?.y ?? height * 0.4;

      // Create bubble at center position with speaker name from actual leaderboard
      this.currentBubble = new TauntBubble(
        tauntText,
        bubbleX,
        bubbleY,
        width,
        height,
        ctx.speakerName // Always from actual leaderboard entry
      );

      this.container.addChild(this.currentBubble.container);
      const tableBounds = this.getTableBounds(layout, entries.length);
      this.resolveBubblePlacement(this.currentBubble, tableBounds, layout, bubbleX, bubbleY);
    } catch (error) {
      this.handleBubbleError(error, 'spawn');
    }
  }

  // PART B: Helper to get row anchor position for bubble tail
  getRowAnchor(index) {
    const { width, height } = this.game.app.screen;
    const layout = createTextLayout(width, height);

    // Calculate row Y position (approximate based on layout logic)
    const stack = createVerticalStack(layout, { startY: layout.padding, spacing: layout.spacing });

    // Skip title, subtitle, comment, state message
    const titleHeight = layout.lineHeight * 1.2;
    const subtitleHeight = layout.lineHeight * 1.2;
    const commentHeight = layout.lineHeight * 1.5;
    const stateHeight = layout.lineHeight * 1.2;

    const headerY = layout.padding + titleHeight + subtitleHeight + commentHeight + stateHeight + layout.spacing * 4;
    const rowsStartY = headerY + layout.lineHeight * 0.9 + layout.spacing * 0.3;

    // Row position (header + index)
    const rowY = rowsStartY + layout.lineHeight * 1.4 * (index + 1);

    // Position at name column
    const rowX = layout.padding + layout.width * 0.14;

    return { x: rowX, y: rowY };
  }


  destroy() {
    // PART B: Cleanup text rotation timers
    if (this.bannerRotationTimer) {
      clearInterval(this.bannerRotationTimer);
      this.bannerRotationTimer = null;
    }
    if (this.commentRotationTimer) {
      clearTimeout(this.commentRotationTimer);
      this.commentRotationTimer = null;
    }

    // PART C: Cleanup speech bubble
    if (this.currentBubble) {
      this.currentBubble.exit();
      this.currentBubble = null;
    }

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
    this.largeBeerCans = [];
    this.beerCans = [];
    this.partyHeads = [];
    this.confettiParticles = [];
  }
}
