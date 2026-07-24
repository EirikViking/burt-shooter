const defineNarration = ({
  modeId,
  menuIds,
  displayTitle,
  narrationKey,
  event,
  transcriptSource,
  rankedStatus,
  mechanicSummary,
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
  variants: Object.freeze(variants.map((variant) => Object.freeze({ ...variant })))
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
  }),
  defineNarration({
    modeId: 'overrun_tactical',
    menuIds: ['overrun'],
    displayTitle: 'OVERRUN TACTICAL',
    narrationKey: 'runModeNarration.overrunTactical',
    event: 'boss_menu_bark_mode_overrun_tactical',
    transcriptSource: 'Overrun Tactical unlocked. Start at Sector Fifty-One with zero score. You begin with Damage Up, Rapid Fire, Blink Drive, Focus Lens, and Double Shot. Career XP is reduced to sixty-five percent; leaderboards and achievements stay off.',
    rankedStatus: 'unranked_career',
    mechanicSummary: 'Sector 51 start with five fixed Tactical augments, continued boss Drafts, reduced Career XP, and no leaderboard or achievements.',
    variants: [
      {
        id: 'pure',
        modeId: 'overrun_pure',
        displayTitle: 'OVERRUN PURE',
        narrationKey: 'runModeNarration.overrunPure',
        event: 'boss_menu_bark_mode_overrun_pure',
        transcriptSource: 'Overrun Pure unlocked. Start at Sector Fifty-One with zero score and no Tactical augments or boss Drafts. Career XP is reduced to sixty-five percent; leaderboards and achievements stay off.',
        rankedStatus: 'unranked_career',
        mechanicSummary: 'Sector 51 start without Tactical augments or Drafts, with reduced Career XP and no leaderboard or achievements.'
      },
      {
        id: 'locked',
        modeId: 'overrun_locked',
        displayTitle: 'OVERRUN',
        narrationKey: 'runModeNarration.overrunLocked',
        event: 'boss_menu_bark_mode_overrun_locked',
        transcriptSource: 'Overrun locked. Reach Sector Thirty in Mayhem to unlock the Sector Fifty-One start. It begins at zero score and earns sixty-five percent Career XP; leaderboards and achievements stay off.',
        rankedStatus: 'locked',
        mechanicSummary: 'Reach Sector 30 in Mayhem to unlock the Sector 51 start.'
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
