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

- [ ] Reproduce/verify result/status overlap and final One More Run spacing at `1600x900` and scaled sizes.
- [ ] Add obvious visual celebration for new Steam Top 3 and stronger celebration for new Steam #1 without Steam Board/Steamboard/redundant rank wording.
- [ ] Restore final One More Run and Career Intel next-ship-unlock progress; show ship-unlocked result notice; show all-unlocked state.
- [ ] Audit gameplay HUD/central message stacking and make important messages readable during boss/sector/powerup bursts.
- [ ] Deterministically verify every powerup effect, especially Bomb, and fix only broken intended behavior.
- [ ] Reproduce/fix dead small-ship pixel through at least sector 9, preferably 12, while preserving pending `waitingForEntry` enemies.
- [ ] Add sector-10 Overrun confirmation pause, then resume on keyboard/controller/mouse confirmation.
- [ ] Improve Career Intel readability with minimum readable text sizes and spacing.
- [ ] Run required checks: `npm run check:release-hardening`, `npm run build`, `npm run check:steam-leaderboard-mock`, `npm run check:i18n`, `npm run check:i18n-ui`, `npm run package:steam:win:current`, `npm run desktop:smoke:packaged`.
- [ ] Upload private Steam test build with `SetLive` empty, then commit/push final evidence.

## Evidence log

- Initial repo gate passed before file edits: folder, branch, HEAD, clean status, fetched remote, and worktree list verified.
