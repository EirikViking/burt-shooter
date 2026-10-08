# Arcade / Onslaught handoff

Implementation branch: `codex/arcade-onslaught-20260920` in `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`.

Authoritative local base: `9ad207dc3d47ea1ff5c5f13edb3d61bd815428d6` plus the original checkout's inherited work, preserved in snapshot `c2c6cb632004c219145c4e17f18c840d86b10e92`. The original checkout and its dirty index/worktree were not reset, stashed, cleaned, or merged. Implementation commits follow that snapshot; `b2028fa` contains the final gameplay/UI changes. Later commits contain QA and handoff documentation only.

## Delivered behavior

- Arcade Tactical is first, Onslaught Tactical second, Other Modes third. Other Modes retains Arcade Pure, Onslaught Pure, Scout, Sector Run, and Daily Signal. Existing internal mode identities/save keys remain stable. Inspecting a mode does not remember it as a launch.
- Onslaught starts immediately at sector 51, score zero, with the existing five Tactical augments. Gameplay ranked status remains false and career XP remains 85%; global leaderboard eligibility is separate. No rewards for skipped sectors, no new achievements/checkpoint unlocks, and no balance changes.
- The mastery invitation is discreet and dismissible, with Arcade retry primary. D/RB dismisses persistently; O/LB opens Onslaught records. It does not interrupt combat or automatically change mode. First Onslaught launch explains the fixed start.
- Onslaught records show only real ranked entries, a separate new-ruleset local PB, earned offline Flight Targets, and the closest higher record among available results. Empty success and unavailable reads differ. Pagination crosses 100-entry batches in both directions. Historical Overrun records are preserved and never imported for upload.
- Mode, run identity, ruleset, ship, and the frozen start contract survive result creation, persisted retry, provider routing, and native validation. Unknown modes cannot submit through Arcade. Onslaught uses KeepBest only; local backup never contaminates Arcade local records.
- All eight interface languages updated. Five affected English voice lines regenerated through the existing ElevenLabs voice pipeline. No claim of translated audio or subtitles.
- Existing native presentation and Steam Overlay binaries/code retained. A menu ship shader disposal race exposed during scene-transition QA was corrected by deferring resource disposal until asynchronous compilation completes.

## Steam evidence

AppID 4765070 verified in both project/native runtime and App Admin. One new board was actually created and independently looked up/read:

- Internal name: `nova_swarm_overrun_tactical_score_v1`
- Steam handle: `21037871`
- Community Name: `Onslaught — Ranked Challenge`
- Descending, Numeric, public reads (not Friends), client writes (not Trusted)
- KeepBest enforced by provider and Electron boundary; ordinary runtime uses FindLeaderboard.
- Confirmed successful initial read: zero entries. Community Name saved through the exact board's Edit/Update and verified after reloading App Admin.

Evidence: `E:\Codex\builds\nova-swarm\arcade-onslaught\verification\steam-provision.json`.
Only this authorized board was changed. No SteamPipe upload, SetLive, unrelated Steamworks publication/settings change, or synthetic production score submission occurred.

## Validation and reproduction

Passed: Onslaught policy/contract tests; 17 leaderboard reliability scenarios including persistent retry/account isolation; Steam Electron bridge; release-line checks; `check:i18n`; full `build:current`; controller flow; eight-language `check:i18n-ui`; focused real-browser runtime tests (0/1/3/100 records, batch navigation, error state, S51 start, result/retry/routing, invitation, controller dismissal, Reduced Motion).

Final UI checks used the production bundle via a local preview server. Browser fixtures use isolated contexts and offline transports. Packaged tests use `--nova-fresh-profile`, which blocks production score, achievement, and cloud writes; direct native Steam verification is read-only. Screenshots marked QA PILOT are fixtures, not live competitors.

Scripts: `check-onslaught-policy.mjs`, `check-onslaught-contract.mjs`, `check-onslaught-runtime.mjs`, `check-onslaught-packaged.mjs`, and the existing `astra-hitch-profile.mjs` (now accepts `ASTRA_PROFILE_OUTPUT_DIR` and records native presentation diagnostics).

Build/QA output is under `E:\Codex\builds\nova-swarm\arcade-onslaught`; TEMP/TMP and caches were explicitly placed on E:. See the deliverable's README and verification reports for packaged test/performance results and retained artifacts.

No known untranslated new UI text remains. Proper names/technical labels and English-only audio remain intentional.

Rollback, if later desired, from the isolated implementation checkout: `git revert --no-commit c2c6cb6..HEAD`, review, then commit. This does not delete the Steam board or touch the original checkout.

## Final packaged verification

The packaged executable passed isolated startup/menu/record fixtures and a valid S51 run contract. It independently found/read the new live board (zero entries, Descending/Numeric) and confirmed Steam Overlay activation through the native callback. No production upload was attempted.

The existing short hitch profile passed opening (66 s), dense sector-90 combat (66 s), and boss death (15 s). All three measured rAF p95 16.7 ms and p99 16.8 ms. Maxima were 83.3 / 16.8 / 33.3 ms; opening had one frame above 50 ms and the other scenarios had none. Native D3D11 used shared textures and a 60 Hz flip-sequential surface; no device loss, frame upload failure, or native copy timeout was recorded. These are final-build measurements, not a controlled before/after benchmark or a claim of zero hitches.

Retained deliverable: E:\Codex\builds\nova-swarm\arcade-onslaught\package\win-unpacked\Nova Swarm.exe. README and isolated launcher are in its arcade-onslaught parent directory. Runtime screenshots distinguish fixtures from live Steam reads.

Cleanup limitation: automatic approval review rejected removal of verification\packaged\profile and dist with the only supplied reason 'blocked by policy'. No workaround was attempted. Disposable web dist, task scratch/staging/logs, and test profiles remain listed in verification/cleanup.json. The task-owned read-only review worktree and branch were successfully removed. No other task's build or original source was deleted. E: free space after verification: approximately 141.3 GiB.
