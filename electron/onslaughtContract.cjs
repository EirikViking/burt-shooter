// Shared at result creation, queue admission and the native IPC boundary.
const ONSLAUGHT_BOARD = 'nova_swarm_overrun_tactical_score_v1';
const ONSLAUGHT_RULESET = 'overrun_tactical_score_v1';
const ONSLAUGHT_LOADOUT = 'overrun_tactical_five_v1';
const ONSLAUGHT_AUGMENTS = Object.freeze(['damage_up', 'rapid_fire', 'blink_drive', 'focus_lens', 'double_shot']);
const ONSLAUGHT_BOARD_V2 = 'nova_swarm_overrun_tactical_score_v2';
const ONSLAUGHT_RULESET_V2 = 'overrun_tactical_score_v2';
const ONSLAUGHT_LOADOUT_V2 = 'overrun_tactical_custom_three_v2';
const ONSLAUGHT_START_POOL = Object.freeze([
  'damage_up', 'rapid_fire', 'rail_surge', 'double_shot', 'pierce',
  'shield', 'ghost', 'impact_foam',
  'speed_up', 'blink_drive', 'focus_lens', 'vector_boost',
  'magnet', 'drones', 'bomb'
]);
function validOnslaughtStartAugments(ids) {
  return Array.isArray(ids) && ids.length === 3
    && new Set(ids).size === 3
    && ids.every(id => ONSLAUGHT_START_POOL.includes(id));
}
function onslaughtBoardForRuleset(ruleset) {
  return ruleset === ONSLAUGHT_RULESET_V2 ? ONSLAUGHT_BOARD_V2
    : ruleset === ONSLAUGHT_RULESET ? ONSLAUGHT_BOARD : null;
}
function validOnslaughtRun(run = {}) {
  const start = run.competitionStart;
  const board = onslaughtBoardForRuleset(run.rulesetVersion);
  const validLoadout = run.rulesetVersion === ONSLAUGHT_RULESET_V2
    ? start?.loadoutVersion === ONSLAUGHT_LOADOUT_V2
      && start?.rulesetVersion === ONSLAUGHT_RULESET_V2
      && validOnslaughtStartAugments(start?.augmentIds)
    : run.rulesetVersion === ONSLAUGHT_RULESET
      && start?.loadoutVersion === ONSLAUGHT_LOADOUT
      && Array.isArray(start?.augmentIds) && start.augmentIds.length === ONSLAUGHT_AUGMENTS.length
      && new Set(start.augmentIds).size === ONSLAUGHT_AUGMENTS.length
      && ONSLAUGHT_AUGMENTS.every(id => start.augmentIds.includes(id));
  return run.runMode === 'overrun_tactical'
    && run.isDebugRun !== true && run.prototype !== true && run.eligibleForSubmission !== false
    && Boolean(board) && validLoadout
    && typeof run.runId === 'string' && run.runId.length >= 8
    && typeof run.shipId === 'string' && run.shipId.length > 0
    && Number(run.startSector) === 51
    && start?.startSector === 51 && start?.startScore === 0
    && start?.shipId === run.shipId && start?.runId === run.runId
    && start?.checkpoint === null && start?.prototype === false
    && (!run.leaderboardName || run.leaderboardName === board)
    && (!run.leaderboardKind || run.leaderboardKind === 'overrun_tactical');
}
module.exports = {
  ONSLAUGHT_BOARD, ONSLAUGHT_RULESET, ONSLAUGHT_LOADOUT, ONSLAUGHT_AUGMENTS,
  ONSLAUGHT_BOARD_V2, ONSLAUGHT_RULESET_V2, ONSLAUGHT_LOADOUT_V2, ONSLAUGHT_START_POOL,
  validOnslaughtStartAugments, onslaughtBoardForRuleset, validOnslaughtRun
};
