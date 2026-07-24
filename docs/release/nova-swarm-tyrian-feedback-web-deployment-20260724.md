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
