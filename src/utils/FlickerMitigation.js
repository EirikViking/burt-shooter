/**
 * FlickerMitigation.js
 * 
 * Hard mitigation for player visual flicker.
 * Enforces single player visual instance and clamps visual properties.
 * 
 * Enable with ?trace=1 or window.__flickerMitigation = true
 */

class FlickerMitigation {
    constructor() {
        this.enabled = false;
        this.clampEnabled = false;
        this.player = null;
        this.gameContainer = null;
        this.app = null;

        // Duplicate visual detection
        this.lastDuplicateCheckTime = 0;
        this.duplicateCheckInterval = 1000; // 1 second
        this.duplicateDetected = false;
        this.duplicateErrorLogged = false;

        // Renderer stability detection
        this.lastRendererCheckTime = 0;
        this.rendererCheckInterval = 1000; // 1 second
        this.rendererBaseline = null;
        this.rendererChangeDetected = false;
        this.contextLostDetected = false;

        // Hotkey listener
        this.hotkeyListener = null;
    }

    /**
     * Enable mitigation
     */
    enable(app, player, gameContainer) {
        if (this.enabled) return;

        this.enabled = true;
        this.app = app;
        this.player = player;
        this.gameContainer = gameContainer;

        // Check if we should enable visual clamping
        const urlParams = new URLSearchParams(window.location.search);
        this.clampEnabled = urlParams.get('trace') === '1' || window.__flickerMitigation === true;

        if (this.clampEnabled) {
            console.log('[FlickerMitigation] ✅ Visual clamping ENABLED');

            // Tag player sprite for identity tracking with unique marker
            if (player && player.sprite) {
                player.sprite.name = 'playerVisual';
                player.sprite.__isPlayerVisual = true;
                player.sprite.__playerMarker = true; // Keep for backward compat
            }

            // Set up renderer stability monitoring
            this.setupRendererMonitoring();

            // Register V hotkey
            this.registerHotkey();
        }

        console.log('[FlickerMitigation] Enabled (clamp=' + this.clampEnabled + ')');
    }

    /**
     * Register V hotkey for status dump
     */
    registerHotkey() {
        this.hotkeyListener = (e) => {
            if (e.key === 'v' || e.key === 'V') {
                // Only if not typing in input
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                this.dumpStatus();
            }
        };

        window.addEventListener('keydown', this.hotkeyListener);
    }

    /**
     * Set up renderer stability monitoring
     */
    setupRendererMonitoring() {
        if (!this.app || !this.app.renderer) return;

        const renderer = this.app.renderer;
        const canvas = this.app.view;

        // Record baseline
        this.rendererBaseline = {
            resolution: renderer.resolution,
            viewWidth: canvas ? canvas.width : 0,
            viewHeight: canvas ? canvas.height : 0,
            screenWidth: this.app.screen ? this.app.screen.width : 0,
            screenHeight: this.app.screen ? this.app.screen.height : 0,
            devicePixelRatio: window.devicePixelRatio || 1,
            isWebGL: renderer.type === 1 // PIXI.RENDERER_TYPE.WEBGL
        };

        // Listen for context loss
        if (canvas) {
            canvas.addEventListener('webglcontextlost', (e) => {
                if (!this.contextLostDetected) {
                    this.contextLostDetected = true;
                    console.error('[FlickerMitigation] 🚨 WebGL context LOST!', {
                        time: performance.now(),
                        event: e
                    });
                }
            });

            canvas.addEventListener('webglcontextrestored', (e) => {
                console.warn('[FlickerMitigation] WebGL context RESTORED', {
                    time: performance.now(),
                    event: e
                });
            });
        }
    }

    /**
     * Update - called every frame
     */
    update(delta) {
        if (!this.enabled) return;

        const now = performance.now();

        // Clamp player visuals if enabled
        if (this.clampEnabled && this.player && this.player.sprite) {
            this.clampPlayerVisuals();
        }

        // Check for duplicate player visuals (once per second)
        if (this.clampEnabled && now - this.lastDuplicateCheckTime > this.duplicateCheckInterval) {
            this.lastDuplicateCheckTime = now;
            this.checkDuplicatePlayerVisuals();
        }

        // Check renderer stability (once per second)
        if (this.clampEnabled && now - this.lastRendererCheckTime > this.rendererCheckInterval) {
            this.lastRendererCheckTime = now;
            this.checkRendererStability();
        }
    }

    /**
     * Hard clamp player visual properties
     */
    clampPlayerVisuals() {
        if (!this.player || !this.player.sprite) return;

        const sprite = this.player.sprite;

        // Hard clamp to visible, opaque, renderable
        // This overrides any invulnerability blink or other effects
        sprite.alpha = 1;
        sprite.visible = true;
        sprite.renderable = true;

        // Also clamp ship sprite if it exists
        if (this.player.shipSprite) {
            this.player.shipSprite.alpha = 1;
            this.player.shipSprite.visible = true;
            this.player.shipSprite.renderable = true;
        }
    }

    /**
     * Check for duplicate player visuals in the scene
     */
    checkDuplicatePlayerVisuals() {
        if (!this.gameContainer) return;

        const playerVisuals = [];

        // Traverse gameContainer and find all player sprites
        this.traverseContainer(this.gameContainer, (child) => {
            if (child.__isPlayerVisual === true) {
                const parentChain = this.getParentChain(child);
                playerVisuals.push({
                    id: child.__id || child.uid || 'unknown',
                    name: child.name || 'unnamed',
                    parentChain: parentChain,
                    alpha: child.alpha,
                    visible: child.visible,
                    renderable: child.renderable,
                    x: child.x,
                    y: child.y
                });
            }
        });

        // Log error only once per session if count is not exactly 1
        if (playerVisuals.length !== 1 && !this.duplicateErrorLogged) {
            this.duplicateErrorLogged = true;
            const stack = new Error().stack;

            console.error('[FlickerMitigation] 🚨 DUPLICATE PLAYER VISUALS DETECTED!', {
                count: playerVisuals.length,
                expected: 1,
                visuals: playerVisuals,
                stack: stack
            });
        }
    }

    /**
     * Get parent chain for a display object
     */
    getParentChain(child) {
        const chain = [];
        let current = child.parent;

        while (current && chain.length < 10) {
            const name = current.name || current.constructor.name || 'unknown';
            chain.push(name);
            current = current.parent;
        }

        return chain.join(' > ');
    }

    /**
     * Traverse container recursively
     */
    traverseContainer(container, callback) {
        if (!container || !container.children) return;

        for (const child of container.children) {
            callback(child);
            if (child.children && child.children.length > 0) {
                this.traverseContainer(child, callback);
            }
        }
    }

    /**
     * Check renderer stability
     */
    checkRendererStability() {
        if (!this.app || !this.app.renderer || !this.rendererBaseline) return;

        const renderer = this.app.renderer;
        const canvas = this.app.view;

        const current = {
            resolution: renderer.resolution,
            viewWidth: canvas ? canvas.width : 0,
            viewHeight: canvas ? canvas.height : 0,
            screenWidth: this.app.screen ? this.app.screen.width : 0,
            screenHeight: this.app.screen ? this.app.screen.height : 0,
            devicePixelRatio: window.devicePixelRatio || 1,
            isWebGL: renderer.type === 1
        };

        // Check for changes (only log once per session)
        const changed =
            current.resolution !== this.rendererBaseline.resolution ||
            current.devicePixelRatio !== this.rendererBaseline.devicePixelRatio ||
            current.isWebGL !== this.rendererBaseline.isWebGL;

        if (changed && !this.rendererChangeDetected) {
            this.rendererChangeDetected = true;
            console.error('[FlickerMitigation] 🚨 RENDERER STATE CHANGED!', {
                baseline: this.rendererBaseline,
                current: current,
                time: performance.now()
            });
        }
    }

    /**
     * Dump current status (V hotkey)
     */
    dumpStatus() {
        console.group('🔍 [FlickerMitigation] Status Dump');

        console.log('Enabled:', this.enabled);
        console.log('Clamp Enabled:', this.clampEnabled);

        // Player visual count
        if (this.gameContainer) {
            const playerVisuals = [];
            this.traverseContainer(this.gameContainer, (child) => {
                if (child.__isPlayerVisual === true) {
                    playerVisuals.push({
                        name: child.name,
                        alpha: child.alpha,
                        visible: child.visible,
                        renderable: child.renderable
                    });
                }
            });

            console.log('Player Visual Count:', playerVisuals.length, '(expected: 1)');
            if (playerVisuals.length > 0) {
                console.table(playerVisuals);
            }
        }

        // Renderer state
        if (this.app && this.app.renderer && this.rendererBaseline) {
            const renderer = this.app.renderer;
            const canvas = this.app.view;

            const current = {
                resolution: renderer.resolution,
                viewWidth: canvas ? canvas.width : 0,
                viewHeight: canvas ? canvas.height : 0,
                devicePixelRatio: window.devicePixelRatio || 1,
                isWebGL: renderer.type === 1
            };

            console.log('Renderer Baseline:', this.rendererBaseline);
            console.log('Renderer Current:', current);
            console.log('Renderer Changed:', this.rendererChangeDetected);
            console.log('Context Lost:', this.contextLostDetected);
        }

        // Anomaly flags
        console.log('Duplicate Error Logged:', this.duplicateErrorLogged);
        console.log('Renderer Change Detected:', this.rendererChangeDetected);
        console.log('Context Lost Detected:', this.contextLostDetected);

        console.groupEnd();
    }

    /**
     * Disable mitigation
     */
    disable() {
        this.enabled = false;
        this.clampEnabled = false;

        // Remove hotkey listener
        if (this.hotkeyListener) {
            window.removeEventListener('keydown', this.hotkeyListener);
            this.hotkeyListener = null;
        }

        console.log('[FlickerMitigation] Disabled');
    }
}

// Singleton instance
export const flickerMitigation = new FlickerMitigation();

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.__flickerMitigation = false; // Set to true to enable
    window.__flickerMitigationInstance = flickerMitigation;
}
