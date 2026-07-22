# Nova Swarm animated final-transmission private test upload

## Source and scope

- Authorized worktree: `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`
- Branch: `codex/post-stable-authoritative-20260720`
- Starting HEAD: `a9adaf30409fa318206e4b59ce7b7a06613c508e`
- Source commit: `f3d1b4ea45723e4376fa1e5066ca1228599b44d7`
- Package-readiness commit: `b512e01a7e5d88956e78969d6844be6618e55831`
- Build: `v2026-07-22_16-57-24`; embedded Git SHA `f3d1b4e`

## Implemented

- Extended only the brief in-game Game Over celebration from 1.5 seconds to 3.8 seconds, with the existing result menu entered at 3.86 seconds.
- Added staged impact, angular core pulse, an energy scan, stronger shard travel, separate title and score reveals, slow background drift, a readable hold, and a controlled fade.
- Preserved the existing Game Over result menu, gameplay, scoring, balance, saves, achievements, leaderboards, and Steamworks identity.

## Validation

- Passed: `check:i18n`, `build:current`, `check:release-line`, Steam SDK readiness, production build, Windows Electron packaging, native Steam runtime staging, Steam package runtime contract, payload manifest, VDF generation, and `git diff --check`.
- Per explicit user instruction, no browser, Electron, controller, packaged-runtime, performance, or other smoke test was run for this surgical follow-up.
- No player-facing text changed, so there is no remaining untranslated text from this change.

## Payload and Steam upload

- Payload: `release/desktop/win-unpacked`
- Files: `410`
- Bytes: `985394533`
- Payload manifest SHA-256: `5f17ce0e33c0f06cf116d8c498e286992f8a8fc2ec2812fce7eb7d1ecfba4496`
- Executable SHA-256: `5afbdd94c330e850d75e2838e085daa35c62f593a53f9e7efed46b5ec77712a6`
- AppID: `4765070`
- Windows depot: `4765071`
- Existing private branch: `sector-continue-test`
- Previous private BuildID: `24336080`
- Previous depot manifest: `1774741157419153583`
- New BuildID: `24336526`
- New depot manifest: `3787235155057868337`

Read-only post-upload app info proves public/default remained `24311168`, `sector-continue-test` moved from `24336080` to `24336526`, and `test-build` remained `23782673`. Exactly one SteamCMD upload process was started and allowed to finish; no retry upload was started after the caller's short output timeout. No patch notes, forum post, Git push, public/default deploy, new Steam branch, or other Steamworks setting change was performed.

## Rollback

- Source: `git revert f3d1b4e`
- Private Steam branch: reassign `sector-continue-test` to BuildID `24336080`.
