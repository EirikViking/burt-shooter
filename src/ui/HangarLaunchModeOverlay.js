import * as PIXI from 'pixi.js';
import { RUN_MODES, getRunModeProfile } from '../game/RunMode.js';
import { translateText } from '../i18n/index.js';
import { createText } from '../utils/pixiText.js';
import { playMenuConfirmSfx, playMenuFocusSfx } from './MenuFxLayer.js';

const MODE_OPTIONS = Object.freeze([
  Object.freeze({
    id: RUN_MODES.MAYHEM_TACTICAL,
    accent: 0xff55d9,
    eyebrow: 'RECOMMENDED',
    summary: 'TACTICAL DRAFT AFTER EVERY BOSS'
  }),
  Object.freeze({
    id: RUN_MODES.RANKED,
    accent: 0xffd15c,
    eyebrow: 'ORIGINAL RULESET',
    summary: 'NO TACTICAL DRAFTS'
  })
]);

function drawCutPanel(graphics, x, y, width, height, color, alpha = 0.96) {
  const cut = Math.min(18, Math.max(9, height * 0.18));
  graphics.moveTo(x + cut, y);
  graphics.lineTo(x + width - cut, y);
  graphics.lineTo(x + width, y + cut);
  graphics.lineTo(x + width, y + height - cut);
  graphics.lineTo(x + width - cut, y + height);
  graphics.lineTo(x + cut, y + height);
  graphics.lineTo(x, y + height - cut);
  graphics.lineTo(x, y + cut);
  graphics.closePath();
  graphics.fill({ color, alpha });
}

function fitTextToWidth(node, maxWidth, minScale = 0.62) {
  node.scale.set(1);
  if (node.width > maxWidth) {
    node.scale.set(Math.max(minScale, maxWidth / Math.max(1, node.width)));
  }
}

export class HangarLaunchModeOverlay {
  constructor({ parent, width, height, shipName, onLaunch, onCancel }) {
    this.parent = parent;
    this.width = width;
    this.height = height;
    this.shipName = shipName || '';
    this.onLaunch = onLaunch;
    this.onCancel = onCancel;
    this.focusedIndex = 0;
    this.buttons = [];
    this.container = new PIXI.Container();
    this.container.label = 'ui_hangarLaunchModeOverlay';
    this.container.zIndex = 10000;
    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, width, height);
    this.create();
    this.parent.addChild(this.container);
  }

  create() {
    const { width, height } = this;
    const compact = width < 960 || height < 650;
    const backdrop = new PIXI.Graphics();
    backdrop.rect(0, 0, width, height);
    backdrop.fill({ color: 0x01040a, alpha: 0.84 });
    backdrop.eventMode = 'static';
    backdrop.on('pointerdown', (event) => event.stopPropagation?.());
    this.container.addChild(backdrop);

    const panelWidth = Math.min(width - (compact ? 36 : 96), compact ? 760 : 920);
    const panelHeight = Math.min(height - (compact ? 30 : 90), compact ? 470 : 520);
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;
    const panel = new PIXI.Graphics();
    drawCutPanel(panel, panelX, panelY, panelWidth, panelHeight, 0x04111e, 0.98);
    panel.stroke({ color: 0x37f5ff, width: 2, alpha: 0.9 });
    drawCutPanel(panel, panelX + 10, panelY + 10, panelWidth - 20, panelHeight - 20, 0x020914, 0.72);
    panel.stroke({ color: 0xff55d9, width: 1, alpha: 0.34 });
    this.container.addChild(panel);

    const title = createText(translateText('CHOOSE LAUNCH MODE'), {
      fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 26 : 34,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#001018',
      strokeThickness: 4
    });
    title.anchor.set(0.5);
    title.position.set(width / 2, panelY + (compact ? 42 : 52));
    fitTextToWidth(title, panelWidth - 80);
    this.container.addChild(title);

    const subtitle = createText(translateText('SELECT THE RULESET FOR THIS HULL'), {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 15 : 18,
      fontWeight: '800',
      fill: '#9cfbff'
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(width / 2, panelY + (compact ? 76 : 94));
    fitTextToWidth(subtitle, panelWidth - 80);
    this.container.addChild(subtitle);

    const ship = createText(String(this.shipName).toUpperCase(), {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 14 : 16,
      fontWeight: '900',
      fill: '#ffef7e'
    });
    ship.anchor.set(0.5);
    ship.position.set(width / 2, panelY + (compact ? 101 : 122));
    fitTextToWidth(ship, panelWidth - 100);
    this.container.addChild(ship);

    const gap = compact ? 14 : 20;
    const cardMargin = compact ? 24 : 38;
    const cardWidth = (panelWidth - cardMargin * 2 - gap) / 2;
    const cardHeight = compact ? 220 : 244;
    const cardY = panelY + (compact ? 124 : 154);
    MODE_OPTIONS.forEach((option, index) => {
      const cardX = panelX + cardMargin + index * (cardWidth + gap);
      this.createModeButton(option, index, cardX, cardY, cardWidth, cardHeight, compact);
    });

    const hint = createText(translateText('ARROWS / STICK: SELECT  |  ENTER / A: LAUNCH  |  ESC / B: BACK'), {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 12 : 14,
      fontWeight: '800',
      fill: '#b9dbe5'
    });
    hint.anchor.set(0.5);
    hint.position.set(width / 2, panelY + panelHeight - (compact ? 27 : 32));
    fitTextToWidth(hint, panelWidth - 50, 0.55);
    this.container.addChild(hint);
    this.setFocus(0, { silent: true });
  }

  createModeButton(option, index, x, y, width, height, compact) {
    const profile = getRunModeProfile(option.id);
    const button = new PIXI.Container();
    button.label = `ui_hangarLaunchMode_${option.id}`;
    button.position.set(x, y);
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.hitArea = new PIXI.Rectangle(0, 0, width, height);
    button._modeId = option.id;
    const glow = new PIXI.Graphics();
    const bg = new PIXI.Graphics();
    button.addChild(glow, bg);

    const eyebrow = createText(translateText(option.eyebrow), {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 12 : 14,
      fontWeight: '900',
      fill: option.id === RUN_MODES.MAYHEM_TACTICAL ? '#ff9be6' : '#ffe891'
    });
    eyebrow.position.set(20, 18);
    button.addChild(eyebrow);

    const label = createText(translateText(profile.label), {
      fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 20 : 25,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#001018',
      strokeThickness: 3
    });
    label.position.set(20, compact ? 50 : 56);
    fitTextToWidth(label, width - 40);
    button.addChild(label);

    const summary = createText(translateText(option.summary), {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 14 : 16,
      fontWeight: '800',
      fill: '#d8fbff',
      wordWrap: true,
      breakWords: true,
      wordWrapWidth: width - 40,
      lineHeight: compact ? 18 : 21
    });
    summary.position.set(20, compact ? 92 : 104);
    button.addChild(summary);

    const contract = createText(translateText('RANKED // LEADERBOARD // ACHIEVEMENTS'), {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 11 : 13,
      fontWeight: '800',
      fill: '#82dfe8',
      wordWrap: true,
      wordWrapWidth: width - 40,
      lineHeight: compact ? 15 : 17
    });
    contract.position.set(20, compact ? 143 : 160);
    button.addChild(contract);

    const launch = createText(translateText('LAUNCH'), {
      fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 15 : 18,
      fontWeight: '900',
      fill: '#081522'
    });
    launch.anchor.set(0.5);
    launch.position.set(width / 2, height - (compact ? 26 : 30));
    button.addChild(launch);

    button.redraw = () => {
      const focused = index === this.focusedIndex;
      const hovered = Boolean(button._hovered);
      glow.clear();
      bg.clear();
      if (focused || hovered) {
        drawCutPanel(glow, -6, -6, width + 12, height + 12, option.accent, focused ? 0.19 : 0.11);
      }
      drawCutPanel(bg, 0, 0, width, height, focused || hovered ? 0x09243a : 0x061522, 0.98);
      bg.stroke({ color: focused || hovered ? 0xffffff : option.accent, width: focused ? 3 : 2, alpha: focused || hovered ? 0.96 : 0.7 });
      drawCutPanel(bg, 18, height - (compact ? 47 : 52), width - 36, compact ? 34 : 38, option.accent, focused || hovered ? 0.98 : 0.82);
    };
    button.on('pointerover', () => {
      button._hovered = true;
      this.setFocus(index);
    });
    button.on('pointerout', () => {
      button._hovered = false;
      button.redraw();
    });
    button.on('pointerdown', (event) => {
      event.stopPropagation?.();
      this.activate(index);
    });
    this.buttons.push(button);
    this.container.addChild(button);
  }

  setFocus(index, { silent = false } = {}) {
    const next = (index + this.buttons.length) % this.buttons.length;
    if (!silent && next !== this.focusedIndex) playMenuFocusSfx(0.1);
    this.focusedIndex = next;
    this.buttons.forEach((button) => button.redraw?.());
  }

  move(direction) {
    this.setFocus(this.focusedIndex + Math.sign(direction || 1));
  }

  activate(index = this.focusedIndex) {
    const button = this.buttons[index];
    if (!button?._modeId) return false;
    playMenuConfirmSfx(0.2);
    this.onLaunch?.(button._modeId);
    return true;
  }

  cancel() {
    playMenuFocusSfx(0.08);
    this.onCancel?.();
    return true;
  }

  handleKey(event) {
    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      return this.cancel();
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.move(-1);
      return true;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'Tab') {
      event.preventDefault();
      this.move(event.shiftKey ? -1 : 1);
      return true;
    }
    if (event.key === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space') {
      event.preventDefault();
      return this.activate();
    }
    return false;
  }

  handleGamepad(nav) {
    if (nav.pressed.left || nav.pressed.up) this.move(-1);
    if (nav.pressed.right || nav.pressed.down) this.move(1);
    if (nav.pressed.confirm) this.activate();
    if (nav.pressed.cancel || nav.pressed.back || nav.pressed.menu) this.cancel();
  }

  getDebugState(getBounds) {
    return {
      visible: Boolean(this.container?.visible && this.container?.parent),
      focusedIndex: this.focusedIndex,
      focusedMode: this.buttons[this.focusedIndex]?._modeId || null,
      modes: Object.fromEntries(this.buttons.map((button) => [
        button._modeId,
        { focused: button._modeId === this.buttons[this.focusedIndex]?._modeId, bounds: getBounds?.(button) || null }
      ]))
    };
  }

  destroy() {
    if (this.container?.parent) this.container.parent.removeChild(this.container);
    this.container?.destroy({ children: true });
    this.container = null;
    this.buttons = [];
  }
}
