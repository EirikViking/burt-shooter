import { readFileSync } from 'node:fs';
import { THREAT_CODEX_CATEGORIES, getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';
import {
  clearThreatCodexUnread,
  getCodexCompletionCounts,
  recordThreatSeen,
  resetDiscoveryStateForTests
} from '../src/progression/ThreatDiscoveryState.js';

const errors = [];
const fail = (message) => errors.push(message);

const fakeStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => fakeStorage.get(key) ?? null,
  setItem: (key, value) => fakeStorage.set(key, String(value)),
  removeItem: (key) => fakeStorage.delete(key)
};
resetDiscoveryStateForTests();

const catalog = getThreatCodexCatalog();
for (const category of THREAT_CODEX_CATEGORIES) {
  if (!Array.isArray(catalog[category.id]) || catalog[category.id].length === 0) fail(`missing codex category ${category.id}`);
}

const seen = recordThreatSeen('telegraph_rail_lance', 'attackPatterns', { name: 'Rail Lance' });
if (!seen.isNew) fail('new discovery should be marked new');
const completion = getCodexCompletionCounts(catalog);
if (!Number.isFinite(completion.attackPatterns.percent)) fail('codex completion percent must be finite');
const cleared = clearThreatCodexUnread();
if (cleared.unreadIds.length !== 0) fail('codex unread badge should clear');

const menuSource = readFileSync('src/scenes/MenuScene.js', 'utf8');
const gameSource = readFileSync('src/game/Game.js', 'utf8');
const sceneSource = readFileSync('src/scenes/ThreatCodexScene.js', 'utf8');
if (!menuSource.includes('THREAT CODEX')) fail('Threat Codex must be visible in main menu');
if (!gameSource.includes('showThreatCodex')) fail('Game must expose showThreatCodex');
for (const token of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'pointerdown', 'gamepad']) {
  if (!sceneSource.includes(token)) fail(`ThreatCodexScene missing ${token} navigation support`);
}
for (const token of ['UNKNOWN SIGNAL', 'NEW THREAT SCANNED', 'THREAT CODEX UPDATED']) {
  if (!sceneSource.includes(token) && !readFileSync('src/scenes/PlayScene.js', 'utf8').includes(token)) fail(`missing player feedback text ${token}`);
}

if (errors.length) {
  console.error(`[threat-codex] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[threat-codex] PASS categories=${THREAT_CODEX_CATEGORIES.length} attackPatterns=${catalog.attackPatterns.length}`);
