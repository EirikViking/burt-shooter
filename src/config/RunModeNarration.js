const defineNarration = ({
  modeId,
  menuIds,
  displayTitle,
  narrationKey,
  event,
  transcriptSource,
  rankedStatus,
  mechanicSummary,
  audioEnabled = true,
  variants = []
}) => Object.freeze({
  modeId,
  menuIds: Object.freeze([...menuIds]),
  displayTitle,
  narrationKey,
  event,
  transcriptSource,
  rankedStatus,
  mechanicSummary,
  audioEnabled,
  variants: Object.freeze(variants.map((variant) => Object.freeze({ ...variant })))
});

export const RUN_MODE_NARRATION_SPECS = Object.freeze([
  defineNarration({
    modeId: 'mayhem_tactical',
    menuIds: ['launchTactical', 'mayhemTactical'],
    displayTitle: 'ARCADE TACTICAL',
    narrationKey: 'runModeNarration.mayhemTactical',
    event: 'boss_menu_bark_mode_tactical',
    transcriptSource: 'Arcade Tactical. Ranked. Draft one permanent tactical upgrade for this run after every boss.',
    rankedStatus: 'ranked',
    mechanicSummary: 'Separate Tactical leaderboard; one permanent-for-the-run tactical draft after each boss.'
  }),
  defineNarration({
    modeId: 'mayhem_pure',
    menuIds: ['launch', 'mayhem'],
    displayTitle: 'ARCADE PURE',
    narrationKey: 'runModeNarration.mayhemPure',
    event: 'boss_menu_bark_mode_pure',
    transcriptSource: 'Arcade Pure. Ranked. No tactical drafts, only the original Arcade ruleset.',
    rankedStatus: 'ranked',
    mechanicSummary: 'Separate Pure leaderboard; original Arcade rules with no tactical drafts.'
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
    transcriptSource: 'Sector Run. Unranked checkpoint practice. Start from a sector unlocked in Arcade; records stay local.',
    rankedStatus: 'unranked_practice',
    mechanicSummary: 'Checkpoint practice from sectors unlocked in Arcade; local sector records and no achievements.'
  }),
  defineNarration({
    modeId: 'overrun_tactical',
    menuIds: ['onslaught', 'overrun'],
    displayTitle: 'ONSLAUGHT TACTICAL',
    narrationKey: 'runModeNarration.overrunTactical',
    event: 'boss_menu_bark_mode_overrun_tactical',
    transcriptSource: 'Choose a ship and three Tactical augments, then launch at Sector 51. Chase separate global records.\nEarn full career XP from play. Skipped sectors and starting equipment grant no rewards.',
    rankedStatus: 'ranked_challenge',
    mechanicSummary: 'Sector 51, zero score, three chosen Tactical augments and continued boss Drafts. Separate global records, full earned Career XP, explicit post-launch achievement eligibility, and no checkpoint credit.',
    audioEnabled: true,
    variants: [
      {
        id: 'pure',
        modeId: 'overrun_pure',
        displayTitle: 'ONSLAUGHT PURE',
        narrationKey: 'runModeNarration.overrunPure',
        event: 'boss_menu_bark_mode_overrun_pure',
        transcriptSource: 'Onslaught Pure. Start at Sector 51 without Tactical augments or boss Drafts. Earn 85% career XP and eligible Onslaught achievements from play. No skipped-sector or checkpoint credit.',
        rankedStatus: 'unranked_career',
        mechanicSummary: 'Sector 51 start without Tactical augments or Drafts, with 85% earned Career XP, eligible Onslaught achievements and no global score submission.',
        audioEnabled: true
      },
      {
        id: 'locked',
        modeId: 'overrun_locked',
        displayTitle: 'ONSLAUGHT',
        narrationKey: 'runModeNarration.overrunLocked',
        event: 'boss_menu_bark_mode_overrun_locked',
        transcriptSource: 'Available from the start.',
        rankedStatus: 'locked',
        mechanicSummary: 'Available from the start; launches at Sector 51.'
      }
    ]
  })
]);

export const RUN_MODE_NARRATION_BY_MENU_ID = Object.freeze(Object.fromEntries(
  RUN_MODE_NARRATION_SPECS.flatMap((spec) => spec.menuIds.map((menuId) => [menuId, spec]))
));

export const RUN_MODE_NARRATION_EVENT_IDS = Object.freeze(
  RUN_MODE_NARRATION_SPECS.flatMap((spec) => [
    spec.event,
    ...spec.variants.map((variant) => variant.event)
  ])
);

function resolveVariant(spec, variantId = null) {
  if (!spec || !variantId) return spec || null;
  const variant = spec.variants.find((entry) => entry.id === variantId);
  return variant ? Object.freeze({ ...spec, ...variant, menuIds: spec.menuIds, variants: spec.variants }) : spec;
}

export function getRunModeNarrationSpec(menuId, variantId = null) {
  return resolveVariant(RUN_MODE_NARRATION_BY_MENU_ID[String(menuId || '')] || null, variantId);
}

export function getRunModeNarrationSpecByEvent(eventName) {
  for (const spec of RUN_MODE_NARRATION_SPECS) {
    if (spec.event === eventName) return spec;
    const variant = spec.variants.find((entry) => entry.event === eventName);
    if (variant) return resolveVariant(spec, variant.id);
  }
  return null;
}
