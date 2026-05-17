# Nova Swarm Steam Readiness Checklist - 2026-05-17

## Verdict

Nova Swarm is still not Steam-ready, but the path is now concrete. The current build is a credible web release candidate with deployed proof, repeatable build/smoke/release-playtest gates, draft capsule art, generated cinematic intro art, ElevenLabs narration/SFX/music integration, and objective audio-mix evidence. Steam readiness is blocked by store packaging, final store capture, and human review work rather than a known broken core gameplay path.

Current playable deployment:

- https://burt.tinyfoundry.app

Current deployed and verified build:

- `v2026-05-17_14-52-48`

Current evidence:

- Recent milestones are preserved in git history; this checklist tracks the latest verified artifacts rather than a single commit hash.
- Production deploy verification: `https://burt.tinyfoundry.app/version.json` and `https://burt-game.pages.dev/version.json` both reported `v2026-05-17_14-52-48` after the Cloudflare Pages production deploy `https://922eca31.burt-game.pages.dev`.
- Live-domain smoke: `SMOKE_URL=https://burt.tinyfoundry.app npm run smoke` passed at `test-results/smoke-2026-05-17T12-57-55-084Z/` with zero routine console output, console warnings/errors, page errors, or bad responses.
- Audio audit: `docs/reviews/2026-05-17-audio-mix-audit.md`
- Latest intro/audio/visual smoke: `test-results/smoke-2026-05-17T09-17-13-563Z/`
- Latest variant release playtest: `test-results/release-playtest-visual-variants-20260517-1130/`
- Steam screenshot candidate capture: `release/steam-screenshots/draft-2026-05-17-11-30/`
- Visual variety evidence: 216 selectable ship variants and 48 enemy visual variants from `src/config/VisualVariantCatalog.js`.
- Desktop package path: `docs/steam-desktop-package.md`, `electron/main.cjs`, `electron-builder.json`, and `release/steamworks/app_build_TEMPLATE.vdf`.
- Latest desktop package verification: `test-results/electron-smoke-2026-05-17T10-17-05-615Z/`, `npm run package:steam:win`, and generated `release/desktop/win-unpacked/Nova Swarm.exe`.
- Steam trailer draft workflow: `docs/steam-trailer-workflow.md`, `scripts/capture-steam-trailer.mjs`, `scripts/render-steam-trailer-audio.mjs`, and evidence in `release/steam-trailer/draft-2026-05-17-12-46/`.
- Steam store art draft: `release/steam-assets/draft-2026-05-17-nova-swarm/`, replacing the old Burt-era capsule set with public Nova Swarm artwork.
- Steam asset gate: `npm run check:steam-assets` validates 9 asset dimensions/transparency and regenerates review contact sheets.
- Steam screenshot upload shortlist: `release/steam-screenshots/steam-upload-candidates-2026-05-17/`, curated from the clean live capture.
- Steam client validation runbook: `release/steamworks/steam_client_validation_runbook.md`.
- SteamCMD local availability: `docs/reviews/2026-05-17-steamcmd-local-check.md`; `tools\steamcmd\steamcmd.exe +quit` now succeeds locally, but the tool folder is ignored and not committed.
- Steamworks VDF helper: `npm run steamworks:write-vdf` writes ignored `release/steamworks/app_build_LOCAL.vdf` from `STEAM_APP_ID` and `STEAM_DEPOT_ID`.
- Human release approval template: `docs/reviews/2026-05-17-human-release-approval.md`; it is intentionally pending until real approval is recorded.
- Steam client validation template: `release/steamworks/client_validation_report.template.json`; copy it to `client_validation_report.json` only after real Steam-client validation.
- Release readiness audit: `npm run audit:release-readiness` writes `docs/reviews/release-readiness-audit-2026-05-17.json` and currently reports `not_steam_ready` because Steamworks IDs, Steam client validation, and user approval remain open. Use `RELEASE_AUDIT_STRICT=1 npm run audit:release-readiness` to fail on known manual blockers too.
- Steam RC verification entrypoint: `npm run verify:steam-rc` runs the fast build/static release gates and writes `test-results/steam-rc-verify-*/report.json`; latest full pass is `test-results/steam-rc-verify-2026-05-17T12-12-27-110Z/report.json`. Use `npm run verify:steam-rc -- --full` for smoke, desktop package, and release playtest as part of a full RC pass.
- Latest full smoke evidence: `test-results/smoke-2026-05-17T12-12-55-257Z/`.
- Latest full Electron smoke evidence: `test-results/electron-smoke-2026-05-17T12-14-15-301Z/`.
- Latest full 10-minute release playtest evidence: `test-results/release-playtest-2026-05-17T12-15-21-253Z/`.
- Latest Nova Swarm asset-path cleanup smoke: `test-results/smoke-2026-05-17T12-43-09-328Z/`; latest short release preflight after that cleanup: `test-results/release-playtest-nova-asset-paths-20260517-1444/`.
- Latest ElevenLabs SFX polish smoke: `test-results/smoke-2026-05-17T12-53-11-080Z/`; latest short release preflight after that SFX pass: `test-results/release-playtest-nova-sfx-20260517-1454/`.
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
| Header capsule | `release/steam-assets/draft-2026-05-17-nova-swarm/store_header_capsule_920x430.jpg` | 920x430 | Draft exists |
| Small capsule | `release/steam-assets/draft-2026-05-17-nova-swarm/store_small_capsule_462x174.jpg` | 462x174 | Draft exists |
| Main capsule | `release/steam-assets/draft-2026-05-17-nova-swarm/store_main_capsule_1232x706.jpg` | 1232x706 | Draft exists |
| Vertical capsule | `release/steam-assets/draft-2026-05-17-nova-swarm/store_vertical_capsule_748x896.jpg` | 748x896 | Draft exists |
| Page background | `release/steam-assets/draft-2026-05-17-nova-swarm/store_page_background_1438x810.jpg` | 1438x810 | Draft exists |
| Library capsule | `release/steam-assets/draft-2026-05-17-nova-swarm/library_capsule_600x900.png` | 600x900 | Draft exists |
| Library header | `release/steam-assets/draft-2026-05-17-nova-swarm/library_header_capsule_920x430.png` | 920x430 | Draft exists |
| Library hero | `release/steam-assets/draft-2026-05-17-nova-swarm/library_hero_3840x1240.png` | 3840x1240 | Draft exists |
| Library logo | `release/steam-assets/draft-2026-05-17-nova-swarm/library_logo_1280x720.png` | 1280x720 | Draft exists with alpha |
| Promo widescreen | `release/marketing-assets/mission-control-2026-05-16/mission-control-keyart-1920x1080.jpg` | 1920x1080 | Draft exists |
| Promo web preview | `release/marketing-assets/mission-control-2026-05-16/mission-control-keyart-1280x720.webp` | 1280x720 | Draft exists |
| Promo header crop | `release/marketing-assets/mission-control-2026-05-16/mission-control-keyart-920x430.jpg` | 920x430 | Draft exists |
| Intro panel set | `public/art/generated/nova-swarm/nova-swarm-intro-*.webp` | 1920x1080 each | In game |
| Ship-select hangar | `public/art/generated/nova-swarm/nova-swarm-ship-hangar.webp` | 1920x1080 | In game |

Steam rules risk:

- Base capsules contain only generated artwork plus `NOVA SWARM`.
- The library hero and page background contain artwork only.
- Contact sheets in `release/steam-assets/draft-2026-05-17-nova-swarm/review/` show the small capsule remains readable at 231x87, 154x58, and roughly 120x45.

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

- Final Steam screenshot upload approval. A curated 7-shot upload shortlist now exists at `release/steam-screenshots/steam-upload-candidates-2026-05-17/`, but the user still needs to approve the final Steamworks upload choices/captions.
- Final trailer or short launch clip. A clean 43.88 second 1280x720 visual trailer draft and H.264/AAC audio-mixed MP4 draft now exist at `release/steam-trailer/draft-2026-05-17-12-46/`, but the final clip still needs by-ear approval, title-card judgment, export, and human upload approval.
- Final store page copy approval, including public arcade-comedy tone, localization stance, and confirmation that old inside-joke material has been removed from player-facing surfaces.
- Legal/provenance review for all shipped art, music, SFX, generated portraits, generated voice, names, and jokes.
- Final by-ear approval for the ElevenLabs intro music, narrator lines, stingers, and in-game voice/SFX blend.
- Final human capsule approval before upload. Agent review/contact sheets now exist, but the user still needs to approve the final store submission choices.
- Steam client upload/install validation. The repo now has an Electron wrapper/package path, a generated Windows payload, local SteamCMD availability, and a concrete validation runbook, but Steam readiness still needs SteamPipe upload plus install/launch validation through the Steam client.
- Steamworks setup evidence: app ID, depots, launch options, cloud save decision, achievements decision, and controller compatibility metadata.

## Release Gates Before Steam

Do not call this Steam-ready until these are true:

- `npm run build` passes.
- `npm run check:audio` passes.
- `npm run audit:audio-mix` passes, and any warnings are accepted intentionally.
- `npm run smoke` passes with no routine console output, page errors, bad responses, fatal overlays, music-routing failures, or UI overlap failures.
- `npm run desktop:smoke` passes and captures an Electron wrapper screenshot.
- `npm run package:steam:win` produces `release/desktop/win-unpacked/Nova Swarm.exe`.
- `npm run capture:steam-trailer` produces a clean trailer draft report with no browser or network failures.
- `npm run render:steam-trailer-audio` produces an audio-mixed MP4 draft report from shipped assets.
- `npm run check:steam-assets` validates Steam asset dimensions/transparency and regenerates the review contact sheets.
- `npm run audit:release-readiness` has no hard artifact/content failures and records only known manual blockers.
- `npm run verify:steam-rc` passes in fast mode and writes a summary report.
- `npm run verify:steam-rc -- --full` passes and writes a summary report.
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
