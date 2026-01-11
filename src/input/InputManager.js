export class InputManager {
  constructor() {
    this.keys = {};
    this.touches = [];

    this.setupKeyboard();
    this.setupTouch();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      this.keys[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.keys[e.key] = false;
    });
  }

  setupTouch() {
    // Touch joystick for mobile
    this.joystick = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    };

    window.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.joystick.active = true;
      this.joystick.startX = touch.clientX;
      this.joystick.startY = touch.clientY;
      this.joystick.currentX = touch.clientX;
      this.joystick.currentY = touch.clientY;
    });

    window.addEventListener('touchmove', (e) => {
      if (!this.joystick.active) return;
      const touch = e.touches[0];
      this.joystick.currentX = touch.clientX;
      this.joystick.currentY = touch.clientY;

      // Convert to key presses
      const dx = this.joystick.currentX - this.joystick.startX;
      const dy = this.joystick.currentY - this.joystick.startY;

      this.keys['KeyA'] = dx < -20;
      this.keys['KeyD'] = dx > 20;
      this.keys['KeyW'] = dy < -20;
      this.keys['KeyS'] = dy > 20;
    });

    window.addEventListener('touchend', () => {
      this.joystick.active = false;
      this.keys['KeyA'] = false;
      this.keys['KeyD'] = false;
      this.keys['KeyW'] = false;
      this.keys['KeyS'] = false;
    });
  }

  isKeyPressed(key) {
    return !!this.keys[key];
  }

  destroy() {
    this.keys = {};
  }
}
