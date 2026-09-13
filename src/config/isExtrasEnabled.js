import * as FeatureFlags from './FeatureFlags.js';

const runtimeSwitchCache = new Map();
const RUNTIME_SWITCH_KEYS = Object.freeze([
    'bs_disable_extras',
    'bs_safe_mode',
    'bs_disable_hijacker',
    'bs_disable_weapon_fx',
    'bs_disable_enemy_skins'
]);

function isActiveGameplayRuntime() {
    try {
        return typeof window !== 'undefined' && window.__game?.currentSceneName === 'play';
    } catch {
        return false;
    }
}

function readRuntimeSwitch(key) {
    if (isActiveGameplayRuntime() && runtimeSwitchCache.has(key)) return runtimeSwitchCache.get(key);
    let enabled = false;
    try {
        enabled = typeof localStorage !== 'undefined' && localStorage.getItem(key) === '1';
    } catch {
        enabled = false;
    }
    runtimeSwitchCache.set(key, enabled);
    return enabled;
}

/**
 * Check if asset upgrade extras are enabled
 * Respects both feature flags and runtime kill switch
 * @param {string} scope - 'start', 'play', 'highscore', 'audio', or 'all'
 * @returns {boolean}
 */
export function isExtrasEnabled(scope = 'all') {
    // Runtime kill switch - overrides everything
    if (readRuntimeSwitch('bs_disable_extras')) {
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
    return readRuntimeSwitch('bs_safe_mode');
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
    if (readRuntimeSwitch('bs_disable_hijacker')) {
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
    if (isWeaponFxKillSwitchActive()) {
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
    if (readRuntimeSwitch('bs_disable_enemy_skins')) {
        return false;
    }

    // Feature flag
    return FeatureFlags.ENABLE_ENEMY_SKIN_VARIETY;
}

export function isWeaponFxKillSwitchActive() {
    return readRuntimeSwitch('bs_disable_weapon_fx');
}

export function invalidateRuntimeFeatureSwitchCache() {
    runtimeSwitchCache.clear();
}

export function warmRuntimeFeatureSwitchCache() {
    for (const key of RUNTIME_SWITCH_KEYS) readRuntimeSwitch(key);
    return Object.fromEntries(RUNTIME_SWITCH_KEYS.map((key) => [key, runtimeSwitchCache.get(key) === true]));
}
