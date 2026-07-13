import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  applyTacticalDirectiveEvent,
  createTacticalDirectiveSession,
  getTacticalDirectiveById,
  getTacticalDirectiveState
} from '../src/config/TacticalDirectives.js';

const directive = getTacticalDirectiveById('hostile_quota_t10_rescan');
assert.ok(directive);
const session = createTacticalDirectiveSession(directive);
session.startedInSector = 1;
session.lastProgressSector = 1;
session.target = 20;
const result = applyTacticalDirectiveEvent(session, { type: 'enemy_defeated', count: 10, sector: 2 });
const state = getTacticalDirectiveState(result.session);
assert.equal(state.progress, 10);
assert.equal(state.target, 20, 'adaptive session target must override the catalog target');
assert.equal(state.ratio, 0.5);
assert.equal(state.lastProgressSector, 2);
assert.equal(state.lastCalibrationSector, null);
assert.equal(state.completed, false);
result.session.target = 11;
const recalibrated = getTacticalDirectiveState(result.session);
assert.equal(recalibrated.progressLabel, '10/11', 'recalibration must preserve earned progress');

const sceneSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
const startLevel = sceneSource.slice(sceneSource.indexOf('  startLevel(source'), sceneSource.indexOf('  scheduleEnemyStartForLevel', sceneSource.indexOf('  startLevel(source')));
assert.match(startLevel, /adaptTacticalDirectiveForSector/);
assert.doesNotMatch(startLevel, /startNextTacticalDirective/, 'level start must never rotate an unfinished directive');
assert.match(sceneSource, /DIRECTIVE MOMENTUM/);
assert.match(sceneSource, /DIRECTIVE RECALIBRATED/);
assert.match(sceneSource, /MOMENTUM BONUS/);
assert.match(sceneSource, /Math\.max\(lastProgressSector, lastCalibrationSector\)/, 'calibration pacing must honor both real progress and the last assist');
assert.match(sceneSource, /lastCalibrationSector = safeSector/, 'assist cadence must not shrink a directive every sector');

console.log('[check-adaptive-directive-relay] ok: progress carry, adaptive targets, milestones, and no forced level rotation verified');
