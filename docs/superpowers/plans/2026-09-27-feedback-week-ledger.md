# Feedback week progress

Baseline 60c7f76. Integration branch codex/feedback-week-20260927.

## Decisions and constraints

- User correction: stage all replies, never publish. Three drafts created and pasted in authenticated Chrome. Post buttons untouched.
- User subsequently confirmed publishing all replies. No further forum actions. Final build upload authorized only to private sector-continue-test.
- Autonomous execution approved. Skill approval pauses are superseded by the explicit instruction to complete independently.
- Current worktree is already isolated and clean at baseline. Reuse it for integration; no concurrent coding agents in this checkout.
- Existing D node_modules and dist are inherited junctions. Build only in E task source staging, never overwrite the inherited dist target.
- Do not silently claim a global best-in-genre outcome or live Steam success; finish a concrete verified improvement package.

## Preflight overlap review

| Tasks | Shared surface | Integration decision |
| --- | --- | --- |
| 2,3,5,6,7 | PlayScene / Player | Sequential commits and focused integration tests |
| 3,4 | achievement evidence/UI | Evidence API first, UI consumes normalized fields |
| 5,6,7 | gameplay balance | Compare representative Pure/Tactical encounters before final tuning |
| 4,5,7,8 | localization/rendering | Central final eight-locale and visual pass |

## Evidence

- Fresh source/path/branch/HEAD/status/worktree/remote checked. Fetch succeeded. Ahead 1191 / behind 0 relative to origin/HEAD. No inherited tracked changes.
- E available before work: 399,423,700,992 bytes. New task directories E:/Codex/tmp/nova-feedback-week and E:/Codex/builds/nova-swarm/feedback-week.
- Forum visible counts before staging: Onslaught 10, Feedback 149, What next 3. No public message was sent.
- Primary genre research completed by independent web-only agent genre_research, emphasizing strategic weapon roles, useful combinations, readability and practice.

## Task 2: input and integer upgrades

- Real boss entry/exit test initially failed because keyboard focus was cleared; explicit focus preservation now covers keyboard/controller while default resets and blur remain safe. Fire already survived this path; no separate fire defect reproduced here.
- Extra Shot initially failed with fractional 1.55 units at level two and 1.85 at level three. Counts now use whole units; continuous multipliers keep 1/.55/.3 effectiveness. Damage penalties stop at the eight-shot cap. Drone/chain offers stop at the existing two-unit gameplay cap.
- Actual emitted-volley browser test initially failed because upgrades widened the cone. Extra Draft shots now fill its original angular envelope. Levels one through three verified across narrow, standard and broad batteries.
- PASS input-state-transitions, draft-integer-effects, tyrian-feedback-fixes, powerup-balance, ship-threat-response (30 hulls), focus-lens-spread (real Player.shoot), and CRLF-aware diff check.
- Windows temporarily held Player.js memory-mapped, preventing truncation. Applied the longer edit through an open write stream, then verified syntax and browser behavior. No source was discarded. The first browser retry caught the intermediate syntax error; the final clean run passed.
- Independent conceptual review covered release during transition, stale focus, whole counts, actual caps and continuous diminishing effects. Whole-branch code review remains required.

## Task 3: achievement and leaderboard evidence

- Serpent Duel now records a complete snake at the actual defeat boundary, including lives lost at that point. Zero or one loss qualifies; two does not. Later deaths cannot erase a legitimate unlock. Partial snakes and repeated callbacks do not qualify.
- Voluntary Onslaught exit now finalizes earned run progress before returning to the menu. Arcade exit behavior stays unchanged.
- Found and repaired an Electron Cloud serialization defect that discarded Onslaught collection evidence. Shared normalization preserves valid evidence and monotonically merges saved unlocks, including payloads from older renderers.
- Sector leaderboard details suffered the same installed wrapper integer-array decoding defect previously repaired for Onslaught. Raw SDK reads now cover Sector too. Verified 101 to 147 through download, presentation and career-rank refresh. Legacy entries without details show an unknown end instead of inventing a sector from score.
- Quasar Fan is not one of the five eligible Small Wings starter hulls. The staged reply now names the five correct hulls. Same Hull accepts overlapping custom triples and does not require presets.
- PASS snake-evidence (full defeat, 0/1/2 losses, later deaths, exit, restart and Cloud), achievements, Cloud save, profile isolation, Steam details, bridge, i18n (eight locales), adapter, pending queue and reliability suites.
- Current-source browser PASS achievement keyboard/controller/detail/resize and Steam leaderboard mock. Test URL 127.0.0.1:4877, isolated profiles, output on E. An earlier preview run used inherited dist and is excluded from current-source evidence.
- Cleanup exception: that earlier preview wrote D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920/test-results/steam-leaderboard-mock-2026-09-27T16-56-56-413Z. Automatic approval review rejected exact-path removal with "blocked by policy". It remains untouched; no workaround attempted. Report at delivery.

## Independent review follow-ups

- Fix the capped eight-shot timed Double Shot cone before delivery: capacity-clipped permanent bonus must not widen unchanged projectile counts.
- Test and fix actual chain reach, not only scalar modifier counts; a default floor of three masked permanent levels one and two.
- Reconcile actual drone objects after secondary-slot expiry; a second timed drone could survive alongside one permanent drone.

- Review follow-ups repaired: real browser volleys stay at eight shots and 0.4 rad through timed Double Shot; one-shot hull Triple Beam/Overdrive cones stay intact. Chain runtime reaches 1 then 2, timed reach 3 restores correctly. Timed two-drone support moved beside Ghost returns to one actual permanent drone after secondary expiry. PASS draft-runtime-overlap, draft-integer-effects, powerup-balance. The existing mapped-file lock cleared, normal patch writes now work.

## Task 4: achievement progress UI

- Added Challenges, Pilot Ranks and All views, retaining every one of the 100 IDs and saved unlocks. Group selection supports mouse, G and controller X. Existing mode and availability filters remain.
- Starter achievement details name all five eligible hulls and show Counted or Not yet; hull and custom loadout collections list the evidence used, including overlapping custom triples. Eight locale source maps updated.
- Reproduced an asynchronous lifecycle defect: multiple init calls before asset resolution installed stale extra backdrop layers. Generation guard rejects old loads and closes stale details. No duplicate row IDs were reproduced; retained deduplication and tested real reopen/redraw/scroll/resize paths repeatedly.
- Independent review caught Snake Duel as the last collection prerequisite delaying Constellation. Added a failing real-manager test and immediate cascade without prematurely recording the run.
- PASS collection evidence unit test, snake evidence/cascade, eight-locale checks, and real browser group/filter/keyboard/controller/detail/reopen tests. Starter checklist screenshot inspected at 1280x720; no clipping. Full build and locale surface QA remain in Task 9.

## Task 5: useful Drafts and loadouts

- Reproduced deliberate third-level suppression while three unseen cards remained. Normal play now reserves one useful owned-upgrade lane through level three, with two exploration choices. Default offer policy remains for Daily. Bans, holds, fusion/catch-up/score-route priorities retained. Rescans and bans remember recent offered cards in normal play.
- Repaired capped-offer exemption: only a newly completed fusion can justify an otherwise capped card, not any fusion already owned. Point Defense stops offering its ineffective third level at the existing nine-second cap. Legacy IDs remain saved.
- Impact Foam was overwritten by forceRespawn. Final respawn now includes its300ms bonus once, including last stand. Real takeDamage to Game.loseLife to onLifeLost test ends at1300ms.
- Ghost balance tuning:1.5/3/4.5 seconds, replacing1/2/2.4. Banners already pause gameplay timers; no timer defect claimed. Eight locales updated.
- Firepower preset replaces speed_up with double_shot; Balanced and Survival retained. Saved custom loadouts unchanged. Narrow hull catch-up and tighter broad volleys improve actual coverage; no unsupported blanket hull-stat buff.
- Current Point Defense did not block firing. Browser verifies identical five-shot volley,0.4rad envelope and117ms cadence before/through interception/after expiry, with one real hostile projectile intercepted.
- PASS useful-draft50-seed cases, draft-runtime-overlap, full tactical-draft browser suite, integer effects, powerup balance and i18n. Late-pool test fixtures now fill two-level caps instead of assuming all repeatable items have three levels.

## Draft review follow-ups

- Protect the useful evolution slot from fusion-priority replacement. Fifty-seed Shield/Damage and Drones/Damage cases pass.
- Restore the legacy three-stack catalog for Daily; apply two-stack effective caps only under normal-play policy, including displayed metadata. Exact seeded Daily offer regression passes.

## Task 6: encounter pacing

- Challenge targets follow five distinct continuous paths after entry. Current challenges reject both routine and Mayhem reinforcement scheduling, pending execution and Hijacker arrival. Runtime movement, sprite synchronization, contact safety, grades and cleanup pass.
- Snake wave roll reduced from16% to12%, preserving the three-wave separation. Removed the extra1.35 health factor; section HP at51/101/143 is71/122/161. Actual damage remains10 normally and15.5 during the existing0.72s opening in both Onslaught modes. Chain and Pierce mechanics are unchanged. Health bars show a short contrasting damage trail.
- Departing juveniles no longer count as objectives or receive hit/kill rewards, including the last-mother-death frame. Real textures, collision, no-contact safety and two-second disposal verified. Active adult snakes remain real objectives; adding a full new wave during an active snake was rejected on readability grounds.
- Mystery arrivals use3–5 eligible-sector gaps, preserving first-contact and combined-encounter recovery. Two thousand seeded runs average2.517/5.026/7.527/10.017 arrivals by20/30/40/50. Existing56-entry roster and fresh-first selection retained.
- Life grants now share one cutoff at100 across pickups, bundled repairs and boss/sector recovery. Carried legitimate pickups and deliberate Tactical repair remain valid. Real game and Draft paths pass at100/101/143.
- Tractor cloud opacity/size reduced; field geometry remains identical. The compact emitter keeps a nonflashing visibility floor.
- No sector143 discontinuity found in existing speed ladders. Keep their caps rather than add another speed increase. Representative hull volley/cone tests in Tasks2/5 support role improvements without blanket hull-stat changes.

## Task 7: bosses

- Onslaught starts a full seeded50-boss bag at51, independent of prior Arcade progression; default Arcade reveals unchanged. Guests select distinct candidates from the same eligible roster.
- Paired movement uses separation bounds before the speed limiter. Locked warning positions survive partner arrival/death. A1200-frame runtime pass preserved separation, bounds and3.2px/frame speed cap.
- Mature bosses retain attacks during finish armor; early bosses and actual life-loss recovery retain pauses. Controlled health arithmetic is identical. Actual phase3 volleys alternate fan/split/fan/split, preserving warning identity; cancellation does not advance the sequence.
- Flame texture coordinates stay anchored to the full route. Visual review additionally found a dim tail/white tip in the source asset; cropping to its turbulent body and tinting the material fixes both, while a steady contact floor remains visible with flashes off. Safety guide material receives an explicit local opacity floor.
- Independent browser pass:21 functional checks, zero errors. Original and revised flame frames inspected; final accessibility rerun still required.

## Task 8: combat readability and audio

- Ordinary Pierce uses a compact colored marker without its large white corona/orbit beads. Friendly markers keep constant alpha/scale and normal blending. Rift Shards alone use a1.46x core and34px tail, preserving ordinary bullets and collision/damage.
- Wing-hit sound now uses catalog gain0.12 and400ms cadence, retaining every earned score award.
- Voice admission is global across groups, including pending playback. Tactical warnings can interrupt chatter; ordinary chatter cannot interrupt warnings. Existing protected locks and deliberate menu replacement remain. Entry-owned completion runs once for end/error/rejection/group-stop/all-stop/Mystery cancellation; callbacks cannot steal a replacement.
- Independent deterministic audio regression20/20; real rendered projectile size/color/steady-alpha tests pass. Fake media proves lifecycle/admission, not subjective loudness.

## Integration notes

- Some legacy browser scripts were initially launched without their explicit URL/output overrides, used inherited dist and wrote task-owned D test-results. These runs are excluded from current-source evidence. Three audio harness failures involve their synthetic media/startup expectations. Current-source replacement coverage includes20 deterministic voice cases and real browser combat/boss tests. Remaining required production gates must pass before upload.
- Original boss-warning lifecycle Node test needed a headless texture fallback and its stale source-pattern assertion updated for the existing mystery/baby update expression. No warning clock formula changed.
- Additional cleanup review rejection: E:/Codex/tmp/nova-feedback-week/review-encounters/node-cache, survey.json, progress.log and its Chrome temporary directory. No deletion workaround attempted; exact remaining paths to be reported at delivery.

## Final review correction

- Independent review reproduced a false Serpent Duel grant from an old row with snake types but no defeat-time loss evidence. The new regression failed before the fix. New unlock evaluation now requires an explicit complete-defeat event; existing saved unlock IDs remain intact. Both unknown and explicit-zero historical loss cases pass, alongside zero/one/two event-loss boundaries and Cloud/reload checks.
- Final boss accessibility review passes all21 runtime cases with zero page errors. Tested safety guides remain visible at flash zero; flame travel stays orange and phase3 restarts at the origin.
- Final read-only reviews found no additional actionable defect in UI collections, Drafts (400 seeded cases), Cloud merge, Sector metadata or paired boss paths.

## Production integration progress

- Production build:current passed all prerequisite checks and compiled1043 modules. Existing large-chunk advisory remains; no compilation errors.
- check:i18n and overrun-localization pass across8 locales. Bridge, Cloud save, profile isolation, native details decoding, pending queue and reliability regressions pass.
- Final tractor inspection uses72 actual hostile projectiles across6 profiles. Field and warning source remain visible in normal, reduced-motion and flash-zero settings. Tested projectile cores stay distinct above the field. Controlled dark background; no claim of exhaustive full-session coverage.
- check:release-line and Steam SDK readiness passed before packaging. Current package comes from the isolated E copy, with source154d8af and version v2026-09-27_19-59-35. Browser/localization/packaged gates still in progress at this checkpoint.

## Final localization review

- Japanese card overflow led to a full eight-locale,100-card bounds regression. It failed before the fix, including11 Chinese cards. CJK wrapping plus width-aware fitting now passes every card. Details use matching wrapping.
- The new saved-loadout checklist now has explicit functional names for all15 starting augments in all8 locales. Independent Japanese/Chinese screenshots show native text and no overflow. Existing First Ranked Run romanization and some unchanged achievement titles remain inherited localization debt, outside the new text set.
- Final source is e22f0e1, version v2026-09-27_20-24-58. Production compilation passed1044 modules. Hashes of66 changed code/config/test files match the D repository and E staging copy.
- Pure pressure-function audit verifies projectile sector multiplier1.95 at142/143/144/200/999 and time multiplier1.42 at1500 and10000 seconds; no143 discontinuity.
- Browser smoke and controller flow passed. Repeating the required eight-language production screen suite after the final UI fix. Existing native presentation, display settings and fullscreen-menu contracts pass.
- Automatic approval review also rejected cleanup of the three other task-owned D outputs: voice-cadence-2026-09-27T17-51-00-985Z, menu-voice-overlap-2026-09-27T17-51-40-888Z, and colossus-balance. No retry/workaround attempted.

## Final private delivery and verification

- Packaged source e22f0e1, v2026-09-27_20-24-58. The later test-only commit9981cc8 adds isolated packaged focus/input regression coverage without changing the uploaded game.
- Required i18n/UI, build, bridge, browser smoke/controller checks passed. Packaged launch/display/restart passed; the replacement control regression passed31/31. The old hidden-window injection harness failure and exact evidence limits are preserved in the handoff.
- Packaged performance:12 samples over64 seconds, minimum59.52 and average59.91 FPS, zero reported warnings/errors. Early-game smoke only.
- SteamCMD upload and read-only authenticated branch verification passed: private sector-continue-test25564137, default25511386 unchanged, depot manifest4177681326648864018.
- User reports publishing every staged forum reply. No additional post, public release, Steamworks metadata change or Git synchronization was performed.
- Settings preservation regression passed, but Tyrian's unspecified reset remains unidentified. Serpent Duel in-game event wording changed; Steam-side description consistency has not been reverified or updated.
- Owned servers/test processes stopped. Final cleanup of68 bounded task-owned paths was rejected by automatic approval review before execution. No retry/bypass. Current package and131.99MB of proof retained; disposable E source5.52GB and scratch264.93MB remain with exact paths in cleanup-results.json. E free386.59GB. See final handoff for all previous cleanup exceptions and rollback.
