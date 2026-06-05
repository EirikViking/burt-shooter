# Nova Swarm BuildID 23588518 Release Blockers

## Starting gate

- Date: 2026-06-05
- CWD: `D:\vibe-coding-e\burt-shooter-cursor-hide-20260604`
- Branch: `codex/fix-dead-enemy-pixels-20260604`
- Baseline HEAD: `494a0e9cff1cfcad0c205a2558d6fa92acca8311`
- Upstream relation after fetch: `0 0` (`HEAD...@{upstream}`)
- `git status --short --branch`: clean, tracking `origin/codex/fix-dead-enemy-pixels-20260604`
- Worktree rule: work only in this checkout; no writes to `D:\vibe-coding-e\burt-shooter` or other Nova Swarm worktrees.
- Protected Steam rules: keep app `4765070`, depot `4765071`, leaderboard `nova_swarm_global_score_v2`, live branches/store metadata untouched, dummy score submissions disabled, and SteamPipe `SetLive` empty.

## Checkpoints

- [x] Reproduce/verify result/status overlap and final One More Run spacing at `1600x900` and scaled sizes.
- [x] Add obvious visual celebration for new Steam Top 3 and stronger celebration for new Steam #1 without Steam Board/Steamboard/redundant rank wording.
- [x] Restore final One More Run and Career Intel next-ship-unlock progress; show ship-unlocked result notice; show all-unlocked state.
- [x] Audit gameplay HUD/central message stacking and make important messages readable during boss/sector/powerup bursts.
- [x] Deterministically verify every powerup effect, especially Bomb, and fix only broken intended behavior.
- [x] Reproduce/fix dead small-ship pixel through at least sector 9, preferably 12, while preserving pending `waitingForEntry` enemies.
- [x] Add sector-10 Overrun confirmation pause, then resume on keyboard/controller/mouse confirmation.
- [x] Improve Career Intel readability with minimum readable text sizes and spacing.
- [x] Run required checks: `npm run check:release-hardening`, `npm run build`, `npm run check:steam-leaderboard-mock`, `npm run check:i18n`, `npm run check:i18n-ui`, `npm run package:steam:win:current`, `npm run desktop:smoke:packaged`.
- [x] Upload private Steam test build with `SetLive` empty, then commit/push final evidence.

## Evidence log

- Initial repo gate passed before file edits: folder, branch, HEAD, clean status, fetched remote, and worktree list verified.
- Baseline reproduction:
  - `npm run check:result-screen-flow` originally passed but screenshots showed Top 3/#1 celebration weakness and tight result spacing.
  - `npm run check:ship-unlock-reveal` initially failed from stale legacy-only seed expectations (`single: expected 1 unlock(s), got 2`), confirming the unlock notice guard needed canonical hangar-progress coverage.
  - `npm run check:career-intel-layout` originally passed but screenshots showed the next-ship-unlock progress missing from Career Intel.
- UI/readability checkpoint:
  - Game Over submitted/status hold now hides duplicate final-result score/progress copy.
  - Final One More Run restores next ship unlock, ship unlocked, and all-ships-unlocked progress lines.
  - Top 3 gets a visible celebration burst/medal; #1 gets stronger fanfare, `NUMBER ONE`, star particles, and `#1` visual treatment without Steam Board/Steamboard copy.
  - Career Intel now promotes next ship unlock progress into the first readable stat tile and exposes it in debug state for layout checks.
- UI/readability verification:
  - `npm run check:i18n` passed.
  - `npm run check:result-screen-flow` passed with runtime no-overlap/spacing assertions at `1600x900`, `1366x768`, and `1280x720`; report: `test-results/result-screen-flow-2026-06-05T17-30-10-881Z/report.json`.
  - `npm run build:current` passed after UI/i18n changes.
  - `npm run check:ship-unlock-reveal` passed; seeded canonical single/multi unlocks showed readable notices and voice keys.
  - `npm run check:career-intel-layout` passed; screenshots/report: `test-results/career-intel-layout-2026-06-05T17-32-09-186Z/`.
- Dead enemy visual checkpoint:
  - Enemy and boss root containers are tagged as `enemy_visual:*` and exposed through `render_game_to_text().enemyVisualAudit`.
  - Runtime cleanup now sweeps tracked inactive/dead/despawned enemy visuals and orphaned enemy visual containers while exempting pending `waitingForEntry` enemies.
  - `npm run check:dead-enemy-cleanup` passed, including pending-entry preservation.
  - `npm run check:dead-enemy-playthrough` passed; report: `test-results/dead-enemy-playthrough-2026-06-05T17-48-09-001Z/report.json`.
  - Synthetic proof in that report detected a forced stale visible enemy (`staleVisibleCount: 1`) and a forced orphaned enemy visual (`orphanedVisibleCount: 1`), then cleaned both back to zero.
  - Browser playthrough audited sectors 8, 9, 10, 11, and 12 across normal waves, Boss Incoming/gate, and boss defeat; final stale/orphan counts were zero with no page errors.
  - Re-ran after Overrun confirmation changes: `npm run check:dead-enemy-playthrough` passed; report: `test-results/dead-enemy-playthrough-2026-06-05T17-57-35-175Z/report.json`.
  - Re-ran after powerup/orbital fixes: `npm run check:dead-enemy-cleanup` passed and `npm run check:dead-enemy-playthrough` passed; report: `test-results/dead-enemy-playthrough-2026-06-05T18-08-25-459Z/report.json`.
- Overrun confirmation checkpoint:
  - `npm run check:overrun-clear` passed after adding confirmation source guards.
  - `npm run check:overrun-confirmation` passed; report: `test-results/overrun-confirmation-2026-06-05T17-57-13-917Z/report.json`.
  - Browser proof triggered the sector-10 clear flow, prepared sector 11, held the Overrun card past its normal timeout with `requiresConfirm: true`, accepted `Enter`, then resumed play with the interlude inactive.
- Powerup checkpoint:
  - Bomb now sends destroyed normal enemies through `onEnemyKilled()` and `removeEnemySprite()` from the detonation path.
  - Orbital Strike now keeps the selected target through its warning delay, removes its ticker by callback, and guarantees the chosen target receives the intended strike damage.
  - `npm run check:powerup-assets` passed.
  - `npm run check:powerup-effects` passed for 22/22 pickup types; report: `test-results/powerup-effects-2026-06-05T18-08-03-398Z/report.json`.
  - Bomb proof used a real pickup, real bomb shot, real enemy collision/detonation, score award, and enemy visual audit with `staleVisibleCount: 0` and `orphanedVisibleCount: 0`.
- Gameplay message checkpoint:
  - Toast debug state now exposes real rendered bounds for active center/top/corner messages.
  - Default center messages sit lower than top messages, and transition-priority messages delay/dismiss lower-priority bursts instead of stacking over them.
  - `npm run check:gameplay-message-overlap` passed with 48 sampled frames of boss/sector/powerup/combo message bursts; report: `test-results/gameplay-message-overlap-2026-06-05T18-11-16-699Z/report.json`.
- Final release verification:
  - `npm run check:release-hardening` passed 33/33 checks in 492s; summary: `test-results/release-hardening/latest-summary.md`.
  - `npm run build` passed and produced build version `v2026-06-05_20-28-59`.
  - `npm run check:steam-leaderboard-mock` passed; report: `test-results/steam-leaderboard-mock-2026-06-05T18-29-40-550Z/report.json`.
  - `npm run check:i18n` passed.
  - `npm run check:i18n-ui` passed across `en`, `de`, `zh-CN`, `ru`, `es`, `pt-BR`, `ko`, and `ja`; report directory: `test-results/i18n-ui-2026-06-05T18-32-01-413Z/`.
  - `npm run package:steam:win:current` passed, including `check:release-line`, `check:steam-sdk-ready`, Electron packaging, and packaged runtime validation; runtime report: `test-results/steam-package-runtime-2026-06-05T18-35-48-024Z/report.json`.
  - `npm run desktop:smoke:packaged` passed; report: `test-results/packaged-exe-smoke-2026-06-05T18-35-57-515Z/report.json`.
  - Final targeted dead enemy proof after packaging: `npm run check:dead-enemy-playthrough` passed; report: `test-results/dead-enemy-playthrough-2026-06-05T18-36-29-246Z/report.json`.
- Steam private test upload:
  - Payload manifest regenerated with 336 files and 723511890 bytes; `release/steamworks/steam_payload_manifest.json`.
  - VDF inspected before upload: `AppID` `4765070`, depot `4765071`, `ContentRoot` `..\\desktop\\win-unpacked`, and `SetLive` exactly `""`.
  - SteamCMD upload completed successfully for AppID `4765070`; private test BuildID: `23591148`.
  - Evidence JSON: `release/steamworks/steam_upload_evidence_playtest_blockers_20260605.json`.
- Final PDF-prep visual catch and superseding build:
  - While preparing the requested visual-change PDF, the held Overrun confirmation screenshot showed the lower card copy crowding the confirmation prompt.
  - Fixed the Overrun card by giving title/report/sector/bonus/warning/prompt lines more vertical room and exposing per-line bounds through `render_game_to_text().overrunInterlude.textNodes`.
  - `npm run check:overrun-confirmation` now captures `overrun-confirmation-held.png` and fails if any Overrun card text nodes overlap; passed report: `test-results/overrun-confirmation-2026-06-05T18-51-48-618Z/report.json`.
  - `npm run check:overrun-clear`, `npm run check:dead-enemy-playthrough`, `npm run check:i18n`, `npm run build:current`, and `npm run check:i18n-ui` passed after the card fix. Fresh dead enemy report: `test-results/dead-enemy-playthrough-2026-06-05T18-53-00-953Z/report.json`.
  - `npm run check:release-hardening` passed 33/33 checks in 487s after the card fix; latest dead enemy report inside that pass: `test-results/dead-enemy-playthrough-2026-06-05T18-59-54-499Z/report.json`.
  - `npm run build` passed and produced build version `v2026-06-05_21-08-06`; `npm run check:steam-leaderboard-mock`, `npm run check:i18n`, `npm run check:i18n-ui`, `npm run package:steam:win:current`, and `npm run desktop:smoke:packaged` all passed against that build.
  - Superseding VDF inspected before upload: `AppID` `4765070`, depot `4765071`, `ContentRoot` `..\\desktop\\win-unpacked`, and `SetLive` exactly `""`.
  - SteamCMD upload completed successfully for AppID `4765070`; superseding private test BuildID: `23591701`.
