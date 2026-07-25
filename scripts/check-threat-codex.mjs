import { readFileSync } from 'node:fs';
import { THREAT_CODEX_CATEGORIES, getSectorCodexLevels, getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';
import { TACTICAL_DRAFT_AUGMENTS } from '../src/config/TacticalDraft.js';
import { BOSS_SUPPORT_SHIP_TOTAL } from '../src/config/BossSupportShips.js';
import { GENERATED_ENEMY_TOTAL } from '../src/config/GeneratedEnemyProfiles.js';
import { HANGAR_PROGRESS_KEY, LEGACY_UNLOCK_PROGRESS_KEY } from '../src/progression/HangarProgressState.js';
import {
  THREAT_DISCOVERY_KEY,
  clearThreatCodexUnread,
  getCodexDiscoverySignature,
  getCodexCompletionCounts,
  getDiscoveryStats,
  getThreatCodexState,
  invalidateThreatDiscoveryStateCache,
  recordThreatDefeatedBatch,
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
if (getDiscoveryStats().unreadCount !== 0) fail('fresh profile with no discoveries should not show Codex glow');

const catalog = getThreatCodexCatalog();
const totalEntries = Object.values(catalog).reduce((sum, entries) => sum + (Array.isArray(entries) ? entries.length : 0), 0);
for (const category of THREAT_CODEX_CATEGORIES) {
  if (!Array.isArray(catalog[category.id]) || catalog[category.id].length === 0) fail(`missing codex category ${category.id}`);
}
if (totalEntries < 300) fail(`Threat Codex should support long-term discovery, found only ${totalEntries} entries`);
const expectedEnemyCodexMinimum = GENERATED_ENEMY_TOTAL + BOSS_SUPPORT_SHIP_TOTAL + 1;
if ((catalog.enemies?.length || 0) < expectedEnemyCodexMinimum) {
  fail(`expected at least ${expectedEnemyCodexMinimum} enemy codex entries, found ${catalog.enemies?.length || 0}`);
}
if ((catalog.attackPatterns?.length || 0) < 40) fail(`expected at least 40 attack pattern codex entries, found ${catalog.attackPatterns?.length || 0}`);
if ((catalog.waveTactics?.length || 0) < 35) fail(`expected at least 35 wave tactic codex entries, found ${catalog.waveTactics?.length || 0}`);
if ((catalog.powerups?.length || 0) < 20) fail(`expected at least 20 powerup codex entries, found ${catalog.powerups?.length || 0}`);
if ((catalog.augments?.length || 0) !== TACTICAL_DRAFT_AUGMENTS.length) {
  fail(`expected all ${TACTICAL_DRAFT_AUGMENTS.length} tactical augments in Codex, found ${catalog.augments?.length || 0}`);
}
const augmentCodexById = new Map((catalog.augments || []).map((entry) => [entry.id, entry]));
for (const augment of TACTICAL_DRAFT_AUGMENTS) {
  const entry = augmentCodexById.get(augment.id);
  if (!entry?.art || !entry?.description || !entry?.tip) fail(`tactical augment Codex entry incomplete: ${augment.id}`);
}
if ((catalog.sectors?.length || 0) <= 12) fail(`sector Codex must not be capped at 12 entries, found ${catalog.sectors?.length || 0}`);
if ((catalog.runThemes?.length || 0) < 18) fail(`expected at least 18 run theme codex entries, found ${catalog.runThemes?.length || 0}`);
if ((catalog.wonders?.length || 0) !== 60) fail(`expected all 60 Cabinet Wonders in Codex, found ${catalog.wonders?.length || 0}`);
if (new Set((catalog.wonders || []).map((entry) => entry.name)).size !== 60) fail('every Cabinet Wonder needs a unique Codex title');
if (new Set((catalog.wonders || []).map((entry) => entry.description)).size !== 60) fail('every Cabinet Wonder needs a unique Codex history');
if (new Set((catalog.wonders || []).map((entry) => entry.art)).size !== 60) fail('every Cabinet Wonder needs unique Codex art');
if (!catalog.wonders?.every((entry) => entry.codexBodyMode === 'epic' && entry.description.length >= 500 && entry.tip.length >= 40)) {
  fail('every Cabinet Wonder needs the epic Codex layout, a substantial history, and a field note');
}
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
if (!catalog.bosses?.every(entry => /movement|moves|moving|flies|traces/i.test(entry.description) && /pressure|attacks|fires|cannon|barrage/i.test(entry.description) && /signature|signal|tell|beam/i.test(entry.description))) {
  fail('boss Codex descriptions should explain movement, pressure, and signature reads');
}
const bossById = Object.fromEntries((catalog.bosses || []).map((entry) => [entry.id, entry]));
if (!/Czechia|loved to chat|adored her|already carried a vow|balcony beam/i.test(bossById.nova_boss_01?.description || '') || (bossById.nova_boss_01?.description || '').length < 900) {
  fail('Sonia boss Codex entry should include a long Czechia signal-boundary love story');
}
if (bossById.nova_boss_03?.name !== 'Ro ro ro') {
  fail('Boss 3 should be named Ro ro ro');
}
if (!/Berget-9|deckhand|admiral throne|royal hangover cannon/i.test(bossById.nova_boss_03?.description || '') || (bossById.nova_boss_03?.description || '').length < 900) {
  fail('Ro ro ro boss Codex entry should include a long Jeppe pa Berget-inspired story');
}
if (bossById.nova_boss_01?.codexBodyMode !== 'epic' || bossById.nova_boss_03?.codexBodyMode !== 'epic') {
  fail('long boss Codex stories should use epic body layout mode');
}
if (!catalog.powerups?.every(entry => /powerup|pickup|capsule|shots|life|shield|bomb|drone|weapon|score/i.test(entry.description) && /lane|safe|screen|window|problem|move|shoot|firing|surviv|timing/i.test(entry.tip))) {
  fail('powerup Codex entries should explain effect, read, timing, and use');
}
if (!catalog.sectors?.every(entry => /route|lane|wave|boss|lives|life|hulls/i.test(entry.description) && /clue/i.test(entry.description))) {
  fail('sector Codex entries should explain route pressure and include a practical clue');
}
const sectorDescriptions = catalog.sectors?.map(entry => entry.description) || [];
if (new Set(sectorDescriptions).size !== sectorDescriptions.length) fail('sector Codex descriptions should be unique');
if (!catalog.sectors?.every(entry => /opens|traffic lights|route/i.test(entry.description) && /lore note|local rumor/i.test(entry.description) && /practical clue|pilot's clue/i.test(entry.description))) {
  fail('sector Codex descriptions should include identity, flavor, and a gameplay clue');
}
const sectorById = Object.fromEntries((catalog.sectors || []).map((entry) => [entry.id, entry]));
for (const level of [20, 30, 40, 50, 60]) {
  const id = `sector_${String(level).padStart(3, '0')}`;
  const entry = sectorById[id];
  if (!entry) fail(`sector Codex missing milestone ${id}`);
  if (!/milestone|far signal|overrun|clear gate|boss gate/i.test(`${entry?.rarity || ''} ${entry?.role || ''}`)) {
    fail(`sector milestone ${id} should expose milestone/band status`);
  }
  if (!/sector signal|sector signal/i.test(entry?.signalClass || '')) fail(`sector ${id} should be marked as sector signal`);
}
if (!/far-signal|far signal|generated sectors/i.test(`${sectorById.sector_060?.role || ''} ${sectorById.sector_060?.description || ''} ${sectorById.sector_060?.tip || ''}`)) {
  fail('sector 60 should describe far-signal generated-sector behavior');
}
const sectorArt = catalog.sectors?.map((entry) => entry.art).filter(Boolean) || [];
if (sectorArt.length !== catalog.sectors.length) fail('every sector Codex entry should have art');
if (new Set(sectorArt).size !== sectorArt.length) fail('sector Codex art should be unique per sector');
if (sectorArt.some((art) => /overrun-victory-seal|gameplay-arena|boss-arena/i.test(String(art)))) {
  fail('sector Codex art should not reuse generic gameplay or overrun seal art');
}
const sectorLevels = getSectorCodexLevels();
if (sectorLevels.length <= 12 || !sectorLevels.includes(30) || !sectorLevels.includes(60)) {
  fail(`sector Codex levels should include scalable milestones beyond 12, found ${sectorLevels.join(', ')}`);
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
  bestSector: 30,
  bestLevel: 30,
  pilotRank: 12,
  highestPilotRank: 12,
  rankAchievementsUnlocked: ['ACH_RANK_13'],
  updatedAt: new Date(Date.UTC(2026, 0, 1)).toISOString()
}));
invalidateThreatDiscoveryStateCache();
const restoredState = getThreatCodexState();
const restoredCompletion = getCodexCompletionCounts(catalog, restoredState);
if ((restoredCompletion.attackPatterns?.discovered || 0) < 1) fail('Threat Codex should hydrate attack pattern discoveries from hangar progress');
if ((restoredCompletion.bosses?.discovered || 0) < 1) fail('Threat Codex should hydrate defeated boss discoveries from hangar progress');
if ((restoredCompletion.runThemes?.discovered || 0) < 1) fail('Threat Codex should hydrate run theme discoveries from hangar progress');
if ((restoredCompletion.pilotRanks?.discovered || 0) < 13) fail('Threat Codex should hydrate earned pilot ranks from hangar progress');
if ((restoredCompletion.sectors?.discovered || 0) < 30) fail('Threat Codex should hydrate reached sectors from hangar progress');
if (!restoredState.items?.sectors?.sector_020 || !restoredState.items?.sectors?.sector_030) fail('Threat Codex should restore sector 20 and sector 30 discoveries');
if (!restoredState.items?.pilotRanks?.pilot_rank_12) fail('Threat Codex should restore the current displayed pilot rank entry');
if (!fakeStorage.get(THREAT_DISCOVERY_KEY)) fail('Threat Codex hydration should write repaired discovery state');
fakeStorage.delete(HANGAR_PROGRESS_KEY);
resetDiscoveryStateForTests();

fakeStorage.delete(THREAT_DISCOVERY_KEY);
fakeStorage.set(HANGAR_PROGRESS_KEY, JSON.stringify({
  bestSector: 75,
  bestLevel: 75,
  updatedAt: new Date(Date.UTC(2026, 0, 2)).toISOString()
}));
invalidateThreatDiscoveryStateCache();
const farCatalog = getThreatCodexCatalog();
const farSector = farCatalog.sectors?.find((entry) => entry.id === 'sector_075');
if (!farSector) fail('visiting higher sectors should reveal sector Codex entries beyond 60');
if (!/sector 75|far signal|overrun|pressure|lane|waves|boss/i.test(`${farSector?.name || ''} ${farSector?.role || ''} ${farSector?.description || ''} ${farSector?.tip || ''}`)) {
  fail('far-signal sector 75 should display sensible generated content');
}
const farState = getThreatCodexState();
if (!farState.items?.sectors?.sector_075) fail('Threat Codex should hydrate far-signal sector 75 discovery');
fakeStorage.delete(HANGAR_PROGRESS_KEY);
resetDiscoveryStateForTests();

fakeStorage.delete(THREAT_DISCOVERY_KEY);
fakeStorage.set(LEGACY_UNLOCK_PROGRESS_KEY, JSON.stringify({
  bestScore: 81240,
  bestRank: 18,
  bestLevel: 18
}));
invalidateThreatDiscoveryStateCache();
const legacyRestoredState = getThreatCodexState();
const legacyCompletion = getCodexCompletionCounts(catalog, legacyRestoredState);
if ((legacyCompletion.pilotRanks?.discovered || 0) < 19) fail('Threat Codex should hydrate earned pilot ranks from legacy hangar progress');
if (!legacyRestoredState.items?.pilotRanks?.pilot_rank_18) fail('Threat Codex should restore legacy displayed pilot rank entry');
fakeStorage.delete(LEGACY_UNLOCK_PROGRESS_KEY);
resetDiscoveryStateForTests();

const eliteProbe = catalog.elites?.[0];
if (!eliteProbe?.id) fail('Threat Codex should include an elite probe entry for defeat-stat checks');
if (eliteProbe?.id) {
  const eliteProbeId = eliteProbe.id;
  fakeStorage.set(THREAT_DISCOVERY_KEY, JSON.stringify({
    version: 1,
    items: {
      enemies: {
        [eliteProbeId]: {
          id: eliteProbeId,
          category: 'enemies',
          name: eliteProbe.name,
          timesSeen: 0,
          timesDefeated: 7
        }
      },
      elites: {
        [eliteProbeId]: {
          id: eliteProbeId,
          category: 'elites',
          name: eliteProbe.name,
          timesSeen: 433,
          timesDefeated: 0
        }
      }
    },
    discoveriesThisRun: [],
    recentRunThemes: [],
    unreadIds: [],
    updatedAt: new Date(Date.UTC(2026, 6, 2)).toISOString()
  }));
  invalidateThreatDiscoveryStateCache();
  const repairedEliteState = getThreatCodexState();
  const repairedElite = repairedEliteState.items?.elites?.[eliteProbeId];
  if ((repairedElite?.timesDefeated || 0) !== 7) {
    fail(`legacy elite defeat counts should display under elites, got ${repairedElite?.timesDefeated || 0}`);
  }
  if ((repairedElite?.timesSeen || 0) !== 433) {
    fail(`legacy elite repair should preserve elite encounter counts, got ${repairedElite?.timesSeen || 0}`);
  }

  resetDiscoveryStateForTests();
  recordThreatSeen(eliteProbeId, 'elites', { name: eliteProbe.name });
  recordThreatDefeatedBatch([{ threatId: eliteProbeId, category: 'elites', metadata: { name: eliteProbe.name } }]);
  const defeatedEliteState = getThreatCodexState();
  if ((defeatedEliteState.items?.elites?.[eliteProbeId]?.timesDefeated || 0) !== 1) {
    fail('elite defeats should be recorded in the elites Codex bucket');
  }
  if ((defeatedEliteState.items?.enemies?.[eliteProbeId]?.timesDefeated || 0) !== 0) {
    fail('new elite defeats should not be recorded in the enemies Codex bucket');
  }
  resetDiscoveryStateForTests();
}

const augmentSeen = recordThreatSeen('phase_reactor', 'augments', { name: 'PHASE REACTOR' });
if (!augmentSeen.isNew || !getThreatCodexState().items?.augments?.phase_reactor) {
  fail('using a tactical augment should persist it in the Augments Codex category');
}
resetDiscoveryStateForTests();

const wonderProbe = catalog.wonders?.find((entry) => entry.id === 'celestial_crane_migration');
const wonderSeen = recordThreatSeen(wonderProbe?.id, 'wonders', { name: wonderProbe?.name });
if (!wonderProbe || !wonderSeen.isNew || !getThreatCodexState().items?.wonders?.celestial_crane_migration) {
  fail('observing a Cabinet Wonder should persist it in the Wonders Codex category');
}
if (getCodexCompletionCounts(catalog).wonders?.discovered !== 1) {
  fail('Wonders Codex completion should count the observed Wonder');
}
resetDiscoveryStateForTests();

const seen = recordThreatSeen('telegraph_rail_lance', 'attackPatterns', { name: 'Rail Lance' });
if (!seen.isNew) fail('new discovery should be marked new');
const completion = getCodexCompletionCounts(catalog);
if (!Number.isFinite(completion.attackPatterns.percent)) fail('codex completion percent must be finite');
if (getDiscoveryStats().unreadCount !== 1) fail('new discovery should create exactly one unread Codex signal');
startUnreadLifecycleChecks();
const cleared = clearThreatCodexUnread();
if (cleared.unreadIds.length !== 0) fail('codex unread badge should clear');
if (!cleared.lastViewedCodexDiscoverySignature) fail('opening Threat Codex should persist a viewed discovery signature');
if (getDiscoveryStats().unreadCount !== 0) fail('opening Threat Codex should clear the menu glow immediately');

const menuSource = readFileSync('src/scenes/MenuScene.js', 'utf8');
const gameSource = readFileSync('src/game/Game.js', 'utf8');
const sceneSource = readFileSync('src/scenes/ThreatCodexScene.js', 'utf8');
const playSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
if (!menuSource.includes('THREAT CODEX')) fail('Threat Codex must be visible in main menu');
if (!gameSource.includes('showThreatCodex')) fail('Game must expose showThreatCodex');
if (!playSource.includes("const threatCategory = isEliteMiddleShip ? 'elites' : 'enemies'")) {
  fail('elite middle ship kills should queue defeats into the elites Codex bucket');
}
if (!playSource.includes("['enemies', 'elites', 'bosses']")) {
  fail('defeat seen-key cache should include elites so first-defeat scoring stays stable');
}
for (const token of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'pointerdown', 'gamepad', 'PageUp', 'PageDown', 'wheelNavigation', 'entryScroll']) {
  if (!sceneSource.includes(token)) fail(`ThreatCodexScene missing ${token} navigation support`);
}
for (const token of ['UNKNOWN SIGNAL', 'NEW THREAT SCANNED', 'THREAT CODEX UPDATED']) {
  if (!sceneSource.includes(token) && !readFileSync('src/scenes/PlayScene.js', 'utf8').includes(token)) fail(`missing player feedback text ${token}`);
}

function startUnreadLifecycleChecks() {
  const largeItems = { enemies: {} };
  for (let index = 0; index < 650; index += 1) {
    const id = `large_codex_${String(index + 1).padStart(3, '0')}`;
    largeItems.enemies[id] = {
      id,
      category: 'enemies',
      name: `Large Codex ${index + 1}`,
      timesSeen: 1
    };
  }
  fakeStorage.set(THREAT_DISCOVERY_KEY, JSON.stringify({
    version: 1,
    items: largeItems,
    discoveriesThisRun: [],
    recentRunThemes: [],
    unreadIds: ['enemies:large_codex_650', 'enemies:missing_or_stale'],
    updatedAt: new Date(Date.UTC(2026, 5, 22)).toISOString()
  }));
  invalidateThreatDiscoveryStateCache();
  const largeState = getThreatCodexState();
  if (Object.keys(largeState.items.enemies || {}).length !== 650) fail('large Codex state should not be capped at 500 entries');
  if (getDiscoveryStats().unreadCount !== 1) fail('stale unread IDs should not drive the menu glow');
  const opened = clearThreatCodexUnread();
  if (opened.unreadIds.length !== 0) fail('opening Threat Codex should mark current discoveries read');
  const largeSignature = getCodexDiscoverySignature(opened.items);
  if (opened.lastViewedCodexDiscoverySignature !== largeSignature.signature) fail('Codex read marker should match the canonical large-profile discovery signature');
  if (opened.lastViewedCodexDiscoveryCount !== largeSignature.count) fail(`large Codex read marker should count all discoveries, got ${opened.lastViewedCodexDiscoveryCount} expected ${largeSignature.count}`);
  invalidateThreatDiscoveryStateCache();
  if (getDiscoveryStats().unreadCount !== 0) fail('cleared unread state should survive restart/profile reload');
  const reloaded = getThreatCodexState();
  if (reloaded.unreadIds.length !== 0) fail('restart/profile reload should discard stale unread IDs once the viewed signature matches');
  fakeStorage.set(THREAT_DISCOVERY_KEY, JSON.stringify({
    ...reloaded,
    unreadIds: ['enemies:large_codex_650']
  }));
  invalidateThreatDiscoveryStateCache();
  if (getDiscoveryStats().unreadCount !== 0) fail('stale restored unread IDs should not relight the menu glow when the viewed signature is current');
  const later = recordThreatSeen('large_codex_651', 'enemies', { name: 'Later Signal' });
  if (!later.isNew || getDiscoveryStats().unreadCount !== 1) fail('later new discoveries should bring back the Codex glow');
  const reopened = clearThreatCodexUnread();
  invalidateThreatDiscoveryStateCache();
  const reopenedSignature = getCodexDiscoverySignature(reopened.items);
  if (getDiscoveryStats().unreadCount !== 0 || reopened.lastViewedCodexDiscoveryCount !== reopenedSignature.count || reopenedSignature.count <= largeSignature.count) {
    fail('opening Codex again should clear the later discovery and advance the read marker');
  }
}

if (errors.length) {
  console.error(`[threat-codex] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[threat-codex] PASS categories=${THREAT_CODEX_CATEGORIES.length} total=${totalEntries} enemies=${catalog.enemies.length} attackPatterns=${catalog.attackPatterns.length} waveTactics=${catalog.waveTactics.length} runThemes=${catalog.runThemes.length} pilotRanks=${catalog.pilotRanks.length}`);
