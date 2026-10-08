# First Light polish and repairs

## Scope and provenance

Source: `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`.
Branch: `codex/first-light-polish-20260927`.
Clean baseline: `96e85405ebec3eeadfe049176f4ee6051c86d66c`.
Fetched origin/HEAD: `5ff4b249f986881a3f06db0dc2b550d929747fd1`, baseline 1208 ahead and zero behind.
Remote: `https://github.com/EirikViking/burt-shooter.git`.

Root is the only source editor. Advisors used isolated E scratch for art, audio, review and tests. No pull, push, reset, rewritten history, inherited work discard or Forum 129 source edits. The inherited D dependency and dist junctions are preserved. Builds use a real E staging copy with TEMP/TMP, caches and outputs explicitly set on E.

## Changes and causes

* Convoys previously canceled themselves and their earned escorts at major/sector transitions. Escort lifetime also elapsed during noncombat intervals. Encounters now suspend and resume; escort service counts ten seconds of ordinary combat. Two fighters visibly join using actual loaded hull textures. Loading retries, swept projectile contact and a separate visual joining clock address invisible fighters and missed fast shots. Support remains excluded from major encounters, including same-frame transitions and in-flight escort shots. Pause/death/destruction are covered.
* Four convoy designs: Bastion, Talon, Pearl, Ark. Six rival designs: Ravager, Lancer, Forge, Vortex, Wasp, Oracle. Distinct silhouettes, materials, movement and mount patterns. Selection cycles through the fleet without consuming gameplay RNG. Rival guns detach individually, exposing the reactor, with textured debris and an animated impact material. Damage, health and projectile count budgets remain as before; encounter persistence makes earned rewards more reliable.
* Twenty new ElevenLabs effects: a unique arrival for each of ten hulls, rescue/lock/departure cues, two weapon sound families, exposed reactor, destruction and retreat. No oscillator substitutes. All shipped WAVs match masters, decode completely and have no clipped/nonfinite samples. Worst measured 4x oversampled peak is -7.085 dBFS. This is technical audio verification, not a claim of human listening approval or measured retention improvement.
* Boss fire uses an eight-frame transparent material with moving combustion heads, stable texture scale, feathered contact floor and bounded draw counts. Timing, collision geometry and damage are unchanged. Reduced motion/zero flash keep the hazard visible. A rendering test initially confused decorative edge-guide width with contact geometry; the repaired test separately bounds guides while keeping strict fire containment.
* Arcade's result medal used a lower local record and reconciled Steam confirmation only for Onslaught. Steam-backed modes now wait for the matching board's strict record improvement. A lower/equal score or unchanged Steam record cannot retain the medal or carry banner. Local-only records and Overrun Pure retain their existing behavior. Actual UI fixture reproduces 133,847 versus 718,597 and now shows Best unchanged without the medal.
* Career Signal animated unconditionally from accumulated progress, without read state. A profile-scoped signature now records what was viewed, starts legacy profiles quietly and stops the alert immediately upon reading. Resize, storage-write failure and account separation are covered. Career progress itself is untouched.
* Ten Threat Codex entries and updated How to Play instructions are translated in all eight supported interface languages. Ship names intentionally remain proper names. No new untranslated fallback/TODO remains. Audio is not localized.

## Simulated runs and checks before packaging

Two normal Arcade sessions used actual keyboard/mouse movement and the game's real projectile collision path. Each rescued both fighters. The mouse run defeated Oracle normally; the keyboard run destroyed both Forge guns. An isolated Onslaught sector 51 diagnostic with invulnerability reached wave five and exercised rescue support. No game errors were observed. These are short verification runs, not comparative difficulty measurements.

Source checks pass: encounter pure/regression tests, 13 personal-best/Career fixtures, runtime admission/rescue/rival/transition/reward checks, all ten designs, all eight help locales, Codex catalog, i18n, Steam bridge and release-line gate. Boss coverage: 300 attack parity cases, 1800 direction cases, 30 assault cases and 40 rendering fields. Actual Codex, lower-score result and acknowledged Career UI screenshots were inspected. Final packaged/build results are recorded below.

See `first-light-difficulty-audit-20260928.md` for the separate historical comparison. Builds 25564137 and newer contain real easing changes: roughly 26% lower snake section HP, 25% fewer eligible random snake waves, stronger Ghost protection, effective Draft upgrades, and convoy/shield rewards. Late boss pressure and several excess-power fixes counteract some of this. No defensible global difficulty percentage is established, and this audit does not retune balance.

## Delivery

**Build 25567983 is live on private `sector-continue-test`.** SteamPipe succeeded on 2026-09-28 at 02:33:38 Europe/Oslo. A fresh authenticated Steamworks Builds page readback confirmed the assignment. Public/default remains **25511386** and the separate `test-build` remains **23782673**. Previous private build **25565501** is the Steam rollback target; no rollback was performed.

* App: `4765070`; depot: `4765071`; manifest: `7255309668189513018`.
* Packaged runtime: `ecf2713b47f6517fe9d1d7d2d708ef9d3bde82b8`; stamp: `v2026-09-28_02-02-30`.
* Implementation commits: `d7f2a7ad57d699e69adf8d9690a345b3c7799d7c`, `7e48f45c3a2b75e8a7f6916db92433f6e9617fba`, `ecf2713b47f6517fe9d1d7d2d708ef9d3bde82b8`. A subsequent documentation-only commit records delivery and cleanup.
* Current executable: `E:\Codex\builds\nova-swarm\first-light-polish\win-unpacked\Nova Swarm.exe`.
* Evidence root: `E:\Codex\builds\nova-swarm\first-light-polish\evidence`. It includes upload/depot receipts, private VDF, fresh branch readback and screenshot, build/package logs, source provenance, test results and screenshots.
* All 62 changed files matched the E build copy before packaging. The payload manifest covers 415 files / 2,717,596,225 bytes; manifest hash `1ad7fb6bcae6cad21ae6012dc4abd740bc801482c0dc2d1237a5439cba22b504`.

No public release or forum post was made. Steamworks configuration, achievements, leaderboard definitions, store and Cloud settings were untouched. The only Steam deployment change was the authorized private test upload/branch assignment. Tests used isolated profiles and mock Steam data, without changing real player saves, achievements or leaderboard scores. GitHub was not synchronized.

## Final verification

| Check | Result |
| --- | --- |
| `check-arcade-first-light.mjs`, `check-first-light-regressions.mjs` | Pass; lifecycle, rewards, fast projectiles, pause/death and regression fixtures. |
| `check-personal-best-career.cjs` | Pass; 13 actual-method fixtures cover Steam reconciliation, local-only behavior, account/read state and failed storage writes. |
| `check-first-light-runtime.mjs` and packaged encounter check | Pass; natural admission, real projectile/bomb collisions, both rescues, all ten designs, rival mount/core sequencing, one shield, phase transitions and accessibility. |
| Boss parity / balance / rendering / runtime | Pass; 300 parity cases, 1800 directions, 30 assault cases, 40 rendering fields; strict hazard geometry, draw budget and zero gameplay RNG changes. |
| Codex catalog / copy | Pass; complete distinct translated advice and current lore metadata. Compact German Oracle advice was corrected after visual review. |
| `npm run check:i18n` | Pass; all eight locales, no new untranslated fallback/TODO. |
| `npm run check:steam-electron-bridge` and `npm run check:release-line` | Pass; required German/top3 localization, marketing and release markers present. Release gate passed before packaging and upload. |
| `npm run build:current` | Pass; existing large-chunk advisory remains. |
| `npm run check:i18n-ui` | Pass against production output, all eight locales; Settings, menu, gameplay/HUD, pause, results and empty/populated leaderboard captures. No reported console/page/placeholder or unintended English leaks. |
| `npm run smoke` and `npm run check:controller-flow` | Pass against current production output. |
| `npm run package:steam:win:current` | Pass; verified E output/cache/temp paths, runtime SDK and native package checks. |
| Source Electron smoke and packaged smoke | Pass using isolated fresh profiles. |
| Packaged keyboard/gamepad controls | Pass; movement, firing and pause. |
| Packaged 60-second performance run | Pass; average 59.946 FPS, minimum 59.880 FPS on this machine/scenario, no game errors. |
| Three simulated gameplay sessions | Pass for exercised paths; two normal Arcade runs and one invulnerable Onslaught diagnostic. Both Arcade runs rescued two fighters. |
| Audio decode / master comparison | Pass for all 20 WAVs; no clipping/nonfinite samples, worst 4x oversampled peak -7.085 dBFS. |

These checks verify the tested scenarios, not every possible run. Fresh-profile native tests intentionally isolate Steam, so they are not live achievement or leaderboard submission validation. Short runs and source history do not establish a global difficulty percentage, player retention or subjective audio approval. No difficulty retuning was made in this task; preserving earned escort service can increase the support players actually receive.

## Rollback

At this delivery tip, revert this task's commits without rewriting history:

```powershell
git revert 96e85405ebec3eeadfe049176f4ee6051c86d66c..HEAD
```

Use the recorded delivery commit instead of `HEAD` if later unrelated commits have been added. Steam rollback, if requested, is private branch build `25565501`.

## Cleanup and retained artifacts

The task's E build copy, temporary test profiles, compile/Vite caches, failed/intermediate exports, duplicate asset copies and Steam upload scratch were removed after ownership, resolved-path, reparse-point and process checks. Windows initially left nonempty staging directories; native PowerShell removal of files and then verified empty directories completed successfully. The copied `.git` pointer was an ordinary staging file, not a registered worktree or directory link; the D checkout and shared Git metadata remain intact. The task's accidental D test outputs were removed after preserving useful evidence. No inherited build or shared cache was removed.

Only the current `win-unpacked` deliverable, unique `art-source`, unique `audio-source` and verification `evidence` directories are retained under `E:\Codex\builds\nova-swarm\first-light-polish`. Source and permanent generated assets are committed in D.

One cleanup item remains blocked: automatic approval review rejected deletion of `E:\Codex\tmp\nova-first-light-polish\ui-review\browser-temp\chrome_chrome_url_fetcher_33136_401462282`. That directory and its browser-temp parent were excluded from subsequent cleanup; no bypass or retry was attempted. The outer temporary directories remain to contain it. Cleanup is therefore partial for this explicitly blocked cache only.

Final cleanup evidence is `evidence/cleanup-audit.json` and `evidence/cleanup-result.json`. The current executable still exists; all approved cleanup candidates are gone. E free space at verification: **371,143,606,272 bytes**, approximately **345.7 GiB**.

## Exact files changed

Paths are relative to the verified D source root. This list includes source, assets, tests and documentation; disposable build outputs are outside Git.

```text
docs/art/colossus-fire-generation.json
docs/art/first-light-impact-generation.json
docs/art/first-light-polish-assets.json
docs/audio/first-light-elevenlabs.json
docs/reviews/first-light-difficulty-audit-20260928.md
docs/reviews/first-light-polish-20260928.md
progress.md
public/art/first-light/boss-fire-atlas.webp
public/art/first-light/convoy-ark.webp
public/art/first-light/convoy-pearl.webp
public/art/first-light/convoy-talon.webp
public/art/first-light/impact-atlas.webp
public/art/first-light/rival-forge.webp
public/art/first-light/rival-lancer.webp
public/art/first-light/rival-oracle.webp
public/art/first-light/rival-vortex.webp
public/art/first-light/rival-wasp.webp
public/audio/sfx/first-light/convoy_ark_arrive.wav
public/audio/sfx/first-light/convoy_bastion_arrive.wav
public/audio/sfx/first-light/convoy_depart.wav
public/audio/sfx/first-light/convoy_lock_break.wav
public/audio/sfx/first-light/convoy_pearl_arrive.wav
public/audio/sfx/first-light/convoy_rescue_join.wav
public/audio/sfx/first-light/convoy_talon_arrive.wav
public/audio/sfx/first-light/rival_charge_exotic.wav
public/audio/sfx/first-light/rival_charge_mechanical.wav
public/audio/sfx/first-light/rival_core_exposed.wav
public/audio/sfx/first-light/rival_destroy.wav
public/audio/sfx/first-light/rival_fire_exotic.wav
public/audio/sfx/first-light/rival_fire_mechanical.wav
public/audio/sfx/first-light/rival_forge_arrive.wav
public/audio/sfx/first-light/rival_lancer_arrive.wav
public/audio/sfx/first-light/rival_oracle_arrive.wav
public/audio/sfx/first-light/rival_ravager_arrive.wav
public/audio/sfx/first-light/rival_retreat.wav
public/audio/sfx/first-light/rival_vortex_arrive.wav
public/audio/sfx/first-light/rival_wasp_arrive.wav
scripts/check-arcade-first-light.mjs
scripts/check-colossus-balance.mjs
scripts/check-colossus-rendering.mjs
scripts/check-feedback-boss-runtime.cjs
scripts/check-first-light-regressions.mjs
scripts/check-first-light-runtime.mjs
scripts/check-personal-best-career.cjs
scripts/prepare-first-light-assets.mjs
src/assets/assetManifest.js
src/audio/FirstLightSounds.js
src/audio/SoundCatalog.js
src/config/FirstLightDesigns.js
src/config/ThreatCodexCatalog.js
src/effects/ArcadeFirstLightVisual.js
src/effects/ColossusAssaultVfx.js
src/effects/ColossusFireMaterial.js
src/entities/Bullet.js
src/game/ArcadeFirstLight.js
src/i18n/firstLightExpansionText.js
src/i18n/firstLightText.js
src/managers/ArcadeFirstLightDirector.js
src/profile/ProfileStorageNamespace.js
src/progression/CareerSignalState.js
src/scenes/GameOverScene.js
src/scenes/ShipSelectScene.js
```
