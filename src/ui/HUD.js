import * as PIXI from 'pixi.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { extendLocations } from '../text/phrasePool.js';

export class HUD {
  constructor(container, game) {
    this.container = container;
    this.game = game;
    this.hudContainer = new PIXI.Container();
    this.layoutUnsubscribe = null;
    this.container.addChild(this.hudContainer);

    this.createHUD();
    this.layoutUnsubscribe = addResponsiveListener((layout) => this.applyLayout(layout));
    this.applyLayout(getCurrentLayout());
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
    const locations = extendLocations(['STOKMARKNES', 'MELBU', 'HADSEL', 'SORTLAND', 'LOFOTEN']);
    if (Math.random() < 0.001) {
      this.locationText.text = locations[Math.floor(Math.random() * locations.length)];
    }
  }

  applyLayout(layout = getCurrentLayout()) {
    if (!layout || typeof layout.width !== 'number') return;
    const margin = layout.isMobile ? 14 : 10;
    const blockSpacing = layout.isMobile ? 26 : 22;
    const scoreFont = layout.isMobile ? 16 : 20;
    const livesFont = layout.isMobile ? 18 : 20;

    this.scoreText.style.fontSize = scoreFont;
    this.levelText.style.fontSize = scoreFont;
    this.livesText.style.fontSize = livesFont;
    this.locationText.style.fontSize = layout.isMobile ? 10 : 12;

    this.scoreText.x = margin;
    this.scoreText.y = margin;
    this.levelText.x = margin;
    this.levelText.y = margin + blockSpacing;

    this.livesText.x = layout.width - margin;
    this.livesText.y = margin;

    this.locationText.x = layout.width - margin;
    this.locationText.y = margin + blockSpacing;
  }

  destroy() {
    if (this.layoutUnsubscribe) {
      this.layoutUnsubscribe();
      this.layoutUnsubscribe = null;
    }
  }
}
