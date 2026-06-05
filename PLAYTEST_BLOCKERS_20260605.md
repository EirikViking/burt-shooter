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
- [ ] Audit gameplay HUD/central message stacking and make important messages readable during boss/sector/powerup bursts.
- [ ] Deterministically verify every powerup effect, especially Bomb, and fix only broken intended behavior.
- [ ] Reproduce/fix dead small-ship pixel through at least sector 9, preferably 12, while preserving pending `waitingForEntry` enemies.
- [ ] Add sector-10 Overrun confirmation pause, then resume on keyboard/controller/mouse confirmation.
- [x] Improve Career Intel readability with minimum readable text sizes and spacing.
- [ ] Run required checks: `npm run check:release-hardening`, `npm run build`, `npm run check:steam-leaderboard-mock`, `npm run check:i18n`, `npm run check:i18n-ui`, `npm run package:steam:win:current`, `npm run desktop:smoke:packaged`.
- [ ] Upload private Steam test build with `SetLive` empty, then commit/push final evidence.

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
