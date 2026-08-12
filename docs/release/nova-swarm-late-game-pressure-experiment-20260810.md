# Nova Swarm late-game pressure experiment

Date: 2026-08-10

Status: local experimental implementation and QA handoff; not packaged or released

## Product boundary

This work is a hidden, temporary late-game playground for controlled developer and experienced-player testing. It is not an official run mode, a promised feature, or a new leaderboard identity.

The experiment is deliberately tucked inside Settings under Experimental tools. It never appears alongside Pure, Tactical, Scout, Daily Signal, Sector Run, or Overrun. Every test requires a fresh acknowledgement and explicit `START EXPERIMENT` action. The experiment state exists for that run only and is cleared on return to the menu.

Every experiment is unranked and awards nothing. The central run policy disables:

- global and local leaderboard submissions
- achievements
- Career progress and personal bests
- checkpoints and unlocks
- Hangar and ship-use progress
- Codex discoveries
- Pilot Orders and season progress
- persistent rewards and Steam Cloud progression attributable to the run

No telemetry, copied summary, feedback, browser editor, forum post, or publication is sent automatically.

## Scenario and fixture contract

Standard Test is the comparable default. It starts at Sector 75 with a deterministic seed, canonical 25-minute elapsed-pressure hydration, exactly three lives, a fixed starting fixture, and a ten-sector window. Tactical tests retain the normal post-boss augment draft before the next sector; Pure tests remain draft-free. Reaching the end opens the local report; it is a measurement window, not a proposed ending for ranked Nova Swarm.

Endurance Test supports Sectors 60, 75, 100, 120, and 150, with either three lives or a disclosed 12-life mature-stock fixture. It continues until death or voluntary retirement and never presents itself as a naturally reached sector.

The reproducible fixture set is:

| Fixture | Contract |
| --- | --- |
| Pure control | Real Pure rules, zero Tactical augments, no permanent Pierce |
| Tactical control without Pierce | Mature disclosed damage, cadence, movement, Focus Lens, multi-lane, and Chain Lightning loadout without Pierce |
| Tactical bounded Pierce | The same saturation loadout with the two-hit permanent-Pierce comparison |
| Tactical unlimited Pierce | The current unlimited permanent-Pierce behavior retained as a maintainer comparison |

The Phase Pulse comparison is Tactical-only. Pulse-on adds the disclosed Phase Wake source to the otherwise matched fixture; pulse-off does not. Pure always retains zero Tactical augments, even if an old or malformed draft requests Pulse.

Each preset hydrates an explicit late-run pressure profile instead of resetting the run clock while accidentally applying opening pressure.

## Experiment-only combat comparisons

Permanent Tactical Pierce has explicit projectile provenance separate from temporary powerup Pierce and ship-trait Pierce.

- Bounded permanent Pierce hits the primary target and one additional target only.
- The second hit deals 70% damage.
- The experiment removes only the opaque permanent-Pierce 3% damage haircut.
- Chain Lightning may originate once per projectile.
- Temporary powerup Pierce remains unlimited.
- Ship-trait Pierce retains its separate three-hit contract.
- No enemy becomes secretly unpierceable and no sector-based invisible degradation exists.

The experimental Phase Pulse keeps the satisfying all-bullets-inside-the-ring clear:

- strongest contributing radius instead of additive hidden stacking
- configurable 72 px maximum
- configurable two-second clear recharge
- movement dodge remains available while the clear recharges
- no bullet-count cap leaves visually equivalent bullets behind

Focus Lens is preserved unchanged. Normal Pure, Tactical, Scout, Daily Signal, Sector Run, and Overrun projectile and pulse balance is unchanged.

## Authored high-sector pressure

The old generated-wave slicing path is gone. A protocol sector now creates exactly five planned beats before enemy construction:

1. Opening Read
2. Priority Problem
3. Coordinated Escalation
4. Conversion or Relief
5. Climax and Boss Lead-in

The current compact protocol deck is intentionally limited to:

- Tractor Intercept
- Escort Debt
- Shifting Front

Generic Crossfire is folded back into formation vocabulary. The old Hunter Pair, Tractor-plus-mine-layer combination, large candidate catalog, and redundant Sector-80 support behavior are removed from the active experiment.

Sector 75, 100, 120, and 150 depth profiles change formations, tactics, role sequencing, and relief timing while retaining the same five-beat structure. They do not raise challenge through a new raw-health, projectile, or entity multiplier.

Tractor Intercept guarantees:

- one loss-of-control source at most
- at least 1400 ms warning
- 1100 ms active pull
- a visible 32% escape lane
- a centered priority target reachable by the narrow one-lane Pure fixture
- a 260 ms deterministic break hold
- a 7200 ms deterministic recovery
- no random debuff, mine layer, or forced lane shift

All simultaneous registered hazards share one aggregate 42% footprint budget. The hostile-projectile cap remains 48, minimum entry telegraph remains 1080 ms, and boss health remains capped at 280.

From the Sector-60 pressure profile onward, an eligible boss receives exactly one deterministic, announced, three-enemy ordinary-support event. Random reinforcement, healing, loss-of-control, lane-denial, and additional chaos support are suppressed for that encounter. The event does not multiply boss health.

## Local results report

Experiment completion or voluntary retirement automatically opens a localized Test Report. It records:

- version, scenario, full deterministic seed in copied text, and compact seed code on screen
- underlying Pure or Tactical ruleset
- start sector and hydrated pressure profile
- fixture, fixed augments, life stock, and Pulse availability
- sectors completed, life losses, and damage events
- Pierce hits, effective penetrations, and Chain Lightning origins
- Pulse activations and bullets cleared
- Tractor pulls, breaks, average break time, and deterministic recovery
- projectile and aggregate hazard peaks
- authored wave-segment count and significant active-combat stalls

`COPY TEST SUMMARY` uses the existing local clipboard bridge. The report asks about pacing, repetition, Tractor readability, Phase Pulse necessity, Pierce/Chain crowd control, and performance. Copying never submits or publishes anything.

All launcher, HUD, Pause, Game Over, report, copy, and feedback text is complete in English, German, Spanish, Russian, Simplified Chinese, Brazilian Portuguese, Korean, and Japanese.

## Runtime evidence

Focused authored-encounter, aggregate-hazard, Tractor, and deterministic boss-support runtime evidence:

- `test-results/high-sector-runtime-2026-08-10T12-49-03-567Z`

Real-browser comparison matrix:

- `test-results/high-sector-benchmarks-2026-08-10T11-50-58-392Z`

The matrix covers Pure, Tactical without Pierce, bounded Pierce, unlimited Pierce, matched Tactical Pulse on/off, narrow non-piercing Pure Tractor, Sectors 75/100/120/150, Standard/Endurance, ordinary/Reduced Motion, and three-life/mature-stock fixtures.

Each case executes the real game runtime, all five authored beats, real projectile collision contracts, the Pulse clear/recharge path, and the complete announced boss-support segment. Targets are aligned and cleared by scripted real projectiles after the 1.2-second authored read so the run is bounded and reproducible. Forced clearances are counted. The player remains invulnerable, so recorded deaths and damage are correctly zero for this safety harness and are not survival evidence.

The artifact records complete segment duration, Pierce and Chain results, Pulse clears, Tractor break/recovery, projectile/hazard peaks, frame p95/p99 and frames above 33 ms, active entities and pools, forced-GC heap before/peak/after, busy-event stalls, progression bytes, and Cloud scheduler activity.

Across the nine cases, frame p95 was 17.0-17.2 ms, p99 was 17.3-18.3 ms, and cases recorded 0-6 frames above 33 ms during the full automated sequence. The experiment's active-combat stall counter remained zero. Bounded Pierce produced two hits and one effective penetration; unlimited Pierce produced five hits against the same five-target probe; Chain originated once per projectile. Pulse-on cleared all eight seeded bullets and blocked the immediate repeat on recharge; pulse-off cleared none. The narrow Pure Tractor probe escaped after 265 ms and entered the configured 7200 ms recovery.

No wave required a forced completion. After the 4.2-second cleanup drain, every case had zero active enemies, player bullets, hostile bullets, hazards, blooms, or score popups; one case still had two expiring particles. Reusable particle/bloom pools and renderer children remained allocated as intended. Forced-GC heap ended 21.7-26.3 MiB above the post-fixture baseline because the sequence loads and retains first-use boss/combat assets and pools. This is recorded growth, not proof of a leak or a leak-free long soak; repeated-session soak evidence remains pending.

Localized result-layout evidence:

- `test-results/late-game-experiment-report-ui-2026-08-10T12-13-36-701Z`

No automated measurement is evidence of human feel, fatigue, fairness, or natural life economy. The experiment does not prove a 60-90 minute outcome. Skilled human Standard and Endurance playtests remain pending.

## Persistence evidence

`npm run check:runtime-persistence` exercises prototype Mayhem and Overrun-style paths across combat, score, Codex, Pilot Orders, season progress, achievements, boss/sector activity, finalization, and teardown. All progression keys remain byte-for-byte unchanged, and no Cloud snapshot or IPC request is attributable to the experimental run.

The same check runs normal ranked controls and proves that legitimate ranked progression and leaderboard behavior still persist. Isolation is implemented by the run policy, not by globally disabling saves.

The real-browser comparison matrix independently repeats the byte-for-byte progression and zero-Cloud assertions for every fixture.

## Delivery and rollback

Logical commits before this documentation/QA slice:

- `2fb2addc6a3b5310299524d4dff4ab7ddf38b5b5` - inherited event-freeze and persistence integrity work
- `d7e16ce` - one-run launcher and deterministic scenarios
- `ec673e2c79dffa930106b64a5565d6b060730814` - experiment-only Pierce, Chain, and Pulse comparisons
- `4a1155bdecbfa335904052ad8f392718f411763e` - five-beat encounters, Tractor fairness, aggregate safety, and deterministic boss support

The historical prototype baseline is `d7c25a6f606233eb1bf9aff40c232426ce0c083b`. Revert the final QA/results commit first, then `4a1155b`, `ec673e2`, and `d7e16ce` in reverse order to remove this revision while preserving the inherited freeze/persistence work. Revert `2fb2add` only if the separate event-freeze changes are also intentionally being removed.

No package, Steam upload, branch assignment, deployment, publication, Git push, Steamworks change, leaderboard mutation, browser/forum draft, or public post was performed in this task.
