# Nova Swarm post-Tyrian polish handoff — 2026-07-26

## Authority and repository state

- Repository: `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`
- Branch: `codex/tyrian-feedback-program-20260724`
- Original verified baseline: `41f9f0ed0bf2e57c3c55e762b9532f90d6511a0f`
- Earlier Tyrian/web checkpoint: `cf09133431ac272805f8f4f33f37303462b74b86`
- Authoritative product/evidence HEAD before this handoff commit: `6542128005dfd664622ee5c487c2f4c5bb5f6132`
- Baseline and checkpoint are both ancestors of `6542128`.
- Pre-handoff worktree: clean, with no tracked modifications or untracked files.
- Product state: all audited product changes are committed. This document is the only intended post-`6542128` change.
- Remote state: there is no `origin/codex/tyrian-feedback-program-20260724`. Neither `6542128` nor `cf09133` is contained by any fetched remote branch. The entire continuation therefore remains local-only until explicitly pushed.

The current HEAD was confirmed as authoritative, but not accepted as correct without review. This handoff was assembled from the commit history, current implementation, focused tests, package/deployment records, and repository evidence. Historical build state below is dated; it is not a live Steamworks or Cloudflare query.

## History overview

There are 47 commits after the original baseline: 13 through `cf09133`, then 34 continued-development commits through `6542128`. The history separates cleanly into product changes, tests/assets, deployment evidence, release-note drafts, and diagnostics.

### Baseline through the earlier Tyrian/web checkpoint

| Commit | Kind | Audited purpose and current conclusion |
| --- | --- | --- |
| `10ad9d2` | Product/test | Removed the obsolete Sector Run selector display cap and added mature-profile coverage. Current selector logic supports checkpoints beyond Sector 60. |
| `65cb106` | Product/test | Made Tactical Draft previews calculate authoritative resulting stats, including interactions and caps. |
| `ecd277a` | Product/assets | Corrected player-facing rank numbering and artwork for all 39 ranks. |
| `1e1cfd5` | Test | Extended controller selector coverage without changing selector ownership rules. |
| `7d1bc16` | Product/test | Cleared transient keyboard/controller/pointer state at scene transitions. |
| `6221644` | Product/test | Locked boss-warning lane, movement, and aim/telegraph geometry for spatial stability. |
| `a24cf74` | Product/performance | Removed dense kill-path allocations while preserving scoring/progression behavior. |
| `8fa2825` | Product/test | Preserved cumulative Pilot Orders progress across order transitions. |
| `520f03b` | Product/test | Added career-only Sector 51 Overrun Tactical with competitive isolation. |
| `23e37cc` | Product/test | Added late-Overrun deterministic boss shuffling and routine reinforcement escalation. |
| `b87a901` | Evidence | Recorded the reviewed manual-test package sourced from `23e37cc`. |
| `d2527f2` | Evidence | Recorded Steam test upload BuildID `24379809`. |
| `cf09133` | Evidence | Recorded the first Tyrian web deployment. No product code changed here. |

### The 34 commits after `cf09133`

| Commit | Kind | Audited purpose and current conclusion |
| --- | --- | --- |
| `c3eeb00` | Product/UI | Fixed the initial Overrun menu/Pilot Orders overlap. Superseded visually by later menu redesigns, but its layout intent remains. |
| `33c9680` | Product/UI/audio | Clarified Overrun lock, rules, loadout, XP, and hover narration. |
| `8d40a8a` | Product/web | Enabled deliberate web Overrun preview and retained Pilot Orders on that path. |
| `a96ae1c` | Web evidence | Recorded the follow-up production web deployment sourced from `8d40a8a`. |
| `0155d94` | Product/UI | Simplified the run-mode hierarchy and removed unnecessary selector affordances. |
| `369e0bd` | Steam evidence | Recorded private Steam BuildID `24383575`. |
| `94308b9` | Product/test | Added Overrun personal records backed by the save/Steam Cloud path and removed the unintended starting-life power-up. |
| `9a7f676` | Product/UI/test | Clarified Overrun unlock/menu copy and extended the Sector Run roadmap through Sector 90. |
| `14b4c94` | Steam evidence | Recorded private Steam BuildID `24386654`. |
| `4516277` | Product/UI | Rebuilt the mode briefing and Pilot Orders presentation into structured, scannable panels. |
| `76af35f` | Product/UI/test | Fixed responsive spacing, clipping, frame collisions, and smaller-viewport behavior. |
| `c93c28a` | Documentation | Added a Steam patch-note draft. It is a repository draft, not proof of live publication state. |
| `c829b2a` | Steam evidence | Recorded private Steam BuildID `24388501`. |
| `f36bec8` | Product/UI/test | Polished Tactical Draft transitions, boss identity handling in Overrun, and the Run Report. |
| `55ed4bd` | Documentation | Updated Tyrian-facing build notes; no product code. |
| `8a6e3f8` | Steam evidence | Recorded private Steam BuildID `24389020`. |
| `ffad9e6` | Product/UI/test | Increased Run Report combat readability and strengthened visual hierarchy. |
| `3b82aaa` | Product/generated assets/test | Expanded Cabinet Wonders from 10 to 60 and set discovery cadence to every third sector. |
| `b73f661` | Product/lore/UI/test | Added discovered Wonders to Threat Codex with individual archival lore. |
| `e4f3f3f` | Evidence | Recorded Wonder/Codex verification. |
| `b0080c2` | Test/runtime hook | Added a guarded runtime-verification route for Cabinet Wonders. It is not normal-player behavior. |
| `4487b6b` | Steam evidence | Recorded private Steam BuildID `24390949`. |
| `40b7c8a` | Documentation | Updated the patch-note draft for Cabinet Wonders. |
| `28f591f` | Product/input/test | Preserved held steering through boss-warning presentation while still clearing stale transient input. |
| `3237e00` | Steam evidence | Recorded private Steam BuildID `24393438`. |
| `454c253` | Product/UI/gameplay/test | Refined drone and warning feedback, added ship-route graze rules, and introduced the final-death battlefield hold. |
| `4ef297b` | Product/balance/UI/test | Made Sector Run launch directly from the remembered checkpoint and raised Overrun Career XP from 65% to 85%. |
| `80ae7bc` | Diagnostics/test | Added bounded opt-in input-continuity diagnostics; disabled during normal play. |
| `f86af2b` | Steam evidence | Recorded private Steam BuildID `24394148`. |
| `96bdbed` | Localization/test | Replaced the approved 93-string temporary fallback set across all seven non-English locale files. |
| `64e5b01` | Product/generated assets/UI/test | Made final death more legible, replaced only the small signal animation with 30 variants, and removed/labelled ineffective capped Draft choices. |
| `bc9b539` | Steam evidence | Recorded private Steam BuildID `24396942`. |
| `fe0c225` | Product/lore/localization/test | Renamed boss `nova_boss_03` to Tyrian the Great and added the tribute Codex story while preserving boss identity and balance contracts. |
| `6542128` | Steam evidence | Recorded private Steam BuildID `24397254`, sourced from `fe0c225`. |

No later commit reverts the earlier sector-selector, resulting-stat, rank-numbering, transient-input, boss-warning, performance, Pilot Orders, or competitive-eligibility changes. Later commits extend or refine those systems. The only meaningful supersession is presentational: multiple incremental menu-layout fixes culminate in the structured responsive briefing and Pilot Orders panels.

## Sector-selector failure: causes and resolutions

The failure was not one single issue.

1. **Genuine product bug:** `MenuScene.getSectorStartSelectorModel()` imposed an obsolete display-only cap equivalent to `Math.min(65, ...)`. The underlying checkpoint progression already unlocked a checkpoint every five sectors, but a mature profile could not see later choices. The cap was removed. Current coverage verifies a profile at best Sector 88 exposes checkpoints 65, 70, and 85 while Sector 90 remains locked. Later work added paged roadmap support through Sector 90.
2. **Outdated navigation assertion:** the browser check assumed Right Arrow on Scout Run should move selection. Scout Run intentionally owns Left/Right to cycle its anomaly. Navigation coverage was corrected to use Down Arrow to reach Sector Run; the gameplay behavior was not weakened.
3. **Input-state contamination:** transient held/pressed state could survive scene transitions and make browser/controller checks appear frozen or misdirected. Scene-transition reset logic now distinguishes transient state from intentionally held movement/fire and suppresses stale edges until release.
4. **Timing-sensitive test setup:** a fixed 1.8-second font/intro delay was unreliable. The check now waits for the Exit control to be visible and effectively opaque.
5. **Test seam disabled the UI under test:** replacing `MenuScene.exitGame()` prevented the confirmation modal from opening. The check now intercepts the desktop bridge and verifies that no exit request occurs before confirmation.

The failing assertion was not deleted or weakened. Current `check:sector-start-checkpoint-unlocks` and the real-Chrome `check:sector-challenge-selector` pass.

## Completed Tyrian-feedback product work

### Progression, modes, records, and competitive boundaries

- Sector Run mature-profile selection and controller navigation extend through Sector 90. New start points still unlock every five sectors and the chosen checkpoint is remembered.
- Sector Run launches directly from the selected checkpoint; changing it is a labelled secondary action.
- Overrun unlocks at Career Level 30 and starts at Sector 51 with no skipped-sector rewards.
- Overrun Tactical begins with Damage Up, Rapid Fire, Blink Drive, Focus Lens, and Double Shot; its later Tactical Draft remains active. Overrun Pure omits Tactical Draft.
- Overrun Career XP now pays 85% of normal Career XP. The earlier 65% value was deliberately superseded.
- Sector 51+ Overrun uses deterministic shuffled boss cycles, avoids an immediate cycle-boundary repeat, and introduces bounded routine reinforcement routes.
- Overrun personal-best records are saved through the normal save/Steam Cloud path and shown as a local personal chase.
- Overrun intentionally does **not** submit a Steam/global leaderboard score, unlock achievements, unlock checkpoints, update ranked/competitive bests, or inherit skipped-sector rewards. Mayhem Tactical and Pure retain their separate competitive contracts.
- Daily, Scout, and Sector modes retain their own non-ranked eligibility boundaries.
- The unintended extra-life power-up at Overrun launch was removed.

### Tactical Draft

- Cards show resulting before/after values calculated through the same authoritative player-stat path used by the selected upgrade, then restore the preview snapshot.
- Interactions, secondary effects, caps, and genuine reductions remain visible.
- A stat-only offer that cannot change gameplay at the current cap is filtered and backfilled with a useful offer.
- A mixed offer with useful secondary effects remains selectable and labels unchanged direct damage as `DIRECT DAMAGE CAP REACHED`.
- After selection, the chosen upgrade is placed in the Active Build bar and held visibly for the transition before combat resumes.

### Input continuity and boss presentation

- Scene transitions clear stale press/release state without incorrectly dropping intentional held movement/fire.
- Boss-warning entry and exit preserve active steering, addressing the reported brief keyboard freeze during boss fights.
- Boss warning lanes, movement state, locked angle, arc, and release direction stay spatially consistent.
- Reinforcement warnings use routine, major, and headline intensity levels to reduce warning and voice fatigue.
- Optional diagnostics record input edges, focus resets, scene context, and long-frame context only when `inputDiagnostics=1` (query or local storage). Records are bounded and diagnostics are off by default.

### Combat readability and performance

- The guided bomb baseline implementation was reverified for behavior, charge indication, and readability; no unsupported redesign was claimed.
- Dense enemy-kill processing avoids repeated hot-path allocations while preserving score, bonus, and progression effects.
- Routine reinforcement ships use bounded counts/routes and safety caps.
- Diving, returning, and reinforcement-route ships can award one guarded ship-graze near miss per ship; ordinary formation movement cannot be farmed.
- Drone Constellation produces converging fire even with one drone, and permanent drones render beneath the player hull.

### Menu, Pilot Orders, Run Report, and final death

- Run-mode selection now uses a clearer parent-mode/variant hierarchy; Scout Run does not show a meaningless variant arrow.
- The briefing exposes rank state, variant choice, start sector, score basis, Career XP, checkpoints, and competitive restrictions without the former text blob.
- Overrun lock state, unlock requirement, loadout, rules, XP, records, and ranked exclusions are available in copy and hover narration.
- Responsive fixes address clipped `MAYHEM`, `TACTICAL`, bottom navigation labels, ranked-badge collisions, and mode-details overlap at tested desktop sizes.
- Pilot Orders remain visible on the menu/web preview and accumulate progress across order transitions.
- The Run Report has a stronger four-part hierarchy, larger combat values, Tactical build summary, and contextual counter-advice.
- Final death holds the visible battlefield for 1.1 seconds with a clearer impact cue. Fresh keyboard, pointer, or controller input may skip; held input cannot.
- The existing full Game Over transmission art was preserved. Only the small geometric signal animation was replaced with 30 luminous signal-core variants and distinct motion treatments.

### Cabinet Wonders and Threat Codex

- Cabinet Wonders expanded from 10 to 60 unique generated variants.
- Wonder cadence is every third sector.
- Discovered Wonders are archived in a dedicated Threat Codex category with individual mysterious history/lore.
- Runtime and layout checks cover discovery, archive persistence, tab counts, and tested viewport layouts.

### Ranks and Tyrian tribute

- All 39 player-facing rank icons use corrected one-based numbering. Steam achievement icons `ACH_RANK_01` through `ACH_RANK_39` were published and verified with pre/post hashes; achievement definitions, names, descriptions, builds, depots, store data, and branches were not changed by that icon operation.
- Boss ID `nova_boss_03` is now displayed as **Tyrian the Great**, with a tribute story and combat tip in the Codex. Boss ID, roster order, art, archetype, movement, attacks, balance, unlocks, save identity, and audio asset remain unchanged.

## Intentionally excluded or limited work

- Overrun has a local/Steam Cloud personal-best chase, not a Steam leaderboard. A dedicated Steam leaderboard was intentionally deferred unless player demand justifies it.
- No full rewind/replay of the final seconds before death was implemented. Capturing deterministic combat state would add material memory, performance, and correctness risk; the short frozen-battle hold was chosen instead.
- The Game Over screen and its existing full-screen art were not replaced. Only the small embedded signal animation changed.
- The Overrun unlock celebration uses the existing game visual/audio language; a separate large generated-art celebration set was not added.
- Input diagnostics are an opt-in investigation tool, not always-on telemetry.
- Generated Wonder art and long-form lore have automated asset/layout coverage, but artistic and prose quality still require human review.
- A Steam patch-note draft exists at `release/steamworks/patch-notes-overrun-command-deck-20260725.md`. Repository state does not prove its current external Steam event status, publication state, or final image attachment.

## Important current systems and files

- Run contracts and Overrun eligibility: `src/game/RunMode.js`
- Menu selector, briefing, Pilot Orders, responsive layout: `src/scenes/MenuScene.js`
- Sector selector checks: `scripts/check-sector-start-checkpoint-unlocks.mjs`, `scripts/check-sector-challenge-selector.mjs`
- Tactical preview/application: `src/entities/Player.js`, `src/scenes/PlayScene.js`
- Boss roster and late-game shuffle: `src/config/BossRoster.js`
- Boss warning/telegraph behavior: `src/entities/Boss.js`, `src/scenes/PlayScene.js`
- Transient input and diagnostics: `src/input/InputManager.js`
- Reinforcements/dense combat: `src/managers/EnemyManager.js`
- Pilot Orders: `src/progression/RunContracts.js` and related save/UI integration
- Overrun personal records: `src/progression/OverrunRunRecords.js`
- Run Report and final presentation: `src/scenes/GameOverScene.js`
- Wonders/Codex: Wonder configuration/assets, `src/scenes/CodexScene.js`, and corresponding checks under `scripts/`
- Localization: `src/i18n/`
- Tyrian boss tribute: current boss/Codex localization data for `nova_boss_03`
- Audit journal: `progress.md`

## Current validation

The following checks passed against the current post-feature tree:

- `npm run check:release-line`
- `npm run check:sector-start-checkpoint-unlocks`
- `npm run check:sector-challenge-selector` using the repository's installed real Chrome
- `npm run check:achievements` — 81 definitions: 39 rank, 40 milestone, 2 leaderboard
- `npm run check:rank-progression`
- `npm run check:input-state-transitions`
- `npm run check:run-contracts`
- `npm run check:run-contract-mode-eligibility`
- `npm run check:run-modes`
- `npm run check:overrun-mode`
- `npm run check:overrun-reinforcements`
- `npm run check:mayhem-reinforcement-waves`
- `npm run check:steam-cloud-save`
- `npm run check:tactical-draft` on an unchanged rerun
- `npm run check:boss-warning-popup`
- `npm run check:bomb-usability`
- `npm run check:bomb-charge-indicator-readability`
- `npm run check:mayhem-collision-hotpath-stress`
- `npm run check:run-report`
- `npm run check:cabinet-wonders` — 60 variants, cadence 3
- `npm run check:cabinet-wonders-runtime`
- `npm run check:threat-codex` — 12 categories
- `npm run check:codex-lore-layout` — 9 scenarios
- `npm run check:codex-layout`
- `npm run check:codex-tab-count-layout`
- `npm run check:gameover-final-transmissions` — 30 signal variants
- `npm run check:gameover-ceremony`
- `npm run check:controller-flow`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:steam-electron-bridge`
- `npm run smoke`
- `npm run desktop:smoke:current` on an unchanged isolated rerun with the live Steam bridge ready

`build:current` emitted only the known five Ascendant fallback-art notices and the large-chunk advisory.

### Flakes, timeouts, and insufficient current validation

- `check:tactical-draft` failed one sample because the lock-in celebration measured `1` (no observed animation). The assertion was not changed; the immediate unchanged rerun passed.
- A combined Codex-check batch exceeded its shell time window without an attributable assertion. Each constituent check listed above passed separately.
- A combined Steam-bridge/smoke/desktop batch exited after reporting a healthy desktop state but without its final marker. `desktop:smoke:current` passed when rerun unchanged in isolation.
- `check:boss-telegraph` timed out twice while waiting 30 seconds for the Play scene and `BOSS_ACTIVE`, before any telegraph assertion ran. Current code contains the locked-angle/movement implementation, `check:boss-warning-popup` passes, and earlier committed package evidence records the focused boss checks as passing. Nevertheless, the exact current `check:boss-telegraph` harness is **not green** and should be treated as insufficiently revalidated. Its current 30-second boot window also contradicts an older progress note that refers to a 90-second allowance.
- The generic `develop-web-game` browser client was unavailable because its expected `chromium_headless_shell-1208` was missing. Repository-native browser checks used the installed real Chrome instead.

## Localization

- Supported interface languages: 8 — English (`en`), German (`de`), Simplified Chinese (`zh-CN`), Russian (`ru`), Spanish (`es`), Brazilian Portuguese (`pt-BR`), Korean (`ko`), and Japanese (`ja`).
- The approved 93-string mode-briefing set is present in all seven non-English locales.
- `check:i18n` passes.
- `check:i18n-ui` passes all eight languages without detected console/page errors, placeholder leakage, missing glyph markers, or unapproved English fallback in the tested screens.
- Audio remains English. No claim is made for full localized audio or complete subtitles.

## Steam build chronology and source provenance

AppID is `4765070`; the intended test branch is `sector-continue-test`. Each upload record identifies its tested source separately from the later evidence commit.

| BuildID | Tested source | Package | Depot manifest | Recorded scope |
| --- | --- | --- | --- | --- |
| `24379809` | `23e37ccfffe45eb22d622ce91301a73e95688458` | `v2026-07-24_20-22-36` | `7393812582283906988` | Initial reviewed Tyrian package. At that dated snapshot public was `24339078`. |
| `24383575` | `0155d94` | `v2026-07-25_01-36-49` | `1564126434267822790` | Menu hierarchy/clarity. |
| `24386654` | `9a7f676534b92eaea13f357bd88c195faa3edd67` | `v2026-07-25_08-16-40` | Not recorded in its evidence document | Overrun records, launch-life fix, unlock copy, Sector 90 roadmap. |
| `24388501` | `76af35f4778e4c334b0be3b9d02231d71b400437` | `v2026-07-25_12-56-05` | `1473892967432618774` | Responsive briefing and Pilot Orders UX. |
| `24389020` | `55ed4bd` (product through `f36bec8`) | `v2026-07-25_14-21-20` | `7627440623903404544` | Tactical transitions and Run Report. |
| `24390949` | `b0080c2` | `v2026-07-25_18-30-20` | `2951353221249853480` | Sixty Wonders, Codex archive, guarded runtime check. |
| `24393438` | `28f591f` | `v2026-07-26_00-03-46` | `5209036808547903819` | Boss-warning steering continuity. |
| `24394148` | `80ae7bc` | `v2026-07-26_01-54-55` | `802192151679690464` | Feedback refinements, Sector Run/Overrun balance, opt-in diagnostics. |
| `24396942` | `64e5b01a0be448903adf0de404e11b13b0f49732` | `v2026-07-26_10-33-58` | `3257325674348362189` | Final-death signals and capped Tactical choices. |
| `24397254` | `fe0c225` | `v2026-07-26_11-33-38` | `3672975861801350471` | Surgical Tyrian the Great boss name/lore update. |

The latest committed Steam evidence is:

- Private test branch `sector-continue-test`: BuildID `24397254`
- Latest package source: `fe0c225`
- Previous rollback BuildID: `24396942`
- Public/default at that recorded time: BuildID `24393438`
- `test-build` at that recorded time: BuildID `23782673`

This supersedes the earlier dated public value `24339078`; no evidence claims that a private upload moved public/default. The evidence shows that public changed independently between snapshots. Store data, public release visibility, and branches other than the intended private assignment were not changed by the recorded uploads.

Exact evidence:

- Initial upload: `release/steamworks/steam-upload-evidence-20260724-build24379809.md`
- Latest upload: `release/steamworks/steam-upload-evidence-20260726-build24397254.md`
- Full intermediate evidence: `release/steamworks/`

Package-specific caveats:

- BuildIDs `24388501` and `24389020` loaded the staged native module but returned `steam_init_returned_false` on direct local launch. Renderer, controls, performance, and static runtime gates passed; exact Steam Cloud/achievement/leaderboard behavior required launching those packages through Steam.
- BuildID `24396942` has the strongest recorded package suite, including packaged controls and 60 FPS performance.
- BuildID `24397254` is a surgical boss name/lore delta. Its evidence records package runtime and packaged smoke, but not a fresh full packaged controls/performance suite; it relies on the unchanged gameplay of the immediately preceding package.

## Web deployment chronology

Evidence document: `docs/release/nova-swarm-tyrian-feedback-web-deployment-20260724.md`

| Deployment | Source | Build | Immutable URL | Live project URL |
| --- | --- | --- | --- | --- |
| Initial Tyrian deployment | `d2527f25e458219f87a19ee803f2ef42eeb1d100` | `v2026-07-24_20-48-04` | `https://9480706d.burt-game.pages.dev` | `https://novaswarm.tinyfoundry.app` |
| Overrun preview/Pilot Orders follow-up | `8d40a8a15fe2eabcd4e0a6bb1d34f8bef014c02a` | `v2026-07-25_00-56-03` | `https://e63bb3b4.burt-game.pages.dev` | `https://novaswarm.tinyfoundry.app` |

The second deployment is the later recorded web state. Its focused production-safe check showed six run cards, three Pilot Orders, and successful Overrun Tactical entry at Sector 51. The generic live-deployment aggregator could not certify the deployment because it requires localhost-only debug stages that production correctly blocks. No live Cloudflare query or deployment occurred during this handoff audit.

## Known risks and recommended manual tests

1. Back up this local-only branch before any new work.
2. Repair or lengthen the `check:boss-telegraph` boot wait without weakening its spatial assertions, then rerun it from a cold start.
3. Manually hold steering and fire across several boss-warning intros in a Steam-launched BuildID `24397254`.
4. Manually verify Tyrian the Great roster entry, portrait, lore scrolling, and combat identity at 1920×1080, 1600×900, 1366×768, and 1280×720.
5. Exercise mature Sector Run profiles at 60, 65, 85, and locked 90; verify mouse, keyboard, and controller navigation.
6. Confirm Overrun Tactical and Pure each start without an extra life, save independent personal records through Steam Cloud, award 85% Career XP, and do not affect ranked/global records, achievements, or checkpoints.
7. Reach direct-damage cap in Tactical Draft and confirm useless stat-only offers disappear while mixed offers retain useful secondary effects and display the cap label.
8. Review the 60 Wonders and long-form Codex stories for visual repetition, prose quality, clipping, and accessibility; automation cannot establish artistic quality.
9. Verify the 1.1-second final-death hold with no input, fresh skip input, and held-fire input.
10. Treat the repository patch-note draft and any Steam event image as unverified external publishing state until Steamworks is inspected explicitly.

## Guardrails for the next agent

- Preserve all existing work. Do not reset, clean, stash, discard, overwrite, revert, or rebase unexplained state.
- Inspect folder, branch, exact HEAD, full status including untracked files, ancestry, remote containment, and recent history before editing.
- Do not work on a dirty, stale, behind, or unexplained branch.
- Avoid broad rewrites. Use small logical commits and keep source provenance distinct from later documentation/evidence commits.
- Run localization checks whenever player-facing text changes.
- Do not deploy, publish, upload to Steam, change Steamworks, or change web state without an explicit instruction.
- Do not assume a clean automated test replaces visual/manual review.
- Keep Overrun's competitive isolation and boss/save identity contracts explicit when touching adjacent systems.

## Recommended next-task starting procedure

Do not choose a new polish item during takeover. First run:

```powershell
Set-Location 'D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720'
git fetch --all --prune
git status --short --branch --untracked-files=all
git branch --show-current
git rev-parse HEAD
git log --oneline --decorate -12
git worktree list --porcelain
git merge-base --is-ancestor 41f9f0ed0bf2e57c3c55e762b9532f90d6511a0f HEAD
git diff --check
git branch -r --contains HEAD
```

Then read this handoff, `AGENTS.md`, `progress.md`, the latest relevant Steam evidence, and the web deployment record. If the state differs, stop and explain it. If it matches and a new task is explicitly selected, begin with the narrowest relevant focused check and preserve a manual-review step.

## Handoff-only rollback

After this document is committed, revert only its documentation commit if the handoff itself must be removed:

```powershell
git revert <handoff-commit>
```

Do not use that command to roll back product work, packages, or external deployments.
