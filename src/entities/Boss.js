import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';
import { extendBossNames } from '../text/phrasePool.js';
import { createBossVisual } from '../game/BossFactory.js';
import { BalanceConfig } from '../config/BalanceConfig.js';
import { createText } from '../utils/pixiText.js';
import { getBossProfile } from '../config/BossRoster.js';

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
    this.shootDelay = this.getPhaseShootDelay(1);
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
    this.profile = getBossProfile(level);
    this.color = this.profile?.palette || 0xff00ff;
    this.signatureCooldown = 0;
    this.telegraph = null;
    this.regularTelegraph = null;
    this.phaseNotified = { 2: false, 3: false };
    this.spawnedAtMs = Date.now();
    this.regularAttackReadyAt = this.spawnedAtMs + (level <= 1 ? 1800 : 1400);
    this.invulnerableUntilMs = this.spawnedAtMs + 800;

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
      fontFamily: 'Orbitron, Rajdhani, Courier New',
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
      fontFamily: 'Courier New',
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
      rotateMode: 'slow',
      rotateSpeed: 0.3,
      aimStrength: 0.6
    };

    const profile = this.profile?.movement;
    if (profile === 'orchestrate') {
      return { ...base, profile: 'sway', swayAmpX: 0.19, swayFreq: 0.52, bobAmpY: 0.014, rotateMode: 'slow', rotateSpeed: 0.16 };
    }
    if (profile === 'hammer' || profile === 'crush') {
      return { ...base, profile: 'charge_tease', swayAmpX: 0.1, bobAmpY: 0.035, rotateMode: 'aimToPlayer', rotateSpeed: 2.1, aimStrength: 0.55 };
    }
    if (profile === 'phase' || profile === 'orbit') {
      return { ...base, profile: 'orbit', swayAmpX: 0.16, swayFreq: 0.86, bobAmpY: 0.03, rotateMode: 'slow', rotateSpeed: 0.28 };
    }
    if (profile === 'stalk' || profile === 'juke' || profile === 'tick') {
      return { ...base, profile: 'zigzag', swayAmpX: 0.21, swayFreq: profile === 'tick' ? 1.5 : 1.12, bobAmpY: 0.022, rotateMode: 'aimToPlayer', rotateSpeed: 2.7, aimStrength: 0.7 };
    }
    if (profile === 'carrier') {
      return { ...base, profile: 'carrier', swayAmpX: 0.12, swayFreq: 0.46, bobAmpY: 0.018, rotateMode: 'slow', rotateSpeed: 0.12 };
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
        const push = Math.abs(Math.sin(t * 0.5)) * (gameHeight * 0.04);
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
      case 'carrier':
        this.x = this.baseX + Math.sin(t * profile.swayFreq) * swayAmp + Math.sin(t * 1.7) * (swayAmp * 0.22);
        this.y = this.bossLaneY + Math.sin(t * profile.bobFreq) * bobAmp;
        break;
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

  getBossPressureScalar() {
    if (this.level <= 1) return 0.78;
    if (this.level === 2) return 0.9;
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

  getRegularAttackIntervalMs() {
    const base = this.level <= 1 ? 2200 : this.level === 2 ? 2400 : 2700;
    const phaseScalar = this.phase === 1 ? 1 : this.phase === 2 ? 0.95 : 0.9;
    return Math.round(base * phaseScalar);
  }

  getRegularTelegraphDurationMs() {
    if (this.level <= 1) return 620;
    return this.phase >= 3 ? 460 : 540;
  }

  startPhaseChange(phase, playerX, playerY) {
    if (this.phaseNotified[phase]) return;
    this.phaseNotified[phase] = true;
    const playScene = this.game?.scenes?.play;
    if (playScene?.onBossPhaseChange) {
      playScene.onBossPhaseChange(phase, this);
    }
    const signature = this.profile?.signature || (phase === 2 ? 'cone' : 'ring');
    const type = phase === 2 && signature === 'ring' ? 'cone' : signature;
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

  startSignatureTelegraph(type, playerX, playerY) {
    this.telegraph = {
      type,
      label: this.getSignatureLabel(type),
      start: Date.now(),
      duration: type === 'ring' || type === 'adds' ? 900 : 800
    };
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
    this.updateTelegraphVisual(0, playerX, playerY);
  }

  updateTelegraphVisual(progress, playerX, playerY) {
    if (!this.telegraph) return;

    const warningColor = this.telegraph.type === 'ring' || this.telegraph.type === 'adds'
      ? (this.profile?.accent || 0xff3355)
      : (this.profile?.palette || 0xfff45c);
    const alpha = 0.55 + progress * 0.25;
    const pulse = 1 + Math.sin(Date.now() * 0.024) * 0.08;
    const originX = 0;
    const originY = 0;
    this.updateHealthBar();
    const warningLayer = this.healthBar;
    if (!warningLayer) return;

    if (this.telegraph.type === 'cone' || this.telegraph.type === 'mirror' || this.telegraph.type === 'lance') {
      const angle = Math.atan2(playerY - this.y, playerX - this.x);
      const spread = this.telegraph.type === 'lance' ? 0.18 : this.level <= 1 ? 0.55 : 0.7;
      const length = Math.max(this.radius * 2.8, 230);
      const steps = 8;
      const points = [originX, originY];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps - 0.5;
        const a = angle + t * spread;
        points.push(originX + Math.cos(a) * length * pulse, originY + Math.sin(a) * length * pulse);
      }
      warningLayer.poly(points);
      warningLayer.fill({ color: warningColor, alpha });
      warningLayer.poly(points);
      warningLayer.stroke({ color: 0xffffff, width: 2 + progress * 3, alpha: 0.42 + progress * 0.4 });
      const lanes = this.telegraph.type === 'lance' ? [-0.08, 0, 0.08] : [-0.5, -0.22, 0.22, 0.5];
      for (const lane of lanes) {
        const a = angle + lane * spread;
        warningLayer.moveTo(originX + Math.cos(a) * this.radius * 0.7, originY + Math.sin(a) * this.radius * 0.7);
        warningLayer.lineTo(originX + Math.cos(a) * length * pulse, originY + Math.sin(a) * length * pulse);
      }
      warningLayer.stroke({ color: warningColor, width: 2 + progress * 2, alpha: 0.62 + progress * 0.25 });
    } else {
      const maxRadius = Math.max(this.radius * 2.15, 170);
      const innerRadius = maxRadius * 0.46;
      const outer = maxRadius * (0.72 + progress * 0.34) * pulse;
      const inner = innerRadius * (0.8 + progress * 0.16);
      warningLayer.circle(originX, originY + 18, outer);
      warningLayer.stroke({ color: warningColor, width: 5, alpha: 0.68 + progress * 0.25 });
      warningLayer.circle(originX, originY + 18, inner);
      warningLayer.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 * i) / 12 + progress * 0.3;
        const r1 = inner + 8;
        const r2 = outer - 8;
        warningLayer.moveTo(originX + Math.cos(a) * r1, originY + 18 + Math.sin(a) * r1);
        warningLayer.lineTo(originX + Math.cos(a) * r2, originY + 18 + Math.sin(a) * r2);
      }
      warningLayer.stroke({ color: warningColor, width: 2, alpha: 0.36 });
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
      for (let i = -2; i <= 2; i++) {
        const x = i * Math.min(30, gameWidth * 0.035);
        layer.roundRect(x - 7, originY + this.radius * 0.35, 14, length * pulse, 8);
        layer.fill({ color: warningColor, alpha });
        layer.moveTo(x, originY + this.radius * 0.2);
        layer.lineTo(x, originY + length * pulse);
      }
      layer.stroke({ color: 0xffffff, width, alpha: 0.34 + progress * 0.26 });
      return;
    }

    const spread = this.regularTelegraph.type === 'fan'
      ? (this.level <= 1 ? 0.34 : 0.48)
      : (this.regularTelegraph.attack === 'sniper' ? 0.08 : 0.18);
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
    if (type === 'cone') {
      this.fireCone(playerX, playerY, this.level <= 1 ? 5 : 9, this.level <= 1 ? 0.55 : 0.7);
    } else if (type === 'mirror') {
      this.fireCone(playerX, playerY, this.level <= 1 ? 5 : 7, 0.42);
      this.fireRingBurst(this.level <= 1 ? 8 : 12, 3);
    } else if (type === 'lance') {
      this.fireCone(playerX, playerY, 3, 0.16);
    } else if (type === 'adds') {
      const playScene = this.game?.scenes?.play;
      playScene?.enemyManager?.spawnBossAdds(this.level <= 1 ? 2 : 5);
      this.fireRingBurst(this.level <= 1 ? 8 : 14, 3);
    } else if (type === 'ring') {
      this.fireRingBurst(this.level <= 1 ? 12 : 18, this.level <= 1 ? 2 : 3);
      const playScene = this.game?.scenes?.play;
      if (this.level > 1) {
        playScene?.enemyManager?.spawnBossAdds(4);
      }
    }
  }

  fireCone(playerX, playerY, shots = 7, spread = 0.6) {
    const bullets = [];
    for (let i = 0; i < shots; i++) {
      const t = (i / (shots - 1)) - 0.5;
      const angle = Math.atan2(playerY - this.y, playerX - this.x) + t * spread;
      const speed = BalanceConfig.difficulty.bossProjectileSpeedPhase2 *
        BalanceConfig.difficulty.pressureScalar *
        this.getBossPressureScalar();
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      bullets.push(new Bullet(this.x, this.y + 20, vx, vy, 1, this.color));
    }
    bullets.forEach(b => this.game.scenes.play.bulletManager.addEnemyBullet(b));
  }

  fireRingBurst(count = 16, gapSize = 2) {
    const bullets = [];
    for (let i = 0; i < count; i++) {
      if (i % gapSize === 0) continue;
      const angle = (i / count) * Math.PI * 2;
      const speed = BalanceConfig.difficulty.bossProjectileSpeedPhase3 *
        BalanceConfig.difficulty.pressureScalar *
        this.getBossPressureScalar();
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      bullets.push(new Bullet(this.x, this.y + 20, vx, vy, 1, this.color));
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
    this.shootCooldown = this.shootDelay;
    this.regularAttackReadyAt = Date.now() + this.getRegularAttackIntervalMs();
    this.regularTelegraph = null;
    this.clearRegularAttackTelegraphVisual();
    const bullets = [];

    // Boss FX
    const killSwitch = typeof localStorage !== 'undefined' && localStorage.getItem("bs_disable_weapon_fx") === "1";
    const vConfig = (ENABLE_BOSS_WEAPON_FX && !killSwitch) ? { color: 'Red', index: 5 } : null;
    const attack = this.profile?.attack || 'aimed';
    const pressure = BalanceConfig.difficulty.pressureScalar * this.getBossPressureScalar();
    const aimAngle = Math.atan2(playerY - this.y, playerX - this.x);
    const addBullet = (x, y, angle, speed, color = this.color) => {
      bullets.push(new Bullet(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        1,
        color,
        false,
        vConfig
      ));
    };

    if (attack === 'fan' || attack === 'burst' || attack === 'fakeout') {
      const count = this.phase === 1 ? 1 : attack === 'burst' ? 5 : 3;
      const spread = this.phase === 1 ? 0 : attack === 'fakeout' ? 0.46 : 0.34;
      const speed = (this.phase === 1 ? BalanceConfig.difficulty.bossProjectileSpeedPhase1 : BalanceConfig.difficulty.bossProjectileSpeedPhase2) * pressure;
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : (i / (count - 1)) - 0.5;
        addBullet(this.x, this.y, aimAngle + t * spread, speed);
      }
    } else if (attack === 'spiral' || attack === 'clock' || attack === 'chord') {
      const count = attack === 'chord' ? 6 : this.phase === 1 ? 4 : 8;
      const speed = (this.phase === 3 ? BalanceConfig.difficulty.bossProjectileSpeedPhase3 : BalanceConfig.difficulty.bossProjectileSpeedPhase2) * pressure;
      const offset = attack === 'clock'
        ? Math.floor(this.moveTimer / 26) * (Math.PI / 8)
        : this.moveTimer * 0.045;
      for (let i = 0; i < count; i++) {
        if (attack === 'clock' && this.phase < 3 && i % 4 === 0) continue;
        addBullet(this.x, this.y, (Math.PI * 2 * i) / count + offset, speed);
      }
    } else if (attack === 'split' || attack === 'sniper' || attack === 'wall') {
      const speed = (this.phase === 1 ? BalanceConfig.difficulty.bossProjectileSpeedPhase1 : BalanceConfig.difficulty.bossProjectileSpeedPhase2) * pressure;
      if (attack === 'sniper') {
        addBullet(this.x, this.y, aimAngle, speed * 1.16);
        if (this.phase >= 3) {
          addBullet(this.x - 28, this.y, aimAngle + 0.08, speed);
          addBullet(this.x + 28, this.y, aimAngle - 0.08, speed);
        }
      } else if (attack === 'wall') {
        for (let i = -2; i <= 2; i++) {
          addBullet(this.x + i * 24, this.y, Math.PI / 2 + i * 0.05, speed * 0.82);
        }
      } else {
        addBullet(this.x - 22, this.y, aimAngle - 0.18, speed);
        addBullet(this.x + 22, this.y, aimAngle + 0.18, speed);
      }
    } else if (attack === 'summon') {
      const speed = BalanceConfig.difficulty.bossProjectileSpeedPhase1 * pressure;
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
      const speed = BalanceConfig.difficulty.bossProjectileSpeedPhase1 *
        BalanceConfig.difficulty.pressureScalar *
        this.getBossPressureScalar();
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
      // 3-shot spread keeps the first boss readable while still punishing tunnel vision.
      for (let i = -1; i <= 1; i++) {
        const angle = Math.atan2(playerY - this.y, playerX - this.x) + i * 0.25;
        const speed = BalanceConfig.difficulty.bossProjectileSpeedPhase2 *
          BalanceConfig.difficulty.pressureScalar *
          this.getBossPressureScalar();
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
      // 8-bullet spiral with visible gaps.
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + this.moveTimer * 0.05;
        const speed = BalanceConfig.difficulty.bossProjectileSpeedPhase3 *
          BalanceConfig.difficulty.pressureScalar *
          this.getBossPressureScalar();
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
