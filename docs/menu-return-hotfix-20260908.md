# Main-menu return hotfix — 8 September 2026

User requested a surgical fix and immediate Steam test upload, explicitly excluding smoke tests and other lengthy checks. Baseline: clean b91e1a8b1cbe21eee0dcbac17ec3c4c8ff7769e3 on codex/astra-visual-overhaul, uniquely owned by this checkout. Fetch, status, branch, log and worktree ownership verified. No upstream is configured; the checked-out delivered candidate is the authorized baseline.

Runtime commit: 77b731b. Only src/scenes/MenuScene.js changed (five added lines). Returning from Codex reproduced a TypeError in layoutRunModeInfoTiles: cached tile entries still referred to destroyed children of the previous legacy menu layer. Reset tile items/signature and variant tabs/signature when rebuilding the menu. Preserve the layer cleanup and all gameplay/assets/translations.

Focused checks only: baseline reproduction; corrected return sequence without renderer errors; mouse Modes/Back; return from Codex, Achievements, Leaderboard, Settings and How to Play. Hangar retained its existing Escape submenu behavior; its shared scene return was checked directly. No claim that Hangar navigation was redesigned. Release-line, i18n, diff whitespace and production compilation pass. Existing large-bundle warning remains. No smoke, performance, full controller, broad build:current validation chain or i18n screenshot suite was run, per the user's explicit request. No new text or untranslated strings. Evidence: test-results/menu-return-probe.mjs, menu-return-focused.mjs, menu-return-build.log and menu-return-static-proof.json.

The previously approved unreleased cores/snakes and cinematic menu remain included. This hotfix does not address forum feedback, long-run crashes, the earlier frame stall or other inherited limitations.

Source rollback: git revert 77b731b. Steam rollback: reassign build 25175308 to sector-continue-test only. Neither rollback was performed. Delivery receipt will be recorded after server verification.

## Delivered

Steam Build **25182624** verified on **sector-continue-test** at 2026-09-08 08:19:19 UTC, manifest **3892268512034224992**. Public/default remains **25169120**, test-build **23782673**, and the complete Cloud UFS block is unchanged. No public promotion, store edits or announcements. Only the authorized test-branch assignment changed.

Package: `test-results/astra-build-2026-09-08T08-03-32-338Z/win-unpacked/Nova Swarm.exe`. Steam runtime staging/check passed; archive inspection confirms runtime 77b731b and both cache resets. The first archive inspection used forward slashes; Windows archive lookup required backslashes, after which inspection passed. Payload: 410 regular files, 1,683,058,007 bytes. ASAR SHA256: `3468145c7d4e8db81cae9780e8e97ccb31bfaf73f28cbd09f8e44c511d871221`. Uploaded directly from the recorded package, without changing it after fingerprinting. Receipt: `test-results/menu-return-steam-77b731b/receipt.json`. Server assignment verified; no Steam-client download or human playtest claimed.
