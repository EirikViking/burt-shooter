# Level 30 encounter tests

**Steam build 25273400 is live on private branch sector-continue-test.** Public remains **25237042**. [Delivery receipt](level-30-test-delivery.json).

Use the existing Steam launch option `--nova-mystery-test=all`. The game opens the hangar; choose a ship and press START, ENTER, or controller confirm. All 30 hulls are available for this isolated test session. The tour still includes all 56 Veilborn, their authored companion waves and normal snake rolls. Individual numeric/name selectors and both combined-boss selectors also use sector 30 difficulty.

Female arrival announcements retain the normal voice system and play before arrival, waiting for other dialogue. Voice must remain enabled in Settings. No audio files or mix settings were replaced for this change.

Branch: `codex/veilborn-test-ship-choice-20260912`. Baseline: `3167b11`. Runtime commit: `05db732`. Build stamp: `v2026-09-12_18-42-23`.

Runtime changes: `BossEncounterTest.js` fixes every trusted preset to sector 30; `main.js` opens the hangar; `ShipSelectScene.js` loans the full roster and starts the selected test directly; `Game.js` accepts that valid test hull without changing persisted unlocks. The test heading is translated in all eight locale files. Launch harnesses now use the real hangar confirmation. Separate build/package helpers preserve the previous verified package and overlay the compiled runtime. Existing inherited untracked work was left untouched.

Validation: 59 valid presets and invalid-input rejection; normal profile locks; Eirik full-tour launch and Pixel Needle single-encounter launch; unranked reward/platform restrictions; voice playback and dialogue non-overlap; release-line, i18n, eight-language UI, controller navigation, Electron bridge and production build. The packaged full tour and both combined-boss launches passed with ordinary keyboard controls. The packaged female line played to completion at nonzero volume with no other dialogue overlapping. Steam IDs and exact evidence limits are in the delivery receipt. No new untranslated strings or translation fallbacks were introduced. Test fixtures are distinguished from normal-input playtests in their output files.

Normal campaign enemy difficulty, ship stats, sprites, weapons and career progression are unchanged. Public Steam content and store/settings are outside this deployment. Only the private test branch is authorized for activation.

Rollback: activate previous private build **25272660** on `sector-continue-test`. Source rollback, from a clean branch: `git revert 05db732` (do not reset or discard inherited work).

Outputs belong to `E:/Codex/builds/nova-swarm/veilborn-test-30`; temporary files to `E:/Codex/tmp/veilborn-test-30`; Vite cache to `E:/dev-cache/vite-veilborn-test-30`. Retain the current package and verification receipts, and remove disposable staging only after validation and upload. Previous tasks' cleanup-blocked paths are not part of this job.

Cleanup was blocked by automatic approval review ("blocked by policy"). No deletion ran and no bypass was attempted. Approximately 2.30 GiB remains in the five exact disposable paths listed in the receipt, alongside the retained current package and QA evidence.
