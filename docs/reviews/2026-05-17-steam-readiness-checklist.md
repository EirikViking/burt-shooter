# Burt Shooter Steam Readiness Checklist - 2026-05-17

## Verdict

Burt Shooter is still not Steam-ready, but the path is now concrete. The current build is a credible web release candidate with deployed proof, repeatable build/smoke/release-playtest gates, draft capsule art, and objective audio-mix evidence. Steam readiness is blocked by store packaging and human review work rather than a known broken core gameplay path.

Current playable deployment:

- https://db088464.burt-game.pages.dev

Latest pushed evidence:

- Commit: `37020bc chore: add audio mix audit`
- Audio audit: `docs/reviews/2026-05-17-audio-mix-audit.md`
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

Steam rules risk:

- Base capsules should only contain game artwork, the game name, and any official subtitle. The current draft README says the base capsules contain only artwork plus the game name, which is the right direction.
- The library hero should contain artwork only. The current `library_hero_3840x1240.png` still needs a final visual check before upload.
- The small capsule must stay readable at tiny generated sizes. This needs a visual thumbnail check, not just dimension validation.

## Store Copy Draft

Short description draft:

> Blast through an arctic arcade space war with punchy ships, chaotic enemy waves, mission-control radio calls, boss fights, and couch-friendly keyboard, gamepad, and touch controls.

Long description draft:

> Burt Shooter is a fast, personal arcade shooter about surviving wave after wave of space nonsense over a frozen northern battlefield. Pick your ship, dodge incoming fire, grab ridiculous powerups, and push through escalating enemy formations toward oversized boss encounters.
>
> The game blends old-school shoot-'em-up clarity with a homemade crew-comms personality: readable bullets, compact wave briefings, generated arctic key art, mission-control voice calls, local highscore fallback, and accessibility sliders for screen shake and player focus.

Feature bullets draft:

- Arcade wave shooting with handcrafted early pacing and escalating late-game pressure.
- Boss gates, victory beats, sector transitions, and score rewards.
- Keyboard, gamepad, and mobile touch control support.
- Context-aware music pools for menu, gameplay, boss, victory, and game over.
- Mission-control voice calls with music ducking.
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

- Curated Steam screenshot set. Steam screenshot guidance expects actual gameplay imagery, not concept art or marketing copy. Existing smoke screenshots are test artifacts, not final store screenshots.
- Gameplay trailer or short launch clip.
- Final store page copy approval, including tone, inside-joke density, localization stance, and whether Norwegian terms should remain as flavor or be explained.
- Legal/provenance review for all shipped art, music, SFX, generated portraits, generated voice, names, and jokes.
- Final capsule thumbnail review at small sizes.
- Steam build/package plan. The repo is currently a web game; shipping on Steam needs a wrapper/package decision or a native build path.
- Steamworks setup evidence: app ID, depots, launch options, cloud save decision, achievements decision, and controller compatibility metadata.

## Release Gates Before Steam

Do not call this Steam-ready until these are true:

- `npm run build` passes.
- `npm run check:audio` passes.
- `npm run audit:audio-mix` passes, and any warnings are accepted intentionally.
- `npm run smoke` passes with no routine console output, page errors, bad responses, fatal overlays, music-routing failures, or UI overlap failures.
- `npm run playtest:release` survives at least 10 minutes without debug flags.
- A human 10-15 minute playthrough confirms late boss pressure, repair/mercy generosity, game-over/restart flow, and UI clutter feel right.
- A human listening pass confirms menu, gameplay, wave clear, boss inbound, boss fight, victory, and game-over mix on headphones or speakers.
- Final store screenshots and trailer are captured from the release build.
- Final store assets are checked against current Steam templates and thumbnail readability.

## Next Agent Actions

- Capture a real store screenshot candidate set from the deployed or local production build: menu, first wave, wave clear, boss inbound, active boss, victory, game over, and mobile/touch only if Steam page wants to mention touch.
- Build a short trailer beat sheet from existing smoke/release states, then record a clean 30-45 second clip.
- Decide Steam packaging direction: Electron/Tauri/WebView wrapper, native export, or keep this as web-only for now.
- Run the human by-ear audio pass using the Settings SFX/VOICE audition buttons plus natural gameplay.
- Run one normal-skill human playthrough and record specific notes on late boss pressure and whether field repair/last-stand repair feels fair or too generous.
