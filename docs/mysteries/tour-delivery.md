# Mixed Mystery tour

Steam build **25270813**, private branch **sector-continue-test**. Launch with `--nova-mystery-test=all`.

All 56 identities run in roster order at sector 60, after an authored lead-in. They join normal waves and their snake rolls. Defeat or normal retreat advances only after the companion wave also finishes. Normal controls, damage, lives, weapons and cooldowns apply. Losing all lives ends the run.

Normal campaign rolls now admit Mysteries alongside ordinary waves, snakes and bosses. One Mystery is active at a time. Existing bullets and enemies are preserved at arrival; a surviving Mystery prevents premature boss cleanup.

Branch: codex/mystery-mixed-tour-20260912. Baseline: 9a8011b. Runtime: f98d80b. Changed launch parsing, preset configuration, Mystery eligibility/director and EnemyManager lifecycle, plus tests and packaging/docs. No new untranslated UI text.

Passed: seeded policy, all 56 queue transitions, coexistence/cancellation fixtures, real keyboard input in source and packaged game, account isolation, i18n, bridge, production build, release gate and archive hashes. The packaged capture shows Glass Widow and a Space Snake together. This is not a claim of a complete 56-fight human playthrough.

Public remained 25237042; test-build remained 23782673. Steamworks store/settings untouched; private deployment performed. Rollback: `git revert f98d80b`; previous private build 25270043.

[Detailed receipt](delivery.json). Runtime evidence: E:/Codex/builds/nova-swarm/mixed-tour-f98d80b/qa/.
