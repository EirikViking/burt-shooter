export class BulletManager {
  constructor(container, onCap) {
    this.container = container;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.maxPlayerBullets = 200;
    this.maxEnemyBullets = 300;
    this.onCap = onCap;
    this.screenWidth = 800;
    this.screenHeight = 600;
    this.updatingEnemyBullets = false;
    this.pendingEnemyBullets = [];

    // Enable zIndex sorting on container
    this.container.sortableChildren = true;
  }

  setScreenBounds(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  addPlayerBullet(bullet) {
    if (this.playerBullets.length >= this.maxPlayerBullets) {
      if (this.onCap) this.onCap('bullets');
      return;
    }
    bullet.setScreenBounds(this.screenWidth, this.screenHeight);
    this.playerBullets.push(bullet);
    this.container.addChild(bullet.sprite);
  }

  addEnemyBullet(bullet) {
    if (!bullet) return;
    const currentCount = this.enemyBullets.length + this.pendingEnemyBullets.length;
    if (currentCount >= this.maxEnemyBullets) {
      if (this.onCap) this.onCap('bullets');
      return;
    }
    bullet.setScreenBounds(this.screenWidth, this.screenHeight);
    if (this.updatingEnemyBullets) {
      this.pendingEnemyBullets.push(bullet);
      return;
    }
    this.enemyBullets.push(bullet);
    this.container.addChild(bullet.sprite);
  }

  update(delta, enemyScale = 1) {
    // Update player bullets
    this.playerBullets = this.playerBullets.filter(bullet => {
      bullet.update(delta);
      if (!bullet.active) {
        this.container.removeChild(bullet.sprite);
        return false;
      }
      return true;
    });

    // Update enemy bullets
    this.updatingEnemyBullets = true;
    this.enemyBullets = this.enemyBullets.filter(bullet => {
      bullet.update(delta * enemyScale);
      if (!bullet.active) {
        this.container.removeChild(bullet.sprite);
        return false;
      }
      return true;
    });
    this.updatingEnemyBullets = false;
    if (this.pendingEnemyBullets.length) {
      for (const bullet of this.pendingEnemyBullets) {
        this.enemyBullets.push(bullet);
        this.container.addChild(bullet.sprite);
      }
      this.pendingEnemyBullets = [];
    }
  }

  getTotalCount() {
    return this.playerBullets.length + this.enemyBullets.length;
  }
}
