import { drawAstraPanel } from '../ui/AstraConsole.js';
import * as PIXI from 'pixi.js';
import { ACHIEVEMENTS, ACHIEVEMENT_MODE_NAMES } from '../achievements/AchievementCatalog.js';
import { getAchievementDescriptionForLocale } from '../achievements/AchievementPresentation.js';
import { getOnslaughtCollectionItems } from '../achievements/OnslaughtAchievementProgress.js';
import { getBaseShipMetadata } from '../config/ShipMetadata.js';
import { getOnslaughtCollectionAugmentName } from '../i18n/onslaughtCollectionNames.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { createTextLayout, getResponsiveFontSize } from '../ui/textLayout.js';
import { createText } from '../utils/pixiText.js';
import { getCurrentLanguage, translateText } from '../i18n/index.js';
import { RUN_MODES } from '../game/RunMode.js';
import { destroyMenuFx, installMenuFx, playMenuConfirmSfx, playMenuFocusSfx, resizeMenuFx, updateMenuFx } from '../ui/MenuFxLayer.js';

const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, Eurostile, Bank Gothic, sans-serif';
const FONT_BODY = 'Rajdhani, Bahnschrift, Segoe UI, Arial, sans-serif';
const GAMEPAD_DEADZONE = 0.42;
const ACHIEVEMENT_ICON_BASE = '/art/generated/nova-swarm/achievements';
const MODE_OPTIONS = Object.freeze([
  RUN_MODES.MAYHEM_TACTICAL, RUN_MODES.RANKED, RUN_MODES.OVERRUN_TACTICAL,
  RUN_MODES.OVERRUN_PURE, RUN_MODES.SCOUT, RUN_MODES.SECTOR_START, RUN_MODES.DAILY_SIGNAL
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isGamepadButtonPressed(buttons, index) {
  const button = buttons?.[index];
  if (button == null) return false;
  if (typeof button === 'number') return button > 0.5;
  return Boolean(button.pressed || button.value > 0.5);
}

function readGamepadSnapshot() {
  const override = typeof window !== 'undefined' ? window.__burtGamepadOverride : null;
  if (override) {
    return {
      id: override.id || 'virtual-gamepad',
      index: Number.isFinite(override.index) ? override.index : 0,
      axes: Array.isArray(override.axes) ? override.axes : [override.moveX || 0, override.moveY || 0],
      buttons: Array.isArray(override.buttons) ? override.buttons : [],
      connected: override.connected !== false
    };
  }

  const nativePads = typeof window !== 'undefined' && window.__novaNativeGamepads?.getGamepads
    ? window.__novaNativeGamepads.getGamepads().filter(Boolean)
    : [];
  const activeNativePad = nativePads.find((pad) => pad && pad.connected && (
    (pad.axes || []).some((axis) => Math.abs(Number(axis) || 0) >= GAMEPAD_DEADZONE) ||
    (pad.buttons || []).some((button) => isGamepadButtonPressed([button], 0))
  ));
  if (activeNativePad) return activeNativePad;

  const pads = typeof navigator !== 'undefined' && navigator.getGamepads
    ? Array.from(navigator.getGamepads()).filter(Boolean)
    : [];
  return pads.find((pad) => pad && pad.connected) || nativePads.find((pad) => pad && pad.connected) || null;
}

function getBoundsDebug(displayObject) {
  try {
    if (!displayObject?.getBounds) return null;
    const bounds = displayObject.getBounds();
    return {
      x: Math.round(bounds.x || 0),
      y: Math.round(bounds.y || 0),
      width: Math.round(bounds.width || 0),
      height: Math.round(bounds.height || 0)
    };
  } catch {
    return null;
  }
}

function getAchievementIconPath(id, unlocked) {
  const state = unlocked ? 'achieved' : 'locked';
  return `${ACHIEVEMENT_ICON_BASE}/${id}-${state}.jpg`;
}

export class AchievementsScene {
  constructor(game, { onClose = null, overlay = false } = {}) {
    this.game = game;
    this.onClose = onClose;
    this.overlay = overlay;
    this.container = new PIXI.Container();
    this.backdrop = null;
    this.backdropShade = null;
    this.menuFx = null;
    this.panel = null;
    this.title = null;
    this.summary = null;
    this.hint = null;
    this.rowsContainer = new PIXI.Container();
    this.scrollRail = null;
    this.scrollThumb = null;
    this.pageText = null;
    this.backBtn = null;
    this.rows = [];
    this.rowDebug = [];
    this.catalogIntegrity = null;
    this.focusedIndex = 0;
    this.scrollOffset = 0;
    this.columns = 1;
    this.rowsPerColumn = 1;
    this.visibleCapacity = 1;
    this.rowHeight = 58;
    this.rowWidth = 520;
    this.listTop = 0;
    this.listLeft = 0;
    this.columnGap = 18;
    this.shortLayout = false;
    this.layoutUnsubscribe = null;
    this.keyHandler = null;
    this.wheelHandler = null;
    this.scrollDrag = null;
    this.scrollDragMoveHandler = null;
    this.scrollDragEndHandler = null;
    this.scrollBarDebug = null;
    this.gamepadPrevious = {};
    this.gamepadSuppressActiveInput = true;
    this.modeFilter = MODE_OPTIONS.includes(game?.achievementBrowserMode) ? game.achievementBrowserMode : RUN_MODES.MAYHEM_TACTICAL;
    this.availableOnly = game?.achievementBrowserAvailableOnly === true;
    this.groupFilter = game?.achievementBrowserGroup || 'challenges';
    this.detailOverlay = null;
  }

  init() {
    this.renderGeneration = (this.renderGeneration || 0) + 1;
    this.closeAchievementDetail();
    this.suppressGamepadUntilReleased();
    destroyMenuFx(this);
    this.cleanupDisplayObjects();
    this.container.sortableChildren = true;
    this.rows = this.buildRows();
    this.focusedIndex = clamp(this.focusedIndex, 0, Math.max(0, this.rows.length - 1));
    this.scrollOffset = 0;
    this.rowDebug = [];

    this.createBackdrop();
    installMenuFx(this, {
      label: 'ui_menuFxAchievements',
      zIndex: -8,
      accent: 0xffd15c,
      secondary: 0x37f5ff,
      gold: 0xffef7e,
      intensity: 0.72,
      density: 0.76,
      alpha: 0.5,
      openVolume: 0.22
    });
    this.createElements();
    this.setupKeyboard();
    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = addResponsiveListener(() => this.layoutScreen());
    this.layoutScreen();
  }

  buildRows() {
    const manager = this.game?.achievementManager;
    const seenIds = new Set();
    const duplicateIds = [];
    const rows = [];
    for (const achievement of ACHIEVEMENTS) {
      if (!achievement?.id || seenIds.has(achievement.id)) {
        if (achievement?.id) duplicateIds.push(achievement.id);
        continue;
      }
      seenIds.add(achievement.id);
      if (this.groupFilter === 'ranks' && achievement.type !== 'rank') continue;
      if (this.groupFilter === 'challenges' && achievement.type === 'rank') continue;
      const unlocked = Boolean(manager?.isUnlocked?.(achievement.id));
      if (this.availableOnly && !unlocked && !achievement.progressModes?.includes(this.modeFilter)
        && !achievement.completeModes?.includes(this.modeFilter)) continue;
      rows.push({
        achievement,
        unlocked
      });
    }
    this.catalogIntegrity = {
      sourceCount: ACHIEVEMENTS.length,
      rowCount: rows.length,
      uniqueIdCount: seenIds.size,
      duplicateIds,
      duplicatesDropped: duplicateIds.length
    };
    return rows;
  }

  clearRenderedRows() {
    if (!this.rowsContainer) return;
    const children = this.rowsContainer.removeChildren();
    children.forEach((child) => child?.destroy?.({ children: true }));
  }

  cleanupDisplayObjects() {
    this.clearRenderedRows();
    const children = this.container.removeChildren();
    children.forEach((child) => {
      if (child === this.rowsContainer) return;
      child?.destroy?.({ children: true });
    });
    this.backdrop = null;
    this.backdropShade = null;
    this.panel = null;
    this.title = null;
    this.summary = null;
    this.hint = null;
    this.scrollRail = null;
    this.scrollThumb = null;
    this.pageText = null;
    this.backBtn = null;
  }

  createBackdrop() {
    this.backdropShade = new PIXI.Graphics();
    this.backdropShade.zIndex = -20;
    this.container.addChild(this.backdropShade);

    const backdropSrc = AssetManifest.generated?.leaderboardHall || AssetManifest.generated?.menuBackdrop;
    if (!backdropSrc) return;
    const generation = this.renderGeneration;
    PIXI.Assets.load(backdropSrc).then((texture) => {
      if (generation !== this.renderGeneration || this.backdrop) return;
      if (this.game?.currentScene !== this && !this.overlay) return;
      this.backdrop = new PIXI.Sprite(texture);
      this.backdrop.anchor.set(0.5);
      this.backdrop.alpha = 0.5;
      this.backdrop.zIndex = -30;
      this.container.addChildAt(this.backdrop, 0);
      this.layoutBackdrop();
    }).catch(() => {
      // The screen is fully usable with the procedural shade.
    });
  }

  createElements() {
    this.panel = new PIXI.Graphics();
    this.panel.zIndex = -5;
    this.container.addChild(this.panel);

    this.title = createText('ACHIEVEMENTS', {
      fontFamily: FONT_DISPLAY,
      fontSize: 42,
      fontWeight: '900',
      fill: '#fff3a2',
      stroke: '#031323',
      strokeThickness: 5,
      align: 'center'
    });
    this.title.anchor.set(0.5);
    this.container.addChild(this.title);

    this.summary = createText('', {
      fontFamily: FONT_BODY,
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#9cfbff',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center'
    });
    this.summary.anchor.set(0.5);
    this.container.addChild(this.summary);

    this.hint = createText('', {
      fontFamily: FONT_BODY,
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#d8e6ff',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center'
    });
    this.hint.anchor.set(0.5);
    this.container.addChild(this.hint);

    this.rowsContainer.zIndex = 10;
    this.container.addChild(this.rowsContainer);

    this.scrollRail = new PIXI.Graphics();
    this.scrollRail.zIndex = 12;
    this.scrollRail.eventMode = 'static';
    this.scrollRail.cursor = 'pointer';
    this.scrollRail.on('pointerdown', (event) => this.beginScrollbarDrag(event));
    this.container.addChild(this.scrollRail);

    this.scrollThumb = new PIXI.Graphics();
    this.scrollThumb.zIndex = 13;
    this.scrollThumb.eventMode = 'static';
    this.scrollThumb.cursor = 'pointer';
    this.scrollThumb.on('pointerdown', (event) => this.beginScrollbarDrag(event));
    this.container.addChild(this.scrollThumb);

    this.pageText = createText('', {
      fontFamily: FONT_BODY,
      fontSize: 13,
      fontWeight: '900',
      fill: '#fff3a2',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'right'
    });
    this.pageText.anchor.set(1, 0.5);
    this.container.addChild(this.pageText);

    this.backBtn = this.createButton('BACK');
    this.backBtn.on('pointerdown', () => this.returnToMenu());
    this.container.addChild(this.backBtn);
    this.filterBtn = this.createButton('ALL ACHIEVEMENTS');
    this.filterBtn.on('pointerdown', () => this.toggleAvailableFilter());
    this.container.addChild(this.filterBtn);
    this.modeBtn = this.createButton('MODE: {mode}');
    this.modeBtn.on('pointerdown', () => this.cycleModeFilter(1));
    this.container.addChild(this.modeBtn);
    this.groupBtn = this.createButton('CHALLENGES');
    this.groupBtn.on('pointerdown', () => this.cycleGroupFilter());
    this.container.addChild(this.groupBtn);
  }

  cycleGroupFilter() {
    const groups = ['challenges', 'ranks', 'all'];
    this.groupFilter = groups[(groups.indexOf(this.groupFilter) + 1) % groups.length];
    this.game.achievementBrowserGroup = this.groupFilter;
    this.refreshFilteredRows();
  }

  toggleAvailableFilter() {
    this.availableOnly = !this.availableOnly;
    this.game.achievementBrowserAvailableOnly = this.availableOnly;
    this.refreshFilteredRows();
  }

  cycleModeFilter(direction = 1) {
    const index = MODE_OPTIONS.indexOf(this.modeFilter);
    this.modeFilter = MODE_OPTIONS[(index + direction + MODE_OPTIONS.length) % MODE_OPTIONS.length];
    this.game.achievementBrowserMode = this.modeFilter;
    this.refreshFilteredRows();
  }

  refreshFilteredRows() {
    const focusedId = this.rows[this.focusedIndex]?.achievement?.id;
    this.rows = this.buildRows();
    this.focusedIndex = Math.max(0, this.rows.findIndex(row => row.achievement.id === focusedId));
    this.scrollOffset = 0;
    this.layoutScreen();
  }

  createButton(label) {
    const button = new PIXI.Container();
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button._buttonWidth = 170;
    button._buttonHeight = 42;

    const bg = new PIXI.Graphics();
    const text = createText(translateText(label), {
      fontFamily: FONT_DISPLAY,
      fontSize: 17,
      fontWeight: '800',
      fill: '#c9fbff',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'center',
      padding: 8
    });
    text.anchor.set(0.5);
    button._bg = bg;
    button._label = text;
    button.addChild(bg, text);
    this.drawButton(button, false);
    button.on('pointerover', () => {
      playMenuFocusSfx(0.1);
      this.drawButton(button, true);
    });
    button.on('pointerout', () => this.drawButton(button, false));
    button.on('pointerdown', () => {
      playMenuConfirmSfx(0.16);
      this.menuFx?.burst?.(button.x, button.y, { color: 0xffd15c, radius: 84, durationMs: 420 });
    });
    return button;
  }

  drawButton(button, hover = false) {
    const bg = button?._bg;
    if (!bg) return;
    const width = button._buttonWidth || 170;
    const height = button._buttonHeight || 42;
    const x = -width / 2;
    const y = -height / 2;
    bg.clear();
    drawAstraPanel(bg, x, y, width, height, 7, { color: hover ? 0x06314f : 0x04182d, alpha: hover ? 0.84 : 0.68 }, { color: hover ? 0xffffff : 0x37f5ff, width: hover ? 2.5 : 2, alpha: 0.86 });
    bg.rect(x + 12, y + 7, 4, height - 14);
    bg.fill({ color: 0xd8a66b, alpha: 0.62 });
    bg.rect(x + width - 16, y + 7, 4, height - 14);
    bg.fill({ color: 0xffd15c, alpha: 0.5 });
    button._label.scale.x = 1;
    button._label.scale.x = Math.min(1, (width - 36) / Math.max(1, button._label.width));
  }

  layoutScreen() {
    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);
    resizeMenuFx(this, width, height);
    const safe = responsiveLayout.safeArea;
    const bottomInset = Math.max(0, height - (safe.bottom ?? height));
    const mobile = layout.isMobile || width < 760;
    const short = height < 520;
    this.shortLayout = short;
    const titleSize = short ? 30 : Math.round(getResponsiveFontSize(layout, 'title') * (mobile ? 0.82 : 0.9));
    const summarySize = Math.max(15, getResponsiveFontSize(layout, 'body'));
    const hintSize = Math.max(15, getResponsiveFontSize(layout, 'small'));

    this.layoutBackdrop(width, height);
    this.backdropShade.clear();
    this.backdropShade.rect(0, 0, width, height);
    this.backdropShade.fill({ color: 0x020711, alpha: this.overlay ? 0.96 : 0.52 });
    this.backdropShade.rect(0, 0, width, height);
    this.backdropShade.fill({ color: 0x001527, alpha: 0.22 });

    this.title.style.fontSize = titleSize;
    this.summary.style.fontSize = short ? 14 : summarySize;
    this.hint.style.fontSize = hintSize;

    const unlockedCount = this.rows.filter((row) => row.unlocked).length;
    this.summary.text = translateText('{unlockedCount} / {total} UNLOCKED', {
      unlockedCount,
      total: this.rows.length
    });
    this.hint.text = mobile
      ? translateText('UP/DOWN: BROWSE  |  WHEEL/PAGE: MORE  |  ESC/B: BACK')
      : translateText('G/X: GROUP · F/LB: FILTER · M/RB: MODE · ENTER/A: DETAILS · ESC/B: BACK');
    this.hint.scale.set(1);
    this.hint.scale.x = Math.min(1, (width - 40) / Math.max(1, this.hint.width));
    this.hint.visible = !short;

    this.title.x = width / 2;
    this.title.y = safe.top + (short ? 34 : mobile ? 42 : 54);
    this.summary.x = width / 2;
    this.summary.y = this.title.y + (short ? 32 : mobile ? 42 : 52);
    this.hint.x = width / 2;
    this.hint.y = height - bottomInset - (mobile ? 24 : 30);

    this.columns = width >= 980 ? 2 : 1;
    this.columnGap = this.columns > 1 ? 18 : 0;
    this.rowHeight = short ? 82 : mobile ? 132 : 164;
    const bottomReserve = short ? 46 : mobile ? 98 : 108;
    this.listTop = this.summary.y + (short ? 46 : mobile ? 61 : 68);
    const listBottom = height - bottomInset - bottomReserve;
    this.rowsPerColumn = Math.max(1, Math.floor(Math.max(120, listBottom - this.listTop) / this.rowHeight));
    this.visibleCapacity = Math.max(1, this.rowsPerColumn * this.columns);
    this.rowWidth = this.columns > 1
      ? Math.min(460, (width - layout.padding * 2 - this.columnGap) / 2)
      : Math.min(width - 34, 680);
    const totalListWidth = this.rowWidth * this.columns + this.columnGap * (this.columns - 1);
    this.listLeft = width / 2 - totalListWidth / 2;

    this.ensureFocusedVisible();
    this.drawPanel(totalListWidth, listBottom);
    this.drawRows();
    this.drawScrollIndicator(totalListWidth, listBottom);

    this.backBtn._buttonWidth = short ? 132 : mobile ? 150 : 170;
    this.backBtn._buttonHeight = short ? 32 : mobile ? 40 : 42;
    this.backBtn.x = width / 2;
    this.backBtn.y = height - bottomInset - (short ? 24 : mobile ? 62 : 70);
    this.backBtn._label.style.fontSize = short ? 13 : mobile ? 16 : 17;
    this.drawButton(this.backBtn, false);
    const filtersY = this.summary.y + (short ? 22 : mobile ? 27 : 35);
    const filterWidth = Math.min(short ? 174 : 225, (width - 60) / 3);
    const modeWidth = filterWidth;
    this.filterBtn._buttonWidth = filterWidth;
    this.filterBtn._buttonHeight = short ? 28 : 34;
    this.filterBtn._label.text = translateText(this.availableOnly ? 'AVAILABLE IN THIS MODE' : 'ALL ACHIEVEMENTS');
    this.filterBtn._label.style.fontSize = short ? 11 : 13;
    this.filterBtn.position.set(width / 2, filtersY);
    this.drawButton(this.filterBtn, this.availableOnly);
    this.modeBtn._buttonWidth = modeWidth;
    this.modeBtn._buttonHeight = short ? 28 : 34;
    this.modeBtn._label.text = translateText('MODE: {mode}', { mode: translateText(ACHIEVEMENT_MODE_NAMES[this.modeFilter]) });
    this.modeBtn._label.style.fontSize = short ? 11 : 13;
    this.modeBtn.position.set(width / 2 + modeWidth + 10, filtersY);
    this.drawButton(this.modeBtn, false);
    this.groupBtn._buttonWidth = filterWidth;
    this.groupBtn._buttonHeight = short ? 28 : 34;
    this.groupBtn._label.text = translateText(this.groupFilter === 'ranks' ? 'PILOT RANKS'
      : this.groupFilter === 'all' ? 'ALL ACHIEVEMENTS' : 'CHALLENGES');
    this.groupBtn._label.style.fontSize = short ? 11 : 13;
    this.groupBtn.position.set(width / 2 - filterWidth - 10, filtersY);
    this.drawButton(this.groupBtn, this.groupFilter !== 'all');
  }

  layoutBackdrop(width = this.game.app.screen.width, height = this.game.app.screen.height) {
    if (!this.backdrop?.texture) return;
    const textureWidth = this.backdrop.texture.width || width;
    const textureHeight = this.backdrop.texture.height || height;
    const scale = Math.max(width / textureWidth, height / textureHeight);
    this.backdrop.scale.set(scale);
    this.backdrop.position.set(width / 2, height / 2);
  }

  drawPanel(totalListWidth, listBottom) {
    if (!this.panel) return;
    const pad = 14;
    const x = this.listLeft - pad;
    const y = this.listTop - pad;
    const width = totalListWidth + pad * 2;
    const height = Math.max(120, listBottom - this.listTop + pad * 2);
    this.panel.clear();
    drawAstraPanel(this.panel, x, y, width, height, 8, { color: 0x020711, alpha: 0.58 }, { color: 0x37f5ff, width: 1.2, alpha: 0.52 });
    this.panel.rect(x + 18, y + 10, width - 36, 2);
    this.panel.fill({ color: 0xd8a66b, alpha: 0.28 });
    this.panel.rect(x + 18, y + height - 12, width - 36, 2);
    this.panel.fill({ color: 0xffd15c, alpha: 0.28 });
  }

  ensureFocusedVisible() {
    const maxIndex = Math.max(0, this.rows.length - 1);
    this.focusedIndex = clamp(this.focusedIndex, 0, maxIndex);
    if (this.focusedIndex < this.scrollOffset) {
      this.scrollOffset = this.focusedIndex;
    } else if (this.focusedIndex >= this.scrollOffset + this.visibleCapacity) {
      this.scrollOffset = Math.floor(this.focusedIndex / this.columns) * this.columns - this.visibleCapacity + this.columns;
    }
    const maxOffset = Math.max(0, Math.ceil((this.rows.length - this.visibleCapacity) / this.columns) * this.columns);
    this.scrollOffset = clamp(this.scrollOffset, 0, maxOffset);
    this.scrollOffset = Math.floor(this.scrollOffset / this.columns) * this.columns;
  }

  drawRows() {
    this.clearRenderedRows();
    this.rowDebug = [];
    const visibleRows = this.rows.slice(this.scrollOffset, this.scrollOffset + this.visibleCapacity);
    visibleRows.forEach((row, visibleIndex) => {
      const absoluteIndex = this.scrollOffset + visibleIndex;
      const col = visibleIndex % this.columns;
      const rowInColumn = Math.floor(visibleIndex / this.columns);
      const x = this.listLeft + col * (this.rowWidth + this.columnGap);
      const y = this.listTop + rowInColumn * this.rowHeight;
      const display = this.createAchievementRow(row, absoluteIndex);
      display.position.set(x, y);
      this.rowsContainer.addChild(display);
      this.rowDebug.push({
        id: row.achievement.id,
        unlocked: row.unlocked,
        focused: absoluteIndex === this.focusedIndex,
        bounds: getBoundsDebug(display)
      });
    });
    this.drawScrollIndicator();
  }

  createAchievementRow(row, absoluteIndex) {
    const achievement = row.achievement;
    const focused = absoluteIndex === this.focusedIndex;
    const unlocked = Boolean(row.unlocked);
    const hidden = Boolean(achievement.hidden && !unlocked);
    const short = this.shortLayout;
    const container = new PIXI.Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.hitArea = new PIXI.Rectangle(0, 0, this.rowWidth, this.rowHeight - 6);
    container.on('pointerdown', () => {
      this.focusedIndex = absoluteIndex;
      this.ensureFocusedVisible();
      this.drawRows();
    });
    container.on('pointertap', () => this.openAchievementDetail(row));
    const height = this.rowHeight - 6;

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, this.rowWidth, height, 6);
    bg.fill({ color: unlocked ? 0x06263a : 0x06111e, alpha: focused ? 0.86 : 0.72 });
    bg.stroke({
      color: focused ? 0xffef7e : (unlocked ? 0x37f5ff : 0x496071),
      width: focused ? 2.4 : 1.2,
      alpha: focused ? 0.94 : 0.62
    });
    bg.rect(10, 8, 4, height - 16);
    bg.fill({ color: unlocked ? 0xffd15c : 0x496071, alpha: unlocked ? 0.8 : 0.55 });
    container.addChild(bg);

    const iconSize = short ? 48 : 72;
    const iconX = short ? 22 : 24;
    const iconY = (height - iconSize) / 2;
    const iconFrame = new PIXI.Graphics();
    iconFrame.roundRect(iconX, iconY, iconSize, iconSize, 7);
    iconFrame.fill({ color: 0x010914, alpha: 0.94 });
    iconFrame.stroke({
      color: unlocked ? 0xffef7e : 0x50687b,
      width: focused ? 2 : 1,
      alpha: focused ? 0.96 : 0.76
    });
    container.addChild(iconFrame);

    const placeholder = new PIXI.Graphics();
    placeholder.circle(iconX + iconSize / 2, iconY + iconSize / 2, iconSize * 0.24);
    placeholder.fill({ color: unlocked ? 0xffd15c : 0x40566a, alpha: 0.55 });
    placeholder.circle(iconX + iconSize / 2, iconY + iconSize / 2, iconSize * 0.08);
    placeholder.fill({ color: unlocked ? 0xffffff : 0x9fb0bf, alpha: 0.72 });
    container.addChild(placeholder);

    const iconPath = getAchievementIconPath(achievement.id, unlocked);
    PIXI.Assets.load(iconPath).then((texture) => {
      if (!container.parent || !texture) return;
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.position.set(iconX + iconSize / 2, iconY + iconSize / 2);
      const scale = Math.min(iconSize / (texture.width || iconSize), iconSize / (texture.height || iconSize));
      sprite.scale.set(scale);
      sprite.alpha = unlocked ? 1 : 0.72;
      container.addChildAt(sprite, container.getChildIndex(placeholder));
      placeholder.visible = false;
    }).catch(() => {
      // The row remains readable with the procedural achievement sigil.
    });

    const textX = short ? 82 : 106;
    const textWidth = Math.max(120, this.rowWidth - textX - 18);
    const status = createText(translateText(unlocked ? 'UNLOCKED' : 'LOCKED'), {
      fontFamily: FONT_BODY,
      fontSize: short ? 15 : 17,
      fontWeight: 'bold',
      fill: unlocked ? '#fff3a2' : '#8fa6b8',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'left'
    });
    status.x = textX;
    status.y = short ? 7 : 10;
    container.addChild(status);
    const modeEligible = achievement.progressModes?.includes(this.modeFilter)
      || achievement.completeModes?.includes(this.modeFilter);
    const modeBadge = createText(translateText(modeEligible ? 'AVAILABLE IN MODE' : 'NOT IN THIS MODE'), {
      fontFamily: FONT_BODY, fontSize: short ? 10 : 12, fontWeight: 'bold',
      fill: modeEligible ? '#9dded7' : '#9aafc0'
    });
    modeBadge.anchor.x = 1;
    modeBadge.position.set(this.rowWidth - 16, short ? 9 : 12);
    container.addChild(modeBadge);

    const name = createText(hidden ? translateText('Hidden Achievement') : translateText(achievement.name), {
      fontFamily: FONT_DISPLAY,
      fontSize: short ? 18 : this.columns > 1 ? 21 : 22,
      fontWeight: '800',
      fill: unlocked ? '#c9fbff' : '#b8c6d4',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'left',
      wordWrap: false
    });
    name.x = textX;
    name.y = short ? 23 : 31;
    name.scale.x = Math.min(1, textWidth / Math.max(1, name.width));
    container.addChild(name);

    const description = createText(hidden ? translateText('Unlock to reveal details.') : short
      ? translateText('SELECT / A: DETAILS') : translateText(achievement.description), {
      fontFamily: FONT_BODY,
      fontSize: short ? 16 : 18,
      fill: unlocked ? '#d8e6ff' : '#7e91a3',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'left',
      wordWrap: true, breakWords: true,
      wordWrapWidth: textWidth
    });
    description.x = textX;
    description.y = short ? 48 : 68;
    const descriptionBottom = height - (!short && !hidden && this.game?.achievementManager?.getOnslaughtProgress?.(achievement.id) ? 33 : 10);
    description.scale.set(Math.min(1, textWidth / Math.max(1, description.width), (descriptionBottom - description.y) / Math.max(1, description.height)));
    container.addChild(description);
    const progress = this.game?.achievementManager?.getOnslaughtProgress?.(achievement.id);
    if (!short && !hidden && progress) {
      const label = achievement.scope === 'single_run' ? 'Best run: {value}/{target}'
        : achievement.scope === 'consecutive_runs' ? 'Consecutive runs: {value}/{target}'
          : achievement.scope === 'collection' ? 'Collection: {value}/{target}' : 'Across runs: {value}/{target}';
      const node = createText(translateText(label, { value: Math.min(progress.value, progress.target), target: progress.target }), {
        fontFamily: FONT_BODY, fontSize: 13, fontWeight: 'bold', fill: '#9dded7'
      });
      node.position.set(textX, height - 22);
      container.addChild(node);
    }

    return container;
  }

  drawScrollIndicator(totalListWidth = null, listBottom = null) {
    if (!this.scrollRail || !this.scrollThumb || !this.pageText) return;
    const width = totalListWidth ?? (this.rowWidth * this.columns + this.columnGap * (this.columns - 1));
    const bottom = listBottom ?? (this.listTop + this.rowsPerColumn * this.rowHeight);
    const railX = this.listLeft + width + 18;
    const railY = this.listTop;
    const railHeight = Math.max(80, bottom - this.listTop);
    const total = Math.max(1, this.rows.length);
    const visible = Math.min(total, this.visibleCapacity);
    const maxOffset = Math.max(0, Math.ceil((total - visible) / this.columns) * this.columns);
    const thumbHeight = maxOffset <= 0 ? railHeight : Math.max(42, railHeight * (visible / total));
    const thumbY = maxOffset <= 0
      ? railY
      : railY + (railHeight - thumbHeight) * (this.scrollOffset / maxOffset);
    this.scrollBarDebug = {
      x: railX - 12,
      y: railY,
      width: 31,
      height: railHeight,
      thumbY,
      thumbHeight,
      total,
      visible,
      maxOffset,
      interactive: total > visible
    };
    this.scrollRail.clear();
    this.scrollThumb.clear();
    drawAstraPanel(this.scrollRail, railX, railY, 7, railHeight, 4, { color: 0x06111e, alpha: 0.72 }, { color: 0x37f5ff, width: 1, alpha: 0.45 });
    drawAstraPanel(this.scrollThumb, railX - 2, thumbY, 11, thumbHeight, 5, { color: 0xffef7e, alpha: 0.92 }, { color: 0x37f5ff, width: 1.5, alpha: 0.76 });

    const start = total === 0 ? 0 : this.scrollOffset + 1;
    const end = Math.min(total, this.scrollOffset + visible);
    this.pageText.text = translateText('{start}-{end} / {total}', { start, end, total });
    this.pageText.x = railX + 8;
    this.pageText.y = railY - 18;
    this.pageText.visible = total > visible;
    this.scrollRail.visible = total > visible;
    this.scrollThumb.visible = total > visible;
    this.scrollRail.hitArea = new PIXI.Rectangle(railX - 12, railY, 31, railHeight);
    this.scrollThumb.hitArea = new PIXI.Rectangle(railX - 12, railY, 31, railHeight);
    this.scrollRail.eventMode = total > visible ? 'static' : 'none';
    this.scrollThumb.eventMode = total > visible ? 'static' : 'none';
  }

  beginScrollbarDrag(event) {
    if (!this.scrollBarDebug?.interactive) return;
    event.stopPropagation?.();
    this.endScrollbarDrag();
    this.scrollDrag = { bounds: this.scrollBarDebug };
    this.scrollDragMoveHandler = (moveEvent) => {
      moveEvent.preventDefault?.();
      this.setScrollFromY(Number(moveEvent.clientY) || 0);
    };
    this.scrollDragEndHandler = () => this.endScrollbarDrag();
    window.addEventListener('pointermove', this.scrollDragMoveHandler, { passive: false });
    window.addEventListener('pointerup', this.scrollDragEndHandler, { passive: true });
    window.addEventListener('pointercancel', this.scrollDragEndHandler, { passive: true });
    this.setScrollFromY(Number(event.global?.y) || this.scrollBarDebug.y);
  }

  endScrollbarDrag() {
    if (this.scrollDragMoveHandler) {
      window.removeEventListener('pointermove', this.scrollDragMoveHandler);
    }
    if (this.scrollDragEndHandler) {
      window.removeEventListener('pointerup', this.scrollDragEndHandler);
      window.removeEventListener('pointercancel', this.scrollDragEndHandler);
    }
    this.scrollDrag = null;
    this.scrollDragMoveHandler = null;
    this.scrollDragEndHandler = null;
  }

  setScrollFromY(y) {
    const bounds = this.scrollDrag?.bounds || this.scrollBarDebug;
    if (!bounds?.interactive || bounds.maxOffset <= 0) return false;
    const ratio = clamp((Number(y) - bounds.y) / Math.max(1, bounds.height), 0, 1);
    const nextOffset = clamp(Math.round(ratio * bounds.maxOffset / this.columns) * this.columns, 0, bounds.maxOffset);
    if (nextOffset === this.scrollOffset && this.focusedIndex === nextOffset) return false;
    this.scrollOffset = nextOffset;
    this.focusedIndex = clamp(nextOffset, 0, Math.max(0, this.rows.length - 1));
    this.drawRows();
    playMenuFocusSfx(0.09);
    return true;
  }

  moveFocus(delta) {
    if (!this.rows.length) return;
    this.focusedIndex = clamp(this.focusedIndex + delta, 0, this.rows.length - 1);
    this.ensureFocusedVisible();
    this.drawRows();
    playMenuFocusSfx(0.09);
  }

  openAchievementDetail(row = this.rows[this.focusedIndex]) {
    if (!row?.achievement) return;
    this.closeAchievementDetail();
    const { width, height } = this.game.app.screen;
    const panelWidth = Math.min(760, width - 32);
    const achievement = row.achievement;
    const hidden = achievement.hidden && !row.unlocked;
    const requirement = hidden
      ? translateText('Unlock to reveal details.')
      : getAchievementDescriptionForLocale(achievement, getCurrentLanguage());
    const collection = hidden ? [] : getOnslaughtCollectionItems(achievement, this.game.achievementManager?.onslaughtRuns);
    const collectionLines = collection.slice(0, 5).map(item => {
      const hull = getBaseShipMetadata(item.hullId)?.name || item.hullId;
      const label = item.augmentIds
        ? `${hull ? hull + ': ' : ''}${item.augmentIds.map(id => getOnslaughtCollectionAugmentName(id, getCurrentLanguage())).join(' / ')}`
        : hull;
      return translateText('{item}: {status}', { item: label, status: translateText(item.counted ? 'Counted' : 'Not yet') });
    });
    const fullDescription = [requirement, ...collectionLines].join('\n\n');
    const detailFontSize = collectionLines.length ? 16 : 18;
    const measured = createText(fullDescription, { fontFamily: FONT_BODY, fontSize: detailFontSize, fontWeight: 'bold',
      wordWrap: true, breakWords: true, wordWrapWidth: panelWidth - 48, lineHeight: detailFontSize * 1.25 });
    const progress = this.game?.achievementManager?.getOnslaughtProgress?.(achievement.id);
    const panelHeight = Math.min(height - 38, Math.max(250, 157 + measured.height + (!hidden && progress ? 35 : 0)));
    measured.destroy();
    const x = (width - panelWidth) / 2;
    const y = (height - panelHeight) / 2;
    const modal = new PIXI.Container();
    modal.label = 'ui_achievement_detail';
    modal.zIndex = 1000;
    modal.eventMode = 'static';
    modal.hitArea = new PIXI.Rectangle(0, 0, width, height);
    modal.addChild(new PIXI.Graphics().rect(0, 0, width, height).fill({ color: 0x01050d, alpha: 0.86 }));
    const frame = new PIXI.Graphics();
    drawAstraPanel(frame, x, y, panelWidth, panelHeight, 8, { color: 0x061729, alpha: 0.99 }, { color: 0xffd15c, width: 2, alpha: 0.92 });
    modal.addChild(frame);
    const addLine = (value, py, size, color = '#d8e6ff') => {
      const node = createText(value, { fontFamily: FONT_BODY, fontSize: size, fontWeight: 'bold', fill: color,
        wordWrap: true, breakWords: true, wordWrapWidth: panelWidth - 48, lineHeight: size * 1.25 });
      node.position.set(x + 24, py);
      modal.addChild(node);
      return node;
    };
    addLine(translateText(row.unlocked ? 'UNLOCKED' : 'LOCKED'), y + 18, 15, row.unlocked ? '#fff3a2' : '#aabdc9');
    const title = addLine(hidden ? translateText('Hidden Achievement') : translateText(achievement.name), y + 42, 25, '#c9fbff');
    title.scale.set(Math.min(1, 60 / Math.max(1, title.height)));
    const descriptionY = title.y + title.height + 12;
    const description = addLine(fullDescription, descriptionY, detailFontSize);
    description.scale.set(Math.min(1, (y + panelHeight - (progress ? 106 : 72) - descriptionY) / Math.max(1, description.height)));
    if (!hidden && progress) {
      const label = achievement.scope === 'single_run' ? 'Best run: {value}/{target}'
        : achievement.scope === 'consecutive_runs' ? 'Consecutive runs: {value}/{target}'
          : achievement.scope === 'collection' ? 'Collection: {value}/{target}' : 'Across runs: {value}/{target}';
      addLine(translateText(label, { value: Math.min(progress.value, progress.target), target: progress.target }),
        Math.min(y + panelHeight - 95, description.y + description.height + 18), 18, '#9dded7');
    }
    const close = this.createButton('BACK TO ACHIEVEMENTS');
    close._buttonWidth = Math.min(300, panelWidth - 48);
    close._buttonHeight = 42;
    close.position.set(width / 2, y + panelHeight - 39);
    close.on('pointerdown', () => this.closeAchievementDetail());
    this.drawButton(close, true);
    modal.addChild(close);
    this.container.addChild(modal);
    this.detailOverlay = modal;
    this.suppressGamepadUntilReleased();
  }

  closeAchievementDetail() {
    if (!this.detailOverlay) return;
    this.detailOverlay.destroy({ children: true });
    this.detailOverlay = null;
    this.suppressGamepadUntilReleased();
  }

  setupKeyboard() {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler, true);
    this.keyHandler = (event) => {
      const key = event.key;
      if (this.detailOverlay) {
        if (key === 'Escape' || key === 'Backspace' || key === 'Enter' || event.code === 'Space') {
          event.preventDefault();
          event.stopImmediatePropagation?.();
          this.closeAchievementDetail();
        }
        return;
      }
      if (key === 'Escape' || key === 'Backspace') {
        event.preventDefault();
        event.stopImmediatePropagation?.();
        this.returnToMenu();
        return;
      }
      if (event.code === 'KeyG') {
        event.preventDefault();
        this.cycleGroupFilter();
      } else if (event.code === 'KeyF') {
        event.preventDefault();
        this.toggleAvailableFilter();
      } else if (event.code === 'KeyM') {
        event.preventDefault();
        this.cycleModeFilter(event.shiftKey ? -1 : 1);
      } else if (key === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        this.openAchievementDetail();
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        this.moveFocus(-this.columns);
      } else if (key === 'ArrowDown') {
        event.preventDefault();
        this.moveFocus(this.columns);
      } else if (key === 'Tab') {
        event.preventDefault();
        this.moveFocus(event.shiftKey ? -1 : 1);
      } else if (key === 'ArrowLeft') {
        event.preventDefault();
        this.moveFocus(-1);
      } else if (key === 'ArrowRight') {
        event.preventDefault();
        this.moveFocus(1);
      } else if (key === 'PageUp') {
        event.preventDefault();
        this.moveFocus(-this.visibleCapacity);
      } else if (key === 'PageDown') {
        event.preventDefault();
        this.moveFocus(this.visibleCapacity);
      } else if (key === 'Home') {
        event.preventDefault();
        this.focusedIndex = 0;
        this.ensureFocusedVisible();
        this.drawRows();
      } else if (key === 'End') {
        event.preventDefault();
        this.focusedIndex = Math.max(0, this.rows.length - 1);
        this.ensureFocusedVisible();
        this.drawRows();
      }
    };
    window.addEventListener('keydown', this.keyHandler, true);

    if (this.wheelHandler) window.removeEventListener('wheel', this.wheelHandler, true);
    this.wheelHandler = (event) => {
      if (this.game?.currentScene !== this && !this.overlay) return;
      if (this.detailOverlay) return;
      event.preventDefault();
      event.stopPropagation();
      const step = Math.max(1, Math.round(Math.abs(event.deltaY || 0) / 90));
      this.moveFocus((event.deltaY || 0) > 0 ? step : -step);
    };
    window.addEventListener('wheel', this.wheelHandler, { capture: true, passive: false });
  }

  returnToMenu() {
    playMenuConfirmSfx(0.14);
    if (this.onClose) this.onClose();
    else this.game.showMenu();
  }

  suppressGamepadUntilReleased() {
    this.gamepadPrevious = {};
    this.gamepadSuppressActiveInput = true;
  }

  readGamepadNavigation() {
    const pad = readGamepadSnapshot();
    if (!pad || pad.connected === false) {
      this.gamepadPrevious = {};
      this.gamepadSuppressActiveInput = false;
      return { connected: false, active: false, pressed: {} };
    }

    const buttons = pad.buttons || [];
    const axisX = Math.abs(Number(pad.axes?.[0]) || 0) >= GAMEPAD_DEADZONE ? Number(pad.axes?.[0]) || 0 : 0;
    const axisY = Math.abs(Number(pad.axes?.[1]) || 0) >= GAMEPAD_DEADZONE ? Number(pad.axes?.[1]) || 0 : 0;
    const down = {
      up: isGamepadButtonPressed(buttons, 12) || axisY < 0,
      down: isGamepadButtonPressed(buttons, 13) || axisY > 0,
      left: isGamepadButtonPressed(buttons, 14) || axisX < 0,
      right: isGamepadButtonPressed(buttons, 15) || axisX > 0,
      confirm: isGamepadButtonPressed(buttons, 0),
      filter: isGamepadButtonPressed(buttons, 4),
      mode: isGamepadButtonPressed(buttons, 5),
      group: isGamepadButtonPressed(buttons, 2),
      cancel: isGamepadButtonPressed(buttons, 1),
      back: isGamepadButtonPressed(buttons, 8),
      menu: isGamepadButtonPressed(buttons, 9)
    };
    const active = Object.values(down).some(Boolean);
    const pressed = Object.fromEntries(
      Object.entries(down).map(([key, value]) => [key, Boolean(value && !this.gamepadPrevious[key])])
    );

    if (this.gamepadSuppressActiveInput) {
      this.gamepadPrevious = down;
      if (active) {
        return { connected: true, active: false, pressed: {} };
      }
      this.gamepadSuppressActiveInput = false;
    }

    this.gamepadPrevious = down;
    return { connected: true, active, pressed };
  }

  update(delta = 1) {
    updateMenuFx(this, delta);
    const nav = this.readGamepadNavigation();
    if (!nav.connected || !nav.active) return;
    if (this.detailOverlay) {
      if (nav.pressed.confirm || nav.pressed.cancel || nav.pressed.back || nav.pressed.menu) this.closeAchievementDetail();
      return;
    }
    if (nav.pressed.filter) this.toggleAvailableFilter();
    if (nav.pressed.mode) this.cycleModeFilter(1);
    if (nav.pressed.group) this.cycleGroupFilter();
    if (nav.pressed.up) this.moveFocus(-this.columns);
    if (nav.pressed.down) this.moveFocus(this.columns);
    if (nav.pressed.left) this.moveFocus(-1);
    if (nav.pressed.right) this.moveFocus(1);
    if (nav.pressed.confirm) this.openAchievementDetail();
    if (nav.pressed.cancel || nav.pressed.back || nav.pressed.menu) this.returnToMenu();
  }

  getDebugState() {
    const managerState = this.game?.achievementManager?.getDebugState?.() || {
      unlocked: [],
      lastUnlocked: null,
      count: 0,
      total: ACHIEVEMENTS.length
    };
    return {
      ...managerState,
      focusedId: this.rows[this.focusedIndex]?.achievement?.id || null,
      rowCount: this.rows.length,
      uniqueRowCount: new Set(this.rows.map((row) => row.achievement?.id).filter(Boolean)).size,
      renderedRowCount: this.rowsContainer?.children?.length || 0,
      renderedUniqueRowCount: new Set(this.rowDebug.map((row) => row.id).filter(Boolean)).size,
      catalogIntegrity: this.catalogIntegrity ? { ...this.catalogIntegrity } : null,
      scrollOffset: this.scrollOffset,
      visibleCapacity: this.visibleCapacity,
      scrollbar: this.scrollBarDebug,
      rows: this.rowDebug,
      backButton: getBoundsDebug(this.backBtn),
      menuFx: this.menuFx?.getDebugState?.() || null
    };
  }

  destroy() {
    this.renderGeneration = (this.renderGeneration || 0) + 1;
    this.closeAchievementDetail();
    if (this.layoutUnsubscribe) {
      this.layoutUnsubscribe();
      this.layoutUnsubscribe = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
    if (this.wheelHandler) {
      window.removeEventListener('wheel', this.wheelHandler, true);
      this.wheelHandler = null;
    }
    this.endScrollbarDrag();
    destroyMenuFx(this);
    this.cleanupDisplayObjects();
  }
}
