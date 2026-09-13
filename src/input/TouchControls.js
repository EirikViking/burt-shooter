/**
 * Touch Controls for Mobile
 * Creates on-screen controls for movement and firing
 */

import { isMobile } from '../utils/Mobile.js';

export class TouchControls {
  constructor() {
    this.active = false;
    this.moveX = 0;
    this.moveY = 0;
    this.firing = true; // AUTOFIRE: Always true on mobile

    // Touch tracking
    this.moveTouch = null;
    this.moveOriginX = 0;
    this.moveOriginY = 0;

    // DOM elements
    this.leftZone = null;
    this.joystickBase = null;
    this.joystickStick = null;
    this.joystickHint = null;
    this.autoFireHint = null;

    // Constants
    this.MAX_MOVE_DELTA = 60; // pixels
  }

  init() {
    if (!isMobile()) {
      console.log('[TouchControls] Desktop detected, skipping touch controls');
      return;
    }

    console.log('[TouchControls] Initializing mobile touch controls');
    this.createControls();
    this.active = true;
  }

  createControls() {
    // Left movement zone (full height, left 50% of screen) - INVISIBLE
    this.leftZone = document.createElement('div');
    this.leftZone.id = 'touch-move-zone';
    this.leftZone.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 50%;
      height: 100%;
      background: transparent;
      touch-action: none;
      user-select: none;
      z-index: 1000;
      pointer-events: auto;
    `;

    // Joystick base (hidden initially)
    this.joystickBase = document.createElement('div');
    this.joystickBase.id = 'joystick-base';
    this.joystickBase.style.cssText = `
      position: fixed;
      width: 100px;
      height: 100px;
      background: rgba(0, 255, 255, 0.2);
      border: 2px solid rgba(0, 255, 255, 0.4);
      border-radius: 50%;
      touch-action: none;
      user-select: none;
      z-index: 1001;
      pointer-events: none;
      display: none;
    `;

    // Joystick stick
    this.joystickStick = document.createElement('div');
    this.joystickStick.id = 'joystick-stick';
    this.joystickStick.style.cssText = `
      position: fixed;
      width: 40px;
      height: 40px;
      background: rgba(0, 255, 255, 0.6);
      border: 2px solid rgba(0, 255, 255, 0.8);
      border-radius: 50%;
      touch-action: none;
      user-select: none;
      z-index: 1002;
      pointer-events: none;
      display: none;
    `;

    // Add to DOM
    document.body.appendChild(this.leftZone);
    document.body.appendChild(this.joystickBase);
    document.body.appendChild(this.joystickStick);
    this.createPassiveHints();

    // Bind event listeners
    this.bindMoveEvents();
  }

  createPassiveHints() {
    this.joystickHint = document.createElement('div');
    this.joystickHint.id = 'joystick-hint';
    this.joystickHint.style.cssText = `
      position: fixed;
      left: max(22px, env(safe-area-inset-left));
      bottom: max(22px, env(safe-area-inset-bottom));
      width: 86px;
      height: 86px;
      border-radius: 50%;
      border: 2px solid rgba(0, 255, 255, 0.26);
      background: radial-gradient(circle, rgba(0,255,255,0.12) 0 18%, rgba(0,255,255,0.05) 19% 48%, transparent 49%);
      box-shadow: 0 0 24px rgba(0,255,255,0.12);
      z-index: 999;
      pointer-events: none;
      opacity: 0.7;
    `;

    this.autoFireHint = document.createElement('div');
    this.autoFireHint.id = 'autofire-hint';
    this.autoFireHint.style.cssText = `
      position: fixed;
      right: max(28px, env(safe-area-inset-right));
      bottom: max(34px, env(safe-area-inset-bottom));
      width: 54px;
      height: 54px;
      border-radius: 50%;
      border: 2px solid rgba(255, 74, 74, 0.32);
      box-shadow: 0 0 18px rgba(255,74,74,0.16), inset 0 0 18px rgba(255,74,74,0.08);
      z-index: 999;
      pointer-events: none;
      opacity: 0.68;
    `;
    const reticle = document.createElement('div');
    reticle.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      width: 18px;
      height: 18px;
      margin-left: -9px;
      margin-top: -9px;
      border-radius: 50%;
      background: rgba(255,74,74,0.18);
      box-shadow: 0 0 10px rgba(255,74,74,0.28);
    `;
    this.autoFireHint.appendChild(reticle);

    document.body.appendChild(this.joystickHint);
    document.body.appendChild(this.autoFireHint);
  }

  bindMoveEvents() {
    this.leftZone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.moveTouch = e.pointerId;
      this.moveOriginX = e.clientX;
      this.moveOriginY = e.clientY;
      this.leftZone.setPointerCapture(e.pointerId);

      // Show joystick at touch position
      if (this.joystickHint) this.joystickHint.style.opacity = '0.25';
      this.joystickBase.style.display = 'block';
      this.joystickBase.style.left = (e.clientX - 50) + 'px';
      this.joystickBase.style.top = (e.clientY - 50) + 'px';

      this.joystickStick.style.display = 'block';
      this.joystickStick.style.left = (e.clientX - 20) + 'px';
      this.joystickStick.style.top = (e.clientY - 20) + 'px';
    });

    this.leftZone.addEventListener('pointermove', (e) => {
      if (this.moveTouch === e.pointerId) {
        e.preventDefault();
        const deltaX = e.clientX - this.moveOriginX;
        const deltaY = e.clientY - this.moveOriginY;

        // Normalize to -1..1 range
        this.moveX = Math.max(-1, Math.min(1, deltaX / this.MAX_MOVE_DELTA));
        this.moveY = Math.max(-1, Math.min(1, deltaY / this.MAX_MOVE_DELTA));

        // Update joystick stick position (clamped to max delta)
        const clampedDeltaX = Math.max(-this.MAX_MOVE_DELTA, Math.min(this.MAX_MOVE_DELTA, deltaX));
        const clampedDeltaY = Math.max(-this.MAX_MOVE_DELTA, Math.min(this.MAX_MOVE_DELTA, deltaY));

        this.joystickStick.style.left = (this.moveOriginX + clampedDeltaX - 20) + 'px';
        this.joystickStick.style.top = (this.moveOriginY + clampedDeltaY - 20) + 'px';
      }
    });

    this.leftZone.addEventListener('pointerup', (e) => {
      if (this.moveTouch === e.pointerId) {
        e.preventDefault();
        this.moveTouch = null;
        this.moveX = 0;
        this.moveY = 0;
        this.leftZone.releasePointerCapture(e.pointerId);

        // Hide joystick
        this.joystickBase.style.display = 'none';
        this.joystickStick.style.display = 'none';
        if (this.joystickHint) this.joystickHint.style.opacity = '0.7';
      }
    });

    this.leftZone.addEventListener('pointercancel', (e) => {
      if (this.moveTouch === e.pointerId) {
        this.moveTouch = null;
        this.moveX = 0;
        this.moveY = 0;

        // Hide joystick
        this.joystickBase.style.display = 'none';
        this.joystickStick.style.display = 'none';
        if (this.joystickHint) this.joystickHint.style.opacity = '0.7';
      }
    });
  }

  getInput() {
    return {
      moveX: this.moveX,
      moveY: this.moveY,
      firing: this.active && this.firing // Only autofire when active (mobile only)
    };
  }

  getMovement() {
    return {
      dx: this.moveX,
      dy: this.moveY
    };
  }

  resetTransientState({ preserveMovement = false } = {}) {
    if (preserveMovement) return;
    this.moveTouch = null;
    this.moveX = 0;
    this.moveY = 0;
    if (this.joystickBase) this.joystickBase.style.display = 'none';
    if (this.joystickStick) this.joystickStick.style.display = 'none';
    if (this.joystickHint) this.joystickHint.style.opacity = '0.7';
  }

  destroy() {
    if (this.leftZone) {
      document.body.removeChild(this.leftZone);
      this.leftZone = null;
    }
    if (this.joystickBase) {
      document.body.removeChild(this.joystickBase);
      this.joystickBase = null;
    }
    if (this.joystickStick) {
      document.body.removeChild(this.joystickStick);
      this.joystickStick = null;
    }
    if (this.joystickHint) {
      document.body.removeChild(this.joystickHint);
      this.joystickHint = null;
    }
    if (this.autoFireHint) {
      document.body.removeChild(this.autoFireHint);
      this.autoFireHint = null;
    }
    this.active = false;
    this.moveTouch = null;
    this.moveX = 0;
    this.moveY = 0;
    this.firing = true; // Maintain autofire state
  }
}
