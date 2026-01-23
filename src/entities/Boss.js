import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';
import { extendBossNames } from '../text/phrasePool.js';
import { createBossVisual } from '../game/BossFactory.js';
import { BalanceConfig } from '../config/BalanceConfig.js';
import { t } from '../i18n/index.ts';

const ENABLE_BOSS_WEAPON_FX = true;
const HARD_SCALE_FACTOR = 0.3;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function lerpAngle(current, target, maxStep) {
  const diff = normalizeAngle(target - current);
  const step = clamp(diff, -maxStep, maxStep);
  return normalizeAngle(current + step);
}

export class Boss {
  constructor(x, y, level, game) {
    this.x = x;
    this.y = y;
    this.level = level;
    this.active = true;
    this.game = game;
    this.radius = 50;
    // CLEANUP FIX: Add kind tag for cleanup targeting
    this.kind = 'boss';
    this.vx = 2;
    this.vy = 0;
    const diff = BalanceConfig.difficulty;
    this.health = Math.round(diff.bossBaseHealth + level * diff.bossHealthPerLevel);
    this.health = Math.max(this.health, 70);
    this.maxHealth = this.health;
    this.shootCooldown = 0;
    this.shootDelay = diff.bossShootDelayBase;
    this.moveTimer = 0;
    this.entryStartMs = null;
    this.entryDurationMs = 1000;
    this.entryFromY = 0;
    this.entryToY = 0;
    this.bossLaneY = 0;
    this.baseX = x;
    this.moveProfile = null;
    this.noseOffset = 0;
    this.tauntPhase2Shown = false;
    this.tauntHalfShown = false;
    this.scoreValue = 1000;
    this.phase = 1;
    this.color = 0xff00ff;
    this.signatureCooldown = 0;
    this.telegraph = null;
    this.phaseNotified = { 2: false, 3: false };
    this.spawnedAtMs = Date.now();
    this.invulnerableUntilMs = this.spawnedAtMs + 800;

    // Boss names
    const bossNames = [
      'MEGA TUFS',
      'ULTIMATE SVIN',
      'SUPER MONGO',
      'HYPER R\u00d8LP',
      'DEILI FETTA PRIME',
      'GIGA GRIS'
    ];
    const namePool = extendBossNames(bossNames);
    this.name = namePool[(level - 1) % namePool.length] || t('play.boss.nameFallback');

    // Note: createSprite() must be called manually after construction (it's async)
  }

  async createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Load boss visual from factory
    const maxBossWidth = this.game?.getWidth ? this.game.getWidth() * 0.55 : null;
    const bossVisual = await createBossVisual(this.level, maxBossWidth);
    this.visualContainer = bossVisual.container;
    this.bossType = bossVisual.kind;
    this.hitboxRef = bossVisual.hitboxRef; // Store hitbox reference
    this.visualCleanup = bossVisual.cleanup; // Store cleanup callback for ticker
    this.sprite.addChild(this.visualContainer);
    this.moveProfile = this.getMoveProfile(this.bossType);
    this.noseOffset = this.getNoseOffset(this.bossType);

    const gameWidth = this.game?.getWidth ? this.game.getWidth() : 800;
    const gameHeight = this.game?.getHeight ? this.game.getHeight() : 600;

    if (this.hitboxRef?.anchor?.set) {
      this.hitboxRef.anchor.set(0.5, 0.5);
    }

    const baseScaleX = this.visualContainer.scale?.x || 1;
    const baseScaleY = this.visualContainer.scale?.y || 1;
    this.visualContainer.scale.set(baseScaleX * HARD_SCALE_FACTOR, baseScaleY * HARD_SCALE_FACTOR);
    console.log(`[BossScale] type=${this.bossType || 'UNKNOWN'} level=${this.level} finalScale=${this.visualContainer.scale.x.toFixed(3)}`);

    const postScaleBounds = this.hitboxRef?.getBounds ? this.hitboxRef.getBounds() : { width: 0, height: 0 };

    const bossHeight = Math.max(postScaleBounds.height, 1);
    this.baseX = gameWidth * 0.5;
    this.sprite.x = this.baseX;
    this.sprite.y = -bossHeight * 0.6;
    this.x = this.sprite.x;
    this.y = this.sprite.y;
    this.bossLaneY = gameHeight * 0.18;
    this.entryFromY = this.sprite.y;
    this.entryToY = this.bossLaneY;
    this.entryStartMs = Date.now();

    // Compute accurate hitbox from actual boss body size
    if (this.hitboxRef) {
      const bounds = this.hitboxRef.getBounds();
      // Use the larger dimension for radius (accounting for rotation)
      this.radius = Math.max(bounds.width, bounds.height) / 2;
      console.log(`[Boss] ${this.bossType} hitbox radius computed: ${this.radius.toFixed(1)}`);
    }

    // Health bar overlay
    this.healthBar = new PIXI.Graphics();
    this.updateHealthBar();
    this.sprite.addChild(this.healthBar);

    // Name display overlay
    this.nameText = new PIXI.Text(this.name, {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ff0000',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.nameText.anchor.set(0.5);
    this.nameText.y = -this.radius - 30;
    this.sprite.addChild(this.nameText);

    // Force visibility
    this.sprite.visible = true;
    this.sprite.alpha = 1;
  }

  updateHealthBar() {
    if (!this.healthBar) return;

    this.healthBar.clear();
    const barWidth = this.radius * 3;
    const barHeight = 8;
    const healthPercent = this.health / this.maxHealth;

    this.healthBar.rect(-barWidth / 2, this.radius + 10, barWidth, barHeight);
    this.healthBar.fill({ color: 0x333333 });

    this.healthBar.rect(-barWidth / 2, this.radius + 10, barWidth * healthPercent, barHeight);
    this.healthBar.fill({ color: 0xff0000 });

    // Health text (no decimals)
    const healthText = `${Math.max(0, Math.ceil(this.health))}/${Math.ceil(this.maxHealth)}`;
    if (this.healthText) {
      this.healthBar.removeChild(this.healthText);
    }
    this.healthText = new PIXI.Text(healthText, {
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: '#ffffff'
    });
    this.healthText.anchor.set(0.5);
    this.healthText.y = this.radius + 14;
    this.healthBar.addChild(this.healthText);
  }

  update(delta, playerX, playerY) {
    if (!this.active) return;

    // Guard: Sprite might not be ready yet (async creation) or destroyed
    if (!this.sprite) {
      if (!this._warnedSpriteMissing) {
        console.warn('[Boss] Sprite not ready during update - skipping frame');
        this._warnedSpriteMissing = true;
      }
      return;
    }

    this.moveTimer += delta;

    // Phase transitions (MORE AGGRESSIVE - earlier transitions)
    if (this.health < this.maxHealth * 0.75 && this.phase === 1) {
      this.phase = 2;
      this.shootDelay = BalanceConfig.difficulty.bossShootDelayPhase2;
      this.color = 0xff8800;
      this.startPhaseChange(2, playerX, playerY);
      if (!this.tauntPhase2Shown) {
        const playScene = this.game?.scenes?.play;
        if (playScene?.showBossTaunt) playScene.showBossTaunt('boss_phase2');
        this.tauntPhase2Shown = true;
      }
    } else if (this.health < this.maxHealth * 0.40 && this.phase === 2) {
      this.phase = 3;
      this.shootDelay = BalanceConfig.difficulty.bossShootDelayPhase3;
      this.color = 0xff0000;
      this.startPhaseChange(3, playerX, playerY);
    }

    if (!this.tauntHalfShown && this.health <= this.maxHealth * 0.5) {
      const playScene = this.game?.scenes?.play;
      if (playScene?.showBossTaunt) playScene.showBossTaunt('boss_half');
      this.tauntHalfShown = true;
    }

    const now = Date.now();
    if (this.entryStartMs && now - this.entryStartMs < this.entryDurationMs) {
      const t = (now - this.entryStartMs) / this.entryDurationMs;
      const ease = 1 - Math.pow(1 - t, 2);
      this.y = this.entryFromY + (this.entryToY - this.entryFromY) * ease;
      this.x = this.baseX;
    } else {
      this.applyBossMovement(delta, playerX, playerY);
    }

    this.sprite.x = this.x;
    this.sprite.y = this.y;

    if (this.signatureCooldown > 0) {
      this.signatureCooldown -= delta;
    }

    if (this.telegraph) {
      const elapsed = Date.now() - this.telegraph.start;
      if (this.nameText) {
        this.nameText.alpha = 0.6 + Math.sin(elapsed * 0.02) * 0.4;
      }
      if (elapsed > this.telegraph.duration) {
        this.executeSignatureMove(this.telegraph.type, playerX, playerY);
        this.telegraph = null;
      }
    } else if (this.nameText) {
      this.nameText.alpha = 1;
    }

    // Shooting cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= delta;
    }
  }

  getMoveProfile(bossType) {
    // MORE AGGRESSIVE - faster, wider movements
    const base = {
      profile: 'sway',
      swayAmpX: 0.16, // 33% wider sway
      swayFreq: 0.8, // 33% faster sway
      bobAmpY: 0.02, // 100% more bobbing
      bobFreq: 1.2, // 33% faster bob
      rotateMode: 'slow',
      rotateSpeed: 0.3,
      aimStrength: 0.6
    };

    if (!bossType) return base;
    if (bossType === 'BIG_BEER_CAN') {
      return { ...base, profile: 'sway', rotateMode: 'slow', rotateSpeed: 0.25 };
    }
    if (bossType === 'ICON_192') {
      return { ...base, profile: 'orbit', swayAmpX: 0.12, bobAmpY: 0.025, rotateMode: 'slow', rotateSpeed: 0.35 };
    }
    if (bossType === 'BOSS_SPRITE') {
      return { ...base, profile: 'charge_tease', swayAmpX: 0.15, bobAmpY: 0.03, rotateMode: 'aimToPlayer', rotateSpeed: 2.8, aimStrength: 0.75 };
    }
    if (bossType.startsWith('BIG_SHIP')) {
      return { ...base, profile: 'zigzag', swayAmpX: 0.18, bobAmpY: 0.025, rotateMode: 'aimToPlayer', rotateSpeed: 2.4, aimStrength: 0.65 };
    }
    return base;
  }

  getNoseOffset(bossType) {
    // Assumption: art faces right by default.
    if (bossType === 'BIG_BEER_CAN') return 0;
    if (bossType === 'ICON_192') return 0;
    return 0;
  }

  applyBossMovement(delta, playerX, playerY) {
    const profile = this.moveProfile || this.getMoveProfile(this.bossType);
    const t = this.moveTimer * 0.02;
    const gameWidth = this.game?.getWidth ? this.game.getWidth() : 800;
    const gameHeight = this.game?.getHeight ? this.game.getHeight() : 600;
    const swayAmp = gameWidth * profile.swayAmpX;
    const bobAmp = gameHeight * profile.bobAmpY;

    switch (profile.profile) {
      case 'orbit':
        this.x = this.baseX + Math.sin(t * profile.swayFreq) * swayAmp;
        this.y = this.bossLaneY + Math.cos(t * profile.bobFreq) * bobAmp;
        break;
      case 'charge_tease': {
        // MORE AGGRESSIVE - bigger push forward motion
        const push = Math.abs(Math.sin(t * 0.5)) * (gameHeight * 0.05);
        this.x = this.baseX + Math.sin(t * profile.swayFreq) * swayAmp;
        this.y = this.bossLaneY + Math.sin(t * profile.bobFreq) * bobAmp + push;
        break;
      }
      case 'zigzag': {
        const zig = Math.sin(t * profile.swayFreq);
        this.x = this.baseX + zig * swayAmp;
        this.y = this.bossLaneY + Math.sin(t * profile.bobFreq) * bobAmp;
        break;
      }
      case 'sway':
      default:
        this.x = this.baseX + Math.sin(t * profile.swayFreq) * swayAmp;
        this.y = this.bossLaneY + Math.sin(t * profile.bobFreq) * bobAmp;
        break;
    }

    const deltaSeconds = delta / 60;
    if (profile.rotateMode === 'slow') {
      this.visualContainer.rotation += profile.rotateSpeed * deltaSeconds;
    } else if (profile.rotateMode === 'aimToPlayer') {
      const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x);
      const target = angleToPlayer + this.noseOffset;
      const maxStep = profile.rotateSpeed * deltaSeconds;
      this.visualContainer.rotation = lerpAngle(this.visualContainer.rotation, target, maxStep * profile.aimStrength);
    }
  }

  startPhaseChange(phase, playerX, playerY) {
    if (this.phaseNotified[phase]) return;
    this.phaseNotified[phase] = true;
    const playScene = this.game?.scenes?.play;
    if (playScene?.onBossPhaseChange) {
      playScene.onBossPhaseChange(phase, this);
    }
    const type = phase === 2 ? 'cone' : 'ring';
    // MORE AGGRESSIVE - shorter telegraph warning (500ms instead of 700ms)
    this.telegraph = { type, start: Date.now(), duration: 500 };
    this.signatureCooldown = 120;
  }

  executeSignatureMove(type, playerX, playerY) {
    if (type === 'cone') {
      // MORE AGGRESSIVE - wider, denser cone
      this.fireCone(playerX, playerY, 12, 0.85);
    } else if (type === 'ring') {
      // MORE AGGRESSIVE - denser ring burst
      this.fireRingBurst(24, 3);
      const playScene = this.game?.scenes?.play;
      playScene?.enemyManager?.spawnBossAdds(6);
    }
  }

  fireCone(playerX, playerY, shots = 7, spread = 0.6) {
    const bullets = [];
    for (let i = 0; i < shots; i++) {
      const t = (i / (shots - 1)) - 0.5;
      const angle = Math.atan2(playerY - this.y, playerX - this.x) + t * spread;
      const vx = Math.cos(angle) * BalanceConfig.difficulty.bossProjectileSpeedPhase2 * BalanceConfig.difficulty.pressureScalar;
      const vy = Math.sin(angle) * BalanceConfig.difficulty.bossProjectileSpeedPhase2 * BalanceConfig.difficulty.pressureScalar;
      bullets.push(new Bullet(this.x, this.y + 20, vx, vy, 1, this.color));
    }
    bullets.forEach(b => this.game.scenes.play.bulletManager.addEnemyBullet(b));
  }

  fireRingBurst(count = 16, gapSize = 2) {
    const bullets = [];
    for (let i = 0; i < count; i++) {
      if (i % gapSize === 0) continue;
      const angle = (i / count) * Math.PI * 2;
      const vx = Math.cos(angle) * BalanceConfig.difficulty.bossProjectileSpeedPhase3 * BalanceConfig.difficulty.pressureScalar;
      const vy = Math.sin(angle) * BalanceConfig.difficulty.bossProjectileSpeedPhase3 * BalanceConfig.difficulty.pressureScalar;
      bullets.push(new Bullet(this.x, this.y + 20, vx, vy, 1, this.color));
    }
    bullets.forEach(b => this.game.scenes.play.bulletManager.addEnemyBullet(b));
  }

  canShoot() {
    return this.shootCooldown <= 0;
  }

  shoot(playerX, playerY) {
    this.shootCooldown = this.shootDelay;
    const bullets = [];

    // Boss FX
    const killSwitch = typeof localStorage !== 'undefined' && localStorage.getItem("bs_disable_weapon_fx") === "1";
    const vConfig = (ENABLE_BOSS_WEAPON_FX && !killSwitch) ? { color: 'Red', index: 5 } : null;

    if (this.phase === 1) {
      // Single aimed shot
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const speed = BalanceConfig.difficulty.bossProjectileSpeedPhase1 * BalanceConfig.difficulty.pressureScalar;
      bullets.push(new Bullet(
        this.x,
        this.y,
        (dx / distance) * speed,
        (dy / distance) * speed,
        1,
        this.color,
        false,
        vConfig
      ));
    } else if (this.phase === 2) {
      // 5-shot spread (MORE AGGRESSIVE - wider coverage)
      for (let i = -2; i <= 2; i++) {
        const angle = Math.atan2(playerY - this.y, playerX - this.x) + i * 0.25;
        const speed = BalanceConfig.difficulty.bossProjectileSpeedPhase2 * BalanceConfig.difficulty.pressureScalar;
        bullets.push(new Bullet(
          this.x,
          this.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          1,
          this.color,
          false,
          vConfig
        ));
      }
    } else {
      // 12-bullet spiral (MORE AGGRESSIVE - denser pattern)
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12 + this.moveTimer * 0.05;
        const speed = BalanceConfig.difficulty.bossProjectileSpeedPhase3 * BalanceConfig.difficulty.pressureScalar;
        bullets.push(new Bullet(
          this.x,
          this.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          1,
          this.color,
          false,
          vConfig
        ));
      }
    }

    return bullets;
  }

  takeDamage(amount) {
    const now = Date.now();
    const invuln = now < this.invulnerableUntilMs;
    if (invuln) return false;
    const hpBefore = this.health;
    this.health -= amount;
    this.updateHealthBar();
    console.log(`[BossDamage] level=${this.level} hpBefore=${hpBefore} dmg=${amount} hpAfter=${this.health} invuln=${invuln}`);

    // Hit flash
    this.sprite.tint = 0xffffff;
    setTimeout(() => {
      if (this.sprite) this.sprite.tint = 0xffffff;
    }, 50);

    if (this.health <= 0) {
      this.active = false;
      return true; // Destroyed
    }
    return false;
  }

  destroy() {
    if (this.visualCleanup) {
      this.visualCleanup();
      this.visualCleanup = null;
    }
    this.active = false;
    // Also cleanup sprite from parent if needed, but Manager usually handles that
    if (this.sprite && this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite);
    }
  }
}
