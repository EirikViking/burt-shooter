export class BulletManager {
  constructor(container, onCap) {
    this.container = container;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.maxPlayerBullets = 200;
    this.maxEnemyBullets = 300;
    this.onCap = onCap;
  }

  addPlayerBullet(bullet) {
    if (this.playerBullets.length >= this.maxPlayerBullets) {
      if (this.onCap) this.onCap('bullets');
      return;
    }
    this.playerBullets.push(bullet);
    this.container.addChild(bullet.sprite);
  }

  addEnemyBullet(bullet) {
    if (!bullet) return;
    if (this.enemyBullets.length >= this.maxEnemyBullets) {
      if (this.onCap) this.onCap('bullets');
      return;
    }
    this.enemyBullets.push(bullet);
    this.container.addChild(bullet.sprite);
  }

  update(delta) {
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
    this.enemyBullets = this.enemyBullets.filter(bullet => {
      bullet.update(delta);
      if (!bullet.active) {
        this.container.removeChild(bullet.sprite);
        return false;
      }
      return true;
    });
  }

  getTotalCount() {
    return this.playerBullets.length + this.enemyBullets.length;
  }
}
