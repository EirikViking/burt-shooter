/**
 * ScorePopup - Floating score text that appears on enemy kill
 */
import * as PIXI from 'pixi.js';
import { t } from '../i18n/index.ts';

export class ScorePopup {
  constructor(x, y, score, color = 0xffff00, isCombo = false) {
    this.x = x;
    this.y = y;
    this.active = true;
    this.lifetime = 0;
    this.maxLifetime = 800; // 800ms

    // Create text
    const fontSize = isCombo ? 24 : 18;
    const text = isCombo
      ? t('scorepopup.combo', { score })
      : t('scorepopup.score', { score });

    this.sprite = new PIXI.Text(text, {
      fontFamily: 'Courier New, monospace',
      fontSize: fontSize,
      fill: color,
      stroke: '#000000',
      strokeThickness: 3,
      fontWeight: 'bold'
    });

    this.sprite.anchor.set(0.5);
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.alpha = 1;

    this.vy = -2; // Float upward
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

    // Float upward
    this.y += this.vy * delta;
    this.sprite.y = this.y;

    // Fade out in second half of lifetime
    const progress = this.lifetime / this.maxLifetime;
    if (progress > 0.5) {
      this.sprite.alpha = 1 - ((progress - 0.5) * 2);
    }

    // Scale effect
    if (progress < 0.2) {
      const scale = 1 + (progress / 0.2) * 0.5;
      this.sprite.scale.set(scale);
    } else {
      const scale = 1.5 - ((progress - 0.2) / 0.8) * 0.5;
      this.sprite.scale.set(Math.max(1, scale));
    }
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

    // Combo system
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboWindow = 2000; // 2 seconds to maintain combo
    this.lastKillTime = 0;
  }

  addScorePopup(x, y, score) {
    const now = Date.now();
    const timeSinceLastKill = now - this.lastKillTime;

    // Update combo
    if (timeSinceLastKill < this.comboWindow) {
      this.comboCount++;
    } else {
      this.comboCount = 1;
    }
    this.lastKillTime = now;
    this.comboTimer = 0;

    // Determine if this is a combo popup
    const isCombo = this.comboCount >= 3;
    const displayScore = isCombo ? this.comboCount : score;
    const color = isCombo ? 0xff00ff : (score >= 100 ? 0xffaa00 : 0xffff00);

    const popup = new ScorePopup(x, y, displayScore, color, isCombo);
    this.popups.push(popup);
    this.container.addChild(popup.sprite);
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
    this.comboCount = 0;
  }
}
