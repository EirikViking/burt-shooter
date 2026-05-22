import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';
import { extendBossNames } from '../text/phrasePool.js';
import { createBossVisual } from '../game/BossFactory.js';
import { BalanceConfig } from '../config/BalanceConfig.js';
import { createText } from '../utils/pixiText.js';
import { getBossProfile } from '../config/BossRoster.js';
import { getBossSignatureWeaponProfile, getBossWeaponProfile, toBulletVisualConfig } from '../config/EnemyWeaponProfiles.js';
import { AudioManager } from '../audio/AudioManager.js';

const ENABLE_BOSS_WEAPON_FX = true;
const HARD_SCALE_FACTOR = 0.3;
const BOSS_PHASE_PLANS = {
  conductor: { signatures: { 2: 'cone', 3: 'ring' }, anchor: { 2: -0.12, 3: 0.14 }, lane: { 2: -0.01, 3: 0.02 } },
  forge: { signatures: { 2: 'ring', 3: 'cone' }, anchor: { 2: 0.1, 3: -0.12 }, lane: { 2: 0.02, 3: 0.04 } },
  mirror: { signatures: { 2: 'mirror', 3: 'lance' }, anchor: { 2: -0.14, 3: 0.14 }, lane: { 2: 0.01, 3: 0.03 } },
  needle: { signatures: { 2: 'lance', 3: 'mirror' }, anchor: { 2: 0.14, 3: -0.08 }, lane: { 2: -0.02, 3: 0.01 } },
  vortex: { signatures: { 2: 'ring', 3: 'cone' }, anchor: { 2: 0.08, 3: -0.14 }, lane: { 2: 0, 3: 0.03 } },
  jester: { signatures: { 2: 'cone', 3: 'mirror' }, anchor: { 2: -0.1, 3: 0.12 }, lane: { 2: -0.01, 3: 0.02 } },
  carrier: { signatures: { 2: 'adds', 3: 'ring' }, anchor: { 2: 0.12, 3: -0.1 }, lane: { 2: 0.02, 3: 0.04 } },
  monolith: { signatures: { 2: 'ring', 3: 'lance' }, anchor: { 2: 0, 3: 0.13 }, lane: { 2: 0.03, 3: 0.05 } },
  choir: { signatures: { 2: 'cone', 3: 'ring' }, anchor: { 2: -0.08, 3: 0.1 }, lane: { 2: -0.02, 3: 0.02 } },
  clock: { signatures: { 2: 'lance', 3: 'ring' }, anchor: { 2: 0.13, 3: -0.13 }, lane: { 2: 0, 3: 0.03 } }
};

const BOSS_HURT_FLASH_MS = 180;
const BOSS_FIRE_RECOIL_MS = 260;
const BOSS_PHASE_PULSE_MS = 860;

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
    this.health = Math.round(diff.bossBaseHealth + Math.max(0, level - 1) * diff.bossHealthPerLevel);
    this.health = Math.max(this.health, diff.bossMinHealth || 70);
    this.maxHealth = this.health;
    this.shootCooldown = 0;
    this.shootDelay = this.getPhaseShootDelay(1);
    this.moveTimer = 0;
    this.entryStartMs = null;
    this.entryDurationMs = 1000;
    this.entryFromY = 0;
    this.entryToY = 0;
    this.bossLaneY = 0;
    this.baseX = x;
    this.phaseAnchorOffset = 0;
    this.targetPhaseAnchorOffset = 0;
    this.phaseLaneYOffset = 0;
    this.phaseShiftStartedAt = 0;
    this.phaseShiftDurationMs = 900;
    this.moveProfile = null;
    this.noseOffset = 0;
    this.tauntPhase2Shown = false;
    this.tauntHalfShown = false;
    this.scoreValue = 1000;
    this.phase = 1;
    this.profile = getBossProfile(level);
    this.color = this.profile?.palette || 0xff00ff;
    this.signatureCooldown = 0;
    this.telegraph = null;
    this.regularTelegraph = null;
    this.safeLanes = [];
    this.phaseNotified = { 2: false, 3: false };
    this.spawnedAtMs = Date.now();
    this.regularAttackReadyAt = this.spawnedAtMs + (level <= 1 ? 1800 : 1400);
    this.invulnerableUntilMs = this.spawnedAtMs + 800;
    this.visualBaseScale = { x: 1, y: 1 };
    this.animationRig = null;
    this.animationDebug = null;
    this.presentationState = 'idle';
    this.presentationStateUntil = 0;
    this.hurtFlashUntil = 0;
    this.phasePulseUntil = 0;
    this.fireRecoilUntil = 0;
    this.lastHurtFxAt = 0;
    this.lastFireFxAt = 0;
    this.lastFireAngle = -Math.PI / 2;
    this.defeatPresentationAt = 0;

    // Boss names
    const bossNames = [
      'FORMATION FOREMAN',
      'QUARTER EATER',
      'HYPER POPCORN',
      'NEON OVERLORD',
      'BULLET AUDITOR PRIME',
      'GIGA HITBOX'
    ];
    const namePool = extendBossNames(bossNames);
    this.name = this.profile?.name || namePool[(level - 1) % namePool.length] || 'BOSS';

    // Note: createSprite() must be called manually after construction (it's async)
  }

  async createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.sortableChildren = true;
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Load boss visual from factory
    const maxBossWidth = this.game?.getWidth ? this.game.getWidth() * 0.55 : null;
    const bossVisual = await createBossVisual(this.level, maxBossWidth);
    this.profile = bossVisual.profile || this.profile;
    this.color = this.profile?.palette || this.color;
    this.name = this.profile?.name || this.name;
    this.visualContainer = bossVisual.container;
    this.bossType = bossVisual.kind;
    this.hitboxRef = bossVisual.hitboxRef; // Store hitbox reference
    this.visualCleanup = bossVisual.cleanup; // Store cleanup callback for ticker
    this.sprite.addChild(this.visualContainer);
    this.visualContainer.zIndex = 1;
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
    this.visualBaseScale = { x: this.visualContainer.scale.x, y: this.visualContainer.scale.y };
    console.log(`[BossScale] type=${this.bossType || 'UNKNOWN'} level=${this.level} finalScale=${this.visualContainer.scale.x.toFixed(3)}`);

    const postScaleBounds = this.hitboxRef?.getBounds ? this.hitboxRef.getBounds() : { width: 0, height: 0 };

    const bossHeight = Math.max(postScaleBounds.height, 1);
    this.baseX = gameWidth * 0.5;
    this.sprite.x = this.baseX;
    this.sprite.y = -bossHeight * 0.6;
    this.x = this.sprite.x;
    this.y = this.sprite.y;
    this.bossLaneY = clamp(gameHeight * 0.27, 155, 230);
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

    this.createBossAnimationRig();

    // Health bar overlay
    this.healthBar = new PIXI.Graphics();
    this.healthBar.zIndex = 5;
    this.sprite.addChild(this.healthBar);
    this.updateHealthBar();

    this.attackWarningLayer = new PIXI.Graphics();
    this.attackWarningLayer.zIndex = 4;
    this.sprite.addChild(this.attackWarningLayer);

    // Name display overlay
    this.nameText = createText(this.name, {
      fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
      fontSize: 20,
      fill: `#${(this.profile?.accent || 0xff4455).toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 3
    });
    this.nameText.anchor.set(0.5);
    this.nameText.y = -Math.min(this.radius + 30, 72);
    this.nameText.zIndex = 6;
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
    const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));

    this.healthBar.rect(-barWidth / 2, this.radius + 10, barWidth, barHeight);
    this.healthBar.fill({ color: 0x333333 });

    this.healthBar.rect(-barWidth / 2, this.radius + 10, barWidth * healthPercent, barHeight);
    this.healthBar.fill({ color: 0xff0000 });

    // Health text (no decimals)
    const healthText = `${Math.max(0, Math.ceil(this.health))}/${Math.ceil(this.maxHealth)}`;
    if (this.healthText?.parent) {
      this.healthText.parent.removeChild(this.healthText);
    }
    this.healthText = createText(healthText, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 12,
      fill: '#ffffff'
    });
    this.healthText.anchor.set(0.5);
    this.healthText.y = this.radius + 14;
    if (this.sprite) {
      this.sprite.addChild(this.healthText);
    }
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

    // Phase transitions
    if (this.health < this.maxHealth * 0.75 && this.phase === 1) {
      this.phase = 2;
      this.shootDelay = this.getPhaseShootDelay(2);
      this.color = this.profile?.accent || 0xff8800;
      this.startPhaseChange(2, playerX, playerY);
      if (!this.tauntPhase2Shown) {
        const playScene = this.game?.scenes?.play;
        if (playScene?.showBossTaunt) playScene.showBossTaunt('boss_phase2');
        this.tauntPhase2Shown = true;
      }
    } else if (this.health < this.maxHealth * 0.40 && this.phase === 2) {
      this.phase = 3;
      this.shootDelay = this.getPhaseShootDelay(3);
      this.color = this.profile?.palette || 0xff0000;
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
    this.updateBossAnimation(delta, playerX, playerY);

    if (this.signatureCooldown > 0) {
      this.signatureCooldown -= delta;
    }

    if (this.telegraph) {
      const elapsed = Date.now() - this.telegraph.start;
      const progress = clamp(elapsed / this.telegraph.duration, 0, 1);
      this.clearRegularAttackTelegraphVisual();
      this.updateTelegraphVisual(progress, playerX, playerY);
      if (this.nameText) {
        this.nameText.alpha = 1;
      }
      if (elapsed > this.telegraph.duration) {
        this.clearTelegraphVisual();
        this.executeSignatureMove(this.telegraph.type, playerX, playerY);
        this.telegraph = null;
      }
    } else if (this.nameText) {
      this.nameText.alpha = 1;
      this.clearTelegraphVisual();
      if (this.regularTelegraph) {
        const elapsed = Date.now() - this.regularTelegraph.start;
        const progress = clamp(elapsed / this.regularTelegraph.duration, 0, 1);
        this.updateRegularAttackTelegraphVisual(progress, playerX, playerY);
      } else {
        this.clearRegularAttackTelegraphVisual();
      }
    }

    // Shooting cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= delta;
    }
  }

  getMoveProfile(bossType) {
    const base = {
      profile: 'sway',
      swayAmpX: 0.14,
      swayFreq: 0.72,
      bobAmpY: 0.018,
      bobFreq: 1.05,
      secondaryAmpX: 0.04,
      secondaryFreq: 1.6,
      plungeAmpY: 0.04,
      stalkStrength: 0.16,
      stepCount: 5,
      rotateMode: 'slow',
      rotateSpeed: 0.3,
      aimStrength: 0.6
    };

    const profile = this.profile?.movement;
    if (profile === 'orchestrate') {
      return { ...base, profile: 'conductor_baton', swayAmpX: 0.19, swayFreq: 0.46, bobAmpY: 0.016, bobFreq: 1.22, secondaryAmpX: 0.075, secondaryFreq: 1.85, rotateMode: 'slow', rotateSpeed: 0.14 };
    }
    if (profile === 'hammer') {
      return { ...base, profile: 'forge_hammer', swayAmpX: 0.085, swayFreq: 0.62, bobAmpY: 0.018, plungeAmpY: 0.095, rotateMode: 'aimToPlayer', rotateSpeed: 2.0, aimStrength: 0.55 };
    }
    if (profile === 'phase') {
      return { ...base, profile: 'mirror_phase', swayAmpX: 0.24, swayFreq: 0.38, bobAmpY: 0.018, bobFreq: 1.6, stepCount: 4, rotateMode: 'slow', rotateSpeed: 0.34 };
    }
    if (profile === 'stalk') {
      return { ...base, profile: 'needle_stalk', swayAmpX: 0.09, swayFreq: 1.05, bobAmpY: 0.014, bobFreq: 1.3, stalkStrength: 0.52, rotateMode: 'aimToPlayer', rotateSpeed: 3.0, aimStrength: 0.82 };
    }
    if (profile === 'orbit') {
      return { ...base, profile: 'vortex_orbit', swayAmpX: 0.2, swayFreq: 0.72, bobAmpY: 0.05, bobFreq: 1.15, secondaryAmpX: 0.06, secondaryFreq: 2.2, rotateMode: 'slow', rotateSpeed: 0.34 };
    }
    if (profile === 'juke') {
      return { ...base, profile: 'jester_juke', swayAmpX: 0.24, swayFreq: 1.28, bobAmpY: 0.025, bobFreq: 1.8, secondaryAmpX: 0.09, secondaryFreq: 3.1, rotateMode: 'aimToPlayer', rotateSpeed: 3.2, aimStrength: 0.72 };
    }
    if (profile === 'carrier') {
      return { ...base, profile: 'carrier_drift', swayAmpX: 0.115, swayFreq: 0.34, bobAmpY: 0.013, bobFreq: 0.62, secondaryAmpX: 0.035, secondaryFreq: 1.1, rotateMode: 'slow', rotateSpeed: 0.1 };
    }
    if (profile === 'crush') {
      return { ...base, profile: 'monolith_crush', swayAmpX: 0.07, swayFreq: 0.5, bobAmpY: 0.012, plungeAmpY: 0.11, stepCount: 3, rotateMode: 'aimToPlayer', rotateSpeed: 1.55, aimStrength: 0.45 };
    }
    if (profile === 'sway') {
      return { ...base, profile: 'choir_wave', swayAmpX: 0.18, swayFreq: 0.78, bobAmpY: 0.034, bobFreq: 1.42, secondaryAmpX: 0.08, secondaryFreq: 2.55, rotateMode: 'slow', rotateSpeed: 0.22 };
    }
    if (profile === 'tick') {
      return { ...base, profile: 'clock_step', swayAmpX: 0.22, swayFreq: 0.88, bobAmpY: 0.02, bobFreq: 1.0, stepCount: 6, rotateMode: 'aimToPlayer', rotateSpeed: 2.6, aimStrength: 0.66 };
    }

    if (!bossType) return base;
    if (bossType === 'BONUS_CORE') {
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
    if (bossType === 'BONUS_CORE') return 0;
    if (bossType === 'ICON_192') return 0;
    return 0;
  }

  createBossAnimationRig() {
    if (!this.sprite) return;
    if (this.animationRig?.root?.parent) {
      this.animationRig.root.parent.removeChild(this.animationRig.root);
    }

    const radius = Math.max(58, Math.min(150, this.radius || 80));
    const palette = this.profile?.palette || this.color || 0xff55d9;
    const accent = this.profile?.accent || 0x37f5ff;
    const root = new PIXI.Container();
    root.sortableChildren = true;
    root.zIndex = 2;

    const backLayer = new PIXI.Graphics();
    backLayer.zIndex = -2;
    const engineLayer = new PIXI.Graphics();
    engineLayer.zIndex = -1;
    const frontLayer = new PIXI.Graphics();
    frontLayer.zIndex = 3;
    const scanLayer = new PIXI.Graphics();
    scanLayer.zIndex = 4;
    const impactLayer = new PIXI.Graphics();
    impactLayer.zIndex = 5;
    impactLayer.blendMode = 'add';

    const leftFin = this.createBossFin(-1, radius, palette, accent);
    const rightFin = this.createBossFin(1, radius, palette, accent);
    leftFin.zIndex = 1;
    rightFin.zIndex = 1;

    const leftMandible = this.createBossMandible(-1, radius, palette, accent);
    const rightMandible = this.createBossMandible(1, radius, palette, accent);
    leftMandible.zIndex = 3;
    rightMandible.zIndex = 3;

    const weaponNodes = [];
    const nodeCount = this.profile?.archetype === 'carrier' ? 4 : this.profile?.archetype === 'needle' ? 3 : 3;
    for (let i = 0; i < nodeCount; i += 1) {
      const node = new PIXI.Graphics();
      node.circle(0, 0, Math.max(5, radius * 0.055));
      node.fill({ color: accent, alpha: 0.52 });
      node.circle(0, 0, Math.max(8, radius * 0.085));
      node.stroke({ color: palette, width: 2, alpha: 0.38 });
      node.zIndex = 4;
      root.addChild(node);
      weaponNodes.push(node);
    }

    root.addChild(backLayer);
    root.addChild(engineLayer);
    root.addChild(leftFin);
    root.addChild(rightFin);
    root.addChild(leftMandible);
    root.addChild(rightMandible);
    root.addChild(frontLayer);
    root.addChild(scanLayer);
    root.addChild(impactLayer);
    this.sprite.addChild(root);

    this.animationRig = {
      root,
      backLayer,
      engineLayer,
      frontLayer,
      scanLayer,
      impactLayer,
      leftFin,
      rightFin,
      leftMandible,
      rightMandible,
      weaponNodes,
      radius,
      palette,
      accent
    };
  }

  createBossFin(side, radius, palette, accent) {
    const fin = new PIXI.Graphics();
    const width = radius * 0.42;
    const height = radius * 0.72;
    fin.poly([
      0, -height * 0.58,
      side * width, -height * 0.18,
      side * width * 0.76, height * 0.54,
      0, height * 0.24
    ]);
    fin.fill({ color: palette, alpha: 0.2 });
    fin.poly([
      0, -height * 0.58,
      side * width, -height * 0.18,
      side * width * 0.76, height * 0.54,
      0, height * 0.24
    ]);
    fin.stroke({ color: accent, width: 3, alpha: 0.62 });
    fin.x = side * radius * 0.78;
    fin.y = radius * 0.08;
    return fin;
  }

  createBossMandible(side, radius, palette, accent) {
    const mandible = new PIXI.Graphics();
    const length = radius * 0.56;
    const width = radius * 0.13;
    mandible.roundRect(-width / 2, 0, width, length, Math.max(4, width * 0.45));
    mandible.fill({ color: palette, alpha: 0.22 });
    mandible.roundRect(-width / 2, 0, width, length, Math.max(4, width * 0.45));
    mandible.stroke({ color: accent, width: 2, alpha: 0.72 });
    mandible.x = side * radius * 0.28;
    mandible.y = radius * 0.22;
    mandible.rotation = side * 0.18;
    return mandible;
  }

  setPresentationState(state, durationMs = 240) {
    const until = Date.now() + Math.max(0, durationMs);
    this.presentationState = state;
    this.presentationStateUntil = Math.max(this.presentationStateUntil || 0, until);
  }

  getPresentationState(now = Date.now()) {
    if (this.health <= 0 || this.defeatPresentationAt > 0) return 'death';
    if (now < this.phasePulseUntil) return 'phaseChange';
    if (this.telegraph) return 'charge';
    if (now < this.fireRecoilUntil) return 'firing';
    if (now < this.hurtFlashUntil) return 'hurt';
    if (now < this.presentationStateUntil) return this.presentationState;
    return 'idle';
  }

  triggerFirePresentation(type = 'attack', signature = false, playerX = this.x, playerY = this.y + 300) {
    const now = Date.now();
    const angle = Math.atan2(playerY - this.y, playerX - this.x);
    this.lastFireAngle = Number.isFinite(angle) ? angle : this.lastFireAngle;
    this.fireRecoilUntil = now + (signature ? BOSS_FIRE_RECOIL_MS + 120 : BOSS_FIRE_RECOIL_MS);
    this.setPresentationState('firing', signature ? 380 : 240);

    const playScene = this.game?.scenes?.play;
    if (playScene?.particleManager && now - this.lastFireFxAt > 90) {
      this.lastFireFxAt = now;
      const color = signature ? (this.profile?.accent || 0xffffff) : (this.profile?.palette || this.color || 0xffffff);
      playScene.particleManager.createMuzzleFlash(this.x, this.y + 18, this.lastFireAngle, color);
    }
    if (signature && playScene?.screenShake) {
      playScene.screenShake.shake(4, 12);
    }
  }

  triggerHurtPresentation(amount = 1) {
    const now = Date.now();
    this.hurtFlashUntil = now + BOSS_HURT_FLASH_MS;
    this.setPresentationState('hurt', BOSS_HURT_FLASH_MS);
    const playScene = this.game?.scenes?.play;
    if (playScene?.particleManager && now - this.lastHurtFxAt > 80) {
      this.lastHurtFxAt = now;
      const radius = Math.max(40, this.radius || 70);
      const angle = ((now * 0.017) % (Math.PI * 2)) + amount * 0.11;
      const x = this.x + Math.cos(angle) * radius * 0.42;
      const y = this.y + Math.sin(angle) * radius * 0.28;
      playScene.particleManager.createHitSpark(x, y, this.profile?.accent || 0xffff00, 1.15);
    }
  }

  triggerDefeatPresentation() {
    if (this.defeatPresentationAt > 0) return;
    this.defeatPresentationAt = Date.now();
    this.setPresentationState('death', 640);
    const playScene = this.game?.scenes?.play;
    const color = this.profile?.accent || this.color || 0xffff33;
    playScene?.particleManager?.createBossExplosion(this.x, this.y, color);
    playScene?.triggerShockwave?.(this.x, this.y, color);
    playScene?.screenShake?.shake(8, 20);
  }

  updateBossAnimation(delta, playerX, playerY) {
    if (!this.animationRig || !this.visualContainer) return;
    const rig = this.animationRig;
    const now = Date.now();
    const t = this.moveTimer * 0.032;
    const phaseBoost = 1 + (this.phase - 1) * 0.08;
    const telegraphProgress = this.telegraph
      ? clamp((now - this.telegraph.start) / this.telegraph.duration, 0, 1)
      : this.regularTelegraph
        ? clamp((now - this.regularTelegraph.start) / this.regularTelegraph.duration, 0, 1) * 0.65
        : 0;
    const hurtProgress = clamp((this.hurtFlashUntil - now) / BOSS_HURT_FLASH_MS, 0, 1);
    const recoilProgress = clamp((this.fireRecoilUntil - now) / BOSS_FIRE_RECOIL_MS, 0, 1);
    const phaseProgress = clamp((this.phasePulseUntil - now) / BOSS_PHASE_PULSE_MS, 0, 1);
    const presentationState = this.getPresentationState(now);
    const rage = 1 - clamp(this.health / Math.max(1, this.maxHealth), 0, 1);
    const intensity = 1 + telegraphProgress * 0.18 + hurtProgress * 0.22 + recoilProgress * 0.12 + phaseProgress * 0.18 + rage * 0.12 + (this.phase - 1) * 0.04;
    const radius = rig.radius;
    const palette = rig.palette;
    const accent = rig.accent;
    const archetype = this.profile?.archetype || 'boss';

    const fireSquash = recoilProgress * 0.045;
    const hurtSnap = hurtProgress * 0.055;
    const phaseSwell = phaseProgress * 0.035;
    const bodyPulse = 1 + Math.sin(t * (archetype === 'clock' ? 1.6 : 0.85)) * 0.01 * intensity + hurtSnap + phaseSwell;
    const bodyStretch = Math.cos(t * 0.7) * 0.006 * intensity + fireSquash;
    this.visualContainer.scale.set(
      this.visualBaseScale.x * (bodyPulse + bodyStretch),
      this.visualBaseScale.y * (bodyPulse - bodyStretch * 0.5 + recoilProgress * 0.018)
    );
    const recoilDistance = recoilProgress * radius * 0.045;
    const hurtJitter = hurtProgress * radius * 0.018;
    this.visualContainer.x = -Math.cos(this.lastFireAngle) * recoilDistance + Math.sin(now * 0.09) * hurtJitter;
    this.visualContainer.y = -Math.sin(this.lastFireAngle) * recoilDistance + Math.cos(now * 0.11) * hurtJitter;
    this.visualContainer.alpha = clamp(1 - hurtProgress * 0.14 + phaseProgress * 0.05, 0.82, 1);
    this.visualContainer.skew.x = Math.sin(t * 0.55 + this.phase) * 0.005 * intensity;
    this.visualContainer.skew.y = Math.cos(t * 0.42) * 0.003 * intensity;

    const finFlap = Math.sin(t * (archetype === 'jester' ? 1.6 : 0.95) + telegraphProgress * Math.PI * 0.35) * 0.08 * intensity;
    rig.leftFin.rotation = -0.16 + finFlap;
    rig.rightFin.rotation = 0.16 - finFlap;
    rig.leftFin.scale.set(1 + Math.max(0, Math.sin(t * 0.9)) * 0.025 * intensity, 1);
    rig.rightFin.scale.set(1 + Math.max(0, Math.cos(t * 0.9)) * 0.025 * intensity, 1);

    const bite = 0.045 + telegraphProgress * 0.12 + (archetype === 'needle' ? 0.04 : 0);
    rig.leftMandible.rotation = -0.16 - Math.sin(t * 1.9) * bite;
    rig.rightMandible.rotation = 0.16 + Math.sin(t * 1.9) * bite;
    rig.leftMandible.y = radius * (0.22 + Math.max(0, Math.sin(t * 1.0)) * 0.025 * intensity);
    rig.rightMandible.y = radius * (0.22 + Math.max(0, Math.cos(t * 1.0)) * 0.025 * intensity);

    rig.engineLayer.clear();
    const exhaust = (0.46 + Math.max(0, Math.sin(t * 1.4)) * 0.12 + telegraphProgress * 0.12) * intensity;
    for (let i = -1; i <= 1; i += 1) {
      const x = i * radius * 0.18;
      const len = radius * (0.24 + exhaust * 0.15 + (i === 0 ? 0.04 : 0));
      rig.engineLayer.moveTo(x, radius * 0.36);
      rig.engineLayer.lineTo(x + Math.sin(t * 1.2 + i) * radius * 0.018, radius * 0.36 + len);
      rig.engineLayer.stroke({ color: i === 0 ? 0xffffff : accent, width: i === 0 ? 3 : 2, alpha: i === 0 ? 0.18 : 0.3 });
      rig.engineLayer.circle(x, radius * 0.4 + len * 0.82, radius * 0.025 + exhaust * 1.2);
      rig.engineLayer.fill({ color: palette, alpha: 0.08 + exhaust * 0.04 });
    }

    rig.backLayer.clear();
    const ringCount = archetype === 'vortex' || archetype === 'clock' ? 2 : 1;
    for (let i = 0; i < ringCount; i += 1) {
      const ringRadius = radius * (0.76 + i * 0.2 + Math.sin(t + i) * 0.008 + telegraphProgress * 0.025);
      rig.backLayer.circle(0, 0, ringRadius);
      rig.backLayer.stroke({
        color: i % 2 ? palette : accent,
        width: i === 0 ? 2 : 1,
        alpha: (0.11 + telegraphProgress * 0.1) / (i + 1)
      });
    }

    rig.frontLayer.clear();
    const coreRadius = radius * (0.12 + Math.max(0, Math.sin(t * 1.05)) * 0.012 + telegraphProgress * 0.025);
    rig.frontLayer.circle(0, 0, coreRadius);
    rig.frontLayer.fill({ color: accent, alpha: 0.18 + telegraphProgress * 0.12 });
    rig.frontLayer.circle(0, 0, coreRadius * 1.9);
    rig.frontLayer.stroke({ color: 0xffffff, width: 2, alpha: 0.16 + telegraphProgress * 0.14 });
    this.drawArchetypeBossAnimation(rig, archetype, t, intensity, telegraphProgress, playerX, playerY);

    rig.weaponNodes.forEach((node, index) => {
      const nodePhase = t * (archetype === 'clock' ? 0.34 : 0.28) + index * ((Math.PI * 2) / rig.weaponNodes.length);
      const orbitRadius = radius * (0.48 + Math.sin(t * 0.45 + index) * 0.015 + telegraphProgress * 0.06);
      node.x = Math.cos(nodePhase) * orbitRadius;
      node.y = Math.sin(nodePhase) * orbitRadius * (archetype === 'carrier' ? 0.36 : 0.46);
      node.scale.set((0.78 + Math.sin(t * 0.9 + index) * 0.04 + telegraphProgress * 0.08) * phaseBoost);
      node.alpha = 0.4 + Math.sin(t * 0.75 + index) * 0.06 + telegraphProgress * 0.1;
      if (archetype === 'needle' && index === 1) {
        node.y -= radius * (0.08 + telegraphProgress * 0.06);
      }
    });
    this.drawBossPresentationLayer(rig, t, {
      hurtProgress,
      recoilProgress,
      phaseProgress,
      telegraphProgress,
      presentationState
    });

    rig.scanLayer.clear();
    const scanY = -radius * 0.62 + ((t * 15) % (radius * 1.24));
    rig.scanLayer.moveTo(-radius * 0.68, scanY);
    rig.scanLayer.lineTo(radius * 0.68, scanY + Math.sin(t) * radius * 0.018);
    rig.scanLayer.stroke({ color: 0xffffff, width: 1, alpha: 0.09 + telegraphProgress * 0.09 });

    this.animationDebug = {
      archetype,
      bodyPulse: Number(bodyPulse.toFixed(3)),
      finFlap: Number(finFlap.toFixed(3)),
      exhaust: Number(exhaust.toFixed(3)),
      coreRadius: Math.round(coreRadius),
      nodeCount: rig.weaponNodes.length,
      telegraph: Number(telegraphProgress.toFixed(3)),
      state: presentationState,
      hurt: Number(hurtProgress.toFixed(3)),
      recoil: Number(recoilProgress.toFixed(3)),
      phasePulse: Number(phaseProgress.toFixed(3)),
      phase: this.phase
    };
  }

  drawArchetypeBossAnimation(rig, archetype, t, intensity, telegraphProgress, playerX, playerY) {
    const radius = rig.radius;
    const palette = rig.palette;
    const accent = rig.accent;
    const layer = rig.frontLayer;
    const state = this.getPresentationState();
    const action = telegraphProgress + (state === 'firing' ? 0.55 : 0) + (state === 'phaseChange' ? 0.35 : 0);

    if (archetype === 'conductor' || archetype === 'choir') {
      const baton = Math.sin(t * (0.9 + action * 0.5)) * (0.22 + action * 0.08);
      layer.moveTo(Math.cos(baton) * -radius * 0.46, -radius * 0.16);
      layer.lineTo(Math.cos(baton) * radius * 0.52, radius * (0.12 + telegraphProgress * 0.06));
      layer.stroke({ color: accent, width: 2 + action * 1.2, alpha: 0.28 + telegraphProgress * 0.16 });
      for (let i = 0; i < 3; i += 1) {
        const y = -radius * 0.32 + i * radius * 0.18;
        layer.moveTo(-radius * 0.36, y + Math.sin(t + i) * radius * 0.012);
        layer.lineTo(radius * 0.36, y + Math.cos(t + i) * radius * 0.012);
      }
      layer.stroke({ color: palette, width: 1, alpha: 0.1 + action * 0.08 });
    } else if (archetype === 'forge' || archetype === 'monolith') {
      const slam = Math.pow(Math.max(0, Math.sin(t * 0.72)), 5) * radius * (0.08 + action * 0.04);
      for (const side of [-1, 1]) {
        layer.roundRect(side * radius * 0.34 - 5, -radius * 0.52 + slam, 10, radius * 0.72, 5);
        layer.fill({ color: palette, alpha: 0.12 + telegraphProgress * 0.08 });
        layer.roundRect(side * radius * 0.34 - 5, -radius * 0.52 + slam, 10, radius * 0.72, 5);
        layer.stroke({ color: accent, width: 1.5 + action, alpha: 0.32 + action * 0.14 });
      }
      layer.circle(0, radius * 0.28 + slam, radius * (0.08 + action * 0.04));
      layer.fill({ color: accent, alpha: 0.08 + action * 0.1 });
    } else if (archetype === 'mirror') {
      const flicker = 0.1 + Math.max(0, Math.sin(t * 1.4)) * 0.08 + telegraphProgress * 0.1;
      for (const side of [-1, 1]) {
        const x = (side < 0 ? -radius * 0.74 : radius * 0.42) + Math.sin(t * 1.7 + side) * radius * 0.02 * (1 + action);
        layer.roundRect(x, -radius * 0.36, radius * 0.32, radius * 0.72, 10);
        layer.stroke({ color: side < 0 ? accent : palette, width: 2 + action, alpha: flicker + action * 0.08 });
      }
    } else if (archetype === 'needle') {
      const aim = Math.atan2(playerY - this.y, playerX - this.x) - this.visualContainer.rotation + Math.sin(t * 4.7) * 0.018 * (1 + action);
      const len = radius * (0.52 + telegraphProgress * 0.22);
      layer.moveTo(Math.cos(aim) * radius * 0.1, Math.sin(aim) * radius * 0.1);
      layer.lineTo(Math.cos(aim) * len, Math.sin(aim) * len);
      layer.stroke({ color: 0xffffff, width: 3, alpha: 0.12 + telegraphProgress * 0.18 });
      layer.moveTo(Math.cos(aim) * radius * 0.1, Math.sin(aim) * radius * 0.1);
      layer.lineTo(Math.cos(aim) * len, Math.sin(aim) * len);
      layer.stroke({ color: accent, width: 1.5, alpha: 0.36 + telegraphProgress * 0.14 });
    } else if (archetype === 'vortex') {
      for (let i = 0; i < 4; i += 1) {
        const a = t * (0.55 + action * 0.35) + i * Math.PI / 2;
        layer.moveTo(Math.cos(a) * radius * 0.18, Math.sin(a) * radius * 0.18);
        layer.lineTo(Math.cos(a + 0.25) * radius * (0.58 + action * 0.08), Math.sin(a + 0.25) * radius * (0.38 + action * 0.05));
      }
      layer.stroke({ color: accent, width: 1.5, alpha: 0.22 + telegraphProgress * 0.1 });
    } else if (archetype === 'jester') {
      for (let i = 0; i < 3; i += 1) {
        const bounce = Math.abs(Math.sin(t * 1.2 + i)) * radius * 0.05 * (1 + action);
        const x = (i - 1) * radius * 0.22 + Math.sin(t * 1.2 + i) * radius * 0.016;
        layer.circle(x, -radius * 0.22 + Math.cos(t * 1.0 + i) * radius * 0.03 - bounce, radius * 0.032);
        layer.fill({ color: i % 2 ? palette : accent, alpha: 0.18 + telegraphProgress * 0.1 });
      }
    } else if (archetype === 'carrier') {
      for (const side of [-1, 1]) {
        const door = (0.05 + Math.max(0, Math.sin(t * 0.8)) * 0.05 + telegraphProgress * 0.08) * side;
        layer.roundRect(side * radius * 0.18 + door * radius, radius * 0.03, radius * 0.18, radius * 0.32, 8);
        layer.stroke({ color: accent, width: 1.5, alpha: 0.24 + telegraphProgress * 0.12 });
      }
      for (let i = 0; i < 4; i += 1) {
        const x = (i - 1.5) * radius * 0.16;
        const y = radius * (0.24 + Math.sin(t * 1.1 + i) * 0.025);
        layer.circle(x, y, radius * (0.018 + action * 0.008));
      }
      layer.fill({ color: accent, alpha: 0.18 + action * 0.12 });
    } else if (archetype === 'clock') {
      for (let i = 0; i < 8; i += 1) {
        const a = i * Math.PI / 4 + Math.floor(t * 0.9) * 0.12;
        layer.moveTo(Math.cos(a) * radius * 0.42, Math.sin(a) * radius * 0.42);
        layer.lineTo(Math.cos(a) * radius * 0.58, Math.sin(a) * radius * 0.58);
      }
      layer.stroke({ color: accent, width: 2, alpha: 0.26 + telegraphProgress * 0.1 });
      const hand = Math.floor(t * 1.2) * (Math.PI / 6);
      layer.moveTo(0, 0);
      layer.lineTo(Math.cos(hand) * radius * 0.48, Math.sin(hand) * radius * 0.48);
      layer.stroke({ color: 0xffffff, width: 2 + action, alpha: 0.22 + action * 0.16 });
    }
  }

  drawBossPresentationLayer(rig, t, state) {
    const layer = rig.impactLayer;
    if (!layer) return;
    layer.clear();

    const radius = rig.radius;
    const palette = rig.palette;
    const accent = rig.accent;
    const {
      hurtProgress = 0,
      recoilProgress = 0,
      phaseProgress = 0,
      telegraphProgress = 0,
      presentationState = 'idle'
    } = state || {};

    if (phaseProgress > 0) {
      const phaseAge = 1 - phaseProgress;
      for (let i = 0; i < 3; i += 1) {
        const p = clamp(phaseAge + i * 0.18, 0, 1);
        const r = radius * (0.58 + p * 0.72);
        layer.circle(0, 0, r);
        layer.stroke({ color: i % 2 ? palette : accent, width: 3 - i * 0.4, alpha: (0.32 - i * 0.06) * phaseProgress });
      }
    }

    if (telegraphProgress > 0.2) {
      for (const node of rig.weaponNodes || []) {
        const spark = 1 + Math.sin(t * 2.6 + node.x * 0.02) * 0.12;
        layer.circle(node.x, node.y, radius * (0.035 + telegraphProgress * 0.018) * spark);
      }
      layer.fill({ color: 0xffffff, alpha: 0.06 + telegraphProgress * 0.12 });
    }

    if (recoilProgress > 0) {
      const length = radius * (0.5 + recoilProgress * 0.52);
      const spread = 0.18 + recoilProgress * 0.08;
      const start = radius * 0.14;
      const angle = this.lastFireAngle;
      const points = [
        Math.cos(angle) * start,
        Math.sin(angle) * start,
        Math.cos(angle - spread) * length,
        Math.sin(angle - spread) * length,
        Math.cos(angle) * length * 1.12,
        Math.sin(angle) * length * 1.12,
        Math.cos(angle + spread) * length,
        Math.sin(angle + spread) * length
      ];
      layer.poly(points);
      layer.fill({ color: presentationState === 'charge' ? accent : palette, alpha: 0.08 + recoilProgress * 0.14 });
      layer.moveTo(Math.cos(angle) * start, Math.sin(angle) * start);
      layer.lineTo(Math.cos(angle) * length * 1.18, Math.sin(angle) * length * 1.18);
      layer.stroke({ color: 0xffffff, width: 4 + recoilProgress * 4, alpha: 0.18 + recoilProgress * 0.28 });
      layer.moveTo(Math.cos(angle) * start, Math.sin(angle) * start);
      layer.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
      layer.stroke({ color: accent, width: 2 + recoilProgress * 3, alpha: 0.38 + recoilProgress * 0.3 });
    }

    if (hurtProgress > 0) {
      layer.circle(0, 0, radius * (0.48 + hurtProgress * 0.08));
      layer.fill({ color: 0xffffff, alpha: 0.08 * hurtProgress });
      const shards = 7;
      for (let i = 0; i < shards; i += 1) {
        const angle = (Math.PI * 2 * i) / shards + Math.sin(t + i) * 0.18;
        const r1 = radius * (0.34 + 0.04 * (i % 2));
        const r2 = radius * (0.76 + hurtProgress * 0.18);
        layer.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
        layer.lineTo(Math.cos(angle + 0.05) * r2, Math.sin(angle + 0.05) * r2);
      }
      layer.stroke({ color: 0xffffff, width: 2.4, alpha: 0.38 * hurtProgress });
      for (let i = 0; i < 4; i += 1) {
        const angle = t * 0.9 + i * Math.PI * 0.5;
        layer.circle(Math.cos(angle) * radius * 0.62, Math.sin(angle) * radius * 0.38, 3 + hurtProgress * 4);
      }
      layer.fill({ color: accent, alpha: 0.28 * hurtProgress });
    }
  }

  getAnimationDebugState() {
    return this.animationDebug || null;
  }

  applyBossMovement(delta, playerX, playerY) {
    const profile = this.moveProfile || this.getMoveProfile(this.bossType);
    const t = this.moveTimer * 0.02;
    const gameWidth = this.game?.getWidth ? this.game.getWidth() : 800;
    const gameHeight = this.game?.getHeight ? this.game.getHeight() : 600;
    const phaseIntensity = 1 + (this.phase - 1) * 0.12;
    const swayAmp = gameWidth * profile.swayAmpX * phaseIntensity;
    const bobAmp = gameHeight * profile.bobAmpY * (1 + (this.phase - 1) * 0.08);
    const shiftStep = clamp(delta / 45, 0, 1);
    this.phaseAnchorOffset += (this.targetPhaseAnchorOffset - this.phaseAnchorOffset) * shiftStep;
    const anchorX = clamp(this.baseX + this.phaseAnchorOffset, gameWidth * 0.18, gameWidth * 0.82);
    const laneY = clamp(this.bossLaneY + this.phaseLaneYOffset, gameHeight * 0.18, gameHeight * 0.36);

    switch (profile.profile) {
      case 'vortex_orbit':
        this.x = anchorX + Math.sin(t * profile.swayFreq * phaseIntensity) * swayAmp;
        this.y = laneY + Math.cos(t * profile.bobFreq * phaseIntensity) * bobAmp + Math.sin(t * profile.secondaryFreq) * (gameHeight * 0.012);
        break;
      case 'forge_hammer': {
        const windup = Math.max(0, Math.sin(t * (0.72 + this.phase * 0.06)));
        const push = Math.pow(windup, 5) * (gameHeight * profile.plungeAmpY);
        this.x = anchorX + Math.sin(t * profile.swayFreq * phaseIntensity) * swayAmp;
        this.y = laneY + Math.sin(t * profile.bobFreq * phaseIntensity) * bobAmp + push;
        break;
      }
      case 'mirror_phase': {
        const raw = Math.sin(t * profile.swayFreq * phaseIntensity);
        const phaseStep = Math.round(raw * profile.stepCount) / profile.stepCount;
        const shimmer = Math.sin(t * profile.secondaryFreq + this.level) * (swayAmp * 0.08);
        this.x = anchorX + phaseStep * swayAmp + shimmer;
        this.y = laneY + Math.sin(t * profile.bobFreq * phaseIntensity) * bobAmp;
        break;
      }
      case 'needle_stalk': {
        const playerBias = clamp((playerX - anchorX) * profile.stalkStrength, -swayAmp * 0.85, swayAmp * 0.85);
        const scan = Math.sin(t * profile.swayFreq * phaseIntensity) * (swayAmp * 0.42);
        this.x = anchorX + playerBias + scan;
        this.y = laneY + Math.sin(t * profile.bobFreq * phaseIntensity) * bobAmp;
        break;
      }
      case 'jester_juke': {
        const fast = Math.sin(t * profile.swayFreq * phaseIntensity);
        const snap = Math.sign(Math.sin(t * 0.42)) * 0.18;
        const twitch = Math.sin(t * profile.secondaryFreq) * (swayAmp * profile.secondaryAmpX / Math.max(0.01, profile.swayAmpX));
        this.x = anchorX + (fast + snap) * swayAmp + twitch;
        this.y = laneY + Math.sin(t * profile.bobFreq * phaseIntensity) * bobAmp + Math.sin(t * 3.7) * (gameHeight * 0.008);
        break;
      }
      case 'carrier_drift':
        this.x = anchorX + Math.sin(t * profile.swayFreq * phaseIntensity) * swayAmp + Math.sin(t * profile.secondaryFreq) * (swayAmp * 0.28);
        this.y = laneY + Math.sin(t * profile.bobFreq * phaseIntensity) * bobAmp;
        break;
      case 'monolith_crush': {
        const lane = Math.round(Math.sin(t * profile.swayFreq) * profile.stepCount) / profile.stepCount;
        const slam = Math.pow(Math.max(0, Math.sin(t * (0.55 + this.phase * 0.04))), 7) * (gameHeight * profile.plungeAmpY);
        this.x = anchorX + lane * swayAmp;
        this.y = laneY + slam + Math.sin(t * profile.bobFreq) * bobAmp;
        break;
      }
      case 'choir_wave':
        this.x = anchorX
          + Math.sin(t * profile.swayFreq * phaseIntensity) * swayAmp
          + Math.sin(t * profile.secondaryFreq + Math.PI / 3) * (gameWidth * profile.secondaryAmpX);
        this.y = laneY + Math.sin(t * profile.bobFreq * phaseIntensity) * bobAmp;
        break;
      case 'clock_step': {
        const segment = Math.floor((t * (0.92 + this.phase * 0.08)) % profile.stepCount);
        const normalized = profile.stepCount <= 1 ? 0 : (segment / (profile.stepCount - 1)) * 2 - 1;
        const tickEase = Math.pow(Math.abs(Math.sin(t * Math.PI * 0.92)), 0.35);
        const tickY = (segment % 2 === 0 ? -1 : 1) * bobAmp * 0.7;
        this.x = anchorX + normalized * swayAmp * tickEase;
        this.y = laneY + tickY + Math.sin(t * profile.bobFreq) * (bobAmp * 0.35);
        break;
      }
      case 'conductor_baton':
        this.x = anchorX
          + Math.sin(t * profile.swayFreq * phaseIntensity) * swayAmp
          + Math.sin(t * profile.secondaryFreq) * (gameWidth * profile.secondaryAmpX);
        this.y = laneY + Math.cos(t * profile.bobFreq * phaseIntensity) * bobAmp;
        break;
      default:
        this.x = anchorX + Math.sin(t * profile.swayFreq * phaseIntensity) * swayAmp;
        this.y = laneY + Math.sin(t * profile.bobFreq * phaseIntensity) * bobAmp;
        break;
    }

    this.x = clamp(this.x, gameWidth * 0.12, gameWidth * 0.88);
    this.y = clamp(this.y, gameHeight * 0.13, gameHeight * 0.43);

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

  getBossPressureScalar() {
    if (this.level <= 1) return 0.78;
    if (this.level === 2) return 0.88;
    if (this.level <= 4) return 0.92;
    if (this.level <= 6) return 0.96;
    return 1;
  }

  getPhaseShootDelay(phase) {
    const diff = BalanceConfig.difficulty;
    const baseDelay = phase === 1
      ? diff.bossShootDelayBase
      : phase === 2
        ? diff.bossShootDelayPhase2
        : diff.bossShootDelayPhase3;
    const openingDelayScalar = this.level <= 1 ? 1.55 : this.level === 2 ? 1.2 : 1;
    return baseDelay * openingDelayScalar;
  }

  getBossProjectileSpeed(phase) {
    const diff = BalanceConfig.difficulty;
    const fairness = diff.bossFairness || {};
    const baseSpeed = phase === 1
      ? diff.bossProjectileSpeedPhase1
      : phase === 2
        ? diff.bossProjectileSpeedPhase2
        : diff.bossProjectileSpeedPhase3;
    const levelScale = Math.max(0, this.level - 1);
    return Math.min(
      diff.bossProjectileSpeedMax ?? Number.POSITIVE_INFINITY,
      baseSpeed + levelScale * (diff.bossProjectileSpeedPerLevel ?? 0)
    ) * (fairness.globalProjectileMultiplier ?? 1);
  }

  getBossAttackSpeedMultiplier(attackType = 'normal') {
    const fairness = BalanceConfig.difficulty.bossFairness || {};
    if (attackType === 'ring' || attackType === 'mirror' || attackType === 'adds' || attackType === 'radial') {
      return fairness.netSpeedMultiplier ?? 0.86;
    }
    if (attackType === 'lance' || attackType === 'sniper' || attackType === 'beam') {
      return fairness.beamSpeedMultiplier ?? 0.84;
    }
    if (attackType === 'wall') {
      return fairness.wallSpeedMultiplier ?? 0.78;
    }
    return 1;
  }

  getRegularAttackIntervalMs() {
    const base = this.level <= 1 ? 2200 : this.level === 2 ? 2400 : 2700;
    const phaseScalar = this.phase === 1 ? 1 : this.phase === 2 ? 0.95 : 0.9;
    return Math.round(base * phaseScalar);
  }

  getRegularTelegraphDurationMs() {
    const fairness = BalanceConfig.difficulty.bossFairness || {};
    if (this.level <= 2) return fairness.regularTelegraphEarlyMs ?? 960;
    if (this.level <= 8) return fairness.regularTelegraphMidMs ?? 880;
    return fairness.regularTelegraphLateMs ?? 780;
  }

  getPhasePlan() {
    return BOSS_PHASE_PLANS[this.profile?.archetype] || BOSS_PHASE_PLANS.conductor;
  }

  applyPhasePlan(phase) {
    const plan = this.getPhasePlan();
    const gameWidth = this.game?.getWidth ? this.game.getWidth() : 800;
    const gameHeight = this.game?.getHeight ? this.game.getHeight() : 600;
    this.targetPhaseAnchorOffset = (Number(plan.anchor?.[phase]) || 0) * gameWidth;
    this.phaseLaneYOffset = (Number(plan.lane?.[phase]) || 0) * gameHeight;
    this.phaseShiftStartedAt = Date.now();
  }

  getSignatureForPhase(phase) {
    const plan = this.getPhasePlan();
    const planned = plan.signatures?.[phase];
    if (planned) return planned;
    const signature = this.profile?.signature || (phase === 2 ? 'cone' : 'ring');
    return phase === 2 && signature === 'ring' ? 'cone' : signature;
  }

  getSafeLaneHint(kind, details = {}) {
    return {
      kind,
      phase: this.phase,
      archetype: this.profile?.archetype || null,
      attack: details.attack || this.profile?.attack || null,
      signature: details.signature || this.telegraph?.type || null,
      ...details
    };
  }

  getWallSafeColumn() {
    const columns = [-2, -1, 0, 1, 2];
    const archetypeOffset = (this.profile?.index || this.level || 1) % columns.length;
    return columns[(this.phase + archetypeOffset) % columns.length];
  }

  getWallColumnOffsets() {
    const spacing = Math.min(30, (this.game?.getWidth ? this.game.getWidth() : 800) * 0.035);
    const safeColumn = this.getWallSafeColumn();
    return [-2, -1, 0, 1, 2]
      .filter((column) => column !== safeColumn)
      .map((column) => column * spacing);
  }

  setWallSafeLane() {
    const spacing = Math.min(30, (this.game?.getWidth ? this.game.getWidth() : 800) * 0.035);
    const safeColumn = this.getWallSafeColumn();
    const x = this.x + safeColumn * spacing;
    this.safeLanes = [this.getSafeLaneHint('wall-column', {
      attack: 'wall',
      x: Math.round(x),
      width: Math.round(spacing * 0.9),
      label: 'OPEN COLUMN'
    })];
  }

  getRingSafeAngle(count = 16) {
    const archetypeOffset = ((this.profile?.index || this.level || 1) % Math.max(1, count)) / Math.max(1, count);
    const drift = (archetypeOffset - 0.5) * 0.5;
    return Math.PI / 2 + drift;
  }

  setRingSafeLane(count = 16, wedge = 0.38) {
    const angle = this.getRingSafeAngle(count);
    this.safeLanes = [this.getSafeLaneHint('ring-wedge', {
      signature: 'ring',
      angle: Number(angle.toFixed(3)),
      width: Number(wedge.toFixed(3)),
      label: 'BOTTOM WEDGE'
    })];
  }

  setAimedSafeLane(type, playerX, playerY, spread = 0.5) {
    const angle = Math.atan2(playerY - this.y, playerX - this.x);
    this.safeLanes = [this.getSafeLaneHint('aimed-edges', {
      signature: type,
      angle: Number(angle.toFixed(3)),
      width: Number(spread.toFixed(3)),
      label: type === 'lance' ? 'SLIDE OFF LINE' : 'EDGE LANES'
    })];
  }

  startPhaseChange(phase, playerX, playerY) {
    if (this.phaseNotified[phase]) return;
    this.phaseNotified[phase] = true;
    this.applyPhasePlan(phase);
    const playScene = this.game?.scenes?.play;
    if (playScene?.onBossPhaseChange) {
      playScene.onBossPhaseChange(phase, this);
    }
    this.phasePulseUntil = Date.now() + BOSS_PHASE_PULSE_MS;
    this.setPresentationState('phaseChange', BOSS_PHASE_PULSE_MS);
    const type = this.getSignatureForPhase(phase);
    this.startSignatureTelegraph(type, playerX, playerY);
    this.signatureCooldown = 120;
  }

  getSignatureLabel(type) {
    if (type === 'cone') return 'FANFIRE WINDUP';
    if (type === 'ring') return 'RING BURST WINDUP';
    if (type === 'mirror') return 'MIRROR SPLIT WINDUP';
    if (type === 'lance') return 'LANCE LOCK WINDUP';
    if (type === 'adds') return 'DRONE CALL WINDUP';
    return 'SIGNATURE WINDUP';
  }

  getSignatureSfxFamily(type) {
    if (type === 'lance') return 'beam';
    if (type === 'ring' || type === 'adds') return 'net';
    return 'web';
  }

  playSignatureTelegraphSfx(type) {
    const family = this.getSignatureSfxFamily(type);
    AudioManager.playSfx(`boss_${family}_telegraph`, {
      volume: family === 'beam' ? 0.6 : 0.52,
      minIntervalMs: 640
    });
  }

  startSignatureTelegraph(type, playerX, playerY) {
    const fairness = BalanceConfig.difficulty.bossFairness || {};
    if (type === 'ring' || type === 'adds') {
      this.setRingSafeLane(type === 'adds' ? 14 : 18, type === 'adds' ? 0.48 : (fairness.ringSafeWedge ?? 0.5));
    } else {
      const spread = type === 'lance' ? 0.16 : type === 'mirror' ? 0.38 : this.level <= 2 ? 0.5 : 0.64;
      this.setAimedSafeLane(type, playerX, playerY, spread);
    }
    this.telegraph = {
      type,
      label: this.getSignatureLabel(type),
      start: Date.now(),
      duration: type === 'ring' || type === 'adds'
        ? (fairness.signatureRingTelegraphMs ?? 1220)
        : (fairness.signatureTelegraphMs ?? 1120)
    };
    this.setPresentationState('charge', this.telegraph.duration);
    const playScene = this.game?.scenes?.play;
    if (playScene?.enqueueToast) {
      playScene.enqueueToast(this.telegraph.label, {
        fontSize: 18,
        fill: '#fff45c',
        slot: 'top',
        type: 'boss',
        duration: 900
      });
    }
    this.playSignatureTelegraphSfx(type);
    this.updateTelegraphVisual(0, playerX, playerY);
  }

  updateTelegraphVisual(progress, playerX, playerY) {
    if (!this.telegraph) return;

    const warningColor = this.telegraph.type === 'ring' || this.telegraph.type === 'adds'
      ? (this.profile?.accent || 0xff3355)
      : (this.profile?.palette || 0xfff45c);
    const fillAlpha = 0.28 + progress * 0.16;
    const laneAlpha = 0.54 + progress * 0.24;
    const pulse = 1 + Math.sin(Date.now() * 0.024) * 0.08;
    const originX = 0;
    const originY = 0;
    this.updateHealthBar();
    const warningLayer = this.healthBar;
    if (!warningLayer) return;

    if (this.telegraph.type === 'cone' || this.telegraph.type === 'mirror' || this.telegraph.type === 'lance') {
      const angle = Math.atan2(playerY - this.y, playerX - this.x);
      const spread = this.telegraph.type === 'lance' ? 0.16 : this.telegraph.type === 'mirror' ? 0.38 : this.level <= 2 ? 0.5 : 0.64;
      const length = Math.max(this.radius * 2.8, 230);
      const steps = 8;
      const points = [originX, originY];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps - 0.5;
        const a = angle + t * spread;
        points.push(originX + Math.cos(a) * length * pulse, originY + Math.sin(a) * length * pulse);
      }
      warningLayer.poly(points);
      warningLayer.fill({ color: warningColor, alpha: fillAlpha * 0.58 });
      warningLayer.poly(points);
      warningLayer.fill({ color: 0xffffff, alpha: 0.04 + progress * 0.05 });
      warningLayer.poly(points);
      warningLayer.stroke({ color: 0xffffff, width: 2 + progress * 3, alpha: 0.48 + progress * 0.34 });
      const lanes = this.telegraph.type === 'lance' ? [-0.08, 0, 0.08] : [-0.5, -0.22, 0.22, 0.5];
      for (const lane of lanes) {
        const a = angle + lane * spread;
        warningLayer.moveTo(originX + Math.cos(a) * this.radius * 0.7, originY + Math.sin(a) * this.radius * 0.7);
        warningLayer.lineTo(originX + Math.cos(a) * length * pulse, originY + Math.sin(a) * length * pulse);
      }
      warningLayer.stroke({ color: warningColor, width: 2 + progress * 2, alpha: laneAlpha });
      const crossCount = this.telegraph.type === 'lance' ? 5 : 4;
      for (let i = 1; i <= crossCount; i++) {
        const t = i / (crossCount + 1);
        const a = angle;
        const cx = originX + Math.cos(a) * length * t;
        const cy = originY + Math.sin(a) * length * t;
        const band = Math.max(10, spread * length * t * 0.18);
        const px = -Math.sin(a);
        const py = Math.cos(a);
        warningLayer.moveTo(cx - px * band, cy - py * band);
        warningLayer.lineTo(cx + px * band, cy + py * band);
      }
      warningLayer.stroke({ color: 0xffffff, width: 1.4 + progress, alpha: 0.2 + progress * 0.18 });
      warningLayer.circle(originX, originY, this.radius * (0.32 + progress * 0.16));
      warningLayer.fill({ color: warningColor, alpha: 0.18 + progress * 0.1 });
      warningLayer.circle(originX, originY, this.radius * (0.18 + progress * 0.08));
      warningLayer.fill({ color: 0xffffff, alpha: 0.18 + progress * 0.16 });
    } else {
      const maxRadius = Math.max(this.radius * 2.15, 170);
      const innerRadius = maxRadius * 0.46;
      const outer = maxRadius * (0.72 + progress * 0.34) * pulse;
      const inner = innerRadius * (0.8 + progress * 0.16);
      warningLayer.circle(originX, originY + 18, outer * 1.08);
      warningLayer.stroke({ color: warningColor, width: 8, alpha: 0.1 + progress * 0.14 });
      warningLayer.circle(originX, originY + 18, outer);
      warningLayer.stroke({ color: warningColor, width: 5, alpha: 0.48 + progress * 0.26 });
      warningLayer.circle(originX, originY + 18, inner);
      warningLayer.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
      warningLayer.circle(originX, originY + 18, inner * 0.58);
      warningLayer.stroke({ color: warningColor, width: 2, alpha: 0.3 + progress * 0.2 });
      for (let i = 0; i < 18; i++) {
        const a = (Math.PI * 2 * i) / 18 + progress * 0.65;
        const r1 = inner + 8;
        const r2 = outer - 8;
        warningLayer.moveTo(originX + Math.cos(a) * r1, originY + 18 + Math.sin(a) * r1);
        warningLayer.lineTo(originX + Math.cos(a) * r2, originY + 18 + Math.sin(a) * r2);
      }
      warningLayer.stroke({ color: warningColor, width: 2, alpha: 0.28 + progress * 0.16 });
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8 - progress * 0.9;
        const nodeR = outer * 0.88;
        warningLayer.circle(originX + Math.cos(a) * nodeR, originY + 18 + Math.sin(a) * nodeR, 4 + progress * 3);
      }
      warningLayer.fill({ color: 0xffffff, alpha: 0.16 + progress * 0.16 });
    }

    if (this.nameText) {
      const remaining = Math.max(0, Math.ceil((1 - progress) * 3));
      this.nameText.text = `${this.telegraph.label}\n${remaining}`;
      this.nameText.alpha = 0.88 + progress * 0.12;
    }

  }

  clearTelegraphVisual() {
    const hadTelegraphOverlay = Boolean(this.nameText && this.nameText.text !== this.name);
    if (this.nameText) {
      this.nameText.text = this.name;
      this.nameText.alpha = 1;
    }
    if (hadTelegraphOverlay) {
      this.updateHealthBar();
    }
  }

  startRegularAttackTelegraph(playerX, playerY) {
    const fairness = BalanceConfig.difficulty.bossFairness || {};
    const attack = this.profile?.attack || 'aimed';
    const type = ['spiral', 'clock', 'chord'].includes(attack)
      ? 'radial'
      : attack === 'wall'
        ? 'wall'
        : ['fan', 'burst', 'fakeout'].includes(attack)
          ? 'fan'
          : 'aim';
    this.regularTelegraph = {
      attack,
      type,
      start: Date.now(),
      duration: this.getRegularTelegraphDurationMs()
    };
    if (type === 'wall') {
      this.setWallSafeLane();
    } else if (type === 'radial') {
      this.setRingSafeLane(attack === 'chord' ? 6 : this.phase === 1 ? 4 : 8, fairness.regularRingSafeWedge ?? 0.5);
    } else {
      const spread = type === 'fan'
        ? (this.level <= 2 ? 0.3 : 0.42)
        : (attack === 'sniper' ? 0.07 : 0.16);
      this.setAimedSafeLane(type, playerX, playerY, spread);
    }
    this.updateRegularAttackTelegraphVisual(0, playerX, playerY);
  }

  updateRegularAttackTelegraphVisual(progress, playerX, playerY) {
    if (!this.attackWarningLayer || !this.regularTelegraph || this.telegraph) return;
    const layer = this.attackWarningLayer;
    layer.clear();

    const warningColor = this.profile?.accent || this.profile?.palette || 0xfff45c;
    const pulse = 1 + Math.sin(Date.now() * 0.03) * 0.06;
    const alpha = 0.18 + progress * 0.34;
    const width = 2 + progress * 2;
    const originX = 0;
    const originY = 18;
    const gameWidth = this.game?.getWidth ? this.game.getWidth() : 800;
    const gameHeight = this.game?.getHeight ? this.game.getHeight() : 600;
    const length = Math.max(gameHeight * 0.7, 440);
    const angle = Math.atan2(playerY - this.y, playerX - this.x);

    if (this.regularTelegraph.type === 'radial') {
      const outer = Math.max(this.radius * 1.85, 145) * (0.78 + progress * 0.24) * pulse;
      const inner = outer * 0.55;
      layer.circle(originX, originY, outer);
      layer.stroke({ color: warningColor, width: 4, alpha: 0.38 + progress * 0.26 });
      layer.circle(originX, originY, inner);
      layer.stroke({ color: 0xffffff, width: 2, alpha: 0.28 + progress * 0.24 });
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10 + progress * 0.45;
        layer.moveTo(originX + Math.cos(a) * (inner + 10), originY + Math.sin(a) * (inner + 10));
        layer.lineTo(originX + Math.cos(a) * (outer - 10), originY + Math.sin(a) * (outer - 10));
      }
      layer.stroke({ color: warningColor, width: 2, alpha: 0.34 + progress * 0.18 });
      return;
    }

    if (this.regularTelegraph.type === 'wall') {
      const offsets = this.getWallColumnOffsets();
      for (const x of offsets) {
        layer.roundRect(x - 7, originY + this.radius * 0.35, 14, length * pulse, 8);
        layer.fill({ color: warningColor, alpha });
        layer.moveTo(x, originY + this.radius * 0.2);
        layer.lineTo(x, originY + length * pulse);
      }
      layer.stroke({ color: 0xffffff, width, alpha: 0.34 + progress * 0.26 });
      const safeColumn = this.getWallSafeColumn() * Math.min(30, gameWidth * 0.035);
      layer.roundRect(safeColumn - 14, originY + this.radius * 0.4, 28, length * 0.92, 12);
      layer.stroke({ color: 0x8cffb5, width: 2, alpha: 0.32 + progress * 0.28 });
      return;
    }

    const spread = this.regularTelegraph.type === 'fan'
      ? (this.level <= 2 ? 0.3 : 0.42)
      : (this.regularTelegraph.attack === 'sniper' ? 0.07 : 0.16);
    const lanes = this.regularTelegraph.type === 'fan' ? [-0.5, -0.25, 0, 0.25, 0.5] : [0];
    for (const lane of lanes) {
      const a = angle + lane * spread;
      const start = this.radius * 0.55;
      layer.moveTo(originX + Math.cos(a) * start, originY + Math.sin(a) * start);
      layer.lineTo(originX + Math.cos(a) * length * pulse, originY + Math.sin(a) * length * pulse);
    }
    layer.stroke({ color: warningColor, width, alpha: 0.62 + progress * 0.28 });

    if (this.regularTelegraph.type === 'fan') {
      const points = [originX, originY];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8 - 0.5;
        const a = angle + t * spread;
        points.push(originX + Math.cos(a) * length * 0.78 * pulse, originY + Math.sin(a) * length * 0.78 * pulse);
      }
      layer.poly(points);
      layer.fill({ color: warningColor, alpha: 0.08 + progress * 0.1 });
    }
  }

  clearRegularAttackTelegraphVisual() {
    if (this.attackWarningLayer) this.attackWarningLayer.clear();
  }

  executeSignatureMove(type, playerX, playerY) {
    this.triggerFirePresentation(type, true, playerX, playerY);
    if (type === 'cone') {
      this.fireCone(playerX, playerY, this.level <= 2 ? 5 : 8, this.level <= 2 ? 0.5 : 0.64);
    } else if (type === 'mirror') {
      this.fireCone(playerX, playerY, this.level <= 2 ? 5 : 7, 0.38);
      this.fireRingBurst(this.level <= 2 ? 8 : 12, 3);
    } else if (type === 'lance') {
      this.fireCone(playerX, playerY, 3, 0.14);
    } else if (type === 'adds') {
      const playScene = this.game?.scenes?.play;
      playScene?.enemyManager?.spawnBossAdds(this.level <= 2 ? 2 : 4);
      this.fireRingBurst(this.level <= 2 ? 8 : 13, 3);
    } else if (type === 'ring') {
      this.fireRingBurst(this.level <= 2 ? 10 : 16, this.level <= 2 ? 2 : 3);
      const playScene = this.game?.scenes?.play;
      if (this.level > 2) {
        playScene?.enemyManager?.spawnBossAdds(3);
      }
    }
    this.game?.scenes?.play?.registerBossHazardFromBoss?.(this, 'signature', { type, playerX, playerY });
  }

  fireCone(playerX, playerY, shots = 7, spread = 0.6) {
    const bullets = [];
    const visualConfig = toBulletVisualConfig(getBossSignatureWeaponProfile(this.telegraph?.type || 'cone'), {
      sourceEnemyType: 'boss',
      sourceFireStyle: this.telegraph?.type || 'cone'
    });
    for (let i = 0; i < shots; i++) {
      const t = (i / (shots - 1)) - 0.5;
      const angle = Math.atan2(playerY - this.y, playerX - this.x) + t * spread;
      const attackType = this.telegraph?.type || 'cone';
      const speed = this.getBossProjectileSpeed(2) *
        this.getBossAttackSpeedMultiplier(attackType) *
        BalanceConfig.difficulty.pressureScalar *
        this.getBossPressureScalar();
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      bullets.push(new Bullet(this.x, this.y + 20, vx, vy, 1, visualConfig.color || this.color, false, visualConfig));
    }
    bullets.forEach(b => this.game.scenes.play.bulletManager.addEnemyBullet(b));
  }

  fireRingBurst(count = 16, gapSize = 2) {
    const bullets = [];
    const visualConfig = toBulletVisualConfig(getBossSignatureWeaponProfile(this.telegraph?.type || 'ring'), {
      sourceEnemyType: 'boss',
      sourceFireStyle: this.telegraph?.type || 'ring'
    });
    const safeAngle = this.getRingSafeAngle(count);
    const fairness = BalanceConfig.difficulty.bossFairness || {};
    const safeWedge = this.level <= 2 ? (fairness.ringSafeWedgeEarly ?? 0.58) : (fairness.ringSafeWedge ?? 0.5);
    this.setRingSafeLane(count, safeWedge);
    for (let i = 0; i < count; i++) {
      if (i % gapSize === 0) continue;
      const angle = (i / count) * Math.PI * 2;
      if (Math.abs(normalizeAngle(angle - safeAngle)) < safeWedge) continue;
      const speed = this.getBossProjectileSpeed(3) *
        this.getBossAttackSpeedMultiplier(this.telegraph?.type || 'ring') *
        BalanceConfig.difficulty.pressureScalar *
        this.getBossPressureScalar();
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      bullets.push(new Bullet(this.x, this.y + 20, vx, vy, 1, visualConfig.color || this.color, false, visualConfig));
    }
    bullets.forEach(b => this.game.scenes.play.bulletManager.addEnemyBullet(b));
  }

  canShoot() {
    if (this.shootCooldown > 0 || this.telegraph) return false;
    const now = Date.now();
    if (this.entryStartMs && now - this.entryStartMs < this.entryDurationMs + 250) return false;
    if (now < this.regularAttackReadyAt) return false;
    if (!this.regularTelegraph) {
      const playScene = this.game?.scenes?.play;
      const player = playScene?.player;
      this.startRegularAttackTelegraph(player?.x ?? this.x, player?.y ?? this.y + 260);
      return false;
    }
    return now - this.regularTelegraph.start >= this.regularTelegraph.duration;
  }

  shoot(playerX, playerY) {
    const attack = this.profile?.attack || 'aimed';
    const regularTelegraph = this.regularTelegraph
      ? { type: this.regularTelegraph.type, attack: this.regularTelegraph.attack }
      : null;
    this.shootCooldown = this.shootDelay;
    this.regularAttackReadyAt = Date.now() + this.getRegularAttackIntervalMs();
    this.regularTelegraph = null;
    this.clearRegularAttackTelegraphVisual();
    this.triggerFirePresentation(attack, false, playerX, playerY);
    const bullets = [];

    // Boss FX
    const killSwitch = typeof localStorage !== 'undefined' && localStorage.getItem("bs_disable_weapon_fx") === "1";
    const weaponProfile = getBossWeaponProfile(attack, this.phase);
    const vConfig = (ENABLE_BOSS_WEAPON_FX && !killSwitch)
      ? toBulletVisualConfig(weaponProfile, {
        sourceEnemyType: 'boss',
        sourceFireStyle: attack,
        spriteScale: (weaponProfile?.spriteScale || 0.5) * (this.phase >= 3 ? 1.08 : 1)
      })
      : null;
    const pressure = BalanceConfig.difficulty.pressureScalar * this.getBossPressureScalar();
    const weaponSpeedMult = weaponProfile?.speedMult || 1;
    const aimAngle = Math.atan2(playerY - this.y, playerX - this.x);
    const addBullet = (x, y, angle, speed, color = weaponProfile?.color || this.color) => {
      bullets.push(new Bullet(
        x,
        y,
        Math.cos(angle) * speed * weaponSpeedMult,
        Math.sin(angle) * speed * weaponSpeedMult,
        1,
        color,
        false,
        vConfig
      ));
    };

    if (attack === 'fan' || attack === 'burst' || attack === 'fakeout') {
      const count = this.phase === 1 ? 1 : attack === 'burst' ? 5 : 3;
      const spread = this.phase === 1 ? 0 : attack === 'fakeout' ? 0.46 : 0.34;
      const speed = this.getBossProjectileSpeed(this.phase === 1 ? 1 : 2) * pressure * this.getBossAttackSpeedMultiplier(attack);
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : (i / (count - 1)) - 0.5;
        addBullet(this.x, this.y, aimAngle + t * spread, speed);
      }
    } else if (attack === 'spiral' || attack === 'clock' || attack === 'chord') {
      const count = attack === 'chord' ? 6 : this.phase === 1 ? 4 : 8;
      const speed = this.getBossProjectileSpeed(this.phase === 3 ? 3 : 2) * pressure * this.getBossAttackSpeedMultiplier('radial');
      const offset = attack === 'clock'
        ? Math.floor(this.moveTimer / 26) * (Math.PI / 8)
        : this.moveTimer * 0.045;
      const safeAngle = this.safeLanes?.[0]?.kind === 'ring-wedge'
        ? Number(this.safeLanes[0].angle)
        : this.getRingSafeAngle(count);
      const safeWedge = this.safeLanes?.[0]?.kind === 'ring-wedge'
        ? Number(this.safeLanes[0].width)
        : 0.38;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + offset;
        if (attack === 'clock' && this.phase < 3 && i % 4 === 0) continue;
        if (Math.abs(normalizeAngle(angle - safeAngle)) < safeWedge) continue;
        addBullet(this.x, this.y, angle, speed);
      }
    } else if (attack === 'split' || attack === 'sniper' || attack === 'wall') {
      const speed = this.getBossProjectileSpeed(this.phase === 1 ? 1 : 2) * pressure * this.getBossAttackSpeedMultiplier(attack);
      if (attack === 'sniper') {
        addBullet(this.x, this.y, aimAngle, speed * 1.16);
        if (this.phase >= 3) {
          addBullet(this.x - 28, this.y, aimAngle + 0.08, speed);
          addBullet(this.x + 28, this.y, aimAngle - 0.08, speed);
        }
      } else if (attack === 'wall') {
        this.setWallSafeLane();
        for (const xOffset of this.getWallColumnOffsets()) {
          addBullet(this.x + xOffset, this.y, Math.PI / 2 + (xOffset / 480), speed * 0.82);
        }
      } else {
        addBullet(this.x - 22, this.y, aimAngle - 0.18, speed);
        addBullet(this.x + 22, this.y, aimAngle + 0.18, speed);
      }
    } else if (attack === 'summon') {
      const speed = this.getBossProjectileSpeed(1) * pressure * this.getBossAttackSpeedMultiplier('radial');
      addBullet(this.x, this.y, aimAngle, speed);
      if (this.phase >= 2 && this.signatureCooldown <= 0) {
        this.game?.scenes?.play?.enemyManager?.spawnBossAdds(this.level <= 1 ? 1 : 2);
        this.signatureCooldown = 180;
      }
    } else if (this.phase === 1) {
      // Single aimed shot
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const speed = this.getBossProjectileSpeed(1) *
        this.getBossAttackSpeedMultiplier('aim') *
        BalanceConfig.difficulty.pressureScalar *
        this.getBossPressureScalar();
      bullets.push(new Bullet(
        this.x,
        this.y,
        (dx / distance) * speed * weaponSpeedMult,
        (dy / distance) * speed * weaponSpeedMult,
        1,
        weaponProfile?.color || this.color,
        false,
        vConfig
      ));
    } else if (this.phase === 2) {
      // 3-shot spread keeps the first boss readable while still punishing tunnel vision.
      for (let i = -1; i <= 1; i++) {
        const angle = Math.atan2(playerY - this.y, playerX - this.x) + i * 0.25;
        const speed = this.getBossProjectileSpeed(2) *
          this.getBossAttackSpeedMultiplier('fan') *
          BalanceConfig.difficulty.pressureScalar *
          this.getBossPressureScalar();
        bullets.push(new Bullet(
          this.x,
          this.y,
          Math.cos(angle) * speed * weaponSpeedMult,
          Math.sin(angle) * speed * weaponSpeedMult,
          1,
          weaponProfile?.color || this.color,
          false,
          vConfig
        ));
      }
    } else {
      // 8-bullet spiral with visible gaps.
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + this.moveTimer * 0.05;
        const speed = this.getBossProjectileSpeed(3) *
          this.getBossAttackSpeedMultiplier('radial') *
          BalanceConfig.difficulty.pressureScalar *
          this.getBossPressureScalar();
        bullets.push(new Bullet(
          this.x,
          this.y,
          Math.cos(angle) * speed * weaponSpeedMult,
          Math.sin(angle) * speed * weaponSpeedMult,
          1,
          weaponProfile?.color || this.color,
          false,
          vConfig
        ));
      }
    }

    this.game?.scenes?.play?.registerBossHazardFromBoss?.(this, 'regular', {
      type: regularTelegraph?.type || attack,
      attack,
      playerX,
      playerY
    });

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
    this.triggerHurtPresentation(amount);

    if (this.health <= 0) {
      this.triggerDefeatPresentation();
      this.active = false;
      return true; // Destroyed
    }
    return false;
  }

  destroy() {
    this.clearTelegraphVisual();
    this.clearRegularAttackTelegraphVisual();
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
