import { getThreatCodexCatalog } from '../config/ThreatCodexCatalog.js';
import { formatSectorLabel } from '../config/SectorCatalog.js';
import { readHangarProgressState } from './HangarProgressState.js';

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
  'pilotRanks',
  'rareModifiers'
]);

const ACTIVE_PLAY_PERSIST_DELAY_MS = 8000;
const DEFAULT_PERSIST_DELAY_MS = 500;

let cachedThreatDiscoveryState = null;
let pendingPersistState = null;
let pendingPersistTimer = null;
let flushHandlersInstalled = false;

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
    lastViewedCodexDiscoverySignature: null,
    lastViewedCodexDiscoveryCount: 0,
    lastViewedCodexAt: null,
    updatedAt: nowIso()
  };
}

function makeUnreadId(category, id) {
  return `${String(category || '')}:${String(id || '')}`;
}

function getCanonicalDiscoveredIds(items = {}) {
  const discovered = [];
  for (const [category, bucket] of Object.entries(items || {})) {
    if (!bucket || typeof bucket !== 'object') continue;
    for (const id of Object.keys(bucket)) {
      if (id) discovered.push(makeUnreadId(category, id));
    }
  }
  return [...new Set(discovered)].sort();
}

function getDiscoveredUnreadIdSet(items = {}) {
  const discovered = new Set(getCanonicalDiscoveredIds(items));
  return discovered;
}

function normalizeUnreadIds(unreadIds = [], items = {}) {
  const discovered = getDiscoveredUnreadIdSet(items);
  return [...new Set((Array.isArray(unreadIds) ? unreadIds : []).map(String).filter(Boolean))]
    .filter((id) => discovered.has(id));
}

function hashDiscoveryIds(ids = []) {
  let hashA = 0x811c9dc5;
  let hashB = 0x9e3779b9;
  for (const id of ids) {
    const text = String(id || '');
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      hashA = Math.imul(hashA ^ code, 0x01000193) >>> 0;
      hashB = (Math.imul(hashB ^ code, 0x85ebca6b) + 0xc2b2ae35) >>> 0;
    }
    hashA = Math.imul(hashA ^ 31, 0x01000193) >>> 0;
    hashB = (Math.imul(hashB ^ 31, 0x85ebca6b) + 0xc2b2ae35) >>> 0;
  }
  return `${hashA.toString(36).padStart(7, '0')}${hashB.toString(36).padStart(7, '0')}`;
}

export function getCodexDiscoverySignature(items = {}) {
  const ids = getCanonicalDiscoveredIds(items);
  return {
    signature: `v1:${ids.length}:${hashDiscoveryIds(ids)}`,
    count: ids.length
  };
}

function normalizeViewedSignature(value) {
  const text = String(value || '').trim();
  return text ? text.slice(0, 120) : null;
}

function normalizeViewedCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function isActivePlayScene() {
  try {
    return typeof window !== 'undefined' && window.__game?.currentSceneName === 'play';
  } catch {
    return false;
  }
}

function hasGameRuntime() {
  try {
    return typeof window !== 'undefined' && Boolean(window.__game);
  } catch {
    return false;
  }
}

function installFlushHandlers() {
  if (flushHandlersInstalled || typeof window === 'undefined') return;
  flushHandlersInstalled = true;
  window.addEventListener?.('pagehide', () => {
    flushThreatDiscoveryState();
  });
  window.addEventListener?.('beforeunload', () => {
    flushThreatDiscoveryState();
  });
  if (typeof document !== 'undefined') {
    document.addEventListener?.('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushThreatDiscoveryState();
    });
  }
}

function persistThreatDiscoveryState(state, { sync = true } = {}) {
  if (!state) return state;
  try {
    storage()?.setItem(THREAT_DISCOVERY_KEY, JSON.stringify(state));
    if (sync && typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
  } catch (error) {
    console.warn('[ThreatDiscoveryState] Failed to write state:', error);
  }
  return state;
}

function scheduleThreatDiscoveryPersist(state, { delayMs = null } = {}) {
  pendingPersistState = state;
  installFlushHandlers();
  if (pendingPersistTimer) return state;
  const delay = Number.isFinite(delayMs)
    ? Math.max(0, delayMs)
    : (isActivePlayScene() ? ACTIVE_PLAY_PERSIST_DELAY_MS : DEFAULT_PERSIST_DELAY_MS);
  pendingPersistTimer = setTimeout(() => {
    pendingPersistTimer = null;
    flushThreatDiscoveryState();
  }, delay);
  return state;
}

export function flushThreatDiscoveryState(options = {}) {
  if (pendingPersistTimer) {
    clearTimeout(pendingPersistTimer);
    pendingPersistTimer = null;
  }
  const state = pendingPersistState || cachedThreatDiscoveryState;
  pendingPersistState = null;
  return persistThreatDiscoveryState(state, options);
}

export function invalidateThreatDiscoveryStateCache() {
  cachedThreatDiscoveryState = null;
  pendingPersistState = null;
  if (pendingPersistTimer) {
    clearTimeout(pendingPersistTimer);
    pendingPersistTimer = null;
  }
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

function getEarnedPilotRankIds(progress = {}, index = new Map()) {
  const candidates = [
    progress.highestPilotRank,
    progress.pilotRank,
    progress.bestRank
  ].map(Number).filter(Number.isFinite).map(Math.floor);
  for (const achievementId of Array.isArray(progress.rankAchievementsUnlocked) ? progress.rankAchievementsUnlocked : []) {
    const match = String(achievementId).match(/ACH_RANK_(\d+)/i);
    if (match) candidates.push(Number(match[1]) - 1);
  }
  const highestRank = Math.max(-1, ...candidates);
  if (highestRank < 0) return [];
  const ids = [];
  for (let rankIndex = 0; rankIndex <= highestRank; rankIndex += 1) {
    const id = `pilot_rank_${String(rankIndex).padStart(2, '0')}`;
    if (index.get(id)?.category === 'pilotRanks') ids.push(id);
  }
  return ids;
}

function getReachedSectorIds(progress = {}) {
  const highest = Math.max(
    1,
    Math.floor(Number(progress.bestSector) || 1),
    Math.floor(Number(progress.bestLevel) || 1)
  );
  return Array.from({ length: highest }, (_, index) => `sector_${String(index + 1).padStart(3, '0')}`);
}

function hydrateFromHangarProgress(state) {
  const progress = readHangarProgressState();
  const discoveryIds = new Set([
    ...(Array.isArray(progress.discoveredThreatIds) ? progress.discoveredThreatIds : []),
    ...(Array.isArray(progress.defeatedBossIds) ? progress.defeatedBossIds : []),
    ...(Array.isArray(progress.runThemesSurvived) ? progress.runThemesSurvived : [])
  ].map(String).filter(Boolean));

  const defeatedBossIds = new Set((Array.isArray(progress.defeatedBossIds) ? progress.defeatedBossIds : []).map(String));
  const survivedThemeIds = new Set((Array.isArray(progress.runThemesSurvived) ? progress.runThemesSurvived : []).map(String));
  const index = getCatalogIndex();
  for (const id of getEarnedPilotRankIds(progress, index)) discoveryIds.add(id);
  for (const id of getReachedSectorIds(progress)) discoveryIds.add(id);
  if (discoveryIds.size === 0) return state;
  let changed = false;
  const restoredAt = progress.updatedAt || nowIso();

  for (const id of discoveryIds) {
    const sectorMatch = String(id).match(/^sector_(\d{3,})$/);
    const sectorLevel = sectorMatch ? Math.max(1, Math.floor(Number(sectorMatch[1]) || 1)) : 0;
    const catalogEntry = index.get(id) || (sectorLevel > 0 ? {
      id,
      category: 'sectors',
      name: formatSectorLabel(sectorLevel, { sectorWord: 'SECTOR', compact: true })
    } : null);
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
      metadata: {
        restoredFrom: 'hangarProgress',
        ...(category === 'sectors' ? { sector: Number(String(id).replace(/^sector_/, '')) || null } : {})
      }
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
  state.lastViewedCodexDiscoverySignature = normalizeViewedSignature(raw?.lastViewedCodexDiscoverySignature);
  state.lastViewedCodexDiscoveryCount = normalizeViewedCount(raw?.lastViewedCodexDiscoveryCount);
  state.lastViewedCodexAt = raw?.lastViewedCodexAt ? String(raw.lastViewedCodexAt).slice(0, 80) : null;
  state.unreadIds = normalizeUnreadIds(raw?.unreadIds, state.items);
  const currentSignature = getCodexDiscoverySignature(state.items);
  if (state.lastViewedCodexDiscoverySignature === currentSignature.signature) {
    state.unreadIds = [];
    state.lastViewedCodexDiscoveryCount = currentSignature.count;
  }
  state.updatedAt = raw?.updatedAt || nowIso();
  return state;
}

export function readThreatDiscoveryState() {
  if (cachedThreatDiscoveryState) return cachedThreatDiscoveryState;
  let parsed = {};
  try {
    const raw = storage()?.getItem(THREAT_DISCOVERY_KEY);
    parsed = raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('[ThreatDiscoveryState] Failed to read state:', error);
  }
  cachedThreatDiscoveryState = hydrateFromHangarProgress(normalizeThreatDiscoveryState(parsed));
  return cachedThreatDiscoveryState;
}

export function writeThreatDiscoveryState(state) {
  const normalized = normalizeThreatDiscoveryState({
    ...state,
    updatedAt: nowIso()
  });
  cachedThreatDiscoveryState = normalized;
  if (!hasGameRuntime()) {
    persistThreatDiscoveryState(normalized);
    return normalized;
  }
  scheduleThreatDiscoveryPersist(normalized);
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
    state.unreadIds = [...new Set([...state.unreadIds, makeUnreadId(category, key)])];
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

export function recordThreatDefeatedBatch(entries = []) {
  const validEntries = Array.isArray(entries)
    ? entries.filter((entry) => entry?.threatId && DISCOVERY_CATEGORIES.includes(entry.category || 'enemies'))
    : [];
  if (validEntries.length === 0) {
    return { state: readThreatDiscoveryState(), results: [] };
  }

  const state = readThreatDiscoveryState();
  const results = [];
  let changed = false;

  for (const entry of validEntries) {
    const category = entry.category || 'enemies';
    const key = String(entry.threatId);
    const metadata = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
    const bucket = state.items[category] || {};
    const previous = bucket[key] || null;
    const previousDefeats = Math.max(0, Math.floor(Number(previous?.timesDefeated) || 0));
    const isNew = !previous;
    const item = normalizeItem(previous || {
      id: key,
      category,
      name: metadata.name || metadata.label || key,
      firstSeenAt: nowIso()
    }, { id: key, category });

    item.name = String(metadata.name || metadata.label || item.name || key);
    item.lastSeenAt = nowIso();
    item.timesDefeated += 1;
    item.metadata = {
      ...item.metadata,
      ...metadata
    };
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
      state.unreadIds = [...new Set([...state.unreadIds, makeUnreadId(category, key)])];
    }

    changed = true;
    results.push({
      item,
      isNew,
      isFirstDefeat: previousDefeats === 0
    });
  }

  if (changed) {
    state.updatedAt = nowIso();
    cachedThreatDiscoveryState = state;
    scheduleThreatDiscoveryPersist(state);
  }

  return { state, results };
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
  const currentSignature = getCodexDiscoverySignature(state.items);
  const validUnreadCount = normalizeUnreadIds(state.unreadIds, state.items).length;
  const viewedSignature = normalizeViewedSignature(state.lastViewedCodexDiscoverySignature);
  const viewedCount = normalizeViewedCount(state.lastViewedCodexDiscoveryCount);
  const unreadCount = viewedSignature === currentSignature.signature
    ? 0
    : Math.max(
      validUnreadCount,
      viewedSignature && currentSignature.count > 0 && (viewedCount !== currentSignature.count || viewedSignature !== currentSignature.signature)
        ? 1
        : 0
    );
  return {
    totalDiscovered,
    counts,
    unreadCount,
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
    const saved = new Set(Object.keys(state.items?.[category] || {}));
    const total = category === 'sectors' ? Math.max(entries.length, saved.size) : entries.length;
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
  const currentSignature = getCodexDiscoverySignature(state.items);
  state.unreadIds = [];
  state.lastViewedCodexDiscoverySignature = currentSignature.signature;
  state.lastViewedCodexDiscoveryCount = currentSignature.count;
  state.lastViewedCodexAt = nowIso();
  writeThreatDiscoveryState(state);
  return flushThreatDiscoveryState();
}

export function resetDiscoveryStateForTests() {
  const state = emptyState();
  cachedThreatDiscoveryState = state;
  pendingPersistState = null;
  if (pendingPersistTimer) {
    clearTimeout(pendingPersistTimer);
    pendingPersistTimer = null;
  }
  try {
    storage()?.setItem(THREAT_DISCOVERY_KEY, JSON.stringify(state));
  } catch {
    // Ignore unavailable storage in module checks.
  }
  return state;
}
