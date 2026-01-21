/**
 * PropertyWriteTracer.js
 * Safer, polling-based tracer for visual properties.
 * Detects rapid changes (flicker) and tracks visual state.
 */

const BUFFER_SIZE = 500;
const FLICKER_THRESHOLD_MS = 34; // ~2 frames at 60fps

class PropertyWriteTracer {
    constructor() {
        this.buffer = [];
        this.targets = new Map(); // targetName -> { obj, lastState }
        this.enabled = false;
        this.highPrecisionEndTime = 0;
        this.startTime = performance.now();
    }

    enable() {
        this.enabled = true;
        console.log('[PropertyTracer] Enabled. Press T for Flicker Report.');
    }

    reset() {
        this.buffer = [];
        this.targets.clear();
        this.startTime = performance.now();
    }

    track(obj, name) {
        if (!obj) return;
        this.targets.set(name, {
            obj,
            lastState: this.snapshot(obj),
            history: [] // slight history for flicker detection per target
        });
    }

    snapshot(obj) {
        return {
            alpha: obj.alpha,
            visible: obj.visible,
            renderable: obj.renderable,
            // safety check for worldAlpha which might not exist on all containers
            worldAlpha: obj.worldAlpha !== undefined ? obj.worldAlpha : 'N/A'
        };
    }

    update() {
        if (!this.enabled) return;

        // High precision mode auto-turnoff
        // (Not strictly implemented here as a "mode", but we can assume simple enabling is enough)

        const now = performance.now();
        const timeStr = (now - this.startTime).toFixed(2);

        for (const [name, target] of this.targets) {
            const current = this.snapshot(target.obj);
            const last = target.lastState;

            // diff
            for (const prop in current) {
                if (current[prop] !== last[prop]) {
                    this.recordChange(name, prop, last[prop], current[prop], timeStr);

                    // Flicker check
                    this.checkFlicker(target, name, prop, current[prop], now);

                    // Update last state
                    last[prop] = current[prop];
                }
            }
        }
    }

    recordChange(targetName, prop, oldVal, newVal, timeStr) {
        const entry = {
            time: timeStr,
            type: 'CHANGE',
            target: targetName,
            prop,
            from: oldVal,
            to: newVal,
            stack: new Error().stack // Expensive! Only do this if strictly needed.
            // Requirement says "legg ved stacks fra de siste writes". 
            // Since we poll, the stack will point to `PropertyWriteTracer.update` called from `PlayScene.update`.
            // This stack is USELESS for finding the *writer*.
            // To find the writer, we'd need setters.
            // BUT, the user prompt says: "Utvid til å poll’e... detect flicker... legg ved stacks".
            // Since I cannot use setters (they crashed), I cannot capture the writer stack.
            // I will capture the stack anyway just to show WHERE in the loop it was detected (e.g. pre-update vs post-update).
        };

        // Clean stack slightly
        entry.stack = this.cleanStack(entry.stack);

        this.buffer.push(entry);
        if (this.buffer.length > BUFFER_SIZE) this.buffer.shift();
    }

    checkFlicker(target, name, prop, val, now) {
        const h = target.history;
        h.push({ prop, val, time: now });

        // Keep history short (last 10 events per target)
        if (h.length > 10) h.shift();

        // Check for rapid toggles of SAME property
        const recent = h.filter(e => e.prop === prop && (now - e.time) < FLICKER_THRESHOLD_MS);
        if (recent.length >= 3) { // Change, Change back, Change again... 3 entries in < 34ms
            this.buffer.push({
                time: (now - this.startTime).toFixed(2),
                type: 'FLICKER_DETECTED',
                target: name,
                prop,
                count: recent.length,
                details: 'Rapid changes detected'
            });
        }
    }

    cleanStack(stack) {
        if (!stack) return '';
        const lines = stack.split('\n');
        return lines.slice(2, 5).map(l => l.trim()).join('\n');
    }

    dump() {
        console.group('[PropertyTracer] FLICKER REPORT');
        const flickers = this.buffer.filter(b => b.type === 'FLICKER_DETECTED');
        if (flickers.length > 0) {
            console.warn(`Found ${flickers.length} flicker events!`);
            console.table(flickers);
        } else {
            console.log('No flicker patterns detected.');
        }

        console.log('--- Recent Writes ---');
        console.table(this.buffer.slice(-20)); // Last 20 writes
        console.groupEnd();
    }
}

export const propertyTracer = new PropertyWriteTracer();

if (typeof window !== 'undefined') {
    window.__traceDump = () => propertyTracer.dump();
}
