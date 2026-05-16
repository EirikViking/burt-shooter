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
    this.radius = isPlayer ? 7 : 5;
    // Store screen bounds (will be updated dynamically)
    this.screenWidth = 800;
    this.screenHeight = 600;

    // Pulse effect for enemy bullets
    this.pulseTimer = 0;

    this.sprite = new PIXI.Container();
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.zIndex = isPlayer ? 100 : 90;
    this.angle = Math.atan2(vy, vx);
    this.speed = Math.sqrt(vx * vx + vy * vy);
    this.trail = null;
    this.warningRing = null;
    this.core = null;

    // Try Sprite First
    if (visualConfig) {
      let c = visualConfig.color;
      let idx = visualConfig.index;
      const tex = GameAssets.getXtraLaser(c, idx);
      if (GameAssets.isValidTexture(tex)) {
        this.core = new PIXI.Sprite(tex);
        this.core.anchor.set(0.5);
        this.core.rotation = this.angle + Math.PI / 2;
        this.core.scale.set(isPlayer ? 0.8 : 0.72);
      }
    }

    // Fallback to Graphics
    if (!this.core) {
      this.core = new PIXI.Graphics();

      if (!isPlayer) {
        // Enemy bullets: larger, more visible with warning color
        const warningRad = this.radius * 1.5;
        // Outer warning glow
        this.core.circle(0, 0, warningRad + 5);
        this.core.fill({ color: 0xff0000, alpha: 0.3 });
        // Main bullet larger
        this.core.circle(0, 0, warningRad);
        this.core.fill({ color: this.color, alpha: 1 });
        // Bright center
        this.core.circle(0, 0, warningRad * 0.6);
        this.core.fill({ color: 0xffffff, alpha: 0.9 });
      } else {
        // Player bullets: original style
        // Draw glow first (behind)
        this.core.circle(0, 0, this.radius + 3);
        this.core.fill({ color: this.color, alpha: 0.4 });
        // Draw main bullet (on top)
        this.core.circle(0, 0, this.radius);
        this.core.fill({ color: this.color, alpha: 1 });
        // Add bright center
        this.core.circle(0, 0, this.radius * 0.5);
        this.core.fill({ color: 0xffffff, alpha: 0.8 });
      }
    }

    this.createReadableProjectileShell();
  }

  createReadableProjectileShell() {
    const trailColor = this.isPlayer ? this.color : 0xff6655;
    const trailLength = Math.max(this.isPlayer ? 18 : 26, Math.min(this.isPlayer ? 34 : 54, this.speed * (this.isPlayer ? 5 : 8)));
    const trailWidth = this.isPlayer ? 3 : 5;
    const backX = -Math.cos(this.angle) * trailLength;
    const backY = -Math.sin(this.angle) * trailLength;

    this.trail = new PIXI.Graphics();
    this.trail.moveTo(backX, backY);
    this.trail.lineTo(0, 0);
    this.trail.stroke({ color: trailColor, width: trailWidth, alpha: this.isPlayer ? 0.32 : 0.46 });
    this.sprite.addChild(this.trail);

    if (!this.isPlayer) {
      this.warningRing = new PIXI.Graphics();
      this.warningRing.circle(0, 0, this.radius + 9);
      this.warningRing.stroke({ color: 0xff2f2f, width: 2, alpha: 0.75 });
      this.sprite.addChild(this.warningRing);
    }

    this.sprite.addChild(this.core);
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
      const pulseScale = 1 + Math.sin(this.pulseTimer) * 0.1;
      this.sprite.scale.set(pulseScale);
      this.sprite.alpha = 0.9 + Math.sin(this.pulseTimer * 2) * 0.1;
      if (this.warningRing) {
        const warningPulse = 1.1 + Math.sin(this.pulseTimer * 1.7) * 0.16;
        this.warningRing.scale.set(warningPulse);
        this.warningRing.alpha = 0.58 + Math.sin(this.pulseTimer * 2.2) * 0.22;
      }
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
