import * as PIXI from 'pixi.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { extendLocations } from '../text/phrasePool.js';

import { RankAssets } from '../utils/RankAssets.js';
import { rankManager } from '../managers/RankManager.js';
import { onLanguageChange, t } from '../i18n/index.ts';

export class HUD {
  constructor(container, game) {
    this.container = container;
    this.game = game;
    this.hudContainer = new PIXI.Container();
    this.layoutUnsubscribe = null;
    this.langUnsubscribe = null;
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
    this.applyLanguage();
    this.langUnsubscribe = onLanguageChange(() => this.applyLanguage());
  }

  createHUD() {
    // Rank Group
    this.rankGroup.addChild(this.rankBarBg);
    this.rankGroup.addChild(this.rankBarFill);
    this.rankGroup.addChild(this.rankIcon);
    this.rankGroup.addChild(this.rankText);
    this.hudContainer.addChild(this.rankGroup);

    // Score
    this.scoreText = new PIXI.Text(t('hud.score', { score: 0 }), {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ffff00'
    });
    this.hudContainer.addChild(this.scoreText);
    this.scoreMultiplierText = new PIXI.Text('', {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.scoreMultiplierText.visible = false;
    this.hudContainer.addChild(this.scoreMultiplierText);

    // Level
    this.levelText = new PIXI.Text(t('hud.level', { level: 1 }), {
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
    this.livesText = new PIXI.Text(t('hud.lives', { lives: 3 }), {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#00ff00', // TASK 4: Start with green (default for >= 2 lives)
      stroke: '#000000',
      strokeThickness: 3
    });
    this.livesGroup.addChild(this.livesText);
    this.hudContainer.addChild(this.livesGroup);

    // Active powerup indicator
    this.activePowerupGroup = new PIXI.Container();
    this.activePowerupBg = new PIXI.Graphics();
    this.activePowerupText = new PIXI.Text('', {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.activePowerupTimer = new PIXI.Text('', {
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.activePowerupGroup.addChild(this.activePowerupBg);
    this.activePowerupGroup.addChild(this.activePowerupText);
    this.activePowerupGroup.addChild(this.activePowerupTimer);
    this.activePowerupGroup.visible = false;
    this.hudContainer.addChild(this.activePowerupGroup);

    // Easter egg location
    this.locationText = new PIXI.Text(t('hud.location.stokmarknes'), {
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: '#888888'
    });
    this.locationText.anchor.set(1, 0);
    this.hudContainer.addChild(this.locationText);
  }

  update() {
    this.scoreText.text = t('hud.score', { score: this.game.score });
    const mult = Number(this.game.scoreMultiplier) || 1;
    if (mult > 1) {
      this.scoreMultiplierText.text = `x${mult}`;
      this.scoreMultiplierText.visible = true;
      const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.08;
      this.scoreMultiplierText.scale.set(pulse);
      this.scoreMultiplierText.x = this.scoreText.x + this.scoreText.width + 10;
      this.scoreMultiplierText.y = this.scoreText.y + 2;
    } else {
      this.scoreMultiplierText.visible = false;
      this.scoreMultiplierText.scale.set(1);
    }
    this.levelText.text = t('hud.level', { level: this.game.level });
    this.livesText.text = t('hud.lives', { lives: this.game.lives });

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
    const locations = extendLocations([
      t('hud.location.stokmarknes'),
      t('hud.location.melbu'),
      t('hud.location.hadsel'),
      t('hud.location.sortland'),
      t('hud.location.lofoten')
    ]);
    if (Math.random() < 0.001) {
      this.locationText.text = locations[Math.floor(Math.random() * locations.length)];
    }

    this.updateActivePowerup();
  }

  updateActivePowerup() {
    const player = this.game?.scenes?.play?.player;
    const state = player?.getActivePowerupState ? player.getActivePowerupState() : null;
    if (!state || !state.label) {
      this.activePowerupGroup.visible = false;
      return;
    }

    const remaining = Math.max(0, Math.ceil((state.remainingMs || 0) / 1000));
    this.activePowerupText.text = t('hud.powerup', { label: state.label });
    this.activePowerupTimer.text = remaining ? `${remaining}s` : '';
    this.activePowerupTimer.x = this.activePowerupText.width + 10;
    this.activePowerupTimer.y = 0;

    const paddingX = 8;
    const paddingY = 6;
    const width = this.activePowerupText.width + this.activePowerupTimer.width + paddingX * 2 + 6;
    const height = Math.max(this.activePowerupText.height, this.activePowerupTimer.height) + paddingY * 2;
    this.activePowerupBg.clear();
    this.activePowerupBg.roundRect(0, 0, width, height, 8);
    this.activePowerupBg.fill({ color: 0x000000, alpha: 0.5 });

    this.activePowerupText.x = paddingX;
    this.activePowerupText.y = paddingY - 2;
    this.activePowerupGroup.visible = true;

    const canvasWidth = this.game.getWidth ? this.game.getWidth() : 0;
    if (canvasWidth) {
      this.activePowerupGroup.x = canvasWidth - 10 - width;
    }
  }

  applyLanguage() {
    if (this.scoreText) {
      this.scoreText.text = t('hud.score', { score: this.game?.score ?? 0 });
    }
    if (this.levelText) {
      this.levelText.text = t('hud.level', { level: this.game?.level ?? 0 });
    }
    if (this.livesText) {
      this.livesText.text = t('hud.lives', { lives: this.game?.lives ?? 0 });
    }
    if (this.locationText) {
      this.locationText.text = t('hud.location.stokmarknes');
    }
    this.updateActivePowerup();
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
    this.scoreMultiplierText.x = this.scoreText.x + this.scoreText.width + 10;
    this.scoreMultiplierText.y = this.scoreText.y + 2;

    this.levelText.x = margin + rankOffset;
    this.levelText.y = margin + blockSpacing;

    this.locationText.x = canvasWidth - margin;
    this.locationText.y = margin + blockSpacing * 2.5;

    this.updateLivesVisuals();
    this.livesGroup.x = canvasWidth - margin - this.livesGroup.width;
    this.livesGroup.y = margin;

    if (this.activePowerupGroup) {
      this.activePowerupGroup.x = canvasWidth - margin - this.activePowerupGroup.width;
      this.activePowerupGroup.y = this.livesGroup.y + this.livesGroup.height + 6;
    }
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
    if (this.langUnsubscribe) {
      this.langUnsubscribe();
      this.langUnsubscribe = null;
    }
  }
}
