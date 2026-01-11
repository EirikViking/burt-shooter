import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';

export class Player {
  constructor(x, y, inputManager, game) {
    this.x = x;
    this.y = y;
    this.inputManager = inputManager;
    this.game = game;
    this.speed = 5;
    this.radius = 12;
    this.active = true;
    this.invulnerable = false;
    this.invulnerableTime = 0;

    // Shooting (time-based to prevent stuck shooting)
    this.shootCooldown = 0;
    this.shootDelay = 167; // milliseconds (~10 frames at 60fps)
    this.bulletDamage = 1;
    this.bulletSpeed = 8;
    this.multiShot = 1; // Number of bullets

    // Dodge (time-based)
    this.dodgeCooldown = 0;
    this.dodgeDelay = 1000; // milliseconds
    this.isDodging = false;
    this.dodgeDuration = 0;
    this.dodgeDurationMax = 333; // milliseconds

    // Powerups
    this.powerups = {
      isbjorn: 0,
      kjottdeig: 0,
      rolp: 0,
      deili: 0
    };

    this.createSprite();
  }

  createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Ship body (techy triangle)
    const ship = new PIXI.Graphics();
    ship.moveTo(0, -15);
    ship.lineTo(-10, 10);
    ship.lineTo(10, 10);
    ship.closePath();
    ship.fill({ color: 0x00ffff });
    ship.stroke({ color: 0x00aaff, width: 2 });
    this.sprite.addChild(ship);

    // Cockpit
    const cockpit = new PIXI.Graphics();
    cockpit.circle(0, 0, 4);
    cockpit.fill({ color: 0xffff00 });
    this.sprite.addChild(cockpit);

    // Engine glow
    this.engineGlow = new PIXI.Graphics();
    this.engineGlow.moveTo(-5, 10);
    this.engineGlow.lineTo(0, 15);
    this.engineGlow.lineTo(5, 10);
    this.engineGlow.closePath();
    this.engineGlow.fill({ color: 0xff4400, alpha: 0.8 });
    this.sprite.addChild(this.engineGlow);
  }

  update(delta) {
    if (!this.active) return;

    const deltaMs = Math.min(delta * 16.67, 100); // Clamp delta to prevent huge spikes

    // Movement
    let dx = 0;
    let dy = 0;

    if (this.inputManager.isKeyPressed('ArrowLeft') || this.inputManager.isKeyPressed('KeyA')) {
      dx -= 1;
    }
    if (this.inputManager.isKeyPressed('ArrowRight') || this.inputManager.isKeyPressed('KeyD')) {
      dx += 1;
    }
    if (this.inputManager.isKeyPressed('ArrowUp') || this.inputManager.isKeyPressed('KeyW')) {
      dy -= 1;
    }
    if (this.inputManager.isKeyPressed('ArrowDown') || this.inputManager.isKeyPressed('KeyS')) {
      dy += 1;
    }

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    const speedMultiplier = this.powerups.kjottdeig > 0 ? 1.5 : 1;
    this.x += dx * this.speed * speedMultiplier * delta;
    this.y += dy * this.speed * speedMultiplier * delta;

    // Boundary check
    const width = this.game?.getWidth ? this.game.getWidth() : 800;
    const height = this.game?.getHeight ? this.game.getHeight() : 600;
    const padding = 20;
    const maxX = Math.max(width - padding, padding);
    const maxY = Math.max(height - padding, padding);
    this.x = Math.max(padding, Math.min(maxX, this.x));
    this.y = Math.max(padding, Math.min(maxY, this.y));

    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Dodge
    if (this.inputManager.isKeyPressed('ShiftLeft') && this.dodgeCooldown <= 0 && !this.isDodging) {
      this.startDodge();
    }

    if (this.isDodging) {
      this.dodgeDuration -= deltaMs;
      this.sprite.alpha = 0.3;
      if (this.dodgeDuration <= 0) {
        this.isDodging = false;
        this.invulnerable = false;
        this.sprite.alpha = 1;
      }
    }

    // Cooldowns (time-based)
    if (this.shootCooldown > 0) this.shootCooldown = Math.max(0, this.shootCooldown - deltaMs);
    if (this.dodgeCooldown > 0) this.dodgeCooldown = Math.max(0, this.dodgeCooldown - deltaMs);
    if (this.invulnerableTime > 0) {
      this.invulnerableTime -= deltaMs;
      if (this.invulnerableTime <= 0) {
        this.invulnerable = false;
      }
    }

    // Powerup timers
    Object.keys(this.powerups).forEach(key => {
      if (this.powerups[key] > 0) {
        this.powerups[key]--;
      }
    });

    // Engine glow animation
    this.engineGlow.alpha = 0.6 + Math.sin(Date.now() * 0.01) * 0.2;

    // Invulnerable blink
    if (this.invulnerable && !this.isDodging) {
      this.sprite.alpha = Math.abs(Math.sin(Date.now() * 0.02)) * 0.5 + 0.5;
    }
  }

  startDodge() {
    this.isDodging = true;
    this.invulnerable = true;
    this.dodgeDuration = this.dodgeDurationMax;
    this.dodgeCooldown = this.dodgeDelay;
  }

  canShoot() {
    return this.shootCooldown <= 0;
  }

  shoot() {
    this.shootCooldown = this.shootDelay;
    const bullets = [];

    const spreadAngles = this.multiShot > 1 ?
      Array.from({ length: this.multiShot }, (_, i) => (i - (this.multiShot - 1) / 2) * 0.2) :
      [0];

    spreadAngles.forEach(angle => {
      const vx = Math.sin(angle) * this.bulletSpeed;
      const vy = -Math.cos(angle) * this.bulletSpeed;
      bullets.push(new Bullet(this.x, this.y - 15, vx, vy, this.bulletDamage, 0x00ffff, true));
    });

    return bullets;
  }

  takeDamage() {
    if (this.invulnerable) return;

    this.invulnerable = true;
    this.invulnerableTime = 2000; // 2 seconds of invulnerability (milliseconds)
  }

  applyPowerup(type) {
    switch (type) {
      case 'isbjorn':
        this.powerups.isbjorn = 300; // 5 seconds
        this.multiShot = 3;
        break;
      case 'kjottdeig':
        this.powerups.kjottdeig = 300;
        break;
      case 'rolp':
        this.powerups.rolp = 180; // 3 seconds
        this.bulletDamage = 3;
        this.shootDelay = 83; // milliseconds (~5 frames)
        break;
      case 'deili':
        this.powerups.deili = 600; // 10 seconds
        this.multiShot = 5;
        this.bulletDamage = 2;
        break;
    }
  }

  removePowerup(type) {
    this.powerups[type] = 0;

    // Reset to defaults
    this.multiShot = 1;
    this.bulletDamage = 1;
    this.shootDelay = 167;

    // Reapply active powerups
    if (this.powerups.isbjorn > 0) this.multiShot = 3;
    if (this.powerups.rolp > 0) {
      this.bulletDamage = 3;
      this.shootDelay = 83;
    }
    if (this.powerups.deili > 0) {
      this.multiShot = 5;
      this.bulletDamage = 2;
    }
  }
}
