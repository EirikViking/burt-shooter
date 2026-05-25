import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

function makeNativePad({ axes = [0.9, -0.75, 0, 0] } = {}) {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  buttons[0] = { pressed: true, value: 1 };
  buttons[9] = { pressed: true, value: 1 };
  return {
    id: 'XInput Controller 1',
    index: 0,
    connected: true,
    source: 'xinput',
    mapping: 'standard',
    axes,
    buttons
  };
}

function readControllerScenario(label, axes) {
  nativePads = [makeNativePad({ axes })];

  const navigatorReader = new GamepadNavigator();
  const nav = navigatorReader.update();

  const inputManager = new InputManager();
  const gamepadState = inputManager.getGamepadState();
  const isRight = inputManager.isKeyPressed('ArrowRight');
  const isUp = inputManager.isKeyPressed('ArrowUp');
  const isFiring = inputManager.isFiring();
  const pause = inputManager.consumeKeyPress('KeyP', 'Escape');
  inputManager.destroy();

  return { label, nav, gamepadState, checks: { isRight, isUp, isFiring, pause } };
}

const standard = readControllerScenario('standard-axes', [0.9, -0.75, 0, 0]);
const alternate = readControllerScenario('alternate-stick-axes', [0, 0, 0.9, -0.75]);
const playSceneSource = readFileSync(path.resolve('src/scenes/PlayScene.js'), 'utf8');

const errors = [
  ...(standard.nav.connected ? [] : ['GamepadNavigator did not report native gamepad connected']),
  ...(standard.nav.active ? [] : ['GamepadNavigator did not report native gamepad activity']),
  ...(standard.nav.pressed.confirm ? [] : ['GamepadNavigator did not map native A to confirm']),
  ...(standard.nav.pressed.menu ? [] : ['GamepadNavigator did not map native Start to menu']),
  ...(standard.gamepadState.connected ? [] : ['InputManager did not report native gamepad connected']),
  ...(standard.gamepadState.id === 'XInput Controller 1' ? [] : ['InputManager did not preserve native gamepad id']),
  ...(standard.gamepadState.moveX > 0.6 ? [] : ['InputManager did not map native left stick X']),
  ...(standard.gamepadState.moveY < -0.6 ? [] : ['InputManager did not map native left stick Y']),
  ...(standard.checks.isRight && standard.checks.isUp ? [] : ['InputManager did not expose native stick through movement keys']),
  ...(standard.checks.isFiring ? [] : ['InputManager did not map native A to firing']),
  ...(standard.checks.pause ? [] : ['InputManager did not map native Start to pause']),
  ...(alternate.nav.axes?.[0] > 0.8 ? [] : ['GamepadNavigator did not fall back to alternate horizontal axis']),
  ...(alternate.nav.axes?.[1] < -0.7 ? [] : ['GamepadNavigator did not fall back to alternate vertical axis']),
  ...(alternate.gamepadState.moveX > 0.6 ? [] : ['InputManager did not fall back to alternate horizontal axis']),
  ...(alternate.gamepadState.moveY < -0.6 ? [] : ['InputManager did not fall back to alternate vertical axis']),
  ...(alternate.checks.isRight && alternate.checks.isUp ? [] : ['InputManager did not expose alternate axes through movement keys']),
  ...(!playSceneSource.includes('inputManager.setKeyPressed') ? [] : ['PlayScene must not mirror touch controls into keyboard state'])
];

const report = {
  status: errors.length ? 'failed' : 'passed',
  standard,
  alternate,
  errors
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(`[native-gamepad-fallback] PASS report=${path.join(outputDir, 'report.json')}`);
