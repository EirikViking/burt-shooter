/**
 * VisualWrite.js
 * Wrapper for visual property writes to trace their origin.
 */

import { propertyTracer } from './PropertyWriteTracer.js';

class VisualWrite {
    /**
     * Safe wrapper to set a visual property and verify trace.
     * @param {PIXI.DisplayObject} target 
     * @param {string} targetName 
     * @param {string} prop (alpha, visible, renderable, tint)
     * @param {any} value 
     * @param {string} reason 
     */
    set(target, targetName, prop, value, reason) {
        if (!target) return;

        // Fast path: if value is identical, do nothing (unless forced?)
        // Pixi properties usually do this check themselves, but we want to avoid log spam.
        if (target[prop] === value) return;

        // Capture old value for trace
        const oldValue = target[prop];

        // Apply
        target[prop] = value;

        // Trace if enabled
        if (propertyTracer && propertyTracer.enabled) {
            propertyTracer.recordManualWrite(targetName, prop, oldValue, value, reason);
        }
    }
}

export const visualWrite = new VisualWrite();
