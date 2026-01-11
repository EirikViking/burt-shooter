import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';

export class MenuScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
  }

  init() {
    this.container.removeChildren();

    const { width, height } = this.game.app.screen;

    // Title
    const title = new PIXI.Text('BURT SHOOTER', {
      fontFamily: 'Courier New',
      fontSize: 64,
      fill: '#00ffff',
      stroke: '#0088ff',
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: '#00ffff',
      dropShadowBlur: 10,
      dropShadowDistance: 0
    });
    title.anchor.set(0.5);
    title.x = width / 2;
    title.y = height / 4;
    this.container.addChild(title);

    // Subtitle
    const subtitle = new PIXI.Text('Kurt Edgar & Eirik sitt Galaga', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ff00ff',
      align: 'center'
    });
    subtitle.anchor.set(0.5);
    subtitle.x = width / 2;
    subtitle.y = height / 4 + 60;
    this.container.addChild(subtitle);

    // Flavor text
    const flavor = new PIXI.Text(
      'Stokmarknes er under angrep!\nR\u00f8lp, gris og mongo invaderer.\nKun Eirik kan redde dagen.',
      {
        fontFamily: 'Courier New',
        fontSize: 16,
        fill: '#ffffff',
        align: 'center',
        lineHeight: 24
      }
    );
    flavor.anchor.set(0.5);
    flavor.x = width / 2;
    flavor.y = height / 2 - 20;
    this.container.addChild(flavor);

    // Start button
    const startBtn = this.createButton('START SPILL', width / 2, height / 2 + 80);
    startBtn.on('pointerdown', () => {
      AudioManager.play('menuSelect');
      this.game.startGame();
    });
    this.container.addChild(startBtn);

    // Highscore button
    const highscoreBtn = this.createButton('HIGHSCORES', width / 2, height / 2 + 140);
    highscoreBtn.on('pointerdown', () => {
      AudioManager.play('menuSelect');
      this.game.showHighscores();
    });
    this.container.addChild(highscoreBtn);

    // Controls info
    const controls = new PIXI.Text(
      'WASD/Piltaster: Bevegelse | SPACE: Skyt | SHIFT: Dodge',
      {
        fontFamily: 'Courier New',
        fontSize: 12,
        fill: '#888888',
        align: 'center'
      }
    );
    controls.anchor.set(0.5);
    controls.x = width / 2;
    controls.y = height - 40;
    this.container.addChild(controls);

    // Easter egg
    const easter = new PIXI.Text('Powered by Kj\u00f8ttdeig Engine v1.0', {
      fontFamily: 'Courier New',
      fontSize: 10,
      fill: '#444444'
    });
    easter.anchor.set(0.5);
    easter.x = width / 2;
    easter.y = height - 20;
    this.container.addChild(easter);
  }

  createButton(text, x, y) {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.rect(-120, -20, 240, 40);
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
      bg.rect(-120, -20, 240, 40);
      bg.fill({ color: 0x00ffff, alpha: 0.5 });
      bg.stroke({ color: 0x00ffff, width: 2 });
      label.style.fill = '#ffffff';
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.rect(-120, -20, 240, 40);
      bg.fill({ color: 0x0088ff, alpha: 0.3 });
      bg.stroke({ color: 0x00ffff, width: 2 });
      label.style.fill = '#00ffff';
    });

    return container;
  }

  destroy() {
    // Cleanup
  }
}
