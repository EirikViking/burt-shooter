# Premium encounter presentation and Orbit Breaker — 2026-09-30

## Current result

Local implementation, uncommitted and unpublished. Source remains `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`, branch `codex/sector-leaderboard-unknown-20260928`, baseline/HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`, with no upstream or same-named origin branch. The initial 31 tracked modifications and 51 untracked paths were preserved. The user's explicit preservation/no-switch instruction overrides the clean-start/worktree rule. No concurrent writing agents were used.

Current playable browser payload: `E:\Codex\builds\nova-swarm\premium-presentation\current`, entry **index-PTO1-ZuU.js**. Its inherited version label is `v2026-09-30_09-21-18`; identify this dirty local candidate by the entry/hash manifest rather than that label alone. Source `dist` still points at the older build; shared dependencies were not installed or modified.

The previous Steam test delivery, BuildID 25627456 on `sector-continue-test`, contains the preceding encounter expansion. **It does not contain this visual/audio/Orbit pass.** No upload, deploy, Steamworks change, forum post, commit, push, player reset or save-schema change occurred in this pass. Prior quoted forum replies remain staged under `docs/steam/drafts/20260930-review-index.md`.

## What changed

- **Orbit Breaker:** one temporary armored hammer revolves around the ship for 12 combat seconds, with a visible swept trail, activation cue and material impact sound. It damages nearby enemies and currently exposed encounter parts through their normal armor, lock, ownership and reward rules. It intercepts hostile projectiles only where its swing passes. Refreshing retains the same hammer/angle; expiry and run cleanup remove it. No invulnerability or full-circle bullet shield.
- **Dreadnought:** fitted hull halves, articulated batteries, recoil and charge details, fractures, visible hull opening around the real target and a finite staged collapse. Decorative reactor housing aligns with the actual target. Existing component health/reward budget and both layouts remain intact.
- **Molt:** fitted armor/scales, a distinct exposed head/spine/tail and identifiable detached plates. The real cover interaction, mother/brood ownership and retreat behavior remain intact.
- **Weaver:** attached claws, real wreck assembly, readable anchor/cradle/weapon and tether tension. The crossover platform retains its horizontal plate orientation. Normal reconstruction/interrupt/arming rules remain intact.
- **Rescued fighters:** consistent paired art/livery, correct ship orientation and ion plumes in captivity, rescue and return, with one arrival/departure cue. The earned one-return intervention and bounded side-weapon budget are unchanged.
- **Environment/Fusions:** fitted real wreck/relay/turret art, a cradle around the actual captured gun and two cached finite Phase shutters. Gameplay selection and earned fire allocation are unchanged.
- **Combat response:** a prewarmed 24-slot impact pool with bounded size and lifetime. Reduced Motion suppresses decorative movement/trails; Flash Intensity scales accents. No input-locking presentation or new combat HUD panel.

Four admitted true-alpha art sheets provide 22 cached frame rectangles. `public/art/encounter-premium/provenance.json` records provider, exact prompts, source hashes and the normalized 192×192 pickup icon. Generated assets are in-game; human art-direction judgement remains necessary.

Twenty ElevenLabs SFX were generated and mastered as mono 44.1 kHz, 16-bit WAVs. The account counter moved 4382→4499: **117 observed credits**, within the approved 4,000-credit ceiling. Estimate was 896; this is not a dollar-cost assertion. Receipt, request details, mastering and validation: `docs/audio/premium-presentation-20260930.json`. Raw unique MP3 sources are retained in the owned E: build root for reproduction. No new voice dialogue or localized-audio/subtitle claim.

## Files and tuning

Exact initial/current hashes and source-only patch: `E:\Codex\builds\nova-swarm\premium-presentation\source-state.json` and `rollback.patch`. These compare against the initial dirty checkpoint, preserving earlier work.

| Area | Main files / tuning |
|---|---|
| Hammer behavior | `src/game/OrbitBreaker.js`: duration 12s, revolution 1.1s, radius 86, hit radius 18, cooldown 0.6s, at most 12 sweep samples and six enemy/part contacts per tick |
| Hammer runtime | `src/effects/OrbitBreaker.js`: normal damage path, damage clamp 2–8 from bullet damage ×2.5; bounded trail, bullet and neutral-cover interactions |
| Pickup lifecycle | `src/entities/Player.js`, `src/config/PowerupCatalog.js`, `src/managers/PowerupManager.js` |
| Art/effects | `src/effects/PremiumArt.js`, `PremiumImpacts.js`, `DreadnoughtRig.js`, `src/game/PremiumPresentation.js`; shared manifest/prewarm integration in `assetManifest.js`, `GameAssets.js`, `ParticleManager.js` and `PlayScene.js` |
| Encounter presentation | `DreadnoughtBoss.js`, `BreachCollapse.js`, `SerpentMolt.js`, `SpaceSnake.js`, `WreckweaverReassembly.js`, `ArcadeFirstLightVisual.js`, `ArcadeFirstLightDirector.js`, `AuthoredEnvironment.js`, `CombatWreckVisual.js`, `BehavioralFusions.js` |
| Audio | `src/audio/PremiumSounds.js`, `SoundCatalog.js`, `public/audio/sfx/encounter-premium/`; cue priorities/intervals preserve gameplay RNG |
| Text | `src/i18n/orbitBreakerText.js`, `powerupExpansionSourceText.js`: complete mapping for all eight supported locales |
| Safe fixtures | `EncounterEvolutionTest.js`, `EncounterExpansionTest.js`; regression/capture scripts listed below |

Initial hammer values are tuning hypotheses. The existing 24% spectacle pickup pool now has 16 outcomes instead of 15: each previous pool outcome's relative share falls by 6.25%. There are no extra drops, but close-range damage and local bullet interception change scoring/survival opportunities. Existing formulas, board identifiers and global scoring are unchanged; no hidden compensation or leaderboard reset. Chain/Pierce pickup transitions were tested using the existing offense-slot rules, not an invented simultaneous stacking rule. Pure gets the normal pickup without Tactical builds being added to Pure.

## Verification

Passed on the current source/candidate:

- Pure presentation envelopes, accessibility and Orbit sweep/cooldown/ellipse/reset checks; existing evolution/expansion/score-pacing and forum regressions.
- Actual hammer renderer: zero-delta safety, exactly one kill/reward, physical bullet interception with distant bullet retained, no duplicate credit, refresh without stacking, component locks, ordinary gun damage, finite effects, expiry before next hit and reset.
- Low damage, Ghost/burst, broad/slow, precision, drone, Chain and piercing fixture transitions; pause, draft and focus-loss gates; scene cleanup. Existing encounter integration checks include actual retry reset.
- Latest nine Molt/Payback groups; Weaver reconstruction/crossover; all environment variants; both Breach layouts with exactly-once kill, finite collapse and wave completion; actual Crown captured ammunition and earned Rift allocation.
- A delayed-art launch regression reproduced a real null-texture Fusion boot race. Echo sprites now obtain their texture when activated after prewarm. The original delayed-launch case passes. No production diagnostics were weakened to satisfy a test.
- Real runtime images/video inspected for Molt, Weaver, fighters, Breach phases, collapse and Orbit. Keyboard prototype natural run rescued two fighters in Sector 1 and spent the callback in Sector 2 at about 80.9 combat seconds. It used an invulnerable pilot: not a human difficulty/frequency result.
- All-eight-language UI, controller flow, Steam bridge, Onslaught contract/policy/profile isolation, score accounting, full `build:current` gates, isolated fresh-profile native smoke and production browser smoke. Final browser smoke: zero console errors, page errors or bad responses.
- Legacy four Tactical protocols passed on the explicit current Vite preview; static catalog checks also cover the six-protocol catalog. New two-protocol mechanics have separate real-renderer tests.
- Art alpha/frame/hash admission, powerup assets/catalog guards, 20 audio files (finite, non-silent, unclipped) and audio asset/catalog checks. No known new untranslated text; translations still need native-speaker QA.

One smoke harness improvement closes its completed first page before opening later independent fixtures. All assertions and timeouts remain. An intermediate simple-file-server run returned `/api/highscores` 404s; the final repository Vite preview run passed. An initial Tactical check accidentally used the stale `dist` default and wrote a D: test-results leaf; it is not candidate evidence. The valid replacement is under the owned E: evidence root, and the disposable D: leaf is included in cleanup. An earlier concurrent Tactical startup timed out without a game error; an idle current-preview rerun passed without changing the game.

### Frame-time comparison

Sequential headless Chrome, 1280×720, same relevant seed, Breach layout, input/timing and clocks; 320 initial hostile shots plus 24 requested local hit sparks every four frames. Each case: 120 warmup/780 CPU samples with alternate-frame rendering, then 120 warmup/180 live combat/render gaps. ParticleManager updated in both builds. Stress hammer held active beyond its normal expiry solely for measurement. Report: `evidence/performance/report.json`.

| Case | CPU p95 / p99 / max (ms) | Render gap p95 / p99 / max (ms) | >50ms samples |
|---|---|---|---|
| Retained baseline | 10.8 / 12.5 / 16.5 | 17.1 / 17.3 / 17.3 | 0 |
| Current presentation | 10.5 / 11.8 / 14.2 | 17.1 / 17.2 / 17.5 | 0 |
| Current + hammer | 10.2 / 11.5 / **29.3** | 17.1 / 17.3 / 17.3 | 0 |

The hammer CPU maximum increased. This finite local fixture does not establish better performance, universal absence of stutters or shipping-client GPU/transition/long-session tails. The prior `encounter-expansion/current` comparison is explicitly retained for that outstanding hardware check.

## Exact local commands

Run PowerShell from the existing repository. Create only the approved task temporary directory if cleanup removed it; never switch source location, branch or worktree. Check E: space and resolved paths first.

```powershell
New-Item -ItemType Directory -Force 'E:\Codex\tmp\nova-premium-presentation' | Out-Null
$env:TEMP='E:\Codex\tmp\nova-premium-presentation'
$env:TMP=$env:TEMP
$env:NOVA_SWARM_VITE_CACHE_DIR='E:\dev-cache\vite\nova-premium-presentation'
$env:npm_config_cache='E:\dev-cache\npm'
node scripts/check-premium-presentation.mjs
node scripts/check-orbit-breaker.mjs
node scripts/check-premium-audio.mjs
npm run check:i18n
npm run build:current -- --outDir E:/Codex/builds/nova-swarm/premium-presentation/current --emptyOutDir
```

The full current build passed. The final small pose change was then compiled with `reproduction/compile-current.mjs`, which verifies the hashes of all 27 premium copied public files before reusing the successful full payload. Do not reuse that shortcut after changing public assets.

Source server, in another terminal in this same directory with the same environment:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4899 --strictPort
```

Open `http://127.0.0.1:4899/?encounterEvolution=orbit-breaker&autostart=1&offlineLeaderboard=1`. Select a hull if Hangar is shown. Representative natural prototype: change `orbit-breaker` to `natural`. Existing safe routes for `molt`, `payback`, `reassembly` and `breach` are described in the preceding encounter reports. These loopback DEV routes apply prototype policy before launch and disable production progression/submission; they are rejected by production/Desktop builds. Pause and normal controls remain active.

```powershell
$env:CHECK_URL='http://127.0.0.1:4899'
$env:CHECK_OUTPUT_DIR='E:\Codex\builds\nova-swarm\premium-presentation\evidence\orbit-final'
node scripts/check-orbit-breaker-runtime.mjs
node scripts/check-premium-prewarm-runtime.mjs
```

For current production preview (no forced DEV fixture), use the explicit E: output:

```powershell
node node_modules/vite/bin/vite.js preview --outDir E:/Codex/builds/nova-swarm/premium-presentation/current --host 127.0.0.1 --port 4902 --strictPort
```

In a separate terminal with E: TEMP/TMP:

```powershell
$env:SMOKE_URL='http://127.0.0.1:4902'
$env:SMOKE_OUTPUT_DIR='E:\Codex\builds\nova-swarm\premium-presentation\evidence\smoke'
node scripts/smoke-playtest.mjs
$env:CHECK_URL='http://127.0.0.1:4902'
$env:CHECK_OUTPUT_DIR='E:\Codex\builds\nova-swarm\premium-presentation\evidence\tactical'
node scripts/check-tactical-fusion-protocols.mjs
node scripts/check-premium-desktop.mjs
```

Use existing i18n/controller scripts with their explicit URL/output environment conventions, as recorded in the prior expansion report. Never omit the explicit current URL and accidentally test the stale `dist` junction. Runtime test reports/captures are local opt-in files; no combat HUD clutter or network telemetry was added. Fixture state records policy, contact/damage/credit/cleanup; audio/art/source manifests record reproduction inputs.

## Human playtest checklist / next step

1. First Orbit pickup: can a player understand the physical swing and remaining timer without an explanation or voices? Do hits feel heavy at normal SFX volume without masking hostile cues?
2. Use the hammer to approach a side gun, then try to stay safe between sweeps. Confirm it feels useful without becoming a full shield or trivial boss deletion. Try broad/slow, precision, Ghost, permanent drones and offense pickup replacement.
3. First Molt/Weaver/Breach sighting: distinguish the actual targets, openings, tether and moving cover. Check firing-lane decisions under autofire and broad/drone fire. Third sighting must still offer a target/position choice.
4. Recognize the same rescued pair on return with voices off. Check the short opening is useful without winning the Rival for the player.
5. Repeat muted/reduced-motion/Flash Intensity 0/25/100, supported layouts/languages, physical controller, pause/focus loss, draft, death/retry and simultaneous part kills.
6. Play normal-paced early, Sector 51 and deep sessions. Observe ordinary/quiet intervals and natural encounter/pickup frequency; fixture timing is not frequency evidence. Compare installed-client frame tails, transitions and a long session against the retained baseline.

Automated tests do not establish fun or an “AAA+” quality level. Final art direction, sound feel/mix, native-language judgement, physical controller feel and installed Steam save/Cloud/leaderboard identity remain manual checks. Finish these before requesting a new test upload or release.

## Preservation, rollback and cleanup

Source-only rollback review (verified without applying):

```powershell
git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/premium-presentation/rollback.patch
```

If the user explicitly requests rollback, review the manifest for subsequent changes first, then use the same command without `--check`. Never reset HEAD: it would discard inherited work. Documentation/history is deliberately excluded from the rollback patch.

Final ownership/process/reparse/lock audit and exact cleanup outcomes are recorded in `E:\Codex\builds\nova-swarm\premium-presentation\cleanup-audit.json` and the latest HANDOFF section. Retain one current build, minimal initial dirty checkpoint/reproduction helpers, unique generated assets/audio sources and valid requested evidence. The active trailer chat uses its own `E:\Codex\tmp\nova-trailer-latest` and trailer build paths; those are untouched. Previous tasks' automatic-review-rejected cleanup is also untouched.

Cleanup was **rejected before execution by automatic approval review: “blocked by policy.”** No retry or workaround. All nine audited targets remain: the E: task temp/cache, superseded JS chunk and Breach video, three failed-smoke artifacts, one failed-controller image, and the accidental D: Tactical leaf. Exact paths are in HANDOFF/audit. About 323.72 GiB remained free on E:; cleanup is not complete. All owned servers/tests have stopped. Final cumulative Git state is 40 tracked modifications/74 untracked paths; source manifest has 72 current changed/new source/asset paths.
