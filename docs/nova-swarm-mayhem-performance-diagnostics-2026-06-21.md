# Nova Swarm Mayhem Performance Diagnostics - 2026-06-21

## Purpose

This private diagnostic build adds an automatic runtime profiler for the remaining Mayhem cadence issue seen in `performance-video/mayhem_run4.mp4`. The goal is to isolate whether the hitch comes from HUD/high-score chase work, particles, starfield/background work, score popups, leaderboard target priming, core combat update cost, or a specific collision subsection.

No gameplay balance, save format, Steam leaderboard identity, achievements, Steamworks metadata, or profile rescue behavior is changed by this diagnostic pass.

## Automatic Logging

Diagnostics are enabled by default in this private branch. You do not need to press any key combination.

The build writes reports automatically to the local app data folder. It writes an initial report shortly after gameplay starts, refreshes it about every 10 seconds, and writes again when slow frames occur.

```text
%APPDATA%\nova-swarm\performance-diagnostics\run-collision-diagnostics-latest.json
```

It also writes a per-session file in the same folder:

```text
%APPDATA%\nova-swarm\performance-diagnostics\run-collision-diagnostics-<session>.json
```

The report includes:

- average, p95, and max measured PlayScene frame update time
- current sector, run mode, enemy count, bullet count, particle count, score popup count, boss hazard count
- the highest-cost update sections in the most recent sampled frame
- slow-frame samples and worst slow frames
- collision counters and collision subsection timings
- native write result/path

The same data is available in DevTools:

```js
window.__novaMayhemPerformanceDiagnostics.getReport()
```

The latest report is also cached in local storage:

```js
localStorage.getItem('novaSwarm.mayhemPerformanceDiagnostics.latestReport.v1')
```

## Optional Overlay

The overlay is hidden by default so the test can be played normally. Press `Ctrl+Shift+F8` only if you want to reveal the compact live summary.

## Diagnostic Toggles

When diagnostics are enabled, these toggles can be set through `window.__novaMayhemPerformanceDiagnostics.setOptions(...)`, local storage, URL flags, or keyboard shortcuts.

| Toggle | URL flag | Hotkey | Effect |
| --- | --- | --- | --- |
| `hideHighscoreChase` | `novaDiagHideHighscore=1` | `Ctrl+Shift+1` | Hides the high-score chase widget after HUD update. |
| `hudLite` | `novaDiagHudLite=1` | `Ctrl+Shift+2` | Skips HUD update for comparison. |
| `noParticles` | `novaDiagNoParticles=1` | `Ctrl+Shift+3` | Skips particle manager update. |
| `noStarfield` | `novaDiagNoStarfield=1` | `Ctrl+Shift+4` | Skips starfield animation update. |
| `noScorePopups` | `novaDiagNoScorePopups=1` | `Ctrl+Shift+5` | Skips score popup update. |
| `noLeaderboardTargets` | `novaDiagNoLeaderboardTargets=1` | `Ctrl+Shift+6` | Skips Mayhem high-score and global leaderboard target priming when set before run launch. |

Example DevTools command:

```js
window.__novaMayhemPerformanceDiagnostics.enable({
  hideHighscoreChase: true,
  noParticles: true,
  noStarfield: true
});
```

## Steam Test Procedure

1. Launch the private Steam test build.
2. Start Mayhem normally and play until the cadence issue appears.
3. Optionally run Sector Run too, so the same logger captures a smoother comparison mode.
4. Quit or return to menu.
5. Send or inspect `%APPDATA%\nova-swarm\performance-diagnostics\run-collision-diagnostics-latest.json`.

No hotkey sequence is required for the main test.

## Automated Coverage

`npm run check:mayhem-performance-diagnostics` verifies:

- diagnostics can be enabled by URL
- diagnostics are automatically enabled
- the overlay stays hidden by default
- real PlayScene sections are sampled
- collision subsection timings are sampled
- counts are reported
- toggles persist to local storage
- high-score chase can be hidden by the diagnostic toggle
- `Ctrl+Shift+F8` reveals the profiler overlay without disabling logging
- diagnostic reports are cached locally and can be written through the Electron bridge
- `noLeaderboardTargets` prevents target priming when set before Mayhem launch

## Recommendation

Use this diagnostic build to collect subsystem evidence before the next performance fix. The previous MP4 analysis showed clean encoded frame timing but repeated low-motion-then-jump optical events, which points toward a gameplay/render cadence issue rather than just the high-score text counter.
