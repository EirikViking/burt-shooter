/**
 * TickerRegistry.js
 * Enhanced ticker tracking with duplicate detection and respawn comparison
 */

class TickerRegistry {
    constructor() {
        this.enabled = false;
        this.tickers = new Map(); // fn -> { id, stack, ctx, priority, addedAt, label }
        this.nextId = 1;
        this.app = null;
        this.originalAdd = null;
        this.originalRemove = null;
        this.respawnSnapshot = null;
    }

    enable(app) {
        if (this.enabled || !app || !app.ticker) return;

        this.app = app;
        this.enabled = true;

        // Wrap add
        this.originalAdd = app.ticker.add.bind(app.ticker);
        app.ticker.add = (fn, ctx, priority) => {
            this.register(fn, ctx, priority);
            return this.originalAdd(fn, ctx, priority);
        };

        // Wrap remove
        this.originalRemove = app.ticker.remove.bind(app.ticker);
        app.ticker.remove = (fn, ctx) => {
            this.unregister(fn);
            return this.originalRemove(fn, ctx);
        };

        console.log('[TickerRegistry] Enabled');
    }

    register(fn, ctx, priority) {
        const id = this.nextId++;
        const stack = this.captureStack();
        const label = this.extractLabel(stack);

        // Check for duplicate
        if (this.tickers.has(fn)) {
            const existing = this.tickers.get(fn);
            console.warn(`[TickerRegistry] DUPLICATE ticker detected!`, {
                existingId: existing.id,
                newId: id,
                label
            });
        }

        this.tickers.set(fn, {
            id,
            stack,
            ctx,
            priority,
            addedAt: performance.now(),
            label,
            isDuplicate: this.tickers.has(fn)
        });
    }

    unregister(fn) {
        this.tickers.delete(fn);
    }

    captureStack() {
        const err = new Error();
        const lines = err.stack.split('\n');
        return lines
            .filter(l => !l.includes('TickerRegistry'))
            .slice(1, 6)
            .map(l => l.trim())
            .join('\n');
    }

    extractLabel(stack) {
        // Try to extract meaningful label from stack
        const firstLine = stack.split('\n')[0] || '';
        const match = firstLine.match(/at\s+(\w+)/);
        return match ? match[1] : 'unknown';
    }

    snapshotBeforeRespawn() {
        this.respawnSnapshot = {
            time: performance.now(),
            tickers: Array.from(this.tickers.entries()).map(([fn, data]) => ({
                id: data.id,
                label: data.label,
                priority: data.priority
            }))
        };
        console.log('[TickerRegistry] Snapshot taken before respawn:', this.respawnSnapshot.tickers.length, 'tickers');
    }

    compareAfterRespawn() {
        if (!this.respawnSnapshot) {
            console.warn('[TickerRegistry] No respawn snapshot to compare');
            return;
        }

        const current = Array.from(this.tickers.values());
        const before = this.respawnSnapshot.tickers;

        const newTickers = current.filter(t =>
            !before.some(b => b.id === t.id)
        );

        console.group('[TickerRegistry] Respawn Comparison');
        console.log(`Before: ${before.length} tickers`);
        console.log(`After: ${current.length} tickers`);
        console.log(`New since respawn: ${newTickers.length}`);

        if (newTickers.length > 0) {
            console.table(newTickers.map(t => ({
                id: t.id,
                label: t.label,
                priority: t.priority,
                duplicate: t.isDuplicate
            })));
        }

        console.groupEnd();
    }

    dump() {
        console.group('[TickerRegistry] Report');

        const active = Array.from(this.tickers.values());
        console.log(`Active Tickers: ${active.length}`);

        const duplicates = active.filter(t => t.isDuplicate);
        if (duplicates.length > 0) {
            console.warn(`⚠️ ${duplicates.length} duplicate tickers detected!`);
            console.table(duplicates.map(t => ({
                id: t.id,
                label: t.label,
                priority: t.priority
            })));
        }

        console.table(active.map(t => ({
            id: t.id,
            label: t.label,
            priority: t.priority,
            age: ((performance.now() - t.addedAt) / 1000).toFixed(1) + 's'
        })));

        console.groupCollapsed('Detailed Stacks');
        active.slice(-10).forEach(t => {
            console.log(`Ticker #${t.id} (${t.label}):`);
            console.log(t.stack);
            console.log('---');
        });
        console.groupEnd();

        console.groupEnd();
    }
}

export const tickerRegistry = new TickerRegistry();

if (typeof window !== 'undefined') {
    window.__tickerRegistryDump = () => tickerRegistry.dump();
}
