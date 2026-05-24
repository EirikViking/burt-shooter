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

const UNLOCK_PROGRESS_KEY = 'burt.shipUnlockProgress.v1';

function readUnlockProgress() {
  try {
    if (typeof localStorage === 'undefined') return { bestScore: 0, bestRank: 0, bestLevel: 1 };
    const raw = localStorage.getItem(UNLOCK_PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      bestScore: Math.max(0, Number(parsed.bestScore) || 0),
      bestRank: Math.max(0, Number(parsed.bestRank) || 0),
      bestLevel: Math.max(1, Number(parsed.bestLevel) || 1)
    };
  } catch (e) {
    console.warn('[ShipMetadata] Failed to read unlock progress:', e);
    return { bestScore: 0, bestRank: 0, bestLevel: 1 };
  }
}

export function getShipUnlockProgress() {
  return readUnlockProgress();
}

export function updateShipUnlockProgress({ score = 0, rank = 0, level = 1 } = {}) {
  try {
    if (typeof localStorage === 'undefined') return readUnlockProgress();
    const current = readUnlockProgress();
    const next = {
      bestScore: Math.max(current.bestScore, Math.floor(Number(score) || 0)),
      bestRank: Math.max(current.bestRank, Math.floor(Number(rank) || 0)),
      bestLevel: Math.max(current.bestLevel, Math.floor(Number(level) || 1))
    };
    localStorage.setItem(UNLOCK_PROGRESS_KEY, JSON.stringify(next));
    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
    return next;
  } catch (e) {
    console.warn('[ShipMetadata] Failed to update unlock progress:', e);
    return readUnlockProgress();
  }
}

export function getShipUnlockRequirement(spriteKey) {
  const ship = getShipMetadata(spriteKey);
  return ship?.unlock || { score: 0, rank: 0, label: 'Available now' };
}

export function getShipUnlockLabel(spriteKey) {
  const requirement = getShipUnlockRequirement(spriteKey);
  if (!requirement.score && !requirement.rank) return 'AVAILABLE NOW';
  return `UNLOCK: ${Number(requirement.score || 0).toLocaleString('en-US')} SCORE OR RANK ${requirement.rank || 0}`;
}

export function isShipUnlocked(spriteKey, progress = readUnlockProgress()) {
  const resolved = resolveShipKey(spriteKey);
  const requirement = getShipUnlockRequirement(resolved);
  if (!requirement.score && !requirement.rank) return true;
  return progress.bestScore >= (requirement.score || 0) || progress.bestRank >= (requirement.rank || 0);
}

export function getUnlockedSelectableShips() {
  const progress = readUnlockProgress();
  return getSelectableShips().filter(ship => isShipUnlocked(ship.spriteKey, progress));
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
