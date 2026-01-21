/**
 * RenderLifecycleProbe.js
 * 
 * Comprehensive render and scene lifecycle diagnostic tool.
 * Detects:
 * - Multiple renderer.render calls per frame
 * - Multiple active Pixi application tickers or RAF loops
 * - Multiple PlayScene instances alive at once
 * - Stage or key container attach/detach churn after respawn
 * - Secondary root or overlay containers being rendered separately
 * 
 * Enable with ?trace=1 or window.__renderProbe = true
 * Dump report with R key
 */

const RING_BUFFER_SIZE = 120; // ~2 seconds at 60fps
const MOUNT_CHURN_THRESHOLD = 30; // operations per second
const MOUNT_CHURN_WINDOW_MS = 1000;

class RenderLifecycleProbe {
    constructor() {
        this.enabled = false;
        this.app = null;
        this.originalRender = null;

        // Frame tracking
        this.currentFrameId = 0;
        this.lastFrameTime = 0;
        this.rafId = null;

        // Ring buffer for frame data
        this.frameBuffer = [];

        // PlayScene instance tracking
        this.playSceneInstanceCounter = 0;
        this.livePlayScenes = new Map(); // id -> { constructedAt, startedAt, endedAt, destroyedAt }

        // Container mount churn tracking
        this.mountOperations = []; // { time, container, operation, stack }

        // Ticker tracking
        this.tickerCount = 0;
        this.rafLoopCount = 0;

        // Auto-dump on anomaly
        this.autoDumpedDoubleRender = false;

        // Hotkey listener
        this.hotkeyListener = null;
    }

    /**
     * Enable the probe. Should be called after app is initialized.
     */
    enable(app) {
        if (this.enabled || !app || !app.renderer) {
            console.warn('[RenderLifecycleProbe] Already enabled or invalid app');
            return;
        }

        this.app = app;
        this.enabled = true;
        this.lastFrameTime = performance.now();

        // Hook renderer.render
        this.hookRenderer();

        // Hook container mount operations
        this.hookContainerOperations();

        // Start RAF frame counter
        this.startFrameCounter();

        // Register hotkey
        this.registerHotkey();

        console.log('[RenderLifecycleProbe] ✅ Enabled. Press R to dump report.');
    }

    /**
     * Hook the renderer.render method to count calls per frame
     */
    hookRenderer() {
        if (!this.app || !this.app.renderer) return;

        this.originalRender = this.app.renderer.render.bind(this.app.renderer);
        this.app.renderer.render = (...args) => {
            this.onRenderCall();
            return this.originalRender(...args);
        };
    }

    /**
     * Hook PIXI.Container addChild and removeChild to detect mount churn
     */
    hookContainerOperations() {
        if (typeof PIXI === 'undefined' || !PIXI.Container) return;

        const originalAddChild = PIXI.Container.prototype.addChild;
        const originalRemoveChild = PIXI.Container.prototype.removeChild;

        PIXI.Container.prototype.addChild = function (...args) {
            if (window.__renderProbe && window.__renderProbe.enabled) {
                window.__renderProbe.onContainerMount(this, 'addChild');
            }
            return originalAddChild.apply(this, args);
        };

        PIXI.Container.prototype.removeChild = function (...args) {
            if (window.__renderProbe && window.__renderProbe.enabled) {
                window.__renderProbe.onContainerMount(this, 'removeChild');
            }
            return originalRemoveChild.apply(this, args);
        };
    }

    /**
     * Start RAF loop to increment frame ID
     */
    startFrameCounter() {
        const tick = () => {
            this.currentFrameId++;
            this.lastFrameTime = performance.now();

            // Record frame data
            this.recordFrame();

            this.rafId = requestAnimationFrame(tick);
        };

        this.rafId = requestAnimationFrame(tick);
    }

    /**
     * Register R hotkey for dump
     */
    registerHotkey() {
        this.hotkeyListener = (e) => {
            if (e.key === 'r' || e.key === 'R') {
                // Only if not typing in input
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                this.dump();
            }
        };

        window.addEventListener('keydown', this.hotkeyListener);
    }

    /**
     * Called on every renderer.render call
     */
    onRenderCall() {
        if (!this.enabled) return;

        const frameData = this.getCurrentFrameData();
        frameData.renderCalls++;

        // Auto-dump on first double render detection
        if (frameData.renderCalls > 1 && !this.autoDumpedDoubleRender) {
            this.autoDumpedDoubleRender = true;
            console.warn('[RenderLifecycleProbe] 🚨 Double render detected! Auto-dumping...');
            setTimeout(() => this.dump(), 100);
        }
    }

    /**
     * Called on container mount/unmount operations
     */
    onContainerMount(container, operation) {
        if (!this.enabled) return;

        // Only track specific containers
        const isTracked = this.isTrackedContainer(container);
        if (!isTracked) return;

        const now = performance.now();
        const stack = this.captureStack();

        this.mountOperations.push({
            time: now,
            container: this.getContainerName(container),
            operation,
            stack
        });

        // Trim old operations outside window
        const cutoff = now - MOUNT_CHURN_WINDOW_MS;
        this.mountOperations = this.mountOperations.filter(op => op.time > cutoff);

        // Check for churn
        if (this.mountOperations.length > MOUNT_CHURN_THRESHOLD) {
            const frameData = this.getCurrentFrameData();
            if (!frameData.mountChurnDetected) {
                frameData.mountChurnDetected = true;
                frameData.mountChurnStacks = this.mountOperations.slice(-5).map(op => ({
                    container: op.container,
                    operation: op.operation,
                    stack: op.stack
                }));
            }
        }
    }

    /**
     * Check if container is tracked for mount churn
     */
    isTrackedContainer(container) {
        if (!container) return false;

        // Check if it's stage
        if (this.app && this.app.stage === container) return true;

        // Check if it has a label we care about
        const name = container.label || container.name || '';
        const trackedNames = ['PlayScene', 'gameContainer', 'uiOverlay', 'uiContainer'];

        return trackedNames.some(n => name.includes(n));
    }

    /**
     * Get human-readable container name
     */
    getContainerName(container) {
        if (!container) return 'unknown';
        if (this.app && this.app.stage === container) return 'stage';
        return container.label || container.name || 'Container';
    }

    /**
     * Get or create frame data for current frame
     */
    getCurrentFrameData() {
        let frameData = this.frameBuffer.find(f => f.frameId === this.currentFrameId);

        if (!frameData) {
            frameData = {
                frameId: this.currentFrameId,
                time: performance.now(),
                renderCalls: 0,
                tickerTicks: 0,
                stageChildren: this.app?.stage?.children?.length || 0,
                sceneContainerChildren: 0,
                currentScene: 'unknown',
                isPlaySceneActive: false,
                overlaysEnabled: false,
                mountChurnDetected: false,
                mountChurnStacks: []
            };

            this.frameBuffer.push(frameData);

            // Trim buffer
            if (this.frameBuffer.length > RING_BUFFER_SIZE) {
                this.frameBuffer.shift();
            }
        }

        return frameData;
    }

    /**
     * Record frame data snapshot
     */
    recordFrame() {
        const frameData = this.getCurrentFrameData();

        // Update scene info
        const game = window.__game;
        if (game) {
            const currentScene = game.currentScene;
            frameData.currentScene = currentScene?.constructor?.name || 'unknown';
            frameData.isPlaySceneActive = currentScene?.constructor?.name === 'PlayScene';

            if (frameData.isPlaySceneActive && currentScene) {
                frameData.sceneContainerChildren = currentScene.gameContainer?.children?.length || 0;
                frameData.overlaysEnabled = !!(currentScene.uiOverlay && currentScene.uiOverlay.visible);
            }
        }

        frameData.stageChildren = this.app?.stage?.children?.length || 0;
    }

    /**
     * Register a PlayScene instance
     */
    registerPlayScene(instance, event) {
        if (!this.enabled) return;

        let id = instance.__probeId;

        if (!id) {
            id = ++this.playSceneInstanceCounter;
            instance.__probeId = id;
            this.livePlayScenes.set(id, {
                constructedAt: performance.now(),
                startedAt: null,
                endedAt: null,
                destroyedAt: null
            });
        }

        const record = this.livePlayScenes.get(id);
        if (record) {
            if (event === 'start') record.startedAt = performance.now();
            if (event === 'end') record.endedAt = performance.now();
            if (event === 'destroy') record.destroyedAt = performance.now();
        }
    }

    /**
     * Capture stack trace
     */
    captureStack() {
        const err = new Error();
        const lines = err.stack.split('\n');
        return lines
            .filter(l => !l.includes('RenderLifecycleProbe'))
            .slice(1, 4)
            .map(l => l.trim())
            .join(' | ');
    }

    /**
     * Dump comprehensive report
     */
    dump() {
        console.group('🔍 [RenderLifecycleProbe] Diagnostic Report');

        // Summary
        console.log(`Total frames recorded: ${this.frameBuffer.length}`);
        console.log(`Current frame ID: ${this.currentFrameId}`);

        // Check for double renders
        const doubleRenderFrames = this.frameBuffer.filter(f => f.renderCalls > 1);
        if (doubleRenderFrames.length > 0) {
            console.warn(`⚠️ Found ${doubleRenderFrames.length} frames with multiple render calls!`);
            console.table(doubleRenderFrames.map(f => ({
                frame: f.frameId,
                renders: f.renderCalls,
                scene: f.currentScene,
                stageChildren: f.stageChildren
            })));
        } else {
            console.log('✅ No double-render frames detected');
        }

        // PlayScene instances
        console.group('PlayScene Instances');
        const liveScenes = Array.from(this.livePlayScenes.entries())
            .filter(([id, record]) => !record.destroyedAt);

        if (liveScenes.length > 1) {
            console.warn(`⚠️ Multiple live PlayScene instances: ${liveScenes.length}`);
        } else if (liveScenes.length === 1) {
            console.log('✅ Single PlayScene instance (expected)');
        } else {
            console.log('ℹ️ No live PlayScene instances');
        }

        console.table(Array.from(this.livePlayScenes.entries()).map(([id, record]) => ({
            id,
            constructed: record.constructedAt ? record.constructedAt.toFixed(0) : 'never',
            started: record.startedAt ? record.startedAt.toFixed(0) : 'never',
            ended: record.endedAt ? record.endedAt.toFixed(0) : 'never',
            destroyed: record.destroyedAt ? record.destroyedAt.toFixed(0) : 'never',
            alive: !record.destroyedAt
        })));
        console.groupEnd();

        // Mount churn
        console.group('Container Mount Churn');
        const churnFrames = this.frameBuffer.filter(f => f.mountChurnDetected);
        if (churnFrames.length > 0) {
            console.warn(`⚠️ Mount churn detected in ${churnFrames.length} frames!`);
            console.log('Recent mount operations:', this.mountOperations.slice(-20));

            // Show stacks
            churnFrames.forEach(f => {
                if (f.mountChurnStacks && f.mountChurnStacks.length > 0) {
                    console.log(`Frame ${f.frameId} churn stacks:`, f.mountChurnStacks);
                }
            });
        } else {
            console.log('✅ No mount churn detected');
        }
        console.groupEnd();

        // Last N frames summary
        console.group('Last 20 Frames Summary');
        const last20 = this.frameBuffer.slice(-20);
        console.table(last20.map(f => ({
            frame: f.frameId,
            renders: f.renderCalls,
            scene: f.currentScene,
            stageChildren: f.stageChildren,
            sceneChildren: f.sceneContainerChildren,
            overlays: f.overlaysEnabled ? 'yes' : 'no',
            churn: f.mountChurnDetected ? '⚠️' : '✅'
        })));
        console.groupEnd();

        console.groupEnd();
    }

    /**
     * Disable and cleanup
     */
    disable() {
        if (!this.enabled) return;

        this.enabled = false;

        // Restore original render
        if (this.app && this.app.renderer && this.originalRender) {
            this.app.renderer.render = this.originalRender;
        }

        // Cancel RAF
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        // Remove hotkey
        if (this.hotkeyListener) {
            window.removeEventListener('keydown', this.hotkeyListener);
            this.hotkeyListener = null;
        }

        console.log('[RenderLifecycleProbe] Disabled');
    }
}

// Singleton instance
export const renderLifecycleProbe = new RenderLifecycleProbe();

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.__renderProbe = renderLifecycleProbe;
}
