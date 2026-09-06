# Astra V5 Steam test upload — 6 September 2026

**Build 25147283 is assigned to `sector-continue-test`.** SteamCMD completed at 01:05:13 UTC. Both refreshed Steam app info and the authenticated Steamworks Builds page independently confirm the assignment. Public/default remains **24879347**; `test-build` remains **23782673**. No store media, public release or Steamworks service settings were changed.

App **4765070**, depot **4765071**, depot manifest **8952128980673134231**. Separate upload copy: `test-results/astra-steam-upload-20260906-v5/payload`. The validated Windows package remains intact at `test-results/astra-build-2026-09-06T00-36-04-502Z/win-unpacked`.

Provenance:

- Branch: `codex/astra-visual-overhaul`.
- Original visual baseline: `a0b88d064c31dbc879948babd7751bf52fe7be77`, original branch `codex/forum-129-improvements-20260822`.
- V5 starting source: `95173e42b714d3f748a7b341d7ad559999ca4193`.
- Runtime checkpoint: `8ebcd6e4e547ac00e1e6d586608ea3287838c6d1`. Build began before this checkpoint was committed, so embedded Git label is `3d6503a`; runtime files did not change between build and checkpoint.
- Package and upload `resources/app.asar` match SHA256 **eca0bd0525d40e5142e491874f9a527a4cb912f4549ac1e8e6007e3987bbb5db**.
- Payload: 410 files, 1,369,417,643 bytes; manifest hash **82936a24e60bcd3cdf6445297df57c4afa70de4fa71a5f5065544eabaf5cb4b1**.
- Release-line and Steam package runtime checks passed before upload. Native SDK staging affected only the new upload copy. Original release outputs preserved; no Git push/pull/merge/rebase.

## Existing Steam services

Same boards: `nova_swarm_global_score_v2`, `nova_swarm_tactical_score_v1`, `nova_swarm_sector_start_score_v1`. Published Auto-Cloud was verified unchanged: Windows, WinAppDataRoaming, `nova-swarm/steam-cloud/nova-swarm-save.json`, 1,048,576-byte quota, 20 files. No new boards, cloud namespaces or achievement definitions were created.

Offline Cloud persistence, runtime persistence and Electron bridge tests passed. The preceding native live-service probes reported `steam_user_not_logged_on`; no successful live read or cross-device Cloud round trip is claimed. QA did not submit synthetic scores or exercise real saves. Normal launch through the logged-in Steam client uses the existing released service integration. The local Visual Upgrade shortcut intentionally remains isolated/offline.

## Play and rollback

Steam Library → Nova Swarm → Properties → Betas → **sector-continue-test**. Wait for the update, then use Steam's Play button. To return locally to the public build, select **None**. To roll back only this test branch, reassign its preceding build **25144844** in Steamworks; no rollback was performed.

Local isolated launch:

```powershell
node "D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822\test-results\astra-build-2026-09-06T00-36-04-502Z\launch.mjs"
```

Source rollback if requested and after preserving later changes: `git switch codex/forum-129-improvements-20260822`. Do not reset or discard the experiment.

Evidence: `test-results/astra-steam-upload-20260906-v5/{app_build.vdf,upload.log,appinfo-before.log,appinfo-after.log,payload-manifest.json,source-archive-verification.json,build-output/}`. Full implementation/tests/performance and limitations: `test-results/astra-v5-delivery/README.md`. Trailer drafts and actual gameplay screenshots: `test-results/astra-v5-steam-media/`; publication awaits the user's approval.
