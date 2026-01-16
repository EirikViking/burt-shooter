/**
 * NullTouchControls - Null Object Pattern for TouchControls
 * Provides safe no-op implementation when touch controls are not available
 */

export class NullTouchControls {
  constructor() {
    this.active = false;
  }

  init() {
    // No-op
  }

  getInput() {
    return {
      moveX: 0,
      moveY: 0,
      firing: false
    };
  }

  getMovement() {
    return {
      dx: 0,
      dy: 0
    };
  }

  destroy() {
    // No-op
  }
}
