import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/combo-flow-mechanics-${timestamp()}`);
const playScene = readFileSync(new URL('../src/scenes/PlayScene.js', import.meta.url), 'utf8');
const enemyManager = readFileSync(new URL('../src/managers/EnemyManager.js', import.meta.url), 'utf8');
const comboConfig = readFileSync(new URL('../src/config/ComboConfig.js', import.meta.url), 'utf8');
const failures = [];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function fail(message) {
  failures.push(message);
}

function extractFunction(source, name) {
  const methodPattern = new RegExp(`\\n\\s{2}${name}\\s*\\(`, 'm');
  const match = methodPattern.exec(source);
  const start = match ? match.index + 1 : source.indexOf(`${name}(`);
  if (start < 0) return '';
  const signatureEnd = source.indexOf(') {', start);
  const brace = signatureEnd >= 0 ? signatureEnd + 2 : source.indexOf('{', start);
  if (brace < 0) return '';
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return '';
}

const onEnemyKilled = extractFunction(playScene, 'onEnemyKilled');
const updateComboTimers = extractFunction(playScene, 'updateComboTimers');
const forceClearAllEnemies = extractFunction(enemyManager, 'forceClearAllEnemies');

if (!/COMBO_WINDOW_MS\s*=\s*3200/.test(comboConfig)) fail('combo window should remain 3200ms for this non-scoring pass');
for (const needle of [
  'this.comboCount += 1',
  'this.killStreak += 1',
  'this.lastKillAt = now',
  'this.comboTimerMs = this.comboWindowMs'
]) {
  if (!onEnemyKilled.includes(needle)) fail(`onEnemyKilled missing combo kill marker: ${needle}`);
}
if (!updateComboTimers.includes('this.comboTimerMs -= delta * 16.67')) {
  fail('combo timer should decay by frame delta');
}
if (!updateComboTimers.includes('this.comboCount = 0')) {
  fail('combo expiration should reset combo count');
}
if (!playScene.includes('playerBulletEnemyDamageOnly += 1')) {
  fail('expected damage-only bullet accounting marker');
}
if (/playerBulletEnemyDamageOnly[\s\S]{0,350}comboTimerMs\s*=/.test(playScene)) {
  fail('damage-only bullet path appears to refresh the score combo timer');
}
if (!forceClearAllEnemies.includes("this.removeEnemySprite(e, 'force_clear')")) {
  fail('wave cleanup should still remove leftover regular enemies through force_clear');
}
if (/onEnemyKilled|addNormalWaveScore|getComboScore/.test(forceClearAllEnemies)) {
  fail('forceClearAllEnemies should not silently award kill combo or score credit');
}

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    comboWindowMs: 3200,
    scoreComboRefreshesOnKills: true,
    damageOnlyHitsRefreshScoreCombo: false,
    waveCleanupAwardsComboKills: false,
    scoringMechanicsChangedByThisCheck: false
  },
  findings: [
    'Score combo starts, increments, and refreshes in onEnemyKilled.',
    'Damage-only hits do not refresh the score combo timer.',
    'Wave cleanup can remove leftover non-boss enemies without granting kill combo credit.'
  ],
  recommendation: 'Hit-refresh, partial hit-refresh, or cleanup kill-credit would affect scoring and leaderboards, so this pass documents them for explicit design approval instead of implementing them.'
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error(`[combo-flow-mechanics] FAIL ${failures.length} issue(s)`);
  failures.forEach((message) => console.error(`- ${message}`));
  console.error(`[combo-flow-mechanics] report=${path.join(outputDir, 'report.json')}`);
  process.exit(1);
}

console.log(`[combo-flow-mechanics] PASS comboWindowMs=3200 report=${path.join(outputDir, 'report.json')}`);
