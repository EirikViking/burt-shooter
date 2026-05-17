# Nova Swarm Asset Index

Use this as a quick map for public release assets.

## Authoritative Files

- Runtime manifest: `src/assets/assetManifest.js`
- Provenance manifest: `release/provenance/asset_provenance_manifest.json`
- Provenance report: `release/provenance/asset_provenance_report.json`
- Asset guide: `ASSETS.md`
- Audio guide: `AUDIO_RULES.md`

## Generated Release Surfaces

- Steam capsule/library draft: `release/steam-assets/draft-2026-05-17-nova-swarm/`
- Steam screenshot capture: `release/steam-screenshots/draft-2026-05-17-current/`
- Steam upload screenshot shortlist: `release/steam-screenshots/steam-upload-candidates-2026-05-17/`
- Steam trailer visual/audio draft: `release/steam-trailer/draft-2026-05-17-current/`
- Steam trailer candidate: `release/steam-trailer/candidate-2026-05-17-current/`

## Verification

- `npm run check:provenance`
- `npm run check:steam-assets`
- `npm run capture:steam-screenshots`
- `npm run capture:steam-trailer`
- `npm run render:steam-trailer-audio`
- `npm run render:steam-trailer-candidate`
- `npm run audit:release-readiness`
