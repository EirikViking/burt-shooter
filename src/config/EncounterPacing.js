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
  s.nextMystery = s.eligibleLevels + 3 + Math.floor(pacingRoll(s.seed, s.arrivals.length, 'gap') * 3);
  if(id==='carrion_weaver')recordEncounterFamily(game,'wreck_claim',sector);
}
// Shared aliases use the existing run-local pacing state. Two sectors and
// fifteen combat seconds are initial recovery hypotheses, not spawn weights.
export function encounterFamilyReady(game,family,sector=game.level){
  if(family==='reactor_freight')family='rescue_contact';
  const previous=encounterPacing(game).mechanicFamilies?.[family];
  return !previous||(sector-previous.sector>=2&&(Number(game.runElapsedSeconds)||0)-previous.at>=15);
}
export function recordEncounterFamily(game,family,sector=game.level){
  // Same contact opportunity and recovery; a freight label cannot bypass it.
  if(family==='reactor_freight')family='rescue_contact';
  if(!['wreck_claim','linked_battery','brood_route','rescue_contact'].includes(family))return;
  const state=encounterPacing(game);state.mechanicFamilies||={};
  state.mechanicFamilies[family]={sector,at:Number(game.runElapsedSeconds)||0};
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
export function mysteryAdmission(manager, { id, direct = false, crossover = false } = {}) {
  if (direct) return null;
  if(id==='carrion_weaver'&&!encounterFamilyReady(manager.game,'wreck_claim',manager.level))return 'mechanic-family-recovery';
  const curated=crossover&&id==='carrion_weaver'&&manager.curatedReassemblyMolt
    &&majorContacts(manager).bosses===0&&majorContacts(manager).snakes<=1;
  if(manager.environment?.active||(manager.serpentMolts?.size&&!curated)||manager.game.scenes?.play?.firstLightDirector?.model.encounter)return 'new-encounter-present';
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
  if(manager.environment?.active)return 'authored-environment-present';
  if(manager.serpentMolts?.size)return 'serpent-molt-present';
  if (manager.mysteryDirector?.busy) return 'mystery-present';
  if (majorContacts(manager).total > 1) return 'multiple-major-enemies';
  if (recoveringFromCombination(manager.game)) return 'ordinary-combat-recovery';
  return null;
}

export function dreadnoughtEligible(manager){
  const g=manager.game,level=manager.level;
  if(g.encounterEvolutionTest?.id==='breach'||g.encounterEvolutionTest?.id==='breach-diagonal')return true;
  if(level<8||level===51||g.runMode==='daily_signal'||g.encounterTest||g.lateGameExperiment?.active
    ||manager.highSectorEscalationState?.bossSupportEvent||manager.mysteryDirector?.plan?.bossWave
    ||manager.mysteryDirector?.busy||manager.environment?.active||g.scenes?.play?.firstLightDirector?.model.encounter)return false;
  if(!encounterFamilyReady(g,'linked_battery',level))return false;
  const planetfallSector=encounterPacing(g).planetfallSector;
  if(planetfallSector!=null&&level-planetfallSector<6)return false;
  const s=encounterPacing(g),first=8+Math.floor(pacingRoll(s.seed,0,'breach-introduction')*4);
  return level>=(g.lastDreadnoughtSector==null?first:g.lastDreadnoughtSector+14);
}
export function planetfallEligible(manager){
  const g=manager.game,level=manager.level,state=encounterPacing(g);
  if(!Number.isInteger(level)||level<14||level===51||state.planetfallSector!=null
    ||g.runMode==='daily_signal'||g.runMode==='boss_rush'||g.encounterTest||g.lateGameExperiment?.active
    ||g.encounterEvolutionTest&&g.encounterEvolutionTest.id!=='natural'
    ||manager.highSectorEscalationState?.bossSupportEvent||manager.mysteryDirector?.plan?.bossWave
    ||manager.mysteryDirector?.busy||manager.environment?.active||manager.serpentMolts?.size
    ||g.scenes?.play?.firstLightDirector?.model.encounter||majorContacts(manager).total>0)return false;
  if(!encounterFamilyReady(g,'linked_battery',level)||recoveringFromCombination(g))return false;
  if(g.lastDreadnoughtSector!=null&&level-g.lastDreadnoughtSector<6)return false;
  return level>=14+Math.floor(pacingRoll(state.seed,0,'planetfall-introduction')*5);
}
export function updateEncounterPacing(manager, delta) {
  const s = encounterPacing(manager.game), c = majorContacts(manager);
  const major = manager.environment?.active || manager.boss?.active&&(manager.boss.isDreadnought||manager.boss.isPlanetfall)
    ||manager.mysteryDirector?.active?.active&&Boolean(manager.mysteryDirector.active.reassembly)
    || c.total >= 2 || (c.total > 0 && manager.mysteryDirector?.active?.active);
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
