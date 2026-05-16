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
- Added an ElevenLabs-generated mission-control voicepack, a regeneration script that reads `ELEVENLABS_API_KEY` from the environment only, voice/music ducking, and cleaned up missing SFX aliases.
- Latest production smoke confirms menu, settings, gameplay, pause, audio state, and pause ducking with no console/page/HTTP failures.
- Improved combat readability with projectile trails, enemy warning rings, muzzle flashes, and throttled incoming-shot audio cues.
- Added a new generated mission-control key-art draft set under `release/marketing-assets/mission-control-2026-05-16/`.
- Reworked the in-game HUD into cockpit-style glass panels with mission status, hostiles, shots, score, rank, level, and lives.
- Extended production smoke testing with mobile portrait intro/gameplay screenshots and fixed narrow-screen HUD/intro overlap.
- Recovered and finished the interrupted between-wave briefing work: compact wave-clear banner, incoming-wave HUD status, wave state in `render_game_to_text`, and stricter smoke assertions.
- Fixed first-wave clear rewards so the first transition awards score instead of showing `+0`.
- Reduced forced cleanup particle clutter and hardened mobile smoke stability.
- Added `docs/recovery-note-2026-05-16.md` and `docs/reviews/2026-05-16-release-candidate-review.md`.
- Quieted local/offline highscore HTML fallback handling and added the generated arctic backdrop to game over.
- Hardened the debug boss/victory route so forced boss starts advance cleanly to the next level instead of reusing the debug start level.
- Cleaned up boss victory presentation: no post-defeat wanted poster, safer boss label/health text layout, lighter particle burst, and clearer `Sector` intro text separate from the HUD wave counter.
- Extended production smoke testing with boss gate, active boss, boss defeat, and level-2 restart screenshots/assertions.

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
