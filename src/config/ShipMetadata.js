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
  formatShipUnlockHistoryReason as formatHangarShipUnlockHistoryReason,
  getShipUnlockHistoryEntry as getHangarShipUnlockHistoryEntry,
  getShipUnlockHistoryLine as getHangarShipUnlockHistoryLine,
  getShipUnlockRequirementLine as getHangarShipUnlockRequirementLine,
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
    tier: ship.tier || 'standard',
    powerClass: ship.powerClass || 'normal',
    unlockLevel: ship.unlockLevel ?? ship.unlock?.level ?? null,
    powerRating: Number.isFinite(ship.powerRating) ? ship.powerRating : 1,
    intendedSectorBand: ship.intendedSectorBand || null,
    difficulty: ship.difficulty || null,
    role: ship.role || null,
    fantasy: ship.fantasy || null,
    weakness: ship.weakness || null,
    recommendedBuildTags: Array.isArray(ship.recommendedBuildTags) ? [...ship.recommendedBuildTags] : [],
    art: ship.art ? { ...ship.art } : null,
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

export function getShipUnlockHistoryEntry(spriteKey, progress = readUnlockProgress()) {
  return getHangarShipUnlockHistoryEntry(getShipUnlockId(spriteKey), progress);
}

export function getShipUnlockHistoryLine(spriteKey, progress = readUnlockProgress(), options = {}) {
  return getHangarShipUnlockHistoryLine(getShipUnlockId(spriteKey), progress, options);
}

export function getShipUnlockHistoryReason(spriteKey, progress = readUnlockProgress(), options = {}) {
  const shipId = getShipUnlockId(spriteKey);
  return formatHangarShipUnlockHistoryReason(getHangarShipUnlockHistoryEntry(shipId, progress), shipId, options);
}

export function getShipUnlockRequirementLine(spriteKey, options = {}) {
  return getHangarShipUnlockRequirementLine(getShipUnlockId(spriteKey), options);
}

const SHIP_USAGE_STORAGE_KEY = 'burt.shipUsage.v1';
const SHIP_USAGE_TOTAL_STORAGE_KEY = 'burt.shipUsageTotal.v1';

function readShipUsageMap() {
  const data = localStorage.getItem(SHIP_USAGE_STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

function getStoredUsageCount(usage, key) {
  const value = Number(usage?.[key]);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function addUsageAlias(aliases, key) {
  const normalized = String(key || '').trim();
  if (normalized) aliases.add(normalized);
}

function getShipUsageAliases(spriteKey) {
  const aliases = new Set();
  const rawKey = String(spriteKey || '').trim();
  const resolvedKey = resolveShipKey(rawKey);
  const ship = getShipMetadata(rawKey);

  addUsageAlias(aliases, rawKey);
  addUsageAlias(aliases, resolvedKey);
  addUsageAlias(aliases, ship?.spriteKey);
  addUsageAlias(aliases, ship?.baseSpriteKey);
  addUsageAlias(aliases, ship?.id);
  addUsageAlias(aliases, ship?.baseId);

  for (const [key, metadata] of Object.entries(ShipMetadata)) {
    const metadataResolvedKey = metadata?.aliasFor || key;
    const sameResolvedKey = resolvedKey && metadataResolvedKey === resolvedKey;
    const sameShipId = ship?.id && metadata?.id === ship.id;
    const sameBaseId = ship?.baseId && metadata?.baseId === ship.baseId;
    if (sameResolvedKey || sameShipId || sameBaseId) {
      addUsageAlias(aliases, key);
      addUsageAlias(aliases, metadata?.spriteKey);
      addUsageAlias(aliases, metadata?.baseSpriteKey);
      addUsageAlias(aliases, metadata?.id);
      addUsageAlias(aliases, metadata?.baseId);
    }
  }

  return [...aliases];
}

export function getShipUsageKey(spriteKey) {
  const ship = getShipMetadata(spriteKey);
  return ship?.id || ship?.baseId || resolveShipKey(spriteKey) || String(spriteKey || '').trim();
}

/**
 * Get ship usage count from localStorage
 */
export function getShipUsage(spriteKey) {
  try {
    const usage = readShipUsageMap();
    const canonicalKey = getShipUsageKey(spriteKey);
    const canonicalCount = getStoredUsageCount(usage, canonicalKey);
    const legacyCount = getShipUsageAliases(spriteKey)
      .filter((key) => key !== canonicalKey)
      .reduce((total, key) => total + getStoredUsageCount(usage, key), 0);
    return Math.max(canonicalCount, legacyCount);
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
    const total = localStorage.getItem(SHIP_USAGE_TOTAL_STORAGE_KEY);
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
    const usage = readShipUsageMap();
    const canonicalKey = getShipUsageKey(spriteKey);
    usage[canonicalKey] = getShipUsage(spriteKey) + 1;
    localStorage.setItem(SHIP_USAGE_STORAGE_KEY, JSON.stringify(usage));

    // Increment total usage
    const total = getTotalUsage();
    localStorage.setItem(SHIP_USAGE_TOTAL_STORAGE_KEY, String(total + 1));

    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.()?.catch?.(() => {});

    console.log('[ShipMetadata] Incremented usage for', spriteKey, 'as', canonicalKey, 'to', usage[canonicalKey]);
  } catch (e) {
    console.warn('[ShipMetadata] Failed to increment usage:', e);
  }
}
