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

    this.highscoreChaseGroup = new PIXI.Container();
    this.highscoreChaseBg = new PIXI.Graphics();
    this.highscoreChaseBarBg = new PIXI.Graphics();
    this.highscoreChaseBarFill = new PIXI.Graphics();
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
    const pulse = 0.5;
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

    this.highscoreChaseBarBg.clear();
    this.highscoreChaseBarBg.roundRect(11, h - 10, barW, 4, 2);
    this.highscoreChaseBarBg.fill({ color: 0x102238, alpha: 0.88 });
    this.highscoreChaseBarFill.clear();
    this.highscoreChaseBarFill.roundRect(11, h - 10, barW * progress, 4, 2);
    this.highscoreChaseBarFill.fill({ color: dangerColor, alpha: 0.92 });
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
    const barBg = new PIXI.Graphics();
    const barFill = new PIXI.Graphics();
    const expiryOverlay = new PIXI.Graphics();
    const spentOverlay = new PIXI.Graphics();

    container.addChild(bg);
    container.addChild(iconGlow);
    container.addChild(iconFrame);
    container.addChild(icon);
    container.addChild(label);
    container.addChild(meta);
    container.addChild(barBg);
    container.addChild(barFill);
    container.addChild(expiryOverlay);
    container.addChild(spentOverlay);
    this.activePowerupList.addChild(container);

    const row = { container, bg, iconGlow, iconFrame, icon, label, meta, barBg, barFill, expiryOverlay, spentOverlay };
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
    const rowColor = spent ? 0xff6677 : expiring ? 0xffd166 : color;
    const iconSize = Math.round((isMobile ? 20 : 23) * uiScale);
    const iconX = Math.round(17 * uiScale);
    const iconY = height / 2 - 1;
    const texture = GameAssets.getPowerupTexture(state.iconType || state.type);
    row.bg.clear();
    row.bg.roundRect(0, 0, width, height, 7);
    row.bg.fill({ color: spent ? 0x1e0710 : 0x03101d, alpha: spent ? 0.76 : 0.58 });
    row.bg.stroke({ color: rowColor, width: spent || expiring ? 1.7 : 1, alpha: spent ? 0.95 : expiring ? 0.68 + pulse * 0.25 : 0.65 });

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
      progress: Number(progress.toFixed(3)),
      spentOverlayVisible: Boolean(row.spentOverlay.visible),
      expiryOverlayVisible: Boolean(row.expiryOverlay.visible)
    };
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

    this.levelText.x = margin + rankOffset;
    this.levelText.y = margin + blockSpacing + 8;

    if (this.highscoreChaseGroup) {
      const chaseWidth = Math.max((layout.isMobile ? 248 : 320) * uiScale, leftPanelWidth - 24);
      const chaseHeight = Math.round((layout.isMobile ? 50 : (isLargeDesktop ? 54 : 52)) * uiScale);
      this.highscoreChaseGroup.__w = chaseWidth;
      this.highscoreChaseGroup.__h = chaseHeight;
      this.highscoreChaseGroup.x = margin + 12;
      this.highscoreChaseGroup.y = margin + (layout.isMobile ? 68 : 72);
      this.highscoreChaseTitle.style.fontSize = Math.round((layout.isMobile ? 9 : (isLargeDesktop ? 12 : 11)) * uiScale);
      this.highscoreChaseTarget.style.fontSize = Math.round((layout.isMobile ? 11 : (isLargeDesktop ? 14 : 13)) * uiScale);
      this.highscoreChaseGap.style.fontSize = Math.round((layout.isMobile ? 9 : (isLargeDesktop ? 11 : 10)) * uiScale);
    }

    this.missionLabel.x = missionPanelX + missionPanelWidth / 2;
    this.missionLabel.y = missionPanelY + (layout.isMobile ? 10 : (isLargeDesktop ? 14 : 12));
    this.missionText.x = missionPanelX + missionPanelWidth / 2;
    this.missionText.y = missionPanelY + (layout.isMobile ? 27 : (isLargeDesktop ? 37 : 33));

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
