# Nova Swarm: 10,000 Rival Wing Doctrines

Date: 2026-07-13
Branch: `codex/sales-success-22000-20260713`
Baseline: `95ca4abca32166d669f52a1030c7c40eb99e3c36`
Status: source and QA candidate; not packaged or deployed

## Result and exact count

The existing Ace wave now assigns its non-Ace enemies one deterministic squadron doctrine:

`10 formations x 10 disciplines x 10 synchronized volleys x 10 morale responses = 10,000 Rival Wing Doctrines`

This is an additional catalog. The original 1,000 Aces and 10,000 Nemesis Protocols remain intact, creating 100 billion possible full Ace/Nemesis/Wing set-pieces.

## Mechanical axes

- Formations: Spearhead, Pincer, Orbit, Weave, Chain, Hammer, Feint, Split, Pulse, and Ambush. They change real movement style, speed, sway, dive bias, and frame color.
- Disciplines: Standard, Armored, Rapid, Ballistic, Evasive, Siege, Skirmish, Guard, Lancer, and Pressure. They alter bounded hull, cadence, projectile speed, and fire pressure.
- Volleys: aimed, crossfire, fan, net, needle, sweep, burst, pulse, staggered, and screen. They replace real shot geometry and volley programs.
- Morale: Hold the Line, Revenge Rush, Scatter, Pincer Clamp, Shield Wall, Final Salvo, Fighting Retreat, Revenge Lances, Orbital Lock, and Morale Collapse. They transform every living or entry-delayed escort when the Nemesis phase begins; Ace death triggers the response if enrage was skipped.

## Fairness contract

- The first eligible ordinary enemy in the target wave remains the Ace; only existing non-Ace escorts receive the wing doctrine.
- No enemy is added, and every escort preserves its original score value.
- Selection is deterministic and excludes immediate repeats.
- A doctrine and its morale can each apply only once.
- Dead escorts are ignored; delayed living escorts inherit already-active morale before entry.
- No third reward is added. Score, XP, leaderboard, achievement, Steamworks, and enemy-count rules remain unchanged.

## Player and persistence surfaces

- Third localized Ace identity line with five-digit Wing number, formation, and morale
- Linked escort threat frames and morale accent
- Localized How to Play copy in all eight supported languages
- `render_game_to_text`, visible escort state, pause/Ace debug history
- Run Summary and Run Report v8 persistence

## Verification

`npm run check:rival-wing-doctrines` exhaustively proves exactly 10,000 unique IDs, numbers, signatures, applications, score-preserving escort mutations, and one-shot morale activations.

The production Ace/Nemesis runtime additionally proves doctrine 00001 and 10000 labels, escort frames, score preservation, synchronized morale, delayed-entry inheritance, localization, viewport containment, and accessible text state. The input-driven retention run must complete two natural Ace/Nemesis/Wing encounters by Sector 3.

## Rollback

After commit, use `git revert <commit>`.
