# Arcade First Light delivery

## Delivered

Steam BuildID **25565501**, AppID **4765070**, depot **4765071**, manifest **6790638237988395803**, is live on private **sector-continue-test**. SteamPipe completed at 2026-09-27 22:40:08 Europe/Oslo; the authenticated Steamworks Builds page was reloaded and verified afterward.

Public/default remains **25511386**. The other test branch remains **23782673**. The previous private build **25564137** is the Steam rollback target. No public release or forum post was made. Steamworks achievement definitions, store settings, Cloud configuration and branch access settings were untouched; only the authorized private build assignment changed.

## Two additions and How to Play

1. **Convoy Breakout.** A detailed prison transport carries two fighters. Shoot its locks to free them. Each fighter escapes into formation and supports normal player fire for up to ten seconds. A completed rescue departs promptly; missed rescues never block waves.
2. **Rival Strike.** A crimson raider has two independently destructible guns. Each broken gun stops its attack. Breaking both exposes the core, whose destruction drops one shield pickup. The encounter yields to major fights and clears its own remaining bullets.

These appear in ordinary combat in sectors 1 and 2, recur in sectors ending in 1 and 2, and are also eligible in Onslaught, Scout and Sector Start. Daily and experimental modes are excluded. Encounters may be skipped when an incompatible major event occupies the window. Pause, death, sector changes and scene destruction clean up their state. No new save format, achievement ID, leaderboard bonus or permanent progression system was introduced. Ordinary assist-shot kills still use existing combat and scoring paths.

How to Play has a new illustrated ENCOUNTERS page. All new text is translated in English, German, Spanish, Russian, Simplified Chinese, Brazilian Portuguese, Korean and Japanese. No new untranslated fallback/TODO remains. Audio reuses existing English game sounds. Reduced motion and zero flash are respected. The player and enemy bullets render in front of the encounter hull.

## Source provenance

- Repository: `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`, verified real D path.
- Baseline: `3874bd5480c5fb38d7bfbd7835b01008c4948bee`, initially clean, 1204 commits ahead and zero behind fetched origin/HEAD.
- Branch: `codex/arcade-first-light-20260927`.
- Runtime commits: `de0a667` and **`7a7cb70a42ee00e351264040c4e133e9b73698c2`**.
- Package: **v2026-09-27_22-23-51**, embedded source **7a7cb70**. Later documentation commits do not change this runtime.
- Remote: `https://github.com/EirikViking/burt-shooter.git`; fetched origin/HEAD `5ff4b249f986881a3f06db0dc2b550d929747fd1`.
- No pull, push, reset, history rewrite, inherited-work discard, or Forum 129 source editing.
- Root was the sole source editor; advisors performed isolated research, art/localization preparation and read-only review.

Builds used a verified real E staging copy, because this D checkout's inherited dist and dependency junctions must not be used for output. TEMP/TMP, Vite outputs, Electron package output and tool caches were explicitly configured on E. Generated image tool output in application-managed storage was copied to E for processing; canonical WebP game assets are saved in D source.

## Exact files changed

Runtime, assets and checks:

```text
public/art/first-light/prison-transport.webp
public/art/first-light/rival-core-hull.webp
scripts/check-arcade-first-light.mjs
scripts/check-first-light-runtime.mjs
src/effects/ArcadeFirstLightVisual.js
src/game/ArcadeFirstLight.js
src/i18n/firstLightText.js
src/i18n/locales/de.js
src/i18n/locales/en.js
src/i18n/locales/es.js
src/i18n/locales/ja.js
src/i18n/locales/ko.js
src/i18n/locales/pt-BR.js
src/i18n/locales/ru.js
src/i18n/locales/zh-CN.js
src/main.js
src/managers/ArcadeFirstLightDirector.js
src/scenes/PlayScene.js
src/ui/HowToPlayOverlay.js
src/ui/TrainingIllustration.js
```

Documentation:

```text
docs/art/first-light-generation.json
docs/superpowers/plans/2026-09-27-arcade-first-light.md
docs/superpowers/specs/2026-09-27-arcade-first-light-design.md
docs/steam/arcade-first-light-20260927.md
progress.md
```

## Verification

| Check | Result |
| --- | --- |
| Pure encounter regression | PASS, initially demonstrated missing-module failure before implementation. Admission, modes, cadence, pause, damage order, projectile deduplication, expiration, rewards and cancellation. |
| Source runtime regression | PASS. Natural encounter scheduling, real Bullet instances, two rescues, support shots, rival gun/core damage, shield only once, bomb area damage, sector 51/52 and lifecycle cleanup. |
| Real input playtest | PASS using the develop-web-game client with normal Chrome rendering. Actual movement/fire rescued both fighters. Screenshot and state retained. |
| Packaged encounter regression | PASS against the shipped executable. Same real projectile and lifecycle coverage, plus loaded art and illustrated How to Play; no page errors. |
| Accessibility/responsive review | PASS. Compact German layout, zero flash, reduced motion, target bounds and player visibility. Actual screenshots reviewed. |
| Independent source review | Three findings fixed and rechecked: player occlusion, actual major-warning handles and stale completed instructions. No remaining blocker from those findings. |
| `npm run check:i18n` | PASS, all eight locales. |
| `npm run check:i18n-ui` | PASS, all eight locales; no page errors, placeholder hits or English leaks. Separate new help-page coverage in all eight languages also passed. |
| `npm run check:controller-flow` | PASS. |
| `npm run check:steam-electron-bridge` | PASS. |
| `npm run check:release-line` | PASS before packaging, VDF preparation and upload; localization, Cloud and marketing markers present. |
| `npm run build:current` | PASS including repository preflight gates. After the final caption sizing fix, a final Vite production rebuild passed; final UI/native checks used that rebuild. |
| `npm run smoke` | PASS on the final production preview, no warnings/errors, page errors or bad responses. First attempt hit the existing 15 second startup deadline while native tests ran concurrently; unchanged test passed when rerun alone. |
| `npm run package:steam:win:current` | PASS, including SDK and native runtime package checks. |
| Source Electron smoke | PASS using the same `electron electron/main.cjs --smoke` entry point as desktop:smoke:current, with the canonical shutdown patch already verified by packaging and explicit fresh profile. |
| Packaged native smoke and controls | PASS. Keyboard/gamepad movement, fire and pause. Fresh-profile isolation probes rejected all attempted platform writes. |
| Packaged native performance | PASS, 60 seconds: average 60.045 FPS, minimum 59.524 FPS; no warnings or errors. |
| Source/staging identity | PASS: SHA-256 for all 20 changed runtime/asset/test files matched D and E. 415 regular payload files hashed; SteamPipe's 477-entry listing includes directories. |
| Git whitespace check | PASS with `core.whitespace=cr-at-eol`, accounting for inherited mixed line endings. |

The initial skill-client software-rendering attempt was too slow and reached the startup watchdog. That harness attempt was replaced with native/default Chrome rendering and real input verification; no game assertion was weakened. Native package tests used normal rendering. Performance figures describe this machine and these scenarios, not every device or long-run balance. No player-retention increase or human playtest result is claimed. No real player achievements, saves, Cloud data or live leaderboard scores were changed during QA.

## Art and evidence

Current executable: `E:\Codex\builds\nova-swarm\arcade-first-light\win-unpacked\Nova Swarm.exe`.

Evidence: `E:\Codex\builds\nova-swarm\arcade-first-light\evidence`. Includes source and payload hashes, package reports, eight-language UI checks, actual input/state captures, packaged encounter screenshots, native performance/control reports, Steam VDF/receipts and branch screenshot/readback. Native test adapters are retained for reproducibility with the E staging copy.

Unique editable art originals: `E:\Codex\builds\nova-swarm\arcade-first-light\art-source`. Prompts and conversion details: `docs/art/first-light-generation.json`.

## Cleanup limitation

Source/build/test processes were stopped and active Codex tasks checked. Ownership and resolved E paths were audited; there were no reparse points or active users of the disposable trees. Automatic approval review nevertheless rejected the cleanup command as **blocked by policy**, before execution. It was not retried or bypassed.

Remaining disposable paths:

```text
E:\Codex\builds\nova-swarm\arcade-first-light\source
E:\Codex\tmp\nova-arcade-first-light
E:\Codex\builds\nova-swarm\arcade-first-light\builder-debug.yml
E:\Codex\builds\nova-swarm\arcade-first-light\evidence\browser-smoke\failure-1.png
E:\Codex\builds\nova-swarm\arcade-first-light\evidence\browser-smoke\failure-2.png
E:\Codex\builds\nova-swarm\arcade-first-light\evidence\browser-smoke\failure-state.json
```

The two trees total approximately **5.24 GiB**. E free space after delivery: **348.43 GiB**. Current package, evidence, unique artwork, shared caches and inherited previous builds were retained. Cleanup is **not complete**. Earlier unrelated cleanup denials remain untouched.

## Rollback

On this delivery branch at its delivered tip, with a clean working tree, source rollback is `git revert 3874bd5480c5fb38d7bfbd7835b01008c4948bee..HEAD`. This reverts the delivery documentation before the feature commits, avoiding conflicts with later edits to newly introduced documents. It creates normal revert commits and does not reset history. Do not apply that open-ended range after adding unrelated commits. Repackage before any later upload. Private Steam rollback target is **25564137**; no rollback was performed.
