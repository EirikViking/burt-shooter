# Playthrough, presentation polish and Steam test delivery — 2026-09-30

## Scope and preserved baseline

User authorized a playthrough, stronger visuals/sound and Steam upload. Delivery targets the established `sector-continue-test` beta only. Public/default, other branches, Steamworks settings, production saves/Cloud/progression and staged forum replies are preserved.

Repository: `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`; branch `codex/sector-leaderboard-unknown-20260928`; baseline/HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`. No upstream or matching origin branch. Initial 40 tracked modifications/74 untracked paths matched HANDOFF. Fetch/status/branch/log/worktree audit completed before source edits. No reset, clean, stash, pull, commit, push, branch/worktree/location change or concurrent writing agent. Initial dirty work is retained.

All intensive work uses process-local TEMP/TMP under `E:\Codex\tmp\nova-playthrough-polish`, Vite cache under `E:\dev-cache\vite\nova-playthrough-polish`, output under `E:\Codex\builds\nova-swarm\playthrough-polish`. Source dist and shared dependency junctions are untouched. Never use source dist for this candidate.

## Observations and changes

The finite-life keyboard/autofire prototype run reached Sector 2, rescued two fighters, observed their later Rival return and ended at Game Over around 97 combat seconds, score 9236. No scripted kills, skipped waves, invulnerability or extra lives were granted. Natural respawn protection remains normal. This is automated gameplay observation, not human fun judgement or completion of the endless game. The opt-in natural prototype forbids ranked submission and production progression. Evidence: `evidence/baseline-finite/report.json`, `playthrough.webm`, timed images, pause and Game Over under the output root. A prior harness failed on a null scene reference after Game Over; the null-safe repeat passed without renderer errors.

Observed issues were a small/poorly registered hammer head and dedicated cues attenuated by both their cue gains and existing master/SFX settings. Addressed these with:

- `src/effects/OrbitBreaker.js`: larger 76px hammer, head anchor at the existing physical contact point, warmer short swept trail and a bounded head accent. Radius, damage, cooldown, collision sweep and 12-combat-second expiry unchanged.
- New `src/effects/CombatFinish.js`: two shared prewarmed halo/pressure textures. `PremiumImpacts.js` reuses the same 24 slots, with a small pressure accent rather than spawning extra particles. Finite fade, Flash Intensity and Reduced Motion verified.
- `src/effects/DreadnoughtRig.js`: fitted ion exhaust, core light at the real socket and small pips on existing live power routes. Decorative motion freezes under Reduced Motion. No armor/phase/target/attack changes.
- `src/audio/PremiumSounds.js`: dedicated gains .64–.95, higher charge/arming priorities, bounded priority hold/duck and 160ms repeat-impact cooldown. Existing user volume settings are respected.
- Twenty admitted ElevenLabs WAV cues remastered from preserved originals, capped +8dB and −6.8dBFS peak, unchanged length/format. No new paid generation this pass. Receipt: `docs/audio/playthrough-polish-20260930.json`; original prompt/credit receipt remains intact.

No new text, save schema, score source, health, damage, spawn/scheduler, leaderboard identifier, achievement or reward changes in this polish pass. The earlier Orbit mechanic still changes survival/scoring opportunities through close contact damage and local bullet interception; the prior spectacle-pool allocation change remains disclosed in the premium report. No hidden global score compensation or reset.

Actual runtime Orbit, Breach and Sector 51 screenshots were inspected. Normal key-burst play evidence is `evidence/skill-playtest/shot-2.png`. Breach phase footage uses real component damage in an isolated invulnerable fixture, not natural difficulty evidence. Onslaught launches through actual UI at Sector 51, zero score and three first-level augments; no obsolete Overrun rules. All debug fixtures disable production progression/submission.

Audio assets, actual browser media volume and captured mix were inspected quantitatively. Runtime audio input is unavailable here; no claim of personally hearing the final mix. Per-cue gain increased, no individual sample clipping, final captured default mix peak about −22.1dBFS. Whole-mix before/after means are not comparable because music/cue timing differs. Human listening remains required. No new voice or subtitles claim, no known new untranslated text; native-speaker QA remains.

## Verification

Passed focused pure and actual-renderer checks for head registration, shared fixed pool, accessibility, expiry and cleanup; eight Orbit build/ownership/normal-damage/exact reward/physical bullet-locality transitions; nine encounter evolution groups; integration pause/draft/focus/death/retry; Sector 200 component locks/exact kill; Breach phase capture; safe Sector 51 UI entry; score-pacing/no passive farming; Onslaught contract/policy/profile isolation; premium audio/envelopes; all eight i18n UI languages; controller and Steam Electron bridge.

Full `build:current` passed including repository gates. Final compiled browser smoke passed with zero console/page errors or bad responses. Isolated native static smoke and current packaged fresh-profile render/menu/API/build smoke passed. Package integrity and SDK admission passed. Fresh-profile local smoke intentionally excludes online Steam identity/Cloud/leaderboard: installed-client checks remain manual.

Current static: `E:\Codex\builds\nova-swarm\playthrough-polish\current`; entry `assets/index-QUtPthMz.js`, SHA256 `49208170c9760deabcbe5cd75c24c568fb2e1a28f6cd8208c7c68999771ea5a4`; label `v2026-09-30_19-51-15`. Current package: sibling `win-unpacked\Nova Swarm.exe`, app.asar SHA256 `c06e11ca5fbc117df9342ac9da3d9e7d74ccb478559a6aa01aeb8f1e8109b23f`. Package helper verified 15,535 payload files plus 4,520 retained native runtime files against the stage/baseline. Exact 29 source/public file hashes and source-only rollback are retained in source-state.json and rollback.patch. Package receipt's historical pre-upload branch fields are superseded by fresh steam-before/after.json receipts.

Matched headless Chrome 1280x720 stress fixture: same diagonal Breach, seed/state/inputs/clocks, 320 initial hostile projectiles, repeated capped impacts, 780 measured CPU samples and 180 render gaps after warmup. CPU p95/p99/max ms: baseline 21.0/25.6/34.4; candidate 18.6/21.6/32.2; sustained-hammer fixture 13.0/14.6/27.0. Render-gap p99: 49.9/16.9/16.9ms; >50ms counts 1/0/0. Candidate p50 CPU was higher (10.0 vs 7.8ms), and timing variation prevents claiming universal improvement. No tail regression in this matched sample; hardware/long-session/transition tails remain manual. Hammer fixture deliberately holds it beyond normal expiry for sustained work measurement. Exact report: `evidence/performance/report.json`. Automated tests do not establish fun or AAA quality.

## Reproduce locally

From the existing repository only:

```powershell
New-Item -ItemType Directory -Force E:\Codex\tmp\nova-playthrough-polish,E:\dev-cache\vite\nova-playthrough-polish | Out-Null
$env:TEMP='E:\Codex\tmp\nova-playthrough-polish'
$env:TMP=$env:TEMP
$env:npm_config_cache='E:\dev-cache\npm'
$env:NOVA_SWARM_VITE_CACHE_DIR='E:\dev-cache\vite\nova-playthrough-polish'
npm run check:i18n
npm run build:current -- --outDir E:/Codex/builds/nova-swarm/playthrough-polish/current --emptyOutDir
npx --no-install vite preview --host 127.0.0.1 --port 4912 --outDir E:/Codex/builds/nova-swarm/playthrough-polish/current
```

For source-only opt-in fixtures run `npx --no-install vite --host 127.0.0.1 --port 4910` with the scoped E: cache above and use `http://127.0.0.1:4910/?encounterEvolution=orbit-breaker&autostart=1&offlineLeaderboard=1`, or `encounterEvolution=molt` / `natural`. These prototype routes cannot submit scores or grant production progression. Exact accepted preset names are in `src/config/EncounterEvolutionTest.js`. Never assume matching seed alone reproduces timing/inputs/state.

```powershell
$env:CHECK_URL='http://127.0.0.1:4910'
$env:CHECK_OUTPUT_DIR='E:\Codex\builds\nova-swarm\playthrough-polish\evidence\polish'
node scripts/check-playthrough-polish.mjs
node scripts/check-playthrough-polish-runtime.mjs
node scripts/check-orbit-breaker-runtime.mjs
node scripts/check-encounter-evolution-runtime.mjs
node scripts/check-expansion-integration.mjs
node scripts/check-expansion-deep-runtime.mjs
node scripts/check-premium-audio.mjs
```

Packaging reproduction helper and local playthrough/audio/UI-entry scripts are retained under the output root's `reproduction`. Tuning lives in the four presentation sources above; gameplay Orbit tuning remains in `src/game/OrbitBreaker.js`, and encounter pacing remains in `src/config/EncounterPacing.js` and established state systems. Initial tuning values are hypotheses, not proven optimums.

## Steam test delivery

Uploaded App 4765070 / Windows depot 4765071 to `sector-continue-test`: **BuildID 25635049**, manifest **3289979781526008083**, version **v2026-09-30_19-51-15**. SteamPipe succeeded and fresh authenticated app info confirmed the assignment. Public/default remains 25579437, `test-build` remains 23782673; Cloud settings hash before/after remains `2baeb1acdb90a31ddae4f907711cc6d4ba9bb4724500617046036c93c41d334f`. No Steamworks configuration, public release, media/forum posting or production data reset. Release-line passed before packaging and again before VDF/upload. Receipts, VDF and upload logs are under the owned output root.

Reconnect Steam if CLI authentication disconnected the client. Properties → Betas → `sector-continue-test`; let it update and verify the label. Installed online save/Cloud/leaderboard behavior still needs human verification; fresh-profile local smoke does not establish it.

## Human checks / rollback

1. First pickup: identify hammer head/contact sweep, timer and gaps without narration. Listen at ordinary settings: activation/hits should feel heavy while hostile cues remain clear.
2. Third pickup: seek close contact, use physical bullet interception, then retreat between sweeps. Try broad/slow, Ghost/burst, precision, drones, Chain and piercing builds.
3. First/third Molt, Weaver, Breach and rescue return: distinguish real targets/cover/tether/opening. Test moving cover under autofire/broad/drone fire and recognize returning fighters with voices off.
4. Compare natural early/51/deep frequency, quieter beats, pause/focus/draft/retry, Flash 0/25/100, Reduced Motion, languages/layouts and physical controller.
5. Compare installed-client transitions/long-session frame tails and verify existing save/Cloud/leaderboard identity. Do not reset player data.

Source-only rollback review, verified without applying:

```powershell
git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/playthrough-polish/rollback.patch
```

Actual rollback needs explicit user request and review against later changes; remove `--check` only then. Never reset HEAD. Documentation/history excluded. Steam test-branch rollback target before this upload is BuildID 25627456; no reassignment performed.

Cleanup ownership/audit/result and final Git state are recorded in HANDOFF. Previous automatic-review-rejected cleanup paths are untouched.

Current job cleanup completed after exact resolved-path/reparse/active-process/exclusive-lock audits: removed its E: temporary stage/profiles, Vite cache, packaged-smoke userData and superseded failed-run capture. Helpers retained under reproduction. All four targets verified absent; E: free 316.70GiB. Retained one current static/package version, required comparison baseline, minimal initial dirty/source rollback checkpoint and valid requested evidence/receipts. Previous tasks' blocked cleanup remains recorded in earlier HANDOFF sections and was not retried. Final cumulative Git state: 40 tracked modifications/79 untracked paths, same branch/HEAD. Final 29 source/public hashes reverified unchanged after delivery.
