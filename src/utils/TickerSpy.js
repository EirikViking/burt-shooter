/**
 * TickerSpy.js
 * Tracks PixiJS ticker activity to identify rogue loops or competing updaters.
 * Non-invasive wrapper that records creation stacks and tracks active execution.
 */

const MAX_LOG_SIZE = 50;

class TickerSpy {
    constructor() {
        this.enabled = false;
        this.activeTickers = new Map(); // fn -> { id, stack, ctx, priority, addedAt }
        this.executionLog = []; // { time, fnId, duration }
        this.nextId = 1;
        this.appTicker = null;
        this.originalAdd = null;
        this.originalRemove = null;
    }

    enable(app) {
        if (this.enabled || !app || !app.ticker) return;
        this.appTicker = app.ticker;
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

        console.log('[TickerSpy] Enabled and wrapping app.ticker');
    }

    register(fn, ctx, priority) {
        if (this.activeTickers.has(fn)) return;

        const id = this.nextId++;
        const stack = new Error().stack; // Capture creation stack

        this.activeTickers.set(fn, {
            id,
            stack: this.cleanStack(stack),
            ctx,
            priority,
            addedAt: performance.now()
        });
    }

    unregister(fn) {
        if (this.activeTickers.has(fn)) {
            // Keep a small history of removed tickers? For now just remove.
            this.activeTickers.delete(fn);
        }
    }

    cleanStack(stack) {
        if (!stack) return 'No stack';
        return stack.split('\n').slice(2, 6).map(l => l.trim()).join('\n');
    }

    dump() {
        console.group('[TickerSpy] Report');
        console.log(`Active Tickers: ${this.activeTickers.size}`);

        const list = Array.from(this.activeTickers.values());
        if (list.length > 0) {
            console.table(list.map(t => ({
                id: t.id,
                priority: t.priority,
                added: t.addedAt.toFixed(2),
                stack: t.stack.split('\n')[0] // First line of stack for table
            })));
        } else {
            console.log('No active tracked tickers.');
        }

        // Full Detail Dump
        console.groupCollapsed('Detailed Stacks');
        list.forEach(t => {
            console.log(`Ticker #${t.id} (P:${t.priority})`);
            console.log(t.stack);
            console.log('---');
        });
        console.groupEnd();
        console.groupEnd();

        return list;
    }
}

export const tickerSpy = new TickerSpy();

if (typeof window !== 'undefined') {
    window.__tickerSpyDump = () => tickerSpy.dump();
}
