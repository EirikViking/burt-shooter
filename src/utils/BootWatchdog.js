// BootWatchdog.js
// Monitors game startup and catches freezes/crashes

const BOOT_TIMEOUT = 8000; // 8 seconds to reach SCENE_READY

export const BootWatchdog = {
    bootStartTime: Date.now(),
    lastCheckpointTime: Date.now(),
    currentStep: 'INIT',
    logBuffer: [],
    interval: null,
    isReady: false,

    init() {
        this.bootStartTime = Date.now();
        this.wrapConsole();

        // Start monitoring
        this.interval = setInterval(() => this.check(), 1000);

        // Global debug flag
        window.__BOOT_STEP = this.currentStep;
        console.log('[BootWatchdog] Watchdog active.');
    },

    checkpoint(step) {
        this.currentStep = step;
        this.lastCheckpointTime = Date.now();
        window.__BOOT_STEP = step;
        console.log(`[BootWatchdog] CHECKPOINT: ${step}`);

        if (step === 'SCENE_READY') {
            this.isReady = true;
            clearInterval(this.interval);
            console.log('[BootWatchdog] Game loaded successfully.');
        }
    },

    wrapConsole() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        const bufferLog = (type, args) => {
            const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            this.logBuffer.push(`[${type}] ${msg}`);
            if (this.logBuffer.length > 20) this.logBuffer.shift();
        };

        console.log = (...args) => {
            bufferLog('LOG', args);
            originalLog.apply(console, args);
        };
        console.warn = (...args) => {
            bufferLog('WARN', args);
            originalWarn.apply(console, args);
        };
        console.error = (...args) => {
            bufferLog('ERR', args);
            originalError.apply(console, args);
        };
    },

    check() {
        if (this.isReady) return;

        const elapsed = Date.now() - this.bootStartTime;
        if (elapsed > BOOT_TIMEOUT) {
            this.triggerFreeze('BOOT TIMEOUT - STUCK AT ' + this.currentStep);
        }
    },

    triggerFreeze(reason) {
        clearInterval(this.interval);
        console.error('[BootWatchdog] FREEZE DETECTED:', reason);

        // Show Overlay
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.top = '0';
        div.style.left = '0';
        div.style.width = '100%';
        div.style.height = '100%';
        div.style.backgroundColor = 'rgba(0,0,0,0.9)';
        div.style.color = 'red';
        div.style.fontFamily = 'monospace';
        div.style.padding = '20px';
        div.style.zIndex = '99999';
        div.style.overflow = 'auto';
        div.innerHTML = `
      <h1>GAME FREEZE DETECTED</h1>
      <h2>${reason}</h2>
      <h3>Last Logs:</h3>
      <pre>${this.logBuffer.join('\n')}</pre>
    `;
        document.body.appendChild(div);

        // Try to stop PIXI ticker if possible
        try {
            if (window.__PIXI_APP) {
                window.__PIXI_APP.ticker.stop();
            }
        } catch (e) { }
    }
};
