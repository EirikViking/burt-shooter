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
    this.setupKeyboard();
    this.setupMouse();
    this.setupFocusHandlers();
    this.setupGamepadHandlers();
  }

  setupMouse() {
    this.handleMouseDown = (e) => {
      if (e.button === 0) this.touchFireActive = true;
    };
    this.handleMouseUp = (e) => {
      if (e.button === 0) this.touchFireActive = false;
    };
    // Bind to window to catch clicks outside canvas if needed, or document
    document.addEventListener('pointerdown', this.handleMouseDown);
    document.addEventListener('pointerup', this.handleMouseUp);
  }

  setupKeyboard() {
    this.handleKeyDown = (e) => {
      if (!this.keys[e.code]) this.justPressed[e.code] = true;
      if (!this.keys[e.key]) this.justPressed[e.key] = true;
      this.keys[e.code] = true;
      this.keys[e.key] = true;
    };

    this.handleKeyUp = (e) => {
      this.keys[e.code] = false;
      this.keys[e.key] = false;
    };

    window.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('keyup', this.handleKeyUp, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('keyup', this.handleKeyUp, true);
  }

  setupFocusHandlers() {
    // Reset all keys when window loses focus to prevent stuck keys
    this.handleBlur = () => {
      this.resetAllKeys();
    };

    this.handleVisibilityChange = () => {
      if (document.hidden) {
        this.resetAllKeys();
      }
    };

    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  setupGamepadHandlers() {
    this.handleGamepadConnected = () => this.pollGamepad(true);
    this.handleGamepadDisconnected = () => {
      this.gamepadState = this.createEmptyGamepadState();
      this.previousGamepadButtons = {};
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

  pollGamepad(force = false) {
    const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    if (!force && now - (this.gamepadState.updatedAt || 0) < 8) return this.gamepadState;

    const pad = this.getGamepadSnapshot();
    if (!pad || pad.connected === false) {
      this.gamepadState = this.createEmptyGamepadState();
      return this.gamepadState;
    }

    const buttons = pad.buttons || [];
    const axes = pad.axes || [];
    const moveX = this.readDirectionalAxis(axes, 0, 2);
    const moveY = this.readDirectionalAxis(axes, 1, 3);
    const dpadLeft = this.isButtonPressed(buttons, 14);
    const dpadRight = this.isButtonPressed(buttons, 15);
    const dpadUp = this.isButtonPressed(buttons, 12);
    const dpadDown = this.isButtonPressed(buttons, 13);
    const firing = this.isButtonPressed(buttons, 0) ||
      this.isButtonPressed(buttons, 5) ||
      this.isButtonPressed(buttons, 7);
    const dodge = this.isButtonPressed(buttons, 1) ||
      this.isButtonPressed(buttons, 4);
    const pause = this.isButtonPressed(buttons, 9) ||
      this.isButtonPressed(buttons, 8) ||
      this.isButtonPressed(buttons, 16);
    const pauseWasPressed = Boolean(this.previousGamepadButtons.pause);
    const pauseJustPressed = Boolean(pause && (this.gamepadState.pauseJustPressed || !pauseWasPressed));

    this.gamepadState = {
      connected: true,
      id: pad.id || 'gamepad',
      index: Number.isFinite(pad.index) ? pad.index : 0,
      moveX: dpadLeft ? -1 : dpadRight ? 1 : moveX,
      moveY: dpadUp ? -1 : dpadDown ? 1 : moveY,
      firing,
      dodge,
      pause,
      pauseJustPressed,
      buttons: { dpadLeft, dpadRight, dpadUp, dpadDown, firing, dodge, pause },
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

  resetAllKeys() {
    this.keys = {};
    this.justPressed = {};
    this.touchFireActive = false;
    this.previousGamepadButtons = {};
  }

  armForGameplay() {
    this.resetAllKeys();
    this.destroyed = false;
    try {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.tabIndex = 0;
        canvas.focus?.({ preventScroll: true });
      }
      window.focus?.();
    } catch {}
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
    if (keyboardOverride && keyboardOverride[key] === true) return true;
    const gamepad = this.pollGamepad();
    if (key === 'ArrowLeft' || key === 'KeyA' || key === 'a' || key === 'A') return !!this.keys[key] || gamepad.moveX < -0.35;
    if (key === 'ArrowRight' || key === 'KeyD' || key === 'd' || key === 'D') return !!this.keys[key] || gamepad.moveX > 0.35;
    if (key === 'ArrowUp' || key === 'KeyW' || key === 'w' || key === 'W') return !!this.keys[key] || gamepad.moveY < -0.35;
    if (key === 'ArrowDown' || key === 'KeyS' || key === 's' || key === 'S') return !!this.keys[key] || gamepad.moveY > 0.35;
    if (key === 'ShiftLeft' || key === 'ShiftRight') return !!this.keys[key] || gamepad.dodge;
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
    window.removeEventListener('keydown', this.handleKeyDown, true);
    window.removeEventListener('keyup', this.handleKeyUp, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('keyup', this.handleKeyUp, true);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('pointerdown', this.handleMouseDown);
    document.removeEventListener('pointerup', this.handleMouseUp);
    this.keys = {};
    this.justPressed = {};
    this.gamepadState = this.createEmptyGamepadState();
    this.destroyed = true;
  }
}
