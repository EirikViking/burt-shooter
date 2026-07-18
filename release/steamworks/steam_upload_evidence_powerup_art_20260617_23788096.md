# Steam Upload Evidence: Codex Powerup Art Follow-up

- Date: 2026-06-17
- Source commit: `7279af049f68f63bf7459f07c0a475f84b016324`
- Build version: `v2026-06-17_19-50-15`
- Steam AppID: `4765070`
- Steam depot: `4765071`
- Steam leaderboard preserved by package runtime check: `nova_swarm_global_score_v2`
- Steam username: `gaunziman`
- Steam BuildID: `23788096`
- Publish/live status: private upload only; VDF `SetLive` remained `""`

## Verification

- `npm run check:release-line`
- `npm run package:steam:win`
- `npm run desktop:smoke:packaged`
- `npm run desktop:perf:packaged`
- `npm run steamworks:payload-manifest`
- `npm run steamworks:write-vdf`
- SteamCMD upload with absolute VDF path `D:\vibe-coding-e\nova-swarm-sector-continue-prototype\release\steamworks\app_build_LOCAL.vdf`

## Package Evidence

- Packaged smoke: `test-results/packaged-exe-smoke-2026-06-17T17-55-32-720Z/report.json`
- Packaged perf: `test-results/packaged-perf-smoke-2026-06-17T17-57-35-665Z/report.json`
- Packaged perf result: average FPS `59.98018756017938`, minimum FPS `59.523809523799216`, warnings `[]`, errors `[]`
- Payload manifest: `release/steamworks/steam_payload_manifest.json`
- Payload files: `336`
- Payload bytes: `874957701`
- Payload manifest hash: `a30a949267b1386df100cf3416a7f82464c768a607a19749cba3522069cb414a`
- Packaged executable hash: `b63f03df6d37dd3c380ec86d97bf0f72dd9e9244ade78656efebf4b35dcc0e09`

## SteamCMD Result

SteamCMD used cached credentials for `gaunziman` and completed:

```text
Successfully finished AppID 4765070 build (BuildID 23788096).
```

No Steam live branch, store metadata, AppID, depot ID, achievements, leaderboard, or Steamworks settings were changed.
