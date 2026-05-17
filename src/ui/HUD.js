import * as PIXI from 'pixi.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { extendLocations } from '../text/phrasePool.js';

import { RankAssets } from '../utils/RankAssets.js';
import { rankManager } from '../managers/RankManager.js';

function normalizeTextStyle(style = {}) {
  const next = { ...style };
  if (next.strokeThickness !== undefined) {
    next.stroke = {
      color: next.stroke || '#000000',
      width: next.strokeThickness
    };
    delete next.strokeThickness;
  }
  return next;
}

function createText(text, style) {
  return new PIXI.Text({ text, style: normalizeTextStyle(style) });
}

export class HUD {
  constructor(container, game) {
    this.container = container;
    this.game = game;
    this.hudContainer = new PIXI.Container();
    this.layoutUnsubscribe = null;
    this.container.addChild(this.hudContainer);
    this.leftPanel = new PIXI.Graphics();
    this.rightPanel = new PIXI.Graphics();
    this.missionPanel = new PIXI.Graphics();
    this.missionLabel = null;
    this.missionText = null;

    // Rank Elements
    this.rankGroup = new PIXI.Container();
    this.rankIcon = new PIXI.Sprite();
    this.rankBarBg = new PIXI.Graphics();
    this.rankBarFill = new PIXI.Graphics();
    this.rankText = createText('', {
      fontFamily: 'Courier New',
      fontSize: 10,
      fill: '#ffff00'
    });

    this.createHUD();
    this.layoutUnsubscribe = addResponsiveListener((layout) => this.applyLayout(layout));
    this.applyLayout(getCurrentLayout());
  }

  createHUD() {
    this.hudContainer.addChild(this.leftPanel);
    this.hudContainer.addChild(this.rightPanel);
    this.hudContainer.addChild(this.missionPanel);

    // Rank Group
    this.rankGroup.addChild(this.rankBarBg);
    this.rankGroup.addChild(this.rankBarFill);
    this.rankGroup.addChild(this.rankIcon);
    this.rankGroup.addChild(this.rankText);
    this.hudContainer.addChild(this.rankGroup);

    // Score
    this.scoreText = createText('SCORE: 0', {
      fontFamily: 'Courier New',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#f8fbff',
      stroke: '#00111d',
      strokeThickness: 3
    });
    this.hudContainer.addChild(this.scoreText);
    this.scoreMultiplierText = createText('', {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.scoreMultiplierText.visible = false;
    this.hudContainer.addChild(this.scoreMultiplierText);

    // Level
    this.levelText = createText('LEVEL: 1', {
      fontFamily: 'Courier New',
      fontSize: 15,
      fontWeight: 'bold',
      fill: '#75ecff',
      stroke: '#00111d',
      strokeThickness: 3
    });
    this.hudContainer.addChild(this.levelText);

    // Lives group
    this.livesGroup = new PIXI.Container();
    this.livesBg = new PIXI.Graphics();
    this.livesGroup.addChild(this.livesBg);
    this.livesIcon = createText('\u2665', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ff8080'
    });
    this.livesGroup.addChild(this.livesIcon);
    this.livesText = createText('LIVES: 3', {
      fontFamily: 'Courier New',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#00ff00', // TASK 4: Start with green (default for >= 2 lives)
      stroke: '#000000',
      strokeThickness: 3
    });
    this.livesGroup.addChild(this.livesText);
    this.hudContainer.addChild(this.livesGroup);

    // Active powerup indicator
    this.activePowerupGroup = new PIXI.Container();
    this.activePowerupBg = new PIXI.Graphics();
    this.activePowerupBarBg = new PIXI.Graphics();
    this.activePowerupBarFill = new PIXI.Graphics();
    this.activePowerupText = createText('', {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.activePowerupTimer = createText('', {
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.activePowerupGroup.addChild(this.activePowerupBg);
    this.activePowerupGroup.addChild(this.activePowerupText);
    this.activePowerupGroup.addChild(this.activePowerupTimer);
    this.activePowerupGroup.addChild(this.activePowerupBarBg);
    this.activePowerupGroup.addChild(this.activePowerupBarFill);
    this.activePowerupGroup.visible = false;
    this.hudContainer.addChild(this.activePowerupGroup);

    this.missionLabel = createText('MISSION STATUS', {
      fontFamily: 'Courier New',
      fontSize: 10,
      fontWeight: 'bold',
      fill: '#7ee9ff',
      align: 'center'
    });
    this.missionLabel.anchor.set(0.5);
    this.hudContainer.addChild(this.missionLabel);

    this.missionText = createText('WAVE 1 / HOSTILES 0', {
      fontFamily: 'Courier New',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#f8fbff',
      stroke: '#00111d',
      strokeThickness: 3,
      align: 'center'
    });
    this.missionText.anchor.set(0.5);
    this.hudContainer.addChild(this.missionText);

    // Rotating arcade-sector label.
    this.locationText = createText('ORBITAL ARCADE', {
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: '#9eb7c0'
    });
    this.locationText.anchor.set(1, 0);
    this.hudContainer.addChild(this.locationText);
  }

  update() {
    this.scoreText.text = `SCORE ${this.formatScore(this.game.score)}`;
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
    this.levelText.text = `LEVEL ${this.game.level}`;
    this.livesText.text = `LIVES ${this.game.lives}`;
    this.updateMissionStatus();

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
    const locations = extendLocations(['ORBITAL ARCADE', 'NEON BELT', 'PIXEL DRIFT', 'BONUS SECTOR', 'CABINET CORE']);
    if (Math.random() < 0.001) {
      this.locationText.text = locations[Math.floor(Math.random() * locations.length)];
    }

    this.updateActivePowerup();
  }

  formatScore(score) {
    const value = Number(score) || 0;
    return value.toLocaleString('en-US');
  }

  updateMissionStatus() {
    if (!this.missionText) return;
    const play = this.game?.scenes?.play;
    const manager = play?.enemyManager;
    const activeEnemies = manager?.enemies?.filter(enemy => enemy?.active !== false && enemy?.kind !== 'bonus_drone').length || 0;
    const activeBullets = play?.bulletManager?.enemyBullets?.filter(bullet => bullet?.active !== false).length || 0;
    const waveTotal = manager?.normalWavesTotal || 0;
    const waveIndex = Number.isFinite(manager?.currentWaveIndex) ? manager.currentWaveIndex + 1 : 1;
    const phase = manager?.phase || 'WAVES';
    const state = manager?.state || 'IDLE';

    if (phase === 'BOSS' || state === 'BOSS_ACTIVE' || state === 'BOSS_GATE') {
      const bossHealth = manager?.boss ? Math.max(0, Math.ceil(manager.boss.health)) : null;
      this.missionText.text = bossHealth === null
        ? 'BOSS SIGNAL INBOUND'
        : `BOSS HP ${bossHealth}`;
      return;
    }

    if (state === 'LEVEL_COMPLETE') {
      this.missionText.text = 'SECTOR CLEAR';
      return;
    }

    if (state === 'WAVE_BRIEFING') {
      this.missionText.text = `INCOMING WAVE ${Math.min(waveIndex, waveTotal)}/${waveTotal}`;
      return;
    }

    const waveText = waveTotal > 0 ? `WAVE ${Math.min(waveIndex, waveTotal)}/${waveTotal}` : `LEVEL ${this.game.level}`;
    this.missionText.text = `${waveText}  HOSTILES ${activeEnemies}  SHOTS ${activeBullets}`;
  }

  updateActivePowerup() {
    const player = this.game?.scenes?.play?.player;
    const state = player?.getActivePowerupState ? player.getActivePowerupState() : null;
    if (!state || !state.label) {
      this.activePowerupGroup.visible = false;
      return;
    }

    const remaining = Math.max(0, Math.ceil((state.remainingMs || 0) / 1000));
    this.activePowerupText.text = `POWERUP: ${state.label}`;
    this.activePowerupTimer.text = remaining ? `${remaining}s` : '';
    this.activePowerupTimer.x = this.activePowerupText.width + 10;
    this.activePowerupTimer.y = 0;

    const paddingX = 8;
    const paddingY = 6;
    const barHeight = 4;
    const barGap = 4;
    const width = Math.max(
      132,
      this.activePowerupText.width + this.activePowerupTimer.width + paddingX * 2 + 6
    );
    const textHeight = Math.max(this.activePowerupText.height, this.activePowerupTimer.height);
    const height = textHeight + barGap + barHeight + paddingY * 2;
    this.activePowerupBg.clear();
    this.activePowerupBg.roundRect(0, 0, width, height, 8);
    this.activePowerupBg.fill({ color: 0x000000, alpha: 0.5 });

    this.activePowerupText.x = paddingX;
    this.activePowerupText.y = paddingY - 2;
    this.activePowerupTimer.x = Math.min(width - paddingX - this.activePowerupTimer.width, this.activePowerupText.x + this.activePowerupText.width + 10);
    this.activePowerupTimer.y = paddingY - 2;

    const barWidth = Math.max(24, width - paddingX * 2);
    const barY = paddingY + textHeight + barGap - 2;
    const totalMs = this.getPowerupDurationMs(state.type, state.remainingMs);
    const progress = totalMs > 0 ? Math.max(0, Math.min(1, (state.remainingMs || 0) / totalMs)) : 0;
    const color = this.getPowerupColor(state.type);
    this.activePowerupBarBg.clear();
    this.activePowerupBarBg.roundRect(paddingX, barY, barWidth, barHeight, 2);
    this.activePowerupBarBg.fill({ color: 0x143042, alpha: 0.85 });
    this.activePowerupBarFill.clear();
    this.activePowerupBarFill.roundRect(paddingX, barY, Math.max(2, barWidth * progress), barHeight, 2);
    this.activePowerupBarFill.fill({ color, alpha: 0.95 });
    this.activePowerupGroup.visible = true;

    const canvasWidth = this.game.getWidth ? this.game.getWidth() : 0;
    if (canvasWidth) {
      const margin = 10;
      const livesBottom = this.livesGroup ? this.livesGroup.y + this.livesGroup.height + 6 : 0;
      const locationBottom = this.locationText ? this.locationText.y + this.locationText.height + 6 : 0;
      this.activePowerupGroup.x = canvasWidth - margin - width;
      this.activePowerupGroup.y = Math.max(livesBottom, locationBottom);
    }
  }

  getPowerupDurationMs(type, remainingMs = 0) {
    const durations = {
      slow_time: 8000,
      ghost: 8000,
      magnet: 8000,
      drones: 8000,
      rapid_fire: 8000,
      double_shot: 8000,
      damage_up: 8000,
      speed_up: 8000,
      pierce: 7000,
      shield: 15000,
      point_defense: 10000,
      score_x2: 10000,
      chain_lightning: 12000,
      orbital_strike: 15000,
      vampire: 20000
    };
    return Math.max(durations[type] || 12000, remainingMs || 0);
  }

  getPowerupColor(type) {
    const colors = {
      shield: 0x66ffff,
      score_x2: 0xffee66,
      rapid_fire: 0xff6699,
      double_shot: 0x66ff99,
      damage_up: 0xff8844,
      speed_up: 0x88ff44,
      slow_time: 0x9a8cff,
      ghost: 0xd9d9ff,
      pierce: 0xffffff,
      magnet: 0x99ffcc,
      orbital_strike: 0xffaa00,
      vampire: 0xff4477
    };
    return colors[type] || 0x00ffff;
  }

  applyLayout(layout = getCurrentLayout()) {
    if (!layout || typeof layout.width !== 'number') return;

    const canvasWidth = this.game.getWidth ? this.game.getWidth() : layout.width;
    const margin = layout.isMobile ? 14 : 12;
    const blockSpacing = layout.isMobile ? 24 : 22;
    const scoreFont = layout.isMobile ? 15 : 18;
    const livesFont = layout.isMobile ? 16 : 18;
    const leftPanelWidth = layout.isMobile ? Math.min(180, canvasWidth * 0.46) : 250;
    const leftPanelHeight = layout.isMobile ? 76 : 82;
    const rightPanelWidth = layout.isMobile ? 118 : 150;
    const rightPanelHeight = layout.isMobile ? 42 : 46;
    const missionPanelWidth = layout.isMobile ? canvasWidth - margin * 2 : 390;
    const missionPanelHeight = layout.isMobile ? 38 : 44;
    const missionPanelX = layout.isMobile ? margin : canvasWidth / 2 - missionPanelWidth / 2;
    const missionPanelY = layout.isMobile ? margin + leftPanelHeight + 7 : margin;

    this.scoreText.style.fontSize = scoreFont;
    this.levelText.style.fontSize = scoreFont;
    this.livesText.style.fontSize = livesFont;
    this.locationText.style.fontSize = layout.isMobile ? 10 : 12;
    this.rankText.style.fontSize = layout.isMobile ? 9 : 10;
    this.missionLabel.style.fontSize = layout.isMobile ? 8 : 10;
    this.missionText.style.fontSize = layout.isMobile ? 11 : 14;

    this.drawGlassPanel(this.leftPanel, margin, margin, leftPanelWidth, leftPanelHeight, 0x00d9ff, 0.16);
    this.drawGlassPanel(this.rightPanel, canvasWidth - margin - rightPanelWidth, margin, rightPanelWidth, rightPanelHeight, 0x75ff8d, 0.14);
    this.drawGlassPanel(this.missionPanel, missionPanelX, missionPanelY, missionPanelWidth, missionPanelHeight, 0xff55d9, 0.1);

    // Rank Position (Top Left)
    this.rankGroup.x = margin + 10;
    this.rankGroup.y = margin + 10;

    // Shift Score and Level to the right of Rank
    const rankOffset = 66;

    this.scoreText.x = margin + rankOffset;
    this.scoreText.y = margin + 10;
    this.scoreMultiplierText.x = this.scoreText.x + this.scoreText.width + 10;
    this.scoreMultiplierText.y = this.scoreText.y + 2;

    this.levelText.x = margin + rankOffset;
    this.levelText.y = margin + blockSpacing + 8;

    this.missionLabel.x = missionPanelX + missionPanelWidth / 2;
    this.missionLabel.y = missionPanelY + 10;
    this.missionText.x = missionPanelX + missionPanelWidth / 2;
    this.missionText.y = missionPanelY + 27;

    this.locationText.x = canvasWidth - margin;
    this.locationText.y = layout.isMobile
      ? missionPanelY + missionPanelHeight + 6
      : margin + blockSpacing * 2.5;

    this.updateLivesVisuals();
    this.livesGroup.x = canvasWidth - margin - rightPanelWidth + 10;
    this.livesGroup.y = margin + 7;

    if (this.activePowerupGroup) {
      this.activePowerupGroup.x = canvasWidth - margin - this.activePowerupGroup.width;
      this.activePowerupGroup.y = this.livesGroup.y + this.livesGroup.height + 6;
    }
  }

  drawGlassPanel(graphics, x, y, width, height, accent, alpha = 0.14) {
    if (!graphics) return;
    graphics.clear();
    graphics.roundRect(x, y, width, height, 8);
    graphics.fill({ color: 0x03101d, alpha: 0.58 });
    graphics.stroke({ color: accent, width: 1.5, alpha: 0.85 });
    graphics.rect(x + 1, y + 1, Math.max(0, width - 2), Math.max(0, height * 0.38));
    graphics.fill({ color: accent, alpha });
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
    this.livesBg.roundRect(0, 0, width, height, 8); // v8 syntax prefer roundRect
    this.livesBg.fill({ color: 0x000000, alpha: 0.02 });
  }

  destroy() {
    if (this.layoutUnsubscribe) {
      this.layoutUnsubscribe();
      this.layoutUnsubscribe = null;
    }
  }
}
