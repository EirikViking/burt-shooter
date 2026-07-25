# Nova Swarm Tyrian UX and Overrun Steam test upload

- Source branch: `codex/tyrian-feedback-program-20260724`
- Tested source commit: `76af35f4778e4c334b0be3b9d02231d71b400437`
- Verified baseline ancestor: `41f9f0ed0bf2e57c3c55e762b9532f90d6511a0f`
- Packaged version: `v2026-07-25_12-56-05`
- Payload files: `410`
- Payload bytes: `1,058,854,564`
- Payload content hash: `20c94b1581f65a6590f9302e6f58fa09cb6ecee6267029b2965a07fa7f2c4805`
- Payload manifest file SHA-256: `9bc210a790b34fcb28b1da3194e1db4112b8503de62641edb7796dea25f7b407`
- Executable SHA-256: `92a79552a1f4f222cb2b2879de5841abf76c87fa82dae1fe12dd803556839094`
- Steam AppID / DepotID: `4765070` / `4765071`
- Uploaded BuildID: `24388501`
- Depot manifest: `1473892967432618774`
- Assigned branch: `sector-continue-test`
- Previous private rollback BuildID: `24386654`
- Post-upload branch verification:
  - `sector-continue-test`: `24388501`
  - `public`: `24339078` (unchanged)
  - `test-build`: `23782673` (unchanged)
- Steamworks store data, achievements, public/default branch, published patch notes, and release visibility were not changed.

## Passed gates

- `check:run-modes`
- `check:run-contracts`
- `check:i18n`
- `build:current`
- `check:i18n-ui` (all eight languages)
- `check:controller-flow`
- `check:release-line`
- `package:steam:win`
- `check:steam-package-runtime`
- `check:packaged-steam-runtime-gate`
- `desktop:smoke:packaged` in explicit local mode
- `desktop:controls:packaged`
- `desktop:perf:packaged` (`59.88` minimum, `59.91` average FPS)
- `desktop:smoke:current`
- `check:desktop-package` in explicit local mode
- payload manifest and VDF scope verification

## Steam runtime caveat

The exact package loaded the staged native Steam module, but direct local launch returned `steam_init_returned_false` during the strict packaged smoke. A temporary local `steam_appid.txt` probe produced the same result and was removed before payload manifesting. Renderer/API smoke, packaged controls, and packaged performance passed; static package/runtime checks also passed. The immediately preceding package had passed strict native Steam initialization on the same machine. Manual launch from the assigned Steam test branch is therefore required to confirm SteamAPI, Steam Cloud, achievements, and leaderboard access for this exact BuildID.

## Upload proof

- SteamCMD: `[2026-07-25 13:13:13]: Successfully finished AppID 4765070 build (BuildID 24388501).`
- Depot: `[2026-07-25 13:13:12]: Success! New manifestID 1473892967432618774 created and 11 new chunks uploaded.`
- VDF `SetLive`: exactly `sector-continue-test`
