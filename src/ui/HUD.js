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

    // Lives group
    this.livesGroup = new PIXI.Container();
    this.livesBg = new PIXI.Graphics();
    this.livesGroup.addChild(this.livesBg);
    this.livesIcon = new PIXI.Text('♥', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ff8080'
    });
    this.livesGroup.addChild(this.livesIcon);
    this.livesText = new PIXI.Text('LIVES: 3', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ff0000',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.livesGroup.addChild(this.livesText);
    this.hudContainer.addChild(this.livesGroup);

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
    this.updateLivesVisuals();

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

    this.locationText.x = layout.width - margin;
    this.locationText.y = margin + blockSpacing;

    this.updateLivesVisuals();
    this.livesGroup.x = layout.width - margin - this.livesGroup.width;
    this.livesGroup.y = margin;
  }

  updateLivesVisuals() {
    if (!this.livesGroup || !this.livesText || !this.livesIcon) return;
    const padding = 8;
    const height = Math.max(this.livesIcon.height, this.livesText.height) + padding;
    this.livesGroup.pivot.set(0, 0);
    this.livesIcon.x = padding / 2;
    this.livesIcon.y = height / 2 - this.livesIcon.height / 2;
    this.livesText.x = this.livesIcon.x + this.livesIcon.width + 6;
    this.livesText.y = height / 2 - this.livesText.height / 2;
    const width = this.livesText.x + this.livesText.width + padding / 2;
    this.livesBg.clear();
    this.livesBg.beginFill(0x000000, 0.45);
    this.livesBg.drawRoundedRect(0, 0, width, height, 8);
    this.livesBg.endFill();
  }

  destroy() {
    if (this.layoutUnsubscribe) {
      this.layoutUnsubscribe();
      this.layoutUnsubscribe = null;
    }
  }
}
