# Nova Swarm 30 final transmissions private test upload

## Source and scope

- Authorized worktree: `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`
- Branch: `codex/post-stable-authoritative-20260720`
- Starting HEAD: `4bc97019ebdebd0da2ab020812f305c67731c770`
- Source commit: `90f532e124f48ec15689db64b91c3554eb0b3cd6`
- Build: `v2026-07-22_19-34-29`; embedded Git SHA `90f532e`

## Implemented

- Added 29 new text-free Imagegen final-transmission plates, bringing the brief in-game Game Over celebration to 30 unique Nova Swarm variants.
- Added a persistent shuffle bag that does not repeat a visible variant until the complete set of 30 has played. An abandoned run keeps its reserved variant, and the cycle boundary cannot immediately repeat the previous image.
- Gave every variant a distinct data-driven animation signature across hero path, scan direction, fragment movement, core pulse, title entry, drift, zoom, and rotation.
- Replaced the old fade-to-playing-field ending with a full-frame handoff cover and synchronous ticker transition into the existing Game Over result screen. The result screen itself is unchanged.
- Kept only the current final-transmission texture in the runtime cache so repeated runs do not retain all 30 large images in memory.
- Preserved gameplay, scoring, balance, saves, achievements, leaderboards, localization copy, and Steamworks identity.

## Validation

- Passed: `check:gameover-final-transmissions`, `check:i18n`, `check:i18n-ui` in all eight languages, `build:current`, `check:release-line`, Steam SDK readiness, production build, Windows Electron packaging, native Steam runtime staging, Steam package runtime contract, payload manifest, VDF generation, and `git diff --check`.
- The focused contract check verifies exactly 30 unique 1672x941 PNGs, 30 unique hashes, 30 unique animation signatures, two complete no-repeat cycles, abandoned-run reservation, and the direct result-screen handoff source contract.
- Per explicit user instruction, no browser gameplay, Electron gameplay, controller, packaged-runtime, performance, or other smoke test was run.
- No player-facing text changed, so there is no remaining untranslated text from this change.

## Payload and Steam upload

- Payload: `release/desktop/win-unpacked`
- Files: `410`
- Bytes: `1057951560`
- Payload manifest SHA-256: `4a869b310d8db0bc9acbc10a44106b5b08baed56d59fa225adeeda0cd94b2797`
- Executable SHA-256: `a9aec18c547f889dffa1b03b920d7f356be8a948f308773cb15abad77b967a22`
- AppID: `4765070`
- Windows depot: `4765071`
- Existing private branch: `sector-continue-test`
- Previous branch BuildID: `24336526`
- Previous depot manifest: `3787235155057868337`
- New BuildID: `24339078`
- New depot manifest: `7475394859305636484`

The fresh read-only pre-upload baseline exposed external Steam drift: public/default had already moved to the same prior BuildID `24336526`. Exactly one cached-auth SteamCMD upload moved only `sector-continue-test` to `24339078`. Read-only post-upload app info proves public/default remained `24336526` and `test-build` remained `23782673`. No patch notes, forum post, Git push, public/default deploy, new Steam branch, or other Steamworks setting change was performed.

## Rollback

- Source: `git revert 90f532e`
- Private Steam branch: reassign `sector-continue-test` to BuildID `24336526`.
