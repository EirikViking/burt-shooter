import { getScreenShakeScale } from '../config/AccessibilitySettings.js';

export class ScreenShake {
  constructor(container) {
    this.container = container;
    this.shakeAmount = 0;
    this.shakeDuration = 0;
    this.originalX = 0;
    this.originalY = 0;
    this.freezeFrames = 0;
  }

  setOrigin(x = 0, y = 0) {
    this.originalX = Number.isFinite(Number(x)) ? Number(x) : 0;
    this.originalY = Number.isFinite(Number(y)) ? Number(y) : 0;
    if (this.shakeDuration <= 0 && this.container && !this.container.destroyed) {
      this.container.x = this.originalX;
      this.container.y = this.originalY;
    }
  }

  shake(intensity, duration = 15) {
    const scale = getScreenShakeScale();
    if (scale <= 0.02) {
      this.shakeAmount = 0;
      this.shakeDuration = 0;
      return;
    }

    // Add to existing shake instead of replacing (allows stacking impacts)
    this.shakeAmount = Math.max(this.shakeAmount, intensity * scale);
    this.shakeDuration = Math.max(this.shakeDuration, Math.max(1, duration * Math.max(0.35, scale)));
  }

  // Strong shake for major events (boss death, player death)
  strongShake() {
    this.shake(12, 25);
  }

  // Medium shake for moderate events (player hit, boss phase change)
  mediumShake() {
    this.shake(6, 15);
  }

  // Subtle shake for minor events (enemy death, powerup)
  subtleShake() {
    this.shake(2, 8);
  }

  // Freeze frame effect for dramatic moments
  freezeFrame(frames = 3) {
    const scale = getScreenShakeScale();
    if (scale <= 0.15) return;
    this.freezeFrames = Math.max(this.freezeFrames, Math.max(1, Math.round(frames * Math.max(0.35, scale))));
  }

  update(delta) {
    // Handle freeze frames (pause effect for dramatic impact)
    if (this.freezeFrames > 0) {
      this.freezeFrames -= delta;
      return delta * 0.05; // Return reduced delta for freeze effect
    }

    if (this.shakeDuration <= 0) {
      if (this.container && !this.container.destroyed) {
        this.container.x = this.originalX;
        this.container.y = this.originalY;
      }
      return delta;
    }

    this.shakeDuration -= delta;

    // Guard against destroyed container during shake
    if (!this.container || this.container.destroyed) return delta;

    const shakeX = (Math.random() - 0.5) * this.shakeAmount;
    const shakeY = (Math.random() - 0.5) * this.shakeAmount;

    this.container.x = this.originalX + shakeX;
    this.container.y = this.originalY + shakeY;

    // Decay shake
    this.shakeAmount *= 0.9;

    return delta;
  }
}
