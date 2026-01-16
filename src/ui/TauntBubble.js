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
        this.targetX = targetX;
        this.targetY = targetY;
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        const speakerText = speaker ? String(speaker ?? '').trim() : '';
        this.speaker = speakerText.length > 0 ? speakerText : null;
        this.typewriter = null;
        this.complete = false;
        this.animationTime = 0;

        this.createBubble();
    }

    createBubble() {
        // REDESIGN: Larger bubble dimensions for better visibility
        const padding = 20; // Increased padding
        const maxWidth = Math.min(500, this.screenWidth * 0.85); // Larger max width

        // Create text first to measure
        const textStyle = {
            fontFamily: 'Courier New',
            fontSize: 20, // Larger font
            fill: '#ffffff',
            wordWrap: true,
            wordWrapWidth: maxWidth - padding * 2,
            align: 'center',
            lineHeight: 26 // Better line spacing
        };

        this.textObject = new PIXI.Text('', textStyle);
        this.textObject.anchor.set(0.5);

        // Measure text with full content
        const tempText = new PIXI.Text(this.text, textStyle);
        const textWidth = Math.min(tempText.width + padding * 2, maxWidth);
        const textHeight = tempText.height + padding * 2;

        // REDESIGN: Add space for speaker banner at top
        const speakerBannerHeight = this.speaker ? 32 : 0;
        const bubbleWidth = Math.max(textWidth, 280); // Minimum width
        const bubbleHeight = textHeight + speakerBannerHeight;
        const radius = 12;

        // PART 4: Drop shadow layer (behind everything)
        const shadow = new PIXI.Graphics();
        shadow.roundRect(-bubbleWidth / 2 + 4, -bubbleHeight / 2 + 4, bubbleWidth, bubbleHeight, radius);
        shadow.fill({ color: 0x000000, alpha: 0.5 });
        shadow.filters = [new PIXI.BlurFilter(4)];
        this.container.addChild(shadow);

        // PART 4: Glow layer
        const glow = new PIXI.Graphics();
        glow.roundRect(-bubbleWidth / 2 - 3, -bubbleHeight / 2 - 3, bubbleWidth + 6, bubbleHeight + 6, radius + 2);
        glow.fill({ color: 0xffff00, alpha: 0.3 });
        this.container.addChild(glow);

        // PART 4: Bubble body - higher contrast, less transparent
        const bubble = new PIXI.Graphics();
        bubble.roundRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, radius);
        bubble.fill({ color: 0x1a1a1a, alpha: 0.95 });
        bubble.stroke({ color: 0x00ffff, width: 4, alpha: 1.0 }); // Thicker, more visible outline
        this.container.addChild(bubble);

        // PART 4: Tail (pointing down to target) - larger and more visible
        const tail = new PIXI.Graphics();
        const tailSize = 18; // Larger tail
        tail.moveTo(0, bubbleHeight / 2);
        tail.lineTo(-tailSize, bubbleHeight / 2 + tailSize);
        tail.lineTo(tailSize, bubbleHeight / 2 + tailSize);
        tail.closePath();
        tail.fill({ color: 0x1a1a1a, alpha: 0.95 });
        tail.stroke({ color: 0x00ffff, width: 4, alpha: 1.0 });
        this.container.addChild(tail);

        // REDESIGN: Prominent speaker banner at top
        if (this.speaker) {
            // Banner background
            const bannerBg = new PIXI.Graphics();
            bannerBg.roundRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, speakerBannerHeight, radius);
            bannerBg.fill({ color: 0x00ffff, alpha: 0.2 });
            this.container.addChild(bannerBg);

            // Speaker name - large and prominent
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

        // Add text - positioned below speaker banner
        this.textObject.y = speakerBannerHeight / 2;
        this.container.addChild(this.textObject);

        // Position bubble
        this.positionBubble();

        // Start typewriter
        this.typewriter = new TypewriterText(this.textObject, this.text, { charDelay: 25 });

        // Initial animation state
        this.container.alpha = 0;
        this.container.scale.set(0.85);
    }

    positionBubble() {
        // Position above target, clamped to screen
        const margin = 20;
        let x = this.targetX;
        let y = this.targetY - 80; // Above target

        // Clamp to screen bounds
        const halfWidth = this.container.width / 2;
        const halfHeight = this.container.height / 2;

        x = Math.max(margin + halfWidth, Math.min(this.screenWidth - margin - halfWidth, x));
        y = Math.max(margin + halfHeight, Math.min(this.screenHeight - margin - halfHeight, y));

        this.container.x = x;
        this.container.y = y;
    }

    update(delta) {
        if (this.complete) return;

        this.animationTime += delta * 16.67;

        // Update typewriter
        if (this.typewriter) {
            this.typewriter.update(delta);
        }

        // Pop-in animation (0-350ms)
        if (this.animationTime < 350) {
            const progress = this.animationTime / 350;

            // Bounce easing
            let scale;
            if (progress < 0.5) {
                // First half: 0.85 -> 1.05
                scale = 0.85 + (progress * 2) * 0.2;
            } else if (progress < 0.75) {
                // Second quarter: 1.05 -> 0.98
                const p = (progress - 0.5) / 0.25;
                scale = 1.05 - p * 0.07;
            } else {
                // Final quarter: 0.98 -> 1.0
                const p = (progress - 0.75) / 0.25;
                scale = 0.98 + p * 0.02;
            }

            this.container.scale.set(scale);
            this.container.alpha = Math.min(1, progress * 2);
        }
        // Wobble while visible (after 350ms)
        else {
            this.container.scale.set(1 + Math.sin(this.animationTime * 0.003) * 0.01);
            this.container.alpha = 1;
        }
    }

    exit(callback) {
        this.complete = true;

        // Exit animation
        let exitTime = 0;
        const exitDuration = 200;

        const appTicker = this.container.parent?.parent?.game?.app?.ticker;
        const fallbackTicker = PIXI.Ticker.shared;
        const activeTicker = appTicker || fallbackTicker;

        const ticker = (delta) => {
            exitTime += delta.deltaTime * 16.67;
            const progress = exitTime / exitDuration;

            if (progress >= 1) {
                if (activeTicker) {
                    activeTicker.remove(ticker);
                }
                // Remove from parent
                this.container.parent?.removeChild(this.container);
                // Call callback
                if (callback) callback();
                return;
            }

            this.container.scale.set(1 - progress * 0.1);
            this.container.alpha = 1 - progress;
        };

        // Use the app ticker if available, otherwise fallback to shared ticker
        if (activeTicker) {
            activeTicker.add(ticker);
        } else {
            this.container.parent?.removeChild(this.container);
            if (callback) callback();
        }
    }

    skip() {
        if (this.typewriter) {
            this.typewriter.skip();
        }
    }
}
