import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';
import { GameAssets } from '../utils/GameAssets.js';
import { ShipRegistry } from '../utils/ShipRegistry.js';

export class Player {
  constructor(x, y, inputManager, game, shipId = 'player_01') {
    this.x = x;
    this.y = y;
    this.inputManager = inputManager;
    this.game = game;

    // Config from Registry
    this.config = ShipRegistry[shipId] || ShipRegistry.player_01;
    this.stats = { ...this.config.stats };
    this.visuals = { ...this.config.visuals };

    this.speed = this.stats.speed;
    this.radius = this.config.hitbox.radius;
    this.active = true;
    this.invulnerable = true; // Invulnerable on spawn
    this.invulnerableTime = 2000; // 2s spawn protection

    // Shooting
    this.shootCooldown = 0;
    this.shootDelay = this.stats.fireRate;
    this.bulletDamage = this.stats.damage;
    this.bulletSpeed = this.stats.bulletSpeed;
    this.multiShot = 1;

    // Dodge
    this.dodgeCooldown = 0;
    this.dodgeDelay = 1000;
    this.isDodging = false;
    this.dodgeDuration = 0;
    this.dodgeDurationMax = 333;

    // Tractor Beam Removed

    // Animation State
    this.idleTimer = 0;
    this.tilt = 0;
    this.spawnFadeTime = 0;
    this.spawnFadeDuration = 1000; // 1s fade in

    // Powerups
    this.activePowerup = { type: null, expiresAt: 0 };
    this.currentModel = 1;
    this.damageOverlay = null;

    // Shield State
    this.shieldActive = false;
    this.shieldExpiresAt = 0;
    this.shieldSprite = null;

    this.createSprite();
  }

  // ... (existing code) ...

  canShoot() {
    return this.shootCooldown <= 0;
  }

  createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.alpha = 0; // Start invisible for fade-in

    // Rank-based Ship Selection
    const rank = this.game.rankIndex || 0;
    this.currentModel = Math.min(3, Math.floor(rank / 30) + 1);
    const colorIdx = Math.floor((rank % 30) / 10); // 0, 1, 2
    const colors = ['blue', 'green', 'orange', 'red'];
    const color = colors[colorIdx] || 'blue';

    let texture = GameAssets.getXtraShip(this.currentModel, color);

    // Fallback if not found
    if (!GameAssets.isValidTexture(texture)) {
      texture = GameAssets.getShipTexture(this.config.texture);
      this.currentModel = 1;
    }

    if (GameAssets.isValidTexture(texture)) {
      // Asset Loaded
      this.shipSprite = new PIXI.Sprite(texture);
      this.shipSprite.anchor.set(0.5);

      // Responsive Sizing Calculation
      const screenWidth = this.game.getWidth();
      const targetWidth = Math.max(52, Math.min(screenWidth * 0.06, 78)) * 1.15; // Increased by 15%

      this.shipSprite.width = targetWidth;
      this.shipSprite.scale.y = this.shipSprite.scale.x; // Maintain aspect ratio

      // Keep reference to base scale for animations
      this.baseScale = this.shipSprite.scale.x;

      this.sprite.addChild(this.shipSprite);

      // Damage Overlay
      this.damageOverlay = new PIXI.Sprite();
      this.damageOverlay.anchor.set(0.5);
      this.damageOverlay.visible = false;
      this.sprite.addChild(this.damageOverlay);

      this.engineGlow = null;

      // Shield Sprite
      this.shieldSprite = new PIXI.Container();

      const sGfx = new PIXI.Graphics();
      sGfx.circle(0, 0, 50);
      sGfx.stroke({ width: 4, color: 0x00ffff, alpha: 0.8 });
      sGfx.fill({ color: 0x00ffff, alpha: 0.1 });
      this.shieldSprite.addChild(sGfx);
      this.shieldSprite.visible = false;
      this.sprite.addChild(this.shieldSprite);

    } else {
      // Fallback
      const g = new PIXI.Graphics();
      g.moveTo(0, -20);
      g.lineTo(-15, 15);
      g.lineTo(0, 10);
      g.lineTo(15, 15);
      g.closePath();
      g.fill(0x00ff00);
      this.shipSprite = g;
      this.sprite.addChild(g);
      this.baseScale = 1;
    }
  }

  update(delta) {
    if (!this.active) return;

    const now = Date.now();
    const dt = delta * 16.67;
    const deltaSeconds = dt / 1000;

    // Powerup Expiry
    if (this.activePowerup.type && now > this.activePowerup.expiresAt) {
      this.resetPowerups();
    }

    // Shield Logic
    if (this.shieldActive) {
      // Expiry
      if (now > this.shieldExpiresAt) {
        this.deactivateShield();
      } else {
        // Visuals
        if (this.shieldSprite) {
          this.shieldSprite.visible = true;
          this.shieldSprite.scale.set(1 + Math.sin(now * 0.005) * 0.05);
          this.shieldSprite.rotation += deltaSeconds * 0.5;
          this.shieldSprite.alpha = 0.8 + Math.sin(now * 0.01) * 0.2;
        }
      }
    } else {
      if (this.shieldSprite) this.shieldSprite.visible = false;
    }

    // Spawn Fade-In
    if (this.sprite.alpha < 1 && !this.isDodging && this.activePowerup.type !== 'ghost') {
      this.sprite.alpha += deltaSeconds * (1000 / this.spawnFadeDuration);
      if (this.sprite.alpha > 1) this.sprite.alpha = 1;
    }

    // Input & Movement
    let dx = 0;
    let dy = 0;

    if (this.inputManager.isKeyPressed('ArrowLeft') || this.inputManager.isKeyPressed('KeyA')) dx -= 1;
    if (this.inputManager.isKeyPressed('ArrowRight') || this.inputManager.isKeyPressed('KeyD')) dx += 1;
    if (this.inputManager.isKeyPressed('ArrowUp') || this.inputManager.isKeyPressed('KeyW')) dy -= 1;
    if (this.inputManager.isKeyPressed('ArrowDown') || this.inputManager.isKeyPressed('KeyS')) dy += 1;

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    // Apply Speed
    const speedMultiplier = this.activePowerup.type === 'kjottdeig' ? 1.5 : 1;
    this.x += dx * this.speed * speedMultiplier * delta;
    this.y += dy * this.speed * speedMultiplier * delta;

    // Clamping
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const margin = 20;
    this.x = Math.max(margin, Math.min(width - margin, this.x));
    this.y = Math.max(margin, Math.min(height - margin, this.y));

    // Update Sprite Container Position
    this.sprite.x = this.x;

    // Idle Animation (Bobbing)
    this.idleTimer += deltaSeconds;
    const bobOffset = Math.sin(this.idleTimer * 2) * (this.visuals.idleAmplitude || 3);
    this.sprite.y = this.y + bobOffset;

    // Tilt Animation
    const targetTilt = dx * (this.visuals.tiltMax || 0.2);
    // Smooth Lerp
    this.tilt = this.tilt + (targetTilt - this.tilt) * (this.visuals.tiltSpeed || 0.1);

    if (this.shipSprite) {
      this.shipSprite.rotation = this.tilt;
      if (this.damageOverlay) {
        this.damageOverlay.rotation = this.tilt;
        this.damageOverlay.scale.set(this.shipSprite.scale.x); // Sync scale
        if (this.game.lives <= 1 && !this.invulnerable) { // Only show damage when low lives
          const dTex = GameAssets.getXtraDamage(this.currentModel, 2); // Use stage 2 for distinct look
          if (dTex) {
            this.damageOverlay.texture = dTex;
            this.damageOverlay.visible = true;
            this.damageOverlay.alpha = 0.8 + Math.sin(Date.now() * 0.01) * 0.2; // Pulse
          }
        } else {
          this.damageOverlay.visible = false;
        }
      }
    }

    // Dodge Logic
    if (this.inputManager.isKeyPressed('ShiftLeft') && this.dodgeCooldown <= 0 && !this.isDodging) {
      this.startDodge();
    }

    if (this.isDodging) {
      this.dodgeDuration -= dt;
      this.sprite.alpha = 0.3; // Visually indicate dodge
      if (this.dodgeDuration <= 0) {
        this.isDodging = false;
        this.invulnerable = false;
        if (this.activePowerup.type !== 'ghost') this.sprite.alpha = 1;
      }
    } else {
      // Invulnerable blinking
      if (this.invulnerable) {
        this.invulnerableTime -= dt;
        this.sprite.alpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.4;
        if (this.invulnerableTime <= 0) {
          this.invulnerable = false;
          if (this.activePowerup.type !== 'ghost') this.sprite.alpha = 1;
        }
      }
    }

    // Cooldowns
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
  }

  // --- Actions ---

  shoot() {
    this.shootCooldown = this.shootDelay;
    const bullets = [];
    const spreadAngles = this.multiShot > 1 ?
      Array.from({ length: this.multiShot }, (_, i) => (i - (this.multiShot - 1) / 2) * 0.15) :
      [0];

    // Origin: Nose of the ship
    const spawnY = this.y - 20;

    // Visuals based on powerup
    let vConfig = { color: 'Blue', index: 1 };
    const pType = this.activePowerup.type;

    if (pType === 'rolp') vConfig = { color: 'Red', index: 1 }; // Rapid
    else if (pType === 'isbjorn') vConfig = { color: 'Green', index: 13 }; // Round spread
    else if (pType === 'deili') vConfig = { color: 'Blue', index: 8 }; // Strong/Big
    else if (this.activePowerup.type) vConfig = { color: 'Blue', index: 3 }; // Other powerups slightly different

    spreadAngles.forEach(angle => {
      const vx = Math.sin(angle) * this.bulletSpeed;
      const vy = -Math.cos(angle) * this.bulletSpeed;
      bullets.push(new Bullet(this.x, spawnY, vx, vy, this.bulletDamage, 0x00ffff, true, vConfig));
    });

    return bullets;
  }

  canShoot() {
    return this.shootCooldown <= 0;
  }

  startDodge() {
    this.isDodging = true;
    this.invulnerable = true;
    this.dodgeDuration = this.dodgeDurationMax;
    this.dodgeCooldown = this.dodgeDelay;
  }

  takeDamage() {
    if (this.shieldActive) {
      this.deactivateShield();
      // Play Break Sound
      if (this.game && this.game.scenes && this.game.scenes.play) {
        // Direct access if possible, or assume generic hit sound
        // AudioManager.playSfx('shield_break'); 
      }
      return false; // DAMAGE ABSORBED
    }

    if (this.invulnerable) return false;
    this.invulnerable = true;
    this.invulnerableTime = 2000;
    return true; // DAMAGE TAKEN
  }

  activateShield() {
    this.shieldActive = true;
    this.shieldExpiresAt = Date.now() + 15000; // 15 Seconds
    if (this.shieldSprite) this.shieldSprite.visible = true;
    // CRITICAL: Ensure player remains visible after shield activation
    this.ensureRenderable('activateShield');
  }

  deactivateShield() {
    this.shieldActive = false;
    if (this.shieldSprite) this.shieldSprite.visible = false;
    // CRITICAL: Ensure player remains visible after shield breaks
    this.ensureRenderable('deactivateShield');
  }

  // --- Powerups ---

  applyPowerup(type) {
    this.resetPowerups(); // Clear existing to prevent stacking weirdness
    this.activePowerup.type = type;
    this.activePowerup.expiresAt = Date.now() + 12000; // 12 Seconds Default

    switch (type) {
      case 'isbjorn':
        this.multiShot = 3;
        break;
      case 'kjottdeig':
        // Speed handled in update
        break;
      case 'rolp':
        this.bulletDamage = 3;
        this.shootDelay = this.stats.fireRate / 2; // Rapid fire
        break;
      case 'deili':
        this.multiShot = 5;
        this.bulletDamage = 2;
        break;
      case 'slow_time':
        // Global effect handled by Scene
        this.activePowerup.expiresAt = Date.now() + 8000; // 8s
        break;
      case 'ghost':
        this.activePowerup.expiresAt = Date.now() + 8000; // 8s
        // Ghost mode uses reduced alpha for the CONTAINER only, not destroying visibility
        this.sprite.alpha = 0.4;
        break;
      case 'shield':
        this.activateShield();
        if (type === 'shield') {
          this.activePowerup.type = null; // Don't block weapon slot
        }
        break;
    }

    // CRITICAL: Ensure player remains visible after powerup application
    // (Ghost is special - it sets alpha to 0.4, which ensureRenderable respects)
    this.ensureRenderable('applyPowerup:' + type);
  }

  resetPowerups() {
    // Revert Stats
    this.speed = this.stats.speed;
    this.bulletDamage = this.stats.damage;
    this.shootDelay = this.stats.fireRate;
    this.multiShot = 1;
    this.bulletSpeed = this.stats.bulletSpeed;

    // Visuals
    if (this.sprite && !this.isDodging && !this.invulnerable) {
      this.sprite.alpha = 1;
    }

    if (this.activePowerup.type) {
      // Play expiry sound?
      // Game.audio.playSfx('powerdown') // if exists
    }

    this.activePowerup.type = null;
    this.activePowerup.expiresAt = 0;
  }

  // --- Rank Up Visual Reward ---
  swapSprite() {
    // Deterministic but feels random: based on Rank
    if (this.shipSprite && this.sprite) {
      this.sprite.removeChild(this.shipSprite);
    }
    if (this.damageOverlay && this.sprite) {
      this.sprite.removeChild(this.damageOverlay);
    }
    if (this.shieldSprite && this.sprite) {
      this.sprite.removeChild(this.shieldSprite);
    }

    // Re-run create logic which uses game.rankIndex
    this.createSprite();

    // Visual feedback
    if (this.shipSprite) {
      const flash = new PIXI.Graphics();
      flash.circle(0, 0, 60).fill({ color: 0xffffff, alpha: 0.8 });
      this.sprite.addChild(flash);
      setTimeout(() => {
        if (this.sprite && flash.parent) this.sprite.removeChild(flash);
      }, 150);
    }

    // CRITICAL: Ensure visibility after sprite swap
    this.ensureRenderable('swapSprite');

    console.log('[Player] Ship sprite updated for Rank', this.game.rankIndex);
  }

  forceRespawn(screenWidth, screenHeight) {
    this.x = screenWidth / 2;
    this.y = screenHeight - 100;
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    this.resetPowerups();

    // Force Visible
    this.active = true;

    // Invulnerability
    this.invulnerable = true;
    this.invulnerableTime = 2000;

    // Reset cooldowns
    this.shootCooldown = 0;

    // CRITICAL: Ensure player is visible after respawn
    this.ensureRenderable('forceRespawn');

    console.log('[Player] Force Respawned at', this.x, this.y);
  }

  /**
   * HARDENING FUNCTION: Ensures player sprite is always visible and correctly attached.
   * Call this after any operation that might affect visibility:
   * - forceRespawn
   * - swapSprite
   * - powerup pickup
   * - shield activate/break
   * - any toast/celebration that touches visuals
   */
  ensureRenderable(reason = 'unknown') {
    const debug = window.location.search.includes('debug=1');

    // 1. Ensure sprite container exists
    if (!this.sprite) {
      console.error('[Player] ensureRenderable: sprite container missing! Recreating...');
      this.createSprite();
    }

    // 2. Ensure sprite is visible and renderable
    this.sprite.visible = true;
    this.sprite.renderable = true;

    // 3. Ensure alpha is 1 (unless in special states)
    if (!this.isDodging && !this.invulnerable && this.activePowerup.type !== 'ghost') {
      this.sprite.alpha = 1;
    }

    // 4. Ensure shipSprite exists and is valid
    if (!this.shipSprite) {
      console.error('[Player] ensureRenderable: shipSprite missing! Recreating...');
      this.createSprite();
    }

    if (this.shipSprite) {
      this.shipSprite.visible = true;
      this.shipSprite.renderable = true;

      // 5. Check texture validity
      if (!this.shipSprite.texture || !this.shipSprite.texture.valid) {
        console.warn('[Player] ensureRenderable: Invalid texture, falling back to default');
        const fallbackTexture = GameAssets.getShipTexture('player_01');
        if (GameAssets.isValidTexture(fallbackTexture)) {
          this.shipSprite.texture = fallbackTexture;
        }
      }

      // 6. Ensure tint is reset if needed (avoid 0x000000 blackout)
      if (this.shipSprite.tint === 0x000000) {
        this.shipSprite.tint = 0xffffff;
      }

      // 7. Ensure position is finite (not NaN)
      if (!Number.isFinite(this.sprite.x)) this.sprite.x = this.x;
      if (!Number.isFinite(this.sprite.y)) this.sprite.y = this.y;
      if (!Number.isFinite(this.shipSprite.alpha)) this.shipSprite.alpha = 1;
    }

    // 8. Ensure sprite is attached to parent container
    if (!this.sprite.parent && this.game && this.game.scenes && this.game.scenes.play) {
      const gameContainer = this.game.scenes.play.gameContainer;
      if (gameContainer) {
        console.warn('[Player] ensureRenderable: Sprite detached, reattaching to gameContainer');
        gameContainer.addChild(this.sprite);
      }
    }

    // 9. DEBUG overlay (only in debug mode)
    if (debug) {
      console.log(`[Player] ensureRenderable(${reason}):`, {
        visible: this.sprite.visible,
        alpha: this.sprite.alpha,
        textureValid: this.shipSprite?.texture?.valid,
        parent: this.sprite.parent?.constructor?.name || 'NONE',
        x: this.sprite.x,
        y: this.sprite.y
      });
    }
  }
}
