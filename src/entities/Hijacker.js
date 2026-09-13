import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';
import { AudioManager } from '../audio/AudioManager.js';
import { isHijackerEnabled } from '../config/isExtrasEnabled.js';
import { getHijackerMaxHealth } from '../config/HijackerBalance.js';
import {getTractorProfile} from '../config/TractorFleet.js';
import {sampleTractorField} from '../config/TractorFields.js';
import {TractorBeamVisual} from '../effects/TractorBeamVisual.js';

const TRACTOR_BEAM_VISUAL_PROFILE = Object.freeze({
  blendMode: 'normal'
});

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
  constructor(x, y, level, game, options = {}) {
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
    this.tractorProfile = getTractorProfile(this.level, options.tractorVariant);
    this.tractorSoundGroup = `tractor_${this.tractorProfile.id}`;
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
    this.health = getHijackerMaxHealth(this.level);
    this.maxHealth = this.health;
    this.scoreValue = 500;

    // Tractor beam: readable, dangerous, escapable through hard lateral movement, and valuable if broken.
    this.beamState = 'cooldown';
    this.beamWarningMs = this.tractorProfile.warning;
    this.beamActiveMs = this.tractorProfile.active;
    this.beamCooldownMs = Math.max(3100, 4650 - this.level * 115);
    const initialBeamDelayMs = Number.isFinite(Number(options.initialBeamDelayMs))
      ? Math.max(0, Number(options.initialBeamDelayMs))
      : 1500 + Math.random() * 900;
    this.nextBeamAt = Date.now() + initialBeamDelayMs;
    this.beamStartedAt = 0;
    this.beamTarget = { x, y: y + 360 };
    this.beamPullActive = false;
    this.lastBeamToastAt = 0;
    this.destroyedDuringBeam = false;
    this.hitFeedbackUntil = 0;
    this.hitFeedbackDurationMs = 180;
    this.lastHitFeedback = null;

    this.createSprite();
  }

  createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.sortableChildren = true;

    this.beamLayer = new PIXI.Container();
    this.beamLayer.zIndex = -2;
    this.beamLayer.blendMode = TRACTOR_BEAM_VISUAL_PROFILE.blendMode;
    this.sprite.addChild(this.beamLayer);
    this.beamArtwork = new TractorBeamVisual(this.tractorProfile);
    this.beamLayer.addChild(this.beamArtwork);

    this.hitFeedbackLayer = new PIXI.Graphics();
    this.hitFeedbackLayer.zIndex = 2;
    this.hitFeedbackLayer.blendMode = 'add';
    this.hitFeedbackLayer.visible = false;
    this.sprite.addChild(this.hitFeedbackLayer);

    // Use the generated Nova Swarm hijacker craft instead of legacy UFO pack art.
    const loader = PIXI.Assets;
    const ufoPath = this.tractorProfile.sprite;

    loader.load(ufoPath).then(texture => {
      if (!this.active) return; // Destroyed before texture loaded

      const ufo = new PIXI.Sprite(texture);
      ufo.anchor.set(0.5);
      const targetSize = 140;
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
    const barWidth = 72;
    const barHeight = 7;
    const barY = Math.max(this.radius + 34, 72);
    const healthPct = Math.max(0, Math.min(1, this.health / this.maxHealth));
    const fillColor = healthPct > 0.5 ? 0x43ff9a : healthPct > 0.25 ? 0xffef7e : 0xff4b6b;

    this.healthBar.roundRect(-barWidth / 2 - 3, barY - 3, barWidth + 6, barHeight + 6, 4);
    this.healthBar.fill({ color: 0x020711, alpha: 0.88 });
    this.healthBar.stroke({ color: 0x7ee9ff, width: 1.25, alpha: 0.92 });
    this.healthBar.roundRect(-barWidth / 2, barY, barWidth, barHeight, 2);
    this.healthBar.fill({ color: 0x291228, alpha: 0.96 });

    if (healthPct > 0) {
      this.healthBar.roundRect(-barWidth / 2, barY, Math.max(2, barWidth * healthPct), barHeight, 2);
      this.healthBar.fill({ color: fillColor, alpha: 0.98 });
    }
    this.healthBar.moveTo(0, barY - 2);
    this.healthBar.lineTo(0, barY + barHeight + 2);
    this.healthBar.stroke({ color: 0xffffff, width: 1, alpha: 0.36 });
    this.healthBar._debugLayout = {
      localY: barY,
      worldY: this.y + barY,
      width: barWidth,
      height: barHeight,
      healthPct,
      belowCraft: barY > this.radius
    };
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

    this.updateHitFeedback();
    this.updateTractorBeam(delta, playerX, playerY);
  }

  triggerHitFeedback(sourceId = 'ordinary_fire') {
    if (!this.hitFeedbackLayer || this.destroyed || !this.active) return null;
    const normalizedSource = sourceId === 'chain_lightning' ? 'chain_lightning' : 'ordinary_fire';
    const color = normalizedSource === 'chain_lightning' ? 0x8fffff : 0xfff3ad;
    const accent = normalizedSource === 'chain_lightning' ? 0xffffff : 0xff55d9;
    const ringRadius = this.radius + 14;
    const braceCount = 4;
    const layer = this.hitFeedbackLayer;
    layer.clear();
    layer.circle(0, 0, ringRadius);
    layer.stroke({ color, width: 4, alpha: 0.92 });
    layer.circle(0, 0, ringRadius + 8);
    layer.stroke({ color: accent, width: 1.5, alpha: 0.72 });
    for (let i = 0; i < braceCount; i += 1) {
      const angle = (Math.PI * 2 * i) / braceCount + Math.PI / 4;
      const x1 = Math.cos(angle) * (ringRadius + 3);
      const y1 = Math.sin(angle) * (ringRadius + 3);
      const x2 = Math.cos(angle) * (ringRadius + 16);
      const y2 = Math.sin(angle) * (ringRadius + 16);
      layer.moveTo(x1, y1);
      layer.lineTo(x2, y2);
    }
    layer.stroke({ color: accent, width: 3, alpha: 0.9 });
    if (normalizedSource === 'chain_lightning') {
      layer.moveTo(-ringRadius * 0.72, ringRadius * 0.48);
      layer.lineTo(-4, -ringRadius * 0.18);
      layer.lineTo(7, ringRadius * 0.08);
      layer.lineTo(ringRadius * 0.72, -ringRadius * 0.52);
      layer.stroke({ color: 0xffffff, width: 3.5, alpha: 0.96 });
    }
    layer.visible = true;
    layer.alpha = 1;
    layer.scale.set(1);
    this.hitFeedbackUntil = Date.now() + this.hitFeedbackDurationMs;
    if (this.ufoSprite) this.ufoSprite.tint = color;
    this.lastHitFeedback = {
      sourceId: normalizedSource,
      color,
      accent,
      durationMs: this.hitFeedbackDurationMs,
      ringRadius,
      braceCount,
      visible: true
    };
    layer._debugHitFeedback = { ...this.lastHitFeedback };
    return this.lastHitFeedback;
  }

  updateHitFeedback(now = Date.now()) {
    if (!this.hitFeedbackLayer?.visible) return false;
    const remainingMs = Math.max(0, this.hitFeedbackUntil - now);
    if (remainingMs <= 0) {
      this.hitFeedbackLayer.visible = false;
      this.hitFeedbackLayer.clear();
      this.hitFeedbackLayer.alpha = 0;
      if (this.ufoSprite) this.ufoSprite.tint = 0xffffff;
      if (this.lastHitFeedback) this.lastHitFeedback = { ...this.lastHitFeedback, visible: false };
      if (this.hitFeedbackLayer._debugHitFeedback) {
        this.hitFeedbackLayer._debugHitFeedback = {
          ...this.hitFeedbackLayer._debugHitFeedback,
          visible: false,
          remainingMs: 0
        };
      }
      return false;
    }
    const progress = remainingMs / this.hitFeedbackDurationMs;
    this.hitFeedbackLayer.alpha = Math.max(0.22, progress);
    this.hitFeedbackLayer.scale.set(1 + (1 - progress) * 0.12);
    if (this.hitFeedbackLayer._debugHitFeedback) {
      this.hitFeedbackLayer._debugHitFeedback = {
        ...this.hitFeedbackLayer._debugHitFeedback,
        visible: true,
        remainingMs: Math.round(remainingMs)
      };
    }
    return true;
  }

  takeDamage(amount, options = {}) {
    if (this.destroyed || !this.active) return false;
    const brokeBeam = this.isBeamThreatening();
    this.health -= amount;
    this.updateHealthBar();
    this.triggerHitFeedback(options?.sourceId);

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
    this.beamAnchor = {x:this.x,y:this.y};
    this.playTractorSound('charge');
  }

  activateBeam(playerX, playerY) {
    this.beamState = 'active';
    this.beamStartedAt = Date.now();
    // The target is locked during the warning, never snapped to the player on activation.
    this.playTractorSound('active');
  }

  interruptBeam(reason = 'interrupted') {
    AudioManager.stopSfxGroup(this.tractorSoundGroup);
    this.beamState = 'cooldown';
    this.nextBeamAt = Date.now() + Math.max(1200, this.beamCooldownMs * 0.55);
    this.beamPullActive = false;
    this.clearBeamVisual();
    if (reason === 'hit') {
      this.playTractorSound('break');
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
        AudioManager.stopSfxGroup(this.tractorSoundGroup);
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

    const field = this.getBeamField();
    const force = sampleTractorField(this.tractorProfile,{...field,x:playerX,y:playerY});
    if(!force)return;
    const frameScale = Math.max(0,Math.min(2.6,tickDelta));
    player.x = Math.max(playerRadius,Math.min(gameWidth-playerRadius,playerX+force.x*frameScale));
    player.y = Math.max(this.y+this.radius+76,Math.min(gameHeight-playerRadius,playerY+force.y*frameScale));
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

  getBeamField() {
    const width=this.game.getWidth(),height=this.game.getHeight();
    const anchor=this.tractorProfile.id==='anchor'?this.beamAnchor:null;
    const originX=anchor?.x??this.x,originY=(anchor?.y??this.y)+this.radius*.62;
    return {originX,originY,length:Math.max(160,height-originY-20),span:Math.min(width,height*1.6),
      aim:Math.max(-width*.3,Math.min(width*.3,this.beamTarget.x-originX)),
      progress:Math.max(0,Math.min(1,(Date.now()-this.beamStartedAt)/this.beamActiveMs)),time:Date.now()/1000};
  }

  playTractorSound(event) {
    AudioManager.stopSfxGroup(this.tractorSoundGroup);
    AudioManager.playSfx(`tractor_${this.tractorProfile.id}_${event}`,{volume:event==='active'?.95:.82,
      force:true,minIntervalMs:0,priority:event==='charge'?9:8,preserveGameplayRng:true,sfxGroup:this.tractorSoundGroup});
  }

  updateBeamVisual(progress, active) {
    const field=this.getBeamField();
    this.lastBeamVisual=this.beamArtwork.render({...field,originX:field.originX-this.x,originY:field.originY-this.y,progress,active});
  }

  clearBeamVisual() {
    this.beamArtwork?.clear();
    if (this.lastBeamVisual) this.lastBeamVisual = { ...this.lastBeamVisual, active: false };
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
      variant: this.tractorProfile.id,
      name: this.tractorProfile.name,
      state: this.beamState,
      remainingMs: Math.round(remainingMs),
      pullActive: this.beamPullActive,
      health: Math.max(0, Math.round(this.health)),
      maxHealth: Math.max(0, Math.round(this.maxHealth)),
      visual: this.lastBeamVisual ? { ...this.lastBeamVisual } : null,
      hitFeedback: this.hitFeedbackLayer?._debugHitFeedback || this.lastHitFeedback,
      healthBar: this.healthBar?._debugLayout || null,
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
    AudioManager.stopSfxGroup(this.tractorSoundGroup);
    this.clearBeamVisual();

    // Play destruction audio
    AudioManager.playSfx('explosionCrunch');

    // Award points
    const playScene = this.game.scenes.play;
    if (playScene) {
      if(this.health<=0)playScene.queueThreatDefeat?.(`tractor_${this.tractorProfile.id}`, 'enemies', {
        name:this.tractorProfile.name, sector:this.level
      }, {scoreBonus:false});
      const bonus = brokeBeam ? 1200 : 0;
      const breakAward = this.scoreValue + bonus;
      this.game.addScore(breakAward);
      if (brokeBeam) {
        this.playTractorSound('break');
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
    if(this.sprite && !this.sprite.destroyed) {
      this.sprite.parent?.removeChild(this.sprite);
      this.sprite.destroy({children:true});
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
