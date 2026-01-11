export class InputManager {
  constructor() {
    this.keys = {};
    this.touches = [];
    this.touchFireActive = false;
    this.setupKeyboard();
    this.setupFocusHandlers();
  }

  setupKeyboard() {
    this.handleKeyDown = (e) => {
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
    this.touchFireActive = false;
  }

  isKeyPressed(key) {
    return !!this.keys[key];
  }

  setKeyPressed(key, pressed) {
    this.keys[key] = pressed;
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.keys = {};
  }
}
