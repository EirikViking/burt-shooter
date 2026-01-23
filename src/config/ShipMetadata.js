/**
 * Ship metadata for selection screen
 * Maps REAL sprite texture keys to display names and lore descriptions
 * These keys match the actual playerRankShips array in assetManifest.js
 */

import { ShipData } from './ShipData.js';

export const ShipMetadata = {};

ShipData.forEach(ship => {
  ShipMetadata[ship.spriteKey] = {
    spriteKey: ship.spriteKey,
    id: ship.id,
    get name() { return ship.name; },
    get description() { return ship.description; },
    get lore() { return ship.loreShort; },
    textureIndex: ship.textureIndex,
    stats: {
      speed: ship.stats.speed,
      fireRate: ship.stats.fireRate,
      damage: ship.stats.damage
    },
    get loreLong() { return ship.loreLong; }
  };
});

/**
 * Get list of selectable ships with metadata
 */
export function getSelectableShips() {
  return Object.values(ShipMetadata);
}

/**
 * Get ship metadata by sprite key
 */
export function getShipMetadata(spriteKey) {
  return ShipMetadata[spriteKey] || null;
}

/**
 * Get default ship sprite key
 */
export function getDefaultShipKey() {
  return 'row2_ship_1.png';
}

/**
 * Validate ship sprite key exists
 */
export function isValidShipKey(spriteKey) {
  return !!ShipMetadata[spriteKey];
}

/**
 * Get ship usage count from localStorage
 */
export function getShipUsage(spriteKey) {
  try {
    const data = localStorage.getItem('burt.shipUsage.v1');
    const usage = data ? JSON.parse(data) : {};
    return usage[spriteKey] || 0;
  } catch (e) {
    console.warn('[ShipMetadata] Failed to get usage:', e);
    return 0;
  }
}

/**
 * Get total usage count across all ships
 */
export function getTotalUsage() {
  try {
    const total = localStorage.getItem('burt.shipUsageTotal.v1');
    return total ? parseInt(total, 10) : 0;
  } catch (e) {
    console.warn('[ShipMetadata] Failed to get total usage:', e);
    return 0;
  }
}

/**
 * Increment ship usage count
 */
export function incrementShipUsage(spriteKey) {
  try {
    // Get current usage
    const data = localStorage.getItem('burt.shipUsage.v1');
    const usage = data ? JSON.parse(data) : {};

    // Increment ship usage
    usage[spriteKey] = (usage[spriteKey] || 0) + 1;
    localStorage.setItem('burt.shipUsage.v1', JSON.stringify(usage));

    // Increment total usage
    const total = getTotalUsage();
    localStorage.setItem('burt.shipUsageTotal.v1', String(total + 1));

    console.log('[ShipMetadata] Incremented usage for', spriteKey, 'to', usage[spriteKey]);
  } catch (e) {
    console.warn('[ShipMetadata] Failed to increment usage:', e);
  }
}
