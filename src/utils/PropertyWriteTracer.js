/**
 * PropertyWriteTracer.js
 * Safer, polling-based tracer for visual properties.
 * Detects rapid changes (flicker) and tracks visual state.
 */

import { tickerSpy } from './TickerSpy.js';

const BUFFER_SIZE = 500;
// Relaxed threshold to filter out 60fps animations
const FLICKER_WINDOW_MS = 200;

class PropertyWriteTracer {
    constructor() {
        this.buffer = [];
        this.targets = new Map(); // targetName -> { obj, lastState, history }
        this.enabled = false;
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
            history: []
        });
    }

    snapshot(obj) {
        return {
            alpha: obj.alpha,
            visible: obj.visible,
            renderable: obj.renderable,
            worldAlpha: obj.worldAlpha !== undefined ? obj.worldAlpha : 'N/A'
        };
    }

    recordManualWrite(targetName, prop, oldVal, newVal, reason) {
        if (!this.enabled) return;

        const now = performance.now();
        const timeStr = (now - this.startTime).toFixed(2);

        // Push to main buffer
        this.buffer.push({
            time: timeStr,
            type: 'MANUAL_WRITE',
            target: targetName,
            prop,
            from: oldVal,
            to: newVal,
            reason: reason,
            stack: this.cleanStack(new Error().stack)
        });

        // Also update internal history for flicker detection if we are tracking this object
        // (We might be manually writing to an object we are also polling)
        const target = this.targets.get(targetName);
        if (target) {
            this.checkFlicker(target, targetName, prop, newVal, now);
            target.lastState[prop] = newVal;
        }
    }

    update() {
        if (!this.enabled) return;

        const now = performance.now();
        const timeStr = (now - this.startTime).toFixed(2);

        for (const [name, target] of this.targets) {
            const current = this.snapshot(target.obj);
            const last = target.lastState;

            for (const prop in current) {
                if (current[prop] !== last[prop]) {
                    this.recordChange(name, prop, last[prop], current[prop], timeStr);
                    this.checkFlicker(target, name, prop, current[prop], now);
                    last[prop] = current[prop];
                }
            }
        }
    }

    recordChange(targetName, prop, oldVal, newVal, timeStr) {
        const entry = {
            time: timeStr,
            type: 'POLL_CHANGE',
            target: targetName,
            prop,
            from: oldVal,
            to: newVal,
            stack: 'Polling (Unattributed)'
        };
        this.buffer.push(entry);
        if (this.buffer.length > BUFFER_SIZE) this.buffer.shift();
    }

    checkFlicker(target, name, prop, val, now) {
        const h = target.history;
        h.push({ prop, val, time: now });

        // Prune info older than window
        while (h.length > 0 && (now - h[0].time) > FLICKER_WINDOW_MS) {
            h.shift();
        }

        // Only check identifying props
        if (!['alpha', 'visible', 'renderable'].includes(prop)) return;

        const recent = h.filter(e => e.prop === prop);
        if (recent.length < 4) return;

        // Detect Oscillation / Rapid Toggling
        // Toggling: True -> False -> True -> False
        // Alpha: 1.0 -> 0.5 -> 1.0 -> 0.4

        let directionChanges = 0;
        let lastDir = 0; // 1 up, -1 down

        for (let i = 1; i < recent.length; i++) {
            const prev = recent[i - 1].val;
            const curr = recent[i].val;

            // Boolean toggle
            if (typeof curr === 'boolean') {
                if (curr !== prev) directionChanges++;
            }
            // Numeric toggle
            else if (typeof curr === 'number') {
                const diff = curr - prev;
                if (Math.abs(diff) < 0.01) continue; // Noise
                const dir = diff > 0 ? 1 : -1;
                if (lastDir !== 0 && dir !== lastDir) {
                    directionChanges++;
                }
                lastDir = dir;
            }
        }

        if (directionChanges >= 3) {
            this.buffer.push({
                time: (now - this.startTime).toFixed(2),
                type: 'FLICKER_DETECTED',
                target: name,
                prop,
                count: directionChanges,
                details: 'Rapid oscillation detected',
                historySnapshot: JSON.parse(JSON.stringify(recent))
            });
            // Clear history to avoid spamming same event
            target.history = [];
        }
    }

    cleanStack(stack) {
        if (!stack) return '';
        const lines = stack.split('\n');
        // Filter out PropertyTracer lines
        return lines.filter(l => !l.includes('VisualWrite') && !l.includes('PropertyWriteTracer'))
            .slice(1, 4).map(l => l.trim()).join('\n');
    }

    dump() {
        console.group('[PropertyTracer] FLICKER REPORT');

        const flickers = this.buffer.filter(b => b.type === 'FLICKER_DETECTED');
        if (flickers.length > 0) {
            console.warn(`Found ${flickers.length} flicker events!`);
            console.table(flickers);
        } else {
            console.log('No algorithmically detected flicker.');
        }

        console.log('--- Writer Log (Last 50) ---');
        // Filter to show substantive changes
        const pertinent = this.buffer.filter(b => b.type !== 'FLICKER_DETECTED');
        console.table(pertinent.slice(-50));

        if (window.__tickerSpyDump) {
            window.__tickerSpyDump();
        }

        console.groupEnd();
    }
}

export const propertyTracer = new PropertyWriteTracer();

if (typeof window !== 'undefined') {
    window.__traceDump = () => propertyTracer.dump();
}
