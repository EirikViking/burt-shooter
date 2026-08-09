export const KEYBOARD_BINDINGS_KEY = 'nova.keyboardBindings.v1';
export const KEYBOARD_BINDINGS_CHANGED_EVENT = 'novaSwarm:keyboardBindingsChanged';

export const KEYBOARD_ACTIONS = Object.freeze([
  { id: 'moveLeft', label: 'MOVE LEFT', defaults: ['ArrowLeft', 'KeyA'] },
  { id: 'moveRight', label: 'MOVE RIGHT', defaults: ['ArrowRight', 'KeyD'] },
  { id: 'moveUp', label: 'MOVE UP', defaults: ['ArrowUp', 'KeyW'] },
  { id: 'moveDown', label: 'MOVE DOWN', defaults: ['ArrowDown', 'KeyS'] },
  { id: 'focus', label: 'FOCUS', defaults: ['ControlLeft', 'ControlRight'] },
  { id: 'shoot', label: 'SHOOT', defaults: ['Space'] },
  { id: 'specialFire', label: 'SPECIAL FIRE', defaults: ['KeyE'] },
  { id: 'dodge', label: 'DODGE / PHASE', defaults: ['ShiftLeft', 'ShiftRight'] },
  { id: 'pause', label: 'PAUSED', defaults: ['KeyP', 'Escape'] }
]);

const ACTION_IDS = new Set(KEYBOARD_ACTIONS.map((action) => action.id));
const QUERY_ALIASES = Object.freeze({
  ArrowLeft: 'moveLeft', KeyA: 'moveLeft', a: 'moveLeft', A: 'moveLeft',
  ArrowRight: 'moveRight', KeyD: 'moveRight', d: 'moveRight', D: 'moveRight',
  ArrowUp: 'moveUp', KeyW: 'moveUp', w: 'moveUp', W: 'moveUp',
  ArrowDown: 'moveDown', KeyS: 'moveDown', s: 'moveDown', S: 'moveDown',
  ControlLeft: 'focus', ControlRight: 'focus', control: 'focus',
  ShiftLeft: 'dodge', ShiftRight: 'dodge', Shift: 'dodge',
  Space: 'shoot', ' ': 'shoot', shoot: 'shoot',
  KeyE: 'specialFire', e: 'specialFire', E: 'specialFire', specialFire: 'specialFire',
  KeyP: 'pause', p: 'pause', P: 'pause', Escape: 'pause', pause: 'pause',
  focus: 'focus', dodge: 'dodge'
});

function getStorage(storage = null) {
  try {
    return storage || (typeof window !== 'undefined' ? window.localStorage : null);
  } catch {
    return null;
  }
}

function cloneDefaults() {
  return Object.fromEntries(KEYBOARD_ACTIONS.map((action) => [
    action.id,
    [...new Set(action.defaults.map(normalizeToken).filter(Boolean))]
  ]));
}

function normalizeToken(value) {
  const token = String(value || '').trim();
  if (!token || token.length > 40) return null;
  if (token === 'ShiftLeft' || token === 'ShiftRight' || token === 'Shift') return 'Shift';
  if (token === 'ControlLeft' || token === 'ControlRight' || token === 'Control') return 'Control';
  return token;
}

export function normalizeKeyboardBindings(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const normalized = cloneDefaults();
  for (const action of KEYBOARD_ACTIONS) {
    const value = source[action.id];
    const values = Array.isArray(value) ? value : value == null ? null : [value];
    if (!values) continue;
    const tokens = [...new Set(values.map(normalizeToken).filter(Boolean))];
    if (tokens.length > 0) normalized[action.id] = tokens.slice(0, 3);
  }
  return normalized;
}

export function getKeyboardBindings({ storage = null } = {}) {
  const storageRef = getStorage(storage);
  try {
    const raw = storageRef?.getItem?.(KEYBOARD_BINDINGS_KEY);
    return raw ? normalizeKeyboardBindings(JSON.parse(raw)) : cloneDefaults();
  } catch {
    return cloneDefaults();
  }
}

export function saveKeyboardBindings(bindings = {}, { storage = null, syncCloud = true } = {}) {
  const normalized = normalizeKeyboardBindings(bindings);
  const storageRef = getStorage(storage);
  try {
    storageRef?.setItem?.(KEYBOARD_BINDINGS_KEY, JSON.stringify(normalized));
    if (syncCloud && typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.()?.catch?.(() => {});
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(KEYBOARD_BINDINGS_CHANGED_EVENT, { detail: normalized }));
    }
  } catch {
    // Storage can be unavailable in privacy modes; keep the normalized value in memory for callers.
  }
  return normalized;
}

export function setKeyboardBinding(actionId, token, options = {}) {
  if (!ACTION_IDS.has(actionId)) return getKeyboardBindings(options);
  const current = getKeyboardBindings(options);
  const normalized = normalizeToken(token);
  if (!normalized) return current;
  return saveKeyboardBindings({ ...current, [actionId]: [normalized] }, options);
}

export function resetKeyboardBindings(options = {}) {
  return saveKeyboardBindings(cloneDefaults(), options);
}

export function getKeyboardActionForQuery(query) {
  const normalized = String(query || '');
  if (ACTION_IDS.has(normalized)) return normalized;
  return QUERY_ALIASES[normalized] || null;
}

export function getKeyboardActionForToken(token, bindings = getKeyboardBindings()) {
  const normalized = normalizeToken(token);
  if (!normalized) return null;
  for (const action of KEYBOARD_ACTIONS) {
    if ((bindings[action.id] || []).some((candidate) => {
      const normalizedCandidate = normalizeToken(candidate);
      return normalizedCandidate === normalized
        || (normalizedCandidate === 'Shift' && normalized.startsWith('Shift'))
        || (normalizedCandidate === 'Control' && normalized.startsWith('Control'));
    })) {
      return action.id;
    }
  }
  return null;
}

export function formatKeyboardToken(token) {
  const value = normalizeToken(token);
  if (!value) return 'UNBOUND';
  if (value === 'ArrowLeft') return 'LEFT';
  if (value === 'ArrowRight') return 'RIGHT';
  if (value === 'ArrowUp') return 'UP';
  if (value === 'ArrowDown') return 'DOWN';
  if (value === 'KeyA') return 'A';
  if (value === 'KeyD') return 'D';
  if (value === 'KeyW') return 'W';
  if (value === 'KeyS') return 'S';
  if (value === 'KeyP') return 'P';
  if (value === 'Space') return 'SPACE';
  if (value === 'Control') return 'CTRL';
  if (value === 'Shift') return 'SHIFT';
  if (value.startsWith('Key')) return value.slice(3).toUpperCase();
  if (value.startsWith('Digit')) return value.slice(5);
  if (value.startsWith('Numpad')) return `NUM ${value.slice(6).toUpperCase()}`;
  return value.toUpperCase();
}

export function formatKeyboardBinding(tokens = []) {
  const values = Array.isArray(tokens) ? tokens : [tokens];
  return values.map(formatKeyboardToken).filter(Boolean).join(' / ') || 'UNBOUND';
}

export function getKeyboardAction(actionId) {
  return KEYBOARD_ACTIONS.find((action) => action.id === actionId) || null;
}

export function getKeyboardActionIds() {
  return KEYBOARD_ACTIONS.map((action) => action.id);
}
