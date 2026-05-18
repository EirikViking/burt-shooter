# Nova Swarm Steam Hit Gap Audit

Updated: 2026-05-19

Lens: cynical Steam shopper, retro arcade player, shmup readability reviewer, and release engineer. This is not a Steam-ready declaration. Current automated release evidence is strong, but real Steamworks IDs, Steam client validation, and human approvals remain blockers.

## Scorecard

| Area | Score | Evidence / Reason |
|---|---:|---|
| Store hook | 8 | "Fast modern arcade score-chaser" is focused and avoids clone language. It still needs the proximity-score verb front-loaded harder. |
| First screenshot | 8 | Upload candidates now lead with current-build gameplay and include the hijacker beam, boss inbound/fight, score flow, and ship variety. The first shot still could show a bigger close-dodge payoff. |
| First 10 trailer seconds | 8 | The current trailer opens on the hijacker tractor beam, boss inbound, and active boss fire before menu or score-flow footage. Human by-ear approval is still required. |
| First 60 seconds of gameplay | 9 | Current smoke/release playtest evidence shows quick play, active waves, a level-2 boss loop, readable HUD, and stable audio. |
| Input feel | 7 | Keyboard/gamepad movement/fire/pause are proven in packaged smoke; analog movement still behaves mostly digital in runtime code. |
| Enemy/bullet readability | 8 | Strong art, cleaner HUD, and the new hijacker beam proof show readable danger lanes. Effects/toasts still need monitoring during dense waves. |
| Boss telegraphs | 8 | Boss phase shifts now remix signatures by archetype, move the arena anchor, expose safe-lane telemetry, and pass focused phase/telegraph/contact/adds checks. The faster level tempo makes boss footage easier to capture, but trailer-proof shots still need a pass. |
| Powerup clarity | 8 | HUD powerup check exists and smoke validates label/bounds. |
| Score/combo/restart compulsion | 9 | Danger-dodge streaks, instant restart, next-ship motivation, and separate local/global leaderboard qualification now give the death screen a stronger one-more-run job. |
| Ship unlock motivation | 8 | 25 ships are unlock-gated with real trait/stat differences; game over now surfaces next/new unlock motivation. |
| UI/text density | 8 | Font normalization now improves menu/HUD/game-over text, and the mobile comms banner no longer collides with the HUD stack. Center-lane toasts still need monitoring during dense waves. |
| Audio punch | 8 | The announcer now has event pools, no-repeat guards, and global-score fanfare. Current assets are local fallback TTS because ElevenLabs returned HTTP 401, so human by-ear approval and a stronger licensed voice source remain important. |
| Surprise mechanic freshness | 7 | Hijacker tractor beam adds a named clip-worthy mechanic with counterplay and score payoff. The game needs more of this kind of authored surprise, not more generic enemy count. |
| Steam tag accuracy | 8 | Tags are now focused and Bullet Hell was removed from the first metadata set. |
| Controller expectations | 7 | Runtime support and packaged control smoke exist; Steam metadata correctly stays at Partial Controller Support pending Steam client validation. |
| Steam readiness honesty | 9 | Release audit reports only the three manual blockers instead of pretending release-ready. |
| Would I wishlist this from the store page? | 8 | Better than generic retro, and level 10 is now proven reachable in a 10-minute playtest. Trailer first 10 seconds and screenshot peak-action proof still need one more pass. |
| Would I play another run after dying? | 9 | Instant restart, local score saving, global qualification fanfare, and separate board status make the score chase clearer and less fragile. |

## Top Five Highest-Impact Changes

1. **Licensed premium voice pass:** regenerate the new line pools with working ElevenLabs access or another approved professional voice source.
2. **Progression tempo:** shorten the path to level 10 without making the first minute messy or unfair. Implemented this loop; the latest 10-minute playtest reached level 10 alive.
3. **Game-over motivation:** strengthen death screen with next/new ship unlock, one-input/gamepad retry, and separate local/global board status. Implemented this loop.
4. **Store claim cleanup:** remove Bullet Hell from first metadata set and avoid "Controller Ready" language until Steam client validation. Implemented this loop.
5. **Combat readability:** keep HUD/toasts off danger lanes; rename ambiguous SHOTS label. Implemented the quick HUD label fix, but larger toast/telegraph work remains.

## Current Top Risks

- Trailer candidate is now hijacker/boss-first, but the final upload still needs human by-ear and Steamworks review.
- Boss behavior is less samey after phase-specific movement/signature/safe-lane work. Remaining risk is store-media breadth: the trailer proves one boss clearly, but not the full variety of later bosses.
- The new voice system fixes line structure/repetition, but the local fallback performance is not yet premium enough to be a commercial differentiator.
- Leaderboard flow now has distinct local/global qualification, local fallback, and a tested global-offline path. Remaining risk is live public-domain verification and by-eye polish of the highscore tab presentation.
- Public web build and marketing site are live; the latest progression-tempo build and current Steam media/handoff evidence are verified against the private domain.
- Steam client validation cannot happen until real app/depot IDs and credentials exist.
- Human approvals are still required for screenshots, trailer, capsules, audio, store copy, and legal/provenance.

## Evidence Snapshot

- Latest full RC pass: `test-results/steam-rc-verify-2026-05-18T23-12-36-820Z/report.json`
- Latest full-RC release playtest: `test-results/release-playtest-2026-05-18T23-16-14-801Z/report.json` (survived 599,986 ms, reached level 10, 3 lives, score 66,356, zero console/page/network failures)
- Progression tempo check: `test-results/progression-tempo-2026-05-18T22-57-10-297Z/report.json`
- Leaderboard split check: `test-results/leaderboard-split-2026-05-18T22-14-22-735Z/report.json`
- Latest local smoke: `test-results/smoke-2026-05-18T22-57-33-823Z/report.json`
- Latest Electron current smoke after desktop global endpoint split: `test-results/electron-smoke-2026-05-18T22-14-22-276Z/report.json`
- Boss phase variety check: `test-results/boss-phase-variety-2026-05-18T22-22-16-003Z/report.json`
- Latest boss-variety release playtest: `test-results/release-playtest-2026-05-18T22-23-32-068Z/report.json`
- Latest live smoke: `test-results/smoke-live-progression-2026-05-19T00-57/report.json`
- Current Steam screenshot capture: `release/steam-screenshots/draft-2026-05-17-current/report.json`
- Current Steam trailer candidate: `release/steam-trailer/candidate-2026-05-17-current/report.json`
- Trailer opening check: `test-results/steam-trailer-opening-2026-05-18T23-49-17-385Z/report.json`
- Release audit: `docs/reviews/release-readiness-audit-2026-05-17.json`
- Steam handoff packet: `release/steamworks/release_handoff_packet.json`
- Live game URL: `https://burt.tinyfoundry.app`
- Marketing site URL: `https://burt.tinyfoundry.app/nova-swarm/`

## Next Best Loop

Do a small in-game surprise-mechanic loop next: add one more readable, score-forward twist in the spirit of the hijacker beam, but keep it rare enough that the first minute stays clean.
