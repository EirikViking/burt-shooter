export class ScreenShake {
  constructor(container) {
    this.container = container;
    this.shakeAmount = 0;
    this.shakeDuration = 0;
    this.originalX = 0;
    this.originalY = 0;
  }

  shake(intensity) {
    this.shakeAmount = intensity;
    this.shakeDuration = 15; // frames
  }

  update(delta) {
    if (this.shakeDuration <= 0) {
      if (this.container && !this.container.destroyed) {
        this.container.x = this.originalX;
        this.container.y = this.originalY;
      }
      return;
    }

    this.shakeDuration -= delta;

    // Guard against destroyed container during shake
    if (!this.container || this.container.destroyed) return;

    const shakeX = (Math.random() - 0.5) * this.shakeAmount;
    const shakeY = (Math.random() - 0.5) * this.shakeAmount;

    this.container.x = this.originalX + shakeX;
    this.container.y = this.originalY + shakeY;

    // Decay shake
    this.shakeAmount *= 0.9;
  }
}
