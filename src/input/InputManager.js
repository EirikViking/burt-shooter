import { markControllerInputActive } from './GamepadNavigator.js';
import {
  CONTROL_SETTINGS_CHANGED_EVENT,
  getControlSettings,
  normalizeControlSettings
} from '../config/ControlSettings.js';
import {
  getKeyboardActionForQuery,
  getKeyboardActionForToken,
  getKeyboardBindings,
  KEYBOARD_BINDINGS_CHANGED_EVENT
} from './KeyboardBindings.js';

export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this.justPressedActions = {};
    this.touches = [];
    this.touchFireActive = false;
    this.mouseFireActive = false;
    this.specialFirePointerJustPressed = false;
    this.fireToggleLatched = false;
    this.controlSettings = getControlSettings();
    this.gameplaySurface = null;
    this.mouseSteeringTarget = null;
    this.lastMovementDevice = null;
    this.destroyed = false;
    this.gamepadDeadzone = 0.24;
    this.gamepadState = this.createEmptyGamepadState();
    this.previousGamepadButtons = {};
    this.suppressedKeys = new Set();
    this.suppressedGamepadActions = new Map();
    this.keyboardBindings = getKeyboardBindings();
    this.continuityDiagnostics = {
      enabled: this.isContinuityDiagnosticsEnabled(),
      events: [],
      longFrames: [],
      maxEntries: 180
    };
    this.setupKeyboard();
    this.setupKeyboardBindingsListener();
    this.setupControlSettingsListener();
    this.setupMouse();
    this.setupFocusHandlers();
    this.setupGamepadHandlers();
  }

  setupMouse() {
    this.handleMouseDown = (e) => {
      const onGameplayCanvas = e.button === 0 && this.isGameplayPointerEvent(e);
      if (onGameplayCanvas && this.canAcceptGameplayPointerInput()) {
        if (this.controlSettings.fireInput === 'toggle') {
          this.fireToggleLatched = !this.fireToggleLatched;
        } else {
          this.mouseFireActive = true;
        }
      }
      const specialOnGameplayCanvas = e.button === 2 && this.isGameplayPointerEvent(e);
      if (specialOnGameplayCanvas && this.canAcceptGameplayPointerInput()) {
        this.specialFirePointerJustPressed = true;
        e.preventDefault?.();
      }
      this.recordContinuityEvent('pointer_down', { button: e.button });
    };
    this.handleMouseUp = (e) => {
      if (e.button === 0) this.mouseFireActive = false;
      this.recordContinuityEvent('pointer_up', { button: e.button });
    };
    this.handlePointerMove = (e) => {
      if (!this.controlSettings.mouseSteering || !this.isGameplayPointerEvent(e) || !this.canAcceptGameplayPointerInput()) return;
      const target = this.gameplaySurface?.mapPointer?.(e.clientX, e.clientY);
      if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return;
      this.mouseSteeringTarget = { x: target.x, y: target.y, at: Date.now() };
      this.lastMovementDevice = 'mouse';
    };
    this.handlePointerLeave = (e) => {
      if (e?.target === this.gameplaySurface?.canvas) this.clearMouseSteeringTarget('canvas_leave');
    };
    this.handlePointerCancel = () => {
      this.touchFireActive = false;
      this.mouseFireActive = false;
      this.specialFirePointerJustPressed = false;
      this.clearMouseSteeringTarget('pointer_cancel');
      this.touches = [];
      this.recordContinuityEvent('pointer_cancel');
    };
    this.handleContextMenu = (e) => {
      if (this.isGameplayPointerEvent(e)) e.preventDefault?.();
    };
    document.addEventListener('pointerdown', this.handleMouseDown);
    document.addEventListener('pointerup', this.handleMouseUp);
    document.addEventListener('pointermove', this.handlePointerMove);
    document.addEventListener('pointerleave', this.handlePointerLeave, true);
    document.addEventListener('pointercancel', this.handlePointerCancel);
    document.addEventListener('contextmenu', this.handleContextMenu);
  }

  setupKeyboard() {
    this.handleKeyDown = (e) => {
      this.recordContinuityEvent('key_down', { code: e.code, key: e.key, repeat: Boolean(e.repeat) });
      if (this.suppressedKeys.has(e.code) || this.suppressedKeys.has(e.key)) return;
      if (!this.keys[e.code]) this.justPressed[e.code] = true;
      if (!this.keys[e.key]) this.justPressed[e.key] = true;
      const actions = new Set([
        getKeyboardActionForToken(e.code, this.keyboardBindings),
        getKeyboardActionForToken(e.key, this.keyboardBindings)
      ].filter(Boolean));
      for (const action of actions) {
        const wasPressed = this.isActionPressed(action, { includeGamepad: false });
        if (!wasPressed) {
          this.justPressedActions[action] = true;
          if (action === 'shoot' && !e.repeat && this.controlSettings.fireInput === 'toggle' && this.canAcceptGameplayPointerInput()) {
            this.fireToggleLatched = !this.fireToggleLatched;
          }
        }
      }
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

  setupKeyboardBindingsListener() {
    this.handleKeyboardBindingsChanged = (event) => {
      this.keyboardBindings = getKeyboardBindings();
      this.recordContinuityEvent('keyboard_bindings_changed', {
        actions: Object.keys(event?.detail || this.keyboardBindings)
      });
    };
    window.addEventListener(KEYBOARD_BINDINGS_CHANGED_EVENT, this.handleKeyboardBindingsChanged);
  }

  setupControlSettingsListener() {
    this.handleControlSettingsChanged = (event) => {
      const previousMode = this.controlSettings.fireInput;
      this.controlSettings = normalizeControlSettings(event?.detail || getControlSettings());
      if (previousMode !== this.controlSettings.fireInput || this.controlSettings.fireInput !== 'toggle') {
        this.fireToggleLatched = false;
      }
      if (!this.controlSettings.mouseSteering) this.clearMouseSteeringTarget('setting_disabled');
      this.recordContinuityEvent('control_settings_changed', this.controlSettings);
    };
    window.addEventListener(CONTROL_SETTINGS_CHANGED_EVENT, this.handleControlSettingsChanged);
  }

  setGameplaySurface(surface = null) {
    this.gameplaySurface = surface;
    if (!surface) this.clearMouseSteeringTarget('surface_removed');
  }

  isGameplayPointerEvent(event) {
    return Boolean(this.gameplaySurface?.canvas && event?.target === this.gameplaySurface.canvas);
  }

  canAcceptGameplayPointerInput() {
    return Boolean(this.gameplaySurface?.canvas && this.gameplaySurface?.canAccept?.());
  }

  clearMouseSteeringTarget(reason = 'cleared') {
    const hadTarget = Boolean(this.mouseSteeringTarget);
    this.mouseSteeringTarget = null;
    if (this.lastMovementDevice === 'mouse') this.lastMovementDevice = null;
    if (hadTarget) this.recordContinuityEvent('mouse_steering_cleared', { reason });
  }

  noteNonMouseMovement(device = 'keyboard') {
    this.lastMovementDevice = device;
    this.clearMouseSteeringTarget(`${device}_movement`);
  }

  getMouseSteeringIntent(x, y, deadzone = 8) {
    if (!this.controlSettings.mouseSteering || !this.mouseSteeringTarget || !this.canAcceptGameplayPointerInput()) {
      return { moveX: 0, moveY: 0, active: false, distance: 0 };
    }
    const dx = this.mouseSteeringTarget.x - x;
    const dy = this.mouseSteeringTarget.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance <= Math.max(1, Number(deadzone) || 8)) {
      return { moveX: 0, moveY: 0, active: true, distance };
    }
    return { moveX: dx / distance, moveY: dy / distance, active: true, distance };
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
      specialFire: false,
      specialFireJustPressed: false,
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
        specialFire: false,
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
      specialFire: this.isButtonPressed(buttons, 2),
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
    const specialFire = this.applySuppressedButton('specialFire', raw.specialFire);
    const pauseWasPressed = Boolean(this.previousGamepadButtons.pause);
    const pauseJustPressed = Boolean(pause && (this.gamepadState.pauseJustPressed || !pauseWasPressed));
    const specialFireWasPressed = Boolean(this.previousGamepadButtons.specialFire);
    const specialFireJustPressed = Boolean(specialFire
      && (this.gamepadState.specialFireJustPressed || !specialFireWasPressed));
    const controllerActive = Math.abs(raw.moveX) > 0 ||
      Math.abs(raw.moveY) > 0 ||
      raw.firing ||
      raw.dodge ||
      raw.focus ||
      raw.pause ||
      raw.specialFire;
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
      specialFire,
      specialFireJustPressed,
      buttons: {
        dpadLeft: moveX < -0.35 && raw.dpadLeft,
        dpadRight: moveX > 0.35 && raw.dpadRight,
        dpadUp: moveY < -0.35 && raw.dpadUp,
        dpadDown: moveY > 0.35 && raw.dpadDown,
        firing,
        dodge,
        focus,
        pause,
        specialFire
      },
      updatedAt: now
    };
    this.previousGamepadButtons = { pause, specialFire };
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
    const fireKeys = new Set(['shoot']);
    const movementKeys = new Set(['moveLeft', 'moveRight', 'moveUp', 'moveDown']);
    const nextKeys = {};
    for (const [key, pressed] of Object.entries(this.keys)) {
      if (!pressed) continue;
      const action = getKeyboardActionForToken(key, this.keyboardBindings);
      if (preserveFire && (fireKeys.has(action) || fireKeys.has(key))) {
        nextKeys[key] = true;
      } else if (preserveMovement && (movementKeys.has(action) || movementKeys.has(key))) {
        nextKeys[key] = true;
      } else if (suppressUntilReleased) {
        this.suppressedKeys.add(key);
      }
    }
    this.keys = nextKeys;
    this.justPressed = {};
    this.justPressedActions = {};
    this.specialFirePointerJustPressed = false;
    this.touches = [];
    if (!preserveFire) this.touchFireActive = false;
    if (!preserveFire) {
      this.mouseFireActive = false;
      this.fireToggleLatched = false;
    }
    if (!preserveMovement) this.clearMouseSteeringTarget('transient_reset');

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
      if (raw.specialFire) this.suppressedGamepadActions.set('specialFire', true);
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
        pause: false,
        specialFire: false
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
      mouseFireActive: Boolean(this.mouseFireActive),
      fireToggleLatched: Boolean(this.fireToggleLatched),
      specialFirePointerJustPressed: Boolean(this.specialFirePointerJustPressed),
      controlSettings: { ...this.controlSettings },
      mouseSteeringTarget: this.mouseSteeringTarget ? { ...this.mouseSteeringTarget } : null,
      lastMovementDevice: this.lastMovementDevice,
      touches: this.touches.length
    };
  }

  isFiring() {
    const gamepad = this.pollGamepad();
    const keyboardFiring = this.controlSettings.fireInput === 'hold'
      && this.isActionPressed('shoot', { includeGamepad: false });
    return keyboardFiring ||
      this.touchFireActive ||
      this.mouseFireActive ||
      (this.controlSettings.fireInput === 'toggle' && this.fireToggleLatched) ||
      gamepad.firing;
  }

  isActionPressed(actionId, { includeGamepad = true } = {}) {
    const action = getKeyboardActionForQuery(actionId);
    if (!action) return false;
    const bindings = this.keyboardBindings?.[action] || [];
    const keyboardOverride = typeof window !== 'undefined' ? window.__burtKeyboardOverride : null;
    if (keyboardOverride) {
      const overridePressed = bindings.some((token) => {
        if (token === 'Shift') return keyboardOverride.Shift === true
          || keyboardOverride.ShiftLeft === true || keyboardOverride.ShiftRight === true;
        if (token === 'Control') return keyboardOverride.Control === true
          || keyboardOverride.ControlLeft === true || keyboardOverride.ControlRight === true;
        return keyboardOverride[token] === true;
      }) || (action === 'shoot' && keyboardOverride.Space === true)
        || (action === 'focus' && (keyboardOverride.ControlLeft === true || keyboardOverride.ControlRight === true))
        || (action === 'dodge' && (keyboardOverride.ShiftLeft === true || keyboardOverride.ShiftRight === true));
      if (overridePressed) return true;
    }
    const pressed = bindings.some((token) => {
      if (token === 'Shift') return Boolean(this.keys.ShiftLeft || this.keys.ShiftRight || this.keys.Shift);
      if (token === 'Control') return Boolean(this.keys.ControlLeft || this.keys.ControlRight || this.keys.Control);
      return Boolean(this.keys[token]);
    });
    if (pressed || !includeGamepad) return pressed;
    const gamepad = this.pollGamepad();
    if (action === 'moveLeft') return gamepad.moveX < -0.35;
    if (action === 'moveRight') return gamepad.moveX > 0.35;
    if (action === 'moveUp') return gamepad.moveY < -0.35;
    if (action === 'moveDown') return gamepad.moveY > 0.35;
    if (action === 'focus') return gamepad.focus;
    if (action === 'shoot') return gamepad.firing;
    if (action === 'dodge') return gamepad.dodge;
    if (action === 'specialFire') return gamepad.specialFire;
    return false;
  }

  consumeSpecialFirePress() {
    const keyboardPressed = Boolean(this.justPressedActions.specialFire);
    this.justPressedActions.specialFire = false;
    for (const key of ['KeyE', 'e', 'E']) this.justPressed[key] = false;
    const pointerPressed = Boolean(this.specialFirePointerJustPressed);
    this.specialFirePointerJustPressed = false;
    const gamepad = this.pollGamepad(true);
    const gamepadPressed = Boolean(gamepad.specialFireJustPressed);
    if (gamepadPressed) {
      this.gamepadState.specialFireJustPressed = false;
      this.previousGamepadButtons.specialFire = true;
    }
    return keyboardPressed || pointerPressed || gamepadPressed;
  }

  isKeyPressed(key) {
    const keyboardOverride = typeof window !== 'undefined' ? window.__burtKeyboardOverride : null;
    const overridePressed = keyboardOverride && (
      keyboardOverride[key] === true ||
      (key === 'focus' && (keyboardOverride.ControlLeft === true || keyboardOverride.ControlRight === true))
    );
    if (overridePressed) return true;
    const action = getKeyboardActionForQuery(key);
    if (action) return this.isActionPressed(action);
    return !!this.keys[key];
  }

  setKeyPressed(key, pressed) {
    this.keys[key] = pressed;
  }

  consumeKeyPress(...keys) {
    const gamepad = this.pollGamepad(true);
    const actions = [...new Set(keys.map(getKeyboardActionForQuery).filter(Boolean))];
    const wantsPause = actions.includes('pause');
    const matched = keys.some(key => this.justPressed[key]) || actions.some(action => this.justPressedActions[action]);
    const gamepadMatched = wantsPause && gamepad.pauseJustPressed;
    if (matched || gamepadMatched) {
      keys.forEach(key => {
        this.justPressed[key] = false;
      });
      actions.forEach((action) => {
        this.justPressedActions[action] = false;
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
    document.removeEventListener('pointermove', this.handlePointerMove);
    document.removeEventListener('pointerleave', this.handlePointerLeave, true);
    document.removeEventListener('pointercancel', this.handlePointerCancel);
    document.removeEventListener('contextmenu', this.handleContextMenu);
    this.keys = {};
    this.justPressed = {};
    this.justPressedActions = {};
    this.suppressedKeys.clear();
    this.suppressedGamepadActions.clear();
    window.removeEventListener(KEYBOARD_BINDINGS_CHANGED_EVENT, this.handleKeyboardBindingsChanged);
    window.removeEventListener(CONTROL_SETTINGS_CHANGED_EVENT, this.handleControlSettingsChanged);
    this.setGameplaySurface(null);
    this.gamepadState = this.createEmptyGamepadState();
    this.destroyed = true;
  }
}
