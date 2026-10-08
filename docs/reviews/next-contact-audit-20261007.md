# Next contact: equivalence and integration audit

Checkpoint: October 7, 2026, approximately 05:20 Europe/Oslo.

## State and scope

This is a design/code audit, not a tenth implemented encounter. The frozen release cut remains v2026-10-07_04-34-38 in E:/Codex/builds/nova-swarm/ion-drive-20261007-24ab6e13. Product source, assets and that package were not changed by this audit. Counts remain **9/67 locally implemented, 8/67 delivered, 58 unimplemented**. Latest authenticated delivery remains Build 25765088 / manifest 3743460415809241959. Known native startup, Steam network and connector approval failures remain unresolved; no repeated upload/email attempt or security workaround was made.

Same checkout D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920, branch codex/sector-leaderboard-unknown-20260928, HEAD 7e8325e3d9abb09357636bca7e994c0227be02d6, no upstream. Initial status was 63 tracked modifications and 401 untracked individual files. All inherited work is preserved. The previous remote check failed; this local audit establishes no new remote freshness.

## Avoid duplicate decisions

| Proposed contact | Existing equivalent inspected | Decision |
| --- | --- | --- |
| Armour Freight, Rolling Bulkhead, Shield Shipment | Serpent Molt and Shielded Evacuation already offer retained cover versus reopened firing lanes. | Do not admit another row merely for a different cover shape. |
| Relay Crossing | Dreadnought relays disable a linked gun without destroying it. Authored siege relays also power guns and affect their protection. | Crossing the cables alone does not establish a sufficiently different decision. Defer this candidate. |
| Counterweight, row 21 | Existing mystery encounters lose structural firing ports and change attack availability. Tidemason has paddles; generic component breakup already changes combat. | Investigate specifically **player-caused mechanical reorientation of a surviving gun**, with its warning and firing direction visibly following the mount. This is narrower than claiming component destruction is new. |

Inspected implementations: src/game/DreadnoughtBreach.js, src/managers/AuthoredEnvironment.js, src/game/ConvoySurprises.js, src/game/SerpentMolt.js, src/entities/mysteries/SpatialMysteries.js, src/entities/mysteries/MysteryCombat.js, src/config/MysteryCombatProfiles.js and src/config/TractorFields.js. MysteryCombat.partBroken cancels owned attacks, updates structural health/children and some speed/core states; the inspected path does not implement the proposed counterweight tilt. This is evidence for a prototype investigation, not proof that every encounter in the game lacks an equivalent.

## Concrete integration hazards

1. **Part names carry gameplay meaning.** The existing rescue hit path treats left/right lock destruction as rescuing a pilot. A new machine must use distinct part identities and outcomes; a destroyed gun must not accidentally emit a rescue result. Existing victory handling also owns the rival drone lifecycle. Reuse normal damage ownership while avoiding those unrelated reward paths.
2. **Contact and machinery recovery are independent.** ArcadeFirstLightDirector currently checks rescue_contact for contact admission. EncounterPacing separately tracks linked_battery, while ignoring unknown families in recordEncounterFamily. Simply assigning family=counterweight would lose its ledger entry; assigning only linked_battery would lose shared contact recovery. A machinery contact needs both existing recovery checks and both records, within the current ledger. Failed eligibility must not consume the next card or draw new gameplay randomness.
3. **Warning geometry must drive the actual projectile.** Current fireRescueGun uses a locked player aim or fixed downward firing. A visual tilt alone would lie about the shot. A counterweight probe must use the same stable direction for the muzzle, warning and firing, cancel pending aim on reorientation, and wait through a full warning before shooting again.
4. **Generic guns already contribute scoring opportunity.** Any new hostile shots add potential grazes even with zero component credit. Keep a finite shot budget and lifetime; do not silently compensate through score formulas. No component accuracy, damage-score, kill, XP, drop, achievement or bonus-drone credit should be added without an explicit reviewed reason.

The current director/model lifecycle already provides warning preemption, pause/draft suspension, owner-bullet cleanup, finite contact expiry and production-blocked debug testing. Extend those paths; do not create a second scheduler or persistent quest state.

## Read-only executable probes

Ran a standard-access Node model probe using existing modules and assertions, with TEMP/TMP on the existing E: job and the compile cache disabled. It wrote no test artifacts or player data. All four assertions passed:

- Destroying Dreadnought relay0 disabled gun0 while preserving gun0 health.
- Destroying the left lock of twin-jailers produced a rescue result and incremented rescued pilots.
- Recording linked_battery recovery did not make rescue_contact unavailable.
- Recording an unregistered counterweight family produced no family ledger record.

These validate integration hazards in the current code. They do not validate a new contact, its balance, runtime appearance or fun. No full build was repeated for this documentation-only continuation.

## Bounded next prototype

Use Counterweight as the next candidate, pending an equivalence check during actual play. Keep the normal contact opportunity, headline exclusions and current progression protection. Prototype one swinging assembly, two independent guns and one central pivot. Destroying one gun should create an observable change in the remaining gun's safe lane; destroying the pivot should disable the assembly through normal part damage.

The pivot must not become the cheapest dominant answer on every build. Compare precision, broad/slow, burst/Ghost, piercing, Chain and permanent-drone inputs before choosing health allocation or admission timing. Any initial numbers remain hypotheses. Do not increase opportunities or spawn it on top of an existing headline merely to make it visible.

Acceptance before counting/delivery:

- One sighting teaches the mass/aim relationship without an extra blocking announcement; the third offers a reason to choose a different target or route.
- Coupled visual and shot directions remain truthful after either gun, pivot or simultaneous parts break. No instant shot after reorientation or resume.
- Both existing recovery families apply, failed eligibility preserves the deck, and seeded choices remain independent of cosmetic randomness/assets.
- Finite lifetime, bounded bullets/effects, normal ownership and exactly-once cleanup survive pause, draft, focus loss, death and retry.
- Actual isolated animation/audio preview, natural-pressure play, all affected locales/modes and comparable frame tails precede release. Existing assets/audio first; no new paid generation.

## Primary research informing the choice

KeelWorks describes energy allocation, integrated ground allies and distinct boss mechanics alongside visual storytelling in its [developer account of CYGNI](https://blog.playstation.com/2024/07/08/cygni-all-guns-blazing-redefining-the-shoot-em-up/). My design inference is that spectacle should expose a readable action and consequence. For Nova Swarm, a physical mount changing a firing lane is worth testing against that principle. This does not justify copying CYGNI's health/collision rules or establish sales, retention or fun.

## Changes and boundaries

Only this audit, HANDOFF.md and progress.md changed. No player-facing strings or localization changes, no Steam/Cloud/settings changes, no deployment, email or asset generation. Existing untranslated Chinese SPEED UP remains outside this audit. No new disposable build/temp output and no cleanup attempted against held or rejected paths. Reversal of these notes, if explicitly requested, should remove only this checkpoint and audit; no repository reset or broad rollback is appropriate.

## Continuation at 06:10 Oslo: model implemented, not integrated

Added src/game/Counterweight.js and scripts/check-counterweight.mjs. This is an **unwired model prototype**, with no normal catalog entry, debug route, artwork, audio or playable runtime integration yet. It does not count as a tenth completed contact. The frozen release cut is unchanged; its entry hash was checked again. Nine contacts remain locally implemented, eight delivered and 58 unimplemented.

The model provides two separately destructible guns and a pivot, sharing **six scaled HP** (1.5 + 1.5 + 3). A broken gun smoothly reorients the surviving gun; pending fire is canceled and a fresh full warning follows settling. The central pivot or both guns disable the assembly immediately. All hit results deny additional credit and avoid rescue, generic weapon and rival-victory result handlers. A projectile identity can damage only one component. Ally/hostile/unknown ownership is rejected by this prototype; permanent-drone/player routing still needs actual integration verification.

Initial hypotheses: 16-second lifetime, 3.6-second approach, 0.9-second settling, 1.2-second warning, 2.2-second cooldown and at most three volleys of one shot per surviving gun. That is at most six hostile projectiles; if admitted, they could create up to six ordinary graze opportunities. No net scoring-comparability claim is made. Spending the shot budget starts a short departure. Early burst destruction remains valid and cannot skip the arrival lead-in for the surviving gun. Pause/preemption uses simulation time and invalidates a charged tell; the model has no RNG, assets, persistence or reward callback.

### Verification and correction

- First test run failed for the missing model, then passed after implementation.
- Review exposed an early-break bug: destroying a gun during approach could start the first shot too early. A regression demonstrated it, and preserving the remainder of the arrival phase fixed it.
- Review also rejected an initial eight-HP allocation. The six-HP contact-budget regression failed, then passed after reallocating the two guns and pivot. Neither draft entered normal play or the frozen package.
- Eight focused assertion groups now pass: finite no-damage expiry/shot cap, both tilt directions and exact shot geometry, simultaneous/pivot destruction, early-break lead-in, pause/preemption, ownership/deduplication, late/invalid timing and fresh run state, deterministic replay with RNG calls forbidden. These are model assertions, not actual pause/focus-loss/drone/controller gameplay tests.
- Existing check-convoy-surprises.mjs, check-reactor-tow.mjs and check-encounter-evolution.mjs passed. Syntax checking passed. No production imports or normal catalog entry reference the new model. No full build, screenshot/video or frame-time claim is made for this prototype.

Evidence is under **E:/Codex/builds/nova-swarm/counterweight-model-20261007-19d685a4**: red.txt, arrival-red.txt, budget-red.txt, model-check.txt and verification.json. These small logs are retained as the current red/green evidence. No new game package was produced. Tests used process-local TEMP/TMP in the matching E:/Codex/tmp directory and NODE_DISABLE_COMPILE_CACHE=1.

Reproduce from the established repository after creating/verifying an owned E: temporary directory and setting TEMP/TMP there: `node scripts/check-counterweight.mjs`. Tuning lives in COUNTERWEIGHT at the top of src/game/Counterweight.js. The view must apply **one uniform scale** to both pose axes, so warning, muzzle and shot angles agree; independent width/height scaling would distort the physical relationship.

Next: build the articulated view and isolated, progression-blocked runtime route; use the existing director's damage/projectile/cleanup paths. Then test actual weapon builds, warning preemption, readability and natural pressure before adding both recovery-family checks and normal admission. The larger central pivot may dominate targeting despite equal total neutralization cost: this is a playtest question, not resolved by passing assertions. Preview animation with audible existing game sound before enabling new presentation for delivery.

### Delivery, coordination and rollback boundaries

Steam/native/Gmail/automation blockers reported at 05:07 remain unresolved; no repeated blocked action or workaround was attempted. Latest confirmed email remains 04:10:05 / 1a1142009d54ae4f. A read-only thread inventory request did not complete within the bounded wait and its orchestration was stopped; it made no repository changes. No agents were launched. Stable before-work Git counts and absent prototype filenames were verified before creating only these new source/test files; inherited implementation files were not edited.

Branch/HEAD remain codex/sector-leaderboard-unknown-20260928 / 7e8325e3d9abb09357636bca7e994c0227be02d6, no upstream. Final expected count is 63 modified tracked files / 404 untracked individual files. No new player-facing text or translations, purchases, generated assets, Steamworks/Cloud changes, player resets or deployment. Existing Chinese SPEED UP is unrelated and unchanged. The model is inert without imports, so no gameplay rollback is needed; an explicitly requested removal should target only these two verified newly created files and this checkpoint. Never reset inherited work. The earlier narrow ion-drive reverse-check remains available for that independent frozen cut.

Final verification confirmed 63/404 and unchanged frozen entry SHA256 c9ee7503681c8899ae31226755b2348ece545fe3ad2a990f2f515da63d220e34. Removed only this job's empty E:temporary directory after exact path/reparse/contents checks and verified absence; earlier denied or inherited directories remain untouched. Current red/green evidence is retained. Final E:free195852500992bytes. Verification receipt status: model-verified-not-integrated.

### Later continuation: isolated playable presentation

The model-only checkpoint above is historical. See [Counterweight preview evidence](counterweight-preview-20261007.md): articulated hardware, actual player/hostile projectiles, existing mechanical sound cues, eight-locale presentation and an isolated DEV route now exist. Source runtime, weapon matrix, interruption/retry, layout and bounded presentation measurements pass. A 27.433-second actual audiovisual mechanics preview is available locally. Normal scheduling/admission and natural pressure validation remain unfinished, so the completed-contact counts have not changed. The new preview does not replace the frozen Windows cut and has not been uploaded or emailed.
