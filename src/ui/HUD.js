import * as PIXI from 'pixi.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';

import { GameAssets } from '../utils/GameAssets.js';
import { RankAssets } from '../utils/RankAssets.js';
import { rankManager } from '../managers/RankManager.js';
import { formatNumber, translateText } from '../i18n/index.js';
import { formatSectorLabel } from '../config/SectorCatalog.js';

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
    this.missionProgressBg = new PIXI.Graphics();
    this.missionProgressFill = new PIXI.Graphics();
    this.missionProgressActive = new PIXI.Graphics();
    this.missionProgressTicks = new PIXI.Graphics();
    this.activePowerupRows = [];
    this.highscoreChaseRenderKey = '';
    this.highscoreChaseDisplayKey = '';
    this.highscoreChaseDisplayScore = 0;

    // Rank Elements
    this.rankGroup = new PIXI.Container();
    this.rankBadgeBg = new PIXI.Graphics();
    this.rankTextBg = new PIXI.Graphics();
    this.rankIcon = new PIXI.Sprite();
    this.rankBarBg = new PIXI.Graphics();
    this.rankBarFill = new PIXI.Graphics();
    this.rankText = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 13,
      fontWeight: '900',
      fill: '#fff8ba',
      stroke: '#020711',
      strokeThickness: 4
    });

    this.createHUD();
    this.layoutUnsubscribe = addResponsiveListener((layout) => this.applyLayout(layout));
    this.applyLayout(getCurrentLayout());
  }

  createHUD() {
    this.hudContainer.addChild(this.leftPanel);
    this.hudContainer.addChild(this.rightPanel);
    this.hudContainer.addChild(this.missionPanel);
    this.hudContainer.addChild(this.missionProgressBg);
    this.hudContainer.addChild(this.missionProgressFill);
    this.hudContainer.addChild(this.missionProgressActive);
    this.hudContainer.addChild(this.missionProgressTicks);

    // Rank Group
    this.rankIcon.anchor.set(0.5);
    this.rankGroup.addChild(this.rankBadgeBg);
    this.rankGroup.addChild(this.rankTextBg);
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

    this.comboMeterGroup = new PIXI.Container();
    this.comboMeterBg = new PIXI.Graphics();
    this.comboMeterFill = new PIXI.Graphics();
    this.comboMeterTicks = new PIXI.Graphics();
    this.comboMeterText = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 10,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#00111d',
      strokeThickness: 2
    });
    this.comboMeterGroup.addChild(this.comboMeterBg);
    this.comboMeterGroup.addChild(this.comboMeterFill);
    this.comboMeterGroup.addChild(this.comboMeterTicks);
    this.comboMeterGroup.addChild(this.comboMeterText);
    this.comboMeterGroup.visible = false;
    this.hudContainer.addChild(this.comboMeterGroup);

    this.highscoreChaseGroup = new PIXI.Container();
    this.highscoreChaseBg = new PIXI.Graphics();
    this.highscoreChaseBarBg = new PIXI.Graphics();
    this.highscoreChaseBarFill = new PIXI.Graphics();
    this.highscoreChaseTicks = new PIXI.Graphics();
    this.highscoreChaseTitle = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 10,
      fontWeight: '900',
      fill: '#ffef7e',
      stroke: '#00111d',
      strokeThickness: 3
    });
    this.highscoreChaseTarget = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 12,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#00111d',
      strokeThickness: 3
    });
    this.highscoreChaseTarget.anchor.set(1, 0);
    this.highscoreChaseGap = createText('', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 10,
      fontWeight: '900',
      fill: '#ff55d9',
      stroke: '#00111d',
      strokeThickness: 3
    });
    this.highscoreChaseGroup.addChild(this.highscoreChaseBg);
    this.highscoreChaseGroup.addChild(this.highscoreChaseTitle);
    this.highscoreChaseGroup.addChild(this.highscoreChaseTarget);
    this.highscoreChaseGroup.addChild(this.highscoreChaseGap);
    this.highscoreChaseGroup.addChild(this.highscoreChaseBarBg);
    this.highscoreChaseGroup.addChild(this.highscoreChaseBarFill);
    this.highscoreChaseGroup.addChild(this.highscoreChaseTicks);
    this.hudContainer.addChild(this.highscoreChaseGroup);

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

    // Current sector label.
    this.locationText = createText(formatSectorLabel(this.game.level || 1, {
      sectorWord: translateText('SECTOR'),
      compact: true
    }), {
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
    this.updateComboMeter();
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
      const maxSz = 42 * Math.max(1, Math.min(2, Number(getCurrentLayout()?.uiScale) || 1));
      if (this.rankIcon.texture?.width > 0) {
        const scale = Math.min(maxSz / this.rankIcon.texture.width, maxSz / this.rankIcon.texture.height);
        this.rankIcon.scale.set(scale);
      }
    }

    this.rankText.text = rankManager.getRankString(this.game.rankIndex);
    const uiScale = Math.max(1, Math.min(2, Number(getCurrentLayout()?.uiScale) || 1));
    const rankPanelWidth = 164 * uiScale;
    const rankTextX = 56 * uiScale;
    const rankTextMaxWidth = 92 * uiScale;
    this.rankText.x = rankTextX;
    this.rankText.y = 8 * uiScale;
    this.rankText.scale.set(1);
    this.rankText.updateText?.(false);
    if (this.rankText.width > rankTextMaxWidth) {
      this.rankText.scale.set(Math.max(0.58, rankTextMaxWidth / this.rankText.width));
    }
    this.rankIcon.x = 25 * uiScale;
    this.rankIcon.y = 24 * uiScale;

    this.rankBadgeBg.clear();
    this.rankBadgeBg.roundRect(-5 * uiScale, -3 * uiScale, rankPanelWidth, 58 * uiScale, 9 * uiScale);
    this.rankBadgeBg.fill({ color: 0x020916, alpha: 0.76 });
    this.rankBadgeBg.stroke({ color: 0xffef7e, width: 1.5, alpha: 0.82 });

    this.rankTextBg.clear();
    this.rankTextBg.roundRect(rankTextX - 4 * uiScale, 5 * uiScale, rankTextMaxWidth + 8 * uiScale, 22 * uiScale, 4 * uiScale);
    this.rankTextBg.fill({ color: 0x020711, alpha: 0.72 });
    this.rankTextBg.stroke({ color: 0x75ecff, width: 1, alpha: 0.2 });

    // XP Bar
    const progress = this.game.getRankProgress();
    const barW = rankTextMaxWidth + 8;
    const barH = 5 * uiScale;

    this.rankBarBg.clear().roundRect(rankTextX - 4 * uiScale, 40 * uiScale, barW, barH, 3 * uiScale).fill({ color: 0x102238, alpha: 0.94 });
    this.rankBarBg.stroke({ color: 0x75ecff, width: 1, alpha: 0.45 });
    this.rankBarFill.clear().roundRect(rankTextX - 4 * uiScale, 40 * uiScale, barW * progress, barH, 3 * uiScale).fill({ color: 0xffef7e });

    this.locationText.text = formatSectorLabel(this.game.level || 1, {
      sectorWord: translateText('SECTOR'),
      compact: true
    });

    this.updateActivePowerup();
    this.updateTraitMeter();
    const diagnostics = this.game?.scenes?.play?.performanceDiagnostics;
    const measure = diagnostics?.measure?.bind(diagnostics) || ((_label, callback) => callback());
    measure('hud.highscore_chase_realtime', () => this.updateHighscoreChase());
  }

  formatScore(score) {
    return formatNumber(score);
  }

  updateHighscoreChase() {
    if (!this.highscoreChaseGroup) return;
    const chase = this.game?.getHighscoreChaseState?.() || null;
    const target = Math.max(0, Math.floor(Number(chase?.targetScore) || 0));
    const rawScore = Math.max(0, Math.floor(Number(this.game?.score) || 0));
    const sectorKey = Math.max(1, Math.floor(Number(this.game?.level) || 1));
    const syncingTarget = Boolean(chase?.syncingTarget);
    const hasTarget = target > 0 && !syncingTarget;
    const displayKey = [
      chase?.runMode || 'none',
      target,
      syncingTarget ? 1 : 0,
      sectorKey,
      rawScore
    ].join('|');
    const crossedTarget = hasTarget &&
      rawScore > target &&
      Math.max(0, Math.floor(Number(this.highscoreChaseDisplayScore) || 0)) <= target;
    if (displayKey !== this.highscoreChaseDisplayKey || crossedTarget) {
      this.highscoreChaseDisplayKey = displayKey;
      this.highscoreChaseDisplayScore = rawScore;
    }
    const score = Math.max(0, Math.floor(Number(this.highscoreChaseDisplayScore) || 0));
    const remaining = Math.max(0, target - score);
    const ratio = hasTarget ? Math.min(1.25, score / target) : 0;
    const surpassed = hasTarget && score > target;
    const nearTarget = hasTarget && !surpassed && ratio >= 0.9;
    const chaseIsHot = nearTarget || surpassed;
    const pulse = chaseIsHot ? (Math.sin(Date.now() * 0.009) + 1) / 2 : 0.5;
    const pulseBucket = chaseIsHot ? Math.floor(Date.now() / 140) % 16 : 0;
    const dangerColor = surpassed ? 0xffef7e : (ratio >= 0.9 ? 0xff55d9 : (ratio >= 0.5 ? 0x7fffd8 : 0x37f5ff));
    const label = chase?.runMode === 'sector_start'
      ? translateText('SECTOR RECORD TARGET')
      : translateText('HIGH SCORE TARGET');
    const w = this.highscoreChaseGroup.__w || 178;
    const h = this.highscoreChaseGroup.__h || 52;
    const renderKey = [
      chase?.runMode || 'none',
      target,
      score,
      sectorKey,
      syncingTarget ? 1 : 0,
      surpassed ? 1 : 0,
      nearTarget ? 1 : 0,
      pulseBucket,
      w,
      h,
      this.highscoreChaseTitle?.style?.fontSize || '',
      this.highscoreChaseTarget?.style?.fontSize || '',
      this.highscoreChaseGap?.style?.fontSize || ''
    ].join('|');
    if (renderKey === this.highscoreChaseRenderKey) return;
    this.highscoreChaseRenderKey = renderKey;

    this.highscoreChaseTitle.text = label;
    this.highscoreChaseTarget.text = hasTarget
      ? `${translateText('BEAT')} ${this.formatScore(target)}`
      : syncingTarget
        ? translateText('CHECKING BOARD')
        : translateText('BEAT THE EMPTY THRONE');
    this.highscoreChaseGap.text = surpassed
      ? translateText('OLD SCORE HUMILIATED')
      : translateText('{score} TO MAKE IT CRY', { score: this.formatScore(remaining + 1) });
    this.highscoreChaseGap.visible = hasTarget;

    this.highscoreChaseTitle.style.fill = surpassed ? '#fff05c' : '#ffef7e';
    this.highscoreChaseGap.style.fill = surpassed ? '#fff05c' : (ratio >= 0.9 ? '#ff55d9' : '#7fffd8');
    this.highscoreChaseGroup.alpha = hasTarget ? 0.86 + pulse * 0.14 : 0.78;
    this.highscoreChaseGroup.scale.set(1);

    const barW = Math.max(48, w - 22);
    const progress = hasTarget ? Math.min(1, ratio) : 0.08 + pulse * 0.08;
    this.highscoreChaseTitle.updateText?.(false);
    this.highscoreChaseTarget.updateText?.(false);
    this.highscoreChaseGap.updateText?.(false);
    const narrow = w < 248;
    const padX = 14;
    const targetMaxWidth = narrow ? w - padX * 2 : Math.min(132, Math.max(92, w * 0.36));
    this.highscoreChaseTitle.x = padX;
    this.highscoreChaseTitle.y = narrow ? 5 : 6;
    this.highscoreChaseTitle.scale.set(1);
    this.highscoreChaseTarget.scale.set(1);
    if (narrow) {
      this.highscoreChaseTarget.anchor.set(0, 0);
      this.highscoreChaseTarget.x = padX;
      this.highscoreChaseTarget.y = 19;
      this.fitTextToWidth(this.highscoreChaseTarget, targetMaxWidth, 0.68);
      this.fitTextToWidth(this.highscoreChaseTitle, w - padX * 2, 0.68);
    } else {
      this.highscoreChaseTarget.anchor.set(1, 0);
      this.highscoreChaseTarget.x = w - padX;
      this.highscoreChaseTarget.y = 6;
      this.fitTextToWidth(this.highscoreChaseTarget, targetMaxWidth, 0.7);
      const titleMaxWidth = Math.max(92, w - padX * 2 - this.highscoreChaseTarget.width - 14);
      this.fitTextToWidth(this.highscoreChaseTitle, titleMaxWidth, 0.68);
    }
    this.highscoreChaseGap.x = padX;
    this.highscoreChaseGap.y = narrow ? Math.max(21, h - 27) : Math.max(24, h - 28);
    this.highscoreChaseGap.scale.set(1);
    this.fitTextToWidth(this.highscoreChaseGap, Math.max(44, w - padX * 2), 0.6);

    this.highscoreChaseBg.clear();
    this.highscoreChaseBg.roundRect(0, 0, w, h, 6);
    this.highscoreChaseBg.fill({ color: 0x020711, alpha: 0.5 });
    this.highscoreChaseBg.stroke({ color: dangerColor, width: 1.25, alpha: 0.68 + pulse * 0.22 });
    this.highscoreChaseBg.rect(6, 5, 3, h - 10);
    this.highscoreChaseBg.fill({ color: dangerColor, alpha: 0.72 });
    this.highscoreChaseBg.rect(w - 9, 5, 3, h - 10);
    this.highscoreChaseBg.fill({ color: 0xff55d9, alpha: 0.52 });
    if (nearTarget) {
      this.highscoreChaseBg.roundRect(3, 3, w - 6, h - 6, 5);
      this.highscoreChaseBg.stroke({ color: 0xff55d9, width: 1.1, alpha: 0.22 + pulse * 0.24 });
    } else if (surpassed) {
      this.highscoreChaseBg.roundRect(3, 3, w - 6, h - 6, 5);
      this.highscoreChaseBg.stroke({ color: 0xffef7e, width: 1.4, alpha: 0.36 + pulse * 0.28 });
      this.highscoreChaseBg.roundRect(7, 7, w - 14, h - 14, 4);
      this.highscoreChaseBg.stroke({ color: 0xffffff, width: 0.8, alpha: 0.18 + pulse * 0.18 });
    }

    const barX = 11;
    const barY = h - 10;
    this.highscoreChaseBarBg.clear();
    this.highscoreChaseBarBg.roundRect(barX, barY, barW, 4, 2);
    this.highscoreChaseBarBg.fill({ color: 0x102238, alpha: 0.88 });
    this.highscoreChaseBarFill.clear();
    this.highscoreChaseBarFill.roundRect(barX, barY, barW * progress, 4, 2);
    this.highscoreChaseBarFill.fill({ color: dangerColor, alpha: 0.92 });
    this.highscoreChaseTicks.clear();
    let targetChevronCount = 0;
    let victoryBurstCount = 0;
    if (hasTarget) {
      const markerValues = [0.25, 0.5, 0.75, 1];
      for (const mark of markerValues) {
        const x = Math.round(barX + barW * mark);
        const cleared = ratio >= mark;
        this.highscoreChaseTicks.moveTo(x, barY - 3);
        this.highscoreChaseTicks.lineTo(x, barY + 7);
        this.highscoreChaseTicks.stroke({
          color: cleared ? 0xffffff : 0x6d8aa3,
          width: mark >= 1 ? 1.6 : 1.1,
          alpha: cleared ? 0.9 : 0.52
        });
      }
      const glintX = Math.round(barX + barW * Math.min(1, progress));
      this.highscoreChaseTicks.roundRect(glintX - 2, barY - 5, 4, 14, 2);
      this.highscoreChaseTicks.fill({ color: 0xffffff, alpha: 0.32 + pulse * 0.3 });
      if (nearTarget) {
        this.highscoreChaseTicks.roundRect(barX - 2, barY - 4, barW + 4, 12, 5);
        this.highscoreChaseTicks.stroke({ color: 0xff55d9, width: 1.1, alpha: 0.36 });
        for (let i = 0; i < 3; i += 1) {
          const x = Math.min(barX + barW - 5, glintX + 8 + i * 8);
          const y = barY + 2;
          this.highscoreChaseTicks.moveTo(x - 4, y - 4);
          this.highscoreChaseTicks.lineTo(x, y);
          this.highscoreChaseTicks.lineTo(x - 4, y + 4);
          targetChevronCount += 1;
        }
        this.highscoreChaseTicks.stroke({ color: 0xffffff, width: 1.1, alpha: 0.24 + pulse * 0.36 });
      }
      if (surpassed) {
        this.highscoreChaseTicks.roundRect(barX - 2, barY - 4, barW + 4, 12, 5);
        this.highscoreChaseTicks.stroke({ color: 0xffef7e, width: 1.4, alpha: 0.58 });
        this.highscoreChaseTicks.circle(barX + barW, barY + 2, 3.4);
        this.highscoreChaseTicks.fill({ color: 0xffef7e, alpha: 0.88 });
        const burstX = barX + barW;
        const burstY = barY + 2;
        for (let i = 0; i < 6; i += 1) {
          const angle = (Math.PI * 2 * i) / 6 + pulse * 0.12;
          const inner = 7;
          const outer = 13 + pulse * 4;
          this.highscoreChaseTicks.moveTo(burstX + Math.cos(angle) * inner, burstY + Math.sin(angle) * inner);
          this.highscoreChaseTicks.lineTo(burstX + Math.cos(angle) * outer, burstY + Math.sin(angle) * outer);
          victoryBurstCount += 1;
        }
        this.highscoreChaseTicks.stroke({ color: 0xffffff, width: 1.1, alpha: 0.2 + pulse * 0.3 });
      }
    }
    this.highscoreChaseGroup._debugChase = {
      hasTarget,
      ratio: Number(ratio.toFixed(3)),
      progress: Number(progress.toFixed(3)),
      nearTarget,
      surpassed,
      tickCount: hasTarget ? 4 : 0,
      targetChevronCount,
      victoryBurstCount,
      glintX: hasTarget ? Math.round(barX + barW * Math.min(1, progress)) : null,
      pulseBucket
    };
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
      this.updateMissionProgress({
        state,
        phase: 'BOSS',
        waveTotal,
        waveIndex,
        activeEnemies,
        activeBullets
      });
      return;
    }

    if (state === 'LEVEL_COMPLETE') {
      this.missionText.text = 'SECTOR CLEAR';
      this.updateMissionProgress({
        state,
        phase,
        waveTotal,
        waveIndex,
        activeEnemies: 0,
        activeBullets: 0
      });
      return;
    }

    if (state === 'WAVE_BRIEFING') {
      this.missionText.text = `INCOMING WAVE ${Math.min(waveIndex, waveTotal)}/${waveTotal}`;
      this.updateMissionProgress({
        state,
        phase,
        waveTotal,
        waveIndex,
        activeEnemies,
        activeBullets
      });
      return;
    }

    const waveText = waveTotal > 0 ? `WAVE: ${Math.min(waveIndex, waveTotal)}/${waveTotal}` : `LEVEL: ${this.game.level}`;
    this.missionText.text = translateText(`${waveText} | HOSTILES: ${activeEnemies} | THREATS: ${activeBullets}`);
    this.updateMissionProgress({
      state,
      phase,
      waveTotal,
      waveIndex,
      activeEnemies,
      activeBullets
    });
  }

  updateMissionProgress({
    state = 'IDLE',
    phase = 'WAVES',
    waveTotal = 0,
    waveIndex = 1,
    activeEnemies = 0,
    activeBullets = 0
  } = {}) {
    const rail = this.missionProgressBg;
    const fill = this.missionProgressFill;
    const active = this.missionProgressActive;
    const ticks = this.missionProgressTicks;
    if (!rail || !fill || !active || !ticks) return;

    const width = Math.max(0, Number(rail.__w) || 0);
    const height = Math.max(0, Number(rail.__h) || 0);
    const x = Number(rail.__x) || 0;
    const y = Number(rail.__y) || 0;
    const total = Math.max(0, Math.floor(Number(waveTotal) || 0));
    const clampedWave = total > 0
      ? Math.max(1, Math.min(total, Math.floor(Number(waveIndex) || 1)))
      : 0;
    const hasRail = width > 12 && height > 1 && total > 0;
    const isBoss = phase === 'BOSS' || state === 'BOSS_ACTIVE' || state === 'BOSS_GATE';
    const isClear = state === 'LEVEL_COMPLETE';
    const isBriefing = state === 'WAVE_BRIEFING';
    const pressure = Math.min(1, (Math.max(0, activeEnemies) / 10) + (Math.max(0, activeBullets) / 36));
    const pulse = 0.5 + Math.sin(Date.now() * 0.012) * 0.5;
    const activeColor = isBoss
      ? 0xff55d9
      : isClear
        ? 0x75ff8d
        : isBriefing
          ? 0xffef7e
          : pressure > 0.75
            ? 0xff7a55
            : 0x66f7ff;

    rail.clear();
    fill.clear();
    active.clear();
    ticks.clear();
    rail.visible = fill.visible = active.visible = ticks.visible = hasRail;
    if (!hasRail) {
      rail._debugMissionProgress = { visible: false, waveTotal: total };
      return;
    }

    const completedRatio = isBoss || isClear ? 1 : Math.max(0, Math.min(1, (clampedWave - 1) / total));
    const activeStart = Math.max(0, Math.min(1, (clampedWave - 1) / total));
    const activeEnd = Math.max(activeStart, Math.min(1, clampedWave / total));
    const radius = Math.max(1.5, height / 2);

    rail.roundRect(x, y, width, height, radius);
    rail.fill({ color: 0x020711, alpha: 0.82 });
    rail.stroke({ color: 0x66f7ff, width: 1, alpha: 0.24 });

    if (completedRatio > 0) {
      fill.roundRect(x, y, Math.max(height, width * completedRatio), height, radius);
      fill.fill({ color: isClear ? 0x75ff8d : (isBoss ? 0xff55d9 : 0x4ce7ff), alpha: isClear ? 0.92 : 0.72 });
    }

    if (!isBoss && !isClear) {
      const segmentX = x + width * activeStart;
      const segmentW = Math.max(height * 1.6, width * Math.max(0.015, activeEnd - activeStart));
      active.roundRect(segmentX, y - 1, Math.min(segmentW, x + width - segmentX), height + 2, radius + 1);
      active.fill({ color: activeColor, alpha: 0.34 + pulse * (pressure > 0.5 ? 0.34 : 0.18) });
      active.stroke({ color: activeColor, width: 1.25, alpha: 0.62 + pulse * 0.22 });
      const sparkX = Math.min(x + width - 2, segmentX + segmentW * 0.5);
      active.circle(sparkX, y + height / 2, 2.2 + pressure * 2.2 + pulse * 0.8);
      active.fill({ color: activeColor, alpha: 0.42 + pressure * 0.22 });
    } else {
      active.roundRect(x, y - 1, width, height + 2, radius + 1);
      active.stroke({ color: activeColor, width: isClear ? 1.8 : 1.4, alpha: isClear ? 0.72 : 0.58 + pulse * 0.24 });
      if (isClear) {
        active.circle(x + width - height / 2, y + height / 2, height * 0.95);
        active.fill({ color: activeColor, alpha: 0.82 });
      }
    }

    const tickEvery = Math.max(1, Math.ceil(total / 12));
    let tickCount = 0;
    for (let i = 1; i < total; i += 1) {
      if (i % tickEvery !== 0) continue;
      const tx = Math.round(x + width * (i / total));
      ticks.moveTo(tx, y - 1);
      ticks.lineTo(tx, y + height + 1);
      tickCount += 1;
    }
    if (tickCount) {
      ticks.stroke({ color: 0xf8fbff, width: 1, alpha: 0.38 });
    }

    rail._debugMissionProgress = {
      visible: true,
      state,
      phase,
      waveTotal: total,
      waveIndex: clampedWave,
      completedRatio: Number(completedRatio.toFixed(3)),
      activeStart: Number(activeStart.toFixed(3)),
      activeEnd: Number(activeEnd.toFixed(3)),
      pressure: Number(pressure.toFixed(3)),
      tickCount,
      color: activeColor
    };
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
      this.activePowerupGroup._debugStatus = { visible: false, count: 0 };
      return;
    }

    const layout = getCurrentLayout();
    const isMobile = Boolean(layout?.isMobile);
    const uiScale = Math.max(1, Math.min(2, Number(layout?.uiScale) || 1));
    const width = Math.round((isMobile ? 194 : 256) * uiScale);
    const paddingX = 7;
    const paddingTop = 6;
    const rowGap = 5;
    const rowHeight = Math.round((isMobile ? 32 : 38) * uiScale);
    const titleHeight = Math.round((isMobile ? 16 : 18) * uiScale);
    const height = paddingTop + titleHeight + activeStates.length * rowHeight + Math.max(0, activeStates.length - 1) * rowGap + 7;

    const hasDebuff = activeStates.some((state) => String(state.type || '').startsWith('debuff_'));
    const hasSpent = activeStates.some((state) => Boolean(state.spent));
    const hasExpiring = activeStates.some((state) => this.isPowerupExpiring(state));
    const statusColor = hasDebuff ? 0xff6688 : hasSpent ? 0xff6677 : hasExpiring ? 0xffd166 : 0x00e5ff;
    const statusAlpha = hasDebuff ? 0.88 : hasSpent ? 0.86 : hasExpiring ? 0.82 : 0.7;
    this.activePowerupBg.clear();
    this.activePowerupBg.roundRect(0, 0, width, height, 8);
    this.activePowerupBg.fill({ color: hasSpent ? 0x12050b : 0x020914, alpha: hasSpent ? 0.68 : 0.62 });
    this.activePowerupBg.stroke({ color: statusColor, width: hasDebuff || hasSpent || hasExpiring ? 2 : 1.2, alpha: statusAlpha });
    this.activePowerupBg.rect(1, 1, Math.max(0, width - 2), 14);
    this.activePowerupBg.fill({ color: statusColor, alpha: hasDebuff || hasSpent || hasExpiring ? 0.17 : 0.11 });

    this.activePowerupTitle.text = hasDebuff
      ? 'SYSTEM STATUS'
      : activeStates.length > 1 ? 'POWERUPS ONLINE' : 'POWERUP ONLINE';
    this.activePowerupTitle.style.fill = hasDebuff ? '#ffb7c8' : hasSpent ? '#ffb0b8' : hasExpiring ? '#ffe08a' : '#7ee9ff';
    this.activePowerupTitle.style.fontSize = Math.round((isMobile ? 10 : 12) * uiScale);
    this.activePowerupTitle.x = paddingX + 1;
    this.activePowerupTitle.y = paddingTop - 2;
    this.activePowerupTitle.visible = true;
    this.activePowerupGroup._debugStatus = {
      visible: true,
      count: activeStates.length,
      hasDebuff,
      hasSpent,
      hasExpiring,
      statusColor
    };

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

    this.activePowerupText.text = translateText(activeStates[0]?.label || '');
    this.activePowerupTimer.text = this.formatPowerupMeta(activeStates[0] || {});
    this.activePowerupBarBg.clear();
    this.activePowerupBarFill.clear();
    this.activePowerupGroup.visible = true;

    const canvasWidth = this.game.getWidth ? this.game.getWidth() : 0;
    if (canvasWidth) {
      const margin = Math.round(10 * uiScale);
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
    const categoryAccent = new PIXI.Graphics();
    const barBg = new PIXI.Graphics();
    const barFill = new PIXI.Graphics();
    const barTicks = new PIXI.Graphics();
    const chargePips = new PIXI.Graphics();
    const urgencyChevrons = new PIXI.Graphics();
    const expiryOverlay = new PIXI.Graphics();
    const spentOverlay = new PIXI.Graphics();

    container.addChild(bg);
    container.addChild(categoryAccent);
    container.addChild(iconGlow);
    container.addChild(iconFrame);
    container.addChild(icon);
    container.addChild(label);
    container.addChild(meta);
    container.addChild(barBg);
    container.addChild(barFill);
    container.addChild(barTicks);
    container.addChild(chargePips);
    container.addChild(urgencyChevrons);
    container.addChild(expiryOverlay);
    container.addChild(spentOverlay);
    this.activePowerupList.addChild(container);

    const row = { container, bg, categoryAccent, iconGlow, iconFrame, icon, label, meta, barBg, barFill, barTicks, chargePips, urgencyChevrons, expiryOverlay, spentOverlay };
    this.activePowerupRows[index] = row;
    return row;
  }

  updateActivePowerupRow(row, state, width, height, isMobile) {
    const uiScale = Math.max(1, Math.min(2, Number(getCurrentLayout()?.uiScale) || 1));
    const color = Number.isFinite(state.color) ? state.color : this.getPowerupColor(state.type);
    const spent = Boolean(state.spent);
    const progress = this.getPowerupProgress(state);
    const expiring = this.isPowerupExpiring(state);
    const pulse = 0.5 + Math.sin(Date.now() * 0.018) * 0.5;
    const category = this.getPowerupCategory(state.type, state);
    const categoryColor = this.getPowerupCategoryColor(category, color);
    const rowColor = spent ? 0xff6677 : expiring ? 0xffd166 : color;
    const iconSize = Math.round((isMobile ? 20 : 23) * uiScale);
    const iconX = Math.round(17 * uiScale);
    const iconY = height / 2 - 1;
    const texture = GameAssets.getPowerupTexture(state.iconType || state.type);
    row.bg.clear();
    row.bg.roundRect(0, 0, width, height, 7);
    row.bg.fill({ color: spent ? 0x1e0710 : 0x03101d, alpha: spent ? 0.76 : 0.58 });
    row.bg.stroke({ color: rowColor, width: spent || expiring ? 1.7 : 1, alpha: spent ? 0.95 : expiring ? 0.68 + pulse * 0.25 : 0.65 });

    this.drawPowerupCategoryAccent(row.categoryAccent, category, categoryColor, height, pulse, spent);

    row.iconGlow.clear();
    row.iconGlow.circle(iconX, iconY, iconSize * 0.62);
    row.iconGlow.fill({ color, alpha: spent ? 0.08 : 0.16 });
    row.iconFrame.clear();
    row.iconFrame.circle(iconX, iconY, iconSize * 0.58);
    row.iconFrame.stroke({ color, width: spent ? 1.8 : 1.4, alpha: spent ? 0.95 : 0.82 });

    if (texture) {
      row.icon.visible = true;
      row.icon.texture = texture;
      const scale = Math.min(iconSize / texture.width, iconSize / texture.height);
      row.icon.scale.set(Number.isFinite(scale) ? scale : 1);
      row.icon.x = iconX;
      row.icon.y = iconY;
      row.icon.alpha = spent ? 0.55 : 1;
    } else {
      row.icon.visible = false;
    }

    row.label.style.fontSize = Math.round((isMobile ? 11 : 14) * uiScale);
    row.meta.style.fontSize = Math.round((isMobile ? 10 : 12) * uiScale);
    row.label.style.fill = spent ? '#ffd6d6' : '#f8fbff';
    row.meta.style.fill = spent ? '#ff9d9d' : expiring ? (pulse > 0.5 ? '#fff2a6' : '#ffc95b') : '#ffff66';
    row.label.text = this.truncateLabel(translateText(state.label), isMobile ? 15 : 18);
    row.meta.text = this.formatPowerupMeta(state);
    row.label.x = 34;
    row.label.y = 4;
    row.meta.x = Math.max(row.label.x + 42, width - 7 - row.meta.width);
    row.meta.y = 4;

    const barX = 34;
    const barY = height - 8;
    const barWidth = Math.max(34, width - barX - 7);
    row.barBg.clear();
    row.barBg.roundRect(barX, barY, barWidth, 4, 2);
    row.barBg.fill({ color: spent ? 0x3a1118 : 0x143042, alpha: 0.9 });
    row.barFill.clear();
    const fillWidth = spent ? 0 : Math.max(2, barWidth * progress);
    if (fillWidth > 0) {
      row.barFill.roundRect(barX, barY, fillWidth, 4, 2);
      row.barFill.fill({ color: rowColor, alpha: expiring ? 0.72 + pulse * 0.26 : 0.98 });
    }
    const timerTickCount = this.drawPowerupTimerTicks(row.barTicks, state, barX, barY, barWidth, spent);
    const chargeDebug = this.drawPowerupChargePips(row.chargePips, state, width, height, rowColor, spent);
    const urgencyChevronCount = this.drawPowerupUrgencyChevrons(row.urgencyChevrons, expiring, width, height, pulse);

    row.expiryOverlay.clear();
    row.expiryOverlay.visible = expiring;
    if (expiring) {
      row.expiryOverlay.roundRect(1, 1, Math.max(0, width - 2), Math.max(0, height - 2), 7);
      row.expiryOverlay.stroke({ color: 0xffd166, width: 1.2, alpha: 0.25 + pulse * 0.36 });
      row.expiryOverlay.rect(3, 4, 3, Math.max(0, height - 8));
      row.expiryOverlay.fill({ color: 0xffd166, alpha: 0.34 + pulse * 0.34 });
    }

    row.spentOverlay.clear();
    row.spentOverlay.visible = spent;
    if (spent) {
      const slashPad = iconSize * 0.48;
      row.spentOverlay.moveTo(iconX - slashPad, iconY - slashPad);
      row.spentOverlay.lineTo(iconX + slashPad, iconY + slashPad);
      row.spentOverlay.stroke({ color: 0xffc1c8, width: 2.2, alpha: 0.95 });
      const hatchStart = Math.max(barX + 70, width - 45);
      for (let i = 0; i < 3; i += 1) {
        const hx = hatchStart + i * 10;
        row.spentOverlay.moveTo(hx, height - 15);
        row.spentOverlay.lineTo(hx + 8, height - 7);
      }
      row.spentOverlay.stroke({ color: 0xff7584, width: 1.4, alpha: 0.82 });
    }

    row.container._debugPowerupState = {
      type: state.type || null,
      label: row.label.text,
      meta: row.meta.text,
      spent,
      expiring,
      category,
      progress: Number(progress.toFixed(3)),
      categoryAccentVisible: Boolean(row.categoryAccent.visible),
      timerTickCount,
      chargePipCount: chargeDebug.count,
      chargePipActive: chargeDebug.active,
      urgencyChevronCount,
      spentOverlayVisible: Boolean(row.spentOverlay.visible),
      expiryOverlayVisible: Boolean(row.expiryOverlay.visible)
    };
  }

  drawPowerupCategoryAccent(graphics, category, color, height, pulse = 0, spent = false) {
    graphics.clear();
    graphics.visible = Boolean(category);
    if (!graphics.visible) return;

    const alpha = spent ? 0.42 : 0.66 + pulse * 0.18;
    graphics.roundRect(2, 5, 4, Math.max(10, height - 10), 2);
    graphics.fill({ color, alpha });

    const midY = height / 2;
    const markAlpha = spent ? 0.34 : 0.78;
    if (category === 'offense') {
      graphics.poly([7, midY - 7, 14, midY - 3, 7, midY + 1]);
      graphics.fill({ color, alpha: markAlpha });
      graphics.poly([7, midY + 2, 14, midY + 6, 7, midY + 10]);
      graphics.fill({ color, alpha: markAlpha * 0.78 });
    } else if (category === 'defense') {
      graphics.circle(10, midY - 4, 3.5);
      graphics.stroke({ color, width: 1.2, alpha: markAlpha });
      graphics.circle(10, midY + 5, 2.2);
      graphics.fill({ color, alpha: markAlpha * 0.55 });
    } else if (category === 'control') {
      graphics.moveTo(7, midY);
      graphics.lineTo(15, midY);
      graphics.moveTo(11, midY - 4);
      graphics.lineTo(11, midY + 4);
      graphics.stroke({ color, width: 1.2, alpha: markAlpha });
      graphics.circle(11, midY, 5.5);
      graphics.stroke({ color, width: 0.8, alpha: markAlpha * 0.48 });
    } else if (category === 'status') {
      graphics.moveTo(7, midY - 6);
      graphics.lineTo(15, midY + 6);
      graphics.moveTo(15, midY - 6);
      graphics.lineTo(7, midY + 6);
      graphics.stroke({ color, width: 1.4, alpha: markAlpha });
    } else {
      graphics.poly([11, midY - 6, 16, midY, 11, midY + 6, 6, midY]);
      graphics.stroke({ color, width: 1.2, alpha: markAlpha });
    }
  }

  drawPowerupTimerTicks(graphics, state, barX, barY, barWidth, spent = false) {
    graphics.clear();
    const hasTimer = Number(state?.remainingMs || 0) > 0 || Number(state?.durationMs || 0) > 0;
    graphics.visible = hasTimer;
    if (!hasTimer) return 0;

    const tickColor = spent ? 0xff8392 : 0xf8fbff;
    for (let i = 1; i <= 3; i += 1) {
      const x = barX + barWidth * (i / 4);
      graphics.moveTo(x, barY - 1);
      graphics.lineTo(x, barY + 5);
    }
    graphics.stroke({ color: tickColor, width: 0.9, alpha: spent ? 0.28 : 0.48 });
    return 3;
  }

  drawPowerupChargePips(graphics, state, width, height, color, spent = false) {
    graphics.clear();
    const maxCharges = Math.max(0, Math.min(6, Number(state?.maxCharges || 0)));
    const charges = Math.max(0, Math.min(maxCharges, Number(state?.charges || 0)));
    graphics.visible = maxCharges > 1;
    if (!graphics.visible) return { count: 0, active: 0 };

    const pipGap = 7;
    const startX = Math.max(45, width - 9 - (maxCharges - 1) * pipGap);
    const y = Math.max(18, height - 16);
    for (let i = 0; i < maxCharges; i += 1) {
      const active = i < charges && !spent;
      const x = startX + i * pipGap;
      graphics.circle(x, y, active ? 2.5 : 2.1);
      graphics.fill({ color: active ? color : 0x31465c, alpha: active ? 0.94 : 0.68 });
      graphics.circle(x, y, active ? 3.7 : 3.1);
      graphics.stroke({ color: active ? color : 0x7e8da0, width: active ? 0.9 : 0.7, alpha: active ? 0.74 : 0.42 });
    }
    return { count: maxCharges, active: spent ? 0 : charges };
  }

  drawPowerupUrgencyChevrons(graphics, expiring, width, height, pulse = 0) {
    graphics.clear();
    graphics.visible = Boolean(expiring);
    if (!graphics.visible) return 0;

    const color = 0xffd166;
    const alpha = 0.44 + pulse * 0.34;
    const baseX = width - 34;
    const y = height - 22;
    for (let i = 0; i < 3; i += 1) {
      const x = baseX + i * 9;
      graphics.poly([x, y, x + 5, y + 4, x, y + 8]);
      graphics.fill({ color, alpha: Math.max(0.24, alpha - i * 0.08) });
    }
    return 3;
  }

  formatPowerupMeta(state) {
    const remaining = Math.max(0, Math.ceil((state.remainingMs || 0) / 1000));
    const detail = String(state.detail || '').trim();
    const charges = Number(state.charges || 0);
    if (state.spent) return translateText(detail || 'EMPTY');
    if (remaining && detail) return `${remaining}s | ${detail}`;
    if (remaining && charges) return `${remaining}s | ${charges}`;
    if (remaining) return `${remaining}s`;
    if (detail) return detail;
    if (charges) return `${charges} ${translateText('LEFT')}`;
    return translateText('ACTIVE');
  }

  getPowerupProgress(state) {
    if (state.spent) return 0;
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

  isPowerupExpiring(state) {
    if (!state || state.spent) return false;
    const remainingMs = Number(state.remainingMs || 0);
    if (remainingMs <= 0) return false;
    return this.getPowerupProgress(state) <= 0.25;
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

  getPowerupCategory(type, state = {}) {
    const normalized = String(type || '');
    if (String(state.category || '') === 'debuff' || normalized.startsWith('debuff_')) return 'status';
    if (normalized.startsWith('rank_') || normalized.startsWith('synergy_')) return 'utility';
    if (['shield', 'ghost', 'point_defense', 'vampire', 'super_extra_life'].includes(normalized)) return 'defense';
    if (['slow_time', 'magnet', 'speed_up', 'vector_boost'].includes(normalized)) return 'control';
    if (['score_x2', 'drones'].includes(normalized)) return 'utility';
    if (['rapid_fire', 'double_shot', 'damage_up', 'pierce', 'bomb', 'chain_lightning', 'orbital_strike', 'triple_beam', 'rapid_cabinet', 'overdrive_core', 'row_core'].includes(normalized)) return 'offense';
    return 'utility';
  }

  getPowerupCategoryColor(category, fallbackColor = 0x00ffff) {
    const colors = {
      defense: 0x66ffff,
      offense: 0xff9a44,
      control: 0x9a8cff,
      utility: 0xffee66,
      status: 0xff6688
    };
    return colors[category] || fallbackColor;
  }

  updateTraitMeter() {
    const player = this.game?.scenes?.play?.player;
    const state = player?.getTraitState ? player.getTraitState() : null;
    if (!state?.label) {
      this.traitGroup.visible = false;
      return;
    }

    const event = this.getTraitMeterEvent(state);
    const layout = getCurrentLayout();
    const canvasWidth = this.game.getWidth ? this.game.getWidth() : Number(layout?.width) || 0;
    const uiScale = Math.max(1, Math.min(2, Number(layout?.uiScale) || 1));
    const isLargeDesktop = !layout?.isMobile && canvasWidth >= 1920;
    const paddingX = Math.round(8 * uiScale);
    const paddingY = Math.round(6 * uiScale);
    const barHeight = Math.max(4, Math.round(4 * uiScale));
    const barGap = Math.round(4 * uiScale);
    this.traitLabel.style.fontSize = Math.round((isLargeDesktop ? 12 : 11) * uiScale);
    this.traitLabel.style.stroke = { color: '#000000', width: Math.round(3 * uiScale) };
    this.traitText.style.fontSize = Math.round((isLargeDesktop ? 13 : 12) * uiScale);
    this.traitText.style.stroke = { color: '#000000', width: Math.round(3 * uiScale) };
    const label = `TRAIT: ${this.truncateLabel(state.label, 17)}`;
    this.traitLabel.text = label;
    this.traitText.text = event.text;
    this.traitLabel.updateText?.(false);
    this.traitText.updateText?.(false);
    const minWidth = Math.round(154 * uiScale);
    const maxWidth = Math.round(Math.min(
      canvasWidth ? canvasWidth * (layout?.isMobile ? 0.74 : 0.34) : 300 * uiScale,
      (isLargeDesktop ? 300 : 260) * uiScale
    ));
    const width = Math.max(minWidth, Math.min(maxWidth, Math.max(this.traitLabel.width, this.traitText.width) + paddingX * 2));
    const textHeight = this.traitLabel.height + this.traitText.height + 1;
    const height = textHeight + barGap + barHeight + paddingY * 2;

    this.traitBg.clear();
    this.traitBg.roundRect(0, 0, width, height, 8 * uiScale);
    this.traitBg.fill({ color: 0x050914, alpha: 0.52 });
    this.traitBg.stroke({ color: event.color, width: 1.2 * uiScale, alpha: 0.7 });

    this.traitLabel.x = paddingX;
    this.traitLabel.y = paddingY - 2;
    this.traitText.x = paddingX;
    this.traitText.y = paddingY + this.traitLabel.height - 2;

    const barWidth = Math.max(24, width - paddingX * 2);
    const barY = paddingY + textHeight + barGap - 3;
    this.traitBarBg.clear();
    this.traitBarBg.roundRect(paddingX, barY, barWidth, barHeight, 2 * uiScale);
    this.traitBarBg.fill({ color: 0x231a14, alpha: 0.85 });
    this.traitBarFill.clear();
    this.traitBarFill.roundRect(paddingX, barY, Math.max(2 * uiScale, barWidth * event.progress), barHeight, 2 * uiScale);
    this.traitBarFill.fill({ color: event.color, alpha: 0.96 });
    this.traitGroup.visible = true;

    if (canvasWidth) {
      const margin = Math.round(10 * Math.min(uiScale, 1.45));
      const powerupBottom = this.activePowerupGroup?.visible
        ? this.activePowerupGroup.y + this.activePowerupGroup.height + 6 * uiScale
        : 0;
      const livesBottom = this.livesGroup ? this.livesGroup.y + this.livesGroup.height + 6 * uiScale : 0;
      const locationBottom = this.locationText ? this.locationText.y + this.locationText.height + 6 * uiScale : 0;
      this.traitGroup.x = canvasWidth - margin - width;
      this.traitGroup.y = Math.max(powerupBottom, livesBottom, locationBottom);
    }
  }

  getTraitMeterEvent(state) {
    const candidates = [
      {
        every: Number(state.critEvery || 0),
        remaining: Number(state.nextCritShotIn || 0),
        text: 'CRIT',
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
        text: 'WING SHOT',
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
        text: next.remaining <= 1 ? `${next.text} READY` : `${next.text} IN ${next.remaining} SHOTS`,
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

  fitTextToWidth(textNode, maxWidth, minScale = 0.68) {
    if (!textNode || !Number.isFinite(maxWidth) || maxWidth <= 0) return;
    textNode.scale.set(1);
    textNode.updateText?.(false);
    const width = Number(textNode.width) || 0;
    if (width > maxWidth) {
      textNode.scale.set(Math.max(minScale, maxWidth / width));
    }
  }

  updateComboMeter() {
    const playScene = this.game?.scenes?.play;
    const count = Math.max(0, Math.round(Number(playScene?.comboCount) || 0));
    const multiplier = Math.max(1, Math.round(Number(playScene?.comboMultiplier) || 1));
    const timerMs = Math.max(0, Number(playScene?.comboTimerMs) || 0);
    const windowMs = Math.max(1, Number(playScene?.comboWindowMs) || 1);
    if (!this.comboMeterGroup || count < 2 || timerMs <= 0) {
      if (this.comboMeterGroup) {
        this.comboMeterGroup.visible = false;
        this.comboMeterTicks?.clear?.();
        this.comboMeterGroup._debugComboMeter = { visible: false, count, multiplier, progress: 0 };
      }
      return;
    }

    const progress = Math.max(0, Math.min(1, timerMs / windowMs));
    const uiScale = Math.max(1, Math.min(2, Number(getCurrentLayout()?.uiScale) || 1));
    const width = Math.round(this.comboMeterGroup.__w || (106 * uiScale));
    const height = Math.round(this.comboMeterGroup.__h || (22 * uiScale));
    const low = progress <= 0.25;
    const pulse = low ? 0.5 + Math.sin(Date.now() * 0.018) * 0.5 : 0;
    const color = low ? 0xffd166 : multiplier >= 3 ? 0xff66ff : multiplier >= 2 ? 0x66f7ff : 0x75ff8d;
    const panelRight = Number(this.comboMeterGroup.__panelRight || (this.scoreText.x + this.scoreText.width + width + 10));
    const anchor = this.scoreMultiplierText?.visible ? this.levelText : this.scoreText;
    const rawX = (anchor?.x || this.scoreText.x) + (anchor?.width || this.scoreText.width) + Math.round(9 * uiScale);
    this.comboMeterGroup.x = Math.min(rawX, panelRight - width);
    this.comboMeterGroup.y = (anchor?.y || this.scoreText.y) + Math.round(2 * uiScale);

    this.comboMeterBg.clear();
    this.comboMeterBg.roundRect(0, 0, width, height, 5);
    this.comboMeterBg.fill({ color: low ? 0x221304 : 0x03101d, alpha: 0.76 });
    this.comboMeterBg.stroke({ color, width: low ? 1.6 : 1.1, alpha: low ? 0.66 + pulse * 0.26 : 0.72 });

    this.comboMeterFill.clear();
    const fillWidth = Math.max(2, (width - 4) * progress);
    this.comboMeterFill.roundRect(2, height - 5, fillWidth, 3, 2);
    this.comboMeterFill.fill({ color, alpha: low ? 0.74 + pulse * 0.22 : 0.92 });

    this.comboMeterTicks.clear();
    const glintX = Math.round(2 + fillWidth);
    let alarmBracketCount = 0;
    let deadlineSparkCount = 0;
    this.comboMeterTicks.roundRect(glintX - 2, height - 8, 4, 8, 2);
    this.comboMeterTicks.fill({ color: 0xffffff, alpha: low ? 0.34 + pulse * 0.3 : 0.42 });
    const tierPips = Math.max(1, Math.min(4, multiplier));
    for (let i = 0; i < tierPips; i += 1) {
      this.comboMeterTicks.circle(width - 8 - i * 7, 6, 2.1);
      this.comboMeterTicks.fill({ color: i === 0 ? color : 0xffffff, alpha: i === 0 ? 0.9 : 0.46 });
    }
    if (low) {
      const hatchStart = Math.max(6, width - 25);
      for (let x = hatchStart; x < width - 4; x += 6) {
        this.comboMeterTicks.moveTo(x, 4);
        this.comboMeterTicks.lineTo(x + 7, height - 6);
      }
      this.comboMeterTicks.stroke({ color: 0xffd166, width: 1.1, alpha: 0.28 + pulse * 0.3 });

      const bracketInset = 3;
      const bracketY = Math.round(height * 0.5);
      for (const sideX of [bracketInset, width - bracketInset]) {
        const direction = sideX < width * 0.5 ? 1 : -1;
        this.comboMeterTicks.moveTo(sideX, bracketY - 6);
        this.comboMeterTicks.lineTo(sideX, bracketY + 6);
        this.comboMeterTicks.moveTo(sideX, bracketY - 6);
        this.comboMeterTicks.lineTo(sideX + direction * 7, bracketY - 6);
        this.comboMeterTicks.moveTo(sideX, bracketY + 6);
        this.comboMeterTicks.lineTo(sideX + direction * 7, bracketY + 6);
        alarmBracketCount += 1;
      }
      this.comboMeterTicks.stroke({ color: 0xff4b6b, width: 1.45, alpha: 0.42 + pulse * 0.34 });

      const sparkStart = Math.min(width - 33, Math.max(glintX + 8, Math.round(width * 0.34)));
      for (let i = 0; i < 3; i += 1) {
        const sparkX = sparkStart + i * 9;
        if (sparkX >= width - 10) continue;
        this.comboMeterTicks.circle(sparkX, height - 5, 1.8 + pulse * 0.7);
        this.comboMeterTicks.fill({ color: i === 0 ? 0xffffff : 0xffd166, alpha: 0.28 + pulse * 0.42 });
        deadlineSparkCount += 1;
      }
    }

    const comboLabel = translateText('COMBO');
    this.comboMeterText.text = [comboLabel, String(count), `x${multiplier}`].join(' ');
    this.comboMeterText.style.fontSize = Math.round((getCurrentLayout()?.isMobile ? 11 : 13) * uiScale);
    this.comboMeterText.x = Math.round(5 * uiScale);
    this.comboMeterText.y = Math.max(0, Math.round((height - this.comboMeterText.height) / 2) - 1);
    this.fitTextToWidth(this.comboMeterText, width - Math.round(10 * uiScale), 0.6);
    this.comboMeterGroup.visible = true;
    this.comboMeterGroup._debugComboMeter = {
      visible: true,
      count,
      multiplier,
      progress: Number(progress.toFixed(3)),
      low,
      tierPips,
      glintX,
      lowWarning: low,
      alarmBracketCount,
      deadlineSparkCount,
      label: this.comboMeterText.text
    };
  }

  applyLayout(layout = getCurrentLayout()) {
    if (!layout || typeof layout.width !== 'number') return;

    const canvasWidth = this.game.getWidth ? this.game.getWidth() : layout.width;
    const uiScale = Math.max(1, Math.min(2, Number(layout?.uiScale) || 1));
    const isLargeDesktop = !layout.isMobile && canvasWidth >= 1920;
    const margin = Math.round((layout.isMobile ? 14 : 16) * Math.min(uiScale, 1.45));
    const blockSpacing = Math.round((layout.isMobile ? 24 : (isLargeDesktop ? 26 : 24)) * uiScale);
    const scoreFont = Math.round((layout.isMobile ? 15 : (isLargeDesktop ? 22 : 20)) * uiScale);
    const livesFont = Math.round((layout.isMobile ? 16 : (isLargeDesktop ? 22 : 20)) * uiScale);
    const leftPanelWidth = layout.isMobile
      ? Math.min(286 * uiScale, canvasWidth * 0.72)
      : Math.min(canvasWidth * 0.42, (isLargeDesktop ? 410 : 390) * uiScale);
    const leftPanelHeight = Math.round((layout.isMobile ? 126 : (isLargeDesktop ? 142 : 136)) * uiScale);
    const rightPanelWidth = Math.round((layout.isMobile ? 118 : (isLargeDesktop ? 180 : 164)) * uiScale);
    const rightPanelHeight = Math.round((layout.isMobile ? 42 : (isLargeDesktop ? 56 : 52)) * uiScale);
    const missionPanelWidth = layout.isMobile ? canvasWidth - margin * 2 : Math.min(canvasWidth * 0.56, (isLargeDesktop ? 520 : 440) * uiScale);
    const missionPanelHeight = Math.round((layout.isMobile ? 38 : (isLargeDesktop ? 58 : 52)) * uiScale);
    const missionPanelX = layout.isMobile ? margin : canvasWidth / 2 - missionPanelWidth / 2;
    const missionPanelY = layout.isMobile ? margin + leftPanelHeight + 7 : margin;

    this.scoreText.style.fontSize = scoreFont;
    this.levelText.style.fontSize = scoreFont;
    this.livesText.style.fontSize = livesFont;
    this.locationText.style.fontSize = Math.round((layout.isMobile ? 11 : (isLargeDesktop ? 16 : 14)) * uiScale);
    this.rankText.style.fontSize = Math.round((layout.isMobile ? 12 : (isLargeDesktop ? 15 : 14)) * uiScale);
    this.missionLabel.style.fontSize = Math.round((layout.isMobile ? 9 : (isLargeDesktop ? 12 : 11)) * uiScale);
    this.missionText.style.fontSize = Math.round((layout.isMobile ? 12 : (isLargeDesktop ? 17 : 15)) * uiScale);

    this.drawGlassPanel(this.leftPanel, margin, margin, leftPanelWidth, leftPanelHeight, 0x00d9ff, 0.16);
    this.drawGlassPanel(this.rightPanel, canvasWidth - margin - rightPanelWidth, margin, rightPanelWidth, rightPanelHeight, 0x75ff8d, 0.14);
    this.drawGlassPanel(this.missionPanel, missionPanelX, missionPanelY, missionPanelWidth, missionPanelHeight, 0xff55d9, 0.1);

    // Rank Position (Top Left)
    this.rankGroup.x = margin + 10;
    this.rankGroup.y = margin + 10;

    // Shift Score and Level to the right of Rank
    const rankOffset = Math.round((layout.isMobile ? 186 : (isLargeDesktop ? 204 : 198)) * uiScale);

    this.scoreText.x = margin + rankOffset;
    this.scoreText.y = margin + 10;
    this.scoreMultiplierText.x = this.scoreText.x + this.scoreText.width + 10;
    this.scoreMultiplierText.y = this.scoreText.y + 2;
    if (this.comboMeterGroup) {
      this.comboMeterGroup.__w = Math.round((layout.isMobile ? 90 : (isLargeDesktop ? 124 : 108)) * uiScale);
      this.comboMeterGroup.__h = Math.round((layout.isMobile ? 19 : 22) * uiScale);
      this.comboMeterGroup.__panelRight = margin + leftPanelWidth - 14;
    }

    this.levelText.x = margin + rankOffset;
    this.levelText.y = margin + blockSpacing + 8;

    if (this.highscoreChaseGroup) {
      const chaseWidth = Math.max((layout.isMobile ? 248 : 320) * uiScale, leftPanelWidth - 24);
      const chaseHeight = Math.round((layout.isMobile ? 50 : (isLargeDesktop ? 54 : 52)) * uiScale);
      this.highscoreChaseGroup.__w = chaseWidth;
      this.highscoreChaseGroup.__h = chaseHeight;
      this.highscoreChaseGroup.x = margin + 12;
      this.highscoreChaseGroup.y = margin + (layout.isMobile ? 70 : 74);
      this.highscoreChaseTitle.style.fontSize = Math.round((layout.isMobile ? 9 : (isLargeDesktop ? 12 : 11)) * uiScale);
      this.highscoreChaseTarget.style.fontSize = Math.round((layout.isMobile ? 11 : (isLargeDesktop ? 14 : 13)) * uiScale);
      this.highscoreChaseGap.style.fontSize = Math.round((layout.isMobile ? 9 : (isLargeDesktop ? 11 : 10)) * uiScale);
    }

    this.missionLabel.x = missionPanelX + missionPanelWidth / 2;
    this.missionLabel.y = missionPanelY + (layout.isMobile ? 10 : (isLargeDesktop ? 14 : 12));
    this.missionText.x = missionPanelX + missionPanelWidth / 2;
    this.missionText.y = missionPanelY + (layout.isMobile ? 25 : (isLargeDesktop ? 36 : 32));
    if (this.missionProgressBg) {
      const railPad = Math.round((layout.isMobile ? 10 : 14) * uiScale);
      const railHeight = Math.max(3, Math.round((layout.isMobile ? 3 : 4) * Math.min(uiScale, 1.6)));
      this.missionProgressBg.__x = Math.round(missionPanelX + railPad);
      this.missionProgressBg.__y = Math.round(missionPanelY + missionPanelHeight - railHeight - (layout.isMobile ? 4 : 6) * Math.min(uiScale, 1.4));
      this.missionProgressBg.__w = Math.round(Math.max(0, missionPanelWidth - railPad * 2));
      this.missionProgressBg.__h = railHeight;
    }

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
    const critical = Number(this.game?.lives || 0) === 1;
    const pulse = critical ? 0.5 + Math.sin(Date.now() * 0.014) * 0.5 : 0;
    this.livesIcon.style.fill = critical ? (pulse > 0.52 ? '#ff4444' : '#ffd166') : '#ff8080';
    this.livesIcon.alpha = critical ? 0.86 + pulse * 0.14 : 1;
    this.livesText.style.fill = critical ? (pulse > 0.52 ? '#ff4444' : '#ffd166') : '#00ff00';
    const height = Math.max(this.livesIcon.height, this.livesText.height) + padding;
    this.livesGroup.pivot.set(0, 0);
    this.livesIcon.x = padding / 2;
    this.livesIcon.y = height / 2 - this.livesIcon.height / 2;
    this.livesText.x = this.livesIcon.x + this.livesIcon.width + 6;
    this.livesText.y = height / 2 - this.livesText.height / 2;
    const width = this.livesText.x + this.livesText.width + padding / 2;
    this.livesBg.clear();
    this.livesBg.roundRect(0, 0, width, height, 8); // v8 syntax prefer roundRect
    this.livesBg.fill({ color: critical ? 0x2a050a : 0x000000, alpha: critical ? 0.16 + pulse * 0.1 : 0.02 });
    if (critical) {
      this.livesBg.stroke({ color: pulse > 0.52 ? 0xff4040 : 0xffd166, width: 1.4, alpha: 0.52 + pulse * 0.34 });
    }
    this.livesGroup._debugCritical = critical;
    this.livesGroup._debugPulse = Number(pulse.toFixed(3));
  }

  destroy() {
    if (this.layoutUnsubscribe) {
      this.layoutUnsubscribe();
      this.layoutUnsubscribe = null;
    }
  }
}
