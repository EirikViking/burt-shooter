# Astra Steam test upload — 2026-09-05

Uploaded BuildID **25144844** to existing branch **sector-continue-test** for AppID **4765070**, depot **4765071**. Depot manifest: **780116711077643828**. SteamCMD completed successfully at 19:56:17 UTC; published app info and live Steamworks Builds page independently confirm assignment. Public/default remains **24879347**; test-build remains **23782673**.

## Provenance and payload

- Git branch: codex/astra-visual-overhaul.
- Original visual baseline: a0b88d064c31dbc879948babd7751bf52fe7be77, from codex/forum-129-improvements-20260822.
- Upload-turn baseline: 32e012454dab2a9b492cfb4fa0ad066bb886a3a7, clean tracked worktree.
- Packaged gameplay source: e6fc397acad0c7b7ad02de154e1a840306269617.
- Original validated package: test-results/astra-build-2026-09-05T18-46-22-205Z/win-unpacked.
- Separate upload copy: test-results/astra-steam-upload-20260905/payload.
- Game archive SHA256 matched the validated package exactly. Original package and release outputs preserved.
- Payload manifest: test-results/astra-steam-upload-20260905/payload-manifest.json; 410 files, 1,341,540,206 bytes; manifest hash 5dbb0531c0360262dc4850a5f427c4d6135cb5d9fc7def668bf2c0bd44b7b59f.
- Native Steam staging removed extra non-Windows SDK libraries from the separate upload copy. SteamPipe comparison against the public depot found only two changed files: Nova Swarm.exe and resources/app.asar. No files added or removed.
- Existing embedded version label remains v2026-08-22_14-35-02; Steam BuildID and packaged source SHA identify this candidate.

## Steam services

Normal Steam launch retains the released integration, without the local desktop launcher's fresh-profile/offline flags. Same existing leaderboard identities:

- nova_swarm_global_score_v2
- nova_swarm_tactical_score_v1
- nova_swarm_sector_start_score_v1

Existing published Auto-Cloud remains enabled for Windows, root WinAppDataRoaming, directory nova-swarm/steam-cloud, file nova-swarm-save.json; quota 1,048,576 bytes and 20 files. Account-profile saves mirror the legacy Auto-Cloud file through the existing implementation. No new boards, save namespace, Cloud configuration, achievements definitions or store metadata were created or changed.

## Validation and limits

Passed this upload turn: check:release-line (including required localization/hotkey ancestry), check:steam-sdk-ready, check:steam-cloud-save, check:steam-electron-bridge, and check:steam-package-runtime on the final upload copy. Original package runtime check initially rejected extra SDK libraries; staging the separate copy resolved it. Existing game tests, performance measurements and packaged gameplay evidence are documented in test-results/astra-v4-delivery/README.md.

Read-only native probes for all three boards loaded the native module and bridges with freshProfile=false and Steam isolation disabled, but returned bridge_unavailable / steam_user_not_logged_on. Exit code zero alone was NOT treated as a successful live-service test. No scores were submitted; probe files used an isolated local directory. Live leaderboard reads and cross-device Cloud round trips remain unverified and require a logged-in Steam client. No real saves or achievements were deliberately exercised by QA. SteamCMD used its cached authorized login, separately from the desktop client.

SteamCMD retried several upload chunks after transient HTTP/connection errors, then completed successfully. Final assignment was verified independently afterward.

## Play and rollback

In Steam Library, right-click Nova Swarm → Properties → Betas → select sector-continue-test (description: test of new mode). Wait for the update, then launch using Steam's Play button while logged in. This build uses the same saves and leaderboards as the release. The desktop Visual Upgrade shortcut remains an isolated offline test launcher.

To return to the public build locally, select None in Betas. To roll back the test branch for everyone using it, assign build 24879347 to sector-continue-test in Steamworks; no rollback was performed. Source rollback command, only if requested and after preserving subsequent work: git switch codex/forum-129-improvements-20260822. Do not reset or discard the experimental branch.

Only this receipt and a progress-file append changed in the upload turn; no runtime code or player-facing text changed, and no new untranslated strings were introduced. Steam upload/test-branch deployment was performed as explicitly requested. Public deployment, Steamworks configuration changes and Git push were not performed.

Evidence: test-results/astra-steam-upload-20260905/{app_build.vdf,upload.log,appinfo-before.log,appinfo-after.log,build-output/,payload-manifest.json,nova_swarm_*/report.json}.
