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
    const { width, height } = this.game.app.screen;
    const layout = getCurrentLayout();
    const titleSize = layout.isMobile ? (layout.isPortrait ? 42 : 36) : 64;
    const titleBlur = layout.isMobile ? 6 : 10;

    this.title = new PIXI.Text('BURT SHOOTER', {
      fontFamily: 'Courier New',
      fontSize: titleSize,
      fill: '#00ffff',
      stroke: '#0088ff',
      strokeThickness: layout.isMobile ? 2 : 4,
      dropShadow: true,
      dropShadowColor: '#00ffff',
      dropShadowBlur: titleBlur,
      dropShadowDistance: 0,
      dropShadowAlpha: layout.isMobile ? 0.5 : 0.7
    });
    this.title.anchor.set(0.5);
    this.container.addChild(this.title);

    const subtitleSize = layout.isMobile ? 16 : 20;
    this.subtitle = new PIXI.Text('Kurt Edgar & Eirik sitt Galaga', {
      fontFamily: 'Courier New',
      fontSize: subtitleSize,
      fill: '#ff00ff',
      align: 'center'
    });
    this.subtitle.anchor.set(0.5);
    this.container.addChild(this.subtitle);

    const storySize = layout.isMobile ? (layout.isPortrait ? 14 : 13) : 18;
    const storyLineHeight = layout.isMobile ? 22 : 28;
    this.flavor = new PIXI.Text(
      'Stokmarknes er under angrep!\nRølp, gris og mongo invaderer.\nKun Eirik kan redde dagen.',
      {
        fontFamily: 'Courier New',
        fontSize: storySize,
        fill: '#ffffff',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: clampTextWidth(width * (layout.isMobile ? 0.85 : 0.75), { width, height }),
        lineHeight: storyLineHeight
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

    const controlsText = layout.isMobile
      ? 'TOUCH: Drag to move | Tap FIRE button to shoot'
      : 'WASD/Piltaster: Bevegelse | SPACE: Skyt | SHIFT: Dodge';
    const controlsSize = layout.isMobile ? 12 : 14;
    this.controls = new PIXI.Text(controlsText, {
      fontFamily: 'Courier New',
      fontSize: controlsSize,
      fill: '#888888',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.9, { width, height }),
      lineHeight: layout.isMobile ? 18 : 20
    });
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
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);
    const startY = layout.isMobile && layout.isPortrait ? layout.padding * 1.5 : layout.padding * 2;
    const stack = createVerticalStack(layout, { startY });

    this.title.x = width / 2;
    this.title.y = stack.next();

    this.subtitle.x = width / 2;
    this.subtitle.y = stack.next();

    const wrapWidth = layout.isMobile ? width * 0.85 : width * 0.75;
    this.flavor.style.wordWrapWidth = clampTextWidth(wrapWidth, layout);
    this.flavor.x = width / 2;
    this.flavor.y = stack.next(layout.isMobile ? -8 : 0);

    stack.addGap(layout.spacing * (layout.isMobile && layout.isPortrait ? 0.3 : 0.6));
    const buttonBaseY = stack.next(layout.isMobile ? 0.2 : 0.4);
    this.startBtn.x = width / 2;
    this.startBtn.y = buttonBaseY;

    this.highscoreBtn.x = width / 2;
    this.highscoreBtn.y = buttonBaseY + (layout.isMobile ? layout.spacing * 0.9 : layout.spacing);

    const controlsBottomOffset = layout.isMobile ? layout.padding * 2.5 : layout.padding + layout.lineHeight * 1.5;
    this.controls.y = height - controlsBottomOffset;
    this.controls.x = width / 2;

    const easterBottomOffset = layout.isMobile ? layout.padding * 0.8 : layout.padding / 2;
    this.easter.y = height - easterBottomOffset;
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
