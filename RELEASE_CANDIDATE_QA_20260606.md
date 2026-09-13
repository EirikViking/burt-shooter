# Nova Swarm Release-Candidate QA - 2026-06-06

## Scope And Guardrails

- Worktree: `D:\vibe-coding-e\burt-shooter-cursor-hide-20260604`
- Branch: `codex/fix-dead-enemy-pixels-20260604`
- Starting HEAD: `2b90128547bb8103aa817f2940e1bc7b7b15840d`
- Expected baseline: `3d7ae2375c62306719643c1d01ac5747add3241d` or newer pushed commit on this branch.
- Actual baseline status: newer than expected and tracking `origin/codex/fix-dead-enemy-pixels-20260604`.
- Source package commit uploaded to Steam: `9ef4f21c14ef5c50b359c32065a90308acc24db2`
- Protected areas preserved: Steam store metadata, app visibility, AppID, depot IDs, live/release branches, leaderboard name, score math, achievements, save/cloud format, ship stats/traits/unlocks, enemy/wave/boss balance, and powerup balance.
- Steam boundary honored: `SetLive` empty; `nova_swarm_global_score_v2` preserved; no dummy scores.
- Deploy boundary honored: no web deploy performed.

## Preflight

- `pwd`: `D:\vibe-coding-e\burt-shooter-cursor-hide-20260604`
- Branch: `codex/fix-dead-enemy-pixels-20260604`
- Initial HEAD: `2b90128547bb8103aa817f2940e1bc7b7b15840d`
- `git status --short --branch`: no tracked dirty files before edits; only pre-existing untracked `output/`
- `git worktree list`: current folder maps to `codex/fix-dead-enemy-pixels-20260604`; no other agent used this working directory.
- `git log -n 8`: current commit `2b90128 Polish threat codex copy and tick`; expected commit `3d7ae23 Revamp threat codex field guide` is an ancestor on this branch.

## Inventory

| Area | Tool / Source | Status | Evidence | Severity | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Active instructions | `AGENTS.md` | PASS | Read before edits | BLOCKER if ignored | Guardrails followed. |
| Cold menu labels | `scripts/check-menu-cold-labels.mjs` | ADDED / PASS | `test-results/rc-qa-20260606/menu-cold-regression-final/report.json` | SHOULD FIX | Keep in release-hardening. |
| Release hardening | `npm run check:release-hardening` | PASS | `test-results/release-hardening/latest-summary.md` | BLOCKER | 34/34 automated checks passed. |
| Steam packaging config | `release/steamworks/app_build_LOCAL.vdf` | PASS | `"SetLive" ""`, AppID `4765070`, depot `4765071` | BLOCKER | Private build only; do not set live. |
| Steam payload | `npm run steamworks:payload-manifest` | PASS | `release/steamworks/steam_payload_manifest.json` | BLOCKER | 336 files, 723676199 bytes. |
| Icon assets | ImageGen + ImageMagick audit | UPDATED / PASS | `test-results/rc-qa-20260606/icon-audit/icon-contact-sheet-final.png` | NICE TO HAVE | Installed magenta ship icon. |
| Localized UI | `npm run check:i18n-ui` | PASS | `test-results/i18n-ui-2026-06-06T10-21-13-238Z` | SHOULD FIX | No placeholders or English leaks detected. |
| Packaged app | `desktop:smoke:packaged` | PASS | `test-results/packaged-exe-smoke-2026-06-06T10-32-28-658Z/report.json` | BLOCKER | Build `v2026-06-06_12-30-12`, git `9ef4f21`. |
| Steam upload | SteamCMD | PASS | `release/steamworks/steam_upload_evidence_rc_qa_20260606.json` | BLOCKER | Private BuildID `23599343`. |

## Cold Menu Bug

Finding: `SHOULD FIX` - user-reported fresh launch displayed `Threat Cod` before hover.

- Before reproduction attempts already showed `THREAT CODEX` in browser and Electron, but there was no durable no-hover regression guard.
- Fix: added `npm run check:menu-cold-labels`.
- The check waits for the cold main menu before pointer movement, asserts exact labels at `1600x900`, `1366x768`, and `1280x720`, verifies label bounds/scales, and captures screenshots/contact sheet.
- Final regression evidence: `test-results/rc-qa-20260606/menu-cold-regression-final/report.json`
- Final screenshot proof: `test-results/rc-qa-20260606/menu-cold-regression-final/menu-cold-labels-contact-sheet.png`
- Result: `THREAT CODEX` is complete before hover; no other cold menu labels were truncated.

## Icon Review

Finding: `NICE TO HAVE` - old icon was serviceable but weaker at small sizes and less player-facing than a ship silhouette.

- Reviewed existing app/game/Steam-adjacent icon assets: `public/icons/*`, `build/icons/*`, generated ship art, boss art, overrun seal art.
- Used integrated Codex Image Gen; source contact sheet copied to `test-results/rc-qa-20260606/icon-audit/integrated-imagegen-icon-candidates.png`.
- Cropped and compared generated candidates at `256`, `128`, `64`, `32`, and `16` px.
- Candidate comparison: `test-results/rc-qa-20260606/icon-audit/imagegen-comparison-contact-sheet.png`
- Final choice: `candidate-imagegen-ship-magenta.png`, no baked-in text, high contrast, readable at 32/16, closer to Nova Swarm's neon arcade sci-fi identity.
- Final contact sheet: `test-results/rc-qa-20260606/icon-audit/icon-contact-sheet-final.png`
- Replaced only game/app icon files:
  - `public/icons/icon-192.png`
  - `public/icons/icon-512.png`
  - `build/icons/nova-swarm-icon-1024.png`
  - `build/icons/nova-swarm.ico`
- Steam store metadata touched: no.

## QA Matrix

| Area | Tool | Status | Evidence | Severity | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Cold main menu labels | `npm run check:menu-cold-labels` | PASS | `test-results/rc-qa-20260606/menu-cold-regression-final/report.json` | SHOULD FIX | Permanent guard added. |
| Icon small-size readability | ImageGen + contact sheets | PASS | `test-results/rc-qa-20260606/icon-audit/icon-contact-sheet-final.png` | NICE TO HAVE | Keep installed magenta ship icon. |
| i18n source/fallbacks | `npm run check:i18n` | PASS | standalone pass after final edits | BLOCKER | No untranslated player-facing text detected. |
| Full build | `npm run build` | PASS | build ID `v2026-06-06_12-30-12` | BLOCKER | Vite chunk-size warning only. |
| Localized UI visual QA | `npm run check:i18n-ui` | PASS | `test-results/i18n-ui-2026-06-06T10-21-13-238Z` | SHOULD FIX | No tofu/placeholders/English leaks found by harness. |
| Release hardening aggregate | `npm run check:release-hardening` | PASS | `test-results/release-hardening/latest-summary.md` | BLOCKER | 34/34 automated checks passed. |
| Startup/browser smoke | `npm run smoke` | PASS | `test-results/smoke-2026-06-06T10-18-06-905Z/report.json` | BLOCKER | Menu/settings/gameplay/gameover/mobile/boss covered. |
| Keyboard/controller navigation | `check:controller-flow`, `check:keyboard-launches` | PASS | release-hardening latest report | SHOULD FIX | Controller-only and keyboard launch paths passed. |
| Ship launch coverage | `npm run qa:release`, `check:ship-selector-start` | PASS | `test-results/rc-qa-20260606/release-gauntlet/report.json` | BLOCKER | 25 ships launch/progression policy covered. |
| Trait families | `npm run check:ship-trait-combat` | PASS | `test-results/rc-qa-20260606/ship-trait-combat/report.json` | SHOULD FIX | Harness seeded current `nova.hangarProgress.v1`; no ship stats changed. |
| Waves/bosses/sectors/Overrun | release hardening + focused checks | PASS | dead enemy, boss, overrun reports in `test-results/` | BLOCKER | No balance edits made. |
| Enemy cleanup through sector 12 | `npm run check:dead-enemy-playthrough` | PASS | `test-results/dead-enemy-playthrough-2026-06-06T10-12-29-640Z/report.json` | BLOCKER | No stuck dead enemy visuals detected by harness. |
| Powerups, especially Bomb | `check:powerup-effects`, `check:powerup-visuals` | PASS | `test-results/rc-qa-20260606/powerup-effects/report.json` | BLOCKER | 22 gameplay powerups covered; no balance edits. |
| Save/load/cloud merge | `check:steam-cloud-save`, packaged smoke | PASS | release-hardening report, packaged smoke report | BLOCKER | Temp userData only; real Steam profile not reset. |
| Asset/audio provenance | `npm run check:provenance`, audio checks | PASS | `release/provenance/asset_provenance_report.json` | SHOULD FIX | 2184/2184 assets covered. |
| Steam release-line guard | `npm run check:release-line` | PASS | run before package/VDF | BLOCKER | Localization, achievements, Steam Cloud, fullscreen, hotkeys present. |
| Steam package | `npm run package:steam:win:current` | PASS | `test-results/steam-package-runtime-2026-06-06T10-32-11-676Z/report.json` | BLOCKER | AppID and leaderboard contract passed. |
| Packaged smoke | `npm run desktop:smoke:packaged` | PASS | `test-results/packaged-exe-smoke-2026-06-06T10-32-28-658Z/report.json` | BLOCKER | Steam init false expected without client, bridge present. |
| Steam VDF / SetLive | `npm run steamworks:write-vdf` | PASS | `release/steamworks/app_build_LOCAL.vdf` | BLOCKER | `SetLive` remains empty. |
| Private Steam upload | SteamCMD | PASS | `test-results/rc-qa-20260606/steamcmd-upload-20260606.txt` | BLOCKER | BuildID `23599343`, not set live. |

## Findings

| Severity | Finding | Status | Notes |
| --- | --- | --- | --- |
| SHOULD FIX | Cold main-menu Codex label needed a no-hover regression guard. | Fixed | Added `check:menu-cold-labels`; final cold screenshots prove `THREAT CODEX`. |
| SHOULD FIX | First-boss balance harness could strand the scripted pilot after a life loss and flake before proving damage progress. | Fixed | Harness-only: recenter scripted pilot after recorded life loss and extend probe to 60s. No boss/player balance changed. |
| SHOULD FIX | Ship-trait combat harness seeded stale legacy progress only. | Fixed | Harness now also seeds current `nova.hangarProgress.v1`. No unlock/stat data changed. |
| NICE TO HAVE | App icon could read more premium and player-facing at 32/16 px. | Fixed | Installed generated magenta ship icon in app icon files only. |
| DEFER | Steam-client by-ear audio and real leaderboard validation require a live Steam-client human pass. | Documented | No dummy scores submitted; leaderboard name preserved. |

## Steam Upload

- SteamCMD upload: PASS
- Private Steam BuildID: `23599343`
- Uploaded source commit: `9ef4f21c14ef5c50b359c32065a90308acc24db2`
- Packaged build ID: `v2026-06-06_12-30-12`
- Packaged git SHA reported by smoke: `9ef4f21`
- AppID: `4765070`
- Depot ID: `4765071`
- Leaderboard: `nova_swarm_global_score_v2`
- VDF: `release/steamworks/app_build_LOCAL.vdf`
- `SetLive`: `""`
- SteamCMD log: `test-results/rc-qa-20260606/steamcmd-upload-20260606.txt`
- Structured evidence: `release/steamworks/steam_upload_evidence_rc_qa_20260606.json`

## Steam / Deploy Notes

- Steamworks store metadata touched: no.
- Steam app visibility touched: no.
- AppID/depot IDs touched: no.
- Leaderboard name touched: no; `nova_swarm_global_score_v2` preserved.
- Score math, achievements, save/cloud format, ship stats/traits/unlocks, enemy/wave/boss balance, and powerup balance touched: no.
- `SetLive`: empty.
- Dummy scores: none.
- Deploy performed: no.

## Remaining Risks

- Manual Steam-client combo x10/x20 by-ear pass remains.
- Manual Steam-client SFX by-ear pass remains.
- Human boss feel and boss-death spectacle pass remains.
- Real ranked Steam leaderboard pass remains; use a real ranked run only, no dummy scores.
- Vite large chunk-size warning remains non-blocking and pre-existing for this release line.
