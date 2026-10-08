# Codex repair, combat tuning and celebration presentation

Verified baseline: `6320591a000f237a2cb5cd24fb6810cdb3e1f416`, branch `codex/astra-visual-overhaul`, uniquely owned by `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822`. Root instructions and latest handoff were read; fetch, branch, HEAD, clean status and worktree ownership were checked before editing. Runtime implementation is `3001143`; build check updates are `3146d60` and `14eb656`. The production candidate identifies `14eb656`.

## Delivered scope

1. Hyper-Rail uses a new transparent 1254px ImageGen electromagnetic cannon. The primitive arrow override was removed. The same asset supplies gameplay, draft cards and the Codex. Existing distinctness, transparency, edge and 48px readability checks remain active; their native-size expectation now accommodates this specific asset.
2. The Lives display uses the selected ship portrait, a legible count and the existing Tours tally. The three confusing dots represented bronze/silver/gold mastery, not lives. Mastery progress and Hangar medals are unchanged.
3. Overrun has a full-screen authored triumph gate, slow cinematic reveal, 72 bounded firework glints, the existing physical ship coronation and a larger title. A new nine-second ElevenLabs victory cue replaces the old coronation cue. Confirmation, rewards and reduced-motion behavior are preserved.
4. Menu ambience gain rises from 0.65 to 0.80, approximately 23%, retaining volume controls, ducking and crossfades.
5. All 14 snakes fire their aimed volleys 18% more frequently. Health, bullet damage, spawn cadence, sector-6 eligibility and entry safety remain unchanged.
6. Fuel deliveries request 12–20% of boss maximum health, derived by doubling the profile's existing amount and clamping that delivery range. Boss support healing never raises HP above 60%; a boss already above 60% is neither healed nor reduced. Other healing sources retain their existing ceiling. Actual healed HP still drives feedback and the support ship is consumed on delivery.
7. Personal records use a new physical gold/titanium/cyan medal and a new 3.48-second ElevenLabs reward cue. The live celebration's vector crown/ribbons and the result screen's large flat ellipse/rays are removed. The result medal respects reduced motion.
8. Hangar Back closes the remembered Other Modes surface and returns directly to menu home.
9. The previous Codex clipping change incorrectly set `renderable=false` on the mask. Pixi also respects that flag during the stencil pass, suppressing the masked artwork. The mask now uses `includeInBuild=false`, keeping it out of normal drawing while allowing the stencil pass to render it. This corrects the preceding delivery's regression. Actual support, drone, core, augment and snake pages were captured after the correction.
10. A noninteractive audio tip appears on application launch 1, 10, 20, and so forth. Returning to the menu does not count as another launch. It waits for the menu ship to be ready, fades in, stays briefly and fades out; leaving home dismisses it. All eight locales are supplied. English: “Crew too chatty? Engines too loud? Tame sounds and voices in Settings. The swarm has no mute button.”

## Evidence

ImageGen and ElevenLabs provenance is in `celebration-polish-20260908/`. Original generated files are preserved. ElevenLabs used the existing included commercial allowance with no paid overage. Audio durations were verified with ffprobe. Existing audio controls govern both new cues; no local synthesized substitute was introduced.

Source checks: `check:i18n`, `check:release-line`, the full `build:current` guard chain and compilation, `check:i18n-ui` (eight locales, 80 screenshots), controller-only flow, `check-celebration-polish.mjs` and `check-celebration-details.mjs`. Focused checks cover five healing boundary cases, 56 snake profile/depth combinations, launch cadence and repeat suppression, Hangar Back, five Codex artwork categories, live record and Overrun presentation. Page errors, placeholder hits and untranslated English leaks were empty. Visual evidence is under `test-results/celebration-polish/`.

The production check initially rejected the intentionally changed fuel amount and higher-resolution icon. Those narrowly scoped expectations were updated; the guard chain subsequently passed. The existing bundle-size warning remains. No new untranslated text remains.

The complete static candidate contains 10,466 files: 10,461 byte/hash-identical files linked from the prior immutable build, five new asset files copied from source. Mutable source assets are never hardlinked. Candidate: `test-results/celebration-polish-dist`; proof: `test-results/celebration-polish/static-proof.json`.

Windows package and Steam test delivery are complete; verification is recorded below. No public release, Steamworks service setting, forum post or forum draft change is authorized by this delivery. Historical performance/pacing observations remain unresolved; the user's testing bot remains unavailable. Automated checks are not a human verdict on balance, sound or enjoyment.

Rollback after verifying clean ownership: revert the delivery documentation commit, then `git revert 14eb656 3146d60 3001143`. The prior Steam test build is `25193882`; do not change public/default.

## Changed files

- docs/celebration-polish-20260908/audio-provenance.json
- docs/celebration-polish-20260908/imagegen-provenance.json
- public/art/celebration-polish-20260908/hyper-rail.png
- public/art/celebration-polish-20260908/overrun-victory.png
- public/art/celebration-polish-20260908/personal-best.png
- public/audio/sfx/celebration-polish-20260908/overrun-triumph.mp3
- public/audio/sfx/celebration-polish-20260908/personal-record.mp3
- scripts/check-boss-support-ships.mjs
- scripts/check-celebration-details.mjs
- scripts/check-celebration-polish.mjs
- scripts/check-powerup-assets.mjs
- scripts/check-powerup-icon-distinctness.mjs
- scripts/generate-celebration-polish-audio.mjs
- src/assets/assetManifest.js
- src/audio/AudioManager.js
- src/audio/SoundCatalog.js
- src/effects/CelebrationArt.js
- src/effects/ReadablePowerupIcons.js
- src/entities/Boss.js
- src/entities/SpaceSnake.js
- src/i18n/menuAudioText.js
- src/managers/EnemyManager.js
- src/scenes/GameOverScene.js
- src/scenes/MenuScene.js
- src/scenes/PlayScene.js
- src/scenes/ShipSelectScene.js
- src/scenes/ThreatCodexScene.js
- src/ui/HUD.js
- src/ui/MenuAudioTip.js

## Packaged validation

Windows packaging and native Steam runtime validation passed. The isolated executable verified 120 preserved fleet asset hashes, 38 preserved bonus drone hashes and all five new asset hashes, menu model rotation, audio mode/voice controls, menu-to-gameplay audio handoff, Overrun backdrop and 72 glints, personal-record presentation, Med Towboat Codex art, and direct Hangar Back. No page errors. The package is test-results/astra-build-2026-09-08T22-17-04-274Z/win-unpacked/Nova Swarm.exe. Native evidence is in celebration-polish-20260908/native-report.json; packaged screenshots remain in test-results/celebration-polish/native/. The source server and isolated QA application were closed. The extra result-screen capture waited for cold-loaded artwork before visual inspection.


## Verified Steam test delivery

Steam server verified at 2026-09-08T22:59:30.908Z: Build **25197058**, **sector-continue-test**, depot 4765071, manifest **2649458119870364649**. Public remains **25169120** and test-build remains **23782673**; the entire Cloud configuration block is unchanged. Payload: 410 regular files, 2005877166 bytes. ASAR SHA256: 7f9f6692d8fff5bb4dfc3021c9c2879db0de93ef30a945bd1454373577c6773c. Receipt: celebration-polish-steam-delivery-20260909.json. The 470 Steam listing entries include directories, while the payload proof counts regular files. All ten items are complete. A Steam-client download and human playtest are not claimed.

Steam automatically retried HTTP 0/408 chunk timeouts, then accepted 211 new chunks and completed the build. No duplicate upload was started.
