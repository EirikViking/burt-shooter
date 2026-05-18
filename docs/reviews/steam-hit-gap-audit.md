# Nova Swarm Steam Hit Gap Audit

Updated: 2026-05-18

Lens: cynical Steam shopper, retro arcade player, shmup readability reviewer, and release engineer. This is not a Steam-ready declaration. Current automated release evidence is strong, but real Steamworks IDs, Steam client validation, and human approvals remain blockers.

## Scorecard

| Area | Score | Evidence / Reason |
|---|---:|---|
| Store hook | 8 | "Fast modern arcade score-chaser" is focused and avoids clone language. It still needs the proximity-score verb front-loaded harder. |
| First screenshot | 7 | Upload candidates now lead with gameplay, but the first shot could be more explosive and show a close dodge or pickup payoff. |
| First 10 trailer seconds | 6 | Gameplay starts immediately, but the boss proof arrives after the first 10 seconds. That underdelivers on "boss every level." |
| First 60 seconds of gameplay | 8 | Current smoke/release playtest evidence shows quick play, active waves, readable HUD, and stable audio. |
| Input feel | 7 | Keyboard/gamepad movement/fire/pause are proven in packaged smoke; analog movement still behaves mostly digital in runtime code. |
| Enemy/bullet readability | 8 | Strong art, cleaner HUD, and the new hijacker beam proof show readable danger lanes. Effects/toasts still need monitoring during dense waves. |
| Boss telegraphs | 7 | Focused checks now prove regular boss attack telegraphs and boss-contact behavior. More pattern variety and trailer-proof boss moments remain valuable. |
| Powerup clarity | 8 | HUD powerup check exists and smoke validates label/bounds. |
| Score/combo/restart compulsion | 8 | Danger-dodge streaks and non-combo bonus popups improved the score loop; game over now teases ship unlock progress and gamepad restart. |
| Ship unlock motivation | 8 | 25 ships are unlock-gated with real trait/stat differences; game over now surfaces next/new unlock motivation. |
| UI/text density | 8 | Font normalization now improves menu/HUD/game-over text, and the mobile comms banner no longer collides with the HUD stack. Center-lane toasts still need monitoring during dense waves. |
| Audio punch | 8 | Full RC passed audio catalog and mix audit; human by-ear approval remains required. |
| Surprise mechanic freshness | 7 | Hijacker tractor beam adds a named clip-worthy mechanic with counterplay and score payoff. The game needs more of this kind of authored surprise, not more generic enemy count. |
| Steam tag accuracy | 8 | Tags are now focused and Bullet Hell was removed from the first metadata set. |
| Controller expectations | 7 | Runtime support and packaged control smoke exist; Steam metadata correctly stays at Partial Controller Support pending Steam client validation. |
| Steam readiness honesty | 9 | Release audit reports only the three manual blockers instead of pretending release-ready. |
| Would I wishlist this from the store page? | 7 | Better than generic retro, but trailer first 10 seconds and screenshot peak-action proof still need one more pass. |
| Would I play another run after dying? | 8 | Instant restart plus next-ship unlock tease now gives a concrete reason to retry. |

## Top Five Highest-Impact Changes

1. **Voice/audio reboot:** make the female arcade announcer identity memorable, short, replay-safe, and less generic.
2. **Leaderboard split and celebration:** clearly separate local/global qualification and make global entry feel rare and premium.
3. **Game-over motivation:** strengthen death screen with next/new ship unlock and one-input/gamepad retry. Implemented this loop.
4. **Store claim cleanup:** remove Bullet Hell from first metadata set and avoid "Controller Ready" language until Steam client validation. Implemented this loop.
5. **Combat readability:** keep HUD/toasts off danger lanes; rename ambiguous SHOTS label. Implemented the quick HUD label fix, but larger toast/telegraph work remains.

## Current Top Risks

- Trailer candidate is gameplay-first but not yet boss-first enough for the stated differentiator.
- Boss attack readability is improved, but boss variety still needs more authored phase/pressure differences before it becomes a store-page strength.
- Voice/audio identity and leaderboard excitement are now the largest unresolved commercial-differentiation risks.
- Public web build and marketing site are live; the latest hijacker/typography build is deployed and verified at the private domain.
- Steam client validation cannot happen until real app/depot IDs and credentials exist.
- Human approvals are still required for screenshots, trailer, capsules, audio, store copy, and legal/provenance.

## Evidence Snapshot

- Full RC pass after hijacker/typography loop: `test-results/steam-rc-verify-2026-05-18T20-46-55-786Z/report.json`
- Latest release playtest: `test-results/release-playtest-2026-05-18T20-50-34-771Z/report.json`
- Release audit: `docs/reviews/release-readiness-audit-2026-05-17.json`
- Steam handoff packet: `release/steamworks/release_handoff_packet.json`
- Live game URL: `https://burt.tinyfoundry.app`
- Marketing site URL: `https://burt.tinyfoundry.app/nova-swarm/`

## Next Best Loop

Do the voice/audio reboot next, while refreshing Steam handoff evidence for the current build first. The announcer should become a memorable arcade identity, not background narration.
