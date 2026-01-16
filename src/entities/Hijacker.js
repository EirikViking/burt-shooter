import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';
import { AudioManager } from '../audio/AudioManager.js';
import { isHijackerEnabled } from '../config/isExtrasEnabled.js';

/**
 * Hijacker - Special UFO enemy (formerly had tractor beam, now just a tough enemy)
 *
 * Behavior:
 * 1. Hovers at top of screen with sinusoidal movement
 * 2. Shoots projectiles at player
 * 3. Max once per level
 */

export class Hijacker {
  constructor(x, y, level, game) {
    // Safety: Should never be instantiated if feature disabled
    if (!isHijackerEnabled()) {
      console.warn('[Hijacker] Feature disabled, should not instantiate');
      this.active = false;
      return;
    }

    this.x = x;
    this.y = y;
    this.level = level;
    this.game = game;
    this.active = true;
    this.radius = 35;

    // Movement
    this.baseY = y; // Stay near top
    this.vx = 1.5; // Horizontal speed
    this.moveTimer = 0;
    this.hoverAmplitude = 15; // Vertical hover range
    this.hoverFreq = 0.02; // Hover frequency

    // Health (tougher than regular enemies)
    this.health = 30 + level * 5;
    this.maxHealth = this.health;
    this.scoreValue = 500;

    this.createSprite();
  }

  createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Try to load UFO texture from extras bundle
    const loader = PIXI.Assets;
    const ufoPath = '/sprites/xtra-sprites/ufoRed.png';

    loader.load(ufoPath).then(texture => {
      if (!this.active) return; // Destroyed before texture loaded

      const ufo = new PIXI.Sprite(texture);
      ufo.anchor.set(0.5);
      ufo.scale.set(0.8);
      this.sprite.addChild(ufo);
      this.ufoSprite = ufo;
    }).catch(err => {
      console.warn('[Hijacker] Failed to load UFO sprite, using fallback', err);
      this.createFallbackSprite();
    });

    // Health bar
    this.healthBar = new PIXI.Graphics();
    this.sprite.addChild(this.healthBar);
    this.updateHealthBar();
  }

  createFallbackSprite() {
    // Fallback: Simple UFO shape
    const fallback = new PIXI.Graphics();
    fallback.ellipse(0, 0, 35, 20);
    fallback.fill({ color: 0xff4444 });
    fallback.ellipse(0, -5, 25, 12);
    fallback.fill({ color: 0xffaa00 });
    fallback.circle(0, 0, 10);
    fallback.fill({ color: 0x880000 });
    this.sprite.addChild(fallback);
  }

  updateHealthBar() {
    this.healthBar.clear();
    const barWidth = 60;
    const barHeight = 4;
    const healthPct = this.health / this.maxHealth;

    // Background
    this.healthBar.rect(-barWidth / 2, -this.radius - 15, barWidth, barHeight);
    this.healthBar.fill({ color: 0x333333 });

    // Health
    this.healthBar.rect(-barWidth / 2, -this.radius - 15, barWidth * healthPct, barHeight);
    this.healthBar.fill({ color: healthPct > 0.5 ? 0x00ff00 : 0xff0000 });
  }

  update(delta, playerX, playerY) {
    if (!this.active) return;

    this.moveTimer += delta;

    // Horizontal movement with screen wrap
    this.x += this.vx * (delta / 16.67);

    const screenWidth = this.game.getWidth();
    if (this.x < -this.radius) this.x = screenWidth + this.radius;
    if (this.x > screenWidth + this.radius) this.x = -this.radius;

    // Vertical hover (sinusoidal)
    const hover = Math.sin(this.moveTimer * this.hoverFreq) * this.hoverAmplitude;
    this.y = this.baseY + hover;

    // Update sprite position
    this.sprite.x = this.x;
    this.sprite.y = this.y;
  }

  takeDamage(amount) {
    this.health -= amount;
    this.updateHealthBar();

    if (this.health <= 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  destroy() {
    console.log('[Hijacker] Destroyed');
    this.active = false;

    // Play destruction audio
    AudioManager.playSfx('explosionCrunch');

    // Award points
    if (this.game.scenes.play) {
      this.game.addScore(this.scoreValue);
    }
  }

  shoot(playerX, playerY) {
    // Hijacker shoots basic projectiles
    const bullet = new Bullet(
      this.x,
      this.y + this.radius,
      0,
      5, // Speed downward
      1, // damage
      0xff0000, // color (red)
      false // isPlayer
    );

    return bullet;
  }

  canShoot() {
    return Math.random() < 0.01;
  }
}
