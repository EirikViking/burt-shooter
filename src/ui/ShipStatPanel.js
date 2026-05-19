import * as PIXI from 'pixi.js';
import { ShipData } from '../config/ShipData.js';
import { createText } from '../utils/pixiText.js';

const DEFAULT_RANGES = computeShipStatRanges(ShipData);

function toHexText(value) {
  if (!Number.isFinite(value)) return '#7ee9ff';
  return `#${(value >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function normalizeRange(value, range, invert = false) {
  if (!range || range.max <= range.min) return 0.5;
  const normalized = (Number(value) - range.min) / (range.max - range.min);
  return clamp01(invert ? 1 - normalized : normalized);
}

export function computeShipStatRanges(ships = ShipData) {
  const list = Array.isArray(ships) ? ships : [];
  const values = {
    speed: list.map(ship => Number(ship?.stats?.speed)).filter(Number.isFinite),
    fireRate: list.map(ship => Number(ship?.stats?.fireRate)).filter(Number.isFinite),
    damage: list.map(ship => Number(ship?.stats?.damage)).filter(Number.isFinite),
    bulletSpeed: list.map(ship => Number(ship?.stats?.bulletSpeed)).filter(Number.isFinite)
  };
  const range = (entries, fallback) => {
    if (!entries.length) return { min: fallback, max: fallback };
    return { min: Math.min(...entries), max: Math.max(...entries) };
  };
  return {
    speed: range(values.speed, 6),
    fireRate: range(values.fireRate, 140),
    damage: range(values.damage, 1),
    bulletSpeed: range(values.bulletSpeed, 12)
  };
}

export function getShipCombatRole(ship = {}, ranges = DEFAULT_RANGES) {
  const stats = ship.stats || {};
  const damage = normalizeRange(stats.damage, ranges.damage);
  const speed = normalizeRange(stats.speed, ranges.speed);
  const cadence = normalizeRange(stats.fireRate, ranges.fireRate, true);
  const shotSpeed = normalizeRange(stats.bulletSpeed, ranges.bulletSpeed);
  if (damage > 0.78 && cadence < 0.45) return 'HEAVY PUNISHER';
  if (speed > 0.76 && damage < 0.48) return 'THREAD RUNNER';
  if (cadence > 0.76) return 'PRESSURE ENGINE';
  if (shotSpeed > 0.74 && damage > 0.55) return 'RAIL DUELIST';
  if (speed > 0.62 && cadence > 0.55) return 'TEMPO SKIRMISHER';
  return 'BALANCED ARCADE';
}

function makeText(label, style = {}) {
  return createText(label, {
    fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
    letterSpacing: 0,
    ...style
  });
}

function drawSegmentedBar(graphics, x, y, width, height, progress, color) {
  graphics.roundRect(x, y, width, height, height / 2);
  graphics.fill({ color: 0x061426, alpha: 0.92 });
  graphics.stroke({ color: 0x2a5d78, width: 1, alpha: 0.7 });

  const gap = 3;
  const segments = 8;
  const segmentWidth = (width - gap * (segments - 1)) / segments;
  const filled = Math.max(1, Math.round(clamp01(progress) * segments));
  for (let index = 0; index < segments; index += 1) {
    const alpha = index < filled ? 0.95 : 0.16;
    graphics.roundRect(x + index * (segmentWidth + gap), y + 2, segmentWidth, height - 4, 3);
    graphics.fill({ color: index < filled ? color : 0x7ee9ff, alpha });
  }
}

function createStatRow({ label, value, progress, color, y, width, compact }) {
  const row = new PIXI.Container();
  const leftX = -width / 2 + (compact ? 18 : 24);
  const barX = compact ? -44 : -34;
  const barWidth = compact ? 122 : 178;
  const barHeight = compact ? 9 : 12;

  const labelText = makeText(label, {
    fontSize: compact ? 11 : 13,
    fontWeight: '800',
    fill: '#aeefff'
  });
  labelText.anchor.set(0, 0.5);
  labelText.position.set(leftX, y);
  row.addChild(labelText);

  const bar = new PIXI.Graphics();
  drawSegmentedBar(bar, barX, y - barHeight / 2, barWidth, barHeight, progress, color);
  row.addChild(bar);

  const valueText = makeText(value, {
    fontSize: compact ? 12 : 14,
    fontWeight: '900',
    fill: toHexText(color)
  });
  valueText.anchor.set(1, 0.5);
  valueText.position.set(width / 2 - (compact ? 16 : 22), y);
  row.addChild(valueText);

  return row;
}

export function createShipStatPanel(ship = {}, options = {}) {
  const compact = Boolean(options.compact);
  const width = options.width || (compact ? 330 : 560);
  const height = options.height || (compact ? 96 : 148);
  const accent = Number.isFinite(options.accent) ? options.accent : 0x00eaff;
  const ranges = options.ranges || DEFAULT_RANGES;
  const stats = ship.stats || {};
  const role = getShipCombatRole(ship, ranges);

  const panel = new PIXI.Container();
  panel.shipStatPanel = true;

  const bg = new PIXI.Graphics();
  bg.roundRect(-width / 2, 0, width, height, compact ? 10 : 12);
  bg.fill({ color: 0x020916, alpha: compact ? 0.72 : 0.84 });
  bg.stroke({ color: accent, width: 1.5, alpha: 0.72 });
  bg.rect(-width / 2 + 1, 1, width - 2, compact ? 28 : 34);
  bg.fill({ color: accent, alpha: 0.11 });
  panel.addChild(bg);

  const title = makeText(options.title || 'COMBAT PROFILE', {
    fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
    fontSize: compact ? 11 : 14,
    fontWeight: '900',
    fill: '#ffffff'
  });
  title.anchor.set(0, 0.5);
  title.position.set(-width / 2 + (compact ? 16 : 22), compact ? 15 : 18);
  panel.addChild(title);

  const roleText = makeText(role, {
    fontSize: compact ? 11 : 13,
    fontWeight: '900',
    fill: toHexText(accent)
  });
  roleText.anchor.set(1, 0.5);
  roleText.position.set(width / 2 - (compact ? 16 : 22), compact ? 15 : 18);
  panel.addChild(roleText);

  const rows = [
    {
      label: 'IMPACT',
      value: `${Number(stats.damage || 0).toFixed(2)}x`,
      progress: normalizeRange(stats.damage, ranges.damage),
      color: 0xff4d7d
    },
    {
      label: 'THRUST',
      value: Number(stats.speed || 0).toFixed(2),
      progress: normalizeRange(stats.speed, ranges.speed),
      color: 0x52f6ff
    },
    {
      label: 'CADENCE',
      value: `${Math.max(1, Math.round(1000 / Math.max(1, Number(stats.fireRate || 150))))}/s`,
      progress: normalizeRange(stats.fireRate, ranges.fireRate, true),
      color: 0xffd86b
    }
  ];

  if (!compact) {
    rows.push({
      label: 'SHOT SPD',
      value: Number(stats.bulletSpeed || 0).toFixed(1),
      progress: normalizeRange(stats.bulletSpeed, ranges.bulletSpeed),
      color: 0x9dff8a
    });
  }

  const startY = compact ? 42 : 52;
  const step = compact ? 18 : 24;
  rows.forEach((row, index) => {
    panel.addChild(createStatRow({
      ...row,
      y: startY + index * step,
      width,
      compact
    }));
  });

  return panel;
}
