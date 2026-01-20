import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';

export class Bullet {
  constructor(x, y, vx, vy, damage, color, isPlayer, visualConfig = null) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.color = color;
    this.isPlayer = isPlayer;
    this.active = true;
    this.radius = 5;
    // Store screen bounds (will be updated dynamically)
    this.screenWidth = 800;
    this.screenHeight = 600;

    // Pulse effect for enemy bullets
    this.pulseTimer = 0;

    this.sprite = null;

    // Try Sprite First
    if (visualConfig) {
      let c = visualConfig.color;
      let idx = visualConfig.index;
      const tex = GameAssets.getXtraLaser(c, idx);
      if (GameAssets.isValidTexture(tex)) {
        this.sprite = new PIXI.Sprite(tex);
        this.sprite.anchor.set(0.5);
        this.sprite.rotation = Math.atan2(vy, vx) + Math.PI / 2;
        this.sprite.scale.set(0.8);
      }
    }

    // Fallback to Graphics
    if (!this.sprite) {
      this.sprite = new PIXI.Graphics();

      if (!isPlayer) {
        // Enemy bullets: larger, more visible with warning color
        const warningRad = this.radius * 1.5;
        // Outer warning glow
        this.sprite.circle(0, 0, warningRad + 5);
        this.sprite.fill({ color: 0xff0000, alpha: 0.3 });
        // Main bullet larger
        this.sprite.circle(0, 0, warningRad);
        this.sprite.fill({ color: this.color, alpha: 1 });
        // Bright center
        this.sprite.circle(0, 0, warningRad * 0.6);
        this.sprite.fill({ color: 0xffffff, alpha: 0.9 });
      } else {
        // Player bullets: original style
        // Draw glow first (behind)
        this.sprite.circle(0, 0, this.radius + 3);
        this.sprite.fill({ color: this.color, alpha: 0.4 });
        // Draw main bullet (on top)
        this.sprite.circle(0, 0, this.radius);
        this.sprite.fill({ color: this.color, alpha: 1 });
        // Add bright center
        this.sprite.circle(0, 0, this.radius * 0.5);
        this.sprite.fill({ color: 0xffffff, alpha: 0.8 });
      }
    }

    this.sprite.x = x;
    this.sprite.y = y;

    // Set zIndex for proper layering (bullets should be above background but below UI)
    this.sprite.zIndex = isPlayer ? 100 : 90;
  }

  setScreenBounds(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  update(delta) {
    if (!this.active) return;

    this.x += this.vx * delta;
    this.y += this.vy * delta;

    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Pulse effect for enemy bullets (more visible)
    if (!this.isPlayer) {
      this.pulseTimer += delta * 0.1;
      const pulseScale = 1 + Math.sin(this.pulseTimer) * 0.15;
      this.sprite.scale.set(pulseScale);
      this.sprite.alpha = 0.9 + Math.sin(this.pulseTimer * 2) * 0.1;
    }

    // Deactivate if off-screen (use dynamic bounds with padding)
    const padding = 30;
    if (
      this.y < -padding ||
      this.y > this.screenHeight + padding ||
      this.x < -padding ||
      this.x > this.screenWidth + padding
    ) {
      this.active = false;
    }
  }
}
