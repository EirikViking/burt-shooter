# Nova Swarm Steam test deployment — BuildID 24709658

- Deployment date: 2026-08-13
- Source worktree: `D:\vibe-coding-e\nova-swarm-all-latest-20260813`
- Source branch: `codex/all-latest-menu-tyrian-20260813`
- Source commit: `056307d48b88bc773cf0e26a207716143f5cc8ae`
- Build stamp: `v2026-08-13_10-33-12`
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Assigned branch: `sector-continue-test`
- Steam BuildID: `24709658`
- Depot manifest: `8191350453244238872`

## Branch safety

Fresh app-info immediately before upload showed:

- `public`: BuildID `24707244`
- `sector-continue-test`: BuildID `24707244`
- `test-build`: BuildID `23782673`

Fresh app-info immediately after upload showed:

- `public`: BuildID `24707244` — unchanged
- `sector-continue-test`: BuildID `24709658`
- `test-build`: BuildID `23782673` — unchanged

The inspected VDF contained exactly `SetLive "sector-continue-test"`. It did not target `public` or `default`.

## Payload

- Files: `410`
- Bytes: `1,165,268,453`
- Payload manifest SHA-256: `83bedfdd8dd49eb88e3e3c24d20b6d6cc42d09c231ce4bd4eeaf51b82be52f20`
- `Nova Swarm.exe` SHA-256: `c58daffa26b18246447070e902d3c413bde8b0716c1f15cd27675ccceefd64b7`
- `resources/app.asar` SHA-256: `820d6fdd46f7cbbab5bfb5f398b9bb158a2bf6960e56533dde5e3b282cc1a5d9`

The generated package was narrowed before upload so that its embedded Steam SDK directory contains only the required 32-bit and 64-bit redistributable DLLs. SDK headers, examples, tools, and libraries were not uploaded. The narrowed package was revalidated afterward.

## Validation

- `npm run check:release-line` — PASS
- `npm run package:steam:win` — PASS
- `npm run check:steam-package-runtime` after payload narrowing — PASS
- `npm run desktop:smoke:packaged` — PASS
- `npm run desktop:controls:packaged` — PASS
- `npm run desktop:perf:packaged` — PASS; 12 samples, minimum 59.52 FPS, average 59.91 FPS, no warnings or errors
- SteamCMD upload — SUCCESS: `Successfully finished AppID 4765070 build (BuildID 24709658)`
- Fresh Steam app-info verification — PASS

The upload process itself exited successfully. A local post-command text assertion expected an older success phrase and returned a false failure after Steam had already accepted the build; the upload was not retried. Both the SteamCMD success line and fresh app-info independently confirm BuildID `24709658`.

## Rollback

Assign `sector-continue-test` back to BuildID `24707244`. Public/default requires no rollback because it was not changed.

No store metadata, achievements, leaderboards, Steam Cloud data, patch notes, release visibility, public/default assignment, Git push, or publication was changed.
