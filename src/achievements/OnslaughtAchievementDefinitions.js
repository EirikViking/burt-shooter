import { RUN_MODES } from '../game/RunMode.js';

const BOTH = Object.freeze([RUN_MODES.OVERRUN_TACTICAL, RUN_MODES.OVERRUN_PURE]);
const TACTICAL = Object.freeze([RUN_MODES.OVERRUN_TACTICAL]);

// Definitions join the existing public catalog; evaluation and display read
// these same criterion, mode, scope and threshold fields.
const rows = [
  ['ACH_OS_THREE_HULLS', 'Three Wings', 'Across runs, clear 2 sectors on 3 distinct hulls.', 'hullsTwoSectors', 3, BOTH, 'across_runs'],
  ['ACH_OS_FIVE_HULLS', 'Five Hull Salute', 'Across runs, defeat a boss on 5 distinct hulls.', 'bossHulls', 5, BOTH, 'across_runs'],
  ['ACH_OS_STARTER_WINGS', 'Small Wings, Long Shadows', 'Across runs, clear 3 sectors on 3 distinct hulls from the first five.', 'starterHullsThreeSectors', 3, BOTH, 'across_runs'],
  ['ACH_OS_FIVE_BUILDS', 'Five Opening Gambits', 'Across runs, clear 2 sectors with 5 distinct starting augment triples.', 'loadoutsTwoSectors', 5, TACTICAL, 'across_runs'],
  ['ACH_OS_ONE_HULL_THREE_BUILDS', 'Same Hull, New Plan', 'Across runs, clear 2 sectors on one hull with 3 distinct starting augment triples.', 'oneHullThreeLoadouts', 3, TACTICAL, 'across_runs'],
  ['ACH_OS_BOSS_LEDGER', 'Boss Ledger', 'Across runs, defeat 20 Onslaught bosses.', 'bossKills', 20, BOTH, 'across_runs'],
  ['ACH_OS_SNAKE_SPECIES', 'Serpent Survey', 'Across runs, defeat 3 distinct Space Snake types.', 'snakeTypes', 3, BOTH, 'across_runs'],
  ['ACH_OS_DRAFT_VARIETY', 'Field Research', 'Across runs, choose 10 distinct augments from earned boss Drafts.', 'earnedAugments', 10, TACTICAL, 'across_runs'],
  ['ACH_OS_FUSION_VARIETY', 'Fusion Conductor', 'Across runs, earn 3 distinct fusion protocols from boss Drafts.', 'earnedFusions', 3, TACTICAL, 'across_runs'],
  ['ACH_OS_STEADY_FIVE', 'Five Deep Flights', 'Across 5 runs, clear at least 5 sectors in each.', 'fiveSectorRuns', 5, BOTH, 'across_runs'],
  ['ACH_OS_CLEAN_FLIGHTS', 'Quiet Skies', 'Across 5 runs, clear at least 3 no-hit waves in each.', 'cleanWaveRuns', 5, BOTH, 'across_runs'],
  ['ACH_OS_THREE_STREAK', 'Hold the Line', 'Clear at least 2 sectors in 3 consecutive Onslaught runs.', 'twoSectorStreak', 3, BOTH, 'consecutive_runs'],
  ['ACH_OS_TEN_SECTORS', 'Ten Sectors Beyond', 'In one run, clear 10 Onslaught sectors.', 'sectorsCleared', 10, BOTH, 'single_run'],
  ['ACH_OS_THREE_BOSSES', 'Three Boss Salute', 'In one run, defeat 3 Onslaught bosses.', 'bossesKilled', 3, BOTH, 'single_run'],
  ['ACH_OS_CLEAN_FIVE', 'Five Clean Waves', 'In one run, clear 5 Onslaught waves without taking a hit.', 'noHitWaves', 5, BOTH, 'single_run'],
  ['ACH_OS_SNAKE_DUEL', 'Serpent Duel', 'Defeat a complete Space Snake before losing a second life in that run.', 'snakeDuel', 1, BOTH, 'single_run'],
  ['ACH_OS_SPARROW_FIVE', 'Sparrow Against the Swarm', 'In one run with Nova Sparrow, clear 5 Onslaught sectors.', 'sparrowFive', 5, BOTH, 'single_run'],
  ['ACH_OS_FIELD_FUSION', 'Built Under Fire', 'In one run, earn a fusion from a boss Draft and clear 3 sectors.', 'fieldFusion', 1, TACTICAL, 'single_run'],
  ['ACH_OS_COMPLETE_SET', 'Onslaught Constellation', 'Earn all other 18 Onslaught achievements.', 'allOtherOnslaught', 18, BOTH, 'collection']
];

const otherIds = Object.freeze(rows.slice(0, -1).map(row => row[0]));
export const NEW_ONSLAUGHT_ACHIEVEMENTS = Object.freeze(rows.map(([id, name, description, criterion, target, modes, scope]) =>
  Object.freeze({ id, name, description, type: 'onslaught', criterion, target, scope,
    hidden: false, steamPublished: true, allowedModes: modes, progressModes: modes, completeModes: modes,
    otherIds: criterion === 'allOtherOnslaught' ? otherIds : undefined,
    startSector: 51, rulesetVersion: modes === TACTICAL ? 'overrun_tactical_score_v2' : null,
    requiresSubmission: false })));
