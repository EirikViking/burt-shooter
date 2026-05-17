# Nova Swarm Quick Reference

## Local Development

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`.

## Core Checks

```bash
npm run build
npm run check:audio
npm run audit:audio-mix
npm run check:provenance
npm run check:ship-traits
npm run smoke
npm run audit:release-readiness
```

## Release Evidence

```bash
npm run capture:steam-screenshots
npm run capture:steam-trailer
npm run render:steam-trailer-audio
npm run render:steam-trailer-candidate
npm run package:steam:win:current
npm run desktop:smoke:current
npm run desktop:smoke:packaged
npm run verify:steam-rc -- --full
```

## Deploy

```bash
npm run deploy
npm run check:live-deployment
```

Primary public play URL: `https://burt.tinyfoundry.app`

## Gameplay Surface

- 216 selectable player ship variants with bounded trait effects.
- 288 enemy visual styles with stable arcade hitboxes.
- Public arcade-comedy voice: formations, hitboxes, bonus stages, boss patterns, medals, and high-score swagger.
- No private-person photos, private jokes, or old internal lore in release surfaces.

## Remaining Steam Manual Gates

- Configure real Steamworks app ID and Windows depot ID.
- Upload the Windows build with SteamCMD.
- Install and launch the uploaded build from the Steam client.
- Fill `release/steamworks/client_validation_report.json`.
- Record final human approvals in `docs/reviews/2026-05-17-human-release-approval.md`.
