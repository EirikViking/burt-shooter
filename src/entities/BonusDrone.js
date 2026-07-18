import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BalanceConfig } from '../config/BalanceConfig.js';
import { AudioManager } from '../audio/AudioManager.js';

export class BonusDrone {
    constructor(x, y, game, type = 'HAZARD') {
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

        const texture = GameAssets.getBonusCoreTexture();
        if (GameAssets.isValidTexture(texture)) {
            const s = new PIXI.Sprite(texture);
            s.anchor.set(0.5);
            const size = this.type === 'POWERUP' ? 52 : 46;
            s.width = size;
            s.height = size;

            if (this.type === 'POWERUP') {
                s.tint = 0xffffff;
                const glow = new PIXI.Graphics();
                glow.circle(0, 0, 30).fill({ color: 0xffffaa, alpha: 0.3 });
                this.sprite.addChild(glow);
            } else {
                s.tint = 0xffaaaa; // Red/Hostile
            }

            this.sprite.addChild(s);
            this.mainSprite = s;
        } else {
            const g = new PIXI.Graphics();
            g.circle(0, 0, 20);
            g.fill({ color: this.type === 'POWERUP' ? 0xffffff : 0xff0000 });
            this.sprite.addChild(g);
        }

        this.intentGlyph = new PIXI.Graphics();
        this.intentGlyph.label = 'bonusDroneIntentGlyph';
        this.sprite.addChild(this.intentGlyph);
        this.updateClarityVisuals(0, 1);
    }

    update(delta, remainingHazardCount = null) {
        if (!this.active) return;

        const width = this.game.getWidth();
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
            this.sprite.y = this.y + Math.sin(this.bobTimer) * 5;
            this.sprite.rotation = Math.sin(this.bobTimer * 0.5) * 0.2;

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
            this.sprite.rotation += 0.05 * delta;
        }

        this.sprite.x = this.x;
        this.updateClarityVisuals(delta, speedMultiplier);
        this.updateEdgeMarker();

        // Despawn
        if (this.y > this.game.getHeight() + 50) {
            this.hideEdgeMarker('despawn');
            if (this.type === 'POWERUP' && this.active) {
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
        const primary = isPowerup ? 0xfff2a8 : 0xff516d;
        const secondary = isPowerup ? 0x38f7ff : 0xffd15c;
        const alpha = isPowerup ? 0.38 + pulse * 0.24 : 0.34 + pulse * 0.22;

        this.intentHalo.clear();
        this.intentHalo.circle(0, 0, radius);
        this.intentHalo.stroke({ color: primary, width: isPowerup ? 2 : 1.6, alpha });
        this.intentHalo.circle(0, 0, Math.max(8, radius * 0.58));
        this.intentHalo.stroke({ color: secondary, width: 1, alpha: alpha * 0.62 });
        if (isPowerup) {
            this.intentHalo.circle(0, 0, radius + 6);
            this.intentHalo.stroke({ color: 0xffffff, width: 1, alpha: 0.08 + pulse * 0.08 });
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
            const r = radius + 5;
            const bracket = 12;
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
            this.intentGlyph.moveTo(-8, 0);
            this.intentGlyph.lineTo(8, 0);
            this.intentGlyph.moveTo(0, -8);
            this.intentGlyph.lineTo(0, 8);
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
        const tx = -ny;
        const ty = nx;
        const isPowerup = this.type === 'POWERUP';
        const pulse = Number.isFinite(this.clarityPulse) ? this.clarityPulse : 0.5;
        const primary = isPowerup ? 0xfff2a8 : 0xff516d;
        const secondary = isPowerup ? 0x38f7ff : 0xffd15c;
        const markerX = edgeX + nx * (2 + pulse * 3);
        const markerY = edgeY + ny * (2 + pulse * 3);
        const markerRadius = (isPowerup ? 15 : 13) + pulse * 3;
        const arrowLength = (isPowerup ? 15 : 13) + pulse * 2.2;
        const arrowBack = arrowLength * 0.92;
        const arrowWing = isPowerup ? 8.5 : 7.4;

        marker.clear();
        marker.visible = true;
        marker.renderable = true;
        marker.alpha = 0.82 + pulse * 0.18;
        marker.circle(markerX, markerY, markerRadius + 8);
        marker.stroke({ color: primary, width: isPowerup ? 2.2 : 1.9, alpha: 0.16 + pulse * 0.16 });
        marker.circle(markerX, markerY, markerRadius);
        marker.stroke({ color: secondary, width: 1.2, alpha: 0.24 + pulse * 0.22 });
        marker.poly([
            markerX + nx * arrowLength, markerY + ny * arrowLength,
            markerX - nx * arrowBack + tx * arrowWing, markerY - ny * arrowBack + ty * arrowWing,
            markerX - nx * arrowBack - tx * arrowWing, markerY - ny * arrowBack - ty * arrowWing
        ]);
        marker.fill({ color: primary, alpha: isPowerup ? 0.5 + pulse * 0.22 : 0.44 + pulse * 0.2 });
        marker.poly([
            markerX + nx * (arrowLength + 4), markerY + ny * (arrowLength + 4),
            markerX - nx * (arrowBack + 4) + tx * (arrowWing + 3), markerY - ny * (arrowBack + 4) + ty * (arrowWing + 3),
            markerX - nx * (arrowBack + 4) - tx * (arrowWing + 3), markerY - ny * (arrowBack + 4) - ty * (arrowWing + 3)
        ]);
        marker.stroke({ color: 0xffffff, width: 1.2, alpha: 0.22 + pulse * 0.22 });
        for (let i = 0; i < 2; i += 1) {
            marker.circle(markerX - nx * (arrowBack + 11 + i * 8), markerY - ny * (arrowBack + 11 + i * 8), 2.4 + pulse * 1.1);
        }
        marker.fill({ color: secondary, alpha: 0.28 + pulse * 0.24 });
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

        // Effect
        AudioManager.playSfx('pickup'); // Positive sound
        const voiceOk = AudioManager.playPowerupVoice();
        if (!voiceOk) {
            AudioManager.playSfx('powerup', { force: true, volume: 0.9 });
        }

        const effects = [
            { type: 'shield', weight: 1 },
            { type: 'rapid_fire', weight: 1.3 },
            { type: 'double_shot', weight: 1.1 },
            { type: 'damage_up', weight: 1.1 },
            { type: 'speed_up', weight: 1.0 },
            { type: 'pierce', weight: 0.9 },
            { type: 'slow_time', weight: 0.8 },
            { type: 'score_boost', weight: 0.8 },
            { type: 'score_x2', weight: 0.7 }
        ];

        const total = effects.reduce((sum, e) => sum + e.weight, 0);
        let roll = Math.random() * total;
        let picked = effects[0].type;
        for (const effect of effects) {
            roll -= effect.weight;
            if (roll <= 0) {
                picked = effect.type;
                break;
            }
        }

        if (picked === 'shield' && player.shieldActive) {
            const fallback = effects.find(e => e.type !== 'shield');
            picked = fallback ? fallback.type : 'score_boost';
        }

        const durations = {
            shield: 15000,
            rapid_fire: 8000,
            double_shot: 8000,
            damage_up: 8000,
            speed_up: 8000,
            pierce: 7000,
            slow_time: 8000,
            score_boost: BalanceConfig.powerups.bonusCore.scoreBoostDuration,
            score_x2: 10000
        };
        const durationMs = durations[picked] || 8000;
        console.log(`[Powerup] pickup source=bonus_core rolled=${picked} durationMs=${durationMs}`);

        if (picked === 'score_boost') {
            this.applyScoreBoost(scene);
            scene.showToast("SCORE BOOST!", { fontSize: 32, fill: '#00ff00', duration: 1200 });
            return;
        }
        if (picked === 'score_x2') {
            if (scene.applyScoreMultiplier) {
                scene.applyScoreMultiplier(2, durationMs, 'bonus_core');
            }
            return;
        }

        if (player.applyPowerup) {
            player.applyPowerup(picked);
        }
        scene.showToast(`BONUS CORE: ${picked.toUpperCase()}`, { fontSize: 28, fill: '#00ffff', duration: 1200 });
    }

    applyScoreBoost(scene) {
        // Simple boost logic: Score Multiplier
        // We need to implement this in Game or Scene
        // For now, let's just trigger the state
        if (scene.applyScoreMultiplier) {
            scene.applyScoreMultiplier(BalanceConfig.powerups.bonusCore.scoreMultiplier, BalanceConfig.powerups.bonusCore.scoreBoostDuration, 'bonus_core');
        }
    }

    destroy() {
        this.hideEdgeMarker('destroy');
        if (this.edgeMarker?.parent) this.edgeMarker.parent.removeChild(this.edgeMarker);
        if (this.sprite?.parent) this.sprite.parent.removeChild(this.sprite);
        this.edgeMarker = null;
    }
}
