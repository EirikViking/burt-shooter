# Voice Audio Upgrade Audit

Updated: 2026-05-19

## Decision

The highest-impact anti-flop issue after the hijacker/typography loop was voice identity. The old runtime still shipped generic root-level voice clips and only one mission-control file per common event, so repeated runs risked feeling like placeholder narration.

## ElevenLabs Status

- Environment key presence was checked without printing the key.
- ElevenLabs `/v1/user` returned HTTP 401.
- Current generated assets are therefore local fallback TTS, not ElevenLabs.
- The blocker is credential/access validity, not missing local tooling.

## What Changed

- Rewrote weak mission-control and intro lines into shorter arcade-announcer copy.
- Generated 41 fallback female announcer MP3s with `Microsoft Zira Desktop`.
- Removed 36 legacy root-level stock voice MP3s from `public/audio/voice` so they do not ship from the public folder.
- Added variation pools for launch, wave start, wave clear, boss inbound, boss defeat, combo, low-life, powerup, local highscore, global highscore, personal best, game over, restart, hijacker warning, and intro narration.
- Added per-event no-repeat voice bags in `AudioManager`.
- Put mission-control lines in the exclusive `announcer` group to prevent overlap clutter.
- Rewired legacy `war_target`, `war_look_out`, `mission_complete`, and root `power_up` runtime paths to the new announcer events.
- Added a huge global leaderboard qualification moment: `nova_highscore_chime` plus `mission_control_global_highscore`.
- Added local/offline highscore and personal-best voice moments with smaller mix settings.
- Added combo milestone and instant-restart announcer hooks with cooldowns.

## Tests

- `npm run check:audio` passed after the catalog rewrite.
- `npm run check:announcer-voice` passed with 14 event pools and 41 manifest voice assets.
- `npm run audit:audio-mix` passed with no warnings after mix tuning.
- `npm run build` produced `v2026-05-18_23-27-36`.
- Local smoke passed at `test-results/smoke-2026-05-18T21-28-04-507Z/report.json`.
- Live private-domain smoke passed at `test-results/smoke-live-announcer-2026-05-18T23-27/report.json`.
- Full Steam RC verification passed at `test-results/steam-rc-verify-2026-05-18T21-34-54-911Z/report.json`; its release playtest survived 599,940 ms, reached level 6, ended alive with score 70,008, and had zero console/page/network/request failures.
- Steam handoff passed with no stale evidence for `v2026-05-18_23-27-36`.

## Remaining Risk

The local fallback voice is usable and female, but it is not as charismatic as a good ElevenLabs or professional performance. Commercially, the next audio pass should restore valid ElevenLabs access or approve another licensed professional voice source, then regenerate the same line pools with stronger performance direction.

## 2026-05-19 No-Key Follow-Up

User direction changed the implementation constraint to "no api key needed." The project still only has `Microsoft Zira Desktop` installed locally, so this follow-up did not claim a new premium provider. Instead, it improved the fallback path and added one high-value runtime moment.

### What Changed

- `npm run generate:announcer-voicepack` now applies a local FFmpeg arcade-radio chain: subtle pitch/tempo lift, formant preservation, EQ, compression, limiter, subtle echo, and loudness normalization.
- Added `mission_control_tractor_hijack` with three short payoff lines for the rare beam-reversal mechanic.
- Wired `PlayScene.triggerTractorHijack()` to force the payoff voice through the exclusive announcer group when the hijack actually captures enemies/bullets.
- Updated `npm run check:tractor-hijack` so it verifies both the score payoff and the `mission_control_tractor_hijack` voice event.
- Catalog coverage increased from 14 to 15 event pools and from 41 to 44 manifest voice assets.

### Tests

- `npm run generate:announcer-voicepack` regenerated 44 MP3s with `Microsoft Zira Desktop`.
- `npm run build` produced `v2026-05-19_04-00-07`.
- `npm run check:audio` passed with 154 manifest assets, 89 catalog keys, and 7 music contexts.
- `npm run check:announcer-voice` passed with 15 event pools and 44 manifest voice assets.
- `npm run check:tractor-hijack` passed at `test-results/tractor-hijack-2026-05-19T02-00-44-037Z/report.json`, including voice proof `mission_control_tractor_hijack_01.mp3`.
- `npm run audit:audio-mix` passed with no warnings.
- `npm run smoke` passed at `test-results/smoke-2026-05-19T02-00-55-490Z/report.json`.
- The current build was deployed to Cloudflare Pages at `https://96a7b6ff.burt-game.pages.dev`; `https://burt.tinyfoundry.app/version.json` reports `v2026-05-19_04-00-07`.
- Live private-domain smoke passed at `test-results/smoke-2026-05-19T02-07-31-468Z/report.json`.
- Full `npm run verify:steam-rc -- --full` passed at `test-results/steam-rc-verify-2026-05-19T02-11-21-277Z/report.json`; its release playtest survived 599,937 ms, reached level 10, and reported zero console/page/network/request failures.
- Final Steam handoff refresh passed with `npm run steamworks:payload-manifest`, `npm run check:full-rc`, `npm run steamworks:human-review`, `npm run steamworks:client-preflight`, `npm run steamworks:handoff`, and `npm run audit:release-readiness`.

### Honest Assessment

This is better than the previous no-key fallback because the line pool has a stronger rare-payoff moment and the audio is less raw. It is still not a substitute for a licensed professional or high-quality neural performance. Keep the current provenance as fallback/pending human review.
