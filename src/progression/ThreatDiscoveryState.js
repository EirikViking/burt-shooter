import { getThreatCodexCatalog } from '../config/ThreatCodexCatalog.js';
import { HANGAR_PROGRESS_KEY } from './HangarProgressState.js';

export const THREAT_DISCOVERY_KEY = 'nova.threatDiscovery.v1';
export const THREAT_DISCOVERY_VERSION = 1;

export const DISCOVERY_CATEGORIES = Object.freeze([
  'enemies',
  'attackPatterns',
  'waveTactics',
  'powerups',
  'sectors',
  'elites',
  'bosses',
  'runThemes',
  'cabinetLogs',
  'rareModifiers'
]);

function storage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function emptyItems() {
  return Object.fromEntries(DISCOVERY_CATEGORIES.map((category) => [category, {}]));
}

function emptyState() {
  return {
    version: THREAT_DISCOVERY_VERSION,
    items: emptyItems(),
    discoveriesThisRun: [],
    recentRunThemes: [],
    unreadIds: [],
    updatedAt: nowIso()
  };
}

function normalizeItem(item = {}, fallback = {}) {
  return {
    id: String(item.id || fallback.id || ''),
    category: String(item.category || fallback.category || ''),
    name: String(item.name || fallback.name || item.id || fallback.id || 'Unknown Signal'),
    firstSeenAt: item.firstSeenAt || fallback.firstSeenAt || nowIso(),
    lastSeenAt: item.lastSeenAt || fallback.lastSeenAt || nowIso(),
    timesSeen: Math.max(0, Math.floor(Number(item.timesSeen) || 0)),
    timesDefeated: Math.max(0, Math.floor(Number(item.timesDefeated) || 0)),
    timesSurvived: Math.max(0, Math.floor(Number(item.timesSurvived) || 0)),
    timesKilledPlayer: Math.max(0, Math.floor(Number(item.timesKilledPlayer) || 0)),
    bestClearTimeAgainst: Number.isFinite(Number(item.bestClearTimeAgainst)) ? Number(item.bestClearTimeAgainst) : null,
    highestScoreDuringEncounter: Math.max(0, Math.floor(Number(item.highestScoreDuringEncounter) || 0)),
    metadata: item.metadata && typeof item.metadata === 'object' ? { ...item.metadata } : {}
  };
}

let catalogIndex = null;

function getCatalogIndex() {
  if (catalogIndex) return catalogIndex;
  catalogIndex = new Map();
  try {
    const catalog = getThreatCodexCatalog();
    for (const category of DISCOVERY_CATEGORIES) {
      for (const entry of Array.isArray(catalog[category]) ? catalog[category] : []) {
        if (entry?.id) catalogIndex.set(String(entry.id), { ...entry, category });
      }
    }
  } catch (error) {
    console.warn('[ThreatDiscoveryState] Failed to index catalog:', error);
  }
  return catalogIndex;
}

function readStoredJson(key, fallback = {}) {
  try {
    const raw = storage()?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function hydrateFromHangarProgress(state) {
  const progress = readStoredJson(HANGAR_PROGRESS_KEY, {});
  const discoveryIds = new Set([
    ...(Array.isArray(progress.discoveredThreatIds) ? progress.discoveredThreatIds : []),
    ...(Array.isArray(progress.defeatedBossIds) ? progress.defeatedBossIds : []),
    ...(Array.isArray(progress.runThemesSurvived) ? progress.runThemesSurvived : [])
  ].map(String).filter(Boolean));
  if (discoveryIds.size === 0) return state;

  const defeatedBossIds = new Set((Array.isArray(progress.defeatedBossIds) ? progress.defeatedBossIds : []).map(String));
  const survivedThemeIds = new Set((Array.isArray(progress.runThemesSurvived) ? progress.runThemesSurvived : []).map(String));
  const index = getCatalogIndex();
  let changed = false;
  const restoredAt = progress.updatedAt || nowIso();

  for (const id of discoveryIds) {
    const catalogEntry = index.get(id);
    if (!catalogEntry || !DISCOVERY_CATEGORIES.includes(catalogEntry.category)) continue;
    const category = catalogEntry.category;
    const bucket = state.items[category] || {};
    if (bucket[id]) continue;
    bucket[id] = normalizeItem({
      id,
      category,
      name: catalogEntry.name || id,
      firstSeenAt: restoredAt,
      lastSeenAt: restoredAt,
      timesSeen: 1,
      timesDefeated: defeatedBossIds.has(id) ? 1 : 0,
      timesSurvived: survivedThemeIds.has(id) ? 1 : 0,
      metadata: { restoredFrom: 'hangarProgress' }
    }, { id, category, name: catalogEntry.name || id });
    state.items[category] = bucket;
    changed = true;
  }

  if (!changed) return state;
  state.updatedAt = nowIso();
  try {
    storage()?.setItem(THREAT_DISCOVERY_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[ThreatDiscoveryState] Failed to hydrate state:', error);
  }
  return state;
}

export function normalizeThreatDiscoveryState(raw = {}) {
  const state = emptyState();
  const sourceItems = raw?.items && typeof raw.items === 'object' ? raw.items : {};
  for (const category of DISCOVERY_CATEGORIES) {
    const entries = sourceItems[category] && typeof sourceItems[category] === 'object'
      ? sourceItems[category]
      : {};
    state.items[category] = Object.fromEntries(
      Object.entries(entries)
        .filter(([id]) => id)
        .map(([id, item]) => [id, normalizeItem(item, { id, category })])
    );
  }
  state.discoveriesThisRun = Array.isArray(raw?.discoveriesThisRun) ? raw.discoveriesThisRun.slice(-80) : [];
  state.recentRunThemes = Array.isArray(raw?.recentRunThemes) ? raw.recentRunThemes.slice(-8) : [];
  state.unreadIds = Array.isArray(raw?.unreadIds) ? [...new Set(raw.unreadIds.map(String).filter(Boolean))] : [];
  state.updatedAt = raw?.updatedAt || nowIso();
  return state;
}

export function readThreatDiscoveryState() {
  let parsed = {};
  try {
    const raw = storage()?.getItem(THREAT_DISCOVERY_KEY);
    parsed = raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('[ThreatDiscoveryState] Failed to read state:', error);
  }
  return hydrateFromHangarProgress(normalizeThreatDiscoveryState(parsed));
}

export function writeThreatDiscoveryState(state) {
  const normalized = normalizeThreatDiscoveryState({
    ...state,
    updatedAt: nowIso()
  });
  try {
    storage()?.setItem(THREAT_DISCOVERY_KEY, JSON.stringify(normalized));
    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
  } catch (error) {
    console.warn('[ThreatDiscoveryState] Failed to write state:', error);
  }
  return normalized;
}

function record(category, id, metadata = {}, mutate = null, options = {}) {
  if (!DISCOVERY_CATEGORIES.includes(category) || !id) {
    return { state: readThreatDiscoveryState(), item: null, isNew: false };
  }
  const state = readThreatDiscoveryState();
  const bucket = state.items[category] || {};
  const key = String(id);
  const previous = bucket[key] || null;
  const isNew = !previous;
  const item = normalizeItem(previous || {
    id: key,
    category,
    name: metadata.name || metadata.label || key,
    firstSeenAt: nowIso()
  }, { id: key, category });
  item.name = String(metadata.name || metadata.label || item.name || key);
  item.lastSeenAt = nowIso();
  if (options.countSeen !== false || isNew) {
    item.timesSeen += 1;
  }
  item.metadata = {
    ...item.metadata,
    ...metadata
  };
  if (typeof mutate === 'function') mutate(item);
  bucket[key] = item;
  state.items[category] = bucket;
  if (isNew) {
    const discovery = {
      id: key,
      category,
      name: item.name,
      discoveredAt: item.firstSeenAt,
      metadata: item.metadata
    };
    state.discoveriesThisRun = [...state.discoveriesThisRun, discovery].slice(-80);
    state.unreadIds = [...new Set([...state.unreadIds, `${category}:${key}`])];
  }
  return {
    state: writeThreatDiscoveryState(state),
    item,
    isNew
  };
}

export function startThreatDiscoveryRun() {
  const state = readThreatDiscoveryState();
  state.discoveriesThisRun = [];
  return writeThreatDiscoveryState(state);
}

export function recordThreatSeen(threatId, category, metadata = {}) {
  return record(category, threatId, metadata);
}

export function recordThreatDefeated(threatId, category = 'enemies', metadata = {}) {
  const previous = readThreatDiscoveryState().items?.[category]?.[String(threatId)] || null;
  const previousDefeats = Math.max(0, Math.floor(Number(previous?.timesDefeated) || 0));
  const result = record(category, threatId, metadata, (item) => {
    item.timesDefeated += 1;
  }, { countSeen: false });
  return {
    ...result,
    isFirstDefeat: previousDefeats === 0
  };
}

export function recordThreatSurvived(threatId, category = 'enemies', metadata = {}) {
  return record(category, threatId, metadata, (item) => {
    item.timesSurvived += 1;
  });
}

export function recordThreatKilledPlayer(threatId, category = 'enemies', metadata = {}) {
  return record(category, threatId, metadata, (item) => {
    item.timesKilledPlayer += 1;
  });
}

export function recordRunThemeSeen(themeId, metadata = {}) {
  const result = record('runThemes', themeId, metadata);
  const state = result.state;
  state.recentRunThemes = [...state.recentRunThemes.filter((id) => id !== themeId), themeId].slice(-8);
  return {
    ...result,
    state: writeThreatDiscoveryState(state)
  };
}

export function getThreatCodexState() {
  return readThreatDiscoveryState();
}

export function getDiscoveriesThisRun(state = readThreatDiscoveryState()) {
  return Array.isArray(state.discoveriesThisRun) ? state.discoveriesThisRun.slice() : [];
}

export function getDiscoveryStats(state = readThreatDiscoveryState()) {
  const counts = {};
  let totalDiscovered = 0;
  for (const category of DISCOVERY_CATEGORIES) {
    const count = Object.keys(state.items?.[category] || {}).length;
    counts[category] = count;
    totalDiscovered += count;
  }
  return {
    totalDiscovered,
    counts,
    unreadCount: Array.isArray(state.unreadIds) ? state.unreadIds.length : 0,
    discoveriesThisRun: getDiscoveriesThisRun(state).length
  };
}

export function getCodexCompletionCounts(catalog = {}, state = readThreatDiscoveryState()) {
  const result = {};
  const categoryIds = [...new Set([
    ...DISCOVERY_CATEGORIES,
    ...Object.keys(catalog || {})
  ])];
  for (const category of categoryIds) {
    const entries = Array.isArray(catalog[category]) ? catalog[category] : [];
    const total = entries.length;
    const saved = new Set(Object.keys(state.items?.[category] || {}));
    entries.forEach((entry) => {
      if (entry?.reference || entry?.alwaysKnown) saved.add(String(entry.id));
    });
    const discovered = Math.min(total, saved.size);
    result[category] = {
      discovered,
      total,
      percent: total > 0 ? Math.round((discovered / total) * 100) : 0
    };
  }
  return result;
}

export function clearThreatCodexUnread() {
  const state = readThreatDiscoveryState();
  state.unreadIds = [];
  return writeThreatDiscoveryState(state);
}

export function resetDiscoveryStateForTests() {
  const state = emptyState();
  try {
    storage()?.setItem(THREAT_DISCOVERY_KEY, JSON.stringify(state));
  } catch {
    // Ignore unavailable storage in module checks.
  }
  return state;
}
