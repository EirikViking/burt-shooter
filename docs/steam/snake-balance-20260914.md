# Surgical snake and brood balance increase

Steam **BuildID 25297291** is verified on private branch **sector-continue-test**. Runtime **v2026-09-14_11-49-29**, source **7862bff**. Depot 4765071 manifest **4581952604893401091**. Independent Steam app-info verification completed 2026-09-14 at 12:13:54 +02:00. Public/default remains **25274613**.

## Change

- Mother snakes fire their existing volleys 25% more frequently and bullets travel 25% faster. More bullets are produced over time; the existing three/five-bullet patterns are retained.
- Brood probability is **38% per eligible snake**, increased from the actual source value of 25% (the request referred to 20%). It is not a 38% chance per sector or per wave.
- Baby attack cycles, movement and projectile speed increase 25%. Warning duration is 0.52 seconds, with its visual charge synchronized. Two simultaneous active attacks remain the limit; family patterns, 5–20 babies, hatch timing and the proportional healing cap remain intact.
- Mother sections and baby health increase by 35%, rounded from previous HP. The mother's existing head-health bonus remains. At sector 30: body section 48 → 65, head 60 → 81.25, baby 9 → 12. At sector 6: body section 14 → 19, baby 5 → 7.
- No changes to snake appearance probability, family unlock sectors, mode selection, scoring, art, audio, or progression. All previous fixes, including remembered Play with an explicit Tactical choice, remain included.

## Provenance and files

Verified D: worktree `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822`, branch `codex/space-snake-broods-20260912`, baseline **a358087**, previous Steam test build **25296686**. Fetch/status/branch/log/worktree checks completed before edits. Preserved the two inherited forum draft edits and all inherited evidence; no reset, clean, stash or discard.

Implementation files: `src/config/SpaceSnakes.js`, `src/config/SnakeBroods.js`, `src/entities/SpaceSnake.js`, `src/entities/SpaceSnakeBaby.js`, `src/managers/SnakeBrood.js`. Updated the probability assertion in `scripts/check-snake-broods.mjs` and appended `progress.md`.

No new player-facing text or untranslated strings. Steam upload and private branch assignment were explicitly authorized and completed. Public deployment, forum posting and Steamworks account/settings changes were not performed.

## Verification

- Release-line checks passed, including German/top3 localization and marketing-hotkey markers.
- Full `build:current` passed, including i18n validation for all eight locales; 1,022 modules compiled.
- Baseline comparison verified rounded +35% health over sectors 1–500, unchanged family profiles, identical brood counts/hatch times/random rolls, and 7,659 broods in 20,000 seeded encounters: **38.295%** observed versus 38% configured.
- Built-runtime lifecycle regression passed: fresh launch, locked species and sector gates, plus delayed-spawn retirement from sectors 30/51.
- Exact packaged executable passed all **14 families** at eligible sectors 30–60: actual HP, 1.25 firing cadence ratio, 1.25 mother and family projectile-speed ratios, 20 forced babies, valid positions, damage and score awarded once, and no remaining babies/broods after mother death and cleanup. No page errors. The QA harness directly sets actor levels; the unchanged HUD in those forced-encounter screenshots is not evidence of a natural sector-1 spawn.
- Gameplay screenshot inspected using the adapted web-game client with installed Chrome and page capture. Actual packaged Cinder and Eclipse combat screenshots inspected.
- Native Steam runtime staging, package validation, packaged startup smoke and ASAR/source identity checks passed. Packaged tests use isolated profiles with Steam disabled; human balance and live-account gameplay remain for the user's test.
- Bundle `assets/index-DjyqAm0Y.js`, SHA-256 **012acb2bfbb2fda1c14cd62779090403242a5bbe992fbff7e8d19d74c2b481a3**. Embedded commit/version and Electron main match the source/build.

Initial source-server tests timed out before combat. The default skill client also lacked its cached browser; it was adapted to use installed Chrome. Its software-renderer canvas capture was black despite live gameplay state; headed page capture and packaged screenshots resolved the capture limitation. These failed attempts are retained alongside the successful built/package evidence, not claimed as passes.

Evidence and reproducible QA helpers: `E:\Codex\builds\nova-swarm\snake-balance-20260914\qa`. Main receipts: `tuning.json`, `lifecycle`, `packaged-families/report.json`, `package/report.json`, `smoke/report.json`, `payload.json`, `steam-branch.json` and `logs`.

## Test in Steam

1. Update `sector-continue-test` to BuildID 25297291 and confirm version v2026-09-14_11-49-29.
2. Use the same ship/loadout you used when the snakes felt too easy. Try normal Mayhem Tactical from sector 6 onward or a later Sector Run for quicker encounters.
3. Check that mother snakes produce more fire over time, bullets are faster, and both mothers and babies survive more hits. Check that babies press attacks more actively but their charge warning remains readable.
4. Play several snake encounters to judge brood frequency; 38% is probabilistic, so a few encounters cannot establish the rate. Check that killing a mother still ends its brood cleanly.

Rollback only if requested: `git revert 7862bff` for source, or reassign private Steam branch to BuildID 25296686. Neither rollback was performed.

## Retention

Current executable retained at `E:\Codex\builds\nova-swarm\snake-balance-20260914\release\desktop\win-unpacked`; QA evidence retained separately in that job's `qa` directory. Previous deliverable preserved for rollback. Builds, staging and process-local TEMP/TMP were on E:; existing D: source and dependencies preserved. Existing bounded Electron/tool caches reused.

Automatic approval review rejected routine removal of this job's validated disposable E: paths with "blocked by policy". No deletion retried. Exact remaining build inputs, upload staging, isolated profile and `E:\Codex\tmp\nova-snake-balance-20260914` are recorded in `qa/cleanup.json`. E: free after delivery: **160.0 GiB**.
