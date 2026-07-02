import { BUILD_ID } from '../buildInfo.js';
import { RUN_MODES, normalizeRunMode } from '../game/RunMode.js';

export const RUN_CONTRACTS_VERSION = 1;
export const RUN_CONTRACT_ACTIVE_LIMIT = 3;
export const RUN_CONTRACT_REWARDS_ENABLED = false;

export const RUN_CONTRACT_CATALOG = Object.freeze([
  Object.freeze({
    id: 'graze_break_drill',
    title: 'Graze Break Drill',
    shortTitle: 'Graze Break x3',
    description: 'Trigger 3 Graze Breaks in one Mayhem run.',
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
    description: 'Defeat 2 boss support ships in one Mayhem run.',
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
    modeLabel: 'Mayhem',
    modes: Object.freeze([RUN_MODES.RANKED]),
    objective: 'boss_slow_time_defeat',
    target: 1,
    accent: 0x63ffe8
  })
]);

export const DEFAULT_ACTIVE_RUN_CONTRACT_IDS = Object.freeze(
  RUN_CONTRACT_CATALOG.slice(0, RUN_CONTRACT_ACTIVE_LIMIT).map((contract) => contract.id)
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

function normalizeCompletion(entry = {}, id = '') {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const count = floor(entry.count);
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

export function getRunContractCatalog() {
  return RUN_CONTRACT_CATALOG.map((contract) => ({ ...contract, modes: [...contract.modes] }));
}

export function getRunContractById(id) {
  return CONTRACT_BY_ID.get(String(id || '')) || null;
}

export function normalizeRunContractsState(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const completed = {};
  for (const [id, entry] of Object.entries(source.completed || {})) {
    const normalized = normalizeCompletion(entry, id);
    if (normalized) completed[normalized.id] = normalized;
  }
  const completedIds = uniqueValidIds([
    ...Object.keys(completed),
    ...(Array.isArray(source.completedIds) ? source.completedIds : [])
  ]);
  const activeIds = uniqueValidIds(source.activeIds);
  const filledActiveIds = [
    ...activeIds,
    ...DEFAULT_ACTIVE_RUN_CONTRACT_IDS.filter((id) => !activeIds.includes(id))
  ].slice(0, RUN_CONTRACT_ACTIVE_LIMIT);
  return {
    version: RUN_CONTRACTS_VERSION,
    activeIds: filledActiveIds,
    completedIds,
    completed,
    updatedAt: clampText(source.updatedAt, 80) || nowIso()
  };
}

export function createDefaultRunContractsState() {
  return normalizeRunContractsState();
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
  return normalizeRunContractsState({
    activeIds: local.activeIds?.length ? local.activeIds : cloud.activeIds,
    completed,
    completedIds: [...Object.keys(completed)],
    updatedAt: local.updatedAt || cloud.updatedAt || nowIso()
  });
}

export function startRunContractSession({ runMode = RUN_MODES.RANKED, progress = {} } = {}) {
  const mode = normalizeRunMode(runMode);
  const state = normalizeRunContractsState(progress?.runContracts || progress || {});
  return {
    version: RUN_CONTRACTS_VERSION,
    runMode: mode,
    noLifeLost: true,
    active: state.activeIds.map((id) => {
      const contract = getRunContractById(id);
      return {
        id,
        progress: 0,
        target: contract?.target || 1,
        completed: false,
        eligible: isRunContractEligible(contract, mode),
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
    case 'near_miss_streak':
      return type === 'near_miss' ? Math.max(current, floor(event.streak)) : current;
    case 'sector_no_life_loss':
      return type === 'sector_reached' && session.noLifeLost && floor(event.sector, 1) >= floor(contract.sectorTarget || contract.target, 1)
        ? contract.target
        : current;
    case 'blink_drive_pickup':
      return type === 'powerup_collected' && event.powerupType === 'blink_drive' ? contract.target : current;
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
    completedIds: [...new Set([...(normalized.completedIds || []), contract.id])],
    updatedAt: nowIso()
  });
}

export function getRunContractMenuState(progressOrState = {}) {
  const state = normalizeRunContractsState(progressOrState?.runContracts || progressOrState || {});
  return {
    version: state.version,
    active: state.activeIds.map((id) => {
      const contract = getRunContractById(id);
      const completion = state.completed[id] || null;
      return {
        id,
        title: contract?.title || id,
        shortTitle: contract?.shortTitle || contract?.title || id,
        description: contract?.description || '',
        modeLabel: contract?.modeLabel || 'Mayhem',
        target: contract?.target || 1,
        objective: contract?.objective || 'unknown',
        accent: contract?.accent || 0x37f5ff,
        completionCount: floor(completion?.count),
        completedAt: completion?.completedAt || null
      };
    }),
    completedIds: [...state.completedIds],
    rewardsEnabled: RUN_CONTRACT_REWARDS_ENABLED
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
    completedThisRun: Array.isArray(session.completedThisRun) ? session.completedThisRun.slice() : []
  };
}
