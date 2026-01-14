import * as PIXI from 'pixi.js';
import { API } from '../api/API.js';
import { getHighscoreComment, getLeaderboardTaunt } from '../text/phrasePool.js';
import { BUILD_ID } from '../buildInfo.js';
import { addResponsiveListener } from '../ui/responsiveLayout.js';
import { createTextLayout, createVerticalStack, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';
import { BeerAsset } from '../utils/BeerAsset.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { getRankFromScore } from '../shared/RankPolicy.js';
import { RankAssets } from '../utils/RankAssets.js';
import { getRankName } from '../utils/RankNames.js';

const API_PATH = '/api/highscores';
const FETCH_TIMEOUT_MS = 6000;

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
    this.lastError = 'none';
    this.loadingTimer = null;
    this.apiUrl = new URL(API_PATH, window.location.origin).toString();
    this.fetchToken = 0;
    this.fetchController = null;
    this.rowsFadeTicker = null;

    // Trophy Room Assets
    this.beerCansContainer = new PIXI.Container();
    this.partyHeadsContainer = new PIXI.Container();
    this.scanlineOverlay = null;
    this.tauntBanner = null;
    this.tauntTimer = 0;
    this.tauntInterval = 5000 + Math.random() * 3000; // 5-8s
    this.animationTicker = null;
    this.beerCans = [];
    this.partyHeads = [];
  }

  async init() {
    this.container.removeChildren();
    this.entries = [];
    this.status = 'LOADING';
    this.lastError = 'none';

    // Load beer can texture
    await BeerAsset.ensureLoaded();

    const { width, height } = this.game.app.screen;
    const layout = createTextLayout(width, height);

    // Layer setup: background effects -> beer cans -> party heads -> content -> taunt banner -> scanline
    this.beerCansContainer = new PIXI.Container();
    this.beerCansContainer.zIndex = -10;
    this.container.addChild(this.beerCansContainer);

    this.partyHeadsContainer = new PIXI.Container();
    this.partyHeadsContainer.zIndex = -5;
    this.container.addChild(this.partyHeadsContainer);

    this.setupBeerCans(width, height);
    this.setupPartyHeads(width, height);

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

    this.buildStamp = new PIXI.Text(`build: ${BUILD_ID}`, {
      fontFamily: 'Courier New',
      fontSize: getResponsiveFontSize(layout, 'small') - 1,
      fill: '#66fffe',
      align: 'right'
    });
    this.buildStamp.anchor.set(1, 1);
    this.container.addChild(this.buildStamp);

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
  }

  layoutHighscore() {
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
    this.renderHighscoreRows(rowsStartY, layout);

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

    this.buildStamp.x = width - layout.padding / 2;
    this.buildStamp.y = height - layout.padding / 2;
  }

  async fetchHighscores() {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
    if (this.fetchController) {
      this.fetchController.abort();
      this.fetchController = null;
    }
    this.fetchToken += 1;
    const token = this.fetchToken;
    this.setState('LOADING');
    this.lastError = 'none';
    const url = this.apiUrl;
    console.log('[HighscoreScene] Fetching highscores from', url);

    const controller = new AbortController();
    this.fetchController = controller;
    this.loadingTimer = window.setTimeout(() => {
      if (token !== this.fetchToken) return;
      controller.abort();
      this.handleFetchError(new Error('timeout'), token);
    }, FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (token !== this.fetchToken) return;
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (token !== this.fetchToken) return;
      if (this.loadingTimer) {
        clearTimeout(this.loadingTimer);
        this.loadingTimer = null;
      }
      this.fetchController = null;
      this.entries = Array.isArray(data) ? data : [];
      this.comment.text = getHighscoreComment(this.entries.length > 0);
      if (this.entries.length > 0) {
        this.setState('LOADED');
      } else {
        this.setState('EMPTY');
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

  renderHighscoreRows(startY, layout) {
    this.rowsContainer.removeChildren();
    if (this.status === 'LOADED') {
      const rowStyle = {
        fontFamily: 'Courier New',
        fontSize: getResponsiveFontSize(layout, 'tableRow'),
        fill: '#ffffff'
      };
      const columns = {
        rank: layout.padding,
        name: layout.padding + layout.width * 0.14,
        score: layout.width - layout.padding - (layout.isMobile ? 120 : 180),
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

      this.entries.slice(0, maxRows).forEach((score, index) => {
        const y = startY + layout.lineHeight * 1.4 * (index + 1);
        const isTop3 = index < 3;

        // Premium glow for top 3
        if (isTop3) {
          const glow = new PIXI.Graphics();
          glow.rect(layout.padding - 5, y - 2, layout.width - layout.padding * 2 + 10, layout.lineHeight * 1.2);
          glow.fill({ color: 0xffaa00, alpha: 0.15 });
          glow.filters = [new PIXI.BlurFilter(4)];
          this.rowsContainer.addChild(glow);
        }

        const rankStyle = isTop3 ? { ...rowStyle, fill: '#ffdd00', fontSize: rowStyle.fontSize + 2 } : rowStyle;
        const nameStyle = isTop3 ? { ...rowStyle, fill: '#ffff88', fontSize: rowStyle.fontSize + 1 } : rowStyle;

        const rankText = new PIXI.Text((index + 1).toString().padStart(2, '0'), rankStyle);
        const nameText = new PIXI.Text((score.name || '??').slice(0, 12), nameStyle);
        const scoreText = new PIXI.Text((score.score || 0).toString(), isTop3 ? nameStyle : rowStyle);
        const levelText = new PIXI.Text((score.level || 0).toString(), isTop3 ? nameStyle : rowStyle);

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

        // Add rank sprite and rank name
        try {
          // Compute player rank from score
          const playerRankIndex = score.rank_index !== null && score.rank_index !== undefined
            ? score.rank_index
            : getRankFromScore(score.score || 0);

          // Clamp to valid range (0-19)
          const clampedRank = Math.max(0, Math.min(19, playerRankIndex));

          // Rank sprite
          const rankTexture = RankAssets.getRankTexture(clampedRank);
          console.log(`[HighscoreScene] Rank ${clampedRank} texture:`, rankTexture, 'valid:', rankTexture && rankTexture.valid);

          if (rankTexture) {
            const rankSprite = new PIXI.Sprite(rankTexture);
            const spriteSize = layout.isMobile ? 20 : 24;
            rankSprite.width = spriteSize;
            rankSprite.height = spriteSize;
            rankSprite.x = columns.rank + 30; // Position after placement text
            rankSprite.y = y - 2;
            console.log(`[HighscoreScene] Adding rank sprite at (${rankSprite.x}, ${rankSprite.y}), size: ${spriteSize}`);
            this.rowsContainer.addChild(rankSprite);
          } else {
            console.warn(`[HighscoreScene] No texture for rank ${clampedRank}`);
          }

          // Rank name label
          const rankNameText = new PIXI.Text(getRankName(clampedRank), {
            fontFamily: 'Courier New',
            fontSize: Math.max(8, rowStyle.fontSize - 4),
            fill: '#aaaaaa'
          });
          rankNameText.x = columns.name;
          rankNameText.y = y + layout.lineHeight * 0.7;
          this.rowsContainer.addChild(rankNameText);
        } catch (error) {
          console.error('Error rendering rank sprite/name:', error);
        }
      });

      if (this.entries.length > maxRows) {
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
    this.rowsContainer.alpha = 0;
    let elapsed = 0;
    const duration = 420;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      this.rowsContainer.alpha = Math.min(1, elapsed / duration);
      if (elapsed >= duration) {
        this.rowsContainer.alpha = 1;
        this.game.app.ticker.remove(ticker);
        this.rowsFadeTicker = null;
      }
    };
    this.rowsFadeTicker = ticker;
    this.game.app.ticker.add(ticker);
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

      // Animation properties
      can._driftX = (Math.random() - 0.5) * 0.3;
      can._driftY = (Math.random() - 0.5) * 0.3;
      can._rotation = (Math.random() - 0.5) * 0.005;

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

      // Animation properties
      sprite._driftX = (Math.random() - 0.5) * 0.4;
      sprite._driftY = (Math.random() - 0.5) * 0.4;
      sprite._rotation = (Math.random() - 0.5) * 0.008;

      this.partyHeadsContainer.addChild(sprite);
      this.partyHeads.push(sprite);
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

  startAnimationLoop() {
    if (!this.game?.app?.ticker) return;
    if (this.animationTicker) {
      this.game.app.ticker.remove(this.animationTicker);
    }

    this.animationTicker = (delta) => {
      const dt = delta.deltaTime;
      const { width, height } = this.game.app.screen;

      // Animate beer cans
      this.beerCans.forEach(can => {
        can.x += can._driftX * dt;
        can.y += can._driftY * dt;
        can.rotation += can._rotation * dt;

        // Wrap around
        if (can.x < -can.width) can.x = width + can.width / 2;
        if (can.x > width + can.width) can.x = -can.width / 2;
        if (can.y < -can.height) can.y = height + can.height / 2;
        if (can.y > height + can.height) can.y = -can.height / 2;
      });

      // Animate party heads
      this.partyHeads.forEach(head => {
        head.x += head._driftX * dt;
        head.y += head._driftY * dt;
        head.rotation += head._rotation * dt;

        // Wrap around
        if (head.x < -head.width) head.x = width + head.width / 2;
        if (head.x > width + head.width) head.x = -head.width / 2;
        if (head.y < -head.height) head.y = height + head.height / 2;
        if (head.y > height + head.height) head.y = -head.height / 2;
      });

      // Taunt system
      if (this.status === 'LOADED' && this.entries.length >= 4) {
        this.tauntTimer += dt * 16.67;
        if (this.tauntTimer >= this.tauntInterval && !this.tauntBanner.visible) {
          this.showTaunt();
          this.tauntTimer = 0;
          this.tauntInterval = 5000 + Math.random() * 3000;
        }
      }
    };

    this.game.app.ticker.add(this.animationTicker);
  }

  showTaunt() {
    if (!this.entries || this.entries.length < 4) return;

    // Pick random from top 3 and target from 4-10
    const speakerIndex = Math.floor(Math.random() * 3);
    const targetIndex = 3 + Math.floor(Math.random() * Math.min(7, this.entries.length - 3));

    const speaker = this.entries[speakerIndex];
    const target = this.entries[targetIndex];

    if (!speaker || !target) return;

    const speakerName = (speaker.name || '??').slice(0, 12).toUpperCase();
    const targetName = (target.name || '??').slice(0, 12).toUpperCase();
    const tauntText = getLeaderboardTaunt(targetName);
    const fullText = `${speakerName} til ${tauntText}`;

    // Clear and rebuild taunt banner
    this.tauntBanner.removeChildren();

    const { width } = this.game.app.screen;
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, Math.min(width * 0.8, 600), 50);
    bg.fill({ color: 0xff4400, alpha: 0.85 });
    bg.stroke({ color: 0xffff00, width: 3 });
    this.tauntBanner.addChild(bg);

    const text = new PIXI.Text(fullText, {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#ffffff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: Math.min(width * 0.75, 580)
    });
    text.anchor.set(0.5);
    text.x = bg.width / 2;
    text.y = bg.height / 2;
    this.tauntBanner.addChild(text);

    // Position at top center
    this.tauntBanner.x = (width - bg.width) / 2;
    this.tauntBanner.y = -60;
    this.tauntBanner.visible = true;

    // Slide in animation
    let elapsed = 0;
    const slideIn = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      const progress = Math.min(1, elapsed / 300);
      this.tauntBanner.y = -60 + progress * 100; // Slide to y=40

      if (progress >= 1) {
        this.game.app.ticker.remove(slideIn);
        // Hold for 2s, then fade out
        setTimeout(() => {
          let fadeElapsed = 0;
          const fadeOut = (delta) => {
            fadeElapsed += delta.deltaTime * 16.67;
            const fadeProgress = Math.min(1, fadeElapsed / 400);
            this.tauntBanner.alpha = 1 - fadeProgress;

            if (fadeProgress >= 1) {
              this.game.app.ticker.remove(fadeOut);
              this.tauntBanner.visible = false;
              this.tauntBanner.alpha = 1;
            }
          };
          this.game.app.ticker.add(fadeOut);
        }, 2000);
      }
    };
    this.game.app.ticker.add(slideIn);
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
    this.beerCans = [];
    this.partyHeads = [];
  }
}
