import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync('src/scenes/PlayScene.js', 'utf8');
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/combo-lifecycle-${new Date().toISOString().replace(/[:.]/g, '-')}`);

function extractMethod(name) {
  const start = source.search(new RegExp(`\\n\\s{2}${name}\\s*\\(`));
  assert(start >= 0, `${name} method not found`);
  const signatureEnd = source.indexOf(') {', start);
  const brace = signatureEnd >= 0 ? signatureEnd + 2 : source.indexOf('{', start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1).trim();
    }
  }
  throw new Error(`${name} method did not terminate`);
}

function compileSingleArgumentMethod(methodSource, argumentName) {
  const bodyStart = methodSource.indexOf('{');
  const body = methodSource.slice(bodyStart + 1, -1);
  return new Function(argumentName, body);
}

function makeComboState(overrides = {}) {
  return {
    comboCount: 9,
    comboMultiplier: 1,
    comboTimerMs: 1200,
    comboWindowMs: 3200,
    killStreak: 9,
    comboMilestonesReached: new Set([5]),
    comboBossEncounterActive: false,
    lastComboResetReason: 'init',
    enemyManager: { state: 'WAVE_ACTIVE', waveEnding: false },
    isGameplayClockAdvancing: () => true,
    resetComboState,
    syncComboBossBoundary,
    ...overrides
  };
}

const resetSource = extractMethod('resetComboState');
const resetComboState = compileSingleArgumentMethod(resetSource, 'reason');
const syncSource = extractMethod('syncComboBossBoundary');
const syncComboBossBoundary = compileSingleArgumentMethod(syncSource, 'enemyState');
const updateSource = extractMethod('updateComboTimers');
const updateComboTimers = compileSingleArgumentMethod(updateSource, 'delta');
const onKillSource = extractMethod('onEnemyKilled');
const initSource = extractMethod('init');

const transition = makeComboState({ enemyManager: { state: 'WAVE_BRIEFING', waveEnding: false } });
updateComboTimers.call(transition, 90);
assert.equal(transition.comboCount, 9, 'combo count changed during briefing');
assert.equal(transition.comboTimerMs, 1200, 'combo timer decayed during briefing');
transition.enemyManager.state = 'WAVE_ACTIVE';
transition.enemyManager.waveEnding = true;
updateComboTimers.call(transition, 90);
assert.equal(transition.comboTimerMs, 1200, 'combo timer decayed during wave cleanup');

assert.doesNotMatch(onKillSource, /now\s*-\s*this\.lastKillAt\s*>/, 'first next-wave kill still uses wall-clock expiry');
assert.match(onKillSource, /this\.comboCount \+= 1[\s\S]*this\.comboTimerMs = this\.comboWindowMs/,
  'first next-wave kill must increment and refresh the carried combo');
transition.enemyManager.waveEnding = false;
transition.comboCount += 1;
transition.killStreak += 1;
transition.comboTimerMs = transition.comboWindowMs;
assert.equal(transition.comboCount, 10);
assert.equal(transition.comboTimerMs, 3200);

const bossBoundary = makeComboState({ enemyManager: { state: 'BOSS_GATE', waveEnding: false } });
updateComboTimers.call(bossBoundary, 1);
assert.equal(bossBoundary.comboCount, 0, 'boss entry did not close the pre-boss combo');
assert.equal(bossBoundary.comboTimerMs, 0, 'boss entry left a pre-boss combo timer active');
assert.equal(bossBoundary.lastComboResetReason, 'boss_entry');
bossBoundary.comboCount = 4;
bossBoundary.killStreak = 4;
bossBoundary.comboTimerMs = 800;
bossBoundary.enemyManager.state = 'BOSS_ACTIVE';
updateComboTimers.call(bossBoundary, 1);
assert.equal(bossBoundary.comboCount, 4, 'boss-local combo was reset while the encounter remained active');
assert.ok(bossBoundary.comboTimerMs > 0 && bossBoundary.comboTimerMs < 800, 'boss-local combo timer did not use active-combat decay');
bossBoundary.enemyManager.state = 'LEVEL_COMPLETE';
updateComboTimers.call(bossBoundary, 1);
assert.equal(bossBoundary.comboCount, 0, 'boss exit carried a boss-local combo into the next sector');
assert.equal(bossBoundary.comboTimerMs, 0, 'boss exit left a boss-local combo timer active');
assert.equal(bossBoundary.lastComboResetReason, 'boss_exit');

const activeExpiry = makeComboState({ comboTimerMs: 100 });
updateComboTimers.call(activeExpiry, 10);
assert.equal(activeExpiry.comboCount, 0, 'active combat did not expire combo');
assert.equal(activeExpiry.comboMultiplier, 1);
assert.equal(activeExpiry.killStreak, 0);
assert.equal(activeExpiry.comboMilestonesReached.size, 0);

for (const runMode of ['mayhem_pure', 'overrun_pure', 'overrun_tactical']) {
  const state = makeComboState({ runMode, comboTimerMs: 100 });
  updateComboTimers.call(state, 10);
  assert.equal(state.comboCount, 0, `${runMode} diverged from shared active-combat expiry`);
}

for (const reset of [
  'this.comboCount = 0',
  'this.comboMultiplier = 1',
  'this.comboTimerMs = 0',
  'this.comboWindowMs = COMBO_WINDOW_MS',
  'this.killStreak = 0',
  'this.lastKillAt = 0',
  'this.comboMilestonesReached = new Set()'
]) {
  assert(initSource.includes(reset), `second run missing reset: ${reset}`);
}

const report = {
  ok: true,
  transitionCarry: { comboCount: transition.comboCount, timerAfterFirstNextWaveKill: transition.comboTimerMs },
  bossBoundary: {
    entryReason: 'boss_entry',
    bossLocalTimerDecay: true,
    exitReason: bossBoundary.lastComboResetReason
  },
  activeExpiry: { comboCount: activeExpiry.comboCount, multiplier: activeExpiry.comboMultiplier, killStreak: activeExpiry.killStreak },
  modes: ['mayhem_pure', 'overrun_pure', 'overrun_tactical'],
  secondRunResetFields: 7
};
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`[combo-lifecycle] PASS report=${path.join(outputDir, 'report.json')}`);
