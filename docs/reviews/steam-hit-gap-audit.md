# Nova Swarm Steam Hit Gap Audit

Updated: 2026-05-19

Lens: cynical Steam shopper, retro arcade player, shmup readability reviewer, and release engineer. This is not a Steam-ready declaration. Current automated release evidence is strong, but real Steamworks IDs, Steam client validation, and human approvals remain blockers.

## Scorecard

| Area | Score | Evidence / Reason |
|---|---:|---|
| Store hook | 8 | "Fast modern arcade score-chaser" is focused and avoids clone language. It still needs the proximity-score verb front-loaded harder. |
| First screenshot | 9 | Upload candidates now lead with current-build gameplay and include a visible `TRACTOR HIJACK` payoff, boss inbound/fight, score flow, and ship variety. Final thumbnail order still needs human curation. |
| First 10 trailer seconds | 9 | The current trailer opens on Tractor Hijack payoff, boss gate, and active boss fire, and now stages Graze Break later in the cut. Human by-ear approval is still required. |
| First 60 seconds of gameplay | 9 | Current smoke/release playtest evidence shows quick play, active waves, a level-2 boss loop, readable HUD, stable audio, and clean no-error play. |
| Input feel | 7 | Keyboard/gamepad movement/fire/pause are proven in packaged smoke; analog movement still behaves mostly digital in runtime code. |
| Enemy/bullet readability | 8 | Strong art, cleaner HUD, and the new hijacker beam proof show readable danger lanes. Effects/toasts still need monitoring during dense waves. |
| Boss telegraphs | 8 | Boss phase shifts now remix signatures by archetype, move the arena anchor, expose safe-lane telemetry, and pass focused phase/telegraph/contact/adds checks. The faster level tempo makes boss footage easier to capture, but trailer-proof shots still need a pass. |
| Powerup clarity | 8 | HUD powerup check exists and smoke validates label/bounds. |
| Score/combo/restart compulsion | 9 | Danger-dodge streaks, instant restart, next-ship motivation, and separate local/global leaderboard qualification now give the death screen a stronger one-more-run job. |
| Ship unlock motivation | 8 | 25 ships are unlock-gated with real trait/stat differences; game over now surfaces next/new unlock motivation. |
| UI/text density | 9 | The remaining player-facing Courier/monospace/Impact-style holdouts were removed from Pixi UI, menus, HUD, score popups, game over, highscore, ship screens, overlays, and the public page. Center-lane toasts still need monitoring during dense waves. |
| Audio punch | 8 | The announcer now has event pools, no-repeat guards, global-score fanfare, a Tractor Hijack payoff line, and local FFmpeg arcade-radio processing. Current assets are still local fallback TTS because ElevenLabs returned HTTP 401 and this loop used no API key, so human by-ear approval and a stronger licensed voice source remain important. |
| Surprise mechanic freshness | 9 | Hijacker tractor beam now has a rare `TRACTOR HIJACK` payoff, and the new `GRAZE BREAK` turns close-dodge skill into a charged bullet-parry score burst. The game now has both rare enemy-event reversal and player-authored reversal hooks. |
| Steam tag accuracy | 8 | Tags are now focused and Bullet Hell was removed from the first metadata set. |
| Controller expectations | 7 | Runtime support and packaged control smoke exist; Steam metadata correctly stays at Partial Controller Support pending Steam client validation. |
| Steam readiness honesty | 9 | Release audit reports only the three manual blockers instead of pretending release-ready. |
| Would I wishlist this from the store page? | 8 | Better than generic retro, with Tractor Hijack and Graze Break giving it real "show me that again" hooks. The fallback voice still caps premium feel. |
| Would I play another run after dying? | 9 | Instant restart, local score saving, global qualification fanfare, and separate board status make the score chase clearer and less fragile. |

## Top Five Highest-Impact Changes

1. **Licensed premium voice pass:** regenerate the new line pools with working ElevenLabs access or another approved professional voice source.
2. **Progression tempo:** shorten the path to level 10 without making the first minute messy or unfair. Implemented this loop; the latest 10-minute playtest reached level 10 alive.
3. **Game-over motivation:** strengthen death screen with next/new ship unlock, one-input/gamepad retry, and separate local/global board status. Implemented this loop.
4. **Store claim cleanup:** remove Bullet Hell from first metadata set and avoid "Controller Ready" language until Steam client validation. Implemented this loop.
5. **Combat readability:** keep HUD/toasts off danger lanes; rename ambiguous SHOTS label. Implemented the quick HUD label fix, but larger toast/telegraph work remains.

## Current Top Risks

- Trailer candidate is current-build and shows Tractor Hijack payoff before boss footage; the capture pipeline now also stages Graze Break during the later close-dodge beat. Human by-ear and Steamworks review remain required.
- Boss behavior is less samey after phase-specific movement/signature/safe-lane work. Remaining risk is store-media breadth: the trailer proves one boss clearly, but not the full variety of later bosses.
- The new voice system fixes line structure/repetition and now has a stronger no-key DSP pass, but the local fallback performance is still not as premium as a licensed pro/neural performance.
- Leaderboard flow now has distinct local/global qualification, local fallback, and a tested global-offline path. Remaining risk is live public-domain verification and by-eye polish of the highscore tab presentation.
- Public web build and marketing site are live; the latest Graze Break build and current Tractor Hijack/Graze Break media/handoff evidence are verified against the private domain.
- Steam client validation cannot happen until real app/depot IDs and credentials exist.
- Human approvals are still required for screenshots, trailer, capsules, audio, store copy, and legal/provenance.

## Evidence Snapshot

- Latest full RC pass: `test-results/steam-rc-verify-2026-05-19T03-13-45-995Z/report.json`
- Latest full-RC release playtest: `test-results/release-playtest-2026-05-19T03-17-16-274Z/report.json` (survived 599,876 ms, reached level 8, 3 lives, score 70,934, zero console/page/network/request failures)
- Progression tempo check: `test-results/progression-tempo-2026-05-18T22-57-10-297Z/report.json`
- Leaderboard split check: `test-results/leaderboard-split-2026-05-18T22-14-22-735Z/report.json`
- Latest local smoke: `test-results/smoke-2026-05-19T03-16-09-334Z/report.json`
- Latest Electron current smoke after desktop global endpoint split: `test-results/electron-smoke-2026-05-18T22-14-22-276Z/report.json`
- Boss phase variety check: `test-results/boss-phase-variety-2026-05-18T22-22-16-003Z/report.json`
- Latest boss-variety release playtest: `test-results/release-playtest-2026-05-18T22-23-32-068Z/report.json`
- Latest live smoke: `test-results/smoke-2026-05-19T03-07-48-633Z/report.json`
- Current Steam screenshot capture: `release/steam-screenshots/draft-2026-05-17-current/report.json`
- Current Steam trailer candidate: `release/steam-trailer/candidate-2026-05-17-current/report.json`
- Current trailer opening check: `test-results/steam-trailer-opening-2026-05-19T03-11-33-729Z/report.json`
- Tractor hijack check: `test-results/tractor-hijack-2026-05-18T23-59-51-037Z/report.json`
- Latest solo release playtest after tractor hijack: `test-results/release-playtest-2026-05-19T00-10-31-915Z/report.json` (survived 599,979 ms, reached level 10, 2 lives, score 67,066, zero console/page/network/request failures)
- Typography payoff check: `test-results/tractor-hijack-2026-05-19T00-54-16-898Z/report.json`
- No-key announcer Tractor Hijack proof: `test-results/tractor-hijack-2026-05-19T02-00-44-037Z/report.json`
- Graze Break proof: `test-results/graze-break-2026-05-19T03-06-55-653Z/report.json`
- Current deployed build: `v2026-05-19_05-06-23` at `https://burt.tinyfoundry.app`
- Steam payload manifest: `release/steamworks/steam_payload_manifest.json` (74 files, 628,266,044 bytes)
- Release audit: `docs/reviews/release-readiness-audit-2026-05-17.json`
- Steam handoff packet: `release/steamworks/release_handoff_packet.json`
- Live game URL: `https://burt.tinyfoundry.app`
- Marketing site URL: `https://burt.tinyfoundry.app/nova-swarm/`

## Next Best Loop

Highest remaining anti-flop loop: add one more tight replay-compulsion/readability pass around late-level tempo and score-chase clarity, then replace the local fallback announcer with a licensed premium performance when an approved no-key/pro-source path exists.
