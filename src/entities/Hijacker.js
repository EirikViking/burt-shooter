import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';
import { AudioManager } from '../audio/AudioManager.js';
import { isHijackerEnabled } from '../config/isExtrasEnabled.js';

/**
 * Hijacker - special interceptor enemy with a readable tractor-beam attack.
 *
 * Behavior:
 * 1. Hovers at top of screen with sinusoidal movement
 * 2. Telegraphs a tractor cone before pulling the player upward
 * 3. Shoots projectiles at player between beam attacks
 * 4. Max once per level
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
    this.level = Number.isFinite(level) ? level : (Number(game?.level) || 1);
    this.game = game;
    this.active = true;
    this.kind = 'hijacker';
    this.type = 'hijacker';
    this.radius = 35;
    this.destroyed = false;

    // Movement
    this.baseY = y; // Stay near top
    this.vx = 1.5; // Horizontal speed
    this.moveTimer = 0;
    this.hoverAmplitude = 15; // Vertical hover range
    this.hoverFreq = 0.02; // Hover frequency

    // Health (tougher than regular enemies)
    this.health = 30 + this.level * 5;
    this.maxHealth = this.health;
    this.scoreValue = 500;

    // Tractor beam: short, readable, escapable, and valuable if broken.
    this.beamState = 'cooldown';
    this.beamWarningMs = 820;
    this.beamActiveMs = 1450;
    this.beamCooldownMs = Math.max(2800, 4300 - this.level * 120);
    this.nextBeamAt = Date.now() + 1500 + Math.random() * 900;
    this.beamStartedAt = 0;
    this.beamTarget = { x, y: y + 360 };
    this.beamPullActive = false;
    this.lastBeamToastAt = 0;
    this.destroyedDuringBeam = false;

    this.createSprite();
  }

  createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.sortableChildren = true;

    this.beamLayer = new PIXI.Graphics();
    this.beamLayer.zIndex = -2;
    this.sprite.addChild(this.beamLayer);

    // Use the generated Nova Swarm hijacker craft instead of legacy UFO pack art.
    const loader = PIXI.Assets;
    const ufoPath = '/art/generated/nova-swarm/enemies/nova-hijacker-tractor-craft-20260518.png';

    loader.load(ufoPath).then(texture => {
      if (!this.active) return; // Destroyed before texture loaded

      const ufo = new PIXI.Sprite(texture);
      ufo.anchor.set(0.5);
      const targetSize = 96;
      const scale = Math.min(targetSize / texture.width, targetSize / texture.height);
      ufo.scale.set(scale);
      ufo.zIndex = 1;
      this.sprite.addChild(ufo);
      this.ufoSprite = ufo;
    }).catch(err => {
      console.warn('[Hijacker] Failed to load hijacker sprite, using fallback', err);
      this.createFallbackSprite();
    });

    // Health bar
    this.healthBar = new PIXI.Graphics();
    this.healthBar.zIndex = 3;
    this.sprite.addChild(this.healthBar);
    this.updateHealthBar();
  }

  createFallbackSprite() {
    // Fallback: angular interceptor silhouette, not the old saucer art.
    const fallback = new PIXI.Graphics();
    fallback.poly([-44, -4, -18, -24, 0, -12, 18, -24, 44, -4, 18, 14, 0, 24, -18, 14]);
    fallback.fill({ color: 0x221336 });
    fallback.stroke({ color: 0x66ffff, width: 2, alpha: 0.92 });
    fallback.poly([-18, 14, 0, 34, 18, 14, 0, 20]);
    fallback.fill({ color: 0xff4fd8, alpha: 0.82 });
    fallback.circle(0, 4, 9);
    fallback.fill({ color: 0x66ffff, alpha: 0.9 });
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

    this.updateTractorBeam(delta, playerX, playerY);
  }

  takeDamage(amount) {
    if (this.destroyed || !this.active) return false;
    const brokeBeam = this.isBeamThreatening();
    this.health -= amount;
    this.updateHealthBar();

    if (this.health <= 0) {
      this.destroy(brokeBeam);
      return true;
    }
    if (brokeBeam) {
      this.awardBeamInterrupt();
      this.interruptBeam('hit');
    }
    return false;
  }

  isBeamThreatening() {
    return this.beamState === 'telegraph' || this.beamState === 'active';
  }

  startBeamTelegraph(playerX, playerY) {
    this.beamState = 'telegraph';
    this.beamStartedAt = Date.now();
    this.beamTarget = { x: playerX, y: playerY };
    AudioManager.playSfx('forceField', { volume: 0.24, minIntervalMs: 900 });
  }

  activateBeam(playerX, playerY) {
    this.beamState = 'active';
    this.beamStartedAt = Date.now();
    this.beamTarget = { x: playerX, y: playerY };
    AudioManager.playSfx('shield', { volume: 0.34, minIntervalMs: 900 });
  }

  interruptBeam(reason = 'interrupted') {
    this.beamState = 'cooldown';
    this.nextBeamAt = Date.now() + Math.max(1200, this.beamCooldownMs * 0.55);
    this.beamPullActive = false;
    this.clearBeamVisual();
    if (reason === 'hit') {
      AudioManager.playSfx('impactMetal', { volume: 0.32, minIntervalMs: 180 });
    }
  }

  awardBeamInterrupt() {
    const playScene = this.game?.scenes?.play;
    if (!playScene) return;
    this.game.addScore(250);
    playScene.showToast('BEAM BROKEN +250', {
      fontSize: this.game.getWidth() < 620 ? 14 : 18,
      fill: '#66ffff',
      stroke: '#00111d',
      strokeThickness: 4,
      duration: 900,
      slot: 'top',
      type: 'hijacker',
      priority: 4
    });
  }

  updateTractorBeam(delta, playerX, playerY) {
    const now = Date.now();
    this.beamPullActive = false;

    if (this.beamState === 'cooldown' && now >= this.nextBeamAt) {
      this.startBeamTelegraph(playerX, playerY);
    }

    if (this.beamState === 'telegraph') {
      const progress = Math.min(1, (now - this.beamStartedAt) / this.beamWarningMs);
      this.updateBeamVisual(progress, false, playerX, playerY);
      if (progress >= 1) this.activateBeam(playerX, playerY);
      return;
    }

    if (this.beamState === 'active') {
      const progress = Math.min(1, (now - this.beamStartedAt) / this.beamActiveMs);
      this.applyTractorPull(delta);
      this.updateBeamVisual(progress, true, playerX, playerY);
      if (progress >= 1) {
        this.beamState = 'cooldown';
        this.nextBeamAt = now + this.beamCooldownMs;
        this.clearBeamVisual();
      }
      return;
    }

    this.clearBeamVisual();
  }

  applyTractorPull(delta) {
    const playScene = this.game?.scenes?.play;
    const player = playScene?.player;
    if (!player?.active) return;
    const gameWidth = Number(this.game?.getWidth?.()) || this.game?.app?.screen?.width || 800;
    const gameHeight = Number(this.game?.getHeight?.()) || this.game?.app?.screen?.height || 600;
    const playerRadius = Number(player.radius) || 14;
    const playerX = Number.isFinite(player.x) ? player.x : gameWidth / 2;
    const playerY = Number.isFinite(player.y) ? player.y : gameHeight * 0.78;
    const tickDelta = Number.isFinite(delta) ? delta : Number(delta?.deltaTime) || 1;

    const relX = playerX - this.x;
    const relY = playerY - this.y;
    if (relY < this.radius || relY > gameHeight * 0.82) return;

    const halfWidth = Math.max(44, 22 + relY * 0.24);
    if (Math.abs(relX) > halfWidth) return;

    const frameScale = Math.max(0.5, Math.min(2.2, tickDelta));
    const pullX = (this.x - playerX) * 0.022 * frameScale;
    const pullY = (1.35 + Math.min(1.2, this.level * 0.06)) * frameScale;
    player.x = Math.max(playerRadius, Math.min(gameWidth - playerRadius, playerX + pullX));
    player.y = Math.max(this.y + this.radius + 76, playerY - pullY);
    this.beamPullActive = true;

    if (nowish() - this.lastBeamToastAt > 1300) {
      playScene.showToast('TRACTOR LOCK - STRAFE OUT!', {
        fontSize: this.game.getWidth() < 620 ? 15 : 19,
        fill: '#66ffff',
        stroke: '#00111d',
        strokeThickness: 4,
        duration: 900,
        slot: 'corner',
        type: 'hijacker',
        priority: 3
      });
      this.lastBeamToastAt = nowish();
    }
  }

  updateBeamVisual(progress, active, playerX, playerY) {
    if (!this.beamLayer) return;
    const layer = this.beamLayer;
    layer.clear();

    const relX = (active ? playerX : this.beamTarget.x) - this.x;
    const relY = Math.max(160, (active ? playerY : this.beamTarget.y) - this.y);
    const halfWidth = Math.max(56, 30 + relY * 0.25);
    const pulse = 1 + Math.sin(Date.now() * 0.028) * 0.06;
    const coreColor = active ? 0x66ffff : 0xff66ff;
    const edgeColor = active ? 0xffffff : 0xffe066;
    const startY = this.radius * 0.62;
    const endX = relX;
    const endY = relY;

    layer.moveTo(0, startY);
    layer.lineTo(endX - halfWidth * pulse, endY);
    layer.lineTo(endX + halfWidth * pulse, endY);
    layer.closePath();
    layer.fill({ color: coreColor, alpha: active ? 0.18 : 0.08 + progress * 0.12 });

    layer.moveTo(0, startY);
    layer.lineTo(endX - halfWidth * pulse, endY);
    layer.moveTo(0, startY);
    layer.lineTo(endX + halfWidth * pulse, endY);
    layer.moveTo(0, startY);
    layer.lineTo(endX, endY);
    layer.stroke({ color: edgeColor, width: active ? 4 : 2 + progress * 2, alpha: active ? 0.72 : 0.34 + progress * 0.38 });

    const rings = active ? 4 : 3;
    for (let i = 1; i <= rings; i++) {
      const t = i / (rings + 1);
      const x = endX * t;
      const y = startY + (endY - startY) * t;
      const r = (halfWidth * t * 0.58 + 10) * (0.85 + progress * 0.24) * pulse;
      layer.ellipse(x, y, r, Math.max(8, r * 0.22));
      layer.stroke({ color: i % 2 ? coreColor : edgeColor, width: active ? 2 : 1.5, alpha: active ? 0.52 : 0.24 + progress * 0.24 });
    }
  }

  clearBeamVisual() {
    if (this.beamLayer) this.beamLayer.clear();
  }

  getTractorState() {
    const now = Date.now();
    const duration = this.beamState === 'telegraph'
      ? this.beamWarningMs
      : this.beamState === 'active'
        ? this.beamActiveMs
        : Math.max(0, this.nextBeamAt - now);
    const remainingMs = this.beamState === 'cooldown'
      ? Math.max(0, this.nextBeamAt - now)
      : Math.max(0, this.beamStartedAt + duration - now);
    return {
      state: this.beamState,
      remainingMs: Math.round(remainingMs),
      pullActive: this.beamPullActive,
      target: {
        x: Math.round(this.beamTarget.x),
        y: Math.round(this.beamTarget.y)
      }
    };
  }

  destroy(brokeBeam = false) {
    if (this.destroyed) return false;
    console.log('[Hijacker] Destroyed');
    this.destroyed = true;
    this.active = false;
    this.destroyedDuringBeam = Boolean(brokeBeam);
    this.clearBeamVisual();

    // Play destruction audio
    AudioManager.playSfx('explosionCrunch');

    // Award points
    const playScene = this.game.scenes.play;
    if (playScene) {
      const bonus = brokeBeam ? 1200 : 0;
      this.game.addScore(this.scoreValue + bonus);
      if (brokeBeam) {
        playScene.clearEnemyBullets?.('tractor_break');
        playScene.showToast('TRACTOR BREAK +1700', {
          fontSize: this.game.getWidth() < 620 ? 17 : 24,
          fill: '#66ffff',
          stroke: '#00111d',
          strokeThickness: 5,
          duration: 1500,
          slot: 'center',
          type: 'hijacker',
          priority: 5
        });
      }
    }
    return true;
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
    return this.beamState === 'cooldown' && Math.random() < 0.01;
  }
}

function nowish() {
  return Date.now();
}
