/**
 * Mobile Detection and Utilities
 * Provides robust mobile detection and viewport helpers
 */

/**
 * Detect if the device is mobile
 * Uses pointer type (coarse = touch) and viewport width as fallback
 * @returns {boolean}
 */
export function isMobile() {
    // Primary: Check for coarse pointer (touch device)
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

    // Fallback: Check viewport width (< 768px is typically mobile)
    const isSmallViewport = window.innerWidth < 768;

    // Mobile if either condition is true
    return hasCoarsePointer || isSmallViewport;
}

/**
 * Get current viewport dimensions
 * @returns {{width: number, height: number}}
 */
export function getViewport() {
    return {
        width: window.innerWidth,
        height: window.innerHeight
    };
}

/**
 * Get safe area insets for notched devices
 * Returns 0 if not available
 * @returns {{top: number, right: number, bottom: number, left: number}}
 */
export function getSafeAreaInsets() {
    const style = getComputedStyle(document.documentElement);

    return {
        top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
        right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
        bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
        left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0', 10)
    };
}

/**
 * Check if device is iOS
 * @returns {boolean}
 */
export function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/**
 * Check if app is running in standalone mode (installed PWA)
 * @returns {boolean}
 */
export function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
}
