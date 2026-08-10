/**
 * ScorePopup - Floating score text that appears on enemy kill
 */
import * as PIXI from 'pixi.js';
import { createText } from '../utils/pixiText.js';
import { isFloatingComboMilestone } from '../config/RetentionPresentation.js';
import { GameAssets } from '../utils/GameAssets.js';
import { presentAuthoredSignal } from '../effects/MicroSignalVfx.js';
import {
  markMayhemPerformanceEvent,
  measureMayhemPerformanceScope
} from '../debug/MayhemPerformanceDiagnostics.js';

const POPUP_SAFE_OFFSETS = Object.freeze([
  Object.freeze([0, 0]),
  Object.freeze([0, -92]),
  Object.freeze([118, -58]),
  Object.freeze([-118, -58]),
  Object.freeze([132, 54]),
  Object.freeze([-132, 54]),
  Object.freeze([0, 118]),
  Object.freeze([164, 126]),
  Object.freeze([-164, 126])
]);

const NEAR_MISS_SAFE_OFFSETS = Object.freeze([
  Object.freeze([0, -122]),
  Object.freeze([122, -54]),
  Object.freeze([-122, -54]),
  Object.freeze([148, 38]),
  Object.freeze([-148, 38]),
  Object.freeze([0, 126])
]);

const POPUP_SEPARATION_OFFSETS = Object.freeze([
  Object.freeze([0, 0]),
  Object.freeze([0, -92]),
  Object.freeze([154, -62]),
  Object.freeze([-154, -62]),
  Object.freeze([184, 54]),
  Object.freeze([-184, 54]),
  Object.freeze([124, 142]),
  Object.freeze([-124, 142]),
  Object.freeze([0, 214])
]);

export class ScorePopup {
  constructor(x, y, score, color = 0xffff00, isCombo = false, options = {}) {
    this.x = x;
    this.minY = Math.max(104, Number(options.minY) || 104);
    this.y = Math.max(this.minY, y);
    this.active = true;
    this.lifetime = 0;
    this.type = options.type || (isCombo ? 'combo' : 'score');
    this.isCombo = Boolean(isCombo);
    this.isNearMiss = this.type === 'nearMiss' || this.type === 'near_miss';
    this.isMajor = Boolean(isCombo || this.isNearMiss || options.major || Number(score) >= 500);
    this.isFramed = Boolean(this.isMajor || options.framed === true);
    this.isBorderlessSignal = Boolean(this.isMajor);
    this.maxLifetime = Math.max(250, Number(options.maxLifetime) || (this.isCombo ? 760 : this.isMajor ? 980 : 560));
    this.vx = Number(options.vx) || 0;
    this.vy = Number(options.vy) || (this.isMajor ? -1.55 : -1.85);
    this.clusterIndex = Math.max(0, Math.round(Number(options.clusterIndex) || 0));
    this.sourceX = Number.isFinite(options.sourceX) ? options.sourceX : x;
    this.sourceY = Number.isFinite(options.sourceY) ? options.sourceY : y;
    this.baseScale = this.isCombo ? 0.94 : (this.isMajor ? 1.05 : 0.92);
    this.numericScore = Math.max(0, Math.round(Number(score) || 0));
    this.comboTier = this.isCombo
      ? (this.numericScore >= 50 ? 4 : this.numericScore >= 25 ? 3 : this.numericScore >= 10 ? 2 : 1)
      : 0;
    this.authoredSignalCount = this.isFramed ? (this.isCombo ? 1 : 2) : 0;

    const fontSize = Number(options.fontSize) || (isCombo
      ? [0, 18, 20, 22, 24][this.comboTier]
      : (this.isFramed ? 18 : 15));
    const prefix = options.prefix ? `${String(options.prefix).trim()} ` : '';
    const text = options.text
      ? String(options.text)
      : (isCombo ? `${score} COMBO!` : `${prefix}+${score}`);

    this.sprite = new PIXI.Container();
    this.sprite.label = 'scorePopup';
    this.sprite.text = text;
    this.sprite.__novaScorePopupText = text;
    this.sprite.__novaScorePopupType = this.type;
    this.sprite.__debugScorePopup = {
      framed: this.isFramed,
      type: this.type,
      combo: Boolean(isCombo),
      major: this.isMajor,
      authoredSignalCount: this.authoredSignalCount,
      primitiveSignalCount: 0,
      comboTier: this.comboTier,
      borderless: this.isBorderlessSignal,
      visualLanguage: this.isCombo
        ? 'compact_combo_milestone_pulse_v1'
        : this.isBorderlessSignal ? 'borderless_plasma_badge_v4' : 'authored_micro_signal_v3',
      clusterIndex: this.clusterIndex
    };

    this.backplate = this.isFramed && !this.isBorderlessSignal ? new PIXI.Graphics() : null;
    if (this.backplate) {
      this.backplate.label = 'scorePopupBackplate';
      this.backplate.blendMode = 'normal';
    }
    this.tickLayer = this.isFramed && !this.isBorderlessSignal ? new PIXI.Graphics() : null;
    if (this.tickLayer) {
      this.tickLayer.label = 'scorePopupTicks';
      this.tickLayer.blendMode = 'add';
    }
    this.textNode = createText(text, {
      fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
      fontSize: fontSize,
      fill: color,
      stroke: '#000000',
      strokeThickness: this.isMajor ? 4 : 2,
      fontWeight: 'bold'
    });

    this.textNode.anchor.set(0.5);
    if (this.backplate && this.tickLayer) this.sprite.addChild(this.backplate, this.tickLayer);
    this.sprite.addChild(this.textNode);
    GameAssets.ensureMicroSignalTextures?.().then(() => this.drawFrame(0)).catch(() => {});
    this.frameColor = color;
    this.accentColor = Number.isFinite(options.accent)
      ? options.accent
      : (isCombo ? 0xffef7e : (this.isNearMiss ? 0xffffff : 0x8fffd5));
    this.frameWidth = Math.max(54, Math.round((this.textNode.width || 48) + (this.isMajor ? 24 : 18)));
    this.frameHeight = Math.max(22, Math.round((this.textNode.height || fontSize) + (this.isMajor ? 12 : 9)));
    this.drawFrame(0);

    this.sprite.x = x;
    this.sprite.y = this.y;
    this.sprite.alpha = 1;
    this.sprite.scale.set(this.baseScale);
  }

  drawFrame(progress = 0) {
    const pulse = Math.sin(progress * Math.PI);
    const width = this.frameWidth;
    const height = this.frameHeight;
    const color = this.frameColor;
    const accent = this.accentColor;
    if (this.backplate && this.tickLayer) {
      const majorAlpha = this.isMajor ? 0.22 : 0.13;
      this.backplate.clear();
      this.backplate.roundRect(-width / 2, -height / 2, width, height, this.isMajor ? 5 : 4);
      this.backplate.fill({ color: 0x03101d, alpha: majorAlpha + pulse * 0.08 });
      this.backplate.stroke({ color, width: this.isMajor ? 1.45 : 1, alpha: (this.isMajor ? 0.62 : 0.38) + pulse * 0.18 });
      this.backplate.rect(-width / 2 + 4, -height / 2 + 3, width - 8, 1);
      this.backplate.fill({ color: 0xffffff, alpha: this.isMajor ? 0.18 : 0.1 });
      this.tickLayer.clear();
      this.tickLayer.rect(-width / 2 - 3, -height / 2 + 4, 2, height - 8);
      this.tickLayer.rect(width / 2 + 1, -height / 2 + 4, 2, height - 8);
      this.tickLayer.fill({ color: accent, alpha: this.isMajor ? 0.7 : 0.4 });
    }
    if (this.isCombo) {
      const crest = presentAuthoredSignal(this.sprite, 'popup_combo_crest', {
        textureKey: 'combo',
        x: 0,
        y: 1,
        width: Math.min(174, width * (1.16 + this.comboTier * 0.04)),
        height: 34 + this.comboTier * 2,
        color: this.comboTier >= 3 ? 0xffffff : accent,
        alpha: 0.36 + pulse * 0.18 + this.comboTier * 0.025,
        pulse
      });
      if (crest && crest.parent === this.sprite) this.sprite.setChildIndex(crest, 0);
      this.textNode.y = -1;
    } else if (this.isNearMiss) {
      const crest = presentAuthoredSignal(this.sprite, 'popup_near_miss_crest', {
        textureKey: 'combo',
        x: 0,
        y: 0,
        width: Math.min(230, width * 1.34),
        height: 43,
        color: 0x7ee9ff,
        alpha: 0.38 + pulse * 0.2,
        rotation: -0.025,
        pulse
      });
      if (crest && crest.parent === this.sprite) this.sprite.setChildIndex(crest, 0);
    } else if (this.isMajor) {
      for (const side of [-1, 1]) {
        presentAuthoredSignal(this.sprite, `popup_contact_${side}`, {
          textureKey: 'contact',
          x: side * (width / 2 - 8),
          y: -height / 2 + 7,
          width: 13,
          height: 16,
          color: side < 0 ? accent : color,
          alpha: 0.42 + pulse * 0.36,
          rotation: side * 0.34,
          pulse
        });
      }
    }
  }

  update(delta) {
    if (!this.active) return;

    const dt = delta * 16.67;
    this.lifetime += dt;

    if (this.lifetime >= this.maxLifetime) {
      this.active = false;
      this.sprite.visible = false;
      return;
    }

    const progress = Math.max(0, Math.min(1, this.lifetime / this.maxLifetime));
    this.drawFrame(progress);

    this.y = Math.max(this.minY, this.y + this.vy * delta);
    this.x += this.vx * delta;
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    if (progress > 0.5) {
      this.sprite.alpha = 1 - ((progress - 0.5) * 2);
    }

    if (progress < 0.2) {
      const scale = this.baseScale + (progress / 0.2) * (this.isCombo ? 0.14 : this.isMajor ? 0.28 : 0.18);
      this.sprite.scale.set(scale);
    } else {
      const peak = this.baseScale + (this.isCombo ? 0.14 : this.isMajor ? 0.28 : 0.18);
      const scale = peak - ((progress - 0.2) / 0.8) * (this.isCombo ? 0.12 : this.isMajor ? 0.24 : 0.16);
      this.sprite.scale.set(Math.max(this.baseScale, scale));
    }

    this.sprite.__debugScorePopup = {
      framed: this.isFramed,
      type: this.type,
      combo: this.isCombo,
      nearMiss: this.isNearMiss,
      major: this.isMajor,
      clusterIndex: this.clusterIndex,
      sourceX: Math.round(this.sourceX),
      sourceY: Math.round(this.sourceY),
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      authoredSignalCount: this.authoredSignalCount,
      primitiveSignalCount: 0,
      comboTier: this.comboTier,
      borderless: this.isBorderlessSignal,
      visualLanguage: this.isCombo
        ? 'compact_combo_milestone_pulse_v1'
        : this.isBorderlessSignal ? 'borderless_plasma_badge_v4' : 'authored_micro_signal_v3',
      progress: Number(progress.toFixed(3)),
      x: Math.round(this.x),
      y: Math.round(this.y)
    };
  }

  aggregateScore(score = 0) {
    if (this.isCombo || this.isMajor || !this.textNode) return false;
    const amount = Math.max(0, Math.round(Number(score) || 0));
    if (amount <= 0) return false;
    this.numericScore += amount;
    const text = `+${this.numericScore}`;
    this.textNode.text = text;
    this.sprite.text = text;
    this.sprite.__novaScorePopupText = text;
    this.frameWidth = Math.max(54, Math.round((this.textNode.width || 48) + 18));
    this.lifetime = Math.min(this.lifetime, this.maxLifetime * 0.34);
    if (this.sprite.__debugScorePopup) {
      this.sprite.__debugScorePopup.aggregated = true;
      this.sprite.__debugScorePopup.aggregatedScore = this.numericScore;
    }
    return true;
  }

  destroy() {
    this.active = false;
    if (this.sprite && this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite);
    }
  }
}

/**
 * ScorePopupManager - Manages all floating score popups
 */
export class ScorePopupManager {
  constructor(container) {
    this.container = container;
    this.popups = [];
    this.pendingPopups = [];
    this.defaultMaxActivePopups = 14;
    this.maxActivePopups = this.defaultMaxActivePopups;
    this.denseCombatCompression = 0;
    this.aggregatedPopupCount = 0;
    this.persistentComboHudActive = true;
    this.protectedWidth = 1280;
    this.protectedHeight = 720;
    this.protectedPlayerX = Number.NaN;
    this.protectedPlayerY = Number.NaN;
    this.protectedPlayerRadius = 12;
    this.protectedBossUiActive = false;
    this.protectedPlacementCount = 0;
    this.lastProtectedPlacement = null;

    // Combo system
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboWindow = 3200;
    this.lastKillTime = 0;
  }

  setActiveBudget(maxActivePopups = this.defaultMaxActivePopups) {
    const nextBudget = Math.max(1, Math.min(this.defaultMaxActivePopups, Math.floor(Number(maxActivePopups) || this.defaultMaxActivePopups)));
    this.maxActivePopups = nextBudget;
    while (this.popups.length > this.maxActivePopups) {
      const stale = this.popups.shift();
      stale?.destroy?.();
    }
    if (this.pendingPopups.length > this.maxActivePopups) {
      this.pendingPopups.splice(0, this.pendingPopups.length - this.maxActivePopups);
    }
  }

  setComboWindow(windowMs = 3200) {
    this.comboWindow = Math.max(1800, Math.min(5000, Number(windowMs) || 3200));
  }

  setDenseCombatCompression(level = 0) {
    this.denseCombatCompression = Math.max(0, Math.min(1, Number(level) || 0));
    return this.denseCombatCompression;
  }

  setPersistentComboHudActive(active = true) {
    this.persistentComboHudActive = Boolean(active);
  }

  setProtectedLayout(width, height, playerX, playerY, playerRadius = 12, bossUiActive = false) {
    this.protectedWidth = Math.max(320, Number(width) || 1280);
    this.protectedHeight = Math.max(240, Number(height) || 720);
    this.protectedPlayerX = Number.isFinite(Number(playerX)) ? Number(playerX) : Number.NaN;
    this.protectedPlayerY = Number.isFinite(Number(playerY)) ? Number(playerY) : Number.NaN;
    this.protectedPlayerRadius = Math.max(8, Number(playerRadius) || 12);
    this.protectedBossUiActive = Boolean(bossUiActive);
  }

  getProtectedTopY() {
    return this.protectedBossUiActive ? 188 : 142;
  }

  clampProtectedPosition(x, y, halfWidth = 42, halfHeight = 18) {
    const marginX = Math.max(18, Number(halfWidth) || 42);
    const minY = this.getProtectedTopY() + Math.max(8, Number(halfHeight) || 18);
    const maxY = Math.max(minY, this.protectedHeight - 64 - Math.max(8, Number(halfHeight) || 18));
    return {
      x: Math.max(marginX, Math.min(this.protectedWidth - marginX, Number(x) || marginX)),
      y: Math.max(minY, Math.min(maxY, Number(y) || minY))
    };
  }

  isProtectedPosition(x, y, halfWidth = 42, halfHeight = 18) {
    const safeX = Number(x) || 0;
    const safeY = Number(y) || 0;
    const width = this.protectedWidth;
    const height = this.protectedHeight;
    const top = this.getProtectedTopY();
    if (safeY - halfHeight < top || safeY + halfHeight > height - 58) return true;

    const sideHudWidth = Math.min(390, width * 0.29);
    const upperHudBottom = this.protectedBossUiActive ? 222 : 186;
    if (safeY - halfHeight < upperHudBottom && (safeX - halfWidth < sideHudWidth || safeX + halfWidth > width - sideHudWidth)) {
      return true;
    }
    const lowerStatusTop = height - 132;
    if (safeY + halfHeight > lowerStatusTop && (safeX - halfWidth < 330 || safeX + halfWidth > width - 330)) {
      return true;
    }

    if (Number.isFinite(this.protectedPlayerX) && Number.isFinite(this.protectedPlayerY)) {
      const dx = safeX - this.protectedPlayerX;
      const dy = safeY - this.protectedPlayerY;
      const popupReach = Math.max(58, Math.hypot(Math.max(22, halfWidth), Math.max(14, halfHeight)));
      const safetyRadius = this.protectedPlayerRadius + 70 + popupReach * 0.34;
      if (Math.hypot(dx, dy) < safetyRadius) return true;
    }
    return false;
  }

  getProtectedLayoutDebugState() {
    return {
      width: this.protectedWidth,
      height: this.protectedHeight,
      topReservedY: this.getProtectedTopY(),
      player: Number.isFinite(this.protectedPlayerX) && Number.isFinite(this.protectedPlayerY)
        ? {
            x: Math.round(this.protectedPlayerX),
            y: Math.round(this.protectedPlayerY),
            radius: this.protectedPlayerRadius,
            popupSafetyPadding: 70
          }
        : null,
      bossUiActive: this.protectedBossUiActive,
      placementsAdjusted: this.protectedPlacementCount,
      lastPlacement: this.lastProtectedPlacement ? { ...this.lastProtectedPlacement } : null,
      persistentComboHudActive: this.persistentComboHudActive
    };
  }

  addScorePopup(x, y, score, options = {}) {
    const comboEligible = options.comboEligible === true;
    const now = Date.now();
    const timeSinceLastKill = now - this.lastKillTime;

    if (comboEligible) {
      // Update combo
      if (timeSinceLastKill < this.comboWindow) {
        this.comboCount++;
      } else {
        this.comboCount = 1;
      }
      this.lastKillTime = now;
      this.comboTimer = 0;
    }

    // Determine if this is a combo popup
    const isCombo = comboEligible
      && options.showComboMilestone !== false
      && !this.persistentComboHudActive
      && isFloatingComboMilestone(this.comboCount);
    const displayScore = isCombo ? this.comboCount : score;
    const color = options.color ?? (isCombo ? 0xff00ff : (score >= 100 ? 0xffaa00 : 0xffff00));
    const position = this.resolvePopupPosition(x, y, options);
    const canAggregate = this.denseCombatCompression >= 0.28 &&
      !isCombo &&
      !options.major &&
      !options.text &&
      (!options.type || options.type === 'score') &&
      Number(score) < 500;
    if (canAggregate) {
      const aggregateTarget = [...this.popups].reverse().find((candidate) => (
        candidate?.active &&
        !candidate.isCombo &&
        !candidate.isMajor &&
        candidate.type === 'score' &&
        candidate.lifetime <= 320 &&
        Math.abs((candidate.sourceX || candidate.x) - x) <= 132 &&
        Math.abs((candidate.sourceY || candidate.y) - y) <= 96
      ));
      if (aggregateTarget?.aggregateScore?.(score)) {
        this.aggregatedPopupCount += 1;
        return aggregateTarget;
      }
    }

    const popup = measureMayhemPerformanceScope('vfx.score_popup_construction', () => new ScorePopup(position.x, position.y, displayScore, color, isCombo, {
      prefix: options.prefix,
      text: options.text,
      type: options.type,
      fontSize: options.fontSize,
      maxLifetime: options.maxLifetime,
      major: options.major,
      accent: options.accent,
      clusterIndex: position.clusterIndex,
      sourceX: x,
      sourceY: y,
      vx: position.vx,
      vy: options.vy,
      minY: this.getProtectedTopY()
    }));
    markMayhemPerformanceEvent('gameplay.score_popup', {
      score: Number(displayScore) || 0,
      type: options.type || (isCombo ? 'combo' : 'score'),
      major: popup.isMajor,
      active: this.popups.length + 1
    });
    this.separatePopupFromActive(popup);
    this.popups.push(popup);
    this.container.addChild(popup.sprite);
    if (this.popups.length > this.maxActivePopups) {
      const stale = this.popups.shift();
      stale?.destroy?.();
    }
    return popup;
  }

  separatePopupFromActive(popup) {
    if (!popup) return;
    const active = this.popups.filter((candidate) => candidate?.active);
    const originX = popup.x;
    const originY = popup.y;
    const getSize = (candidate) => ({
      width: Math.max(28, Number(candidate?.frameWidth) || Number(candidate?.textNode?.width) || 28)
        * Math.max(1, (Number(candidate?.baseScale) || 1) + (candidate?.isMajor ? 0.28 : 0.18)),
      height: Math.max(18, Number(candidate?.frameHeight) || Number(candidate?.textNode?.height) || 18)
        * Math.max(1, (Number(candidate?.baseScale) || 1) + (candidate?.isMajor ? 0.28 : 0.18))
    });
    const popupSize = getSize(popup);
    const overlaps = (x, y, candidate) => {
      const candidateSize = getSize(candidate);
      return Math.abs(x - candidate.x) < (popupSize.width + candidateSize.width) / 2 + 10
        && Math.abs(y - candidate.y) < (popupSize.height + candidateSize.height) / 2 + 10;
    };
    const openPosition = POPUP_SEPARATION_OFFSETS.map(([dx, dy]) => (
      this.clampProtectedPosition(originX + dx, originY + dy, popupSize.width / 2, popupSize.height / 2)
    )).find((position) => (
      !this.isProtectedPosition(position.x, position.y, popupSize.width / 2, popupSize.height / 2)
      && active.every((candidate) => !overlaps(position.x, position.y, candidate))
    ));
    if (!openPosition) return;
    popup.x = openPosition.x;
    popup.y = openPosition.y;
    popup.sprite.x = popup.x;
    popup.sprite.y = popup.y;
  }

  resolvePopupPosition(x, y, options = {}) {
    const sourceX = Number(x) || 0;
    const sourceY = Number(y) || 0;
    const activeNearby = this.popups.filter((popup) => {
      if (!popup?.active) return false;
      const popupSourceX = Number.isFinite(popup.sourceX) ? popup.sourceX : popup.x;
      const popupSourceY = Number.isFinite(popup.sourceY) ? popup.sourceY : popup.y;
      return Math.abs((popupSourceX || 0) - sourceX) < 92 && Math.abs((popupSourceY || 0) - sourceY) < 72;
    }).length;
    const clusterIndex = Math.max(0, activeNearby);
    const type = String(options.type || '').toLowerCase();
    const offsets = type === 'nearmiss' || type === 'near_miss'
      ? NEAR_MISS_SAFE_OFFSETS
      : POPUP_SAFE_OFFSETS;
    const startIndex = Math.min(offsets.length - 1, clusterIndex);
    let chosen = null;
    for (let offsetIndex = 0; offsetIndex < offsets.length; offsetIndex += 1) {
      const candidateIndex = (startIndex + offsetIndex) % offsets.length;
      const [dx, dy] = offsets[candidateIndex];
      const extra = Math.max(0, clusterIndex - offsets.length + 1);
      const clamped = this.clampProtectedPosition(
        sourceX + dx + Math.sign(dx || 1) * extra * 12,
        sourceY + dy + extra * 16
      );
      if (this.isProtectedPosition(clamped.x, clamped.y)) continue;
      chosen = { ...clamped, candidateIndex };
      break;
    }
    if (!chosen) {
      const fallback = this.clampProtectedPosition(this.protectedWidth / 2, Math.max(this.getProtectedTopY() + 48, sourceY - 120));
      chosen = { ...fallback, candidateIndex: -1 };
    }
    const adjusted = Math.abs(chosen.x - sourceX) > 1 || Math.abs(chosen.y - sourceY) > 1;
    if (adjusted) this.protectedPlacementCount += 1;
    this.lastProtectedPlacement = {
      type: type || 'score',
      sourceX: Math.round(sourceX),
      sourceY: Math.round(sourceY),
      x: Math.round(chosen.x),
      y: Math.round(chosen.y),
      candidateIndex: chosen.candidateIndex,
      adjusted,
      clusterIndex
    };
    const side = chosen.x < sourceX ? -1 : chosen.x > sourceX ? 1 : 0;
    return {
      x: chosen.x,
      y: chosen.y,
      vx: Number.isFinite(Number(options.vx))
        ? Number(options.vx)
        : side * (0.04 + Math.min(4, clusterIndex) * 0.015),
      clusterIndex
    };
  }

  queueScorePopup(x, y, score, options = {}) {
    this.pendingPopups.push({ x, y, score, options });
  }

  flushQueuedPopups(maxPerFrame = 3) {
    const limit = Math.max(0, Math.floor(Number(maxPerFrame) || 0));
    const total = this.pendingPopups.length;
    let created = 0;
    while (created < limit && this.pendingPopups.length > 0) {
      const popup = this.pendingPopups.shift();
      this.addScorePopup(popup.x, popup.y, popup.score, popup.options);
      created += 1;
    }
    if (this.pendingPopups.length > 12) {
      this.pendingPopups.splice(0, this.pendingPopups.length - 12);
    }
    return {
      queued: total,
      created,
      dropped: Math.max(0, total - created - this.pendingPopups.length),
      remaining: this.pendingPopups.length
    };
  }

  update(delta) {
    const dt = delta * 16.67;

    // Update combo timer
    if (this.comboCount > 0) {
      this.comboTimer += dt;
      if (this.comboTimer >= this.comboWindow) {
        this.comboCount = 0;
      }
    }

    // Update popups
    this.popups = this.popups.filter(popup => {
      popup.update(delta);
      if (!popup.active) {
        popup.destroy();
        return false;
      }
      return true;
    });
  }

  getComboCount() {
    return this.comboCount;
  }

  clearVisuals({ preserveCombo = true } = {}) {
    this.popups.forEach(popup => popup.destroy());
    this.popups = [];
    this.pendingPopups = [];
    if (!preserveCombo) this.comboCount = 0;
    this.aggregatedPopupCount = 0;
  }

  cleanup() {
    this.clearVisuals({ preserveCombo: false });
  }
}
