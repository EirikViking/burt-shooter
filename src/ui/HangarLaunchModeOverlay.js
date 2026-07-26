import * as PIXI from 'pixi.js';
import { deriveDailySignalContract } from '../config/DailyCabinetSignal.js';
import {
  RUN_MODES,
  getOverrunStartState,
  getRunModeProfile,
  getSectorStartState
} from '../game/RunMode.js';
import { readScoutAnomalySelection } from '../game/ScoutAnomalies.js';
import { translateText } from '../i18n/index.js';
import { readHangarProgressState } from '../progression/HangarProgressState.js';
import { createText } from '../utils/pixiText.js';
import { playMenuConfirmSfx, playMenuFocusSfx } from './MenuFxLayer.js';

const SECTOR_START_SELECTION_STORAGE_KEY = 'nova_swarm_sector_start_selection_v1';

function readRememberedSectorCheckpoint() {
  try {
    const value = Number(localStorage.getItem(SECTOR_START_SELECTION_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
  } catch {
    return null;
  }
}

export function getHangarLaunchModeOptions() {
  const progress = readHangarProgressState();
  const dailyContract = deriveDailySignalContract();
  const scoutAnomaly = readScoutAnomalySelection();
  const sectorState = getSectorStartState(progress, readRememberedSectorCheckpoint());
  const overrunState = getOverrunStartState(progress);
  const sectorCheckpoint = sectorState.selectedCheckpoint
    || sectorState.checkpoints?.[sectorState.checkpoints.length - 1]
    || null;
  return [
    {
      id: RUN_MODES.MAYHEM_TACTICAL,
      accent: 0xff55d9,
      eyebrow: 'RECOMMENDED',
      summary: 'TACTICAL DRAFT AFTER EVERY BOSS',
      enabled: true
    },
    {
      id: RUN_MODES.RANKED,
      accent: 0xffd15c,
      eyebrow: 'ORIGINAL RULESET',
      summary: 'NO TACTICAL DRAFTS',
      enabled: true
    },
    {
      id: RUN_MODES.DAILY_SIGNAL,
      accent: 0x7dffcc,
      eyebrow: 'DAILY CHALLENGE',
      summary: 'LOCAL DAILY // LOANER HULL',
      detail: translateText('TODAY\'S LOANER: {ship}', { ship: dailyContract.loanerShipName }),
      dailySignalContract: dailyContract,
      launchShipKey: dailyContract.loanerShipKey,
      enabled: true
    },
    {
      id: RUN_MODES.SCOUT,
      accent: 0x7db7ff,
      eyebrow: 'PRACTICE',
      summary: 'UNRANKED // NO ACHIEVEMENTS',
      detail: translateText('ANOMALY: {anomaly}', { anomaly: translateText(scoutAnomaly.name) }),
      scoutAnomalyId: scoutAnomaly.id,
      enabled: true
    },
    {
      id: RUN_MODES.SECTOR_START,
      accent: 0x37f5ff,
      eyebrow: 'CHECKPOINT PRACTICE',
      summary: sectorCheckpoint
        ? translateText('CHECKPOINT: SECTOR {sector}', { sector: sectorCheckpoint })
        : translateText('REACH SECTOR {sector} TO UNLOCK', { sector: 5 }),
      startSector: sectorCheckpoint,
      enabled: Boolean(sectorState.available && sectorCheckpoint)
    },
    {
      id: RUN_MODES.OVERRUN_TACTICAL,
      accent: 0xa77dff,
      eyebrow: 'ENDLESS CAREER',
      summary: overrunState.available
        ? 'CAREER // NO LEADERBOARD'
        : translateText('REACH SECTOR {sector} TO UNLOCK', { sector: overrunState.requiredSector }),
      enabled: Boolean(overrunState.available)
    },
    {
      id: RUN_MODES.OVERRUN_PURE,
      accent: 0xff6a2a,
      eyebrow: 'ENDLESS CAREER',
      summary: overrunState.available
        ? 'CAREER // NO LEADERBOARD'
        : translateText('REACH SECTOR {sector} TO UNLOCK', { sector: overrunState.requiredSector }),
      enabled: Boolean(overrunState.available)
    }
  ];
}

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
  constructor({ parent, width, height, shipName, options = getHangarLaunchModeOptions(), onLaunch, onCancel }) {
    this.parent = parent;
    this.width = width;
    this.height = height;
    this.shipName = shipName || '';
    this.options = options;
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
    const compact = width < 1100 || height < 650;
    const backdrop = new PIXI.Graphics();
    backdrop.rect(0, 0, width, height);
    backdrop.fill({ color: 0x01040a, alpha: 0.84 });
    backdrop.eventMode = 'static';
    backdrop.on('pointerdown', (event) => event.stopPropagation?.());
    this.container.addChild(backdrop);

    const panelWidth = Math.min(width - (compact ? 24 : 64), 1160);
    const panelHeight = Math.min(height - (compact ? 18 : 50), compact ? 600 : 680);
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
      fontSize: compact ? 24 : 32,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#001018',
      strokeThickness: 4
    });
    title.anchor.set(0.5);
    title.position.set(width / 2, panelY + (compact ? 32 : 40));
    fitTextToWidth(title, panelWidth - 80);
    this.container.addChild(title);

    const subtitle = createText(translateText('SELECT THE RULESET FOR THIS HULL'), {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 13 : 16,
      fontWeight: '800',
      fill: '#9cfbff'
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(width / 2, panelY + (compact ? 59 : 72));
    fitTextToWidth(subtitle, panelWidth - 80);
    this.container.addChild(subtitle);

    const ship = createText(String(this.shipName).toUpperCase(), {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 12 : 14,
      fontWeight: '900',
      fill: '#ffef7e'
    });
    ship.anchor.set(0.5);
    ship.position.set(width / 2, panelY + (compact ? 82 : 96));
    fitTextToWidth(ship, panelWidth - 100);
    this.container.addChild(ship);

    const columns = compact ? 3 : 4;
    this.columns = columns;
    const rows = Math.ceil(this.options.length / columns);
    const gap = compact ? 9 : 13;
    const cardMargin = compact ? 16 : 26;
    const cardTop = panelY + (compact ? 100 : 116);
    const cardBottom = panelY + panelHeight - (compact ? 42 : 50);
    const cardWidth = (panelWidth - cardMargin * 2 - gap * (columns - 1)) / columns;
    const cardHeight = (cardBottom - cardTop - gap * (rows - 1)) / rows;
    this.options.forEach((option, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const itemsInRow = Math.min(columns, this.options.length - row * columns);
      const rowOffset = (columns - itemsInRow) * (cardWidth + gap) * 0.5;
      const cardX = panelX + cardMargin + rowOffset + column * (cardWidth + gap);
      const cardY = cardTop + row * (cardHeight + gap);
      this.createModeButton(option, index, cardX, cardY, cardWidth, cardHeight, compact);
    });

    const hint = createText(translateText('ARROWS / STICK: SELECT  |  ENTER / A: LAUNCH  |  ESC / B: BACK'), {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 10 : 12,
      fontWeight: '800',
      fill: '#b9dbe5'
    });
    hint.anchor.set(0.5);
    hint.position.set(width / 2, panelY + panelHeight - (compact ? 19 : 24));
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
    button.cursor = option.enabled === false ? 'default' : 'pointer';
    button.hitArea = new PIXI.Rectangle(0, 0, width, height);
    button._modeId = option.id;
    button._option = option;
    const glow = new PIXI.Graphics();
    const bg = new PIXI.Graphics();
    button.addChild(glow, bg);

    const eyebrow = createText(translateText(option.eyebrow), {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 9 : 11,
      fontWeight: '900',
      fill: option.id === RUN_MODES.MAYHEM_TACTICAL ? '#ff9be6' : '#ffe891'
    });
    eyebrow.position.set(14, 11);
    fitTextToWidth(eyebrow, width - 28, 0.55);
    button.addChild(eyebrow);

    const label = createText(translateText(profile.label), {
      fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 14 : 18,
      fontWeight: '900',
      fill: option.enabled === false ? '#778895' : '#ffffff',
      stroke: '#001018',
      strokeThickness: 3
    });
    label.position.set(14, compact ? 32 : 36);
    fitTextToWidth(label, width - 28, 0.5);
    button.addChild(label);

    const summary = createText(translateText(option.summary), {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 10 : 12,
      fontWeight: '800',
      fill: option.enabled === false ? '#7d8b98' : '#d8fbff',
      wordWrap: true,
      breakWords: true,
      wordWrapWidth: width - 28,
      lineHeight: compact ? 12 : 15
    });
    summary.position.set(14, compact ? 58 : 66);
    button.addChild(summary);

    const contract = createText(option.detail || translateText(profile.subLabel), {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 8 : 10,
      fontWeight: '800',
      fill: option.enabled === false ? '#6e7c87' : '#82dfe8',
      wordWrap: true,
      wordWrapWidth: width - 28,
      lineHeight: compact ? 10 : 12
    });
    contract.position.set(14, compact ? 88 : 100);
    button.addChild(contract);

    const launch = createText(translateText(option.enabled === false ? 'LOCKED' : 'LAUNCH'), {
      fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 11 : 14,
      fontWeight: '900',
      fill: option.enabled === false ? '#93a0aa' : '#081522'
    });
    launch.anchor.set(0.5);
    launch.position.set(width / 2, height - (compact ? 17 : 20));
    button.addChild(launch);

    button.redraw = () => {
      const focused = index === this.focusedIndex;
      const hovered = Boolean(button._hovered);
      glow.clear();
      bg.clear();
      if (focused || hovered) {
        drawCutPanel(glow, -6, -6, width + 12, height + 12, option.accent, focused ? 0.19 : 0.11);
      }
      drawCutPanel(bg, 0, 0, width, height, focused || hovered ? 0x09243a : 0x061522, option.enabled === false ? 0.72 : 0.98);
      bg.stroke({ color: focused || hovered ? 0xffffff : option.accent, width: focused ? 3 : 2, alpha: option.enabled === false ? 0.36 : focused || hovered ? 0.96 : 0.7 });
      drawCutPanel(
        bg,
        12,
        height - (compact ? 31 : 36),
        width - 24,
        compact ? 24 : 28,
        option.enabled === false ? 0x263442 : option.accent,
        focused || hovered ? 0.98 : 0.82
      );
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
    if (!button?._modeId || button._option?.enabled === false) return false;
    playMenuConfirmSfx(0.2);
    this.onLaunch?.(button._option);
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
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.move(-1);
      return true;
    }
    if (event.key === 'ArrowRight' || event.key === 'Tab') {
      event.preventDefault();
      this.move(event.shiftKey ? -1 : 1);
      return true;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.setFocus(this.focusedIndex + (event.key === 'ArrowUp' ? -this.columns : this.columns));
      return true;
    }
    if (event.key === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space') {
      event.preventDefault();
      return this.activate();
    }
    return false;
  }

  handleGamepad(nav) {
    if (nav.pressed.left) this.move(-1);
    if (nav.pressed.right) this.move(1);
    if (nav.pressed.up) this.setFocus(this.focusedIndex - this.columns);
    if (nav.pressed.down) this.setFocus(this.focusedIndex + this.columns);
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
        {
          focused: button._modeId === this.buttons[this.focusedIndex]?._modeId,
          enabled: button._option?.enabled !== false,
          startSector: button._option?.startSector || null,
          scoutAnomalyId: button._option?.scoutAnomalyId || null,
          launchShipKey: button._option?.launchShipKey || null,
          bounds: getBounds?.(button) || null
        }
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
