import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BalanceConfig, MAX_PLAYER_LIVES } from '../src/config/BalanceConfig.js';
import {
  ALL_POWERUP_TYPES,
  POWERUP_CODEX_ENTRIES,
  getPowerupMeta
} from '../src/config/PowerupCatalog.js';
import { getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';
import { getCabinetLogEntry } from '../src/text/phrasePool.js';
import {
  HULL_SURPLUS_BASE_LIVES,
  shouldTriggerHullSurplusCabinetLog
} from '../src/progression/CabinetLogReachability.js';
import { THREAT_DISCOVERY_KEY } from '../src/progression/ThreatDiscoveryState.js';
import { CLOUD_THREAT_DISCOVERY_KEY } from '../src/steamCloudPersistence.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

assert.equal(Number.isFinite(MAX_PLAYER_LIVES), false, 'current life economy must remain unlimited');
assert.equal(HULL_SURPLUS_BASE_LIVES, 3);
assert.equal(shouldTriggerHullSurplusCabinetLog({ before: 2, after: 3 }), false);
assert.equal(shouldTriggerHullSurplusCabinetLog({ before: 3, after: 4 }), true, 'first surplus hull must be reachable');
assert.equal(shouldTriggerHullSurplusCabinetLog({ before: 4, after: 5 }), true, 'a busy first pickup must allow a later retry');
assert.equal(shouldTriggerHullSurplusCabinetLog({ before: 4, after: 4, gained: 0 }), false);

const play = read('../src/scenes/PlayScene.js');
assert.ok(play.includes("this.triggerCabinetLog('max-lives-read'"), 'Hull Surplus discovery ID must be preserved');
assert.ok(play.includes("source: 'life_surplus'"), 'Hull Surplus must use the truthful surplus-life trigger');
assert.ok(!/showMaxLivesNotification[\s\S]{0,1800}triggerCabinetLog\('max-lives-read'/.test(play),
  'Hull Surplus must not remain attached to the unreachable finite-cap notification');

const forbiddenCapCopy = {
  en: /old capped-life|legacy copy|maximum lives|life cap/i,
  de: /maximale leben|lebencap/i,
  es: /vidas al máximo|límite de vidas/i,
  'pt-BR': /vidas no máximo|limite de vidas/i,
  ru: /жизни на максимуме|лимит[а-я ]*жизн/i,
  'zh-CN': /生命已满|生命上限/,
  ko: /목숨 최대치|목숨 상한/,
  ja: /残機最大|残機上限/
};
for (const locale of Object.keys(forbiddenCapCopy)) {
  const entry = getCabinetLogEntry('max-lives-read', {}, locale);
  assert.equal(entry?.id, 'max-lives-read', `${locale} Hull Surplus entry missing`);
  const copy = `${entry.line} ${entry.description} ${entry.tip}`;
  assert.doesNotMatch(copy, forbiddenCapCopy[locale], `${locale} still describes an unreachable maximum-life trigger`);
  for (const field of ['line', 'description', 'tip']) {
    assert.ok(String(entry[field] || '').trim().length >= 12, `${locale} Hull Surplus ${field} is incomplete`);
  }
}

const plusSignEntries = [
  { id: 'life', name: 'EXTRA LIFE', grantLives: 1 },
  { id: 'super_extra_life', name: 'SUPER EXTRA LIFE', grantLives: 2 }
];
const manager = read('../src/managers/PowerupManager.js');
const manifest = read('../src/assets/assetManifest.js');
const cloud = read('../src/steamCloudPersistence.js');
const catalog = getThreatCodexCatalog({ locale: 'en' });

assert.equal(BalanceConfig.powerups.extraLifeDropsEnabled, true);
assert.ok(Number(BalanceConfig.powerups.extraLifeChance) > 0);
assert.ok(Number(BalanceConfig.powerups.superExtraLifeChance) > 0);
assert.ok(Number(BalanceConfig.powerups.extraLifeGuaranteedEveryLevels) > 0);
assert.equal(THREAT_DISCOVERY_KEY, CLOUD_THREAT_DISCOVERY_KEY, 'local and Steam Cloud discovery keys must agree');
assert.ok(cloud.includes('mergeThreatDiscovery(localDiscovery, save.threatDiscovery)'), 'Steam Cloud must merge discovery progress');
assert.ok(manager.includes("recordThreatDiscovery?.(type, 'powerups'"), 'collection must register every bundled powerup discovery');

for (const expected of plusSignEntries) {
  const meta = getPowerupMeta(expected.id);
  assert.ok(ALL_POWERUP_TYPES.includes(expected.id), `${expected.id} missing from the spawn catalog`);
  assert.equal(meta?.name, expected.name, `${expected.id} player-facing name drifted`);
  const actualGrant = Number(meta?.effect?.grantLives || (expected.id === 'life' ? 1 : 0));
  assert.equal(actualGrant, expected.grantLives, `${expected.id} life grant drifted`);
  assert.ok(POWERUP_CODEX_ENTRIES.some((entry) => entry.id === expected.id && entry.name === expected.name),
    `${expected.id} missing from powerup Codex metadata`);
  assert.ok(catalog.powerups.some((entry) => entry.id === expected.id), `${expected.id} missing from visible Codex catalog`);
  assert.ok(manifest.includes(`${expected.id}: '/art/generated/nova-swarm/powerups/`), `${expected.id} art is missing`);
  assert.ok(manager.includes(`type = '${expected.id}'`) || manager.includes(`createPowerup(safeX, safeY, '${expected.id}'`),
    `${expected.id} has no reachable spawn route`);
}
assert.ok(manager.includes('canSpawnSuperExtraLife()'), 'rare Super Extra Life concurrency guard missing');
assert.ok(!play.includes("recordThreatDiscovery('life', 'powerups'"), 'life discovery must remain event-driven, not auto-unlocked');

console.log('[cabinet-powerup-reachability] PASS Hull Surplus retargeted; life=EXTRA LIFE; super_extra_life=SUPER EXTRA LIFE');
