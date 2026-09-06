# Opening Tactical choice — local delivery

The first Pierce, Double Shot and Drones cards now show current-versus-upgraded firing schematics. The focused card animates; other cards and Reduced Motion retain static comparisons. Compact cards show the proposed pattern beside the unchanged stats and description. Existing ship/drone textures are reused. New labels are translated across all eight languages.

An existing 800×600 layout fault was also reproduced: the last Choose label ended at y=604.5. Responsive card gaps now keep the full choice inside the viewport without shrinking text. Browser captures cover 800×600 through 1920×1080; native compact verification is at 960×640.

## Provenance and launch
- Workspace: D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822
- Branch: codex/astra-visual-overhaul (continued in the same folder).
- Clean baseline: f83a8e1931ab053c2c772e252a660f497b22df3a. Fetch/status/log/worktree checks completed. This experimental branch has no upstream; the baseline is the just-delivered local version.
- Packaged runtime checkpoint: 9a42bb5b4ef202f8540a9bc940c98575df2fad9e, independently verified inside app.asar.
- Build folder: D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822\test-results\astra-build-2026-09-06T12-37-08-561Z
- Executable: D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822\test-results\astra-build-2026-09-06T12-37-08-561Z\win-unpacked\Nova Swarm.exe
- Safe manual launch: double-click **Play Nova Swarm.vbs** in the build folder, or the **Nova Swarm - Visual Upgrade** desktop shortcut after handoff. The wrapper sets NOVA_SWARM_USER_DATA_DIR to the build's isolated-play-profile and supplies --nova-fresh-profile. This disables live platform services and preserves real saves. The existing display preference controls fullscreen/windowed presentation.
- Steamworks settings, Cloud, achievements and live leaderboards untouched. No upload, deployment or publication. Existing release outputs preserved.
- Source rollback for inspection, after preserving any future work: git switch --detach f83a8e1931ab053c2c772e252a660f497b22df3a. This does not change Steam.

## Rules preserved
No changes to offer selection, upgrades, damage, controls, hitboxes, difficulty, simulation clocks, scoring, saves or ranked/Daily rules. The preview is a display-only illustration of volley count, penetration and support fire, not a scaled simulation or DPS measurement. Numeric panels remain authoritative. It creates no combat entities, consumes no gameplay RNG, performs no per-frame display-object allocation, and is destroyed with the draft. Daily and later draft cards retain their existing presentation; compact gap correction applies to the shared draft layout.

## Validation
- Focused preview suite PASS: 16 checks covering three real selections and applied stats, four viewport sizes, all eight languages, preview/title bounds and viewport containment, animation, Reduced Motion, stable object ownership, destruction, zero Math.random calls and unchanged combat state.
- Full Tactical suite PASS on source and final production: navigation, selection, rescan, hold, ban, build locking, Fusion and return to combat.
- The original Fusion fixture failed identically on baseline and candidate because it searched the pre-authored Sector 1 pool. Its normal-mode seed search now includes openingLoadoutChoice and uses Sector 2 for the Fusion case. Every blueprint assertion remains intact.
- i18n, release-line, full build:current, all-eight-language production UI audit, production controller-only flow, content-director determinism, ranked-policy parity and Steam Electron bridge PASS.
- Installed develop-web-game client ran after both meaningful iterations; movement/fire state recorded. Its discarded-buffer canvas image is not used as visual evidence; compositor screenshots and native screenshots were inspected.
- Packaged focused suite PASS: actual 1280×720 viewport asserted, all three cards navigated by keyboard, Drones confirmed/applied, movement and firing resumed, then actual 960×640 compact layout verified. Earlier QA-only failures (instantaneous key tap and assumed window size) are preserved in initial-report.json and initial-1080p-report.json. The helper now holds keys for 80 ms, waits for focus, and verifies the physical viewport.
- The first-run retention suite still FAILS its existing <=220 ms HUD restoration assertion. It failed during packaging, again idle, and identically with the previous package's 3d95d86 code served with unchanged shared assets. It is an unresolved baseline issue, not declared fixed or bypassed. This suite is not reported as passing for this delivery.

## Performance and loading limits
Both corrected native samples use the first Tactical draft at verified 1280×720, Double Shot focused, normal wall-clock animation, 20 seconds. They use isolated QA profiles and are representative scenes rather than bit-identical gameplay replays. Only the corrected final samples below are used; earlier fullscreen captures were 1920×1080 despite the harness's initial requested resolution.

| Metric | Before | After |
|---|---:|---:|
| p95 frame time, ms | 17.00 | 17.00 |
| p99 frame time, ms | 17.10 | 17.20 |
| maximum frame, ms | 99.40 | 17.40 |
| retained JavaScript heap, MiB | 33.40 | 32.77 |

No material frame-time regression measured. Short samples and heap variation do not prove all stutters fixed or memory improved. JS heap excludes GPU/native allocations. Main bundle grew approximately 4.9 kB before compression; no new assets or network requests were added. The build reused already-copied unchanged public assets in its scratch dist and regenerated the current bundle. No controlled cold-start loading claim is made. Existing large-chunk warning remains.

## Evidence and remaining work
Comparison page: test-results/tactical-choice-delivery/index.html. Packaged video: test-results/tactical-choice-native-after/choice-to-combat.mp4 (14.57 seconds). This is actual runtime at normal wall-clock speed with staged reward, scripted keyboard input, QA invulnerability and no recorded audio. It is not a human performance or a Steam trailer. Screenshots and sampled video frames are inspected; no full real-time human viewing is claimed.

Fresh-player comprehension/retention tests remain outstanding; automated success does not establish that the change increases sales or retention. The inherited first-run timing failure above remains, as do previously documented unrelated late-run black-screen uncertainty and adjacent localization gaps. No new untranslated preview strings: all three labels are translated in seven non-English locales. Existing labels such as DOUBLE SHOT in the Russian capture and the previously documented Japanese first-flight MAIN MENU footer are outside this pass and are not silently claimed localized.

No paid tools, new third-party art/fonts/audio, or additional license obligations. Existing PixiJS/Electron/Vite stack and existing assets retained.

## Changed files
- src/ui/TacticalWeaponPreview.js
- src/scenes/PlayScene.js
- src/i18n/tacticalDraftClaritySourceText.js
- scripts/check-tactical-weapon-preview.mjs
- scripts/check-tactical-preview-native.mjs
- scripts/check-tactical-draft.mjs
- progress.md
- docs/astra-tactical-choice-delivery.md and docs/astra-visual-progress.md: delivery/progress notes.

Final native controls/performance/natural-opening checks and final handoff commit are recorded in the completion note below.

## Final packaged completion
- Native control-smoke PASS. Native 60-second perf-smoke PASS: average sampled FPS 60.079, minimum after warmup 59.524; no errors or warnings.
- Ordinary-input native opening playthrough PASS: first boss at 64.300 s, first draft at 82.448 s, exact Pierce / Double Shot / Drones offer, Double Shot selected and play resumed. No forced waves, kills, damage or time scaling; QA invulnerability only. These timings describe this scripted run, not an optimization or human-comprehension benchmark.
- Final packaged first-choice, compact and post-choice combat screenshots inspected. Six sequential samples from the actual 14.57-second video inspected. No full real-time viewing or human playtest is claimed.
