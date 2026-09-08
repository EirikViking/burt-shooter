import { celebrateCoreCapture } from '../effects/CoreCapture.js';
import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BONUS_CORES, pickBonusCore } from '../config/BonusCoreCatalog.js';
import { pickBonusDrone } from '../config/BonusDroneCatalog.js';
import { getBonusCoreText } from '../i18n/bonusCoreText.js';
import { coreRunState, getCoreReward, grantCoreReward } from '../progression/BonusCoreRewards.js';
import { translateText, getCurrentLanguage } from '../i18n/index.js';
import { createText } from '../utils/pixiText.js';
import { AudioManager } from '../audio/AudioManager.js';
import {
    destroyMicroSignals,
    hideMicroSignals,
    presentDirectionalSignal
} from '../effects/MicroSignalVfx.js';

export class BonusDrone {
    constructor(x, y, game, type = 'HAZARD', coreId = null) {
        this.x = x;
        this.y = y;
        this.game = game;
        this.type = type; // 'HAZARD' or 'POWERUP'
        this.active = true;
        this.radius = 20;
        // CLEANUP FIX: Add kind tag for cleanup targeting
        this.kind = 'bonus_drone';
        // Hazard drones die in one hit; power cores must be collected.
        this.health = type === 'HAZARD' ? 1 : 999;

        // Movement
        this.vx = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random());
        this.vy = type === 'HAZARD' ? (1.5 + Math.random()) : 0.8;

        // Bobbing for power cores
        this.bobTimer = 0;
        this.baseY = y;
        this.intentTimer = Math.random() * Math.PI * 2;
        this.clarityPulse = 0;
        this.edgeMarker = null;
        // Cosmetic selection uses spawn coordinates, never another gameplay roll.
        this.droneProfile = type === 'HAZARD' ? pickBonusDrone(x * 13 + y * 7) : null;
        this.visualVariant = this.droneProfile?.textureIndex || 0;
        this.scoreValue = this.droneProfile?.score || 0;
        this.coreProfile = type === 'POWERUP' ? (BONUS_CORES.find(c => c.id === coreId) || pickBonusCore(Math.random())) : null;
        this.ageSeconds = 0;
        this.fragment = this.coreProfile?.reward === 'constellation' ? Math.floor(Math.random() * 3) : 0;
        if (this.coreProfile) {
            this.vx = Math.sign(this.vx) * this.coreProfile.speed;
            this.vy = this.coreProfile.descent;
            this.radius = 24;
        }

        this.createSprite();

        if (this.type === 'POWERUP') {
            AudioManager.playSfx('spawn_special'); // Distinct spawn sound
        }
    }

    createSprite() {
        this.sprite = new PIXI.Container();
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        this.sprite.label = `bonusDrone:${this.type.toLowerCase()}`;

        this.motionTrail = new PIXI.Graphics();
        this.motionTrail.label = 'bonusDroneMotionTrail';
        this.sprite.addChild(this.motionTrail);

        this.intentHalo = new PIXI.Graphics();
        this.intentHalo.label = 'bonusDroneIntentHalo';
        this.sprite.addChild(this.intentHalo);

        const texture = this.coreProfile ? GameAssets.bonusCoreVariants?.[this.coreProfile.id] : GameAssets.getBonusDroneTexture(this.visualVariant);
        if (GameAssets.isValidTexture(texture)) {
            const s = new PIXI.Sprite(texture);
            s.anchor.set(0.5);
            const size = this.type === 'POWERUP' ? 72 : 46;
            s.width = size;
            s.height = size;

            if (this.type === 'POWERUP') {
                s.tint = 0xffffff;
            } else {
                s.tint = 0xffffff; // Hostile armor and optics are authored into the sprite.
            }

            this.sprite.addChild(s);
            this.mainSprite = s;
        } else {
            const g = new PIXI.Graphics();
            g.circle(0, 0, 20);
            g.fill({ color: this.type === 'POWERUP' ? 0xffffff : 0xff0000 });
            this.sprite.addChild(g);
            GameAssets.ensureBonusCoreTexture().then(() => {
                if (!this.active || !this.sprite || this.sprite.destroyed) return;
                const loaded = this.coreProfile ? GameAssets.bonusCoreVariants?.[this.coreProfile.id] : GameAssets.getBonusDroneTexture(this.visualVariant);
                if (!GameAssets.isValidTexture(loaded)) return;
                const hull = new PIXI.Sprite(loaded);
                hull.anchor.set(0.5);
                hull.width = hull.height = this.type === 'POWERUP' ? 72 : 46;
                const index = this.sprite.getChildIndex(g);
                this.sprite.removeChild(g); g.destroy();
                this.sprite.addChildAt(hull, index);
                this.mainSprite = hull;
            });
        }

        this.intentGlyph = new PIXI.Graphics();
        this.intentGlyph.label = 'bonusDroneIntentGlyph';
        this.sprite.addChild(this.intentGlyph);
        if (this.droneProfile) {
            this.targetLabel = createText(`${translateText('SHOOT')} · ${this.scoreValue}`, {
                fontFamily:'Rajdhani',fontSize:16,fontWeight:'bold',fill:'#ffd18a',
                stroke:{color:'#130904',width:4}
            });
            this.targetLabel.anchor.set(.5,0);this.targetLabel.y=34;
            this.sprite.addChild(this.targetLabel);
        }
        if (this.coreProfile) {
            const name = getBonusCoreText(this.coreProfile.index, getCurrentLanguage()).name;
            this.pickupLabel = createText(translateText('COLLECT: {name}', { name }), {
                fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 'bold', fill: '#fff4b7',
                stroke: { color: '#03101b', width: 4 }
            });
            this.pickupLabel.anchor.set(.5, 0); this.pickupLabel.y = 46;
            this.sprite.addChild(this.pickupLabel);
        }
        this.updateClarityVisuals(0, 1);
    }

    update(delta, remainingHazardCount = null) {
        if (!this.active) return;

        const width = this.game.getWidth();
        this.ageSeconds += Math.max(0, delta) / 60;
        if (this.coreProfile && this.pickupLabel && this.ageSeconds >= (this.nextLabelAt || 0)) {
            const scene = this.game.scenes?.play;
            if (scene?.player) {
                const name = getBonusCoreText(this.coreProfile.index, getCurrentLanguage()).name;
                const base = getCoreReward(this, scene);
                const score = this.game.getScoreAward?.(base) ?? base;
                const value = translateText(this.coreProfile.reward === 'constellation' ? '{name} · {fragment} · +{score}' : '{name} · +{score}', { name, fragment: ['I','II','III'][this.fragment], score });
                this.pickupLabel.text = translateText('COLLECT: {name}', { name: value });
            }
            this.nextLabelAt = this.ageSeconds + .15;
        }
        this.intentTimer += delta * 0.12;
        this.clarityPulse = 0.5 + Math.sin(this.intentTimer * 2.4) * 0.5;

        // TASK 1: Wave easing - reduce speed when few hazard drones remain
        // This prevents frustrating ultra-fast drones at wave end
        let speedMultiplier = 1.0;
        if (this.type === 'HAZARD' && remainingHazardCount !== null && remainingHazardCount <= 3) {
            speedMultiplier = 0.5; // Reduce speed to 50% when 3 or fewer remain
        }

        // Physics
        this.x += this.vx * delta * speedMultiplier;
        this.y += this.vy * delta * speedMultiplier;
        if (this.coreProfile) this.x += Math.sin(this.intentTimer * .38 + this.coreProfile.index) * delta * .9;

        // Wall Bounce
        if (this.x < this.radius) {
            this.x = this.radius;
            this.vx *= -1;
        } else if (this.x > width - this.radius) {
            this.x = width - this.radius;
            this.vx *= -1;
        }

        // Power core logic: special movement
        if (this.type === 'POWERUP') {
            this.bobTimer += delta * 0.1;
            // Float down slowly but bob up and down
            this.sprite.y = this.y;
            this.sprite.rotation = 0;
            if (this.mainSprite) this.mainSprite.rotation = Math.sin(this.bobTimer * .5) * .12;

            // Visual pulse
            if (this.mainSprite) {
                this.mainSprite.tint = 0xffffff;
                this.mainSprite.alpha = 0.8 + Math.sin(this.bobTimer * 2) * 0.2;
            }
        } else {
            // Hazard drones wobble, then slow down when only a few remain.
            const zigzagAmplitude = speedMultiplier < 1.0 ? 1 : 2;
            this.x += Math.sin(this.y * 0.02) * zigzagAmplitude * delta;
            this.sprite.y = this.y;
            if (this.mainSprite) {
                const target = [0, 14, 25].includes(this.visualVariant)
                    ? this.intentTimer * 0.8
                    : Math.atan2(this.vy, this.vx) + Math.PI / 2;
                this.mainSprite.rotation += Math.atan2(Math.sin(target - this.mainSprite.rotation), Math.cos(target - this.mainSprite.rotation)) * Math.min(1, delta * 0.075);
            }
        }

        this.sprite.x = this.x;
        this.updateClarityVisuals(delta, speedMultiplier);
        this.updateEdgeMarker();

        // Despawn
        if (this.y > this.game.getHeight() + 50) {
            this.hideEdgeMarker('despawn');
            if (this.type === 'POWERUP' && this.active) {
                const scene = this.game.scenes?.play;
                if (scene) coreRunState(scene).chain = 0;
                // Missed it - Fade out
                this.active = false;
                // Cooldown logic handled by manager that spawned it
            } else {
                this.active = false;
            }
        }
    }

    updateClarityVisuals(delta = 1, speedMultiplier = 1) {
        if (!this.intentHalo || !this.intentGlyph || !this.motionTrail) return;
        const isPowerup = this.type === 'POWERUP';
        const pulse = Number.isFinite(this.clarityPulse) ? this.clarityPulse : 0.5;
        const baseRadius = isPowerup ? 33 : 29;
        const radius = baseRadius + pulse * (isPowerup ? 4 : 3);
        const primary = isPowerup ? (this.coreProfile?.color || 0xfff2a8) : 0xff516d;
        const secondary = isPowerup ? 0x38f7ff : 0xffd15c;
        const alpha = isPowerup ? 0.38 + pulse * 0.24 : 0.34 + pulse * 0.22;

        this.intentHalo.clear();
        // Open acquisition arcs leave the machinery visible and separate the
        // gold collectible from the compact red shoot-target cue.
        for (let side = 0; side < 2; side++) {
            const a = side * Math.PI + (isPowerup ? 0.3 : 1.05);
            this.intentHalo.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
            this.intentHalo.arc(0, 0, radius, a, a + (isPowerup ? 0.8 : 0.35));
            this.intentHalo.stroke({ color: primary, width: isPowerup ? 2 : 1.4, alpha: alpha * 0.75 });
        }

        this.intentGlyph.clear();
        if (isPowerup) {
            const r = radius + 8;
            const chevron = 7;
            const drawChevron = (x1, y1, x2, y2, x3, y3) => {
                this.intentGlyph.moveTo(x1, y1);
                this.intentGlyph.lineTo(x2, y2);
                this.intentGlyph.lineTo(x3, y3);
            };
            drawChevron(0, -r + chevron, -chevron, -r, -chevron * 1.8, -r + chevron * 0.9);
            drawChevron(0, -r + chevron, chevron, -r, chevron * 1.8, -r + chevron * 0.9);
            drawChevron(0, r - chevron, -chevron, r, -chevron * 1.8, r - chevron * 0.9);
            drawChevron(0, r - chevron, chevron, r, chevron * 1.8, r - chevron * 0.9);
            drawChevron(-r + chevron, 0, -r, -chevron, -r + chevron * 0.9, -chevron * 1.8);
            drawChevron(-r + chevron, 0, -r, chevron, -r + chevron * 0.9, chevron * 1.8);
            drawChevron(r - chevron, 0, r, -chevron, r - chevron * 0.9, -chevron * 1.8);
            drawChevron(r - chevron, 0, r, chevron, r - chevron * 0.9, chevron * 1.8);
            this.intentGlyph.stroke({ color: primary, width: 2, alpha: 0.46 + pulse * 0.28 });
        } else {
            const r = radius - 2;
            const bracket = 5;
            const drawBracket = (sx, sy) => {
                const x = sx * r;
                const y = sy * r;
                this.intentGlyph.moveTo(x - sx * bracket, y);
                this.intentGlyph.lineTo(x, y);
                this.intentGlyph.lineTo(x, y - sy * bracket);
            };
            drawBracket(1, 1);
            drawBracket(-1, 1);
            drawBracket(1, -1);
            drawBracket(-1, -1);
            this.intentGlyph.stroke({ color: primary, width: 1.8, alpha: 0.48 + pulse * 0.3 });
        }

        const vx = Number(this.vx) || 0;
        const vy = Number(this.vy) || 0;
        const length = Math.max(0.01, Math.hypot(vx, vy));
        const nx = vx / length;
        const ny = vy / length;
        const trailLength = Math.min(42, 18 + length * (isPowerup ? 5 : 7));
        const trailAlpha = Math.max(0.12, Math.min(0.46, 0.2 + pulse * 0.18 + Math.max(0, speedMultiplier - 0.5) * 0.08));
        this.motionTrail.clear();
        for (let i = 0; i < 3; i += 1) {
            const offset = (i - 1) * (isPowerup ? 5 : 4);
            const ox = -ny * offset;
            const oy = nx * offset;
            this.motionTrail.moveTo(ox - nx * 16, oy - ny * 16);
            this.motionTrail.lineTo(ox - nx * (trailLength + i * 7), oy - ny * (trailLength + i * 7));
        }
        this.motionTrail.stroke({ color: isPowerup ? 0x38f7ff : 0xff8a45, width: isPowerup ? 2 : 1.5, alpha: trailAlpha });
        this.sprite._debugBonusClarity = {
            type: this.type,
            intent: isPowerup ? 'collect' : 'shoot',
            halo: true,
            glyph: true,
            trail: true,
            radius: Number(radius.toFixed(2)),
            trailAlpha: Number(trailAlpha.toFixed(3)),
            pulse: Number(pulse.toFixed(3)),
            delta: Number(delta || 0)
        };
    }

    ensureEdgeMarker() {
        const parent = this.sprite?.parent;
        if (!parent) return null;
        if (!this.edgeMarker) {
            this.edgeMarker = new PIXI.Graphics();
            this.edgeMarker.label = 'bonusDroneEdgeMarker';
            this.edgeMarker.zIndex = 34;
            this.edgeMarker.blendMode = 'add';
        }
        if (this.edgeMarker.parent !== parent) {
            this.edgeMarker.parent?.removeChild?.(this.edgeMarker);
            parent.addChild(this.edgeMarker);
        }
        return this.edgeMarker;
    }

    hideEdgeMarker(reason = 'hidden') {
        if (this.edgeMarker) {
            hideMicroSignals(this.edgeMarker);
            this.edgeMarker.clear();
            this.edgeMarker.visible = false;
            this.edgeMarker.renderable = false;
            this.edgeMarker.__debugBonusEdgeMarker = { visible: false, reason };
        }
        if (this.sprite?._debugBonusClarity) {
            this.sprite._debugBonusClarity.edgeMarker = false;
            this.sprite._debugBonusClarity.edgeMarkerReason = reason;
        }
    }

    updateEdgeMarker() {
        const width = Math.max(
            320,
            Number(this.game?.getWidth?.()) ||
            Number(this.game?.app?.screen?.width) ||
            Number(this.game?.width) ||
            1280
        );
        const height = Math.max(
            240,
            Number(this.game?.getHeight?.()) ||
            Number(this.game?.app?.screen?.height) ||
            Number(this.game?.height) ||
            720
        );
        const edgeInset = Math.max(24, Math.min(52, Math.min(width, height) * 0.044));
        const safeLeft = edgeInset;
        const safeRight = width - edgeInset;
        const safeTop = Math.max(edgeInset, Math.min(88, height * 0.122));
        const safeBottom = height - edgeInset;
        const edgeX = Math.max(safeLeft, Math.min(safeRight, this.x));
        const edgeY = Math.max(safeTop, Math.min(safeBottom, this.y));
        const offscreen = Math.abs(edgeX - this.x) > 0.5 || Math.abs(edgeY - this.y) > 0.5;

        if (!this.active || !offscreen) {
            this.hideEdgeMarker(this.active ? 'onscreen' : 'inactive');
            return;
        }

        const marker = this.ensureEdgeMarker();
        if (!marker) return;

        let dx = this.x - edgeX;
        let dy = this.y - edgeY;
        let dist = Math.hypot(dx, dy);
        if (!Number.isFinite(dist) || dist < 0.01) {
            dx = this.x < width / 2 ? -1 : 1;
            dy = 0;
            dist = 1;
        }
        const nx = dx / dist;
        const ny = dy / dist;
        const isPowerup = this.type === 'POWERUP';
        const pulse = Number.isFinite(this.clarityPulse) ? this.clarityPulse : 0.5;
        const primary = isPowerup ? 0xfff2a8 : 0xff516d;
        const secondary = isPowerup ? 0x38f7ff : 0xffd15c;
        const markerX = edgeX + nx * (2 + pulse * 3);
        const markerY = edgeY + ny * (2 + pulse * 3);
        const markerRadius = (isPowerup ? 15 : 13) + pulse * 3;
        const arrowLength = (isPowerup ? 15 : 13) + pulse * 2.2;

        marker.clear();
        marker.visible = true;
        marker.renderable = true;
        marker.alpha = 0.82 + pulse * 0.18;
        marker.circle(markerX, markerY, markerRadius + 8);
        marker.stroke({ color: primary, width: isPowerup ? 2.2 : 1.9, alpha: 0.16 + pulse * 0.16 });
        marker.circle(markerX, markerY, markerRadius);
        marker.stroke({ color: secondary, width: 1.2, alpha: 0.24 + pulse * 0.22 });
        presentDirectionalSignal(marker, 'bonus-drone-edge', {
            x: markerX,
            y: markerY,
            directionX: nx,
            directionY: ny,
            color: primary,
            size: arrowLength * 3.25,
            alpha: 0.78 + pulse * 0.22,
            pulse
        });
        marker.__debugBonusEdgeMarker = {
            visible: true,
            type: this.type,
            reason: 'offscreen_edge',
            edgeArrowCount: 1,
            anchor: {
                x: Math.round(edgeX),
                y: Math.round(edgeY)
            }
        };
        if (this.sprite?._debugBonusClarity) {
            this.sprite._debugBonusClarity.edgeMarker = true;
            this.sprite._debugBonusClarity.edgeMarkerReason = 'offscreen_edge';
            this.sprite._debugBonusClarity.edgeAnchor = marker.__debugBonusEdgeMarker.anchor;
        }
    }

    takeDamage(amount) {
        if (!this.active) return false;
        if (this.type === 'POWERUP') return false; // Indestructible
        this.health -= amount;
        if (this.health <= 0) {
            this.hideEdgeMarker('destroyed');
            this.active = false;
            return true;
        }
        return false;
    }

    collect(player, scene) {
        if (this.type !== 'POWERUP' || !this.active) return;

        this.hideEdgeMarker('collected');
        this.active = false;

        const result = grantCoreReward(this, scene, player);
        AudioManager.duckMusic(.38, 1600);
        AudioManager.playSfx(this.coreProfile.sound, { force: true, volume: .96, minIntervalMs: 120, priority: 7, priorityHoldMs: 1400, preserveGameplayRng: true });
        celebrateCoreCapture(scene, this, result.score);
        const name = getBonusCoreText(this.coreProfile.index, getCurrentLanguage()).name;
        let message = translateText('{name} · +{score}', { name, score: result.score });
        if (result.archiveName) message += '\n' + translateText('Archive recovered: {name}', { name: result.archiveName });
        if (this.coreProfile.reward === 'relic') message += '\n' + translateText(result.collected >= 3 ? 'Gold hull detailing unlocked' : 'Relics: {count}/3', { count: result.collected });
        scene.showToast(message, { fontSize: 24, fill: '#fff2a8', duration: 1800 });
        scene.particleManager?.createHitSpark?.(this.x, this.y, this.coreProfile.color, 2);
        this.lastReward = result;
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.active = false;
        this.hideEdgeMarker('destroy');
        destroyMicroSignals(this.edgeMarker);
        // Dispose per-instance Graphics contexts as well as detaching them.
        // Shared hull textures belong to GameAssets and must stay alive.
        this.edgeMarker?.destroy({ children: true });
        this.sprite?.destroy({ children: true, texture: false, textureSource: false });
        this.edgeMarker = null;
        this.sprite = null;
        this.mainSprite = null;
        this.motionTrail = null;
        this.intentHalo = null;
        this.intentGlyph = null;
    }
}
