# Predator expansion and readability pass — 2026-09-08

## Baseline and authorization

User approved the reliability/readability pass, stronger and more varied snakes, richer encounter/pickup audio, sector HUD spacing and investigation of Railbreaker. Subsequently approved ten additional snake species. Continue the existing Steam testing workflow; no public promotion or Steamworks service-setting changes.

Verified requested worktree `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822`, branch `codex/astra-visual-overhaul`, clean baseline `e3f14db6dc87ed1408d1fb4296eccbcfb7bc1ef4`; fetched and checked branch/HEAD/status/worktree ownership before implementation. All changes in this pass are task-owned.

## Delivered behavior

- Fourteen snakes: existing Cinder, Thorn, Widow and Abyss plus Grave Eel, Crimson Hammer, Mantis Coil, Sunforge Wyrm, Obsidian Sawtooth, Pearl Lamprey, Copper Tempest, Amethyst Oracle, Carrion Procession and Eclipse Dragon. Ten new imagegen heads; species differ in length (7–14 sections), thickness, palette, route period, starting route and shot cadence. Eight routes blend over 1.6 seconds; a new route starts every 6.5–8.9 simulation seconds. Runtime enemy speed/slow-time also applies.
- Section health starts at 18 at sector 6 (previously 4), heads have twice the section health. Health rises with progression, capped at 258 per ordinary section. Head volleys now use their cooldown directly rather than additionally waiting for the ordinary-enemy random firing gate. The aimed fan alternates width and gains two projectiles from sector 25.
- Preserve earliest sector 6 and randomized 20% eligible ordinary-wave probability. No forced every-fifth-wave schedule. Preserve exclusions for challenges, special reinforcements, Daily Signal and the experiment.
- Exclude live snakes from ordinary straggler dives/retreats. The old system could tint them red and prematurely remove them. A bounded 180-second emergency watchdog remains, with no victory bounty for forced cleanup. Authored colors survive inherited damage-flash restoration.
- Fourteen individual ElevenLabs hunt/death pairs, a shared arrival omen, six ordinary wave fly-in cues, six boss voice families with three escalating phase performances each, and ten distinct core reward cues: 63 new files. Boss profile chooses a family and pitch; these are not fifty individually recorded voices. Critical moments briefly lower music; new gun sounds can yield mix priority. Related species voices grow more strained as their bodies are destroyed.
- Snake defeat retains the existing section-break cascade, bounty and cadence-gated reward. Rare cores still grant scores/collection progress, never powers. Their randomized 2–4-sector cadence and single-active-core limit remain; a snake kill does not bypass those limits. Core capture adds rings, small fragments, score feedback and a prominent pickup sound, with reduced-motion handling and cleanup.
- Full stories and combat tips for all fourteen snakes in English, German, Spanish, Russian, Simplified Chinese, Brazilian Portuguese, Korean and Japanese. New stylized species names intentionally remain identical across locales; no other deliberate English fallback.
- HUD sector, wave, bar and directive rows stack using measured text bounds inside a taller panel. Persistent trait display remains contextual as previously approved.
- Railbreaker’s old narrow appearance came from very long cannon artwork fitting the sprite height limit. New imagegen art shortens the rails and widens the hull; identity, weapons, stats and hitbox remain unchanged. In-game measured sprite 70.61 × 99.29 with radius 13. This changes the gameplay texture, not the existing 3D showroom model.
- Four easily confused powerup glyphs now have bold distinct silhouettes: Void Crown, Stasis Net, Chrono Anchor and Rail Surge. Codex full artwork remains unchanged.
- Settings focus now draws above the button background, with a filled/stroked selection. Shoulder buttons change pages; left/right adjust values. Hangar Escape returns to the main menu; unlocked ship status retains the actual unlock requirement.
- Rift Reprisal now converts clears from the complete dodge pulse, including the innate ship pulse. Retains five-shard cap, source attribution, score neutrality and duplicate guards. No broad power or progression rebalance.
- Optional Steam availability/persona lookups on results are time-bounded. No root cause for the deleted long-run crash report was established; do not claim it fixed. This was deliberately a bounded investigation.

## Evidence and limits

- `check-core-serpent`: fourteen unique head/voice identities, health progression, path continuity and diversity, route bounds at three resolutions, all eight Codex languages, bonus rewards/cadence and fuel multipliers. Random encounter sample 1934/10000, 31 distinct gap lengths.
- `check-tyrian-dodge-pulse`: innate-only owned Rift, Phase-only and combined clears, source attribution, five-shard cap, interruption and duplicate guards. Updated expectations reflect approved total-clear behavior; did not weaken the cap.
- Bounded lookup helper checked for success, rejection and a never-settling service.
- `check-predator-runtime`: isolated source browser, fourteen staged snakes, direct entity updates while paused, touching live sections, textures, all fourteen defeats and Codex discovery, ten core rewards and no powers/duplicate grants. This is not a natural playthrough or an FPS measurement. Earlier harness attempts mixed normal wave cleanup with injected encounters and were rejected as invalid fixtures; final report explicitly records the paused scenario.
- `check-predator-focused`: actual Railbreaker identity and texture, HUD bounds in EN/DE/RU/ZH at 960–1920 widths, Settings shoulder navigation, four glyphs, core effect/audio event, three boss-phase voice events, snake watchdog at 90 seconds, and result UI despite a deliberately stalled platform lookup (6.28 seconds including scene transition). No browser errors.
- `check:i18n-ui`: 80 captures across all eight languages, including Settings/menu/HUD/pause/results/leaderboard states, no placeholders/English leaks/page errors. `check:controller-flow` passed. Steam Electron bridge passed.
- `build:current` passed its required guard chain and production build; existing large-bundle warning remains. Final committed build and package verification recorded below after packaging.
- Audio provenance, original files and final decoded peak/mean levels are preserved under `docs/predator-audio-20260908/`. Gain-only mastering preserves dynamics and headroom. Decode/level checks and playback-event checks are not a human listening review.
- Preserve unresolved prior sector-90 13.1-second stall and inherited pacing/Overrun check limitations from the handoff. No long-run crash reproduction, full natural campaign playthrough, live leaderboard submission or Steam Cloud round trip was performed here.

## Delivery

Completed: Build 25183937 is verified on `sector-continue-test`. Detailed package and Steam receipts follow below. No public deployment or Steamworks service-setting changes were performed.

### Final package verification

Runtime commit: `e2f9433` (source baseline `e3f14db`). Final `build:current` and release-line guard passed. Windows package: `test-results/astra-build-2026-09-08T09-22-06-396Z/win-unpacked/Nova Swarm.exe`. Steam native modules/SDK staging and package runtime checks passed. All 63 mastered files match the packaged static snapshot by SHA256.

`test-results/predator-native/report.json`: packaged executable and isolated profile verified. Eclipse Dragon remained at ten active sections during a fifteen-second observation, changing from hook to figure-eight. Head health 36, body health 18 at sector 6; joints 73.53 pixels apart; authored colors retained. Full defeat and fourteen-entry Codex passed with no page errors. Native screenshots are under `test-results/predator-native/`.

Source QA scripts are committed under `scripts/check-predator-runtime.mjs` and `scripts/check-predator-focused.mjs`. Native package QA is `scripts/check-predator-native.mjs`. Direct/staged fixtures are explicitly labeled; they do not prove human fun, full campaign balance, natural completion, listening quality or removal of the historical long-run stall.

Changed file groups: snake configuration/entity/manager/death presentation; fourteen-species Codex text; new art and audio with provenance/mastering receipts; SoundCatalog/asset manifest; boss/core audio and pickup effects; HUD, Settings, Hangar, Player Rift conversion, result lookup helper; focused checks and this report. No leaderboard storage rules, existing rewards, ship stats/hitboxes, Steam Cloud configuration or public announcements changed.

### Steam delivery — verified 2026-09-08 09:40:49 UTC

- App 4765070, depot 4765071; testing branch `sector-continue-test`: **Build 25183937**, manifest **5768472008275080347**.
- Public/default remains **25169120**; `test-build` remains **23782673**. Steam Cloud settings compared before/after and unchanged. No public promotion, announcement, store update or Steamworks service-setting change.
- Payload: 410 regular files, 1,692,957,465 bytes, verified from the tested package. Steam's 470-entry count includes directories. ASAR SHA256 `d670af4c7691d9d78ff43fad76a57ae877e0d2ed04cdd81ecbf3a72a24aa9044`.
- Receipt: `docs/predator-steam-delivery-20260908.json`; detailed upload, payload and fresh app-info evidence: `test-results/predator-steam-e2f9433/`.
- Steam testing: Properties → Betas → `sector-continue-test`, update and launch. Selecting None returns to public. Existing user saves were not used or modified by the isolated automated checks.
- Source rollback from a clean checkout: `git revert e2f9433`. This does not change Steam; a Steam rollback would be a separately authorized test-branch operation.
- Runtime is `e2f9433`; the following delivery commit adds documentation/native QA and whitespace-only script cleanup, without changing shipped game code or assets.
