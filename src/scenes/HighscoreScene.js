import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { RankAssets } from '../utils/RankAssets.js';
import { rankManager } from '../managers/RankManager.js';
import { API } from '../api/API.js';
import { getHighscoreComment } from '../text/phrasePool.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { createTextLayout, createVerticalStack, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';
import { AudioManager } from '../audio/AudioManager.js';

const EMPTY_MESSAGE = 'Ingen har spilt ennå!\nVær den første fra Melbu!';

export class HighscoreScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.highscores = [];
    this.rowsContainer = new PIXI.Container();
    this.decorContainer = new PIXI.Container(); // Behind everything
    this.layoutInfo = null;
    this.layoutUnsubscribe = null;
    this.title = null;
    this.subtitle = null;
    this.commentText = null;
    this.loadingText = null;
    this.backBtn = null;

    // Decorations
    this.floatingItems = [];

    // Attract Mode
    this.attractTimer = null;
    this.attractContainer = new PIXI.Container(); // For flying ship
  }

  async init() {
    this.container.removeChildren();
    this.highscores = [];
    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = addResponsiveListener(() => this.layoutHighscore());

    // Ensure music is playing for scoreboard context
    AudioManager.playMusicContext('scoreboard');

    // Attempt to resubmit pending score if exists
    if (this.game.pendingHighscore) {
      console.log('[HighscoreScene] Attempting to resubmit pending score...');
      try {
        const p = this.game.pendingHighscore;
        // Assuming API.submitScore returns promise
        await API.submitScore(p.name, p.score, p.level, p.rankIndex);
        console.log('[HighscoreScene] Pending score submitted successfully!');
        this.game.pendingHighscore = null;
      } catch (e) {
        console.warn('[HighscoreScene] Could not send pending score, keeping it local.', e);
        // Keep pending to display it locally
      }
    }

    // Layers
    this.decorContainer = new PIXI.Container();
    this.container.addChild(this.decorContainer);

    // UI Layer
    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);

    const titleSize = getResponsiveFontSize(layout, 'title');
    this.title = new PIXI.Text('HIGHSCORES', {
      fontFamily: 'Courier New',
      fontSize: titleSize,
      fill: '#ffff00',
      stroke: '#ff8800',
      strokeThickness: layout.isMobile ? 2 : 3
    });
    this.title.anchor.set(0.5);
    this.container.addChild(this.title);

    const subtitleSize = getResponsiveFontSize(layout, 'subtitle');
    this.subtitle = new PIXI.Text('Stokmarknes sine beste', {
      fontFamily: 'Courier New',
      fontSize: subtitleSize,
      fill: '#00ffff'
    });
    this.subtitle.anchor.set(0.5);
    this.container.addChild(this.subtitle);

    const bodySize = getResponsiveFontSize(layout, 'body');
    this.commentText = new PIXI.Text('', {
      fontFamily: 'Courier New',
      fontSize: bodySize,
      fill: '#aaaaaa',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.9, layout),
      lineHeight: Math.round(bodySize * 1.4)
    });
    this.commentText.anchor.set(0.5);
    this.container.addChild(this.commentText);

    this.rowsContainer = new PIXI.Container();
    this.container.addChild(this.rowsContainer);

    this.loadingText = new PIXI.Text('Laster...', {
      fontFamily: 'Courier New',
      fontSize: getResponsiveFontSize(layout, 'body'),
      fill: '#ffffff'
    });
    this.loadingText.anchor.set(0.5);
    this.container.addChild(this.loadingText);

    // Retry button (hidden initially)
    this.retryBtn = this.createButton('PRØV IGJEN', layout);
    this.retryBtn.visible = false;
    this.retryBtn.on('pointerdown', () => {
      this.retryBtn.visible = false;
      this.loadHighscores();
    });
    this.container.addChild(this.retryBtn);

    this.backBtn = this.createButton('TILBAKE', layout);
    this.backBtn.on('pointerdown', () => {
      // Clear pending on exit if desired, but maybe keep it?
      // Reset game state usually happens on start.
      this.game.switchScene('menu');
    });
    this.container.addChild(this.backBtn);

    this.attractContainer = new PIXI.Container();
    this.container.addChild(this.attractContainer);

    // Initial Decor
    this.createBackgroundDecor();

    this.layoutHighscore();

    // Load highscores
    await this.loadHighscores();
  }

  async loadHighscores() {
    // Show loading state
    if (this.loadingText) {
      this.loadingText.text = 'Laster...';
      this.loadingText.visible = true;
      if (!this.loadingText.parent) {
        this.container.addChild(this.loadingText);
      }
    }
    if (this.retryBtn) {
      this.retryBtn.visible = false;
    }

    try {
      this.highscores = await API.getHighscores();

      // Inject Pending Score if exists (and failed to submit above)
      if (this.game.pendingHighscore) {
        const pending = this.game.pendingHighscore;
        // Check if already in list (simple dup check)
        const exists = this.highscores.find(s => s.name === pending.name && s.score === pending.score && s.timestamp === pending.timestamp);
        if (!exists) {
          this.highscores.push(pending);
          // Re-sort
          this.highscores.sort((a, b) => b.score - a.score);
        }
      }

      // Hide loading text on success
      if (this.loadingText && this.loadingText.parent) {
        this.container.removeChild(this.loadingText);
        this.loadingText = null;
      }
      this.displayHighscores();
    } catch (error) {
      console.error('Failed to load highscores:', error);

      // Show error state with retry button
      if (this.loadingText) {
        this.loadingText.text = 'Kunne ikke laste scores!';
        this.loadingText.visible = true;
      }
      if (this.retryBtn) {
        this.retryBtn.visible = true;
      }

      // Even if failed, show pending score if exists
      if (this.game.pendingHighscore) {
        this.highscores = [this.game.pendingHighscore];
        if (this.loadingText && this.loadingText.parent) {
          this.container.removeChild(this.loadingText);
          this.loadingText = null;
        }
        if (this.retryBtn) {
          this.retryBtn.visible = false;
        }
        this.displayHighscores();
      }
    }
  }

  update(delta) {
    // Animate decorations
    this.floatingItems.forEach(item => {
      item.sprite.x += item.vx * delta;
      item.sprite.y += item.vy * delta;
      item.sprite.rotation += item.vr * delta;

      // Wrap around or bounce? Wrap for seamlessness
      const pad = 100;
      if (item.vx > 0 && item.sprite.x > this.game.app.screen.width + pad) item.sprite.x = -pad;
      if (item.vx < 0 && item.sprite.x < -pad) item.sprite.x = this.game.app.screen.width + pad;
      if (item.vy > 0 && item.sprite.y > this.game.app.screen.height + pad) item.sprite.y = -pad;
      if (item.vy < 0 && item.sprite.y < -pad) item.sprite.y = this.game.app.screen.height + pad;
    });

    // Animate Attract Elements
    this.attractContainer.children.forEach(child => {
      if (child.update) child.update(delta);
    });
  }

  layoutHighscore() {
    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);
    const safeMargin = responsiveLayout.safeArea;

    const titleSize = getResponsiveFontSize(layout, 'title');
    const subtitleSize = getResponsiveFontSize(layout, 'subtitle');
    const bodySize = getResponsiveFontSize(layout, 'body');

    this.title.style.fontSize = titleSize;
    this.subtitle.style.fontSize = subtitleSize;
    this.commentText.style.fontSize = bodySize;
    this.commentText.style.lineHeight = Math.round(bodySize * 1.4);
    this.commentText.style.wordWrapWidth = clampTextWidth(width * 0.9, layout);

    const spacing = layout.isMobile ? 6 : 12;
    const headerSpacing = layout.isMobile ? 8 : 16;

    const startY = Math.max(safeMargin.top, layout.isMobile ? layout.padding : layout.padding * 1.5);
    const stack = createVerticalStack(layout, { startY, spacing });

    this.title.x = width / 2;
    this.title.y = stack.placeElement(this.title, spacing * 0.5);

    this.subtitle.x = width / 2;
    this.subtitle.y = stack.placeElement(this.subtitle, spacing);

    this.commentText.x = width / 2;
    this.commentText.y = stack.placeText(this.commentText, headerSpacing);

    // Table calcs
    const headerY = stack.getCurrentY();
    const rowFontSize = getResponsiveFontSize(layout, 'tableRow');
    // Compact rows to fit 10
    const rowHeight = Math.max(rowFontSize * 1.2, layout.isMobile ? 22 : 26);
    const tableStartY = headerY + rowHeight;
    const maxRows = 10;

    // Centered Table Layout - TIGHTER
    const tableMaxWidth = 460;
    const tableWidth = Math.min(tableMaxWidth, width - (layout.isMobile ? 24 : 80));
    const tableLeft = (width - tableWidth) / 2;

    // Define columns including Icon
    // Rank(#) | Icon | Name | Score | Level
    // Tighten up: Rank(30) Icon(40) Name(180) Score(100) Level(50)
    const columns = layout.isMobile
      ? {
        rank: tableLeft,
        icon: tableLeft + 25,
        name: tableLeft + 60,
        score: tableLeft + tableWidth - 70,
        level: tableLeft + tableWidth
      }
      : {
        rank: tableLeft,
        icon: tableLeft + 40,
        name: tableLeft + 85,
        score: tableLeft + tableWidth - 90, // Closer
        level: tableLeft + tableWidth
      };

    this.layoutInfo = { rowHeight, headerY, tableStartY, columns, maxRows, width, layout, rowFontSize };

    // Draw Separators
    if (this.separators) this.container.removeChild(this.separators);
    this.separators = new PIXI.Graphics();
    this.separators.alpha = 0.2;
    this.container.addChildAt(this.separators, 1); // Behind text

    const sepTop = headerY - 5;
    const sepBottom = tableStartY + maxRows * rowHeight;
    this.separators.stroke({ color: 0x00ffff, width: 1 });

    // Vertical lines between columns
    if (!layout.isMobile) {
      const x1 = columns.name - 10;
      const x2 = columns.score - 10;
      const x3 = columns.level - 40;

      this.separators.moveTo(x1, sepTop).lineTo(x1, sepBottom);
      this.separators.moveTo(x2, sepTop).lineTo(x2, sepBottom);
      this.separators.moveTo(x3, sepTop).lineTo(x3, sepBottom);
    }

    if (this.loadingText) {
      this.loadingText.x = width / 2;
      this.loadingText.y = tableStartY + rowHeight * 2;
    }

    if (this.retryBtn) {
      this.retryBtn.x = width / 2;
      this.retryBtn.y = tableStartY + rowHeight * 4;
    }

    if (this.backBtn) {
      this.backBtn.x = width / 2;
      this.backBtn.y = height - 50;
    }

    this.renderHighscoreRows();
  }

  createBackgroundDecor() {
    this.decorContainer.removeChildren();
    this.floatingItems = [];
    const { width, height } = this.game.app.screen;

    // Pick assets: Photos + Beer + Enemies + Asteroids if possible
    // We can use GameAssets.getEnemyTexture('spaceShips_00X')

    // Define safe zones: Left (< 15%) and Right (> 85%) to ensure text readability
    // Or just use very low alpha everywhere. But instructions said "safe rectangle zone".
    // Let's use left/right columns.

    const count = 5;

    for (let i = 0; i < count; i++) {
      // Random asset selection
      let tex = null;
      const r = Math.random();
      if (r < 0.3) {
        tex = GameAssets.getBeer();
      } else if (r < 0.6) {
        tex = GameAssets.getPhoto(['burtelurt', 'eirik1', 'anja', 'donaldtru'][Math.floor(Math.random() * 4)]);
      } else {
        const enId = `spaceShips_00${Math.floor(Math.random() * 9) + 1}`;
        tex = GameAssets.getEnemyTexture(enId);
      }

      if (!tex) continue;

      const sprite = new PIXI.Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.alpha = 0.08 + Math.random() * 0.07; // 0.08 - 0.15

      // Scale randomization
      const scale = 0.4 + Math.random() * 0.4;
      sprite.scale.set(scale);

      // Position: 50% chance left side, 50% right side
      const side = Math.random() < 0.5 ? 'left' : 'right';
      if (side === 'left') {
        sprite.x = Math.random() * (width * 0.2);
      } else {
        sprite.x = width * 0.8 + Math.random() * (width * 0.2);
      }
      sprite.y = Math.random() * height;

      this.decorContainer.addChild(sprite);

      this.floatingItems.push({
        sprite,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        vr: (Math.random() - 0.5) * 0.005
      });
    }
  }

  displayHighscores() {
    // Lore comments
    const comments = [
      'Er du tøff nok til å slå disse?',
      'Melbu Legends - Forever.',
      'Lofotens Stolthet.',
      'Har du drukket nok tran?',
      'Burt venter på din score.',
      'Kun for ekte vikinger.',
      'Husk: Ingen skam å snu.',
      'Vesterålens Voktere.',
      'En sverd i hånden er bedre enn ti på taket.',
      'Valhalla kaller!'
    ];

    const randomComment = this.highscores.length > 0
      ? comments[Math.floor(Math.random() * comments.length)]
      : getHighscoreComment(false);

    this.commentText.text = randomComment;

    this.layoutHighscore();
    // Debug Rank Overlay
    if (this.game.rankIndex !== undefined) {
      this.showRankDebug();
    }
    this.startAttractMode();
  }

  showRankDebug() {
    // DEBUG: Show text to confirm we have rank data
    if (window.location.href.includes('localhost')) {
      const dText = new PIXI.Text(`DEBUG RANK: ${this.game.rankIndex}`, {
        fontSize: 12, fill: '#00ff00'
      });
      dText.x = 10;
      dText.y = 10;
      this.container.addChild(dText);
    }
  }

  startAttractMode() {
    if (this.attractTimer) clearTimeout(this.attractTimer);

    // 10s idle trigger
    this.attractTimer = setTimeout(() => {
      if (!this.container || !this.container.parent) return;

      // 1. Subtle pulse on Rank 1 if exists
      const rank1 = this.rowsContainer.children.find(c => c.style && c.style.fill === '#ffff00');
      if (rank1) {
        let p = 0;
        const t = (d) => {
          p += 0.05 * d;
          rank1.alpha = 0.6 + Math.sin(p) * 0.4;
          if (p > Math.PI * 2) {
            rank1.alpha = 1;
            this.game.app.ticker.remove(t);
          }
        };
        this.game.app.ticker.add(t);
      }

      // 2. Flyby Ship
      const shipTex = GameAssets.getShipTexture('player_01');
      if (shipTex) {
        const ship = new PIXI.Sprite(shipTex);
        ship.anchor.set(0.5);
        ship.scale.set(0.5);

        // Start left, fly right
        const startY = this.game.app.screen.height * (0.2 + Math.random() * 0.6);
        ship.x = -50;
        ship.y = startY;
        ship.rotation = Math.PI / 2; // Pointing right? Texture normally points up?
        // Usually player ship points UP. So rotate 90 deg (PI/2) to point right.

        this.attractContainer.addChild(ship);

        // Animation logic attached to sprite for update loop
        ship.update = (dt) => {
          ship.x += 5 * dt; // Fast flyby
          ship.y += Math.sin(ship.x * 0.01) * 2; // Waviness
          if (ship.x > this.game.app.screen.width + 100) {
            ship.destroy();
            // Clean from container child list automatically by destroy?
            // Need to remove from our update loop check? 
            // We iterate children in update(), destroying removes from parent, so next iter safe.
          }
        };
      }

    }, 10000);
  }

  renderHighscoreRows(layout) {
    if (!this.layoutInfo) return;
    const { rowHeight, headerY, tableStartY, columns, maxRows, width, rowFontSize } = this.layoutInfo;

    this.rowsContainer.removeChildren();

    const headerFontSize = getResponsiveFontSize(layout, 'tableHeader');
    const headerStyle = {
      fontFamily: 'Courier New',
      fontSize: headerFontSize,
      fill: '#666666'
    };

    const headerEntries = layout.isMobile
      ? [
        { text: '#', x: columns.rank },
        { text: 'NAVN', x: columns.name },
        { text: 'SCORE', x: columns.score },
        { text: 'LV', x: columns.level }
      ]
      : [
        { text: 'RANK', x: columns.rank },
        { text: 'NAVN', x: columns.name },
        { text: 'SCORE', x: columns.score },
        { text: 'LEVEL', x: columns.level }
      ];

    headerEntries.forEach((entry) => {
      const text = new PIXI.Text(entry.text, headerStyle);
      text.x = entry.x;
      text.y = headerY;
      if (entry.text.startsWith('LV') || entry.text.startsWith('LEVEL')) text.anchor.set(1, 0);
      this.rowsContainer.addChild(text);
    });

    if (!this.highscores || this.highscores.length === 0) {
      if (!this.loadingText) {
        // Empty state handled elsewhere or just blank
      }
      return;
    }

    const rowStyle = {
      fontFamily: 'Courier New',
      fontSize: rowFontSize,
      fill: '#ffffff'
    };

    this.highscores.forEach((score, index) => {
      if (index >= maxRows) return;

      const isPending = score.pending === true;

      // Rank
      const rankText = new PIXI.Text((index + 1).toString(), rowStyle);
      rankText.x = columns.rank;
      rankText.y = tableStartY + index * rowHeight;
      this.rowsContainer.addChild(rankText);

      // Rank Icon
      const scoreValue = typeof score.score === 'number' ? score.score : parseInt(score.score, 10) || 0;
      let rankIdx = score.rankIndex;
      if (rankIdx === undefined || rankIdx === null) {
        rankIdx = rankManager.getRankFromScore(scoreValue);
      }

      const iconTex = RankAssets.getRankTexture(rankIdx || 0);
      if (iconTex) {
        const icon = new PIXI.Sprite(iconTex);
        icon.anchor.set(0.5);
        const maxH = rowFontSize * 1.5;
        const scale = Math.min(maxH / icon.texture.height, maxH / icon.texture.width);
        icon.scale.set(scale);
        icon.x = columns.icon;
        icon.y = tableStartY + index * rowHeight + rowHeight * 0.4;
        this.rowsContainer.addChild(icon);
      }

      // Name
      const nameColWidth = columns.score - columns.name - (layout.isMobile ? 8 : 20);
      const charWidth = rowFontSize * 0.6;
      const maxChars = Math.max(4, Math.floor(nameColWidth / charWidth));
      let cleanedName = score.name.replace(/[^\w\sÆØÅæøå]/g, '').trim();
      if (isPending) cleanedName = "(YOU) " + cleanedName;

      const trimmedName = cleanedName.length > maxChars ? `${cleanedName.slice(0, maxChars - 1)}…` : cleanedName;

      const nameColor = isPending ? '#ffff00' : '#ffffff';
      const nameText = new PIXI.Text(trimmedName, { ...rowStyle, fill: nameColor });
      nameText.x = columns.name;
      nameText.y = tableStartY + index * rowHeight;
      this.rowsContainer.addChild(nameText);

      // Score
      const scoreColor = index === 0 ? '#ffff00' : index === 1 ? '#cccccc' : index === 2 ? '#ff8844' : '#00ffff';
      const scoreText = new PIXI.Text(scoreValue.toString(), { ...rowStyle, fill: scoreColor });
      scoreText.x = columns.score;
      scoreText.y = tableStartY + index * rowHeight;
      this.rowsContainer.addChild(scoreText);

      // Level
      const levelText = new PIXI.Text(score.level.toString(), rowStyle);
      levelText.anchor.set(1, 0);
      levelText.x = columns.level;
      levelText.y = tableStartY + index * rowHeight;
      this.rowsContainer.addChild(levelText);
    });
  }

  createButton(text, layout) {
    const container = new PIXI.Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const btnWidth = layout?.isMobile ? 160 : 180;
    const btnHeight = layout?.isMobile ? 36 : 40;
    const fontSize = getResponsiveFontSize(layout || { isMobile: false }, 'button');

    const bg = new PIXI.Graphics();
    bg.rect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
    bg.fill({ color: 0x0088ff, alpha: 0.3 });
    bg.stroke({ color: 0x00ffff, width: 2 });
    container.addChild(bg);

    const label = new PIXI.Text(text, {
      fontFamily: 'Courier New',
      fontSize: fontSize,
      fill: '#00ffff'
    });
    label.anchor.set(0.5);
    container.addChild(label);

    container.on('pointerover', () => {
      bg.clear();
      bg.rect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
      bg.fill({ color: 0x00ffff, alpha: 0.5 });
      bg.stroke({ color: 0x00ffff, width: 2 });
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.rect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
      bg.fill({ color: 0x0088ff, alpha: 0.3 });
      bg.stroke({ color: 0x00ffff, width: 2 });
    });

    return container;
  }

  destroy() {
    if (this.attractTimer) clearTimeout(this.attractTimer);
    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = null;
    this.container.destroy({ children: true });
  }
}
