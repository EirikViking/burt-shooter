/**
 * PropertyWriteTracer - Low-overhead property write tracker for debugging timing-sensitive bugs
 * Intercepts property setters without console.log spam
 */

const BUFFER_SIZE = 500;
const MAX_WRITES_PER_SECOND = 100;

class PropertyWriteTracer {
    constructor() {
        this.buffer = [];
        this.enabled = false;
        this.startTime = performance.now();
        this.lastWriteTime = 0;
        this.writesThisSecond = 0;
        this.secondStart = performance.now();
        this.filter = /alpha|visible|renderable/;
        this.onlyWhenFlicker = false;
        this.flickerThreshold = 16; // ms
        this.lastValues = new Map(); // Track last value per target+property
    }

    shouldRecord() {
        if (!this.enabled) return false;

        const now = performance.now();

        // Reset counter every second
        if (now - this.secondStart > 1000) {
            this.writesThisSecond = 0;
            this.secondStart = now;
        }

        // Throttle to max writes per second
        if (this.writesThisSecond >= MAX_WRITES_PER_SECOND) {
            return false;
        }

        return true;
    }

    record(target, property, oldValue, newValue, stack) {
        if (!this.shouldRecord()) return;

        // Skip if value didn't actually change
        if (oldValue === newValue) return;

        // Apply filter
        if (this.filter && !this.filter.test(property)) return;

        const now = performance.now();
        const elapsed = now - this.startTime;

        // Check for flicker pattern if enabled
        const key = `${target}_${property}`;
        const lastEntry = this.lastValues.get(key);

        if (this.onlyWhenFlicker && lastEntry) {
            const timeDiff = now - lastEntry.time;
            const valueDiff = oldValue !== lastEntry.value;

            // Only record if this looks like a flicker (rapid toggle)
            if (timeDiff > this.flickerThreshold || !valueDiff) {
                return;
            }
        }

        this.lastValues.set(key, { time: now, value: newValue });

        const entry = {
            time: elapsed.toFixed(2),
            target,
            property,
            old: oldValue,
            new: newValue,
            stack: this.cleanStack(stack)
        };

        this.buffer.push(entry);
        if (this.buffer.length > BUFFER_SIZE) {
            this.buffer.shift();
        }

        this.writesThisSecond++;
        this.lastWriteTime = now;
    }

    cleanStack(stack) {
        if (!stack) return '';

        const lines = stack.split('\n');
        // Skip first 3 lines (Error, PropertyWriteTracer, setter wrapper)
        const relevant = lines.slice(3, 6);

        return relevant.map(line => {
            // Extract just the function name and file:line
            const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
            if (match) {
                const [, fn, file, line] = match;
                const shortFile = file.split('/').pop();
                return `${fn}@${shortFile}:${line}`;
            }
            return line.trim();
        }).join(' → ');
    }

    dump() {
        console.group('=== PROPERTY WRITE TRACE ===');
        console.log(`Total entries: ${this.buffer.length}`);
        console.log(`Filter: ${this.filter}`);
        console.log(`Only when flicker: ${this.onlyWhenFlicker}`);

        if (this.buffer.length === 0) {
            console.log('Buffer empty');
        } else {
            // Group by target+property
            const grouped = {};
            this.buffer.forEach(entry => {
                const key = `${entry.target}.${entry.property}`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(entry);
            });

            Object.keys(grouped).forEach(key => {
                const entries = grouped[key];
                console.group(`${key} (${entries.length} writes)`);
                console.table(entries);
                console.groupEnd();
            });
        }

        console.groupEnd();
    }

    clear() {
        this.buffer = [];
        this.lastValues.clear();
        this.startTime = performance.now();
    }

    setHighAttention(durationMs = 5000) {
        this.clear();
        this.enabled = true;
        console.log(`[PropertyWriteTracer] High attention mode for ${durationMs}ms`);

        setTimeout(() => {
            console.log('[PropertyWriteTracer] High attention mode ended');
        }, durationMs);
    }
}

// Global singleton
export const propertyWriteTracer = new PropertyWriteTracer();

// Expose to window
if (typeof window !== 'undefined') {
    window.__traceDump = () => propertyWriteTracer.dump();
    window.__traceEnable = (val) => { propertyWriteTracer.enabled = val; };
    window.__traceClear = () => propertyWriteTracer.clear();
    window.__traceFilter = (regex) => { propertyWriteTracer.filter = regex; };
    window.__traceOnlyWhenFlicker = (val) => { propertyWriteTracer.onlyWhenFlicker = val; };
    window.__traceHighAttention = (ms) => propertyWriteTracer.setHighAttention(ms);
}

/**
 * Patch a display object to intercept property writes
 */
export function patchDisplayObject(obj, targetName) {
    if (!obj || obj.__patched) return;
    obj.__patched = true;

    const properties = ['alpha', 'visible', 'renderable'];

    properties.forEach(prop => {
        const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
        if (!descriptor || !descriptor.configurable) {
            // Try prototype
            let proto = Object.getPrototypeOf(obj);
            while (proto) {
                const protoDesc = Object.getOwnPropertyDescriptor(proto, prop);
                if (protoDesc && protoDesc.set) {
                    const originalSet = protoDesc.set;
                    const originalGet = protoDesc.get;

                    Object.defineProperty(obj, prop, {
                        get: function () {
                            return originalGet.call(this);
                        },
                        set: function (val) {
                            const oldVal = originalGet.call(this);
                            if (oldVal !== val) {
                                const stack = new Error().stack;
                                propertyWriteTracer.record(targetName, prop, oldVal, val, stack);
                            }
                            originalSet.call(this, val);
                        },
                        configurable: true
                    });
                    return;
                }
                proto = Object.getPrototypeOf(proto);
            }
        } else if (descriptor.set) {
            const originalSet = descriptor.set;
            const originalGet = descriptor.get;

            Object.defineProperty(obj, prop, {
                get: originalGet,
                set: function (val) {
                    const oldVal = originalGet.call(this);
                    if (oldVal !== val) {
                        const stack = new Error().stack;
                        propertyWriteTracer.record(targetName, prop, oldVal, val, stack);
                    }
                    originalSet.call(this, val);
                },
                configurable: true
            });
        }
    });

    // Patch scale if it exists
    if (obj.scale && typeof obj.scale.set === 'function') {
        const originalSet = obj.scale.set.bind(obj.scale);
        obj.scale.set = function (x, y) {
            const stack = new Error().stack;
            propertyWriteTracer.record(targetName, 'scale.set', `${obj.scale.x},${obj.scale.y}`, `${x},${y || x}`, stack);
            return originalSet(x, y);
        };
    }
}
