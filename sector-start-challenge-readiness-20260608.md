# Sector Start Challenge readiness - 2026-06-08

## Scope

- Worktree: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
- Branch: `feature/sector-continue-prototype-v1`
- Starting HEAD: `83846c9abe5796f543f9fe455a9a691c23182e1d`
- Code fix commit: `d5e83efd43479b61ec9f5f65ffff42a9509f1653`
- Locked release untouched by this pass: BuildID `23620801`, package `v2026-06-08_13-11-45`, tag `nova-swarm-release-20260608-build23620801`
- Main leaderboard preserved in source as `nova_swarm_global_score_v2`

## Design Summary

Normal ranked Start Run remains the Sector 1 ranked run. It keeps normal score rules, progression, local/global best handling, achievements, ship unlock progress, ship usage progress, Threat Codex discovery writes, and Steam leaderboard submission to `nova_swarm_global_score_v2`.

Sector Start Challenge remains a local unranked mode. The player chooses an unlocked checkpoint with visible menu chevrons and keyboard/controller left-right input. Challenge score starts from 0, records are local/profile-scoped per selected checkpoint, and the result screen states that the run is unranked with the main leaderboard off.

## Checkpoint Unlock Rules

No reliable separate cleared-sector field was found in the current profile shape, so the safe unlock rule is used:

- Non-gate checkpoints unlock when `highestReached >= checkpoint`.
- Gate checkpoints divisible by 10 unlock only when `highestReached >= checkpoint + 1`.
- Locked future checkpoints cannot be selected.

Expected cases now covered:

- Highest below 5: Sector Start hidden/disabled.
- Highest 5: Sector 5 only.
- Highest 9: Sector 5 only.
- Highest 10: Sector 10 remains locked.
- Highest 11: Sector 10 unlocked.
- Highest 17: Sector 5, 10, 15.
- Highest 20: Sector 20 remains locked.
- Highest 21: Sector 20 unlocked.
- Highest 30: Sector 30 remains locked.
- Highest 31: Sector 30 unlocked.

## Start Sector Mapping

Records remain keyed by selected checkpoint. Gameplay start sector is:

- Sector 5 Challenge starts at Sector 5.
- Sector 10 Challenge starts at Sector 11.
- Sector 15 Challenge starts at Sector 15.
- Sector 20 Challenge starts at Sector 21.
- Sector 30 Challenge starts at Sector 31.
- Same rule continues for 40, 50, etc.

The bug fixed in this pass was that Sector 10/20/30 checkpoints could be offered as soon as the player merely reached the gate sector. They now require the post-clear sector before the challenge can be selected.

## Ranked And Progression Isolation

Source audit and checks show Sector Start Challenge keeps:

- `scoreSubmissionAllowed` false.
- Main Steam leaderboard submission blocked.
- Normal local/global best score untouched.
- Rank XP blocked.
- Achievements blocked.
- Ship unlock progress blocked.
- Ship usage progress blocked.
- Normal Threat Codex discovery writes blocked.
- Separate local challenge records only.

Normal ranked Start Run still starts at Sector 1, is ranked, permits score submission, uses `nova_swarm_global_score_v2`, and uses normal progression/result behavior.

## UI/UX Evidence

Visual evidence was generated from committed code fix HEAD `d5e83ef` with no page errors or console errors:

- `test-results/sector-start-readiness/01-menu-sector20-arrows-no-record.png`
- `test-results/sector-start-readiness/02-menu-sector10-no-record.png`
- `test-results/sector-start-readiness/03-menu-sector100-large-best.png`
- `test-results/sector-start-readiness/04-result-sector20-new-best.png`
- `test-results/sector-start-readiness/05-result-sector20-existing-best.png`
- `test-results/sector-start-readiness/06-result-ranked-comparison.png`
- `test-results/sector-start-readiness/report.json`

The evidence covers visible checkpoint chevrons, no-record state, large best score state, Sector Start Challenge result wording, Back to Main Menu, One More Run same-checkpoint behavior, and normal ranked result comparison.

Current local/dev build string observed in evidence: `v2026-06-08_23-49-12`.

## Save/Profile Compatibility

Sector Start Challenge records are stored under the separate profile-scoped key `novaSwarm.sectorStartChallengeRecords.v1`. Existing normal progression keys and normal best-score keys are not reused for challenge results. Older builds should ignore the added challenge-record key harmlessly because it is separate from normal ranked progression data.

## Tests Run

Focused checks:

- PASS `npm run check:sector-start-checkpoint-unlocks`
- PASS `npm run check:sector-continue-mode`
- PASS `npm run check:sector-continue-controller-flow`
- PASS `npm run check:sector-start-challenge-records`
- PASS `npm run check:sector-start-result-flow`
- PASS `npm run check:sector-start-menu-layout`
- PASS `npm run check:steam-leaderboard-mock`
- PASS `npm run check:profile-isolation`
- PASS `npm run check:progression-pacing`
- PASS `npm run check:steam-cloud-save`
- PASS `npm run check:devtools-gate`

Guards:

- PASS `npm run build:current`
- PASS `npm run check:i18n`
- PASS `npm run check:i18n-ui`
- PASS `npm run smoke`
- PASS `npm run check:controller-flow`
- PASS `npm run check:release-line`

One initial `npm run check:sector-continue-mode` run exposed a flaky mouse click in the final normal-run regression step after reload. The exact failing step was changed to a focused Enter activation from the already selected Launch Run option, and the check passed after that targeted harness fix.

## Steam Upload Status

Steam upload was performed after explicit follow-up approval to upload the current prototype to `sector-continue-test`.

Local VDF/upload tooling inspected:

- `release/steamworks/app_build_TEMPLATE.vdf` contains the `SetLive` field used by SteamPipe branch assignment.
- `scripts/write-steamworks-vdf.mjs` writes `SetLive` from `STEAM_SET_LIVE`, defaulting to empty.
- Generated VDF used AppID `4765070`, depot `4765071`, and `"SetLive" "sector-continue-test"`.

Latest Steam BuildID uploaded to `sector-continue-test`: `23635462`.
Latest package upload: `v2026-06-09_07-39-24`.
Latest build description: `Sector Start Challenge Steam Cloud records e9124d4 v2026-06-09_07-39-24`.
Latest payload manifest: `336` files, `724431592` bytes, manifest hash `abc2a7b76ae5ac5834f772e09eeb6adcf0b0869e549ee6cfb7559142679d36c0`.
Previous gate-fix BuildID superseded on `sector-continue-test`: `23635210`.
Default branch BuildID `23620801`: not targeted by the VDF.
`test-build` branch: not targeted by the VDF.
`SetLive`: set only to `sector-continue-test` for this upload.

## Known Risks

- The automated checks are strong for run-mode isolation and menu/result flow, but a manual Steam-client pass is still needed for controller feel, focus comfort, and real packaged runtime behavior.
- The checkpoint unlock rule is intentionally conservative because the current profile shape did not provide a reliable separate cleared-sector fact.
- Sector Start Challenge is new profile-surface area. The separate storage key lowers corruption risk, but this should still be watched after Steam-client testing.
- Steam beta deployment is now on `sector-continue-test`, but do not ship live until a Steam-client pass confirms the uploaded build.

## Recommendation

A. Safe enough for sector-continue-test only. Do not ship live yet.

Deployment action completed for `sector-continue-test` only after explicit follow-up approval. Default and `test-build` were not targeted.

Estimated risk after this pass:

- Noticeable Sector Start issue: 8-12%.
- Serious normal-run regression: 2-4%.
- Leaderboard/progression corruption: below 1-2%.
- Confidence: medium-high for private beta testing, not high enough for live without one Steam-client pass.

## Morning Manual Checklist

1. Install/select the private beta build once branch targeting is resolved.
2. Confirm main menu shows visible chevrons and left/right checkpoint changes.
3. With highest 10, confirm Sector 10 Challenge is locked.
4. With highest 11, confirm Sector 10 Challenge starts gameplay at Sector 11.
5. With highest 20, confirm Sector 20 Challenge is locked.
6. With highest 21, confirm Sector 20 Challenge starts gameplay at Sector 21.
7. End a Sector Start Challenge and confirm `UNRANKED CHALLENGE | MAIN LEADERBOARD OFF`.
8. Use One More Run and confirm it relaunches the same checkpoint.
9. Use Back to Hangar and Back to Main Menu with keyboard, mouse, and controller.
10. Run normal Launch Run and confirm it starts Sector 1, submits only to `nova_swarm_global_score_v2`, and grants normal progression.
11. Confirm Sector Start does not unlock achievements, ships, ship usage progress, rank XP, or normal Codex entries.

## Rollback

Local branch rollback:

```powershell
git revert d5e83efd43479b61ec9f5f65ffff42a9509f1653
```

Remove prototype worktree if no longer needed:

```powershell
git worktree remove D:\vibe-coding-e\nova-swarm-sector-continue-prototype
```
