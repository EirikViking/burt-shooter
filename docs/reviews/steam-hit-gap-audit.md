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
| Enemy/bullet readability | 7 | Strong art and cleaner HUD, but effects/toasts can still compete with danger lanes. HUD now says THREATS instead of SHOTS. |
| Boss telegraphs | 6 | Boss gates and signatures exist; regular attack previews need stronger lane warnings before this becomes store-trailer proof. |
| Powerup clarity | 8 | HUD powerup check exists and smoke validates label/bounds. |
| Score/combo/restart compulsion | 8 | Danger-dodge streaks and non-combo bonus popups improved the score loop; game over now teases ship unlock progress and gamepad restart. |
| Ship unlock motivation | 8 | 25 ships are unlock-gated with real trait/stat differences; game over now surfaces next/new unlock motivation. |
| UI/text density | 7 | Store/menu copy is focused, but center-lane toasts should be monitored during dense waves. |
| Audio punch | 8 | Full RC passed audio catalog and mix audit; human by-ear approval remains required. |
| Steam tag accuracy | 8 | Tags are now focused and Bullet Hell was removed from the first metadata set. |
| Controller expectations | 7 | Runtime support and packaged control smoke exist; Steam metadata correctly stays at Partial Controller Support pending Steam client validation. |
| Steam readiness honesty | 9 | Release audit reports only the three manual blockers instead of pretending release-ready. |
| Would I wishlist this from the store page? | 7 | Better than generic retro, but trailer first 10 seconds and screenshot peak-action proof still need one more pass. |
| Would I play another run after dying? | 8 | Instant restart plus next-ship unlock tease now gives a concrete reason to retry. |

## Top Five Highest-Impact Changes

1. **Trailer first 10 seconds:** move boss-inbound/boss-pattern proof earlier and include close-dodge scoring before the first transition.
2. **Boss regular telegraphs:** add more persistent lane previews for normal boss attacks, not only phase/signature telegraphs.
3. **Game-over motivation:** strengthen death screen with next/new ship unlock and one-input/gamepad retry. Implemented this loop.
4. **Store claim cleanup:** remove Bullet Hell from first metadata set and avoid "Controller Ready" language until Steam client validation. Implemented this loop.
5. **Combat readability:** keep HUD/toasts off danger lanes; rename ambiguous SHOTS label. Implemented the quick HUD label fix, but larger toast/telegraph work remains.

## Current Top Risks

- Trailer candidate is gameplay-first but not yet boss-first enough for the stated differentiator.
- Boss attack readability is still the largest gameplay trust risk for Steam shoppers.
- Public web build and marketing site are live, but the latest gameplay edits still need a fresh deploy before they are the public version.
- Steam client validation cannot happen until real app/depot IDs and credentials exist.
- Human approvals are still required for screenshots, trailer, capsules, audio, store copy, and legal/provenance.

## Evidence Snapshot

- Full RC pass: `test-results/steam-rc-verify-2026-05-18T16-23-39-833Z/report.json`
- Latest full RC after the game-over/store loop: `test-results/steam-rc-verify-2026-05-18T17-22-27-089Z/report.json`
- Release playtest: `test-results/release-playtest-2026-05-18T16-27-27-019Z/report.json`
- Latest release playtest: `test-results/release-playtest-2026-05-18T17-26-03-259Z/report.json`
- Release audit: `docs/reviews/release-readiness-audit-2026-05-17.json`
- Live game URL: `https://burt.tinyfoundry.app`
- Marketing site URL: `https://burt.tinyfoundry.app/nova-swarm/`

## Next Best Loop

Do a trailer/readability loop: move boss proof inside the first 10 seconds, capture a close-dodge scoring moment, add regular boss lane warnings if needed, rerun smoke/build/check-store, then regenerate trailer/screenshot evidence.
