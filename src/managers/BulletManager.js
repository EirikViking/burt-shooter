export class BulletManager {
  constructor(container) {
    this.container = container;
    this.playerBullets = [];
    this.enemyBullets = [];
  }

  addPlayerBullet(bullet) {
    this.playerBullets.push(bullet);
    this.container.addChild(bullet.sprite);
  }

  addEnemyBullet(bullet) {
    if (!bullet) return;
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
}
