/**
 * TauntDirector - Central taunt management system.
 * Keeps public-facing humor focused on arcade shooter tropes.
 */

import { translateText } from '../i18n/index.js';
import { NOVA_HUMOR_POOLS } from '../i18n/novaHumorSourceText.js';

class TauntDirector {
    constructor() {
        this.scene = null;
        this.globalCooldown = 0;
        this.categoryCooldowns = new Map();
        this.recentTaunts = [];
        this.recentTauntsByCategory = new Map();
        this.maxRecent = 3;
        this.lastRotation = null;
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
            start_story: [...NOVA_HUMOR_POOLS.start_story],
            pause: [...NOVA_HUMOR_POOLS.pause],
            wave_clear_quip: [...NOVA_HUMOR_POOLS.wave_clear_quip],
            directive_complete_quip: [...NOVA_HUMOR_POOLS.directive_complete_quip],
            leaderboard_empty: [...NOVA_HUMOR_POOLS.leaderboard_empty],
            leaderboard_error: [...NOVA_HUMOR_POOLS.leaderboard_error],
            leaderboard_loaded: [...NOVA_HUMOR_POOLS.leaderboard_loaded],
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

        const recentForCategory = this.recentTauntsByCategory.get(category) || [];
        let attempts = 0;
        let text = '';
        while (attempts < 5) {
            const selected = pool[Math.floor(Math.random() * pool.length)];
            text = typeof selected === 'function' ? selected(ctx) : selected;
            if (!recentForCategory.includes(text)) break;
            attempts += 1;
        }

        recentForCategory.push(text);
        if (recentForCategory.length > Math.min(this.maxRecent, Math.max(1, pool.length - 1))) {
            recentForCategory.shift();
        }
        this.recentTauntsByCategory.set(category, recentForCategory);
        this.recentTaunts.push(text);
        if (this.recentTaunts.length > this.maxRecent) {
            this.recentTaunts.shift();
        }

        const translated = translateText(text);
        this.lastRotation = { category, source: text, text: translated };
        return translated;
    }

    getRotationDebugState() {
        return this.lastRotation ? { ...this.lastRotation } : null;
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
        this.showTaunt(translateText(text));
    }

    showTaunt(text) {
        if (!this.scene?.enqueueToast) return;
        const width = this.scene.game.getWidth();
        const y = Math.max(154, this.scene.game.getHeight() * 0.17);
        this.scene.enqueueToast(text, {
            slot: 'top',
            type: 'cabinetTaunt',
            priority: 1,
            duration: 1500,
            fontSize: width < 720 ? 17 : 22,
            fill: '#f8fbff',
            accent: 0xffef7e,
            signalPlate: true,
            y,
            maxWidth: Math.min(520, width * 0.62),
            onShown: () => this.scene?.particleManager?.createCelebrationStarburst?.(
                width / 2,
                y,
                0xffef7e,
                0x7ee9ff
            )
        });
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
