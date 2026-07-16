# Nova Swarm Takeover Completion Report - 2026-07-16

Status: local implementation and verification complete. Nothing was uploaded, deployed, posted, or changed in Steamworks.

## 1. Baseline

The latest actually published player-facing patch note found was:

- Title: `Nova Swarm Patch Notes: Aces, Nemesis Protocols & Rival Wings`
- Published: 2026-07-13
- Steam News GID: `1837955055362679`
- SteamDB update mapping: BuildID `24178758`
- Repository patch-note source named by the draft: `b4ee0e38e6d6a592508e25af246dc98ddf551de3`
- Named build stamp: `v2026-07-13_08-29-30`
- Named branch: `sector-continue-test`

That is the content boundary for "new since the last published patch notes." It is not proof that `b4ee0e3` was promoted to public/default. The note itself describes a test-branch build, while later independent evidence says public/default was BuildID `24218172`.

The safe inherited implementation baseline was:

- Commit: `724e3b7b72b984cc2185552360c3226c8409fadd`
- Tag: `nova-swarm-lock-20260716-all-changes-checkpoint-24235175`
- Test BuildID represented by its evidence: `24235175`
- Public/default represented by that evidence: unchanged at `24218172`

## 2. Evidence

Repository and preservation evidence:

- Original requested worktree: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
- Original branch: `codex/preserve-all-improvements-20260714`
- Original HEAD: `a7e6c95d11050b495f2cf04b1f621e828ff32138`
- Original tracked state: clean
- Original untracked state: 480 files, 5,450,658,145 bytes
- Backup: `E:\Codex\nova-swarm-takeover-backups\2026-07-16-a7e6c95\untracked-files.tar`
- Backup SHA-256: `9DC6756973160964760338356B211C1C9547E8BB4EDF90B08B62FD9BCFBCC8FF`
- Exact untracked-to-checkpoint path collisions: zero
- Existing stashes preserved: 24

Published/build evidence:

- Steam News: `https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1837955055362679`
- SteamDB: `https://steamdb.info/patchnotes/24178758/`
- Inherited all-changes build record: `release/steamworks/steam_upload_evidence_all_changes_checkpoint_20260716_24235175.json`
- Final local package review: `release/steamworks/desktop_package_review_report.json`
- Full takeover audit: `docs/NOVA_SWARM_TAKEOVER_HANDOFF_20260716.md`

Final local package evidence:

- Build: `v2026-07-16_17-02-20`
- Source: `c557370`
- Executable: `release/desktop/win-unpacked/Nova Swarm.exe`
- Size: 226,698,752 bytes
- SHA-256: `4BD753111ED7F7AF6EB4EE9592B02A4A6F42B17AF56037DDFE2368B95CCD15E5`
- Packaged Steam runtime: passed
- Packaged controls: passed
- Packaged performance: 59.52 minimum / 59.98 average FPS

## 3. Inherited work

The inherited post-July-13 stack was preserved rather than reimplemented or discarded. It includes:

- faster first-session combat momentum and earlier first payoff;
- 297 Tactical boss inspection barks;
- Nova Miracle;
- Rare Chaos Visitors with adaptive authored encounters;
- wider powerup variety, effects, art, and audio;
- 50 elite middle threats;
- stronger Rare Contact staging;
- larger reinforcement swarms and corrected Super Storm voice use;
- four Tactical Fusion Protocols;
- persistent charge weapons;
- 12 distinct spectacular hostile-projectile families;
- clearer Tactical Draft forecasts, doctrines, evolutions, and loadout reporting;
- separate Mayhem Pure and Mayhem Tactical leaderboards;
- fixed Sector 5 score routing, two bans, Hold, Rescan, and a 30%-strength third stack;
- Pilot Orders in Tactical;
- Named Rival Ladder;
- deterministic local Daily Challenge, records, history, report card, and share card;
- the initial personal-best celebration;
- Tactical Directives through Sector 50;
- wider Nova humor and rewritten Codex lore;
- hidden Pilot Orders endpoint;
- Ace dossiers and Cabinet Skill Flights;
- refreshed combat UI and powerup art;
- complete six-page How to Play;
- compact sector signal and transition-hitch reductions;
- pickup-ring cleanup;
- Run Report versions 8-12;
- richer rare-visitor, reinforcement, Fusion, powerup, menu, and boss audio;
- hardened Steam-native packaging and package verification;
- trailer cuts, screenshots, and release evidence.

The exhaustive inherited matrix, including commit and file attribution, is in `docs/NOVA_SWARM_TAKEOVER_HANDOFF_20260716.md`.

## 4. Takeover changes

The takeover implementation added or completed:

- strict canonical run-mode parsing and honest legacy/unknown identity;
- Run Report v13;
- fail-closed ranked eligibility and pending-submission identity;
- `Swarm Elite` at an accepted ranked score of at least 750,000;
- reliable accepted-Steam-best achievement backfill;
- Mayhem Tactical as the primary/default mode;
- a new menu hierarchy and responsive detail layout;
- concise Daily Challenge explanation in all eight locales;
- staged, pause-safe, transition-safe personal-best celebration;
- centralized hostile and player projectile disposal, cap handling, cleanup, and orphan diagnostics;
- centralized pickup ownership and duplicate-event guards;
- gameplay-clock temporary-effect expiry;
- useful-target Bomb arming and direct-impact behavior;
- autonomous Point Defense interception and cleanup;
- Panic Engine visual/damage lifecycle cleanup;
- persistent Hangar `FIRST FLIGHT` state and launch counts;
- Graze Break's larger sparkly counterstrike;
- Railbreaker fatigue reduction;
- shorter edge-aligned special-enemy warnings;
- visible elite entry protection and post-entry firing delay;
- dedicated Sector 5 `NOW OR NEVER` score-route presentation;
- achievement-screen row cleanup and stable-ID deduplication;
- complete forum A-P audit, saved response, patch notes, and leaderboard-correction procedure.

Implementation commit:

`c557370a24f6e59d4fb4b211264d342178617c19 complete Nova Swarm takeover implementation`

## 5. Files

The implementation commit changed 71 tracked files:

```text
package.json
release/steamworks/achievement-icons/manifest.json
scripts/audit-audio-mix.mjs
scripts/capture-steam-trailer.mjs
scripts/check-ace-bounty-runtime.mjs
scripts/check-achievements-catalog.mjs
scripts/check-bomb-charge-indicator-readability.mjs
scripts/check-cinematic-hangar-menu.mjs
scripts/check-controller-only-flow.mjs
scripts/check-daily-signal-share-card.mjs
scripts/check-graze-break.mjs
scripts/check-hangar-controller-details.mjs
scripts/check-menu-scrollbars.mjs
scripts/check-nova-miracle-powerup.mjs
scripts/check-panic-engine-hazard-cleanup.mjs
scripts/check-personal-best-celebration.mjs
scripts/check-player-projectile-readability.mjs
scripts/check-powerup-effects.mjs
scripts/check-projectile-defense-rules.mjs
scripts/check-projectile-lifecycle.mjs
scripts/check-railbreaker-audio.mjs
scripts/check-rare-chaos-runtime.mjs
scripts/check-row-core-runtime.mjs
scripts/check-row-core.mjs
scripts/check-run-contracts.mjs
scripts/check-run-mode-identity.mjs
scripts/check-run-modes-mayhem-scout-sector.mjs
scripts/check-sector-arrival-stinger.mjs
scripts/check-sector-continue-controller-flow.mjs
scripts/check-sector-continue-mode.mjs
scripts/check-sector10-clear-time-pacing.mjs
scripts/check-ship-usage-counter.mjs
scripts/check-special-enemy-presence.mjs
scripts/check-swarm-elite-achievement.mjs
scripts/check-tactical-draft.mjs
scripts/check-tactical-score-route.mjs
scripts/check-weapon-powerup-firing-duration.mjs
src/achievements/AchievementCatalog.js
src/achievements/AchievementManager.js
src/achievements/SwarmEliteAchievement.js
src/audio/AudioManager.js
src/audio/SoundCatalog.js
src/config/ShipData.js
src/config/TacticalDraft.js
src/entities/Bullet.js
src/entities/Enemy.js
src/entities/Player.js
src/game/BombTargetingRules.js
src/game/Game.js
src/game/RunMode.js
src/game/RunReport.js
src/i18n/forumFollowupSourceText.js
src/i18n/locales/de.js
src/i18n/locales/es.js
src/i18n/locales/ja.js
src/i18n/locales/ko.js
src/i18n/locales/pt-BR.js
src/i18n/locales/ru.js
src/i18n/locales/zh-CN.js
src/i18n/menuHierarchySourceText.js
src/leaderboard/LeaderboardAdapter.js
src/leaderboard/LeaderboardTypes.js
src/main.js
src/managers/BulletManager.js
src/managers/EnemyManager.js
src/managers/PowerupManager.js
src/scenes/AchievementsScene.js
src/scenes/GameOverScene.js
src/scenes/MenuScene.js
src/scenes/PlayScene.js
src/scenes/ShipSelectScene.js
```

Documentation/evidence files:

```text
docs/NOVA_SWARM_LEADERBOARD_CORRECTION_PROCEDURE_20260716.md
docs/NOVA_SWARM_TAKEOVER_COMPLETION_REPORT_20260716.md
docs/NOVA_SWARM_TAKEOVER_HANDOFF_20260716.md
docs/NOVA_SWARM_TINY_FOUNDRY_FORUM_REPLY_20260716.md
docs/steam/patch-notes-next-tactical-command-spectacle-feedback-2026-07-16.md
progress.md
release/steamworks/desktop_package_review_report.json
```

## 6. Root causes

| Area | Root cause |
| --- | --- |
| Run mode/report | Missing or unknown values passed through a permissive normalizer whose fallback was Mayhem Pure. |
| Ranked submission | Eligibility could be recomputed from incomplete identity instead of preserving the original canonical mode. |
| Old #1 achievement | The stable achievement was coupled to confirmed global placement rather than a durable accepted-score threshold. |
| Menu hierarchy | Card order, width, color treatment, and default focus evolved independently, leaving Daily first and Pure visually dominant. |
| Daily copy | One dense procedural summary tried to explain goal, seed, reset, ship, records, and local-only behavior at once. |
| Personal best | The effect lived only inside `PlayScene`, had short fixed timings, used non-persistent scene state, and died on transition. |
| Achievements display | Rebuild paths did not guarantee destruction of all previous rows before rendering the unique catalog. |
| Pickup duplication | Multiple reward call sites lacked a single spawn owner, unique spawn identity, and logical event deduplication. |
| Temporary effects | Several timers used wall time, so pause, Draft, messages, and focus loss could spend useful duration. |
| Bomb behavior | Stored charges were correct, but autofire lacked an arming delay and useful-target lane gate. |
| Panic Engine | Hazard visuals and harmful state did not share one authoritative expiry/cleanup lifecycle. |
| Point Defense | The ring was primarily a timed visual/status state instead of an autonomous projectile interception owner. |
| Hangar first flight | Unlock acknowledgement, selection, viewing, and actual launch were not separated strongly enough in persistent state. |
| Projectile remnants | Player and enemy shots had several removal paths, allowing render and data ownership to diverge under rejection or cleanup. |
| Railbreaker fatigue | A dense heavy-shot sample and request cadence accumulated too much prolonged overlap. |
| Special-enemy clarity | Large central warnings obscured combat, while entry grace could feel like hidden invulnerability. |
| Sector 5 route | Combo Anchor used ordinary Draft presentation despite being a unique, irreversible score-route decision. |
| Existing wrong-board score | Local evidence lacks a proven SteamID/run identity, and the repository exposes no safe per-entry delete/move operation. |

## 7. Tests run

Syntax and repository integrity:

```powershell
node --check <changed/new JavaScript and MJS files>
git diff --check
```

Required localization/build/UI:

```powershell
npm.cmd run check:i18n
npm.cmd run build:current
npm.cmd run check:i18n-ui
npm.cmd run build
npm.cmd run check:release-line
```

Core integration:

```powershell
npm.cmd run check:steam-electron-bridge
npm.cmd run smoke
npm.cmd run check:controller-flow
```

Combat/projectiles/enemies:

```powershell
npm.cmd run check:projectile-lifecycle
npm.cmd run check:special-enemy-presence
npm.cmd run check:elite-ships
npm.cmd run check:enemy-weapons
npm.cmd run check:projectile-defense-rules
npm.cmd run check:graze-break
npm.cmd run check:ace-bounty-runtime
npm.cmd run check:rare-chaos-runtime
npm.cmd run check:projectile-visuals
npm.cmd run check:player-projectile-readability
npm.cmd run check:powerup-effects
npm.cmd run check:panic-engine-hazard-cleanup
npm.cmd run check:bomb-charge-indicator-readability
npm.cmd run check:nova-miracle-powerup
npm.cmd run check:nova-miracle-runtime
```

Modes, score, achievements, reports, and leaderboards:

```powershell
npm.cmd run check:run-mode-identity
npm.cmd run check:run-report
npm.cmd run check:swarm-elite-achievement
npm.cmd run check:run-contracts
npm.cmd run check:run-modes
npm.cmd run check:leaderboard-adapter
npm.cmd run check:leaderboard-pending-steam
npm.cmd run check:leaderboard-split
npm.cmd run check:steam-leaderboard-mock
npm.cmd run check:achievements
npm.cmd run check:steam-achievements-mock
npm.cmd run check:tactical-score-route
npm.cmd run check:tactical-draft
npm.cmd run check:daily-signal-contract
```

UI, feedback, Hangar, and audio:

```powershell
npm.cmd run check:personal-best-celebration
npm.cmd run check:ship-usage-counter
npm.cmd run check:powerup-pickup-confirmation
npm.cmd run check:combo-meter-urgency
npm.cmd run check:score-popup-readability
npm.cmd run check:cinematic-hangar-menu
npm.cmd run check:menu-scrollbars
npm.cmd run check:daily-signal-share-card
npm.cmd run check:gameplay-message-overlap
npm.cmd run check:gameplay-followups
npm.cmd run check:sector-arrival-stinger
npm.cmd run check:row-core
npm.cmd run check:row-core-runtime
npm.cmd run check:railbreaker-audio
npm.cmd run check:audio
```

Pacing/performance:

```powershell
npm.cmd run check:gameplay-performance-analysis
npm.cmd run check:mayhem-performance-diagnostics
npm.cmd run check:sector10-clear-time-pacing
```

Final desktop/package:

```powershell
$env:NOVA_SWARM_FRESH_PROFILE='1'; npm.cmd run desktop:smoke:current
npm.cmd run package:steam:win:current
npm.cmd run desktop:smoke:packaged
npm.cmd run desktop:controls:packaged
npm.cmd run desktop:perf:packaged
npm.cmd run check:desktop-package
node node_modules\@electron\asar\bin\asar.js list release\desktop\win-unpacked\resources\app.asar
```

All commands above passed in their final run. Two non-isolated development Electron smoke attempts wrote `status: passed` reports with zero console events but returned process exit code 1 after the report; the explicit fresh-profile run exited 0. The Steam-backed packaged executable tests exited cleanly.

## 8. Builds

- `npm.cmd run build:current`: passed.
- `npm.cmd run build`: passed; final stamp `v2026-07-16_17-02-20`, source `c557370`.
- `npm.cmd run package:steam:win:current`: passed.
- Steam package runtime report: `test-results/steam-package-runtime-2026-07-16T15-05-41-190Z/report.json`.
- Packaged menu smoke: `test-results/packaged-exe-smoke-2026-07-16T15-07-25-319Z/report.json`.
- Packaged controls: `test-results/packaged-control-smoke-2026-07-16T15-07-42-641Z/report.json`.
- Packaged performance: `test-results/packaged-perf-smoke-2026-07-16T15-08-03-852Z/report.json`.
- Final fresh-profile current smoke: `test-results/electron-smoke-2026-07-16T16-55-42-378Z/report.json`.
- Final desktop package gate: `release/steamworks/desktop_package_review_report.json`.

Existing build warnings:

- five inherited Ascendant fallback-art warnings;
- existing large JavaScript chunk warning;
- noisy electron-builder dependency collector diagnostics caused by the inherited shared/junction dependency environment;
- Node/Electron deprecation warnings in test tooling.

None blocked the final build or package gates.

## 9. Manual playtests

No separate human player held the controls during this Codex pass. Testing was input-driven and runtime-backed:

- installed-Chrome gameplay flows;
- production Vite browser smoke;
- Electron current-source smoke;
- final packaged executable smoke;
- packaged keyboard movement, firing, and pause;
- packaged gamepad movement, firing, and pause;
- deterministic scene/runtime probes for Draft, Bomb, Point Defense, hazards, pickups, Hangar, personal best, Daily, and result screens;
- visual inspection of generated screenshots and before/after composites.

This is strong automated playtest coverage, but it does not replace a final human feel pass for sound fatigue, combat readability, Steam Overlay behavior, and first-session delight.

## 10. Performance

- Final packaged run: 12 samples.
- Minimum FPS: `59.523809523799216`.
- Average FPS: `59.979797165882104`.
- Required minimum: 50 FPS.
- Warnings: none.
- Errors: none.

Projectile visual stress:

- 96-projectile scenario.
- p95 frame time: 27.10 ms.
- p99 frame time: 27.90 ms.
- maximum frame time: 28.40 ms.
- collision radius remained tied to gameplay truth rather than visual halo size.

Sector 10 pacing simulation:

- 25% profile: 1,332.4 seconds, 10.5% variance.
- 40% profile: 1,189.1 seconds, 6.2% variance.
- 55% profile: 1,123.9 seconds, 3.9% variance.
- 75% profile: 1,077.6 seconds, 2.2% variance.

Railbreaker eight-second firing analysis:

- 34 volley requests.
- 21 authored shots played after cadence control.
- projected overlap: 7 down to 2.
- effective peak: approximately -20.4 dB down to -25.4 dB.

## 11. Risks

- Public/default source provenance remains incomplete for BuildID `24218172`.
- The package is local only and has not received a Steam-client launch/Overlay test.
- The existing wrong-board leaderboard record remains untouched.
- A live-Steam-identity development smoke exits nonzero after writing a passed report; fresh-profile development smoke and Steam-backed packaged smoke pass cleanly.
- Five Ascendant ships still depend on inherited fallback art.
- The production bundle still has the inherited large-chunk warning.
- Browser tests can be sensitive to parallel machine load; transient timing failures were rerun alone before being accepted.
- Shared/junction `node_modules` produces noisy package collection diagnostics even though strict runtime validation passes.
- The original D: worktree contains checkout artifacts from the failed slow-worktree setup and should not be cleaned blindly.

## 12. Unresolved

- Correct or remove the existing Pure/Tactical wrong-board score only after player/run identity and a supported per-entry admin path are proven.
- Verify Steam F12 screenshots and Steam recording from the packaged game launched by the Steam client.
- Reconcile public/default BuildID `24218172` to exact source before any public promotion.
- Replace the five inherited Ascendant fallback-art paths if a later art pass is authorized.
- Consider bundle splitting separately if the large-chunk warning becomes a load-time problem.
- Run a human audio/readability/first-session feel pass before release.

No untranslated player-facing text remains from this takeover. All eight supported locale checks passed.

## 13. Achievement migration

The stable Steam-facing ID remains:

`ACH_GLOBAL_NUMBER_ONE`

Only its presentation and qualifying rule changed. This preserves existing unlocks and avoids introducing a second achievement that would orphan prior player history.

Migration behavior:

- already unlocked remains unlocked;
- accepted ranked score `>= 750000` unlocks;
- accepted historical Steam best `>= 750000` may backfill;
- client-only, rejected, queued/offline, unranked, Scout, Daily, Sector, debug, invalid, or achievement-disabled scores do not unlock;
- `749999` does not unlock;
- `750000` does unlock after accepted ranked confirmation.

The catalog resolves to 81 unique achievements with no duplicate stable IDs.

## 14. Swarm Elite

Player-facing name:

`Swarm Elite`

Rule:

`Record an accepted ranked score of 750,000 or more.`

The implementation centralizes the threshold and accepted-result logic in `src/achievements/SwarmEliteAchievement.js`. Game/runtime callers do not infer success from a local score alone. A pending Steam result keeps the original run mode and only evaluates the achievement after an accepted eligible submission.

## 15. Leaderboard correction

Future submissions are fixed:

- canonical Pure and Tactical identities;
- invalid/unknown identities fail closed;
- pending submissions retain original mode;
- reports no longer silently label unknown runs as Pure.

The existing live record was not moved, deleted, overwritten, or recreated. The current blocker is the absence of:

- a proven SteamID64/run identity;
- exact run evidence;
- a repository-supported safe per-entry move/delete operation.

The guarded procedure is:

`docs/NOVA_SWARM_LEADERBOARD_CORRECTION_PROCEDURE_20260716.md`

It explicitly forbids guessing by display name/score, resetting the whole board, impersonating another player, or running the submit-enabled probe during investigation.

## 16. Longship root cause

Row Core's gameplay pulses were not the main problem. The audio event was competing with generic pickup and generic powerup voice playback. Those events could claim the same presentation window and mask or cut the combined chant, making players hear an incomplete "row, row, row" sequence.

The fix gives Row Core one owned combined track:

`nova_row_core_viking_row`

Generic pickup sting and generic powerup voice are suppressed for this activation, while the six gameplay pulses keep their separate wave feedback.

## 17. Chant verification

Verified:

- cold first activation;
- repeated activation;
- heavy audio-load activation;
- no generic pickup/voice overlap stealing the ritual;
- full three-beat combined chant ownership;
- packaged asset presence.

Focused checks:

```powershell
npm.cmd run check:row-core
npm.cmd run check:row-core-runtime
```

Package proof:

```text
\dist\audio\sfx\nova-swarm\nova_row_core_viking_row.mp3
```

That path was found inside the final `release/desktop/win-unpacked/resources/app.asar`.

## 18. Forum status

| Item | Status |
| --- | --- |
| A - upgrade pool/skipping/Graze Break | Addressed. Hold, Rescan, two bans, 30% third stack retained; generic Skip deliberately not added; Sector 5 route is explicit and one-time; Graze Break is about 3x larger and sparkly. |
| B - duplicate achievements | Addressed with old-row destruction, stable-ID dedupe, and integrity diagnostics. |
| C - duplicate/unexplained pickups | Addressed with centralized ownership, spawn IDs, event keys, bounded history, and duplicate blocking. |
| D - timers during pause/messages/focus loss | Addressed through playable gameplay clock. |
| E - Bomb behavior | Addressed with arming delay, charge rail, useful-target lane gate, and intentional enemy/boss impact. |
| F - Panic Engine wall/beam | Addressed and verified through expiry, boss death, retry, transition, and scene cleanup. |
| G - Point Defense | Addressed with autonomous interception, impact feedback, explicit expiry, and cleanup. |
| H - Hangar first flights | Addressed with persistent `FIRST FLIGHT` and local launch count; clears only on real launch. |
| I - combo/score visibility | Verified across desktop, compact, localized, and dense-combat checks; no blind relocation made. |
| J - freezes/stuck shots | Addressed with centralized projectile lifecycle and orphan diagnostics. |
| K - Railbreaker sound | Addressed with dedicated shorter/softer sample and 145 ms request cadence. |
| L - special-enemy notices | Addressed with shorter transparent edge-aligned signals. |
| M - special-enemy presence/invulnerability | Addressed with visible entry staging, entry-only guard, threat arcs/pips, and post-entry fire delay. |
| N - Pure/Tactical leaderboard | Future defect fixed. Existing production record remains unresolved pending proven identity and safe admin path. |
| O - Sector 5 score route | Addressed with dedicated `NOW OR NEVER` presentation; cannot be held, banned, or offered again. |
| P - developer response | Complete draft saved. Not posted. |

## 19. Complete reply

The canonical ready-to-post copy is saved at:

`docs/NOVA_SWARM_TINY_FOUNDRY_FORUM_REPLY_20260716.md`

Verbatim reply:

> Thank you again for taking the time to write all of this up and for continuing to test the rough edges. We went back through the full thread point by point and completed a local verification pass for the next build. That build is not live yet, so I do not want to imply that these fixes are already in your copy.
>
> Here is the honest status:
>
> - Upgrade pool / skipping: we kept the third Overdrive stack at 30% effectiveness, the two permanent bans, Hold, and Rescan. We did not add a generic Skip button or a score reward for skipping. In the current scoring architecture that could create another mandatory leaderboard optimization and make an irreversible non-choice look strategic when it is not. Sector 5's score route is now guaranteed and presented as a distinct `NOW OR NEVER` decision that cannot be held, banned, or offered again. Graze Break's counterstrike is also roughly three times larger and much more sparkly while keeping its mechanics unchanged.
>
> - Duplicate achievements: the achievement screen now destroys old rendered rows before rebuilding, deduplicates by stable achievement ID, and exposes integrity diagnostics. Fresh, existing, locked, unlocked, reopened, offline, and Steam-sync cases are covered. The catalog currently resolves to 81 unique achievements with no duplicate IDs.
>
> - Duplicate or unexplained pickups: pickup creation now has one centralized owner, unique spawn IDs, optional logical event keys, bounded spawn history, and duplicate-event blocking. Legitimate multi-reward bundles are preserved. We could not reproduce a second independent Ghost Mode drop after these guards were added.
>
> - Timers during messages, pause, or focus loss: temporary combat effects now use the playable gameplay clock rather than blindly consuming wall-clock time. Mandatory sector introductions, Tactical Drafts, pause, and other suspended-control states no longer spend Point Defense, Bomb feedback, Row Core, or the audited temporary-effect windows.
>
> - Bombs: Bomb charges remain stored until fired, have an arming delay and visible charge rail, and autofire now waits for a useful target lane instead of dumping charges beneath the ship at wave start. Bombs can intentionally detonate on direct enemy or boss impact.
>
> - Panic Engine beam: boss-hazard visuals and damage state now share centralized expiry and cleanup. We verified normal expiry, boss defeat, respawn, retry/transition cleanup, and scene destruction. A harmless orange wall should no longer remain looking dangerous.
>
> - Point Defense: it now autonomously intercepts hostile projectiles inside the visible ring, gives impact feedback, uses the playable clock, and has explicit expiration/cleanup. It was also tested through refresh, pause, focus loss, death, scene transitions, and projectile-heavy play. The large ring should no longer persist for the rest of the run.
>
> - Hangar: newly unlocked and never-launched ships retain a `FIRST FLIGHT` marker until that ship actually launches. Previewing, selecting, hovering, or opening the Hangar does not clear it. The combat readout now shows the ship's local launch count, and the persistent Hangar state keeps unlock information recoverable after alt-tab or focus loss.
>
> - Combo and score visibility: we verified the existing placement rather than moving it blindly. Combo urgency, score popups, personal-best notices, special-enemy signals, and the score lane remain separated in desktop, compact, localized, and dense-combat checks.
>
> - Small freezes / stuck shots: projectile ownership and cleanup are now centralized. Player and enemy bullets are detached, deactivated, pooled, compacted, pruned, or destroyed through one lifecycle, including cap rejection and scene cleanup. Stress checks found no orphaned projectile render objects, and the heavy projectile pass stayed below 30 ms at p99 in the measured scenario.
>
> - Railbreaker sound: Railbreaker now uses a shorter, softer dedicated shot, lower authored volume, and a 145 ms request cadence instead of the old dense heavy-shot overlap. An eight-second firing test reduced projected overlap from seven simultaneous clips to two and reduced the effective peak by about 5 dB without making the weapon inaudible.
>
> - Special-enemy notices: the largest warnings were moved toward transparent edge-aligned signals with shorter occupation of the combat field. Compact and dense-combat layouts were checked so the signal does not sit on top of the HUD or the player.
>
> - Special-enemy presence: elites now have a clearly visible entrance state, a brief entrance-only damage guard, stronger threat arcs/pips, and a short post-entry firing delay. The rule is visible rather than hidden invulnerability, and normal combat health is unchanged after entry.
>
> - Pure/Tactical leaderboard placement: the underlying fallback was unsafe because missing or unknown mode values could silently normalize to Pure. Run identity, reports, submission eligibility, pending submissions, and Pure/Tactical routing now fail closed for unknown or invalid modes. The existing live record still needs a production-data decision: we do not have an unambiguous player/run identity or a supported per-entry Steam deletion/move path, so we did not guess or edit live data. A documented correction procedure is ready if the account and run can be proven.
>
> - Sector 5 score route: Combo Anchor now arrives as a dedicated `NOW OR NEVER` score-route card with unique framing, focus, explanatory text, and one-time behavior. It cannot be held or banned, and passing it closes that route for the run.
>
> Your newer notes:
>
> - Point Defense should now be much clearer in motion because the interceptions happen automatically inside the ring and the effect expires visibly.
> - Bombs are allowed to hit bosses; that is intentional, but they should no longer be wasted before a useful target exists.
> - We confirmed that the game menu does not claim Steam's F12 key. We could not fully reproduce the Steam recording/screenshot failure in the local non-Steam test environment, so that part still needs a packaged Steam-client check. If it still fails in the next build, the most useful details would be whether the Steam Overlay opens, whether F12 works in another game in the same session, and whether the failure affects screenshots, recording, or both.
>
> We also corrected run-report mode labels, made Mayhem Tactical the unmistakable primary/default mode, simplified the Daily Challenge explanation, extended the personal-best celebration through the result transition, preserved the full Longship "row, row, row" chant under repeated/high-load activation, and replaced `Top Of The Swarm` with `Swarm Elite` for an accepted ranked score of 750,000 or more.
>
> Thank you for being specific about what felt confusing, intrusive, or unfair. That level of detail made it possible to fix the systems instead of just polishing around the symptoms.
>
> Tiny Foundry

This was not posted.

## 20. Patch notes

The complete player-facing draft is:

`docs/steam/patch-notes-next-tactical-command-spectacle-feedback-2026-07-16.md`

It covers:

- Tactical as the main mode;
- concise Daily Challenge;
- Run Report v13 and strict identity;
- Swarm Elite;
- Sector 5 score-route clarity;
- forum-driven combat fixes;
- Hangar and personal-best changes;
- projectile spectacle and lifecycle;
- special-enemy presentation;
- Longship and Railbreaker audio;
- inherited improvements since July 13;
- known remaining issues.

Status: draft only, not published, not assigned to a Steam branch.

## 21. Menu rationale

The game needs one obvious answer to "What should I play first?" Tactical contains the current build-defining systems: Drafts, directives, doctrines, evolutions, fusions, and the intended full progression loop. Treating it as a smaller secondary choice made the game undersell its strongest identity.

The redesign therefore:

- makes Tactical first;
- gives it the widest and strongest card;
- labels it `MAIN MODE` and `RECOMMENDED`;
- gives it initial keyboard/controller focus;
- keeps Pure nearby as the ranked no-Draft alternative;
- presents Daily, Scout, and Sector as purpose-specific activities;
- keeps utilities visually separate from launch modes.

This changes hierarchy, not score rules.

## 22. Hierarchy

Final launch order:

1. Mayhem Tactical - main/recommended ranked mode.
2. Mayhem Pure - alternate ranked no-Draft mode.
3. Daily Challenge - rotating deterministic local challenge.
4. Scout Run - practice/short-form flight.
5. Sector Run - checkpoint/local-record activity.

Utilities follow after the launch group:

- Hangar
- Leaderboards
- Achievements
- Threat Codex
- How to Play
- Settings
- Credits
- Quit where supported

## 23. Default focus

Default keyboard/controller focus is Mayhem Tactical.

Focus restoration is mode-aware after:

- returning from Hangar;
- Settings;
- Achievements;
- Leaderboards;
- Threat Codex;
- How to Play;
- completed runs and result screens.

Mouse hover, keyboard navigation, and controller navigation use the same visible focus language. The card that looks primary is also the control that activates first.

## 24. Daily before/after

Before:

- Daily appeared before the main modes;
- the detail panel used a dense all-caps paragraph;
- repeated `//` separators made it read like diagnostics;
- purpose, reset, local-only status, ship, goal, and record state competed in one block.

After:

- Daily sits after both ranked Mayhem modes;
- the first line explains today's purpose and goal;
- the assigned challenge and loaner ship are separated;
- reset timing and local-only status are explicit;
- current attempt/record state is contextual;
- concise status lines replace the procedural paragraph;
- all eight locales follow the same information order.

Visual comparison:

`C:\Users\cromk\.codex\visualizations\2026\07\16\019f6a2a-f93e-7c23-a1f9-f0ba3d54f26c\menu-daily-before-after-1920x1080.png`

## 25. Daily states

Covered states include:

- available but not attempted;
- active attempt;
- abandoned or failed attempt;
- completed;
- completed with a new best;
- replay/retry;
- prior best attempt without a clear;
- prior best clear;
- reset/UTC rollover;
- expired identity;
- offline/local-only;
- missing or malformed record/config data;
- loaner ship and objective presentation;
- seven-day Flight Log history;
- result-card/share-card availability.

Invalid or stale state fails safely and does not silently manufacture a clear or ranked record.

## 26. Screenshots

Primary combined before/after evidence:

- Menu 1920x1080: `C:\Users\cromk\.codex\visualizations\2026\07\16\019f6a2a-f93e-7c23-a1f9-f0ba3d54f26c\menu-default-before-after-1920x1080.png`
- Menu 1280x720: `C:\Users\cromk\.codex\visualizations\2026\07\16\019f6a2a-f93e-7c23-a1f9-f0ba3d54f26c\menu-default-before-after-1280x720.png`
- Daily 1920x1080: `C:\Users\cromk\.codex\visualizations\2026\07\16\019f6a2a-f93e-7c23-a1f9-f0ba3d54f26c\menu-daily-before-after-1920x1080.png`
- Hangar first flight/count: `C:\Users\cromk\.codex\visualizations\2026\07\16\019f6a2a-f93e-7c23-a1f9-f0ba3d54f26c\ship-first-flight-launch-count\ship-first-flight-before-after.png`
- Personal best before/settled: `C:\Users\cromk\.codex\visualizations\2026\07\16\019f6a2a-f93e-7c23-a1f9-f0ba3d54f26c\personal-best-linger-handoff\personal-best-before-settled-comparison.png`
- Personal best celebration: `C:\Users\cromk\.codex\visualizations\2026\07\16\019f6a2a-f93e-7c23-a1f9-f0ba3d54f26c\personal-best-linger-handoff\personal-best-celebration.png`
- Personal best Game Over carry: `C:\Users\cromk\.codex\visualizations\2026\07\16\019f6a2a-f93e-7c23-a1f9-f0ba3d54f26c\personal-best-linger-handoff\personal-best-gameover-carry.png`

Runtime evidence also exists under the final `test-results/` directories for projectile visuals, Panic Engine, Railbreaker, Bomb indicators, Daily share card, Hangar, menu scrollbars, package controls, package menu, and package performance.

## 27. First-player comprehension

The first screen now answers:

- What is the main game? Mayhem Tactical.
- Is it recommended? Yes, explicitly.
- Is it ranked? Yes, explicitly.
- What if I want the old no-Draft rules? Mayhem Pure.
- What is Daily? A rotating local challenge with a stated goal and reset.
- What is Scout? Practice/short-form flight.
- What is Sector Run? A checkpoint/local-record activity.

The strongest visual treatment, first position, default focus, detail copy, and activation behavior all agree. A player no longer has to infer the intended mode from several equally weighted cards.

## 28. Bullets

The inherited 12 hostile-projectile families were preserved and reverified:

- distinct core/halo/wake/afterimage language;
- distinct family motion and silhouettes;
- readable collision truth;
- pooled-state reset;
- cap rejection cleanup;
- scene-transition cleanup;
- centralized data/render disposal;
- orphan sweeps and diagnostics.

`BulletManager` now owns compaction, pruning, rejected-at-cap cleanup, pending-shot cleanup, and visual orphan detection. The final stress scenario found zero orphaned projectile visuals.

## 29. Personal best

Verified thresholds:

- prior target: 50,000;
- no trigger at exactly 50,000;
- trigger at 50,001;
- live verification score: 51,789.

The celebration now:

- enters in stages;
- holds long enough to read;
- settles without covering critical HUD lanes;
- uses playable gameplay time;
- pauses during gameplay suspension;
- records transition carry state;
- reappears on Game Over rather than disappearing with `PlayScene`.

## 30. Run report

Run Report is version 13.

It stores and presents:

- canonical known mode;
- legacy alias identity;
- missing legacy identity as legacy/missing;
- unknown values as unknown;
- rank/leaderboard eligibility without permissive fallback;
- Daily, Scout, Sector, debug, and unranked distinctions;
- Tactical loadout, consumed state, Directives, Aces, Nemesis Protocols, Rival Wings, and inherited report systems.

Unknown data remains readable but cannot masquerade as Mayhem Pure or become ranked by normalization.

## 31. Visual/audio overhaul

Visual work:

- Tactical-first menu hierarchy;
- concise Daily detail panel;
- larger Graze Break;
- longer layered personal-best feedback;
- edge-aligned special warnings;
- visible elite entry state and threat arcs;
- autonomous Point Defense impacts;
- Bomb charge/arming rail;
- Sector 5 one-time score-route card;
- Hangar first-flight and launch-count presentation;
- preserved 12-family enemy bullet spectacle;
- centralized cleanup to prevent harmless lingering visuals.

Audio work:

- Row Core owns one complete chant;
- Railbreaker uses a shorter dedicated sample;
- lower authored volume;
- 145 ms request cadence;
- overlap reduced from seven projected clips to two;
- full catalog check passed: 1,466 assets, 354 keys, seven contexts;
- voice pool counts verified at 100/20/20/100/100/200/251/297 for the audited groups.

## 32. Git status

Before the final completion-report commit, the worktree was clean at documentation commit `b4db7c9efe78723f70675ea0f691c9a769e1656b`.

After this report is committed, the final handoff requires:

```powershell
git status --short --branch --untracked-files=all
git diff --check
```

The expected final state is the branch line only, with no staged, modified, or untracked files. The exact post-commit proof is recorded in the final Codex response.

## 33. Branch and HEAD

- Worktree: `C:\tmp\nova-swarm-takeover-20260716`
- Branch: `codex/takeover-implementation-20260716`
- Baseline: `724e3b7b72b984cc2185552360c3226c8409fadd`
- Implementation: `c557370a24f6e59d4fb4b211264d342178617c19`
- Documentation/evidence: `b4db7c9efe78723f70675ea0f691c9a769e1656b`
- Final HEAD: the commit containing this completion report; exact hash is recorded in the final Codex response.

## 34. Commits

Commits created for the takeover:

1. `c557370a24f6e59d4fb4b211264d342178617c19 complete Nova Swarm takeover implementation`
2. `b4db7c9efe78723f70675ea0f691c9a769e1656b document takeover audit and release evidence`
3. `add final takeover completion report` - this report's final commit; exact hash is recorded after commit in the final Codex response.

No commit was pushed.

## 35. Uncommitted work

The final intended state is no uncommitted tracked or untracked work in the active C: implementation worktree.

Preserved items outside that statement:

- the original D: worktree and its inherited 480 untracked files;
- the external backup archive;
- 24 inherited stashes;
- ignored local `steam_sdk`;
- generated ignored `test-results/` and local package output;
- checkout artifacts in the failed slow D: setup worktree.

These were deliberately not cleaned or destroyed.

## 36. Manual production actions

Still requiring explicit approval and a separate guarded pass:

1. Launch the final package through Steam and verify Overlay, F12 screenshots, and recording.
2. Decide whether to upload a new Steam build.
3. If uploading, rerun `check:release-line`, regenerate/inspect VDF, verify the exact target branch, and preserve rollback evidence.
4. Decide whether to assign a build to `sector-continue-test`.
5. Reconcile exact public/default source before any public/default promotion.
6. Approve and post the saved Tiny Foundry forum reply, then verify it live.
7. Decide whether/how to correct the existing wrong-board score after identity and supported admin capability are proven.
8. Publish the patch notes only after the corresponding build is actually available.

Not performed:

- Steam upload;
- Steam branch assignment;
- deploy;
- public/default change;
- Steamworks setting change;
- leaderboard definition change;
- live score submission, deletion, move, or reset;
- achievement definition change;
- store metadata change;
- forum post;
- patch-note publication.

Rollback implementation:

```powershell
git revert c557370a24f6e59d4fb4b211264d342178617c19
```

Revert the final documentation commits first if a complete rollback is required. Do not reset or clean the inherited worktrees.
