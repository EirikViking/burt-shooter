import * as PIXI from 'pixi.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { translateText } from '../i18n/index.js';
import { createText } from '../utils/pixiText.js';
import { destroyMenuFx, installMenuFx, playMenuConfirmSfx, playMenuFocusSfx, updateMenuFx } from './MenuFxLayer.js';

const FONT_BODY = 'Rajdhani, Orbitron, Bahnschrift, Segoe UI, sans-serif';
const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, Eurostile, Bank Gothic, sans-serif';

const HELP_ROWS = Object.freeze([
  {
    code: '01',
    label: 'MOVE',
    control: 'WASD / ARROWS / LEFT STICK',
    tip: 'Stay mobile. Controlled movement keeps you alive longer than drifting into open space.',
    accent: 0x37f5ff
  },
  {
    code: '02',
    label: 'SHOOT',
    control: 'SPACE / GAMEPAD A',
    tip: 'Hold fire and choose targets. Clearing the right enemies keeps the run under control.',
    accent: 0xffef7e
  },
  {
    code: '03',
    label: 'PHASE BURST',
    control: 'SHIFT / GAMEPAD B',
    tip: 'Tap to phase through danger for a short moment. It protects you briefly, but it does not move the ship for you.',
    accent: 0xff55d9
  },
  {
    code: '04',
    label: 'COMBOS',
    control: 'FAST KILLS KEEP THE CHAIN',
    tip: 'Destroy enemies quickly to keep the chain alive. Tough targets can slow the rhythm, so target choice matters.',
    accent: 0xff8f5a
  },
  {
    code: '05',
    label: 'NEAR MISS',
    control: 'SKIM DANGER, THEN ESCAPE',
    tip: 'Pass close to enemy shots without getting hit to build near-miss score. Risk pays, but do not live in the bullet cloud.',
    accent: 0x66ff9d
  },
  {
    code: '06',
    label: 'TRACTOR SHIPS',
    control: 'BREAK ACTIVE BEAMS',
    tip: 'Destroy tractor ships during their beam to break the pull, clear nearby shots, and hijack enemies for bonus score.',
    accent: 0x7ee9ff
  },
  {
    code: '07',
    label: 'PICKUPS & BONUS',
    control: 'BRIGHT ICONS ARE SAFE',
    tip: 'Collect bright pickup icons. Shoot bonus drones for extra score and watch for the BONUS popup.',
    accent: 0xb285ff
  },
  {
    code: '08',
    label: 'RUN MODES',
    control: 'MAYHEM / SCOUT / SECTOR RUN',
    tip: 'Mayhem is the ranked climb. Scout is practice. Sector Run lets you rehearse unlocked later starts.',
    accent: 0xff8f5a
  }
]);

function rectsOverlap(a, b, pad = 0) {
  if (!a || !b) return false;
  return !(
    a.x + a.width + pad <= b.x
    || b.x + b.width + pad <= a.x
    || a.y + a.height + pad <= b.y
    || b.y + b.height + pad <= a.y
  );
}

function fitTextToBox(text, maxWidth, maxHeight = Infinity, { minScale = 0.62 } = {}) {
  if (!text || !Number.isFinite(maxWidth) || maxWidth <= 0) return 1;
  text.scale.set(1);
  text.updateText?.(false);
  const measuredWidth = Math.max(1, text.width || 1);
  const measuredHeight = Math.max(1, text.height || 1);
  const widthScale = maxWidth / measuredWidth;
  const heightScale = Number.isFinite(maxHeight) && maxHeight > 0 ? maxHeight / measuredHeight : 1;
  const scale = Math.min(1, Math.max(minScale, Math.min(widthScale, heightScale)));
  text.scale.set(scale);
  return scale;
}

function addGlowLine(container, x1, y1, x2, y2, color, alpha = 0.45) {
  const glow = new PIXI.Graphics();
  glow.moveTo(x1, y1);
  glow.lineTo(x2, y2);
  glow.stroke({ color, width: 3, alpha: alpha * 0.28 });
  glow.moveTo(x1, y1);
  glow.lineTo(x2, y2);
  glow.stroke({ color, width: 1, alpha });
  container.addChild(glow);
  return glow;
}

function drawCornerBrackets(container, x, y, width, height, color) {
  const g = new PIXI.Graphics();
  const l = Math.min(32, Math.max(18, width * 0.035));
  const points = [
    [x, y + l, x, y, x + l, y],
    [x + width - l, y, x + width, y, x + width, y + l],
    [x + width, y + height - l, x + width, y + height, x + width - l, y + height],
    [x + l, y + height, x, y + height, x, y + height - l]
  ];
  for (const [x1, y1, x2, y2, x3, y3] of points) {
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineTo(x3, y3);
  }
  g.stroke({ color, width: 3, alpha: 0.92 });
  container.addChild(g);
  return g;
}

export class HowToPlayOverlay {
  constructor(game, { onClose = null } = {}) {
    this.game = game;
    this.onClose = onClose;
    this.container = new PIXI.Container();
    this.container.zIndex = 2100000;
    this.container.label = 'ui_howToPlayOverlay';
    this.container.sortableChildren = true;
    this.menuFx = null;
    this.closeButton = null;
    this.keyHandler = null;
    this.debugLayout = null;
    this.gamepadNavigator = new GamepadNavigator();
    this.gamepadNavigator.suppressUntilReleased();
    this.build();
    this.setupKeyboardNavigation();
  }

  build() {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compact = width < 900 || height < 700;
    const veryShort = height < 560;
    const spacious = width >= 1800 && height >= 980;
    const panelWidth = Math.min(spacious ? 1180 : 1040, width * (compact ? 0.94 : 0.88));
    const panelHeight = Math.min(spacious ? 760 : 690, height * (compact ? 0.94 : 0.9));
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    const pad = veryShort ? 18 : compact ? 24 : 34;
    const headerHeight = veryShort ? 86 : compact ? 104 : 128;
    const footerHeight = veryShort ? 62 : compact ? 76 : 86;
    const gridGap = veryShort ? 8 : compact ? 10 : 14;
    const columns = compact ? 1 : 2;
    const visualRows = compact ? HELP_ROWS.length : Math.ceil((HELP_ROWS.length + 1) / columns);
    const gridX = panelX + pad;
    const gridY = panelY + headerHeight;
    const gridWidth = panelWidth - pad * 2;
    const gridHeight = panelHeight - headerHeight - footerHeight - pad * 0.35;
    const cardWidth = columns === 1
      ? gridWidth
      : (gridWidth - gridGap) / 2;
    const cardHeight = Math.max(
      veryShort ? 42 : compact ? 54 : 92,
      Math.floor((gridHeight - gridGap * (visualRows - 1)) / visualRows)
    );
    const titleSize = veryShort ? 24 : spacious ? 46 : compact ? 31 : 40;
    const subtitleSize = veryShort ? 11 : spacious ? 16 : compact ? 12 : 14;
    const labelSize = veryShort ? 11 : spacious ? 16 : compact ? 13 : 15;
    const controlSize = veryShort ? 11 : spacious ? 17 : compact ? 13 : 15;
    const tipSize = veryShort ? 11 : spacious ? 16 : compact ? 12 : 15;
    const cardLayouts = [];

    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, width, height);

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x010611, alpha: 0.88 });
    dim.eventMode = 'static';
    this.container.addChild(dim);
    installMenuFx(this, {
      label: 'ui_menuFxHowToPlay',
      zIndex: 0,
      accent: 0x37f5ff,
      secondary: 0xff55d9,
      gold: 0xffef7e,
      intensity: 0.72,
      density: 0.8,
      alpha: 0.46,
      openVolume: 0.2
    });

    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x050d1a, alpha: 0.98 });
    panel.stroke({ color: 0x37f5ff, width: 2, alpha: 0.95 });
    panel.roundRect(panelX + 10, panelY + 10, panelWidth - 20, panelHeight - 20, 6);
    panel.stroke({ color: 0xff55d9, width: 1, alpha: 0.28 });
    panel.roundRect(panelX + pad * 0.62, panelY + pad * 0.62, panelWidth - pad * 1.24, panelHeight - pad * 1.24, 6);
    panel.stroke({ color: 0x2affd8, width: 1, alpha: 0.12 });
    this.container.addChild(panel);
    drawCornerBrackets(this.container, panelX + 6, panelY + 6, panelWidth - 12, panelHeight - 12, 0x37f5ff);

    for (let i = 1; i <= 5; i += 1) {
      const y = panelY + headerHeight + i * (gridHeight / 6);
      addGlowLine(this.container, panelX + pad, y, panelX + panelWidth - pad, y, 0x174f70, 0.18);
    }

    const sideRail = new PIXI.Graphics();
    sideRail.roundRect(panelX + pad, panelY + pad, compact ? 6 : 8, headerHeight - pad * 0.8, 4);
    sideRail.fill({ color: 0x37f5ff, alpha: 0.68 });
    sideRail.roundRect(panelX + panelWidth - pad - (compact ? 6 : 8), panelY + pad, compact ? 6 : 8, headerHeight - pad * 0.8, 4);
    sideRail.fill({ color: 0xff55d9, alpha: 0.54 });
    this.container.addChild(sideRail);

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
    title.position.set(width / 2, panelY + (veryShort ? 31 : compact ? 42 : 52));
    fitTextToBox(title, panelWidth - pad * 3, 54, { minScale: 0.58 });
    this.container.addChild(title);

    const subtitle = createText(translateText('FIGHT SMART. SCORE HIGH. SURVIVE LONGER.'), {
      fontFamily: FONT_BODY,
      fontSize: subtitleSize,
      fontWeight: '800',
      fill: '#9bf8ff',
      stroke: '#00111d',
      strokeThickness: 2,
      letterSpacing: 0,
      align: 'center'
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(width / 2, panelY + (veryShort ? 57 : compact ? 70 : 82));
    fitTextToBox(subtitle, panelWidth - pad * 4, 22, { minScale: 0.62 });
    this.container.addChild(subtitle);

    const chipText = createText(translateText('PILOT LINK // MANUAL OVERRIDE'), {
      fontFamily: FONT_BODY,
      fontSize: subtitleSize,
      fontWeight: '900',
      fill: '#ffef7e',
      stroke: '#130a00',
      strokeThickness: 2,
      align: 'center'
    });
    chipText.anchor.set(0.5);
    chipText.position.set(width / 2, panelY + (veryShort ? 75 : compact ? 91 : 106));
    fitTextToBox(chipText, panelWidth - pad * 5, 20, { minScale: 0.58 });
    this.container.addChild(chipText);

    HELP_ROWS.forEach((row, index) => {
      const isWideFinalCard = columns > 1 && index === HELP_ROWS.length - 1;
      const finalWideRow = Math.ceil((HELP_ROWS.length - 1) / columns);
      const column = columns === 1 || isWideFinalCard ? 0 : index % columns;
      const rowIndex = columns === 1 ? index : isWideFinalCard ? finalWideRow : Math.floor(index / columns);
      const cardX = gridX + column * (cardWidth + gridGap);
      const cardY = gridY + rowIndex * (cardHeight + gridGap);
      const actualCardWidth = isWideFinalCard ? gridWidth : cardWidth;
      this.addHelpCard(row, {
        x: cardX,
        y: cardY,
        width: actualCardWidth,
        height: cardHeight,
        compact,
        veryShort,
        labelSize,
        controlSize,
        tipSize
      });
      cardLayouts.push({
        code: row.code,
        label: row.label,
        x: Math.round(cardX),
        y: Math.round(cardY),
        width: Math.round(actualCardWidth),
        height: Math.round(cardHeight)
      });
    });

    const footerY = panelY + panelHeight - footerHeight;
    const footerRail = new PIXI.Graphics();
    footerRail.roundRect(panelX + pad, footerY + 8, panelWidth - pad * 2, footerHeight - 16, 7);
    footerRail.fill({ color: 0x03121d, alpha: 0.72 });
    footerRail.stroke({ color: 0x37f5ff, width: 1, alpha: 0.28 });
    this.container.addChild(footerRail);

    const footer = createText(translateText('ESC / B: BACK'), {
      fontFamily: FONT_BODY,
      fontSize: veryShort ? 11 : spacious ? 16 : compact ? 12 : 14,
      fontWeight: '900',
      fill: '#9ed9e8',
      stroke: '#00111d',
      strokeThickness: 2,
      align: compact ? 'center' : 'left'
    });
    footer.anchor.set(compact ? 0.5 : 0, 0.5);
    footer.position.set(
      compact ? width / 2 : panelX + pad + 20,
      footerY + (compact ? 22 : footerHeight / 2)
    );
    fitTextToBox(footer, compact ? panelWidth - pad * 4 : panelWidth * 0.44, 24, { minScale: 0.62 });
    this.container.addChild(footer);

    const buttonWidth = Math.min(compact ? 230 : 260, panelWidth - pad * 2.5);
    const buttonHeight = veryShort ? 30 : compact ? 34 : 40;
    const buttonX = compact ? width / 2 : panelX + panelWidth - pad - buttonWidth / 2 - 8;
    const buttonY = compact ? footerY + footerHeight - 24 : footerY + footerHeight / 2;
    this.closeButton = this.createButton(translateText('BACK'), buttonX, buttonY, () => this.close(), {
      width: buttonWidth,
      height: buttonHeight,
      fontSize: veryShort ? 13 : compact ? 16 : 18
    });
    this.container.addChild(this.closeButton);

    const footerBounds = {
      x: Math.round(panelX + pad),
      y: Math.round(footerY + 8),
      width: Math.round(panelWidth - pad * 2),
      height: Math.round(footerHeight - 16)
    };
    const buttonBounds = {
      x: Math.round(buttonX - buttonWidth / 2 - 5),
      y: Math.round(buttonY - buttonHeight / 2 - 5),
      width: Math.round(buttonWidth + 10),
      height: Math.round(buttonHeight + 10)
    };
    const layoutWarnings = [];
    for (const card of cardLayouts) {
      if (rectsOverlap(card, footerBounds, 4)) {
        layoutWarnings.push(`card ${card.code} overlaps footer`);
      }
      if (rectsOverlap(card, buttonBounds, 4)) {
        layoutWarnings.push(`card ${card.code} overlaps back button`);
      }
    }
    for (let i = 0; i < cardLayouts.length; i += 1) {
      for (let j = i + 1; j < cardLayouts.length; j += 1) {
        if (rectsOverlap(cardLayouts[i], cardLayouts[j], 2)) {
          layoutWarnings.push(`card ${cardLayouts[i].code} overlaps card ${cardLayouts[j].code}`);
        }
      }
    }
    this.debugLayout = {
      compact,
      veryShort,
      columns,
      panel: {
        x: Math.round(panelX),
        y: Math.round(panelY),
        width: Math.round(panelWidth),
        height: Math.round(panelHeight)
      },
      cards: cardLayouts,
      footer: footerBounds,
      button: buttonBounds,
      layoutWarnings
    };
  }

  addHelpCard(row, layout) {
    const { x, y, width, height, compact, veryShort, labelSize, controlSize, tipSize } = layout;
    const accent = row.accent;
    const card = new PIXI.Graphics();
    card.roundRect(x, y, width, height, 8);
    card.fill({ color: 0x061a2b, alpha: 0.9 });
    card.stroke({ color: accent, width: 1, alpha: 0.58 });
    card.rect(x, y, Math.max(4, Math.min(7, width * 0.018)), height);
    card.fill({ color: accent, alpha: 0.75 });
    card.roundRect(x + 12, y + 12, veryShort ? 28 : 36, veryShort ? 20 : 26, 5);
    card.fill({ color: 0x010814, alpha: 0.82 });
    card.stroke({ color: accent, width: 1, alpha: 0.7 });
    this.container.addChild(card);

    const code = createText(row.code, {
      fontFamily: FONT_DISPLAY,
      fontSize: veryShort ? 9 : 11,
      fontWeight: '900',
      fill: '#f6fbff',
      align: 'center'
    });
    code.anchor.set(0.5);
    code.position.set(x + 12 + (veryShort ? 14 : 18), y + 12 + (veryShort ? 10 : 13));
    this.container.addChild(code);

    const textX = x + (veryShort ? 50 : 62);
    const rightPad = compact ? 18 : 22;
    const labelMax = compact ? Math.min(210, width * 0.34) : Math.min(170, width * 0.34);
    const controlX = textX + labelMax + (compact ? 12 : 18);
    const controlMax = Math.max(120, x + width - rightPad - controlX);
    const topY = y + (veryShort ? 17 : 23);
    const tipY = y + (veryShort ? 31 : 52);
    const tipMaxHeight = Math.max(14, y + height - tipY - (veryShort ? 6 : 10));

    const label = createText(translateText(row.label), {
      fontFamily: FONT_DISPLAY,
      fontSize: labelSize,
      fontWeight: '900',
      fill: '#7ee9ff',
      stroke: '#00111d',
      strokeThickness: 3
    });
    label.anchor.set(0, 0.5);
    label.position.set(textX, topY);
    fitTextToBox(label, labelMax, height * 0.36, { minScale: 0.54 });
    this.container.addChild(label);

    const control = createText(translateText(row.control), {
      fontFamily: FONT_BODY,
      fontSize: controlSize,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#00111d',
      strokeThickness: 3,
      wordWrap: true,
      wordWrapWidth: controlMax,
      lineHeight: Math.round(controlSize * 1.05)
    });
    control.anchor.set(0, 0.5);
    control.position.set(controlX, topY);
    fitTextToBox(control, controlMax, height * 0.42, { minScale: 0.55 });
    this.container.addChild(control);

    const tip = createText(translateText(row.tip), {
      fontFamily: FONT_BODY,
      fontSize: tipSize,
      fontWeight: '700',
      fill: '#cfefff',
      stroke: '#00111d',
      strokeThickness: 2,
      wordWrap: true,
      wordWrapWidth: width - (textX - x) - rightPad,
      lineHeight: Math.round(tipSize * 1.12)
    });
    tip.anchor.set(0, 0);
    tip.position.set(textX, tipY);
    fitTextToBox(tip, width - (textX - x) - rightPad, tipMaxHeight, { minScale: veryShort ? 0.48 : 0.56 });
    this.container.addChild(tip);
  }

  createButton(label, x, y, onPress, { width = 220, height = 38, fontSize = 18 } = {}) {
    const button = new PIXI.Container();
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.activate = onPress;

    const focus = new PIXI.Graphics();
    const bg = new PIXI.Graphics();
    const sweep = new PIXI.Graphics();
    button.addChild(focus, bg, sweep);

    const draw = (hovered = false) => {
      focus.clear();
      focus.roundRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10, 8);
      focus.stroke({ color: hovered ? 0xffffff : 0xffef7e, width: 2, alpha: hovered ? 0.92 : 0.74 });
      bg.clear();
      bg.roundRect(-width / 2, -height / 2, width, height, 6);
      bg.fill({ color: hovered ? 0x0b6f8f : 0x07334e, alpha: hovered ? 0.94 : 0.9 });
      bg.stroke({ color: hovered ? 0xffffff : 0x00ffff, width: hovered ? 2 : 1, alpha: 0.95 });
      sweep.clear();
      sweep.rect(-width / 2 + 8, -height / 2 + 5, width - 16, 3);
      sweep.fill({ color: hovered ? 0xffffff : 0x37f5ff, alpha: hovered ? 0.5 : 0.32 });
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
    fitTextToBox(text, width - 24, height - 8, { minScale: 0.62 });
    button.addChild(text);
    button.position.set(x, y);
    button.on('pointerover', () => {
      playMenuFocusSfx(0.1);
      draw(true);
    });
    button.on('pointerout', () => draw(false));
    button.on('pointertap', () => {
      playMenuConfirmSfx(0.16);
      this.menuFx?.burst?.(x, y, { color: 0xffef7e, radius: 86, durationMs: 420 });
      onPress?.();
    });
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

  update(delta = 1) {
    updateMenuFx(this, delta);
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
      cardCount: HELP_ROWS.length,
      focusedControl: 'back',
      layout: this.debugLayout,
      menuFx: this.menuFx?.getDebugState?.() || null
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
    destroyMenuFx(this);
    this.container.destroy({ children: true });
    this.onClose?.();
  }
}
