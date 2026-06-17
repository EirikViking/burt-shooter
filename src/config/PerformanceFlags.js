import { isMaintainerDevtoolsEnabled } from './MaintainerDevtools.js';

export const NOVA_PERF_FLAG_DEFINITIONS = Object.freeze({
  disableSectorArt: {
    env: 'NOVA_PERF_DISABLE_SECTOR_ART',
    query: 'novaPerfDisableSectorArt'
  },
  disableSectorFlyins: {
    env: 'NOVA_PERF_DISABLE_SECTOR_FLYINS',
    query: 'novaPerfDisableSectorFlyins'
  },
  disableNewEnemyRoster: {
    env: 'NOVA_PERF_DISABLE_NEW_ENEMY_ROSTER',
    query: 'novaPerfDisableNewEnemyRoster'
  },
  disableSmallEnemyShips: {
    env: 'NOVA_PERF_DISABLE_SMALL_ENEMY_SHIPS',
    query: 'novaPerfDisableSmallEnemyShips'
  },
  enableSmallEnemyShips: {
    env: 'NOVA_PERF_ENABLE_SMALL_ENEMY_SHIPS',
    query: 'novaPerfEnableSmallEnemyShips'
  },
  disableDecorativeBackgrounds: {
    env: 'NOVA_PERF_DISABLE_DECORATIVE_BACKGROUNDS',
    query: 'novaPerfDisableDecorativeBackgrounds'
  }
});

const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const DEFAULT_FLAGS = Object.freeze(
  Object.fromEntries(Object.keys(NOVA_PERF_FLAG_DEFINITIONS).map((key) => [key, false]))
);

function parseFlagValue(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return false;
}

function readParams() {
  try {
    return new URLSearchParams(globalThis.location?.search || '');
  } catch {
    return new URLSearchParams();
  }
}

function readStorageValue(key) {
  try {
    return globalThis.localStorage?.getItem?.(key);
  } catch {
    return null;
  }
}

export function getNovaPerformanceFlags() {
  if (!isMaintainerDevtoolsEnabled()) return DEFAULT_FLAGS;

  const params = readParams();
  const flags = { ...DEFAULT_FLAGS };
  for (const [key, definition] of Object.entries(NOVA_PERF_FLAG_DEFINITIONS)) {
    const queryValue = params.get(definition.query) ?? params.get(definition.env);
    const storedValue = readStorageValue(definition.env);
    flags[key] = parseFlagValue(queryValue ?? storedValue);
  }
  return Object.freeze(flags);
}

export function getNovaPerformanceFlagQuery(flagKeys = []) {
  const query = {};
  for (const key of flagKeys) {
    const definition = NOVA_PERF_FLAG_DEFINITIONS[key];
    if (definition) query[definition.query] = '1';
  }
  return query;
}
