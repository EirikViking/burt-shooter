/**
 * ScorePopup - Floating score text that appears on enemy kill
 */
import * as PIXI from 'pixi.js';
import { createText } from '../utils/pixiText.js';

export class ScorePopup {
  constructor(x, y, score, color = 0xffff00, isCombo = false, options = {}) {
    this.x = x;
    this.minY = 104;
    this.y = Math.max(this.minY, y);
    this.active = true;
    this.lifetime = 0;
    this.type = options.type || (isCombo ? 'combo' : 'score');
    this.isCombo = Boolean(isCombo);
    this.isNearMiss = this.type === 'nearMiss' || this.type === 'near_miss';
    this.isMajor = Boolean(isCombo || this.isNearMiss || options.major || Number(score) >= 500);
    this.maxLifetime = Math.max(250, Number(options.maxLifetime) || (this.isMajor ? 980 : 820));
    this.vx = Number(options.vx) || 0;
    this.vy = Number(options.vy) || (this.isMajor ? -1.55 : -1.85);
    this.clusterIndex = Math.max(0, Math.round(Number(options.clusterIndex) || 0));
    this.sourceX = Number.isFinite(options.sourceX) ? options.sourceX : x;
    this.sourceY = Number.isFinite(options.sourceY) ? options.sourceY : y;
    this.baseScale = this.isMajor ? 1.05 : 1;

    const fontSize = Number(options.fontSize) || (isCombo ? 24 : 18);
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
      framed: true,
      type: this.type,
      combo: Boolean(isCombo),
      major: this.isMajor,
      clusterIndex: this.clusterIndex
    };

    this.backplate = new PIXI.Graphics();
    this.backplate.label = 'scorePopupBackplate';
    this.backplate.blendMode = 'normal';
    this.tickLayer = new PIXI.Graphics();
    this.tickLayer.label = 'scorePopupTicks';
    this.tickLayer.blendMode = 'add';
    this.textNode = createText(text, {
      fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
      fontSize: fontSize,
      fill: color,
      stroke: '#000000',
      strokeThickness: this.isMajor ? 4 : 3,
      fontWeight: 'bold'
    });

    this.textNode.anchor.set(0.5);
    this.sprite.addChild(this.backplate, this.tickLayer, this.textNode);
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
    const majorAlpha = this.isMajor ? 0.22 : 0.13;
    this.backplate.clear();
    this.backplate.roundRect(-width / 2, -height / 2, width, height, this.isMajor ? 5 : 4);
    this.backplate.fill({ color: 0x03101d, alpha: majorAlpha + pulse * 0.08 });
    this.backplate.stroke({ color, width: this.isMajor ? 1.45 : 1, alpha: (this.isMajor ? 0.62 : 0.38) + pulse * 0.18 });
    this.backplate.rect(-width / 2 + 4, -height / 2 + 3, width - 8, 1);
    this.backplate.fill({ color: 0xffffff, alpha: this.isMajor ? 0.18 : 0.1 });

    this.tickLayer.clear();
    const railAlpha = this.isMajor ? 0.7 : 0.4;
    this.tickLayer.rect(-width / 2 - 3, -height / 2 + 4, 2, height - 8);
    this.tickLayer.rect(width / 2 + 1, -height / 2 + 4, 2, height - 8);
    this.tickLayer.fill({ color: accent, alpha: railAlpha });
    if (this.isCombo || this.isNearMiss) {
      for (let i = 0; i < 3; i += 1) {
        const x = width / 2 - 9 - i * 7;
        this.tickLayer.circle(x, -height / 2 + 7, 1.8 + pulse * 0.4);
        this.tickLayer.fill({ color: i === 0 ? color : accent, alpha: 0.46 + pulse * 0.32 });
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
      const scale = this.baseScale + (progress / 0.2) * (this.isMajor ? 0.28 : 0.18);
      this.sprite.scale.set(scale);
    } else {
      const peak = this.baseScale + (this.isMajor ? 0.28 : 0.18);
      const scale = peak - ((progress - 0.2) / 0.8) * (this.isMajor ? 0.24 : 0.16);
      this.sprite.scale.set(Math.max(this.baseScale, scale));
    }

    this.sprite.__debugScorePopup = {
      framed: true,
      type: this.type,
      combo: this.isCombo,
      nearMiss: this.isNearMiss,
      major: this.isMajor,
      clusterIndex: this.clusterIndex,
      sourceX: Math.round(this.sourceX),
      sourceY: Math.round(this.sourceY),
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      progress: Number(progress.toFixed(3)),
      x: Math.round(this.x),
      y: Math.round(this.y)
    };
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
    this.maxActivePopups = 24;

    // Combo system
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboWindow = 2000; // 2 seconds to maintain combo
    this.lastKillTime = 0;
  }

  addScorePopup(x, y, score, options = {}) {
    const comboEligible = options.comboEligible !== false;
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
    const isCombo = comboEligible && this.comboCount >= 3;
    const displayScore = isCombo ? this.comboCount : score;
    const color = options.color ?? (isCombo ? 0xff00ff : (score >= 100 ? 0xffaa00 : 0xffff00));
    const position = this.resolvePopupPosition(x, y, options);

    const popup = new ScorePopup(position.x, position.y, displayScore, color, isCombo, {
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
      vy: options.vy
    });
    this.popups.push(popup);
    this.container.addChild(popup.sprite);
    if (this.popups.length > this.maxActivePopups) {
      const stale = this.popups.shift();
      stale?.destroy?.();
    }
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
    if (clusterIndex <= 0) {
      return { x: sourceX, y: sourceY, vx: Number(options.vx) || 0, clusterIndex: 0 };
    }
    const lanes = [
      { x: 112, y: -56 },
      { x: -128, y: 62 },
      { x: 124, y: 126 },
      { x: -118, y: 190 },
      { x: 24, y: 254 },
      { x: 146, y: 318 }
    ];
    const lane = lanes[Math.min(lanes.length - 1, clusterIndex - 1)];
    const extra = Math.max(0, clusterIndex - lanes.length);
    const side = lane.x < 0 ? -1 : 1;
    return {
      x: sourceX + lane.x + side * extra * 12,
      y: sourceY + lane.y + extra * 18,
      vx: side * (0.04 + Math.min(4, clusterIndex) * 0.015),
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

  cleanup() {
    this.popups.forEach(popup => popup.destroy());
    this.popups = [];
    this.pendingPopups = [];
    this.comboCount = 0;
  }
}
