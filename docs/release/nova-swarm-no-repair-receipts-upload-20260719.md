# Nova Swarm No Repair Receipts Steam upload

Date: 2026-07-19

Source folder: `C:\tmp\nova-swarm-post-stable-development-20260718`

Branch: `codex/post-stable-development-20260718`

Locked baseline: `ae1d2e82accf20859da172f636907a11c965cf3d`

Source commit: `740a5d85e5198213cf74ad7d0c28831f33fb731f`

Package version: `v2026-07-19_09-50-05`

Package folder: `E:\Codex\nova-swarm-steam-package-no-repair-20260719\desktop\win-unpacked`

Packaged executable SHA-256: `CCC2676A206E4460E87D9DD9B6BD56C3A5C096F5BA768DD71E857C83758E504C`

Steam AppID: `4765070`

Windows depot: `4765071`

Steam BuildID: `24281463`

Steam branch assignment: none

VDF `SetLive`: `""`

Upload description: `Nova Swarm No Repair Receipts fix 740a5d8 v2026-07-19_09-50-05 private unassigned`

SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24281463).`

Upload log: `test-results/steam-upload-no-repair-20260719/steamcmd.stdout.log`

The upload did not move a Steam branch, call SetLive, change Steamworks settings, alter leaderboard data, or modify production data.

## Fix

`ACH_NO_REPAIR_RECEIPTS` keeps its existing Steam achievement ID, name, description, 250,000-point gate, and ranked-run requirement. The fix snapshots life losses when Sector 10 marks the run clear and evaluates the achievement against that clear-time value, so a later Overrun death no longer invalidates the clean clear.

## Exact-package verification

- `npm run check:release-line` passed.
- `npm run check:steam-package-runtime` passed.
- `npm run desktop:smoke:packaged` passed.
- `npm run desktop:controls:packaged` passed.
- `npm run desktop:perf:packaged` passed at 60.0 minimum and average FPS across 11 samples.
- `npm run desktop:smoke:current` passed with Steam achievements and both leaderboard identities ready.
- `npm run check:fresh-profile-steam-isolation` passed.
- `npm run check:desktop-package` passed.
- The payload manifest contains 417 files and 958,420,501 bytes.

## Forum status

The exact player report is comment 70 in the pinned Feedback & Suggestions thread:

`https://steamcommunity.com/app/4765070/discussions/0/569288155749142195/?ctp=5#c577173563817151619`

A truthful Tiny Foundry reply is prepared in the reply box. It states that the corrected build is uploaded privately and does not claim the public branch has moved. Posting remains pending the required action-time confirmation.
