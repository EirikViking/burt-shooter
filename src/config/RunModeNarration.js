const defineNarration = ({
  modeId,
  menuIds,
  displayTitle,
  narrationKey,
  event,
  transcriptSource,
  rankedStatus,
  mechanicSummary
}) => Object.freeze({
  modeId,
  menuIds: Object.freeze([...menuIds]),
  displayTitle,
  narrationKey,
  event,
  transcriptSource,
  rankedStatus,
  mechanicSummary
});

export const RUN_MODE_NARRATION_SPECS = Object.freeze([
  defineNarration({
    modeId: 'mayhem_tactical',
    menuIds: ['launchTactical', 'mayhemTactical'],
    displayTitle: 'MAYHEM TACTICAL',
    narrationKey: 'runModeNarration.mayhemTactical',
    event: 'boss_menu_bark_mode_tactical',
    transcriptSource: 'Mayhem Tactical. Ranked. Draft one permanent tactical upgrade for this run after every boss.',
    rankedStatus: 'ranked',
    mechanicSummary: 'Separate Tactical leaderboard; one permanent-for-the-run tactical draft after each boss.'
  }),
  defineNarration({
    modeId: 'mayhem_pure',
    menuIds: ['launch', 'mayhem'],
    displayTitle: 'MAYHEM PURE',
    narrationKey: 'runModeNarration.mayhemPure',
    event: 'boss_menu_bark_mode_pure',
    transcriptSource: 'Mayhem Pure. Ranked. No tactical drafts, only the original Mayhem ruleset.',
    rankedStatus: 'ranked',
    mechanicSummary: 'Separate Pure leaderboard; original Mayhem rules with no tactical drafts.'
  }),
  defineNarration({
    modeId: 'daily_signal',
    menuIds: ['dailySignal'],
    displayTitle: 'DAILY CHALLENGE',
    narrationKey: 'runModeNarration.dailySignal',
    event: 'boss_menu_bark_mode_daily',
    transcriptSource: 'Daily Challenge. Unranked and local. One fixed ship and route with tactical drafts; clear Sector Ten.',
    rankedStatus: 'unranked_local',
    mechanicSummary: 'Shared UTC contract with a fixed loaner and route; local record only; clear Sector 10.'
  }),
  defineNarration({
    modeId: 'scout',
    menuIds: ['scout'],
    displayTitle: 'SCOUT RUN',
    narrationKey: 'runModeNarration.scout',
    event: 'boss_menu_bark_mode_scout',
    transcriptSource: 'Scout Run. Unranked practice. Choose an anomaly; no career progress or leaderboard submission.',
    rankedStatus: 'unranked_practice',
    mechanicSummary: 'Selectable practice anomaly; no career progress, achievements, checkpoints, or leaderboard submission.'
  }),
  defineNarration({
    modeId: 'sector_start',
    menuIds: ['sectorStart', 'sector'],
    displayTitle: 'SECTOR RUN',
    narrationKey: 'runModeNarration.sectorStart',
    event: 'boss_menu_bark_mode_sector',
    transcriptSource: 'Sector Run. Unranked checkpoint practice. Start from a sector unlocked in Mayhem; records stay local.',
    rankedStatus: 'unranked_practice',
    mechanicSummary: 'Checkpoint practice from sectors unlocked in Mayhem; local sector records and no achievements.'
  })
]);

export const RUN_MODE_NARRATION_BY_MENU_ID = Object.freeze(Object.fromEntries(
  RUN_MODE_NARRATION_SPECS.flatMap((spec) => spec.menuIds.map((menuId) => [menuId, spec]))
));

export const RUN_MODE_NARRATION_EVENT_IDS = Object.freeze(
  RUN_MODE_NARRATION_SPECS.map((spec) => spec.event)
);

export function getRunModeNarrationSpec(menuId) {
  return RUN_MODE_NARRATION_BY_MENU_ID[String(menuId || '')] || null;
}
