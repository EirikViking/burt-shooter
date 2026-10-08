# 67 playable surprises: implementation plan

> Execute serially with the executing-plans skill. User instructions forbid concurrent agents in this checkout, new worktrees/branches and commits. Preserve inherited work. Read the design and current HANDOFF before resuming.

**Goal:** implement all 67 genuine interactive contacts defined in surprises-67-design-20261002.md, with independently verified visual/audio/gameplay milestones.

**Architecture:** extend the existing First Light contact selection, model, component targeting and view. Share existing EncounterPacing families and recovery; no second spawn director. Helpers hold bounded component/recipe logic, while the existing director remains the sole contact owner.

**Tech stack:** current JavaScript/Pixi/Howler/Vite/Electron, existing browser and pure regression conventions, E: build/evidence, recorded ElevenLabs assets.

**Spec:** docs/surprises-67-design-20261002.md.

## Constraints and review focus

- Existing directory/branch, D: source / E: work outputs; no Git publication/reset/player resets.
- One major new contact, <=6 parts/2 friendly fighters, finite 12–18 combat seconds initially. Timing hypotheses must be checked against measured opportunities.
- No new score/drop/XP credit per component; no player-only achievement grants from scripted allies. Record changed scoring opportunities separately.
- Preserve Pure/Tactical/Daily/Scout/continuation policy, Sector51 zero score/level-one augments, input and pause/focus recovery.
- Complete eight-language text, voices-off comprehension, accessibility and hardware tails. API/model tests cannot certify fun or AAA production.
- Especially test broad autofire erasing an intended decision, queued asynchronous art after retry, owner death during reconstruction, enemy and ally shots sharing a target, and combinations consuming the same reward.

## Milestones

### 0. Requested removal and optimization release

- [x] Record reproduced old backdrop lifetime failure and source checkpoint.
- [x] Remove rejected decorative prop rendering/prewarm/update/cues; preserve planet art and unique inherited source/assets.
- [x] Capture backdrop ownership before first await; reject stale queued/loaded/uploaded requests.
- [x] Focused regression green, shared texture preserved.
- [x] Real renderer no-prop/sector-change/retry/pause/focus check; fresh release/build/native package gates.
- [x] Authenticated private Steam before/upload/after: BuildID25671489, manifest7719893560754692225, public/other/Cloud unchanged. Cleanup receipt is appended after audit.

### 1. Rescue batch: entries 1–8

Files: add src/config/ConvoySurpriseCatalog.js and src/game/ConvoySurprises.js; extend src/game/ArcadeFirstLight.js, src/managers/ArcadeFirstLightDirector.js, src/effects/ArcadeFirstLightVisual.js; add focused scripts/check-convoy-surprises.mjs and runtime harness. Add all new instruction/cue strings through existing src/i18n catalogs in all eight locales.

- [x] Add failing catalog/state tests: exactly eight distinct mechanics/layout traces, finite original HP, source-tagged hits, repeated hits, rescue order and once-only callbacks.
- [x] Add model helpers with explicit part snapshots and transitions. Existing FirstLightModel owns contact and existing director owns projectiles/lifecycle. No new parts bypass normal targeting, disable or cleanup.
- [x] Extend view with actual clamp, tether, transfer, shield and tow states; preserve original convoy and payback continuity and the existing two-pilot identity.
- [x] Integrate finished existing hull/component art and eight new ElevenLabs cues with provenance/mastering receipts; inspect at gameplay scale, prewarm outside active combat.
- [x] Actual projectile64/Player72/localization192 matrices; exact-once credit, accessibility, pause/draft/focus/death/retry and async retirement regressions.
- [x] Safe opportunity/admission/anti-repeat integration; controlled normal selector reached the new Sector3 window at~152 combat seconds.
- [ ] Human first/third sightings, finite-life natural frequency, silent first-sighting comprehension and speaker/headphone listening. Automated checks do not certify these.
- [x] Final matched frame-time comparisons and authenticated private upload recorded in HANDOFF: Build25675532/manifest2141408636682790097. Windows package15568 files/4520 native hashes and actual executable startup/control-smoke pass. First CPU tail difference not reproduced in reverse order; both measurements retained.

### 2. Freight batch: entries 9–16

- [ ] Distinct failing transition/cover traces per entry, then model/view implementations using existing neutral-cover and real-wreck ownership. No new unbounded targets or farming.
- [ ] Container/hub/clamp/scoop art and short contact/cover/vent cues; actual autofire/broad/drone/Chain/Pierce/bomb counterplay and teardown checks.
- [ ] Admit only independently verified rows; report scoring opportunity changes. Private release only after applicable gates.

### 3. Linked machinery batch: entries 17–24

- [ ] Component relationship/steering/pivot/cable/shield/rewrite traces before implementation. Reuse explicit part disabling and owner projectile cleanup.
- [ ] Physical animation/part silhouettes and finite warning/audio, full mode/input/build coverage and no duplicate active-damage progress.
- [ ] Family anti-repeat with Siege/Breach/reassembly equivalents; seeded/natural frequency and frame tails.

### 4. Interception batch: entries 25–32

- [ ] Carrier/arm/interceptor/train/bow/pursuer/boarding/capsule/harpoon transition tests; bounded existing encounter health and attack budget.
- [ ] Build and inspect each distinct physical sequence. Ensure approaching/departing hulls, early destruction and simultaneous disable remain truthful.

### 5. Pressure apparatus batch: entries 33–40

- [ ] Vent/mine/beam/antenna/reservoir/shutter/gate/fuse rules, lead-ins and safe lanes before art/audio integration.
- [ ] Preserve movement/input/clear readability; no invisible hazard, focus-loss timer, component reward or indefinite wave hold. Actual multi-build and low-Flash tests.

### 6. Repair/salvage batch: entries 41–48

- [ ] Prove bounded original health/credit and exclusive wreck claims before enabling repair/rebuild. No refill farming, recursive wreck capture or duplicated rewards.
- [ ] Distinct docking/rack/barrel/vent/claim animations and actual interruption traces; broad build/owner death/retry checks.

### 7. Rival batch: entries 49–56

- [ ] Sharing/exposure/retreat/source-credit tests; preserve existing once-only rival bonus drone and actual gun/core lifecycle.
- [ ] Distinct cooperative shield/crossfire/crown/gun-swap/core relay/vent/retreat presentation; no fake kill or additional full health bar.

### 8. Consequence batch: entries 57–64

- [ ] Rescue outcome, escort ownership, bounded opening, expiry, anti-performance-assistance and reset tests before callbacks.
- [ ] Same visible identity between earning and callback; actual pilot presence/dialogue via existing localization. No added rival on a busy fight.

### 9. Specifically tested combinations: entries 65–67

- [ ] Only enable after the independent mechanics have passed. Sharing, owner interruption, simultaneous destruction and reward opportunities must be explicitly audited.
- [ ] Dedicated first/third sighting playtests and hardware tails. One combined contact budget and recovery; preserve intentionally designed earlier combinations.

### 10. Final library verification

- [ ] 67 implemented rows with distinct validated gameplay traces; no pending row counted as done.
- [ ] Seeded actual selector surveys and representative natural runs; no ranked submission/progression from forced routes.
- [ ] All supported locales/layouts/modes, native package/Steam identity, frame tails/long sessions, subjective visual/listening/counterplay checklist.
- [ ] Retain current deliverable/minimal evidence/required rollback; remove only job-owned obsolete staging/temp/cache after path/process/junction/lock audit.

Until that final milestone, keep the ongoing goal active and report exact completed rows. No assertion that every bug is fixed or all 67 already exist.
