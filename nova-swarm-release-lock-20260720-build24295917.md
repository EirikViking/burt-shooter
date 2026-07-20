# Nova Swarm Stable Release Lock: Build 24295917

Created: 2026-07-20

## Locked build identity

- Steam BuildID: `24295917`
- Depot manifest: `932713604018215419`
- Package version: `v2026-07-20_14-43-17`
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Leaderboard identity: `nova_swarm_global_score_v2`
- Exact packaged source commit: `3686bf634813bcbfcf29634c094bc81eaaed8191`
- Pre-upload package evidence commit: `8b13f592fdd6c931c2dab8fd98314114ed602619`
- Upload documentation commit before this lock: `02fde138e4dd43837ed6aca2ede9618813b637be`
- Source branch at upload: `codex/cabinet-wonders-spectacle-20260720`
- Stable GitHub branch: `codex/stable-build24295917-20260720`
- Immutable source tag: `nova-swarm-release-20260720-build24295917`
- Immutable stable evidence tag: `nova-swarm-stable-20260720-build24295917`
- Steam branch assignment: none
- VDF `SetLive`: `""`

The source tag identifies the exact game source packaged and uploaded to SteamPipe. The stable evidence tag identifies the branch tip containing the upload evidence, this lock, the GitHub handoff, and the new-chat continuation prompt.

This stable lock does not upload another build, move a Steam branch, call `SetLive`, change Steamworks settings, alter production data, or publish the prepared Steam patch notes.

## Ancestry and preservation proof

All of these commits are ancestors of the locked branch:

- Approved checkpoint: `426e94490e15201fe2fb899bd707b84e56990b6f`
- Public frame-pacing and Steam capture fix: `9f8c220`
- Previous stable evidence: `ae1d2e82accf20859da172f636907a11c965cf3d`
- Exact packaged source: `3686bf634813bcbfcf29634c094bc81eaaed8191`
- Upload documentation: `02fde138e4dd43837ed6aca2ede9618813b637be`

The previous stable branch, source tag, evidence tag, and worktree remain untouched.

## Included improvements since Build 24274850

BuildID `24295917` contains the complete previous stable release plus the following player-facing corrections and improvements:

- `No Repair Receipts` now requires a ranked Sector 10 clear and 250,000 points without a prior life loss. Losses after valid qualification in Overrun do not erase it.
- `Full Hangar Omega` now correctly requires and describes all 30 playable ships instead of 25.
- Bombs travel upward, acquire aligned Tractor or Hijacker targets, guide toward the committed target, and detonate at its live or last-known position.
- The global Voice switch and Voice Volume bus now silence level-clear speech, tactical boss banter, and boss-death vocals, including already active or delayed speech.
- Magnet attracts pickups and collectible bonus cores without pulling the hazardous orange bonus drone into the player.
- Distinct Ace and Nemesis rewards drop separately so every icon, pickup message, and applied effect has one identity.
- Focus Lens reduces focused spread by 40 percent while retaining its existing damage bonus, projectile count, and firing cadence.
- Hostile projectiles render above friendly fire. Holding Focus dims ordinary friendly projectiles while leaving hostile fire, warnings, dangerous beams, and Bombs fully visible.
- Cabinet Wonders expand from three to ten with Singularity Bloom, Celestial Koi Procession, Prismatic Supernova, Warp Cathedral, Quantum Eclipse, Nebula Jellyfish, and Phoenix Comet.
- All ten Wonders receive richer procedural presentation and correct gameplay-space centering and scaling. Their rarity, one-per-run limit, deterministic planning, score neutrality, gameplay neutrality, challenge exclusions, Reduced Motion support, and background/HUD layering remain intact.

Mayhem Pure remains the consistent no-draft ruleset. The current build preserves score formulas, leaderboard identities and stored scores, save format, Steam Cloud paths, AppID and depot IDs, Steam screenshot and Game Recording integration, and the current Steamworks configuration.

## Exact package and upload evidence

- Package folder: `E:\Codex\nova-swarm-steam-package-cabinet-wonders-20260720\desktop\win-unpacked`
- Package files: `417`
- Package bytes: `958436871`
- Payload manifest SHA-256: `2c392c22dff9a43ce6a18d6344b4051945384c405c798da58cc27f49f843ccd5`
- Executable SHA-256: `9b23b32d8657acd2dbab88ca4eb11af966040d32aba94f74614b6ef771cac2be`
- Upload VDF: `E:\Codex\nova-swarm-steam-package-cabinet-wonders-20260720\steamworks\app_build_LOCAL.vdf`
- Upload log: `test-results/steam-upload-cabinet-wonders-20260720/steamcmd.stdout.log`
- Upload receipt: `docs/release/nova-swarm-cabinet-wonders-upload-20260720.md`
- SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24295917).`

The exact package folder is the binary rollback and inspection copy. A Git bundle of the final stable branch and tags is stored outside the repository at:

`E:\Codex\nova-swarm-stable-build24295917-20260720.bundle`

Its adjacent `.sha256` file records the verified bundle hash.

## Verification

The exact package was already verified before upload with:

- ten-variant live Cabinet Wonder checks at 1280x720 and 1920x1080
- release-line, localization UI, browser smoke, controller flow, current Electron smoke, Steam SDK, and package-runtime checks
- packaged executable launch, keyboard/gamepad controls, fresh-profile isolation, desktop package review, and performance checks
- packaged performance of 58.82 minimum and 59.81 average FPS across 11 samples with no warnings or errors
- manual inspection of the ten-Wonder contact sheet and exact packaged menu

The stable-lock pass reran:

- `npm run check:release-line`
- `npm run check:cabinet-wonders`
- `npm run check:steam-package-runtime`
- `git diff --check`

## Steam and community state

- BuildID `24295917` is uploaded privately and remains unassigned.
- `SetLive` is empty.
- No Steam branch was moved by the upload or this lock.
- The saved Steam patch note titled `Nova Swarm Patch Notes: Cabinet Wonders & Combat Clarity` is `Hidden, Unpublished` and complete in the Steam editor. This lock does not publish it.
- The previous public announcement remains `https://store.steampowered.com/news/app/4765070/view/711155348639057266`.

## Preservation and rollback

Do not develop on this stable branch or either new tag. Create a new branch and isolated worktree from the stable evidence tag.

To inspect the exact packaged source:

```powershell
git worktree add C:\tmp\nova-swarm-build24295917-source nova-swarm-release-20260720-build24295917
```

To begin future development:

```powershell
git worktree add -b codex/new-improvement-name C:\tmp\nova-swarm-new-improvement nova-swarm-stable-20260720-build24295917
```

If the stable documentation commit must be backed out on another branch, use `git revert <stable-lock-commit>`. Never reset or delete the stable branch or immutable tags.

No Steam rollback is required while BuildID `24295917` is unassigned. If it is assigned later, rollback requires an explicit Steamworks branch reassignment to the intended prior BuildID.
