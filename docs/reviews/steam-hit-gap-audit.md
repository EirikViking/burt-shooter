# Nova Swarm Steam Hit Gap Audit

Updated: 2026-05-19

Lens: cynical Steam shopper, retro arcade player, shmup readability reviewer, and release engineer. This is not a Steam-ready declaration. Current automated release evidence is strong, but real Steamworks IDs, Steam client validation, and human approvals remain blockers.

## Scorecard

| Area | Score | Evidence / Reason |
|---|---:|---|
| Store hook | 8 | "Fast modern arcade score-chaser" is focused and avoids clone language. It still needs the proximity-score verb front-loaded harder. |
| First screenshot | 9 | Upload candidates now lead with current-build gameplay and include `TRACTOR HIJACK`, early/mid/late boss archetype proof, boss inbound/victory, score flow, and ship variety. Final thumbnail order still needs human curation. |
| First 10 trailer seconds | 9 | The current trailer opens on Tractor Hijack payoff, boss gate, and active boss fire, then shows level-5 and level-9 boss telegraph variety later in the cut. Human by-ear approval is still required. |
| First 60 seconds of gameplay | 9 | Current smoke/release playtest evidence shows quick play, active waves, a level-2 boss loop, readable HUD, stable audio, and clean no-error play. |
| Input feel | 7 | Keyboard/gamepad movement/fire/pause are proven in packaged smoke; analog movement still behaves mostly digital in runtime code. |
| Enemy/bullet readability | 8 | Strong art, cleaner HUD, and the new hijacker beam proof show readable danger lanes. Effects/toasts still need monitoring during dense waves. |
| Boss telegraphs | 9 | Boss phase shifts now remix signatures by archetype, move the arena anchor, expose safe-lane telemetry, pass focused phase/telegraph/contact/adds checks, and both Steam screenshots and the current trailer contact sheet show early, mid, and late boss telegraph variety. |
| Powerup clarity | 8 | HUD powerup check exists and smoke validates label/bounds. |
| Score/combo/restart compulsion | 9 | Danger-dodge streaks, instant restart, next-ship motivation, and separate local/global leaderboard qualification now give the death screen a stronger one-more-run job. |
| Ship unlock motivation | 8 | 25 ships are unlock-gated with real trait/stat differences; game over now surfaces next/new unlock motivation. |
| UI/text density | 9 | The remaining player-facing Courier/monospace/Impact-style holdouts were removed from Pixi UI, menus, HUD, score popups, game over, highscore, ship screens, overlays, and the public page. Center-lane toasts still need monitoring during dense waves. |
| Audio punch | 9 | The announcer now has ElevenLabs `Female misfit` mission-control/intro assets, event pools, no-repeat guards, event-level cadence suppression, reduced routine chatter, global-score fanfare tiers, and a Tractor Hijack payoff line. Human by-ear approval is still required before final Steam upload. |
| Surprise mechanic freshness | 9 | Hijacker tractor beam now has a rare `TRACTOR HIJACK` payoff, and the new `GRAZE BREAK` turns close-dodge skill into a charged bullet-parry score burst. The game now has both rare enemy-event reversal and player-authored reversal hooks. |
| Steam tag accuracy | 8 | Tags are now focused and Bullet Hell was removed from the first metadata set. |
| Controller expectations | 7 | Runtime support and packaged control smoke exist; Steam metadata correctly stays at Partial Controller Support pending Steam client validation. |
| Steam readiness honesty | 9 | Release audit reports only the three manual blockers instead of pretending release-ready. |
| Would I wishlist this from the store page? | 8 | Better than generic retro, with Tractor Hijack, Graze Break, level-10-in-10-minutes pacing, ElevenLabs voice identity, and bigger global-score fanfares. Final trailer/audio curation still caps confidence. |
| Would I play another run after dying? | 9 | Instant restart, local score saving, global qualification fanfare, and separate board status make the score chase clearer and less fragile. |

## Top Five Highest-Impact Changes

1. **By-ear voice/audio approval:** the ElevenLabs pack and new fanfares are implemented, but a final human listen pass should catch cringe, fatigue, mix imbalance, or repetition before Steam upload.
2. **Progression tempo:** shorten the path to level 10 without making the first minute messy or unfair. Implemented this loop; the latest 10-minute playtest reached level 10 alive.
3. **Game-over motivation:** strengthen death screen with next/new ship unlock, one-input/gamepad retry, and separate local/global board status. Implemented this loop.
4. **Store claim cleanup:** remove Bullet Hell from first metadata set and avoid "Controller Ready" language until Steam client validation. Implemented this loop.
5. **Combat readability:** keep HUD/toasts off danger lanes; rename ambiguous SHOTS label. Implemented the quick HUD label fix, but larger toast/telegraph work remains.

## Current Top Risks

- Trailer candidate is current-build and shows Tractor Hijack payoff before boss footage, then short level-5 and level-9 boss telegraph beats. Human by-ear and Steamworks review remain required.
- Boss behavior is less samey after phase-specific movement/signature/safe-lane work. Screenshot media and trailer contact-sheet evidence now prove early, mid, and late boss movement/telegraph profiles; remaining risk is human editorial ordering, not automated proof breadth.
- The voice system now uses the approved ElevenLabs `Female misfit` pack, bigger leaderboard fanfares, and tested launch/restart cadence guards, but it still needs final human by-ear approval for taste, fatigue, and Steam trailer mix.
- Leaderboard flow now has distinct local/global qualification, local fallback, and a tested global-offline path. Remaining risk is live public-domain verification and by-eye polish of the highscore tab presentation.
- Public web build and marketing site are live; the latest tempo build and current Tractor Hijack/Graze Break media/handoff evidence are verified against the private domain.
- Steam client validation cannot happen until real app/depot IDs and credentials exist.
- Human approvals are still required for screenshots, trailer, capsules, audio, store copy, and legal/provenance.

## Evidence Snapshot

- Latest full RC pass: `test-results/steam-rc-verify-2026-05-19T03-49-43-845Z/report.json`
- Latest full-RC release playtest: `test-results/release-playtest-2026-05-19T03-53-15-623Z/report.json` (survived 599,893 ms, reached level 11, 3 lives, score 61,056, zero console/page/network/request failures)
- Progression tempo check: `test-results/progression-tempo-2026-05-19T03-32-06-102Z/report.json`
- Leaderboard split check: `test-results/leaderboard-split-2026-05-18T22-14-22-735Z/report.json`
- Latest local smoke: `test-results/smoke-2026-05-19T21-14-53-095Z/report.json`
- Latest local smoke after voice-cadence loop: `test-results/smoke-2026-05-19T21-50-23-801Z/report.json`
- Voice cadence/restart proof: `test-results/voice-cadence-2026-05-19T21-48-17-458Z/report.json`
- Latest intro voice exclusivity proof: `test-results/intro-voice-exclusivity-2026-05-19T21-49-35-019Z/intro-voice-exclusivity.png`
- Latest Electron current smoke after desktop global endpoint split: `test-results/electron-smoke-2026-05-18T22-14-22-276Z/report.json`
- Boss phase variety check: `test-results/boss-phase-variety-2026-05-18T22-22-16-003Z/report.json`
- Latest boss-variety release playtest: `test-results/release-playtest-2026-05-18T22-23-32-068Z/report.json`
- Latest live smoke: `test-results/smoke-2026-05-19T03-45-21-670Z/report.json`
- Current Steam screenshot capture: `release/steam-screenshots/draft-2026-05-17-current/report.json`
- Current Steam screenshot shortlist: `release/steam-screenshots/steam-upload-candidates-2026-05-17/steam_upload_candidate_sheet.png` with early/mid/late boss archetype proof.
- Current Steam trailer candidate: `release/steam-trailer/candidate-2026-05-17-current/report.json` with 43.421333-second duration and later boss-variety entries.
- Current trailer contact sheet: `release/steam-trailer/candidate-2026-05-17-current/candidate-contact-sheet.png` with level-5 Neon Warden and level-9 Hyperglyph proof frames.
- Current trailer opening check: `test-results/steam-trailer-opening-2026-05-19T21-12-41-687Z/report.json`
- Latest boss telegraph check: `test-results/boss-telegraph-2026-05-19T21-12-53-294Z/report.json`
- Latest boss movement variety check: `test-results/boss-movement-variety-2026-05-19T21-13-53-002Z/report.json`
- Tractor hijack check: `test-results/tractor-hijack-2026-05-18T23-59-51-037Z/report.json`
- Latest solo release playtest after tractor hijack: `test-results/release-playtest-2026-05-19T00-10-31-915Z/report.json` (survived 599,979 ms, reached level 10, 2 lives, score 67,066, zero console/page/network/request failures)
- Typography payoff check: `test-results/tractor-hijack-2026-05-19T00-54-16-898Z/report.json`
- No-key announcer Tractor Hijack proof: `test-results/tractor-hijack-2026-05-19T02-00-44-037Z/report.json`
- Graze Break proof: `test-results/graze-break-2026-05-19T03-06-55-653Z/report.json`
- Current deployed build: `v2026-05-19_21-30-12` at `https://burt.tinyfoundry.app` and `https://novaswarm.tinyfoundry.app`
- Steam payload manifest: `release/steamworks/steam_payload_manifest.json` (74 files, 658,636,448 bytes)
- Release audit: `docs/reviews/release-readiness-audit-2026-05-17.json`
- Steam handoff packet: `release/steamworks/release_handoff_packet.json`
- Live game URL: `https://burt.tinyfoundry.app`
- Marketing site URL: `https://burt.tinyfoundry.app/nova-swarm/`

## Next Best Loop

Highest remaining anti-flop loop: by-ear curation of the final media and voice/audio package, now that automated cadence/restart checks prove the announcer does not spam the fast retry path. The listening pass should decide whether the ElevenLabs/global-score audio feels premium without becoming repetitive or slowing the one-more-run flow.
