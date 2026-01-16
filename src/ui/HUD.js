import * as PIXI from 'pixi.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { extendLocations } from '../text/phrasePool.js';

import { RankAssets } from '../utils/RankAssets.js';
import { rankManager } from '../managers/RankManager.js';

export class HUD {
  constructor(container, game) {
    this.container = container;
    this.game = game;
    this.hudContainer = new PIXI.Container();
    this.layoutUnsubscribe = null;
    this.container.addChild(this.hudContainer);

    // Rank Elements
    this.rankGroup = new PIXI.Container();
    this.rankIcon = new PIXI.Sprite();
    this.rankBarBg = new PIXI.Graphics();
    this.rankBarFill = new PIXI.Graphics();
    this.rankText = new PIXI.Text('', {
      fontFamily: 'Courier New',
      fontSize: 10,
      fill: '#ffff00'
    });

    this.createHUD();
    this.layoutUnsubscribe = addResponsiveListener((layout) => this.applyLayout(layout));
    this.applyLayout(getCurrentLayout());
  }

  createHUD() {
    // Rank Group
    this.rankGroup.addChild(this.rankBarBg);
    this.rankGroup.addChild(this.rankBarFill);
    this.rankGroup.addChild(this.rankIcon);
    this.rankGroup.addChild(this.rankText);
    this.hudContainer.addChild(this.rankGroup);

    // Score
    this.scoreText = new PIXI.Text('SCORE: 0', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ffff00'
    });
    this.hudContainer.addChild(this.scoreText);

    // Level
    this.levelText = new PIXI.Text('LEVEL: 1', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#00ffff'
    });
    this.hudContainer.addChild(this.levelText);

    // Lives group
    this.livesGroup = new PIXI.Container();
    this.livesBg = new PIXI.Graphics();
    this.livesGroup.addChild(this.livesBg);
    this.livesIcon = new PIXI.Text('♥', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ff8080'
    });
    this.livesGroup.addChild(this.livesIcon);
    this.livesText = new PIXI.Text('LIVES: 3', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#00ff00', // TASK 4: Start with green (default for >= 2 lives)
      stroke: '#000000',
      strokeThickness: 3
    });
    this.livesGroup.addChild(this.livesText);
    this.hudContainer.addChild(this.livesGroup);

    // Easter egg location
    this.locationText = new PIXI.Text('STOKMARKNES', {
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: '#888888'
    });
    this.locationText.anchor.set(1, 0);
    this.hudContainer.addChild(this.locationText);
  }

  update() {
    this.scoreText.text = `SCORE: ${this.game.score}`;
    this.levelText.text = `LEVEL: ${this.game.level}`;
    this.livesText.text = `LIVES: ${this.game.lives}`;

    // TASK 4: Update lives color based on count
    if (this.game.lives === 1) {
      this.livesText.style.fill = '#ff0000'; // Red at 1 life
    } else {
      this.livesText.style.fill = '#00ff00'; // Green at 2+ lives
    }

    this.updateLivesVisuals();

    // Rank Update
    const rankTex = RankAssets.getRankTexture(this.game.rankIndex);
    if (rankTex) {
      this.rankIcon.texture = rankTex;
      // Make it slightly larger as requested
      const maxSz = 50;
      if (this.rankIcon.width > 0) {
        const scale = Math.min(maxSz / this.rankIcon.texture.width, maxSz / this.rankIcon.texture.height);
        this.rankIcon.scale.set(scale);
      }
    }

    // Clearer text
    this.rankText.text = rankManager.getRankString(this.game.rankIndex);
    this.rankText.x = 60; // Fixed offset to clear the icon
    this.rankText.y = 15;

    // XP Bar
    const progress = this.game.getRankProgress();
    const barW = 40;
    const barH = 4;

    this.rankBarBg.clear().rect(0, 42, barW, barH).fill({ color: 0x333333 });
    this.rankBarFill.clear().rect(0, 42, barW * progress, barH).fill({ color: 0xffff00 });

    // Random location updates
    const locations = extendLocations(['STOKMARKNES', 'MELBU', 'HADSEL', 'SORTLAND', 'LOFOTEN']);
    if (Math.random() < 0.001) {
      this.locationText.text = locations[Math.floor(Math.random() * locations.length)];
    }
  }

  applyLayout(layout = getCurrentLayout()) {
    if (!layout || typeof layout.width !== 'number') return;

    const canvasWidth = this.game.getWidth ? this.game.getWidth() : layout.width;
    const margin = layout.isMobile ? 14 : 10;
    const blockSpacing = layout.isMobile ? 26 : 22;
    const scoreFont = layout.isMobile ? 16 : 20;
    const livesFont = layout.isMobile ? 18 : 20;

    this.scoreText.style.fontSize = scoreFont;
    this.levelText.style.fontSize = scoreFont;
    this.livesText.style.fontSize = livesFont;
    this.locationText.style.fontSize = layout.isMobile ? 10 : 12;

    // Rank Position (Top Left)
    this.rankGroup.x = margin;
    this.rankGroup.y = margin;

    // Shift Score and Level to the right of Rank
    const rankOffset = 50;

    this.scoreText.x = margin + rankOffset;
    this.scoreText.y = margin;

    this.levelText.x = margin + rankOffset;
    this.levelText.y = margin + blockSpacing;

    this.locationText.x = canvasWidth - margin;
    this.locationText.y = margin + blockSpacing * 2.5;

    this.updateLivesVisuals();
    this.livesGroup.x = canvasWidth - margin - this.livesGroup.width;
    this.livesGroup.y = margin;
  }

  updateLivesVisuals() {
    if (!this.livesGroup || !this.livesText || !this.livesIcon) return;
    const padding = 8;
    const height = Math.max(this.livesIcon.height, this.livesText.height) + padding;
    this.livesGroup.pivot.set(0, 0);
    this.livesIcon.x = padding / 2;
    this.livesIcon.y = height / 2 - this.livesIcon.height / 2;
    this.livesText.x = this.livesIcon.x + this.livesIcon.width + 6;
    this.livesText.y = height / 2 - this.livesText.height / 2;
    const width = this.livesText.x + this.livesText.width + padding / 2;
    this.livesBg.clear();
    this.livesBg.rect(0, 0, width, height); // Corrected syntax for GraphicsContext or classic PIXI? 
    // PIXI v8 uses .rect().fill() chain or standard drawRect. 
    // Looking at existing code: this.livesBg.drawRoundedRect(0, 0, width, height, 8).
    // I should stick to existing style if it's v7/v8.
    // Wait, the previous view_file for HUD.js showed:
    // this.livesBg.drawRoundedRect(0, 0, width, height, 8);
    // this.livesBg.endFill();
    // I will use that for consistency.

    this.livesBg.clear();
    this.livesBg.roundRect(0, 0, width, height, 8); // v8 syntax prefer roundRect
    this.livesBg.fill({ color: 0x000000, alpha: 0.45 });
  }

  destroy() {
    if (this.layoutUnsubscribe) {
      this.layoutUnsubscribe();
      this.layoutUnsubscribe = null;
    }
  }
}
