/**
 * MutationSpy.js
 * Detects rapid attach/detach cycles on critical containers
 */

const BUFFER_SIZE = 500;
const RAPID_THRESHOLD_MS = 50;

class MutationSpy {
    constructor() {
        this.enabled = false;
        this.buffer = [];
        this.targets = new Map(); // container -> { lastMutation, history }
        this.wrappedContainers = new Set();
    }

    enable() {
        this.enabled = true;
        console.log('[MutationSpy] Enabled');
    }

    wrapContainer(container, name) {
        if (!container || this.wrappedContainers.has(container)) return;

        this.wrappedContainers.add(container);
        this.targets.set(container, {
            name,
            lastMutation: 0,
            history: []
        });

        // Wrap addChild
        const originalAddChild = container.addChild.bind(container);
        container.addChild = (...children) => {
            this.onMutation(container, 'addChild', children.length);
            return originalAddChild(...children);
        };

        // Wrap removeChild
        const originalRemoveChild = container.removeChild.bind(container);
        container.removeChild = (child) => {
            this.onMutation(container, 'removeChild', 1);
            return originalRemoveChild(child);
        };

        // Wrap removeChildren
        const originalRemoveChildren = container.removeChildren.bind(container);
        container.removeChildren = () => {
            const count = container.children.length;
            this.onMutation(container, 'removeChildren', count);
            return originalRemoveChildren();
        };

        console.log(`[MutationSpy] Wrapped container: ${name}`);
    }

    onMutation(container, operation, count) {
        if (!this.enabled) return;

        const now = performance.now();
        const target = this.targets.get(container);
        if (!target) return;

        const timeSinceLast = now - target.lastMutation;
        target.lastMutation = now;

        // Track history
        target.history.push({ time: now, operation, count });
        if (target.history.length > 20) {
            target.history.shift();
        }

        // Detect rapid mutations
        if (timeSinceLast < RAPID_THRESHOLD_MS && timeSinceLast > 0) {
            const stack = this.captureStack();
            this.buffer.push({
                time: now.toFixed(2),
                type: 'RAPID_MUTATION',
                target: target.name,
                operation,
                count,
                timeSinceLast: timeSinceLast.toFixed(2),
                stack
            });

            if (this.buffer.length > BUFFER_SIZE) {
                this.buffer.shift();
            }
        }
    }

    captureStack() {
        const err = new Error();
        const lines = err.stack.split('\n');
        return lines
            .filter(l => !l.includes('MutationSpy'))
            .slice(1, 5)
            .map(l => l.trim())
            .join('\n');
    }

    dump() {
        console.group('[MutationSpy] Report');

        const rapidMutations = this.buffer.filter(b => b.type === 'RAPID_MUTATION');
        if (rapidMutations.length > 0) {
            console.warn(`⚠️ Found ${rapidMutations.length} rapid mutation events!`);
            console.table(rapidMutations.slice(-20).map(m => ({
                time: m.time,
                target: m.target,
                operation: m.operation,
                count: m.count,
                gap: m.timeSinceLast + 'ms'
            })));

            console.groupCollapsed('Detailed Stacks');
            rapidMutations.slice(-10).forEach(m => {
                console.log(`${m.target} ${m.operation}:`);
                console.log(m.stack);
                console.log('---');
            });
            console.groupEnd();
        } else {
            console.log('✅ No rapid mutation anomalies detected');
        }

        // Show current state of tracked containers
        console.log('\nTracked Containers:');
        for (const [container, target] of this.targets) {
            console.log(`${target.name}: ${container.children.length} children`);
        }

        console.groupEnd();
    }
}

export const mutationSpy = new MutationSpy();

if (typeof window !== 'undefined') {
    window.__mutationSpyDump = () => mutationSpy.dump();
}
