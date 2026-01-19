
// Helper for warn-once logic to avoid console spam
const warnedMap = new Set();

export function warnOnce(key, message) {
    if (warnedMap.has(key)) return;
    warnedMap.add(key);
    console.warn(message);
}
