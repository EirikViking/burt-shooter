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
const totalEntries = Object.values(catalog).reduce((sum, entries) => sum + (Array.isArray(entries) ? entries.length : 0), 0);
for (const category of THREAT_CODEX_CATEGORIES) {
  if (!Array.isArray(catalog[category.id]) || catalog[category.id].length === 0) fail(`missing codex category ${category.id}`);
}
if (totalEntries < 300) fail(`Threat Codex should support long-term discovery, found only ${totalEntries} entries`);
if ((catalog.enemies?.length || 0) < 180) fail(`expected at least 180 enemy codex entries, found ${catalog.enemies?.length || 0}`);
if ((catalog.attackPatterns?.length || 0) < 40) fail(`expected at least 40 attack pattern codex entries, found ${catalog.attackPatterns?.length || 0}`);
if ((catalog.waveTactics?.length || 0) < 35) fail(`expected at least 35 wave tactic codex entries, found ${catalog.waveTactics?.length || 0}`);
if ((catalog.runThemes?.length || 0) < 18) fail(`expected at least 18 run theme codex entries, found ${catalog.runThemes?.length || 0}`);
const waveArt = catalog.waveTactics?.map(entry => entry.art).filter(Boolean) || [];
if (waveArt.length !== catalog.waveTactics.length) fail('every wave tactic should have unique Codex art');
if (new Set(waveArt).size !== waveArt.length) fail('wave tactic Codex art should be unique per tactic');
if (!catalog.bosses?.every(entry => /runtime boss profile/i.test(entry.description))) {
  fail('boss Codex descriptions should be data-driven from runtime boss profiles');
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
for (const token of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'pointerdown', 'gamepad', 'PageUp', 'PageDown', 'wheelNavigation', 'entryScroll']) {
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

console.log(`[threat-codex] PASS categories=${THREAT_CODEX_CATEGORIES.length} total=${totalEntries} enemies=${catalog.enemies.length} attackPatterns=${catalog.attackPatterns.length} waveTactics=${catalog.waveTactics.length} runThemes=${catalog.runThemes.length}`);
