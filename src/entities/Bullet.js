import * as PIXI from 'pixi.js';

export class Bullet {
  constructor(x, y, vx, vy, damage, color, isPlayer) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.color = color;
    this.isPlayer = isPlayer;
    this.active = true;
    this.radius = 4;

    this.sprite = new PIXI.Graphics();
    this.sprite.circle(0, 0, this.radius);
    this.sprite.fill({ color: this.color });

    // Add glow
    this.sprite.circle(0, 0, this.radius + 2);
    this.sprite.fill({ color: this.color, alpha: 0.3 });

    this.sprite.x = x;
    this.sprite.y = y;
  }

  update(delta) {
    if (!this.active) return;

    this.x += this.vx * delta;
    this.y += this.vy * delta;

    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Deactivate if off-screen
    if (this.y < -20 || this.y > 620 || this.x < -20 || this.x > 820) {
      this.active = false;
    }
  }
}
