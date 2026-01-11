import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { createTextLayout, createVerticalStack, clampTextWidth } from '../ui/textLayout.js';

export class MenuScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.layoutUnsubscribe = null;
    this.title = null;
    this.subtitle = null;
    this.flavor = null;
    this.startBtn = null;
    this.highscoreBtn = null;
    this.controls = null;
    this.easter = null;
  }

  init() {
    this.container.removeChildren();
    this.createElements();
    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = addResponsiveListener(() => this.layoutMenu());
    this.layoutMenu();
  }

  createElements() {
    const { width } = this.game.app.screen;

    this.title = new PIXI.Text('BURT SHOOTER', {
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
    this.title.anchor.set(0.5);
    this.container.addChild(this.title);

    this.subtitle = new PIXI.Text('Kurt Edgar & Eirik sitt Galaga', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ff00ff',
      align: 'center'
    });
    this.subtitle.anchor.set(0.5);
    this.container.addChild(this.subtitle);

    this.flavor = new PIXI.Text(
      'Stokmarknes er under angrep!\nRølp, gris og mongo invaderer.\nKun Eirik kan redde dagen.',
      {
        fontFamily: 'Courier New',
        fontSize: 18,
        fill: '#ffffff',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: clampTextWidth(width * 0.75, { width, height: this.game.app.screen.height }),
        lineHeight: 28
      }
    );
    this.flavor.anchor.set(0.5);
    this.container.addChild(this.flavor);

    this.startBtn = this.createButton('START SPILL');
    this.startBtn.on('pointerdown', () => {
      AudioManager.play('menuSelect');
      this.game.startGame();
    });
    this.container.addChild(this.startBtn);

    this.highscoreBtn = this.createButton('HIGHSCORES');
    this.highscoreBtn.on('pointerdown', () => {
      AudioManager.play('menuSelect');
      this.game.showHighscores();
    });
    this.container.addChild(this.highscoreBtn);

    this.controls = new PIXI.Text(
      'WASD/Piltaster: Bevegelse | SPACE: Skyt | SHIFT: Dodge',
      {
        fontFamily: 'Courier New',
        fontSize: 14,
        fill: '#888888',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: clampTextWidth(width * 0.9, { width, height: this.game.app.screen.height }),
        lineHeight: 20
      }
    );
    this.controls.anchor.set(0.5);
    this.container.addChild(this.controls);

    this.easter = new PIXI.Text('Powered by Kjøttdeig Engine v1.0', {
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: '#444444'
    });
    this.easter.anchor.set(0.5);
    this.container.addChild(this.easter);
  }

  layoutMenu() {
    const { width, height } = this.game.app.screen;
    const layout = createTextLayout(width, height);
    const stack = createVerticalStack(layout);
    this.title.x = width / 2;
    this.title.y = stack.next();

    this.subtitle.x = width / 2;
    this.subtitle.y = stack.next();

    this.flavor.style.wordWrapWidth = clampTextWidth(width * 0.75, layout);
    this.flavor.y = stack.next(0);
    this.flavor.x = width / 2;

    stack.addGap(layout.spacing * 0.6);
    const buttonBaseY = stack.next(0.4);
    this.startBtn.x = width / 2;
    this.startBtn.y = buttonBaseY;

    this.highscoreBtn.x = width / 2;
    this.highscoreBtn.y = buttonBaseY + layout.spacing;

    this.controls.y = height - layout.padding - layout.lineHeight * 1.5;
    this.controls.x = width / 2;

    this.easter.y = height - layout.padding / 2;
    this.easter.x = width / 2;
  }

  createButton(text) {
    const container = new PIXI.Container();
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
    if (this.layoutUnsubscribe) {
      this.layoutUnsubscribe();
      this.layoutUnsubscribe = null;
    }
  }
}
