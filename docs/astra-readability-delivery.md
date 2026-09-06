# Opening combat readability — local delivery

Implemented a focused opening-sector clarity pass. Hostile shots use a consistent warm palette with dark keylines; ordinary early enemies and the neutral player have quieter locators; warning fields separate charging and firing; secondary notices wait for a combat lull; immediate death advice includes the tracked damage category.

## Provenance and launch
- Workspace: D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822
- Branch: codex/astra-visual-overhaul
- Clean baseline: e8f635e10996b92e976b03d92308f497be711d6f
- Runtime checkpoint: 3d95d861049d9b955edf823cba9667677630a638 (verified inside packaged ASAR).
- Runtime implementation checkpoint: a96ff4930c523fc03770929266dbba435d1d433d.
- Windows executable: test-results/astra-build-2026-09-06T11-48-26-955Z/win-unpacked/Nova Swarm.exe
- Safe manual launch: double-click Play Nova Swarm.vbs in that build's parent folder, or the updated Nova Swarm - Visual Upgrade desktop shortcut. The launcher supplies --nova-fresh-profile --windowed and a separate isolated-play-profile folder. Launch through this wrapper to keep real saves and Steam services isolated.
- Steamworks settings, Cloud, achievements and live leaderboards were untouched. No deployment, upload or public publication performed. Existing release builds preserved.
- To inspect the original source later, first preserve any new work, then run: git switch --detach e8f635e10996b92e976b03d92308f497be711d6f. This does not roll back any Steam release.

## Scope and integrity
Ring/HUD simplification is restricted to sectors 1–3. Shared projectile and warning materials apply consistently across sectors. Controls, movement, hitboxes, attack timings, scoring, progression and gameplay RNG remain unchanged. Existing active Phase/invulnerability rings and tactical warning priority remain. The high-score target returns during pauses and inter-wave periods; near/surpassed targets remain eligible during combat.

The death card reports the damage category actually recorded, not an inferred enemy name or replay. New hazard advice is translated across all eight languages. Existing first-flight translations are now loaded for Russian, Chinese, Brazilian Portuguese, Korean and Japanese; German and Spanish were already wired.

## Validation
Passed: focused opening readability checks (including five projectile styles x 60 frames compared against baseline simulation fields/RNG call counts); warning geometry/lifecycle; projectile lifecycle/readability; boss telegraph; content-director determinism; ranked policy parity; first-run retention (all seven scenarios); i18n checks; all-eight-language production UI audit; production controller flow; Steam Electron bridge; release-line; full build:current and separate Windows packaging.

The actual packaged candidate passed all 12 desktop encounter/transition checks: menu, opening, pause/resume and movement/fire, ordinary combat, Daily, dense combat, boss, destruction, rewards, death, restart and relaunch. Native control-smoke also passed. Native 60-second perf-smoke passed with 60.08 average sampled FPS and 59.52 minimum after warmup, no recorded errors or warnings.

Pre-edit run-report check failed its default-visible leaderboard assertion; pre-edit notification orchestration failed the Overrun visual contract. These existing assertions were not weakened. The pre-edit run-report launcher used an existing preview build, so it is not an exact-source regression proof. The earlier first-run failure did not recur in the current seven-scenario suite; no unverified root-cause fix is claimed. Baseline packaged QA completed captures and timing measurements but its second recording failed the frame-count gate. The QA recorder now uses a fresh CDP session for each recording; both candidate recordings passed the unchanged gate.

## Timing and memory
1280x720, same settings and Daily seed nova-swarm:daily:v1:2026-09-06 (DCS1-0CA0B0F5). These are short samples with non-identical input histories/entity counts, not controlled identical replays.

| Scene | Before p95 / p99 / max ms | After p95 / p99 / max ms | Retained JS heap MiB before → after |
|---|---|---|---|
| Daily, 20s | 16.9 / 17.1 / 100.1 | 16.9 / 17.1 / 17.3 | 47.690 → 48.511 |
| Sector 90 dense, 20s | 17.0 / 17.1 / 33.5 | 16.9 / 17.0 / 17.2 | 43.723 → 41.722 |
| Boss, 12s | 16.9 / 17.1 / 17.3 | 16.9 / 17.1 / 17.4 | 34.398 → 35.044 |

Daily counts before/after: 10/10 enemies, 64/60 bullets; dense: 18/19 enemies, 41/28 bullets. No measured frame-time regression. This does not prove every stutter eliminated. JS heap excludes GPU/native allocation.

Menu art-ready time was 19.516 → 5.750 seconds; baseline startup overlapped bundling, so this is not a clean loading comparison or evidence of a code speedup. Menu-to-controllable: 8.620 → 5.788 seconds. Dense staging: 9.557 → 9.638 seconds. Assets are unchanged; the final build reused their already-copied scratch directory and regenerated current bundled code. Existing large-chunk build warning remains.

## Evidence and limits
Open test-results/readability-delivery/index.html for before/after images, matched staged warning scenes, death feedback and both real packaged recordings. Ordinary combat captures are representative, not identical replays. Source-stage screenshots use the actual game renderer. Video is normal wall-clock speed, silent, scripted keyboard play with QA invulnerability; boss destruction is deliberately triggered by the test. It is QA evidence, not a human gameplay trailer. Still captures and sampled sequential video frames were inspected; no complete real-time human viewing is claimed.

Five uncoached fresh human playtests remain outstanding. No claim that this pass has proven greater comprehension, retention or sales. An older reported late-run/400k-score black screen remains unconfirmed and is outside this focused pass. The unchanged first-flight MAIN MENU footer remains English in the inspected Japanese screenshot; it is an existing adjacent localization gap, not new copy. New/changed advice and first-flight headings are translated; automated UI checks do not prove every existing string is localized or replace native-speaker review.

No new third-party art, fonts, audio or paid services used; no new license/attribution requirements. Existing PixiJS/Electron/Vite stack retained.

## Files changed
- progress.md
- scripts/astra-desktop-playtest.mjs
- scripts/check-opening-combat-readability.mjs
- src/config/OpeningCombatReadability.js
- src/effects/AstraProjectileMaterial.js
- src/effects/AstraWarningField.js
- src/entities/Bullet.js
- src/entities/Enemy.js
- src/entities/Player.js
- src/game/RunReport.js
- src/i18n/astraPresentationSourceText.js
- src/i18n/locales/ja.js
- src/i18n/locales/ko.js
- src/i18n/locales/pt-BR.js
- src/i18n/locales/ru.js
- src/i18n/locales/zh-CN.js
- src/scenes/GameOverScene.js
- src/scenes/PlayScene.js
- src/ui/HUD.js
- scripts/astra-desktop-playtest.mjs: recorder session lifecycle repair only.
- docs/astra-readability-delivery.md, docs/astra-visual-progress.md and progress.md: provenance and QA notes.

Detailed reports live under test-results/opening-combat-readability, astra-desktop-readability-before, astra-desktop-readability-after, astra-native-readability-final-perf-smoke, astra-native-readability-final-control-smoke, readability-production-i18n and readability-first-run.
