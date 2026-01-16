import * as FeatureFlags from './FeatureFlags.js';

/**
 * Check if asset upgrade extras are enabled
 * Respects both feature flags and runtime kill switch
 * @param {string} scope - 'start', 'play', 'highscore', 'audio', or 'all'
 * @returns {boolean}
 */
export function isExtrasEnabled(scope = 'all') {
    // Runtime kill switch - overrides everything
    if (typeof localStorage !== 'undefined' && localStorage.getItem("bs_disable_extras") === "1") {
        return false;
    }

    // Master flag check
    if (!FeatureFlags.ENABLE_ASSET_UPGRADES) {
        return false;
    }

    // Scope-specific checks
    switch (scope) {
        case 'start':
            return FeatureFlags.ENABLE_ASSET_UPGRADES_START;
        case 'play':
            return FeatureFlags.ENABLE_ASSET_UPGRADES_PLAY;
        case 'highscore':
            return FeatureFlags.ENABLE_ASSET_UPGRADES_HIGHSCORE;
        case 'audio':
            return FeatureFlags.ENABLE_ASSET_UPGRADES_AUDIO;
        case 'all':
        default:
            return true;
    }
}

/**
 * Global safe mode check - if enabled, disables ALL optional features
 * @returns {boolean} true if safe mode is active
 */
function isSafeModeActive() {
    return typeof localStorage !== 'undefined' && localStorage.getItem("bs_safe_mode") === "1";
}

/**
 * Check if hijacker enemy feature is enabled
 * Respects feature flag, global safe mode, and specific kill switch
 * @returns {boolean}
 */
export function isHijackerEnabled() {
    // Global safe mode overrides everything
    if (isSafeModeActive()) {
        return false;
    }

    // Specific kill switch
    if (typeof localStorage !== 'undefined' && localStorage.getItem("bs_disable_hijacker") === "1") {
        return false;
    }

    // Feature flag
    return FeatureFlags.ENABLE_HIJACKER_ENEMY;
}

/**
 * Check if enemy weapon FX expansion is enabled
 * Respects feature flag, global safe mode, and specific kill switch
 * @returns {boolean}
 */
export function isEnemyWeaponFxEnabled() {
    // Global safe mode overrides everything
    if (isSafeModeActive()) {
        return false;
    }

    // Specific kill switch
    if (typeof localStorage !== 'undefined' && localStorage.getItem("bs_disable_weapon_fx") === "1") {
        return false;
    }

    // Feature flag
    return FeatureFlags.ENABLE_ENEMY_WEAPON_FX_EXPANSION;
}

/**
 * Check if enemy skin variety is enabled
 * Respects feature flag, global safe mode, and specific kill switch
 * @returns {boolean}
 */
export function isEnemySkinVarietyEnabled() {
    // Global safe mode overrides everything
    if (isSafeModeActive()) {
        return false;
    }

    // Specific kill switch
    if (typeof localStorage !== 'undefined' && localStorage.getItem("bs_disable_enemy_skins") === "1") {
        return false;
    }

    // Feature flag
    return FeatureFlags.ENABLE_ENEMY_SKIN_VARIETY;
}
