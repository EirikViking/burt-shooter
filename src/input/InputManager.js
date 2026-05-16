export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this.touches = [];
    this.touchFireActive = false;
    this.destroyed = false;
    this.setupKeyboard();
    this.setupMouse();
    this.setupFocusHandlers();
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

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
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

  resetAllKeys() {
    this.keys = {};
    this.justPressed = {};
    this.touchFireActive = false;
  }

  isFiring() {
    return this.isKeyPressed('Space') ||
      this.isKeyPressed('shoot') ||
      this.touchFireActive;
  }

  isKeyPressed(key) {
    return !!this.keys[key];
  }

  setKeyPressed(key, pressed) {
    this.keys[key] = pressed;
  }

  consumeKeyPress(...keys) {
    const matched = keys.some(key => this.justPressed[key]);
    if (matched) {
      keys.forEach(key => {
        this.justPressed[key] = false;
      });
    }
    return matched;
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('pointerdown', this.handleMouseDown);
    document.removeEventListener('pointerup', this.handleMouseUp);
    this.keys = {};
    this.justPressed = {};
    this.destroyed = true;
  }
}
