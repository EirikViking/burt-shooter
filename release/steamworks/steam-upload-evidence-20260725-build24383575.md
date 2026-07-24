# Steam test upload evidence — menu clarity

- Date: 2026-07-25 (Europe/Oslo)
- Branch: `codex/tyrian-feedback-program-20260724`
- Verified baseline: `41f9f0ed0bf2e57c3c55e762b9532f90d6511a0f`
- Packaged source: `0155d9402863024805f422c5277d45e8911a6929`
- Packaged build: `v2026-07-25_01-36-49`
- Steam AppID / DepotID: `4765070` / `4765071`
- Steam target: `sector-continue-test`
- Steam BuildID: `24383575`
- Depot manifest: `1564126434267822790`

## Scope

The run-mode menu now presents five mode families instead of six competing
top-level choices. Mayhem and Overrun each use one family card with left/right
ruleset selection for Tactical or Pure. Pilot Orders remain visible. The
keyboard and controller ruleset-selection paths share the same behavior, and
the short-layout Scout briefing no longer overflows.

No new artwork was needed: the design audit identified navigation hierarchy and
information density, rather than missing visual assets, as the underlying
problem.

## Package and verification

- `npm run check:release-line` — PASS
- `npm run check:i18n` — PASS
- `npm run build:current` — PASS
- `npm run check:i18n-ui` — PASS for all eight supported locales
- `npm run check:run-modes` — PASS
- `npm run check:controller-flow` — PASS
- `npm run check:cinematic-hangar-menu` — PASS
- `npm run check:sector-challenge-selector` — PASS
- `npm run check:run-mode-narration` — PASS, six narrated rulesets in eight locales
- `npm run check:overrun-mode` — PASS
- `npm run smoke` — PASS
- `npm run desktop:smoke:current` — PASS; Steam bridge and achievements ready; embedded `gitSha` `0155d94`
- `npm run check:packaged-steam-runtime-gate` — PASS
- `npm run desktop:smoke:packaged` — PASS
- `npm run desktop:controls:packaged` — PASS
- `npm run desktop:perf:packaged` — PASS; minimum 57.80 FPS, average 59.82 FPS, no warnings or errors
- `npm run check:desktop-package` — PASS

The generated payload manifest records 410 files, 1,058,795,285 bytes, manifest
hash `8f7fe34a7383aaf9626ed0f5d6ee83e2a5a1e65f1fa3612e43cd81ecf50cde62`,
and executable SHA-256
`be07a00314303c1909b888f5c79babc790956f2bb3b796bf13e8cb764f90aba9`.
SteamPipe mapped 470 files and uploaded 16 changed chunks; its depot log records
two changed files and no additions or removals.

## Upload boundary

The reviewed VDF used:

```text
"SetLive" "sector-continue-test"
```

SteamCMD used cached credentials and reported:

```text
Successfully finished AppID 4765070 build (BuildID 24383575).
```

The upload did not target the public/default branch and did not change store
copy, pricing, achievements, leaderboards, cloud settings, or other Steamworks
configuration.

## Rollback

- Restore the prior private test build by assigning BuildID `24379809` to
  `sector-continue-test`.
- Revert the source increment locally with:
  `git revert 0155d9402863024805f422c5277d45e8911a6929`
