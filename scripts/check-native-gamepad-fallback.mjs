import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outputDir = path.resolve(`test-results/native-gamepad-fallback-${timestamp()}`);
let nativePads = [];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    __novaNativeGamepads: {
      getGamepads: () => nativePads
    },
    addEventListener() {},
    removeEventListener() {}
  }
});

Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    getGamepads: () => []
  }
});

Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    hidden: false,
    addEventListener() {},
    removeEventListener() {}
  }
});

const { GamepadNavigator } = await import('../src/input/GamepadNavigator.js');
const { InputManager } = await import('../src/input/InputManager.js');

function makeNativePad() {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  buttons[0] = { pressed: true, value: 1 };
  buttons[9] = { pressed: true, value: 1 };
  return {
    id: 'XInput Controller 1',
    index: 0,
    connected: true,
    source: 'xinput',
    mapping: 'standard',
    axes: [0.9, -0.75, 0, 0],
    buttons
  };
}

nativePads = [makeNativePad()];

const navigatorReader = new GamepadNavigator();
const nav = navigatorReader.update();

const inputManager = new InputManager();
const gamepadState = inputManager.getGamepadState();
const isRight = inputManager.isKeyPressed('ArrowRight');
const isUp = inputManager.isKeyPressed('ArrowUp');
const isFiring = inputManager.isFiring();
const pause = inputManager.consumeKeyPress('KeyP', 'Escape');
inputManager.destroy();

const errors = [
  ...(nav.connected ? [] : ['GamepadNavigator did not report native gamepad connected']),
  ...(nav.active ? [] : ['GamepadNavigator did not report native gamepad activity']),
  ...(nav.pressed.confirm ? [] : ['GamepadNavigator did not map native A to confirm']),
  ...(nav.pressed.menu ? [] : ['GamepadNavigator did not map native Start to menu']),
  ...(gamepadState.connected ? [] : ['InputManager did not report native gamepad connected']),
  ...(gamepadState.id === 'XInput Controller 1' ? [] : ['InputManager did not preserve native gamepad id']),
  ...(gamepadState.moveX > 0.6 ? [] : ['InputManager did not map native left stick X']),
  ...(gamepadState.moveY < -0.6 ? [] : ['InputManager did not map native left stick Y']),
  ...(isRight && isUp ? [] : ['InputManager did not expose native stick through movement keys']),
  ...(isFiring ? [] : ['InputManager did not map native A to firing']),
  ...(pause ? [] : ['InputManager did not map native Start to pause'])
];

const report = {
  status: errors.length ? 'failed' : 'passed',
  nav,
  gamepadState,
  checks: {
    movementKeys: isRight && isUp,
    firing: isFiring,
    pause
  },
  errors
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(`[native-gamepad-fallback] PASS report=${path.join(outputDir, 'report.json')}`);
