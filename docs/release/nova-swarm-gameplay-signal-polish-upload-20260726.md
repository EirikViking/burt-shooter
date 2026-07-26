# Nova Swarm gameplay signal polish Steam test upload

- Source branch: `codex/tyrian-feedback-program-20260724`
- Tested source commit: `4af8519a0777cf5597f011187c966143fd07cecd`
- Starting baseline commit: `f9cb89e777cf7f9f96ec4a5586c5b793107b13e7`
- Packaged version: `v2026-07-26_20-50-56`
- Payload files: `410`
- Payload bytes: `1,162,238,270`
- Payload content hash: `5accb9966fa1c251c2498582b596444b865c316c721e3a17409daaed94802c98`
- Payload manifest file SHA-256: `d50d0c845ed54bbf630a91685690744379d9a9b5abf5f74b86010fa5a4ebfdbf`
- Executable SHA-256: `5f5f702b37fce61f33f2e96b9ea46b09073f29e00704d65f18674f23f75b9d71`
- Steam AppID / DepotID: `4765070` / `4765071`
- Uploaded BuildID: `24401245`
- Depot manifest: `230225884267098466`
- Assigned branch: `sector-continue-test`
- Previous test-branch rollback BuildID: `24400692`
- Pre-upload branches: `sector-continue-test` `24400692`, `public` `24400692`, `test-build` `23782673`
- Post-upload branches: `sector-continue-test` `24401245`, `public` `24400692`, `test-build` `23782673`

## Scope

- Replaced box-heavy combo and Near Miss feedback with borderless authored plasma signals and four combo presentation tiers.
- Rebuilt Wave Clear and related completion presentations around an authored transparent victory flourish.
- Applied authored feedback art to Flawless Wave, trait, score boost, repair, level/run clear, level/rank up, and unlock signals.
- Removed procedural pips, chevrons, and burst rings from rank-up while preserving rank achievement artwork.
- Added an authored alien command spine behind Mission Status while preserving the live HUD data and progress behavior.
- Preserved functional telegraphs, hit geometry, timers, meters, targeting cues, scoring, timing, balance, saves, achievements, input, resolution fairness, and localization.

## Image generation

Both assets were created with the built-in ImageGen tool, then chroma-keyed and cropped to transparent production PNGs:

- `public/art/generated/nova-swarm/vfx/wave-clear-victory-flourish.png`: horizontally elongated emerald/cyan/pale-gold victory flourish with an open live-text center and no baked text, boxes, pips, dots, or glyphs.
- `public/art/generated/nova-swarm/vfx/mission-command-spine.png`: thin cyan/teal/indigo/gold alien command spine with an open live-text center and no baked text, boxes, pips, dots, or glyphs.

## Verification

- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:score-popup-readability`
- `npm run check:wave-clear-effect`
- `npm run check:rank-up-clarity`
- `npm run check:gameplay-message-overlap`
- `npm run check:controller-flow`
- `npm run check:steam-electron-bridge`
- `npm run check:release-line`
- `npm run package:steam:win`
- `npm run check:steam-package-runtime`
- `npm run check:packaged-steam-runtime-gate`
- `npm run desktop:smoke:packaged` in explicit local-runtime mode
- `npm run desktop:controls:packaged`
- `npm run check:fresh-profile-steam-isolation`
- `npm run desktop:smoke:current`
- `npm run desktop:perf:packaged`
- `npm run check:desktop-package`
- `npm run steamworks:payload-manifest`
- `design-qa.md`: `final result: passed`

The direct local Electron smoke retained the known `steam_init_returned_false` condition outside a Steam-launched process. Native module staging, the strict packaged Steam failure contract, explicit local-runtime smoke, fresh-profile isolation, and bridge/package checks passed.

SteamCMD reported: `[2026-07-26 21:01:43]: Successfully finished AppID 4765070 build (BuildID 24401245).`

The upload VDF used exactly `SetLive "sector-continue-test"`. Read-only post-upload app info proves public/default stayed on BuildID `24400692`; no store metadata, achievements, patch notes, Git push, new branch, or other Steamworks setting changed.
