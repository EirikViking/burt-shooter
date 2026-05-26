/**
 * Ship metadata for selection screen
 * Maps REAL sprite texture keys to display names and lore descriptions
 * These keys match the actual playerRankShips array in assetManifest.js
 */

import { ShipData } from './ShipData.js';
import { buildSelectableShipVariants } from './VisualVariantCatalog.js';
import { getTraitExplanation } from './ShipTraitDescriptions.js';
import { getShipUnlockDefinition } from './ShipUnlockConfig.js';
import {
  getShipUnlockProgressDetails as getHangarShipUnlockProgressDetails,
  readHangarProgressState,
  shipUnlockMet,
  updateHangarProgress
} from '../progression/HangarProgressState.js';

export const ShipMetadata = {};
export const ShipVariantData = buildSelectableShipVariants(ShipData);

ShipVariantData.forEach(ship => {
  ShipMetadata[ship.spriteKey] = {
    id: ship.id,
    baseId: ship.baseId,
    baseSpriteKey: ship.baseSpriteKey,
    variantSlug: ship.variantSlug,
    variantCode: ship.variantCode,
    variantIndex: ship.variantIndex,
    name: ship.name,
    description: ship.description,
    baseDescription: ship.baseDescription || ship.description,
    lore: ship.loreShort,
    textureIndex: ship.textureIndex,
    weapon: { ...ship.weapon },
    visuals: { ...ship.visuals },
    hitbox: { ...ship.hitbox },
    trait: ship.trait ? { ...ship.trait } : null,
    traitExplanation: ship.trait ? getTraitExplanation(ship.trait, ship) : null,
    unlock: ship.unlock ? { ...ship.unlock } : null,
    stats: {
      speed: ship.stats.speed,
      fireRate: ship.stats.fireRate,
      damage: ship.stats.damage,
      bulletSpeed: ship.stats.bulletSpeed
    },
    loreLong: ship.loreLong
  };
});

// Preserve old save keys as aliases to the matching generated ship.
ShipData.forEach(ship => {
  const alias = ShipVariantData.find(candidate => candidate.baseSpriteKey === ship.spriteKey);
  if (alias) {
    const legacyKeys = [ship.spriteKey, ...(ship.legacySpriteKeys || [])];
    legacyKeys.forEach(legacyKey => {
      ShipMetadata[legacyKey] = {
      ...ShipMetadata[alias.spriteKey],
      spriteKey: legacyKey,
      aliasFor: alias.spriteKey
    };
    });
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
  return 'nova-player-ship-01.png';
}

/**
 * Validate ship sprite key exists
 */
export function isValidShipKey(spriteKey) {
  return !!ShipMetadata[spriteKey];
}

function readUnlockProgress() {
  return readHangarProgressState();
}

export function getShipUnlockProgress() {
  return readUnlockProgress();
}

export function updateShipUnlockProgress({ score = 0, rank = 0, level = 1 } = {}) {
  try {
    return updateHangarProgress({
      bestScore: Math.floor(Number(score) || 0),
      bestRank: Math.floor(Number(rank) || 0),
      bestLevel: Math.floor(Number(level) || 1),
      bestSector: Math.floor(Number(level) || 1)
    });
  } catch (e) {
    console.warn('[ShipMetadata] Failed to update unlock progress:', e);
    return readUnlockProgress();
  }
}

function getShipUnlockId(spriteKey) {
  const ship = getShipMetadata(spriteKey);
  return ship?.baseId || ship?.id || spriteKey;
}

export function getShipUnlockRequirement(spriteKey) {
  const definition = getShipUnlockDefinition(getShipUnlockId(spriteKey));
  return definition || { requirements: {}, label: 'Available now' };
}

export function getShipUnlockLabel(spriteKey) {
  const details = getShipUnlockProgressDetails(spriteKey);
  if (details.complete) return 'AVAILABLE NOW';
  return `UNLOCK: ${details.label}`.toUpperCase();
}

export function isShipUnlocked(spriteKey, progress = readUnlockProgress()) {
  return shipUnlockMet(getShipUnlockId(spriteKey), progress);
}

export function getUnlockedSelectableShips() {
  const progress = readUnlockProgress();
  return getSelectableShips().filter(ship => isShipUnlocked(ship.spriteKey, progress));
}

export function getShipUnlockProgressDetails(spriteKey, progress = readUnlockProgress()) {
  return getHangarShipUnlockProgressDetails(getShipUnlockId(spriteKey), progress);
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
