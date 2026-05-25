import { RunContentDirectorConfig } from '../src/config/RunContentDirectorConfig.js';
import { RunContentDirector } from '../src/game/RunContentDirector.js';

const errors = [];
const fail = (message) => errors.push(message);

const config = RunContentDirectorConfig;
if (!Array.isArray(config.runThemes) || config.runThemes.length < 5) fail(`expected at least 5 run themes, found ${config.runThemes?.length || 0}`);
for (const theme of config.runThemes || []) {
  for (const key of ['primaryFormations', 'waveTactics', 'threatActions', 'enemyFamilies']) {
    if (!Array.isArray(theme[key]) || theme[key].length === 0) fail(`theme ${theme.id} missing ${key}`);
  }
  if (!Array.isArray(theme.eliteRoles) && !Array.isArray(theme.bossArchetypes)) fail(`theme ${theme.id} needs elite or boss weighting`);
}

for (const key of ['opening', 'mid_run', 'late_run', 'climax', 'overrun']) {
  const pool = config.contentPools?.[key];
  if (!pool) fail(`missing content pool ${key}`);
  for (const poolKey of ['formations', 'waveTactics', 'threatActions', 'enemyFamilies']) {
    if (!Array.isArray(pool?.[poolKey]) || pool[poolKey].length === 0) fail(`content pool ${key} missing ${poolKey}`);
  }
}

if (!(config.unseenWeightMult > 1)) fail('unseen content must receive boosted weighting');
if (!(config.seenRecentlyWeightMult < 1)) fail('recently seen content must receive lower weighting');
if (!(config.rarePreviewWeightMult > 0 && config.rarePreviewWeightMult <= 1)) fail('rare preview multiplier must exist');

const fakeStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => fakeStorage.get(key) ?? null,
  setItem: (key, value) => fakeStorage.set(key, String(value)),
  removeItem: (key) => fakeStorage.delete(key)
};

const makeDirector = () => {
  const game = { level: 1, scenes: { play: { gameTime: 0 } } };
  const director = new RunContentDirector(game, { seed: 'director-test-seed' });
  director.startRun();
  return director;
};

const first = makeDirector();
fakeStorage.clear();
const second = makeDirector();
if (first.runTheme?.id !== second.runTheme?.id) fail('seeded run theme selection must be deterministic');
const shaped = first.shapeWaveConfig({ formation: 'GRID', tactic: 'pulse_net', type: 'x', count: 6 }, { level: 1, waveIndex: 0 });
for (const key of ['formation', 'tactic', 'type', 'count']) {
  if (shaped[key] === undefined || shaped[key] === null) fail(`shaped wave missing ${key}`);
}
const debug = first.getDebugState();
if (!debug.runTheme || !debug.contentPoolSummary || !Number.isFinite(debug.unseenBoostedCount)) fail('content director debug state incomplete');

if (errors.length) {
  console.error(`[content-director] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[content-director] PASS themes=${config.runThemes.length} pools=${Object.keys(config.contentPools || {}).length} seed=${first.runTheme.id}`);
