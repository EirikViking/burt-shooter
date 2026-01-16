/**
 * TypewriterText - Animated text reveal utility
 * PART A: Fast typewriter effect for dynamic lore text
 */

import * as PIXI from 'pixi.js';

export class TypewriterText {
    constructor(textObject, fullText, options = {}) {
        this.textObject = textObject;
        this.fullText = fullText;
        this.currentIndex = 0;
        this.charDelay = options.charDelay || 30; // 30ms per character
        this.timer = 0;
        this.complete = false;
        this.skipRequested = false;
    }

    skip() {
        this.skipRequested = true;
    }

    update(dt) {
        if (this.complete) return true;

        // If skip requested, show all immediately
        if (this.skipRequested) {
            this.textObject.text = this.fullText;
            this.complete = true;
            return true;
        }

        this.timer += dt * 16.67;

        if (this.timer >= this.charDelay) {
            this.timer = 0;
            this.currentIndex++;

            if (this.currentIndex >= this.fullText.length) {
                this.textObject.text = this.fullText;
                this.complete = true;
                return true;
            }

            this.textObject.text = this.fullText.substring(0, this.currentIndex);
        }

        return this.complete;
    }
}
