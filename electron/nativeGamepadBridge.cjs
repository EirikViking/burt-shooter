const XINPUT_DLLS = ['xinput1_4.dll', 'xinput1_3.dll', 'xinput9_1_0.dll'];
const ERROR_SUCCESS = 0;
const MAX_GAMEPADS = 4;
const XINPUT_TRIGGER_THRESHOLD = 30;

const BUTTON_FLAGS = {
  dpadUp: 0x0001,
  dpadDown: 0x0002,
  dpadLeft: 0x0004,
  dpadRight: 0x0008,
  start: 0x0010,
  back: 0x0020,
  leftThumb: 0x0040,
  rightThumb: 0x0080,
  leftShoulder: 0x0100,
  rightShoulder: 0x0200,
  a: 0x1000,
  b: 0x2000,
  x: 0x4000,
  y: 0x8000
};

function normalizeThumb(value) {
  const n = Number(value) || 0;
  return n < 0 ? Math.max(-1, n / 32768) : Math.min(1, n / 32767);
}

function button(pressed, value = pressed ? 1 : 0) {
  return { pressed: Boolean(pressed), value };
}

function createStandardButtons(flags, leftTrigger, rightTrigger) {
  return [
    button(flags & BUTTON_FLAGS.a),
    button(flags & BUTTON_FLAGS.b),
    button(flags & BUTTON_FLAGS.x),
    button(flags & BUTTON_FLAGS.y),
    button(flags & BUTTON_FLAGS.leftShoulder),
    button(flags & BUTTON_FLAGS.rightShoulder),
    button(leftTrigger > XINPUT_TRIGGER_THRESHOLD, leftTrigger / 255),
    button(rightTrigger > XINPUT_TRIGGER_THRESHOLD, rightTrigger / 255),
    button(flags & BUTTON_FLAGS.back),
    button(flags & BUTTON_FLAGS.start),
    button(flags & BUTTON_FLAGS.leftThumb),
    button(flags & BUTTON_FLAGS.rightThumb),
    button(flags & BUTTON_FLAGS.dpadUp),
    button(flags & BUTTON_FLAGS.dpadDown),
    button(flags & BUTTON_FLAGS.dpadLeft),
    button(flags & BUTTON_FLAGS.dpadRight)
  ];
}

function decodeXInputState(index, stateBuffer) {
  const flags = stateBuffer.readUInt16LE(4);
  const leftTrigger = stateBuffer.readUInt8(6);
  const rightTrigger = stateBuffer.readUInt8(7);
  const leftX = stateBuffer.readInt16LE(8);
  const leftY = stateBuffer.readInt16LE(10);
  const rightX = stateBuffer.readInt16LE(12);
  const rightY = stateBuffer.readInt16LE(14);

  return {
    id: `XInput Controller ${index + 1}`,
    index,
    connected: true,
    source: 'xinput',
    mapping: 'standard',
    axes: [
      normalizeThumb(leftX),
      -normalizeThumb(leftY),
      normalizeThumb(rightX),
      -normalizeThumb(rightY)
    ],
    buttons: createStandardButtons(flags, leftTrigger, rightTrigger),
    raw: {
      packetNumber: stateBuffer.readUInt32LE(0),
      buttons: flags,
      leftTrigger,
      rightTrigger
    }
  };
}

class NativeGamepadBridge {
  constructor() {
    this.status = {
      available: false,
      dll: null,
      reason: 'not_loaded'
    };
    this.getState = null;
    this.load();
  }

  load() {
    let koffi = null;
    try {
      koffi = require('koffi');
    } catch (error) {
      this.status = { available: false, dll: null, reason: 'koffi_unavailable', error: error.message };
      return;
    }

    for (const dll of XINPUT_DLLS) {
      try {
        const lib = koffi.load(dll);
        this.getState = lib.func('XInputGetState', 'uint32', ['uint32', 'void*']);
        this.status = { available: true, dll, reason: 'ok' };
        return;
      } catch (error) {
        this.status = { available: false, dll, reason: 'xinput_load_failed', error: error.message };
      }
    }
  }

  getStatus() {
    return { ...this.status };
  }

  getGamepads() {
    if (!this.getState) return [];
    const pads = [];
    for (let index = 0; index < MAX_GAMEPADS; index += 1) {
      const stateBuffer = Buffer.alloc(16);
      let code = 1;
      try {
        code = this.getState(index, stateBuffer);
      } catch (error) {
        this.status = { ...this.status, available: false, reason: 'xinput_poll_failed', error: error.message };
        return pads;
      }
      if (code === ERROR_SUCCESS) {
        pads.push(decodeXInputState(index, stateBuffer));
      }
    }
    return pads;
  }
}

function createNativeGamepadBridge() {
  return new NativeGamepadBridge();
}

module.exports = {
  createNativeGamepadBridge
};
