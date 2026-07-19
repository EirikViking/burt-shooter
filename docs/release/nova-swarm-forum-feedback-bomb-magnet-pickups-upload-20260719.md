# Nova Swarm Bomb, Magnet, and pickup identity Steam upload

Date: 2026-07-19

Source folder: `C:\tmp\nova-swarm-forum-feedback-bomb-magnet-pickups-20260719`

Branch: `codex/forum-feedback-bomb-magnet-pickups-20260719`

Locked stable baseline: `ae1d2e82accf20859da172f636907a11c965cf3d`

Development baseline: `07c2ec003b4210e980cba07fbd3351f5a8030409`

Packaged source commit: `fc201142ae0f681442362259864ae6faee66400d`

Pre-upload evidence commit: `95475290a0d3da67547ecc8ade89645048dd6c8f`

Package version: `v2026-07-19_21-10-19`

Package folder: `E:\Codex\nova-swarm-steam-package-forum-feedback-20260719-v2\desktop\win-unpacked`

Payload files: `417`

Payload bytes: `958424507`

Payload manifest hash: `d7be323b157af4aba6e9f444366c4c368faf53a039adeb3cf70dc06fcee16940`

Packaged executable SHA-256: `178a490f0ba1d12f9d5e8ff76d994975ff95023f404eacf8db17db0b4d6fe64f`

Steam AppID: `4765070`

Windows depot: `4765071`

Steam BuildID: `24286247`

Depot manifest: `4863626020856952901`

Steam branch assignment: none

VDF `SetLive`: `""`

Upload description: `Nova Swarm Bomb Magnet pickup fixes v2026-07-19_21-10-19`

SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24286247).`

Upload log: `test-results/steam-upload-forum-feedback-20260719/steamcmd.stdout.log`

## Corrections

- Bomb targeting now includes an aligned Tractor/Hijacker, guides the projectile toward its committed moving target, and detonates at the target's live or last-known position. The old fixed upper-screen fuse remains only as the no-target fallback.
- Hostile bullets still pass through Bombs. Three charges, speed, damage, blast radius, scoring, and the deliberate release-and-tap firing contract are unchanged.
- Magnet now attracts collectible pickups and collectible bonus cores, but never the contact-damage bonus drone.
- When Ace and Nemesis rewards select two different powerups, they now drop as two separated physical pickups. Each visible icon, pickup message, and applied effect therefore has one identity.
- The ordinary runtime pickup catalog remains a one-to-one type-to-icon mapping. Intentionally composite named powerups still apply their documented combined effects.

No player-facing text or localization changed. Score formulas, leaderboard identity and stored scores, achievement IDs and unlock requirements, save format, Steam Cloud paths, AppID and depot IDs, Steam screenshot/Game Recording capture, and Steamworks settings remain unchanged.

## Surgical verification

- `npm run check:bomb-usability` passed guided Bomb flight, aligned Tractor/Hijacker lock, target-position detonation, fallback fuse, scoring, and hostile-bullet pass-through.
- `npm run check:magnet-field-readability` passed with zero movement for the hazardous bonus drone while the collectible bonus core remained attracted.
- `npm run check:powerup-effects` passed all 44 powerup types.
- `npm run check:ace-bounty-runtime` passed distinct reward icons, types, pickup messages, and effects.
- `npm run build:current` and `npm run check:release-line` passed. The release-line check passed again immediately before packaging and again immediately before the upload evidence commit.
- Steam native-runtime staging and `npm run check:steam-package-runtime` passed for AppID `4765070` and leaderboard `nova_swarm_global_score_v2`.
- The exact packaged executable passed Steam-backed launch smoke; its menu screenshot was inspected and showed build `v2026-07-19_21-10-19`.
- The packaged performance probe passed at `59.17` minimum FPS against the `50` FPS floor with no errors.

The upload used blank `SetLive`, so BuildID `24286247` is private and unassigned. It did not move a Steam branch, publish the build, alter Steamworks settings, or modify production data.

## Prepared forum reply

Thanks — this follow-up exposed three real problems, and your observations were accurate.

The earlier Bomb direction fix made it travel upward, but its lock still excluded the Tractor ship, a fixed upper-screen fuse could make it burst beside a player already high on the screen, and the selected lock did not actually steer it. Bomb now locks an aligned Tractor/Hijacker, guides toward the committed target, and detonates at its live or last-known position. Enemy bullets do not collide with the Bomb. You still bank three charges: release fire, line up a boss, Tractor, tough enemy, or cluster above you, then tap fire.

Magnet was also incorrectly attracting the hostile orange bonus drone. It now attracts only actual pickups and collectible bonus cores.

The apparent icon mismatch was real in the Ace plus Nemesis reward path: two different rewards could be hidden behind one icon and one message while both effects were applied. Those rewards now drop separately, so each visible icon grants exactly that effect. I also audited the ordinary pickup catalog; its type-to-icon mapping is one-to-one. A few specially named composite powerups intentionally combine effects, but they keep their own icon and identity.

The corrected build is uploaded as Steam BuildID `24286247`. It is private and unassigned for verification, so it is not publicly live yet.

Tiny Foundry
