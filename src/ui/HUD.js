import * as PIXI from 'pixi.js';

export class HUD {
  constructor(container, game) {
    this.container = container;
    this.game = game;
    this.hudContainer = new PIXI.Container();
    this.container.addChild(this.hudContainer);

    this.createHUD();
  }

  createHUD() {
    // Score
    this.scoreText = new PIXI.Text('SCORE: 0', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ffff00'
    });
    this.scoreText.x = 10;
    this.scoreText.y = 10;
    this.hudContainer.addChild(this.scoreText);

    // Level
    this.levelText = new PIXI.Text('LEVEL: 1', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#00ffff'
    });
    this.levelText.x = 10;
    this.levelText.y = 35;
    this.hudContainer.addChild(this.levelText);

    // Lives
    this.livesText = new PIXI.Text('LIVES: 3', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ff0000'
    });
    this.livesText.anchor.set(1, 0);
    this.livesText.x = 790;
    this.livesText.y = 10;
    this.hudContainer.addChild(this.livesText);

    // Easter egg location
    this.locationText = new PIXI.Text('STOKMARKNES', {
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: '#888888'
    });
    this.locationText.anchor.set(1, 0);
    this.locationText.x = 790;
    this.locationText.y = 35;
    this.hudContainer.addChild(this.locationText);
  }

  update() {
    this.scoreText.text = `SCORE: ${this.game.score}`;
    this.levelText.text = `LEVEL: ${this.game.level}`;
    this.livesText.text = `LIVES: ${this.game.lives}`;

    // Random location updates
    const locations = ['STOKMARKNES', 'MELBU', 'HADSEL', 'SORTLAND', 'LOFOTEN'];
    if (Math.random() < 0.001) {
      this.locationText.text = locations[Math.floor(Math.random() * locations.length)];
    }
  }
}
