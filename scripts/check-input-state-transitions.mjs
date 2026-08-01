import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) listener(event);
  }
}

const classList = { add() {}, remove() {} };
globalThis.window = new FakeEventTarget();
window.__NOVA_INPUT_DIAGNOSTICS__ = true;
globalThis.document = Object.assign(new FakeEventTarget(), {
  hidden: false,
  documentElement: { classList },
  body: { classList }
});
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { getGamepads: () => [] }
});
globalThis.Audio = class {
  addEventListener() {}
  removeEventListener() {}
  pause() {}
  play() { return Promise.resolve(); }
};

const [{ InputManager }, { TouchControls }, { Player }] = await Promise.all([
  import('../src/input/InputManager.js'),
  import('../src/input/TouchControls.js'),
  import('../src/entities/Player.js')
]);

function key(type, code, keyValue = code) {
  window.emit(type, { code, key: keyValue });
}

function setPad({ axes = [0, 0], pressed = [], connected = true } = {}) {
  window.__burtGamepadOverride = {
    id: 'input-state-check-pad',
    index: 0,
    connected,
    axes,
    buttons: Array.from({ length: 17 }, (_, index) => ({
      pressed: pressed.includes(index),
      value: pressed.includes(index) ? 1 : 0
    }))
  };
}

const input = new InputManager();
assert.equal(input.getContinuityDebugState().enabled, true, 'opt-in continuity diagnostics should be enabled');

key('keydown', 'ShiftLeft', 'Shift');
key('keydown', 'ArrowLeft', 'ArrowLeft');
key('keydown', 'Space', ' ');
assert.equal(input.isKeyPressed('ShiftLeft'), true);
assert.equal(input.isKeyPressed('ArrowLeft'), true);
assert.equal(input.isFiring(), true);

input.resetTransientState({ preserveFire: true, suppressUntilReleased: true });
assert.equal(input.isKeyPressed('ShiftLeft'), false, 'held phase must be suppressed across a transition');
assert.equal(input.isKeyPressed('ArrowLeft'), false, 'held movement must be suppressed across a transition');
assert.equal(input.isFiring(), true, 'held keyboard fire must survive a gameplay transition');

key('keydown', 'ShiftLeft', 'Shift');
assert.equal(input.isKeyPressed('ShiftLeft'), false, 'key repeat must not bypass suppression');
key('keydown', 'ArrowRight', 'ArrowRight');
assert.equal(input.isKeyPressed('ArrowRight'), true, 'movement reversal must work without waiting for the old key');
key('keyup', 'ShiftLeft', 'Shift');
key('keyup', 'ArrowLeft', 'ArrowLeft');
key('keydown', 'ShiftLeft', 'Shift');
assert.equal(input.isKeyPressed('ShiftLeft'), true, 'phase must re-arm after release');
key('keyup', 'ShiftLeft', 'Shift');
key('keyup', 'ArrowRight', 'ArrowRight');
key('keyup', 'Space', ' ');
input.recordFrameContinuity(51.25, { level: 10, bossWarning: true });
const continuity = input.getContinuityDebugState();
assert.equal(continuity.longFrames.length, 1, 'diagnostics should retain a long frame');
assert.equal(continuity.longFrames[0].bossWarning, true, 'long-frame context should identify spectacle state');
assert(continuity.events.some((event) => event.type === 'key_down' && event.code === 'ArrowLeft'), 'diagnostics should retain input edges');

key('keydown', 'KeyW', 'w');
key('keydown', 'ArrowRight', 'ArrowRight');
key('keydown', 'Space', ' ');
input.resetTransientState({
  preserveFire: true,
  preserveMovement: true,
  suppressUntilReleased: true
});
assert.equal(input.isKeyPressed('KeyW'), true, 'live boss-warning vertical steering must survive a presentation transition');
assert.equal(input.isKeyPressed('ArrowRight'), true, 'live boss-warning horizontal steering must survive a presentation transition');
assert.equal(input.isFiring(), true, 'held fire must survive a presentation transition');
key('keyup', 'KeyW', 'w');
key('keyup', 'ArrowRight', 'ArrowRight');
key('keyup', 'Space', ' ');

document.emit('pointerdown', { button: 0 });
input.resetTransientState({ preserveFire: true, suppressUntilReleased: true });
assert.equal(input.isFiring(), true, 'held pointer fire must survive a gameplay transition');
document.emit('pointerup', { button: 0 });
assert.equal(input.isFiring(), false);
document.emit('pointerdown', { button: 0 });
document.emit('pointercancel', { button: 0 });
assert.equal(input.isFiring(), false, 'pointer cancellation must clear fire intent');

setPad({ axes: [-1, 0], pressed: [0, 1, 6] });
let gamepad = input.pollGamepad(true);
assert.equal(gamepad.moveX < 0, true);
assert.equal(gamepad.dodge, true);
assert.equal(gamepad.focus, true);
assert.equal(gamepad.firing, true);

input.resetTransientState({ preserveFire: true, suppressUntilReleased: true });
gamepad = input.pollGamepad(true);
assert.equal(gamepad.moveX, 0, 'held gamepad movement must be suppressed');
assert.equal(gamepad.dodge, false, 'held gamepad phase must be suppressed');
assert.equal(gamepad.focus, false, 'held gamepad focus must be suppressed');
assert.equal(gamepad.firing, true, 'held gamepad fire must survive a gameplay transition');

setPad({ axes: [1, 0], pressed: [0, 1, 6] });
gamepad = input.pollGamepad(true);
assert.equal(gamepad.moveX > 0, true, 'gamepad reversal must release directional suppression');
assert.equal(gamepad.dodge, false);
assert.equal(gamepad.focus, false);

setPad({ axes: [0, 0], pressed: [0] });
input.pollGamepad(true);
setPad({ axes: [-1, 0], pressed: [0, 1, 6] });
gamepad = input.pollGamepad(true);
assert.equal(gamepad.moveX < 0, true, 'gamepad movement must resume after release');
assert.equal(gamepad.dodge, true, 'gamepad phase must re-arm after release');
assert.equal(gamepad.focus, true, 'gamepad focus must resume after release');

input.resetTransientState({
  preserveFire: true,
  preserveMovement: true,
  suppressUntilReleased: true
});
gamepad = input.pollGamepad(true);
assert.equal(gamepad.moveX < 0, true, 'live boss-warning gamepad steering must survive a presentation transition');
assert.equal(gamepad.dodge, false, 'held gamepad phase must still be edge-suppressed');
assert.equal(gamepad.focus, false, 'held gamepad focus must still be edge-suppressed');
assert.equal(gamepad.firing, true, 'held gamepad fire must survive a presentation transition');

input.resetTransientState({ preserveFire: false, suppressUntilReleased: true });
gamepad = input.pollGamepad(true);
assert.equal(gamepad.firing, false, 'focus loss must clear held gamepad fire');
setPad();
input.pollGamepad(true);
setPad({ pressed: [0] });
gamepad = input.pollGamepad(true);
assert.equal(gamepad.firing, true, 'gamepad fire must re-arm after release');

const touch = new TouchControls();
touch.moveTouch = 42;
touch.moveX = 0.8;
touch.moveY = -0.4;
touch.firing = true;
touch.resetTransientState({ preserveMovement: true });
assert.equal(touch.moveTouch, 42, 'held touch steering must survive an authorized presentation transition');
assert.equal(touch.moveX, 0.8);
assert.equal(touch.moveY, -0.4);
touch.resetTransientState();
assert.equal(touch.moveTouch, null);
assert.equal(touch.moveX, 0);
assert.equal(touch.moveY, 0);
assert.equal(touch.firing, true, 'mobile autofire must survive movement reset');

const player = Object.create(Player.prototype);
player.dodgeInputWasPressed = false;
player.touchInput = { moveX: 0.7, moveY: -0.2 };
player.resetTransientInputState({ preserveMovement: true });
assert.deepEqual(player.touchInput, { moveX: 0.7, moveY: -0.2 }, 'player touch steering must survive presentation resets');
assert.equal(player.consumeDodgeInputEdge(true), true, 'first phase press must trigger');
assert.equal(player.consumeDodgeInputEdge(true), false, 'held phase must not repeat');
assert.equal(player.consumeDodgeInputEdge(false), false, 'phase release must only re-arm');
assert.equal(player.consumeDodgeInputEdge(true), true, 'phase must trigger after release and repress');

const playerSource = readFileSync('src/entities/Player.js', 'utf8');
const playSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
const gameSource = readFileSync('src/game/Game.js', 'utf8');
const movementIndex = playerSource.indexOf('this.x += targetMoveX * delta;');
const dodgeIndex = playerSource.indexOf('// Dodge Logic');
assert(movementIndex >= 0 && dodgeIndex > movementIndex, 'movement must remain active before phase resolution');
assert.match(
  playerSource,
  /focusDriftActive = focusDriftRequested && !this\.isDodging && !this\.isGhostActive\(\)/,
  'focus must remain independent of phase cooldown availability'
);
assert.match(playSource, /tactical_draft_enter[\s\S]*preserveFire: true, preserveMovement: true/);
assert.match(playSource, /tactical_draft_exit:\$\{reason\}[\s\S]*preserveFire: true, preserveMovement: true/);
assert.match(playSource, /pause_enter' : 'pause_exit'[\s\S]*preserveFire: true, preserveMovement: true/);
assert.match(playSource, /wasPausedBeforeOpen: Boolean\(this\.isPaused\)/);
assert.doesNotMatch(playSource, /if \(this\.isPaused\) this\.setPaused\(false\)/, 'draft confirmation must not erase prior pause intent');
assert.match(playSource, /boss_intro_enter[\s\S]*preserveFire: true,[\s\S]*preserveMovement: true/);
assert.match(playSource, /boss_intro_exit[\s\S]*preserveFire: true,[\s\S]*preserveMovement: true/);
assert.match(playSource, /focus_loss:\$\{reason\}[\s\S]*preserveFire: false/);
assert.match(gameSource, /scene_teardown[\s\S]*preserveFire: true/);
assert.match(gameSource, /prepareGameplayInputFocus\(\)[\s\S]*resetTransientState/);
assert.match(playSource, /recordFrameContinuity/);

input.destroy();
console.log('[input-state-transitions] PASS keyboard, pointer, touch, controller, phase edge, focus, movement, modal, focus-loss, and scene-transition contracts');
