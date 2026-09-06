# Main-menu ship clarity patch — 2026-09-06

Baseline: `46437f61cf96ade578803937fc01fc817d502dc5`, clean checkout on `codex/astra-visual-overhaul`. Current checkout retained; fetch, branch, HEAD and worktree checked before editing. Public and `sector-continue-test` were both Steam BuildID `25150290` at the preflight.

## Change

The selected ship's 384px rotation frame was enlarged to approximately 1080px in the main menu. The first hull had 768px views, explaining why some selections looked better than others.

All 30 existing Blender models now have separate 1024px menu views, generated from 1280px renders at the same 72 camera angles and registered to the original atlas crop. The menu streams the settled angle, retaining one 4 MiB RGBA detail texture (at most two during replacement). The existing compact atlas handles dragging; full detail arrives after the view settles. Pending loads release themselves if the menu closes. Hangar art, ship selection, gameplay, localization and platform contracts are unchanged.

## Reproduction and rights

Use the existing Blender 4.5.4 portable executable at `test-results/astra-tools/blender-4.5.4-windows-x64/blender.exe` from the repository root:

```powershell
$env:ASTRA_MENU_HD='1'
& ./test-results/astra-tools/blender-4.5.4-windows-x64/blender.exe -b -t 5 --python scripts/render-astra-turntable.py -- turntable 30 0 72
node scripts/pack-astra-menu-hd.mjs 0 30
node scripts/check-astra-menu-hd-assets.mjs
```

The existing original geometry and materials are reused. No new third-party art, fonts, audio, paid services or licenses. Rights and editable sources remain documented in `docs/astra-v3-models/README.md`. Menu source PNGs are reproducible intermediates under `docs/astra-v3-models/renders/menu-hd`; shipping images and per-hull source receipts are under `public/art/astra/menu-hd`.

## Validation status

- Actual packaged baseline captured at 1920×1080: `test-results/astra-menu-hd-baseline`.
- Actual browser comparison inspected at matching resolution/angles: `test-results/astra-menu-hd-source-final`. Full-resolution loading, real mouse rotation and release on exit pass.
- Delayed-loading navigation/re-entry test passes: `test-results/astra-menu-hd-lifecycle`.
- All-eight-language `check:i18n-ui` passes with no errors or English leaks; `check:i18n`, Steam bridge, isolated Cloud save and debug-unranked safeguards pass.
- Installed develop-web-game skill client executed: `test-results/astra-menu-hd-skill`. Visual inspection uses compositor captures, not its black raw-Pixi-canvas image.
- All 2,160 images pass dimensions/alpha/completeness checks. Added disk assets: 256,360,764 bytes (244.5 MiB); only the active view is decoded at full resolution.
- `build:current`, release-line and separate Windows packaging pass. Existing large-JavaScript-chunk warning remains.
- Packaged all-ship test passes: 30 saved ship selections, three fixed angles plus real mouse dragging per ship, texture release on exit, and delayed-load navigation/re-entry. No runtime errors. Evidence: `test-results/astra-menu-hd-packaged-all-ships`.
- Native keyboard/gamepad launch, movement, shooting and pause checks pass: `test-results/astra-native-menu-clarity-control-smoke/report.json`, embedded source `7caef35`. Browser controller-only flow also passes.
- Source and native visual captures were inspected. Native before/after for the same ship and angle: [before](../test-results/astra-menu-hd-baseline/ship-3-frame-18.png), [after](../test-results/astra-menu-hd-packaged-performance/ship-3-frame-18.png). Ambient bobbing differs slightly between captures.

### Native 1920×1080 menu performance

Same ship, isolated fresh profiles, same scripted selection/rotation sequence; 10-second settled-menu samples after Blender finished. These are short measurements, not a universal stutter guarantee.

| Measurement | Baseline | Patch |
|---|---:|---:|
| Frames sampled | 600 | 600 |
| p95 frame time | 16.9 ms | 16.9 ms |
| p99 frame time | 17.0 ms | 17.1 ms |
| Maximum frame time | 33.5 ms | 17.4 ms |
| Retained JS heap after GC | 36.70 MiB | 36.37 MiB |
| Additional full-detail RGBA view | 0 | 4 MiB |

Raw reports: `test-results/astra-menu-hd-baseline-performance/report.json` and `test-results/astra-menu-hd-packaged-performance/report.json`. Combat code is untouched; native combat/control smoke passes. Dense-combat performance was not rebenchmarked for this menu-only patch.

## Build and launch

- Runtime/source checkpoint: `7caef35cd9f42d140ff3b14b9862e80ea929d39a`.
- Windows executable: `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822\test-results\astra-build-2026-09-06T09-55-46-913Z\win-unpacked\Nova Swarm.exe`.
- Isolated local launch: double-click `Nova Swarm - Visual Upgrade` on the Desktop, or `Play Nova Swarm.vbs` in that build's parent folder. Logs use file handles to avoid the previous broken-pipe dialogs. The isolated profile does not call live Cloud, achievements or leaderboards.
- Steam upload completed: **BuildID 25150873**, depot `4765071`, manifest `6050223532267578627`. Fresh Steam app-info confirms `sector-continue-test` points to it. Payload source/ASAR SHA-256: `A8FCAC21CE4587C9F95328F230F20B05B49F7A924A28ABFE457981A254FFD851`; 410 payload files, 1,626,653,859 bytes. Receipt folder: `test-results/astra-steam-menu-clarity-20260906-120539`.
- The upload VDF sets only `sector-continue-test`. Pre-upload public was `25150290`; the post-upload Steam snapshot also shows public `25150873`, with a public update timestamp 38 seconds after the test-branch update. This task did not issue a public-branch promotion or rollback; the actor responsible for that later update is not established here. No store-page, language, Cloud or leaderboard configuration changes or Git push were performed.
- The updated desktop shortcut launches the tested executable with `isolated-play-profile`; process `14692` was verified responding with the correct executable path. Prior packages and the previous shortcut backup remain intact.

Changed runtime files are `src/ui/AstraTurntable.js` and the single constructor option in `src/scenes/MenuScene.js`. Supporting changes: the existing Blender script, menu-view packing script, focused runtime/asset checks, this report and progress notes, and the original rendered menu images. No player-facing text was added or changed; no untranslated text remains from this patch.

The existing first-run retention test limitation described in `docs/astra-v6-delivery.md` is outside this visual-only patch. No broader bug fix or universal stutter guarantee is claimed.

## Rollback

Source baseline can be restored non-destructively on a separate branch with `git switch -c codex/menu-clarity-rollback 46437f61cf96ade578803937fc01fc817d502dc5` after checking that work is clean. The previous Windows package and Steam build `25150290` are preserved. No rollback has been performed.
