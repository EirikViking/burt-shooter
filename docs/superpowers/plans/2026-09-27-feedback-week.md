# Feedback Week Implementation Plan

> For agentic workers: use systematic-debugging and test-driven-development per task, then independent review. User authorized autonomous execution and waived intermediate approval stops.

**Goal:** Close all reviewed September 20–27 concerns with verified repairs and coherent improvements.

**Architecture:** Keep existing JS/Pixi/Electron boundaries. Fix source evidence and input lifecycles; centralize any new pacing or presentation policy in small pure helpers. Integrate on one clean branch, never share a checkout between coding agents.

**Tech Stack:** JavaScript, Pixi, Electron, Node assertion scripts, existing Playwright QA.

**Spec:** ../specs/2026-09-27-feedback-week-design.md

## Global constraints

Source D, scratch/build/cache E. No real player mutation. No further posts, Steamworks configuration changes, public release, Git push/pull/reset/history rewrite. User published all staged replies and authorized the verified build for private sector-continue-test. Locales en,de,zh-CN,ru,es,pt-BR,ko,ja for every changed player-facing string. Keep IDs, account isolation, saved unlocks and prior scores.

## Review focus

- Held controls released during transitions must not resume as stuck input.
- Whole-number effects with timed pickups and damage caps must still improve the displayed real effect.
- Clean snake kills followed by later deaths or voluntary exit must preserve legitimate evidence without historic guesswork.
- Sector metadata must survive a real bridge-shaped response, missing legacy details, and career rank refresh.
- Reopening/resizing UI must destroy old render layers and not duplicate awards or rows.

## Task 1: Replies and research

- [x] Re-read live relevant threads and stage exact quoted replies in three browser tabs and source draft files.
- [x] Research primary genre sources and retain design lessons in the spec.
- [x] Verify staged content and durable review links; user confirmed publishing all replies.

## Task 2: Controls and whole-number upgrades

Files: src/input/InputManager.js, src/entities/Player.js, src/scenes/PlayScene.js, src/config/TacticalDraft.js, focused scripts.
- [x] Reproduce held focus through real boss-intro entry/exit and keyboard/controller release cases.
- [x] Preserve focus only across intentional gameplay transitions; retain external-blur safety.
- [x] Reproduce Extra Shot level 2 vs 3 emitted volleys and check drones/chain counts.
- [x] Fix promised integer effects, cap handling, and tighter useful high-level spread.
- [x] Run relevant control, draft, powerup and ship response regressions; commit and review.

## Task 3: Trustworthy achievement and leaderboard evidence

Files: src/achievements/OnslaughtAchievementProgress.js, src/scenes/PlayScene.js, src/game/Game.js, src/leaderboard/, electron/steamLeaderboardBridge.cjs, associated scripts.
- [x] Reproduce actual snake completion and menu-ended run, no/one/two losses, later deaths and nonqualifying runs.
- [x] Record qualifying event evidence at its source with backward-compatible normalized storage.
- [x] Reproduce 101–147 through upload/read/refresh representations and fix source metadata interpretation.
- [x] Verify Small Wings all five hulls and Same Hull custom overlapping triples.
- [x] Run queue, isolation, Cloud and achievement suites; commit and review.

## Task 4: Progress UI

Files: src/scenes/AchievementsScene.js, src/i18n/, existing UI components and scripts.
- [x] Reproduce rendering lifecycle through reopen/filter/scroll/resize and repair any duplicate layer defect.
- [x] Separate rank milestones from task achievements with a clear localized filter/group.
- [x] Show counted hulls/loadouts and clarify snake conditions in all locales.
- [x] Verify eight-language and responsive screens; commit and review.

## Task 5: Useful Drafts and ship roles

Files: src/config/TacticalDraft.js, src/entities/Player.js, ship config, loadout picker, localized copy and scripts.
- [x] Exercise long seeded runs, rejected offers, caps, held choices, bans and third-level access.
- [x] Make offers reflect effective benefit and reduce unwanted repeats without hidden forced prerequisites.
- [x] Keep normal firing available during sector Point Defense where safe; make brief defensive upgrades useful.
- [x] Tune practical presets and representative narrow/broad/slow hull behaviors with bounded interactions.
- [x] Compare actual volley output, snake damage/health, hull response and coverage; preserve scoring; commit and review.

## Task 6: Encounter pace and balance

Files: snake encounter/combat modules, EnemyManager, mystery/Veilborn modules, challenge-flight and reward policies.
- [x] Measure snake frequency/time/direct vs chain damage in Pure/Tactical at 51/101/143.
- [x] Reduce repetition, improve direct-shot damage opportunities and visible health feedback; bound brood pressure.
- [x] Improve swarm/Veilborn variety and purposeful target-wave movement; suppress unrelated reinforcements.
- [x] Verify late-loop life reward policy and fix bypasses while retaining Tactical repair exception.
- [x] Test late-game speed caps, tractor visibility and cleanup overlap experiment; record decisions; commit and review.

## Task 7: Boss challenge and presentation

Files: BossDiscoveryEncounter, boss behavior/projectile modules, encounter selection and relevant scripts.
- [x] Test fresh-seed boss diversity and fix biased/repetitive selection if present.
- [x] Add purposeful later-loop attack variation and paired movement while locking announced attack geometry.
- [x] Repair flame range-end distortion and verify opening boss attack opportunities.
- [x] Test warning/release/attack/guest handoff and gameplay visuals; commit and review.

## Task 8: Comfortable combat audio and visuals

Files: friendly projectile/material rendering, Rift Shard VFX, AudioManager and hit routing.
- [x] Remove flicker from purple friendly shots, restrain Pierce white cores, improve shard silhouette/travel.
- [x] Fix repeated wing hit reward sounds and overlapping optional voice cues; maintain safety warnings.
- [x] Verify dense live gameplay and existing VFX/performance checks; commit and review.

## Task 9: Integrate and deliver

- [x] Run independent whole-branch review and resolve important findings.
- [x] Build from current source in E; release-line, full required suites, i18n, UI, bridge, smoke, controller flow.
- [x] Verify isolated packaged game, preserve real saves and pending submissions; identify limits of live Steam validation.
- [x] Record build/source provenance, coverage ledger, exact rollback and final clean status.
- [ ] Remove obsolete owned disposable artifacts and report retained deliverable, disk space and any blocked cleanup.

Final delivery: private sector-continue-test BuildID25564137; public/default25511386 unchanged. Cleanup remains blocked by automatic approval review; exact remaining paths and disk usage are in the handoff and E evidence manifest. No bypass was attempted.
