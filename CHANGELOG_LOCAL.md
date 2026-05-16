# Burt Shooter – Local Agent Changelog

This file tracks changes made by AI agents or manual hotfixes
when git commits are not used.

---

## 2026-05-16
- Restored the root Vite entrypoint and made clean local production builds work again.
- Added generated arctic menu/gameplay art in `public/art/generated/`.
- Added production smoke testing via `npm run smoke` with menu, gameplay, and pause screenshots.
- Added a real pause overlay with resume and quit-to-menu actions.
- Added a settings overlay with audio toggles, volume sliders, and fullscreen from menu/pause.
- Added `render_game_to_text` and `advanceTime` browser hooks for automated playtesting.
- Migrated high-traffic Pixi text creation to a v8-safe helper.
- Split production bundles into app, Pixi vendor, and vendor chunks for better caching.
- Added Steam capsule/library art drafts under `release/steam-assets/draft-2026-05-16/`.

---

## 2026-01-23
- Added `difficulty.pressureScalar=0.9` to reduce incoming fire pressure by 10% (enemy + boss projectiles).
- Ship Select carousel now shows real per-ship stats and shuffles ship order on each open.

---

## 2026-01-14
- Fixed rank-up crash (removed require usage in runtime code)
- Implemented visible rank-up overlay with lore-driven text
- Reduced overall difficulty by ~10 percent
- Centralized rank-up lore via phrasePool.js
- Added text lane guards to prevent UI overlap

---
