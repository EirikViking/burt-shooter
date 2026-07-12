# Nova Swarm: 10,000 Nemesis Protocols

Date: 2026-07-13
Branch: `codex/sales-success-12000-20260713`
Baseline: `b70cf11173851e5820a415c537c89dc863265337`
Status: source and QA candidate; not packaged or deployed

## Player-facing result

Every sector's marked Ace now carries one five-digit Nemesis Protocol in addition to its original four-digit Ace identity. A protocol changes how the Ace enters, how its armor answers damage, when and how its second phase activates, and which additional score-neutral reward drops on defeat. The protocol is part of the existing Ace hunt, so it adds depth without adding another enemy, another objective tracker, or another leaderboard rule.

## Exact count

The protocol catalog is the Cartesian product:

`10 openings x 10 defenses x 10 enrage phases x 10 bonus rewards = 10,000 Nemesis Protocols`

The original `1,000 Ace Bounties` remain intact. Pairing both deterministic catalogs yields ten million possible complete Ace encounters while this delivery counts only the 10,000 new protocol entries.

### Openings (10)

1. Blitz
2. Siege
3. Hunter
4. Phantom Entry
5. Vanguard
6. Anchor
7. Spiral
8. Needle Entry
9. Hammer
10. Decoy

Openings alter bounded entry duration, hull, speed, size, cadence, projectile speed, dive tendency, and formation sway. The selected multiplier is applied to the real wave entry animation.

### Defenses (10)

1. Reactive Plating - flat bounded damage reduction
2. Phase Veil - guards the first three hits
3. Reactive Core - guards every third hit
4. Ablative Cap - caps any single hit at 22% of maximum hull
5. Crown Guard - stronger above 65% hull
6. Last Stand - stronger below 45% hull
7. Pulse Armor - guards alternating hits
8. Kinetic Sink - softens large hits
9. Swarm Screen - softens small rapid hits
10. Reserve Hull - no reduction trick, but a larger hull reserve

Every hit records its raw amount, resolved amount, defense mode, hit number, and whether the guard activated for runtime proof and accessibility state.

### Enrage phases (10)

1. Frenzy
2. Overdrive
3. Lance Mode
4. Hunt Mode
5. Storm Mode
6. Weave Surge
7. Crossfire Surge
8. Trident Surge
9. Berserk
10. Orbital Surge

Each phase has a distinct visible hull threshold and a bounded transformation of movement, cadence, projectile velocity, dive bias, sway, shot geometry, or volley program. Activation is one-shot and emits a localized Protocol Surge warning.

### Bonus rewards (10)

1. Shield
2. Bomb
3. Orbital Strike
4. Point Defense
5. Ghost Mode
6. Rapid Fire
7. Speed Up
8. Magnet
9. Drones
10. Extra Tactical Draft rescan

The bonus appears alongside the original Ace reward. Physical drops are separated spatially, rescan capacity remains capped, and neither reward adds score or XP.

## Selection and fairness contract

- One protocol is selected for the one existing Ace encounter per sector.
- Protocol selection is deterministic for the run seed and Ace sequence.
- Immediate protocol repeats are excluded when another entry exists.
- The ordinary enemy count and the promoted enemy's score value remain unchanged.
- A protocol can apply only to an Ace and cannot apply twice.
- Damage guards never increase incoming damage.
- Enrage activates once, only while the Ace is alive, at the configured visible hull threshold.
- Base and bonus rewards can each be granted only once.
- No score, XP, leaderboard, achievement, Steamworks, or save-identity rules change.

## Integrated surfaces

- Normal EnemyManager wave entry and Ace promotion path
- Enemy damage resolution and second-phase transformation
- Eight-marker Ace/Nemesis threat frame with enrage accent
- Two-line localized four-digit Ace and five-digit Nemesis identity
- Localized contact, surge, completion, and bonus feedback
- `render_game_to_text`, visible-enemy priority, pause debug state, and completion history
- Eight-language How to Play explanation
- Run Summary and Run Report v7 persistence
- Game Over Run Progress row

## Verification contract

`npm run check:nemesis-protocols` exhaustively proves:

- four explicit ten-entry axes and exactly 10,000 entries;
- unique IDs, contiguous numbers 00001-10000, and unique mechanical signatures;
- exactly 1,000 catalog entries contributed by each axis member;
- deterministic selection and immediate-repeat exclusion;
- application, score preservation, damage resolution, and enrage activation for all 10,000 entries;
- rejection on non-Aces and double-application prevention.

`npm run check:nemesis-protocol-runtime` proves in the production build:

- protocol 00001 identity, eight-marker frame, defense and enrage behavior;
- base plus bonus physical rewards and one-claim-only completion;
- Ablative Cap surviving a huge hit and requiring repeated hits;
- paired rescan rewards through the real completion path;
- localized protocol 10000 identity and compact viewport containment;
- complete accessible text-state exposure.

How to Play and Run Report checks additionally cover the exact catalog explanation, score-neutral contract, v7 persistence, responsive layout, and localized presentation.

## Competitive design basis

The design combines four proven replayability ideas: Hades-style composable challenge conditions, Risk of Rain 2-style rule modifiers, Deep Rock Galactic: Survivor-style objectives that lead to stronger and more lucrative encounters, and Brotato-style variety from interacting traits. Nova Swarm expresses those ideas as a readable two-phase target inside its existing arcade wave rhythm.

## Rollback

After the source commit is created, revert it with `git revert <commit>`.
