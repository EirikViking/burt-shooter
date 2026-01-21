/**
 * RenderCallSpy.js
 * Detects multiple render calls per frame (potential double-render bug)
 */

const BUFFER_SIZE = 300;
const FRAME_THRESHOLD_MS = 16; // ~60fps

class RenderCallSpy {
    constructor() {
        this.enabled = false;
        this.buffer = [];
        this.currentFrameId = 0;
        this.lastFrameTime = 0;
        this.renderCountThisFrame = 0;
        this.app = null;
        this.originalRender = null;
    }

    enable(app) {
        if (this.enabled || !app || !app.renderer) return;

        this.app = app;
        this.enabled = true;
        this.lastFrameTime = performance.now();

        // Wrap renderer.render
        this.originalRender = app.renderer.render.bind(app.renderer);
        app.renderer.render = (...args) => {
            this.onRenderCall();
            return this.originalRender(...args);
        };

        console.log('[RenderCallSpy] Enabled');
    }

    onRenderCall() {
        if (!this.enabled) return;

        const now = performance.now();
        const timeSinceLastFrame = now - this.lastFrameTime;

        // New frame if enough time passed
        if (timeSinceLastFrame > FRAME_THRESHOLD_MS) {
            this.currentFrameId++;
            this.renderCountThisFrame = 0;
            this.lastFrameTime = now;
        }

        this.renderCountThisFrame++;

        // Anomaly: Multiple renders in same frame
        if (this.renderCountThisFrame > 1) {
            const stack = this.captureStack();
            this.buffer.push({
                time: now.toFixed(2),
                frameId: this.currentFrameId,
                renderCount: this.renderCountThisFrame,
                type: 'MULTI_RENDER',
                stack
            });

            if (this.buffer.length > BUFFER_SIZE) {
                this.buffer.shift();
            }
        }
    }

    captureStack() {
        const err = new Error();
        const lines = err.stack.split('\n');
        // Filter out RenderCallSpy lines
        return lines
            .filter(l => !l.includes('RenderCallSpy'))
            .slice(1, 5)
            .map(l => l.trim())
            .join('\n');
    }

    dump() {
        console.group('[RenderCallSpy] Report');

        const anomalies = this.buffer.filter(b => b.type === 'MULTI_RENDER');
        if (anomalies.length > 0) {
            console.warn(`⚠️ Found ${anomalies.length} multi-render events!`);
            console.table(anomalies.map(a => ({
                time: a.time,
                frame: a.frameId,
                count: a.renderCount,
                stack: a.stack.split('\n')[0]
            })));

            console.groupCollapsed('Detailed Stacks');
            anomalies.slice(-10).forEach(a => {
                console.log(`Frame ${a.frameId} (${a.renderCount} renders):`);
                console.log(a.stack);
                console.log('---');
            });
            console.groupEnd();
        } else {
            console.log('✅ No multi-render anomalies detected');
        }

        console.groupEnd();
    }
}

export const renderCallSpy = new RenderCallSpy();

if (typeof window !== 'undefined') {
    window.__renderSpyDump = () => renderCallSpy.dump();
}
