/**
 * TauntBubble - Speech bubble system for HighscoreScene
 * PART C: Animated speech bubbles with typewriter text
 */

import * as PIXI from 'pixi.js';
import { TypewriterText } from '../utils/TypewriterText.js';

export class TauntBubble {
    constructor(text, targetX, targetY, screenWidth, screenHeight, speaker = null) {
        this.container = new PIXI.Container();
        this.text = String(text ?? '').trim();
        // Initialize x/y directly via local setters (guarding against null container)
        this.targetX = targetX;
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.y = targetY;

        const speakerText = speaker ? String(speaker ?? '').trim() : '';
        this.speaker = speakerText.length > 0 ? speakerText : null;
        this.typewriter = null;
        this.complete = false;
        this.animationTime = 0;

        // Warn flag and lifecycle
        this._warnedMissingContainer = false;
        this._destroyed = false;

        this.createBubble();
    }

    createBubble() {
        // REDESIGN: Larger bubble dimensions for better visibility
        const padding = 20;
        const maxWidth = Math.min(500, this.screenWidth * 0.85);

        const textStyle = {
            fontFamily: 'Courier New',
            fontSize: 20,
            fill: '#ffffff',
            wordWrap: true,
            wordWrapWidth: maxWidth - padding * 2,
            align: 'center',
            lineHeight: 26
        };

        this.textObject = new PIXI.Text('', textStyle);
        this.textObject.anchor.set(0.5);

        const tempText = new PIXI.Text(this.text, textStyle);
        const textWidth = Math.min(tempText.width + padding * 2, maxWidth);
        const textHeight = tempText.height + padding * 2;

        const speakerBannerHeight = this.speaker ? 32 : 0;
        const bubbleWidth = Math.max(textWidth, 280);
        const bubbleHeight = textHeight + speakerBannerHeight;
        const radius = 12;

        // Shadow
        const shadow = new PIXI.Graphics();
        shadow.roundRect(-bubbleWidth / 2 + 4, -bubbleHeight / 2 + 4, bubbleWidth, bubbleHeight, radius);
        shadow.fill({ color: 0x000000, alpha: 0.5 });
        shadow.filters = [new PIXI.BlurFilter(4)];
        this.container.addChild(shadow);

        // Glow
        const glow = new PIXI.Graphics();
        glow.roundRect(-bubbleWidth / 2 - 3, -bubbleHeight / 2 - 3, bubbleWidth + 6, bubbleHeight + 6, radius + 2);
        glow.fill({ color: 0xffff00, alpha: 0.3 });
        this.container.addChild(glow);

        // Body
        const bubble = new PIXI.Graphics();
        bubble.roundRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, radius);
        bubble.fill({ color: 0x1a1a1a, alpha: 0.95 });
        bubble.stroke({ color: 0x00ffff, width: 4, alpha: 1.0 });
        this.container.addChild(bubble);

        // Tail
        const tail = new PIXI.Graphics();
        const tailSize = 18;
        tail.moveTo(0, bubbleHeight / 2);
        tail.lineTo(-tailSize, bubbleHeight / 2 + tailSize);
        tail.lineTo(tailSize, bubbleHeight / 2 + tailSize);
        tail.closePath();
        tail.fill({ color: 0x1a1a1a, alpha: 0.95 });
        tail.stroke({ color: 0x00ffff, width: 4, alpha: 1.0 });
        this.container.addChild(tail);

        // Header
        if (this.speaker) {
            const bannerBg = new PIXI.Graphics();
            bannerBg.roundRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, speakerBannerHeight, radius);
            bannerBg.fill({ color: 0x00ffff, alpha: 0.2 });
            this.container.addChild(bannerBg);

            const speakerText = new PIXI.Text(this.speaker, {
                fontFamily: 'Courier New',
                fontSize: 16,
                fill: '#00ffff',
                fontWeight: 'bold',
                letterSpacing: 1
            });
            speakerText.anchor.set(0.5);
            speakerText.x = 0;
            speakerText.y = -bubbleHeight / 2 + speakerBannerHeight / 2;
            this.container.addChild(speakerText);
        }

        this.textObject.y = speakerBannerHeight / 2;
        this.container.addChild(this.textObject);

        this.positionBubble();

        this.typewriter = new TypewriterText(this.textObject, this.text, { charDelay: 25 });

        this.container.alpha = 0;
        this.container.scale.set(0.85);
    }

    positionBubble() {
        const margin = 20;
        let x = this.targetX;
        let y = this.y - 80;

        const halfWidth = this.container.width / 2;
        const halfHeight = this.container.height / 2;

        x = Math.max(margin + halfWidth, Math.min(this.screenWidth - margin - halfWidth, x));
        y = Math.max(margin + halfHeight, Math.min(this.screenHeight - margin - halfHeight, y));

        this.x = x;
        this.y = y;
    }

    update(delta) {
        if (this._destroyed || this.complete) return;

        this.animationTime += delta * 16.67;

        if (this.typewriter) {
            this.typewriter.update(delta);
        }

        if (this.animationTime < 350) {
            const progress = this.animationTime / 350;
            let scale;
            if (progress < 0.5) {
                scale = 0.85 + (progress * 2) * 0.2;
            } else if (progress < 0.75) {
                const p = (progress - 0.5) / 0.25;
                scale = 1.05 - p * 0.07;
            } else {
                const p = (progress - 0.75) / 0.25;
                scale = 0.98 + p * 0.02;
            }
            this.container.scale.set(scale);
            this.container.alpha = Math.min(1, progress * 2);
        } else {
            // Wobble
            if (this.container && !this.container.destroyed) {
                this.container.scale.set(1 + Math.sin(this.animationTime * 0.003) * 0.01);
                this.container.alpha = 1;
            }
        }
    }

    exit(callback) {
        this.complete = true;
        let exitTime = 0;
        const exitDuration = 200;

        const appTicker = this.container.parent?.parent?.game?.app?.ticker;
        const fallbackTicker = PIXI.Ticker.shared;
        const activeTicker = appTicker || fallbackTicker;

        const ticker = (delta) => {
            exitTime += delta.deltaTime * 16.67;
            const progress = exitTime / exitDuration;

            if (progress >= 1) {
                if (activeTicker) activeTicker.remove(ticker);
                this.container.parent?.removeChild(this.container);
                this._destroyed = true;
                if (callback) callback();
                return;
            }

            if (this.container && !this.container.destroyed) {
                this.container.scale.set(1 - progress * 0.1);
                this.container.alpha = 1 - progress;
            }
        };

        if (activeTicker) {
            activeTicker.add(ticker);
        } else {
            this.container.parent?.removeChild(this.container);
            this._destroyed = true;
            if (callback) callback();
        }
    }

    skip() {
        if (this.typewriter) this.typewriter.skip();
    }

    destroy() {
        this._destroyed = true;
        this.complete = true;
        if (this.typewriter) {
            this.typewriter = null;
        }
        if (this.container && this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
    }

    // Safely get/set x/y to guard against null/destroyed container
    get x() {
        if (this._destroyed) return 0;
        try {
            return (this.container && typeof this.container === 'object' && !this.container.destroyed) ? this.container.x : 0;
        } catch (e) {
            return 0;
        }
    }
    set x(val) {
        if (this._destroyed) return;
        try {
            if (this.container &&
                typeof this.container === 'object' &&
                !this.container.destroyed &&
                'x' in this.container) {
                this.container.x = val;
            }
        } catch (e) {
            // Silent fail for x, y has the warning
        }
    }

    get y() {
        if (this._destroyed) return 0;
        try {
            return (this.container && typeof this.container === 'object' && !this.container.destroyed) ? this.container.y : 0;
        } catch (e) {
            return 0;
        }
    }
    set y(val) {
        if (this._destroyed) return;
        try {
            // Defensive: check container is valid object with y property before assignment
            if (this.container &&
                typeof this.container === 'object' &&
                !this.container.destroyed &&
                'y' in this.container) {
                this.container.y = val;
            } else {
                if (!this._warnedMissingContainer) {
                    console.warn('[TauntBubble] Skipped setting y: container missing/destroyed');
                    this._warnedMissingContainer = true;
                }
            }
        } catch (e) {
            if (!this._warnedMissingContainer) {
                console.warn('[TauntBubble] Error setting y:', e.message);
                this._warnedMissingContainer = true;
            }
        }
    }
}
