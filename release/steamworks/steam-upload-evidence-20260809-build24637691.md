# Nova Swarm Steam upload and test deployment evidence

Date: 2026-08-09

AppID: `4765070`

Depot: `4765071`

BuildID: `24637691`

Depot manifest: `9195203850884130318`

Source branch: `codex/tyrian-boss-combo-boundary-20260809-3f8a`

Packaged source commit: `66b7e17be48a599749a132896442521dbef80a73`

Implementation baseline: `f844715bba32437bf27c2bf43012b7932b487400` (`Add bounded powerup coexistence and fix compact HUD`)

Previous `sector-continue-test` build: `24635286`

Public `default` build at final verification: `24632116`

VDF: `release/steamworks/app_build_LOCAL.vdf`

## SteamPipe result

- SteamCMD logged in using the existing cached `gaunziman` credentials.
- Exact command: `& 'C:\steamcmd\steamcmd.exe' +@ShutdownOnFailedCommand 1 +login gaunziman +run_app_build 'D:\vibe-coding-e\codex\nova-swarm-tyrian-boss-combo-20260809-3f8a\release\steamworks\app_build_LOCAL.vdf' +quit`.
- SteamCMD exited `0` and reported a successful AppID `4765070` build with BuildID `24637691`.
- Depot `4765071` produced manifest `9195203850884130318`.
- The VDF kept `SetLive` empty, so the upload itself did not silently move a branch.
- The signed-in Steamworks Builds page was then used to move only `sector-continue-test` from `24635286` to `24637691`.
- Final live verification showed `sector-continue-test` on `24637691`, `default` unchanged on `24632116`, and `test-build` unchanged on `23782673`.
- App build log: `release/steam-build-output/app_build_4765070.log`.
- Depot build log: `release/steam-build-output/depot_build_4765071.log`.

## Packaged payload

- Files: `417`.
- Total bytes: `1177565823`.
- `Nova Swarm.exe` bytes: `226698752`.
- `Nova Swarm.exe` SHA-256: `AA2E36FAF03FFA7BD3D033209CFC90D2821007AEAAAD13C4E89E538724942353`.
- Payload manifest SHA-256: `675b6e277ceb319bd2456ee6e2d9c2747f0371f539334ad8f0e628ad9596e940`.
- Packaged executable smoke: `test-results/packaged-exe-smoke-2026-08-09T09-23-05-785Z/report.json`.
- The packaged smoke reported source `66b7e17`, Steam bridge ready, native module loaded, and the licensed Steamworks runtime configured.
- Only the required Steam API redistributables were staged. SteamPipe removed `748` old SDK tooling files, avoiding an SDK-development payload in the player depot.

## Release gates and QA

- `npm run check:release-line` passed before packaging and upload.
- The committed-source `npm run build:current`, `npm run build`, `npm run package:steam:win:current`, packaged runtime gate, packaged smoke, packaged controls, packaged performance, and `npm run qa:release` passed.
- Packaged performance measured `60.02` average FPS and `58.82` minimum FPS with no warnings or errors.
- All release-hardening areas passed after aligning three stale harness expectations with the inherited runtime contracts.
- Source and rendered localization passed for all eight supported locales with no new player-facing text, placeholders, or untranslated fallback.
- Focused checks passed for combo lifecycle and flow, boss contact and telegraphs, powerup effects and HUD, input transitions, controller flow, Overrun, sector progression, rank progression, Steam bridge, browser smoke, desktop smoke, and Sector 130 endurance/performance stress.

## Forum follow-up

- Live review reconfirmed Tyrian Mollusk comment `#115`, Steam comment ID `583930834798629669`, as his newest post.
- A no-dash, human-written reply is staged in the signed-in forum textarea but is not yet published. Publication requires the final `Post Comment` action and live comment-ID verification.

## Rollback

- Steam rollback: move `sector-continue-test` back to BuildID `24635286`.
- The public `default` branch was never moved and remains on BuildID `24632116`.
- Source rollback: `git revert 66b7e17`.
