// Run-local scheduling only. Never alter damage, score, progression or a save.
export function pacingRoll(seed, ordinal, salt) {
  let h = 2166136261;
  for (const c of `${seed}:pacing:${ordinal}:${salt}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function encounterPacing(game) {
  const seed = String(game.contentDirector?.seed ?? game.gameId ?? 'nova-swarm');
  if (game.encounterPacing?.version === 1 && game.encounterPacing.seed === seed) return game.encounterPacing;
  const continuation = (game.runStartSector || 1) > 1;
  return game.encounterPacing = { version: 1, seed, eligibleLevels: 0, lastSector: 0,
    nextMystery: 1 + Math.floor(pacingRoll(seed, 0, 'first') * (continuation ? 3 : 4)),
    arrivals: [], majorEvents: [], recoveryThrough: -1, ordinarySeconds: 0,
    ordinaryWaves: 0, wasMajor: false };
}
export function enterPacingLevel(game, sector, eligible) {
  const state = encounterPacing(game);
  if (sector > state.lastSector) {
    state.lastSector = sector;
    if (sector >= 11 && eligible) state.eligibleLevels++;
  }
  return state;
}
export function recoveringFromCombination(game) {
  const s = encounterPacing(game);
  return s.majorEvents.length > 0 && (s.eligibleLevels <= s.recoveryThrough
    || s.ordinarySeconds < 15 || s.ordinaryWaves < 1);
}
export function recordMysteryArrival(game, sector, id) {
  const s = encounterPacing(game), previous = s.arrivals.at(-1);
  const at = Number(game.runElapsedSeconds) || 0;
  s.arrivals.push({ sector, id, at, eligibleLevel: s.eligibleLevels,
    gapSeconds: previous ? at - previous.at : null });
  // Actual arrivals advance the sequence; failed loads and deferrals do not.
  s.nextMystery = s.eligibleLevels + 3 + Math.floor(pacingRoll(s.seed, s.arrivals.length, 'gap') * 4);
}
export function majorContacts(manager) {
  const bosses = new Set(), snakes = new Set();
  for (const e of manager.enemies || []) if (e.active && !e.root) {
    if (e.kind === 'boss') bosses.add(e);
    if (e.kind === 'space_snake') snakes.add(e.chain || e);
  }
  if (manager.boss?.active && manager.boss.health > 0) bosses.add(manager.boss);
  return { bosses: bosses.size, snakes: snakes.size, total: bosses.size + snakes.size };
}
export function mysteryAdmission(manager, { id, direct = false } = {}) {
  if (direct) return null;
  const g = manager.game, contacts = majorContacts(manager);
  if (manager.discoveryEncounter?.plan && !manager.discoveryEncounter.disposed
    && manager.discoveryEncounter.stage !== 'failed') return 'boss-combination-reserved';
  if (contacts.total >= 2) return 'multiple-major-enemies';
  if (recoveringFromCombination(g)) return 'ordinary-combat-recovery';
  if (contacts.total && !(g.mysteriesSeen || []).includes(id)) return 'first-contact-needs-ordinary-wave';
  return null;
}
export function bossCombinationAdmission(manager, forced = false) {
  if (forced) return null;
  if (manager.mysteryDirector?.busy) return 'mystery-present';
  if (majorContacts(manager).total > 1) return 'multiple-major-enemies';
  if (recoveringFromCombination(manager.game)) return 'ordinary-combat-recovery';
  return null;
}
export function updateEncounterPacing(manager, delta) {
  const s = encounterPacing(manager.game), c = majorContacts(manager);
  const major = c.total >= 2 || (c.total > 0 && manager.mysteryDirector?.active?.active);
  if (major) { s.wasMajor = true; s.ordinarySeconds = 0; s.ordinaryWaves = 0; }
  else if (s.wasMajor) {
    s.wasMajor = false;
    s.recoveryThrough = s.eligibleLevels + 1;
    s.majorEvents.push({ sector: manager.level, at: Number(manager.game.runElapsedSeconds) || 0 });
    if (s.majorEvents.length > 120) s.majorEvents.shift();
  }
  if (!major && !c.total && !manager.mysteryDirector?.busy && manager.state === 'WAVE_ACTIVE'
    && manager.enemies.some(e => e.active && !e.root && e.kind !== 'mystery' && e.kind !== 'mystery_part')) {
    s.ordinarySeconds += Math.max(0, Math.min(.1, delta / 60));
  }
}
export function recordOrdinaryWaveClear(manager, wave) {
  if (wave && !wave.isChallenge && !wave.highSectorAuthoredEncounter
    && !manager.mysteryDirector?.busy && !majorContacts(manager).total) encounterPacing(manager.game).ordinaryWaves++;
}

// Coordinate large telegraphs, leaving ordinary bullets and music untouched.
export function claimMajorTelegraph(game, source, seconds = 1.25) {
  const manager = game?.scenes?.play?.enemyManager;
  if (!manager) return true;
  const now = Number(game.runElapsedSeconds) || 0;
  const reservation = manager.majorTelegraph;
  if (reservation?.source !== source && reservation?.until > now && reservation.source.active) return false;
  if ((manager.enemies || []).some(e => e !== source && e.active && e.kind === 'boss' && e.attackWarningToken)) return false;
  manager.majorTelegraph = { source, until: now + seconds };
  return true;
}
