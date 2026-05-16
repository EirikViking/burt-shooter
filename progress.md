Original prompt: Continue autonomous development of Burt Shooter toward a polished Steam-ready indie release candidate across gameplay, visuals, audio, UX, polish, stability, performance, documentation, and review loops. Use image generation extensively. ElevenLabs may be used for audio/voice/music if useful, but the provided API key is secret and must never be committed, logged, printed, or stored in tracked files.

## 2026-05-16

- Started from `main` at `4b3c598` from `origin/main`.
- Confirmed worktree was clean and `.env` is ignored.
- Created baseline safety commit `b2f4292` before major changes.
- Initial `npm install` succeeded.
- Initial `npm run build` failed because Vite could not resolve root `index.html`.
- Restored tracked root `index.html` from git history and stopped prebuild from mutating tracked HTML on every build.
- `npm run build` now succeeds. Remaining build warnings: one mixed static/dynamic import around `ShipMetadata.js`, and a >500 kB app chunk.
- Baseline smoke screenshots showed a playable but prototype-feeling menu and a few early-session regressions: missing default ship on autostart, missing favicon, a huge early photo flyby, Pixi v8 text/display warnings, and a caught intro overlay null update.
- Generated original arctic/Northern Norway key art with the local image generation flow, saved the source in `public/art/generated/`, and added an optimized WebP menu backdrop.
- Upgraded the menu presentation with the new generated backdrop, toned-down beer-can decoration, cleaner title/subtitle copy, and subtler idle motion.
- Reused the generated arctic art as a dimmed gameplay backdrop under the parallax starfield so play now visually matches the upgraded menu while keeping bullets/enemies readable.
- Fixed the default ship path for autostart, hardened ship usage tracking, added missing door SFX manifest entries, fixed a missing `life_up` fallback, added a favicon link, and prevented dev-mode build-ID reload loops.
- Stabilized the ship intro and delayed/tamed early easter-egg photo flybys so the first seconds of play are readable.
- Migrated high-traffic Pixi text surfaces to a shared v8-safe `createText` helper across gameplay, HUD-adjacent overlays, score popups, boss text, ship screens, highscores, and game over.
- Added `npm run smoke`, a repeatable Playwright/system-Chrome production smoke test that starts Vite preview, captures menu/gameplay screenshots, records console/page/HTTP failures, and saves a JSON report under ignored `test-results/`.
- Added a real pause overlay with resume and quit-to-menu actions, and hardened input so short pause key taps cannot be missed between frames.
- Hardened PlayScene replay/scene reuse by recreating the input manager after destroy instead of leaving the next run with dead listeners.
- Split production bundles into app, Pixi vendor, and remaining vendor chunks so the main app chunk dropped from about 643 kB to about 352 kB while keeping the build warning-free.
- Latest `npm run build` succeeds with no Vite warnings.
- Latest `npm run smoke` succeeds with no console errors, page errors, bad responses, or fatal overlay. Latest screenshots: `test-results/smoke-2026-05-16T12-27-04-266Z/01-menu.png`, `test-results/smoke-2026-05-16T12-27-04-266Z/02-gameplay.png`, and `test-results/smoke-2026-05-16T12-27-04-266Z/03-pause.png`.
- Next priority: commit and push this coherent visual/stability milestone, then continue into gameplay pacing and audio/music polish.
