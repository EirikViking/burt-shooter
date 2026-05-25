const DEFAULT_DEADZONE = 0.42;

function isPressed(buttons, index) {
  const button = buttons?.[index];
  if (button == null) return false;
  if (typeof button === 'number') return button > 0.5;
  return Boolean(button.pressed || button.value > 0.5);
}

function readSnapshot() {
  const override = typeof window !== 'undefined' ? window.__burtGamepadOverride : null;
  if (override) {
    return {
      id: override.id || 'virtual-gamepad',
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
    (pad.axes || []).some((axis) => Math.abs(Number(axis) || 0) >= DEFAULT_DEADZONE) ||
    (pad.buttons || []).some((button) => isPressed([button], 0))
  ));
  if (nativeActivePad) return nativeActivePad;

  const pads = typeof navigator !== 'undefined' && navigator.getGamepads
    ? Array.from(navigator.getGamepads()).filter(Boolean)
    : [];
  return pads.find((pad) => pad && pad.connected) || nativePads.find((pad) => pad && pad.connected) || null;
}

function normalizeAxis(value, deadzone = DEFAULT_DEADZONE) {
  const axis = Number(value) || 0;
  return Math.abs(axis) >= deadzone ? axis : 0;
}

function readDirectionalAxis(axes, primaryIndex, fallbackIndex, deadzone = DEFAULT_DEADZONE) {
  const primary = normalizeAxis(axes?.[primaryIndex], deadzone);
  if (primary !== 0) return primary;
  return normalizeAxis(axes?.[fallbackIndex], deadzone);
}

export class GamepadNavigator {
  constructor({ deadzone = DEFAULT_DEADZONE } = {}) {
    this.deadzone = deadzone;
    this.previous = {};
    this.lastActivityAt = 0;
    this.suppressActiveInput = false;
  }

  readRaw() {
    return readSnapshot();
  }

  suppressUntilReleased() {
    this.suppressActiveInput = true;
    this.previous = {};
  }

  update() {
    const pad = readSnapshot();
    if (!pad || pad.connected === false) {
      this.previous = {};
      this.suppressActiveInput = false;
      return {
        connected: false,
        active: false,
        id: null,
        index: null,
        axes: [0, 0],
        down: {},
        pressed: {}
      };
    }

    const buttons = pad.buttons || [];
    const axisX = readDirectionalAxis(pad.axes, 0, 2, this.deadzone);
    const axisY = readDirectionalAxis(pad.axes, 1, 3, this.deadzone);
    const down = {
      up: isPressed(buttons, 12) || axisY < 0,
      down: isPressed(buttons, 13) || axisY > 0,
      left: isPressed(buttons, 14) || axisX < 0,
      right: isPressed(buttons, 15) || axisX > 0,
      confirm: isPressed(buttons, 0) || isPressed(buttons, 7),
      cancel: isPressed(buttons, 1),
      x: isPressed(buttons, 2),
      y: isPressed(buttons, 3),
      lb: isPressed(buttons, 4),
      rb: isPressed(buttons, 5),
      back: isPressed(buttons, 8),
      menu: isPressed(buttons, 9),
      leftStick: isPressed(buttons, 10),
      rightStick: isPressed(buttons, 11)
    };
    const pressed = Object.fromEntries(
      Object.entries(down).map(([key, value]) => [key, Boolean(value && !this.previous[key])])
    );
    const active = Math.abs(axisX) > 0 || Math.abs(axisY) > 0 || Object.values(down).some(Boolean);

    if (this.suppressActiveInput) {
      if (active) {
        this.previous = down;
        return {
          connected: true,
          active: false,
          suppressed: true,
          id: pad.id || 'gamepad',
          index: Number.isFinite(pad.index) ? pad.index : 0,
          axes: [axisX, axisY],
          down,
          pressed: Object.fromEntries(Object.keys(down).map((key) => [key, false]))
        };
      }
      this.suppressActiveInput = false;
    }

    if (active) {
      this.lastActivityAt = Date.now();
    }

    this.previous = down;
    return {
      connected: true,
      active,
      id: pad.id || 'gamepad',
      index: Number.isFinite(pad.index) ? pad.index : 0,
      axes: [axisX, axisY],
      down,
      pressed
    };
  }

  wasRecentlyActive(windowMs = 1800) {
    return Date.now() - this.lastActivityAt <= windowMs;
  }
}

export function hasConnectedGamepad() {
  const pad = readSnapshot();
  return Boolean(pad && pad.connected !== false);
}
