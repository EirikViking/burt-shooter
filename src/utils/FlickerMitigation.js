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

        // Renderer stability detection
        this.lastRendererCheckTime = 0;
        this.rendererCheckInterval = 1000; // 1 second
        this.rendererBaseline = null;
        this.rendererChangeDetected = false;
        this.contextLostDetected = false;
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

            // Tag player sprite for identity tracking
            if (player && player.sprite) {
                player.sprite.name = 'playerSprite';
                player.sprite.__playerMarker = true;
            }

            // Set up renderer stability monitoring
            this.setupRendererMonitoring();
        }

        console.log('[FlickerMitigation] Enabled (clamp=' + this.clampEnabled + ')');
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
            if (child.name === 'playerSprite' || child.__playerMarker === true) {
                playerVisuals.push({
                    id: child.__id || 'unknown',
                    parent: child.parent ? (child.parent.name || child.parent.constructor.name) : 'none',
                    alpha: child.alpha,
                    visible: child.visible,
                    x: child.x,
                    y: child.y
                });
            }
        });

        if (playerVisuals.length !== 1 && !this.duplicateDetected) {
            this.duplicateDetected = true;
            const stack = new Error().stack;

            console.error('[FlickerMitigation] 🚨 DUPLICATE PLAYER VISUALS DETECTED!', {
                count: playerVisuals.length,
                expected: 1,
                visuals: playerVisuals,
                stack: stack
            });
        } else if (playerVisuals.length === 1 && this.duplicateDetected) {
            // Reset flag if it's back to normal
            this.duplicateDetected = false;
            console.log('[FlickerMitigation] ✅ Player visual count normalized (1)');
        }
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

        // Check for changes
        const changed =
            current.resolution !== this.rendererBaseline.resolution ||
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
     * Disable mitigation
     */
    disable() {
        this.enabled = false;
        this.clampEnabled = false;
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
