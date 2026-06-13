import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { CODEX_TEXT_TEMPLATES, THREAT_CODEX_CATEGORIES, getThreatCodexCatalog } from '../config/ThreatCodexCatalog.js';
import {
  clearThreatCodexUnread,
  getCodexCompletionCounts,
  getThreatCodexState
} from '../progression/ThreatDiscoveryState.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { createText } from '../utils/pixiText.js';
import { translateText } from '../i18n/index.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { destroyMenuFx, installMenuFx, resizeMenuFx, updateMenuFx } from '../ui/MenuFxLayer.js';

const FONT_FAMILY = 'Rajdhani, Orbitron, Bahnschrift, sans-serif';
const CODEX_BG = 0x02070c;
const PANEL_BG = 0x06101a;
const AQUA = 0x7dffcc;
const CYAN = 0x37f5ff;
const GOLD = 0xffe76a;
const MUTED = 0x6f879a;
const CATEGORY_ACCENTS = Object.freeze({
  enemies: 0x7dffcc,
  attackPatterns: 0xffe76a,
  waveTactics: 0x37f5ff,
  powerups: 0x99ffcc,
  sectors: 0x7db7ff,
  elites: 0xff55d9,
  bosses: 0xff6a2a,
  runThemes: 0xa77dff,
  cabinetLogs: 0xffd15c,
  pilotRanks: 0xffe76a
});

function localize(source) {
  return translateText(source);
}

function titleCaseSignal(id = '') {
  return String(id)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function colorValue(value, fallback = AQUA) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/^#/, '');
    const parsed = Number.parseInt(normalized, 16);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function colorCss(value, fallback = '#7dffcc') {
  const numeric = colorValue(value, Number.parseInt(fallback.slice(1), 16));
  return `#${numeric.toString(16).padStart(6, '0').slice(-6)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fitSprite(sprite, width, height, maxScale = 2) {
  const textureWidth = Math.max(1, sprite.texture?.width || sprite.width || 1);
  const textureHeight = Math.max(1, sprite.texture?.height || sprite.height || 1);
  const scale = Math.min(width / textureWidth, height / textureHeight, maxScale);
  sprite.scale.set(scale);
}

function createArtMask(parent, x, y, width, height, radius = 8) {
  const mask = new PIXI.Graphics();
  mask.roundRect(x, y, width, height, radius);
  mask.fill({ color: 0xffffff, alpha: 1 });
  parent.addChild(mask);
  return mask;
}

function fitTextHeight(node, maxHeight, minScale = 0.76) {
  if (!node || !Number.isFinite(maxHeight) || maxHeight <= 0 || node.height <= maxHeight) return;
  const scale = Math.max(minScale, maxHeight / Math.max(1, node.height));
  node.scale.set(scale);
}

function drawPanel(graphics, x, y, width, height, {
  fill = PANEL_BG,
  alpha = 0.9,
  stroke = CYAN,
  strokeAlpha = 0.5,
  strokeWidth = 1,
  radius = 8
} = {}) {
  graphics.roundRect(x, y, width, height, radius);
  graphics.fill({ color: fill, alpha });
  graphics.stroke({ color: stroke, alpha: strokeAlpha, width: strokeWidth });
}

function addText(parent, text, style, x, y, anchor = null) {
  const node = createText(text, {
    fontFamily: FONT_FAMILY,
    letterSpacing: 0,
    ...style
  });
  if (anchor) node.anchor.set(anchor.x ?? anchor, anchor.y ?? anchor);
  node.position.set(x, y);
  parent.addChild(node);
  return node;
}

function getStateItem(state, categoryId, entryId) {
  return state.items?.[categoryId]?.[entryId] || null;
}

function entryDiscovered(state, categoryId, entry) {
  if (entry?.reference || entry?.alwaysKnown) return true;
  return Boolean(getStateItem(state, categoryId, entry.id));
}

function sortDiscoveredEntriesFirst(entries, state, categoryId) {
  return entries
    .map((entry, index) => ({
      entry,
      index,
      discovered: entryDiscovered(state, categoryId, entry)
    }))
    .sort((a, b) => {
      if (a.discovered !== b.discovered) return a.discovered ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ entry }) => entry);
}

function makeSignalSeed(id = '') {
  return String(id).split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 17);
}

function getCodexStatLabels(categoryId) {
  if (categoryId === 'enemies' || categoryId === 'elites') {
    return {
      primary: 'ENCOUNTERS',
      secondary: 'DESTROYED',
      rowCount: 'timesDefeated'
    };
  }
  if (categoryId === 'bosses') {
    return {
      primary: 'ENCOUNTERS',
      secondary: 'DEFEATED',
      rowCount: 'timesDefeated'
    };
  }
  if (categoryId === 'runThemes') {
    return {
      primary: 'RUNS',
      secondary: null,
      rowCount: 'timesSeen'
    };
  }
  return {
    primary: 'SCANS',
    secondary: null,
    rowCount: 'timesSeen'
  };
}

function getCategoryLayout(width, height, compact) {
  const count = THREAT_CODEX_CATEGORIES.length;
  const twoRows = count > 7 && (width < 1450 || height < 780);
  const rows = twoRows ? 2 : 1;
  const columns = twoRows ? Math.ceil(count / 2) : count;
  const buttonH = twoRows ? (height < 740 ? 44 : 46) : compact ? 44 : 52;
  const rowGap = twoRows ? 6 : 0;
  const startY = twoRows ? (height < 740 ? 88 : 96) : compact ? 92 : 112;
  const bottom = startY + rows * buttonH + (rows - 1) * rowGap;
  return {
    twoRows,
    rows,
    columns,
    startY,
    buttonH,
    rowGap,
    bottom,
    listY: bottom + (height < 740 ? 14 : 18)
  };
}

function drawUnknownSignal(parent, x, y, width, height, accent, seed, intensity = 1) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const radius = Math.min(width, height) * 0.36;
  const glow = new PIXI.Graphics();
  glow.circle(cx, cy, radius * 1.18);
  glow.fill({ color: accent, alpha: 0.08 * intensity });
  glow.stroke({ color: accent, width: 2, alpha: 0.22 * intensity });
  parent.addChild(glow);

  const rings = new PIXI.Graphics();
  for (let i = 0; i < 4; i += 1) {
    rings.circle(cx, cy, radius * (0.38 + i * 0.23));
    rings.stroke({ color: i % 2 ? CYAN : accent, width: 1, alpha: (0.26 - i * 0.04) * intensity });
  }
  for (let spoke = 0; spoke < 9; spoke += 1) {
    const angle = (spoke / 9) * Math.PI * 2 + seed * 0.006;
    const inner = radius * (0.18 + (spoke % 3) * 0.05);
    const outer = radius * (0.85 + (spoke % 2) * 0.12);
    rings.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    rings.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    rings.stroke({ color: spoke % 2 ? accent : CYAN, width: 1, alpha: 0.18 * intensity });
  }
  parent.addChild(rings);

  const shard = new PIXI.Graphics();
  const points = [];
  const sides = 5 + (seed % 4);
  for (let i = 0; i < sides; i += 1) {
    const angle = -Math.PI / 2 + (i / sides) * Math.PI * 2;
    const wobble = 0.72 + ((seed + i * 13) % 25) / 100;
    points.push(cx + Math.cos(angle) * radius * wobble, cy + Math.sin(angle) * radius * wobble);
  }
  shard.poly(points);
  shard.fill({ color: 0x071a27, alpha: 0.82 });
  shard.stroke({ color: accent, width: 2, alpha: 0.72 * intensity });
  parent.addChild(shard);

  const core = new PIXI.Graphics();
  core.circle(cx, cy, radius * 0.18);
  core.fill({ color: CODEX_BG, alpha: 0.9 });
  core.stroke({ color: GOLD, width: 2, alpha: 0.72 * intensity });
  parent.addChild(core);
}

function drawMiniGlyph(parent, x, y, size, accent, seed, discovered = false) {
  const g = new PIXI.Graphics();
  const cx = x + size / 2;
  const cy = y + size / 2;
  g.roundRect(x, y, size, size, 7);
  g.fill({ color: discovered ? 0x082231 : 0x050d15, alpha: 0.94 });
  g.stroke({ color: accent, width: discovered ? 2 : 1, alpha: discovered ? 0.72 : 0.38 });
  parent.addChild(g);

  const mark = new PIXI.Graphics();
  const sides = 3 + (seed % 5);
  const radius = size * (discovered ? 0.27 : 0.23);
  const points = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = -Math.PI / 2 + seed * 0.01 + (i / sides) * Math.PI * 2;
    points.push(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  mark.poly(points);
  mark.fill({ color: discovered ? accent : MUTED, alpha: discovered ? 0.78 : 0.42 });
  mark.stroke({ color: discovered ? 0xffffff : accent, width: 1, alpha: discovered ? 0.48 : 0.25 });
  parent.addChild(mark);

  const ring = new PIXI.Graphics();
  ring.circle(cx, cy, size * 0.37);
  ring.stroke({ color: discovered ? accent : MUTED, width: 1, alpha: discovered ? 0.36 : 0.2 });
  parent.addChild(ring);
}

export class ThreatCodexScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.categoryIndex = 0;
    this.entryIndex = 0;
    this.keyHandler = null;
    this.wheelHandler = null;
    this.gamepadNavigator = new GamepadNavigator();
    this.catalog = getThreatCodexCatalog();
    this.discoveryState = this.withLivePilotRankDiscovery(getThreatCodexState());
    this.completionCounts = getCodexCompletionCounts(this.catalog, this.discoveryState);
    this.renderToken = 0;
    this.backdropSprite = null;
    this.backdropShade = null;
    this.menuFx = null;
    this.titlePlate = null;
    this.holoRails = null;
    this.animationTime = 0;
    this.animatedNodes = [];
    this.lastEntryListDebug = null;
    this.lastDetailBodyDebug = null;
    this.lastDetailPanelDebug = null;
    this.detailScrollOffset = 0;
  }

  init() {
    this.cleanup();
    this.container.removeChildren();
    this.container.sortableChildren = true;
    this.catalog = getThreatCodexCatalog();
    this.discoveryState = this.withLivePilotRankDiscovery(clearThreatCodexUnread());
    this.completionCounts = getCodexCompletionCounts(this.catalog, this.discoveryState);
    this.renderToken += 1;
    this.animatedNodes = [];
    this.lastDetailBodyDebug = null;
    this.lastDetailPanelDebug = null;
    this.gamepadNavigator.suppressUntilReleased();
    this.createLayout(this.renderToken);
    installMenuFx(this, {
      label: 'ui_menuFxCodex',
      zIndex: -52,
      accent: 0x7dffcc,
      secondary: 0xff55d9,
      gold: 0xffe76a,
      intensity: 0.62,
      density: 0.72,
      alpha: 0.44,
      openVolume: 0.16
    });
    this.keyHandler = (event) => this.handleKeyDown(event);
    this.wheelHandler = (event) => this.handleWheel(event);
    window.addEventListener('keydown', this.keyHandler);
    window.addEventListener('wheel', this.wheelHandler, { passive: false });
  }

  cleanup() {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    if (this.wheelHandler) window.removeEventListener('wheel', this.wheelHandler);
    this.keyHandler = null;
    this.wheelHandler = null;
    this.animatedNodes = [];
  }

  destroy() {
    this.cleanup();
    destroyMenuFx(this);
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
        description: item.metadata?.description || translateText(CODEX_TEXT_TEMPLATES.runtimeDescription),
        tip: item.metadata?.tip || 'Watch the first tell, then move once. The scanner believes in you, suspiciously.'
      });
    });
    return sortDiscoveredEntriesFirst(merged, this.discoveryState, categoryId);
  }

  isDiscovered(entry, categoryId = this.getCategory().id) {
    return entryDiscovered(this.discoveryState, categoryId, entry);
  }

  withLivePilotRankDiscovery(state = getThreatCodexState()) {
    const liveRank = Math.max(0, Math.floor(Number(this.game?.rankIndex) || 0));
    const rankEntries = Array.isArray(this.catalog?.pilotRanks) ? this.catalog.pilotRanks : [];
    if (!rankEntries.length || liveRank <= 0) return state;
    const next = {
      ...state,
      items: {
        ...(state.items || {}),
        pilotRanks: {
          ...(state.items?.pilotRanks || {})
        }
      }
    };
    const seenAt = new Date().toISOString();
    const maxRank = Math.min(liveRank, rankEntries.length - 1);
    for (let index = 0; index <= maxRank; index += 1) {
      const entry = rankEntries[index];
      if (!entry?.id || next.items.pilotRanks[entry.id]) continue;
      next.items.pilotRanks[entry.id] = {
        id: entry.id,
        category: 'pilotRanks',
        name: entry.name || titleCaseSignal(entry.id),
        firstSeenAt: seenAt,
        lastSeenAt: seenAt,
        timesSeen: 1,
        timesDefeated: 0,
        timesSurvived: 0,
        timesKilledPlayer: 0,
        bestClearTimeAgainst: null,
        highestScoreDuringEncounter: 0,
        metadata: {
          restoredFrom: 'liveGameRank',
          rankIndex: index
        }
      };
    }
    return next;
  }

  getSelectedEntry() {
    const entries = this.getEntriesForCategory();
    return entries[Math.max(0, Math.min(entries.length - 1, this.entryIndex))] || null;
  }

  getAccent(entry = null, categoryId = this.getCategory().id) {
    return colorValue(entry?.accent ?? entry?.tint, CATEGORY_ACCENTS[categoryId] || AQUA);
  }

  registerCodexAnimatedNode(node, {
    kind = 'detail',
    seed = 1,
    amplitude = 1,
    speed = 1
  } = {}) {
    if (!node) return;
    this.animatedNodes.push({
      node,
      kind,
      seed: Number(seed) || 1,
      amplitude: Number(amplitude) || 1,
      speed: Number(speed) || 1,
      baseX: Number(node.x) || 0,
      baseY: Number(node.y) || 0,
      baseScaleX: Number(node.scale?.x) || 1,
      baseScaleY: Number(node.scale?.y) || 1,
      baseRotation: Number(node.rotation) || 0,
      baseAlpha: Number(node.alpha) || 1
    });
  }

  updateCodexAnimations(delta = 1) {
    const dt = Number.isFinite(delta) ? delta : 1;
    this.animationTime += Math.max(0.15, Math.min(3, dt)) * 0.016;
    const time = this.animationTime;
    this.animatedNodes = this.animatedNodes.filter((entry) => {
      const node = entry.node;
      if (!node || node.destroyed || !node.parent) return false;
      const phase = time * entry.speed + entry.seed * 0.017;
      if (entry.kind === 'thumb') {
        const bob = Math.sin(phase * 1.9) * 1.5 * entry.amplitude;
        const pulse = 1 + Math.sin(phase * 2.4) * 0.035 * entry.amplitude;
        node.x = entry.baseX + Math.cos(phase) * 0.9 * entry.amplitude;
        node.y = entry.baseY + bob;
        node.scale.set(entry.baseScaleX * pulse, entry.baseScaleY * pulse);
        node.alpha = Math.max(0.34, Math.min(1, entry.baseAlpha + Math.sin(phase * 2.1) * 0.06));
      } else {
        const pulse = 1 + Math.sin(phase * 1.35) * 0.024 * entry.amplitude;
        node.x = entry.baseX + Math.cos(phase * 0.9) * 4 * entry.amplitude;
        node.y = entry.baseY + Math.sin(phase * 1.1) * 3 * entry.amplitude;
        node.scale.set(entry.baseScaleX * pulse, entry.baseScaleY * pulse);
        node.rotation = entry.baseRotation + Math.sin(phase * 0.8) * 0.022 * entry.amplitude;
        node.alpha = Math.max(0.35, Math.min(1, entry.baseAlpha + Math.sin(phase * 1.7) * 0.045));
      }
      return true;
    });
  }

  getEntryArt(entry = null, categoryId = this.getCategory().id) {
    if (entry?.art) return entry.art;
    const fallback = {
      enemies: AssetManifest.generated.gameplayArenaBackdrop,
      attackPatterns: AssetManifest.generated.enemyWeapons?.[2],
      waveTactics: AssetManifest.generated.stormGameplayBackdrop,
      powerups: AssetManifest.generated.powerups?.overdrive_core || AssetManifest.sprites.bonusCore,
      sectors: AssetManifest.generated.vfx?.overrunVictorySeal || AssetManifest.generated.gameplayArenaBackdrop,
      elites: AssetManifest.generated.eliteMiddleShips?.[0],
      bosses: AssetManifest.generated.bossDossier || AssetManifest.generated.bossArenaBackdrop,
      runThemes: AssetManifest.generated.menuBackdrop,
      cabinetLogs: AssetManifest.generated.menuCredits,
      pilotRanks: AssetManifest.generated.ranks?.[0] || AssetManifest.generated.leaderboardHall
    };
    return fallback[categoryId] || AssetManifest.generated.leaderboardHall;
  }

  createLayout(token) {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compact = width < 920 || height < 740;
    const categoryLayout = getCategoryLayout(width, height, compact);
    resizeMenuFx(this, width, height);
    this.drawBackground(width, height, token);
    this.createTitlePlate(width, height, compact);
    this.createHeader(width, height, compact);
    this.createCategories(width, height, compact, categoryLayout);
    this.createEntryList(width, height, compact, categoryLayout);
    this.createDetailPanel(width, height, compact, token, categoryLayout);
    this.createBackButton(width, height, compact);
  }

  drawBackground(width, height, token) {
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, width, height);
    bg.fill({ color: CODEX_BG, alpha: 1 });
    bg.zIndex = -90;
    this.container.addChild(bg);

    this.loadCodexBackdrop(width, height, token);

    this.backdropShade = new PIXI.Graphics();
    this.backdropShade.zIndex = -70;
    this.backdropShade.rect(0, 0, width, height);
    this.backdropShade.fill({ color: 0x020711, alpha: 0.18 });
    this.backdropShade.rect(0, 0, width * 0.47, height);
    this.backdropShade.fill({ color: 0x020711, alpha: 0.48 });
    this.backdropShade.rect(width * 0.42, 0, width * 0.58, height);
    this.backdropShade.fill({ color: 0x020711, alpha: 0.26 });
    this.backdropShade.rect(0, height * 0.76, width, height * 0.24);
    this.backdropShade.fill({ color: 0x000000, alpha: 0.18 });
    this.container.addChild(this.backdropShade);

    const haze = new PIXI.Graphics();
    haze.zIndex = -64;
    haze.circle(width * 0.18, height * 0.23, Math.max(width, height) * 0.22);
    haze.fill({ color: 0x0b3140, alpha: 0.18 });
    haze.circle(width * 0.82, height * 0.2, Math.max(width, height) * 0.18);
    haze.fill({ color: 0xff55d9, alpha: 0.07 });
    haze.circle(width * 0.58, height * 0.82, Math.max(width, height) * 0.2);
    haze.fill({ color: 0xffd15c, alpha: 0.055 });
    this.container.addChild(haze);

    const grid = new PIXI.Graphics();
    grid.zIndex = -58;
    const step = width < 900 ? 34 : 44;
    for (let x = -step; x < width + step; x += step) {
      grid.moveTo(x, 0);
      grid.lineTo(x + height * 0.18, height);
    }
    for (let y = 0; y < height + step; y += step) {
      grid.moveTo(0, y);
      grid.lineTo(width, y + width * 0.03);
    }
    grid.stroke({ color: 0x143549, alpha: 0.22, width: 1 });
    this.container.addChild(grid);

    const scan = new PIXI.Graphics();
    scan.zIndex = -54;
    for (let i = 0; i < 28; i += 1) {
      const x = ((i * 89) % Math.max(1, Math.floor(width))) + ((i % 3) * 7);
      const y = 92 + ((i * 53) % Math.max(1, Math.floor(height - 130)));
      const alpha = 0.12 + (i % 4) * 0.035;
      scan.circle(x, y, 1.5 + (i % 3));
      scan.fill({ color: i % 2 ? CYAN : AQUA, alpha });
    }
    this.container.addChild(scan);

    this.holoRails = new PIXI.Graphics();
    this.holoRails.zIndex = -5;
    this.holoRails.roundRect(width * 0.046 - 7, height * 0.16, 5, height * 0.69, 3);
    this.holoRails.fill({ color: CYAN, alpha: 0.18 });
    this.holoRails.roundRect(width * 0.952 + 2, height * 0.2, 5, height * 0.62, 3);
    this.holoRails.fill({ color: 0xff55d9, alpha: 0.15 });
    this.container.addChild(this.holoRails);
  }

  loadCodexBackdrop(width, height, token) {
    const src = AssetManifest.generated.leaderboardHall || AssetManifest.generated.menuBackdrop;
    PIXI.Assets.load(src)
      .then((texture) => {
        if (token !== this.renderToken || !texture) return;
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.alpha = 0.88;
        sprite.zIndex = -82;
        const scale = Math.max(width / Math.max(1, texture.width || 1), height / Math.max(1, texture.height || 1));
        sprite.scale.set(scale);
        sprite.position.set(width / 2, height / 2);
        this.backdropSprite = sprite;
        this.container.addChild(sprite);
        this.container.sortChildren?.();
      })
      .catch((error) => console.warn('[ThreatCodexScene] Codex backdrop failed to load:', error));
  }

  createTitlePlate(width, height, compact) {
    const x = width * 0.045;
    const y = compact ? 18 : 22;
    const w = width * 0.91;
    const h = compact ? 106 : 124;
    const plate = new PIXI.Graphics();
    plate.zIndex = 1;
    plate.roundRect(x - 10, y - 8, w + 20, h + 16, 10);
    plate.fill({ color: CYAN, alpha: 0.055 });
    plate.roundRect(x, y, w, h, 8);
    plate.fill({ color: 0x02101e, alpha: 0.38 });
    plate.stroke({ color: CYAN, width: 1.5, alpha: 0.42 });
    plate.roundRect(x + 8, y + 8, w - 16, h - 16, 6);
    plate.stroke({ color: 0xff55d9, width: 1, alpha: 0.2 });
    plate.rect(x + 24, y + 14, w - 48, 2);
    plate.fill({ color: AQUA, alpha: 0.34 });
    plate.rect(x + 48, y + h - 17, w - 96, 2);
    plate.fill({ color: GOLD, alpha: 0.34 });
    plate.rect(x + 24, y + 38, w - 48, 1);
    plate.fill({ color: 0xff55d9, alpha: 0.16 });

    const centerX = x + w / 2;
    const bracketW = compact ? 34 : 48;
    const bracketH = compact ? 22 : 30;
    const cornerY = y + h * 0.52;
    plate.poly([
      x + 16, cornerY,
      x + 16 + bracketW, cornerY - bracketH,
      x + 16 + bracketW + 10, cornerY - bracketH + 8,
      x + 28, cornerY,
      x + 16 + bracketW + 10, cornerY + bracketH - 8,
      x + 16 + bracketW, cornerY + bracketH
    ]);
    plate.stroke({ color: GOLD, width: 2, alpha: 0.42 });
    plate.poly([
      x + w - 16, cornerY,
      x + w - 16 - bracketW, cornerY - bracketH,
      x + w - 16 - bracketW - 10, cornerY - bracketH + 8,
      x + w - 28, cornerY,
      x + w - 16 - bracketW - 10, cornerY + bracketH - 8,
      x + w - 16 - bracketW, cornerY + bracketH
    ]);
    plate.stroke({ color: 0xff55d9, width: 2, alpha: 0.36 });
    plate.circle(centerX, y + 16, compact ? 4 : 5);
    plate.fill({ color: CYAN, alpha: 0.58 });
    plate.circle(centerX, y + h - 16, compact ? 3 : 4);
    plate.fill({ color: GOLD, alpha: 0.48 });
    this.titlePlate = plate;
    this.container.addChild(plate);
  }

  createHeader(width, height, compact) {
    const counts = this.completionCounts;
    const total = Object.values(counts).reduce((sum, item) => sum + (item.total || 0), 0);
    const discovered = Object.values(counts).reduce((sum, item) => sum + (item.discovered || 0), 0);
    const header = new PIXI.Container();
    header.position.set(width * 0.05, compact ? 20 : 26);
    header.zIndex = 8;
    this.container.addChild(header);

    const title = addText(header, localize('THREAT CODEX'), {
      fontSize: compact ? 34 : 46,
      fontWeight: '900',
      fill: '#eaffff',
      stroke: '#001016',
      strokeThickness: 5,
      align: 'left'
    }, 0, 0);
    title.style.dropShadow = true;
    title.style.dropShadowColor = '#37f5ff';
    title.style.dropShadowDistance = 0;
    title.style.dropShadowBlur = 9;

    addText(header, localize('FIELD NOTES, COUNTERS, AND RUN RECEIPTS'), {
      fontSize: compact ? 12 : 15,
      fontWeight: '800',
      fill: '#9cfbff',
      align: 'left'
    }, 3, compact ? 42 : 56);

    const meterX = compact ? width * 0.5 : width * 0.62;
    const meterY = compact ? 26 : 34;
    const meterW = width - meterX - width * 0.05;
    const meter = new PIXI.Graphics();
    meter.zIndex = 8;
    drawPanel(meter, meterX, meterY, meterW, compact ? 48 : 54, {
      fill: 0x04111d,
      alpha: 0.72,
      stroke: CYAN,
      strokeAlpha: 0.34,
      radius: 10
    });
    const fillW = total ? clamp(discovered / total, 0, 1) * (meterW - 22) : 0;
    meter.roundRect(meterX + 11, meterY + (compact ? 29 : 32), meterW - 22, 8, 4);
    meter.fill({ color: 0x071a27, alpha: 0.95 });
    meter.roundRect(meterX + 11, meterY + (compact ? 29 : 32), fillW, 8, 4);
    meter.fill({ color: AQUA, alpha: 0.86 });
    this.container.addChild(meter);

    const meterLabel = addText(this.container, `${discovered}/${total}`, {
      fontSize: compact ? 19 : 23,
      fontWeight: '900',
      fill: '#ffffff',
      align: 'right'
    }, meterX + meterW - 18, meterY + 9, { x: 1, y: 0 });
    meterLabel.zIndex = 10;

    const signal = new PIXI.Graphics();
    signal.zIndex = 10;
    signal.circle(meterX + 26, meterY + 21, 8);
    signal.fill({ color: discovered ? AQUA : MUTED, alpha: 0.95 });
    signal.circle(meterX + 26, meterY + 21, 15);
    signal.stroke({ color: discovered ? AQUA : MUTED, width: 1, alpha: 0.36 });
    this.container.addChild(signal);
  }

  createCategories(width, height, compact, categoryLayout = getCategoryLayout(width, height, compact)) {
    const startY = categoryLayout.startY;
    const availableWidth = width * 0.9;
    const buttonWidth = availableWidth / categoryLayout.columns;
    this.lastCategoryTabsDebug = [];
    THREAT_CODEX_CATEGORIES.forEach((category, index) => {
      const rowIndex = categoryLayout.twoRows ? Math.floor(index / categoryLayout.columns) : 0;
      const columnIndex = categoryLayout.twoRows ? index % categoryLayout.columns : index;
      const selected = index === this.categoryIndex;
      const counts = this.completionCounts[category.id] || { discovered: 0, total: 0 };
      const accent = CATEGORY_ACCENTS[category.id] || AQUA;
      const button = new PIXI.Container();
      button.eventMode = 'static';
      button.cursor = 'pointer';
      button.zIndex = 9;
      button.position.set(
        width * 0.05 + buttonWidth * columnIndex,
        startY + rowIndex * (categoryLayout.buttonH + categoryLayout.rowGap)
      );
      button.on('pointerdown', () => {
        this.categoryIndex = index;
        this.entryIndex = 0;
        AudioManager.playSfx('codex_move', { volume: 0.12, minIntervalMs: 120 });
        this.refresh();
      });

      const bg = new PIXI.Graphics();
      const buttonH = categoryLayout.buttonH;
      drawPanel(bg, 0, 0, buttonWidth - 7, buttonH, {
        fill: selected ? 0x102738 : 0x06111c,
        alpha: selected ? 0.98 : 0.82,
        stroke: selected ? accent : 0x294258,
        strokeAlpha: selected ? 0.95 : 0.72,
        strokeWidth: selected ? 2 : 1,
        radius: 8
      });
      bg.rect(0, buttonH - 7, buttonWidth - 7, selected ? 3 : 1);
      bg.fill({ color: accent, alpha: selected ? 0.95 : 0.35 });
      button.addChild(bg);

      const labelText = addText(button, localize(category.label.toUpperCase()), {
        fontSize: categoryLayout.twoRows ? (height < 740 ? 9 : 10) : compact ? 10 : 12,
        fontWeight: '900',
        fill: selected ? '#ffffff' : '#b9f7ff',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: buttonWidth - 20
      }, (buttonWidth - 7) / 2, categoryLayout.twoRows ? 6 : compact ? 9 : 10, { x: 0.5, y: 0 });

      const countText = addText(button, `${counts.discovered}/${counts.total}`, {
        fontSize: categoryLayout.twoRows ? 9 : compact ? 10 : 12,
        fontWeight: '800',
        fill: selected ? colorCss(accent) : '#6f879a',
        align: 'center'
      }, (buttonWidth - 7) / 2, buttonH - 11, { x: 0.5, y: 1 });

      const tabBounds = {
        x: button.x,
        y: button.y,
        width: buttonWidth - 7,
        height: buttonH,
        dividerTop: button.y + buttonH - 7
      };
      const textBounds = (node) => ({
        x: button.x + node.x - node.width * (node.anchor?.x || 0),
        y: button.y + node.y - node.height * (node.anchor?.y || 0),
        width: node.width,
        height: node.height,
        right: button.x + node.x - node.width * (node.anchor?.x || 0) + node.width,
        bottom: button.y + node.y - node.height * (node.anchor?.y || 0) + node.height
      });
      const labelBounds = textBounds(labelText);
      const countBounds = textBounds(countText);
      this.lastCategoryTabsDebug.push({
        id: category.id,
        label: category.label,
        count: `${counts.discovered}/${counts.total}`,
        selected,
        tabBounds,
        labelBounds,
        countBounds,
        countToDividerGap: tabBounds.dividerTop - countBounds.bottom,
        labelToCountGap: countBounds.y - labelBounds.bottom,
        countInsideTab: countBounds.x >= tabBounds.x &&
          countBounds.right <= tabBounds.x + tabBounds.width &&
          countBounds.y >= tabBounds.y &&
          countBounds.bottom <= tabBounds.y + tabBounds.height
      });

      this.container.addChild(button);
    });
  }

  createEntryList(width, height, compact, categoryLayout = getCategoryLayout(width, height, compact)) {
    const category = this.getCategory();
    const entries = this.getEntriesForCategory(category.id);
    const listX = width * 0.05;
    const listY = categoryLayout.listY;
    const listW = compact ? width * 0.39 : Math.min(520, width * 0.38);
    const rowH = compact ? 48 : 56;
    const maxRows = Math.max(6, Math.floor((height - listY - 82) / rowH));
    const visibleRows = Math.min(maxRows, entries.length);
    const start = Math.max(0, Math.min(this.entryIndex - Math.floor(maxRows / 2), Math.max(0, entries.length - maxRows)));
    this.lastEntryListDebug = {
      x: listX - 14,
      y: listY - 16,
      width: listW + 28,
      height: visibleRows * rowH + 28,
      start,
      visibleRows,
      maxRows,
      totalRows: entries.length,
      scrollable: entries.length > maxRows
    };

    const frame = new PIXI.Graphics();
    frame.zIndex = 3;
    drawPanel(frame, listX - 14, listY - 16, listW + 28, visibleRows * rowH + 28, {
      fill: 0x030b13,
      alpha: 0.58,
      stroke: 0x24435b,
      strokeAlpha: 0.45,
      radius: 12
    });
    this.container.addChild(frame);

    if (entries.length > maxRows) {
      this.drawEntryScrollBar(listX, listY, listW, visibleRows * rowH - 8, entries.length, maxRows, start, compact);
    }

    for (let rowIndex = 0; rowIndex < visibleRows; rowIndex += 1) {
      const entryIndex = start + rowIndex;
      const entry = entries[entryIndex];
      const discovered = this.isDiscovered(entry, category.id);
      const selected = entryIndex === this.entryIndex;
      const accent = this.getAccent(entry, category.id);
      const seed = makeSignalSeed(entry.id);
      const row = new PIXI.Container();
      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.zIndex = 6;
      row.position.set(listX, listY + rowIndex * rowH);
      row.on('pointerdown', () => {
        this.entryIndex = entryIndex;
        AudioManager.playSfx('codex_move', { volume: 0.12, minIntervalMs: 120 });
        this.refresh();
      });

      const bg = new PIXI.Graphics();
      drawPanel(bg, 0, 0, listW, rowH - 8, {
        fill: selected ? 0x102637 : 0x06101a,
        alpha: selected ? 0.98 : 0.8,
        stroke: selected ? accent : 0x20394e,
        strokeAlpha: selected ? 0.95 : 0.62,
        strokeWidth: selected ? 2 : 1,
        radius: 8
      });
      if (selected) {
        bg.rect(0, 0, 5, rowH - 8);
        bg.fill({ color: accent, alpha: 0.95 });
      }
      row.addChild(bg);

      this.drawEntryThumb(row, entry, category.id, 12, 8, rowH - 24, accent, seed, discovered);

      const label = discovered ? entry.name.toUpperCase() : localize('UNKNOWN SIGNAL');
      addText(row, label, {
        fontSize: compact ? 13 : 16,
        fontWeight: '900',
        fill: discovered ? '#f3fdff' : '#8fa6b8',
        wordWrap: true,
        wordWrapWidth: listW - 118,
        lineHeight: compact ? 14 : 17
      }, rowH - 2, compact ? 9 : 10);

      const role = discovered ? String(entry.role || entry.rarity || '').toUpperCase() : String(category.label || '').toUpperCase();
      addText(row, role, {
        fontSize: compact ? 9 : 10,
        fontWeight: '800',
        fill: discovered ? colorCss(accent) : '#53697a',
        wordWrap: true,
        wordWrapWidth: listW - 132
      }, rowH - 1, compact ? 29 : 34);

      const stateItem = getStateItem(this.discoveryState, category.id, entry.id);
      const labels = getCodexStatLabels(category.id);
      const count = labels.rowCount === 'timesDefeated'
        ? (stateItem?.timesDefeated ?? 0)
        : labels.rowCount === 'reference'
          ? localize('INFO')
          : (stateItem?.timesSeen ?? 0);
      addText(row, discovered ? String(count) : '--', {
        fontSize: compact ? 12 : 14,
        fontWeight: '900',
        fill: discovered ? '#ffffff' : '#4e6374'
      }, listW - 14, (rowH - 8) / 2, { x: 1, y: 0.5 });

      this.container.addChild(row);
    }
  }

  drawEntryScrollBar(listX, listY, listW, listH, totalRows, maxRows, start, compact) {
    const railX = listX + listW + (compact ? 8 : 11);
    const railY = listY + 2;
    const railH = Math.max(24, listH - 4);
    const maxStart = Math.max(1, totalRows - maxRows);
    const thumbH = clamp((maxRows / totalRows) * railH, 34, railH);
    const thumbY = railY + ((railH - thumbH) * clamp(start / maxStart, 0, 1));
    const scroll = new PIXI.Graphics();
    scroll.zIndex = 7;
    scroll.roundRect(railX, railY, compact ? 5 : 6, railH, 3);
    scroll.fill({ color: 0x071a27, alpha: 0.86 });
    scroll.stroke({ color: 0x24435b, width: 1, alpha: 0.56 });
    scroll.roundRect(railX, thumbY, compact ? 5 : 6, thumbH, 3);
    scroll.fill({ color: AQUA, alpha: 0.88 });
    this.container.addChild(scroll);

    const count = addText(this.container, `${this.entryIndex + 1}/${totalRows}`, {
      fontSize: compact ? 10 : 12,
      fontWeight: '900',
      fill: '#9cfbff',
      stroke: '#001016',
      strokeThickness: 2
    }, listX + listW - 2, listY - (compact ? 15 : 18), { x: 1, y: 0 });
    count.zIndex = 8;
  }

  drawEntryThumb(parent, entry, categoryId, x, y, size, accent, seed, discovered) {
    const thumb = new PIXI.Container();
    thumb.position.set(x, y);
    parent.addChild(thumb);

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, size, size, 7);
    bg.fill({ color: discovered ? 0x082231 : 0x050d15, alpha: 0.96 });
    bg.stroke({ color: accent, width: discovered ? 2 : 1, alpha: discovered ? 0.72 : 0.42 });
    bg.rect(4, size - 6, size - 8, 2);
    bg.fill({ color: discovered ? accent : MUTED, alpha: discovered ? 0.64 : 0.28 });
    thumb.addChild(bg);
    const artMask = createArtMask(thumb, 4, 4, size - 8, size - 8, 5);

    const art = this.getEntryArt(entry, categoryId);
    const token = this.renderToken;
    if (art) {
      PIXI.Assets.load(art)
        .then((texture) => {
          if (token !== this.renderToken || !texture || thumb.destroyed) return;
          const sprite = new PIXI.Sprite(texture);
          sprite.anchor.set(0.5);
          fitSprite(sprite, size * 0.72, size * 0.72, 2.2);
          sprite.position.set(size / 2, size / 2);
          sprite.alpha = discovered ? 0.88 : 0.44;
          sprite.tint = discovered ? 0xffffff : accent;
          sprite.mask = artMask;
          thumb.addChildAt(sprite, 1);
          this.registerCodexAnimatedNode(sprite, {
            kind: 'thumb',
            seed,
            amplitude: discovered ? 1 : 0.45,
            speed: discovered ? 1.1 : 0.62
          });
        })
        .catch(() => drawMiniGlyph(thumb, 0, 0, size, accent, seed, discovered));
    } else {
      drawMiniGlyph(thumb, 0, 0, size, accent, seed, discovered);
    }

    if (!discovered) {
      const lock = new PIXI.Graphics();
      lock.circle(size * 0.5, size * 0.5, size * 0.32);
      lock.stroke({ color: GOLD, width: 1, alpha: 0.38 });
      lock.moveTo(size * 0.34, size * 0.5);
      lock.lineTo(size * 0.66, size * 0.5);
      lock.moveTo(size * 0.5, size * 0.34);
      lock.lineTo(size * 0.5, size * 0.66);
      lock.stroke({ color: GOLD, width: 1, alpha: 0.46 });
      thumb.addChild(lock);
    }
  }

  createDetailPanel(width, height, compact, token, categoryLayout = getCategoryLayout(width, height, compact)) {
    const category = this.getCategory();
    const entry = this.getSelectedEntry();
    const discovered = entry ? this.isDiscovered(entry, category.id) : false;
    const stateItem = entry ? getStateItem(this.discoveryState, category.id, entry.id) : null;
    const accent = this.getAccent(entry, category.id);
    const panelX = compact ? width * 0.47 : width * 0.47;
    const panelY = categoryLayout.listY;
    const panelW = width - panelX - width * 0.05;
    const panelH = height - panelY - 82;

    const panel = new PIXI.Container();
    panel.position.set(panelX, panelY);
    panel.zIndex = 6;
    this.container.addChild(panel);

    const bg = new PIXI.Graphics();
    drawPanel(bg, 0, 0, panelW, panelH, {
      fill: 0x06101a,
      alpha: 0.92,
      stroke: discovered ? accent : 0x2c4b62,
      strokeAlpha: discovered ? 0.8 : 0.58,
      strokeWidth: 2,
      radius: 12
    });
    bg.rect(0, 0, panelW, Math.max(7, panelH * 0.012));
    bg.fill({ color: discovered ? accent : 0x34566d, alpha: discovered ? 0.85 : 0.52 });
    panel.addChild(bg);

    const shortPanel = panelH < 560;
    const epicBody = Boolean(discovered && entry?.codexBodyMode === 'epic');
    const sideBySide = !epicBody && shortPanel && panelW >= 520;
    const artY = 22;
    const artW = epicBody
      ? Math.min(panelW - 36, shortPanel ? 330 : compact ? 380 : 440)
      : sideBySide
        ? panelW * 0.42
        : panelW - 36;
    const artH = epicBody
      ? (shortPanel ? clamp(panelH * 0.19, 92, 124) : compact ? clamp(panelH * 0.2, 112, 144) : clamp(panelH * 0.22, 136, 168))
      : sideBySide
        ? clamp(panelH * 0.42, 150, 205)
        : shortPanel
          ? clamp(panelH * 0.28, 108, 155)
          : clamp(panelH * 0.34, 180, 275);
    const artX = sideBySide ? 18 : epicBody ? Math.max(18, (panelW - artW) * 0.5) : 18;
    this.drawDetailArt(panel, entry, discovered, accent, artX, artY, artW, artH, token);

    const textX = sideBySide ? artX + artW + 18 : 24;
    const textW = sideBySide ? panelW - textX - 24 : panelW - 46;
    const nameY = sideBySide ? 28 : artH + (epicBody ? (shortPanel ? 34 : 38) : 42);
    const name = entry && discovered ? entry.name.toUpperCase() : localize('UNKNOWN SIGNAL');
    const nameNode = addText(panel, name, {
      fontSize: sideBySide ? 22 : epicBody ? (shortPanel ? 20 : compact ? 23 : 31) : compact ? 19 : 31,
      fontWeight: '900',
      fill: discovered ? '#ffffff' : '#a7bac8',
      stroke: '#001016',
      strokeThickness: 3,
      wordWrap: true,
      wordWrapWidth: textW,
      lineHeight: sideBySide ? 23 : epicBody ? (shortPanel ? 22 : compact ? 25 : 33) : compact ? 21 : 33
    }, textX, nameY);
    fitTextHeight(nameNode, shortPanel ? 52 : 74, 0.74);

    const meta = discovered
      ? `${entry.rarity || 'Signal'}  |  ${entry.role || category.label}`
      : `${localize('SIGNAL DATA LOCKED')}  |  ${localize(category.label.toUpperCase())}`;
    addText(panel, meta, {
      fontSize: shortPanel ? 12 : compact ? 13 : 16,
      fontWeight: '900',
      fill: discovered ? colorCss(accent) : '#8fa6b8',
      wordWrap: true,
      wordWrapWidth: textW
    }, textX, nameY + (epicBody ? (shortPanel ? 44 : compact ? 50 : 66) : shortPanel ? 56 : compact ? 54 : 70));

    const bodyY = epicBody
      ? nameY + (shortPanel ? 74 : compact ? 84 : 98)
      : shortPanel
        ? nameY + 84
        : nameY + (compact ? 82 : 104);
    const bodyText = discovered
      ? localize(entry.description)
      : localize('The silhouette is logged, but the behavior needs one more live read. Find this signal in a run to unlock the counter-note.');
    const tipY = panelH - (epicBody ? (shortPanel ? 96 : compact ? 104 : 116) : compact ? 116 : 138);
    const bodyMaxHeight = Math.max(54, tipY - bodyY - (epicBody ? 14 : 24));
    const bodyFontSize = epicBody
      ? (shortPanel ? 14 : compact ? 15 : 16)
      : (shortPanel ? 13 : compact ? 13 : 17);
    const bodyLineHeight = epicBody
      ? (shortPanel ? 18 : compact ? 19 : 21)
      : (shortPanel ? 16 : compact ? 17 : 22);
    if (epicBody) {
      const storyDeck = new PIXI.Graphics();
      drawPanel(storyDeck, textX - 10, bodyY - 10, textW + 20, bodyMaxHeight + 20, {
        fill: 0x020a12,
        alpha: 0.62,
        stroke: accent,
        strokeAlpha: 0.24,
        radius: 8
      });
      panel.addChild(storyDeck);
    }
    const bodyNode = addText(panel, bodyText, {
      fontSize: bodyFontSize,
      fill: '#d8fbff',
      wordWrap: true,
      wordWrapWidth: textW,
      lineHeight: bodyLineHeight
    }, textX, bodyY);
    if (epicBody) {
      const bodyContentHeight = bodyNode.height;
      const maxOffset = Math.max(0, bodyContentHeight - bodyMaxHeight);
      this.detailScrollOffset = clamp(this.detailScrollOffset || 0, 0, maxOffset);
      bodyNode.y = bodyY - this.detailScrollOffset;

      const bodyMask = new PIXI.Graphics();
      bodyMask.rect(textX - 2, bodyY - 2, textW + 4, bodyMaxHeight + 4);
      bodyMask.fill({ color: 0xffffff, alpha: 1 });
      panel.addChild(bodyMask);
      bodyNode.mask = bodyMask;

      this.lastDetailBodyDebug = {
        x: panelX + textX,
        y: panelY + bodyY,
        width: textW,
        height: bodyMaxHeight,
        contentHeight: bodyContentHeight,
        offset: this.detailScrollOffset,
        maxOffset,
        scrollable: maxOffset > 1,
        mode: 'epic',
        fontSize: bodyFontSize,
        lineHeight: bodyLineHeight
      };

      if (maxOffset > 1) {
        const railX = textX + textW - 5;
        const thumbH = clamp(bodyMaxHeight * (bodyMaxHeight / bodyContentHeight), 22, bodyMaxHeight);
        const thumbY = bodyY + (this.detailScrollOffset / maxOffset) * Math.max(1, bodyMaxHeight - thumbH);
        const storyRail = new PIXI.Graphics();
        storyRail.roundRect(railX, bodyY, 4, bodyMaxHeight, 2);
        storyRail.fill({ color: 0x071a27, alpha: 0.72 });
        storyRail.roundRect(railX, thumbY, 4, thumbH, 2);
        storyRail.fill({ color: GOLD, alpha: 0.86 });
        panel.addChild(storyRail);
      }
    } else {
      fitTextHeight(bodyNode, bodyMaxHeight, shortPanel ? 0.72 : 0.78);
    }

    this.lastDetailPanelDebug = {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      mode: epicBody ? 'epic' : 'standard',
      selectedEntryId: entry?.id || null
    };

    const tipBox = new PIXI.Graphics();
    drawPanel(tipBox, 20, tipY - 14, panelW - 40, compact ? 60 : 72, {
      fill: 0x0b1b23,
      alpha: 0.86,
      stroke: discovered ? GOLD : accent,
      strokeAlpha: 0.42,
      radius: 8
    });
    panel.addChild(tipBox);
    const tipText = discovered
      ? `${localize('TIP')}: ${localize(entry.tip)}`
      : `${localize('TIP')}: ${localize('DISCOVER THIS SIGNAL DURING A RUN')}`;
    addText(panel, tipText, {
      fontSize: compact ? 12 : 15,
      fontWeight: '800',
      fill: discovered ? '#fff3a2' : '#9cfbff',
      wordWrap: true,
      wordWrapWidth: panelW - 62,
      lineHeight: compact ? 15 : 19
    }, 32, tipY);

    const statLabels = getCodexStatLabels(category.id);
    const primaryValue = discovered ? (stateItem?.timesSeen ?? 0) : '--';
    const secondaryValue = discovered ? (stateItem?.timesDefeated ?? 0) : '--';
    const statText = statLabels.rowCount === 'reference'
      ? localize('REFERENCE ENTRY')
      : statLabels.secondary
      ? `${localize(statLabels.primary)}: ${primaryValue}    ${localize(statLabels.secondary)}: ${secondaryValue}`
      : `${localize(statLabels.primary)}: ${primaryValue}`;
    addText(panel, statText, {
      fontSize: compact ? 12 : 15,
      fontWeight: '900',
      fill: '#9cfbff'
    }, 24, panelH - 42);
  }

  drawDetailArt(parent, entry, discovered, accent, x, y, width, height, token) {
    const frame = new PIXI.Graphics();
    drawPanel(frame, x, y, width, height, {
      fill: 0x020a12,
      alpha: 0.96,
      stroke: accent,
      strokeAlpha: discovered ? 0.55 : 0.34,
      strokeWidth: 1,
      radius: 12
    });
    frame.rect(x + 10, y + height - 18, width - 20, 2);
    frame.fill({ color: accent, alpha: discovered ? 0.5 : 0.25 });
    parent.addChild(frame);
    const artMask = createArtMask(parent, x + 8, y + 8, width - 16, height - 26, 8);

    const seed = makeSignalSeed(entry?.id || 'unknown');
    const backdrop = new PIXI.Graphics();
    for (let i = 0; i < 9; i += 1) {
      const px = x + 24 + ((seed + i * 53) % Math.max(1, Math.floor(width - 48)));
      const py = y + 22 + ((seed * 3 + i * 41) % Math.max(1, Math.floor(height - 44)));
      backdrop.circle(px, py, 1 + (i % 3));
      backdrop.fill({ color: i % 2 ? accent : CYAN, alpha: discovered ? 0.18 : 0.1 });
    }
    parent.addChild(backdrop);

    const art = this.getEntryArt(entry, entry?.category || this.getCategory().id);
    drawUnknownSignal(parent, x + width * 0.15, y + height * 0.08, width * 0.7, height * 0.75, accent, seed, discovered ? 0.42 : 0.58);
    if (!art) {
      drawUnknownSignal(parent, x + width * 0.08, y + height * 0.05, width * 0.84, height * 0.82, accent, seed, discovered ? 0.86 : 1);
      return;
    }

    PIXI.Assets.load(art)
      .then((texture) => {
        if (token !== this.renderToken || !texture || !parent || parent.destroyed) return;
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);
        fitSprite(sprite, width * (discovered ? 0.66 : 0.72), height * (discovered ? 0.72 : 0.78), 2.8);
        sprite.position.set(x + width * 0.5, y + height * 0.5);
        sprite.alpha = discovered ? 0.96 : 0.42;
        sprite.tint = discovered ? 0xffffff : accent;
        sprite.mask = artMask;
        parent.addChild(sprite);
        this.registerCodexAnimatedNode(sprite, {
          kind: 'detail',
          seed,
          amplitude: discovered ? 1 : 0.52,
          speed: discovered ? 1 : 0.7
        });

        const rim = new PIXI.Graphics();
        rim.circle(x + width * 0.5, y + height * 0.5, Math.min(width, height) * 0.34);
        rim.stroke({ color: accent, width: 2, alpha: discovered ? 0.16 : 0.34 });
        parent.addChild(rim);
        this.registerCodexAnimatedNode(rim, {
          kind: 'detail',
          seed: seed + 97,
          amplitude: discovered ? 0.32 : 0.2,
          speed: 0.72
        });

        if (!discovered) {
          const lock = new PIXI.Graphics();
          lock.roundRect(x + width * 0.5 - 74, y + height * 0.5 - 22, 148, 44, 8);
          lock.fill({ color: 0x020711, alpha: 0.72 });
          lock.stroke({ color: GOLD, width: 2, alpha: 0.68 });
          lock.circle(x + width * 0.5 - 46, y + height * 0.5, 10);
          lock.stroke({ color: GOLD, width: 2, alpha: 0.72 });
          parent.addChild(lock);
          addText(parent, localize('LOCKED'), {
            fontSize: 18,
            fontWeight: '900',
            fill: '#ffe76a',
            stroke: '#001016',
            strokeThickness: 3
          }, x + width * 0.5 + 14, y + height * 0.5, { x: 0.5, y: 0.5 });
        }
      })
      .catch(() => {
        if (token !== this.renderToken || !parent || parent.destroyed) return;
        drawUnknownSignal(parent, x + width * 0.08, y + height * 0.05, width * 0.84, height * 0.82, accent, seed, 0.76);
      });
  }

  createBackButton(width, height, compact) {
    const button = new PIXI.Container();
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.zIndex = 10;
    button.position.set(width * 0.05, height - (compact ? 54 : 60));
    button.on('pointerdown', () => this.goBack());

    const bg = new PIXI.Graphics();
    const buttonW = compact ? 112 : 136;
    const buttonH = compact ? 38 : 44;
    drawPanel(bg, 0, 0, buttonW, buttonH, {
      fill: 0x04182d,
      alpha: 0.84,
      stroke: CYAN,
      strokeAlpha: 0.82,
      strokeWidth: 2,
      radius: 8
    });
    bg.rect(10, 7, 4, buttonH - 14);
    bg.fill({ color: 0xff55d9, alpha: 0.62 });
    bg.rect(buttonW - 14, 7, 4, buttonH - 14);
    bg.fill({ color: GOLD, alpha: 0.5 });
    bg.moveTo(22, buttonH - 7);
    bg.lineTo(buttonW - 22, buttonH - 7);
    bg.stroke({ color: AQUA, width: 1, alpha: 0.28 });
    button.addChild(bg);

    addText(button, localize('BACK'), {
      fontSize: compact ? 17 : 21,
      fontWeight: '900',
      fill: '#c9fbff',
      stroke: '#031323',
      strokeThickness: 3
    }, buttonW / 2, buttonH / 2, { x: 0.5, y: 0.5 });
    this.container.addChild(button);
  }

  refresh() {
    this.cleanup();
    const entries = this.getEntriesForCategory();
    this.entryIndex = Math.max(0, Math.min(this.entryIndex, Math.max(0, entries.length - 1)));
    this.init();
  }

  moveCategory(direction) {
    this.detailScrollOffset = 0;
    this.categoryIndex = (this.categoryIndex + direction + THREAT_CODEX_CATEGORIES.length) % THREAT_CODEX_CATEGORIES.length;
    this.entryIndex = 0;
    AudioManager.playSfx('codex_move', { volume: 0.12, minIntervalMs: 120 });
    this.refresh();
  }

  moveEntry(direction) {
    const entries = this.getEntriesForCategory();
    if (!entries.length) return;
    this.detailScrollOffset = 0;
    this.entryIndex = Math.max(0, Math.min(entries.length - 1, this.entryIndex + direction));
    AudioManager.playSfx('codex_move', { volume: 0.1, minIntervalMs: 120 });
    this.refresh();
  }

  moveEntryTo(index) {
    const entries = this.getEntriesForCategory();
    if (!entries.length) return;
    this.detailScrollOffset = 0;
    this.entryIndex = Math.max(0, Math.min(entries.length - 1, index));
    AudioManager.playSfx('codex_move', { volume: 0.1, minIntervalMs: 120 });
    this.refresh();
  }

  getPageStep() {
    return Math.max(4, Number(this.lastEntryListDebug?.visibleRows) || 8);
  }

  scrollDetail(delta) {
    const bounds = this.lastDetailBodyDebug;
    if (!bounds?.scrollable) return false;
    const next = clamp((this.detailScrollOffset || 0) + delta, 0, bounds.maxOffset);
    const changed = Math.abs(next - (this.detailScrollOffset || 0)) > 0.5;
    this.detailScrollOffset = next;
    if (changed) {
      AudioManager.playSfx('codex_move', { volume: 0.08, minIntervalMs: 90 });
      this.refresh();
    }
    return true;
  }

  handleWheel(event) {
    const x = Number(event.clientX);
    const y = Number(event.clientY);
    const direction = Math.sign(Number(event.deltaY) || 0);
    if (!direction) return;
    const detail = this.lastDetailBodyDebug;
    const insideDetail = detail?.scrollable &&
      x >= detail.x &&
      x <= detail.x + detail.width + 18 &&
      y >= detail.y &&
      y <= detail.y + detail.height;
    if (insideDetail) {
      event.preventDefault();
      this.scrollDetail(direction * 58);
      return;
    }

    const bounds = this.lastEntryListDebug;
    if (!bounds) return;
    const insideList = x >= bounds.x && x <= bounds.x + bounds.width + 24 && y >= bounds.y && y <= bounds.y + bounds.height;
    if (!insideList) return;
    event.preventDefault();
    this.moveEntry(direction > 0 ? 1 : -1);
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
    } else if (event.key === 'PageUp') {
      event.preventDefault();
      this.moveEntry(-this.getPageStep());
    } else if (event.key === 'PageDown') {
      event.preventDefault();
      this.moveEntry(this.getPageStep());
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.moveEntryTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.moveEntryTo(this.getEntriesForCategory().length - 1);
    }
  }

  update(delta = 1) {
    updateMenuFx(this, delta);
    this.updateCodexAnimations(delta);
    const nav = this.gamepadNavigator.update();
    if (!nav.connected || !nav.active) return;
    if (nav.pressed.cancel || nav.pressed.back || nav.pressed.menu) {
      this.goBack();
      return;
    }
    if (nav.pressed.lb) {
      this.moveCategory(-1);
      return;
    }
    if (nav.pressed.rb) {
      this.moveCategory(1);
      return;
    }
    if (nav.pressed.left) this.moveCategory(-1);
    if (nav.pressed.right) this.moveCategory(1);
    if (nav.pressed.up) this.moveEntry(-1);
    if (nav.pressed.down) this.moveEntry(1);
  }

  goBack() {
    AudioManager.playSfx('codex_back', { volume: 0.14, minIntervalMs: 180 });
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
      discoveredCount: entries.filter((entry) => this.isDiscovered(entry, category.id)).length,
      completionCounts: this.completionCounts,
      keyboardNavigation: true,
      controllerNavigation: true,
      mouseSelection: true,
      wheelNavigation: true,
      pageNavigation: true,
      entryScroll: this.lastEntryListDebug,
      detailScroll: this.lastDetailBodyDebug,
      detailPanel: this.lastDetailPanelDebug,
      artfulEmptyState: true,
      menuFx: this.menuFx?.getDebugState?.() || null
    };
  }
}
