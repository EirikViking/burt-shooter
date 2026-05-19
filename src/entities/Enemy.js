import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';
import { GameAssets } from '../utils/GameAssets.js';
// TASK 3: Import difficulty multiplier
import { BalanceConfig } from '../config/BalanceConfig.js';
import { enhanceEnemyVisuals } from '../utils/EnemyVisualEnhancer.js';
import { getEnemyVisualVariant } from '../config/VisualVariantCatalog.js';
import { getGeneratedEnemyProfile } from '../config/GeneratedEnemyProfiles.js';
import { getEnemyWeaponProfileForEnemy, toBulletVisualConfig } from '../config/EnemyWeaponProfiles.js';
import { getColorAssistEnabled } from '../config/AccessibilitySettings.js';

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
    this.radius = 15;

    // CLEANUP FIX: Add kind tag for cleanup targeting
    this.kind = (type === 'bonus_challenge') ? 'bonus_drone' : 'enemy';
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

    this.idlePhase = Math.random() * Math.PI * 2;
    this.spriteKey = null;
    this.xtraType = 1; // 1-5
    this.usingXtraAsset = false;
    this.generatedProfile = getGeneratedEnemyProfile(type, `${level}|${waveColor || 'none'}|${Math.round(x)}|${Math.round(y)}`);
    this.visualVariant = this.generatedProfile
      ? {
        slug: this.generatedProfile.id,
        tint: this.generatedProfile.tint,
        accent: this.generatedProfile.accent,
        scale: 1,
        wobble: 0.9 + (this.generatedProfile.spriteIndex % 7) * 0.04,
        alpha: 0.18
      }
      : getEnemyVisualVariant(type, level, waveColor, x, y);

    this.setupByType();
    this.createSprite();
  }

  setupByType() {
    if (this.generatedProfile) {
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

    // TASK 3: Apply difficulty scalars
    const diff = BalanceConfig.difficulty;
    const levelScale = Math.max(0, this.level - 1);
    const hpScale = diff.baseEnemyHealthMultiplier + levelScale * diff.hpScalePerLevel;
    const speedScale = diff.enemySpeedMultiplier + levelScale * diff.enemySpeedPerLevel;
    const fireDelayScale = 1 + levelScale * diff.enemyFireDelayPerLevel;
    const globalMult = BalanceConfig.DIFFICULTY_MULTIPLIER;

    this.health = Math.ceil(this.health * hpScale);
    this.maxHealth = this.health;
    this.speed *= speedScale * globalMult;
    this.shootDelay = (this.shootDelay * fireDelayScale) / globalMult;

    // Sprite Selection
    if (this.generatedProfile) {
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
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    let tex;
    // Check for fighter type (player ship variant)
    if (this.generatedProfile && Number.isFinite(this.generatedEnemyIndex)) {
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
      const targetWidth = this.generatedProfile?.targetWidth || 45;
      const variantScale = Number.isFinite(this.visualVariant?.scale) ? this.visualVariant.scale : 1;
      const scale = (targetWidth / tex.width) * variantScale;
      s.scale.set(scale);
      s.rotation = Math.PI; // Enemies face downward

      // Fighter enemies (player ships) get subtle tint, xtra assets no tint
      if (this.usingGeneratedEnemyTexture) {
        s.tint = 0xffffff;
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
    this.shootDelay = Math.max(38, this.shootDelay * (tactic.fireDelayMult || 1));
    this.tacticalPhase = (this.waveSlot / this.waveSize) * Math.PI * 2 + Math.random() * 0.25;
  }

  startEntry(startX, startY, endX, endY, duration, delay = 0) {
    this.x = startX;
    this.y = startY;
    this.formationX = endX;
    this.formationY = endY;
    this.state = 'ENTRY';

    // Randomized Control Point based on side
    const centerX = 400; // Game Width / 2 roughly
    const cpX = (startX < centerX) ? startX + 300 : startX - 300;
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
    let cp, end, duration = 1500;

    if (preferredDive === 'chain' || preferredDive === 'feint') {
      const side = this.waveRole === 'left_flank' ? 1 : this.waveRole === 'right_flank' ? -1 : (this.waveSlot % 2 ? -1 : 1);
      const feint = preferredDive === 'feint';
      end = { x: playerX + side * (feint ? 210 : 90), y: 730 };
      cp = { x: this.x + side * (feint ? 260 : 150), y: playerY - (feint ? 170 : 40) };
      duration = feint ? 980 : 1320;
    } else if (preferredDive === 'sweep') {
      const side = this.waveRole === 'left_flank' ? 1 : -1;
      end = { x: playerX + side * 190, y: 720 };
      cp = { x: this.waveCenterX + side * 330, y: playerY + 20 };
      duration = 1450;
    } else if (diveType < 0.4) {
      // Standard dive (40%)
      end = { x: playerX, y: 700 };
      cp = { x: (this.x + playerX) / 2 + (Math.random() - 0.5) * 200, y: (this.y + playerY) / 2 };
    } else if (diveType < 0.6) {
      // Spiral dive (20%) - wide arc
      const side = this.x < playerX ? -1 : 1;
      end = { x: playerX + side * 150, y: 700 };
      cp = { x: this.x + side * 300, y: playerY };
      duration = 1800; // Slower for more dramatic curve
    } else if (diveType < 0.8) {
      // Flanking dive (20%) - comes from side
      const flankSide = Math.random() < 0.5 ? -1 : 1;
      end = { x: flankSide * 100, y: 700 };
      cp = { x: playerX + flankSide * 250, y: playerY - 50 };
      duration = 1600;
    } else {
      // Kamikaze dive (20%) - straight at player then down
      end = { x: playerX, y: 750 };
      cp = { x: playerX, y: playerY + 100 };
      duration = 1200; // Faster!
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
        const profile = this.generatedProfile;
        const screenW = this.game?.getWidth ? this.game.getWidth() : 800;
        const swaySpeed = 0.04 + (this.idlePhase % 0.02) + (profile ? (profile.spriteIndex % 5) * 0.002 : 0);
        let swayX = Math.sin(this.moveTimer * swaySpeed + this.idlePhase) * (profile?.idleAmpX || 12);
        let swayY = Math.cos(this.moveTimer * (swaySpeed * 0.7) + this.idlePhase) * (profile?.idleAmpY || 6);
        if (profile) {
          const phase = this.moveTimer * (0.018 + (profile.spriteIndex % 4) * 0.002) + this.idlePhase;
          if (profile.movementStyle === 'zigzag') swayX += Math.sign(Math.sin(phase)) * 10;
          else if (profile.movementStyle === 'circle' || profile.movementStyle === 'orbit') {
            swayX += Math.cos(phase) * 12;
            swayY += Math.sin(phase) * 8;
          } else if (profile.movementStyle === 'drunk' || profile.movementStyle === 'flutter') {
            swayX += Math.sin(phase * 2.3) * 8;
            swayY += Math.cos(phase * 1.7) * 5;
          } else if (profile.movementStyle === 'snap') {
            swayX += Math.round(Math.sin(phase) * 2) * 6;
          } else if (profile.movementStyle === 'pincer') {
            swayX += Math.sin(phase) * (this.x < playerX ? 10 : -10);
          } else if (profile.movementStyle === 'weave') {
            swayX += Math.sin(phase * 1.4) * 14;
          }
        }
        const tacticalWave = this.moveTimer * 0.03 + this.tacticalPhase;
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
          const snap = Math.sin(tacticalWave * 1.9);
          swayX += Math.sign(snap) * 16 + Math.sin(tacticalWave * 0.65) * 10;
        } else if (this.tacticalMoveStyle === 'split_sweep') {
          swayX += side * Math.sin(tacticalWave * 0.8) * 32;
          swayY += Math.cos(tacticalWave * 1.1 + this.waveSlot) * 10;
        } else if (this.tacticalMoveStyle === 'ambush') {
          swayX += Math.round(Math.sin(tacticalWave * 1.1) * 2) * 9;
          swayY += Math.max(0, Math.sin(tacticalWave * 1.5)) * 14;
        }
        this.x = this.formationX + swayX;
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
    const cpVal = (this.x < 400) ? -300 : 1100; // Wide arc outside screen

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

  canShoot() {
    return this.shootCooldown <= 0 && this.y > 0 && this.y < 700 && this.sprite.visible;
  }

  getTacticalFireScalar() {
    const base = this.tacticalFireScalar || 1;
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
    const delayMult = (this.state === 'DIVE') ? (this.level <= 1 ? 0.6 : 0.3) : 1.0;
    this.shootCooldown = this.shootDelay * delayMult;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return null;

    const accuracy = 0.8 + Math.random() * 0.2;
    const openingProjectileScalar = this.level <= 1 ? 0.82 : this.level === 2 ? 0.92 : 1;
    const weaponProfile = getEnemyWeaponProfileForEnemy(this);
    const weaponSpeedMult = weaponProfile?.speedMult || 1;
    const speed = BalanceConfig.difficulty.enemyProjectileSpeed *
      BalanceConfig.difficulty.pressureScalar *
      openingProjectileScalar *
      (this.generatedProfile?.projectileSpeedMult || 1) *
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
        sourceFireStyle: this.generatedProfile?.fireStyle || null
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

    if (this.generatedProfile) {
      const profile = this.generatedProfile;
      const baseAngle = Math.atan2(vy, vx);
      const tacticalPattern = tacticalAngles && tacticalAngles.length > 0
        ? tacticalAngles
        : null;
      const count = tacticalPattern ? tacticalPattern.length : Math.max(1, profile.shotCount || 1);
      const spread = profile.spread || 0;
      const bullets = [];
      for (let i = 0; i < count; i += 1) {
        const tacticalShot = tacticalPattern?.[i] || null;
        const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
        const angle = tacticalShot?.angle ?? (baseAngle + offset);
        const jitter = profile.fireStyle === 'stutter' ? (Math.random() - 0.5) * 0.08 : 0;
        const bullet = makeBullet(
          {
            angle: angle + jitter,
            speedMult: tacticalShot?.speedMult || 1,
            damage: profile.fireStyle === 'slowHeavy' ? 1.25 : 1
          },
          weaponProfile?.color || profile.accent || this.color,
          tacticalPattern && count > 1 ? 0.9 : 1
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
    this.health -= amount;
    this.updateHealthBar();
    this.sprite.tint = 0xffffff;
    // Flashing Logic: Restore correct tint
    const restoreColor = (this.usingXtraAsset || this.usingGeneratedEnemyTexture)
      ? (this.state === 'DIVE' ? 0xffaaaa : 0xffffff)
      : (this.state === 'DIVE' ? 0xff0000 : this.color);
    setTimeout(() => { if (this.sprite) this.sprite.tint = restoreColor; }, 50);

    // Spawn debris if dead? (Handled by manager usually)

    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  destroy() {
    // Clean up visual enhancements
    if (this.visualEnhancementCleanup) {
      this.visualEnhancementCleanup();
      this.visualEnhancementCleanup = null;
    }
  }
}
