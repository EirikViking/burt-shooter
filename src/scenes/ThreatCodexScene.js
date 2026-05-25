import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { THREAT_CODEX_CATEGORIES, getThreatCodexCatalog } from '../config/ThreatCodexCatalog.js';
import { clearThreatCodexUnread, getThreatCodexState } from '../progression/ThreatDiscoveryState.js';
import { createText } from '../utils/pixiText.js';
import { translateText } from '../i18n/index.js';

function titleCaseSignal(id = '') {
  return String(id)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export class ThreatCodexScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.categoryIndex = 0;
    this.entryIndex = 0;
    this.categoryButtons = [];
    this.entryRows = [];
    this.keyHandler = null;
    this.gamepadLatchUntil = 0;
    this.catalog = getThreatCodexCatalog();
    this.discoveryState = getThreatCodexState();
  }

  init() {
    this.container.removeChildren();
    this.container.sortableChildren = true;
    this.catalog = getThreatCodexCatalog();
    this.discoveryState = clearThreatCodexUnread();
    this.categoryButtons = [];
    this.entryRows = [];
    this.createLayout();
    this.keyHandler = (event) => this.handleKeyDown(event);
    window.addEventListener('keydown', this.keyHandler);
  }

  cleanup() {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = null;
  }

  destroy() {
    this.cleanup();
    this.container.removeChildren();
  }

  getCategory() {
    return THREAT_CODEX_CATEGORIES[this.categoryIndex] || THREAT_CODEX_CATEGORIES[0];
  }

  getEntriesForCategory(categoryId = this.getCategory().id) {
    const catalogEntries = this.catalog[categoryId] || [];
    const discovered = this.discoveryState.items?.[categoryId] || {};
    const merged = [...catalogEntries];
    const known = new Set(catalogEntries.map((entry) => entry.id));
    Object.entries(discovered).forEach(([id, item]) => {
      if (known.has(id)) return;
      merged.push({
        id,
        category: categoryId,
        name: item.name || titleCaseSignal(id),
        rarity: item.metadata?.rarity || 'Discovered',
        role: item.metadata?.role || 'Runtime signal',
        description: item.metadata?.description || 'Scanned during a run.',
        tip: item.metadata?.tip || 'Review the tell next time it appears.'
      });
    });
    return merged;
  }

  isDiscovered(entry) {
    return Boolean(this.discoveryState.items?.[entry.category || this.getCategory().id]?.[entry.id]);
  }

  getSelectedEntry() {
    const entries = this.getEntriesForCategory();
    return entries[Math.max(0, Math.min(entries.length - 1, this.entryIndex))] || null;
  }

  createLayout() {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compact = width < 760;
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, width, height);
    bg.fill({ color: 0x03070d, alpha: 1 });
    this.container.addChild(bg);

    const title = createText(translateText('THREAT CODEX'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 28 : 42,
      fontWeight: 'bold',
      fill: '#7dffcc',
      stroke: '#001616',
      strokeThickness: 4,
      align: 'center'
    });
    title.anchor.set(0.5, 0);
    title.position.set(width / 2, compact ? 18 : 24);
    this.container.addChild(title);

    const subtitle = createText(translateText('DISCOVERED SIGNALS AND SWARM PATTERNS'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 12 : 15,
      fontWeight: 'bold',
      fill: '#9cfbff',
      align: 'center'
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(width / 2, compact ? 54 : 74);
    this.container.addChild(subtitle);

    this.createCategories(compact);
    this.createEntryList(compact);
    this.createDetailPanel(compact);
    this.createBackButton(compact);
  }

  createCategories(compact) {
    const width = this.game.getWidth();
    const startY = compact ? 78 : 106;
    const availableWidth = width * 0.92;
    const buttonWidth = availableWidth / THREAT_CODEX_CATEGORIES.length;
    THREAT_CODEX_CATEGORIES.forEach((category, index) => {
      const selected = index === this.categoryIndex;
      const button = new PIXI.Container();
      button.eventMode = 'static';
      button.cursor = 'pointer';
      button.position.set(width * 0.04 + buttonWidth * index, startY);
      button.on('pointerdown', () => {
        this.categoryIndex = index;
        this.entryIndex = 0;
        AudioManager.playSfx('menuMove', { volume: 0.55 });
        this.refresh();
      });

      const bg = new PIXI.Graphics();
      bg.roundRect(0, 0, buttonWidth - 6, compact ? 30 : 36, 6);
      bg.fill({ color: selected ? 0x123936 : 0x07131f, alpha: selected ? 0.96 : 0.84 });
      bg.stroke({ color: selected ? 0x7dffcc : 0x315169, width: selected ? 2 : 1, alpha: 0.9 });
      button.addChild(bg);

      const label = createText(translateText(category.label.toUpperCase()), {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: compact ? 10 : 13,
        fontWeight: 'bold',
        fill: selected ? '#ffffff' : '#9cfbff',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: buttonWidth - 18
      });
      label.anchor.set(0.5);
      label.position.set((buttonWidth - 6) / 2, (compact ? 30 : 36) / 2);
      button.addChild(label);
      this.categoryButtons.push(button);
      this.container.addChild(button);
    });
  }

  createEntryList(compact) {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const listX = width * 0.05;
    const listY = compact ? 124 : 160;
    const listW = compact ? width * 0.42 : width * 0.36;
    const rowH = compact ? 32 : 38;
    const maxRows = Math.max(6, Math.floor((height - listY - 88) / rowH));
    const entries = this.getEntriesForCategory();
    const start = Math.max(0, Math.min(this.entryIndex - Math.floor(maxRows / 2), Math.max(0, entries.length - maxRows)));

    for (let rowIndex = 0; rowIndex < Math.min(maxRows, entries.length); rowIndex += 1) {
      const entryIndex = start + rowIndex;
      const entry = entries[entryIndex];
      const discovered = this.isDiscovered(entry);
      const selected = entryIndex === this.entryIndex;
      const row = new PIXI.Container();
      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.position.set(listX, listY + rowIndex * rowH);
      row.on('pointerdown', () => {
        this.entryIndex = entryIndex;
        AudioManager.playSfx('menuMove', { volume: 0.5 });
        this.refresh();
      });

      const bg = new PIXI.Graphics();
      bg.roundRect(0, 0, listW, rowH - 5, 5);
      bg.fill({ color: selected ? 0x163145 : 0x07101a, alpha: selected ? 0.98 : 0.76 });
      bg.stroke({ color: selected ? 0x7dffcc : 0x233a50, width: selected ? 2 : 1, alpha: 0.9 });
      row.addChild(bg);

      const label = createText(discovered ? entry.name.toUpperCase() : translateText('UNKNOWN SIGNAL'), {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: compact ? 12 : 15,
        fontWeight: 'bold',
        fill: discovered ? '#ffffff' : '#7b91a4',
        wordWrap: true,
        wordWrapWidth: listW - 58
      });
      label.anchor.set(0, 0.5);
      label.position.set(14, (rowH - 5) / 2);
      row.addChild(label);

      const count = this.discoveryState.items?.[entry.category || this.getCategory().id]?.[entry.id]?.timesSeen || 0;
      const seen = createText(discovered ? String(count) : '--', {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: compact ? 11 : 13,
        fontWeight: 'bold',
        fill: discovered ? '#7dffcc' : '#43576a'
      });
      seen.anchor.set(1, 0.5);
      seen.position.set(listW - 12, (rowH - 5) / 2);
      row.addChild(seen);

      this.entryRows.push(row);
      this.container.addChild(row);
    }
  }

  createDetailPanel(compact) {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const entry = this.getSelectedEntry();
    const category = this.getCategory();
    const discovered = entry && this.isDiscovered(entry);
    const stateItem = entry ? this.discoveryState.items?.[entry.category || category.id]?.[entry.id] : null;
    const panelX = compact ? width * 0.5 : width * 0.45;
    const panelY = compact ? 124 : 160;
    const panelW = width - panelX - width * 0.05;
    const panelH = height - panelY - 88;

    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 8);
    panel.fill({ color: 0x07101a, alpha: 0.88 });
    panel.stroke({ color: discovered ? 0x7dffcc : 0x315169, width: 2, alpha: 0.8 });
    this.container.addChild(panel);

    const name = createText(discovered ? entry.name.toUpperCase() : translateText('UNKNOWN SIGNAL'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 20 : 29,
      fontWeight: 'bold',
      fill: discovered ? '#ffffff' : '#7b91a4',
      wordWrap: true,
      wordWrapWidth: panelW - 38,
      lineHeight: compact ? 22 : 31
    });
    name.position.set(panelX + 22, panelY + 22);
    this.container.addChild(name);

    const role = createText(discovered ? `${entry.rarity}  |  ${entry.role}` : category.label.toUpperCase(), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 13 : 16,
      fontWeight: 'bold',
      fill: '#7dffcc',
      wordWrap: true,
      wordWrapWidth: panelW - 38
    });
    role.position.set(panelX + 22, panelY + (compact ? 80 : 100));
    this.container.addChild(role);

    const description = createText(discovered ? entry.description : translateText('SIGNAL DATA LOCKED'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 14 : 18,
      fill: '#d8fbff',
      wordWrap: true,
      wordWrapWidth: panelW - 38,
      lineHeight: compact ? 18 : 23
    });
    description.position.set(panelX + 22, panelY + (compact ? 116 : 142));
    this.container.addChild(description);

    const tip = createText(discovered ? `${translateText('TIP')}: ${entry.tip}` : translateText('DISCOVER THIS SIGNAL DURING A RUN'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 13 : 16,
      fontWeight: 'bold',
      fill: '#fff3a2',
      wordWrap: true,
      wordWrapWidth: panelW - 38,
      lineHeight: compact ? 17 : 21
    });
    tip.position.set(panelX + 22, panelY + panelH * 0.55);
    this.container.addChild(tip);

    const stats = createText(discovered
      ? `${translateText('SEEN')}: ${stateItem?.timesSeen || 0}   ${translateText('DEFEATED')}: ${stateItem?.timesDefeated || 0}`
      : `${translateText('SEEN')}: --   ${translateText('DEFEATED')}: --`, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 13 : 16,
      fontWeight: 'bold',
      fill: '#9cfbff'
    });
    stats.position.set(panelX + 22, panelY + panelH - 46);
    this.container.addChild(stats);
  }

  createBackButton(compact) {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const label = createText(translateText('BACK'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 17 : 21,
      fontWeight: 'bold',
      fill: '#031323'
    });
    const button = new PIXI.Container();
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.position.set(width * 0.05, height - (compact ? 54 : 60));
    button.on('pointerdown', () => this.goBack());
    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, compact ? 96 : 120, compact ? 34 : 40, 7);
    bg.fill({ color: 0x7dffcc, alpha: 0.95 });
    bg.stroke({ color: 0xffffff, width: 1, alpha: 0.7 });
    button.addChild(bg);
    label.anchor.set(0.5);
    label.position.set((compact ? 96 : 120) / 2, (compact ? 34 : 40) / 2);
    button.addChild(label);
    this.container.addChild(button);
  }

  refresh() {
    this.cleanup();
    this.container.removeChildren();
    const entries = this.getEntriesForCategory();
    this.entryIndex = Math.max(0, Math.min(this.entryIndex, Math.max(0, entries.length - 1)));
    this.init();
  }

  moveCategory(direction) {
    this.categoryIndex = (this.categoryIndex + direction + THREAT_CODEX_CATEGORIES.length) % THREAT_CODEX_CATEGORIES.length;
    this.entryIndex = 0;
    AudioManager.playSfx('menuMove', { volume: 0.55 });
    this.refresh();
  }

  moveEntry(direction) {
    const entries = this.getEntriesForCategory();
    if (!entries.length) return;
    this.entryIndex = Math.max(0, Math.min(entries.length - 1, this.entryIndex + direction));
    AudioManager.playSfx('menuMove', { volume: 0.45 });
    this.refresh();
  }

  handleKeyDown(event) {
    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      this.goBack();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.moveCategory(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.moveCategory(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveEntry(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveEntry(1);
    }
  }

  update() {
    const now = Date.now();
    if (now < this.gamepadLatchUntil) return;
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    const pad = pads[0];
    if (!pad) return;
    const x = pad.axes?.[0] || 0;
    const y = pad.axes?.[1] || 0;
    if (pad.buttons?.[1]?.pressed) {
      this.gamepadLatchUntil = now + 220;
      this.goBack();
      return;
    }
    if (x < -0.5) {
      this.gamepadLatchUntil = now + 180;
      this.moveCategory(-1);
    } else if (x > 0.5) {
      this.gamepadLatchUntil = now + 180;
      this.moveCategory(1);
    } else if (y < -0.5) {
      this.gamepadLatchUntil = now + 150;
      this.moveEntry(-1);
    } else if (y > 0.5) {
      this.gamepadLatchUntil = now + 150;
      this.moveEntry(1);
    }
  }

  goBack() {
    AudioManager.playSfx('menuBack', { volume: 0.7 });
    this.game.showMenu();
  }

  getDebugState() {
    const category = this.getCategory();
    const entries = this.getEntriesForCategory(category.id);
    return {
      category: category.id,
      categories: THREAT_CODEX_CATEGORIES.map((item) => item.id),
      selectedEntryId: this.getSelectedEntry()?.id || null,
      entryCount: entries.length,
      discoveredCount: entries.filter((entry) => this.isDiscovered(entry)).length,
      keyboardNavigation: true,
      controllerNavigation: true,
      mouseSelection: true
    };
  }
}
