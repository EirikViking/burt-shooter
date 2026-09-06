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
- Windows package, candidate native performance and Steam receipt pending.

The existing first-run retention test limitation described in `docs/astra-v6-delivery.md` is outside this visual-only patch. No broader bug fix or universal stutter guarantee is claimed.

## Rollback

Source baseline can be restored non-destructively on a separate branch with `git switch -c codex/menu-clarity-rollback 46437f61cf96ade578803937fc01fc817d502dc5` after checking that work is clean. The previous Windows package and Steam build `25150290` are preserved. No rollback has been performed.
