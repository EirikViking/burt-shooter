import { markControllerInputActive } from './GamepadNavigator.js';

export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this.touches = [];
    this.touchFireActive = false;
    this.destroyed = false;
    this.gamepadDeadzone = 0.24;
    this.gamepadState = this.createEmptyGamepadState();
    this.previousGamepadButtons = {};
    this.suppressedKeys = new Set();
    this.suppressedGamepadActions = new Map();
    this.continuityDiagnostics = {
      enabled: this.isContinuityDiagnosticsEnabled(),
      events: [],
      longFrames: [],
      maxEntries: 180
    };
    this.setupKeyboard();
    this.setupMouse();
    this.setupFocusHandlers();
    this.setupGamepadHandlers();
  }

  setupMouse() {
    this.handleMouseDown = (e) => {
      if (e.button === 0) this.touchFireActive = true;
      this.recordContinuityEvent('pointer_down', { button: e.button });
    };
    this.handleMouseUp = (e) => {
      if (e.button === 0) this.touchFireActive = false;
      this.recordContinuityEvent('pointer_up', { button: e.button });
    };
    this.handlePointerCancel = () => {
      this.touchFireActive = false;
      this.touches = [];
      this.recordContinuityEvent('pointer_cancel');
    };
    // Bind to window to catch clicks outside canvas if needed, or document
    document.addEventListener('pointerdown', this.handleMouseDown);
    document.addEventListener('pointerup', this.handleMouseUp);
    document.addEventListener('pointercancel', this.handlePointerCancel);
  }

  setupKeyboard() {
    this.handleKeyDown = (e) => {
      this.recordContinuityEvent('key_down', { code: e.code, key: e.key, repeat: Boolean(e.repeat) });
      if (this.suppressedKeys.has(e.code) || this.suppressedKeys.has(e.key)) return;
      if (!this.keys[e.code]) this.justPressed[e.code] = true;
      if (!this.keys[e.key]) this.justPressed[e.key] = true;
      this.keys[e.code] = true;
      this.keys[e.key] = true;
    };

    this.handleKeyUp = (e) => {
      this.recordContinuityEvent('key_up', { code: e.code, key: e.key });
      this.keys[e.code] = false;
      this.keys[e.key] = false;
      this.suppressedKeys.delete(e.code);
      this.suppressedKeys.delete(e.key);
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  setupFocusHandlers() {
    // Reset all keys when window loses focus to prevent stuck keys
    this.handleBlur = () => {
      this.recordContinuityEvent('window_blur');
      this.resetAllKeys();
    };
    this.handleNativeBlur = () => {
      this.recordContinuityEvent('native_window_blur');
      this.resetAllKeys();
    };

    this.handleVisibilityChange = () => {
      if (document.hidden) {
        this.recordContinuityEvent('document_hidden');
        this.resetAllKeys();
      }
    };

    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('nova-app-window-blur', this.handleNativeBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  setupGamepadHandlers() {
    this.handleGamepadConnected = () => this.pollGamepad(true);
    this.handleGamepadDisconnected = () => {
      this.recordContinuityEvent('gamepad_disconnected');
      this.gamepadState = this.createEmptyGamepadState();
      this.previousGamepadButtons = {};
      this.suppressedGamepadActions.clear();
    };

    window.addEventListener('gamepadconnected', this.handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
  }

  createEmptyGamepadState() {
    return {
      connected: false,
      id: null,
      index: null,
      moveX: 0,
      moveY: 0,
      firing: false,
      dodge: false,
      focus: false,
      pause: false,
      pauseJustPressed: false,
      buttons: {},
      updatedAt: 0
    };
  }

  normalizeAxis(value) {
    const n = Number(value) || 0;
    if (Math.abs(n) < this.gamepadDeadzone) return 0;
    const scaled = (Math.abs(n) - this.gamepadDeadzone) / (1 - this.gamepadDeadzone);
    return Math.sign(n) * Math.max(0, Math.min(1, scaled));
  }

  readDirectionalAxis(axes, primaryIndex, fallbackIndex) {
    const primary = this.normalizeAxis(axes?.[primaryIndex]);
    if (primary !== 0) return primary;
    return this.normalizeAxis(axes?.[fallbackIndex]);
  }

  isButtonPressed(buttons, index) {
    const button = buttons?.[index];
    if (button == null) return false;
    if (typeof button === 'number') return button > 0.5;
    return Boolean(button.pressed || button.value > 0.5);
  }

  getGamepadSnapshot() {
    const override = typeof window !== 'undefined' ? window.__burtGamepadOverride : null;
    if (override) {
      return {
        id: override.id || 'smoke-test-gamepad',
        index: Number.isFinite(override.index) ? override.index : 0,
        axes: Array.isArray(override.axes) ? override.axes : [override.moveX || 0, override.moveY || 0],
        buttons: Array.isArray(override.buttons) ? override.buttons : [],
        connected: override.connected !== false
      };
    }

    const nativePads = typeof window !== 'undefined' && window.__novaNativeGamepads?.getGamepads
      ? window.__novaNativeGamepads.getGamepads().filter(Boolean)
      : [];
    const nativeActivePad = nativePads.find((pad) => pad && pad.connected && (
      (pad.axes || []).some((axis) => Math.abs(Number(axis) || 0) >= this.gamepadDeadzone) ||
      (pad.buttons || []).some((button) => this.buttonLikePressed(button))
    ));
    if (nativeActivePad) return nativeActivePad;

    const pads = typeof navigator !== 'undefined' && navigator.getGamepads
      ? Array.from(navigator.getGamepads()).filter(Boolean)
      : [];
    return pads.find(pad => pad && pad.connected) || nativePads.find(pad => pad && pad.connected) || null;
  }

  buttonLikePressed(button) {
    if (button == null) return false;
    if (typeof button === 'number') return button > 0.5;
    return Boolean(button.pressed || button.value > 0.5);
  }

  isContinuityDiagnosticsEnabled() {
    if (typeof window === 'undefined') return false;
    if (window.__NOVA_INPUT_DIAGNOSTICS__ === true) return true;
    try {
      return new URLSearchParams(window.location?.search || '').get('inputDiagnostics') === '1'
        || window.localStorage?.getItem('nova_swarm_input_diagnostics') === '1';
    } catch {
      return false;
    }
  }

  recordContinuityEvent(type, detail = {}) {
    const diagnostics = this.continuityDiagnostics;
    if (!diagnostics?.enabled) return false;
    diagnostics.events.push({
      at: Math.round(typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()),
      type,
      ...detail
    });
    if (diagnostics.events.length > diagnostics.maxEntries) {
      diagnostics.events.splice(0, diagnostics.events.length - diagnostics.maxEntries);
    }
    return true;
  }

  recordFrameContinuity(frameMs, context = {}) {
    const diagnostics = this.continuityDiagnostics;
    const duration = Number(frameMs);
    if (!diagnostics?.enabled || !Number.isFinite(duration) || duration < 34) return false;
    diagnostics.longFrames.push({
      at: Math.round(typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()),
      frameMs: Number(duration.toFixed(2)),
      pressedKeys: Object.entries(this.keys).filter(([, pressed]) => Boolean(pressed)).map(([key]) => key).sort(),
      suppressedKeys: Array.from(this.suppressedKeys).sort(),
      ...context
    });
    if (diagnostics.longFrames.length > diagnostics.maxEntries) {
      diagnostics.longFrames.splice(0, diagnostics.longFrames.length - diagnostics.maxEntries);
    }
    return true;
  }

  getContinuityDebugState() {
    const diagnostics = this.continuityDiagnostics;
    return {
      enabled: Boolean(diagnostics?.enabled),
      events: diagnostics?.enabled ? diagnostics.events.slice(-30) : [],
      longFrames: diagnostics?.enabled ? diagnostics.longFrames.slice(-30) : [],
      transient: this.getTransientDebugState()
    };
  }

  readGamepadControls(pad) {
    if (!pad || pad.connected === false) {
      return {
        connected: false,
        id: null,
        index: null,
        moveX: 0,
        moveY: 0,
        firing: false,
        dodge: false,
        focus: false,
        pause: false,
        dpadLeft: false,
        dpadRight: false,
        dpadUp: false,
        dpadDown: false
      };
    }

    const buttons = pad.buttons || [];
    const axes = pad.axes || [];
    const axisX = this.readDirectionalAxis(axes, 0, 2);
    const axisY = this.readDirectionalAxis(axes, 1, 3);
    const dpadLeft = this.isButtonPressed(buttons, 14);
    const dpadRight = this.isButtonPressed(buttons, 15);
    const dpadUp = this.isButtonPressed(buttons, 12);
    const dpadDown = this.isButtonPressed(buttons, 13);
    return {
      connected: true,
      id: pad.id || 'gamepad',
      index: Number.isFinite(pad.index) ? pad.index : 0,
      moveX: dpadLeft ? -1 : dpadRight ? 1 : axisX,
      moveY: dpadUp ? -1 : dpadDown ? 1 : axisY,
      firing: this.isButtonPressed(buttons, 0) ||
        this.isButtonPressed(buttons, 5) ||
        this.isButtonPressed(buttons, 7),
      dodge: this.isButtonPressed(buttons, 1) ||
        this.isButtonPressed(buttons, 4),
      focus: this.isButtonPressed(buttons, 6),
      pause: this.isButtonPressed(buttons, 9) ||
        this.isButtonPressed(buttons, 8) ||
        this.isButtonPressed(buttons, 16),
      dpadLeft,
      dpadRight,
      dpadUp,
      dpadDown
    };
  }

  applySuppressedAxis(action, value) {
    if (!this.suppressedGamepadActions.has(action)) return value;
    const heldDirection = Number(this.suppressedGamepadActions.get(action)) || 0;
    const nextDirection = Math.sign(Number(value) || 0);
    if (nextDirection === 0) {
      this.suppressedGamepadActions.delete(action);
      return 0;
    }
    if (nextDirection !== heldDirection) {
      this.suppressedGamepadActions.delete(action);
      return value;
    }
    return 0;
  }

  applySuppressedButton(action, pressed) {
    if (!this.suppressedGamepadActions.has(action)) return Boolean(pressed);
    if (!pressed) this.suppressedGamepadActions.delete(action);
    return false;
  }

  pollGamepad(force = false) {
    const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    if (!force && now - (this.gamepadState.updatedAt || 0) < 8) return this.gamepadState;

    const pad = this.getGamepadSnapshot();
    const raw = this.readGamepadControls(pad);
    if (!raw.connected) {
      this.gamepadState = this.createEmptyGamepadState();
      this.suppressedGamepadActions.clear();
      return this.gamepadState;
    }

    const moveX = this.applySuppressedAxis('moveX', raw.moveX);
    const moveY = this.applySuppressedAxis('moveY', raw.moveY);
    const firing = this.applySuppressedButton('firing', raw.firing);
    const dodge = this.applySuppressedButton('dodge', raw.dodge);
    const focus = this.applySuppressedButton('focus', raw.focus);
    const pause = this.applySuppressedButton('pause', raw.pause);
    const pauseWasPressed = Boolean(this.previousGamepadButtons.pause);
    const pauseJustPressed = Boolean(pause && (this.gamepadState.pauseJustPressed || !pauseWasPressed));
    const controllerActive = Math.abs(raw.moveX) > 0 ||
      Math.abs(raw.moveY) > 0 ||
      raw.firing ||
      raw.dodge ||
      raw.focus ||
      raw.pause;
    if (controllerActive) markControllerInputActive();

    this.gamepadState = {
      connected: true,
      id: raw.id,
      index: raw.index,
      moveX,
      moveY,
      firing,
      dodge,
      focus,
      pause,
      pauseJustPressed,
      buttons: {
        dpadLeft: moveX < -0.35 && raw.dpadLeft,
        dpadRight: moveX > 0.35 && raw.dpadRight,
        dpadUp: moveY < -0.35 && raw.dpadUp,
        dpadDown: moveY > 0.35 && raw.dpadDown,
        firing,
        dodge,
        focus,
        pause
      },
      updatedAt: now
    };
    this.previousGamepadButtons = { pause };
    return this.gamepadState;
  }

  getGamepadState() {
    const state = this.pollGamepad();
    return { ...state, buttons: { ...state.buttons } };
  }

  getGamepadMovement() {
    const state = this.pollGamepad();
    return {
      moveX: state.moveX || 0,
      moveY: state.moveY || 0
    };
  }

  resetTransientState({
    preserveFire = false,
    preserveMovement = false,
    suppressUntilReleased = true
  } = {}) {
    this.recordContinuityEvent('reset_transient', {
      preserveFire: Boolean(preserveFire),
      preserveMovement: Boolean(preserveMovement),
      suppressUntilReleased: Boolean(suppressUntilReleased)
    });
    const fireKeys = new Set(['Space', ' ', 'shoot']);
    const movementKeys = new Set([
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'KeyA', 'KeyD', 'KeyW', 'KeyS',
      'a', 'A', 'd', 'D', 'w', 'W', 's', 'S'
    ]);
    const nextKeys = {};
    for (const [key, pressed] of Object.entries(this.keys)) {
      if (!pressed) continue;
      if (preserveFire && fireKeys.has(key)) {
        nextKeys[key] = true;
      } else if (preserveMovement && movementKeys.has(key)) {
        nextKeys[key] = true;
      } else if (suppressUntilReleased) {
        this.suppressedKeys.add(key);
      }
    }
    this.keys = nextKeys;
    this.justPressed = {};
    this.touches = [];
    if (!preserveFire) this.touchFireActive = false;

    const raw = this.readGamepadControls(this.getGamepadSnapshot());
    if (!suppressUntilReleased) {
      this.suppressedKeys.clear();
      this.suppressedGamepadActions.clear();
    } else {
      if (raw.moveX && !preserveMovement) this.suppressedGamepadActions.set('moveX', Math.sign(raw.moveX));
      if (raw.moveY && !preserveMovement) this.suppressedGamepadActions.set('moveY', Math.sign(raw.moveY));
      if (raw.dodge) this.suppressedGamepadActions.set('dodge', true);
      if (raw.focus) this.suppressedGamepadActions.set('focus', true);
      if (raw.pause) this.suppressedGamepadActions.set('pause', true);
      if (raw.firing && !preserveFire) this.suppressedGamepadActions.set('firing', true);
    }

    const preservedGamepadFire = Boolean(preserveFire && raw.firing);
    const preservedGamepadMoveX = preserveMovement ? raw.moveX : 0;
    const preservedGamepadMoveY = preserveMovement ? raw.moveY : 0;
    this.gamepadState = {
      ...this.createEmptyGamepadState(),
      connected: raw.connected,
      id: raw.id,
      index: raw.index,
      moveX: preservedGamepadMoveX,
      moveY: preservedGamepadMoveY,
      firing: preservedGamepadFire,
      buttons: {
        dpadLeft: preserveMovement && preservedGamepadMoveX < -0.35 && raw.dpadLeft,
        dpadRight: preserveMovement && preservedGamepadMoveX > 0.35 && raw.dpadRight,
        dpadUp: preserveMovement && preservedGamepadMoveY < -0.35 && raw.dpadUp,
        dpadDown: preserveMovement && preservedGamepadMoveY > 0.35 && raw.dpadDown,
        firing: preservedGamepadFire,
        dodge: false,
        focus: false,
        pause: false
      },
      updatedAt: 0
    };
    this.previousGamepadButtons = {};
    return this.getTransientDebugState();
  }

  resetAllKeys() {
    return this.resetTransientState({ preserveFire: false, suppressUntilReleased: true });
  }

  getTransientDebugState() {
    return {
      pressedKeys: Object.entries(this.keys)
        .filter(([, pressed]) => Boolean(pressed))
        .map(([key]) => key)
        .sort(),
      suppressedKeys: Array.from(this.suppressedKeys).sort(),
      suppressedGamepadActions: Object.fromEntries(this.suppressedGamepadActions),
      touchFireActive: Boolean(this.touchFireActive),
      touches: this.touches.length
    };
  }

  isFiring() {
    const gamepad = this.pollGamepad();
    return this.isKeyPressed('Space') ||
      this.isKeyPressed('shoot') ||
      this.touchFireActive ||
      gamepad.firing;
  }

  isKeyPressed(key) {
    const keyboardOverride = typeof window !== 'undefined' ? window.__burtKeyboardOverride : null;
    const overridePressed = keyboardOverride && (
      keyboardOverride[key] === true ||
      (key === 'focus' && (keyboardOverride.ControlLeft === true || keyboardOverride.ControlRight === true))
    );
    if (overridePressed) return true;
    const gamepad = this.pollGamepad();
    if (key === 'ArrowLeft' || key === 'KeyA' || key === 'a' || key === 'A') return !!this.keys[key] || gamepad.moveX < -0.35;
    if (key === 'ArrowRight' || key === 'KeyD' || key === 'd' || key === 'D') return !!this.keys[key] || gamepad.moveX > 0.35;
    if (key === 'ArrowUp' || key === 'KeyW' || key === 'w' || key === 'W') return !!this.keys[key] || gamepad.moveY < -0.35;
    if (key === 'ArrowDown' || key === 'KeyS' || key === 's' || key === 'S') return !!this.keys[key] || gamepad.moveY > 0.35;
    if (key === 'ShiftLeft' || key === 'ShiftRight') return !!this.keys[key] || gamepad.dodge;
    if (key === 'focus') return !!this.keys.focus || !!this.keys.ControlLeft || !!this.keys.ControlRight || gamepad.focus;
    if (key === 'ControlLeft' || key === 'ControlRight') return !!this.keys[key] || !!this.keys.focus || gamepad.focus;
    if (key === 'Space' || key === 'shoot') return !!this.keys[key] || gamepad.firing;
    return !!this.keys[key];
  }

  setKeyPressed(key, pressed) {
    this.keys[key] = pressed;
  }

  consumeKeyPress(...keys) {
    const gamepad = this.pollGamepad(true);
    const wantsPause = keys.some(key => ['KeyP', 'p', 'P', 'Escape'].includes(key));
    const matched = keys.some(key => this.justPressed[key]);
    const gamepadMatched = wantsPause && gamepad.pauseJustPressed;
    if (matched || gamepadMatched) {
      keys.forEach(key => {
        this.justPressed[key] = false;
      });
      if (gamepadMatched) {
        this.gamepadState.pauseJustPressed = false;
        this.previousGamepadButtons.pause = true;
      }
    }
    return matched || gamepadMatched;
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('nova-app-window-blur', this.handleNativeBlur);
    window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('pointerdown', this.handleMouseDown);
    document.removeEventListener('pointerup', this.handleMouseUp);
    document.removeEventListener('pointercancel', this.handlePointerCancel);
    this.keys = {};
    this.justPressed = {};
    this.suppressedKeys.clear();
    this.suppressedGamepadActions.clear();
    this.gamepadState = this.createEmptyGamepadState();
    this.destroyed = true;
  }
}
