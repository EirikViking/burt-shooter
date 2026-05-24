import * as PIXI from 'pixi.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { extendLocations } from '../text/phrasePool.js';

import { GameAssets } from '../utils/GameAssets.js';
import { RankAssets } from '../utils/RankAssets.js';
import { rankManager } from '../managers/RankManager.js';
import { formatNumber } from '../i18n/index.js';

const FONT_BODY = 'Rajdhani, Orbitron, Bahnschrift, Segoe UI, sans-serif';
const FONT_MONO = 'Rajdhani, Orbitron, Bahnschrift, sans-serif';

function normalizeFontFamily(fontFamily) {
  const family = String(fontFamily || '').trim();
  if (!family) return FONT_BODY;
  if (/orbitron|rajdhani/i.test(family)) return family;
  if (/courier new|monospace/i.test(family)) return FONT_MONO;
  return family;
}

function normalizeTextStyle(style = {}) {
  const next = { ...style };
  next.fontFamily = normalizeFontFamily(next.fontFamily);
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
    this.activePowerupRows = [];

    // Rank Elements
    this.rankGroup = new PIXI.Container();
    this.rankIcon = new PIXI.Sprite();
    this.rankBarBg = new PIXI.Graphics();
    this.rankBarFill = new PIXI.Graphics();
    this.rankText = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
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
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#f8fbff',
      stroke: '#00111d',
      strokeThickness: 3
    });
    this.hudContainer.addChild(this.scoreText);
    this.scoreMultiplierText = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 14,
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.scoreMultiplierText.visible = false;
    this.hudContainer.addChild(this.scoreMultiplierText);

    // Level
    this.levelText = createText('LEVEL: 1', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
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
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 20,
      fill: '#ff8080'
    });
    this.livesGroup.addChild(this.livesIcon);
    this.livesText = createText('LIVES: 3', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
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
    this.activePowerupTitle = createText('POWERUPS ONLINE', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 10,
      fontWeight: 'bold',
      fill: '#7ee9ff',
      stroke: '#00111d',
      strokeThickness: 2
    });
    this.activePowerupList = new PIXI.Container();
    this.activePowerupBarBg = new PIXI.Graphics();
    this.activePowerupBarFill = new PIXI.Graphics();
    this.activePowerupText = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 14,
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.activePowerupText.visible = false;
    this.activePowerupTimer = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 12,
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.activePowerupTimer.visible = false;
    this.activePowerupGroup.addChild(this.activePowerupBg);
    this.activePowerupGroup.addChild(this.activePowerupTitle);
    this.activePowerupGroup.addChild(this.activePowerupList);
    this.activePowerupGroup.addChild(this.activePowerupText);
    this.activePowerupGroup.addChild(this.activePowerupTimer);
    this.activePowerupGroup.addChild(this.activePowerupBarBg);
    this.activePowerupGroup.addChild(this.activePowerupBarFill);
    this.activePowerupGroup.visible = false;
    this.hudContainer.addChild(this.activePowerupGroup);

    this.traitGroup = new PIXI.Container();
    this.traitBg = new PIXI.Graphics();
    this.traitBarBg = new PIXI.Graphics();
    this.traitBarFill = new PIXI.Graphics();
    this.traitLabel = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 11,
      fontWeight: 'bold',
      fill: '#ffb35c',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.traitText = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 12,
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.traitGroup.addChild(this.traitBg);
    this.traitGroup.addChild(this.traitLabel);
    this.traitGroup.addChild(this.traitText);
    this.traitGroup.addChild(this.traitBarBg);
    this.traitGroup.addChild(this.traitBarFill);
    this.traitGroup.visible = false;
    this.hudContainer.addChild(this.traitGroup);

    this.missionLabel = createText('MISSION STATUS', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 10,
      fontWeight: 'bold',
      fill: '#7ee9ff',
      align: 'center'
    });
    this.missionLabel.anchor.set(0.5);
    this.hudContainer.addChild(this.missionLabel);

    this.missionText = createText('WAVE 1 / HOSTILES 0', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
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
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
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
    this.updateTraitMeter();
  }

  formatScore(score) {
    return formatNumber(score);
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
    this.missionText.text = `${waveText}  HOSTILES ${activeEnemies}  THREATS ${activeBullets}`;
  }

  updateActivePowerup() {
    const player = this.game?.scenes?.play?.player;
    const states = player?.getActivePowerupStates
      ? player.getActivePowerupStates()
      : (player?.getActivePowerupState ? [player.getActivePowerupState()] : []);
    const activeStates = states.filter(state => state?.label);
    if (!activeStates.length) {
      this.activePowerupRows.forEach(row => { row.container.visible = false; });
      this.activePowerupGroup.visible = false;
      return;
    }

    const layout = getCurrentLayout();
    const isMobile = Boolean(layout?.isMobile);
    const width = isMobile ? 184 : 232;
    const paddingX = 7;
    const paddingTop = 6;
    const rowGap = 5;
    const rowHeight = isMobile ? 31 : 34;
    const titleHeight = 16;
    const height = paddingTop + titleHeight + activeStates.length * rowHeight + Math.max(0, activeStates.length - 1) * rowGap + 7;

    this.activePowerupBg.clear();
    this.activePowerupBg.roundRect(0, 0, width, height, 8);
    this.activePowerupBg.fill({ color: 0x020914, alpha: 0.62 });
    this.activePowerupBg.stroke({ color: 0x00e5ff, width: 1.2, alpha: 0.7 });
    this.activePowerupBg.rect(1, 1, Math.max(0, width - 2), 14);
    this.activePowerupBg.fill({ color: 0x00e5ff, alpha: 0.11 });

    const hasDebuff = activeStates.some((state) => String(state.type || '').startsWith('debuff_'));
    this.activePowerupTitle.text = hasDebuff
      ? 'SYSTEM STATUS'
      : activeStates.length > 1 ? 'POWERUPS ONLINE' : 'POWERUP ONLINE';
    this.activePowerupTitle.style.fontSize = isMobile ? 9 : 10;
    this.activePowerupTitle.x = paddingX + 1;
    this.activePowerupTitle.y = paddingTop - 2;
    this.activePowerupTitle.visible = true;

    activeStates.forEach((state, index) => {
      const row = this.getActivePowerupRow(index);
      row.container.visible = true;
      row.container.x = paddingX;
      row.container.y = paddingTop + titleHeight + index * (rowHeight + rowGap);
      this.updateActivePowerupRow(row, state, width - paddingX * 2, rowHeight, isMobile);
    });
    this.activePowerupRows.slice(activeStates.length).forEach(row => {
      row.container.visible = false;
    });

    this.activePowerupText.text = activeStates[0]?.label || '';
    this.activePowerupTimer.text = this.formatPowerupMeta(activeStates[0] || {});
    this.activePowerupBarBg.clear();
    this.activePowerupBarFill.clear();
    this.activePowerupGroup.visible = true;

    const canvasWidth = this.game.getWidth ? this.game.getWidth() : 0;
    if (canvasWidth) {
      const margin = 10;
      const livesBottom = this.livesGroup ? this.livesGroup.y + this.livesGroup.height + 6 : 0;
      const locationBottom = this.locationText ? this.locationText.y + this.locationText.height + 6 : 0;
      const groupX = canvasWidth - margin - width;
      const overlayBottom = this.getBlockingToastBottom(groupX, width);
      const desiredY = Math.max(livesBottom, locationBottom, overlayBottom);
      const canvasHeight = this.game.getHeight ? this.game.getHeight() : 0;
      const maxY = canvasHeight ? Math.max(margin, canvasHeight - height - margin) : desiredY;
      this.activePowerupGroup.x = canvasWidth - margin - width;
      this.activePowerupGroup.y = Math.min(desiredY, maxY);
    }
  }

  getBlockingToastBottom(groupX, groupWidth) {
    const toast = this.game?.scenes?.play?.activeTopToast;
    if (!toast?.parent || toast.alpha <= 0.05 || toast.__toastMeta?.type !== 'lore') return 0;
    const bounds = toast.getBounds ? toast.getBounds() : null;
    const left = Number.isFinite(bounds?.x) ? bounds.x : toast.x - (toast.width || 0) / 2;
    const top = Number.isFinite(bounds?.y) ? bounds.y : toast.y - (toast.height || 0) / 2;
    const width = Number.isFinite(bounds?.width) ? bounds.width : (toast.width || 0);
    const height = Number.isFinite(bounds?.height) ? bounds.height : (toast.height || 0);
    const right = left + width;
    const groupRight = groupX + groupWidth;
    const overlaps = right >= groupX && left <= groupRight;
    return overlaps ? top + height + 8 : 0;
  }

  getActivePowerupRow(index) {
    if (this.activePowerupRows[index]) return this.activePowerupRows[index];

    const container = new PIXI.Container();
    const bg = new PIXI.Graphics();
    const iconGlow = new PIXI.Graphics();
    const iconFrame = new PIXI.Graphics();
    const icon = new PIXI.Sprite();
    icon.anchor.set(0.5);
    const label = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#f8fbff',
      stroke: '#00111d',
      strokeThickness: 2
    });
    const meta = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 11,
      fontWeight: 'bold',
      fill: '#ffff66',
      stroke: '#00111d',
      strokeThickness: 2
    });
    const barBg = new PIXI.Graphics();
    const barFill = new PIXI.Graphics();

    container.addChild(bg);
    container.addChild(iconGlow);
    container.addChild(iconFrame);
    container.addChild(icon);
    container.addChild(label);
    container.addChild(meta);
    container.addChild(barBg);
    container.addChild(barFill);
    this.activePowerupList.addChild(container);

    const row = { container, bg, iconGlow, iconFrame, icon, label, meta, barBg, barFill };
    this.activePowerupRows[index] = row;
    return row;
  }

  updateActivePowerupRow(row, state, width, height, isMobile) {
    const color = Number.isFinite(state.color) ? state.color : this.getPowerupColor(state.type);
    const iconSize = isMobile ? 20 : 23;
    const iconX = 17;
    const iconY = height / 2 - 1;
    const texture = GameAssets.getPowerupTexture(state.iconType || state.type);
    row.bg.clear();
    row.bg.roundRect(0, 0, width, height, 7);
    row.bg.fill({ color: 0x03101d, alpha: 0.58 });
    row.bg.stroke({ color, width: 1, alpha: 0.65 });

    row.iconGlow.clear();
    row.iconGlow.circle(iconX, iconY, iconSize * 0.62);
    row.iconGlow.fill({ color, alpha: 0.16 });
    row.iconFrame.clear();
    row.iconFrame.circle(iconX, iconY, iconSize * 0.58);
    row.iconFrame.stroke({ color, width: 1.4, alpha: 0.82 });

    if (texture) {
      row.icon.visible = true;
      row.icon.texture = texture;
      const scale = Math.min(iconSize / texture.width, iconSize / texture.height);
      row.icon.scale.set(Number.isFinite(scale) ? scale : 1);
      row.icon.x = iconX;
      row.icon.y = iconY;
    } else {
      row.icon.visible = false;
    }

    row.label.style.fontSize = isMobile ? 10 : 12;
    row.meta.style.fontSize = isMobile ? 10 : 11;
    row.label.text = this.truncateLabel(state.label, isMobile ? 15 : 19);
    row.meta.text = this.formatPowerupMeta(state);
    row.label.x = 34;
    row.label.y = 4;
    row.meta.x = Math.max(row.label.x + 42, width - 7 - row.meta.width);
    row.meta.y = 4;

    const barX = 34;
    const barY = height - 8;
    const barWidth = Math.max(34, width - barX - 7);
    const progress = this.getPowerupProgress(state);
    row.barBg.clear();
    row.barBg.roundRect(barX, barY, barWidth, 4, 2);
    row.barBg.fill({ color: 0x143042, alpha: 0.9 });
    row.barFill.clear();
    row.barFill.roundRect(barX, barY, Math.max(2, barWidth * progress), 4, 2);
    row.barFill.fill({ color, alpha: 0.98 });
  }

  formatPowerupMeta(state) {
    const remaining = Math.max(0, Math.ceil((state.remainingMs || 0) / 1000));
    const detail = String(state.detail || '').trim();
    const charges = Number(state.charges || 0);
    if (remaining && detail) return `${remaining}s | ${detail}`;
    if (remaining && charges) return `${remaining}s | ${charges}`;
    if (remaining) return `${remaining}s`;
    if (detail) return detail;
    if (charges) return `${charges} LEFT`;
    return 'ACTIVE';
  }

  getPowerupProgress(state) {
    const charges = Number(state.charges || 0);
    const maxCharges = Number(state.maxCharges || 0);
    if ((state.remainingMs || 0) > 0) {
      const totalMs = Number(state.durationMs || 0) || this.getPowerupDurationMs(state.type, state.remainingMs);
      return totalMs > 0 ? Math.max(0, Math.min(1, (state.remainingMs || 0) / totalMs)) : 1;
    }
    if (charges > 0 && maxCharges > 0) {
      return Math.max(0, Math.min(1, charges / maxCharges));
    }
    return 1;
  }

  getPowerupDurationMs(type, remainingMs = 0) {
    if (String(type || '').startsWith('rank_')) return Math.max(12000, remainingMs || 0);
    if (String(type || '').startsWith('synergy_')) return Math.max(6000, remainingMs || 0);
    if (String(type || '').startsWith('debuff_')) return Math.max(1, remainingMs || 0);
    const durations = {
      triple_beam: 12000,
      vector_boost: 12000,
      rapid_cabinet: 12000,
      overdrive_core: 12000,
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
    if (String(type || '').startsWith('rank_')) return 0xffdd66;
    if (String(type || '').startsWith('synergy_')) return 0xff66cc;
    if (String(type || '').startsWith('debuff_')) return 0xff6688;
    const colors = {
      triple_beam: 0x55ddff,
      vector_boost: 0x7cff72,
      rapid_cabinet: 0xff55aa,
      overdrive_core: 0xffcc33,
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
      drones: 0x66ddff,
      point_defense: 0x00ddff,
      bomb: 0xff8844,
      chain_lightning: 0xaaeeff,
      orbital_strike: 0xffaa00,
      vampire: 0xff4477
    };
    return colors[type] || 0x00ffff;
  }

  updateTraitMeter() {
    const player = this.game?.scenes?.play?.player;
    const state = player?.getTraitState ? player.getTraitState() : null;
    if (!state?.label) {
      this.traitGroup.visible = false;
      return;
    }

    const event = this.getTraitMeterEvent(state);
    const paddingX = 8;
    const paddingY = 6;
    const barHeight = 4;
    const barGap = 4;
    const label = `TRAIT: ${this.truncateLabel(state.label, 17)}`;
    this.traitLabel.text = label;
    this.traitText.text = event.text;
    const width = Math.max(154, Math.min(228, Math.max(this.traitLabel.width, this.traitText.width) + paddingX * 2));
    const textHeight = this.traitLabel.height + this.traitText.height + 1;
    const height = textHeight + barGap + barHeight + paddingY * 2;

    this.traitBg.clear();
    this.traitBg.roundRect(0, 0, width, height, 8);
    this.traitBg.fill({ color: 0x050914, alpha: 0.52 });
    this.traitBg.stroke({ color: event.color, width: 1.2, alpha: 0.7 });

    this.traitLabel.x = paddingX;
    this.traitLabel.y = paddingY - 2;
    this.traitText.x = paddingX;
    this.traitText.y = paddingY + this.traitLabel.height - 2;

    const barWidth = Math.max(24, width - paddingX * 2);
    const barY = paddingY + textHeight + barGap - 3;
    this.traitBarBg.clear();
    this.traitBarBg.roundRect(paddingX, barY, barWidth, barHeight, 2);
    this.traitBarBg.fill({ color: 0x231a14, alpha: 0.85 });
    this.traitBarFill.clear();
    this.traitBarFill.roundRect(paddingX, barY, Math.max(2, barWidth * event.progress), barHeight, 2);
    this.traitBarFill.fill({ color: event.color, alpha: 0.96 });
    this.traitGroup.visible = true;

    const canvasWidth = this.game.getWidth ? this.game.getWidth() : 0;
    if (canvasWidth) {
      const margin = 10;
      const powerupBottom = this.activePowerupGroup?.visible
        ? this.activePowerupGroup.y + this.activePowerupGroup.height + 6
        : 0;
      const livesBottom = this.livesGroup ? this.livesGroup.y + this.livesGroup.height + 6 : 0;
      const locationBottom = this.locationText ? this.locationText.y + this.locationText.height + 6 : 0;
      this.traitGroup.x = canvasWidth - margin - width;
      this.traitGroup.y = Math.max(powerupBottom, livesBottom, locationBottom);
    }
  }

  getTraitMeterEvent(state) {
    const candidates = [
      {
        every: Number(state.critEvery || 0),
        remaining: Number(state.nextCritShotIn || 0),
        text: 'OVERCHARGE',
        color: 0xff8844
      },
      {
        every: Number(state.pierceEvery || 0),
        remaining: Number(state.nextPierceShotIn || 0),
        text: 'PIERCE',
        color: 0x8eeeff
      },
      {
        every: Number(state.wingShotEvery || 0),
        remaining: Number(state.nextWingShotIn || 0),
        text: 'WING BURST',
        color: 0x66ff99
      },
      {
        every: Number(state.bonusShotEvery || 0),
        remaining: Number(state.nextBonusShotIn || 0),
        text: 'BONUS SHOT',
        color: 0xffdd55
      }
    ].filter(item => item.every > 0 && item.remaining > 0);

    if (candidates.length) {
      candidates.sort((a, b) => a.remaining - b.remaining || a.every - b.every);
      const next = candidates[0];
      const progress = Math.max(0, Math.min(1, 1 - (next.remaining - 1) / next.every));
      return {
        text: next.remaining <= 1 ? `${next.text} READY` : `${next.text} IN ${next.remaining}`,
        progress,
        color: next.color
      };
    }

    if (Number(state.dodgePulseRadius || 0) > 0) {
      return {
        text: 'DODGE PULSE READY',
        progress: 1,
        color: 0x66f7ff
      };
    }

    if (Number(state.nearMissScoreMult || 1) > 1) {
      return {
        text: `NEAR MISS x${Number(state.nearMissScoreMult).toFixed(1)}`,
        progress: 1,
        color: 0xff66cc
      };
    }

    if (Number(state.projectileRadiusMult || 1) !== 1) {
      return {
        text: 'WIDE SHOTS ACTIVE',
        progress: 1,
        color: 0xffb35c
      };
    }

    return {
      text: 'PASSIVE ACTIVE',
      progress: 1,
      color: 0xffb35c
    };
  }

  truncateLabel(label, maxLength) {
    const text = String(label || '').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(1, maxLength - 1))}.`;
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
    if (this.traitGroup) {
      this.traitGroup.x = canvasWidth - margin - this.traitGroup.width;
      this.traitGroup.y = this.activePowerupGroup?.visible
        ? this.activePowerupGroup.y + this.activePowerupGroup.height + 6
        : this.livesGroup.y + this.livesGroup.height + 6;
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
