import { BUILD_ID } from '../buildInfo.js';
import { RUN_MODES, normalizeRunMode } from '../game/RunMode.js';

export const RUN_CONTRACTS_VERSION = 2;
export const RUN_CONTRACT_ACTIVE_LIMIT = 3;
export const RUN_CONTRACT_REWARDS_ENABLED = false;

export const RUN_CONTRACT_CATALOG = Object.freeze([
  Object.freeze({
    id: 'graze_break_drill',
    title: 'Graze Break Drill',
    shortTitle: 'Graze Break x3',
    description: 'Trigger 3 Graze Breaks in Mayhem.',
    shortDescription: '3 Graze Breaks in Mayhem.',
    modeLabel: 'Mayhem',
    modes: Object.freeze([RUN_MODES.RANKED]),
    objective: 'graze_breaks',
    target: 3,
    accent: 0xff66ff
  }),
  Object.freeze({
    id: 'support_hunter',
    title: 'Support Hunter',
    shortTitle: 'Support Hunter',
    description: 'Destroy 2 boss support ships.',
    shortDescription: 'Destroy 2 support ships.',
    modeLabel: 'Mayhem',
    modes: Object.freeze([RUN_MODES.RANKED]),
    objective: 'boss_support_defeats',
    target: 2,
    accent: 0x7fffd8
  }),
  Object.freeze({
    id: 'slow_mo_finisher',
    title: 'Slow-Mo Finisher',
    shortTitle: 'Slow-Mo Finisher',
    description: 'Defeat a boss while Slow Time or Chrono Anchor is active.',
    shortDescription: 'Boss defeat during Slow Time.',
    modeLabel: 'Mayhem',
    modes: Object.freeze([RUN_MODES.RANKED]),
    objective: 'boss_slow_time_defeat',
    target: 1,
    accent: 0x63ffe8
  }),
  Object.freeze({
    id: 'phase_runner',
    title: 'Phase Runner',
    shortTitle: 'Phase Runner',
    description: 'Use Phase through dangerous bullets.',
    shortDescription: 'Phase through dangerous bullets.',
    modeLabel: 'Mayhem',
    modes: Object.freeze([RUN_MODES.RANKED]),
    objective: 'phase_through_danger',
    target: 1,
    accent: 0x9cfbff
  }),
  Object.freeze({
    id: 'near_miss_streak',
    title: 'Near-Miss Streak',
    shortTitle: 'Near-Miss Streak',
    description: 'Trigger a 5x near-miss streak.',
    shortDescription: 'Reach a 5x near-miss streak.',
    modeLabel: 'Mayhem',
    modes: Object.freeze([RUN_MODES.RANKED]),
    objective: 'near_miss_streak',
    target: 5,
    accent: 0xffef7e
  }),
  Object.freeze({
    id: 'blink_control',
    title: 'Blink Control',
    shortTitle: 'Blink Control',
    description: 'Collect Blink Drive and survive long enough.',
    shortDescription: 'Collect Blink Drive and survive.',
    modeLabel: 'Mayhem',
    modes: Object.freeze([RUN_MODES.RANKED]),
    objective: 'blink_drive_survive',
    target: 1,
    surviveSeconds: 6,
    accent: 0x7df9ff
  }),
  Object.freeze({
    id: 'sector_5_survivor',
    title: 'Sector 5 Survivor',
    shortTitle: 'Sector 5 Survivor',
    description: 'Reach Sector 5 without losing a life.',
    shortDescription: 'Reach Sector 5 without life loss.',
    modeLabel: 'Mayhem',
    modes: Object.freeze([RUN_MODES.RANKED]),
    objective: 'sector_no_life_loss',
    target: 1,
    sectorTarget: 5,
    accent: 0x8dff8d
  }),
  Object.freeze({
    id: 'boss_breaker',
    title: 'Boss Breaker',
    shortTitle: 'Boss Breaker',
    description: 'Defeat any boss in Mayhem.',
    shortDescription: 'Defeat any Mayhem boss.',
    modeLabel: 'Mayhem',
    modes: Object.freeze([RUN_MODES.RANKED]),
    objective: 'boss_defeated',
    target: 1,
    accent: 0xffd15c
  }),
  Object.freeze({
    id: 'sector_10_signal',
    title: 'Sector 10 Signal',
    shortTitle: 'Sector 10 Signal',
    description: 'Reach Sector 10 in Mayhem.',
    shortDescription: 'Reach Sector 10 in Mayhem.',
    modeLabel: 'Mayhem',
    modes: Object.freeze([RUN_MODES.RANKED]),
    objective: 'sector_reached',
    target: 1,
    sectorTarget: 10,
    accent: 0xcaa6ff
  })
]);

export const RUN_CONTRACT_ORDER_IDS = Object.freeze(RUN_CONTRACT_CATALOG.map((contract) => contract.id));
export const DEFAULT_ACTIVE_RUN_CONTRACT_IDS = Object.freeze(
  RUN_CONTRACT_ORDER_IDS.slice(0, RUN_CONTRACT_ACTIVE_LIMIT)
);

const CONTRACT_BY_ID = new Map(RUN_CONTRACT_CATALOG.map((contract) => [contract.id, contract]));

function floor(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function clampText(value, maxLength = 120) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, maxLength) : '';
}

function nowIso() {
  return new Date().toISOString();
}

function uniqueValidIds(values = []) {
  const valid = new Set(CONTRACT_BY_ID.keys());
  const ids = [];
  for (const value of Array.isArray(values) ? values : []) {
    const id = clampText(value, 80);
    if (!valid.has(id) || ids.includes(id)) continue;
    ids.push(id);
  }
  return ids;
}

function orderedCompletedIds(completed = {}, extraIds = []) {
  const valid = new Set([
    ...Object.keys(completed || {}),
    ...uniqueValidIds(extraIds)
  ]);
  return RUN_CONTRACT_ORDER_IDS.filter((id) => valid.has(id));
}

function normalizeCompletion(entry = {}, id = '') {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const count = floor(entry.count, 1);
  const completedAt = clampText(entry.completedAt || entry.lastCompletedAt, 80);
  const contractId = clampText(entry.id || id, 80);
  if (!CONTRACT_BY_ID.has(contractId) || count <= 0) return null;
  return {
    id: contractId,
    count,
    completedAt: completedAt || nowIso(),
    lastRunMode: clampText(entry.lastRunMode, 40) || RUN_MODES.RANKED,
    lastSector: Math.max(1, floor(entry.lastSector, 1)),
    buildVersion: clampText(entry.buildVersion, 80) || BUILD_ID || null
  };
}

function normalizeProgressEntry(entry = {}, id = '') {
  const contractId = clampText(entry?.id || id, 80);
  const contract = getRunContractById(contractId);
  if (!contract) return null;
  const progress = Math.min(contract.target || 1, floor(entry?.progress));
  return {
    id: contractId,
    progress,
    target: contract.target || 1,
    updatedAt: clampText(entry?.updatedAt, 80) || nowIso(),
    lastRunMode: clampText(entry?.lastRunMode, 40) || RUN_MODES.RANKED,
    lastSector: Math.max(1, floor(entry?.lastSector, 1))
  };
}

function selectActiveIds(activeIds = [], completed = {}, { rotateCompleted = false } = {}) {
  const completedSet = new Set(Object.keys(completed || {}));
  const selected = [];
  for (const id of uniqueValidIds(activeIds)) {
    if (selected.length >= RUN_CONTRACT_ACTIVE_LIMIT) break;
    if (rotateCompleted && completedSet.has(id)) continue;
    selected.push(id);
  }
  for (const id of RUN_CONTRACT_ORDER_IDS) {
    if (selected.length >= RUN_CONTRACT_ACTIVE_LIMIT) break;
    if (selected.includes(id) || completedSet.has(id)) continue;
    selected.push(id);
  }
  if (selected.length || completedSet.size < RUN_CONTRACT_ORDER_IDS.length) return selected;
  return uniqueValidIds(activeIds).slice(0, RUN_CONTRACT_ACTIVE_LIMIT);
}

function progressForActiveIds(progress = {}, activeIds = [], completed = {}) {
  const active = new Set(activeIds);
  const result = {};
  for (const [id, entry] of Object.entries(progress || {})) {
    if (!active.has(id) || completed[id]) continue;
    const normalized = normalizeProgressEntry(entry, id);
    if (normalized) result[normalized.id] = normalized;
  }
  return result;
}

export function getRunContractCatalog() {
  return RUN_CONTRACT_CATALOG.map((contract) => ({ ...contract, modes: [...contract.modes] }));
}

export function getRunContractById(id) {
  return CONTRACT_BY_ID.get(String(id || '')) || null;
}

export function areAllRunContractsComplete(state = {}) {
  const normalized = normalizeRunContractsState(state);
  return RUN_CONTRACT_ORDER_IDS.every((id) => normalized.completedIds.includes(id));
}

export function normalizeRunContractsState(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const completed = {};
  for (const [id, entry] of Object.entries(source.completed || {})) {
    const normalized = normalizeCompletion(entry, id);
    if (normalized) completed[normalized.id] = normalized;
  }
  const completedIds = orderedCompletedIds(completed, source.completedIds);
  const activeIds = selectActiveIds(source.activeIds, completed, { rotateCompleted: false });
  const progress = progressForActiveIds(source.progress, activeIds, completed);
  return {
    version: RUN_CONTRACTS_VERSION,
    activeIds,
    completedIds,
    completed,
    progress,
    completionNoticeSeen: Boolean(source.completionNoticeSeen || source.completedNoticeSeen || source.allCompleteSeen),
    updatedAt: clampText(source.updatedAt, 80) || nowIso()
  };
}

export function createDefaultRunContractsState() {
  return normalizeRunContractsState();
}

export function prepareRunContractsForEligibleRun(state = {}) {
  const normalized = normalizeRunContractsState(state);
  if (areAllRunContractsComplete(normalized)) return normalized;
  return normalizeRunContractsState({
    ...normalized,
    activeIds: selectActiveIds(normalized.activeIds, normalized.completed, { rotateCompleted: true }),
    progress: {},
    updatedAt: nowIso()
  });
}

export function acknowledgeRunContractCompletionNotice(state = {}) {
  const normalized = normalizeRunContractsState(state);
  if (!areAllRunContractsComplete(normalized) || normalized.completionNoticeSeen) return normalized;
  return normalizeRunContractsState({
    ...normalized,
    completionNoticeSeen: true,
    updatedAt: nowIso()
  });
}

export function mergeRunContractsState(localState = {}, cloudState = {}) {
  const local = normalizeRunContractsState(localState);
  const cloud = normalizeRunContractsState(cloudState);
  const completed = { ...local.completed };
  for (const [id, cloudEntry] of Object.entries(cloud.completed)) {
    const localEntry = completed[id];
    if (!localEntry || floor(cloudEntry.count) > floor(localEntry.count)) {
      completed[id] = cloudEntry;
    } else if (floor(cloudEntry.count) === floor(localEntry.count)) {
      const localTime = Date.parse(localEntry.completedAt || '') || 0;
      const cloudTime = Date.parse(cloudEntry.completedAt || '') || 0;
      if (cloudTime > localTime) completed[id] = cloudEntry;
    }
  }
  const completionNoticeSeen = Boolean(local.completionNoticeSeen || cloud.completionNoticeSeen);
  return normalizeRunContractsState({
    activeIds: local.activeIds?.length ? local.activeIds : cloud.activeIds,
    completed,
    completedIds: orderedCompletedIds(completed),
    progress: { ...cloud.progress, ...local.progress },
    completionNoticeSeen,
    updatedAt: local.updatedAt || cloud.updatedAt || nowIso()
  });
}

export function startRunContractSession({ runMode = RUN_MODES.RANKED, progress = {} } = {}) {
  const mode = normalizeRunMode(runMode);
  const baseState = normalizeRunContractsState(progress?.runContracts || progress || {});
  const state = mode === RUN_MODES.RANKED ? prepareRunContractsForEligibleRun(baseState) : baseState;
  const activeIds = areAllRunContractsComplete(state) ? [] : state.activeIds;
  return {
    version: RUN_CONTRACTS_VERSION,
    runMode: mode,
    noLifeLost: true,
    active: activeIds.map((id) => {
      const contract = getRunContractById(id);
      return {
        id,
        progress: 0,
        target: contract?.target || 1,
        completed: false,
        eligible: isRunContractEligible(contract, mode) && !state.completed[id],
        completedAt: null
      };
    }),
    completedThisRun: []
  };
}

export function isRunContractEligible(contract, runMode = RUN_MODES.RANKED) {
  if (!contract) return false;
  const mode = normalizeRunMode(runMode);
  return Array.isArray(contract.modes) && contract.modes.includes(mode);
}

function progressForEvent(contract, item, event, session) {
  const type = String(event?.type || '');
  const current = floor(item.progress);
  switch (contract.objective) {
    case 'graze_breaks':
      return type === 'graze_break' ? current + 1 : current;
    case 'boss_support_defeats':
      return type === 'boss_support_defeated' ? current + 1 : current;
    case 'boss_slow_time_defeat':
      return type === 'boss_defeated' && event.slowTimeActive === true ? contract.target : current;
    case 'phase_through_danger':
      return type === 'phase_used' && event.dangerous === true ? contract.target : current;
    case 'near_miss_streak':
      return type === 'near_miss' ? Math.max(current, floor(event.streak)) : current;
    case 'blink_drive_survive':
      return type === 'blink_drive_survived' ? contract.target : current;
    case 'sector_no_life_loss':
      return type === 'sector_reached' && session.noLifeLost && floor(event.sector, 1) >= floor(contract.sectorTarget || 5, 5)
        ? contract.target
        : current;
    case 'boss_defeated':
      return type === 'boss_defeated' ? contract.target : current;
    case 'sector_reached':
      return type === 'sector_reached' && floor(event.sector, 1) >= floor(contract.sectorTarget || 10, 10)
        ? contract.target
        : current;
    default:
      return current;
  }
}

export function applyRunContractEvent(session, event = {}) {
  if (!session || typeof session !== 'object') return { session, completed: [] };
  const nextSession = {
    ...session,
    noLifeLost: event.type === 'life_lost' ? false : session.noLifeLost !== false,
    active: [],
    completedThisRun: Array.isArray(session.completedThisRun) ? [...session.completedThisRun] : []
  };
  const completed = [];
  for (const item of Array.isArray(session.active) ? session.active : []) {
    const contract = getRunContractById(item.id);
    if (!contract) continue;
    const nextItem = { ...item };
    nextItem.lastSector = Math.max(1, floor(event.sector, 1));
    if (nextItem.eligible && !nextItem.completed) {
      nextItem.progress = Math.min(contract.target, progressForEvent(contract, nextItem, event, nextSession));
      if (nextItem.progress >= contract.target) {
        nextItem.completed = true;
        nextItem.completedAt = nowIso();
        const completion = {
          id: contract.id,
          completedAt: nextItem.completedAt,
          lastRunMode: nextSession.runMode,
          lastSector: Math.max(1, floor(event.sector, 1)),
          buildVersion: BUILD_ID || null
        };
        completed.push(completion);
        nextSession.completedThisRun.push(completion);
      }
    }
    nextSession.active.push(nextItem);
  }
  return { session: nextSession, completed };
}

export function recordRunContractSessionProgress(state = {}, session = {}) {
  const normalized = normalizeRunContractsState(state);
  const progress = {};
  for (const item of Array.isArray(session.active) ? session.active : []) {
    const contract = getRunContractById(item.id);
    if (!contract || normalized.completed[item.id]) continue;
    progress[item.id] = {
      id: item.id,
      progress: Math.min(contract.target || 1, floor(item.progress)),
      target: contract.target || 1,
      updatedAt: nowIso(),
      lastRunMode: normalizeRunMode(session.runMode),
      lastSector: Math.max(1, floor(item.lastSector, 1))
    };
  }
  return normalizeRunContractsState({
    ...normalized,
    progress,
    updatedAt: nowIso()
  });
}

export function recordRunContractCompletion(state = {}, completion = {}) {
  const normalized = normalizeRunContractsState(state);
  const contract = getRunContractById(completion.id);
  if (!contract) return normalized;
  const previous = normalized.completed[contract.id];
  const count = floor(previous?.count) + 1;
  return normalizeRunContractsState({
    ...normalized,
    completed: {
      ...normalized.completed,
      [contract.id]: {
        id: contract.id,
        count,
        completedAt: completion.completedAt || nowIso(),
        lastRunMode: completion.lastRunMode || RUN_MODES.RANKED,
        lastSector: completion.lastSector || 1,
        buildVersion: completion.buildVersion || BUILD_ID || null
      }
    },
    progress: {
      ...normalized.progress,
      [contract.id]: {
        id: contract.id,
        progress: contract.target || 1,
        target: contract.target || 1,
        updatedAt: completion.completedAt || nowIso(),
        lastRunMode: completion.lastRunMode || RUN_MODES.RANKED,
        lastSector: completion.lastSector || 1
      }
    },
    completedIds: [...new Set([...(normalized.completedIds || []), contract.id])],
    updatedAt: nowIso()
  });
}

export function getRunContractMenuState(progressOrState = {}, options = {}) {
  const state = normalizeRunContractsState(progressOrState?.runContracts || progressOrState || {});
  const allComplete = areAllRunContractsComplete(state);
  const forceCompletionVisible = Boolean(options.forceCompletionVisible);
  const status = allComplete
    ? (state.completionNoticeSeen && !forceCompletionVisible ? 'hidden' : 'complete')
    : 'active';
  const activeIds = status === 'active' ? state.activeIds : [];
  return {
    version: state.version,
    title: 'PILOT ORDERS',
    subtitle: 'Starter combat goals for Mayhem.',
    status,
    hidden: status === 'hidden',
    allComplete,
    completionNoticeSeen: Boolean(state.completionNoticeSeen),
    completionTitle: 'PILOT ORDERS COMPLETE',
    completionBody: 'All starter combat goals cleared.',
    active: activeIds.map((id) => {
      const contract = getRunContractById(id);
      const completion = state.completed[id] || null;
      const savedProgress = state.progress[id] || null;
      const target = contract?.target || 1;
      const completed = Boolean(completion);
      return {
        id,
        title: contract?.title || id,
        shortTitle: contract?.shortTitle || contract?.title || id,
        description: contract?.description || '',
        shortDescription: contract?.shortDescription || contract?.description || '',
        modeLabel: contract?.modeLabel || 'Mayhem',
        target,
        progress: completed ? target : Math.min(target, floor(savedProgress?.progress)),
        objective: contract?.objective || 'unknown',
        accent: contract?.accent || 0x37f5ff,
        completed,
        completionCount: floor(completion?.count),
        completedAt: completion?.completedAt || null
      };
    }),
    completedIds: [...state.completedIds],
    rewardsEnabled: RUN_CONTRACT_REWARDS_ENABLED
  };
}

function describeCompletion(completion = {}) {
  const contract = getRunContractById(completion.id);
  return {
    id: completion.id,
    title: contract?.title || completion.id,
    shortTitle: contract?.shortTitle || contract?.title || completion.id,
    completedAt: completion.completedAt || null,
    lastRunMode: completion.lastRunMode || RUN_MODES.RANKED,
    lastSector: completion.lastSector || 1
  };
}

export function getRunContractSessionState(session = null) {
  if (!session || typeof session !== 'object') return null;
  return {
    version: session.version || RUN_CONTRACTS_VERSION,
    runMode: normalizeRunMode(session.runMode),
    noLifeLost: session.noLifeLost !== false,
    active: (session.active || []).map((item) => {
      const contract = getRunContractById(item.id);
      return {
        id: item.id,
        title: contract?.title || item.id,
        shortTitle: contract?.shortTitle || contract?.title || item.id,
        progress: floor(item.progress),
        target: floor(item.target || contract?.target || 1, 1),
        completed: Boolean(item.completed),
        eligible: Boolean(item.eligible),
        completedAt: item.completedAt || null
      };
    }),
    completedThisRun: Array.isArray(session.completedThisRun)
      ? session.completedThisRun.map(describeCompletion)
      : []
  };
}
