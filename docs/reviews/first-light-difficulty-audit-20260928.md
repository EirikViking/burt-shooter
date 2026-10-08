# Read-only difficulty audit

Audit date: 2026-09-28. Source history only; no code, player data, Steam settings, or builds changed by this review. Current repair edits by the root agent are outside this historical comparison.

## Verified build provenance

| Build | Packaged runtime | Evidence |
| --- | --- | --- |
| 25523055, preceding private build | b5a0e23 | `E:/Codex/builds/nova-swarm/tyrian-feedback-20260925/steamworks/app_build_LOCAL.vdf` describes source b5a0e23; its `steam-build-output/app_build_4765070.log` records successful BuildID 25523055 at 2026-09-25 09:31:20. VDF targets `sector-continue-test`. |
| 25564137, feedback week | e22f0e1cb4964c78e6f325bbefd3818ed6a94f70 | `docs/handoff/nova-swarm-feedback-week-20260927.md` and retained `feedback-week/evidence/source-provenance.json`. |
| 25565501, First Light | 7a7cb70a42ee00e351264040c4e133e9b73698c2 | `docs/steam/arcade-first-light-20260927.md`; feature commit de0a667 followed by caption fix 7a7cb70. |

The feedback development baseline 60c7f76 was newer than preceding package b5a0e23. That gap contains only leaderboard status/routing and leaderboard test changes: 5632fc9 and 60c7f76. Therefore it does not conceal a gameplay difficulty change. The later commits through reviewed HEAD 96e8540 are documentation and test delivery work except the First Light feature/caption commits listed above. This verifies historical upload provenance, not current live Steam branch state.

## Proven changes that can make play easier

1. **Snake encounters are less frequent and weaker.** Commit 7fb5cec, `src/config/SpaceSnakes.js`: eligible random wave probability changes from 0.16 to 0.12, a 25% relative reduction. Section HP loses its final 1.35 multiplier, approximately 26% less HP after rounding. For sectors 51/101/143 the old/new section HP values are 96/71, 165/122, and 217/161. Existing eligibility, breathing room, and snake damage logic are unchanged. This is a direct balance change, not visual polish.

2. **Ghost gives more protection.** Commit 21e3268, `src/config/TacticalDraft.js` and `src/entities/Player.js`: sector-start invulnerability base increases from 1000 to 1500ms and its cap from 2400 to 4500ms. Levels 1/2/3 now give 1.5/3/4.5 seconds instead of 1/2/2.4 seconds. This is a direct defensive buff.

3. **Impact Foam now keeps its intended benefit after a hit.** Commit 21e3268, `Player.forceRespawn()`: adds `hitInvulnerabilityBonusMs` instead of replacing all protection with `RESPAWN_INVULNERABILITY_MS`. An owned 300ms bonus now takes effect. This is a bug fix with a real survivability benefit.

4. **Extra Shot and build progression are more effective.** Commits 4ed73aa, 4ec9812 and 21e3268, `TacticalDraft.js`, `Player.js`, `PlayScene.js`: discrete extra-shot counts become 1/2/3 instead of fractional cumulative 1/1.55/1.85 (old final rounding meant 1/2/2). No penalty is applied for an Extra Shot that adds zero bullets at the eight-shot cap. Added Draft bullets fill the original firing cone rather than widening it, improving density against centered targets. Normal Draft offers prioritize useful owned upgrades and exclude ineffective capped choices. The direct-output cap remains, so this is not proof of an unlimited DPS increase. Daily retains its legacy offer policy.

5. **Firepower preset trades speed for firepower.** Commit 21e3268, `src/game/OnslaughtLoadout.js`: replaces `speed_up` with `double_shot` in the Firepower preset. This changes the preset's offense/mobility tradeoff; saved custom loadouts and other presets are not replaced. Do not call it a universal advantage independent of hull and player movement.

6. **Challenge windows have fewer overlapping threats.** Commit 7fb5cec, `EnemyManager.js`: suppresses routine/Mayhem reinforcements and Hijacker admission during challenge flights. This removes those threats in that specific window. Challenge targets also gain authored moving paths, which changes aiming difficulty in the other direction; the whole challenge cannot be declared easier from overlap suppression alone.

7. **Departing snake babies stop causing contact damage after the mother dies.** Commit 7fb5cec, `SnakeBrood.js`, `SpaceSnakeBaby.js`, `PlayScene.js`: orphan babies become departing, are excluded from contact/objectives and cannot be farmed for further hit/kill rewards. Disposal remains after two seconds. This removes a post-fight hazard, not general enemy damage.

8. **First Light adds recurring rewards.** Commit de0a667, `src/game/ArcadeFirstLight.js` and `src/managers/ArcadeFirstLightDirector.js`: convoy events recur in sectors ending in 1; rescued escorts assist for 10 seconds, with fire allowed from age 0.9 to 9.3 seconds. On a player volley and at most once per 0.32 seconds, left escort fires two shots of `max(0.6, playerDamage * 0.4)` and right fires one of `max(0.6, playerDamage * 0.8)`. At playerDamage=1, both escorts together can add up to 2 damage per eligible firing cycle, before misses and actual volley cadence. This is genuine additional friendly damage in ordinary wave windows. Events are canceled at major transitions and the escorts do not help against bosses or other admitted major encounters.

9. **First Light rival victories grant a shield.** Commit de0a667, `ArcadeFirstLightDirector.presentHit()`: one shield pickup per won rival, recurring in suitable sectors ending in 2. The one-reward guard is per encounter, not per run. This is a repeatable survival reward. It is a shield, so the post-sector100 extra-life rule does not block it. The rival simultaneously adds hostile fire, described below; its net difficulty is not proven by source alone.

## Changes that increase pressure or remove excess power

* Commit 7fb5cec, `Boss.js`: at sector 51 and above, armor-bleed finish time no longer silences shooting, adds recovery pauses, or pushes attack cooldowns back. Damage scaling/health are unchanged. This is more boss pressure during the finish interval.
* Commit 7fb5cec, `BossRoster.js` / `Boss.js`: later regular attacks alternate archetype-appropriate patterns after phase 2, and Onslaught draws from the full seeded boss bag. Pattern composition changes, but no universal easier/harder ranking is established.
* Commit 4ec9812, `Player.reconcileSupportPowerups()`: removes the accidental minimum of three chain jumps when only one or two permanent jumps are owned. Also removes an expired timed extra drone that could linger beside a permanent drone. These reduce unintended player power.
* Commit 7fb5cec, `src/game/LifeGrantPolicy.js`, `Game.js`, `Player.js`, `PowerupManager.js`: closes life/repair grant bypasses after sector 100. A pickup spawned before the cutoff is still honored; explicit Tactical Draft repairs and debug grants are exempt. This reduces late-run life income.
* Commit de0a667, `ArcadeFirstLightDirector.fireRival()`: adds rival hostile shots. The left mount fires a 3-shot fan (5 in a later variant); the right fires 1 (2 later). These have a 0.7-second locked-aim charge, one damage, and speed `2.8 + min(3.4, max(0, sector - 2) * 0.035)`. Destroyed mounts stop their attacks. This is new pressure paid for by a shield reward.

## Readability and fairness changes without demonstrated numerical nerfs

* Colossus flame rendering: middle texture crop, warm tint, reduced glare, and visible reduced-flash guide floors changed visual presentation. `src/config/ColossusAssault.js`, including travel windows and collision geometry, is unchanged in b5a0e23..e22f0e1.
* Friendly projectile/Pierce/Rift Shard changes alter materials, glow, opacity and visible size. They do not change projectile damage/collision in the reviewed diff.
* Locked boss warning position and paired movement prevent the emitter from moving away from its warning. These improve avoidance reliability. They are not a lower projectile damage value or a longer warning duration.
* Snake health trails expose existing health more clearly. They are separate from the real HP reduction listed above.
* Mystery arrival gap changes from 3–6 to 3–5 eligible sectors. This can add both encounters and rewards; no net easing claim is justified without encounter evidence.

## Scope and conclusion

The reviewed history contains real easing changes, particularly snake HP/frequency, Ghost, functional Draft progression, and the newer support/shield rewards. It also contains deliberate additional boss pressure and fixes that remove accidental power. It is inaccurate to describe every change as cosmetic or to claim a universal global nerf.

No global regular-enemy HP, base enemy projectile damage, boss HP curve, generic formation motion, or core player base damage reduction was found. The historical diff leaves `BalanceConfig.js`, `ColossusAssault.js`, and `ArcadeFlight.js` unchanged. The ordinary `Enemy.js` gameplay diff is limited to challenge flight motion. This is a source audit, not a win-rate, time-to-kill, or player survival study; no net difficulty percentage can be responsibly assigned.

If tuning is desired, isolate the explicit numeric buffs/reward budget rather than undoing warning accuracy, support expiry, life policy, or achievement/leaderboard fixes. This review itself makes no tuning changes.

## Verification performed

Read retained VDF/upload logs, retained provenance documents, `git log`, and exact historical `git diff`/`git show` across b5a0e23 → e22f0e1 → 7a7cb70 → 96e8540. No live Steam calls, native app launch, user saves, gameplay run, source edit, or build performed by this audit.
