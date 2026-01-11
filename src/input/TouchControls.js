import * as PIXI from 'pixi.js';
import { getCurrentLayout } from '../ui/responsiveLayout.js';

export class TouchControls {
  constructor(container, game) {
    this.container = container;
    this.game = game;
    this.active = false;
    this.joystickContainer = null;
    this.joystickBase = null;
    this.joystickStick = null;
    this.fireButton = null;
    this.joystickData = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0
    };
    this.fireData = {
      pressed: false,
      pointerId: null
    };
    this.pointerHandlers = new Map();
  }

  init() {
    const layout = getCurrentLayout();
    if (!layout.isMobile) {
      return;
    }

    this.active = true;
    this.createJoystick();
    this.createFireButton();
    this.setupPointerEvents();
  }

  createJoystick() {
    const { width, height } = this.game.app.screen;
    const layout = getCurrentLayout();
    const baseRadius = layout.isPortrait ? 50 : 45;
    const stickRadius = layout.isPortrait ? 22 : 20;

    this.joystickContainer = new PIXI.Container();
    this.joystickContainer.x = layout.safeArea.left + baseRadius + 20;
    this.joystickContainer.y = height - layout.safeArea.bottom - baseRadius - 20;
    this.joystickContainer.alpha = 0.6;

    this.joystickBase = new PIXI.Graphics();
    this.joystickBase.circle(0, 0, baseRadius);
    this.joystickBase.fill({ color: 0x333333, alpha: 0.5 });
    this.joystickBase.stroke({ color: 0x00ffff, width: 2, alpha: 0.7 });
    this.joystickContainer.addChild(this.joystickBase);

    this.joystickStick = new PIXI.Graphics();
    this.joystickStick.circle(0, 0, stickRadius);
    this.joystickStick.fill({ color: 0x00ffff, alpha: 0.8 });
    this.joystickStick.stroke({ color: 0x00aaff, width: 2 });
    this.joystickContainer.addChild(this.joystickStick);

    this.container.addChild(this.joystickContainer);
  }

  createFireButton() {
    const { width, height } = this.game.app.screen;
    const layout = getCurrentLayout();
    const buttonRadius = layout.isPortrait ? 45 : 40;

    this.fireButton = new PIXI.Container();
    this.fireButton.x = width - layout.safeArea.right - buttonRadius - 20;
    this.fireButton.y = height - layout.safeArea.bottom - buttonRadius - 20;
    this.fireButton.alpha = 0.6;
    this.fireButton.eventMode = 'static';

    const bg = new PIXI.Graphics();
    bg.circle(0, 0, buttonRadius);
    bg.fill({ color: 0xff4400, alpha: 0.5 });
    bg.stroke({ color: 0xff8800, width: 3, alpha: 0.8 });
    this.fireButton.addChild(bg);

    const label = new PIXI.Text('FIRE', {
      fontFamily: 'Courier New',
      fontSize: layout.isPortrait ? 16 : 14,
      fill: '#ffffff',
      fontWeight: 'bold'
    });
    label.anchor.set(0.5);
    this.fireButton.addChild(label);

    this.fireButtonBg = bg;
    this.container.addChild(this.fireButton);
  }

  setupPointerEvents() {
    const canvas = this.game.app.view;

    const onPointerDown = (e) => {
      const point = this.getLocalPoint(e);
      if (!point) return;

      // Check if fire button was pressed
      if (this.fireButton && this.isPointInCircle(point, this.fireButton, 50)) {
        if (!this.fireData.pressed) {
          this.fireData.pressed = true;
          this.fireData.pointerId = e.pointerId;
          this.updateFireButtonVisual(true);
        }
        e.preventDefault();
        return;
      }

      // Check if joystick area was pressed
      if (this.joystickContainer && this.isPointInCircle(point, this.joystickContainer, 70)) {
        if (!this.joystickData.active) {
          this.joystickData.active = true;
          this.joystickData.pointerId = e.pointerId;
          this.joystickData.startX = point.x;
          this.joystickData.startY = point.y;
          this.joystickData.currentX = point.x;
          this.joystickData.currentY = point.y;
          this.updateJoystick();
        }
        e.preventDefault();
        return;
      }

      // If no specific control, treat left half as joystick, right half as fire
      const { width } = this.game.app.screen;
      if (point.x < width / 2) {
        if (!this.joystickData.active) {
          this.joystickData.active = true;
          this.joystickData.pointerId = e.pointerId;
          this.joystickData.startX = point.x;
          this.joystickData.startY = point.y;
          this.joystickData.currentX = point.x;
          this.joystickData.currentY = point.y;
          this.updateJoystick();
        }
      } else {
        if (!this.fireData.pressed) {
          this.fireData.pressed = true;
          this.fireData.pointerId = e.pointerId;
          this.updateFireButtonVisual(true);
        }
      }
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      const point = this.getLocalPoint(e);
      if (!point) return;

      if (this.joystickData.active && this.joystickData.pointerId === e.pointerId) {
        this.joystickData.currentX = point.x;
        this.joystickData.currentY = point.y;
        this.updateJoystick();
        e.preventDefault();
      }
    };

    const onPointerUp = (e) => {
      if (this.joystickData.active && this.joystickData.pointerId === e.pointerId) {
        this.joystickData.active = false;
        this.joystickData.pointerId = null;
        this.joystickData.deltaX = 0;
        this.joystickData.deltaY = 0;
        this.updateJoystick();
        e.preventDefault();
      }

      if (this.fireData.pressed && this.fireData.pointerId === e.pointerId) {
        this.fireData.pressed = false;
        this.fireData.pointerId = null;
        this.updateFireButtonVisual(false);
        e.preventDefault();
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    this.pointerHandlers.set('pointerdown', onPointerDown);
    this.pointerHandlers.set('pointermove', onPointerMove);
    this.pointerHandlers.set('pointerup', onPointerUp);

    // Prevent default touch behaviors
    canvas.style.touchAction = 'none';
  }

  getLocalPoint(e) {
    const canvas = this.game.app.view;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  isPointInCircle(point, container, radius) {
    const dx = point.x - container.x;
    const dy = point.y - container.y;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  }

  updateJoystick() {
    if (!this.joystickStick) return;

    if (!this.joystickData.active) {
      this.joystickStick.x = 0;
      this.joystickStick.y = 0;
      this.joystickContainer.alpha = 0.6;
      return;
    }

    const dx = this.joystickData.currentX - this.joystickData.startX;
    const dy = this.joystickData.currentY - this.joystickData.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 40;

    if (distance > maxDistance) {
      const angle = Math.atan2(dy, dx);
      this.joystickStick.x = Math.cos(angle) * maxDistance;
      this.joystickStick.y = Math.sin(angle) * maxDistance;
      this.joystickData.deltaX = Math.cos(angle);
      this.joystickData.deltaY = Math.sin(angle);
    } else {
      this.joystickStick.x = dx;
      this.joystickStick.y = dy;
      this.joystickData.deltaX = distance > 10 ? dx / maxDistance : 0;
      this.joystickData.deltaY = distance > 10 ? dy / maxDistance : 0;
    }

    this.joystickContainer.alpha = 0.9;
  }

  updateFireButtonVisual(pressed) {
    if (!this.fireButtonBg) return;

    this.fireButtonBg.clear();
    const layout = getCurrentLayout();
    const radius = layout.isPortrait ? 45 : 40;

    if (pressed) {
      this.fireButtonBg.circle(0, 0, radius);
      this.fireButtonBg.fill({ color: 0xff8800, alpha: 0.8 });
      this.fireButtonBg.stroke({ color: 0xffaa00, width: 3, alpha: 1 });
      this.fireButton.alpha = 1;
    } else {
      this.fireButtonBg.circle(0, 0, radius);
      this.fireButtonBg.fill({ color: 0xff4400, alpha: 0.5 });
      this.fireButtonBg.stroke({ color: 0xff8800, width: 3, alpha: 0.8 });
      this.fireButton.alpha = 0.6;
    }
  }

  getMovement() {
    if (!this.active || !this.joystickData.active) {
      return { dx: 0, dy: 0 };
    }
    return {
      dx: this.joystickData.deltaX,
      dy: this.joystickData.deltaY
    };
  }

  isFirePressed() {
    return this.active && this.fireData.pressed;
  }

  destroy() {
    const canvas = this.game.app.view;
    this.pointerHandlers.forEach((handler, event) => {
      canvas.removeEventListener(event, handler);
    });
    this.pointerHandlers.clear();

    if (this.joystickContainer && this.joystickContainer.parent) {
      this.container.removeChild(this.joystickContainer);
    }
    if (this.fireButton && this.fireButton.parent) {
      this.container.removeChild(this.fireButton);
    }

    canvas.style.touchAction = '';
    this.active = false;
  }
}
