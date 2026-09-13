# Nova Swarm high-sector first slice QA

Date: 2026-08-09

Branch: `codex/high-sector-first-slice-20260809-58c9`

Immutable baseline tag: `nova-swarm-high-sector-handoff-20260809-build24637691`

Baseline commit: `baf199558b123d99a68401ec54d1a1291048c85b`

## Scope and safety

This is a disabled-by-default diagnostic prototype. It does not change Sectors 1-50, leaderboard identity, score submission, historical scores, achievements, saves, Steamworks, public/default, or forum state. No upload, deployment, publication, push, branch assignment, or edit to Tyrian reply #118 was performed.

The authenticated maintainer query `highSectorEscalation=1` arms the prototype and marks the run unranked. The release configuration remains `enabled: false`. The configuration switch can become the acceptance control later without changing the prototype's deterministic planner.

## Implemented slice

- Sector 60 pressure budget, increasing by 5 percent every five sectors and capped at 1.45.
- Briefing and cleanup compression with 520 ms and 460 ms readability floors.
- Caps of 48 hostile projectiles, 42 percent estimated hazard area, 1080 ms minimum entry duration, and 280 boss HP.
- Five authored encounters instead of repeated low-threat waves after Sector 80.
- Four deterministic protocols at Sectors 75, 80, 85, 90, and every five sectors afterward. A protocol cannot repeat before the exact twenty-sector boundary.
- Crossfire Doctrine, Hunter Pair, Escort Debt, and Shifting Front use existing enemy, elite, threat-action, support, and formation systems.
- Shifting Front announces the future safe side before mirroring the formation. Reduced Motion changes presentation duration only.
- Sector 80 adds one warned two-ship Ascendant support formation. It uses a deterministic side, preserves a non-Phase route, applies no boss-health multiplier, and delays ordinary support after release.
- All new player-facing strings are translated in English, German, Spanish, Russian, Simplified Chinese, Brazilian Portuguese, Korean, and Japanese.
- The complete profile, schedule, caps, safe-side, runtime shift, projectile, and boss-support state is available in `render_game_to_text`.

## Deterministic benchmark matrix

`npm run check:high-sector-benchmarks` records a real installed-Chrome combat/frame sample for every cell and a clearly labeled deterministic source-model projection for full-sector duration, lives, damage sources, avoidability windows, combo uptime, Tactical Draft exhaustion, boss duration, fatigue, and distractions.

| Sector | Slow duration / lives lost | Standard duration / lives lost | Fast duration / lives lost |
|---:|---:|---:|---:|
| 60 | 142.21 s / 0.47 | 87.15 s / 0.43 | 100.09 s / 0.17 |
| 80 | 155.22 s / 0.73 | 94.23 s / 0.68 | 108.56 s / 0.37 |
| 100 | 126.33 s / 0.31 | 75.59 s / 0.27 | 87.51 s / 0.05 |
| 120 | 130.85 s / 0.35 | 77.92 s / 0.31 | 90.36 s / 0.08 |
| 130 | 133.29 s / 0.35 | 79.27 s / 0.31 | 91.96 s / 0.08 |

The decrease after Sector 80 comes from replacing eight repeated encounters with five authored encounters, not from lowering the pressure budget. Mint Skater is faster but has less sustained damage than Nova Sparrow, so its projected clear time is slightly longer while its projected life loss is lower.

### Sector 130 rendered performance

| Hull | Average FPS | p95 frame | p99 frame | Frames over 33 ms |
|---|---:|---:|---:|---:|
| Iron Orbit, slow | 60.28 | 17.1 ms | 17.3 ms | 0 |
| Nova Sparrow, standard | 60.00 | 17.1 ms | 17.2 ms | 0 |
| Mint Skater, fast | 60.35 | 16.9 ms | 17.0 ms | 0 |

Evidence: `test-results/high-sector-benchmarks-2026-08-09T11-48-34-486Z/report.json`.

## Runtime and visual QA

The final installed-Chrome runtime matrix exercises all four protocols with each slow, standard, and fast hull: twelve protocol/hull combinations. It covers ranked Pure, ranked Tactical, Overrun Pure, Overrun Tactical, Phase unavailable, keyboard movement/fire, pause/resume, Reduced Motion, projectile caps, authored wave counts, `render_game_to_text`, Shifting Front warning/shift state, and the Sector 80 boss boundary.

Evidence: `test-results/high-sector-runtime-2026-08-09T12-22-21-352Z/`.

Inspected screenshots show:

- protocol names and cues remain readable over live combat;
- Shifting Front clearly names the future safe side before the shift;
- Hunter Pair and Escort Debt retain visible routes from slow through fast hulls;
- the Ascendant support pair preserves a central escape route and does not add boss health;
- Reduced Motion retains the same protocol and safe side;
- no new tofu, clipping, missing glyph, or untranslated fallback appears.

The full eight-language UI sweep also passed Settings, main menu, HUD/gameplay, pause, Game Over, empty leaderboard, and populated leaderboard with zero placeholder hits, unexpected English leaks, console errors, or page errors. Representative German, Chinese, Russian, and Korean screenshots were visually inspected. Evidence: `test-results/i18n-ui-2026-08-09T11-52-16-092Z/`.

## Validation record

Passed:

- `npm run check:high-sector-escalation`
- `npm run check:high-sector-runtime`
- `npm run check:high-sector-benchmarks`
- `npm run check:i18n`
- `npm run check:i18n-ui`
- `npm run build:current`
- `npm run check:sector-progression`
- `npm run check:boss-support-ships`
- `npm run check:combo-lifecycle`
- `npm run check:controller-flow`
- `npm run smoke`
- `npm run desktop:smoke:current`
- `npm run check:gameplay-performance-analysis`
- `npm run check:release-line`
- `npm run check:steam-electron-bridge`

The standard develop-web-game client was attempted once. Its exact local blocker is:

`Executable doesn't exist at C:\Users\cromk\AppData\Local\ms-playwright\chromium_headless_shell-1208\chrome-headless-shell-win64\chrome-headless-shell.exe`

Repository-native Playwright used installed Chrome and is the authoritative browser lane. The large release-hardening wrapper passed its constituent checks through localization, fresh-profile isolation, controller, and keyboard launch, then reached browser smoke before the 15-minute command ceiling ended the wrapper. The same browser smoke, current build, desktop smoke, release line, and bridge checks passed independently. A new Steam package was neither needed nor created; package-runtime validation remains tied to the already verified Build 24637691 package, which this prototype does not modify or upload.

## Remaining acceptance work

The profile should remain disabled until human high-skill play establishes whether the modeled slow-hull boss duration and repeated audio cues feel good over a real deep run. Sector 100/120 modifier combinations, extra protocols, leaderboard seasons, score-rule changes, and terminal escalation are deliberately outside this first slice.

Implementation rollback is `git revert a4a4c7f`. The separate QA/evidence commit can be reverted independently. Before integration, deleting this isolated branch/worktree leaves the immutable baseline untouched.
