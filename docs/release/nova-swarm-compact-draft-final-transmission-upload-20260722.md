# Nova Swarm compact Draft and final-transmission private test upload

## Source and scope

- Authorized worktree: `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`
- Branch: `codex/post-stable-authoritative-20260720`
- Starting HEAD: `65ae956154bfc584be1c51a9a2cf48e7bfe9022d`
- Source commit: `1462b1f72e4c34223f7dedfcf497083a3b80b1f3`
- Package-readiness commit: `d5c118d5fb289b671fd3c1f7522fec866e25bcbf`
- Build: `v2026-07-22_16-22-34`; embedded Git SHA `1462b1f`

## Implemented

- Compressed the 1080p Tactical Draft cards from 590px to 460px and reflowed icon, description, impact, synergy/fusion, permanence, and Choose into a continuous readable stack. Compact, long-language, and gamepad semantics remain intact.
- Replaced only the brief in-game Game Over celebration with a text-free Imagegen final-transmission scene, angular breakup fragments, and a restrained command plate. It still hands off automatically to the existing Game Over result menu after 1.5 seconds.
- Cleared active and delayed menu voice playback at the successful gameplay handoff so menu narration cannot overlap the in-game pilot voice.
- Strengthened Pilot Orders coverage: saved Near-Miss Streak 3/5 advances to 4/5 in Mayhem Tactical and completes at x5/x7 through the real runtime and persistence path. Non-Mayhem modes remain intentionally ineligible.
- Preserved gameplay, scoring, balance, draft RNG, saves, achievements, leaderboards, and Steamworks identity.

## Validation

- Passed: `check:release-line`, `check:i18n`, all-eight-language `check:i18n-ui`, `build:current`, `check:tactical-draft`, `check:run-contracts`, `check:near-miss-streak-clarity`, `check:menu-voice-overlap`, `check:gameover-interlude`, `check:steam-electron-bridge`, `check:controller-flow`, browser `smoke`, current Electron smoke, Steam SDK/package runtime, packaged local-mode EXE smoke, packaged keyboard/gamepad controls, fresh-profile isolation, strict packaged runtime failure/opt-out behavior, desktop-package freshness, payload manifest, packaged performance, and `git diff --check`.
- Tactical Draft coverage includes first and late Drafts, stacks, dynamic effects, Fusion blueprint/completion, active Fusion, Rescan/Hold/Ban, 1920x1080, compact 760x640, and German/Russian/Chinese long-layout checks.
- Packaged performance: 60.00 minimum/average FPS across 11 samples, no errors. One screenshot capture retry recovered from `UnknownVizError`.
- Direct packaged Steam-mode launch correctly failed closed outside a Steam launch with `steam_init_returned_false`; native modules, explicit local opt-out, cached SteamCMD authentication, and all packaged local gates passed.
- The optional generic develop-web-game client remained unavailable before navigation because its separate cache lacks `chromium_headless_shell-1208`; repository-native installed-Chrome and Electron validation passed.

## Visual evidence

- Tactical Draft before: `C:\Users\cromk\AppData\Local\Temp\codex-clipboard-5b9ee109-0b59-4053-8e06-d4d9eb1453aa.png`
- Tactical Draft after: `test-results/tactical-draft-2026-07-22T13-44-38-377Z/tactical-draft-first-1920x1080.png`
- Tactical Draft late/fusion/compact: `test-results/tactical-draft-2026-07-22T13-44-38-377Z/tactical-draft-late-1920x1080.png`, `test-results/tactical-draft-2026-07-22T13-44-38-377Z/tactical-draft-active-fusion-1920x1080.png`, `test-results/tactical-draft-2026-07-22T13-44-38-377Z/tactical-draft-compact.png`
- Game Over celebration before: `C:\Users\cromk\AppData\Local\Temp\codex-clipboard-d4acb5d1-74ac-4403-b71b-cf5ef12a5c91.png`
- Game Over celebration after: `test-results/gameover-interlude-2026-07-22T14-12-02-440Z/gameover-interlude.png`
- Near-Miss completion proof: `test-results/near-miss-streak-clarity-2026-07-22T13-54-34-399Z/near-miss-streak-clarity.png`
- Voice handoff proof: `test-results/menu-voice-overlap-2026-07-22T14-10-50-495Z/menu-to-gameplay-voice-handoff.png`

## Payload and Steam upload

- Payload: `release/desktop/win-unpacked`
- Files: `410`
- Bytes: `985393392`
- Payload manifest SHA-256: `715073d3de8f72b42f36f316442c2128b07a6ba3cf03d678688a0728b4b7119d`
- Executable SHA-256: `499cc69b0b0bf8e324842ace683add8cc19861121e07a909816b4425d1a3b927`
- AppID: `4765070`
- Windows depot: `4765071`
- Existing private branch: `sector-continue-test`
- Previous private BuildID: `24331832`
- Previous depot manifest: `7941892767995791817`
- New BuildID: `24336080`
- New depot manifest: `1774741157419153583`
- SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24336080).`

Read-only post-upload app info proves public/default remained `24311168`, `sector-continue-test` moved from `24331832` to `24336080`, and `test-build` remained `23782673`. Exactly one build was uploaded. No patch notes, forum post, Git push, public/default deploy, new Steam branch, or other Steamworks setting change was performed.

## Rollback

- Source: `git revert 1462b1f`
- Private Steam branch: reassign `sector-continue-test` to BuildID `24331832`.
