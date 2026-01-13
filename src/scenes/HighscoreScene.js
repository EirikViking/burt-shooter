import * as PIXI from 'pixi.js';
import { API } from '../api/API.js';
import { getHighscoreComment } from '../text/phrasePool.js';
import { BUILD_ID } from '../buildInfo.js';
import { addResponsiveListener } from '../ui/responsiveLayout.js';
import { createTextLayout, createVerticalStack, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';

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
  }

  async init() {
    this.container.removeChildren();
    this.entries = [];
    this.status = 'LOADING';
    this.lastError = 'none';

    const { width, height } = this.game.app.screen;
    const layout = createTextLayout(width, height);

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
    const shortError = !this.lastError ? 'none' : (this.lastError.length > 40 ? `${this.lastError.slice(0, 40)}...` : this.lastError);
    this.statusText.text = `status:${this.status} entries:${this.entries.length} err:${shortError} url:${this.apiUrl}`;

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
        const rankText = new PIXI.Text((index + 1).toString().padStart(2, '0'), rowStyle);
        const nameText = new PIXI.Text((score.name || '??').slice(0, 12), rowStyle);
        const scoreText = new PIXI.Text((score.score || 0).toString(), rowStyle);
        const levelText = new PIXI.Text((score.level || 0).toString(), rowStyle);

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

    container.on('pointerover', () => {
      bg.clear();
      bg.rect(-80, -20, 160, 40);
      bg.fill({ color: 0x00ffff, alpha: 0.5 });
      bg.stroke({ color: 0x00ffff, width: 2 });
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.rect(-80, -20, 160, 40);
      bg.fill({ color: 0x0088ff, alpha: 0.3 });
      bg.stroke({ color: 0x00ffff, width: 2 });
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
  }
}
