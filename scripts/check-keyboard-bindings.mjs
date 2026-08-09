import assert from 'node:assert/strict';
import {
  KEYBOARD_BINDINGS_KEY,
  KEYBOARD_ACTIONS,
  formatKeyboardBinding,
  getKeyboardActionForQuery,
  getKeyboardActionForToken,
  getKeyboardBindings,
  normalizeKeyboardBindings,
  resetKeyboardBindings,
  saveKeyboardBindings,
  setKeyboardBinding
} from '../src/input/KeyboardBindings.js';

const values = new Map();
const storage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); }
};

const defaults = getKeyboardBindings({ storage });
assert.deepEqual(defaults.dodge, ['Shift']);
assert.deepEqual(defaults.specialFire, ['KeyE']);
assert.equal(getKeyboardActionForToken('ShiftLeft', defaults), 'dodge');
assert.equal(getKeyboardActionForToken('ShiftRight', defaults), 'dodge');
assert.equal(getKeyboardActionForQuery('ShiftLeft'), 'dodge');
assert.equal(formatKeyboardBinding(defaults.dodge), 'SHIFT');

const rebound = setKeyboardBinding('dodge', 'KeyQ', { storage, syncCloud: false });
assert.deepEqual(rebound.dodge, ['KeyQ']);
assert.equal(getKeyboardActionForToken('KeyQ', rebound), 'dodge');
assert.equal(getKeyboardActionForToken('ShiftLeft', rebound), null);
assert.deepEqual(getKeyboardBindings({ storage }).dodge, ['KeyQ']);

const normalized = normalizeKeyboardBindings({ dodge: ['ShiftRight', 'ShiftLeft'], moveLeft: 'KeyJ' });
assert.deepEqual(normalized.dodge, ['Shift']);
assert.deepEqual(normalized.moveLeft, ['KeyJ']);
assert.equal(values.has(KEYBOARD_BINDINGS_KEY), true);

const reset = resetKeyboardBindings({ storage, syncCloud: false });
assert.deepEqual(reset.dodge, ['Shift']);
assert.deepEqual(reset.moveLeft, ['ArrowLeft', 'KeyA']);
assert.deepEqual(KEYBOARD_ACTIONS.map(({ id }) => id), [
  'moveLeft', 'moveRight', 'moveUp', 'moveDown', 'focus', 'shoot', 'specialFire', 'dodge', 'pause'
]);

const persisted = saveKeyboardBindings({ ...reset, dodge: ['Shift'] }, { storage, syncCloud: false });
assert.deepEqual(persisted.dodge, ['Shift']);
console.log(`[keyboard-bindings] PASS key=${KEYBOARD_BINDINGS_KEY} actions=${KEYBOARD_ACTIONS.length}`);
