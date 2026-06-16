import * as PIXI from 'pixi.js';
import { ACHIEVEMENTS } from '../achievements/AchievementCatalog.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { createTextLayout, getResponsiveFontSize } from '../ui/textLayout.js';
import { createText } from '../utils/pixiText.js';
import { translateText } from '../i18n/index.js';
import { destroyMenuFx, installMenuFx, playMenuConfirmSfx, playMenuFocusSfx, resizeMenuFx, updateMenuFx } from '../ui/MenuFxLayer.js';

const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, Eurostile, Bank Gothic, sans-serif';
const FONT_BODY = 'Rajdhani, Orbitron, Bahnschrift, Segoe UI, sans-serif';
const GAMEPAD_DEADZONE = 0.42;
const ACHIEVEMENT_ICON_BASE = '/art/generated/nova-swarm/achievements';

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
  constructor(game) {
    this.game = game;
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
  }

  init() {
    this.suppressGamepadUntilReleased();
    this.container.removeChildren();
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
    return ACHIEVEMENTS.map((achievement) => ({
      achievement,
      unlocked: Boolean(manager?.isUnlocked?.(achievement.id))
    }));
  }

  createBackdrop() {
    this.backdropShade = new PIXI.Graphics();
    this.backdropShade.zIndex = -20;
    this.container.addChild(this.backdropShade);

    const backdropSrc = AssetManifest.generated?.leaderboardHall || AssetManifest.generated?.menuBackdrop;
    if (!backdropSrc) return;
    PIXI.Assets.load(backdropSrc).then((texture) => {
      if (this.game?.currentScene !== this) return;
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
    bg.roundRect(x, y, width, height, 7);
    bg.fill({ color: hover ? 0x06314f : 0x04182d, alpha: hover ? 0.84 : 0.68 });
    bg.stroke({ color: hover ? 0xffffff : 0x37f5ff, width: hover ? 2.5 : 2, alpha: 0.86 });
    bg.rect(x + 12, y + 7, 4, height - 14);
    bg.fill({ color: 0xff55d9, alpha: 0.62 });
    bg.rect(x + width - 16, y + 7, 4, height - 14);
    bg.fill({ color: 0xffd15c, alpha: 0.5 });
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
    const hintSize = Math.max(12, getResponsiveFontSize(layout, 'small'));

    this.layoutBackdrop(width, height);
    this.backdropShade.clear();
    this.backdropShade.rect(0, 0, width, height);
    this.backdropShade.fill({ color: 0x020711, alpha: 0.52 });
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
      : translateText('ARROWS/STICK: BROWSE  |  WHEEL/PAGE: MORE  |  ESC/B: BACK');
    this.hint.visible = !short;

    this.title.x = width / 2;
    this.title.y = safe.top + (short ? 34 : mobile ? 42 : 54);
    this.summary.x = width / 2;
    this.summary.y = this.title.y + (short ? 32 : mobile ? 42 : 52);
    this.hint.x = width / 2;
    this.hint.y = height - bottomInset - (mobile ? 24 : 30);

    this.columns = width >= 980 ? 2 : 1;
    this.columnGap = this.columns > 1 ? 18 : 0;
    this.rowHeight = short ? 52 : mobile ? 78 : 82;
    const bottomReserve = short ? 46 : mobile ? 98 : 108;
    this.listTop = this.summary.y + (short ? 20 : mobile ? 32 : 42);
    const listBottom = height - bottomInset - bottomReserve;
    this.rowsPerColumn = Math.max(3, Math.floor(Math.max(120, listBottom - this.listTop) / this.rowHeight));
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
    this.panel.roundRect(x, y, width, height, 8);
    this.panel.fill({ color: 0x020711, alpha: 0.58 });
    this.panel.stroke({ color: 0x37f5ff, width: 1.2, alpha: 0.52 });
    this.panel.rect(x + 18, y + 10, width - 36, 2);
    this.panel.fill({ color: 0xff55d9, alpha: 0.28 });
    this.panel.rect(x + 18, y + height - 12, width - 36, 2);
    this.panel.fill({ color: 0xffd15c, alpha: 0.28 });
  }

  ensureFocusedVisible() {
    const maxIndex = Math.max(0, this.rows.length - 1);
    this.focusedIndex = clamp(this.focusedIndex, 0, maxIndex);
    if (this.focusedIndex < this.scrollOffset) {
      this.scrollOffset = this.focusedIndex;
    } else if (this.focusedIndex >= this.scrollOffset + this.visibleCapacity) {
      this.scrollOffset = this.focusedIndex - this.visibleCapacity + 1;
    }
    const maxOffset = Math.max(0, this.rows.length - this.visibleCapacity);
    this.scrollOffset = clamp(this.scrollOffset, 0, maxOffset);
  }

  drawRows() {
    this.rowsContainer.removeChildren();
    this.rowDebug = [];
    const visibleRows = this.rows.slice(this.scrollOffset, this.scrollOffset + this.visibleCapacity);
    visibleRows.forEach((row, visibleIndex) => {
      const absoluteIndex = this.scrollOffset + visibleIndex;
      const col = Math.floor(visibleIndex / this.rowsPerColumn);
      const rowInColumn = visibleIndex % this.rowsPerColumn;
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

    const iconSize = short ? 38 : 54;
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

    const textX = short ? 74 : 92;
    const textWidth = Math.max(120, this.rowWidth - textX - 18);
    const status = createText(translateText(unlocked ? 'UNLOCKED' : 'LOCKED'), {
      fontFamily: FONT_BODY,
      fontSize: short ? 9 : 11,
      fontWeight: 'bold',
      fill: unlocked ? '#fff3a2' : '#8fa6b8',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'left'
    });
    status.x = textX;
    status.y = short ? 6 : 8;
    container.addChild(status);

    const name = createText(hidden ? translateText('Hidden Achievement') : translateText(achievement.name), {
      fontFamily: FONT_DISPLAY,
      fontSize: short ? 12 : this.columns > 1 ? 15 : 16,
      fontWeight: '800',
      fill: unlocked ? '#c9fbff' : '#b8c6d4',
      stroke: '#031323',
      strokeThickness: 3,
      align: 'left',
      wordWrap: true,
      wordWrapWidth: textWidth
    });
    name.x = textX;
    name.y = short ? 18 : 23;
    container.addChild(name);

    const description = createText(hidden ? translateText('Unlock to reveal details.') : translateText(achievement.description), {
      fontFamily: FONT_BODY,
      fontSize: short ? 10 : 12,
      fill: unlocked ? '#d8e6ff' : '#7e91a3',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'left',
      wordWrap: true,
      wordWrapWidth: textWidth
    });
    description.x = textX;
    description.y = short ? 34 : 45;
    container.addChild(description);

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
    const maxOffset = Math.max(0, total - visible);
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
    this.scrollRail.roundRect(railX, railY, 7, railHeight, 4);
    this.scrollRail.fill({ color: 0x06111e, alpha: 0.72 });
    this.scrollRail.stroke({ color: 0x37f5ff, width: 1, alpha: 0.45 });
    this.scrollThumb.roundRect(railX - 2, thumbY, 11, thumbHeight, 5);
    this.scrollThumb.fill({ color: 0xffef7e, alpha: 0.92 });
    this.scrollThumb.stroke({ color: 0x37f5ff, width: 1.5, alpha: 0.76 });

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
    const nextOffset = clamp(Math.round(ratio * bounds.maxOffset), 0, bounds.maxOffset);
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

  setupKeyboard() {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler, true);
    this.keyHandler = (event) => {
      const key = event.key;
      if (key === 'Escape' || key === 'Backspace') {
        event.preventDefault();
        event.stopImmediatePropagation?.();
        this.returnToMenu();
        return;
      }
      if (key === 'ArrowUp') {
        event.preventDefault();
        this.moveFocus(-1);
      } else if (key === 'ArrowDown' || key === 'Tab') {
        event.preventDefault();
        this.moveFocus(event.shiftKey ? -1 : 1);
      } else if (key === 'ArrowLeft') {
        event.preventDefault();
        this.moveFocus(-this.rowsPerColumn);
      } else if (key === 'ArrowRight') {
        event.preventDefault();
        this.moveFocus(this.rowsPerColumn);
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
      if (this.game?.currentScene !== this) return;
      event.preventDefault();
      event.stopPropagation();
      const step = Math.max(1, Math.round(Math.abs(event.deltaY || 0) / 90));
      this.moveFocus((event.deltaY || 0) > 0 ? step : -step);
    };
    window.addEventListener('wheel', this.wheelHandler, { capture: true, passive: false });
  }

  returnToMenu() {
    playMenuConfirmSfx(0.14);
    this.game.showMenu();
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
    if (nav.pressed.up) this.moveFocus(-1);
    if (nav.pressed.down) this.moveFocus(1);
    if (nav.pressed.left) this.moveFocus(-this.rowsPerColumn);
    if (nav.pressed.right) this.moveFocus(this.rowsPerColumn);
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
      scrollOffset: this.scrollOffset,
      visibleCapacity: this.visibleCapacity,
      scrollbar: this.scrollBarDebug,
      rows: this.rowDebug,
      backButton: getBoundsDebug(this.backBtn),
      menuFx: this.menuFx?.getDebugState?.() || null
    };
  }

  destroy() {
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
    this.rowsContainer.removeChildren();
  }
}
