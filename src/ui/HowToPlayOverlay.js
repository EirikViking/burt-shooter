import * as PIXI from 'pixi.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { translateText } from '../i18n/index.js';
import { createText } from '../utils/pixiText.js';

const FONT_BODY = 'Rajdhani, Orbitron, Bahnschrift, Segoe UI, sans-serif';
const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, Eurostile, Bank Gothic, sans-serif';

const HELP_ROWS = Object.freeze([
  {
    label: 'MOVE',
    text: 'WASD / ARROWS / LEFT STICK'
  },
  {
    label: 'SHOOT',
    text: 'SPACE / GAMEPAD A'
  },
  {
    label: 'DODGE',
    text: 'SHIFT / GAMEPAD B. Short burst, best used through warning cones.'
  },
  {
    label: 'TRACTOR BEAMS',
    text: 'Destroy a tractor hijacker during its beam to break the pull and hijack nearby shots.'
  },
  {
    label: 'PICKUPS',
    text: 'Grab bright icons for shields, repairs, weapons, score boosts, and emergency tools.'
  },
  {
    label: 'UPGRADES',
    text: 'Permanent progress unlocks ships, traits, achievements, and Codex intel between runs.'
  },
  {
    label: 'RANKED RUNS',
    text: 'Launch Run submits scores when Steam is available. Sector Start Challenge is unranked practice.'
  }
]);

function fitTextToWidth(text, maxWidth, { minScale = 0.72 } = {}) {
  if (!text || !Number.isFinite(maxWidth) || maxWidth <= 0) return 1;
  text.scale.set(1);
  text.updateText?.(false);
  const measuredWidth = text.width || 0;
  const scale = measuredWidth > maxWidth
    ? Math.max(minScale, maxWidth / measuredWidth)
    : 1;
  text.scale.set(scale);
  return scale;
}

export class HowToPlayOverlay {
  constructor(game, { onClose = null } = {}) {
    this.game = game;
    this.onClose = onClose;
    this.container = new PIXI.Container();
    this.container.zIndex = 2100000;
    this.container.label = 'ui_howToPlayOverlay';
    this.closeButton = null;
    this.keyHandler = null;
    this.gamepadNavigator = new GamepadNavigator();
    this.gamepadNavigator.suppressUntilReleased();
    this.build();
    this.setupKeyboardNavigation();
  }

  build() {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compact = width < 720 || height < 640;
    const veryShort = height < 520;
    const spacious = width >= 1920 && height >= 1080;
    const panelWidth = Math.min(spacious ? 900 : 760, width * (compact ? 0.92 : 0.82));
    const panelHeight = Math.min(spacious ? 700 : 620, height * (compact ? 0.94 : 0.88));
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    const bodySize = veryShort ? 11 : spacious ? 22 : compact ? 15 : 18;
    const labelSize = veryShort ? 10 : spacious ? 19 : compact ? 13 : 15;
    const titleSize = veryShort ? 22 : spacious ? 42 : compact ? 27 : 34;
    const rowGap = veryShort ? 4 : compact ? 8 : spacious ? 15 : 11;
    const rowAreaTop = panelY + (veryShort ? 52 : compact ? 70 : 88);
    const rowAreaBottom = panelY + panelHeight - (veryShort ? 48 : compact ? 78 : 88);
    const rowAreaHeight = Math.max(180, rowAreaBottom - rowAreaTop);
    const rowHeight = Math.max(
      veryShort ? 28 : compact ? 38 : 48,
      Math.floor((rowAreaHeight - rowGap * (HELP_ROWS.length - 1)) / HELP_ROWS.length)
    );
    const contentWidth = panelWidth - (compact ? 44 : 72);
    const leftX = panelX + (compact ? 24 : 36);
    let y = rowAreaTop;

    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, width, height);

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x020713, alpha: 0.84 });
    dim.eventMode = 'static';
    this.container.addChild(dim);

    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x06111f, alpha: 0.97 });
    panel.stroke({ color: 0x37f5ff, width: 2, alpha: 0.92 });
    panel.roundRect(panelX + 10, panelY + 10, panelWidth - 20, panelHeight - 20, 6);
    panel.stroke({ color: 0xff55d9, width: 1, alpha: 0.24 });
    this.container.addChild(panel);

    const title = createText(translateText('HOW TO PLAY'), {
      fontFamily: FONT_DISPLAY,
      fontSize: titleSize,
      fontWeight: '900',
      fill: '#f6fbff',
      stroke: '#003344',
      strokeThickness: 5,
      align: 'center'
    });
    title.anchor.set(0.5);
    title.position.set(width / 2, panelY + (veryShort ? 28 : compact ? 38 : 48));
    fitTextToWidth(title, panelWidth - 52, { minScale: 0.62 });
    this.container.addChild(title);

    HELP_ROWS.forEach((row, index) => {
      const rowY = y + index * (rowHeight + rowGap);
      const bg = new PIXI.Graphics();
      bg.roundRect(leftX, rowY, contentWidth, rowHeight, 7);
      bg.fill({ color: index % 2 ? 0x031829 : 0x041d31, alpha: 0.7 });
      bg.stroke({ color: index % 2 ? 0xff55d9 : 0x37f5ff, width: 1, alpha: 0.45 });
      this.container.addChild(bg);

      const label = createText(translateText(row.label), {
        fontFamily: FONT_DISPLAY,
        fontSize: labelSize,
        fontWeight: '900',
        fill: '#7ee9ff',
        stroke: '#00111d',
        strokeThickness: 3
      });
      label.anchor.set(0, 0.5);
      label.position.set(leftX + 16, rowY + rowHeight / 2);
      fitTextToWidth(label, compact ? 118 : 160, { minScale: 0.58 });
      this.container.addChild(label);

      const copy = createText(translateText(row.text), {
        fontFamily: FONT_BODY,
        fontSize: bodySize,
        fontWeight: '700',
        fill: '#f8fbff',
        stroke: '#00111d',
        strokeThickness: 3,
        wordWrap: true,
        wordWrapWidth: contentWidth - (compact ? 160 : 210),
        lineHeight: Math.round(bodySize * 1.18)
      });
      copy.anchor.set(0, 0.5);
      copy.position.set(leftX + (compact ? 142 : 184), rowY + rowHeight / 2);
      this.container.addChild(copy);
    });

    const footer = createText(translateText('ESC / B: BACK'), {
      fontFamily: FONT_BODY,
      fontSize: spacious ? 18 : compact ? 13 : 15,
      fontWeight: '700',
      fill: '#9ed9e8',
      align: 'center'
    });
    footer.anchor.set(0.5);
    footer.position.set(width / 2, panelY + panelHeight - (veryShort ? 34 : compact ? 56 : 62));
    this.container.addChild(footer);

    this.closeButton = this.createButton(translateText('BACK'), width / 2, panelY + panelHeight - (veryShort ? 16 : compact ? 28 : 32), () => this.close(), {
      width: Math.min(220, panelWidth - 60),
      height: veryShort ? 25 : compact ? 32 : 38,
      fontSize: veryShort ? 12 : compact ? 16 : 18
    });
    this.container.addChild(this.closeButton);
  }

  createButton(label, x, y, onPress, { width = 220, height = 38, fontSize = 18 } = {}) {
    const button = new PIXI.Container();
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.activate = onPress;

    const focus = new PIXI.Graphics();
    const bg = new PIXI.Graphics();
    button.addChild(focus, bg);

    const draw = (hovered = false) => {
      focus.clear();
      focus.roundRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10, 8);
      focus.stroke({ color: hovered ? 0xffffff : 0xffef7e, width: 2, alpha: hovered ? 0.92 : 0.74 });
      bg.clear();
      bg.roundRect(-width / 2, -height / 2, width, height, 6);
      bg.fill({ color: hovered ? 0x0b6f8f : 0x07334e, alpha: hovered ? 0.94 : 0.86 });
      bg.stroke({ color: hovered ? 0xffffff : 0x00ffff, width: hovered ? 2 : 1, alpha: 0.95 });
    };
    draw(false);
    button.redraw = draw;

    const text = createText(label, {
      fontFamily: FONT_DISPLAY,
      fontSize,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#00111d',
      strokeThickness: 3
    });
    text.anchor.set(0.5);
    button.addChild(text);
    button.position.set(x, y);
    button.on('pointerover', () => draw(true));
    button.on('pointerout', () => draw(false));
    button.on('pointertap', onPress);
    return button;
  }

  setupKeyboardNavigation() {
    this.keyHandler = (event) => {
      const key = event.key || event.code;
      const handled = ['Enter', ' ', 'Escape'].includes(key) || event.code === 'Space' || event.code === 'NumpadEnter';
      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
      this.close();
    };
    window.addEventListener('keydown', this.keyHandler, true);
  }

  update() {
    const nav = this.gamepadNavigator.update();
    if (!nav.connected || !nav.active) return;
    if (nav.pressed.confirm || nav.pressed.cancel || nav.pressed.menu || nav.pressed.back) {
      this.close();
    }
  }

  getDebugState() {
    return {
      visible: Boolean(this.container?.parent),
      rows: HELP_ROWS.map((row) => row.label),
      focusedControl: 'back'
    };
  }

  close() {
    if (this.keyHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
    if (this.container?.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
    this.onClose?.();
  }
}
