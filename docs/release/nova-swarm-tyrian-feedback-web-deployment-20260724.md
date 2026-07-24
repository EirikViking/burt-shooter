# Nova Swarm Tyrian Feedback Web Deployment

Date: 2026-07-24
Source branch: `codex/tyrian-feedback-program-20260724`
Source commit: `d2527f25e458219f87a19ee803f2ef42eeb1d100`
Verified V2 baseline: `41f9f0ed0bf2e57c3c55e762b9532f90d6511a0f`

## Cloudflare Pages

- Project: `burt-game`
- Environment: Production
- Deployment branch: `main`
- Deployment ID: `9480706d-1aa1-4392-a498-d2d5d2783ec8`
- Live URL: `https://novaswarm.tinyfoundry.app`
- Immutable deployment URL: `https://9480706d.burt-game.pages.dev`
- Build version: `v2026-07-24_20-48-04`
- Build timestamp: `2026-07-24T18:48:04.768Z`

Both URLs returned the same `version.json` with HTTP 200 and no-cache headers after deployment.

## Verification

- `npm run check:release-line` - PASS
- Cloudflare Pages project lookup using the stored machine token - PASS
- `npm run build` - PASS
- Production deployment lookup - PASS; source `d2527f2`, branch `main`
- Live Sector selector browser check - PASS
- Live Tactical Draft browser check - PASS

The generic full smoke run covered the normal menu, settings, gameplay, controller pause, story, game-over, return-menu, and mobile stages before stopping at its `startLevel=3` step. That step depends on a maintainer-only localhost debug route which production correctly blocks. No assertion was removed or weakened; production-safe focused checks were used for final live verification.

## Rollback

Restore the preceding production deployment `55187807-e350-43db-9247-4d490392acbc` in Cloudflare Pages if rollback is required.

## 2026-07-25 Overrun preview and Pilot Orders follow-up

- Source commit: `8d40a8a15fe2eabcd4e0a6bb1d34f8bef014c02a`
- Build version: `v2026-07-25_00-56-03`
- Deployment ID: `e63bb3b4-7fc0-4cb5-af4a-c44887399f2d`
- Production branch: `main`
- Live URL: `https://novaswarm.tinyfoundry.app`
- Immutable deployment URL: `https://e63bb3b4.burt-game.pages.dev`
- Manual Overrun test URL: `https://novaswarm.tinyfoundry.app/?overrunPreview=1`

Both version endpoints returned HTTP 200, identical build metadata, and no-cache headers. The live-domain `check:run-modes` pass verified that a fresh web-preview profile shows all six run cards and three Pilot Orders at 1920x900, launches Overrun Tactical, and enters Sector 51. The generic `check:live-deployment` aggregator remains unable to certify this deployment because it requires a separate full live smoke report whose production-only debug stages are intentionally blocked; the focused production-safe live check passed.

Rollback target: production deployment `9480706d-1aa1-4392-a498-d2d5d2783ec8`.
