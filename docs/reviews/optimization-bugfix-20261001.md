# Optimization and bug audit — 2026-10-01

## Current result

Local Windows executable: `E:\Codex\builds\nova-swarm\optimization\win-unpacked\Nova Swarm.exe`.
Version **v2026-10-01_21-07-12**, compiled entry `assets/index-WUN3ZbtM.js`.
Entry SHA256 `d59c61c07cc221ed78ae58f9bc512da0bea39d763f449853e0e8bd4350e9f078`.
Archive SHA256 `f80fd90b3cb9ec290141342fd3470dd656351d06f9ca7ef045d9b51af3faabfc`.
15,560 archive files and 4,520 retained native runtime files verified.

Source remains `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`, branch `codex/sector-leaderboard-unknown-20260928`, baseline/HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`.
Initial handoff matched 58 tracked modifications/114 untracked paths. All inherited work was preserved. No upstream; the required fetch timed out after 20 seconds, so remote freshness remains unverified. No branch/worktree/directory switch, reset/clean/stash/pull/commit/push. Work stayed serial under the repository's agent restriction.

Steamworks was untouched in this pass. No upload or deployment performed; the last verified Steam test build remains **25660369**. Player saves, progression, achievement and leaderboard identifiers were preserved. No new strings, untranslated text, art, audio generation or gameplay balance changes. Existing native-speaker/localization backlog remains as documented in earlier reviews.

## Reproduced and fixed

1. **Effect disposal on leaving Play.** The new real-renderer regression captured 2,392 owned display objects, with zero destroyed on the old teardown path. Particle, detonation and hull-fragment pools remained populated. Play now disposes those managers explicitly; destruction is idempotent, owned graphics/meshes/frame views are released, and shared hull/atlas/material textures survive for subsequent runs. Before/after ownership evidence is in `red-lifecycle` and `green-lifecycle`.
2. **Late warmup reviving retired effects.** Delayed bloom preparation could create three sprites after retirement. Delayed detonation preparation could create 18 displays and accept a new explosion after retirement. The managers now check retirement before and after async loading and before further uploads. Final assertions require zero children/pool entries and no accepted emissions. Five actual launch/teardown cycles retained exactly 576 game-container children per launch and 18 detonation displays, with retired displays destroyed every time. This measures object/resource lifecycle, not process RAM or GPU memory.
3. **Hull shading allocations.** Removed per-pixel neighbor and colour coefficient arrays, keeping the summation order and output exact. Six fixtures include degenerate dimensions, partial alpha, a 512px field and actual second-hull art. Every output byte and input byte matches the preserved implementation. Alternating CPU-only baseline/candidate measurements for the actual 512px hull: median **4.1241 → 2.9182 ms** (~29% lower); nine measured samples per path after warmup. This is first-use CPU shading, not a whole-game FPS claim.
4. **Obsolete collision stress expectation.** The old test applied combo/global normalization to a bonus drone's displayed payout and expected 291 for a 500-point label. Current production already awards the displayed score directly. Corrected the test to this established contract and added a repeated-collision zero-extra-credit assertion. Production scoring was not changed to satisfy the test.

Files changed in this increment:

- Product: `src/effects/ParticleManager.js`, `AstraDetonation.js`, `HullBreakup.js`, `AstraHullMaterial.js`, and `src/scenes/PlayScene.js`.
- Tests: existing `scripts/check-mayhem-collision-hotpath-stress.mjs`; new `check-optimization-lifecycle.mjs`, `check-retry-effect-soak.mjs`, `check-hull-material-parity.mjs`, `run-optimization-regressions.mjs`.
- Build metadata: `public/version.json`, `public/sw.js`. `_headers` checked unchanged.
- Documentation: this review, HANDOFF.md, progress.md. Source-only patch excludes documents and preserves inherited dirty modifications.

## Verification

Fresh release-line, i18n and Steam bridge checks pass. Full `npm run build:current` passed (Vite 4m09s); existing large-bundle/static-and-dynamic-import advisories remain.

All **14 regression scripts** in `regression-final.json` pass: effect ownership/late warmup; First Light continuity (50 groups); encounter evolution (9 groups including eligibility, Sector 51, score ownership and restart); Orbit Breaker; explosion/planet rendering; sound RNG/warning/pause/draft/focus/retry lifecycle; deep expansion; result UI/achievement cleanup; previous forum regressions; dense collision hotpath/once-only bonus payout; runback input lifecycle; projectile defence; score normalization; boss warning lifecycle. Separate projectile-lifecycle baseline, five-cycle retry soak, hull parity/material checks and controller-only 1280x720 flow pass.

Initial final-suite lifecycle failure was HMR singleton duplication after editing an imported asset module; restarting the owned source server resolved it with unchanged product assertions. The scoring gate's initial obsolete expectation is retained in the run history, with its correction and passing rerun identified. `regression-final.json` selects the fresh passes and records both issues; initial receipts remain available. Source-only rollback generation needed explicit missing-newline markers for version.json; the final reverse check passes and was never applied.

Compiled browser smoke covers menu/settings/audio audition/credits, actual gameplay/powerup HUD, controller pause, Cabinet Log, results/return, mobile, wave transition and boss death: zero warnings/errors/page errors/bad responses. Compiled eight-language UI: zero placeholders/English leak probes/console errors/page errors. Actual delivered executable fresh-profile smoke: API200, correct build/Git SHA, zero console events, production Steam/save/score/achievement identity isolated. These tests do not establish installed online Steam identity or physical controller behavior.

Official develop-web-game input client ran two movement/fire bursts; gameplay screenshots/state inspected. A separate ordinary-input source playthrough requested up to 180 seconds and ended naturally at ~123.6 seconds: Sector2, score8247, zero lives, convoy rescue and Rival Strike, normal result screen, zero page errors. No granted lives/invulnerability/kills/spawns/skips/score; all production progression/submission permissions disabled. Source server's config cached the prior visual build stamp before metadata was bumped; this footage exercises fixed source, while the separately verified compiled/native candidate reports the new version. Input/state/timing/seed/video retained; seed alone does not reproduce a run.

## Performance and practical limits

Sequential installed headless Chrome at 1280x720 compared the retained compiled material-rebuild baseline with this compiled candidate: same seeded Breach/diagonal battery, ocean backdrop, 320 initial hostile shots, fixed combat clocks/engine intent, capped hit sparks/detonations, 120 warmup/780 CPU samples, then 120 warmup/180 render-gap samples. No other job-owned test/build/packaging ran during this pair.

| Measured ms | Baseline | Candidate |
| --- | ---: | ---: |
| CPU p50 | 11.6 | 8.2 |
| CPU p95 | 26.9 | 14.6 |
| CPU p99 | 31.5 | 17.1 |
| CPU max | 34.0 | 19.5 |
| Render-gap p99 | 17.2 | 16.9 |
| Render gaps >50ms | 0 | 0 |

This is one local matched pair, not causal attribution or a hardware-wide improvement guarantee. Other app/project activity and hardware power state were not controlled; the separate Radar Rat Race task was active. Do not compare these absolute values directly to earlier runs or claim universal speedup. The byte-identical CPU shading probe is the narrower direct measurement. Resource disposal is independently established by lifecycle assertions. Hardware frame-time tails, long sessions, world/rank transitions and installed Steam play remain manual checks.

## Exact local commands

Set E: paths before each test/build; recreate only these task-owned temp/cache directories as needed:

```powershell
$env:TEMP='E:\Codex\tmp\nova-optimize'; $env:TMP=$env:TEMP
$env:npm_config_cache='E:\dev-cache\npm'
$env:NOVA_SWARM_VITE_CACHE_DIR='E:\dev-cache\vite\nova-optimize'
New-Item -ItemType Directory -Force -Path $env:TEMP,$env:NOVA_SWARM_VITE_CACHE_DIR | Out-Null
npm run dev -- --host 127.0.0.1 --port 4950 --strictPort
```

In another terminal with the same E: env, set `CHECK_URL=http://127.0.0.1:4950`, `CHECK_OUTPUT_DIR=E:\Codex\builds\nova-swarm\optimization\manual-check` and run the focused scripts above. Open `http://127.0.0.1:4950/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural` for isolated source play. Restart the source server after edits before singleton-import fixtures.

Production build: `npm run build:current -- --outDir E:/Codex/builds/nova-swarm/optimization/current --emptyOutDir`. Do not overwrite a deliverable in use; the stale repository dist junction is not the candidate. Packaging reproduction refuses unexplained existing stage/payload directories; retain the current deliverable before an explicitly requested replacement. Compiled serving helper `reproduction/serve.cjs` supplies baseline4951/candidate4952 with isolated local API, no persistence. Performance helper uses BASELINE_URL, CANDIDATE_URL and E: CHECK_OUTPUT_DIR. Set SMOKE_URL/SMOKE_OUTPUT_DIR or I18N_UI_URL/I18N_UI_OUTPUT_DIR for compiled checks.

Safe local play with an isolated E: profile:

```powershell
& 'E:\Codex\builds\nova-swarm\optimization\win-unpacked\Nova Swarm.exe' --nova-fresh-profile --nova-qa-user-data=E:\Codex\tmp\nova-optimize\play-profile
```

Close before removing that task-owned profile. This blocks production progression, Steam submissions/achievement grants and Cloud identity writes. It is a test build launch, not an installed online verification.

Rollback review command (passed, never applied):

```powershell
git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/optimization/rollback.patch
```

Actual reversal requires reviewing later work and explicit authorization. Never reset HEAD or apply earlier cumulative rollback patches by assumption.

## Next checks

- Play several normal and Tactical runs on the user's display/speakers. Check movement, Focus/Phase, pause/focus loss, death/results/retry, early and Sector51 starts.
- Try broad, precision, burst/Ghost, drone, Chain and piercing builds during late/deep combat; existing encounter regressions cover model ownership/credit, while human counterplay remains judgement.
- Repeat long sessions and rank/world transitions on target hardware while profiling frame tails and memory. Verify installed Steam save/Cloud/leaderboard identity separately when authorized.
- The confirmed bugs found in this audit are fixed. This report does not assert that every possible bug is gone.

Cleanup/current Git receipt is appended to HANDOFF and `cleanup-result.json`. Current candidate/evidence/checkpoints/reproduction and inherited required Steam rollback retained; task-owned staging/profiles/caches removed after path/reparse/process/lock audit. Older blocked material-rebuild finalize.cjs was not touched or retried.

Final receipt: branch codex/sector-leaderboard-unknown-20260928 / HEAD7e8325e, cumulative60 tracked modifications/119 untracked paths. Task-owned temp/staging/native profile/compile cache and Vite cache removed; separate build cache verified absent. Current static/native build/evidence/checkpoints/reproduction and inherited Steam/rollback builds retained. No new cleanup blocked; prior material-rebuild finalize.cjs rejection untouched. E: approximately276.56GiB free. No Steamworks/upload/deploy actions in this pass.

