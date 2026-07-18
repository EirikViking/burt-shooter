# Steam Upload Evidence: Cinematic Hangar Menu Buttons

- Date: 2026-06-17
- Source commit: `f95bfa1f5dd44aff384a39431e23e060d2e28d48`
- Baseline commit: `136762d2858501cfd4d2787a01296661e11d3469`
- Build version: `v2026-06-17_19-50-15`
- Steam AppID: `4765070`
- Steam depot: `4765071`
- Steam leaderboard preserved by packaged smoke: `nova_swarm_global_score_v2`
- Steam username: `gaunziman`
- Steam BuildID: `23791250`
- Publish/live status: uploaded to private test branch `sector-continue-test`; public/default branch was not targeted.

## Verification

- `git fetch --all --prune`
- `git status --short --branch`
- `git branch --show-current`
- `git log -1 --oneline --decorate`
- `git worktree list`
- `npm run check:release-line`
- `npm run check:i18n`
- `npm run check:controller-flow`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run package:steam:win:current`
- `npm run desktop:smoke:packaged`
- `npm run smoke`
- `npm run desktop:smoke:current`
- `npm run steamworks:payload-manifest`
- `npm run desktop:perf:packaged`
- `npm run steamworks:write-vdf` with `STEAM_SET_LIVE=sector-continue-test`
- SteamCMD upload with absolute VDF path `D:\vibe-coding-e\nova-swarm-sector-continue-prototype\release\steamworks\app_build_LOCAL.vdf`

## Package Evidence

- Packaged smoke: `test-results/packaged-exe-smoke-2026-06-17T21-33-55-403Z/report.json`
- Packaged smoke status: `passed`
- Packaged perf: `test-results/packaged-perf-smoke-2026-06-17T21-43-52-159Z/report.json`
- Packaged perf result: average FPS `60.150877267068154`, minimum FPS `58.8235294117647`, warnings `[]`, errors `[]`
- Payload manifest: `release/steamworks/steam_payload_manifest.json`
- Payload files: `336`
- Payload bytes: `878085446`
- Payload manifest hash: `53dbf9fa28b06b90691e7a4af8aeb3aaaf58c48155f1e061e9ecfa379eaa99c4`
- Packaged executable hash: `70627535264d3c6e88e9fa460c4b1e03a32798b5f5b32f2fed3a473a82b29918`
- Steam upload log: `test-results/steam-upload-menu-buttons-20260617-235150/steamcmd.log`

## SteamCMD Result

SteamCMD used cached credentials for `gaunziman` and completed:

```text
Successfully finished AppID 4765070 build (BuildID 23791250).
```

Depot `4765071` created manifest `4016122801911034829`, uploaded 13 new chunks, and reported only `Nova Swarm.exe` plus `resources\app.asar` changed from the previous baseline manifest.

Steam store metadata, AppID, depot ID, achievements, leaderboard, and public/default branch were not changed. The private branch assignment was intentionally set to `sector-continue-test` for testing.
