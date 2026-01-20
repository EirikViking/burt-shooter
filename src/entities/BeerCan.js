import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BalanceConfig } from '../config/BalanceConfig.js';
import { AudioManager } from '../audio/AudioManager.js';

export class BeerCan {
    constructor(x, y, game, type = 'HAZARD') {
        this.x = x;
        this.y = y;
        this.game = game;
        this.type = type; // 'HAZARD' or 'POWERUP' (White)
        this.active = true;
        this.radius = 20;
        // CLEANUP FIX: Add kind tag for cleanup targeting
        this.kind = 'beer_can';
        // HAZARD cans: 1 hp so they die in one hit (was 3, felt indestructible)
        // POWERUP cans: 999 hp (effectively indestructible, must be collected)
        this.health = type === 'HAZARD' ? 1 : 999;

        // Movement
        this.vx = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random());
        this.vy = type === 'HAZARD' ? (1.5 + Math.random()) : 0.8; // White cans float slower

        // Bobbing for White Can
        this.bobTimer = 0;
        this.baseY = y;

        this.createSprite();

        if (this.type === 'POWERUP') {
            AudioManager.playSfx('spawn_special'); // Distinct spawn sound
        }
    }

    createSprite() {
        this.sprite = new PIXI.Container();
        this.sprite.x = this.x;
        this.sprite.y = this.y;

        const texture = GameAssets.getBeer();
        if (GameAssets.isValidTexture(texture)) {
            const s = new PIXI.Sprite(texture);
            s.anchor.set(0.5);
            s.width = 40;
            s.height = 56;

            if (this.type === 'POWERUP') {
                s.tint = 0xffffff; // White/Gold check
                // Maybe add a glow or separate effect
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
    }

    update(delta, remainingHazardCount = null) {
        if (!this.active) return;

        const width = this.game.getWidth();

        // TASK 1: Wave easing - reduce speed when few hazard cans remain
        // This prevents frustrating ultra-fast cans at wave end
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

        // White Can Logic: Special movement (Bobbing / Float)
        if (this.type === 'POWERUP') {
            this.bobTimer += delta * 0.1;
            // Float down slowly but bob up and down
            this.sprite.y = this.y + Math.sin(this.bobTimer) * 5;
            this.sprite.rotation = Math.sin(this.bobTimer * 0.5) * 0.2;

            // Visual pulse
            if (this.mainSprite) {
                this.mainSprite.tint = 0xffffff; // Ensure white
                this.mainSprite.alpha = 0.8 + Math.sin(this.bobTimer * 2) * 0.2;
            }
        } else {
            // Hazard Logic: Zig Zag drunk
            // TASK 1: Reduce zigzag amplitude when few cans remain
            const zigzagAmplitude = speedMultiplier < 1.0 ? 1 : 2;
            this.x += Math.sin(this.y * 0.02) * zigzagAmplitude * delta;
            this.sprite.y = this.y;
            this.sprite.rotation += 0.05 * delta;
        }

        this.sprite.x = this.x;

        // Despawn
        if (this.y > this.game.getHeight() + 50) {
            if (this.type === 'POWERUP' && this.active) {
                // Missed it - Fade out
                this.active = false;
                // Cooldown logic handled by manager that spawned it
            } else {
                this.active = false;
            }
        }
    }

    takeDamage(amount) {
        if (this.type === 'POWERUP') return false; // Indestructible
        this.health -= amount;
        if (this.health <= 0) {
            this.active = false;
            return true;
        }
        return false;
    }

    collect(player, scene) {
        if (this.type !== 'POWERUP' || !this.active) return;

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
            { type: 'bullet_shield', weight: 0.9 },
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
            score_boost: BalanceConfig.powerups.whiteCan.scoreBoostDuration,
            score_x2: 10000
        };
        const durationMs = durations[picked] || 8000;
        console.log(`[Powerup] pickup source=beer_can rolled=${picked} durationMs=${durationMs}`);

        if (picked === 'score_boost') {
            this.applyScoreBoost(scene);
            scene.showToast("SCORE BOOST!", { fontSize: 32, fill: '#00ff00', duration: 1200 });
            return;
        }
        if (picked === 'score_x2') {
            if (scene.applyScoreMultiplier) {
                scene.applyScoreMultiplier(2, durationMs, 'beer_can');
            }
            return;
        }

        if (player.applyPowerup) {
            player.applyPowerup(picked);
        }
        scene.showToast(`WHITE CAN: ${picked.toUpperCase()}`, { fontSize: 28, fill: '#00ffff', duration: 1200 });
    }

    applyScoreBoost(scene) {
        // Simple boost logic: Score Multiplier
        // We need to implement this in Game or Scene
        // For now, let's just trigger the state
        if (scene.applyScoreMultiplier) {
            scene.applyScoreMultiplier(BalanceConfig.powerups.whiteCan.scoreMultiplier, BalanceConfig.powerups.whiteCan.scoreBoostDuration, 'white_can');
        }
    }
}
