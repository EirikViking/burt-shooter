import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { getAccessibilitySettings } from '../config/AccessibilitySettings.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { translateText } from '../i18n/index.js';
import { GameAssets } from '../utils/GameAssets.js';
import { createText, FONT_BODY, FONT_DISPLAY } from '../utils/pixiText.js';
import { playMenuConfirmSfx, playMenuFocusSfx } from './MenuFxLayer.js';

const OPEN_DURATION_MS = 180;
const CLOSE_DURATION_MS = 160;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function fitText(text, maxWidth, minScale = 0.7) {
  if (!text || !Number.isFinite(maxWidth) || maxWidth <= 0) return;
  text.scale.set(1);
  text.updateText?.(false);
  if (text.width > maxWidth) text.scale.set(Math.max(minScale, maxWidth / text.width));
}

function getTextHeight(text) {
  text.updateText?.(false);
  return Math.ceil(text.height || Number(text.style?.lineHeight) || Number(text.style?.fontSize) || 18);
}

function createPanelFrame(graphics, x, y, width, height, {
  fill = 0x071421,
  fillAlpha = 0.96,
  stroke = 0x37f5ff,
  strokeAlpha = 0.5,
  warning = false
} = {}) {
  graphics.roundRect(x, y, width, height, 7);
  graphics.fill({ color: fill, alpha: fillAlpha });
  graphics.stroke({ color: warning ? 0xff8a58 : stroke, width: 1.2, alpha: strokeAlpha });
}

export class ModeBriefingOverlay {
  constructor(game, {
    data,
    onClose = null,
    onVariantChange = null
  } = {}) {
    this.game = game;
    GameAssets.ensureMicroSignalTextures?.().catch(() => {});
    this.data = data;
    this.onClose = typeof onClose === 'function' ? onClose : null;
    this.onVariantChange = typeof onVariantChange === 'function' ? onVariantChange : null;
    this.container = new PIXI.Container();
    this.container.zIndex = 2200000;
    this.container.label = 'ui_modeBriefingOverlay';
    this.container.sortableChildren = true;
    this.container.eventMode = 'static';
    this.container.on('wheel', (event) => {
      event.stopPropagation?.();
      this.scrollBy(Number(event.deltaY) || 0, { silent: true });
    });
    this.gamepadNavigator = new GamepadNavigator();
    this.gamepadNavigator.suppressUntilReleased();
    this.keyHandler = null;
    this.openedAt = Date.now();
    this.closingAt = 0;
    this.closed = false;
    this.reducedMotion = Boolean(getAccessibilitySettings().prefersReducedMotion);
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.focusTargets = [];
    this.focusedIndex = 0;
    this.loadoutTooltip = null;
    this.content = null;
    this.contentMask = null;
    this.debugLayout = null;
    this.build();
    this.setupKeyboardNavigation();
  }

  getWidth() {
    return Math.max(1, Number(this.game?.getWidth?.()) || Number(this.game?.app?.screen?.width) || 1920);
  }

  getHeight() {
    return Math.max(1, Number(this.game?.getHeight?.()) || Number(this.game?.app?.screen?.height) || 1080);
  }

  rebuild(data = this.data) {
    if (this.closed) return;
    this.data = data;
    this.container.removeChildren().forEach((child) => child.destroy?.({ children: true }));
    this.focusTargets = [];
    this.focusedIndex = 0;
    this.scrollY = 0;
    this.debugLayout = null;
    this.build();
  }

  build() {
    const width = this.getWidth();
    const height = this.getHeight();
    const compact = width < 1450 || height < 820;
    const veryShort = height < 700;
    const panelWidth = Math.min(1080, Math.round(width * (compact ? 0.75 : 0.72)));
    // The briefing is a decision aid, not a full-screen document. Keep it
    // content-driven so the rules never float above a dead lower half.
    const panelHeight = Math.min(Math.round(height * (veryShort ? 0.9 : (compact ? 0.78 : 0.58))), 620);
    const panelX = Math.round((width - panelWidth) / 2);
    const panelY = Math.round((height - panelHeight) / 2);
    const pad = compact ? 24 : 32;
    const hasVariants = Array.isArray(this.data?.variants) && this.data.variants.length > 1;
    const headerHeight = hasVariants ? (compact ? 136 : 152) : (compact ? 100 : 116);
    const footerHeight = compact ? 58 : 68;
    const contentTop = panelY + headerHeight;
    const contentBottom = panelY + panelHeight - footerHeight;
    const contentHeight = contentBottom - contentTop;
    const contentWidth = panelWidth - pad * 2;

    this.container.hitArea = new PIXI.Rectangle(0, 0, width, height);
    this.container.alpha = this.reducedMotion ? 1 : 0;
    this.container.scale.set(this.reducedMotion ? 1 : 0.985);
    this.container.pivot.set(width / 2, height / 2);
    this.container.position.set(width / 2, height / 2);

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x01050d, alpha: 0.79 });
    dim.eventMode = 'static';
    this.container.addChild(dim);

    const chrome = new PIXI.Graphics();
    chrome.roundRect(panelX, panelY, panelWidth, panelHeight, 10);
    chrome.fill({ color: 0x030b15, alpha: 0.985 });
    chrome.stroke({ color: this.data?.accent || 0x37f5ff, width: 2, alpha: 0.92 });
    chrome.rect(panelX + 10, panelY + 14, 4, panelHeight - 28);
    chrome.fill({ color: this.data?.secondary || 0xffd15c, alpha: 0.78 });
    chrome.rect(panelX + pad, panelY + headerHeight - 10, contentWidth, 1);
    chrome.fill({ color: 0xffffff, alpha: 0.16 });
    chrome.rect(panelX + pad, contentBottom + 8, contentWidth, 1);
    chrome.fill({ color: this.data?.secondary || 0xffd15c, alpha: 0.2 });
    this.container.addChild(chrome);

    const eyebrow = createText(translateText('MODE BRIEFING'), {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 15 : 16,
      fontWeight: '900',
      fill: '#7fffd8',
      letterSpacing: 1.4
    });
    eyebrow.position.set(panelX + pad, panelY + (compact ? 15 : 19));
    this.container.addChild(eyebrow);

    const title = createText(this.data?.details?.title || this.data?.variantTitle || this.data?.title || '', {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 30 : 40,
      fontWeight: '900',
      fill: '#f6fbff',
      stroke: '#00111d',
      strokeThickness: 4
    });
    title.position.set(panelX + pad, panelY + (compact ? 37 : 43));
    fitText(title, contentWidth * 0.7, 0.68);
    this.container.addChild(title);

    const status = this.createStatusBadge(this.data?.status, panelX + panelWidth - pad, panelY + (compact ? 43 : 51), compact);
    if (status) this.container.addChild(status);
    if (hasVariants) {
      this.createVariantTabs(
        this.data.variants,
        panelX + pad,
        panelY + (compact ? 80 : 92),
        contentWidth,
        compact ? 32 : 36
      );
    }

    this.content = new PIXI.Container();
    this.content.position.set(panelX + pad, contentTop);
    this.container.addChild(this.content);
    this.contentMask = new PIXI.Graphics();
    this.contentMask.rect(panelX + pad, contentTop, contentWidth, contentHeight);
    this.contentMask.fill({ color: 0xffffff, alpha: 1 });
    this.container.addChild(this.contentMask);
    this.content.mask = this.contentMask;

    let cursorY = 4;
    const intro = createText(translateText(this.data?.details?.intro || this.data?.summary?.join(' ') || ''), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 17 : 19,
      fontWeight: '600',
      fill: '#e8f8ff',
      wordWrap: true,
      wordWrapWidth: contentWidth,
      lineHeight: compact ? 23 : 27
    });
    intro.position.set(0, cursorY);
    this.content.addChild(intro);
    cursorY += getTextHeight(intro) + (compact ? 12 : 16);

    const sections = Array.isArray(this.data?.details?.sections) ? this.data.details.sections : [];
    for (let index = 0; index < sections.length;) {
      const section = sections[index];
      const next = sections[index + 1];
      const pair = section?.span !== 2 && next && next.span !== 2;
      const gap = compact ? 10 : 14;
      if (pair) {
        const cardWidth = (contentWidth - gap) / 2;
        const first = this.createSection(section, 0, cursorY, cardWidth, compact);
        const second = this.createSection(next, cardWidth + gap, cursorY, cardWidth, compact);
        this.content.addChild(first.container, second.container);
        cursorY += Math.max(first.height, second.height) + gap;
        index += 2;
      } else {
        const card = this.createSection(section, 0, cursorY, contentWidth, compact);
        this.content.addChild(card.container);
        cursorY += card.height + gap;
        index += 1;
      }
    }

    this.maxScrollY = Math.max(0, cursorY - contentHeight + 4);
    this.applyScroll();

    const closeWidth = compact ? 200 : 230;
    const closeHeight = compact ? 44 : 48;
    const close = this.createButton(
      `${translateText('BACK')}  ${this.getBackGlyph()}`,
      panelX + panelWidth / 2,
      panelY + panelHeight - footerHeight / 2 + 5,
      closeWidth,
      closeHeight,
      () => this.requestClose(),
      'close'
    );
    this.container.addChild(close);
    this.focusTargets.push(close);
    this.setFocusedIndex(0, { silent: true });

    this.debugLayout = {
      panel: { x: panelX, y: panelY, width: panelWidth, height: panelHeight },
      content: { x: panelX + pad, y: contentTop, width: contentWidth, height: contentHeight },
      contentHeight: cursorY,
      maxScrollY: this.maxScrollY,
      compact,
      sectionIds: sections.map((section) => section.id),
      loadoutIds: sections.flatMap((section) => section.upgrades?.map((upgrade) => upgrade.id) || [])
    };
    this.applyScroll();
  }

  createVariantTabs(variants, x, y, width, height) {
    const gap = 8;
    const tabWidth = (width - gap * (variants.length - 1)) / variants.length;
    variants.forEach((variant, index) => {
      const tab = new PIXI.Container();
      tab.position.set(x + index * (tabWidth + gap), y);
      tab.eventMode = 'static';
      tab.cursor = 'pointer';
      tab.hitArea = new PIXI.Rectangle(0, 0, tabWidth, height);
      tab._focusType = 'variant';
      tab._variant = variant;
      tab._size = { width: tabWidth, height };
      tab._press = () => {
        if (variant.selected) return;
        playMenuConfirmSfx(0.12);
        this.onVariantChange?.(variant.id);
      };
      const bg = new PIXI.Graphics();
      const label = createText(translateText(variant.label), {
        fontFamily: FONT_DISPLAY,
        fontSize: Math.max(14, Math.round(height * 0.4)),
        fontWeight: '900',
        fill: variant.selected ? '#ffffff' : '#a8dbe7',
        align: 'center'
      });
      label.anchor.set(0.5);
      label.position.set(tabWidth / 2, height / 2);
      fitText(label, tabWidth - 20, 0.65);
      tab.addChild(bg, label);
      tab._nodes = { bg, label };
      tab.on('pointerover', () => {
        const targetIndex = this.focusTargets.indexOf(tab);
        if (targetIndex >= 0) this.setFocusedIndex(targetIndex);
      });
      tab.on('pointertap', () => tab._press?.());
      this.container.addChild(tab);
      this.focusTargets.push(tab);
    });
  }

  createStatusBadge(label, rightX, centerY, compact) {
    if (!label) return null;
    const text = createText(translateText(label), {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 14 : 16,
      fontWeight: '900',
      fill: '#ffe7b0'
    });
    fitText(text, compact ? 150 : 190, 0.7);
    const width = Math.max(compact ? 94 : 112, text.width + (compact ? 24 : 30));
    const height = compact ? 30 : 34;
    const badge = new PIXI.Container();
    badge.position.set(rightX - width, centerY - height / 2);
    const bg = new PIXI.Graphics();
    createPanelFrame(bg, 0, 0, width, height, {
      fill: 0x2b140d,
      fillAlpha: 0.96,
      stroke: 0xff8a58,
      strokeAlpha: 0.86,
      warning: true
    });
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    badge.addChild(bg, text);
    return badge;
  }

  getSectionHeight(section, compact) {
    const base = compact ? 46 : 52;
    if (section.upgrades?.length) return compact ? 150 : 174;
    if (section.tiles?.length) return compact ? 104 : 118;
    if (section.items?.length) return base + section.items.length * (compact ? 28 : 32);
    return compact ? 82 : 94;
  }

  createSection(section = {}, x, y, width, compact) {
    const height = this.getSectionHeight(section, compact);
    const container = new PIXI.Container();
    container.position.set(x, y);
    const bg = new PIXI.Graphics();
    createPanelFrame(bg, 0, 0, width, height, {
      fill: section.tone === 'warning' ? 0x160e0b : 0x061421,
      fillAlpha: 0.91,
      stroke: section.tone === 'warning' ? 0xff8a58 : (this.data?.accent || 0x37f5ff),
      strokeAlpha: section.tone === 'warning' ? 0.44 : 0.28,
      warning: section.tone === 'warning'
    });
    container.addChild(bg);

    const title = createText(translateText(section.title || ''), {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 16 : 18,
      fontWeight: '900',
      fill: section.tone === 'warning' ? '#ffbd91' : '#7fffd8',
      letterSpacing: 0.7
    });
    title.position.set(14, compact ? 10 : 12);
    fitText(title, width - 28, 0.68);
    container.addChild(title);
    const bodyTop = compact ? 35 : 41;

    if (section.tiles?.length) {
      const gap = compact ? 7 : 10;
      const tileWidth = (width - 28 - gap * (section.tiles.length - 1)) / section.tiles.length;
      section.tiles.forEach((tile, index) => {
        const tileX = 14 + index * (tileWidth + gap);
        const tileBg = new PIXI.Graphics();
        tileBg.roundRect(tileX, bodyTop, tileWidth, compact ? 54 : 62, 5);
        tileBg.fill({ color: 0x03101b, alpha: 0.86 });
        tileBg.stroke({ color: this.data?.secondary || 0xffd15c, width: 1, alpha: 0.28 });
        container.addChild(tileBg);
        const label = createText(translateText(tile.label || ''), {
          fontFamily: FONT_DISPLAY,
          fontSize: compact ? 14 : 15,
          fontWeight: '900',
          fill: '#8fa9b8'
        });
        label.position.set(tileX + 9, bodyTop + 7);
        fitText(label, tileWidth - 18, 0.62);
        const value = createText(translateText(tile.value || ''), {
          fontFamily: FONT_DISPLAY,
          fontSize: compact ? 18 : 20,
          fontWeight: '900',
          fill: tile.tone === 'warning' ? '#ffb08a' : '#f3fbff'
        });
        value.position.set(tileX + 9, bodyTop + (compact ? 26 : 30));
        fitText(value, tileWidth - 18, 0.58);
        container.addChild(label, value);
      });
    } else if (section.upgrades?.length) {
      this.createLoadout(section, container, width, bodyTop, compact);
    } else if (section.items?.length) {
      section.items.forEach((item, index) => {
        const bulletY = bodyTop + index * (compact ? 28 : 32);
        const marker = new PIXI.Sprite(GameAssets.getMicroSignalTexture('contact') || PIXI.Texture.EMPTY);
        marker.anchor.set(0.5);
        marker.position.set(18, bulletY + (compact ? 7 : 8));
        marker.width = compact ? 12 : 14;
        marker.height = compact ? 15 : 17;
        marker.tint = section.tone === 'warning' ? 0xff8a58 : (this.data?.accent || 0x37f5ff);
        marker.alpha = 0.92;
        marker.rotation = index % 2 ? 0.18 : -0.18;
        marker.blendMode = 'add';
        marker.label = 'modeBriefingAuthoredBullet';
        GameAssets.ensureMicroSignalTextures?.().then(() => {
          const texture = GameAssets.getMicroSignalTexture('contact');
          if (texture && !marker.destroyed) marker.texture = texture;
        }).catch(() => {});
        const line = createText(translateText(item), {
          fontFamily: FONT_BODY,
          fontSize: compact ? 17 : 18,
          fontWeight: '600',
          fill: section.tone === 'warning' ? '#ffd9c7' : '#e2f5ff',
          wordWrap: true,
          wordWrapWidth: width - 42,
          lineHeight: compact ? 21 : 23
        });
        line.position.set(29, bulletY);
        container.addChild(marker, line);
      });
    } else if (section.body) {
      const body = createText(translateText(section.body), {
        fontFamily: FONT_BODY,
        fontSize: compact ? 17 : 18,
        fontWeight: '600',
        fill: '#e2f5ff',
        wordWrap: true,
        wordWrapWidth: width - 28,
        lineHeight: compact ? 19 : 23
      });
      body.position.set(14, bodyTop);
      container.addChild(body);
    }
    return { container, height };
  }

  createLoadout(section, container, width, bodyTop, compact) {
    const gap = compact ? 7 : 9;
    const chipWidth = (width - 28 - gap * (section.upgrades.length - 1)) / section.upgrades.length;
    const chipHeight = compact ? 48 : 56;
    section.upgrades.forEach((upgrade, index) => {
      const chip = new PIXI.Container();
      const chipX = 14 + index * (chipWidth + gap);
      chip.position.set(chipX, bodyTop);
      chip.eventMode = 'static';
      chip.cursor = 'pointer';
      chip.hitArea = new PIXI.Rectangle(0, 0, chipWidth, chipHeight);
      chip._focusType = 'upgrade';
      chip._upgrade = upgrade;
      chip._size = { width: chipWidth, height: chipHeight };
      const chipBg = new PIXI.Graphics();
      const texture = GameAssets.getPowerupTexture(upgrade.iconId || upgrade.id);
      const icon = texture && GameAssets.isValidTexture(texture) ? new PIXI.Sprite(texture) : null;
      if (icon) {
        icon.anchor.set(0.5);
        const iconSize = compact ? 25 : 31;
        icon.scale.set(iconSize / Math.max(1, texture.width || 1, texture.height || 1));
        icon.position.set(compact ? 18 : 22, chipHeight / 2);
      }
      const label = createText(translateText(upgrade.name), {
        fontFamily: FONT_DISPLAY,
        fontSize: compact ? 13 : 15,
        fontWeight: '900',
        fill: '#f4fbff',
        align: 'left'
      });
      label.anchor.set(0, 0.5);
      label.position.set(icon ? (compact ? 35 : 42) : 10, chipHeight / 2);
      fitText(label, chipWidth - (icon ? (compact ? 42 : 49) : 20), 0.58);
      chip.addChild(chipBg);
      if (icon) chip.addChild(icon);
      chip.addChild(label);
      chip._nodes = { bg: chipBg, label };
      chip.on('pointerover', () => {
        const targetIndex = this.focusTargets.indexOf(chip);
        if (targetIndex >= 0) this.setFocusedIndex(targetIndex);
      });
      chip.on('pointertap', () => {
        const targetIndex = this.focusTargets.indexOf(chip);
        if (targetIndex >= 0) this.setFocusedIndex(targetIndex);
      });
      container.addChild(chip);
      this.focusTargets.push(chip);
    });

    const explanation = createText(translateText(section.body || ''), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 15 : 17,
      fontWeight: '600',
      fill: '#d9eef7',
      wordWrap: true,
      wordWrapWidth: width - 28,
      lineHeight: compact ? 17 : 21
    });
    explanation.position.set(14, bodyTop + chipHeight + (compact ? 7 : 9));
    container.addChild(explanation);

    this.loadoutTooltip = createText('', {
      fontFamily: FONT_BODY,
      fontSize: compact ? 14 : 16,
      fontWeight: '600',
      fill: '#ffe7aa',
      wordWrap: true,
      wordWrapWidth: width - 28,
      lineHeight: compact ? 16 : 19
    });
    this.loadoutTooltip.position.set(14, bodyTop + chipHeight + (compact ? 31 : 37));
    container.addChild(this.loadoutTooltip);
  }

  createButton(label, x, y, width, height, onPress, id) {
    const button = new PIXI.Container();
    button.position.set(x, y);
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.hitArea = new PIXI.Rectangle(-width / 2, -height / 2, width, height);
    button._focusType = 'button';
    button._controlId = id;
    button._size = { width, height };
    button._press = onPress;
    const bg = new PIXI.Graphics();
    const text = createText(label, {
      fontFamily: FONT_DISPLAY,
      fontSize: 16,
      fontWeight: '900',
      fill: '#ffffff'
    });
    text.anchor.set(0.5);
    fitText(text, width - 24, 0.65);
    button.addChild(bg, text);
    button._nodes = { bg, text };
    button.on('pointerover', () => {
      const index = this.focusTargets.indexOf(button);
      if (index >= 0) this.setFocusedIndex(index);
    });
    button.on('pointertap', () => {
      playMenuConfirmSfx(0.14);
      onPress?.();
    });
    return button;
  }

  getBackGlyph() {
    return this.gamepadNavigator.wasRecentlyActive() ? '[B]' : '[ESC]';
  }

  setFocusedIndex(index, { silent = false } = {}) {
    if (!this.focusTargets.length) return;
    const next = (index + this.focusTargets.length) % this.focusTargets.length;
    if (next === this.focusedIndex && this.focusTargets[next]?._focused) return;
    this.focusedIndex = next;
    this.focusTargets.forEach((target, targetIndex) => {
      target._focused = targetIndex === next;
      this.redrawFocusTarget(target);
    });
    const target = this.focusTargets[next];
    if (target?._upgrade && this.loadoutTooltip) {
      const detail = target._upgrade.tooltip || target._upgrade.description || '';
      this.loadoutTooltip.text = detail
        ? `${translateText(target._upgrade.name)} — ${translateText(detail)}`
        : translateText(target._upgrade.name);
    }
    if (!silent) playMenuFocusSfx(0.08);
  }

  redrawFocusTarget(target) {
    const bg = target?._nodes?.bg;
    const size = target?._size;
    if (!bg || !size) return;
    bg.clear();
    const focused = Boolean(target._focused);
    const accent = target._upgrade?.color || this.data?.accent || 0x37f5ff;
    if (target._focusType === 'upgrade' || target._focusType === 'variant') {
      bg.roundRect(0, 0, size.width, size.height, 5);
      const selected = Boolean(target._variant?.selected);
      bg.fill({ color: selected ? accent : focused ? 0x0c3042 : 0x03101b, alpha: selected ? 0.68 : 0.96 });
      bg.stroke({ color: focused ? 0xffffff : accent, width: focused || selected ? 2 : 1, alpha: focused ? 0.96 : selected ? 0.82 : 0.5 });
    } else {
      bg.roundRect(-size.width / 2, -size.height / 2, size.width, size.height, 6);
      bg.fill({ color: focused ? 0x0c3850 : 0x061827, alpha: 0.98 });
      bg.stroke({ color: focused ? 0xffffff : this.data?.secondary || 0xffd15c, width: focused ? 2.2 : 1.2, alpha: focused ? 0.96 : 0.7 });
    }
  }

  setupKeyboardNavigation() {
    if (typeof window === 'undefined') return;
    this.keyHandler = (event) => {
      const isClose = event.key === 'Escape' || event.key === 'Backspace';
      const isConfirm = event.key === 'Enter' || event.code === 'Space';
      const isNext = event.key === 'Tab' || event.key === 'ArrowRight';
      const isPrevious = (event.key === 'Tab' && event.shiftKey) || event.key === 'ArrowLeft';
      const isScrollUp = event.key === 'ArrowUp' || event.key === 'PageUp';
      const isScrollDown = event.key === 'ArrowDown' || event.key === 'PageDown';
      if (!isClose && !isConfirm && !isNext && !isPrevious && !isScrollUp && !isScrollDown) return;
      event.preventDefault();
      event.stopPropagation();
      if (isClose) {
        this.requestClose();
      } else if (isConfirm) {
        this.focusTargets[this.focusedIndex]?._press?.();
      } else if (isPrevious) {
        this.setFocusedIndex(this.focusedIndex - 1);
      } else if (isNext) {
        this.setFocusedIndex(this.focusedIndex + 1);
      } else {
        this.scrollBy(isScrollUp ? -90 : 90);
      }
    };
    window.addEventListener('keydown', this.keyHandler, true);
  }

  scrollBy(delta, { silent = false } = {}) {
    const next = clamp(this.scrollY + delta, 0, this.maxScrollY);
    if (next === this.scrollY) return false;
    this.scrollY = next;
    this.applyScroll();
    if (!silent) playMenuFocusSfx(0.05);
    return true;
  }

  applyScroll() {
    if (!this.content || !this.debugLayout?.content) return;
    this.content.y = this.debugLayout.content.y - this.scrollY;
  }

  processGamepad() {
    const nav = this.gamepadNavigator.update();
    if (!nav.connected || !nav.active) return;
    if (nav.pressed.cancel || nav.pressed.back) {
      this.requestClose();
      return;
    }
    if (nav.pressed.left) this.setFocusedIndex(this.focusedIndex - 1);
    if (nav.pressed.right) this.setFocusedIndex(this.focusedIndex + 1);
    if (nav.pressed.up) this.scrollBy(-90);
    if (nav.pressed.down) this.scrollBy(90);
    if (nav.pressed.confirm) this.focusTargets[this.focusedIndex]?._press?.();
  }

  update() {
    if (this.closed) return;
    this.processGamepad();
    if (this.reducedMotion) return;
    const now = Date.now();
    if (this.closingAt) {
      const progress = clamp((now - this.closingAt) / CLOSE_DURATION_MS, 0, 1);
      this.container.alpha = 1 - progress;
      this.container.scale.set(1 - progress * 0.012);
      if (progress >= 1) this.close();
      return;
    }
    const progress = clamp((now - this.openedAt) / OPEN_DURATION_MS, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    this.container.alpha = eased;
    this.container.scale.set(0.985 + eased * 0.015);
  }

  requestClose() {
    if (this.closed || this.closingAt) return;
    AudioManager.playSfx('ui_open', { volume: 0.2, force: true });
    if (this.reducedMotion) {
      this.close();
      return;
    }
    this.closingAt = Date.now();
  }

  getDebugState() {
    return {
      open: !this.closed,
      modeId: this.data?.id || null,
      title: this.data?.details?.title || null,
      status: this.data?.status || null,
      focusedIndex: this.focusedIndex,
      focusedType: this.focusTargets[this.focusedIndex]?._focusType || null,
      focusedUpgradeId: this.focusTargets[this.focusedIndex]?._upgrade?.id || null,
      scrollY: this.scrollY,
      ...this.debugLayout
    };
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.keyHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
    if (this.container?.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
    this.onClose?.();
  }
}
