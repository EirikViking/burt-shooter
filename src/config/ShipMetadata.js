/**
 * Ship metadata for selection screen
 * Maps REAL sprite texture keys to display names and lore descriptions
 * These keys match the actual playerRankShips array in assetManifest.js
 */

import { ShipData } from './ShipData.js';
import { buildSelectableShipVariants } from './VisualVariantCatalog.js';

export const ShipMetadata = {};
export const ShipVariantData = buildSelectableShipVariants(ShipData);

ShipVariantData.forEach(ship => {
  ShipMetadata[ship.spriteKey] = {
    id: ship.id,
    baseId: ship.baseId,
    baseSpriteKey: ship.baseSpriteKey,
    variantSlug: ship.variantSlug,
    variantCode: ship.variantCode,
    name: ship.name,
    description: ship.description,
    baseDescription: ship.baseDescription || ship.description,
    lore: ship.loreShort,
    textureIndex: ship.textureIndex,
    weapon: { ...ship.weapon },
    visuals: { ...ship.visuals },
    hitbox: { ...ship.hitbox },
    trait: ship.trait ? { ...ship.trait } : null,
    stats: {
      speed: ship.stats.speed,
      fireRate: ship.stats.fireRate,
      damage: ship.stats.damage,
      bulletSpeed: ship.stats.bulletSpeed
    },
    loreLong: ship.loreLong
  };
});

// Preserve old save keys as aliases to the first visual variant of each base ship.
ShipData.forEach(ship => {
  const alias = ShipVariantData.find(candidate => candidate.baseSpriteKey === ship.spriteKey);
  if (alias) {
    ShipMetadata[ship.spriteKey] = {
      ...ShipMetadata[alias.spriteKey],
      spriteKey: ship.spriteKey,
      aliasFor: alias.spriteKey
    };
  }
});

/**
 * Get list of selectable ships with metadata
 */
export function getSelectableShips() {
  return ShipVariantData.map(ship => ({
    spriteKey: ship.spriteKey,
    ...ShipMetadata[ship.spriteKey]
  }));
}

export function resolveShipKey(spriteKey) {
  const metadata = ShipMetadata[spriteKey];
  return metadata?.aliasFor || spriteKey;
}

export function getShipMetadata(spriteKey) {
  const resolved = resolveShipKey(spriteKey);
  const metadata = ShipMetadata[resolved] || null;
  return metadata ? { spriteKey: resolved, ...metadata } : null;
}

export function getBaseShipMetadata(spriteKey) {
  return ShipData.find(ship => ship.spriteKey === spriteKey || ship.id === spriteKey) || null;
}

/**
 * Get all metadata entries including legacy aliases
 */
export function getAllShipMetadata() {
  return Object.keys(ShipMetadata).map(spriteKey => ({
    spriteKey,
    ...ShipMetadata[spriteKey]
  }));
}

/**
 * Get default ship sprite key
 */
export function getDefaultShipKey() {
  return 'row2_ship_1.png::ion';
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
