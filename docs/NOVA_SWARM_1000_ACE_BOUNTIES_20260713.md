# Nova Swarm: 1000 Ace Bounties

Date: 2026-07-13
Branch: `codex/sales-success-2000-20260713`
Baseline: `1b2c7bb`
Status: source and QA candidate; not packaged or deployed

## Player-facing result

Every sector can replace one ordinary wave enemy with a marked Ace. The Ace has a four-digit catalog number, a gold threat frame, a readable reward contract, a distinct chassis/flight/weapon combination, and a guaranteed non-score hardware reward when destroyed. The system adds a compact hunt inside the existing combat loop without adding enemies or changing the destroyed enemy's score value.

## Exact count

The catalog is the Cartesian product below:

`10 chassis x 10 flight patterns x 10 weapon packages = 1000 Ace Bounties`

### Chassis (10)

1. Bulwark
2. Interceptor
3. Gunship
4. Lancer
5. Bruiser
6. Skirmisher
7. Sentinel
8. Corsair
9. Warden
10. Phantom

Chassis changes the bounded health, speed, size, cadence, projectile-speed, and dive profile.

### Flight patterns (10)

1. Sweep
2. Pincer
3. Chain
4. Pulse
5. Orbit
6. Needle
7. Weave Wall
8. Feint
9. Split Sweep
10. Ambush

Flight patterns select a real tactical movement style plus bounded dive and sway modifiers.

### Weapon packages and rewards (10)

1. Precision - aimed fire - Shield
2. Crossfire - crossfire volley - Bomb
3. Trident - fan fire - Orbital Strike
4. Netcaster - net fire - Point Defense
5. Needle - high-speed needle fire - Ghost Mode
6. Sweeper - sweeping fire - Rapid Fire
7. Twin Burst - staggered pair - Speed Up
8. Pulse Driver - pulse volley - Magnet
9. Stagger Lance - staggered crossfire - Drones
10. Suppressor - net/crossfire suppression - one extra Tactical Draft rescan

Weapon packages change shot geometry, volley behavior, cadence, projectile speed, bounded fire pressure, and the promised reward.

## Selection and fairness rules

- Exactly one encounter is planned per sector.
- The encounter replaces an existing ordinary enemy; it does not increase the wave's enemy count.
- Variant and target wave selection are deterministic for the run seed/sector sequence.
- The immediately previous Ace ID is excluded when another catalog entry exists.
- The original enemy score value is captured and restored exactly after promotion.
- Completion is idempotent: an Ace can grant its reward only once.
- Rewards do not add score or XP and do not change leaderboard or achievement identity.
- The 1000-entry catalog is generated at module load from three explicit ten-entry axes; no runtime content generation or network dependency is involved.

## Integrated surfaces

- Enemy movement, durability, firing and threat-frame rendering
- Localized floating Ace number/reward contract
- Spawn and completion feedback
- `render_game_to_text` accessibility/automation state, with active Aces prioritized
- Pause debug state
- Eight-language How to Play explanation
- Run Summary and Run Report v6 persistence
- Game Over Run Progress row

## Verification contract

`npm run check:ace-bounties` must prove:

- exactly 10 chassis, 10 flights, 10 weapons, and 1000 variants;
- 1000 unique IDs, numbers, and mechanical signatures;
- contiguous catalog numbers 0001-1000;
- deterministic selection, repeat exclusion, and valid wave planning;
- exhaustive application of all 1000 entries to an enemy;
- score preservation and double-promotion rejection for every entry.

`npm run check:ace-bounty-runtime` must prove in the production build:

- live promotion, visible gold Ace frame, localized label, and viewport containment;
- real damage/death completion path;
- physical powerup reward and rescan reward paths;
- one-claim-only behavior;
- desktop and compact German visual proof;
- accessible text-state exposure.

How to Play and Run Report checks additionally cover the 1000-Ace explanation, score-safe promise, persistence, responsive layout, and localized presentation.

## Competitive design basis

The design follows a recurring strength in successful action roguelites: optional or variable encounter rules that create short-term goals without interrupting the core combat rhythm. It uses the same broad principle as stage modifiers/events, trials with rewards, and opt-in gameplay modifiers, but implements it as a Nova Swarm-specific readable enemy hunt.

## Rollback

After the source commit is created, revert it with `git revert <commit>`.
