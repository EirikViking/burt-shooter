# Nova Swarm Difficulty QA Review

Date: 2026-05-22

Scope: full first-pass difficulty QA and conservative balance patch. This review keeps ranked/default arcade play deterministic and does not change Steam leaderboard logic, ship unlocks, scoring, art, or menu systems.

## 1. Current difficulty architecture

| System | Location | Notes |
| --- | --- | --- |
| Global balance constants | `src/config/BalanceConfig.js` | Owns enemy HP/speed/fire scaling, wave counts, boss HP/cadence/projectile speed, boss fairness telegraphs/safe lanes, powerup rates, rewards, and survival repair toggles. |
| Generated normal enemy stats | `src/config/GeneratedEnemyProfiles.js` | 120 generated profiles paced through level 40. Each profile defines unlock level, role, HP, speed, fire cadence, movement style, fire style, projectile count/spread, projectile speed multiplier, radius, score value, and dive bias. |
| Enemy runtime scaling | `src/entities/Enemy.js` | Applies `BalanceConfig.difficulty` HP, speed, and fire-delay scalars. Runtime speed is profile speed multiplied by difficulty speed scalar and global `DIFFICULTY_MULTIPLIER`. Normal projectile speed uses base enemy projectile speed, level scaling, `pressureScalar`, early opening scalar, profile projectile multiplier, and weapon profile multiplier. |
| Wave and spawn pacing | `src/managers/EnemyManager.js` | Creates curated early waves for levels 1-4, dynamic waves later, boss spacing gates, enemy fire chance, wave cleanup, challenge wave chance, boss spawn, and boss adds. |
| Boss roster | `src/config/BossRoster.js` | 50 bosses mapped across 10 archetypes. Archetype defines movement, regular attack, signature attack, palette, and accent. |
| Boss runtime stats and attacks | `src/entities/Boss.js` | Applies boss HP formula, phase thresholds, shoot delays, projectile speeds, regular attack telegraphs, signature telegraphs, safe lanes, boss bullet patterns, and boss hazard registration. |
| Player ship power | `src/config/ShipData.js`, `src/entities/Player.js` | Ship data owns speed, fire rate, damage, bullet speed, bullet count, spread, and hitbox. Player owns shooting, dodge, shield/powerup state, damage, respawn, and invulnerability. |
| Powerups | `src/managers/PowerupManager.js`, `src/entities/Player.js` | Drop chance, cooldown, max drops per level, first-run rapid-fire help, shield/ghost/slow-time/damage/rapid/pierce/etc. Extra lives are enabled as rare drops. |
| Scoring and leaderboard | `src/game/Game.js`, `src/scenes/GameOverScene.js`, `src/leaderboard/*` | Default runs are ranked. Debug routes can call `markUnrankedRun()`. This patch does not change score math or leaderboard providers. |
| Difficulty modes | `src/game/Game.js` | No player-facing easy/normal/hard modes. Runtime has `runMode: ranked/unranked` for debug or instrumentation paths. |

## 2. Difficulty curve map

| Segment | Current behavior | QA read |
| --- | --- | --- |
| Early run, level 1 waves | Six curated waves, 6-9 enemies each, boss gate after at least 6 normal waves and 75 seconds. Opening fire scalar starts low: 0.32, 0.45, 0.58, 0.68, then 0.74. | Very readable, but normal enemy pressure is low because enemy HP is low and speed/fire are heavily damped. This can make the first boss feel like the first real dodging test. |
| Mid run, levels 2-4 | Six curated waves per level, counts rise to 7-11, higher enemy IDs introduce stutter, fan, offset, triad, needle, wall-like pressure. | Better pattern variety, but still mostly forgiving because `baseEnemyHealthMultiplier` and global pressure trim keep enemies quick to kill. |
| Pre-boss | Boss spacing enforces 6 waves and 75 seconds. Extra spacing waves can be inserted if the timer is short. Enemy bullets are cleared between waves and before boss. | Good readability. Risk is pacing drag if normal waves are not threatening enough; boss remains the first intense moment. |
| Boss | Every level is boss-capable. Boss HP is `44 + 4 * (level - 1)`, min 44 after this patch. Phases at below 75% and 40%. Telegraphs are explicit, safe lanes exist, and bullets/hazards consume one shield/life. | Boss identity and readability are strong, but phase cadence, projectile speed, and attack/hazard overlap were costing too many lives in no-debug playtests. |
| Post-boss/later scaling | Level clears award 1000 score. Boss clears now restore 1 life up to a 6-life cap; normal wave and level-clear repair remain off. Later dynamic waves scale HP/speed/fire chance and can add modifiers from level 5 onward. | Deterministic and leaderboard-safe. Boss victory now relieves life attrition without adding random luck or changing normal waves. |

## 3. Normal enemy QA

Starter ship baseline: Nova Sparrow has 2 bullets, 1.05 damage per bullet, 122 ms fire rate, 11.2 bullet speed, 5.75 move speed, radius 12. Theoretical perfect-hit DPS is about 17.21. Early generated enemies usually die in 1 volley; heavier early enemies die in 2 volleys, about 0.12 seconds minimum after the first volley.

### Enemy class review

All normal bullets cost one shield/life when they hit. Profile HP below is before level scaling. Level 1 HP scaling is 0.62, so HP remains very low after `ceil()`.

| Fire class | Profiles | HP | Base speed | Base cadence | Projectiles | Projectile mult | Threat role and skill taught | QA verdict |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| single | 5 | 1-4 | 0.62-1.17 | 120-142 | 1 | 0.86-1.09 | Basic aimed/lane pressure, teaches movement while firing. | Good tutorial class, too low-threat if alone. |
| double | 5 | 1-4 | 0.69-1.19 | 108-140 | 2 | 0.90-1.13 | Narrow lane denial, teaches small sidesteps. | Useful before split/fan bosses. |
| wide | 5 | 1-4 | 0.71-1.26 | 114-148 | 1 wide shot style | 0.90-1.05 | Introduces wider space control. | Needs movement speed to matter. |
| needle | 5 | 1-4 | 0.78-1.08 | 120-134 | 1 | 1.12-1.26 | Faster shot readability, teaches early dodge timing. | Good boss preparation for lance/sniper, currently sparse. |
| fan | 5 | 1-4 | 0.80-1.10 | 108-142 | 3 | 0.86-1.09 | Multi-lane fan reading. | Important pre-boss class, should appear before cone bosses. |
| slowHeavy | 5 | 3-6 | 0.62-1.17 | 148-182 | 1 | 0.90-1.13 | Slow, weighty shot and target priority. | HP is already higher; do not buff HP first. |
| quickChip | 5 | 2-5 | 0.77-1.27 | 90-112 | 1 | 0.90-1.02 | Faster cadence, teaches not parking in lanes. | Strong candidate for pressure without sponge behavior. |
| offsetPair | 5 | 2-5 | 0.71-1.26 | 108-142 | 2 | 0.94-1.06 | Offset dodging and lane threading. | Good boss prep for split/mirror. |
| triad | 5 | 2-3 | 0.78-1.08 | 108-148 | 3 | 0.86-1.05 | Three-lane spacing practice. | Good pre-boss pattern literacy. |
| stutter | 5 | 2-4 | 0.88-1.18 | 90-112 | 1 | 0.90-1.09 | Cadence variation and rhythm disruption. | Useful for arcade rhythm; should not become HP-heavy. |

### Early curated wave examples

| Wave | Enemy | Count | Fire/move | Scaled HP | Post-patch scaled speed | Post-patch shoot delay | Starter TTK lower bound |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: |
| L1W1 | `nova_enemy_01` | 6 | single / sine | 1 | 0.35 | 174 | 0.00s |
| L1W2 | `nova_enemy_04` | 7 | needle / drunk | 2 | 0.47 | 174 | 0.00s |
| L1W3 | `nova_enemy_07` | 8 | quickChip / pincer | 2 | 0.43 | 143 | 0.00s |
| L1W4 | `nova_enemy_10` | 8 | stutter / weave | 3 | 0.55 | 143 | 0.12s |
| L1W5 | `nova_enemy_12` | 8 | needle / circle | 1 | 0.44 | 177 | 0.00s |
| L1W6 | `nova_enemy_14` | 9 | slowHeavy / aggressive | 2 | 0.52 | 211 | 0.00s |

Normal enemy finding: the content mix is good, but threat can feel muted because HP is low and fire probability/delay are conservative. A small early speed/fire buff was tested during this pass, but the no-debug release playtest began dying in normal level 2 waves. The corrected target is boss-focused, so the final patch leaves normal enemy baseline and per-level scaling unchanged.

## 4. Boss QA

Boss HP after this patch is level 1 at 44, level 2 at 48, level 3 at 52, etc. Boss damage is one shield/life per hit through player damage handling. Boss phase thresholds are unchanged: phase 2 below 75% HP, phase 3 below 40% HP.

| Archetype | Regular attack | Signature | Key pressure | Readability | Overlap risk | QA verdict |
| --- | --- | --- | --- | --- | --- | --- |
| conductor | fan | cone | Aimed spread and cone windup. | Good top toast and lane telegraph. | Medium if fan follows movement lock. | Fair identity; phase 2/3 cadence was the risk. |
| forge | burst | ring | Burst plus ring safe wedge. | Ring telegraph and bottom wedge exist. | Medium-high if ring and regular burst cluster. | Safe wedge should be a little more generous after early levels. |
| mirror | split | mirror | Split lanes plus ring burst. | Mirror windup is labeled. | High if mirror cone plus ring constrains bottom lanes. | Needs recovery/cadence relief more than HP nerf. |
| needle | sniper | lance | Fast aimed line. | Lance labels and narrow lanes. | Medium; damage is attributable if warning is visible. | Projectile speed spike was the main fairness risk. |
| vortex | spiral | ring | Radial reading and rotating gaps. | Safe wedge exists. | Medium-high in phase 3 if speed rises. | Slight slower phase 3 speed helps mastery. |
| jester | fakeout | cone | Pattern misdirection. | Good labels, but surprise can feel cheap. | Medium. | Preserve identity; avoid high burst cadence. |
| carrier | summon | adds | Adds plus ring. | Adds windup label. | High if adds survive into regular attack. | Boss adds are already capped; cadence relief helps. |
| monolith | wall | ring | Column safe lane and wall pressure. | Safe column is drawn. | Medium; wall plus ring can crowd screen. | Safe lane clarity is good; do not add HP. |
| choir | chord | cone | Radial/chord density. | Radial tell exists. | Medium-high at phase 3. | Later telegraph should not shrink too hard. |
| clock | clock | lance | Timed radial/line attacks. | Clock/ring safe wedge exists. | Medium. | Needs readable tempo, not extra damage. |

Boss finding: the config-level theoretical Nova Sparrow lower bound on level 1 boss HP is short, but the release playtest showed the first boss taking much longer in real play and costing too many lives due to movement, misses, phases, entry invulnerability, dodging, and overlapping boss bullets/hazards. The first pass treats boss HP, cadence, projectile speed, telegraph timing, safe wedges, and hazard hitboxes as the supported boss-specific fix.

### Boss mercy recovery

Boss-caused damage now has a central mercy window in `BalanceConfig.bossMercy`. It starts at 7000 ms, scales down to 5000 ms by level 10, and never drops below 2500 ms. Boss body contact, boss-owned bullets, and boss hazards route through the same gate so a boss can stay dangerous without chaining repeated life loss while the player is still recovering. Boss contact also nudges the player out of overlap to preserve movement agency; this is fairness protection, not an easy-mode damage nerf.

`npm run check:boss-mercy` verifies that level 6 boss-caused contact attempts over 10 seconds cannot remove all 4 lives, that the cooldown scales down with progression, that shields and existing invulnerability still prevent life loss, and that boss contact becomes dangerous again after the cooldown expires.

## 5. Player power QA

| System | Current behavior | QA read |
| --- | --- | --- |
| Starter survivability | 3 lives, radius 12, speed 5.75, dodge available. | Understandable and responsive. Main risk is not survivability but whether early waves teach boss dodging. |
| Starter damage | 2 bullets, 1.05 damage, 122 ms cadence, 11.2 bullet speed. | Normal enemies die quickly, which feels satisfying but can reduce target-priority pressure. |
| Powerup pacing | 2% base drop chance, +0.002 per second since last drop, max 12%, 18s cooldown, max 2 drops per level. Extra-life drops are enabled at 8% of selected powerup drops, with a 6-level long-gap guarantee. Life pickups cap at 6 lives. | Sparse but intentional. Extra lives are rare enough to stay valuable, while long runs are not fully dependent on boss-clear repair. |
| First-run support | `maybeDropFirstRunPickup()` drops rapid fire after 3 kills in level 1 wave 1. | Good onboarding. |
| Shields/health recovery | Shield drops are possible; rare extra-life drops are enabled; level-clear repair is guarded at 0 by `check:powerup-balance`; last-stand repair disabled. Boss clears now restore 1 life up to 5, and boss clutch shield can spawn on final life in boss levels up to level 6. | Fair and deterministic enough for leaderboards. Boss-clear repair is a visible milestone reward; boss clutch shield is visible support, not hidden difficulty scaling. |
| Respawn/invulnerability | `RESPAWN_INVULNERABILITY_MS` is exactly 1000 ms. `forceRespawn()` and life-loss respawn use that value. Initial spawn and non-respawn damage invulnerability remain 2000 ms. | Respawn protection is aligned with the prior 1s target. Damage invulnerability is separate and unchanged. |

## 6. Metrics and instrumentation assessment

Existing useful signals:

- `render_game_to_text()` in `src/main.js` exposes current scene, player, boss, hazards, leaderboard runtime, score/lives/level, and other runtime state for automation.
- `EnemyManager` logs `[Difficulty]`, `[DifficultyWave]`, `[BossSpacing]`, `[BossFlow]`, `[BossStatus]`, and boss defeat/spawn proof.
- `Boss` logs `[BossDamage]` with level, HP before/after, damage, and invulnerability state.
- `PlayScene` logs `[BossHP]` on player death during boss encounters.
- Debug boss routes are already unranked through `Game.markUnrankedRun()`.

Added in this patch:

- `PlayScene` now has a disabled-by-default balance debug collector.
- Enable with `?balanceDebug=1`, `?balance_debug=1`, or `localStorage.setItem('nova.balanceDebug', '1')`.
- It logs to console only. It does not upload data.
- It marks the run unranked when enabled, protecting leaderboard integrity.
- It records run duration, level reached, selected ship, run mode, kills by enemy type, damage sources, death source, time to first boss, boss encounter duration, boss HP samples, player lives/shield at boss start, pickups, respawns/deaths, and score.

## 7. Balance risks

1. Normal enemies die so fast that some players may not learn dodge rhythm before boss pressure.
2. Low normal movement speed makes target priority less urgent.
3. Normal fire probability and cooldown are conservative, making early waves feel quiet.
4. Boss phase 2/3 cadence can stack with signature attacks and hazards, creating spiky damage.
5. Ring/radial attacks can feel unavoidable if the safe wedge is too narrow after early levels.
6. Later regular boss telegraphs were shorter than early/mid telegraphs, increasing late-run surprise deaths.
7. Carrier/add bosses can generate overlap risk when adds survive into regular attacks.
8. Player can reach boss with limited powerup support because drops are sparse by design.
9. Debug or assist features must remain explicitly unranked to preserve leaderboard trust.
10. Broad HP changes would risk either sponge enemies or trivial bosses, so HP should not be the first lever.

## 8. First-pass recommendation table

| System | Current value before patch | Recommended value | Reason | Risk | Implemented |
| --- | --- | --- | --- | --- | --- |
| Normal enemy speed scalar | `enemySpeedMultiplier: 0.72` | Follow-up only: test `0.74` with telemetry | Slightly more movement pressure without HP inflation. | No-debug release playtest died in normal waves when this was changed. | No |
| Normal enemy fire delay scalar | `enemyFireDelayMultiplier: 1.32` | Follow-up only: test `1.30` with telemetry | Lets shooters contribute rhythm and dodge practice sooner. | Too much firing can crowd early waves. | No |
| Normal enemy fire chance | `enemyFireChance: 0.0036` | Follow-up only: test `0.0038` with telemetry | Raises normal-wave bullet presence before bosses. | Randomness can make exact wave feel vary. | No |
| Normal enemy fire chance cap | `enemyFireChanceMax: 0.0072` | Follow-up only: test `0.0074` with telemetry | Keeps later normal waves from flattening into low threat. | Needs long-run playtest to confirm no level 5+ bullet clutter. | No |
| Normal enemy HP | Level-scaled from `baseEnemyHealthMultiplier: 0.62` | No change | Avoid bullet-sponge normal enemies. | Normal pressure relies on movement/fire instead. | Yes, no change |
| Normal enemy HP per-level scaling | `hpScalePerLevel: 0.035` | No change | Manual playtest says normal waves are not the blocker. | Later waves still need long-run review after boss survival improves. | Yes, no change |
| Normal enemy speed per-level scaling | `enemySpeedPerLevel: 0.012` | No change | Avoids weakening normal-wave pressure while fixing boss attrition. | Level 10+ may still need evidence-based tuning. | Yes, no change |
| Normal enemy fire delay per-level scaling | `enemyFireDelayPerLevel: -0.012` | No change | Keeps established normal-wave rhythm intact. | Future boss changes could expose later wave issues. | Yes, no change |
| Normal enemy fire chance per-level scaling | `enemyFireChancePerLevel: 0.00015` | No change | Avoids a broad normal-wave rebalance. | Later projectile load still needs level 10 playtest data. | Yes, no change |
| Normal enemy projectile speed scaling | `enemyProjectileSpeedPerLevel: 0.04`, `enemyProjectileSpeedMax: 2.35` | No change | Keeps normal bullets consistent with prior tuning. | Later waves may need pattern-specific review. | Yes, no change |
| Boss HP | `bossBaseHealth: 70`, `bossHealthPerLevel: 10`, `bossMinHealth: 70` | `44`, `4`, `44` | Release playtest showed long boss resolution and multiple lives lost around the first two bosses. This reduces sponge/frustration without removing phases or identity. | Bosses may need a later damage/cadence retune if they become too short for expert players. | Yes |
| Boss phase 1 shoot delay | `bossShootDelayBase: 38` | `44` | Reduces early boss chip before the player has settled into the boss read. | Could make phase 1 too gentle. | Yes |
| Boss phase 2 shoot delay | `bossShootDelayPhase2: 29` | `42` | More recovery in the first dangerous boss phase. | Could make some bosses feel less aggressive. | Yes |
| Boss phase 3 shoot delay | `bossShootDelayPhase3: 23` | `38` | Reduces late-phase burst stacking. | Phase 3 may need more identity if future playtests find it flat. | Yes |
| Boss phase 1 projectile speed | `bossProjectileSpeedPhase1: 1.55` | `1.45` | Improves first-boss readability. | Slightly lowers pressure. | Yes |
| Boss phase 2 projectile speed | `bossProjectileSpeedPhase2: 1.8` | `1.52` | Improves readability and attribution without removing threat. | Skilled players may find phase 2 easier. | Yes |
| Boss phase 3 projectile speed | `bossProjectileSpeedPhase3: 2.05` | `1.68` | Smooths spike from phase 2 to phase 3. | Needs boss-specific feel pass. | Yes |
| Signature telegraph | `signatureTelegraphMs: 1120`, `signatureRingTelegraphMs: 1220` | `1240`, `1340` | Makes signature attacks readable before lethal execution. | Slower boss tempo. | Yes |
| Regular boss telegraph | `regularTelegraphEarlyMs: 960`, `regularTelegraphMidMs: 880`, `regularTelegraphLateMs: 780` | `1040`, `960`, `900` | Regular attacks should stay fair and attributable across the run. | Slightly lowers late-run intensity. | Yes |
| Boss projectile family speed multipliers | `netSpeedMultiplier: 0.86`, `beamSpeedMultiplier: 0.84`, `wallSpeedMultiplier: 0.78` | `0.80`, `0.78`, `0.74` | Slows the highest overlap-risk boss attack families. | Boss bullets may need future expert review. | Yes |
| Signature ring safe wedge | `ringSafeWedge: 0.5` | `0.60` | More reliable escape lane after early bosses. | Too-wide gaps could weaken ring attacks. | Yes |
| Regular ring safe wedge | `regularRingSafeWedge: 0.5` | `0.60` | Reduces unavoidable overlap perception for radial regular attacks. | Same as above. | Yes |
| Boss hazard hitboxes and arming | `beamHazardRadius: 13`, `coneHazardRadius: 27`, `hazardArmingMs: 240` | `11`, `23`, `320` | Reduces cheap-feeling overlap between boss bullets and hazard traces. | Hazards may become too forgiving for expert players. | Yes |
| Sector-clear repair | `levelClearRepairTargetLives: 0`, `repairInvulnerabilityMs: 0` | Keep `0`, `0` | Existing `check:powerup-balance` guards against random or level-clear life grants. | No normal-wave recovery help; boss milestone recovery is handled separately. | Yes, no change |
| Boss-clear recovery | None | Restore `1` life, capped at `6`, with `1000` ms repair invulnerability | With only 3 starting lives and rare extra lives, boss victory should not leave the next level doomed. | Could soften boss attrition too much if boss damage is also over-corrected. | Yes |
| Final-life boss clutch shield | Shield only spawned after losing a life during an active boss level | Also checks while a boss is active, so entering a boss on 1 life can receive the existing one-time clutch shield | A player who reaches boss 2 on 1 life should still feel they have a chance. | Needs human review to ensure it feels like fair support, not a bailout. | Yes |
| Difficulty modes | None | Document only | New modes need leaderboard policy work. | Adding modes now could complicate ranked scoring. | No code change |

## Corrected progression target based on 3 life economy

Manual playtesting corrected the balance target: Nova Swarm starts as a 3-life arcade game, and extra lives should be rare rather than a requirement for fairness. Extra-life drops are now enabled at `extraLifeDropsEnabled: true`, `extraLifeChance: 0.08`, and `extraLifeGuaranteedEveryLevels: 6`. That means the earlier idea that boss 1 might commonly cost 1 to 2 lives was too punishing.

The new target is:

- Brand new players should usually reach at least level 3.
- Practiced players should have a realistic path toward level 10.
- Skilled players should be able to continue climbing beyond level 10.
- Boss 1 should be tense, but usually cost 0 to 1 life.
- Boss 2 should be clearly harder than boss 1, but not a hard wall.

The current run killer is boss life attrition, not normal-wave failure. Human evidence showed easy first waves, a first boss kill that left only 1 life, a successful next normal level on that 1 life, then death at boss 2.

Exact boss values changed in this patch:

| System | Old value | New value | Expected effect |
| --- | --- | --- | --- |
| Boss HP | `bossBaseHealth: 70`, `bossHealthPerLevel: 10`, `bossMinHealth: 70` | `44`, `4`, `44` | Shorter boss 1 and smoother boss 2 HP climb. |
| Boss phase shoot delay | `38`, `29`, `23` | `44`, `42`, `38` | More recovery time, especially in phase 2 and phase 3. |
| Boss projectile speed | `1.55`, `1.8`, `2.05` | `1.45`, `1.52`, `1.68` | Boss bullets remain threatening but more readable. |
| Signature telegraphs | `1120` ms, ring `1220` ms | `1240` ms, ring `1340` ms | Gives players more time to read signature danger. |
| Regular telegraphs | early `960` ms, mid `880` ms, late `780` ms | early `1040` ms, mid `960` ms, late `900` ms | Reduces surprise hits across the ladder. |
| Boss attack family speed multipliers | net `0.86`, beam `0.84`, wall `0.78` | net `0.80`, beam `0.78`, wall `0.74` | Softens the highest overlap-risk boss patterns. |
| Boss ring safe wedges | signature `0.5`, regular `0.5` | signature `0.6`, regular `0.6` | Wider readable escape lanes. |
| Boss hazard fairness | beam radius `13`, cone radius `27`, arming `240` ms | beam radius `11`, cone radius `23`, arming `320` ms | Less cheap-feeling contact with telegraphed hazards. |
| Boss clear recovery | none | `bossClearRepairLives: 1`, `bossClearRepairMaxLives: 6`, `bossClearRepairInvulnerabilityMs: 1000` | Boss victories restore one life up to a 6-life cap. |
| Extra-life pickup cap | `MAX_PLAYER_LIVES: 6` in shared balance config, `Game.gainLife()`, and life pickup handling | `6` | Aligns all life gains with the requested 6-life cap. |
| Extra-life drops | disabled: `extraLifeDropsEnabled: false`, `extraLifeChance: 0`, `extraLifeGuaranteedEveryLevels: 0` | `true`, `0.08`, `6` | Makes life powerups rare: low chance on ordinary powerup drops plus about 0.5 guaranteed life drops per 3 levels if none appear. |
| Boss clutch shield timing | only checked from life-loss handling | also checked during active boss updates | Gives players entering a boss on 1 life one visible shield chance. |

Extra-life drop rate is intentionally rare. With max 2 powerup drops per level and an 8% life selection chance, random life drops should be uncommon; the 6-level guarantee prevents very long dry streaks without making every third level automatic.

Expected progression effect:

- Boss 1: strong play can still lose 0 lives; average new play should more often lose 0 to 1 life instead of arriving at level 2 nearly doomed.
- Boss 2: HP and attack scaling are smoother, and a player entering with 2 or 3 lives has a realistic chance to win. A player entering with 1 life is no longer automatically doomed because boss-clear repair can restore a life after boss 1, and repeated boss clears can rebuild lives up to 5.
- Level 10 ladder: normal-wave scaling remains deterministic and unchanged; the player should have more runs that survive boss attrition long enough to practice level 3 through level 10.

## Patch intent

This patch deliberately keeps normal enemy constants and per-level scaling at baseline after the release playtest rejected the micro-buff, while moving bosses toward shorter, more readable, less bursty encounters. It adds deterministic boss-clear recovery capped at 6 lives while preserving the 3-life starting economy, and rare extra-life powerups for longer-run sustain. It avoids normal HP inflation, hidden dynamic difficulty, scoring changes, leaderboard changes, level-clear life grants, common extra-life drops, and boss identity changes.
