import { readFileSync } from 'node:fs';
import { THREAT_CODEX_CATEGORIES, getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';
import { HANGAR_PROGRESS_KEY } from '../src/progression/HangarProgressState.js';
import {
  THREAT_DISCOVERY_KEY,
  clearThreatCodexUnread,
  getCodexCompletionCounts,
  getThreatCodexState,
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
if ((catalog.enemies?.length || 0) < 357) fail(`expected at least 357 enemy codex entries, found ${catalog.enemies?.length || 0}`);
if ((catalog.attackPatterns?.length || 0) < 40) fail(`expected at least 40 attack pattern codex entries, found ${catalog.attackPatterns?.length || 0}`);
if ((catalog.waveTactics?.length || 0) < 35) fail(`expected at least 35 wave tactic codex entries, found ${catalog.waveTactics?.length || 0}`);
if ((catalog.powerups?.length || 0) < 20) fail(`expected at least 20 powerup codex entries, found ${catalog.powerups?.length || 0}`);
if ((catalog.sectors?.length || 0) < 10) fail(`expected at least 10 sector codex entries, found ${catalog.sectors?.length || 0}`);
if ((catalog.runThemes?.length || 0) < 18) fail(`expected at least 18 run theme codex entries, found ${catalog.runThemes?.length || 0}`);
if ((catalog.pilotRanks?.length || 0) < 40) fail(`expected at least 40 pilot rank codex entries, found ${catalog.pilotRanks?.length || 0}`);
const waveArt = catalog.waveTactics?.map(entry => entry.art).filter(Boolean) || [];
if (waveArt.length !== catalog.waveTactics.length) fail('every wave tactic should have unique Codex art');
if (new Set(waveArt).size !== waveArt.length) fail('wave tactic Codex art should be unique per tactic');
const bannedCopy = /mysterious|cosmic entity|harnesses energy|delve|formidable foe|ancient secrets|unleash|data-driven|arcade drama|director weights/i;
for (const entries of Object.values(catalog)) {
  for (const entry of entries || []) {
    const copy = `${entry.name || ''} ${entry.description || ''} ${entry.tip || ''}`;
    if (bannedCopy.test(copy)) fail(`generic Codex copy remains in ${entry.category}:${entry.id}`);
  }
}
if (!catalog.bosses?.every(entry => /movement/i.test(entry.description) && /pressure/i.test(entry.description) && /signature/i.test(entry.description))) {
  fail('boss Codex descriptions should explain movement, pressure, and signature reads');
}
const bossById = Object.fromEntries((catalog.bosses || []).map((entry) => [entry.id, entry]));
if (!/Dock Verona|love letter|balcony beam|star-crossed/i.test(bossById.nova_boss_01?.description || '') || (bossById.nova_boss_01?.description || '').length < 900) {
  fail('Sonia boss Codex entry should include a long sci-fi tragic love story');
}
if (!/Berget-9|deckhand|admiral throne|royal hangover cannon/i.test(bossById.nova_boss_03?.description || '') || (bossById.nova_boss_03?.description || '').length < 900) {
  fail('KurtBossEdgar boss Codex entry should include a long Jeppe pa Berget-inspired story');
}
if (bossById.nova_boss_01?.codexBodyMode !== 'epic' || bossById.nova_boss_03?.codexBodyMode !== 'epic') {
  fail('long boss Codex stories should use epic body layout mode');
}
if (!catalog.powerups?.every(entry => /powerup|defensive|sustain|shots/i.test(entry.description) && /when|lane|shots|safe|boss|wave|pickups|kills|charges|move|shoot|pattern|enemies|threats|clusters|center|targets|readable/i.test(entry.tip))) {
  fail('powerup Codex entries should explain effect, read, timing, and use');
}
if (!catalog.sectors?.every(entry => /waves?/i.test(entry.description) && /boss/i.test(entry.description) && /lives|life routing/i.test(entry.description))) {
  fail('sector Codex entries should explain wave, boss-gate, and life-routing relevance');
}
const sectorDescriptions = catalog.sectors?.map(entry => entry.description) || [];
if (new Set(sectorDescriptions).size !== sectorDescriptions.length) fail('sector Codex descriptions should be unique');
if (!catalog.sectors?.every(entry => /feel|feels|opens|runs|is /i.test(entry.description) && /lore note|tiny threat flavor|local rumor|field detail/i.test(entry.description) && /gameplay clue/i.test(entry.description))) {
  fail('sector Codex descriptions should include identity, flavor, and a gameplay clue');
}
for (const entry of catalog.runThemes || []) {
  const copy = `${entry.name || ''} ${entry.role || ''} ${entry.description || ''} ${entry.tip || ''}`;
  if (/_/.test(copy) || /\b(?:SCREEN_DOOR|DOUBLE_ARC|CROSS_STREAM|STAGGERED_WING|ORBIT_RING|DIAGONAL_RAID|V_SHAPE|SIDEWINDER|PINCER|GRID|BOX|SPIRAL|ARC)\b/.test(copy)) {
    fail(`run theme Codex exposes internal formation token: ${entry.id}`);
  }
  if (!/hidden command intelligence|swarm director/i.test(copy)) fail(`run theme Codex should explain director in-world: ${entry.id}`);
  if (!/watch sector one|sector one/i.test(copy) || !/adapt|clear|dodge|wait|break|move|shoot|silence|route|step|let|leave|pick|respect|learn|delete|watch|track/i.test(copy)) {
    fail(`run theme Codex should explain what to watch and how to adapt: ${entry.id}`);
  }
}

resetDiscoveryStateForTests();
fakeStorage.delete(THREAT_DISCOVERY_KEY);
fakeStorage.set(HANGAR_PROGRESS_KEY, JSON.stringify({
  discoveredThreatIds: ['telegraph_rail_lance'],
  defeatedBossIds: [catalog.bosses?.[0]?.id],
  runThemesSurvived: ['swarm_lattice'],
  pilotRank: 12,
  highestPilotRank: 12,
  rankAchievementsUnlocked: ['ACH_RANK_13'],
  updatedAt: new Date(Date.UTC(2026, 0, 1)).toISOString()
}));
const restoredState = getThreatCodexState();
const restoredCompletion = getCodexCompletionCounts(catalog, restoredState);
if ((restoredCompletion.attackPatterns?.discovered || 0) < 1) fail('Threat Codex should hydrate attack pattern discoveries from hangar progress');
if ((restoredCompletion.bosses?.discovered || 0) < 1) fail('Threat Codex should hydrate defeated boss discoveries from hangar progress');
if ((restoredCompletion.runThemes?.discovered || 0) < 1) fail('Threat Codex should hydrate run theme discoveries from hangar progress');
if ((restoredCompletion.pilotRanks?.discovered || 0) < 13) fail('Threat Codex should hydrate earned pilot ranks from hangar progress');
if (!restoredState.items?.pilotRanks?.pilot_rank_12) fail('Threat Codex should restore the current displayed pilot rank entry');
if (!fakeStorage.get(THREAT_DISCOVERY_KEY)) fail('Threat Codex hydration should write repaired discovery state');
fakeStorage.delete(HANGAR_PROGRESS_KEY);
resetDiscoveryStateForTests();

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

console.log(`[threat-codex] PASS categories=${THREAT_CODEX_CATEGORIES.length} total=${totalEntries} enemies=${catalog.enemies.length} attackPatterns=${catalog.attackPatterns.length} waveTactics=${catalog.waveTactics.length} runThemes=${catalog.runThemes.length} pilotRanks=${catalog.pilotRanks.length}`);
