import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';
import { GameAssets } from '../utils/GameAssets.js';
import { ShipRegistry } from '../utils/ShipRegistry.js';
import { AudioManager } from '../audio/AudioManager.js';

export class Player {
  constructor(x, y, inputManager, game, spriteKey = 'row2_ship_1.png') {
    this.x = x;
    this.y = y;
    this.inputManager = inputManager;
    this.game = game;

    // Map sprite key to texture index for ShipRegistry compatibility
    const spriteKeyToIndex = {
      'row2_ship_1.png': 0,
      'row2_ship_2.png': 1,
      'row2_ship_3_clean.png': 2,
      'row2_ship_5.png': 3,
      'ship_extract_1.png': 4,
      'ship_extract_2.png': 5,
      'ship_extract_3.png': 6,
      'ship_extract_5.png': 7,
      'ship_new.png': 8
    };

    const textureIndex = spriteKeyToIndex[spriteKey] !== undefined ? spriteKeyToIndex[spriteKey] : 0;
    const shipId = `rank_ship_${textureIndex}`;

    // Config from Registry
    this.config = ShipRegistry[shipId] || ShipRegistry.rank_ship_0;
    this.stats = { ...this.config.stats };
    this.visuals = { ...this.config.visuals };
    this.selectedShipSpriteKey = spriteKey; // Store the selected sprite key
    this.selectedShipTextureIndex = textureIndex; // Store texture index
    this.hasSetInitialRank = false; // Track if initial rank has been set

    console.log(`[ShipStats] applied shipId=${this.config.id} damage=${this.stats.damage} fireRate=${this.stats.fireRate} speed=${this.stats.speed}`);

    this.speed = this.stats.speed;
    this.radius = this.config.hitbox.radius;
    this.baseHitboxRadius = this.config.hitbox.radius;
    this.active = true;
    this.invulnerable = true; // Invulnerable on spawn
    this.invulnerableTime = 2000; // 2s spawn protection
    this.rankIndex = null;

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

    // Damage flash effect
    this.flashTimer = 0;
    this.flashDuration = 0;

    // Powerups
    this.activePowerup = { type: null, expiresAt: 0 };
    this.rankBoost = { type: null, expiresAt: 0 };
    this.rankBoostPulse = 0;
    this.rankBoostExtraShots = 0;
    this.rankBoostBulletFx = false;
    this.currentModel = 1;
    this.damageOverlay = null;
    this.boostAura = null;
    this.rankBoostText = null;
    this.weaponProfile = this.config.weapon || { bullets: 1, spread: 0, shootSfx: 'shoot_small' };
    this.weaponProfileName = this.config.name;
    this.weaponSfxKey = this.weaponProfile.shootSfx;
    this.bulletPierce = false;
    this.scoreMultiplier = 1;
    this.scoreBoostExpiresAt = 0;
    this.lastPowerupType = null;
    this.lastPowerupAt = 0;
    this.synergyState = { type: null, expiresAt: 0, label: '' };
    this.magnetActive = false;
    this.magnetExpiresAt = 0;
    this.magnetRadius = 140;
    this.magnetStrength = 0.08;
    this.dronesActive = false;
    this.dronesExpiresAt = 0;
    this.drones = [];
    this.muzzleFlashColor = 0xffffff;
    this.baseMuzzleFlashColor = 0xffffff;

    // Shield State
    this.shieldActive = false;
    this.shieldExpiresAt = 0;
    this.shieldSprite = null;

    // Touch input (set externally by PlayScene)
    this.touchInput = { moveX: 0, moveY: 0 };

    console.log('[Player] init selectedShipSpriteKey=' + spriteKey + ' activeSpriteKey=' + spriteKey);
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

    this.rebuildShipSprite('init');
  }

  computeBaselineShipWidth() {
    const screenWidth = this.game.getWidth();
    const targetWidth = Math.max(52, Math.min(screenWidth * 0.06, 78)) * 0.95;
    this.radius = Math.max(8, Math.round(this.baseHitboxRadius * 0.9));
    return targetWidth;
  }

  buildDefaultShipSprite() {
    // Use selected ship texture index if available
    let texture;
    if (this.selectedShipTextureIndex !== undefined) {
      texture = GameAssets.getRankShipTexture(this.selectedShipTextureIndex);
    } else if (typeof this.config.textureIndex === 'number') {
      texture = GameAssets.getRankShipTexture(this.config.textureIndex);
    } else if (this.config.texture) {
      texture = GameAssets.getShipTexture(this.config.texture);
    }

    if (!GameAssets.isValidTexture(texture)) return null;

    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);

    const targetWidth = this.baseShipWidth || this.computeBaselineShipWidth();
    const scale = texture.width > 0 ? targetWidth / texture.width : 1;
    sprite.scale.set(scale);
    this.baseScale = Number.isFinite(scale) ? scale : 1;

    return sprite;
  }

  ensureShipOverlays() {
    if (!this.damageOverlay) {
      this.damageOverlay = new PIXI.Sprite();
      this.damageOverlay.anchor.set(0.5);
      this.damageOverlay.visible = false;
      this.sprite.addChild(this.damageOverlay);
    } else if (!this.damageOverlay.parent) {
      this.sprite.addChild(this.damageOverlay);
    }

    if (!this.shieldSprite) {
      this.shieldSprite = new PIXI.Container();

      const sGfx = new PIXI.Graphics();
      sGfx.circle(0, 0, 50);
      sGfx.stroke({ width: 4, color: 0x00ffff, alpha: 0.8 });
      sGfx.fill({ color: 0x00ffff, alpha: 0.1 });
      this.shieldSprite.addChild(sGfx);
      this.shieldSprite.visible = false;
      this.sprite.addChild(this.shieldSprite);
    } else if (!this.shieldSprite.parent) {
      this.sprite.addChild(this.shieldSprite);
    }

    if (!this.boostAura) {
      this.boostAura = new PIXI.Graphics();
      const radius = Math.max(46, (this.baseShipWidth || 60) * 0.95);
      this.boostAura.circle(0, 0, radius);
      this.boostAura.stroke({ width: 4, color: 0x66ffff, alpha: 0.95 });
      this.boostAura.alpha = 0.95;
      this.boostAura.visible = false;
      this.sprite.addChild(this.boostAura);
    } else if (!this.boostAura.parent) {
      this.sprite.addChild(this.boostAura);
    }

    if (!this.rankBoostText) {
      this.rankBoostText = new PIXI.Text('', {
        fontFamily: 'Courier New',
        fontSize: 14,
        fill: '#66ffff',
        align: 'center'
      });
      this.rankBoostText.anchor.set(0.5);
      this.rankBoostText.y = -70;
      this.rankBoostText.visible = false;
      this.sprite.addChild(this.rankBoostText);
    } else if (!this.rankBoostText.parent) {
      this.sprite.addChild(this.rankBoostText);
    }
  }

  setCosmetics({ auraColor, muzzleColor } = {}) {
    if (Number.isFinite(auraColor) && this.boostAura) {
      this.boostAura.clear();
      const radius = Math.max(46, (this.baseShipWidth || 60) * 0.95);
      this.boostAura.circle(0, 0, radius);
      this.boostAura.stroke({ width: 4, color: auraColor, alpha: 0.95 });
    }
    if (Number.isFinite(muzzleColor)) {
      this.muzzleFlashColor = muzzleColor;
      this.baseMuzzleFlashColor = muzzleColor;
    }
  }

  getAvailableRankShipIndices() {
    const count = GameAssets.getRankShipCount();
    const available = [];
    for (let i = 0; i < count; i++) {
      const texture = GameAssets.getRankShipTexture(i);
      if (GameAssets.isValidTexture(texture)) available.push(i);
    }
    return available;
  }

  getNextDifferentRankShipIndex(startIndex) {
    const count = GameAssets.getRankShipCount();
    if (count <= 1) return startIndex;

    for (let offset = 1; offset <= count; offset++) {
      const idx = (startIndex + offset) % count;
      if (idx === this.rankShipIndex) continue;
      const texture = GameAssets.getRankShipTexture(idx);
      if (GameAssets.isValidTexture(texture)) return idx;
    }

    return startIndex;
  }

  getRankShipIndexForRank(rank) {
    const nr = Number(rank);
    if (!Number.isFinite(nr)) return null;

    const count = GameAssets.getRankShipCount();
    if (count <= 0) return null;

    if (nr <= 0) return 0;
    if (nr >= 1 && nr <= 9) {
      let index = Math.min(nr, count) - 1;
      if (index === this.rankShipIndex) {
        index = this.getNextDifferentRankShipIndex(index);
      }
      return index;
    }

    const available = this.getAvailableRankShipIndices();
    if (available.length === 0) return null;
    if (available.length === 1) return available[0];

    let pick = null;
    for (let tries = 0; tries < 3; tries++) {
      pick = available[Math.floor(Math.random() * available.length)];
      if (pick !== this.rankShipIndex) return pick;
    }

    const fallback = available.find(index => index !== this.rankShipIndex);
    return fallback ?? pick;
  }

  swapToRankShip(rank, options = {}) {
    const nr = Number(rank);
    if (!Number.isFinite(nr)) return false;

    const logSwap = options.log !== false;
    const force = options.force === true;
    const previousIndex = Number.isFinite(this.rankShipIndex) ? this.rankShipIndex : null;
    const previousPath = this.currentShipPath || (previousIndex !== null ? GameAssets.getRankShipPath(previousIndex) : null);
    const previousName = previousPath ? previousPath.split('/').pop() : (previousIndex !== null ? `rank_ship_${previousIndex}` : 'unknown');

    let index = this.getRankShipIndexForRank(nr);

    if (!Number.isFinite(index)) return false;
    if (index === this.rankShipIndex) {
      index = this.getNextDifferentRankShipIndex(index);
    }
    if (!force && index === this.rankShipIndex) return false;

    const texture = GameAssets.getRankShipTexture(index);
    if (!GameAssets.isValidTexture(texture)) return false;

    // Load new config from Registry
    const newShipId = `rank_ship_${index}`;
    const newConfig = ShipRegistry[newShipId];

    if (newConfig) {
      this.config = newConfig;
      this.stats = { ...newConfig.stats };
      this.visuals = { ...newConfig.visuals };
      this.weaponProfile = { ...newConfig.weapon };
      this.speed = this.stats.speed;
      this.weaponSfxKey = this.weaponProfile.shootSfx;
      this.activePowerup.type = null; // Clear powerups on ship swap to avoid stuck states? No, keep powerups.
      this.recalculateStats();
    }

    const shipPath = GameAssets.getRankShipPath(index);
    const shipName = shipPath ? shipPath.split('/').pop() : `rank_ship_${index}`;

    if (this.shipSprite && this.shipSprite.parent) {
      this.shipSprite.parent.removeChild(this.shipSprite);
    }

    this.shipSprite = new PIXI.Sprite(texture);
    this.shipSprite.anchor.set(0.5);
    this.shipSprite.name = `player_ship_rank_${index}`;

    // STRICT SIZING: Use targetShipWidthPx if set, otherwise compute it
    if (!this.targetShipWidthPx || isNaN(this.targetShipWidthPx)) {
      this.targetShipWidthPx = this.computeBaselineShipWidth();
    }
    const targetWidth = this.targetShipWidthPx;

    const texWidth = texture.width || 1;
    const scale = targetWidth / texWidth;
    this.shipSprite.scale.set(scale);
    this.baseScale = Number.isFinite(scale) ? scale : 1;

    this.sprite.addChildAt(this.shipSprite, 0);
    this.rankShipIndex = index;
    this.currentShipPath = shipPath || null;

    this.ensureShipOverlays();

    if (logSwap && import.meta?.env?.DEV) {
      const textureSource = this.shipSprite?.texture?.baseTexture?.resource?.src
        || this.shipSprite?.texture?.baseTexture?.resource?.url
        || this.shipSprite?.texture?.baseTexture?.cacheId
        || 'unknown';
      const spriteName = this.shipSprite?.name || 'unnamed';
      console.log(`[PlayerShipSwap] rank=${nr} old=${previousName} new=${shipName} sprite=${spriteName} texture=${textureSource}`);
      console.log(`[PlayerShipScale] texW=${texWidth} targetW=${targetWidth} scale=${this.baseScale}`);
      console.log(`[ShipWeapon] ship=${shipName} shootSfx=${this.weaponSfxKey}`);
    }

    if (this.shipSprite && this.baseScale) {
      // Pulse relative to baseScale, not 1
      const pulseScale = this.baseScale * 1.5; // Bigger pulse for visibility
      this.shipSprite.scale.set(pulseScale);
      setTimeout(() => {
        if (this.shipSprite) this.shipSprite.scale.set(this.baseScale);
      }, 180);
    }

    this.ensureRenderable('swapToRankShip');

    return true;
  }

  // Legacy weapon profile methods removed


  getShootSfxKey() {
    return this.weaponSfxKey || 'shoot_small';
  }

  setRank(newRank, source = 'unknown') {
    const nr = Number(newRank);
    if (!Number.isFinite(nr)) return false;

    const prevRank = Number.isFinite(this.rankIndex) ? this.rankIndex : null;
    this.rankIndex = nr;

    // On initial spawn, preserve the selected ship from constructor
    if (prevRank === null) {
      if (!this.hasSetInitialRank && this.selectedShipSpriteKey) {
        // First time setting rank - keep the selected ship, don't swap
        this.hasSetInitialRank = true;
        console.log('[Player] setRank initial, preserving selected ship:', this.selectedShipSpriteKey);
        return false; // Don't swap on initial spawn
      }
      // Fallback for cases where selectedShipSpriteKey wasn't set
      return this.swapToRankShip(nr, { force: true });
    }

    // After initial spawn, allow rank-based ship swaps on rank up
    // After initial spawn, allow rank-based ship swaps on rank up
    if (nr > prevRank) {
      console.log(`[RankUp] triggered: ${prevRank} -> ${nr}`);
      this.animateRankUp(nr);
      return true;
    }

    return false;
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

    this.damageOverlay = null;
    this.shieldSprite = null;

    if (!this.targetShipWidthPx) {
      this.targetShipWidthPx = this.computeBaselineShipWidth();
    }
    this.baseShipWidth = this.targetShipWidthPx;

    // FIX: Always prioritize User Selected Ship if available
    let applied = false;

    // 1. Try to build from selected ship key/index
    if (this.selectedShipSpriteKey) {
      const selectedSprite = this.buildDefaultShipSprite();
      if (selectedSprite) {
        this.shipSprite = selectedSprite;
        this.sprite.addChild(this.shipSprite);
        applied = true;
        // Ensure weapon profile matches selection
        // Fix: setWeaponProfile was removed, read directly from config
        this.weaponProfile = this.config.weapon || { bullets: 1, spread: 0, shootSfx: 'shoot_small' };
        this.weaponSfxKey = this.weaponProfile.shootSfx || 'shoot_small';

        // Defensive Fallback per Guardrails
        const profile = (typeof this.actWeaponProfile === 'function' ? this.actWeaponProfile() : this.actWeaponProfile)
          || this.activeWeaponProfile
          || this.weaponProfile;

        if (profile) {
          this.weaponProfile = profile;
        } else {
          // Only warn once per session
          if (!this._warnedProfileMissing) {
            console.warn('[Player] No weapon profile found in rebuildShipSprite, using defaults');
            this._warnedProfileMissing = true;
          }
        }
      }
    }

    // 2. Fallback to rank ship (only if no selection or selection failed)
    if (!applied) {
      const rankApplied = this.swapToRankShip(this.game.rankIndex || 0, { log: false, force: true });
      if (rankApplied) applied = true;
    }

    // 3. Last resort fallback
    if (!applied) {
      const fallbackSprite = this.buildDefaultShipSprite();
      if (fallbackSprite) {
        this.shipSprite = fallbackSprite;
        this.sprite.addChild(this.shipSprite);
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
    this.ensureShipOverlays();
  }

  animateRankUp(newRank) {
    console.log('[RankUp] applying visual evolution');

    // 1. Visual Flash (Green Tint)
    if (this.shipSprite) {
      this.shipSprite.tint = 0x00ff00;
      setTimeout(() => {
        if (this.shipSprite) this.shipSprite.tint = 0xffffff;
      }, 200);
    }

    // 2. Scale Pulse (Pop up and down) - Container scale
    if (this.sprite) {
      const startScaleX = this.sprite.scale.x;
      const startScaleY = this.sprite.scale.y;
      this.sprite.scale.set(startScaleX * 1.3, startScaleY * 1.3);
      setTimeout(() => {
        if (this.sprite) this.sprite.scale.set(startScaleX, startScaleY);
      }, 300);
    }

    // 3. Swap Sprite PRE-LOG
    if (this.shipSprite && this.shipSprite.texture) {
      const tex = this.shipSprite.texture;
      console.log(`[RankUpSprite] before rank=${this.rankIndex} texW=${tex.width} scale=${this.shipSprite.scale.x.toFixed(4)}`);
    }

    // 4. Swap Sprite
    // We trust swapToRankShip to maintain the correct targetShipWidthPx
    const swapped = this.swapToRankShip(newRank, { force: true, log: true });

    // 5. Verification Logs (REQUIRED)
    if (this.shipSprite && this.shipSprite.texture) {
      const tex = this.shipSprite.texture;
      const finalW = this.shipSprite.width; // Local width (tex * scale)
      const scaleX = this.shipSprite.scale.x;
      const scaleY = this.shipSprite.scale.y;
      console.log(`[RankUpSprite] targetWidthPx=${this.targetShipWidthPx?.toFixed(2) || 'nan'}`);
      console.log(`[RankUpSprite] after texW=${tex.width} texH=${tex.height} scale=${scaleX.toFixed(4)} finalWidth=${finalW.toFixed(2)}`);
      console.log('[RankUpSprite] done');
    }

    // 6. Apply Stats/Boost (Shields, etc)
    this.applyRankUpBoost();

    console.log(`[RankUp] complete. Swapped=${swapped}`);
  }

  update(delta) {
    if (!this.active) return;
    if (!this.sprite) return; // Guard: Sprite might be missing/destroyed during update

    const now = Date.now();
    const dt = delta * 16.67;
    const deltaSeconds = dt / 1000;

    // Powerup Expiry
    if (this.activePowerup.type && now > this.activePowerup.expiresAt) {
      this.resetPowerups();
    }
    if (this.rankBoost.type && now > this.rankBoost.expiresAt) {
      this.clearRankBoost();
    }
    if (this.synergyState.type && now > this.synergyState.expiresAt) {
      this.clearSynergy();
    }
    if (this.magnetActive && now > this.magnetExpiresAt) {
      this.magnetActive = false;
    }
    if (this.dronesActive && now > this.dronesExpiresAt) {
      this.clearDrones();
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

    // Damage Flash Effect
    if (this.flashTimer < this.flashDuration) {
      this.flashTimer += dt;
      const progress = this.flashTimer / this.flashDuration;
      // Flash intensity fades out
      const flashIntensity = 1 - progress;
      // Apply tint to ship sprite
      if (this.shipSprite && !this.shipSprite.destroyed) {
        // Blend flash color with white based on intensity
        const r = Math.floor(((this.flashColor >> 16) & 0xff) * flashIntensity + 255 * (1 - flashIntensity));
        const g = Math.floor(((this.flashColor >> 8) & 0xff) * flashIntensity + 255 * (1 - flashIntensity));
        const b = Math.floor((this.flashColor & 0xff) * flashIntensity + 255 * (1 - flashIntensity));
        this.shipSprite.tint = (r << 16) | (g << 8) | b;
      }
    } else if (this.shipSprite && !this.shipSprite.destroyed) {
      // Reset tint to white (no flash)
      this.shipSprite.tint = 0xffffff;
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
      // Invulnerable blinking - gentler pulse effect
      if (this.invulnerable) {
        this.invulnerableTime -= dt;

        // Smooth pulse instead of harsh strobe
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 8) * 0.5 + 0.5; // 0.0 to 1.0
        this.sprite.alpha = 0.4 + pulse * 0.6; // 0.4 to 1.0

        if (this.invulnerableTime <= 0) {
          this.invulnerable = false;
          if (this.activePowerup.type !== 'ghost') this.sprite.alpha = 1;
        }
      }
    }

    // Cooldowns
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;

    if (this.rankBoost.type && this.boostAura) {
      this.rankBoostPulse += deltaSeconds;
      const pulse = 1 + Math.sin(this.rankBoostPulse * 6) * 0.06;
      this.boostAura.scale.set(pulse);
      this.boostAura.visible = true;
      this.boostAura.alpha = 0.7 + Math.sin(this.rankBoostPulse * 4) * 0.2;
      if (this.rankBoostText) {
        this.rankBoostText.visible = true;
        this.rankBoostText.alpha = 0.8 + Math.sin(this.rankBoostPulse * 3) * 0.2;
      }
    } else {
      if (this.boostAura) this.boostAura.visible = false;
      if (this.rankBoostText) this.rankBoostText.visible = false;
    }

    this.updateDrones(deltaSeconds);
  }

  // --- Actions ---

  shoot() {
    this.shootCooldown = this.shootDelay;
    const bullets = [];
    const spread = this.weaponProfile?.spread ?? 0.15;
    const totalShots = Math.max(1, this.multiShot + this.rankBoostExtraShots);
    const spreadAngles = totalShots > 1 ?
      Array.from({ length: totalShots }, (_, i) => (i - (totalShots - 1) / 2) * spread) :
      [0];
    let offsets = [0];
    if (totalShots === 2) offsets = [-10, 10];
    else if (totalShots === 3) offsets = [-14, 0, 14];
    else if (totalShots > 3) {
      offsets = Array.from({ length: totalShots }, (_, i) => (i - (totalShots - 1) / 2) * 10);
    }

    // Origin: Nose of the ship
    const spawnY = this.y - 20;

    // Visuals based on powerup
    let vConfig = { color: 'Blue', index: 1 };
    const pType = this.activePowerup.type;

    if (pType === 'rolp') vConfig = { color: 'Red', index: 1 }; // Rapid
    else if (pType === 'isbjorn') vConfig = { color: 'Green', index: 13 }; // Round spread
    else if (pType === 'deili') vConfig = { color: 'Blue', index: 8 }; // Strong/Big
    else if (this.activePowerup.type) vConfig = { color: 'Blue', index: 3 }; // Other powerups slightly different
    if (totalShots > 1) vConfig = { color: 'Green', index: 13 };
    if (this.rankBoostBulletFx) vConfig = { color: 'Red', index: 15 };
    if (this.synergyState.type === 'bullet_storm') vConfig = { color: 'Red', index: 15 };
    if (this.synergyState.type === 'rail_rounds') vConfig = { color: 'Blue', index: 8 };

    if (totalShots === 2 || totalShots === 3) {
      console.log(`[Shot] shots=${totalShots} spread=${spread.toFixed(2)} offsets=${offsets.join(',')}`);
    }

    spreadAngles.forEach((angle, i) => {
      const offsetX = offsets[i] || 0;
      const vx = Math.sin(angle) * this.bulletSpeed;
      const vy = -Math.cos(angle) * this.bulletSpeed;
      const bullet = new Bullet(this.x + offsetX, spawnY, vx, vy, this.bulletDamage, 0x00ffff, true, vConfig);
      if (this.bulletPierce) bullet.piercing = true;
      bullets.push(bullet);

      const flash = new PIXI.Graphics();
      flash.circle(offsetX, -15, 6);
      flash.fill({ color: this.muzzleFlashColor, alpha: 0.8 });
      this.sprite.addChild(flash);
      setTimeout(() => {
        if (flash.parent) this.sprite.removeChild(flash);
      }, 80);
    });

    if (this.dronesActive && this.drones.length) {
      this.drones.forEach((drone) => {
        const bullet = new Bullet(drone.x, drone.y - 10, 0, -this.bulletSpeed, Math.max(1, Math.round(this.bulletDamage * 0.7)), 0x66ccff, true);
        bullets.push(bullet);
      });
    }

    return bullets;
  }

  createDrones() {
    this.clearDrones();
    const texture = this.shipSprite?.texture;
    for (let i = 0; i < 2; i++) {
      const sprite = texture ? new PIXI.Sprite(texture) : new PIXI.Graphics();
      if (sprite instanceof PIXI.Sprite) {
        sprite.anchor.set(0.5);
        sprite.scale.set(0.35);
      } else {
        sprite.circle(0, 0, 6);
        sprite.fill(0x66ccff);
      }
      this.sprite.addChild(sprite);
      this.drones.push(sprite);
    }
    this.dronesActive = true;
  }

  updateDrones(deltaSeconds) {
    if (!this.dronesActive || this.drones.length === 0) return;
    const t = Date.now() * 0.002;
    const offset = 28;
    this.drones.forEach((drone, i) => {
      const side = i === 0 ? -1 : 1;
      drone.x = side * (offset + Math.sin(t + i) * 6);
      drone.y = 8 + Math.cos(t + i) * 4;
      if (drone.rotation !== undefined) drone.rotation = side * 0.1;
    });
  }

  clearDrones() {
    this.dronesActive = false;
    this.drones.forEach(d => {
      if (d.parent) d.parent.removeChild(d);
    });
    this.drones = [];
  }

  getStatSnapshot() {
    const shots = this.multiShot + this.rankBoostExtraShots;
    return `fire=${Math.round(this.shootDelay)} speed=${this.speed.toFixed(2)} dmg=${this.bulletDamage} proj=${this.bulletSpeed.toFixed(1)} shots=${shots} pierce=${this.bulletPierce}`;
  }

  getPowerupLabel(type) {
    const labels = {
      isbjorn: 'ISBJORN',
      kjottdeig: 'KJOTTDEIG',
      rolp: 'ROLP',
      deili: 'DEILI',
      slow_time: 'SLOW TIME',
      ghost: 'GHOST',
      shield: 'SHIELD',
      rapid_fire: 'RAPID FIRE',
      double_shot: 'DOUBLE SHOT',
      damage_up: 'DAMAGE UP',
      speed_up: 'SPEED UP',
      pierce: 'PIERCE',
      bullet_shield: 'BULLET SHIELD',
      score_x2: 'SCORE x2',
      magnet: 'MAGNET',
      drones: 'DRONES',
      shockwave: 'SHOCKWAVE'
    };
    return labels[type] || String(type || '').toUpperCase();
  }

  getActivePowerupState() {
    const now = Date.now();

    if (this.activePowerup?.type) {
      const remainingMs = Math.max(0, this.activePowerup.expiresAt - now);
      return {
        type: this.activePowerup.type,
        label: this.getPowerupLabel(this.activePowerup.type),
        remainingMs
      };
    }

    if (this.shieldActive) {
      const remainingMs = Math.max(0, this.shieldExpiresAt - now);
      return {
        type: 'shield',
        label: this.getPowerupLabel('shield'),
        remainingMs
      };
    }

    if (this.scoreMultiplier > 1) {
      const remainingMs = Math.max(0, this.scoreBoostExpiresAt - now);
      return {
        type: 'score_x2',
        label: this.getPowerupLabel('score_x2'),
        remainingMs
      };
    }

    return null;
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
      // Flash effect even for shield break
      this.triggerFlash(0xff6666, 200);
      return false; // DAMAGE ABSORBED
    }

    if (this.invulnerable) return false;
    this.invulnerable = true;
    this.invulnerableTime = 2000;

    // Trigger damage flash effect
    this.triggerFlash(0xff0000, 300);

    // Trigger medium screen shake
    if (this.game && this.game.scenes && this.game.scenes.play && this.game.scenes.play.screenShake) {
      this.game.scenes.play.screenShake.mediumShake();
    }

    return true; // DAMAGE TAKEN
  }

  triggerFlash(color = 0xffffff, duration = 200) {
    this.flashTimer = 0;
    this.flashDuration = duration;
    this.flashColor = color;
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
    if (type !== 'shield' && this.activePowerup.type === type) {
      this.activePowerup.expiresAt = Date.now() + 12000;
      console.log(`[Powerup] refresh type=${type} expiresAt=${this.activePowerup.expiresAt}`);
      return;
    }

    this.resetPowerups(); // Clear existing to prevent stacking weirdness
    this.activePowerup.type = type;
    this.activePowerup.expiresAt = Date.now() + 12000; // 12 Seconds Default

    switch (type) {
      case 'slow_time':
        // Global effect handled by Scene
        this.activePowerup.expiresAt = Date.now() + 8000; // 8s
        break;
      case 'ghost':
        this.activePowerup.expiresAt = Date.now() + 8000; // 8s
        // Ghost mode uses reduced alpha for the CONTAINER only, not destroying visibility
        this.sprite.alpha = 0.4;
        break;
      case 'magnet':
        this.magnetActive = true;
        this.magnetExpiresAt = Date.now() + 8000;
        break;
      case 'drones':
        this.dronesActive = true;
        this.dronesExpiresAt = Date.now() + 8000;
        this.createDrones();
        break;
      case 'rapid_fire':
        this.activePowerup.expiresAt = Date.now() + 8000;
        break;
      case 'double_shot':
        this.activePowerup.expiresAt = Date.now() + 8000;
        break;
      case 'damage_up':
        this.activePowerup.expiresAt = Date.now() + 8000;
        break;
      case 'speed_up':
        this.activePowerup.expiresAt = Date.now() + 8000;
        break;
      case 'pierce':
        this.activePowerup.expiresAt = Date.now() + 7000;
        break;
      case 'bullet_shield':
        this.activePowerup.expiresAt = Date.now() + 10000; // 10s
        break;
      case 'shield':
        this.activateShield();
        if (type === 'shield') {
          this.activePowerup.type = null; // Don't block weapon slot
        }
        break;
    }

    this.notePowerup(type);
    const before = this.getStatSnapshot();
    this.recalculateStats();
    const after = this.getStatSnapshot();
    console.log(`[Powerup] apply type=${type} before=${before} after=${after}`);

    // CRITICAL: Ensure player remains visible after powerup application
    // (Ghost is special - it sets alpha to 0.4, which ensureRenderable respects)
    this.ensureRenderable('applyPowerup:' + type);
  }

  resetPowerups() {
    const expiredType = this.activePowerup.type;
    // Visuals
    if (this.sprite && !this.isDodging && !this.invulnerable) {
      this.sprite.alpha = 1;
    }

    if (this.activePowerup.type) {
      // Play expiry sound?
      // Game.audio.playSfx('powerdown') // if exists
    }

    this.magnetActive = false;
    this.magnetExpiresAt = 0;
    this.clearDrones();
    this.activePowerup.type = null;
    this.activePowerup.expiresAt = 0;
    const before = this.getStatSnapshot();
    this.recalculateStats();
    const after = this.getStatSnapshot();
    console.log(`[Powerup] expire before=${before} after=${after}`);
    const playScene = this.game?.scenes?.play;
    if (playScene?.debugPowerups && expiredType) {
      console.log(`[PowerupTest] expired type=${expiredType} restoredOk=true`);
    }
  }

  notePowerup(type) {
    if (!type) return;
    const now = Date.now();
    const previous = this.lastPowerupType;
    const previousAt = this.lastPowerupAt;
    this.lastPowerupType = type;
    this.lastPowerupAt = now;
    this.tryActivateSynergy(type, previous, previousAt);
  }

  noteScoreMultiplier() {
    this.notePowerup('score_x2');
  }

  tryActivateSynergy(type, previous, previousAt) {
    const now = Date.now();
    const recentOk = previous && (now - previousAt < 8000);
    const playScene = this.game?.scenes?.play;
    const activate = (key, label) => {
      if (this.synergyState.type === key) {
        this.synergyState.expiresAt = now + 6000;
      } else {
        this.synergyState = { type: key, expiresAt: now + 6000, label };
      }
      if (playScene?.setSynergyBadge) playScene.setSynergyBadge(label);
      if (playScene?.enqueueToast) {
        playScene.enqueueToast(label.toUpperCase(), { fontSize: 20, fill: '#ffff00', slot: 'top', type: 'synergy' });
      }
      AudioManager.playSfx('powerup', { force: true, volume: 0.9 });
      this.recalculateStats();
    };

    if (recentOk) {
      if ((type === 'double_shot' && previous === 'rapid_fire') || (type === 'rapid_fire' && previous === 'double_shot')) {
        activate('bullet_storm', 'Bullet Storm');
      } else if ((type === 'pierce' && previous === 'damage_up') || (type === 'damage_up' && previous === 'pierce')) {
        activate('rail_rounds', 'Rail Rounds');
      } else if ((type === 'magnet' && previous === 'score_x2') || (type === 'score_x2' && previous === 'magnet')) {
        activate('cash_vacuum', 'Cash Vacuum');
      }
    }
  }

  clearSynergy() {
    if (!this.synergyState.type) return;
    this.synergyState = { type: null, expiresAt: 0, label: '' };
    const playScene = this.game?.scenes?.play;
    if (playScene?.setSynergyBadge) playScene.setSynergyBadge('');
    this.muzzleFlashColor = this.baseMuzzleFlashColor;
    this.recalculateStats();
  }

  recalculateStats() {
    // 1. Reset to BASE STATS from Single Source of Truth
    this.speed = this.stats.speed;
    this.bulletDamage = this.stats.damage;
    this.shootDelay = this.stats.fireRate;
    this.bulletSpeed = this.stats.bulletSpeed;

    // 2. Base Weapon Profile properties
    const weapon = this.weaponProfile || { bullets: 1, spread: 0 };
    this.multiShot = weapon.bullets || 1;
    this.bulletPierce = false;

    // 3. Reset dynamic modifiers
    this.rankBoostExtraShots = 0;
    this.rankBoostBulletFx = false;
    this.magnetActive = false;
    this.magnetRadius = 140;
    this.magnetStrength = 0.08;

    // 4. Apply Powerups (Additive or Multiplicative)
    switch (this.activePowerup.type) {
      case 'isbjorn':
        this.multiShot = Math.max(this.multiShot, 3);
        break;
      case 'rolp':
        this.bulletDamage = Math.max(this.bulletDamage, 3);
        this.shootDelay = this.stats.fireRate / 2; // Rapid fire
        break;
      case 'deili':
        this.multiShot = Math.max(this.multiShot, 5);
        this.bulletDamage = Math.max(this.bulletDamage, 2);
        break;
      case 'rapid_fire':
        this.shootDelay = this.stats.fireRate * 0.5;
        break;
      case 'double_shot':
        this.multiShot = Math.max(this.multiShot, 2);
        break;
      case 'damage_up':
        this.bulletDamage = Math.max(2, Math.round(this.bulletDamage * 1.6));
        break;
      case 'speed_up':
        this.speed = this.speed * 1.3;
        break;
      case 'pierce':
        this.bulletPierce = true;
        break;
      case 'magnet':
        this.magnetActive = true;
        break;
      case 'drones':
        this.dronesActive = true;
        break;
    }

    this.applyRankBoostModifiers();
    this.applySynergyModifiers();
  }

  applyRankBoostModifiers() {
    if (!this.rankBoost.type) return;
    this.rankBoostExtraShots = 0;
    this.rankBoostBulletFx = true;
    this.shootDelay = Math.max(50, this.shootDelay * 0.8);
    this.rankBoostExtraShots = 1;
    switch (this.rankBoost.type) {
      case 'fire_rate':
        this.shootDelay = Math.max(50, this.shootDelay * 0.5);
        this.bulletSpeed = this.bulletSpeed * 1.15;
        break;
      case 'speed':
        this.speed *= 1.35;
        break;
      case 'damage':
        this.bulletDamage = Math.max(1, Math.round(this.bulletDamage * 1.75));
        this.bulletPierce = true;
        break;
    }
  }

  applySynergyModifiers() {
    if (!this.synergyState.type) return;
    switch (this.synergyState.type) {
      case 'bullet_storm':
        this.shootDelay = Math.max(45, this.shootDelay * 0.6);
        this.multiShot = Math.max(this.multiShot, 3);
        this.bulletSpeed = this.bulletSpeed * 1.1;
        this.muzzleFlashColor = 0xff6666;
        break;
      case 'rail_rounds':
        this.bulletPierce = true;
        this.bulletDamage = Math.max(2, Math.round(this.bulletDamage * 1.4));
        this.bulletSpeed = this.bulletSpeed * 1.2;
        this.muzzleFlashColor = 0x66ccff;
        break;
      case 'cash_vacuum':
        this.magnetActive = true;
        this.magnetRadius = 200;
        this.magnetStrength = 0.12;
        this.muzzleFlashColor = 0xffff66;
        break;
    }
  }

  clearRankBoost() {
    if (!this.rankBoost.type) return;
    this.rankBoost.type = null;
    this.rankBoost.expiresAt = 0;
    this.recalculateStats();
  }

  applyRankBoost(type, durationMs) {
    const now = Date.now();
    const before = {
      shootDelay: this.shootDelay,
      speed: this.speed,
      damage: this.bulletDamage
    };
    if (this.rankBoost.type === type) {
      this.rankBoost.expiresAt = now + durationMs;
    } else {
      this.rankBoost.type = type;
      this.rankBoost.expiresAt = now + durationMs;
      this.recalculateStats();
    }

    const playScene = this.game && this.game.scenes ? this.game.scenes.play : null;
    if (playScene && playScene.showToast) {
      const labels = {
        fire_rate: 'FIRE RATE',
        speed: 'SPEED',
        damage: 'DAMAGE'
      };
      const label = labels[type] || 'BOOST';
      playScene.showToast(`RANK BOOST: ${label}`, { fontSize: 30, fill: '#66ffff', duration: 1800, slot: 'center', type: 'rank_boost' });
    }

    const boostLabels = {
      fire_rate: 'FIRE RATE +',
      speed: 'SPEED +',
      damage: 'DAMAGE +'
    };
    if (this.rankBoostText) {
      this.rankBoostText.text = boostLabels[type] || 'BOOST';
    }
    AudioManager.playSfx('powerup', { force: true, volume: 0.9 });
    AudioManager.playPowerupVoice();

    const value = type === 'fire_rate'
      ? `shootDelay=${this.shootDelay}`
      : type === 'speed'
        ? `speed=${this.speed.toFixed(2)}`
        : `damage=${this.bulletDamage}`;
    console.log(`[RankBoost] rank=${Number.isFinite(this.rankIndex) ? this.rankIndex : 'unknown'} type=${type} durationMs=${durationMs} fireCooldown=${this.shootDelay} shots=${this.multiShot + this.rankBoostExtraShots} damage=${this.bulletDamage} projSpeed=${this.bulletSpeed.toFixed(1)}`);
    console.log(`[RankBoost] applied fireCooldown=${this.shootDelay} damage=${this.bulletDamage} projSpeed=${this.bulletSpeed.toFixed(1)} bullets=${this.multiShot + this.rankBoostExtraShots}`);
  }

  applyRankUpBoost() {
    const boosts = ['fire_rate', 'speed', 'damage'];
    const pick = boosts[Math.floor(Math.random() * boosts.length)];
    const durationMs = 6000 + Math.floor(Math.random() * 4000);
    this.applyRankBoost(pick, durationMs);
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
    this.invulnerableTime = 3000;

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
