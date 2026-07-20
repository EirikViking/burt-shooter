# Nova Swarm Tyrian Focus and combat clarity Steam upload

Date: 2026-07-20

Source folder: `C:\tmp\nova-swarm-tyrian-focus-clarity-20260720`

Branch: `codex/tyrian-focus-clarity-20260720`

Locked stable baseline: `ae1d2e82accf20859da172f636907a11c965cf3d`

Development baseline: `2b20050fc294daaa12b916a4fff78e981844a409`

Packaged source commit: `dc2b4e7ab6d9c8ffeb012bf58c6c4504212624e9`

Pre-upload evidence commit: `40aed009f2eddd2ca32d2b3fc00079ea721907f6`

Package version: `v2026-07-20_13-31-07`

Package folder: `E:\Codex\nova-swarm-steam-package-focus-clarity-20260720\desktop\win-unpacked`

Payload files: `417`

Payload bytes: `958426778`

Payload manifest hash: `5b0d574d3f415f74521e6306ffedffa262e292677339042f5389324436f16d7f`

Packaged executable SHA-256: `2B29F7CDF036E510F68D00508BDE72309511F36CD60269D3DBCCBA4A1171F49C`

Steam AppID: `4765070`

Windows depot: `4765071`

Steam BuildID: `24294849`

Depot manifest: `2637014136763097821`

Steam branch assignment: none

VDF `SetLive`: `""`

Upload description: `Nova Swarm Focus clarity update v2026-07-20_13-31-07`

SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24294849).`

Upload log: `test-results/steam-upload-focus-clarity-20260720/steamcmd.stdout.log`

## Changes

- Focus Lens now tightens focused shots to 60% of their normal spread, a 40% reduction instead of 25%. Its +18% damage, projectile count, and fire rate are unchanged.
- Hostile projectiles now render above the bright friendly projectile stream.
- Holding Focus dims ordinary friendly projectiles to 42% alpha. Bombs, hostile projectiles, warning cues, and dangerous beams remain fully visible.
- Mayhem Pure retains its no-draft rules. Tactical augments were not folded into Pure, preserving the distinction between the modes and historical leaderboard comparability.
- The earlier Bomb follow-up now guides toward aligned Tractor/Hijacker targets and detonates at their live or last-known position.
- Magnet no longer attracts contact-damage bonus drones.
- Distinct Ace and Nemesis rewards now drop as separate one-icon, one-message, one-effect pickups.

Score formulas, leaderboard identities, stored scores, achievement IDs and unlock requirements, save format, Steam Cloud paths, AppID and depot IDs, Steam screenshot/Game Recording capture, and Steamworks settings were not changed by this build.

The user separately confirmed that Tyrian's manually identified 700k Mayhem Pure score was deleted before this upload. The build and upload did not perform that production-data change.

## Verification

- `npm run check:focus-lens-spread` passed across representative narrow, standard, and wide ships.
- `npm run check:player-projectile-readability` and `npm run check:boss-hazard-arming-readability` passed.
- `npm run check:i18n`, `npm run check:i18n-ui`, `npm run build:current`, and the release `npm run build` passed.
- `npm run check:release-line` passed before packaging, before the pre-upload evidence commit, and immediately before SteamCMD.
- Steam SDK readiness, native-runtime staging, and exact-package Steam runtime checks passed.
- The exact package passed Steam-backed launch smoke with AppID `4765070`, `nova_swarm_global_score_v2`, build `v2026-07-20_13-31-07`, and source `dc2b4e7`.
- The exact-package performance check passed at `58.14` minimum and `59.92` average FPS across 12 samples with no warnings or errors.

BuildID `24294849` is private and unassigned because `SetLive` remained empty. The upload did not move a Steam branch, publish the build, alter Steamworks settings, or modify production data.

## Forum reply targets

- Tyrian comment #73: `https://steamcommunity.com/app/4765070/discussions/0/569288155749142195/?ctp=5#c577173563817210121`
- Tyrian comment #74: `https://steamcommunity.com/app/4765070/discussions/0/569288155749142195/?ctp=5#c577173563817218232`
- Tyrian comment #75: `https://steamcommunity.com/app/4765070/discussions/0/569288155749142195/?ctp=5#c577173563817257508`

## Prepared forum reply

Thanks for all of this, and especially for taking the time to verify what you were seeing.

You were right about the Bomb follow-up. It could miss the Tractor/Hijacker even when you were lined up correctly, and the selected target was not actually guiding the shot. It now locks an aligned Tractor, follows the committed target, and detonates at its live or last-known position. Enemy bullets pass through the Bomb, so they were not causing the little burst beside the ship.

Magnet was also pulling the dangerous bonus drone when it should only have attracted things you can safely collect. That is fixed. The confusing pickup cases were real too: two different Ace/Nemesis rewards could be represented by one icon and message while both effects were applied. Those rewards now drop separately, so the icon, message, and effect match.

I agreed that Focus Lens was too subtle. Its spread reduction has gone from 25% to 40%, while keeping the same damage bonus and fire rate. I have not folded Tactical upgrades into Pure, though. I would like to keep Pure as the consistent no-draft ruleset and keep its scores comparable, while continuing to watch how the later sectors scale.

The visibility point was a good catch as well. Hostile projectiles were actually being drawn underneath the player's bright shots. They now render above friendly fire, and holding Focus dims ordinary player shots so incoming danger is easier to read. I left dangerous beams and warnings fully visible rather than dimming something that can hurt the player.

And thank you for being so straightforward about the 700k Pure score. It says a lot that you called out your own run rather than leaving an unfair target for everyone else. Your request has been granted, and the score has now been deleted from the Pure leaderboard.

The update covering these changes will go live later today. Thanks again for the careful feedback.

— Tiny Foundry
