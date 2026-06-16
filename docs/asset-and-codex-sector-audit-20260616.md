# Nova Swarm Asset And Sector Codex Audit - 2026-06-16

## Scope

Scanned the requested runtime visual surface:

- `public/art`
- `public/sprites`
- `public/images`
- `src/assets`
- `src/config`
- `src/entities`
- `src/scenes`
- `src/ui`
- image references in source/config/catalog files

Generated inventory evidence:

- `test-results/asset-codex-sector-audit-20260616/asset-inventory.json`
- `test-results/asset-codex-sector-audit-20260616/legacy-used-contact-sheet.svg`
- `test-results/asset-codex-sector-audit-20260616/sector-art-replacement-contact-sheet.svg`
- `public/art/generated/nova-swarm/replacements/sectors/sector-signal-contact-sheet-20260616.svg`

Inventory totals:

- Assets scanned: 2,282
- Referenced by runtime/config/scripts: 1,329
- Existing generated Nova Swarm assets: 1,059
- Referenced legacy/fallback candidates: 309

## Visual Findings

Most primary runtime combat visuals already point at internally generated Nova Swarm assets:

- generated normal enemy roster
- late-mayhem enemy SVG roster
- generated boss roster
- generated boss support ships
- generated powerups
- generated elite middle ships
- generated rank badges
- generated menu/gameplay/boss backdrops

The strongest player-facing visual mismatch was the Threat Codex sector art. The Codex reused generic gameplay/overrun art for sector entries, which produced repeated, flat, non-imagegen-looking emblems in the sector list and detail panel. The user-provided screenshot showed this clearly on Sector 21.

## Replacements

Replaced the sector Codex art path model with unique generated sector signal art:

- New generated art directory: `public/art/generated/nova-swarm/replacements/sectors/`
- New sector signal files: `nova-sector-signal-001-20260616.svg` through `nova-sector-signal-240-20260616.svg`
- Contact sheet: `public/art/generated/nova-swarm/replacements/sectors/sector-signal-contact-sheet-20260616.svg`

Why this was safe:

- Codex art only; no gameplay collision, hitbox, anchor, or animation frame contracts.
- SVG assets are square 256x256, stable for list thumbnails and detail-panel previews.
- Paths are added through `AssetManifest.generated.sectors`.
- Sectors above 240 use deterministic generated data-URI art, so far-signal entries remain unique without shipping thousands of files.

## Kept

Kept existing generated enemy, boss, elite, powerup, rank, and backdrop assets. They are already Nova Swarm style and actually used by runtime catalogs.

Kept referenced legacy/fallback sprites for now. The inventory flags them as review candidates, but many are fallback paths or older runtime dependencies where replacement would risk gameplay readability or sprite assumptions. They were not blindly replaced.

## Remaining Questionable Assets

The referenced legacy/fallback contact sheet is:

- `test-results/asset-codex-sector-audit-20260616/legacy-used-contact-sheet.svg`

These should be handled in a separate sprite-contract pass if desired, because replacing them safely needs per-entity size, anchor, and fallback-path verification.

## Sector Codex Before

`src/config/ThreatCodexCatalog.js` previously defined:

- fixed sector catalog levels: `1,2,3,4,5,6,7,8,9,10,11,20`
- only 12 sector Codex entries
- repeated generic art for sector entries

That made the top tab capable of showing a misleading `12/12` while runtime discoveries could still merge higher sector IDs into the list.

## Sector Codex Now

The sector Codex now uses a hybrid discovery model:

- baseline sectors 1-12 remain known
- milestone sectors 10, 20, 30, 40, 50, and 60 are represented clearly
- actual reached/discovered sectors expand the catalog up to the highest reached sector
- far-signal sectors beyond 60 get generated, useful, rule-based content instead of placeholder filler
- all sector entries use unique sector art
- counts use the dynamic sector model instead of the old fixed 12-entry total

Examples now validated:

- Sector 20: `sector_020`
- Sector 30: `sector_030`
- Far-signal example: `sector_075`
- Far-signal milestone: `sector_060`

## Code And Manifest Changes

- `src/assets/assetManifest.js`
- `src/config/ThreatCodexCatalog.js`
- `src/progression/ThreatDiscoveryState.js`
- `src/scenes/ThreatCodexScene.js`
- `scripts/check-threat-codex.mjs`
- `scripts/check-codex-layout.mjs`
- `scripts/check-codex-tab-count-layout.mjs`
- `package.json`

## Visual Proof

Before evidence:

- user-provided screenshot showed repeated weak Sector Codex art on Sector 21.

After evidence:

- `test-results/asset-codex-sector-audit-20260616/sector-art-replacement-contact-sheet.svg`
- `public/art/generated/nova-swarm/replacements/sectors/sector-signal-contact-sheet-20260616.svg`
- `test-results/codex-revamp-20260606/layout/codex-after-1920x1080-sectors.png`
- `test-results/codex-revamp-20260606/layout/codex-after-1920x1080-sectors-20.png`
- `test-results/codex-revamp-20260606/layout/codex-after-1920x1080-sectors-30.png`
- `test-results/codex-revamp-20260606/layout/codex-after-1920x1080-sectors-60-far-signal.png`
- `test-results/codex-revamp-20260606/layout/codex-after-contact-sheet.png`

## Validation Results

Passed:

- `npm run check:threat-codex`
- `npm run check:codex-revamp`
- `npm run check:codex-layout`
- `npm run check:codex-tab-count-layout`
- `npm run check:sector-progression`
- `npm run check:sector-continue-mode`
- `npm run check:sector-start-result-flow`
- `npm run check:i18n`
- `npm run check:i18n-ui`
- `npm run check:sprite-catalog`
- `npm run check:powerup-assets`
- `npm run check:steam-assets`
- `npm run check:release-line`
- `npm run check:boss-roster`
- `npm run check:boss-support-ships`
- `npm run check:enemy-weapons`
- `npm run check:normal-enemy-variety`
- `npm run check:powerup-visuals`
- `npm run check:player-ship-padding`
- `npm run check:player-ring-alignment`
- `npm run check:controller-flow`
- `npm run build:current`
- `npm run smoke`

Transient issues fixed during the pass:

- `npm run check:sprite-catalog` was missing a package script alias even though the checker existed and passed directly.
- `check:codex-revamp` initially rejected the too-broad default sector expansion as repetitive; the model was corrected to expand individual sectors based on actual discovery/highest reached sector.
- `check:codex-tab-count-layout` initially seeded far milestones for a compact count test; the seed was corrected to test early-sector count layout while `check:codex-layout` captures 20/30/60 detail screens.

## Steamworks

Steamworks was untouched.

No Steam upload, packaging, branch visibility change, AppID change, depot ID change, achievement config change, store metadata change, or leaderboard identity change was performed. `nova_swarm_global_score_v2` was not changed.
