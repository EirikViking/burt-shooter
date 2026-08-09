# Nova Swarm private Steam upload evidence

Date: 2026-08-09

AppID: `4765070`

Depot: `4765071`

BuildID: `24641972`

Depot manifest: `8105514034599554327`

Source branch: `codex/high-sector-first-slice-20260809-58c9`

Packaged gameplay source commit: `1a63badb7f05681a242b0e478bdf531814ebdc2d`

Package evidence commit before upload: `49ab94dcb2a32448528e4c7c2cc8521335205afa`

Implementation baseline: `a428ef09d052a32cba90d8c560da55f184aee958`

Locked prior test build: `24637691`, tag commit `baf199558b123d99a68401ec54d1a1291048c85b`

Runtime build: `v2026-08-09_20-48-12`

VDF: ignored local file `release/steamworks/app_build_LOCAL.vdf`

## SteamPipe result

- SteamCMD logged in with the existing cached `gaunziman` credentials. No password was passed on the command line or written to repository evidence.
- Exact command shape: `C:\steamcmd\steamcmd.exe +@ShutdownOnFailedCommand 1 +login gaunziman +run_app_build D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720\release\steamworks\app_build_LOCAL.vdf +quit`.
- One SteamCMD process ran, exited `0`, and reported a successful AppID `4765070` build with BuildID `24641972`.
- Depot `4765071` produced manifest `8105514034599554327` from baseline manifest `9195203850884130318`.
- SteamPipe uploaded 12 new chunks. The changed payload was `Nova Swarm.exe` plus `resources/app.asar`; obsolete non-Windows Steam SDK redistributables were removed from the depot manifest.
- The VDF used exactly `"SetLive" ""`. No public/default branch, `sector-continue-test`, beta branch, or Steamworks setting was assigned or changed.
- App build log: `release/steam-build-output/app_build_4765070.log`.
- Depot build log: `release/steam-build-output/depot_build_4765071.log`.

## Packaged payload

- Payload files: `410`.
- Total bytes: `1174783546`.
- Payload manifest SHA-256: `58ffe5b8b6c337a866cc9f1fae04cbe9a5c9a35001f28cf3857a4b70c4f4bd3e`.
- `Nova Swarm.exe` bytes: `226698752`.
- `Nova Swarm.exe` SHA-256: `ae2d22cc3d615a419b1c3859892602c60995938e17b2664b1d3a23b5a9b0c99d`.
- Manifest: `release/steamworks/steam_payload_manifest.json`.
- Packaged executable smoke: `test-results/packaged-exe-smoke-2026-08-09T18-56-15-343Z/report.json`.
- Packaged controls: `test-results/packaged-control-smoke-2026-08-09T18-57-13-180Z/report.json`.
- Packaged performance: `test-results/packaged-perf-smoke-2026-08-09T18-57-44-714Z/report.json`.
- The packaged executable reported build `v2026-08-09_20-48-12`, source `1a63bad`, Steam bridge ready, native module loaded, and AppID `4765070`.

## Release gates and QA

- Release-line, Steam SDK readiness, production build, Steam package runtime, desktop package integrity, packaged executable smoke, packaged controls, and packaged performance passed.
- Packaged performance measured `59.52` minimum FPS and `60.66` average FPS with no warnings or errors.
- Full browser smoke, controller-only flow, current desktop smoke, five-layout responsive Settings UI, source localization, and rendered localization passed.
- The Prototype page passed all eight supported languages with no placeholders, English leaks, clipping, console errors, or page errors. The high-sector escalation contract remained disabled by default.

## Assignment and rollback

- This is a private, unassigned Steam build. Uploading it did not make it downloadable through a Steam branch.
- No Steam branch rollback is required because no branch moved.
- Source rollback: `git revert 1a63badb7f05681a242b0e478bdf531814ebdc2d`.
