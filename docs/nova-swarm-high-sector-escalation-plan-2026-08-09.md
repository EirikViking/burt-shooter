# Nova Swarm High Sector Escalation Plan

> Historical planning reference only. The active temporary experiment is documented in `docs/release/nova-swarm-late-game-pressure-experiment-20260810.md`. The older four-protocol catalog, Ascendant boss ladder, twenty-sector repeat target, and 60-90 minute outcome below are not current implementation claims, release promises, or validated results. Skilled human testing of run length and feel is still pending.

Date: 2026-08-09

Status: implementation plan, not a promise that every item ships unchanged

## Why this exists

Tyrian Mollusk reached Sector 130 and posted a score of 3,873,303. That is an extraordinary run, but it also exposes two endgame problems:

1. The strongest players can remain alive long enough for a ranked run to become an hours-long endurance test.
2. Sectors 80, 100, and beyond need new decisions and encounter identities, not only larger health and faster bullets.

The current build already provides useful foundations. Extra-life drops stop after Sector 100, Career XP accelerates for genuinely deep runs, Tactical Draft grants additional bans over time, and Overrun can begin at Sector 51 without writing to the ranked leaderboard. Those systems should be preserved.

## Design goals

- Preserve the current learning curve through Sector 50.
- Make Sector 60 onward escalate faster through coordinated threats rather than health sponges.
- Give expert players a newly readable rule, formation, or objective at least every five sectors after Sector 75.
- Make the most exceptional full ranked runs resolve in roughly 60 to 90 minutes during playtesting, instead of requiring several hours.
- Keep deaths explainable and avoid forced Phase checks, unreadable projectile speed, unavoidable bottom entries, or entity-count spikes.
- Keep late-run performance at 60 FPS on the current reference machine.

## Phase 0: evidence and guardrails

Before balance changes, capture deterministic Sector 60, 80, 100, 120, and 130 runs with slow, standard, and fast hulls.

Record:

- real time per sector and total run time
- lives gained, lost, and remaining
- damage sources and avoidability windows
- active enemy, projectile, hazard, and effect counts
- frame-time average, p95, p99, and frames above 33 ms
- combo uptime, Tactical Draft exhaustion, and boss duration

The first 50 sectors and existing leaderboard identity remain unchanged during this phase.

## Phase 1: compress late-run downtime and raise pressure safely

Starting at Sector 60, introduce a separate late-run pressure budget that rises every five sectors.

- Shorten only noninteractive briefing and cleanup time, with a readable minimum.
- Prefer mixed enemy roles, overlapping objectives, flank timing, and coordinated elites over raw projectile speed.
- Cap simultaneous hostile projectiles, hazard area, and entry speed.
- Reduce repeated low-threat waves after Sector 80. Replace them with fewer, denser authored encounters so higher difficulty does not also mean more waiting.
- Keep boss health growth bounded. Later bosses should become harder through one additional behavior or support rule, not a longer health bar alone.

Initial playtest target: pressure should rise about 10 percent per ten sectors after Sector 60, then be adjusted from survival and frame-time evidence.

## Phase 2: Deep Space Protocol deck

At Sectors 75, 80, 85, and every five sectors afterward, activate one clearly announced protocol for the next sector. Protocols use existing enemies and effects in new combinations, which adds variety without flooding the screen with new assets.

Candidate protocols:

- Crossfire Doctrine: two formations enter on linked, telegraphed lanes.
- Hunter Pair: two complementary elites coordinate pursuit and area denial.
- Escort Debt: a support ship protects a priority threat until its tether is broken.
- Shifting Front: the safe side changes once during the wave after a clear warning.
- Blackout Relay: one enemy suppresses part of the HUD until destroyed, while collision cues remain intact.
- Salvage Rush: a short optional objective offers score or utility but increases pressure while active.
- Rival Wing: a named ace returns with one new bounded modifier.
- Anomaly Weather: a Cabinet-style environmental rule changes movement or projectile rhythm without hiding threats.

Rules:

- No protocol repeats within twenty sectors.
- Every protocol gets a Codex explanation and a concise combat cue.
- Reduced Motion and all supported languages are included from the first implementation.
- Protocol selection is deterministic from the run seed so failures can be reproduced.

## Phase 3: Ascendant boss milestones

- Sector 80: bosses gain one telegraphed Ascendant modifier.
- Sector 100: the modifier can combine with one authored support formation.
- Sector 120 and beyond: two compatible modifiers may combine, but never two rules that remove the same escape lane.
- Boss entry and exit remain combo boundaries. Scoring players should not be asked to preserve a combo through boss movement they cannot control.
- Each boss milestone adds a new presentation beat and Codex entry, not merely more damage or health.

## Phase 4: terminal escalation after Sector 100

Sector 100 becomes the point where the run clearly enters terminal pressure.

- Keep the already implemented removal of extra-life drops and rewards.
- Increase the pressure budget every five sectors instead of relying on slow linear scaling.
- Introduce a visible Overrun Instability level that changes encounter composition at each step.
- After Sector 120, recovery windows become rarer but never disappear without warning.
- If expert testing still produces multi-hour runs, add a clearly announced instability surge that accelerates encounter cadence and threat combinations. Do not use invisible damage, unavoidable collisions, or an arbitrary instant kill.

## Phase 5: score and release fairness

A major high-sector rebalance changes the meaning of leaderboard scores. Before public release:

- compare current and proposed score curves with Tyrian's 3,873,303 run as a historical benchmark
- decide explicitly whether to begin a new leaderboard season or retain the existing board with a visible rules version
- preserve personal records and historical achievements
- run a closed candidate first and do not assign it to the public branch until late-sector runtime and performance evidence pass

## Acceptance gates

- Sectors 1 through 50 show no measurable difficulty or pacing regression.
- A new protocol, formation, or boss rule appears at least every five sectors after 75.
- No protocol repeats within twenty sectors.
- Slow ships always have a non-Phase escape path for telegraphed entry threats.
- Sector 100 and later produce zero extra-life drops or rewards.
- Reference-machine gameplay stays at 60 FPS with no sustained p99 regression and no entity-count leak.
- Expert playtests trend toward a 60 to 90 minute upper-end ranked run.
- Any leaderboard-season decision is explicit and reversible.

## Recommended delivery order

1. Instrument and benchmark the current high-sector build.
2. Ship late-run downtime compression and pressure budgets behind a development flag.
3. Add four protocols and the Sector 80 boss modifier.
4. Playtest through Sector 100 with three hull-speed classes.
5. Expand to eight or more protocols and Sector 100/120 boss combinations.
6. Make the leaderboard-season decision, run full release QA, then deploy.
