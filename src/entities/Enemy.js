import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';
import { GameAssets } from '../utils/GameAssets.js';
// TASK 3: Import difficulty multiplier
import { BalanceConfig } from '../config/BalanceConfig.js';
import { enhanceEnemyVisuals } from '../utils/EnemyVisualEnhancer.js';
import { getEnemyVisualVariant } from '../config/VisualVariantCatalog.js';
import { getGeneratedEnemyProfile } from '../config/GeneratedEnemyProfiles.js';
import { getEliteMiddleShipProfile } from '../config/EliteMiddleShips.js';
import { getEnemyAttackPattern } from '../config/EnemyAttackStyles.js';
import { getEnemyMovementOffset } from '../config/EnemyMovementStyles.js';
import { getEnemyWeaponProfileById, getEnemyWeaponProfileForEnemy, toBulletVisualConfig } from '../config/EnemyWeaponProfiles.js';
import { getEnemyThreatAction } from '../config/EnemyThreatActions.js';
import { getColorAssistEnabled } from '../config/AccessibilitySettings.js';
import { AudioManager } from '../audio/AudioManager.js';

const ENABLE_ENEMY_WEAPON_FX_VARIETY = true;

export class Enemy {
  constructor(x, y, type, level, game, waveColor = null) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.level = level;
    this.game = game;
    this.waveColor = waveColor; // 'Blue', 'Green', 'Red', 'Black'
    this.active = true;
    this.visualsDeactivated = false;
    this.destroyed = false;
    this.ownedVisuals = [];
    this.radius = 15;

    this.middleShipProfile = getEliteMiddleShipProfile(type);

    // CLEANUP FIX: Add kind tag for cleanup targeting
    this.kind = this.middleShipProfile ? 'elite_middle_ship' : (type === 'bonus_challenge') ? 'bonus_drone' : 'enemy';
    this.isEliteMiddleShip = Boolean(this.middleShipProfile);
    this.vx = 0;
    this.vy = 0;
    this.health = 1;
    this.maxHealth = 1;
    this.shootCooldown = 0;
    this.shootDelay = 120;
    this.movePattern = 'sine';
    this.moveTimer = 0;
    this.scoreValue = 10;
    this.slow_time = 0;

    // Arcade formation state machine.
    this.state = 'ENTRY';
    this.formationX = x;
    this.formationY = y;

    this.entryCurve = null;
    this.diveCurve = null;
    this.returnCurve = null;
    this.waveTactic = null;
    this.waveRole = 'wing';
    this.waveSlot = 0;
    this.waveSize = 1;
    this.waveCenterX = x;
    this.waveCenterY = y;
    this.waveFormation = null;
    this.tacticalFireScalar = 1;
    this.tacticalShotPattern = 'aimed';
    this.tacticalMoveStyle = 'standard';
    this.tacticalDiveBias = 1;
    this.tacticalDiveAt = 0;
    this.tacticalDiveUsed = false;
    this.tacticalPhase = Math.random() * Math.PI * 2;
    this.combatBounds = null;
    this.tacticalSwayScalar = 1;
    this.threatActionDefinition = null;
    this.currentThreatAction = null;
    this.threatTelegraphStartedAt = 0;
    this.nextThreatActionAt = 0;
    this.threatActionCooldown = 0;
    this.threatActionLockedTarget = null;
    this.threatTelegraphLayer = null;
    this.threatActionExecutionCount = 0;

    this.idlePhase = Math.random() * Math.PI * 2;
    this.spriteKey = null;
    this.xtraType = 1; // 1-5
    this.usingXtraAsset = false;
    this.generatedProfile = this.middleShipProfile ? null : getGeneratedEnemyProfile(type, `${level}|${waveColor || 'none'}|${Math.round(x)}|${Math.round(y)}`);
    this.visualVariant = this.middleShipProfile
      ? {
        slug: this.middleShipProfile.id,
        tint: this.middleShipProfile.tint,
        accent: this.middleShipProfile.accent,
        scale: this.middleShipProfile.spriteScale || 1,
        wobble: 1.05,
        alpha: this.middleShipProfile.glowAlpha || 0.24
      }
      : this.generatedProfile
      ? {
        slug: this.generatedProfile.id,
        tint: this.generatedProfile.tint,
        accent: this.generatedProfile.accent,
        scale: this.generatedProfile.spriteScale || 1,
        wobble: 0.9 + (this.generatedProfile.spriteIndex % 7) * 0.04,
        alpha: this.generatedProfile.glowAlpha || 0.18
      }
      : getEnemyVisualVariant(type, level, waveColor, x, y);
    this.eliteAbility = this.middleShipProfile ? {
      state: 'cooldown',
      startedAt: Date.now(),
      nextAt: Date.now() + 2100 + Math.random() * 1600,
      activeUntil: 0,
      lastTriggeredAt: 0
    } : null;
    this.eliteStatusUntil = 0;
    this.eliteShieldUntil = 0;
    this.phaseShiftUntil = 0;
    this.commandAuraUntil = 0;
    this.splitterReleased = false;

    this.setupByType();
    this.createSprite();
  }

  setupByType() {
    if (this.middleShipProfile) {
      const profile = this.middleShipProfile;
      this.color = profile.tint;
      this.health = profile.health;
      this.maxHealth = profile.health;
      this.scoreValue = profile.scoreValue;
      this.speed = profile.speed;
      this.shootDelay = profile.shootDelay;
      this.radius = profile.radius;
      this.movePattern = profile.movementStyle;
      this.spriteKey = profile.type;
      this.eliteMiddleShipIndex = profile.spriteIndex;
      this.xtraType = (profile.spriteIndex % 5) + 1;
      this.targetWidth = profile.targetWidth;
    } else if (this.generatedProfile) {
      const profile = this.generatedProfile;
      this.color = profile.tint;
      this.health = profile.health;
      this.maxHealth = profile.health;
      this.scoreValue = profile.scoreValue;
      this.speed = profile.speed;
      this.shootDelay = profile.shootDelay;
      this.radius = profile.radius;
      this.movePattern = profile.movementStyle;
      this.spriteKey = profile.type;
      this.generatedEnemyIndex = profile.spriteIndex;
      this.xtraType = (profile.spriteIndex % 5) + 1;
    } else {
    switch (this.type) {
      case 'chaser':
        this.color = 0xff69b4;
        this.health = 2;
        this.maxHealth = 2;
        this.scoreValue = 15;
        this.speed = 0.85;
        this.shootDelay = 120;
        this.xtraType = 1;
        break;

      case 'bruiser':
        this.color = 0x8b4513;
        this.health = 3;
        this.maxHealth = 3;
        this.scoreValue = 25;
        this.speed = 1.1;
        this.shootDelay = 90;
        this.radius = 18;
        this.xtraType = 2;
        break;

      case 'turret':
        this.color = 0xffaa00;
        this.health = 4;
        this.maxHealth = 4;
        this.scoreValue = 40;
        this.speed = 0.65;
        this.shootDelay = 60;
        this.radius = 20;
        this.movePattern = 'zigzag';
        this.xtraType = 3;
        break;

      case 'striker':
        this.color = 0x00ff00;
        this.health = 5;
        this.maxHealth = 5;
        this.scoreValue = 60;
        this.speed = 1.35;
        this.shootDelay = 80;
        this.radius = 16;
        this.movePattern = 'circle';
        this.xtraType = 4;
        break;

      case 'trickster':
        this.color = 0xff00ff;
        this.health = 6;
        this.maxHealth = 6;
        this.scoreValue = 80;
        this.speed = 0.9;
        this.shootDelay = 50;
        this.radius = 22;
        this.movePattern = 'drunk';
        this.xtraType = 5;
        break;

      case 'juggernaut':
        this.color = 0xff0000;
        this.health = 10;
        this.maxHealth = 10;
        this.scoreValue = 120;
        this.speed = 0.35;
        this.shootDelay = 90;
        this.radius = 25;
        this.movePattern = 'aggressive';
        this.xtraType = 5;
        break;

      case 'bonus_challenge':
        this.color = 0xffd700; // Gold
        this.health = 5;
        this.maxHealth = 5;
        this.scoreValue = 500;
        this.speed = 1.2;
        this.shootDelay = 60;
        this.radius = 25;
        this.movePattern = 'aggressive';
        this.spriteKey = 'bonus_challenge';
        this.xtraType = 1;
        break;

      // Player-ship variants used as enemy silhouettes for visual variety.
      case 'fighter_0': // NOVA SPARROW
        this.color = 0x4488ff;
        this.health = 3;
        this.maxHealth = 3;
        this.scoreValue = 30;
        this.speed = 0.75;
        this.shootDelay = 110;
        this.radius = 16;
        this.shipTextureIndex = 0;
        this.xtraType = 1;
        break;

      case 'fighter_1': // COMET TWIN
        this.color = 0x88ccff;
        this.health = 3;
        this.maxHealth = 3;
        this.scoreValue = 30;
        this.speed = 0.9;
        this.shootDelay = 100;
        this.radius = 16;
        this.shipTextureIndex = 1;
        this.xtraType = 1;
        break;

      case 'fighter_2': // PIXEL NEEDLE
        this.color = 0xffaa44;
        this.health = 4;
        this.maxHealth = 4;
        this.scoreValue = 35;
        this.speed = 1.1;
        this.shootDelay = 85;
        this.radius = 16;
        this.movePattern = 'zigzag';
        this.shipTextureIndex = 2;
        this.xtraType = 2;
        break;

      case 'fighter_3': // IRON ORBIT
        this.color = 0x44ff88;
        this.health = 5;
        this.maxHealth = 5;
        this.scoreValue = 45;
        this.speed = 0.8;
        this.shootDelay = 95;
        this.radius = 17;
        this.shipTextureIndex = 3;
        this.xtraType = 2;
        break;

      case 'fighter_4': // ARC STRIKER
        this.color = 0xaa44ff;
        this.health = 4;
        this.maxHealth = 4;
        this.scoreValue = 40;
        this.speed = 0.95;
        this.shootDelay = 90;
        this.radius = 16;
        this.shipTextureIndex = 4;
        this.xtraType = 3;
        break;

      case 'fighter_5': // GIGA LANCE
        this.color = 0xff4488;
        this.health = 8;
        this.maxHealth = 8;
        this.scoreValue = 90;
        this.speed = 0.45;
        this.shootDelay = 120;
        this.radius = 20;
        this.movePattern = 'aggressive';
        this.shipTextureIndex = 5;
        this.xtraType = 4;
        break;

      case 'fighter_6': // QUASAR FAN
        this.color = 0x44ffff;
        this.health = 3;
        this.maxHealth = 3;
        this.scoreValue = 35;
        this.speed = 1.3;
        this.shootDelay = 75;
        this.radius = 15;
        this.movePattern = 'circle';
        this.shipTextureIndex = 6;
        this.xtraType = 3;
        break;

      case 'fighter_7': // STEADY VECTOR
        this.color = 0xff8844;
        this.health = 4;
        this.maxHealth = 4;
        this.scoreValue = 40;
        this.speed = 0.85;
        this.shootDelay = 95;
        this.radius = 16;
        this.shipTextureIndex = 7;
        this.xtraType = 4;
        break;

      case 'fighter_8': // AURORA PRIME
        this.color = 0xffff44;
        this.health = 5;
        this.maxHealth = 5;
        this.scoreValue = 50;
        this.speed = 0.9;
        this.shootDelay = 85;
        this.radius = 16;
        this.movePattern = 'drunk';
        this.shipTextureIndex = 8;
        this.xtraType = 5;
        break;
    }
    }

    // Apply the linear difficulty model from BalanceConfig.
    const diff = BalanceConfig.difficulty;
    const levelScale = Math.max(0, this.level - 1);
    const hpScale = Math.min(
      diff.enemyHealthMaxMultiplier ?? Number.POSITIVE_INFINITY,
      diff.baseEnemyHealthMultiplier + levelScale * diff.hpScalePerLevel
    );
    const speedScale = Math.min(
      diff.enemySpeedMaxMultiplier ?? Number.POSITIVE_INFINITY,
      diff.enemySpeedMultiplier + levelScale * diff.enemySpeedPerLevel
    );
    const fireDelayScale = Math.max(
      diff.enemyFireDelayMinMultiplier ?? 0.85,
      (diff.enemyFireDelayMultiplier ?? 1) + levelScale * diff.enemyFireDelayPerLevel
    );
    const globalMult = BalanceConfig.DIFFICULTY_MULTIPLIER;

    this.health = Math.ceil(this.health * hpScale);
    this.maxHealth = this.health;
    this.speed *= speedScale * globalMult;
    this.shootDelay = this.shootDelay * fireDelayScale;

    // Sprite Selection
    if (this.middleShipProfile) {
      this.spriteKey = this.middleShipProfile.type;
    } else if (this.generatedProfile) {
      this.spriteKey = this.generatedProfile.type;
    } else if (this.type === 'bonus_challenge') {
      this.spriteKey = 'bonus_challenge';
    } else if (this.type.startsWith('fighter_')) {
      // Fighter types use player ship textures - shipTextureIndex already set
      this.spriteKey = null; // Will use shipTextureIndex in createSprite
    } else {
      const r = Math.random();
      if (this.type === 'chaser' || this.type === 'bruiser') {
        const idx = 1 + Math.floor(Math.random() * 3);
        this.spriteKey = `spaceShips_00${idx}`;
      } else if (this.type === 'turret' || this.type === 'striker') {
        const idx = 4 + Math.floor(Math.random() * 3);
        this.spriteKey = `spaceShips_00${idx}`;
      } else {
        const idx = 7 + Math.floor(Math.random() * 3);
        this.spriteKey = `spaceShips_00${idx}`;
      }
    }
  }

  createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.label = `enemy_visual:${this.kind}:${this.type || 'unknown'}`;
    this.sprite.__enemyOwner = this;
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.sortableChildren = true;

    let tex;
    // Check for fighter type (player ship variant)
    if (this.middleShipProfile && Number.isFinite(this.eliteMiddleShipIndex)) {
      tex = GameAssets.getEliteMiddleShipTexture(this.eliteMiddleShipIndex);
      this.usingEliteMiddleShipTexture = true;
    } else if (this.generatedProfile && Number.isFinite(this.generatedEnemyIndex)) {
      tex = GameAssets.getGeneratedEnemyTexture(this.generatedEnemyIndex);
      this.usingGeneratedEnemyTexture = true;
    } else if (this.type.startsWith('fighter_') && this.shipTextureIndex !== undefined) {
      tex = GameAssets.getRankShipTexture(this.shipTextureIndex);
      this.usingPlayerShipTexture = true;
    } else if (this.spriteKey === 'bonus_challenge') {
      tex = GameAssets.getBonusCoreTexture();
    } else {
      // Map Type to Color if not provided
      let c = this.waveColor;
      if (!c) {
        // Default map
        const map = [null, 'Blue', 'Green', 'Red', 'Black', 'Blue'];
        c = map[this.xtraType] || 'Blue';
      }
      tex = GameAssets.getXtraEnemy(c, this.xtraType);

      if (GameAssets.isValidTexture(tex)) {
        this.usingXtraAsset = true;
      } else {
        // Fallback
        tex = this.spriteKey ? GameAssets.getEnemyTexture(this.spriteKey) : null;
      }
    }

    if (GameAssets.isValidTexture(tex)) {
      const s = new PIXI.Sprite(tex);
      s.anchor.set(0.5);
      const targetWidth = this.middleShipProfile?.targetWidth || this.generatedProfile?.targetWidth || 45;
      const variantScale = Number.isFinite(this.visualVariant?.scale) ? this.visualVariant.scale : 1;
      const scale = (targetWidth / tex.width) * variantScale;
      s.scale.set(scale);
      s.rotation = Math.PI; // Enemies face downward

      // Fighter enemies (player ships) get subtle tint, xtra assets no tint
      if (this.usingEliteMiddleShipTexture) {
        s.tint = this.middleShipProfile?.hullTint || 0xffffff;
      } else if (this.usingGeneratedEnemyTexture) {
        s.tint = this.generatedProfile?.hullTint || 0xffffff;
      } else if (this.usingPlayerShipTexture) {
        s.tint = this.visualVariant?.tint || this.color;
      } else {
        s.tint = this.usingXtraAsset ? (this.visualVariant?.tint || 0xFFFFFF) : (this.visualVariant?.tint || this.color);
      }

      this.addVariantGlow();
      this.sprite.addChild(s);
      this.body = s;
    } else {
      this.createFallbackGraphics();
    }

    this.healthBar = new PIXI.Graphics();
    this.updateHealthBar();
    this.sprite.addChild(this.healthBar);

    if (this.middleShipProfile) {
      this.eliteVfxLayer = new PIXI.Graphics();
      this.eliteVfxLayer.zIndex = -1;
      this.eliteVfxLayer.blendMode = 'add';
      this.sprite.addChildAt(this.eliteVfxLayer, 0);
    } else {
      this.threatTelegraphLayer = new PIXI.Graphics();
      this.threatTelegraphLayer.zIndex = -2;
      this.threatTelegraphLayer.blendMode = 'add';
      this.sprite.addChildAt(this.threatTelegraphLayer, 0);
    }

    // Apply visual enhancements to make enemies look distinct and menacing
    if (this.usingXtraAsset && this.game?.app) {
      const color = this.waveColor || 'blue';
      const model = this.xtraType || 1;
      this.visualEnhancementCleanup = enhanceEnemyVisuals(
        this.sprite,
        model,
        color.toLowerCase(),
        this.game.app
      );
    }
  }

  createFallbackGraphics() {
    this.addVariantGlow();
    this.body = new PIXI.Graphics();
    this.body.circle(0, 0, this.radius);
    this.body.fill({ color: this.visualVariant?.tint || this.color });
    this.sprite.addChild(this.body);
  }

  addVariantGlow() {
    if (!this.visualVariant || this.variantGlow) return;
    const glow = new PIXI.Graphics();
    const radius = Math.max(20, this.radius * 1.7);
    glow.circle(0, 0, radius);
    glow.fill({ color: this.visualVariant.accent || this.visualVariant.tint, alpha: this.visualVariant.alpha || 0.16 });
    glow.circle(0, 0, radius * 0.62);
    glow.stroke({ color: this.visualVariant.tint || 0xffffff, width: 2, alpha: 0.22 });
    glow.label = `enemyVariantGlow:${this.visualVariant.slug}`;
    this.variantGlow = glow;
    this.sprite.addChild(glow);
  }

  updateHealthBar() {
    if (!this.healthBar) return;
    this.healthBar.clear();
    const barWidth = this.radius * 2;
    const colorAssist = getColorAssistEnabled();
    const barHeight = colorAssist ? 5 : 3;
    const healthPercent = this.health / this.maxHealth;
    this.healthBar.rect(-barWidth / 2, this.radius + 5, barWidth, barHeight);
    this.healthBar.fill({ color: colorAssist ? 0x05070c : 0x333333 });
    if (colorAssist) {
      this.healthBar.rect(-barWidth / 2 - 1, this.radius + 4, barWidth + 2, barHeight + 2);
      this.healthBar.stroke({ color: 0xffffff, width: 1, alpha: 0.7 });
    }
    this.healthBar.rect(-barWidth / 2, this.radius + 5, barWidth * healthPercent, barHeight);
    this.healthBar.fill({ color: colorAssist ? 0xfff45c : healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000 });
  }

  // --- Arcade formation behavior ---

  applyWaveTactic(tactic = {}, context = {}) {
    this.waveTactic = tactic;
    this.waveSlot = Number.isFinite(context.index) ? context.index : 0;
    this.waveSize = Math.max(1, Number.isFinite(context.count) ? context.count : 1);
    this.waveCenterX = Number.isFinite(context.centerX) ? context.centerX : this.formationX;
    this.waveCenterY = Number.isFinite(context.centerY) ? context.centerY : this.formationY;
    this.waveFormation = context.formation || null;
    this.waveRole = context.side < 0 ? 'left_flank' : context.side > 0 ? 'right_flank' : 'center';
    this.tacticalFireScalar = tactic.fireScalar || 1;
    this.tacticalShotPattern = tactic.shot || 'aimed';
    this.tacticalMoveStyle = tactic.move || 'standard';
    this.tacticalDiveBias = tactic.diveBias || 1;
    this.combatBounds = context.combatBounds || null;
    this.tacticalSwayScalar = Number.isFinite(this.combatBounds?.swayScalar) ? this.combatBounds.swayScalar : 1;
    this.shootDelay = Math.max(38, this.shootDelay * (tactic.fireDelayMult || 1));
    this.tacticalPhase = (this.waveSlot / this.waveSize) * Math.PI * 2 + Math.random() * 0.25;
  }

  applyThreatAction(actionOrId = null, context = {}) {
    const action = typeof actionOrId === 'string' ? getEnemyThreatAction(actionOrId) : actionOrId;
    if (!action || this.kind !== 'enemy' || this.middleShipProfile) {
      this.threatActionDefinition = null;
      return;
    }
    this.threatActionDefinition = action;
    this.threatActionCooldown = action.cooldownMs || 8000;
    const slotDelay = (Number(context.index) || this.waveSlot || 0) * 230;
    const waveDelay = (Number(context.waveIndex) || 0) * 140;
    this.nextThreatActionAt = Date.now() + 1450 + slotDelay + waveDelay + Math.random() * 550;
  }

  clampCombatX(x, padding = 0) {
    const minX = Number.isFinite(this.combatBounds?.minX) ? this.combatBounds.minX + padding : null;
    const maxX = Number.isFinite(this.combatBounds?.maxX) ? this.combatBounds.maxX - padding : null;
    if (minX === null || maxX === null || minX >= maxX) return x;
    return Math.max(minX, Math.min(maxX, x));
  }

  startEntry(startX, startY, endX, endY, duration, delay = 0) {
    const width = this.game?.getWidth?.() || 800;
    const centerX = width / 2;
    if (Number.isFinite(this.combatBounds?.minX) && Number.isFinite(this.combatBounds?.maxX)) {
      const entryOffset = Math.max(104, Math.min(170, width * 0.07));
      const fromLeft = startX < centerX;
      const boundedStartX = fromLeft
        ? this.combatBounds.minX - entryOffset
        : this.combatBounds.maxX + entryOffset;
      startX = Math.max(24, Math.min(width - 24, boundedStartX));
    }

    this.x = startX;
    this.y = startY;
    this.formationX = endX;
    this.formationY = endY;
    this.state = 'ENTRY';

    // Randomized Control Point based on side
    const curvePull = Math.max(260, Math.min(460, width * 0.2));
    const cpX = (startX < centerX) ? startX + curvePull : startX - curvePull;
    const cpY = startY + 400;

    this.entryCurve = {
      p0: { x: startX, y: startY },
      p1: { x: cpX, y: cpY },
      p2: { x: endX, y: endY },
      duration: duration,
      startTime: Date.now() + delay,
      delay: delay
    };

    if (delay > 0) {
      this.sprite.visible = false;
      this.active = false;
      this.waitingForEntry = true;
    }
  }

  startDive(playerX, playerY, preferredDive = null) {
    if (this.state !== 'FORMATION') return;
    this.state = 'DIVE';

    const start = { x: this.x, y: this.y };

    // Choose dive pattern randomly for variety
    const diveType = Math.random();
    let cp, end, duration = 1780;

    if (preferredDive === 'chain' || preferredDive === 'feint') {
      const side = this.waveRole === 'left_flank' ? 1 : this.waveRole === 'right_flank' ? -1 : (this.waveSlot % 2 ? -1 : 1);
      const feint = preferredDive === 'feint';
      end = { x: this.clampCombatX(playerX + side * (feint ? 150 : 70)), y: 730 };
      cp = { x: this.clampCombatX(this.x + side * (feint ? 190 : 120)), y: playerY - (feint ? 170 : 40) };
      duration = feint ? 1280 : 1680;
    } else if (preferredDive === 'sweep') {
      const side = this.waveRole === 'left_flank' ? 1 : -1;
      end = { x: this.clampCombatX(playerX + side * 140), y: 720 };
      cp = { x: this.clampCombatX(this.waveCenterX + side * 210), y: playerY + 20 };
      duration = 1820;
    } else if (diveType < 0.4) {
      // Standard dive (40%)
      end = { x: this.clampCombatX(playerX), y: 700 };
      cp = { x: this.clampCombatX((this.x + playerX) / 2 + (Math.random() - 0.5) * 140), y: (this.y + playerY) / 2 };
    } else if (diveType < 0.6) {
      // Spiral dive (20%) - wide arc
      const side = this.x < playerX ? -1 : 1;
      end = { x: this.clampCombatX(playerX + side * 115), y: 700 };
      cp = { x: this.clampCombatX(this.x + side * 190), y: playerY };
      duration = 2180;
    } else if (diveType < 0.8) {
      // Flanking dive (20%) - readable side pressure inside the combat lane.
      const flankSide = Math.random() < 0.5 ? -1 : 1;
      const laneEdge = flankSide < 0 ? this.combatBounds?.minX : this.combatBounds?.maxX;
      end = { x: this.clampCombatX(Number.isFinite(laneEdge) ? laneEdge : playerX + flankSide * 170, 8), y: 700 };
      cp = { x: this.clampCombatX(playerX + flankSide * 180), y: playerY - 50 };
      duration = 1980;
    } else {
      // Kamikaze dive (20%) - straight at player then down
      end = { x: this.clampCombatX(playerX), y: 750 };
      cp = { x: this.clampCombatX(playerX), y: playerY + 100 };
      duration = 1560;
    }

    this.diveCurve = {
      p0: start,
      p1: cp,
      p2: end,
      startTime: Date.now(),
      duration: duration
    };

    this.sprite.tint = 0xff0000; // Aggressive Color
  }

  update(delta, playerX, playerY) {
    if (!this.active && !this.waitingForEntry) return;

    if (this.waitingForEntry) {
      if (Date.now() >= this.entryCurve.startTime) {
        this.waitingForEntry = false;
        this.active = true;
        this.sprite.visible = true;
        this.entryCurve.startTime = Date.now();
      } else {
        return;
      }
    }

    this.moveTimer += delta;

    switch (this.state) {
      case 'ENTRY':
        this.updateBezier(this.entryCurve, 'FORMATION');
        break;

      case 'FORMATION':
        // Enhanced idle movement - more varied and alive
        const profile = this.middleShipProfile || this.generatedProfile;
        const screenW = this.game?.getWidth ? this.game.getWidth() : 800;
        const swaySpeed = 0.04 + (this.idlePhase % 0.02) + (profile ? (profile.spriteIndex % 5) * 0.002 : 0);
        let swayX = Math.sin(this.moveTimer * swaySpeed + this.idlePhase) * (profile?.idleAmpX || 12);
        let swayY = Math.cos(this.moveTimer * (swaySpeed * 0.7) + this.idlePhase) * (profile?.idleAmpY || 6);
        if (profile) {
          const phase = this.moveTimer * (0.018 + (profile.spriteIndex % 4) * 0.002) + this.idlePhase;
          const offset = getEnemyMovementOffset(profile.movementStyle, {
            phase,
            tacticalWave: this.moveTimer * 0.022 + this.tacticalPhase,
            side: this.waveRole === 'left_flank' ? -1 : this.waveRole === 'right_flank' ? 1 : (this.formationX < screenW / 2 ? -1 : 1),
            slot: this.waveSlot,
            size: this.waveSize,
            x: this.x,
            formationX: this.formationX,
            playerX
          });
          swayX += offset.x || 0;
          swayY += offset.y || 0;
        }
    const tacticalWave = this.moveTimer * 0.022 + this.tacticalPhase;
        const side = this.waveRole === 'left_flank' ? -1 : this.waveRole === 'right_flank' ? 1 : (this.formationX < screenW / 2 ? -1 : 1);
        if (this.tacticalMoveStyle === 'sweep') {
          swayX += Math.sin(tacticalWave * 0.85) * 34;
          swayY += Math.cos(tacticalWave * 0.5) * 8;
        } else if (this.tacticalMoveStyle === 'pincer') {
          const squeeze = Math.max(0, Math.sin(tacticalWave * 0.75));
          swayX += -side * (14 + squeeze * 28);
          swayY += Math.cos(tacticalWave * 1.2) * 7;
        } else if (this.tacticalMoveStyle === 'chain') {
          swayX += Math.sin(tacticalWave + this.waveSlot * 0.45) * 18;
          swayY += Math.sin(tacticalWave * 1.4) * 9;
        } else if (this.tacticalMoveStyle === 'pulse') {
          swayY += Math.sin(tacticalWave * 1.8 + this.waveSlot * 0.7) * 18;
        } else if (this.tacticalMoveStyle === 'orbit') {
          swayX += Math.cos(tacticalWave + this.waveSlot * 0.5) * 24;
          swayY += Math.sin(tacticalWave + this.waveSlot * 0.5) * 15;
        } else if (this.tacticalMoveStyle === 'needle') {
          swayX += Math.sign(Math.sin(tacticalWave * 1.4)) * 10;
          swayY += Math.cos(tacticalWave * 0.6) * 5;
        } else if (this.tacticalMoveStyle === 'weave_wall') {
          swayX += Math.sin(tacticalWave * 1.2 + this.waveSlot) * 22;
          swayY += Math.sin(tacticalWave * 1.7 + this.waveSlot * 0.35) * 12;
        } else if (this.tacticalMoveStyle === 'feint') {
          const snap = Math.sin(tacticalWave * 2.6 + this.waveSlot * 0.35);
          const fakeout = Math.sin(tacticalWave * 1.15 + this.waveSlot * 0.2);
          swayX += Math.sign(snap || 1) * 18 + fakeout * 18;
          swayY += Math.cos(tacticalWave * 1.25 + this.waveSlot * 0.4) * 9;
        } else if (this.tacticalMoveStyle === 'split_sweep') {
          swayX += side * Math.sin(tacticalWave * 0.8) * 32;
          swayY += Math.cos(tacticalWave * 1.1 + this.waveSlot) * 10;
        } else if (this.tacticalMoveStyle === 'ambush') {
          swayX += Math.round(Math.sin(tacticalWave * 1.1) * 2) * 9;
          swayY += Math.max(0, Math.sin(tacticalWave * 1.5)) * 14;
        }
        const swayScalar = this.tacticalSwayScalar || 1;
        this.x = this.clampCombatX(this.formationX + swayX * swayScalar);
        this.y = this.formationY + swayY;

        // Subtle rotation wobble
        const wobbleAngle = Math.sin(this.moveTimer * 0.03 + this.idlePhase) * 0.1;
        this.sprite.rotation = wobbleAngle;

        // Chance to dive (low)
        const profileDiveScalar = profile?.diveBias || 1;
        const diveChance = (this.level <= 1 ? 0.00035 : this.level === 2 ? 0.00065 : this.level === 3 ? 0.0004 : 0.00035) * profileDiveScalar * this.tacticalDiveBias;
        if (this.tacticalDiveAt && !this.tacticalDiveUsed && Date.now() >= this.tacticalDiveAt) {
          this.tacticalDiveUsed = true;
          const diveStyle = this.tacticalMoveStyle === 'feint' ? 'feint' : this.tacticalMoveStyle === 'split_sweep' ? 'sweep' : 'chain';
          this.startDive(playerX, playerY, diveStyle);
          break;
        }
        if (this.active && Math.random() < diveChance) {
          this.startDive(playerX, playerY, this.tacticalMoveStyle === 'split_sweep' ? 'sweep' : null);
        }
        break;

      case 'DIVE':
        this.updateBezier(this.diveCurve, 'RETURN');
        if (this.state === 'RETURN') {
          // Setup return
          this.returnToFormation();
        }
        break;

      case 'RETURN':
        this.updateBezier(this.returnCurve, 'FORMATION');
        if (this.state === 'FORMATION') {
          this.sprite.tint = this.color; // Reset color
        }
        break;
    }

    if (this.middleShipProfile) {
      this.updateEliteMiddleShip(delta, playerX, playerY);
    } else {
      this.updateThreatAction(delta, playerX, playerY);
    }

    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Shooting
    if (this.shootCooldown > 0) this.shootCooldown -= delta;
  }

  returnToFormation() {
    this.state = 'RETURN';
    const start = { x: this.x, y: this.y };
    // Fly back up in a wide arcade loop.
    const end = { x: this.formationX, y: this.formationY };
    const width = this.game?.getWidth?.() || 800;
    const centerX = width / 2;
    const outsidePull = Math.max(160, Math.min(340, width * 0.15));
    const cpVal = this.clampCombatX((this.x < centerX) ? centerX - outsidePull : centerX + outsidePull);

    this.returnCurve = {
      p0: start,
      p1: { x: cpVal, y: 300 },
      p2: end,
      startTime: Date.now(),
      duration: 2000
    };
  }

  updateBezier(curve, nextState) {
    if (!curve) {
      this.state = nextState;
      return;
    }
    const now = Date.now();
    const elapsed = now - curve.startTime;
    const t = Math.min(1, elapsed / curve.duration);

    const invT = 1 - t;
    const p0 = curve.p0;
    const p1 = curve.p1;
    const p2 = curve.p2;

    const nextX = (invT * invT * p0.x) + (2 * invT * t * p1.x) + (t * t * p2.x);
    const nextY = (invT * invT * p0.y) + (2 * invT * t * p1.y) + (t * t * p2.y);

    // Calc rotation based on delta
    const dx = nextX - this.x;
    const dy = nextY - this.y;
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      this.sprite.rotation = Math.atan2(dy, dx) - Math.PI / 2;
    }

    this.x = nextX;
    this.y = nextY;

    if (t >= 1) {
      this.state = nextState;
    }
  }

  updateEliteMiddleShip(delta, playerX, playerY) {
    if (!this.middleShipProfile || !this.eliteAbility || this.waitingForEntry) return;

    const now = Date.now();
    const profile = this.middleShipProfile;
    const telegraphMs = profile.specialTelegraphMs || 700;
    const activeMs = profile.specialActiveMs || 800;
    const cooldownMs = profile.specialCooldownMs || 9000;

    if (this.eliteAbility.state === 'cooldown' && now >= this.eliteAbility.nextAt && this.state !== 'ENTRY') {
      this.eliteAbility.state = 'telegraph';
      this.eliteAbility.startedAt = now;
      this.eliteAbility.triggered = false;
      AudioManager.playSfx(profile.sfx?.charge || 'elite_special_charge', { volume: 0.42, minIntervalMs: 360 });
    }

    if (this.eliteAbility.state === 'telegraph') {
      const progress = Math.min(1, (now - this.eliteAbility.startedAt) / telegraphMs);
      this.drawEliteAbilityVfx(progress, false, playerX, playerY);
      if (progress >= 1) {
        this.eliteAbility.state = 'active';
        this.eliteAbility.startedAt = now;
        this.eliteAbility.activeUntil = now + activeMs;
        this.eliteAbility.triggered = false;
      }
      return;
    }

    if (this.eliteAbility.state === 'active') {
      if (!this.eliteAbility.triggered) {
        this.eliteAbility.triggered = true;
        this.eliteAbility.lastTriggeredAt = now;
        this.triggerEliteMiddleShipAbility(playerX, playerY);
        AudioManager.playSfx(profile.sfx?.active || 'elite_special_active', { volume: 0.46, minIntervalMs: 220 });
      }
      const progress = Math.min(1, (now - this.eliteAbility.startedAt) / activeMs);
      this.applySustainedEliteAbility(delta, playerX, playerY);
      this.drawEliteAbilityVfx(progress, true, playerX, playerY);
      if (now >= this.eliteAbility.activeUntil) {
        this.eliteAbility.state = 'cooldown';
        this.eliteAbility.nextAt = now + cooldownMs + Math.random() * 900;
        this.eliteVfxLayer?.clear();
      }
      return;
    }

    this.eliteVfxLayer?.clear();
  }

  triggerEliteMiddleShipAbility(playerX, playerY) {
    const ability = this.middleShipProfile?.specialAbility;
    const now = Date.now();
    switch (ability) {
      case 'shield_projector':
      case 'barrier_projector':
        this.eliteShieldUntil = now + (this.middleShipProfile.specialActiveMs || 2500);
        this.buffNearbyAllies({ shield: true, radius: ability === 'barrier_projector' ? 135 : 160 });
        break;
      case 'drone_carrier':
        this.game?.scenes?.play?.enemyManager?.spawnEliteSupportDrone?.(this, { count: 2 });
        break;
      case 'mine_layer':
        this.fireElitePattern('mine', playerX, playerY);
        break;
      case 'sniper_rail':
        this.fireElitePattern('rail', playerX, playerY);
        break;
      case 'jammer_disruptor':
      case 'pulse_emp':
        this.applyLocalCooldownPulse(ability === 'pulse_emp' ? 150 : 105);
        break;
      case 'repair_healer':
        this.repairNearbyAllies();
        break;
      case 'phase_raider':
        this.phaseShiftUntil = now + (this.middleShipProfile.specialActiveMs || 1500);
        break;
      case 'mirror_decoy':
        this.spawnMirrorDecoys();
        break;
      case 'escort_commander':
        this.commandNearbyAllies();
        break;
      case 'burst_artillery':
        this.fireElitePattern('burst', playerX, playerY);
        break;
      case 'lane_blocker':
        this.fireElitePattern('lane', playerX, playerY);
        break;
      case 'orb_webber':
        this.fireElitePattern('web', playerX, playerY);
        break;
      case 'missile_frigate':
        this.fireElitePattern('missile', playerX, playerY);
        break;
      case 'anchor_turret':
        this.fireElitePattern('anchor', playerX, playerY);
        break;
      case 'elite_hunter':
        this.fireElitePattern('hunter', playerX, playerY);
        break;
      default:
        break;
    }
  }

  applySustainedEliteAbility(delta, playerX, playerY) {
    const ability = this.middleShipProfile?.specialAbility;
    if (ability === 'tractor_pull') {
      this.applyEliteTractorPull(delta, playerX, playerY);
    } else if (ability === 'vortex_gravity') {
      this.applyEliteVortexPull(delta, playerX, playerY);
    }
  }

  drawEliteAbilityVfx(progress, active, playerX, playerY) {
    if (!this.eliteVfxLayer || !this.middleShipProfile) return;
    const layer = this.eliteVfxLayer;
    const now = Date.now();
    const profile = this.middleShipProfile;
    const ability = profile.specialAbility;
    const color = profile.accent || 0x66ffff;
    const pulse = 0.5 + Math.sin(now * 0.018) * 0.5;
    const radius = this.radius * (active ? 2.1 : 1.45 + progress * 0.9);

    layer.clear();
    layer.circle(0, 0, radius);
    layer.stroke({ color, width: active ? 3 : 2, alpha: active ? 0.62 : 0.24 + progress * 0.48 });
    layer.circle(0, 0, radius * 0.68);
    layer.stroke({ color: 0xffffff, width: 1.3, alpha: active ? 0.24 : 0.12 + progress * 0.24 });

    const drawAimLine = (width = 3, alpha = 0.62) => {
      const relX = playerX - this.x;
      const relY = playerY - this.y;
      layer.moveTo(0, this.radius * 0.2);
      layer.lineTo(relX, relY);
      layer.stroke({ color, width, alpha });
      layer.circle(relX, relY, 12 + pulse * 4);
      layer.stroke({ color: 0xffffff, width: 1.5, alpha: alpha * 0.7 });
    };

    if (ability === 'sniper_rail' || ability === 'elite_hunter') {
      drawAimLine(active ? 4 : 2, active ? 0.72 : 0.26 + progress * 0.42);
    } else if (ability === 'tractor_pull' || ability === 'vortex_gravity') {
      const relY = Math.max(150, playerY - this.y);
      const relX = playerX - this.x;
      const halfWidth = ability === 'tractor_pull' ? 48 + relY * 0.16 : 70 + relY * 0.1;
      layer.moveTo(0, this.radius);
      layer.lineTo(relX - halfWidth, relY);
      layer.lineTo(relX + halfWidth, relY);
      layer.closePath();
      layer.fill({ color, alpha: active ? 0.13 : 0.05 + progress * 0.1 });
      for (let i = 1; i <= 4; i += 1) {
        const t = i / 5;
        layer.ellipse(relX * t, this.radius + (relY - this.radius) * t, halfWidth * t * (0.42 + pulse * 0.06), 8 + i * 2);
        layer.stroke({ color: i % 2 ? color : 0xffffff, width: 1.5, alpha: active ? 0.38 : 0.18 + progress * 0.24 });
      }
    } else if (ability === 'shield_projector' || ability === 'barrier_projector' || ability === 'escort_commander' || ability === 'repair_healer') {
      for (let i = 0; i < 5; i += 1) {
        const a = now * 0.003 + i * Math.PI * 0.4;
        layer.circle(Math.cos(a) * radius * 0.82, Math.sin(a) * radius * 0.82, 3 + pulse * 2);
      }
      layer.fill({ color: 0xffffff, alpha: active ? 0.32 : 0.16 + progress * 0.2 });
    } else {
      for (let i = 0; i < 6; i += 1) {
        const a = now * 0.004 + i * Math.PI / 3;
        layer.moveTo(Math.cos(a) * radius * 0.42, Math.sin(a) * radius * 0.42);
        layer.lineTo(Math.cos(a) * radius * 1.16, Math.sin(a) * radius * 1.16);
      }
      layer.stroke({ color: 0xffffff, width: active ? 2.2 : 1.4, alpha: active ? 0.38 : 0.14 + progress * 0.26 });
    }
  }

  applyEliteTractorPull(delta, playerX, playerY) {
    const player = this.game?.scenes?.play?.player;
    if (!player?.active) return;
    const relX = player.x - this.x;
    const relY = player.y - this.y;
    if (relY < this.radius || relY > (this.game?.getHeight?.() || 600) * 0.8) return;
    const halfWidth = Math.max(44, 22 + relY * 0.18);
    if (Math.abs(relX) > halfWidth) return;

    const frameScale = Math.max(0.5, Math.min(2.2, delta));
    const playerRadius = Number(player.radius) || 14;
    const width = this.game?.getWidth?.() || 800;
    player.x = Math.max(playerRadius, Math.min(width - playerRadius, player.x + (this.x - player.x) * 0.034 * frameScale));
    player.y = Math.max(this.y + this.radius + 70, player.y - 1.9 * frameScale);
    player.applyTractorDebuff?.({ source: this.type, x: this.x, y: this.y });
  }

  applyEliteVortexPull(delta) {
    const player = this.game?.scenes?.play?.player;
    if (!player?.active) return;
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 1 || dist > 260) return;
    const frameScale = Math.max(0.4, Math.min(2.0, delta));
    const strength = Math.max(0, 1 - dist / 260) * 0.72 * frameScale;
    const radius = Number(player.radius) || 14;
    const width = this.game?.getWidth?.() || 800;
    const height = this.game?.getHeight?.() || 600;
    player.x = Math.max(radius, Math.min(width - radius, player.x + (dx / dist) * strength));
    player.y = Math.max(32, Math.min(height - 74, player.y + (dy / dist) * strength));
  }

  fireElitePattern(pattern, playerX, playerY) {
    const profile = this.middleShipProfile;
    const color = profile?.accent || this.color || 0xff6666;
    const baseAngle = Math.atan2(playerY - this.y, playerX - this.x);
    const add = (angle, speed = 2.2, damage = 1, extra = {}) => this.addEliteBullet(angle, speed, damage, color, extra);

    if (pattern === 'rail') {
      add(baseAngle, 4.2, 1.2, { radius: 6, index: 10, trailLength: 58, warningColor: 0xff55ff, trailColor: 0xff55ff, haloColor: 0x61f6ff });
    } else if (pattern === 'mine') {
      [-0.22, 0, 0.22].forEach((offset, index) => add(Math.PI / 2 + offset, 1.05 + index * 0.06, 1, { radius: 11 + index, index: 11, pulseRate: 0.52 + index * 0.18, spin: 0.035, warningColor: 0xffd166, trailColor: 0xff7a3d, haloColor: 0xffd166 }));
    } else if (pattern === 'burst') {
      [-0.32, -0.16, 0, 0.16, 0.32].forEach((offset, index) => add(Math.PI / 2 + offset, 2.05, 1, { radius: 5 + (index % 2), index: 9, trailLength: 26 + index * 4, warningColor: index % 2 ? 0x61f6ff : 0xff66cc, trailColor: index % 2 ? 0x61f6ff : 0xff66cc }));
    } else if (pattern === 'lane') {
      [-150, -75, 0, 75, 150].forEach((offset) => {
        const laneAngle = Math.atan2(playerY - this.y, (playerX + offset) - this.x);
        add(laneAngle, 1.75, 1, { radius: 7, index: 12, trailLength: 36, warningColor: 0xffd166, trailColor: 0xffd166, haloColor: 0xfff2a6 });
      });
    } else if (pattern === 'web') {
      [-0.42, -0.2, 0.2, 0.42].forEach((offset, index) => add(baseAngle + offset, 1.62, 1, { radius: 8, index: 13, spin: 0.06 + index * 0.015, wobble: 0.11, warningColor: 0x9f7cff, trailColor: 0x9f7cff, haloColor: 0x9f7cff }));
    } else if (pattern === 'missile') {
      [-0.18, 0.18].forEach((offset) => add(baseAngle + offset, 1.72, 1.15, { radius: 9, index: 14, trailLength: 52, accel: 0.0026, warningColor: 0xff3355, trailColor: 0xff3355, haloColor: 0xff6b4a }));
    } else if (pattern === 'anchor') {
      [-0.42, -0.21, 0, 0.21, 0.42].forEach((offset, index) => add(baseAngle + offset, 1.9, 1, { radius: 7 + (index === 2 ? 2 : 0), index: 15, trailLength: 34, pulseRate: 0.9, warningColor: 0x7cff44, trailColor: 0x7cff44, haloColor: 0x7cff44 }));
    } else if (pattern === 'hunter') {
      [-0.13, 0.13].forEach((offset) => add(baseAngle + offset, 3.15, 1, { radius: 6, index: 16, trailLength: 46, accel: 0.0012, warningColor: 0x00ff99, trailColor: 0x00ff99, haloColor: 0x00ff99 }));
    }
  }

  addEliteBullet(angle, speed, damage, color, visualConfig = {}) {
    const specialDamage = Math.max(0.1, (Number(damage) || 1) * 1.25);
    const bullet = new Bullet(
      this.x,
      this.y + this.radius * 0.4,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      specialDamage,
      color,
      false,
      {
        color: 'Red',
        index: 8,
        warningColor: color,
        trailColor: color,
        weaponProfileId: this.middleShipProfile?.id,
        weaponLabel: this.middleShipProfile?.displayName,
        ...visualConfig
      }
    );
    bullet.eliteMiddleShipId = this.middleShipProfile?.id || null;
    this.game?.scenes?.play?.bulletManager?.addEnemyBullet?.(bullet);
    return bullet;
  }

  buffNearbyAllies({ shield = false, radius = 150 } = {}) {
    const now = Date.now();
    const allies = this.game?.scenes?.play?.enemyManager?.enemies || [];
    allies.forEach((ally) => {
      if (!ally?.active || ally === this || ally.kind === 'boss') return;
      const dist = Math.hypot((ally.x || 0) - this.x, (ally.y || 0) - this.y);
      if (dist > radius) return;
      if (shield) ally.eliteShieldUntil = Math.max(ally.eliteShieldUntil || 0, now + 1800);
      if (ally.sprite) {
        ally.sprite.alpha = Math.max(ally.sprite.alpha || 1, 0.92);
      }
    });
  }

  repairNearbyAllies() {
    const allies = this.game?.scenes?.play?.enemyManager?.enemies || [];
    allies.forEach((ally) => {
      if (!ally?.active || ally === this || ally.kind === 'boss') return;
      const dist = Math.hypot((ally.x || 0) - this.x, (ally.y || 0) - this.y);
      if (dist > 160 || !Number.isFinite(ally.health) || !Number.isFinite(ally.maxHealth)) return;
      ally.health = Math.min(ally.maxHealth, ally.health + Math.max(1, ally.maxHealth * 0.18));
      ally.updateHealthBar?.();
    });
  }

  applyLocalCooldownPulse(radius = 120) {
    const player = this.game?.scenes?.play?.player;
    if (!player?.active) return;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (dist > radius) return;
    player.shootCooldown = Math.max(player.shootCooldown || 0, 260);
    player.dodgeCooldown = Math.max(player.dodgeCooldown || 0, radius > 130 ? 520 : 360);
    player.triggerFlash?.(this.middleShipProfile?.accent || 0x66ffff, 120);
  }

  spawnMirrorDecoys() {
    const container = this.sprite?.parent;
    if (!container || !this.body?.texture) return;
    const color = this.middleShipProfile?.accent || 0xb388ff;
    [-1, 1].forEach((side) => {
      const decoy = new PIXI.Sprite(this.body.texture);
      decoy.anchor.set(0.5);
      decoy.x = this.x + side * 48;
      decoy.y = this.y + 18;
      decoy.rotation = this.body.rotation;
      decoy.scale.set(this.body.scale.x, this.body.scale.y);
      decoy.tint = color;
      decoy.alpha = 0.34;
      decoy.blendMode = 'add';
      container.addChild(decoy);
      this.ownedVisuals.push(decoy);
      setTimeout(() => {
        if (decoy.parent) decoy.parent.removeChild(decoy);
        this.ownedVisuals = this.ownedVisuals.filter(visual => visual !== decoy);
      }, this.middleShipProfile?.specialActiveMs || 1300);
    });
  }

  commandNearbyAllies() {
    const now = Date.now();
    const allies = this.game?.scenes?.play?.enemyManager?.enemies || [];
    allies.forEach((ally) => {
      if (!ally?.active || ally === this || ally.kind === 'boss') return;
      const dist = Math.hypot((ally.x || 0) - this.x, (ally.y || 0) - this.y);
      if (dist > 180) return;
      ally.eliteCommandUntil = Math.max(ally.eliteCommandUntil || 0, now + 1800);
    });
  }

  getEliteDebugState() {
    if (!this.middleShipProfile) return null;
    const now = Date.now();
    return {
      id: this.middleShipProfile.id,
      name: this.middleShipProfile.displayName,
      role: this.middleShipProfile.role,
      ability: this.middleShipProfile.specialAbility,
      abilityState: this.eliteAbility?.state || null,
      abilityRemainingMs: this.eliteAbility?.state === 'cooldown'
        ? Math.max(0, (this.eliteAbility.nextAt || 0) - now)
        : Math.max(0, ((this.eliteAbility.activeUntil || this.eliteAbility.startedAt || now) - now)),
      shielded: now < (this.eliteShieldUntil || 0),
      phased: now < (this.phaseShiftUntil || 0)
    };
  }

  updateThreatAction(_delta, playerX, playerY) {
    if (!this.threatActionDefinition || this.waitingForEntry || this.state === 'ENTRY' || this.state === 'DIVE') {
      this.threatTelegraphLayer?.clear();
      return;
    }
    const now = Date.now();
    const action = this.threatActionDefinition;
    const manager = this.game?.scenes?.play?.enemyManager;

    if (!this.currentThreatAction && now >= this.nextThreatActionAt && this.active && this.state === 'FORMATION') {
      if (!manager?.tryReserveThreatAction?.(this, action)) {
        this.nextThreatActionAt = now + 520 + Math.random() * 460;
        return;
      }
      const locked = this.getThreatLockedTarget(action, playerX, playerY);
      this.currentThreatAction = {
        id: action.id,
        action,
        startedAt: now,
        executed: false,
        lockedTarget: locked,
        fakeout: action.id === 'shotgun_fan_feint' && ((this.waveSlot + Math.floor(now / 1000)) % 5 === 0)
      };
      this.threatTelegraphStartedAt = now;
      this.threatActionLockedTarget = locked;
      AudioManager.playSfx('enemy_threat_soft_warn', { volume: 0.12, minIntervalMs: 1800 });
    }

    if (!this.currentThreatAction) {
      this.threatTelegraphLayer?.clear();
      return;
    }

    const telegraphMs = action.telegraphMs || 600;
    const progress = Math.min(1, (now - this.currentThreatAction.startedAt) / telegraphMs);
    this.drawThreatTelegraph(action, progress, this.currentThreatAction);
    if (progress < 1 || this.currentThreatAction.executed) return;

    this.currentThreatAction.executed = true;
    this.executeThreatAction(action, this.currentThreatAction.lockedTarget, this.currentThreatAction);
    this.threatActionExecutionCount += 1;
    this.nextThreatActionAt = now + this.threatActionCooldown + Math.random() * 1200;
    manager?.releaseThreatAction?.(this, action);
    this.currentThreatAction = null;
    this.threatActionLockedTarget = null;
    this.threatTelegraphLayer?.clear();
  }

  getThreatLockedTarget(action, playerX, playerY) {
    const handlerId = action.handlerId || action.id;
    const width = this.game?.getWidth?.() || 800;
    const height = this.game?.getHeight?.() || 600;
    const safePlayerY = Math.max(80, Math.min(height - 96, playerY));
    if (handlerId === 'lane_cutter') {
      const laneLean = this.waveRole === 'left_flank' ? 1 : this.waveRole === 'right_flank' ? -1 : (this.waveSlot % 2 ? -1 : 1);
      const laneX = Math.max(58, Math.min(width - 58, playerX + laneLean * Math.min(120, width * 0.09)));
      return { x: laneX, y: height + 60, laneLean };
    }
    if (handlerId === 'crossfire_pair') {
      const side = this.waveRole === 'left_flank' ? 1 : this.waveRole === 'right_flank' ? -1 : (this.waveSlot % 2 ? -1 : 1);
      return {
        x: Math.max(60, Math.min(width - 60, playerX + side * Math.min(96, width * 0.075))),
        y: Math.max(height * 0.58, Math.min(height - 118, safePlayerY - 56)),
        side
      };
    }
    return {
      x: Math.max(42, Math.min(width - 42, playerX)),
      y: safePlayerY
    };
  }

  drawThreatTelegraph(action, progress, state = {}) {
    const handlerId = action.handlerId || action.id;
    const layer = this.threatTelegraphLayer;
    if (!layer) return;
    const colorAssist = getColorAssistEnabled();
    const color = colorAssist ? 0xffffff : (this.visualVariant?.accent || action.color || this.color || 0xff6688);
    const target = state.lockedTarget || this.threatActionLockedTarget || { x: this.x, y: this.y + 180 };
    const relX = target.x - this.x;
    const relY = target.y - this.y;
    const pulse = 0.5 + Math.sin(Date.now() * 0.022) * 0.5;
    const alpha = colorAssist ? 0.82 : 0.28 + progress * 0.44;
    layer.clear();

    if (action.telegraph === 'cone' || handlerId === 'shotgun_fan_feint') {
      const angle = Math.atan2(relY, relX);
      const length = Math.max(180, Math.hypot(relX, relY));
      const spread = state.fakeout ? 0.18 : 0.46;
      layer.moveTo(0, this.radius * 0.3);
      layer.lineTo(Math.cos(angle - spread) * length, Math.sin(angle - spread) * length);
      layer.lineTo(Math.cos(angle + spread) * length, Math.sin(angle + spread) * length);
      layer.closePath();
      layer.fill({ color, alpha: colorAssist ? 0.08 : 0.045 + progress * 0.06 });
      layer.moveTo(0, this.radius * 0.3);
      layer.lineTo(Math.cos(angle - spread) * length, Math.sin(angle - spread) * length);
      layer.moveTo(0, this.radius * 0.3);
      layer.lineTo(Math.cos(angle + spread) * length, Math.sin(angle + spread) * length);
      layer.stroke({ color: colorAssist ? 0xffffff : color, width: colorAssist ? 3 : 2, alpha });
    } else if (action.telegraph === 'lane' || handlerId === 'lane_cutter') {
      const laneWidth = 24 + progress * 18;
      layer.rect(relX - laneWidth / 2, -this.y - 30, laneWidth, (this.game?.getHeight?.() || 600) + 120);
      layer.fill({ color, alpha: colorAssist ? 0.07 : 0.055 + progress * 0.04 });
      layer.moveTo(relX - laneWidth / 2, -this.y - 30);
      layer.lineTo(relX - laneWidth / 2, (this.game?.getHeight?.() || 600) + 80 - this.y);
      layer.moveTo(relX + laneWidth / 2, -this.y - 30);
      layer.lineTo(relX + laneWidth / 2, (this.game?.getHeight?.() || 600) + 80 - this.y);
      layer.stroke({ color: colorAssist ? 0xffffff : color, width: colorAssist ? 3 : 2, alpha });
    } else if (action.telegraph === 'ring' || handlerId === 'pulse_ring_bloom' || handlerId === 'mine_drop' || handlerId === 'orbiting_satellites') {
      const ring = this.radius + 14 + progress * (handlerId === 'pulse_ring_bloom' ? 42 : 24);
      layer.circle(0, 0, ring);
      layer.stroke({ color, width: colorAssist ? 3 : 2, alpha });
      layer.circle(0, 0, ring * (0.56 + pulse * 0.08));
      layer.stroke({ color: colorAssist ? 0x10131c : 0xffffff, width: 1.2, alpha: colorAssist ? 0.64 : 0.22 + progress * 0.18 });
    } else if (action.telegraph === 'arc' || handlerId === 'boomerang_crescent') {
      const side = this.waveRole === 'left_flank' ? 1 : this.waveRole === 'right_flank' ? -1 : (this.waveSlot % 2 ? -1 : 1);
      for (let i = 0; i < 16; i += 1) {
        const t = i / 15;
        const x = relX * t + side * Math.sin(t * Math.PI) * 90;
        const y = relY * t;
        if (i === 0) layer.moveTo(0, this.radius * 0.4);
        else layer.lineTo(x, y);
      }
      layer.stroke({ color, width: colorAssist ? 4 : 2.4, alpha });
    } else {
      layer.moveTo(0, this.radius * 0.3);
      layer.lineTo(relX, relY);
      layer.stroke({ color: colorAssist ? 0xffffff : color, width: colorAssist ? 3 : 2, alpha });
      layer.circle(relX, relY, 10 + pulse * 5);
      layer.stroke({ color: colorAssist ? 0x10131c : 0xffffff, width: 1.5, alpha: 0.35 + progress * 0.35 });
    }
  }

  executeThreatAction(actionOrId, target = null, state = {}) {
    const action = typeof actionOrId === 'string' ? getEnemyThreatAction(actionOrId) : actionOrId;
    if (!action || !this.active) return [];
    const lockedTarget = target || this.getThreatLockedTarget(action, this.game?.scenes?.play?.player?.x || this.x, this.game?.scenes?.play?.player?.y || this.y + 220);
    const bullets = [];
    const add = (angle, speed, options = {}) => {
      const bullet = this.createThreatBullet(action, angle, speed, options);
      if (bullet) {
        bullets.push(bullet);
        this.game?.scenes?.play?.bulletManager?.addEnemyBullet?.(bullet);
      }
      return bullet;
    };
    const aimAngle = Math.atan2(lockedTarget.y - this.y, lockedTarget.x - this.x);
    const levelBonus = Math.min(0.45, Math.max(0, this.level - 1) * 0.025);
    const handlerId = action.handlerId || action.id;

    switch (handlerId) {
      case 'telegraph_rail_lance':
        add(aimAngle, 4.35 + levelBonus, { radius: 4, trailLength: 72, trailWidth: 3, behavior: 'lance_blink', damage: 1.05 });
        add(aimAngle + 0.025, 4.15 + levelBonus, { radius: 3.5, trailLength: 58, trailWidth: 2, damage: 0.65 });
        break;
      case 'lane_cutter': {
        const laneAngle = Math.atan2((this.game?.getHeight?.() || 600) + 40 - this.y, lockedTarget.x - this.x);
        add(laneAngle, 3.75 + levelBonus, { radius: 4, trailLength: 82, trailWidth: 4, behavior: 'lane_locked', damage: 0.95 });
        break;
      }
      case 'splitter_seed':
        add(aimAngle, 1.05, {
          radius: 7,
          behavior: 'split_after_ms',
          splitAfterMs: 850,
          onThreatSplit: (seed) => this.spawnThreatFragments(action, seed, this.level >= 6 ? 5 : 3)
        });
        break;
      case 'mine_drop':
        add(Math.PI / 2 + ((this.waveSlot % 3) - 1) * 0.08, 0.88, {
          radius: 8,
          behavior: 'mine_arming',
          splitAfterMs: this.level <= 3 ? 1150 : 950,
          maxLifetimeMs: 3600,
          onThreatSplit: (mine) => this.spawnThreatRing(action, mine, this.level >= 8 ? 10 : 7, 1.35)
        });
        break;
      case 'pulse_ring_bloom':
        this.spawnThreatRing(action, { x: this.x, y: this.y }, this.level <= 2 ? 7 : this.level <= 8 ? 9 : 11, 1.55, { gapIndex: this.waveSlot % 4 });
        break;
      case 'crossfire_pair': {
        const side = lockedTarget.side || (this.waveRole === 'left_flank' ? 1 : -1);
        add(aimAngle + side * 0.18, 2.55 + levelBonus * 0.45, { radius: 5, behavior: 'fork_zig', behaviorStrength: 0.08 });
        break;
      }
      case 'boomerang_crescent': {
        const side = this.waveRole === 'left_flank' ? 1 : this.waveRole === 'right_flank' ? -1 : (this.waveSlot % 2 ? -1 : 1);
        add(aimAngle + side * 0.32, 1.95 + levelBonus * 0.35, { radius: 6, behavior: 'boomerang_arc', arcSign: side, arcStrength: 0.0055, arcReverseMs: 640, maxLifetimeMs: 4200 });
        break;
      }
      case 'brake_dash_bolt':
        add(aimAngle, 1.45, { radius: 4.5, behavior: 'brake_then_accelerate', brakeMs: 520, dashSpeed: 4.1 + levelBonus, releaseAngle: aimAngle, trailLength: 48 });
        break;
      case 'shotgun_fan_feint': {
        const fakeout = Boolean(state.fakeout);
        if (fakeout) {
          add(aimAngle, 3.05 + levelBonus * 0.3, { radius: 4, trailLength: 54 });
        } else {
          const count = this.level >= 10 ? 6 : 5;
          const safeGap = (this.waveSlot + Math.floor(this.level / 2)) % count;
          for (let i = 0; i < count; i += 1) {
            if (i === safeGap) continue;
            const offset = (i - (count - 1) / 2) * 0.15;
            add(aimAngle + offset, 2.35 + levelBonus * 0.25, { radius: 4.5, trailLength: 38, damage: 0.82 });
          }
        }
        break;
      }
      case 'orbiting_satellites': {
        const count = this.level >= 12 ? 3 : 2;
        for (let i = 0; i < count; i += 1) {
          const orbitAngle = (Math.PI * 2 * i) / count + this.tacticalPhase;
          add(orbitAngle, 0, {
            radius: 5,
            behavior: 'orbit_then_release',
            orbitHost: this,
            orbitCenter: { x: this.x, y: this.y },
            orbitAngle,
            orbitRadius: 32 + i * 4,
            orbitSpeed: 0.08 + i * 0.015,
            releaseAfterMs: 760,
            releaseAngle: aimAngle + (i - (count - 1) / 2) * 0.22,
            releaseSpeed: 2.45 + levelBonus * 0.35,
            maxLifetimeMs: 3800
          });
        }
        break;
      }
      default:
        break;
    }

    this.game?.scenes?.play?.particleManager?.createMuzzleFlash?.(this.x, this.y, aimAngle, this.visualVariant?.accent || this.color || 0xffffff);
    return bullets;
  }

  createThreatBullet(action, angle, speed, options = {}) {
    const weaponProfile = getEnemyWeaponProfileById(action.weaponId || 'crimson_shard');
    const visualConfig = toBulletVisualConfig(weaponProfile, {
      sourceEnemyType: this.type,
      sourceFireStyle: this.generatedProfile?.fireStyle || null,
      threatActionId: action.id,
      threatActionKind: action.tags?.[0] || 'threat',
      warningColor: options.warningColor || weaponProfile.warningColor,
      haloColor: options.haloColor || weaponProfile.haloColor || this.visualVariant?.accent,
      trailColor: options.trailColor || weaponProfile.trailColor,
      ...options
    });
    const bullet = new Bullet(
      this.x,
      this.y + Math.max(4, this.radius * 0.35),
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      options.damage || 1,
      weaponProfile.color || this.color,
      false,
      visualConfig
    );
    bullet.weaponProfileId = weaponProfile.id;
    bullet.weaponLabel = weaponProfile.label;
    bullet.waveTactic = this.waveTactic?.id || null;
    bullet.threatActionId = action.id;
    bullet.threatActionKind = action.tags?.[0] || 'threat';
    return bullet;
  }

  spawnThreatFragments(action, sourceBullet, count = 3) {
    const baseAngle = Math.atan2(sourceBullet.vy || 1, sourceBullet.vx || 0);
    const spread = count >= 5 ? 0.68 : 0.42;
    for (let i = 0; i < count; i += 1) {
      const offset = count === 1 ? 0 : (i - (count - 1) / 2) * (spread / Math.max(1, count - 1));
      const bullet = this.createThreatBullet(action, baseAngle + offset, 1.85, {
        radius: 4,
        behavior: 'seed_sway',
        behaviorStrength: 0.05,
        trailLength: 28,
        maxLifetimeMs: 3600,
        damage: 0.65
      });
      bullet.x = sourceBullet.x;
      bullet.y = sourceBullet.y;
      bullet.sprite.x = bullet.x;
      bullet.sprite.y = bullet.y;
      this.game?.scenes?.play?.bulletManager?.addEnemyBullet?.(bullet);
    }
  }

  spawnThreatRing(action, source, count = 8, speed = 1.4, options = {}) {
    const gapIndex = Number.isFinite(options.gapIndex) ? options.gapIndex : -1;
    for (let i = 0; i < count; i += 1) {
      const gap = gapIndex >= 0 && Math.abs(i - gapIndex) <= 0;
      if (gap) continue;
      const angle = -Math.PI * 0.05 + Math.PI * (i / Math.max(1, count - 1));
      const bullet = this.createThreatBullet(action, angle, speed, {
        radius: 4.5,
        behavior: 'straight',
        trailLength: 26,
        maxLifetimeMs: 3800,
        damage: 0.72
      });
      bullet.x = source.x;
      bullet.y = source.y;
      bullet.sprite.x = bullet.x;
      bullet.sprite.y = bullet.y;
      this.game?.scenes?.play?.bulletManager?.addEnemyBullet?.(bullet);
    }
  }

  getThreatDebugState() {
    if (!this.threatActionDefinition) return null;
    const now = Date.now();
    return {
      id: this.threatActionDefinition.id,
      state: this.currentThreatAction ? 'telegraph' : 'cooldown',
      remainingMs: this.currentThreatAction
        ? Math.max(0, (this.currentThreatAction.startedAt + (this.threatActionDefinition.telegraphMs || 600)) - now)
        : Math.max(0, this.nextThreatActionAt - now),
      executions: this.threatActionExecutionCount
    };
  }

  canShoot() {
    return !this.currentThreatAction && this.shootCooldown <= 0 && this.y > 0 && this.y < 700 && this.sprite.visible;
  }

  getTacticalFireScalar() {
    const commandBoost = Date.now() < (this.eliteCommandUntil || 0) ? 1.28 : 1;
    const base = (this.tacticalFireScalar || 1) * commandBoost;
    const volley = this.waveTactic?.volley || null;
    if (volley === 'pulse') {
      const pulse = Math.sin(Date.now() * 0.006 + this.waveSlot * 0.8);
      return base * (pulse > 0.55 ? 2.05 : 0.16);
    }
    if (volley === 'staggered') {
      const lane = Math.floor(Date.now() / 850) % 2;
      return base * ((this.waveSlot % 2) === lane ? 1.55 : 0.3);
    }
    if (volley === 'crossfire') {
      return base * (this.waveRole === 'center' ? 0.42 : 1.38);
    }
    return base;
  }

  getTacticalShotAngles(baseAngle) {
    const pattern = this.tacticalShotPattern || 'aimed';
    const side = this.waveRole === 'left_flank' ? 1 : this.waveRole === 'right_flank' ? -1 : (this.waveSlot % 2 ? -1 : 1);
    if (pattern === 'crossfire') {
      return [{ angle: baseAngle + side * 0.22, speedMult: 1.02 }];
    }
    if (pattern === 'fan') {
      if (this.waveSlot % 2 !== 0) return [{ angle: baseAngle, speedMult: 0.96 }];
      return [-0.2, 0, 0.2].map((offset) => ({ angle: baseAngle + offset, speedMult: 0.9 }));
    }
    if (pattern === 'net') {
      if (this.waveSlot % 3 === 1) return [{ angle: baseAngle, speedMult: 0.95 }];
      return [-0.24, 0.24].map((offset) => ({ angle: baseAngle + offset, speedMult: 0.82 }));
    }
    if (pattern === 'needle') {
      return [{ angle: baseAngle, speedMult: 1.22 }];
    }
    if (pattern === 'sweep') {
      const offset = Math.sin(Date.now() * 0.004 + this.waveSlot) * 0.24;
      return [{ angle: baseAngle + offset, speedMult: 0.98 }];
    }
    if (pattern === 'burst_pair') {
      if (this.waveSlot % 2 !== 0) return [{ angle: baseAngle, speedMult: 1 }];
      return [-0.13, 0.13].map((offset) => ({ angle: baseAngle + offset, speedMult: 0.92 }));
    }
    return null;
  }

  shoot(playerX, playerY) {
    // Higher fire rate during Dive
    const delayMult = (this.state === 'DIVE') ? (this.level <= 1 ? 0.78 : 0.52) : 1.0;
    this.shootCooldown = this.shootDelay * delayMult;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return null;

    const accuracy = 0.8 + Math.random() * 0.2;
    const openingProjectileScalar = this.level <= 1 ? 0.82 : this.level === 2 ? 0.92 : 1;
    const weaponProfile = getEnemyWeaponProfileForEnemy(this);
    const weaponSpeedMult = weaponProfile?.speedMult || 1;
    const diff = BalanceConfig.difficulty;
    const levelScale = Math.max(0, this.level - 1);
    const projectileSpeed = this.game?.runPressureDirector?.scaleProjectileSpeed?.(Math.min(
      diff.enemyProjectileSpeedMax ?? Number.POSITIVE_INFINITY,
      (diff.enemyProjectileSpeed ?? 1.55) + levelScale * (diff.enemyProjectileSpeedPerLevel ?? 0)
    )) ?? Math.min(
      diff.enemyProjectileSpeedMax ?? Number.POSITIVE_INFINITY,
      (diff.enemyProjectileSpeed ?? 1.55) + levelScale * (diff.enemyProjectileSpeedPerLevel ?? 0)
    );
    const speed = projectileSpeed *
      BalanceConfig.difficulty.pressureScalar *
      openingProjectileScalar *
      ((this.middleShipProfile || this.generatedProfile)?.projectileSpeedMult || 1) *
      weaponSpeedMult;
    const vx = (dx / distance) * speed * accuracy;
    const vy = (dy / distance) * speed * accuracy;

    // Visual Config based on wave color (Default)
    let vColor = 'Red';
    if (this.waveColor && this.waveColor !== 'Black') vColor = this.waveColor;
    let vConfig = { color: vColor, index: 8 }; // Orb-like laser

    // Feature Flag + Kill Switch Check
    // Kill Switch: localStorage key "bs_disable_weapon_fx" == "1"
    const killSwitch = typeof localStorage !== 'undefined' && localStorage.getItem("bs_disable_weapon_fx") === "1";

    if (ENABLE_ENEMY_WEAPON_FX_VARIETY && !killSwitch) {
      vConfig = toBulletVisualConfig(weaponProfile, {
        sourceEnemyType: this.type,
        sourceFireStyle: (this.middleShipProfile || this.generatedProfile)?.fireStyle || null
      });
    }

    const tacticalAngles = this.getTacticalShotAngles(Math.atan2(vy, vx));
    const makeBullet = ({ angle, speedMult = 1, damage = 1 }, color, damageScale = 1) => {
      const bullet = new Bullet(
        this.x,
        this.y,
        Math.cos(angle) * speed * accuracy * speedMult,
        Math.sin(angle) * speed * accuracy * speedMult,
        damage * damageScale,
        color,
        false,
        vConfig
      );
      bullet.weaponProfileId = weaponProfile?.id || bullet.weaponProfileId;
      bullet.weaponLabel = weaponProfile?.label || bullet.weaponLabel;
      bullet.waveTactic = this.waveTactic?.id || null;
      return bullet;
    };

    if (this.middleShipProfile || this.generatedProfile) {
      const profile = this.middleShipProfile || this.generatedProfile;
      const baseAngle = Math.atan2(vy, vx);
      const tacticalPattern = tacticalAngles && tacticalAngles.length > 0
        ? tacticalAngles
        : null;
      const profilePattern = getEnemyAttackPattern(profile.fireStyle, {
        baseAngle,
        side: this.waveRole === 'left_flank' ? 1 : this.waveRole === 'right_flank' ? -1 : (this.waveSlot % 2 ? -1 : 1),
        slot: this.waveSlot,
        now: Date.now(),
        playerX,
        playerY,
        enemyX: this.x,
        enemyY: this.y
      });
      const useProfilePatternFirst = (profile.unlockLevel || 1) > 11;
      const shotPattern = useProfilePatternFirst
        ? (profilePattern || tacticalPattern)
        : (tacticalPattern || profilePattern);
      const count = shotPattern ? shotPattern.length : Math.max(1, profile.shotCount || 1);
      const spread = profile.spread || 0;
      const bullets = [];
      for (let i = 0; i < count; i += 1) {
        const tacticalShot = shotPattern?.[i] || null;
        const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
        const angle = tacticalShot?.angle ?? (baseAngle + offset);
        const jitter = profile.fireStyle === 'stutter' ? (Math.random() - 0.5) * 0.08 : 0;
        const bullet = makeBullet(
          {
            angle: angle + jitter,
            speedMult: tacticalShot?.speedMult || 1,
            damage: tacticalShot?.damage || profile.damageMult || (profile.fireStyle === 'slowHeavy' ? 1.25 : 1)
          },
          weaponProfile?.color || profile.accent || this.color,
          shotPattern && count > 1 ? 0.9 : 1
        );
        bullets.push(bullet);
      }
      return bullets.length === 1 ? bullets[0] : bullets;
    }

    if (tacticalAngles && tacticalAngles.length > 0) {
      const bullets = tacticalAngles.map((shot) =>
        makeBullet(shot, weaponProfile?.color || this.color, tacticalAngles.length > 1 ? 0.9 : 1)
      );
      return bullets.length === 1 ? bullets[0] : bullets;
    }

    const bullet = new Bullet(this.x, this.y, vx, vy, 1, weaponProfile?.color || this.color, false, vConfig);
    bullet.weaponProfileId = weaponProfile?.id || bullet.weaponProfileId;
    bullet.weaponLabel = weaponProfile?.label || bullet.weaponLabel;
    bullet.waveTactic = this.waveTactic?.id || null;
    return bullet;
  }

  applyElite() {
    if (this.isElite) return;
    this.isElite = true;
    this.health = Math.ceil(this.health * 1.6);
    this.maxHealth = this.health;
    if (this.sprite) {
      this.sprite.scale.set(this.sprite.scale.x * 1.12);
      this.sprite.tint = 0xffcc00;
    }
  }

  takeDamage(amount) {
    let resolvedAmount = amount;
    const now = Date.now();
    if (this.middleShipProfile && now < this.phaseShiftUntil) resolvedAmount *= 0.45;
    if (this.middleShipProfile && now < this.eliteShieldUntil) resolvedAmount *= 0.6;
    this.health -= resolvedAmount;
    this.updateHealthBar();
    this.sprite.tint = 0xffffff;
    // Flashing Logic: Restore correct tint
    const profileTint = (this.middleShipProfile || this.generatedProfile)?.hullTint || 0xffffff;
    const restoreColor = (this.usingEliteMiddleShipTexture || this.usingXtraAsset || this.usingGeneratedEnemyTexture)
      ? (this.state === 'DIVE' ? 0xffaaaa : profileTint)
      : (this.state === 'DIVE' ? 0xff0000 : this.color);
    setTimeout(() => { if (this.sprite) this.sprite.tint = restoreColor; }, 50);

    // Spawn debris if dead? (Handled by manager usually)

    if (this.health <= 0) {
      if (this.middleShipProfile?.specialAbility === 'splitter_clone' && !this.splitterReleased) {
        this.splitterReleased = true;
        this.game?.scenes?.play?.enemyManager?.spawnEliteSupportDrone?.(this, { count: 2, split: true });
      }
      this.active = false;
      this.deactivateVisuals('death');
      return true;
    }
    return false;
  }

  deactivateVisuals(reason = 'inactive') {
    this.visualsDeactivated = true;
    this.visualDeactivateReason = reason;
    if (this.sprite) {
      this.sprite.visible = false;
      this.sprite.renderable = false;
      if (Array.isArray(this.sprite.children)) {
        this.sprite.children.forEach(child => {
          if (child) {
            child.visible = false;
            child.renderable = false;
          }
        });
      }
    }
    if (this.healthBar) this.healthBar.visible = false;
    this.threatTelegraphLayer?.clear();
    this.eliteVfxLayer?.clear();
    if (this.visualEnhancementCleanup) {
      this.visualEnhancementCleanup();
      this.visualEnhancementCleanup = null;
    }
    if (Array.isArray(this.ownedVisuals) && this.ownedVisuals.length > 0) {
      this.ownedVisuals.forEach(visual => {
        if (!visual) return;
        visual.visible = false;
        visual.renderable = false;
        if (visual.parent) visual.parent.removeChild(visual);
        visual.destroy?.({ children: true });
      });
      this.ownedVisuals = [];
    }
  }

  destroy() {
    if (this.destroyed) {
      this.deactivateVisuals('destroy_repeat');
      return;
    }
    this.destroyed = true;
    this.active = false;
    this.waitingForEntry = false;
    if (this.middleShipProfile) {
      AudioManager.playSfx(this.middleShipProfile.sfx?.death || 'elite_death', { volume: 0.58, minIntervalMs: 120 });
    }
    this.deactivateVisuals('destroy');
    this.threatTelegraphLayer?.clear();
    if (this.currentThreatAction && this.threatActionDefinition) {
      this.game?.scenes?.play?.enemyManager?.releaseThreatAction?.(this, this.threatActionDefinition);
    }
  }
}
