# Arcade First Light Implementation Plan

**Goal:** Two readable, interactive surprises in early Arcade, delivered to the private test branch.
**Architecture:** Pure encounter model, isolated runtime director and presentation; small PlayScene hooks. No new save/API contract.
**Tech Stack:** Existing PixiJS, JavaScript, Playwright, Electron, SteamPipe. No new dependency.
**Spec:** ../specs/2026-09-27-arcade-first-light-design.md

User authorized autonomous implementation. Root is sole source editor in the integration worktree; advisors research or generate isolated assets without repository writes.

- [x] Pure scheduling/damage model and meaningful regression tests; demonstrate test failure first.
- [x] Convoy rescue choreography, finite support projectiles and teardown.
- [x] Rival weapon destruction, attack telegraph, bounded reward and teardown.
- [x] Generated sprites integrated; all eight locale copy and readable instructions.
- [x] Actual browser input and screenshot review, low motion/zero flash and resize.
- [x] Independent review, required gates, E production build/package and isolated native checks.
- [x] Private upload/readback and source/build provenance: Build 25565501, private sector-continue-test; public unchanged.
- [x] Exact handoff recorded in docs/steam/arcade-first-light-20260927.md.
- [ ] Disposable cleanup: ownership audited, but automatic approval review rejected removal before execution. Exact remaining paths and 5.24 GiB are recorded in the delivery report; rejection was not bypassed.

Review focus: held/piercing/bomb shots cannot farm targets; event timers cannot run through pause; owned bullets cannot survive scene/mode transitions; all target coordinates match displayed sprites after resize; art readiness or missed encounter never blocks ordinary waves.
