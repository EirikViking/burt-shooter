# Early encounter repair — private Steam test build

Steam Build **25295473** is verified live on **sector-continue-test** (App 4765070, depot 4765071, manifest 2358967540661310841). Runtime version: **v2026-09-14_10-08-03**. No public release or forum posting was performed.

## Provenance and scope

- Worktree: `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822`.
- Branch: `codex/space-snake-broods-20260912`.
- Investigation baseline: `92705c9a768bc2dab7e49ca85044727592c140ab`.
- Previous private build: 25288466, source `cee8e9a`.
- Packaged gameplay source: `0dc5797`.
- Includes `92705c9` (Codex descenders) and all earlier completed rank, boot, icon, leaderboard, and input fixes already in the previous build.
- Inherited forum drafts and untracked evidence remain preserved. No reset, clean, stash, discard, or unrelated integration.

## Finding and repair

The PlayScene/container is reused between runs. Its exit cleanup did not dispose the old EnemyManager. A controlled test of the installed old build left Sector 30 with 12 queued spawns; all remained queued after exit and the retired manager continued creating enemies. This proves delayed work survived exit. The exact three reported natural encounters were not separately reproduced in a full human playthrough.

The repair disposes the manager on exit, cancels queued formations and prepared encounters, and prevents retired managers or late boss asset loads from attaching to the reused container. Wonder requests must match the current sector. Snake creation checks the current manager/sector and species unlock. Veilborn plans are checked before preparation and again before attachment.

Natural thresholds remain unchanged: Wonders from Sector 3 on their three-sector cadence; Space Snakes from Sector 6, subject to species unlocks; Veilborn from Sector 11, subject to scheduling and identity unlocks. Trusted practice/debug exceptions remain intentional.

Gameplay files changed: `src/managers/EnemyManager.js`, `src/managers/MysteryEncounterDirector.js`, `src/managers/BossDiscoveryEncounter.js`, and `src/scenes/PlayScene.js`. Tests: `scripts/check-encounter-lifecycle-runtime.mjs` and `scripts/check-cabinet-wonders.mjs` (replaced fragile character-distance assertions with method-section assertions).

## Verification

- Release-line, build:current, i18n, Steam Electron bridge, Cabinet Wonder, core/serpent, mystery policy, and 2,000-seed encounter pacing checks passed.
- Built-runtime admission checks passed across sectors 1, 2, 3, 5, 6, 10, 11, and 30; locked snakes were rejected and an unlocked snake could still spawn.
- Packaged lifecycle regression passed: controlled Sector 30 and 51 exits each cancelled 28 pending formation spawns, left zero enemies/pending work, and restarted at Sector 1. These are automated lifecycle fixtures, not complete human Sector Run/Overrun playthroughs.
- Packaged startup and controls passed with isolated local profiles. Live-account Steam achievements/leaderboard integration was not exercised by these offline tests.
- i18n UI passed all eight supported locales, with no page errors, missing-glyph placeholders, or English leaks. No player-facing text was added or untranslated text introduced.
- Packaged JavaScript equals the built bundle; Electron main equals current source. Bundle SHA-256: `32ef133cb4b433a966dcd6403896779e30b25a851f75561418031cec2756a687`.
- Package runtime/native files and executable branding passed. Electron-builder's Darwin symlink extraction failed during its Windows icon step; the existing Windows rcedit tool completed icon/version resources without disabling executable editing or altering ASAR integrity. The finalized executable then passed the packaged tests above.
- The source-development-server attempt timed out and was not counted as a pass. Testing proceeded against the completed production bundle and packaged executable.
- SteamCMD upload succeeded; fresh Steam app information independently confirmed the private branch BuildID. No Steamworks account settings were changed.

Evidence and deliverable: `E:\Codex\builds\nova-swarm\early-encounter-fix-20260914` (`qa`, Steam receipts, and `release\desktop\win-unpacked`).

## What to test

1. Update `sector-continue-test` to Build 25295473. Start a fresh Mayhem run: no Wonders or Veilborn in Sector 1, and no Space Snake in Sector 2.
2. Play a high Sector Run, leave it, then start a new Mayhem run without closing the game. Repeat after Overrun. The new run must start cleanly at Sector 1.
3. Check the full exclusion windows: no Wonders before 3, no snakes before 6, and no Veilborn before 11. Later appearances remain probabilistic/scheduled; they need not occur immediately at unlock.
4. Recheck Codex bottom-line letters such as g, p, q, j, and y. Also confirm the Nova Swarm taskbar icon, responsive leaderboard opening, and matching career rank remain correct.

Rollback, only if requested: `git revert 0dc5797` reverses this gameplay repair without resetting unrelated work. Steam rollback is a separate, explicitly approved reassignment to the retained previous private Build 25288466.

## Retention and cleanup

The tested deliverable, baseline reproduction, QA, and upload receipts are retained. Automatic approval review rejected the validated job-owned staging cleanup with `blocked by policy`; no cleanup was performed or retried through another route. Exact remaining paths are recorded in `E:\Codex\builds\nova-swarm\early-encounter-fix-20260914\qa\cleanup.json`. They include this job's build inputs, temporary profiles, task temporary directory, and four failed icon-tool extraction attempts. E: free space was rechecked at 174.6 GiB. Final tracked changes outside these commits are only the two inherited forum drafts; inherited untracked evidence is retained.
