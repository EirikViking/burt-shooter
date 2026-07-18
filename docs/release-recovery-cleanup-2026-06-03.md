# Nova Swarm Release Recovery Cleanup - 2026-06-03

Authoritative worktree: `D:\vibe-coding-e\burt-shooter-release-final-cleanup-20260603`

Branch: `codex/release-final-cleanup-20260603`

Baseline: `3ae2bae Recover release build stability`

What went wrong: several recovery fixes were spread across dirty worktrees and generated build artifacts, so later builds looked like they had lost fixes that had not been cleanly preserved on one release branch. This cleanup restores the missing in-game Game Over interlude, keeps the cleaned Game Over unlock-progress formatting, keeps the packaged Steam DLL path working, and preserves the release gate evidence from the clean RC worktree.

Checks required before Steam upload:

- `npm run check:release-line`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:leaderboard-adapter`
- `npm run check:steam-cloud-save`
- `npm run check:wave-pacing`
- `npm run check:boss-post-first-difficulty`
- `npm run check:steam-leaderboard-mock`
- `npm run check:gameover-motivation`
- `npm run check:career-intel-layout`
- `npm run check:menu-credits-layout`
- `npm run check:leaderboard-visuals`
- `npm run check:steam-electron-bridge`
- `npm run check:boss-warning-popup`
- `npm run capture:boss-vfx-polish`
- `npm run smoke`
- `npm run check:controller-flow`
- `npm run desktop:smoke:current`
- `npm run desktop:perf:current`
- `npm run package:steam:win:current`
- `npm run desktop:smoke:packaged`
- `npm run desktop:perf:packaged`
- `npm run desktop:controls:packaged`
- `npm run check:desktop-package`
- `npm run steamworks:payload-manifest`
- `npm run qa:release`

Rollback command:

```powershell
git -C D:\vibe-coding-e\burt-shooter-release-final-cleanup-20260603 revert HEAD
```

SteamCMD upload command: not provided in this note because the final cleanup report marks Steam upload safe as NO until the remaining failed release checks are resolved or explicitly accepted.

Steamworks settings were not changed. No deploy or Steam upload was performed.
