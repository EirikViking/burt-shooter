# Encounter expansion — Steam test delivery

User explicitly requested a Steam upload for personal testing after the local implementation. Uploaded and verified on 2026-09-30 at approximately 14:19 Europe/Oslo.

| Item | Verified value |
| --- | --- |
| App / Windows depot | 4765070 / 4765071 |
| Test branch / BuildID | `sector-continue-test` / **25627456** |
| Windows manifest | `480209494602525437` |
| Public/default, unchanged | 25579437 |
| Other `test-build`, unchanged | 23782673 |
| Test branch rollback target | 25579437; no rollback performed |
| Build label / entry | `v2026-09-30_09-21-18` / `index-CIPa5aG-.js` |
| Source branch / baseline HEAD | `codex/sector-leaderboard-unknown-20260928` / `7e8325e3d9abb09357636bca7e994c0227be02d6`, dirty |
| Packaged archive SHA-256 | `2d169396b258240879411826f8c19e950f42b5a14d376ced2e9b4e5f57d9b613` |

The pre-upload Steamworks read differed from the historical handoff: public/default already used 25579437, rather than 25575999. The current public assignment was preserved. No branch access, store, language, achievement definitions, leaderboard identifiers or Cloud settings were edited. Authenticated before/after app-info receipts confirm the complete Cloud UFS block is unchanged. No Git commit/push, public release, forum post or player-data reset occurred.

## What to test

Reconnect/sign into the Steam client, then Nova Swarm → Properties → Betas → select `sector-continue-test`, allow the download to finish, and launch. Confirm the build label above; the Steam build ID is 25627456. Test actual installed gameplay, input, save/Cloud/leaderboard behavior, first and third encounter sightings, and shipping-client frame tails. Tactical is required for the new Fusions; normal eligibility and prerequisites apply. Forced loopback DEV routes are unavailable in this production package.

Feature descriptions, tuning hypotheses, build/loadout checks and the human playtest checklist remain in `docs/reviews/encounter-expansion-20260930.md`. This upload includes preserved Molt/Payback, the forum fixes, and the complete remaining expansion. The quoted forum answers remain unpublished.

## Packaging and verification

- `npm run check:release-line` passed before packaging, VDF preparation and upload; localization/Cloud/fullscreen/marketing prerequisites present.
- `check-steam-sdk-ready` and `check-steam-package-runtime` passed. The package retains the existing branded executable/native runtime and uses the current verified dist, electron source and package metadata. All 15,508 archive files were verified against staging; native files were compared against the existing package.
- The initial extraction attempt found unsupported SDK platform entries remaining in the inherited archive header after its Windows SDK files were narrowed. The task helper now admits only the two required Windows SDK DLLs. Failed staging was reused without deleting or switching source directories. The standard junction-based package command was not run or claimed to pass.
- Packaged menu/render/API/build checks passed, with no console events and native Steam module loaded. The **online packaged smoke gate failed**, including an unchanged retry, with `steam_user_not_logged_on`. Steam client logs identify `Session Replaced` by SteamCMD authentication, with no automatic reconnect. This is recorded rather than claimed as a passing online smoke test. The authorized test-branch upload proceeded for user-installed validation; no public release readiness is claimed.
- SteamPipe completed successfully as BuildID 25627456. Fresh authenticated SteamCMD app info and the Steamworks Builds page verified assignment. Public, other test branch and complete Cloud configuration stayed unchanged. A browser screenshot records those assignments. A complete-viewport capture timed out; the successful origin capture includes the branch table and new build row.
- Live Steam download/launch, online leaderboard reads and human fun/readability remain unverified. SteamCMD replaced the local client login session; reconnect Steam after the final verification login.

## Artifacts and reproducibility

Job root: `E:\Codex\builds\nova-swarm\encounter-expansion-steam-test`.

Retain current `win-unpacked\Nova Swarm.exe`, `package.json`, `delivery.json`, `app_build.vdf`, authenticated `steam-before.json` / `steam-after.json`, SteamPipe logs, unique QA evidence and the three helper scripts under `reproduction`. The tested static build and explicit comparison baseline remain in the earlier expansion root. Existing source `dist`/shared `node_modules` junctions and earlier required builds were preserved. No installations or shared dependency patches were performed; process TEMP/TMP stayed on E:.

Upload command used the existing E: SteamCMD cache and cached credentials, with only `SetLive sector-continue-test` in the task VDF:

```powershell
$env:TEMP='E:\Codex\tmp\encounter-expansion-steam-test'; $env:TMP=$env:TEMP
& 'E:\dev-cache\steamcmd-nova\steamcmd.exe' +login gaunziman +run_app_build 'E:\Codex\builds\nova-swarm\encounter-expansion-steam-test\app_build.vdf' +quit
```

Do not rerun the upload or assign any branch without authorization. A Steam rollback would assign BuildID 25579437 to `sector-continue-test`; no source reset is necessary. Previous source-only rollback references are historical and need review against this later delivery documentation.

## Cleanup limitation

Active chats/processes, exact approved E: roots and ownership were inspected. Automatic approval review rejected recursive removal before execution (`blocked by policy`), first for failed package staging and then for the isolated QA profile. No removal/rename workaround was attempted. Packaging reused the failed stage; `win-unpacked` is now the required deliverable.

Disposable paths still present:

- `E:\Codex\tmp\encounter-expansion-steam-test` — approximately 2.19 GiB, mostly verified temporary package source, plus logs/helpers.
- `E:\Codex\builds\nova-swarm\encounter-expansion-steam-test\evidence\packaged-smoke\userData` — isolated QA profile; not production player data.

Cleanup is incomplete. Shared SteamCMD cache was inspected at approximately 139 MiB and preserved. Final E: free space at handoff verification is approximately 330.98 GiB. Earlier tasks' blocked cleanup and comparison builds were not reclaimed. Source changes in this upload task are delivery documentation and an appended handoff only; gameplay source was not changed.
