
// Helper for warn-once logic to avoid console spam
const warnedMap = new Set();

function isVerboseLoggingEnabled() {
    if (typeof window === 'undefined') return true;
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === '1' || params.get('verboseLogs') === '1' || params.get('logs') === '1') {
            return true;
        }
        return window.localStorage?.getItem('burtVerboseLogs') === '1' || Boolean(import.meta.env?.DEV);
    } catch {
        return Boolean(import.meta.env?.DEV);
    }
}

export function installConsoleLogFilter() {
    if (typeof window === 'undefined' || window.__burtConsoleLogFilterInstalled) return;

    window.__burtConsoleLogFilterInstalled = true;
    window.__burtVerboseLogs = isVerboseLoggingEnabled();
    window.__burtOriginalConsole = window.__burtOriginalConsole || {
        log: console.log.bind(console),
        info: console.info.bind(console),
        debug: console.debug.bind(console)
    };

    if (window.__burtVerboseLogs) return;

    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
}

export function warnOnce(key, message) {
    if (warnedMap.has(key)) return;
    warnedMap.add(key);
    console.warn(message);
}
