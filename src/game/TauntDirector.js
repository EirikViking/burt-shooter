/**
 * TauntDirector - Central taunt management system.
 * Keeps public-facing humor focused on arcade shooter tropes.
 */

import * as PIXI from 'pixi.js';
import { createText } from '../utils/pixiText.js';

class TauntDirector {
    constructor() {
        this.scene = null;
        this.globalCooldown = 0;
        this.categoryCooldowns = new Map();
        this.recentTaunts = [];
        this.maxRecent = 3;
        this.activeTickers = [];
        this._destroyed = false;

        this.GLOBAL_COOLDOWN = 3000;
        this.CATEGORY_COOLDOWN = 8000;

        this.pools = {
            wave_start: [
                'NEW WAVE!',
                'FORMATION PRACTICE!',
                'BUTTONS READY!',
                'INSERT COURAGE!'
            ],
            wave_cleared: [
                'WAVE CLEAR!',
                'PIXEL PERFECT!',
                'BONUS ROUTE OPEN!',
                'THE CABINET APPROVES!'
            ],
            boss_gate: [
                'BOSS INCOMING!',
                'DRAMATIC ENTRANCE!',
                'BIG HEALTH BAR ENERGY!',
                'BOSS QUEUE READY!'
            ],
            boss_spawn: [
                'BOSS IS HERE!',
                'HOLD THE LINE!',
                'DODGE WITH STYLE!',
                'LASERS UP!'
            ],
            boss_defeated: [
                'BOSS DOWN!',
                'LEGENDARY!',
                'HIGH-SCORE WEATHER!',
                'SECTOR SAVED!'
            ],
            rank_up: [
                'RANK UP!',
                'CABINET PROMOTION!',
                'BUTTON CONFIDENCE!',
                'SWARM RESPECT +1!'
            ],
            low_lives: [
                'LOW LIFE!',
                'LAST SHIP ENERGY!',
                'FOCUS THE HITBOX!',
                'DO NOT BLINK!'
            ],
            start_story: [
                'The alien formation union has filed a complaint.',
                'Arcade Control is counting quarters.',
                'The swarm rehearsed. You improvised.',
                'Boss music is waiting in the wings.',
                'Tiny ship. Enormous paperwork.',
                'Classic cabinet danger, modern panic.'
            ],
            highscore_banner: [
                'The scoreboard is awake!',
                'Initials become legends!',
                'Cabinet royalty detected!',
                'The swarm remembers!',
                'High-score orbit achieved!'
            ],
            highscore_comment: [
                'One more run fixes everything.',
                'The cabinet wants a rematch.',
                'Bonus stage paperwork approved.',
                'That score has gravity.',
                'The hitbox survived the audit.'
            ],
            highscore_taunt: [
                (ctx) => ctx ? `${ctx.speakerName}: ${ctx.targetName}, your hitbox needs coaching.` : 'Insert coin. Try again.',
                (ctx) => ctx ? `${ctx.speakerName} sends ${ctx.targetName} a dodge tutorial.` : 'Mind the hitbox.',
                (ctx) => ctx ? `Rank ${ctx.speakerRank} waves at rank ${ctx.targetRank}: ${ctx.targetName}` : 'Formation reading is fundamental.',
                (ctx) => ctx ? `${ctx.targetName}: "I tried." ${ctx.speakerName}: "The cabinet noticed."` : 'The swarm is laughing politely.',
                (ctx) => ctx ? `${ctx.speakerName}: ${ctx.targetName}, boss music was not impressed.` : 'One more run.'
            ]
        };
    }

    setScene(scene) {
        this.scene = scene;
    }

    tick(dt) {
        if (this.globalCooldown > 0) {
            this.globalCooldown -= dt * 16.67;
        }

        for (const [category, cooldown] of this.categoryCooldowns.entries()) {
            if (cooldown > 0) {
                this.categoryCooldowns.set(category, cooldown - dt * 16.67);
            }
        }
    }

    canEmit(category) {
        if (this.globalCooldown > 0) return false;
        const catCooldown = this.categoryCooldowns.get(category) || 0;
        return catCooldown <= 0;
    }

    getRotatingText(category, ctx = null) {
        const pool = this.pools[category];
        if (!pool || pool.length === 0) return '';

        let attempts = 0;
        let text = '';
        while (attempts < 5) {
            const selected = pool[Math.floor(Math.random() * pool.length)];
            text = typeof selected === 'function' ? selected(ctx) : selected;
            if (!this.recentTaunts.includes(text)) break;
            attempts += 1;
        }

        this.recentTaunts.push(text);
        if (this.recentTaunts.length > this.maxRecent) {
            this.recentTaunts.shift();
        }

        return text;
    }

    emit(category, customText = null) {
        if (!this.scene || !this.canEmit(category)) return;

        let text = customText;
        if (!text) {
            const pool = this.pools[category] || this.pools.wave_start;
            const selected = pool[Math.floor(Math.random() * pool.length)];
            text = typeof selected === 'function' ? selected() : selected;
        }

        if (this.recentTaunts.includes(text)) {
            const pool = this.pools[category] || this.pools.wave_start;
            const selected = pool[Math.floor(Math.random() * pool.length)];
            text = typeof selected === 'function' ? selected() : selected;
        }

        this.recentTaunts.push(text);
        if (this.recentTaunts.length > this.maxRecent) {
            this.recentTaunts.shift();
        }

        this.globalCooldown = this.GLOBAL_COOLDOWN;
        this.categoryCooldowns.set(category, this.CATEGORY_COOLDOWN);
        this.showTaunt(text);
    }

    showTaunt(text) {
        if (!this.scene || !this.scene.container) return;

        const container = new PIXI.Container();
        container.zIndex = 900;
        container.x = this.scene.game.getWidth() / 2;
        container.y = this.scene.game.getHeight() / 2 - 50;

        const glitchLayers = [];
        const colors = [0xff00ff, 0x00ffff, 0xffff00];

        for (let i = 0; i < 3; i++) {
            const glitchText = createText(text, {
                fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
                fontSize: 32,
                fill: colors[i],
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            });
            glitchText.anchor.set(0.5);
            glitchText.alpha = 0.3 + i * 0.2;
            glitchText.x = (i - 1) * 2;
            glitchText.y = (i - 1) * 2;
            container.addChild(glitchText);
            glitchLayers.push(glitchText);
        }

        const mainText = createText(text, {
            fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
            fontSize: 36,
            fill: '#ffffff',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        });
        mainText.anchor.set(0.5);
        container.addChild(mainText);

        if (this.scene.particleManager) {
            this.scene.particleManager.createExplosion(container.x, container.y, 0xffff00, 12);
        }

        this.scene.container.addChild(container);

        let time = 0;
        const duration = 1500;
        const fadeIn = 250;
        const hold = 1000;
        const fadeOut = 250;

        container.alpha = 0;
        container.scale.set(0.8);

        const ticker = (delta) => {
            time += delta.deltaTime * 16.67;

            if (time < fadeIn + hold) {
                glitchLayers.forEach((layer, i) => {
                    if (layer && !layer.destroyed) {
                        layer.x = (i - 1) * 2 + (Math.random() - 0.5) * 4;
                        layer.y = (i - 1) * 2 + (Math.random() - 0.5) * 4;
                    }
                });
            }

            if (!container || container.destroyed) {
                this.scene.game.app.ticker.remove(ticker);
                const idx = this.activeTickers.indexOf(ticker);
                if (idx >= 0) this.activeTickers.splice(idx, 1);
                return;
            }

            if (time < fadeIn) {
                const progress = time / fadeIn;
                container.alpha = progress;
                container.scale.set(0.8 + progress * 0.2);
            } else if (time < fadeIn + hold) {
                container.alpha = 1;
                container.scale.set(1 + Math.sin(time * 0.01) * 0.05);
            } else if (time < duration) {
                const progress = (time - fadeIn - hold) / fadeOut;
                container.alpha = 1 - progress;
                container.scale.set(1 + progress * 0.2);
            } else {
                this.scene.game.app.ticker.remove(ticker);
                const idx = this.activeTickers.indexOf(ticker);
                if (idx >= 0) this.activeTickers.splice(idx, 1);
                if (this.scene && this.scene.container) {
                    this.scene.container.removeChild(container);
                }
            }
        };

        this.scene.game.app.ticker.add(ticker);
        this.activeTickers.push(ticker);
    }

    cleanup() {
        this._destroyed = true;
        if (this.scene && this.scene.game && this.scene.game.app && this.scene.game.app.ticker) {
            this.activeTickers.forEach((ticker) => {
                this.scene.game.app.ticker.remove(ticker);
            });
        }
        this.activeTickers = [];
        console.log('[TauntDirector] Cleanup: stopped all active tickers');
    }

    destroy() {
        this.cleanup();
    }
}

export const tauntDirector = new TauntDirector();
