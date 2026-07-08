#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  LOGICAL_PLAYFIELD_HEIGHT,
  LOGICAL_PLAYFIELD_WIDTH,
  computeActivePlayfieldRect
} from '../src/game/Playfield.js';

const VIEWPORTS = [
  { label: '1280x720', width: 1280, height: 720 },
  { label: '1600x900', width: 1600, height: 900 },
  { label: '1920x1080', width: 1920, height: 1080 },
  { label: '2560x1440', width: 2560, height: 1440 },
  { label: '3840x2160', width: 3840, height: 2160 },
  { label: '3440x1440', width: 3440, height: 1440 },
  { label: '5120x1440', width: 5120, height: 1440 }
];

const FORMATION_BASE_FRACTIONS = {
  TUTORIAL_ARC: 0.34,
  GRID: 0.36,
  V_SHAPE: 0.34,
  BOX: 0.35,
  STAGGERED_WING: 0.38,
  PINCER: 0.42,
  DIAGONAL_RAID: 0.37,
  SIDEWINDER: 0.38,
  ORBIT_RING: 0.3,
  CROSS_STREAM: 0.42,
  SCREEN_DOOR: 0.44,
  DOUBLE_ARC: 0.39,
  SPIRAL: 0.28,
  ARC: 0.36
};

const FORMATION_MAX_FRACTIONS = {
  TUTORIAL_ARC: 0.42,
  GRID: 0.48,
  V_SHAPE: 0.46,
  BOX: 0.46,
  STAGGERED_WING: 0.52,
  PINCER: 0.58,
  DIAGONAL_RAID: 0.5,
  SIDEWINDER: 0.52,
  ORBIT_RING: 0.38,
  CROSS_STREAM: 0.56,
  SCREEN_DOOR: 0.58,
  DOUBLE_ARC: 0.52,
  SPIRAL: 0.34,
  ARC: 0.48
};

const BOSS_PROFILES = [
  { label: 'conductor', swayAmpX: 0.19, secondaryAmpX: 0.075 },
  { label: 'mirror', swayAmpX: 0.24, secondaryAmpX: 0 },
  { label: 'needle', swayAmpX: 0.09, secondaryAmpX: 0 },
  { label: 'choir', swayAmpX: 0.18, secondaryAmpX: 0.08 }
];

const EPSILON = 0.001;

function round(value, places = 2) {
  const mult = 10 ** places;
  return Math.round(value * mult) / mult;
}

function almostEqual(a, b, tolerance = EPSILON) {
  return Math.abs(Number(a) - Number(b)) <= tolerance;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computePlayerMetrics(width, height) {
  const baseHitboxRadius = 12;
  const radius = Math.max(8, Math.round(baseHitboxRadius * 0.9));
  const targetShipWidth = Math.max(52, Math.min(width * 0.06, 78)) * 0.95;
  const horizontalMargin = Math.max(24, radius + 14);
  const topMargin = Math.max(32, radius + 18);
  const bottomMargin = Math.max(72, targetShipWidth * 0.9);
  return {
    minX: horizontalMargin,
    maxX: width - horizontalMargin,
    rangeX: width - horizontalMargin * 2,
    minY: topMargin,
    maxY: height - bottomMargin,
    rangeY: height - bottomMargin - topMargin,
    spawnX: width / 2,
    spawnY: height - 100
  };
}

function computeBossMetrics(width, height) {
  const clampMinX = width * 0.12;
  const clampMaxX = width * 0.88;
  const laneY = clamp(height * 0.27, 155, 230);
  return {
    baseX: width * 0.5,
    laneY,
    clampMinX,
    clampMaxX,
    clampRangeX: clampMaxX - clampMinX,
    phaseAnchorOffsetP3: width * 0.14,
    phaseLaneOffsetP3: height * 0.02,
    profiles: BOSS_PROFILES.map((profile) => ({
      label: profile.label,
      swayAmpX: width * profile.swayAmpX,
      secondaryAmpX: width * profile.secondaryAmpX
    }))
  };
}

function getFormationPositions(width, height, type = 'ARC', count = 8, level = 10) {
  const pos = [];
  const cw = width / 2;
  const sw = width;
  const edgeMargin = Math.max(72, Math.min(170, sw * 0.075));
  const clampX = (x) => Math.max(edgeMargin, Math.min(sw - edgeMargin, x));
  const available = Math.max(0, sw - edgeMargin * 2);
  const spanFor = (formation, min = 0) => {
    const key = FORMATION_BASE_FRACTIONS[formation] ? formation : 'ARC';
    const levelBonus = Math.min(0.085, Math.max(0, level - 1) * 0.0045);
    const countScale = count <= 5 ? 0.88 : count <= 7 ? 0.95 : count <= 9 ? 1 : 1.04;
    const fraction = Math.min(FORMATION_MAX_FRACTIONS[key], (FORMATION_BASE_FRACTIONS[key] + levelBonus) * countScale);
    const desired = sw * fraction;
    const floor = Math.min(min, available);
    return Math.max(0, Math.min(available, Math.max(floor, desired)));
  };
  const xAt = (index, total, span, center = cw) => {
    const r = total <= 1 ? 0.5 : index / (total - 1);
    return clampX(center - span / 2 + r * span);
  };

  switch (type) {
    case 'PINCER': {
      const usable = spanFor(type, 560);
      const left = cw - usable / 2;
      const right = cw + usable / 2;
      const step = Math.max(44, Math.min(92, usable / Math.max(8, count)));
      for (let i = 0; i < count; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        const row = Math.floor(i / 2);
        pos.push({
          x: clampX(side < 0 ? left + row * step : right - row * step),
          y: 90 + row * 42 + (side > 0 ? 14 : 0)
        });
      }
      break;
    }
    case 'SCREEN_DOOR': {
      const lanes = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(Math.max(1, count))) + 1));
      const usable = spanFor(type, 560);
      for (let i = 0; i < count; i += 1) {
        const lane = i % lanes;
        const row = Math.floor(i / lanes);
        pos.push({
          x: xAt(lane, lanes, usable) + (row % 2 ? Math.min(34, usable / lanes * 0.22) : 0),
          y: 78 + row * 44
        });
      }
      break;
    }
    case 'GRID': {
      const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(Math.max(1, count))) + 1));
      const usable = spanFor(type, 500);
      for (let i = 0; i < count; i += 1) {
        pos.push({ x: xAt(i % cols, cols, usable), y: 80 + Math.floor(i / cols) * 60 });
      }
      break;
    }
    default: {
      const usable = spanFor('ARC', 500);
      for (let i = 0; i < count; i += 1) {
        const r = count <= 1 ? 0.5 : i / (count - 1);
        pos.push({ x: xAt(i, count, usable), y: 100 + Math.sin(r * Math.PI) * 100 });
      }
      break;
    }
  }

  const minFormationY = height < 620 ? 88 : 104;
  const maxFormationY = Math.max(minFormationY + 40, height * 0.34);
  return pos.map(({ x, y }) => ({
    x: clampX(x),
    y: Math.max(minFormationY, Math.min(maxFormationY, y))
  }));
}

function computeCombatBounds(width, positions, formation = 'ARC', level = 10) {
  const centerX = width / 2;
  const xs = positions.map((pos) => pos.x).filter(Number.isFinite);
  if (!xs.length) {
    return {
      minX: centerX - width * 0.2,
      maxX: centerX + width * 0.2,
      rangeX: width * 0.4
    };
  }
  const wideFormation = ['PINCER', 'SCREEN_DOOR', 'CROSS_STREAM', 'SIDEWINDER'].includes(String(formation || 'ARC'));
  const padding = Math.max(42, Math.min(82, width * (wideFormation ? 0.035 : 0.028)));
  const levelCap = Math.min(
    width * (wideFormation ? 0.6 : 0.5),
    width * ((wideFormation ? 0.46 : 0.4) + Math.min(0.1, Math.max(0, level - 1) * 0.006))
  );
  const rawMin = Math.min(...xs) - padding;
  const rawMax = Math.max(...xs) + padding;
  const rawSpan = rawMax - rawMin;
  const span = Math.min(rawSpan, levelCap);
  const mid = (rawMin + rawMax) / 2;
  const minX = Math.max(72, mid - span / 2);
  const maxX = Math.min(width - 72, mid + span / 2);
  return { minX, maxX, rangeX: maxX - minX };
}

function summarizeFormation(width, height, formation) {
  const positions = getFormationPositions(width, height, formation, 8, 10);
  const xs = positions.map((pos) => pos.x);
  const ys = positions.map((pos) => pos.y);
  const combat = computeCombatBounds(width, positions, formation, 10);
  return {
    formation,
    spanX: Math.max(...xs) - Math.min(...xs),
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    combatRangeX: combat.rangeX
  };
}

function computeGameplayMetrics(viewport) {
  const width = LOGICAL_PLAYFIELD_WIDTH;
  const height = LOGICAL_PLAYFIELD_HEIGHT;
  const formations = ['ARC', 'GRID', 'PINCER', 'SCREEN_DOOR'].map((formation) =>
    summarizeFormation(width, height, formation)
  );
  return {
    viewport: viewport.label,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    logicalWidth: width,
    logicalHeight: height,
    activeRect: computeActivePlayfieldRect(viewport.width, viewport.height),
    player: computePlayerMetrics(width, height),
    boss: computeBossMetrics(width, height),
    formations,
    enemyEntry: {
      leftX: -100,
      rightX: width + 100,
      rangeX: width + 200
    },
    eliteSpawn: {
      minX: 74,
      maxX: width - 74,
      rangeX: width - 148
    },
    bonusDroneSpawn: {
      minX: 50,
      maxX: width - 50,
      rangeX: width - 100
    },
    bulletCleanup: {
      minX: -30,
      maxX: width + 30,
      minY: -30,
      maxY: height + 30,
      rangeX: width + 60,
      rangeY: height + 60
    },
    powerupCleanup: {
      minY: Number.NEGATIVE_INFINITY,
      maxY: height + 90
    }
  };
}

function getFormation(metric, type) {
  return metric.formations.find((formation) => formation.formation === type);
}

function printTable(metrics) {
  const rows = metrics.map((metric) => ({
    viewport: metric.viewport,
    logical: `${metric.logicalWidth}x${metric.logicalHeight}`,
    activeRect: `${round(metric.activeRect.width)}x${round(metric.activeRect.height)} @ ${round(metric.activeRect.x)},${round(metric.activeRect.y)}`,
    scale: round(metric.activeRect.scale, 4),
    playerX: round(metric.player.rangeX),
    playerY: round(metric.player.rangeY),
    bossClampX: round(metric.boss.clampRangeX),
    bossSwayMirror: round(metric.boss.profiles.find((profile) => profile.label === 'mirror')?.swayAmpX || 0),
    arcSpan: round(getFormation(metric, 'ARC')?.spanX || 0),
    pincerSpan: round(getFormation(metric, 'PINCER')?.spanX || 0),
    bulletCleanupX: round(metric.bulletCleanup.rangeX),
    powerupCleanupMaxY: round(metric.powerupCleanup.maxY)
  }));
  console.table(rows);
}

const metrics = VIEWPORTS.map(computeGameplayMetrics);
const byLabel = new Map(metrics.map((metric) => [metric.viewport, metric]));
const baseline = byLabel.get('1920x1080');
const ultra3440 = byLabel.get('3440x1440');
const ultra5120 = byLabel.get('5120x1440');

assert.ok(baseline, 'missing 1920x1080 baseline metrics');
assert.ok(ultra3440, 'missing 3440x1440 metrics');
assert.ok(ultra5120, 'missing 5120x1440 metrics');

printTable(metrics);

console.log('\nresolution fairness diagnostic: fixed logical gameplay metrics');
console.log(`- gameplay field: ${LOGICAL_PLAYFIELD_WIDTH}x${LOGICAL_PLAYFIELD_HEIGHT}`);
console.log(`- 5120x1440 active display rect: ${round(ultra5120.activeRect.width)}x${round(ultra5120.activeRect.height)} @ ${round(ultra5120.activeRect.x)},${round(ultra5120.activeRect.y)}`);
console.log(`- 3440x1440 active display rect: ${round(ultra3440.activeRect.width)}x${round(ultra3440.activeRect.height)} @ ${round(ultra3440.activeRect.x)},${round(ultra3440.activeRect.y)}`);
console.log(`- boss clamp range: ${round(baseline.boss.clampRangeX)} px logical for every viewport`);
console.log(`- player movement range: ${round(baseline.player.rangeX)} px logical for every viewport`);
console.log(`- ARC formation span: ${round(getFormation(baseline, 'ARC').spanX)} px logical for every viewport`);

const issues = [];
const compareFields = [
  ['logical width', (metric) => metric.logicalWidth],
  ['logical height', (metric) => metric.logicalHeight],
  ['player horizontal range', (metric) => metric.player.rangeX],
  ['player vertical range', (metric) => metric.player.rangeY],
  ['boss clamp range', (metric) => metric.boss.clampRangeX],
  ['boss mirror sway', (metric) => metric.boss.profiles.find((profile) => profile.label === 'mirror')?.swayAmpX],
  ['ARC span', (metric) => getFormation(metric, 'ARC')?.spanX],
  ['GRID span', (metric) => getFormation(metric, 'GRID')?.spanX],
  ['PINCER span', (metric) => getFormation(metric, 'PINCER')?.spanX],
  ['SCREEN_DOOR span', (metric) => getFormation(metric, 'SCREEN_DOOR')?.spanX],
  ['bullet cleanup width', (metric) => metric.bulletCleanup.rangeX],
  ['bullet cleanup height', (metric) => metric.bulletCleanup.rangeY],
  ['powerup cleanup maxY', (metric) => metric.powerupCleanup.maxY],
  ['bonus drone spawn range', (metric) => metric.bonusDroneSpawn.rangeX],
  ['elite spawn range', (metric) => metric.eliteSpawn.rangeX]
];

for (const metric of metrics) {
  const expectedScale = Math.min(metric.viewportWidth / LOGICAL_PLAYFIELD_WIDTH, metric.viewportHeight / LOGICAL_PLAYFIELD_HEIGHT);
  if (!almostEqual(metric.activeRect.scale, expectedScale)) {
    issues.push(`${metric.viewport} active playfield scale mismatch`);
  }
  if (metric.activeRect.x < -EPSILON || metric.activeRect.y < -EPSILON) {
    issues.push(`${metric.viewport} active playfield starts outside viewport`);
  }
  if (metric.activeRect.width > metric.viewportWidth + EPSILON || metric.activeRect.height > metric.viewportHeight + EPSILON) {
    issues.push(`${metric.viewport} active playfield exceeds viewport`);
  }
  for (const [label, read] of compareFields) {
    if (!almostEqual(read(metric), read(baseline))) {
      issues.push(`${metric.viewport} ${label} differs from 1920x1080 baseline`);
    }
  }
}

if (issues.length > 0) {
  console.error('\nFAILED resolution fairness regression check:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log('\nPASS resolution fairness: score-relevant gameplay bounds are invariant across tested resolutions.');
}
