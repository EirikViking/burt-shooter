/**
 * TauntDirector - Central taunt management system
 * Handles cooldowns, anti-spam, and visually stunning taunt presentation
 */

import * as PIXI from 'pixi.js';
import { onLanguageChange, t } from '../i18n/index.ts';

// Simple helper for random text generation
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

class TauntDirector {
    constructor() {
        this.scene = null;
        this.globalCooldown = 0;
        this.categoryCooldowns = new Map();
        this.recentTaunts = [];
        this.maxRecent = 3;
        this.activeTickers = []; // Track active tickers for cleanup
        this._destroyed = false;

        // Cooldown durations (ms)
        this.GLOBAL_COOLDOWN = 3000; // 3 seconds between any taunts
        this.CATEGORY_COOLDOWN = 8000; // 8 seconds per category

        // Taunt pools by category
        this.pools = this.buildPools();
        this.langUnsubscribe = onLanguageChange(() => {
            this.pools = this.buildPools();
        });
    }
    buildPools() {
        return {
            wave_start: [
                t('taunt.wave_start.0'),
                t('taunt.wave_start.1'),
                t('taunt.wave_start.2'),
                t('taunt.wave_start.3')
            ],
            wave_cleared: [
                t('taunt.wave_cleared.0'),
                t('taunt.wave_cleared.1'),
                t('taunt.wave_cleared.2'),
                t('taunt.wave_cleared.3')
            ],
            boss_gate: [
                t('taunt.boss_gate.0'),
                t('taunt.boss_gate.1'),
                t('taunt.boss_gate.2'),
                t('taunt.boss_gate.3')
            ],
            boss_spawn: [
                t('taunt.boss_spawn.0'),
                t('taunt.boss_spawn.1'),
                t('taunt.boss_spawn.2'),
                t('taunt.boss_spawn.3')
            ],
            boss_defeated: [
                t('taunt.boss_defeated.0'),
                t('taunt.boss_defeated.1'),
                t('taunt.boss_defeated.2'),
                t('taunt.boss_defeated.3')
            ],
            rank_up: [
                t('taunt.rank_up.0'),
                t('taunt.rank_up.1'),
                t('taunt.rank_up.2'),
                t('taunt.rank_up.3')
            ],
            low_lives: [
                t('taunt.low_lives.0'),
                t('taunt.low_lives.1'),
                t('taunt.low_lives.2'),
                t('taunt.low_lives.3')
            ],
            // PART A: New pools for dynamic text rotation
            start_story: [
                t('taunt.start_story.0'),
                t('taunt.start_story.1'),
                t('taunt.start_story.2'),
                t('taunt.start_story.3'),
                t('taunt.start_story.4'),
                t('taunt.start_story.5'),
                t('taunt.start_story.6'),
                t('taunt.start_story.7'),
                t('taunt.start_story.8'),
                t('taunt.start_story.9'),
                t('taunt.start_story.10')
            ],
            highscore_banner: [
                t('taunt.highscore_banner.0'),
                t('taunt.highscore_banner.1'),
                t('taunt.highscore_banner.2'),
                t('taunt.highscore_banner.3'),
                t('taunt.highscore_banner.4'),
                t('taunt.highscore_banner.5'),
                t('taunt.highscore_banner.6')
            ],
            highscore_comment: [
                t('taunt.highscore_comment.0'),
                t('taunt.highscore_comment.1'),
                t('taunt.highscore_comment.2'),
                t('taunt.highscore_comment.3'),
                t('taunt.highscore_comment.4'),
                t('taunt.highscore_comment.5'),
                t('taunt.highscore_comment.6')
            ],
            // PART C: Context-aware highscore taunts (speaker taunts target)
            highscore_taunt: [
                (ctx) => ctx
                    ? t('taunt.highscore_taunt.0.ctx', { speakerName: ctx.speakerName, targetName: ctx.targetName })
                    : t('taunt.highscore_taunt.0.fallback'),
                (ctx) => ctx
                    ? t('taunt.highscore_taunt.1.ctx', { speakerName: ctx.speakerName, targetName: ctx.targetName })
                    : t('taunt.highscore_taunt.1.fallback'),
                (ctx) => ctx
                    ? t('taunt.highscore_taunt.2.ctx', { speakerRank: ctx.speakerRank, targetRank: ctx.targetRank, targetName: ctx.targetName })
                    : t('taunt.highscore_taunt.2.fallback'),
                (ctx) => ctx
                    ? t('taunt.highscore_taunt.3.ctx', { targetName: ctx.targetName, speakerName: ctx.speakerName })
                    : t('taunt.highscore_taunt.3.fallback'),
                (ctx) => ctx
                    ? t('taunt.highscore_taunt.4.ctx', { speakerName: ctx.speakerName, targetName: ctx.targetName })
                    : t('taunt.highscore_taunt.4.fallback'),
                (ctx) => ctx
                    ? t('taunt.highscore_taunt.5.ctx', { targetName: ctx.targetName, speakerName: ctx.speakerName })
                    : t('taunt.highscore_taunt.5.fallback'),
                (ctx) => ctx
                    ? t('taunt.highscore_taunt.6.ctx', { speakerRank: ctx.speakerRank, targetRank: ctx.targetRank })
                    : t('taunt.highscore_taunt.6.fallback'),
                (ctx) => ctx
                    ? t('taunt.highscore_taunt.7.ctx', { speakerName: ctx.speakerName, targetName: ctx.targetName })
                    : t('taunt.highscore_taunt.7.fallback')
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

        // Tick category cooldowns
        for (const [category, cooldown] of this.categoryCooldowns.entries()) {
            if (cooldown > 0) {
                this.categoryCooldowns.set(category, cooldown - dt * 16.67);
            }
        }
    }

    canEmit(category) {
        if (this.globalCooldown > 0) return false;

        const catCooldown = this.categoryCooldowns.get(category) || 0;
        if (catCooldown > 0) return false;

        return true;
    }

    // PART C: Get rotating text for dynamic displays, now with optional context
    getRotatingText(category, ctx = null) {
        const pool = this.pools[category];
        if (!pool || pool.length === 0) return '';

        // Get a random line that's not in recent history
        let attempts = 0;
        let text = '';

        while (attempts < 5) {
            const selected = pool[Math.floor(Math.random() * pool.length)];
            // PART C: Pass context to functions
            text = typeof selected === 'function' ? selected(ctx) : selected;

            // Check if not in recent
            if (!this.recentTaunts.includes(text)) {
                break;
            }
            attempts++;
        }

        // Update recent taunts
        this.recentTaunts.push(text);
        if (this.recentTaunts.length > this.maxRecent) {
            this.recentTaunts.shift();
        }

        return text;
    }

    emit(category, customText = null) {
        if (!this.scene) return;
        if (!this.canEmit(category)) return;

        // Get taunt text
        let text = customText;
        if (!text) {
            const pool = this.pools[category] || this.pools.wave_start;
            const selected = pool[Math.floor(Math.random() * pool.length)];
            text = typeof selected === 'function' ? selected() : selected;
        }

        // Anti-repeat check
        if (this.recentTaunts.includes(text)) {
            // Try one more time
            const pool = this.pools[category] || this.pools.wave_start;
            const selected = pool[Math.floor(Math.random() * pool.length)];
            text = typeof selected === 'function' ? selected() : selected;
        }

        // Update recent taunts
        this.recentTaunts.push(text);
        if (this.recentTaunts.length > this.maxRecent) {
            this.recentTaunts.shift();
        }

        // Set cooldowns
        this.globalCooldown = this.GLOBAL_COOLDOWN;
        this.categoryCooldowns.set(category, this.CATEGORY_COOLDOWN);

        // Show taunt
        this.showTaunt(text, category);
    }

    showTaunt(text, category) {
        if (!this.scene || !this.scene.container) return;

        const container = new PIXI.Container();
        container.zIndex = 900; // Above playfield, below HUD

        const screenWidth = this.scene.game.getWidth();
        const screenHeight = this.scene.game.getHeight();

        container.x = screenWidth / 2;
        container.y = screenHeight / 2 - 50;

        // Glitch effect - multiple text layers with offsets
        const glitchLayers = [];
        const colors = [0xff00ff, 0x00ffff, 0xffff00];

        for (let i = 0; i < 3; i++) {
            const glitchText = new PIXI.Text(text, {
                fontFamily: 'Courier New',
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

        // Main text with glow
        const mainText = new PIXI.Text(text, {
            fontFamily: 'Courier New',
            fontSize: 36,
            fill: '#ffffff',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        });
        mainText.anchor.set(0.5);
        container.addChild(mainText);

        // Particle burst
        if (this.scene.particleManager) {
            this.scene.particleManager.createExplosion(
                container.x,
                container.y,
                0xffff00,
                12
            );
        }

        this.scene.container.addChild(container);

        // Animation
        let time = 0;
        const duration = 1500; // 1.5 seconds total
        const fadeIn = 250;
        const hold = 1000;
        const fadeOut = 250;

        container.alpha = 0;
        container.scale.set(0.8);

        const ticker = (delta) => {
            time += delta.deltaTime * 16.67;

            // Glitch jitter with guards for destroyed objects
            if (time < fadeIn + hold) {
                glitchLayers.forEach((layer, i) => {
                    // Guard: check if layer is destroyed before setting properties
                    if (layer && !layer.destroyed) {
                        layer.x = (i - 1) * 2 + (Math.random() - 0.5) * 4;
                        layer.y = (i - 1) * 2 + (Math.random() - 0.5) * 4;
                    }
                });
            }

            // Guard container access during animations
            if (!container || container.destroyed) {
                this.scene.game.app.ticker.remove(ticker);
                const idx = this.activeTickers.indexOf(ticker);
                if (idx >= 0) this.activeTickers.splice(idx, 1);
                return;
            }

            // Fade in
            if (time < fadeIn) {
                const progress = time / fadeIn;
                container.alpha = progress;
                container.scale.set(0.8 + progress * 0.2);
            }
            // Hold
            else if (time < fadeIn + hold) {
                container.alpha = 1;
                container.scale.set(1 + Math.sin(time * 0.01) * 0.05);
            }
            // Fade out
            else if (time < duration) {
                const progress = (time - fadeIn - hold) / fadeOut;
                container.alpha = 1 - progress;
                container.scale.set(1 + progress * 0.2);
            }
            // Remove
            else {
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
        if (this.langUnsubscribe) this.langUnsubscribe();
        // Stop all active taunt tickers
        if (this.scene && this.scene.game && this.scene.game.app && this.scene.game.app.ticker) {
            this.activeTickers.forEach(ticker => {
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

// Export singleton instance
export const tauntDirector = new TauntDirector();
