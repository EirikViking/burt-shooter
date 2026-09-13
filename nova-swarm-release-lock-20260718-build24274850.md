# Nova Swarm Stable Release Lock: Build 24274850

Created: 2026-07-18

## Locked build identity

- Steam BuildID: `24274850`
- Package version: `v2026-07-18_17-04-21`
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Leaderboard identity: `nova_swarm_global_score_v2`
- Exact packaged source commit: `4c27594136aa0b74f1c55ca98a20a1a6fe25af44`
- Upload evidence commit: `a7adf0fa93b68d3a2587acbec0cd033eae02a005`
- Source branch at upload: `codex/hangar-tactical-launch-20260718`
- Stable GitHub branch: `codex/stable-build24274850-20260718`
- Immutable source tag: `nova-swarm-release-20260718-build24274850`
- Immutable evidence tag: `nova-swarm-stable-20260718-build24274850`
- Steam branch assignment: none
- VDF `SetLive`: `""`

The source tag identifies the exact game source packaged and uploaded to SteamPipe. The evidence tag identifies the stable branch tip containing this lock, upload receipt, GitHub handoff, and continuation prompt.

This lock does not upload another build, move a Steam branch, call SetLive, edit Steamworks settings, alter production data, or change store metadata.

## Ancestry and inclusion proof

The locked source is a descendant of both required baselines:

- Approved checkpoint: `426e94490e15201fe2fb899bd707b84e56990b6f`
- Public frame pacing fix: `9f8c220`

Both `git merge-base --is-ancestor` checks returned success.

The exact source delta from `9f8c220` to `4c27594` is 36 files, 2,008 insertions, and 151 deletions. The source history is:

- `8859d6bcae51bb8cd954fba9b6536c378312ef9f` fixes the confirmed Tyrian gameplay feedback.
- `8750ab1778772904cdd152b1228295a6e0a20a42` records the verified Tyrian package handoff.
- `ae96e04d1ef27ca2f27872a685212ca6290423ca` records the Tyrian Steam upload.
- `61000872df5c7dcdfcee292350b58ddc54cc54bb` prepares the public Tyrian communications.
- `4c27594136aa0b74f1c55ca98a20a1a6fe25af44` makes every Hangar launch enter Mayhem Tactical.
- `a7adf0fa93b68d3a2587acbec0cd033eae02a005` records Steam BuildID `24274850`.

## Included improvements

BuildID `24274850` includes all changes already present in the approved checkpoint and frame pacing rescue, plus the following confirmed feedback work:

- Dodge Pulse resolves once at phase exit. Phase Wake shares the clear without duplicate bullet handling, and Rift Reprisal retains its shard path.
- Timed Double Shot adds one bounded shot to the permanent build and restores the exact permanent configuration on expiry.
- Focus Lens keeps its focused damage identity and tightens focused spread to 75 percent without changing projectile count or cadence.
- Positive after wave quips and `level_clear_flirt` are suppressed after a life loss while progression and boss or sector transitions remain intact.
- The Tractor or Hijacker participates in Chain Lightning source and target selection with bounded hit feedback and readable health presentation.
- Tactical Draft prioritizes valid Fusion completion and unseen choices ahead of Stack III while Doctrines remain descriptive only.
- Hangar click, keyboard, controller, and details launches enter `ranked_tactical` Mayhem Tactical instead of Mayhem Pure.

The patch does not change score formulas, leaderboard identities or stored scores, achievement IDs or requirements, save format, Steam Cloud paths, AppID or depot IDs, Steamworks settings, or the fixed Steam screenshot and Game Recording capture path.

## Upload evidence

- Receipt: `docs/release/nova-swarm-hangar-tactical-upload-20260718.md`
- Tyrian package handoff: `docs/release/nova-swarm-tyrian-feedback-package-handoff-20260718.md`
- SteamCMD log: `test-results/steam-upload-hangar-tactical-20260718/steamcmd.stdout.log`
- SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24274850).`
- Upload VDF: `release/steamworks/app_build_LOCAL.vdf`
- VDF description: `Nova Swarm Tyrian feedback and Hangar Tactical 4c27594`
- VDF content root: `..\\desktop\\win-unpacked`
- VDF `SetLive`: empty

The committed historical `steam_payload_manifest.json` is not used as evidence for this build. The receipt, SteamCMD log, current VDF, package version, and exact packaged source are authoritative.

## Verification

The final lock pass completed:

- `npm run check:release-line`
- `npm run check:tyrian-dodge-pulse`
- `npm run check:danger-dodge`
- `npm run check:graze-break`
- `npm run check:powerup-effects`
- `npm run check:powerup-balance`
- `npm run check:focus-lens-spread`
- `npm run check:level-clear-voices`
- `npm run check:level-clear-voice-runtime`
- `npm run check:tractor-chain-lightning`
- `npm run check:tractor-hijack`
- `npm run check:tractor-miniboss-vfx`
- `npm run check:enemy-hit-feedback`
- `npm run check:tactical-draft`
- `npm run check:tactical-doctrine`
- `npm run check:tactical-fusions`
- `npm run check:tactical-score-route`
- `npm run check:ship-selector-start`
- `npm run check:i18n`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `npm run build:current`
- `npm run smoke`
- `npm run desktop:smoke:current`
- `npm run check:steam-package-runtime`
- `git diff --check`

The first localization UI attempt logged two transient Chromium resource cancellations. A clean rerun passed all eight languages with zero console events, page errors, placeholders, or English leak hits. The first controller attempt timed out at the final leaderboard return and captured one transient page error. A clean rerun completed the entire controller flow, including that exact return, and passed. Both first attempt artifacts remain available; neither failure reproduced.

Visual evidence was manually inspected:

- Focus Lens comparison: `test-results/focus-lens-spread-2026-07-18T16-23-29-455Z/focus-lens-spread-comparison.png`
- Tractor Chain Lightning hit: `test-results/tractor-hijack-2026-07-18T16-24-28-999Z/tractor-active-chain-hit-feedback.png`
- Ordinary enemy hit feedback: `test-results/enemy-hit-feedback-2026-07-18T16-24-37-046Z/enemy-hit-feedback.png`
- Hangar Tactical launch: `test-results/ship-selector-start-2026-07-18T16-26-24-796Z/ship-selector-start.png`
- Eight language UI pass: `test-results/i18n-ui-2026-07-18T16-31-41-560Z/`
- Controller pass: `test-results/controller-only-flow-2026-07-18T16-36-24-534Z/`
- Browser smoke: `test-results/smoke-2026-07-18T16-38-57-418Z/`
- Electron smoke: `test-results/electron-smoke-2026-07-18T16-41-47-487Z/`
- Steam package runtime: `test-results/steam-package-runtime-2026-07-18T16-42-05-935Z/report.json`

## Public communication

- Steam announcement: `https://store.steampowered.com/news/app/4765070/view/711155348639057266`
- Direct Tyrian forum reply, comment 68: `https://steamcommunity.com/app/4765070/discussions/0/569288155749142195/?ctp=5#c577173563817100712`

The live forum reply is the verified unquoted version. A quote formatted replacement was supplied to the user for manual posting, but no replacement is claimed or verified by this lock.

## Preservation and rollback

Do not develop on this locked branch or either tag. Create a new worktree and branch from the stable evidence tag for future improvements.

To inspect the exact packaged source without changing the locked worktree:

```powershell
git worktree add C:\tmp\nova-swarm-build24274850-source nova-swarm-release-20260718-build24274850
```

To create a future development worktree from the complete stable handoff:

```powershell
git worktree add -b codex/new-improvement-name C:\tmp\nova-swarm-new-improvement nova-swarm-stable-20260718-build24274850
```

If the stable documentation commit must be backed out from another branch, use `git revert <stable-lock-commit>`. Never reset or delete the locked tags.

Steam rollback is not required because BuildID `24274850` remains unassigned. If it is assigned later, rollback must be performed explicitly in Steamworks by reassigning the affected branch to the intended earlier BuildID.
