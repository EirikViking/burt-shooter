/**
 * TauntDirector - Central taunt management system
 * Handles cooldowns, anti-spam, and visually stunning taunt presentation
 */

import * as PIXI from 'pixi.js';

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

        // Cooldown durations (ms)
        this.GLOBAL_COOLDOWN = 3000; // 3 seconds between any taunts
        this.CATEGORY_COOLDOWN = 8000; // 8 seconds per category

        // Taunt pools by category
        this.pools = {
            wave_start: [
                'NY WAVE!',
                'HER KOMMER DEM!',
                'KLAR FOR KAMP!',
                'DREKKA!'
            ],
            wave_cleared: [
                'WAVE KLART!',
                'PERFEKT!',
                'STOKMARKNES STYLE!',
                'SKÅL!'
            ],
            boss_gate: [
                'BOSS INCOMING!',
                'STOR FISK PÅ VEI!',
                'NÅ BLIR DET ALVOR!',
                'BOSS: KLAR!'
            ],
            boss_spawn: [
                'BOSS ER HER!',
                'KJØR PÅ!',
                'FULL GASS!',
                'JATTA JATTA!'
            ],
            boss_defeated: [
                'BOSS KNUST!',
                'LEGENDARISK!',
                'STOKMARKNES VINNER!',
                'SEIER!'
            ],
            rank_up: [
                'RANK UP!',
                'LEVEL OPP!',
                'SKAMSTERK!',
                'DREKKA SPRIT!'
            ],
            low_lives: [
                'KRITISK!',
                'SISTE SJANSE!',
                'HOLD UT!',
                'LAVT LIV!'
            ],
            // PART A: New pools for dynamic text rotation
            start_story: [
                'Stokmarknes og Melbu energi',
                'Nordlys i blikket, øl i hånda',
                'Kurt Edgar godkjente dette etter tredje øl',
                'Eirik med selvtillit langt over ferdighetsnivå',
                'Hurtigruta gikk, men festen ble igjen',
                'Klassisk Vesterålen avgjørelse',
                'Dette hadde aldri gått i Harstad',
                'Alle kjenner alle, ingen husker noe',
                'Småby, store ambisjoner, tomme glass',
                'Drekka sprit!',
                'Skål!'
            ],
            highscore_banner: [
                'Stokmarknes jubler!',
                'Melbu applauderer!',
                'Kurt Edgar nikker anerkjennende',
                'Eirik er stolt nå',
                'Arcade-geist i lufta',
                'Legendene lever',
                'SKAMSTERK!'
            ],
            highscore_comment: [
                'Dette blir nevnt i årevis',
                'Klassisk kveld som sporet av',
                'Ingen angrer ennå',
                'Fremdeles stående',
                'Mer flaks enn forstand',
                'Drekka!',
                'Jatta jatta!'
            ],
            // PART C: Context-aware highscore taunts (speaker taunts target)
            highscore_taunt: [
                (ctx) => ctx ? `${ctx.speakerName} sier: ${ctx.targetName} må tilbake til Melbu skolebenk` : 'Jatta jatta, prøv igjen!',
                (ctx) => ctx ? `${ctx.speakerName} til ${ctx.targetName}: Du skyter som en våt vott` : 'Hut dæ heim!',
                (ctx) => ctx ? `Rang ${ctx.speakerRank} ler av rang ${ctx.targetRank}: ${ctx.targetName}` : 'Bæ bæ mø!',
                (ctx) => ctx ? `${ctx.targetName}: "Jeg prøvde"  ${ctx.speakerName}: "Du feila"` : 'Dette e hæstkuk!',
                (ctx) => ctx ? `${ctx.speakerName}: ${ctx.targetName} e grønn som en Isbjørn` : 'Kurt Edgar ville skammet seg!',
                (ctx) => ctx ? `${ctx.targetName} burde øvd mer, sier ${ctx.speakerName}` : 'Stokmarknes eier deg!',
                (ctx) => ctx ? `Rang ${ctx.speakerRank} dominerer rang ${ctx.targetRank}` : 'SKÅL!',
                (ctx) => ctx ? `${ctx.speakerName} eier ${ctx.targetName} totalt` : 'DREKKA SPRIT!'
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

            // Glitch jitter
            if (time < fadeIn + hold) {
                glitchLayers.forEach((layer, i) => {
                    layer.x = (i - 1) * 2 + (Math.random() - 0.5) * 4;
                    layer.y = (i - 1) * 2 + (Math.random() - 0.5) * 4;
                });
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
                this.scene.container.removeChild(container);
            }
        };

        this.scene.game.app.ticker.add(ticker);
    }
}

// Export singleton instance
export const tauntDirector = new TauntDirector();
