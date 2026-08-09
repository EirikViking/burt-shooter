# Nova Swarm private Steam upload evidence

Date: 2026-08-09

AppID: `4765070`

Depot: `4765071`

BuildID: `24641238`

Depot manifest: `7186070957740730318`

Source branch: `codex/high-sector-first-slice-20260809-58c9`

Packaged gameplay source commit: `07fb0376177199e25b0de44274d81c935201ac63`

Package evidence commit before upload: `935c0262128bc5beb391a294eb657ad46de78fba`

Implementation baseline: `1523f9098b005ddd8db1f1222fb7401f1071e21a`

Locked prior test build: `24637691`, tag commit `baf199558b123d99a68401ec54d1a1291048c85b`

Runtime build: `v2026-08-09_19-19-37`

VDF: ignored local file `release/steamworks/app_build_LOCAL.vdf`

## SteamPipe result

- SteamCMD logged in with the existing cached `gaunziman` credentials. No password was passed on the command line or written to repository evidence.
- Exact command shape: `C:\steamcmd\steamcmd.exe +@ShutdownOnFailedCommand 1 +login gaunziman +run_app_build D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720\release\steamworks\app_build_LOCAL.vdf +quit`.
- One SteamCMD process ran, exited `0`, and reported a successful AppID `4765070` build with BuildID `24641238`.
- Depot `4765071` produced manifest `7186070957740730318` from baseline manifest `9195203850884130318`.
- SteamPipe uploaded 12 new chunks. The changed payload was `Nova Swarm.exe` plus `resources/app.asar`; obsolete non-Windows Steam SDK redistributables were removed from the depot manifest.
- The VDF used exactly `"SetLive" ""`. No public/default branch, `sector-continue-test`, beta branch, or Steamworks setting was assigned or changed.
- App build log: `release/steam-build-output/app_build_4765070.log`.
- Depot build log: `release/steam-build-output/depot_build_4765071.log`.

## Packaged payload

- Payload files: `410`.
- Total bytes: `1174774512`.
- Payload manifest SHA-256: `0722fc4f14d3bab36c077463f1992083d6ee5c27603009e9612af6a4613c6b8c`.
- `Nova Swarm.exe` bytes: `226698752`.
- `Nova Swarm.exe` SHA-256: `91fa383bf7f36bc517c122bd3054ec16cd8405bdcbddc79ff1bc4a62019609c0`.
- Manifest: `release/steamworks/steam_payload_manifest.json`.
- Packaged executable smoke: `test-results/packaged-exe-smoke-2026-08-09T17-33-58-380Z/report.json`.
- Packaged controls: `test-results/packaged-control-smoke-2026-08-09T17-34-03-932Z/report.json`.
- Packaged performance: `test-results/packaged-perf-smoke-2026-08-09T17-34-31-168Z/report.json`.
- The packaged executable reported build `v2026-08-09_19-19-37`, source `07fb037`, Steam bridge ready, native module loaded, and AppID `4765070`.

## Release gates and QA

- Release-line, Steam SDK readiness, production build, Steam package runtime, desktop package integrity, packaged executable smoke, packaged controls, and packaged performance passed.
- Packaged performance measured `59.17` minimum FPS and `60.33` average FPS with no warnings or errors.
- Full browser smoke, controller-only flow, cold-start labels, five-layout responsive UI, 4K/UI scale, source localization, and rendered localization passed.
- The high-sector runtime matrix passed all 12 mode/profile probes. The real Settings Quick Start route launched Sector 75 with five fixed upgrades, armed the prototype, and blocked leaderboard, achievements, checkpoints, and career progress.

## Assignment and rollback

- This is a private, unassigned Steam build. Uploading it did not make it downloadable through a Steam branch.
- No Steam branch rollback is required because no branch moved.
- Source rollback: `git revert 07fb0376177199e25b0de44274d81c935201ac63`.
