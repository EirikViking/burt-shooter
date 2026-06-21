# Nova Swarm Mayhem/Sector Frame Pacing - 2026-06-21

## Context

The supplied captures in `performance-video/` showed Mayhem Run visibly microstuttering while a Sector Run started from a later checkpoint looked smoother. The video files themselves are ignored and must not be committed.

## Diagnosis

The MP4 frame timestamps are clean 60 fps in both videos, so the issue is visible motion cadence inside the frames rather than an encoded-video timing defect.

The player-facing difference matched a runtime asymmetry:

- Mayhem Run is ranked and runs live career-rank preview during play.
- Sector Run is unranked and does not run live career-rank preview.
- The live Mayhem rank preview called the full `buildRunSummary()` every 300 ms.
- The full summary reads Codex discovery stats and completion counts, which normalize a large Codex profile.
- Threat Codex discovery updates also wrote the full Codex state and requested a Steam Cloud merge on every seen/defeated update.

On high-progress profiles this creates repeated main-thread JSON/localStorage/merge work during combat. Average FPS can still report near 60 while motion cadence looks uneven.

## Fix

- Added a lightweight live-rank progression summary for Mayhem that includes only XP-relevant fields.
- Deferred Threat Codex persistence while the active scene is gameplay.
- Flush pending Codex persistence on run finalization, page hide, visibility hidden, and before unload.
- Kept the in-memory Codex state authoritative during play so result screens, Scout Codex persistence, and run summaries still see current discoveries.

No Mayhem balance, Scout balance, boss tuning, wave tuning, score formula, leaderboard identity, achievements metadata, Steam bridge, Steamworks metadata, display settings, powerup art, save format, profile rescue behavior, or live saves were changed.

## Automated Check

Added:

```bash
npm run check:mayhem-sector-frame-pacing
```

The check seeds a high-progress profile with a large Codex state, launches Mayhem from Sector 1 and Sector Run from checkpoint 20, and measures:

- launch frame p50/p95/p99/max
- active-wave frame p50/p95/p99/max
- long frames above 20/25/33/50 ms
- next-wave entry frame timing
- Threat Codex localStorage write count and bytes
- full `buildRunSummary()` calls during active play
- optional optical cadence analysis of `performance-video/mayhem_run.mp4` and `performance-video/sector_run.mp4`

Latest report:

`test-results/mayhem-sector-frame-pacing-2026-06-21T11-50-02-053Z/report.json`

## Measured Evidence

Supplied video optical cadence:

| Capture | Low-motion frames | Low-then-jump cadence events | Jerk p95 |
| --- | ---: | ---: | ---: |
| Mayhem Run | 153 | 16 | 0.845 |
| Sector Run | 13 | 1 | 0.295 |

Runtime after fix:

| Scenario | Active p50 | Active p95 | Active p99 | Max | >20 ms | >33 ms | >50 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mayhem Sector 1 opening | 16.7 ms | 16.8 ms | 17.1 ms | 17.7 ms | 0 | 0 | 0 |
| Sector Run checkpoint 20 | 16.7 ms | 16.8 ms | 16.9 ms | 17.1 ms | 0 | 0 | 0 |

Runtime persistence evidence during active wave:

| Scenario | Threat Codex writes | Full run summary calls |
| --- | ---: | ---: |
| Mayhem Sector 1 opening | 1 | 0 |
| Sector Run checkpoint 20 | 1 | 0 |

The remaining single Codex write is the deferred flush, not repeated per-enemy combat work.

## Manual Test Plan

1. Launch the private test build on the high-progress Steam profile.
2. Start Mayhem Run from Sector 1 and hold continuous fire through the first waves.
3. Watch for microstutter during enemy entry, kills, and wave transitions.
4. Start Sector Run from checkpoint 20 and compare motion cadence.
5. End a Scout or Mayhem run with new Codex discoveries, restart the game, and confirm Codex discoveries persist.
6. Confirm Mayhem remains ranked and Scout/Sector remain excluded from Steam achievements and the global leaderboard as before.
