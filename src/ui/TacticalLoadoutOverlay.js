import * as PIXI from 'pixi.js';
import { getTacticalDraftMeta } from '../config/TacticalDraft.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { translateText, onLanguageChange } from '../i18n/index.js';
import { GameAssets } from '../utils/GameAssets.js';
import { createText, FONT_BODY, FONT_DISPLAY } from '../utils/pixiText.js';
import {
  destroyMenuFx,
  installMenuFx,
  playMenuBackSfx,
  playMenuConfirmSfx,
  playMenuFocusSfx,
  updateMenuFx
} from './MenuFxLayer.js';

export { PIXI as TacticalLoadoutPixiRuntime };

const CATEGORY_COLORS = Object.freeze({
  offense: 0xff6d8f,
  mobility: 0x57e8ff,
  defense: 0x70ffb1,
  utility: 0xffd56a
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function positiveInteger(value, fallback = 1) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function displayNameFromId(id) {
  return String(id || 'UNKNOWN AUGMENT').replace(/[_-]+/g, ' ').trim().toUpperCase();
}

function toBounds(displayObject) {
  if (!displayObject?.getBounds) return null;
  try {
    const bounds = displayObject.getBounds();
    return {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
      right: Math.round(bounds.x + bounds.width),
      bottom: Math.round(bounds.y + bounds.height)
    };
  } catch {
    return null;
  }
}

function overlaps(a, b, gap = 0) {
  if (!a || !b) return false;
  return a.x < b.right + gap && a.right > b.x - gap && a.y < b.bottom + gap && a.bottom > b.y - gap;
}

function fitText(text, maxWidth, maxHeight, minScale = 0.62) {
  if (!text || maxWidth <= 0 || maxHeight <= 0) return 1;
  text.scale.set(1);
  text.updateText?.(false);
  const widthScale = text.width > maxWidth ? maxWidth / Math.max(1, text.width) : 1;
  const heightScale = text.height > maxHeight ? maxHeight / Math.max(1, text.height) : 1;
  const scale = Math.max(minScale, Math.min(1, widthScale, heightScale));
  text.scale.set(scale);
  return scale;
}

export function groupTacticalAugments(selectedIds = []) {
  const grouped = [];
  const byId = new Map();
  for (const rawId of Array.isArray(selectedIds) ? selectedIds : []) {
    const id = String(rawId || '').trim();
    if (!id) continue;
    let entry = byId.get(id);
    if (!entry) {
      const metadata = getTacticalDraftMeta(id);
      entry = {
        id,
        stacks: 0,
        known: Boolean(metadata),
        name: metadata?.name || displayNameFromId(id),
        description: metadata?.description || displayNameFromId(id),
        category: metadata?.category || 'utility',
        color: Number(metadata?.color) || CATEGORY_COLORS.utility,
        maxStacks: positiveInteger(metadata?.maxStacks, 1),
        metadata
      };
      byId.set(id, entry);
      grouped.push(entry);
    }
    entry.stacks += 1;
  }
  return grouped.map((entry) => Object.freeze({ ...entry }));
}

export function calculateTacticalLoadoutLayout(width, height, itemCount = 0) {
  const viewportWidth = Math.max(480, Number(width) || 1920);
  const viewportHeight = Math.max(360, Number(height) || 1080);
  const veryCompact = viewportWidth < 720 || viewportHeight < 520;
  const compact = !veryCompact && (viewportWidth < 1000 || viewportHeight < 650);
  const spacious = viewportWidth >= 1500 && viewportHeight >= 850;
  const panelWidth = Math.min(spacious ? 1360 : veryCompact ? 660 : compact ? 900 : 1240, viewportWidth * (veryCompact ? 0.97 : 0.92));
  const panelHeight = Math.min(spacious ? 900 : veryCompact ? 620 : compact ? 720 : 780, viewportHeight * (veryCompact ? 0.97 : 0.92));
  const panelX = (viewportWidth - panelWidth) / 2;
  const panelY = (viewportHeight - panelHeight) / 2;
  const pad = veryCompact ? 16 : compact ? 22 : 30;
  const headerHeight = veryCompact ? 82 : compact ? 104 : 122;
  const footerHeight = veryCompact ? 60 : compact ? 68 : 78;
  const gap = veryCompact ? 7 : compact ? 10 : 14;
  const columns = veryCompact ? 1 : compact ? 2 : spacious ? 4 : 3;
  const rows = veryCompact ? (viewportHeight < 430 ? 2 : 3) : 2;
  const pageSize = columns * rows;
  const totalPages = Math.max(1, Math.ceil(Math.max(0, Number(itemCount) || 0) / pageSize));
  const contentX = panelX + pad;
  const contentY = panelY + headerHeight;
  const contentWidth = panelWidth - pad * 2;
  const contentHeight = panelHeight - headerHeight - footerHeight;
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
  const cardHeight = (contentHeight - gap * (rows - 1)) / rows;
  return {
    viewportWidth,
    viewportHeight,
    veryCompact,
    compact,
    spacious,
    panel: { x: panelX, y: panelY, width: panelWidth, height: panelHeight },
    content: { x: contentX, y: contentY, width: contentWidth, height: contentHeight },
    pad,
    headerHeight,
    footerHeight,
    gap,
    columns,
    rows,
    pageSize,
    totalPages,
    cardWidth,
    cardHeight
  };
}

function normalizeConstructorOptions(options, positionalOnClose) {
  if (Array.isArray(options)) return { selectedIds: options, onClose: positionalOnClose };
  if (typeof options === 'function') return { selectedIds: [], onClose: options };
  return options && typeof options === 'object' ? options : {};
}

export class TacticalLoadoutOverlay {
  constructor(game, options = {}, positionalOnClose = null) {
    const resolved = normalizeConstructorOptions(options, positionalOnClose);
    this.game = game;
    this.onClose = typeof resolved.onClose === 'function' ? resolved.onClose : null;
    this.title = resolved.title || 'TACTICAL LOADOUT';
    this.selectedIds = Array.isArray(resolved.selectedIds) ? resolved.selectedIds.slice() : [];
    this.items = groupTacticalAugments(this.selectedIds);
    this.pageIndex = 0;
    this.focusedControl = 'close';
    this.container = new PIXI.Container();
    this.container.zIndex = 2150000;
    this.container.label = 'ui_tacticalLoadoutOverlay';
    this.container.sortableChildren = true;
    this.container.eventMode = 'static';
    this.gamepadNavigator = new GamepadNavigator();
    this.gamepadNavigator.suppressUntilReleased();
    this.keyHandler = null;
    this.languageUnsubscribe = onLanguageChange(() => this.rebuild());
    this.menuFx = null;
    this.cards = [];
    this.controls = {};
    this.debugLayout = null;
    this.closed = false;
    this.build();
    this.setupKeyboardNavigation();
  }

  getWidth() {
    return Math.max(1, Number(this.game?.getWidth?.()) || Number(this.game?.app?.screen?.width) || 1920);
  }

  getHeight() {
    return Math.max(1, Number(this.game?.getHeight?.()) || Number(this.game?.app?.screen?.height) || 1080);
  }

  build() {
    const width = this.getWidth();
    const height = this.getHeight();
    const layout = calculateTacticalLoadoutLayout(width, height, this.items.length);
    this.pageIndex = clamp(this.pageIndex, 0, layout.totalPages - 1);
    this.cards = [];
    this.controls = {};
    this.container.hitArea = new PIXI.Rectangle(0, 0, width, height);

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x010611, alpha: 0.9 });
    dim.eventMode = 'static';
    this.container.addChild(dim);
    installMenuFx(this, {
      label: 'ui_menuFxTacticalLoadout',
      zIndex: 0,
      accent: 0x37f5ff,
      secondary: 0xff55d9,
      gold: 0xffef7e,
      intensity: 0.68,
      density: 0.72,
      alpha: 0.42,
      openVolume: 0.16
    });

    const { panel, pad, headerHeight, footerHeight } = layout;
    const chrome = new PIXI.Graphics();
    chrome.roundRect(panel.x, panel.y, panel.width, panel.height, 8);
    chrome.fill({ color: 0x040d1a, alpha: 0.985 });
    chrome.stroke({ color: 0x37f5ff, width: 2, alpha: 0.94 });
    chrome.roundRect(panel.x + 9, panel.y + 9, panel.width - 18, panel.height - 18, 6);
    chrome.stroke({ color: 0xff55d9, width: 1, alpha: 0.3 });
    chrome.rect(panel.x + pad, panel.y + headerHeight - 14, panel.width - pad * 2, 2);
    chrome.fill({ color: 0x37f5ff, alpha: 0.28 });
    chrome.rect(panel.x + pad, panel.y + panel.height - footerHeight + 8, panel.width - pad * 2, 1);
    chrome.fill({ color: 0xffd56a, alpha: 0.24 });
    chrome.rect(panel.x + 4, panel.y + 28, 5, Math.max(44, panel.height - 56));
    chrome.fill({ color: 0x37f5ff, alpha: 0.52 });
    chrome.rect(panel.x + panel.width - 9, panel.y + 28, 5, Math.max(44, panel.height - 56));
    chrome.fill({ color: 0xff55d9, alpha: 0.42 });
    this.container.addChild(chrome);

    const title = createText(translateText(this.title), {
      fontFamily: FONT_DISPLAY,
      fontSize: layout.veryCompact ? 25 : layout.compact ? 32 : 42,
      fontWeight: '900',
      fill: '#f7fcff',
      stroke: '#002236',
      strokeThickness: 4,
      align: 'center'
    });
    title.anchor.set(0.5);
    title.position.set(width / 2, panel.y + (layout.veryCompact ? 31 : layout.compact ? 39 : 46));
    fitText(title, panel.width - pad * 3, 52, 0.62);
    this.container.addChild(title);

    const subtitle = createText(translateText('PERMANENT THIS RUN'), {
      fontFamily: FONT_BODY,
      fontSize: layout.veryCompact ? 12 : layout.compact ? 15 : 18,
      fontWeight: '900',
      fill: '#96efff',
      align: 'center'
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(width / 2, panel.y + (layout.veryCompact ? 57 : layout.compact ? 70 : 80));
    fitText(subtitle, panel.width - pad * 3, 24, 0.7);
    this.container.addChild(subtitle);

    const pageText = createText(translateText('PAGE {current}/{total}', {
      current: this.pageIndex + 1,
      total: layout.totalPages
    }), {
      fontFamily: FONT_BODY,
      fontSize: layout.veryCompact ? 10 : 13,
      fontWeight: '900',
      fill: '#ffe891',
      align: 'center'
    });
    pageText.anchor.set(0.5);
    pageText.position.set(width / 2, panel.y + headerHeight - (layout.veryCompact ? 13 : 22));
    this.container.addChild(pageText);

    const start = this.pageIndex * layout.pageSize;
    const visibleItems = this.items.slice(start, start + layout.pageSize);
    if (visibleItems.length === 0) {
      const empty = createText(translateText('Tactical upgrades'), {
        fontFamily: FONT_BODY,
        fontSize: layout.veryCompact ? 18 : 24,
        fontWeight: '800',
        fill: '#85aebc',
        align: 'center'
      });
      empty.anchor.set(0.5);
      empty.position.set(width / 2, layout.content.y + layout.content.height / 2);
      this.container.addChild(empty);
    } else {
      visibleItems.forEach((item, index) => this.addCard(item, index, layout));
    }

    const footerY = panel.y + panel.height - footerHeight / 2 + 4;
    const closeWidth = Math.min(layout.veryCompact ? 174 : 220, panel.width * 0.34);
    const closeHeight = layout.veryCompact ? 32 : 40;
    const paging = layout.totalPages > 1;
    const pageButtonWidth = layout.veryCompact ? 52 : 72;
    if (paging) {
      this.controls.previous = this.createButton('<', panel.x + pad + pageButtonWidth / 2, footerY, pageButtonWidth, closeHeight, () => this.changePage(-1), 'previous');
      this.controls.next = this.createButton('>', panel.x + panel.width - pad - pageButtonWidth / 2, footerY, pageButtonWidth, closeHeight, () => this.changePage(1), 'next');
    }
    this.controls.close = this.createButton(translateText('CLOSE'), width / 2, footerY, closeWidth, closeHeight, () => this.close(), 'close');
    this.container.addChild(...Object.values(this.controls));
    this.redrawControls();

    const cardDebug = this.cards.map((card) => ({
      id: card._item.id,
      stacks: card._item.stacks,
      card: toBounds(card),
      icon: toBounds(card._nodes.icon),
      name: toBounds(card._nodes.name),
      description: toBounds(card._nodes.description),
      stack: toBounds(card._nodes.stack)
    }));
    const layoutWarnings = [];
    for (let i = 0; i < cardDebug.length; i += 1) {
      const current = cardDebug[i];
      if (current.name && current.description && overlaps(current.name, current.description, 1)) layoutWarnings.push(`${current.id}: name overlaps description`);
      if (current.description && current.stack && overlaps(current.description, current.stack, 1)) layoutWarnings.push(`${current.id}: description overlaps stack`);
      for (let j = i + 1; j < cardDebug.length; j += 1) {
        if (overlaps(current.card, cardDebug[j].card, 1)) layoutWarnings.push(`${current.id}: overlaps ${cardDebug[j].id}`);
      }
    }
    this.debugLayout = {
      ...layout,
      panel: { ...layout.panel },
      content: { ...layout.content },
      cards: cardDebug,
      title: toBounds(title),
      subtitle: toBounds(subtitle),
      pageText: toBounds(pageText),
      controls: Object.fromEntries(Object.entries(this.controls).map(([id, control]) => [id, toBounds(control)])),
      layoutWarnings
    };
  }

  addCard(item, index, layout) {
    const row = Math.floor(index / layout.columns);
    const column = index % layout.columns;
    const x = layout.content.x + column * (layout.cardWidth + layout.gap);
    const y = layout.content.y + row * (layout.cardHeight + layout.gap);
    const card = new PIXI.Container();
    card.label = `tactical_loadout_${item.id}`;
    card.position.set(x, y);
    card.eventMode = 'static';
    card.cursor = 'default';
    card.hitArea = new PIXI.Rectangle(0, 0, layout.cardWidth, layout.cardHeight);
    card._item = item;
    const accent = Number(item.color) || CATEGORY_COLORS[item.category] || CATEGORY_COLORS.utility;

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, layout.cardWidth, layout.cardHeight, 7);
    bg.fill({ color: 0x061422, alpha: 0.97 });
    bg.stroke({ color: accent, width: 1.35, alpha: 0.7 });
    bg.rect(0, 12, 5, layout.cardHeight - 24);
    bg.fill({ color: accent, alpha: 0.78 });
    bg.rect(14, layout.veryCompact ? 28 : 36, layout.cardWidth - 28, 1);
    bg.fill({ color: accent, alpha: 0.18 });
    card.addChild(bg);

    const iconSize = layout.veryCompact ? Math.min(48, layout.cardHeight - 24) : layout.compact ? 54 : 66;
    const texture = GameAssets.getPowerupTexture?.(item.id);
    const icon = texture && GameAssets.isValidTexture(texture)
      ? new PIXI.Sprite(texture)
      : this.createFallbackIcon(item, iconSize);
    icon.anchor?.set?.(0.5);
    if (texture && GameAssets.isValidTexture(texture)) {
      const textureWidth = texture.width || icon.width || iconSize;
      const textureHeight = texture.height || icon.height || iconSize;
      icon.scale.set(iconSize / Math.max(1, textureWidth, textureHeight));
    }

    const category = createText(translateText(String(item.category || 'utility').toUpperCase()), {
      fontFamily: FONT_BODY,
      fontSize: layout.veryCompact ? 9 : 11,
      fontWeight: '900',
      fill: '#8eeeff'
    });
    const name = createText(translateText(item.name), {
      fontFamily: FONT_DISPLAY,
      fontSize: layout.veryCompact ? 17 : layout.compact ? 19 : 22,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#00111d',
      strokeThickness: 3
    });
    const description = createText(translateText(item.description), {
      fontFamily: FONT_BODY,
      fontSize: layout.veryCompact ? 11 : layout.compact ? 13 : 15,
      fontWeight: '700',
      fill: '#d7f5ff',
      wordWrap: true,
      align: layout.veryCompact ? 'left' : 'center'
    });
    const permanence = createText(translateText('PERMANENT THIS RUN'), {
      fontFamily: FONT_BODY,
      fontSize: layout.veryCompact ? 8 : 10,
      fontWeight: '900',
      fill: '#ffe68a'
    });
    const stack = createText(String(item.stacks), {
      fontFamily: FONT_DISPLAY,
      fontSize: layout.veryCompact ? 13 : 15,
      fontWeight: '900',
      fill: '#07101a'
    });
    stack.anchor.set(0.5);
    const stackBg = new PIXI.Graphics();
    const stackWidth = layout.veryCompact ? 38 : 44;
    const stackHeight = layout.veryCompact ? 20 : 24;
    stackBg.roundRect(-stackWidth / 2, -stackHeight / 2, stackWidth, stackHeight, 5);
    stackBg.fill({ color: accent, alpha: 0.96 });
    stackBg.stroke({ color: 0xffffff, width: 1, alpha: 0.52 });

    if (layout.veryCompact) {
      const left = 18;
      const textX = left + iconSize + 14;
      const textWidth = Math.max(120, layout.cardWidth - textX - 62);
      icon.position.set(left + iconSize / 2, layout.cardHeight / 2);
      category.position.set(textX, 11);
      name.position.set(textX, 27);
      fitText(name, textWidth, 22, 0.58);
      description.style.wordWrapWidth = textWidth;
      description.position.set(textX, 52);
      fitText(description, textWidth, Math.max(22, layout.cardHeight - 72), 0.58);
      permanence.position.set(textX, layout.cardHeight - 15);
      fitText(permanence, textWidth, 14, 0.62);
      stackBg.position.set(layout.cardWidth - 29, 22);
      stack.position.copyFrom(stackBg.position);
    } else {
      icon.position.set(layout.cardWidth / 2, Math.min(layout.cardHeight * 0.29, 76));
      category.anchor.set(0.5);
      category.position.set(layout.cardWidth / 2, 20);
      name.anchor.set(0.5);
      name.position.set(layout.cardWidth / 2, Math.min(layout.cardHeight * 0.54, 132));
      fitText(name, layout.cardWidth - 34, 30, 0.58);
      description.anchor.set(0.5, 0);
      description.style.wordWrapWidth = layout.cardWidth - 34;
      description.position.set(layout.cardWidth / 2, Math.min(layout.cardHeight * 0.64, 157));
      fitText(description, layout.cardWidth - 34, Math.max(28, layout.cardHeight - description.y - 42), 0.58);
      permanence.anchor.set(0.5, 1);
      permanence.position.set(layout.cardWidth / 2, layout.cardHeight - 13);
      fitText(permanence, layout.cardWidth - 78, 18, 0.62);
      stackBg.position.set(layout.cardWidth - 30, 24);
      stack.position.copyFrom(stackBg.position);
    }

    card.addChild(icon, category, name, description, permanence, stackBg, stack);
    card._nodes = { bg, icon, category, name, description, permanence, stackBg, stack };
    card.on('pointerover', () => {
      bg.tint = 0xbfefff;
      playMenuFocusSfx(0.06);
    });
    card.on('pointerout', () => {
      bg.tint = 0xffffff;
    });
    this.cards.push(card);
    this.container.addChild(card);
  }

  createFallbackIcon(item, size) {
    const icon = new PIXI.Graphics();
    const radius = Math.max(16, size * 0.46);
    const color = Number(item.color) || CATEGORY_COLORS[item.category] || CATEGORY_COLORS.utility;
    icon.circle(0, 0, radius);
    icon.fill({ color: 0x03101d, alpha: 0.96 });
    icon.circle(0, 0, radius - 2);
    icon.stroke({ color, width: 2, alpha: 0.92 });
    icon.circle(0, 0, radius * 0.58);
    icon.stroke({ color: 0xffffff, width: 1, alpha: 0.25 });
    const category = String(item.category || 'utility');
    if (category === 'offense') {
      icon.poly([-5, -radius * 0.62, 7, -4, 1, -4, 7, radius * 0.62, -8, 2, -2, 2]);
      icon.fill({ color, alpha: 0.95 });
    } else if (category === 'mobility') {
      icon.moveTo(-radius * 0.45, -radius * 0.34);
      icon.lineTo(0, 0);
      icon.lineTo(-radius * 0.45, radius * 0.34);
      icon.moveTo(0, -radius * 0.34);
      icon.lineTo(radius * 0.45, 0);
      icon.lineTo(0, radius * 0.34);
      icon.stroke({ color, width: 3, alpha: 0.94 });
    } else if (category === 'defense') {
      icon.poly([0, -radius * 0.62, radius * 0.5, -radius * 0.36, radius * 0.4, radius * 0.35, 0, radius * 0.65, -radius * 0.4, radius * 0.35, -radius * 0.5, -radius * 0.36]);
      icon.fill({ color, alpha: 0.28 });
      icon.poly([0, -radius * 0.62, radius * 0.5, -radius * 0.36, radius * 0.4, radius * 0.35, 0, radius * 0.65, -radius * 0.4, radius * 0.35, -radius * 0.5, -radius * 0.36]);
      icon.stroke({ color, width: 2, alpha: 0.96 });
    } else {
      for (const [x, y] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
        icon.circle(x * radius, y * radius, Math.max(3, radius * 0.12));
        icon.fill({ color, alpha: 0.9 });
      }
    }
    icon._tacticalLoadoutFallback = true;
    return icon;
  }

  createButton(label, x, y, width, height, onPress, id) {
    const button = new PIXI.Container();
    button.label = `tactical_loadout_control_${id}`;
    button.position.set(x, y);
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.hitArea = new PIXI.Rectangle(-width / 2, -height / 2, width, height);
    button._controlId = id;
    button._size = { width, height };
    button._press = onPress;
    const bg = new PIXI.Graphics();
    const text = createText(label, {
      fontFamily: FONT_DISPLAY,
      fontSize: id === 'close' ? 17 : 22,
      fontWeight: '900',
      fill: '#ffffff',
      align: 'center'
    });
    text.anchor.set(0.5);
    fitText(text, width - 18, height - 10, 0.62);
    button.addChild(bg, text);
    button._nodes = { bg, text };
    button.on('pointerover', () => this.setFocusedControl(id));
    button.on('pointertap', () => {
      this.setFocusedControl(id, { silent: true });
      playMenuConfirmSfx(0.12);
      onPress?.();
    });
    return button;
  }

  redrawControls() {
    for (const [id, button] of Object.entries(this.controls)) {
      const focused = id === this.focusedControl;
      const { width, height } = button._size;
      const bg = button._nodes.bg;
      bg.clear();
      bg.roundRect(-width / 2, -height / 2, width, height, 6);
      bg.fill({ color: focused ? 0x0c3850 : 0x061827, alpha: 0.98 });
      bg.stroke({ color: focused ? 0xffffff : id === 'close' ? 0xffd56a : 0x37f5ff, width: focused ? 2.2 : 1.2, alpha: focused ? 0.96 : 0.68 });
      bg.rect(-width / 2 + 8, -height / 2 + 6, focused ? 4 : 2, height - 12);
      bg.fill({ color: id === 'close' ? 0xffd56a : 0x37f5ff, alpha: focused ? 0.9 : 0.5 });
    }
  }

  setFocusedControl(id, { silent = false } = {}) {
    if (!this.controls[id] || id === this.focusedControl) return;
    this.focusedControl = id;
    this.redrawControls();
    if (!silent) playMenuFocusSfx(0.09);
  }

  changePage(direction) {
    const totalPages = this.debugLayout?.totalPages || 1;
    if (totalPages <= 1) return false;
    const next = (this.pageIndex + Math.sign(direction || 1) + totalPages) % totalPages;
    if (next === this.pageIndex) return false;
    this.pageIndex = next;
    playMenuFocusSfx(0.1);
    this.rebuild();
    return true;
  }

  setupKeyboardNavigation() {
    if (typeof window === 'undefined') return;
    this.keyHandler = (event) => {
      const key = event.key || event.code;
      const left = key === 'ArrowLeft' || key === 'a' || key === 'A' || event.code === 'KeyA';
      const right = key === 'ArrowRight' || key === 'd' || key === 'D' || event.code === 'KeyD';
      const close = key === 'Escape';
      if (!left && !right && !close) return;
      event.preventDefault();
      event.stopPropagation();
      if (close) this.close();
      else this.changePage(left ? -1 : 1);
    };
    window.addEventListener('keydown', this.keyHandler, true);
  }

  update(delta = 1) {
    if (this.closed) return;
    updateMenuFx(this, delta);
    const nav = this.gamepadNavigator.update();
    if (!nav.connected || !nav.active) return;
    if (nav.pressed.cancel || nav.pressed.menu || nav.pressed.back) {
      this.close();
      return;
    }
    if (nav.pressed.left || nav.pressed.lb) this.changePage(-1);
    if (nav.pressed.right || nav.pressed.rb) this.changePage(1);
    if (nav.pressed.up || nav.pressed.down) this.setFocusedControl('close');
    if (nav.pressed.confirm) this.controls[this.focusedControl]?._press?.();
  }

  setSelectedIds(selectedIds = []) {
    this.selectedIds = Array.isArray(selectedIds) ? selectedIds.slice() : [];
    this.items = groupTacticalAugments(this.selectedIds);
    this.pageIndex = clamp(this.pageIndex, 0, calculateTacticalLoadoutLayout(this.getWidth(), this.getHeight(), this.items.length).totalPages - 1);
    this.rebuild();
  }

  resize() {
    this.rebuild();
  }

  rebuild() {
    if (this.closed || !this.container || this.container.destroyed) return;
    destroyMenuFx(this);
    const children = this.container.removeChildren();
    children.forEach((child) => child?.destroy?.({ children: true }));
    this.menuFx = null;
    this.build();
  }

  getDebugBounds() {
    return {
      overlay: toBounds(this.container),
      panel: this.debugLayout?.panel || null,
      title: this.debugLayout?.title || null,
      subtitle: this.debugLayout?.subtitle || null,
      pageText: this.debugLayout?.pageText || null,
      cards: this.debugLayout?.cards || [],
      controls: this.debugLayout?.controls || {}
    };
  }

  getDebugState() {
    const start = this.pageIndex * (this.debugLayout?.pageSize || 1);
    return {
      visible: Boolean(this.container?.parent) && !this.closed,
      closed: this.closed,
      selectedIds: this.selectedIds.slice(),
      selectedCount: this.selectedIds.length,
      uniqueCount: this.items.length,
      items: this.items.map((item) => ({
        id: item.id,
        stacks: item.stacks,
        known: item.known,
        name: item.name,
        translatedName: translateText(item.name),
        description: item.description,
        translatedDescription: translateText(item.description),
        category: item.category,
        color: item.color,
        maxStacks: item.maxStacks
      })),
      pageIndex: this.pageIndex,
      pageNumber: this.pageIndex + 1,
      pageCount: this.debugLayout?.totalPages || 1,
      pageSize: this.debugLayout?.pageSize || 1,
      visibleIds: this.items.slice(start, start + (this.debugLayout?.pageSize || 1)).map((item) => item.id),
      focusedControl: this.focusedControl,
      layout: this.debugLayout,
      bounds: this.getDebugBounds(),
      menuFx: this.menuFx?.getDebugState?.() || null
    };
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    playMenuBackSfx(0.12);
    if (this.keyHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
    this.languageUnsubscribe?.();
    this.languageUnsubscribe = null;
    if (this.container?.parent) this.container.parent.removeChild(this.container);
    destroyMenuFx(this);
    if (this.container && !this.container.destroyed) this.container.destroy({ children: true });
    this.onClose?.();
  }

  destroy() {
    this.close();
  }
}
