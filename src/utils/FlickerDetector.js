import { traceRing } from './TraceRing.js';

export class FlickerDetector {
    constructor(scene) {
        this.scene = scene;
        this.lastCheckTime = 0;
        this.checkInterval = 100; // ms
        this.frameCount = 0;
        this.sampleRate = 10; // Check every 10th frame

        // Previous state snapshot
        this.prevState = {
            stageAlpha: 1,
            stageVisible: true,
            worldAlpha: 1,
            worldVisible: true,
            overlayAlpha: 1,
            filters: 0
        };
    }

    update(delta, time) {
        this.frameCount++;

        // Sample based on frame count or time to minimize overhead
        const now = performance.now();
        if (this.frameCount % this.sampleRate !== 0 && (now - this.lastCheckTime) < this.checkInterval) {
            return;
        }

        this.lastCheckTime = now;
        this.checkState();
    }

    checkState() {
        const { app, container, uiOverlay, uiContainer } = this.scene;

        if (!app || !app.stage) return;

        // Current critical state
        const current = {
            stageAlpha: app.stage.alpha,
            stageVisible: app.stage.visible,
            worldAlpha: container ? container.alpha : -1,
            worldVisible: container ? container.visible : false,
            overlayAlpha: uiOverlay ? uiOverlay.alpha : -1,
            uiAlpha: uiContainer ? uiContainer.alpha : -1,
            filters: (container && container.filters) ? container.filters.length : 0
        };

        // Compare with previous state
        if (Math.abs(current.stageAlpha - this.prevState.stageAlpha) > 0.01) {
            traceRing.trace('FLICKER_DETECTOR', 'stageAlpha', this.prevState.stageAlpha, current.stageAlpha);
        }
        if (current.stageVisible !== this.prevState.stageVisible) {
            traceRing.trace('FLICKER_DETECTOR', 'stageVisible', this.prevState.stageVisible, current.stageVisible);
        }
        if (Math.abs(current.worldAlpha - this.prevState.worldAlpha) > 0.01) {
            traceRing.trace('FLICKER_DETECTOR', 'worldAlpha', this.prevState.worldAlpha, current.worldAlpha);
        }
        if (current.worldVisible !== this.prevState.worldVisible) {
            traceRing.trace('FLICKER_DETECTOR', 'worldVisible', this.prevState.worldVisible, current.worldVisible);
        }
        if (Math.abs(current.overlayAlpha - this.prevState.overlayAlpha) > 0.01) {
            traceRing.trace('FLICKER_DETECTOR', 'overlayAlpha', this.prevState.overlayAlpha, current.overlayAlpha);
        }
        if (current.filters !== this.prevState.filters) {
            traceRing.trace('FLICKER_DETECTOR', 'filtersCount', this.prevState.filters, current.filters);
        }

        // Update snapshot
        this.prevState = current;

        // Periodic heartbeat to confirm system isn't dead, but rare
        // traceRing.trace('HB', current.stageAlpha, current.worldAlpha, '');
    }
}
