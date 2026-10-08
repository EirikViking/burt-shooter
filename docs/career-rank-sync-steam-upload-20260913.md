# Nova Swarm Steam test upload — Career Rank sync

The Career Rank synchronization fix from commit `5d880336bd5028d7c1db34d1ab8be2bd6fc6a28e` is live on the private Steam beta branch `sector-continue-test` for testing.

## Steam receipt

- AppID: `4765070`
- Depot: `4765071`
- BuildID: `25284959`
- Depot manifest: `2406342197184908991`
- Build version: `v2026-09-13_13-28-12`
- VDF `SetLive`: `sector-continue-test`
- Payload: 410 files, 2,602,230,273 bytes
- Payload manifest hash: `4b1bff89cdfea00ec4c5ea4fadad5c85c8af0ede98681262c7012f88ef328f7c`
- `resources/app.asar` SHA-256: `54772f8a970c25b6489288bd862921e8d27eb52e3fc1a98b582093c195b51fad`

The authenticated Steamworks Builds page confirms BuildID `25284959` as the current `sector-continue-test` build. The public/default branch is `25274613` and `test-build` is `23782673`; neither was changed by this upload. SteamCMD's app-info cache continued to show the prior beta build during the first refresh, so the Steamworks Builds page is the authoritative branch verification for this receipt.

## Validation

- `npm run check:release-line`: pass.
- `npm run build:current -- --outDir E:/Codex/builds/nova-swarm/career-rank-steam-upload-20260913/dist`: pass; all current preflight checks and Vite production build completed.
- Steam native runtime staging and `check:steam-package-runtime`: pass.
- Packaged desktop smoke: pass, zero console events; build `v2026-09-13_13-28-12`, commit `5d88033`.
- Packaged controls: keyboard/gamepad movement, firing and pause checks all pass. The report remains marked failed because the existing startup watchdog logged one `BOOT TIMEOUT - STUCK AT hide loading` console event during the run; this did not invalidate any control assertion.

Steamworks changes were limited to uploading this build and assigning the existing private beta branch. Store metadata, achievements, Cloud settings, leaderboard identities, public/default and legacy test branches were not changed. No public release was performed.

## Test and rollback

In Steam, choose **Nova Swarm → Properties → Betas → `sector-continue-test`**, wait for BuildID `25284959`, then launch normally. The focused checks are the Career Rank catch-up on existing Pure/Tactical/Sector records, unchanged score and run details, rank title/badge agreement with Hangar, and offline reconnect behavior. Also verify bomb input and the death/restart flow from the current feedback pass.

To roll back only the private beta, reassign `sector-continue-test` to BuildID `25282423` in Steamworks. To undo the source fix without rewriting history, use `git revert 5d880336bd5028d7c1db34d1ab8be2bd6fc6a28e` on the branch after checking current ownership.
