# Nova Swarm Steam Readiness Checklist - 2026-05-17

## Verdict

Nova Swarm is still not Steam-ready, but the path is now concrete. The current build is a credible web release candidate with deployed proof, repeatable build/smoke/release-playtest gates, draft capsule art, generated cinematic intro art, refreshed screenshot/trailer candidates, Windows package evidence, ElevenLabs narration/SFX/music integration, and objective audio-mix evidence. Steam readiness is blocked by real Steamworks IDs, SteamPipe/client validation, and human review rather than a known broken core gameplay path.

Current playable deployment:

- https://burt.tinyfoundry.app

Current deployed and verified build:

- `v2026-05-18_05-59-43`

Current evidence:

- Recent milestones are preserved in git history; this checklist tracks the latest verified artifacts rather than a single commit hash.
- Production deploy verification: `https://burt.tinyfoundry.app/version.json` reports `v2026-05-18_05-59-43`; latest Pages deploy preview for this build is `https://7b1fe54c.burt-game.pages.dev`.
- Live-domain smoke: `SMOKE_URL=https://burt.tinyfoundry.app npm run smoke` passed at `test-results/smoke-2026-05-17T20-37-53-548Z/` with zero routine console output, console warnings/errors, page errors, or bad responses.
- Audio audit: `docs/reviews/2026-05-17-audio-mix-audit.md`
- Latest intro/audio/visual smoke: `test-results/smoke-2026-05-17T09-17-13-563Z/`
- Latest variant release playtest: `test-results/release-playtest-visual-variants-20260517-1130/`
- Steam screenshot candidate capture: `release/steam-screenshots/draft-2026-05-17-current/`
- Visual variety evidence: 25 generated playable ships with progression locks from `src/config/ShipData.js`, plus 50 generated enemy assets with 50 distinct behavior signatures from `src/config/GeneratedEnemyProfiles.js`.
- Desktop package path: `docs/steam-desktop-package.md`, `electron/main.cjs`, `electron-builder.json`, and `release/steamworks/app_build_TEMPLATE.vdf`.
- Latest desktop package verification: `test-results/electron-smoke-2026-05-17T19-15-20-075Z/`, `npm run package:steam:win:current`, generated `release/desktop/win-unpacked/Nova Swarm.exe`, and tracked package evidence in `release/steamworks/desktop_package_review_report.json`. `npm run check:desktop-package` now rejects stale evidence when the Electron smoke build ID does not match `public/version.json` or the packaged executable is older than the current build timestamp.
- Steam trailer draft workflow: `docs/steam-trailer-workflow.md`, `scripts/capture-steam-trailer.mjs`, `scripts/render-steam-trailer-audio.mjs`, `scripts/render-steam-trailer-candidate.mjs`, refreshed current-build capture evidence in `release/steam-trailer/draft-2026-05-17-current/`, and editorial candidate evidence in `release/steam-trailer/candidate-2026-05-17-current/`.
- Steam store art draft: `release/steam-assets/draft-2026-05-17-nova-swarm/`, replacing the old private-era capsule set with public Nova Swarm artwork.
- Steam asset gate: `npm run check:steam-assets` validates 9 asset dimensions/transparency and regenerates review contact sheets.
- Steam screenshot upload shortlist: `release/steam-screenshots/steam-upload-candidates-2026-05-17/`, refreshed from the current `v2026-05-18_05-59-43` release-build capture.
- Steam client validation runbook: `release/steamworks/steam_client_validation_runbook.md`.
- SteamCMD local availability: `docs/reviews/2026-05-17-steamcmd-local-check.md`; `tools\steamcmd\steamcmd.exe +quit` now succeeds locally, but the tool folder is ignored and not committed.
- Steamworks VDF helper: `npm run steamworks:write-vdf` writes ignored `release/steamworks/app_build_LOCAL.vdf` from `STEAM_APP_ID` and `STEAM_DEPOT_ID`.
- Human release approval template: `docs/reviews/2026-05-17-human-release-approval.md`; it is intentionally pending until real approval is recorded.
- Steam client validation template: `release/steamworks/client_validation_report.template.json`; copy it to `client_validation_report.json` only after real Steam-client validation.
- Steam store metadata handoff: `docs/steam-store-handoff.md`, `release/steamworks/store_metadata_draft.json`, and `release/steamworks/store_metadata_review_report.json`; `npm run check:steam-store` passes with 15 tags, 8 feature bullets, conservative `Partial Controller Support`, and explicit v1 deferrals for Steam Cloud and Steam achievements.
- Asset provenance inventory: `docs/asset-provenance.md`, `release/provenance/asset_provenance_manifest.json`, and `release/provenance/asset_provenance_report.json`; `npm run check:provenance` currently covers 1604/1604 scanned public/release assets while intentionally leaving legal approval pending.
- Live deployment evidence: `npm run check:live-deployment` writes `release/steamworks/live_deployment_report.json`, verifies `https://burt.tinyfoundry.app/version.json` matches `public/version.json`, and requires a current passing live-domain smoke report.
- Full RC evidence: `npm run check:full-rc` writes `release/steamworks/full_rc_verification_report.json`, summarizing the latest full Steam RC verifier, local browser smoke, and 10-minute release playtest into tracked release evidence.
- Human review packet: `npm run steamworks:human-review` writes `release/steamworks/human_review_packet.json` and `.md`, collecting screenshots, capsules, trailer, audio, store copy, provenance, and gameplay evidence for final human approval.
- Steam client preflight packet: `npm run steamworks:client-preflight` writes `release/steamworks/steam_client_preflight_packet.json` and `.md`, proving the local Windows payload, SteamPipe template, packaged smoke, and full RC evidence are ready for the real Steam upload/client-validation step.
- Release readiness audit: `npm run audit:release-readiness` writes `docs/reviews/release-readiness-audit-2026-05-17.json` and currently reports `not_steam_ready` because Steamworks IDs, Steam client validation, and user approval remain open. It now validates desktop package evidence, packaged executable smoke, packaged keyboard/gamepad control smoke, current live deployment evidence, full RC/playtest evidence, the human review packet, Steam client preflight packet, and the Steam handoff packet. Use `RELEASE_AUDIT_STRICT=1 npm run audit:release-readiness` to fail on known manual blockers too.
- Steam RC verification entrypoint: `npm run verify:steam-rc` runs the current-build static release gates, refreshes the Windows desktop package, runs Electron smoke, packaged-executable smoke, packaged keyboard/gamepad control smoke, validates live deployment evidence, validates trailer candidate evidence, and writes `test-results/steam-rc-verify-*/report.json`; latest full same-build pass is `test-results/steam-rc-verify-2026-05-18T04-28-43-110Z/report.json`, covering build, provenance, Steam assets, store metadata, same-build desktop package, packaged executable smoke, packaged controls smoke, audio mix, live deployment, browser smoke, 10-minute release playtest, trailer evidence, and release-readiness audit.
- Latest full smoke evidence: `test-results/smoke-2026-05-17T20-48-00-762Z/`.
- Latest full Electron smoke evidence: `test-results/electron-smoke-2026-05-17T20-47-44-231Z/`.
- Latest packaged executable smoke evidence: `test-results/packaged-exe-smoke-2026-05-18T04-30-05-927Z/`.
- Latest packaged keyboard/gamepad control smoke evidence: `test-results/packaged-control-smoke-2026-05-18T04-30-21-377Z/`.
- Latest full 10-minute release playtest evidence: `test-results/release-playtest-2026-05-17T20-49-05-026Z/`.
- Latest Nova Swarm asset-path cleanup smoke: `test-results/smoke-2026-05-17T12-43-09-328Z/`; latest short release preflight after that cleanup: `test-results/release-playtest-nova-asset-paths-20260517-1444/`.
- Latest ElevenLabs SFX polish smoke: `test-results/smoke-2026-05-17T12-53-11-080Z/`; latest short release preflight after that SFX pass: `test-results/release-playtest-nova-sfx-20260517-1454/`.
- Latest generated bonus-core cleanup: built-in imagegen source and runtime sprite at `public/art/generated/nova-bonus-core-drone-source-20260517.png` and `public/sprites/generated/nova-bonus-core-drone-20260517.png`; local smoke passed at `test-results/smoke-2026-05-17T13-30-19-186Z/`, 60-second release playtest passed at `test-results/release-playtest-bonus-core-20260517-1530/`, and live-domain smoke passed at `test-results/smoke-2026-05-17T13-36-30-834Z/`.
- Latest powerup HUD meter polish: focused visual check passed at `test-results/manual-powerup-hud-20260517-1553/powerup-hud.png`, local smoke passed at `test-results/smoke-2026-05-17T13-55-24-048Z/`, and live-domain smoke passed at `test-results/smoke-2026-05-17T13-59-45-653Z/`.
- Latest ElevenLabs SFX round: five additional original cues for enemy fire, player hit, extra life, wave clear, and game-over drop are wired through `src/audio/SoundCatalog.js`; `npm run smoke` passed at `test-results/smoke-2026-05-17T14-42-08-464Z/`, 60-second release playtest passed at `test-results/release-playtest-nova-sfx-round2-20260517-1646/`, refreshed desktop smoke passed at `test-results/electron-smoke-2026-05-17T14-48-45-481Z/`, production deploy is `https://27ad6da0.burt-game.pages.dev`, and live-domain smoke passed at `test-results/smoke-2026-05-17T14-50-59-402Z/`.
- Latest trailer editorial candidate: refreshed current-build trailer capture/audio draft in `release/steam-trailer/draft-2026-05-17-current/`, branded H.264/AAC candidate in `release/steam-trailer/candidate-2026-05-17-current/`, clean contact sheet at `release/steam-trailer/candidate-2026-05-17-current/candidate-contact-sheet.png`, and release-readiness audit validation now points at the current trailer evidence.
- Latest public-ID cleanup: old private-era enemy/powerup IDs were replaced with public arcade names in source/runtime state, and `scripts/audit-release-readiness.mjs` now blocks those old tokens from tracked player-facing/release text. `npm run build` passed with build ID `v2026-05-17_17-10-09`, `npm run smoke` passed at `test-results/smoke-2026-05-17T15-10-33-460Z/`, a 60-second release playtest passed at `test-results/release-playtest-public-ids-20260517-1712/`, fast RC verification passed at `test-results/steam-rc-verify-2026-05-17T15-13-44-874Z/report.json`, production deploy is `https://b1268ed2.burt-game.pages.dev`, and live-domain smoke passed at `test-results/smoke-2026-05-17T15-15-50-823Z/`.
- Latest ElevenLabs combo/boss SFX polish: generated and peak-trimmed `nova_combo_tick.mp3`, `nova_combo_breakout.mp3`, `nova_boss_phase_surge.mp3`, and `nova_level_clear_medal.mp3`; `npm run check:audio`, `npm run audit:audio-mix`, `npm run build` (`v2026-05-17_17-22-17`), local smoke (`test-results/smoke-2026-05-17T15-22-38-858Z/`), 60-second release playtest (`test-results/release-playtest-combo-sfx-20260517-1724/`), and live-domain smoke (`test-results/smoke-2026-05-17T15-26-11-417Z/`) passed. The new production deploy is `https://1bf4d215.burt-game.pages.dev`.
- Latest Steam store/trailer handoff hardening: `release/steamworks/store_metadata_draft.json`, `docs/steam-store-handoff.md`, and `docs/reviews/2026-05-17-human-release-approval.md` now point at the current editorial trailer candidate, `scripts/check-steam-store-metadata.mjs` requires a separate `trailerCandidate` path, and provenance now scans the latest trailer draft plus the editorial candidate package. `npm run verify:steam-rc` passed at `test-results/steam-rc-verify-2026-05-17T15-31-51-005Z/report.json`, production deploy is `https://dbb96973.burt-game.pages.dev`, and live-domain smoke passed at `test-results/smoke-2026-05-17T15-33-01-368Z/`.
- Latest visual/store screenshot polish: gameplay backdrop brightness was raised for clearer Steam screenshots without changing UI layout, `scripts/capture-steam-screenshots.mjs` now captures a deterministic level-three midgame swarm shot, and the upload shortlist now has 8 candidates including `04-midgame-swarm-escalation.png`. Local smoke passed at `test-results/smoke-2026-05-17T15-46-48-261Z/`, 60-second release playtest passed at `test-results/release-playtest-brighter-screenshots-20260517-1749/`, fast RC verification passed at `test-results/steam-rc-verify-2026-05-17T15-48-33-729Z/report.json`, production deploy is `https://aecc337d.burt-game.pages.dev`, and live-domain smoke passed at `test-results/smoke-2026-05-17T15-52-19-049Z/`.
- Latest desktop package freshness hardening: `npm run verify:steam-rc` now rebuilds, packages `release/desktop/win-unpacked/Nova Swarm.exe`, runs Electron smoke, and validates the package against the same current build before continuing. Fast RC verification passed at `test-results/steam-rc-verify-2026-05-17T16-16-07-474Z/report.json`; refreshed current-build package evidence passed at `test-results/electron-smoke-2026-05-17T16-34-19-392Z/` for build `v2026-05-17_18-24-59`.
- Latest enemy visual variety polish: enemy runtime variants expanded from 48 to 288 by combining 48 public enemy archetypes with six arcade palette modes while preserving hitboxes and behavior. `npm run build` passed with build ID `v2026-05-17_18-24-59`, local smoke passed at `test-results/smoke-2026-05-17T16-25-22-067Z/`, 60-second release playtest passed at `test-results/release-playtest-enemy-variants-20260517-1831/`, production deploy is `https://4bad5f8b.burt-game.pages.dev`, live-domain smoke passed at `test-results/smoke-2026-05-17T16-31-53-830Z/`, and same-build Electron package smoke passed at `test-results/electron-smoke-2026-05-17T16-34-19-392Z/`.
- Latest ElevenLabs UI SFX polish: generated `nova_menu_tick.mp3`, `nova_pause_in.mp3`, `nova_pause_out.mp3`, and `nova_ship_lock_chime.mp3`; pause/resume and ship-start confirmation now use bespoke cabinet cues instead of generic door/powerup sounds. `npm run check:audio`, `npm run audit:audio-mix`, `npm run check:provenance`, `npm run build` (`v2026-05-17_18-38-06`), local smoke (`test-results/smoke-2026-05-17T16-38-34-421Z/`), same-build Electron package smoke (`test-results/electron-smoke-2026-05-17T16-40-53-251Z/`), release-readiness audit, and live-domain smoke (`test-results/smoke-2026-05-17T16-42-11-196Z/`) passed. The new production deploy is `https://cef05b11.burt-game.pages.dev`, and the new MP3s return `200 audio/mpeg` from `https://burt.tinyfoundry.app`.
- Latest UI clutter pass: boss/sector/wave payoff messages now reserve short focus windows so lower-priority top/corner chatter waits instead of competing with major reward beats. `npm run build` passed with build ID `v2026-05-17_19-42-24`, local smoke passed at `test-results/smoke-2026-05-17T17-44-02-942Z/`, 60-second release playtest passed at `test-results/release-playtest-toast-focus-20260517-1940/`, fast RC verification passed at `test-results/steam-rc-verify-2026-05-17T17-42-23-650Z/report.json`, production deploy is `https://7fc7e98f.burt-game.pages.dev`, and live-domain smoke passed at `test-results/smoke-2026-05-17T17-46-50-312Z/`.
- Latest Steam screenshot refresh: `npm run capture:steam-screenshots` captured 10 clean current-build screenshots at `release/steam-screenshots/draft-2026-05-17-current/`, and the 8-shot upload shortlist plus `steam_upload_candidate_sheet.png` were refreshed from that capture. The capture report records build `v2026-05-17_21-11-41` and has zero console events, page errors, or bad responses.
- Latest Steam trailer refresh: `npm run capture:steam-trailer`, `npm run render:steam-trailer-audio`, and `npm run render:steam-trailer-candidate` refreshed `release/steam-trailer/draft-2026-05-17-current/` and `release/steam-trailer/candidate-2026-05-17-current/`. The visual, audio, and candidate reports all record build `v2026-05-17_21-11-41`; the candidate report passes with a 49.92 second 1280x720 H.264/AAC video, `mean_volume: -19.1 dB`, `max_volume: -0.8 dB`, and a clean contact sheet.
- Latest full RC verification and deploy: `npm run verify:steam-rc -- --full` passed at `test-results/steam-rc-verify-2026-05-17T18-05-06-172Z/report.json`; its 10-minute release playtest survived 599,943 ms, reached the level 5 boss, ended alive with 3 lives and score 60,245, and reported zero routine console events, console errors, page errors, bad responses, or request failures. The same verified build was deployed to `https://c6e46d27.burt-game.pages.dev`; `https://burt.tinyfoundry.app/version.json` reports `v2026-05-17_20-05-06`, and live-domain smoke passed at `test-results/smoke-2026-05-17T18-20-17-561Z/`.
- Latest current-build Steam trailer refresh: `npm run capture:steam-trailer`, `npm run render:steam-trailer-audio`, and `npm run render:steam-trailer-candidate` produced `release/steam-trailer/draft-2026-05-17-current/` and `release/steam-trailer/candidate-2026-05-17-current/`. `npm run audit:release-readiness` validates the current trailer visual report, audio-mix report, candidate report, and contact sheet; the audit still reports only the known manual blockers.
- Latest packaged desktop/live deployment/full-RC/human-review/client-preflight hardening: `npm run desktop:smoke:packaged` proves the actual packaged `Nova Swarm.exe` can launch and render from `release/desktop/win-unpacked/`, `npm run desktop:controls:packaged` proves the packaged payload accepts keyboard movement/fire/pause and virtual gamepad movement/fire/pause, `npm run check:live-deployment` makes the private-domain deploy a tracked release gate, `npm run check:full-rc` turns the latest full verifier plus 10-minute playtest into tracked release evidence, `npm run steamworks:human-review` generates a current human approval packet, and `npm run steamworks:client-preflight` summarizes the exact Steam upload/client-validation handoff. Latest full Steam RC verification passed at `test-results/steam-rc-verify-2026-05-18T04-28-43-110Z/report.json`; its 10-minute release playtest survived 599,837 ms, reached the level 5 boss, ended alive with 3 lives and score 49,222, and reported zero routine console events, console warnings/errors, page errors, bad responses, or request failures. Release audit now has 18 automated passing checks and still blocks only on Steamworks IDs, Steam-client validation, and human approval.
- Latest ElevenLabs powerup SFX polish: generated and wired `nova_chain_lightning_arc.mp3`, `nova_magnet_pull_warble.mp3`, `nova_ghost_phase_shift.mp3`, `nova_time_slow_warp.mp3`, `nova_drone_launch_blip.mp3`, and `nova_orbital_strike_charge.mp3` so signature powerups no longer reuse generic pickup/door/forcefield cues. `npm run check:audio`, `npm run audit:audio-mix`, `npm run build` (`v2026-05-17_19-02-53`), local smoke (`test-results/smoke-2026-05-17T17-03-18-499Z/`), 60-second release playtest (`test-results/release-playtest-powerup-sfx-20260517-1905/`), same-build Electron package smoke (`test-results/electron-smoke-2026-05-17T17-06-10-987Z/`), and live-domain smoke (`test-results/smoke-2026-05-17T17-08-18-562Z/`) passed. The new production deploy is `https://5512b567.burt-game.pages.dev`, and the new MP3s return `200 audio/mpeg` from `https://burt.tinyfoundry.app`.
- Latest public score-flow cleanup: removed the old private reward prompt and non-English game-over/leaderboard copy from the runtime score flow, stopped sending old reward fields with score submissions, and added forbidden-term guards for the removed public-facing tokens. `npm run build` (`v2026-05-17_19-19-49`), local smoke (`test-results/smoke-2026-05-17T17-20-19-607Z/`), same-build Electron package smoke (`test-results/electron-smoke-2026-05-17T17-22-26-391Z/`), `npm run check:desktop-package`, `npm run audit:release-readiness`, and live-domain smoke (`test-results/smoke-2026-05-17T17-25-04-274Z/`) passed. The deployed JS on `https://burt.tinyfoundry.app` was scanned for the removed score-flow token set and returned no matches.
- Latest legacy reward cleanup: removed the remaining old reward schema/API path, stopped accepting or returning old reward metadata in highscore submissions, sanitized stale/private highscore names before backend and frontend display, and expanded `npm run audit:release-readiness` to scan `functions/` plus `schema.sql`. Fast same-build RC verification passed at `test-results/steam-rc-verify-2026-05-17T18-52-00-617Z/report.json`, Electron smoke passed at `test-results/electron-smoke-2026-05-17T18-53-11-442Z/`, production deploy is `https://cff33a4d.burt-game.pages.dev`, `https://burt.tinyfoundry.app/version.json` reports `v2026-05-17_20-52-01`, live-domain smoke passed at `test-results/smoke-2026-05-17T18-55-14-381Z/`, and a live highscore API check returned no old token/reward/private-name leakage.
- Latest evidence freshness hardening: screenshot capture reports now record `public/version.json`, `npm run audit:release-readiness` now rejects screenshot and desktop package evidence that does not match the current build, screenshots and the 8-shot upload shortlist were refreshed from build `v2026-05-17_21-02-17`, same-build Electron smoke passed at `test-results/electron-smoke-2026-05-17T19-05-29-070Z/`, production deploy is `https://3849bb8a.burt-game.pages.dev`, `https://burt.tinyfoundry.app/version.json` reports `v2026-05-17_21-02-17`, and live-domain smoke passed at `test-results/smoke-2026-05-17T19-06-29-798Z/`.
- Latest trailer evidence freshness hardening: trailer visual, audio, and editorial-candidate reports now carry current build metadata, and `npm run audit:release-readiness` rejects stale trailer evidence that does not match `public/version.json`. Current build verification passed for screenshots, trailer reports, desktop package evidence, provenance, Steam store metadata, release-readiness audit, production deploy `https://c440d94c.burt-game.pages.dev`, and live smoke `test-results/smoke-2026-05-17T19-16-07-189Z/`.
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

> A fast modern arcade score-chaser: dodge readable swarms, blast a boss every level, grab chaotic bonus cores, and restart instantly for one more run.

Long description draft:

> Nova Swarm is a fast modern arcade score-chaser about surviving wave after wave of choreographed space nonsense. Pick your ship, dodge incoming fire, grab ridiculous bonus cores, and push through escalating enemy formations toward oversized boss encounters.
>
> The game blends shoot-'em-up clarity with public arcade-comedy personality: readable bullets, compact wave briefings, original space-cabinet art, punchy radio callouts, local highscore fallback, and accessibility sliders for screen shake and player focus.

Feature bullets draft:

- Arcade wave shooting with handcrafted early pacing and escalating late-game pressure.
- Boss gates, victory beats, sector transitions, and score rewards.
- Keyboard, gamepad, and mobile touch control support.
- Context-aware music pools for menu, gameplay, boss, victory, and game over.
- Optional story intro with replay from the menu, never blocking quick play.
- Punchy radio callouts with music ducking.
- Accessibility controls for screen shake and player-focus visibility.
- Offline/local highscore fallback when the network is unavailable.

Suggested tags:

- Arcade
- Shoot 'Em Up
- Space
- Retro
- Bullet Hell
- Action
- Singleplayer
- Controller
- 2D
- Score Attack
- Indie

## Missing Store Materials

These are not proven ready in the repo yet:

- Final Steam screenshot upload approval. A curated 8-shot upload shortlist now exists at `release/steam-screenshots/steam-upload-candidates-2026-05-17/`, but the user still needs to approve the final Steamworks upload choices/captions.
- Final trailer or short launch clip. A clean refreshed 43.90 second 1280x720 visual/audio trailer draft exists at `release/steam-trailer/draft-2026-05-17-current/`, and a 49.92 second H.264/AAC editorial candidate with branded title/outro cards exists at `release/steam-trailer/candidate-2026-05-17-current/`, but the final clip still needs by-ear approval and human upload approval.
- Final store page copy approval, including public arcade-comedy tone, localization stance, and confirmation that old inside-joke material has been removed from player-facing surfaces.
- Final Steamworks metadata entry/approval. A structured store metadata draft now exists and passes `npm run check:steam-store`, but it is intentionally marked `draft_pending_human_approval`.
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
- `npm run desktop:smoke:current` passes and captures an Electron wrapper screenshot for the current `public/version.json` build.
- `npm run package:steam:win:current` produces `release/desktop/win-unpacked/Nova Swarm.exe` without rebuilding a different version.
- `npm run desktop:smoke:packaged` proves the packaged executable launches and renders from `release/desktop/win-unpacked/`.
- `npm run desktop:controls:packaged` proves packaged keyboard and gamepad movement/fire/pause paths.
- `npm run check:desktop-package` validates the packaged executable against the latest Electron smoke, packaged executable smoke, and packaged controls smoke reports, then writes tracked desktop package evidence.
- `npm run capture:steam-trailer` produces a clean trailer draft report with no browser or network failures.
- `npm run render:steam-trailer-audio` produces an audio-mixed MP4 draft report from shipped assets.
- `npm run render:steam-trailer-candidate` produces a branded H.264/AAC trailer candidate, contact sheet, and clean report from the refreshed draft.
- `npm run check:steam-assets` validates Steam asset dimensions/transparency and regenerates the review contact sheets.
- `npm run check:provenance` validates asset provenance inventory coverage and denied private/internal path terms without claiming legal approval.
- `npm run check:steam-store` validates structured Steam store metadata, supported platform, launch option, tags/categories, conservative controller support, and v1 decisions for Steam Cloud/achievements.
- `npm run check:live-deployment` validates the private-domain deployment and latest live-domain smoke report against the current build.
- `npm run check:full-rc` validates the latest full Steam RC verifier, local browser smoke, and 10-minute release playtest against the current build.
- `npm run steamworks:human-review` refreshes the human approval packet without marking approval.
- `npm run steamworks:client-preflight` refreshes the Steam upload/client-validation preflight packet without claiming Steam-client validation has passed.
- `npm run audit:release-readiness` has no hard artifact/content failures and records only known manual blockers.
- `npm run verify:steam-rc` passes in fast mode and writes a summary report.
- `npm run verify:steam-rc -- --full` passes and writes a summary report.
- `npm run playtest:release` survives at least 10 minutes without debug flags.
- A human 10-15 minute playthrough confirms late boss pressure, repair/mercy generosity, game-over/restart flow, and UI clutter feel right.
- A human listening pass confirms menu, gameplay, wave clear, boss inbound, boss fight, victory, and game-over mix on headphones or speakers.
- Final store screenshots and trailer are captured from the release build.
- Final store assets are checked against current Steam templates and thumbnail readability.

## Next Agent Actions

- Enter real Steamworks app/depot IDs, run `npm run steamworks:write-vdf`, upload with local SteamCMD, then validate install/launch through the Steam client and write `release/steamworks/client_validation_report.json`.
- Review and approve the final screenshot shortlist, trailer candidate, capsule art, store copy, and provenance/legal posture in `docs/reviews/2026-05-17-human-release-approval.md`.
- Run the human by-ear audio pass using the Settings SFX/VOICE audition buttons plus natural gameplay.
- Run one normal-skill human playthrough and record specific notes on late boss pressure and whether field repair/last-stand repair feels fair or too generous.
