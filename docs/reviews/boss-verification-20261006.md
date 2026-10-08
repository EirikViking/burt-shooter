# Boss motion verification — October 6 continuation

## Scope and identity

This continuation finishes verification of the ten-family mechanical motion implemented locally on October 3. It does not add ten new bosses, new boss illustrations, voices, attack patterns or rewards. The fixed direction remains precise arcade shooting in a living universe that responds to player actions.

The exact checkout remains D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920, branch codex/sector-leaderboard-unknown-20260928, HEAD 7e8325e3d9abb09357636bca7e994c0227be02d6, no upstream. Initial inherited state: 63 tracked modifications and 370 untracked files. Read-only fetch dry-run again advertised the separate remote one-more-run branch; no integration or branch/worktree change. No other active writer in this local checkout was found.

New task-owned roots are E:/Codex/builds/nova-swarm/boss-verification-20261006-a3f9c812 and E:/Codex/tmp/boss-verification-20261006-a3f9c812. Root/ancestor paths are non-reparse. Existing source node_modules and dist junctions remain untouched; all actual build outputs use the new E: root. TEMP/TMP and npm/Vite caches are explicitly on E:. Inherited output cleanup remains on hold.

## Verified so far

- Fresh release-line check passed before build and again before packaging. German, top-three localization, achievements/Cloud, fullscreen and marketing hotkey markers are present.
- Full build:current completed successfully (1095 modules, Vite build 6m54s). This supersedes the interrupted October 3 build as a local candidate. Version v2026-10-06_23-24-30; entry assets/index-Dhs4cwBy.js, SHA256 b0db2b824aa346d8255bfe3c36a9d1d3a48931a7c446976af123e90eec289b92. The build retains existing large-chunk/dynamic-import warnings; they were not hidden or fixed through unrelated restructuring.
- Source checkpoint verified 626 files and 188 changed/public assets against the completed output. Build metadata was regenerated normally; no game source was rewritten by building.
- Pure boss sampler: ten unique bounded trajectories, zero RNG, caller storage reused, maximum offset 0.0396 hull radii and rotation 0.0408 radians, no cycle teleport, exact suppression with Reduced Motion and charge at or above 0.55.
- Fresh actual-browser comparison for all ten families: distinct motion, identical charged poses, identical Reduced Motion poses, connected rotor wedges, identical child counts, deterministic repeated time, and owned destruction preserving shared textures.
- Compiled candidate test: all ten actual Boss constructors rendered successfully, no page errors, no new RNG draws, unchanged health/radius/position/score/lives, zero-delta pose stability. Clock and conductor screenshots plus the complete ten-rig gallery were inspected.
- Colossus rendering: ten hulls, forty bounded hazard fields, projectile/pause/release contracts and zero cosmetic RNG passed.
- Fauna routing/ownership regressions, full i18n checks, eight-language compiled UI checks and controller-only flow passed. German and Chinese Settings screenshots were inspected: no visible missing glyphs or clipping in those samples. No new translated strings were introduced.
- Steam Electron bridge mock/native-interface contract passed. Live Steam identity and native package checks are separate gates.

## Frame-time comparison

New reproducible harness: scripts/measure-boss-mechanical-builds.mjs. Sequential compiled delivery baseline versus compiled candidate, then reversed order. Same 1280x720 viewport, actual conductor and clock constructors, 160 static projectile visuals, fixed animation steps and matching health/radius/child/projectile counts. Production progression is blocked. Each case uses 120 CPU warmup frames plus 480 samples, then 60 rendered warmup frames plus 180 gaps. This is a rendering/animation fixture; it does not simulate live attacks, collisions, a whole run, every GPU or fun.

| Order / family | Baseline CPU p99 | Candidate CPU p99 | Baseline rendered p99 | Candidate rendered p99 |
|---|---:|---:|---:|---:|
| Forward / conductor | 6.9 ms | 9.1 ms | 17.2 ms | 17.2 ms |
| Forward / clock | 8.8 ms | 6.8 ms | 17.1 ms | 17.1 ms |
| Reverse / conductor | 6.4 ms | 7.0 ms | 17.2 ms | 17.2 ms |
| Reverse / clock | 5.8 ms | 6.3 ms | 17.3 ms | 17.1 ms |

No measured CPU or rendered sample exceeded 50 ms. Candidate conductor CPU tails were higher in both orders; the largest CPU sample was 14.9 ms candidate versus 13.9 ms baseline. Rendered tails remained comparable. Do not claim universally improved performance or no regressions from this narrow measurement. The isolated ten-rig comparison also remains within a small range (candidate p99 2.7/3.1 ms versus baseline 3.1/2.6 ms).

## Presentation hold and remaining work

The new 20-second creature masters remain preview-only. Normal CosmicFaunaCatalog and its original short clips are unchanged. The user's report of an artifact in the middle of the presentation is still not positively identified: the provided main-menu screenshot contains the white Codex voice controls, while sampled frames of the hash-matching emailed video do not. No artifact fix is claimed. Keep the pending clarification separate from the independent boss checks.

Local Windows packaging and native smoke/control gates passed. The package verified 15694 files, retained 4520 native-runtime files from the existing verified package and passed the Steam package structure check. Actual isolated Windows startup, keyboard movement/fire/pause and gamepad movement/fire/pause all passed with no reported errors. Archive size 2408144977 bytes; SHA256 79cadc05f164e349b880af3640fde79599bff6aa7d6f622ba492f2dfffcc7508. The native keyboard gameplay screenshot was inspected. Source and archive hashes were checked again after the native runs.

This is a local candidate, not a Steam delivery. Last verified private Steam delivery remains Build25683581 / manifest2117634921635676724; no live branch state has been newly authenticated in this continuation. No Steamworks settings, public promotion, player data, paid generation or purchases were changed. The unused 20-second candidate WAVs are present in the local public-file copy but are not selected by the unchanged normal catalog; do not describe them as enabled content.

Next checks: inspect a finite-life natural opening and provide actual audiovisual review evidence before a new presentation is delivered. Human first/third-sighting interest, threatening character, attack readability in actual combat, laptop/headphone mix, installed-Steam behavior and long-session hardware tails remain manual checks.

## Reproduction

Use the existing checkout and set TEMP/TMP to E:/Codex/tmp/boss-verification-20261006-a3f9c812 and npm cache to E:/dev-cache/npm. The task-local build-fixed.ps1, fixed-release-source-state.cjs, package-current.cjs and check-native-release.ps1 under the E: root record the exact build/package procedure. Build script refuses an existing output directory; do not rerun it over inherited artifacts.

Compiled candidate server: task-local serve-fixed.cjs on localhost4984. Historical baseline server: serve-baseline.cjs on localhost4985. CHECK_URL/BASELINE_URL/CANDIDATE_URL point there as appropriate; CHECK_OUTPUT_DIR must be a new E: subdirectory. Run check-boss-mechanical-compiled.mjs and measure-boss-mechanical-builds.mjs (again with REVERSE_ORDER=1 for the second order). Source parity uses the owned source server localhost4983 and BOSS_RIG_BASELINE=E:/Codex/builds/nova-swarm/boss-motion-20261003-23b7a581/ColossusRig.before.js.

New product changes in this continuation: none. New test file: scripts/measure-boss-mechanical-builds.mjs. The earlier boss/audio source work is preserved. No new untranslated text. No reset/clean/stash/pull/commit/push. No rollback was executed; the new measurement harness is inert outside explicit invocation, and the inherited motion checkpoint remains preserved. Never reset HEAD to undo accumulated work.

## Cleanup limitation, 23:57 Oslo

The tool rejected the combined owned-server stop / task-owned temp cleanup / rollback-check command before process creation: `exec_command failed: CreateProcess ... rejected: blocked by policy`. No more specific review reason was returned. No part of that command ran; no files were deleted, servers were not stopped by it, and the proposed new boss rollback patch was not created or checked. No alternative deletion path, escalation or security-setting change was attempted. Ordinary E: building, packaging and report writing had succeeded; do not misreport this as a failure of all E: writes.

Retained required deliverables: this job's release-fixed and win-unpacked directories, QA evidence and reproduction scripts. Blocked disposable paths under E:/Codex/tmp/boss-verification-20261006-a3f9c812: package-source, native-profile, node-compile and node-compile-cache. Existing source server4983 and this job's read-only candidate/baseline servers4984/4985 remain available. All inherited output folders remain untouched. Free E: space after the rejection was236423479296 bytes. Cleanup is incomplete.

Final Git count at this checkpoint:63 modified tracked files/372 untracked individual files; new measurement/report files account for the two additions. Product source remains exactly the built checkpoint. The existing audio rollback review command remains documented in the sprint report; no new product rollback is necessary for this test/documentation-only continuation.

Hourly Norwegian status email sent/readback verified at23:59:43 Oslo, personal sender/recipient, message1a1133ad177c96d0. Subject: “Nova Swarm — status: bossbygget er nå verifisert lokalt”. No attachment repeated, no new Steam delivery claimed; includes the incomplete cleanup and CPU-tail qualification. User was explicitly notified. Latest receipt is updated in the existing fauna job, with this job's email-receipt.json retaining the same evidence.
