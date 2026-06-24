import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { GENERATED_ENEMY_PROFILES } from '../src/config/GeneratedEnemyProfiles.js';

const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/fast-target-readability-${timestamp()}`);
const bulletRadius = 7;
const failures = [];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function fail(message) {
  failures.push(message);
}

function isFastTarget(profile) {
  return profile?.role === 'fast_scout' || profile?.movementStyle === 'fastNeedle';
}

function describe(profile) {
  const apparentRadius = (Number(profile.targetWidth) * Number(profile.spriteScale)) / 2;
  const hitRadius = Number(profile.radius) || 0;
  const aimTolerancePx = hitRadius + bulletRadius;
  return {
    id: profile.id,
    type: profile.type,
    displayName: profile.displayName,
    role: profile.role,
    tier: profile.tier,
    unlockLevel: profile.unlockLevel,
    movementStyle: profile.movementStyle,
    fireStyle: profile.fireStyle,
    spriteIndex: profile.spriteIndex,
    health: profile.health,
    speed: profile.speed,
    targetWidth: profile.targetWidth,
    spriteScale: profile.spriteScale,
    apparentRadius: round(apparentRadius),
    hitRadius,
    hitboxToVisualRatio: round(hitRadius / Math.max(1, apparentRadius)),
    aimTolerancePx,
    crossingWindowAtProfileSpeed: round((aimTolerancePx * 2) / Math.max(0.01, Number(profile.speed) || 0.01), 2),
    codexId: profile.type
  };
}

const fastTargets = GENERATED_ENEMY_PROFILES
  .filter(isFastTarget)
  .map(describe)
  .sort((a, b) => a.hitboxToVisualRatio - b.hitboxToVisualRatio);

if (fastTargets.length < 10) fail(`expected generated fast targets in roster, found ${fastTargets.length}`);

for (const row of fastTargets) {
  if (row.hitboxToVisualRatio < 0.45) {
    fail(`${row.id} ${row.displayName} hitbox ratio too small: ${row.hitboxToVisualRatio}`);
  }
  if (row.aimTolerancePx < 18) {
    fail(`${row.id} ${row.displayName} intentional aim tolerance too small: ${row.aimTolerancePx}px`);
  }
}

const fastNeedle = fastTargets.find((row) => row.movementStyle === 'fastNeedle');
if (!fastNeedle) fail('expected at least one fastNeedle generated target');
if (fastNeedle && fastNeedle.hitboxToVisualRatio < 0.5) {
  fail(`fastNeedle target ${fastNeedle.id} should have readable hitbox ratio, got ${fastNeedle.hitboxToVisualRatio}`);
}

const highRisk = fastTargets.slice(0, 16);
const report = {
  generatedAt: new Date().toISOString(),
  bulletRadius,
  summary: {
    fastTargetCount: fastTargets.length,
    minimumHitboxToVisualRatio: highRisk[0]?.hitboxToVisualRatio ?? 0,
    minimumAimTolerancePx: Math.min(...fastTargets.map((row) => row.aimTolerancePx)),
    inspectedRows: highRisk.length
  },
  highRisk,
  notes: [
    'Fast targets are generated normal enemies with Codex IDs matching their runtime type.',
    'The readability gate keeps visual-to-hitbox mismatch bounded without changing speed, HP, score, spawns, or weapon behavior.'
  ]
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error(`[fast-target-readability] FAIL ${failures.length} issue(s)`);
  failures.forEach((message) => console.error(`- ${message}`));
  console.error(`[fast-target-readability] report=${path.join(outputDir, 'report.json')}`);
  process.exit(1);
}

console.log(`[fast-target-readability] PASS fastTargets=${fastTargets.length} minRatio=${report.summary.minimumHitboxToVisualRatio} report=${path.join(outputDir, 'report.json')}`);
