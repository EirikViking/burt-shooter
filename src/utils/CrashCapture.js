/**
 * CrashCapture.js
 * Captures global errors, unhandled rejections, and wrapped ticker errors.
 * Stores minimal metadata in a ring buffer for post-mortem debugging.
 */

const BUFFER_SIZE = 300;

class CrashCapture {
    constructor() {
        this.buffer = [];
        this.startTime = Date.now();
        this.sceneRef = null; // Weak reference logic handled by not holding hard ref if possible, or simple ref if needed. 
        // For simplicity in JS, a direct ref is fine as long as we don't leak indefinitely (singleton).
        this.enabled = false;
    }

    enable(scene) {
        if (this.enabled) return;
        this.sceneRef = scene;
        this.enabled = true;

        window.addEventListener('error', this.handleError.bind(this));
        window.addEventListener('unhandledrejection', this.handleRejection.bind(this));

        console.log('[CrashCapture] Enabled. Press Y to dump crash report.');
    }

    log(type, message, stack = null, extra = {}) {
        const entry = {
            time: (Date.now() - this.startTime).toFixed(2),
            type,
            message,
            stack,
            extra,
            sceneState: this.captureSceneState()
        };

        this.buffer.push(entry);
        if (this.buffer.length > BUFFER_SIZE) {
            this.buffer.shift();
        }
    }

    handleError(event) {
        this.log('GLOBAL_ERROR', event.message, event.error ? event.error.stack : null, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    }

    handleRejection(event) {
        this.log('UNHANDLED_REJECTION', event.reason ? (event.reason.message || event.reason) : 'Unknown reason', event.reason ? event.reason.stack : null);
    }

    captureSceneState() {
        if (!this.sceneRef) return null;

        try {
            const s = this.sceneRef;
            const p = s.player;
            return {
                playerExists: !!p,
                spriteExists: !!p?.sprite,
                containerExists: !!p?.container, // if applicable
                invulnerable: p?.invulnerable,
                isDead: s.game?.lives <= 0, // Approximate
                respawnIsActive: !!s._deathTimeouts?.length, // Heuristic if using death timeouts
                tickerSize: s.app?.ticker?.count || 0
            };
        } catch (e) {
            return { error: 'Failed to capture state', msg: e.message };
        }
    }

    /**
     * Wrap a ticker function to catch errors within the game loop
     */
    wrapTicker(fn) {
        return (...args) => {
            try {
                fn.apply(this.sceneRef, args);
            } catch (e) {
                this.log('TICKER_ERROR', e.message, e.stack);
                console.error('[CrashCapture] Caught ticker error:', e);
            }
        };
    }

    dump() {
        console.group('[CrashCapture] REPORT');
        console.log(`Uptime: ${(Date.now() - this.startTime) / 1000}s`);
        console.log(`Buffer size: ${this.buffer.length}`);

        if (this.buffer.length === 0) {
            console.log('No crashes or errors recorded.');
        } else {
            console.table(this.buffer.map(b => ({
                time: b.time,
                type: b.type,
                msg: b.message.substring(0, 50),
                scene: JSON.stringify(b.sceneState)
            })));

            // Log full details of the last 3 errors
            const errors = this.buffer.filter(b => b.type.includes('ERROR') || b.type.includes('REJECTION'));
            if (errors.length > 0) {
                console.log('--- LAST 3 ERRORS ---');
                errors.slice(-3).forEach(err => console.log(err));
            }
        }
        console.groupEnd();
    }
}

export const crashCapture = new CrashCapture();

if (typeof window !== 'undefined') {
    window.__crashDump = () => crashCapture.dump();
}
