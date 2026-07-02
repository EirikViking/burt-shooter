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

    // Tractor beam: readable, dangerous, escapable through hard lateral movement, and valuable if broken.
    this.beamState = 'cooldown';
    this.beamWarningMs = 820;
    this.beamActiveMs = 1850;
    this.beamCooldownMs = Math.max(3100, 4650 - this.level * 115);
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
    this.beamLayer.blendMode = 'add';
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
    AudioManager.playSfx('tractor_lock_charge', { volume: 0.58, minIntervalMs: 900 });
  }

  activateBeam(playerX, playerY) {
    this.beamState = 'active';
    this.beamStartedAt = Date.now();
    this.beamTarget = { x: playerX, y: playerY };
    AudioManager.playSfx('tractor_beam_active', { volume: 0.56, minIntervalMs: 900 });
  }

  interruptBeam(reason = 'interrupted') {
    this.beamState = 'cooldown';
    this.nextBeamAt = Date.now() + Math.max(1200, this.beamCooldownMs * 0.55);
    this.beamPullActive = false;
    this.clearBeamVisual();
    if (reason === 'hit') {
      AudioManager.playSfx('tractor_break_bloom', { volume: 0.5, minIntervalMs: 180 });
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

    const frameScale = Math.max(0.5, Math.min(2.6, tickDelta));
    const beamCentering = 0.052 + Math.min(0.024, this.level * 0.0018);
    const pullX = (this.x - playerX) * beamCentering * frameScale;
    const pullY = (3.85 + Math.min(2.4, this.level * 0.11)) * frameScale;
    player.x = Math.max(playerRadius, Math.min(gameWidth - playerRadius, playerX + pullX));
    player.y = Math.max(this.y + this.radius + 76, playerY - pullY);
    this.beamPullActive = true;

    const debuffResult = player.applyTractorDebuff?.({
      source: 'hijacker_tractor',
      x: this.x,
      y: this.y
    });
    if (debuffResult?.applied) {
      playScene.showToast(`${debuffResult.effect.label} - BREAK AWAY!`, {
        fontSize: this.game.getWidth() < 620 ? 15 : 19,
        fill: '#ffdde8',
        stroke: '#250012',
        strokeThickness: 4,
        duration: 1000,
        slot: 'corner',
        type: 'hijacker',
        priority: 5
      });
      this.lastBeamToastAt = nowish();
    }

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
    const now = Date.now();
    const pulse = 1 + Math.sin(now * 0.028) * 0.06;
    const shimmer = 0.5 + Math.sin(now * 0.05) * 0.5;
    const coreColor = active ? 0x66ffff : 0xff66ff;
    const edgeColor = active ? 0xffffff : 0xffe066;
    const warningColor = active ? 0x28dfff : 0xff3fcf;
    const hotColor = active ? 0x9cfff7 : 0xfff090;
    const startY = this.radius * 0.62;
    const endX = relX;
    const endY = relY;

    const coneWidth = halfWidth * pulse;
    const innerWidth = coneWidth * (active ? 0.55 : 0.42 + progress * 0.08);
    const tipY = startY + 4;
    const drawCone = (width, color, alpha) => {
      layer.moveTo(0, tipY);
      layer.lineTo(endX - width, endY);
      layer.lineTo(endX + width, endY);
      layer.closePath();
      layer.fill({ color, alpha });
    };

    drawCone(coneWidth * 1.18, warningColor, active ? 0.1 : 0.06 + progress * 0.08);
    drawCone(coneWidth, coreColor, active ? 0.19 : 0.09 + progress * 0.13);
    drawCone(innerWidth, 0xffffff, active ? 0.06 + shimmer * 0.04 : 0.04 + progress * 0.05);

    const edgePoints = [
      [endX - coneWidth, endY],
      [endX + coneWidth, endY]
    ];
    for (const [x, y] of edgePoints) {
      layer.moveTo(0, tipY);
      layer.lineTo(x, y);
    }
    layer.stroke({ color: 0xffffff, width: active ? 8 : 4 + progress * 3, alpha: active ? 0.2 : 0.12 + progress * 0.26 });
    for (const [x, y] of edgePoints) {
      layer.moveTo(0, tipY);
      layer.lineTo(x, y);
    }
    layer.stroke({ color: edgeColor, width: active ? 3.5 : 2 + progress * 1.8, alpha: active ? 0.68 : 0.28 + progress * 0.42 });

    const strandCount = active ? 7 : 5;
    for (let i = 0; i < strandCount; i++) {
      const lane = strandCount === 1 ? 0 : (i / (strandCount - 1) - 0.5);
      const phase = now * (0.006 + i * 0.0006) + i * 1.7;
      const widthAtEnd = innerWidth * (0.18 + Math.abs(lane) * 1.15);
      const targetX = endX + lane * widthAtEnd + Math.sin(phase) * (active ? 10 : 5);
      const targetY = endY - Math.sin(phase * 0.8) * 10;
      layer.moveTo(Math.sin(phase) * 4, tipY + 3);
      layer.lineTo(targetX, targetY);
    }
    layer.stroke({ color: hotColor, width: active ? 2.2 : 1.6, alpha: active ? 0.42 + shimmer * 0.18 : 0.18 + progress * 0.28 });

    const rings = active ? 6 : 4;
    for (let i = 1; i <= rings; i++) {
      const t = i / (rings + 1);
      const x = endX * t;
      const y = startY + (endY - startY) * t;
      const ringPulse = 0.88 + progress * 0.2 + Math.sin(now * 0.012 + i) * 0.08;
      const r = (halfWidth * t * 0.58 + 10) * ringPulse * pulse;
      layer.ellipse(x, y, r, Math.max(8, r * 0.22));
      layer.stroke({ color: i % 2 ? coreColor : edgeColor, width: active ? 2.5 : 1.5, alpha: active ? 0.5 : 0.22 + progress * 0.26 });
      if (active) {
        const nodeA = now * 0.006 + i;
        layer.circle(x + Math.cos(nodeA) * r, y + Math.sin(nodeA) * r * 0.22, 3.5 + shimmer * 2);
        layer.fill({ color: 0xffffff, alpha: 0.34 });
      }
    }

    if (active) {
      layer.ellipse(endX, endY, coneWidth * 0.64, Math.max(14, coneWidth * 0.14));
      layer.stroke({ color: 0xffffff, width: 3, alpha: 0.46 });
      layer.ellipse(endX, endY, coneWidth * 0.46, Math.max(10, coneWidth * 0.1));
      layer.stroke({ color: coreColor, width: 3, alpha: 0.62 });
      layer.circle(0, tipY, 13 + shimmer * 5);
      layer.fill({ color: coreColor, alpha: 0.2 });
      layer.circle(0, tipY, 6 + shimmer * 2);
      layer.fill({ color: 0xffffff, alpha: 0.42 });
    }

    this.drawBeamLattice(layer, {
      active,
      progress,
      now,
      tipY,
      endX,
      endY,
      coneWidth,
      innerWidth,
      coreColor,
      edgeColor,
      hotColor,
      shimmer
    });
    this.drawBeamLockMandala(layer, {
      active,
      progress,
      now,
      tipY,
      coreColor,
      edgeColor,
      hotColor,
      shimmer
    });
    this.drawBeamCaptureGlyph(layer, {
      active,
      progress,
      now,
      endX,
      endY,
      coneWidth,
      coreColor,
      edgeColor,
      hotColor,
      shimmer
    });
  }

  drawBeamLattice(layer, {
    active,
    progress,
    now,
    tipY,
    endX,
    endY,
    coneWidth,
    innerWidth,
    coreColor,
    edgeColor,
    hotColor,
    shimmer
  }) {
    const beamDx = endX;
    const beamDy = endY - tipY;
    const length = Math.max(1, Math.hypot(beamDx, beamDy));
    const normalX = -beamDy / length;
    const normalY = beamDx / length;
    const laneCount = active ? 7 : 5;
    const segmentCount = active ? 7 : 5;

    for (let i = 0; i < laneCount; i += 1) {
      const lane = laneCount === 1 ? 0 : (i / (laneCount - 1) - 0.5);
      const phase = now * (0.008 + i * 0.0007) + i * 1.37;
      for (let s = 0; s <= segmentCount; s += 1) {
        const t = s / segmentCount;
        const widthAtT = innerWidth * (0.12 + t * 0.92);
        const braid = Math.sin(phase + t * Math.PI * 3.2) * (active ? 8 : 4) * (0.25 + t);
        const lateral = lane * widthAtT + braid;
        const x = beamDx * t + normalX * lateral;
        const y = tipY + beamDy * t + normalY * lateral;
        if (s === 0) layer.moveTo(x, y);
        else layer.lineTo(x, y);
      }
    }
    layer.stroke({
      color: hotColor,
      width: active ? 2.4 : 1.6,
      alpha: active ? 0.44 + shimmer * 0.18 : 0.16 + progress * 0.34
    });

    const rungCount = active ? 8 : 5;
    for (let i = 1; i <= rungCount; i += 1) {
      const t = i / (rungCount + 1);
      const centerX = beamDx * t;
      const centerY = tipY + beamDy * t;
      const half = coneWidth * (0.18 + t * 0.62) * (active ? 0.68 : 0.5);
      const skew = Math.sin(now * 0.011 + i) * (active ? 8 : 4);
      layer.moveTo(centerX - normalX * half + beamDx / length * skew, centerY - normalY * half + beamDy / length * skew);
      layer.lineTo(centerX + normalX * half + beamDx / length * skew, centerY + normalY * half + beamDy / length * skew);
    }
    layer.stroke({
      color: active ? 0xffffff : edgeColor,
      width: active ? 1.8 : 1.2,
      alpha: active ? 0.26 : 0.12 + progress * 0.24
    });

    if (!active) return;
    for (let i = 0; i < 5; i += 1) {
      const t = ((now * 0.0007 + i * 0.2) % 1);
      const x = beamDx * t;
      const y = tipY + beamDy * t;
      const r = 4 + shimmer * 3 + i * 0.4;
      layer.circle(x + Math.sin(now * 0.018 + i) * 10, y, r);
      layer.fill({ color: i % 2 ? coreColor : 0xffffff, alpha: 0.22 });
    }
  }

  drawBeamLockMandala(layer, { active, progress, now, tipY, coreColor, edgeColor, hotColor, shimmer }) {
    const charge = active ? 1 : progress;
    const spin = now * (active ? 0.006 : 0.003);
    const outer = this.radius * (0.82 + charge * 0.42) + shimmer * 4;
    this.drawBeamArc(layer, 0, tipY, outer, outer * 0.58, spin, spin + Math.PI * 0.72, edgeColor, active ? 2.2 : 1.6, active ? 0.52 : 0.18 + progress * 0.34);
    this.drawBeamArc(layer, 0, tipY, outer * 0.78, outer * 0.44, spin + Math.PI, spin + Math.PI * 1.72, hotColor, active ? 2.4 : 1.5, active ? 0.44 : 0.16 + progress * 0.28);
    for (let i = 0; i < 10; i += 1) {
      const a = spin + i * Math.PI * 0.2;
      const inner = outer * 0.34;
      const tip = outer * (0.72 + (i % 2) * 0.2);
      layer.moveTo(Math.cos(a) * inner, tipY + Math.sin(a) * inner * 0.52);
      layer.lineTo(Math.cos(a) * tip, tipY + Math.sin(a) * tip * 0.52);
    }
    layer.stroke({ color: coreColor, width: active ? 1.6 : 1.1, alpha: active ? 0.38 : 0.12 + progress * 0.24 });
  }

  drawBeamCaptureGlyph(layer, {
    active,
    progress,
    now,
    endX,
    endY,
    coneWidth,
    coreColor,
    edgeColor,
    hotColor,
    shimmer
  }) {
    const lockAlpha = active ? 0.58 : 0.18 + progress * 0.34;
    const lockR = Math.max(24, coneWidth * (active ? 0.24 : 0.18 + progress * 0.08));
    const spin = now * (active ? -0.006 : -0.003);
    for (let i = 0; i < 4; i += 1) {
      const a = spin + i * Math.PI * 0.5;
      this.drawBeamArc(layer, endX, endY, lockR, lockR * 0.38, a - 0.22, a + 0.34, i % 2 ? coreColor : edgeColor, active ? 2.4 : 1.6, lockAlpha);
    }
    for (let i = 0; i < 6; i += 1) {
      const a = spin * 1.3 + i * Math.PI / 3;
      const outerX = endX + Math.cos(a) * lockR * 1.12;
      const outerY = endY + Math.sin(a) * lockR * 0.42;
      const innerX = endX + Math.cos(a) * lockR * 0.74;
      const innerY = endY + Math.sin(a) * lockR * 0.28;
      layer.moveTo(innerX, innerY);
      layer.lineTo(outerX, outerY);
    }
    layer.stroke({ color: hotColor, width: active ? 1.9 : 1.2, alpha: active ? 0.42 + shimmer * 0.1 : 0.12 + progress * 0.24 });
    if (active) {
      layer.circle(endX, endY, 5 + shimmer * 3);
      layer.fill({ color: 0xffffff, alpha: 0.32 });
    }
  }

  drawBeamArc(layer, cx, cy, rx, ry, start, end, color, width, alpha) {
    const steps = 12;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const a = start + (end - start) * t;
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      if (i === 0) layer.moveTo(x, y);
      else layer.lineTo(x, y);
    }
    layer.stroke({ color, width, alpha });
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
      const breakAward = this.scoreValue + bonus;
      this.game.addScore(breakAward);
      if (brokeBeam) {
        AudioManager.playSfx('tractor_break_bloom', { force: true, volume: 0.72, minIntervalMs: 120 });
        const hijackResult = playScene.triggerTractorHijack?.({
          x: this.x,
          y: this.y,
          level: this.level
        });
        playScene.clearEnemyBullets?.('tractor_break');
        const hijacked = hijackResult?.triggered;
        const totalAward = breakAward + (hijackResult?.bonusScore || 0);
        playScene.showToast(`${hijacked ? 'TRACTOR HIJACK' : 'TRACTOR BREAK'} +${totalAward}`, {
          fontSize: this.game.getWidth() < 620 ? 17 : 24,
          fill: hijacked ? '#ffe066' : '#66ffff',
          stroke: '#00111d',
          strokeThickness: 5,
          duration: hijacked ? 1650 : 1500,
          slot: 'center',
          type: 'hijacker',
          priority: hijacked ? 6 : 5
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
