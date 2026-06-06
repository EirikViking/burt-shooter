# Nova Swarm Codex Revamp Evidence - 2026-06-06

## Scope

- Worktree: `D:\vibe-coding-e\burt-shooter-cursor-hide-20260604`
- Branch: `codex/fix-dead-enemy-pixels-20260604`
- Expected starting HEAD: `757eb51731e2958a6322222b28e9b440ab13353a`
- Scope: in-game Threat Codex copy, Codex-only UI/layout/SFX aliases, Codex checks, and read-only player ship trait audit.
- Protected areas: no gameplay balance, scoring, waves, enemies, bosses, powerups, player ship stats, player ship traits, unlock thresholds, saves, Steam submit logic, Steam app/depot/store/live branch settings, or leaderboard name changes.

## Preflight

- `pwd`: `D:\vibe-coding-e\burt-shooter-cursor-hide-20260604`
- Branch: `codex/fix-dead-enemy-pixels-20260604`
- HEAD: `757eb51731e2958a6322222b28e9b440ab13353a`
- `git status --short --branch`: `## codex/fix-dead-enemy-pixels-20260604...origin/codex/fix-dead-enemy-pixels-20260604` plus pre-existing untracked `output/`
- Tracked files dirty before edits: none
- Remote branch after fetch: same HEAD as local and expected
- Worktree list: current folder mapped to branch `codex/fix-dead-enemy-pixels-20260604` at `757eb51`

## Codex Inventory Before Editing

- Codex screen/UI: `src/scenes/ThreatCodexScene.js`
- Codex catalog/entries: `src/config/ThreatCodexCatalog.js`
- Discovery state/unread/completion counts: `src/progression/ThreatDiscoveryState.js`
- Discovery toasts/feed text: `src/scenes/PlayScene.js`, `src/progression/ThreatDiscoveryState.js`
- Enemy/boss/elite/wave/theme data: `src/config/GeneratedEnemyProfiles.js`, `src/config/EnemyThreatActions.js`, `src/config/WaveTacticVariants.js`, `src/config/EliteMiddleShips.js`, `src/config/BossRoster.js`, `src/config/RunContentDirectorConfig.js`
- Lore/Cabinet Log text: `src/text/phrasePool.js`
- Sector text source: `src/config/SectorCatalog.js`
- Powerup text/mechanics/assets source: `src/managers/PowerupManager.js`, `src/entities/Player.js`, `src/assets/assetManifest.js`
- i18n keys: `src/i18n/locales/*.js`
- Thumbnails/icons/backgrounds: `src/assets/assetManifest.js`, `public/art/generated/nova-swarm/**`
- Codex UI SFX call sites: `src/scenes/ThreatCodexScene.js`, `src/scenes/MenuScene.js`
- SFX catalog/mix: `src/audio/SoundCatalog.js`
- Existing Codex check: `scripts/check-threat-codex.mjs`

## Before Screenshots

- `test-results/codex-revamp-20260606/before/codex-before-1600x900.png`
- `test-results/codex-revamp-20260606/before/codex-before-1366x768.png`
- `test-results/codex-revamp-20260606/before/codex-before-1280x720.png`
- Debug JSON: `test-results/codex-revamp-20260606/before/codex-before-debug.json`

## Before Findings

- Current categories: enemies, attackPatterns, waveTactics, elites, bosses, runThemes, cabinetLogs.
- Current total entries: 355.
- Missing reference coverage requested by this task: powerups and sectors are not Codex categories yet.
- Existing copy is mechanic-derived but too templated. One boss description exposes process wording instead of useful field guidance.
- Existing visuals are usable; no missing Codex art was found before edits.
- Existing Codex navigation supports keyboard, mouse, wheel/Page, and gamepad.
- Existing Codex SFX call sites use generic `menuMove`, `menuBack`, and `ui_open`; `menuMove`/`menuBack` are not explicit SFX catalog entries.

## Ship Trait Audit Status

- Audit is read-only and sourced from `ShipData`, `VisualVariantCatalog`, `ShipMetadata`, `ShipUnlockConfig`, and `ShipTraitDescriptions`.
- Initial scan found 25 selectable ships and no duplicate full gameplay signatures.
- Shared trait label found: `ARCADE SAW` on `nova_ship_09` and `nova_ship_25`; stats/signatures differ, so this is a trait family reuse, not a duplicate ship.
- Full generated audit: `test-results/codex-revamp-20260606/ship-trait-audit.md`.
- Audit summary: 25 selectable ships, duplicate full gameplay signatures: none, shared trait label: `ARCADE SAW` on `nova_ship_09 ARC STRIKER` and `nova_ship_25 ARCADE LEGEND`.

## Changes Made

- Rewrote English Codex templates for enemies, attacks, waves, elites, bosses, run themes, Cabinet Logs, and unknown runtime entries.
- Added reference-only Powerups and Sectors categories to the Codex catalog. These are marked `reference` and do not write new save buckets or discovery records.
- Added Codex-only SFX aliases: `codex_open`, `codex_move`, `codex_back`.
- Updated Codex UI layout to support two category rows at 1366x768 and 1280x720 while keeping a single row at 1600x900.
- Added named checks:
  - `npm run check:codex-revamp`
  - `npm run check:codex-layout`
- Updated `npm run check:threat-codex` to reject generic filler and require mechanics-relevant Codex copy.

## After Screenshots

- `test-results/codex-revamp-20260606/layout/codex-after-1600x900-enemies.png`
- `test-results/codex-revamp-20260606/layout/codex-after-1600x900-powerups.png`
- `test-results/codex-revamp-20260606/layout/codex-after-1600x900-sectors.png`
- `test-results/codex-revamp-20260606/layout/codex-after-1366x768-enemies.png`
- `test-results/codex-revamp-20260606/layout/codex-after-1366x768-powerups.png`
- `test-results/codex-revamp-20260606/layout/codex-after-1366x768-sectors.png`
- `test-results/codex-revamp-20260606/layout/codex-after-1280x720-enemies.png`
- `test-results/codex-revamp-20260606/layout/codex-after-1280x720-powerups.png`
- `test-results/codex-revamp-20260606/layout/codex-after-1280x720-sectors.png`
- Contact sheet: `test-results/codex-revamp-20260606/layout/codex-after-contact-sheet.png`

## Verification So Far

- `npm run check:i18n` - passed.
- `npm run check:threat-codex` - passed.
- `npm run check:codex-revamp` - passed; wrote ship audit and Codex asset dimensions.
- `npm run check:codex-layout` - passed; captured after screenshots/contact sheet and layout bounds report.
- `npm run check:release-line` - passed; verified latest localization, achievements, Steam Cloud, fullscreen, and marketing hotkey markers.
- `npm run build:current` - passed; package version `v2026-06-06_09-26-18`.
- `npm run check:i18n-ui` - passed; latest report `test-results/i18n-ui-2026-06-06T07-22-01-218Z`.
- `npm run check:release-hardening` - passed `33/33`; summary `test-results/release-hardening/latest-summary.md`.
- `npm run build` - passed with the existing Vite large chunk warning.
- `npm run package:steam:win:current` - passed; package output `release/desktop/win-unpacked/Nova Swarm.exe`.
- `npm run desktop:smoke:packaged` - passed; report `test-results/packaged-exe-smoke-2026-06-06T07-32-23-025Z/report.json`.
- `npm run steamworks:payload-manifest` - passed; `336` files, `723558738` bytes, manifest hash `5809f47ac1d9817c9e9d6d1c4de39cb7426453ea556fbd9547e778e92f2d8c2a`.
- `npm run steamworks:write-vdf` - passed after `check:release-line` and `check:steam-package-runtime`.

## Steam/Deploy Notes

- Steamworks store metadata, app visibility, live branches, AppID, depot IDs, and leaderboard name were untouched.
- Private SteamPipe upload performed for testing only.
- Steam BuildID: `23598200`.
- VDF evidence:
  - `"AppID" "4765070"`
  - `"ContentRoot" "..\\desktop\\win-unpacked"`
  - `"SetLive" ""`
- Upload evidence: `release/steamworks/steam_upload_evidence_codex_revamp_20260606.json`.
- Deploy not performed.
- Remaining risk: release-hardening still lists the normal manual Steam-client/human playtest items for by-ear audio feel, real leaderboard submission, and longer-run feel checks. No dummy scores were submitted.
