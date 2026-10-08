# Arcade and Onslaught Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the user-reported BuildID 25423927 Onslaught faults, deliver a verified Windows package, and upload only the finished package to `sector-continue-test`.

**Architecture:** Keep the existing run-policy, leaderboard adapter/provider, Electron bridge, persistent queue, progression, scene, and i18n systems. Add targeted lifecycle guards at the source of the crash, strengthen existing durable submission state, change only Onslaught Tactical earned-XP and explicit achievement eligibility, and compose the results/records screens from existing UI primitives.

**Tech Stack:** JavaScript, Phaser/Pixi, Electron, Steamworks FFI, Vite, Playwright, electron-builder, SteamCMD.

**Spec:** `progress.md` section "Arcade / Onslaught repair (2026-09-20)" plus the current user request.

## Global Constraints

- Preserve source on D: and use E: for build, temp, cache, package, and QA output.
- Preserve genuine pending runs, saves, unlocks, Arcade records, Steam Overlay, frame pacing, and existing leaderboard 21037871.
- Do not change difficulty, spawning, respawns, combat balance, Onslaught Pure progression, or unrelated Steamworks settings.
- Never upload synthetic scores or unlock production achievements through fixtures.
- A genuine short run remains eligible; only earned events produce career XP.
- Use `nova_swarm_overrun_tactical_score_v1`, Descending, Numeric, KeepBest.

## Review Focus

- Scene/ticker teardown during an in-flight leaderboard request must not touch destroyed display objects; exercise rapid tab switching and close/reopen.
- A successful KeepBest response with an unchanged global best must clear the durable queue while retaining and displaying the global best.
- A failed read after a successful upload must not revert the upload to failure or erase the pending/confirmed provenance.
- Starting at sector 51 with supplied upgrades must award zero XP until an eligible gameplay event is earned, then award Tactical at 1.0x exactly once.
- Results navigation and Run Report return must retain Onslaught Tactical, focus, and queued submission state at 1280x720, 1920x1080, and high DPI.

---

### Task 1: Preserve and Diagnose Installed Runtime

**Files:**
- Preserve: `E:/Codex/builds/nova-swarm/arcade-onslaught-repair/preserved-user-evidence/before-tests/**`
- Inspect: `src/scenes/HighscoreScene.js`, leaderboard UI helpers, Electron recovery logger
- Test: focused packaged navigation reproduction

**Interfaces:**
- Consumes: installed BuildID 25423927 profile and package
- Produces: exact exception, stack, state transition, and affected lifecycle callback

- [ ] Copy recovery, Steam runtime diagnostics, current-account save, local highscores, and hashes before launching tests.
- [ ] Reproduce Arcade/Onslaught switching in the installed package with the preserved profile or a non-mutating copy.
- [ ] Map the minified stack to the source callback and compare teardown with the working Arcade path.
- [ ] Write a focused failing lifecycle regression that destroys/closes the scene while animation/request callbacks remain pending.

### Task 2: Repair Leaderboard Lifecycle and Error States

**Files:**
- Modify: `src/scenes/HighscoreScene.js` and its existing focused test script(s)
- Test: `scripts/check-leaderboard-reliability.mjs`, runtime navigation fixture

**Interfaces:**
- Consumes: existing tab/request tokens and scene shutdown events
- Produces: stale callback cancellation/validation and explicit loading, empty, offline, cached, and error states with Retry/Back

- [ ] Run the new lifecycle test and confirm it fails with the preserved null display-object write.
- [ ] Invalidate or detach the exact callback at scene shutdown and validate current request generation before rendering.
- [ ] Keep request failures recoverable and distinct from confirmed-empty responses.
- [ ] Re-run rapid switch, close/reopen, offline, error, and 0/1/3/many record fixtures.

### Task 3: Repair Durable Steam Submission

**Files:**
- Modify only as evidence requires: `src/leaderboard/LeaderboardAdapter.js`, `src/leaderboard/SteamLeaderboardProvider.js`, Electron leaderboard bridge, existing persistent queue storage
- Test: `scripts/check-leaderboard-pending-steam.mjs`, `scripts/check-leaderboard-reliability.mjs`, Steam bridge mock/live probes

**Interfaces:**
- Consumes: eligible result payload with account, board, run ID, ruleset, and start metadata
- Produces: serialized durable states `saved_local`, `submitting`, `submitted`, `best_unchanged`, `queued_offline`, `failed_retryable`

- [ ] Inventory the preserved user queue and original run records without reconstructing missing metadata.
- [ ] Trace run completion through persistence, native callback, cache invalidation, and fresh current-player retrieval.
- [ ] Add failing tests for short-run eligibility, restart retention, account/board isolation, callback ordering, KeepBest unchanged, and failed refresh after accepted upload.
- [ ] Implement the smallest queue/bridge/provider corrections and map status copy without blocking navigation.
- [ ] Verify the live board identity/config read-only; perform a live upload only from a genuine eligible payload/run.

### Task 4: Apply 100% Tactical Career XP and Explicit Achievements

**Files:**
- Modify: `src/game/RunMode.js`, `src/progression/HangarProgressState.js` only if the traced award path requires it, achievement eligibility definitions, translations/help
- Test: `scripts/check-overrun-mode.mjs` plus a focused earned-XP/idempotency check

**Interfaces:**
- Consumes: eligible post-launch events and run-policy metadata
- Produces: Tactical multiplier 1.0, Pure unchanged, no startup/skipped-sector/supplied-upgrade rewards, no duplicate persistence

- [ ] Update failing tests first for 1.0 Tactical XP, 0 startup XP, earned-event XP, persistence, and duplicate prevention.
- [ ] Change only the Tactical profile multiplier and fix any demonstrated dropped earned-event path.
- [ ] Audit achievements one by one; allow only clearly mode-independent post-launch accomplishments and preserve journey/mode/sector requirements.
- [ ] Verify leaderboard eligibility remains independent of career/achievement policy.

### Task 5: Repair Results and Records Presentation

**Files:**
- Modify: `src/scenes/GameOverScene.js`, `src/scenes/HighscoreScene.js`, existing layout/component helpers and translations
- Test: `scripts/check-result-screen-flow.mjs`, `scripts/check-result-screen-status.mjs`, `scripts/check-leaderboard-visuals.mjs`

**Interfaces:**
- Consumes: result payload, submission state, personal/global best, Flight Targets
- Produces: non-overlapping responsive actions, correct labels/scope, preserved mode/focus, compact low-population board

- [ ] Add failing layout/interaction tests for all five actions, Run Report return, controller focus, retry mode, and pending-state stability.
- [ ] Implement one measured action area and the defeat title `ONSLAUGHT — RUN OVER`.
- [ ] Remove duplicate personal-best copy, resize real-records space, separate Steam sync from personal best, and show one valid next target.
- [ ] Keep developer Flight Targets distinct from human rankings and explicitly show stored progress.
- [ ] Verify tab selection is independent from keyboard focus and label `Arcade Pure` and Friends/Local scope clearly.

### Task 6: Correct Help, Localization, and Narration

**Files:**
- Modify: relevant `src/i18n/**`, mode cards/dialog/help/results text, narration catalog only for changed lines
- Test: `npm run check:i18n`, `npm run check:i18n-ui`, `npm run check:overrun-localization`

**Interfaces:**
- Consumes: actual launch/access/XP/achievement rules
- Produces: accurate eight-locale text ordered Arcade Tactical, Onslaught Tactical, alternatives

- [ ] Add assertions that sector-30, 85% Tactical XP, no-leaderboard, and blanket no-achievement claims are absent from affected surfaces.
- [ ] Update launch/help/result copy and translations from actual rules.
- [ ] Generate only necessary narration through the existing pipeline; if unavailable, suppress only inaccurate changed lines and record the exact gap.
- [ ] Run localized UI captures and inspect for clipping/tofu/overlap.

### Task 7: Build and Packaged Runtime Acceptance

**Files:**
- Build: `E:/Codex/builds/nova-swarm/arcade-onslaught-repair/package/win-unpacked/**`
- Verify: task-owned reports/screenshots under `E:/Codex/builds/nova-swarm/arcade-onslaught-repair/verification/**`

**Interfaces:**
- Consumes: committed source and canonical package pipeline
- Produces: stamped start-ready Windows package with native runtime and shutdown guard

- [ ] Run release-line, targeted suites, full build, i18n, Steam bridge, controller, and smoke checks with TEMP/TMP/cache/output on E:.
- [ ] Package through the canonical pipeline, stage native Steam runtime, apply/verify the existing shutdown guard, and prove the packaged ASAR contains the commit.
- [ ] Exercise actual packaged navigation, queue/restart behavior, overlay, and short representative frame/input checks.
- [ ] Capture and visually inspect results/menu/leaderboard at 1280x720, 1920x1080, and supported high DPI.

### Task 8: Live Acceptance, Steam Upload, and Cleanup

**Files:**
- Create: task-scoped VDF, manifest, receipt, and final handoff under the E: task root and `docs/`

**Interfaces:**
- Consumes: exact verified package payload
- Produces: live personal entry evidence, private branch BuildID, rollback data, and retained final package/evidence only

- [ ] Complete genuine run or recover a fully compatible original pending payload with verified ownership/provenance.
- [ ] Confirm upload callback, current-player entry, menu reopen, application restart, and fresh retrieval; report any exact user-interaction blocker honestly.
- [ ] Generate payload manifest, upload the exact verified package to `sector-continue-test`, and verify branch assignment while leaving `default` unchanged.
- [ ] Remove only task-owned disposable E: staging/logs after exact-path, process, lock, and reparse checks; preserve the final package, required evidence, and genuine pending/recovery data.
- [ ] Record branch, baseline/final commits, changed files, tests, translations, Steamworks actions, deploy status, and rollback command.
