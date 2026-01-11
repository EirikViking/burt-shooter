import * as PIXI from 'pixi.js';

class Powerup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.radius = 12;
    this.vy = 1;

    const powerupData = {
      isbjorn: { color: 0xffaa00, label: 'ISBJØRN' },
      kjottdeig: { color: 0xff6666, label: 'KJØTTDEIG' },
      rolp: { color: 0xff00ff, label: 'RØLP' },
      deili: { color: 0x00ff00, label: 'DEILI' }
    };

    const data = powerupData[type];
    this.color = data.color;
    this.label = data.label;

    this.createSprite();
  }

  createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Outer glow
    const glow = new PIXI.Graphics();
    glow.circle(0, 0, this.radius + 4);
    glow.fill({ color: this.color, alpha: 0.3 });
    this.sprite.addChild(glow);

    // Main circle
    const circle = new PIXI.Graphics();
    circle.circle(0, 0, this.radius);
    circle.fill({ color: this.color });
    circle.stroke({ color: 0xffffff, width: 2 });
    this.sprite.addChild(circle);

    // Icon (first letter)
    const text = new PIXI.Text(this.label[0], {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#ffffff',
      fontWeight: 'bold'
    });
    text.anchor.set(0.5);
    this.sprite.addChild(text);
  }

  update(delta) {
    if (!this.active) return;

    this.y += this.vy * delta;
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Rotation and pulse
    this.sprite.rotation += 0.05 * delta;
    const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.1;
    this.sprite.scale.set(pulse);

    // Deactivate if off-screen
    if (this.y > 620) {
      this.active = false;
    }
  }

  collect(player, scene) {
    this.active = false;
    player.applyPowerup(this.type);

    // Show pickup message
    this.showMessage(scene);
  }

  showMessage(scene) {
    const messages = {
      isbjorn: 'ISBJØRN CAN! Triple Shot!',
      kjottdeig: 'KJØTTDEIG BOOST! Speed Up!',
      rolp: 'RØLP MODE! Rapid Fire!',
      deili: 'DEILI FETTA! Ultimate Power!'
    };

    const { width, height } = scene.game.app.screen;
    const text = new PIXI.Text(messages[this.type] || 'POWERUP!', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: this.color,
      stroke: '#000000',
      strokeThickness: 3
    });
    text.anchor.set(0.5);
    text.x = width / 2;
    text.y = height / 2 - 100;
    text.alpha = 0;
    scene.container.addChild(text);

    // Fade animation
    let elapsed = 0;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;

      if (elapsed < 300) {
        text.alpha = elapsed / 300;
      } else if (elapsed > 1500) {
        text.alpha = Math.max(0, (2000 - elapsed) / 500);
      } else {
        text.alpha = 1;
      }

      if (elapsed >= 2000) {
        scene.game.app.ticker.remove(ticker);
        scene.container.removeChild(text);
      }
    };
    scene.game.app.ticker.add(ticker);
  }
}

export class PowerupManager {
  constructor(container, game) {
    this.container = container;
    this.game = game;
    this.powerups = [];
  }

  spawn(x, y) {
    const types = ['isbjorn', 'kjottdeig', 'rolp', 'deili'];
    const type = types[Math.floor(Math.random() * types.length)];

    const powerup = new Powerup(x, y, type);
    this.powerups.push(powerup);
    this.container.addChild(powerup.sprite);
  }

  update(delta) {
    this.powerups = this.powerups.filter(powerup => {
      powerup.update(delta);
      if (!powerup.active) {
        this.container.removeChild(powerup.sprite);
        return false;
      }
      return true;
    });
  }
}
