import * as PIXI from 'pixi.js';
import { API } from '../api/API.js';

export class HighscoreScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.highscores = [];
  }

  async init() {
    this.container.removeChildren();

    const { width, height } = this.game.app.screen;

    // Title
    const title = new PIXI.Text('HIGHSCORES', {
      fontFamily: 'Courier New',
      fontSize: 48,
      fill: '#ffff00',
      stroke: '#ff8800',
      strokeThickness: 3
    });
    title.anchor.set(0.5);
    title.x = width / 2;
    title.y = 60;
    this.container.addChild(title);

    // Subtitle
    const subtitle = new PIXI.Text('Stokmarknes sine beste', {
      fontFamily: 'Courier New',
      fontSize: 16,
      fill: '#00ffff'
    });
    subtitle.anchor.set(0.5);
    subtitle.x = width / 2;
    subtitle.y = 100;
    this.container.addChild(subtitle);

    // Loading text
    const loading = new PIXI.Text('Laster...', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ffffff'
    });
    loading.anchor.set(0.5);
    loading.x = width / 2;
    loading.y = height / 2;
    this.container.addChild(loading);

    // Fetch highscores
    try {
      this.highscores = await API.getHighscores();
      this.container.removeChild(loading);
      this.displayHighscores();
    } catch (error) {
      loading.text = 'Kunne ikke laste scores!\nSjekk at serveren kj\u00f8rer.';
      console.error('Failed to load highscores:', error);
    }

    // Back button
    const backBtn = this.createButton('TILBAKE', width / 2, height - 60);
    backBtn.on('pointerdown', () => {
      this.game.switchScene('menu');
    });
    this.container.addChild(backBtn);
  }

  displayHighscores() {
    const { width } = this.game.app.screen;
    const startY = 150;
    const lineHeight = 35;

    // Header
    const header = new PIXI.Text(
      'RANK  NAVN         SCORE      LEVEL',
      {
        fontFamily: 'Courier New',
        fontSize: 16,
        fill: '#888888'
      }
    );
    header.x = width / 2 - 200;
    header.y = startY - 30;
    this.container.addChild(header);

    // Display top 10
    this.highscores.slice(0, 10).forEach((score, index) => {
      const rank = (index + 1).toString().padStart(2, ' ');
      const name = score.name.padEnd(12, ' ');
      const points = score.score.toString().padStart(8, ' ');
      const level = score.level.toString().padStart(3, ' ');

      const color = index === 0 ? '#ffff00' : index === 1 ? '#aaaaaa' : index === 2 ? '#ff8844' : '#00ffff';

      const line = new PIXI.Text(
        `${rank}    ${name}  ${points}     ${level}`,
        {
          fontFamily: 'Courier New',
          fontSize: 18,
          fill: color
        }
      );
      line.x = width / 2 - 200;
      line.y = startY + index * lineHeight;
      this.container.addChild(line);
    });

    // Easter egg messages
    if (this.highscores.length === 0) {
      const empty = new PIXI.Text('Ingen har spilt enn\u00e5!\nV\u00e6r den f\u00f8rste fra Melbu!', {
        fontFamily: 'Courier New',
        fontSize: 18,
        fill: '#ffffff',
        align: 'center'
      });
      empty.anchor.set(0.5);
      empty.x = width / 2;
      empty.y = startY + 100;
      this.container.addChild(empty);
    }
  }

  createButton(text, x, y) {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.rect(-80, -20, 160, 40);
    bg.fill({ color: 0x0088ff, alpha: 0.3 });
    bg.stroke({ color: 0x00ffff, width: 2 });
    container.addChild(bg);

    const label = new PIXI.Text(text, {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#00ffff'
    });
    label.anchor.set(0.5);
    container.addChild(label);

    container.on('pointerover', () => {
      bg.clear();
      bg.rect(-80, -20, 160, 40);
      bg.fill({ color: 0x00ffff, alpha: 0.5 });
      bg.stroke({ color: 0x00ffff, width: 2 });
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.rect(-80, -20, 160, 40);
      bg.fill({ color: 0x0088ff, alpha: 0.3 });
      bg.stroke({ color: 0x00ffff, width: 2 });
    });

    return container;
  }

  destroy() {
    // Cleanup
  }
}
