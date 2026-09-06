# Nova Swarm — Astra V6 delivery

**Steam test build 25150290 is live on `sector-continue-test`.** The refreshed Steam app information confirms this assignment. Public/default remains **25147283**; `test-build` remains **23782673**. Only the test build assignment changed. Store media, Cloud settings, leaderboard identities and achievements were untouched.

The flagship no longer auto-rotates. Manual dragging remains, the small service craft are removed, and landing lights provide background movement. It now uses the last saved Hangar ship, including its matching rotation views and engine lights. That choice survives returning from play and reloading; temporary Daily loaners do not replace it. Existing Cloud-backed selection storage is reused.

Overrun ceremonies and the menu unlock now feature the pilot's ship inside an original metallic coronation crest, animated rings, rising sparks and milestone lighting. A new original fanfare accompanies them. Narrow layouts use a subdued crest behind the text; reduced-motion settings are respected. Rank and achievement banners now remain behind the paused ceremony. Rewards, confirmation timing, scoring and simulation behavior are preserved.

New players get brief, localized information about the three starter ships in the main menu and Hangar. Existing contextual movement/fire/phase/focus coaching remains; no forced intro or extra launch step was added. Menu entrance fades also fix stale text positions after native resizing.

## Play and review

- Steam Library → Nova Swarm → Properties → Betas → **sector-continue-test**, wait for the update, then Play. Select **None** to return to the public build.
- Desktop: **Nova Swarm - Visual Upgrade** launches this package with an isolated local profile. Steam testing uses the existing released services; the local shortcut intentionally does not access real saves or live services.
- Package: `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822\test-results\astra-build-2026-09-06T08-41-24-492Z\win-unpacked\Nova Swarm.exe`.
- Exact isolated launch:

```powershell
node "D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822\test-results\astra-build-2026-09-06T08-41-24-492Z\launch.mjs"
```

Comparisons: `test-results/astra-v6-delivery/preview.html`. Actual 25.28-second normal-speed gameplay recording: `test-results/astra-desktop-v6-complete/gameplay-normal-speed.mp4`. It is silent, uses scripted inputs and QA invulnerability, and is evidence rather than a marketing trailer. The separate boss clip uses a staged damage call. Captures and menu/rotation video come from the actual executable, not offline renders. Screenshot comparisons use the indicated resolutions and different milestone states, not identical replays.

The earlier normal-rules Steam trailer drafts, eight screenshots and proposed store page remain available in `test-results/astra-v5-steam-media/`. They have not been published; store-page changes still await approval.

## Validation and performance

Passed: full production build and catalog/policy preflight; i18n and eight-language UI checks; content-director determinism; Daily Signal contract; run-mode identity; controller flow; Steam Electron bridge; isolated Cloud persistence; release-line and staged Steam runtime checks. Runtime Overrun scoring passed at exactly 77,000. No test assertions were weakened.

The final executable passed all 12 gameplay/transition checks: menu, launch, movement/fire, pause/resume, challenge, dense combat, boss, destruction, rewards, death, restart and relaunch. Full native menu QA includes Settings, Help, Hangar rotation, three available starters, achievements, leaderboard and Codex. Focused native QA covers seven Overrun milestones, mouse/keyboard/controller confirmation, menu unlock, saved flagship restoration and 1280/1920 resize regression checks. The broader source suite passed 18 milestone/resolution/input combinations; compact German and Japanese/reduced-motion captures were also checked.

Same 1280×720 scenarios and settings, same Daily seed `nova-swarm:daily:v1:2026-09-06`; these are not identical input replays:

| Scenario | V5 p95 / p99 / max ms | V6 p95 / p99 / max ms | Retained JS heap V5 → V6 MiB |
|---|---|---|---|
| Daily challenge, 20 s | 16.8 / 16.9 / 716.6 | 16.9 / 17.2 / 33.3 | 46.11 → 46.84 |
| Sector 90, 20 s | 16.9 / 17.1 / 33.3 | 16.9 / 17.1 / 33.4 | 42.45 → 41.79 |
| Boss, 12 s | 16.9 / 17.1 / 17.4 | 16.9 / 17.1 / 17.4 | 35.24 → 34.42 |

The separate 60-second native performance check passed: **59.89 FPS average**, minimum sampled FPS **58.48**, against its existing 50 FPS gate. V5's same check averaged 60.08 FPS. Total launcher time was 77.26 s versus 77.77 s, including the 60-second run and startup/shutdown.

V6 menu art became ready in 3.42 s; menu-to-play took 5.78 s and the staged dense-scene navigation took 9.78 s. V5 recorded 86.81 / 8.04 / 11.59 s respectively, but its initial startup overlapped earlier staging. Do not interpret that startup difference as a proven optimization. V6 frame measurements ran without packaging/upload work. Raw frame, heap, process-memory and loading results are preserved in `test-results/astra-v6-delivery/performance.json`.

## Remaining limitations

- The strict first-run retention suite remains unresolved. The final quiet candidate run fails its ≤220 ms HUD restoration assertion; a V5 comparison fails earlier waiting for the opening prompt. These different failures do not establish the same root cause. The new starter information and native launch/control checks pass. Logs: `astra-v6-first-run-quiet.log` and `astra-v6-first-run-baseline.log` under `test-results`.
- The existing score-bonus source-regex assertion fails identically against clean starting source `7358d00`; the runtime score check passes. That assertion was not rewritten.
- Short samples still include occasional ~33 ms frames and cannot prove every stutter eliminated. The earlier reported late/400k black-screen case is not claimed fixed by this pass. The prior V5 Scout immediate-persistence assertion remains documented in its delivery report.
- No human playtest or human listening review is claimed. The new audio has signal/mastering checks; the gameplay videos are explicitly automated QA. The existing large-bundle warning remains.
- Cloud namespace and offline persistence were verified; no live cross-device round trip or synthetic leaderboard/achievement write was performed.

## Provenance, tools and rollback

Branch: **codex/astra-visual-overhaul**. This pass started clean at **7358d00757869543df9d1c14110cbea8e256c075**. Original overhaul baseline: **a0b88d064c31dbc879948babd7751bf52fe7be77**, on `codex/forum-129-improvements-20260822`. Packaged runtime and embedded Git label: **9231bc49fb17e205a72355c2096d48b03aa6cc62** / `9231bc4`. The final documentation checkpoint is recorded in the delivery README.

Changed runtime surfaces: MenuScene, PlayScene, ShipSelectScene, AstraDockAtmosphere, new AstraCoronation, presentation i18n text, SoundCatalog and the new crest/fanfare assets. Editable sources, regeneration scripts, validation scripts and progress notes accompany them. Complete inventory: `test-results/astra-v6-delivery/files-changed.txt`.

Original crest generated with built-in ImageGen; existing detailed Blender ship renders reused. No new Blender model was needed for this pass. Original audio synthesized with Node and mastered using FFmpeg; no external samples or paid API calls. Sharp normalized the transparent crest. No new third-party fonts/assets were imported; existing licenses remain intact. Prompts, source PNG/WAV, regeneration instructions and rights notes: `docs/astra-v6-models/README.md`.

App **4765070**, depot **4765071**, new manifest **3132754725727249187**. Upload completed 6 September 2026 at 10:59:16 Oslo time. Payload: **410 files / 1,369,726,503 bytes**. Tested and uploaded `resources/app.asar` both hash to **08e66086eb89f116f661667d9766aacb2c345e29cdf08ee3f42c5d3ece231c8a**. Evidence: `test-results/astra-steam-upload-20260906-v6-complete/` including before/after server state, payload receipt, VDF, runtime checks and upload logs.

Existing boards remain `nova_swarm_global_score_v2`, `nova_swarm_tactical_score_v1` and `nova_swarm_sector_start_score_v1`. Published Auto-Cloud remains WinAppDataRoaming `nova-swarm/steam-cloud/nova-swarm-save.json`, 1 MiB / 20 files. No Git pull, merge, rebase or push; no public deployment or release-output replacement. Intermediate candidates are preserved and were not uploaded.

For source rollback after preserving any future uncommitted changes: `git switch --detach 7358d00757869543df9d1c14110cbea8e256c075`. This retains the experimental branch and its commits. To roll back the Steam test branch, reassign build **25147283** in Steamworks. No rollback was performed.
