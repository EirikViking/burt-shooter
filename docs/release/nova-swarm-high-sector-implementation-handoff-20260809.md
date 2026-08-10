# Nova Swarm high-sector implementation handoff

> Historical implementation handoff only. It is superseded for active prototype behavior by `docs/release/nova-swarm-late-game-pressure-experiment-20260810.md`. In particular, the four-protocol/Ascendant slice and modeled run-length projections below must not be treated as the current experiment, validated human-play evidence, or authorization to release anything.

Date: 2026-08-09

Use this handoff for the next Codex task. It closes the Tyrian boss-combo and Steam deployment pass and defines the safe starting point for late-game implementation. Unity V2 is out of scope.

## Locked continuation point

- Source worktree: `D:\vibe-coding-e\codex\nova-swarm-tyrian-boss-combo-20260809-3f8a`
- Source branch: `codex/tyrian-boss-combo-boundary-20260809-3f8a`
- Local lock tag to use: `nova-swarm-high-sector-handoff-20260809-build24637691`
- Gameplay payload commit: `66b7e17be48a599749a132896442521dbef80a73`
- Implementation baseline: `f844715bba32437bf27c2bf43012b7932b487400`
- Steam AppID `4765070`, depot `4765071`, BuildID `24637691`, manifest `9195203850884130318`
- `sector-continue-test` is on `24637691`; public `default` remains on `24632116`; `test-build` remains on `23782673`.
- Detailed upload evidence: `release/steamworks/steam-upload-evidence-20260809-build24637691.md`

Resolve the tag to prove the exact handoff commit. Create a new isolated Codex worktree and branch from that tag. Do not edit this source worktree, reset, clean, stash, rebase, discard, overwrite, or rewrite existing branches or tags.

## Completed work that must remain intact

- Violet Chimaera powerup pass from `f844715`: one timed offense lane plus one timed support lane, duplicate duration or charge stacking, safe Magnet behavior, eight-locale How To Play copy, and the compact Nova Bloom HUD overlap fix.
- Tyrian boss-combo correction from `66b7e17`: boss entry clears the incoming combo, boss damage does not refresh it, and boss exit clears any boss-local support-ship combo. Normal wave transitions still preserve combos.
- Release-contract alignment from `a54afbd`, including the inherited Game Over duration and compact ship-usage badge expectations.
- The packaged build passed release-line, current and production builds, release QA, packaged smoke, controls, runtime, performance, localization, controller, browser, desktop, boss/combo, progression, Overrun, and Sector 130 stress coverage. Packaged performance measured 60.02 average FPS and 58.82 minimum FPS without warnings or errors.

## Tyrian forum state

- Tyrian's source post is comment `#115`, ID `583930834798629669`.
- Developer reply `#118`, ID `583930834798645077`, is already public at `https://steamcommunity.com/app/4765070/discussions/0/569288155749142195/?ctp=3#c583930834798645077`.
- Reply `#118` currently contains the boss-combo result, the 3,873,303 acknowledgement, and a short high-sector direction. It contains the typo `nowbeing` and says the fix is in an internal build.
- An expanded replacement is staged in the signed-in Steam Edit form, but **Save Changes has not been clicked**. Therefore the expanded consultation is not public and Tyrian has not yet been asked the detailed questions.
- Do not claim the edit was published. Do not click Save Changes or create another forum post unless the user explicitly asks in that task.

Exact staged replacement, 2316 characters and intentionally containing no hyphen, en dash, or em dash:

```text
[quote=Tyrian Mollusk;583930834798629669]I just don't think it can be a reasonable thing in this game specifically[/quote]

You were right about the boss combo problem. Boss entry now ends the current combo, hitting the boss no longer refreshes it, and any combo earned from support ships during the fight ends before the next sector. Normal wave transitions still preserve combos.

This change is in Steam Build 24637691 on the test branch.

Also, 3,873,303 is honestly unbelievable. Reaching Sector 130 and feeling that you could have continued makes it clear that the far end of the game needs a better answer than simply asking a very good player for several more hours.

Before I change the late game, I would really like your opinion on the direction.

I want to leave Sectors 1 through 50 alone. From Sector 60, I am considering less downtime and more pressure from coordinated enemy roles rather than larger health bars or unreadable bullet speed.

From Sector 75, a clearly announced Deep Space Protocol could appear every five sectors. These could include linked crossfire formations, paired hunters, an escort protecting a priority threat, a safe side that shifts after a warning, a returning ace, or an optional salvage objective that increases pressure.

Bosses could gain one new telegraphed modifier at Sector 80. At Sector 100, that could combine with a support formation. At Sector 120 and beyond, two compatible modifiers could combine, while still leaving a fair escape route for slower ships.

After Sector 100, pressure could rise in visible steps and recovery windows could become rarer. My rough target would be for exceptional ranked runs to resolve in about 60 to 90 minutes instead of continuing for several hours.

Where did your run stop feeling genuinely dangerous?

Would a 60 to 90 minute upper target feel fair, or would that make the late game end too quickly?

Which encounter ideas sound interesting, and which sound like they would become irritating?

Would you prefer more demanding enemy combinations, stronger boss rules, or both?

Do you think a change this large should begin a fresh leaderboard season while preserving the current scores as a completed historical season?

Nothing here is decided yet. I would rather hear where this plan is wrong before I start building it.
```

## Late-game implementation source of truth

Read `docs/nova-swarm-high-sector-escalation-plan-2026-08-09.md` completely before editing. Its non-negotiable boundaries are:

- Preserve Sectors 1 through 50.
- Raise pressure through coordinated threats and authored encounter density, not health sponges, unreadable projectile speed, forced Phase checks, or entity floods.
- Introduce a deterministic, clearly announced protocol every five sectors from Sector 75 onward, with no repeat inside twenty sectors.
- Preserve a non-Phase escape route for slow ships.
- Keep boss entry and exit as combo boundaries.
- Keep Sector 100 and later free of extra-life drops and rewards.
- Preserve 60 FPS and avoid entity-count leaks.
- Do not alter leaderboard identity, score submission, historical scores, achievements, saves, or Steamworks while the leaderboard-season decision is unresolved.

## First implementation slice

Start with one evidence-led, development-flagged slice. Complete it before expanding scope:

1. Extend the existing deterministic gameplay-performance and difficulty-analysis tooling to benchmark Sectors 60, 80, 100, 120, and 130 with one slow, one standard, and one fast hull. Record elapsed time, sector duration, lives, damage sources, enemy/projectile/hazard/effect peaks, frame-time average/p95/p99, frames above 33 ms, combo uptime, Draft exhaustion, and boss duration.
2. Add a disabled-by-default high-sector escalation profile under the existing difficulty configuration. It must be inert through Sector 50 and switch on only in explicit diagnostic/prototype runs until acceptance gates pass.
3. Implement the pressure-budget and downtime-compression foundation from Sector 60. Keep briefing and cleanup readability minimums, cap hostile projectiles/hazard area/entry speed, bound boss health, and replace repeated low-threat waves after Sector 80 with fewer authored encounters.
4. Implement the first four deterministic protocols behind the same profile: Crossfire Doctrine, Hunter Pair, Escort Debt, and Shifting Front. Schedule at Sectors 75, 80, 85, and every five sectors afterward; prevent repetition within twenty sectors; expose the active protocol in debug state and `render_game_to_text`.
5. Prototype one Sector 80 Ascendant boss modifier using a telegraphed support formation rather than additional boss health. Do not add Sector 100/120 modifier combinations in this first slice.
6. Add localized protocol names/cues for all eight locales and Reduced Motion behavior in the same change. No English-only fallback is allowed.

Tyrian's detailed input can change the protocol deck, target run length, or leaderboard strategy later. The first slice deliberately establishes measurable scaffolding and a reversible prototype without committing public balance or leaderboard rules.

## Required validation

- Run the repository preflight from `AGENTS.md` and stop on any unexplained dirty, stale, or mismatched state.
- Prove deterministic Sectors 1 through 50 are unchanged with the profile off and with it armed but not yet active.
- Add focused schedule tests for sectors 75/80/85/90/95/100, no repeat inside twenty sectors, seeded reproducibility, and clean reset between runs.
- Exercise all four protocols with slow/standard/fast hulls, Phase unavailable, Reduced Motion on/off, Tactical and Pure/Overrun paths, pause/resume, and boss boundaries.
- Inspect screenshots and `render_game_to_text`; review console/page/response errors.
- Run `npm run check:i18n`, `npm run build:current`, `npm run check:i18n-ui`, focused progression/boss/combo/controller checks, browser smoke, desktop smoke, Sector 130 performance, `npm run check:release-line`, and the relevant release/package gates before any upload is even considered.
- The generic develop-web-game client may still lack its separate `chromium_headless_shell-1208`; attempt it once, record the exact blocker, and use the repository-native installed-Chrome Playwright lane for authoritative runtime validation.

## Publication and rollback guardrails

- No Steam upload, branch movement, public/default deployment, Steamworks change, leaderboard migration, patch note, forum post/edit, Git push, or release publication is part of the first implementation slice unless the user explicitly adds it.
- Keep the profile disabled by default so rollback is immediate while prototyping.
- Preserve `sector-continue-test` rollback BuildID `24635286` and source rollback `git revert 66b7e17` for the already deployed boss-combo build.
