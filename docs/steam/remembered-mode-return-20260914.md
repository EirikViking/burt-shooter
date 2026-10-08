# Remembered Play and return to Mayhem Tactical

Delivered to private Steam branch `sector-continue-test` as BuildID **25296686**, depot 4765071 manifest `6101667971807257489`. Runtime version: `v2026-09-14_11-14-02`. Steam app-info independently confirmed the branch after upload. Public build remains **25274613**.

## Cause and behavior

Play correctly remembered Sector Run, but Other Modes converted its Mayhem card to Pure while hiding the separate Pure button. It offered no visible Tactical choice. Keyboard navigation also mapped the Tactical entry onto the hidden home Play button. Reproduction against the previous installed private build **25295473** confirmed that remembered Play launched Sector Run at sector 55, then failed the assertion requiring separate visible Tactical and Pure cards.

The fix preserves remembered Play. Other Modes now exposes separate Mayhem Tactical and Mayhem Pure cards. Selecting Tactical launches sector 1 and Play remembers Tactical on subsequent visits and after reload. Alternative modes and their remembered selections remain available.

This reproduces the menu routing failure; it does not claim to reproduce every previously reported natural enemy spawn. Existing encounter lifecycle repairs remain included and unchanged.

## Source and preservation

- Verified physical worktree: `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822`.
- Branch: `codex/space-snake-broods-20260912`.
- Baseline: `f52eebe`; implementation: **9c7e4f1**.
- Changed: `src/ui/AstraLaunchHome.js`, `src/scenes/MenuScene.js`, `scripts/check-launch-menu.mjs`.
- Preserved inherited forum draft edits and untracked evidence. No reset, clean, stash, discard, or bulk import.
- No new player-facing strings or untranslated text; existing localized labels reused.
- Steam upload and private branch assignment performed as requested. No public deployment, public posts, or Steamworks account/settings changes.

## Validation

- `check:release-line`: passed, including German/top3 localization and marketing hotkey markers.
- `check:i18n`: passed all eight locales.
- `build:current`: passed, built on E: with process-local E: TEMP/TMP.
- `check:i18n-ui`: passed all eight locales, no reported console/page errors, missing placeholders, or English leaks.
- Packaged launch-menu regression: passed; saved Sector Run launches through actual Play, mouse selection restores Tactical sector 1, reload remembers Tactical, all seven modes launch, and keyboard restores Tactical after remembered Overrun Pure. Menu screenshots captured in all eight locales; English and German visually inspected.
- Packaged startup and control smoke: passed with isolated profiles and Steam disabled. These are not live-account Steam gameplay tests.
- Native Steam runtime staging and package validation: passed.
- ASAR bundle equals built bundle; Electron main equals source; embedded commit is 9c7e4f1.
- Bundle: `assets/index-BePMztFJ.js`, SHA-256 `786bfd1098455dec5158e00d101b58634a9497f80420b629613964693ae80bd0`.

Evidence: `E:\Codex\builds\nova-swarm\menu-mode-return-20260914\qa`, including old-build reproduction, packaged-menu report/screenshots, i18n-ui, smoke, controls, package validation, payload.json, steam-branch.json, and logs.

## User test

1. Update `sector-continue-test` to BuildID 25296686.
2. Open Other Modes, select Mayhem Tactical, and confirm a normal sector-1 run.
3. Return to the menu, restart the game, and confirm Play says Mayhem Tactical and launches it.
4. Start Sector Run or Overrun, return, and confirm Play remembers it. Use Other Modes to switch back to Tactical again.

Rollback, only if requested: `git revert 9c7e4f1` for source; assign private branch back to Steam BuildID 25295473 for the previous package. Neither rollback was performed.

## Retention

Current deliverable retained at `E:\Codex\builds\nova-swarm\menu-mode-return-20260914\release\desktop\win-unpacked`; evidence retained under the same job's `qa` directory. Prior comparison build preserved. Automatic approval review rejected this job's temporary-file cleanup with "blocked by policy" before execution; no deletion retried. Exact remaining paths are recorded in `qa\cleanup.json`, including disposable build inputs and `E:\Codex\tmp\nova-menu-mode-return-20260914`. E: free space after delivery: **167.2 GiB**.
