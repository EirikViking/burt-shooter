# Mystery combat test build

**Steam build 25271583**, private branch **sector-continue-test**. Test the full roster with `--nova-mystery-test=all`. Individual `--nova-mystery-test=<id>` selectors still work. The campaign uses the same updated actors alongside ordinary waves, snakes and bosses.

All 56 enemies have new mobile combat profiles: 11 movement styles and 24 weapon types in distinct combinations. Thirty-two designs support component destruction. All have replacement effects and new audio: 399 bespoke SFX plus 56 lines from the existing female announcer. Mystery audio does not duck music or unrelated sound, and arrival waits until the announcement ends. Mysteries are hidden from the Codex. Existing artwork and player gameplay assets are preserved.

Actual packaged runtime evidence:

- [Normal-controls mixed combat](E:/Codex/builds/nova-swarm/mystery-v2/native-input/last.png): normal lives, damage and keyboard controls.
- [Rail Cathedral](E:/Codex/builds/nova-swarm/mystery-v2/native-fixtures/rail_cathedral.png) and [Choir Unbound](E:/Codex/builds/nova-swarm/mystery-v2/native-fixtures/choir_unbound.png): inspection/performance fixtures with invulnerability and no outgoing fire.
- [All 56 runtime inspection frames](E:/Codex/builds/nova-swarm/mystery-v2/qa): stepped simulation, explicitly separate from normal play.

Three 1920×1080 RTX 2060 samples measured approximately 60 FPS, each beside 17 ordinary enemies. Each ten-second sample followed 2.5 seconds of warmup. P95 frame intervals were 17.1–17.2 ms, with no sampled frame over 33 ms. There were no concurrent builds or captures from this task. This is a bounded sample, not a worst-case performance guarantee.

Passed: all 56 combat/component/retreat/resource fixtures; tour queue and ordinary/snake/boss coexistence checks; seeded appearance policy; audio cue bounds, no-ducking and dialogue sequencing; actual native announcement playback; normal-input source and desktop tests; eight-language UI checks; production build; release-line; Steam bridge; package hashes. The archive retains 15,288 files byte-for-byte, including 64 player-ship assets. All 119 integrated files were checked against the source/build outputs.

**Limits:** no full 56-fight human balance playthrough or measured retention improvement. This session cannot listen to audio, so I do not claim an auditory quality review. The large dark planetary rings remain part of the existing background artwork; the Mystery warning-lane effects were replaced. No new untranslated UI text; the new spoken performances remain English and do not claim subtitles.

Branch: `codex/mystery-combat-v2-20260912`; baseline `3ab0b19`; runtime commit `25d4825`. [Editable sources and reproduction](combat-v2.md). [Full delivery receipt](combat-v2-delivery.json). Provider responses report 7,375 credits for the 455 original audio requests, within the authorized allowance.

Only the private test branch was deployed. Public remains **25237042**; `test-build` remains **23782673**. Steamworks store/settings and Git remotes were untouched. Runtime rollback command: `git revert 25d4825`; previous private build: **25270813**.

**Cleanup remains blocked:** automatic approval review rejected removal of this job's disposable E: files, giving only “blocked by policy.” Nothing was deleted. Remaining folders under `E:/Codex/builds/nova-swarm/mystery-v2/`: `package/source`, `build-dist`, `audio/masters`, `live`, `steam-output`; task temporary files also remain at `E:/Codex/tmp/mystery-v2`. The verified package, original generated audio, receipts and QA evidence are intentionally retained. E: had approximately 238.7 GiB free at the final check.
