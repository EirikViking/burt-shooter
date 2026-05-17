# Nova Swarm Steam Readiness Checklist - 2026-05-17

## Verdict

Nova Swarm is still not Steam-ready, but the path is now concrete. The current build is a credible web release candidate with deployed proof, repeatable build/smoke/release-playtest gates, draft capsule art, generated cinematic intro art, ElevenLabs narration/SFX/music integration, and objective audio-mix evidence. Steam readiness is blocked by store packaging, final store capture, and human review work rather than a known broken core gameplay path.

Current playable deployment:

- https://burt.tinyfoundry.app

Current verified web build:

- `v2026-05-17_11-32-32`

Latest pushed evidence:

- Commit: `159173a feat: add visual variant arsenal`
- Audio audit: `docs/reviews/2026-05-17-audio-mix-audit.md`
- Latest intro/audio/visual smoke: `test-results/smoke-2026-05-17T09-17-13-563Z/`
- Latest variant release playtest: `test-results/release-playtest-visual-variants-20260517-1130/`
- Steam screenshot candidate capture: `release/steam-screenshots/draft-2026-05-17-11-30/`
- Visual variety evidence: 216 selectable ship variants and 48 enemy visual variants from `src/config/VisualVariantCatalog.js`.
- Desktop package path: `docs/steam-desktop-package.md`, `electron/main.cjs`, `electron-builder.json`, and `release/steamworks/app_build_TEMPLATE.vdf`.
- Latest desktop package verification: `test-results/electron-smoke-2026-05-17T10-17-05-615Z/`, `npm run package:steam:win`, and generated `release/desktop/win-unpacked/Nova Swarm.exe`.
- Previous RC review: `docs/reviews/2026-05-16-release-candidate-review.md`
- Strict release playtest evidence remains strongest at `test-results/release-playtest-final-20260516-225000/`

## Official Store References Checked

- Steam Store Graphical Assets: https://partner.steamgames.com/doc/store/assets/standard
- Steam Graphical Asset Rules: https://partner.steamgames.com/doc/store/assets/rules
- Steam Store Page Description: https://partner.steamgames.com/doc/store/page/description
- Steam Store Page Editing: https://partner.steamgames.com/doc/store/page

## Asset Inventory

Checked locally with ImageMagick `magick identify`.

| Asset | File | Local size | Status |
| --- | --- | ---: | --- |
| Header capsule | `release/steam-assets/draft-2026-05-16/store_header_capsule_920x430.jpg` | 920x430 | Draft exists |
| Small capsule | `release/steam-assets/draft-2026-05-16/store_small_capsule_462x174.jpg` | 462x174 | Draft exists |
| Main capsule | `release/steam-assets/draft-2026-05-16/store_main_capsule_1232x706.jpg` | 1232x706 | Draft exists |
| Vertical capsule | `release/steam-assets/draft-2026-05-16/store_vertical_capsule_748x896.jpg` | 748x896 | Draft exists |
| Page background | `release/steam-assets/draft-2026-05-16/store_page_background_1438x810.jpg` | 1438x810 | Draft exists |
| Library capsule | `release/steam-assets/draft-2026-05-16/library_capsule_600x900.png` | 600x900 | Draft exists |
| Library header | `release/steam-assets/draft-2026-05-16/library_header_capsule_920x430.png` | 920x430 | Draft exists |
| Library hero | `release/steam-assets/draft-2026-05-16/library_hero_3840x1240.png` | 3840x1240 | Draft exists |
| Library logo | `release/steam-assets/draft-2026-05-16/library_logo_1280x720.png` | 1280x720 | Draft exists |
| Promo widescreen | `release/marketing-assets/mission-control-2026-05-16/mission-control-keyart-1920x1080.jpg` | 1920x1080 | Draft exists |
| Promo web preview | `release/marketing-assets/mission-control-2026-05-16/mission-control-keyart-1280x720.webp` | 1280x720 | Draft exists |
| Promo header crop | `release/marketing-assets/mission-control-2026-05-16/mission-control-keyart-920x430.jpg` | 920x430 | Draft exists |
| Intro panel set | `public/art/generated/nova-swarm/nova-swarm-intro-*.webp` | 1920x1080 each | In game |
| Ship-select hangar | `public/art/generated/nova-swarm/nova-swarm-ship-hangar.webp` | 1920x1080 | In game |

Steam rules risk:

- Base capsules should only contain game artwork, the game name, and any official subtitle. The current draft README says the base capsules contain only artwork plus the game name, which is the right direction.
- The library hero should contain artwork only. The current `library_hero_3840x1240.png` still needs a final visual check before upload.
- The small capsule must stay readable at tiny generated sizes. This needs a visual thumbnail check, not just dimension validation.

## Store Copy Draft

Short description draft:

> Blast through a neon arcade swarm with punchy ships, readable bullet patterns, boss fights, bonus-core chaos, and couch-friendly keyboard, gamepad, and touch controls.

Long description draft:

> Nova Swarm is a fast arcade shooter about surviving wave after wave of choreographed space nonsense. Pick your ship, dodge incoming fire, grab ridiculous bonus cores, and push through escalating enemy formations toward oversized boss encounters.
>
> The game blends old-school shoot-'em-up clarity with a public arcade-comedy personality: readable bullets, compact wave briefings, original generated key art, radio callouts, local highscore fallback, and accessibility sliders for screen shake and player focus.

Feature bullets draft:

- Arcade wave shooting with handcrafted early pacing and escalating late-game pressure.
- Boss gates, victory beats, sector transitions, and score rewards.
- Keyboard, gamepad, and mobile touch control support.
- Context-aware music pools for menu, gameplay, boss, victory, and game over.
- First-run narrated story intro with replay from the menu.
- Radio callouts and narrated beats with music ducking.
- Accessibility controls for screen shake and player-focus visibility.
- Offline/local highscore fallback when the network is unavailable.

Suggested tags:

- Arcade
- Shoot 'Em Up
- Space
- Retro
- Bullet Hell
- Action
- Casual
- Singleplayer
- Controller
- Colorful

## Missing Store Materials

These are not proven ready in the repo yet:

- Final curated Steam screenshot approval. A repeatable live-build candidate set now exists at `release/steam-screenshots/draft-2026-05-17-live-1280/`, but it still needs human selection/caption approval before upload.
- Gameplay trailer or short launch clip.
- Final store page copy approval, including public arcade-comedy tone, localization stance, and confirmation that old inside-joke material has been removed from player-facing surfaces.
- Legal/provenance review for all shipped art, music, SFX, generated portraits, generated voice, names, and jokes.
- Final by-ear approval for the ElevenLabs intro music, narrator lines, stingers, and in-game voice/SFX blend.
- Final capsule thumbnail review at small sizes.
- Steam client upload/install validation. The repo now has an Electron wrapper/package path and a generated Windows payload, but Steam readiness still needs SteamPipe upload and install/launch validation through the Steam client.
- Steamworks setup evidence: app ID, depots, launch options, cloud save decision, achievements decision, and controller compatibility metadata.

## Release Gates Before Steam

Do not call this Steam-ready until these are true:

- `npm run build` passes.
- `npm run check:audio` passes.
- `npm run audit:audio-mix` passes, and any warnings are accepted intentionally.
- `npm run smoke` passes with no routine console output, page errors, bad responses, fatal overlays, music-routing failures, or UI overlap failures.
- `npm run desktop:smoke` passes and captures an Electron wrapper screenshot.
- `npm run package:steam:win` produces `release/desktop/win-unpacked/Nova Swarm.exe`.
- `npm run playtest:release` survives at least 10 minutes without debug flags.
- A human 10-15 minute playthrough confirms late boss pressure, repair/mercy generosity, game-over/restart flow, and UI clutter feel right.
- A human listening pass confirms menu, gameplay, wave clear, boss inbound, boss fight, victory, and game-over mix on headphones or speakers.
- Final store screenshots and trailer are captured from the release build.
- Final store assets are checked against current Steam templates and thumbnail readability.

## Next Agent Actions

- Review the live-build Steam screenshot candidate set in `release/steam-screenshots/draft-2026-05-17-live-1280/` and choose the final 5-8 store uploads.
- Build a short trailer beat sheet from existing smoke/release states, then record a clean 30-45 second clip.
- Generate and inspect the Electron Windows package with `npm run package:steam:win`, then run it via the Steam client after replacing IDs in `release/steamworks/app_build_TEMPLATE.vdf`.
- Run the human by-ear audio pass using the Settings SFX/VOICE audition buttons plus natural gameplay.
- Run one normal-skill human playthrough and record specific notes on late boss pressure and whether field repair/last-stand repair feels fair or too generous.
