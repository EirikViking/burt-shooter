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

        // Status tracking
        this.lastSample = null;
        this.missingErrorLogged = false;

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

            // Tag player sprite if not already tagged
            if (player && player.sprite) {
                if (!player.sprite.__isPlayerVisual) {
                    player.sprite.name = 'playerVisualRoot';
                    player.sprite.__isPlayerVisual = true;
                }
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
        if (this.clampEnabled) {
            this.clampPlayerVisuals();
        }

        // Check for duplicate player visuals (once per second)
        if (this.clampEnabled && now - this.lastDuplicateCheckTime > this.duplicateCheckInterval) {
            this.lastDuplicateCheckTime = now;
            this.checkPlayerVisuals();
        }

        // Check renderer stability (once per second)
        if (this.clampEnabled && now - this.lastRendererCheckTime > this.rendererCheckInterval) {
            this.lastRendererCheckTime = now;
            this.checkRendererStability();
        }
    }

    /**
     * Hard clamp player visual properties using authoritative reference
     */
    clampPlayerVisuals() {
        // 1. Get authoritative reference
        let sprite = this.player ? this.player.sprite : null;

        // 2. Safety check
        if (!sprite || sprite.destroyed) {
            if (this.player && this.player.ensureRenderable) {
                // Attempt recovery if method exists
                // this.player.ensureRenderable('clamp_recovery'); 
                // Commented out to avoid spam, but could enable if desperate
            }
            return;
        }

        // 3. Force properties
        sprite.alpha = 1;
        sprite.visible = true;
        sprite.renderable = true;

        // 4. Force ship sprite children
        if (this.player.shipSprite && !this.player.shipSprite.destroyed) {
            this.player.shipSprite.alpha = 1;
            this.player.shipSprite.visible = true;
            this.player.shipSprite.renderable = true;
        }

        // 5. Invariant enforcement: Ensure parentage
        if (!sprite.parent && this.gameContainer) {
            // Only log this critical failure once
            if (!this._reparentLog) {
                console.warn('[FlickerMitigation] 🚨 Player sprite DETACHED detected in clamp! Attempting re-attach.');
                this._reparentLog = true;
            }
            this.gameContainer.addChild(sprite);
        }
    }

    /**
     * Check for duplicate OR missing player visuals in the complete stage
     */
    checkPlayerVisuals() {
        // Traverse from STAGE if available, otherwise app.view, otherwise gameContainer
        const root = (this.app && this.app.stage) ? this.app.stage : this.gameContainer;

        if (!root) return;

        const visuals = [];

        // Traverse root and find all player sprites
        this.traverseContainer(root, (child) => {
            // Check for robust marker OR name fallback
            if (child.__isPlayerVisual === true || child.name === 'playerVisualRoot' || child.name === 'playerVisual') {
                const parentChain = this.getParentChain(child);
                visuals.push({
                    obj: child,
                    id: child.__id || child.uid || 'unknown',
                    vid: child.__playerVisualId || 'none',
                    name: child.name || 'unnamed',
                    parentChain: parentChain,
                    alpha: child.alpha,
                    visible: child.visible,
                    renderable: child.renderable,
                    worldVisible: child.worldVisible // if pixi calculates it
                });
            }
        });

        this.lastSample = {
            time: performance.now(),
            count: visuals.length,
            visuals: visuals.map(v => ({ ...v, obj: 'ref' })), // Don't leak massive objects in simple logs
            root: root.constructor.name
        };

        if (visuals.length !== 1) {
            // Log based on type
            if (visuals.length === 0 && !this.missingErrorLogged) {
                this.missingErrorLogged = true;
                this.logMissingError();
            } else if (visuals.length > 1) {
                if (!this.duplicateErrorLogged) {
                    this.duplicateErrorLogged = true;
                    const stack = new Error().stack;
                    console.error('[FlickerMitigation] 🚨 DUPLICATE PLAYER VISUALS DETECTED!', {
                        count: visuals.length,
                        expected: 1,
                        visuals: visuals.map(v => ({ ...v, obj: 'ref' })),
                        stack: stack
                    });
                }

                // ACTIVE MITIGATION: Destroy non-authoritative sprites
                const authoritative = this.player ? this.player.sprite : null;
                let destroyedCount = 0;

                visuals.forEach(v => {
                    // If this is NOT the current authoritative sprite, destroy it
                    if (v.obj !== authoritative) {
                        // Double check it's not the ship sprite inside the player sprite (nested check)
                        // But wait, our marker is only on the ROOT player sprite.
                        // Ship sprites shouldn't have __isPlayerVisual unless we added it?
                        // We added it to "player.sprite". Ship sprite is child.

                        console.warn(`[FlickerMitigation] 🧹 DESTROYING ORPHAN VISUAL (id=${v.id}, vid=${v.vid})`);
                        try {
                            if (v.obj.parent) v.obj.parent.removeChild(v.obj);
                            v.obj.destroy({ children: true });
                            destroyedCount++;
                        } catch (e) {
                            console.error('Failed to destroy orphan:', e);
                        }
                    }
                });

                if (destroyedCount > 0) {
                    console.log(`[FlickerMitigation] ✅ Cleaned up ${destroyedCount} orphan visuals`);
                }
            }
        }
    }

    logMissingError() {
        // Diagnostic dump for missing player
        const activePlayer = !!this.player;
        const activeSprite = this.player ? !!this.player.sprite : false;
        const spriteParent = (this.player && this.player.sprite) ? !!this.player.sprite.parent : false;
        const destroyed = (this.player && this.player.sprite) ? this.player.sprite.destroyed : 'n/a';

        console.error('[FlickerMitigation] 🚨 MISSING PLAYER VISUAL!', {
            hasPlayerInstance: activePlayer,
            hasSprite: activeSprite,
            spriteDestroyed: destroyed,
            hasParent: spriteParent,
            root: (this.app && this.app.stage) ? 'stage' : 'gameContainer'
        });

        // Attempt recovery
        if (this.player && this.player.sprite && !this.player.sprite.destroyed && this.gameContainer) {
            console.warn('[FlickerMitigation] Attempting recovery re-mount...');
            this.gameContainer.addChild(this.player.sprite);
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
        console.group('🔍 [FlickerMitigation] Status Dump V3');

        console.log('Enabled:', this.enabled);
        console.log('Clamp Enabled:', this.clampEnabled);

        // Reference check
        const refStatus = {
            hasPlayer: !!this.player,
            hasSprite: this.player ? !!this.player.sprite : false,
            spriteDestroyed: this.player && this.player.sprite ? this.player.sprite.destroyed : 'n/a',
            spriteParent: this.player && this.player.sprite && this.player.sprite.parent ? (this.player.sprite.parent.name || 'unnamed') : 'null'
        };
        console.log('Authoritative Ref:', refStatus);

        // Last Sample
        if (this.lastSample) {
            console.log('Last Visual Count:', this.lastSample.count);
            if (this.lastSample.visuals.length > 0) {
                console.table(this.lastSample.visuals);
            }
        } else {
            console.log('No sample yet (run ?trace=1 and wait 1s)');
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

            console.log('Renderer Changed:', this.rendererChangeDetected);
            console.log('Context Lost:', this.contextLostDetected);
        }

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
