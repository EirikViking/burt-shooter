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

    // Touch input (set externally by PlayScene)
    this.touchInput = { moveX: 0, moveY: 0 };

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

    // Rank-based Ship Selection (20-rank system: 0-19)
    // Map 20 ranks to 12 available ship skins for visible progression
    const rank = this.game.rankIndex || 0;

    // Ship model: cycle through 1-3 based on rank groups
    // Ranks 0-6: ship1, 7-13: ship2, 14-19: ship3
    const modelIndex = Math.min(3, 1 + Math.floor(rank / 7));
    this.currentModel = modelIndex;

    // Color: cycle through 4 colors for variety
    // blue (0-4), green (5-9), orange (10-14), red (15-19)
    const colors = ['blue', 'green', 'orange', 'red'];
    const colorIndex = Math.min(3, Math.floor(rank / 5));
    const color = colors[colorIndex];

    let texture = GameAssets.getXtraShip(this.currentModel, color);

    // Fallback chain: try ship2_blue as baseline default, then old player texture
    if (!GameAssets.isValidTexture(texture)) {
      // Try ship2_blue as a nicer default
      texture = GameAssets.getXtraShip(2, 'blue');
      this.currentModel = 2;

      if (!GameAssets.isValidTexture(texture)) {
        // Final fallback to original player texture
        texture = GameAssets.getShipTexture(this.config.texture);
        this.currentModel = 1;
      }
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

  rebuildShipSprite(reason = 'unknown') {
    if (!this.sprite) {
      this.sprite = new PIXI.Container();
      this.sprite.x = this.x;
      this.sprite.y = this.y;
    }

    if (this.shipSprite && this.shipSprite.parent) {
      this.shipSprite.parent.removeChild(this.shipSprite);
    }
    if (this.damageOverlay && this.damageOverlay.parent) {
      this.damageOverlay.parent.removeChild(this.damageOverlay);
    }
    if (this.shieldSprite && this.shieldSprite.parent) {
      this.shieldSprite.parent.removeChild(this.shieldSprite);
    }

    const rank = this.game.rankIndex || 0;

    // Ship model: cycle through 1-3 based on rank groups
    const modelIndex = Math.min(3, 1 + Math.floor(rank / 7));
    this.currentModel = modelIndex;

    // Color: cycle through 4 colors for variety
    const colors = ['blue', 'green', 'orange', 'red'];
    const colorIndex = Math.min(3, Math.floor(rank / 5));
    const color = colors[colorIndex];

    let texture = GameAssets.getXtraShip(this.currentModel, color);
    if (!GameAssets.isValidTexture(texture)) {
      // Try ship2_blue as a nicer default
      texture = GameAssets.getXtraShip(2, 'blue');
      this.currentModel = 2;

      if (!GameAssets.isValidTexture(texture)) {
        // Final fallback to original player texture
        texture = GameAssets.getShipTexture(this.config.texture);
        this.currentModel = 1;
      }
    }

    if (GameAssets.isValidTexture(texture)) {
      this.shipSprite = new PIXI.Sprite(texture);
      this.shipSprite.anchor.set(0.5);
      const screenWidth = this.game.getWidth();
      const targetWidth = Math.max(52, Math.min(screenWidth * 0.06, 78)) * 1.15;
      this.shipSprite.width = targetWidth;
      this.shipSprite.scale.y = this.shipSprite.scale.x;
      this.baseScale = Number.isFinite(this.shipSprite.scale.x) ? this.shipSprite.scale.x : 1;
      this.sprite.addChild(this.shipSprite);

      this.damageOverlay = new PIXI.Sprite();
      this.damageOverlay.anchor.set(0.5);
      this.damageOverlay.visible = false;
      this.sprite.addChild(this.damageOverlay);

      this.shieldSprite = new PIXI.Container();
      const sGfx = new PIXI.Graphics();
      sGfx.circle(0, 0, 50);
      sGfx.stroke({ width: 4, color: 0x00ffff, alpha: 0.8 });
      sGfx.fill({ color: 0x00ffff, alpha: 0.1 });
      this.shieldSprite.addChild(sGfx);
      this.shieldSprite.visible = false;
      this.sprite.addChild(this.shieldSprite);
    } else {
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

    // Input & Movement - merge keyboard and touch
    let dx = 0;
    let dy = 0;

    // Keyboard input
    if (this.inputManager.isKeyPressed('ArrowLeft') || this.inputManager.isKeyPressed('KeyA')) dx -= 1;
    if (this.inputManager.isKeyPressed('ArrowRight') || this.inputManager.isKeyPressed('KeyD')) dx += 1;
    if (this.inputManager.isKeyPressed('ArrowUp') || this.inputManager.isKeyPressed('KeyW')) dy -= 1;
    if (this.inputManager.isKeyPressed('ArrowDown') || this.inputManager.isKeyPressed('KeyS')) dy += 1;

    // Touch input (additive, clamped later)
    dx += this.touchInput.moveX;
    dy += this.touchInput.moveY;

    // Clamp to -1..1 range
    dx = Math.max(-1, Math.min(1, dx));
    dy = Math.max(-1, Math.min(1, dy));

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      const magnitude = Math.sqrt(dx * dx + dy * dy);
      if (magnitude > 1) {
        dx /= magnitude;
        dy /= magnitude;
      }
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
    // Use rebuildShipSprite to preserve container reference in scene graph
    this.rebuildShipSprite('rank_up');

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

  // TASK 5: Rotate ship sprite every other rank up
  rotateShipSprite() {
    // Get available ship sprites from GameAssets
    const availableShips = [];
    const models = [1, 2, 3];
    const colors = ['blue', 'green', 'orange', 'red'];

    // Build list of available ship combinations
    models.forEach(model => {
      colors.forEach(color => {
        const texture = GameAssets.getXtraShip(model, color);
        if (GameAssets.isValidTexture(texture)) {
          availableShips.push({ model, color });
        }
      });
    });

    if (availableShips.length === 0) {
      console.warn('[Player] No ship sprites available for rotation');
      return;
    }

    // Get or initialize ship rotation index from localStorage
    let shipIndex = 0;
    try {
      const stored = localStorage.getItem('bs_ship_rotation_index');
      if (stored) {
        shipIndex = parseInt(stored, 10);
      }
    } catch (e) {
      // localStorage not available, use default
    }

    // Increment and wrap
    shipIndex = (shipIndex + 1) % availableShips.length;

    // Save new index
    try {
      localStorage.setItem('bs_ship_rotation_index', shipIndex.toString());
    } catch (e) {
      // localStorage not available, continue anyway
    }

    // Apply new ship
    const newShip = availableShips[shipIndex];
    const texture = GameAssets.getXtraShip(newShip.model, newShip.color);

    if (GameAssets.isValidTexture(texture) && this.shipSprite instanceof PIXI.Sprite) {
      this.shipSprite.texture = texture;
      this.currentModel = newShip.model;

      // Visual feedback
      const flash = new PIXI.Graphics();
      flash.circle(0, 0, 60).fill({ color: 0x00ffff, alpha: 0.6 });
      this.sprite.addChild(flash);
      setTimeout(() => {
        if (this.sprite && flash.parent) this.sprite.removeChild(flash);
      }, 150);

      console.log(`[Player] Ship rotated to model ${newShip.model} ${newShip.color}`);
    }

    this.ensureRenderable('rotateShipSprite');
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
      this.rebuildShipSprite('ensureRenderable:container');
    }

    // 2. STRICT: Always set sprite visible and renderable
    this.sprite.visible = true;
    this.sprite.renderable = true;

    // 3. STRICT: Force alpha to 1 unless in specific valid states
    // Ghost = 0.4, Dodge = 0.3, Invulnerable = blinking (handled by update)
    if (this.activePowerup.type === 'ghost') {
      // Ghost mode: alpha should be 0.4, not 0 or undefined
      if (this.sprite.alpha === 0 || !Number.isFinite(this.sprite.alpha)) {
        this.sprite.alpha = 0.4;
      }
    } else if (this.isDodging) {
      // Dodge mode: alpha should be 0.3
      if (this.sprite.alpha === 0 || !Number.isFinite(this.sprite.alpha)) {
        this.sprite.alpha = 0.3;
      }
    } else if (!this.invulnerable) {
      // Normal state: ALWAYS alpha = 1
      this.sprite.alpha = 1;
    }
    // If invulnerable and not ghost/dodge, let update() handle the blinking

    // 4. Ensure shipSprite exists and is valid
    if (!this.shipSprite) {
      console.error('[Player] ensureRenderable: shipSprite missing! Rebuilding...');
      this.rebuildShipSprite('ensureRenderable:ship');
    } else if (this.shipSprite instanceof PIXI.Sprite && !GameAssets.isValidTexture(this.shipSprite.texture)) {
      console.error('[Player] ensureRenderable: shipSprite missing/invalid! Rebuilding...');
      this.rebuildShipSprite('ensureRenderable:ship');
    }

    if (this.shipSprite) {
      // STRICT: Always enforce visibility on shipSprite
      this.shipSprite.visible = true;
      this.shipSprite.renderable = true;

      // STRICT: shipSprite alpha should always be 1 (container handles transparency)
      this.shipSprite.alpha = 1;

      // 6. Ensure tint is reset if needed (avoid 0x000000 blackout)
      if (this.shipSprite.tint === 0x000000) {
        this.shipSprite.tint = 0xffffff;
      }

      // 7. Ensure position is finite (not NaN)
      if (!Number.isFinite(this.sprite.x)) this.sprite.x = this.x;
      if (!Number.isFinite(this.sprite.y)) this.sprite.y = this.y;

      // 8. Ensure scale is valid
      if (!Number.isFinite(this.shipSprite.scale.x) || this.shipSprite.scale.x <= 0) {
        this.shipSprite.scale.set(this.baseScale || 1);
      }
    }

    // 9. Ensure sprite is attached to parent container
    if (!this.sprite.parent && this.game && this.game.scenes && this.game.scenes.play) {
      const gameContainer = this.game.scenes.play.gameContainer;
      if (gameContainer) {
        console.warn('[Player] ensureRenderable: Sprite detached, reattaching to gameContainer');
        gameContainer.addChild(this.sprite);
      }
    }

    // 10. DEBUG overlay (only in debug mode)
    if (debug) {
      console.log(`[Player] ensureRenderable(${reason}):`, {
        visible: this.sprite.visible,
        alpha: this.sprite.alpha,
        shipAlpha: this.shipSprite?.alpha,
        textureValid: this.shipSprite?.texture?.valid,
        parent: this.sprite.parent?.constructor?.name || 'NONE',
        x: this.sprite.x,
        y: this.sprite.y
      });
    }
  }
}
