import { ENEMY_THREAT_ACTIONS } from '../src/config/EnemyThreatActions.js';
import { getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';

const errors = [];
const fail = (message) => errors.push(message);
const codexIds = new Set(getThreatCodexCatalog().attackPatterns.map((entry) => entry.id));

if (ENEMY_THREAT_ACTIONS.length < 10) fail(`expected at least 10 normal enemy threat actions, found ${ENEMY_THREAT_ACTIONS.length}`);

for (const action of ENEMY_THREAT_ACTIONS) {
  if (!codexIds.has(action.id)) fail(`${action.id} missing codex entry`);
  if (!action.telegraph || !(Number(action.telegraphMs) > 0)) fail(`${action.id} missing readable telegraph config`);
  if (!(Number(action.dangerBudgetCost) > 0)) fail(`${action.id} missing danger budget cost`);
  if (!(Number(action.cooldownMs) > 0)) fail(`${action.id} missing cooldown`);
  if (!action.scaledPreviewConfig) fail(`${action.id} missing scaled preview config`);
  if (!action.codexTip) fail(`${action.id} missing codex tip`);
  if (['mine_drop', 'orbiting_satellites'].includes(action.id) && !(Number(action.activeBulletCap) > 0)) {
    fail(`${action.id} must have active bullet caps`);
  }
}

const ids = new Set(ENEMY_THREAT_ACTIONS.map((action) => action.id));
for (const required of [
  'telegraph_rail_lance',
  'lane_cutter',
  'splitter_seed',
  'mine_drop',
  'pulse_ring_bloom',
  'crossfire_pair',
  'boomerang_crescent',
  'brake_dash_bolt',
  'shotgun_fan_feint',
  'orbiting_satellites'
]) {
  if (!ids.has(required)) fail(`missing required threat action ${required}`);
}

if (errors.length) {
  console.error(`[normal-enemy-threat-actions] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[normal-enemy-threat-actions] PASS actions=${ENEMY_THREAT_ACTIONS.length} codex=${codexIds.size}`);
