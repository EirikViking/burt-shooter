# Planetfall Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Root is the only filesystem writer; reviewers are reasoning-only. No commits/worktrees under the user's standing preservation instruction.

**Goal:** Implement and verify one striking, playable orbital-ring siege with coordinated audiovisual phases.

**Architecture:** A deterministic model drives a Boss subclass in the existing manager. Owned visual/audio modules read model state, with finite aftermath; existing DEV-only isolation routes the initial prototype.

**Tech Stack:** Existing JavaScript, Pixi.js, Electron, AudioManager, Playwright and Node assertions. No new dependency or paid asset service.

**Spec:** `docs/superpowers/specs/2026-10-07-planetfall-design.md`.

## Global Constraints

- Preserve dirty D: checkout/branch/HEAD7e8325e and inherited outputs. No Git publication/reset/worktree changes.
- E: build/TEMP/cache only; reuse owned staged source and retain delivered25778573 as active comparison baseline.
- No normal admission initially, score/schema/control changes, new purchases, hourly reports or activation of gated fauna audio.
- Arrival3.2s; iris7s cycle/open3.2s; warning1.4s;4anchors at8%HP each; core68%; maximum6projectiles/volley.

## Review Focus

1. Simultaneous core/anchor damage and legitimate high burst must not duplicate completion.
2. Pause/focus/draft near discharge must restart the full warning without late audio.
3. Portrait/resizing and Reduced Motion must preserve visual/aim/hit alignment.
4. Failed asset loads, death and retry must not leak shared textures or revive effects.
5. Async sound refusal/mute and cosmetic effects must not consume gameplay RNG or change selection.

## Task1: Deterministic Encounter

Files: create `src/game/Planetfall.js`, `scripts/check-planetfall.mjs`.
Interface: `PlanetfallModel(health)` exposes `parts`, `age`, `stage`, `irisOpen`, `defeated`, `warning`, `health`; `update(seconds,{paused=false})`, `hit(id,amount)`, `beginWarning(aims)`, `consumeVolley()`, `interrupt()`.
- [x] Write assertions for exact health budget, optional anchors, timed exposure, rupture threshold, finite6shot volley, dead-anchor cancellation, interruption, no RNG, invalid input and once-only defeat.
- [x] Run test and observe missing module failure.
- [x] Implement model with bounded finite input, simulation-time clock and no side effects.
- [x] Run focused and existing Breach/Counterweight model regressions.

## Task2: Playable World-Scale Prototype

Files: create `src/entities/PlanetfallBoss.js`, `src/effects/PlanetfallVisual.js`; modify only relevant factory/cleanup hooks in `EnemyManager.js`, pause-boundary hook in `PlayScene.js`, DEV allowlist/setup in `EncounterEvolutionTest.js` and `EncounterExpansionTest.js`.
Interfaces: Boss shares existing `components`, `createSprite`, `update`, `destroy` and `syncInterruption`; visual `update(delta)`, `hit(component)`, `detach(index)`, `destroy()`.
- [x] Add initially failing integration/DEV-policy assertions and live runtime checks.
- [x] Build sharp articulated ring/core using existing atlas frames; create4anchors+core through EncounterComponent.
- [x] Emit normal owned bullets from frozen warning aims; preserve boss score hook once and no component credit.
- [x] Implement idempotent cleanup and non-colliding finite collapse under existing manager effect lifecycle.
- [x] Verify actual core route and anchor route, interruption, strong builds, death/retry and missing-art behavior with real Player volleys.

## Task3: Sound And Language

Files: create `src/audio/PlanetfallAudio.js`, `src/i18n/planetfallText.js`; extend existing source-text mapping for8locales.
Interface: audio `update(model)`, `event(name,index)`, `suspend()`, `destroy()`; no gameplay return values.
- [x] Add failing audio lifecycle/RNG and8locale completeness checks.
- [x] Compose finite, owned existing-recording cues for arrival, iris, anchor, rupture and collapse; preserve stronger warnings/mute/music settings.
- [x] Add concise localized phase/interaction labels, scaled to content bounds.
- [x] Capture and inspect actual game sound/video; verify signal/peaks and no orphan audio after pause/death/retry.

## Task4: Quality And Delivery Decision

- [x] Inspect1280x720,1920x1080,ultrawide and portrait, normal/Reduced Motion/lowFlash,8locales.
- [x] Run actual keyboard/gamepad, all actual weapon families and repeated teardown tests.
- [x] Record ordinary-damage playable runs and matched baseline/candidate frame tails; review whether the choice is readable and spectacle materially stronger.
- [x] Fresh reasoning review of complete delta; repair critical findings with regression tests.
- [x] Only then decide normal admission via existing scheduler and all applicable release gates. Do not force upload on a timer.
- [x] Update evidence/ledger and clean task-owned superseded output; report unresolved manual quality judgments honestly. Explicit updater/inherited policy holds remain documented, not retried.

## Execution Ledger

- Final cleanup October8: current job staging/profiles/caches/logs and empty failed output removed with absence checks, about2.6GB. E free153061949440bytes. Current release/evidence/25778573 rollback retained; unknown-owner Chrome updater scratch and inherited rejected paths remain held. Owned5014/5015 stopped. Optional5015restart rejected before execution by policy, not bypassed. Steam delivery already authenticated and unaffected.

- October8 01:49Oslo: current3D Planetfall and Veilborn increment delivered/authenticated private25791160/8962155408365970631, versionv2026-10-08_01-19-48. Full current build/compiled8locale/controller/smoke/native/current-sized-foundry gates pass; exact archive/native/input seals retained. Public/test-build already25778573 before this pass and remain there; Cloud unchanged. Coldfade regression379-525ms nowcompiledmax19.2/16.1ms andnative13.7/12.1ms. Coldadmission1.7-1.95s, naturalwhole-run/manualfun/mix remainopen. KnownportraitHUD/Germanpadding/ChineseSPEEDUP notcleared. Currentjobcleanupinprogress, inheritedholdsuntouched. See combined-av-20261008 review and delivery.json; no duplicatepreview or routineemail.

- October8 continuation: integrated completed Veilborn performance/audio into authoritative D: after exact baseline checks. Ruling: preserve current D: branch/inherited work and use only reasoning reviewers; no new Git mutation or second writer, as the latest heartbeat explicitly requires. Current compiled cold-collapse gate exposed379-525ms at first hub fade. Stable-transparent private clones replace runtime shader switching; source regression now passes (max15.4/18.7ms desktop/portrait) with actual fading/target-pixel/accessibility/context-loss tests. Shared opaque materials remain unchanged. Current combined full build/native/compiled delivery checks are in progress; do not ship the pre-fix build. Details: docs/reviews/combined-av-20261008.md.

- Baseline: private25778573 delivered15:22Oslo, package and source hash receipts retained. Root-only implementation, no additional writer. Manual approval gates waived; no commit steps.
- Cleanup: disposable release package-source/native profiles removed and verified; E free181038612480bytes. Chrome-created unpacker ownership uncertain, retained. Historical held outputs untouched.
- Task1 complete: missing module RED -> eight model groups GREEN; encounter-expansion/Breach and Counterweight model regressions pass. Added real54HP budget rounding regression RED -> GREEN.
- Task2 in progress: DEV admission RED -> GREEN; actual1280x720 game renders32-piece textured ring and5components. Runtime direct-damage core route, six-shot warning, pause recovery, exactly-one credit and finite collapse pass. Not yet actual-weapon or natural/fun proof.
- Task3 in progress: audio missing module RED -> GREEN for refusal retry, interruption, owned group/RNG option and teardown. Locale test initially had argument-order error (false green); corrected it, observed missing German CORE SEALED RED, then all7non-English mappings GREEN. Actual audio capture remains required.
- Ruling: keep all implementation and ledger in the preserved source and owned E job; no skill-driven commits/worktrees or destructive workspace deletion because the user's explicit preservation instructions take precedence. Cost: uncommitted scope must be tracked by exact file list/evidence.
- Ruling: initial ring uses32segments cut from existing licensed machinery art, not newly purchased/generated media. Cost: visual quality still requires human review and further polish.
- Resolved transient write blockage: apply_patch failed on the two large existing source files despite valid ACL, space and an exclusive ReadWrite probe with unchanged SHA. Normal apply_patch succeeded once transient Git reader processes were idle. This is consistent with reader/mapping interference, not a proven OS diagnosis. No permission change, process termination, source replacement or alternate rewrite bypass. Both manager guards now exclude Planetfall from instant-kill restoration and generic reinforcement. Actual manager regression passes: four reinforcement methods receive no calls; a legitimate kill inside1.5s advances to LEVEL_COMPLETE with health0 and one credit.
- Runtime refinements: sustained blur remains blocked even if generic paused=false; collapse audio stops at the PlayScene pause boundary; unique audio groups keep old teardown from silencing a new boss. Regression failures observed before these fixes. Core breakup retains7articulated fragments after all32outer segments are gone.
- Actual weapon evidence:20real Player volley/production-collision cases pass across core/anchor routes and10loadouts, closed-core damage0 and one victory each. This fixture removes hostile shots and is not survival evidence. Ordinary keyboard capture separately won in19.53s with3lives unchanged;142actual audio plays, mean-31.1dBFS/peak-12.4dBFS. Capture predates latest manager/label/core-fragment refinements and must be refreshed.
- Presentation evidence:12screenshots cover8locales,1280/1920/ultrawide/390portrait and reduced motion/flash0. A failing14px label-readability assertion led to inverse world-container scaling; targets remain inside bounds. Missing premium atlas fallback and idempotent teardown pass. Inherited portrait HUD overlap and Chinese SPEED UP remain, so no all-layout perfection claim.
- Full build:current v2026-10-07_16-21-58 passed, followed by compiled8locale UI, controller flow and smoke. This predates final audio-group/core-breakup/manager refinements; repeat build before release claims. Prototype is DEV-only, not in Steam25778573 and not naturally admitted.
- Design correction: focused damage routes take4-12s and ordinary keyboard19.53s, shorter than the75-100s aspiration. Preserve earned burst/normal HP; do not inflate health or force waiting to claim that target. Judge choices/readability/payoff instead. Human fun/mix and matched frame tails remain open.
- Next presentation refinement: make the ring read as one powered machine through restrained cyan anchor conduits, depth-weighted plates and coordinated mechanical recoil. Keep hitboxes/frozen warning geometry unchanged and amber reserved for danger. No new health, waiting or purchased media.
- Implemented that refinement: four powered cyan conduits, depth-weighted plates, small cradle/iris recoil with stationary targets/ports, and a restrained sealed-iris machinery cue whose level falls with surviving anchors. Warning volume remains unchanged. Audio test RED -> GREEN;12visual cases pass with powered-route/depth assertions. A subsequent minimum warning-width assertion failed; added1.2screen-pixel minimum and slightly stronger baseline opacity. This final width refinement still needs the12case rerun.
- Added real bomb/splash cases:22weapon routes now pass. Actual factory/clear lifecycle passes during warning, volley and collapse: no remaining owned live shots/audio/effects/listeners, shared textures survive; post-victory component damage cannot add rewards. Draft, milestone and native blur hold/reset warnings. Delayed assembly-audio request is cancelled by teardown and remains silent after loading completes.
- A/B/B/A presentation stress passes in the same source-build scene with160fixed hostile projectiles. Full ring CPU p99=6.9/9.0ms, component-only5.5/5.1ms; RAF p99=17.3/17.1ms versus17.2/17.3ms, zero>50ms. This is isolated presentation cost, not compiled/native/whole-game proof.
- Next work: rerun final visual/runtime gates; refresh actual capture (script now supports production gamepad mapping via emulated controller); rebuild final source and verify compiled production containment/UI. Old verified MP4 retained, obsolete WebM intermediate removed after ownership/path/process checks; new capture not yet started. Leave current Steam deliverable25778573 intact.
- User reiterated stop ALL automatic status reports. Verified reporting automations paused, Nova development heartbeat already failed-runs-only and forbids scheduled status/PDF/email reports. Muted normal notifications on the only other active job, Radar Rat website progress, without stopping its work. No email sent; development goal remains active.
- Final warning-width12case rerun passed. New actual emulated-gamepad recording won with3lives unchanged and128sound plays. Fresh independent supplied-source review found no actionable defect; inherited contracts/runtime claims not independently executed by reviewer. New recording encoding/finalbuild still pending.
- Cleanup rejection: ordinary ownership/path/reparse/process-checked Remove-Item of own obsolete web-check was blocked by policy before execution. Do not retry deletion, rename or empty it through another route. Preserve that exact folder under hold; final candidate will use web-final. Existing5012server was stopped normally before rejection. Other source/baseline servers5010/5011 retained. E free177.65GB before finalbuild.
- Ongoing automation refreshed to current25778573 delivery and14hour improvement ambition, without the obsolete sprint cutoff. Hourly reports/emails remain cancelled; development heartbeat remains active.
- Final build v2026-10-07_17-23-23 passes; compiled production containment,8locale UI and controller flow pass. Final compiled smoke running on5012. Refreshed model/audio/policy/locale and existing Breach/Counterweight regression suites pass. Fresh actual23.966s MP4 with game sound validated/attached in response to the user's video request; core victory20.517s,3lives unchanged. See docs/reviews/planetfall-preview-20261007.md for exact scope and limits.
- Next admission design: own Planetfall identity/Codex; one seeded opportunity per run from14-18, defer blocked slots, share existing exclusions/recovery and reciprocal6sector Breach spacing. Record only successfully loaded/current-run admission; protect async cancellation/duplicate admission and reset on new run. Preserve normal scaled health/score. No admission code written yet.
- Previous goal turn was a requested recap, not implementation progress. This continuation revalidated source/remote state and completed fresh regression evidence while honoring the new video request. Overall goal remains active; no perfection, natural admission or new delivery claim.
- Final compiled smoke completed exit0: zero failures/warnings/page errors/bad responses, including actual boss defeat and continuation. No test session remains running. Current required web-final/MP4/evidence and delivered Steam baseline retained; obsolete web-check remains under policy hold, cleanup not complete.
- User renewed visual-first priority. Bounded design: darker textured underside behind existing hull, sparse structural braces/cool seams, anchor-centered eight-plate fracture wave with fixed2.2s deadline, bounded local rupture/sparks, iris-first finite3.8s collapse. No geometry/health/timing/score changes. Reduced Motion removes drift/spin; Flash0 removes bursts/sparks. Root owns all visuals; shared atlas preserved. Use actual runtime RED/GREEN and screenshot/frame-tail tests. Reasoning reviewer recommends the fracture wave over uniform extra detail. No new costs. Natural admission follows this presentation refinement.
