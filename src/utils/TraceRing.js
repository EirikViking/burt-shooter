/**
 * TraceRing.js
 * A low-overhead ring buffer for storing trace events without console logging.
 * Intended for debugging timing-sensitive bugs where console I/O masks the issue.
 */

const BUFFER_SIZE = 2048;

class TraceRing {
    constructor() {
        this.buffer = new Array(BUFFER_SIZE);
        this.index = 0;
        this.enabled = true;
        this.startTime = -1;
    }

    /**
     * Store a trace event.
     * @param {string} tag - Short tag identifying the system
     * @param {*} a - First data point (keep simple: number, boolean, short string)
     * @param {*} b - Second data point
     * @param {*} c - Third data point
     */
    trace(tag, a, b, c) {
        if (!this.enabled) return;

        // Lazy init start time for relative timestamps
        if (this.startTime < 0) this.startTime = performance.now();

        const entry = {
            t: (performance.now() - this.startTime).toFixed(2),
            tag,
            a,
            b,
            c
        };

        this.buffer[this.index] = entry;
        this.index = (this.index + 1) % BUFFER_SIZE;
    }

    /**
     * Reset the buffer
     */
    clear() {
        this.index = 0;
        this.buffer.fill(null);
        this.startTime = -1;
    }

    /**
     * Dump the sorted chronological trace to console.
     * Because usage is a ring buffer, we need to order it correctly.
     */
    dump() {
        console.group("=== TRACE RING DUMP ===");
        console.log(`Buffer size: ${BUFFER_SIZE}, Current Index: ${this.index}`);

        const timestamp = new Date().toISOString();
        console.log(`Dump time: ${timestamp}`);

        // Reconstruct order: from index to end, then 0 to index-1
        const chronological = [];
        for (let i = 0; i < BUFFER_SIZE; i++) {
            const ptr = (this.index + i) % BUFFER_SIZE;
            if (this.buffer[ptr]) {
                chronological.push(this.buffer[ptr]);
            }
        }

        if (chronological.length === 0) {
            console.log("Buffer empty.");
        } else {
            console.table(chronological);
        }
        console.groupEnd();
    }
}

// Global singleton instance
export const traceRing = new TraceRing();

// Expose to window for console access if needed
if (typeof window !== 'undefined') {
    window.__traceRing = traceRing;
    window.__dumpTrace = () => traceRing.dump();
}
