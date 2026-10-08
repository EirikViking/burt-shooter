import { normalizeOnslaughtEvidence, normalizeSnakeDefeats as snakeDefeats } from '../../electron/onslaughtAchievementEvidence.cjs';
export { normalizeOnslaughtEvidence };
import { validOnslaughtRun, validOnslaughtStartAugments, ONSLAUGHT_RULESET_V2 } from '../../electron/onslaughtContract.cjs';
import { RUN_MODES } from '../game/RunMode.js';
import { getShipMetadata } from '../config/ShipMetadata.js';

const STARTER_HULLS = new Set(['nova_ship_01', 'nova_ship_02', 'nova_ship_03', 'nova_ship_04', 'nova_ship_05']);
const bounded = (value) => Math.max(0, Math.floor(Number(value) || 0));
const ids = (value) => [...new Set((Array.isArray(value) ? value : []).map(item => String(item || '').trim()).filter(Boolean))];
const triple = (value) => validOnslaughtStartAugments(value) ? [...value].sort().join('+') : null;
export function evidenceFromOnslaughtRun(summary = {}) {
  const runId = String(summary.runId || '').trim();
  const mode = summary.runMode;
  if (runId.length < 8 || summary.isDebugRun === true || summary.runRewardsSuppressed === true
    || summary.lateGameExperimentActive === true || Number(summary.startSector) !== 51
    || ![RUN_MODES.OVERRUN_TACTICAL, RUN_MODES.OVERRUN_PURE].includes(mode)) return null;
  if (mode === RUN_MODES.OVERRUN_TACTICAL
    && (summary.rulesetVersion !== ONSLAUGHT_RULESET_V2 || !validOnslaughtRun(summary))) return null;
  const ship = getShipMetadata(summary.selectedShipSpriteKey);
  const mechanicalHullId = ship?.baseId || summary.competitionStart?.shipId || summary.shipId;
  if (!mechanicalHullId) return null;
  const draftPicks = mode === RUN_MODES.OVERRUN_TACTICAL && Array.isArray(summary.tacticalDraftPicks)
    ? summary.tacticalDraftPicks.filter(pick => pick?.source !== 'starting_loadout' && pick?.source !== 'prepared_start')
    : [];
  return {
    runId: runId.slice(0, 100),
    completedAt: Number.isFinite(Date.parse(summary.completedAt)) ? summary.completedAt : new Date().toISOString(),
    mode,
    rulesetVersion: mode === RUN_MODES.OVERRUN_TACTICAL ? ONSLAUGHT_RULESET_V2 : 'overrun_pure',
    hullId: String(mechanicalHullId).slice(0, 60),
    startingTriple: mode === RUN_MODES.OVERRUN_TACTICAL ? triple(summary.competitionStart?.augmentIds) : null,
    sectorsCleared: bounded(summary.sectorsCleared),
    wavesCleared: bounded(summary.wavesCleared),
    elapsedSeconds: bounded(summary.runElapsedSeconds),
    bossesKilled: bounded(summary.bossesKilled),
    noHitWaves: bounded(summary.noHitWaves),
    lifeLosses: bounded(summary.lifeLosses),
    snakeTypes: ids(summary.defeatedSnakeIds).slice(0, 20),
    snakeDefeats: snakeDefeats(summary.snakeDefeats),
    earnedAugments: ids(draftPicks.map(pick => pick.id)).slice(0, 30),
    earnedFusions: ids(draftPicks.flatMap(pick => pick.newFusionIds || [])).slice(0, 20)
  };
}

export function mergeOnslaughtEvidence(local = [], cloud = []) {
  // The run ID is the identity. Repeated Cloud restores never add a run twice.
  return normalizeOnslaughtEvidence([...normalizeOnslaughtEvidence(cloud), ...normalizeOnslaughtEvidence(local)]);
}

export function getOnslaughtCollectionItems(definition, evidence = []) {
  const runs = normalizeOnslaughtEvidence(evidence).filter(run => definition?.allowedModes?.includes(run.mode));
  if (definition?.criterion === 'starterHullsThreeSectors') {
    const counted = new Set(runs.filter(run => run.sectorsCleared >= 3).map(run => run.hullId));
    return [...STARTER_HULLS].map(hullId => ({ hullId, counted: counted.has(hullId) }));
  }
  if (['hullsTwoSectors', 'bossHulls'].includes(definition?.criterion)) {
    return [...new Set(runs.filter(run => definition.criterion === 'bossHulls' ? run.bossesKilled >= 1 : run.sectorsCleared >= 2)
      .map(run => run.hullId))].map(hullId => ({ hullId, counted: true }));
  }
  if (['oneHullThreeLoadouts', 'loadoutsTwoSectors'].includes(definition?.criterion)) {
    const eligible = runs.filter(run => run.sectorsCleared >= 2 && run.startingTriple);
    const byHull = new Map();
    for (const run of eligible) {
      const key = definition.criterion === 'oneHullThreeLoadouts' ? run.hullId : '';
      if (!byHull.has(key)) byHull.set(key, new Set());
      byHull.get(key).add(run.startingTriple);
    }
    const best = [...byHull].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))[0];
    return best ? [...best[1]].map(value => ({ hullId: best[0], augmentIds: value.split('+'), counted: true })) : [];
  }
  return [];
}

export function getOnslaughtAchievementProgress(definition, evidence = [], unlockedIds = []) {
  if (definition?.type !== 'onslaught') return null;
  const runs = normalizeOnslaughtEvidence(evidence).filter(run => definition.allowedModes.includes(run.mode));
  const countUnique = (values) => new Set(values.filter(Boolean)).size;
  const single = (predicate) => Math.max(0, ...runs.map(run => predicate(run) ? definition.target : 0));
  let value = 0;
  switch (definition.criterion) {
    case 'hullsTwoSectors': value = countUnique(runs.filter(r => r.sectorsCleared >= 2).map(r => r.hullId)); break;
    case 'bossHulls': value = countUnique(runs.filter(r => r.bossesKilled >= 1).map(r => r.hullId)); break;
    case 'starterHullsThreeSectors': value = countUnique(runs.filter(r => r.sectorsCleared >= 3 && STARTER_HULLS.has(r.hullId)).map(r => r.hullId)); break;
    case 'loadoutsTwoSectors': value = countUnique(runs.filter(r => r.sectorsCleared >= 2).map(r => r.startingTriple)); break;
    case 'oneHullThreeLoadouts': {
      const byHull = new Map();
      runs.filter(r => r.sectorsCleared >= 2 && r.startingTriple).forEach(r => {
        if (!byHull.has(r.hullId)) byHull.set(r.hullId, new Set());
        byHull.get(r.hullId).add(r.startingTriple);
      });
      value = Math.max(0, ...[...byHull.values()].map(set => set.size));
      break;
    }
    case 'bossKills': value = runs.reduce((sum, r) => sum + r.bossesKilled, 0); break;
    case 'snakeTypes': value = countUnique(runs.flatMap(r => r.snakeTypes)); break;
    case 'earnedAugments': value = countUnique(runs.flatMap(r => r.earnedAugments)); break;
    case 'earnedFusions': value = countUnique(runs.flatMap(r => r.earnedFusions)); break;
    case 'fiveSectorRuns': value = runs.filter(r => r.sectorsCleared >= 5).length; break;
    case 'cleanWaveRuns': value = runs.filter(r => r.noHitWaves >= 3).length; break;
    case 'twoSectorStreak': {
      let streak = 0;
      for (const run of runs) streak = run.sectorsCleared >= 2 ? streak + 1 : 0;
      value = streak;
      break;
    }
    case 'sectorsCleared': value = Math.max(0, ...runs.map(r => r.sectorsCleared)); break;
    case 'bossesKilled': value = Math.max(0, ...runs.map(r => r.bossesKilled)); break;
    case 'noHitWaves': value = Math.max(0, ...runs.map(r => r.noHitWaves)); break;
    // Historic summaries without defeat-time evidence cannot establish a new unlock.
    // Persisted unlocked IDs remain authoritative and are never revoked here.
    case 'snakeDuel': value = single(r => Array.isArray(r.snakeDefeats)
      && r.snakeDefeats.some(defeat => r.snakeTypes.includes(defeat.type) && defeat.lifeLosses <= 1)); break;
    case 'sparrowFive': value = Math.max(0, ...runs.filter(r => r.hullId === 'nova_ship_01').map(r => r.sectorsCleared)); break;
    case 'fieldFusion': value = single(r => r.earnedFusions.length > 0 && r.sectorsCleared >= 3); break;
    case 'allOtherOnslaught': value = definition.otherIds.filter(id => unlockedIds.includes(id)).length; break;
    default: throw new Error(`Unknown Onslaught achievement criterion: ${definition.criterion}`);
  }
  return { value, target: definition.target, complete: value >= definition.target,
    scope: definition.scope, runsConsidered: runs.length };
}
