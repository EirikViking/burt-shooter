# Nova Swarm Mayhem Performance Diagnostics - 2026-06-21

## Purpose

This private diagnostic build adds an opt-in runtime profiler for the remaining Mayhem cadence issue seen in `performance-video/mayhem_run4.mp4`. The goal is to isolate whether the hitch comes from HUD/high-score chase work, particles, starfield/background work, score popups, leaderboard target priming, or core combat update cost.

No gameplay balance, save format, Steam leaderboard identity, achievements, Steamworks metadata, or profile rescue behavior is changed by this diagnostic pass.

## Enable Diagnostics

Diagnostics are disabled by default.

Supported enable paths:

- URL: `?novaPerfDiag=1`
- Local storage: `novaSwarm.mayhemPerformanceDiagnostics.v1` with `{"enabled":true}`
- In the running build: press `Ctrl+Shift+F8` to toggle the overlay on or off.

The overlay writes a compact live summary to the top-left corner:

- average, p95, and max measured PlayScene frame update time
- current sector, run mode, enemy count, bullet count, particle count, score popup count, boss hazard count
- the highest-cost update sections in the most recent sampled frame
- active diagnostic toggles

The same data is available in DevTools:

```js
window.__novaMayhemPerformanceDiagnostics.getReport()
```

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
2. Start Mayhem normally and watch for the cadence issue.
3. Press `Ctrl+Shift+F8` to show the overlay.
4. Reproduce the issue and note the top update sections when the stutter appears.
5. Toggle one subsystem at a time:
   - `Ctrl+Shift+1` high-score chase widget
   - `Ctrl+Shift+2` HUD update
   - `Ctrl+Shift+3` particles
   - `Ctrl+Shift+4` starfield
   - `Ctrl+Shift+5` score popups
6. Restart the run after changing `noLeaderboardTargets`; it only affects target priming before launch.

## Automated Coverage

`npm run check:mayhem-performance-diagnostics` verifies:

- diagnostics can be enabled by URL
- the overlay appears
- real PlayScene sections are sampled
- counts are reported
- toggles persist to local storage
- high-score chase can be hidden by the diagnostic toggle
- `Ctrl+Shift+F8` disables the profiler
- `noLeaderboardTargets` prevents target priming when set before Mayhem launch

## Recommendation

Use this diagnostic build to collect subsystem evidence before the next performance fix. The previous MP4 analysis showed clean encoded frame timing but repeated low-motion-then-jump optical events, which points toward a gameplay/render cadence issue rather than just the high-score text counter.
