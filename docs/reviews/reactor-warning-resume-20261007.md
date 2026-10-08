# Reactor warning recovery — October 7, 2026, 09:58 Oslo

## Confirmed defect and bounded local repair

The main build remains blocked by the E: access failure recorded in HANDOFF. This independent source investigation found a warning-recovery defect in Reactor Tow. It is a repair to the ninth contact, not another encounter or a new delivery.

`PlayScene.update` calls `firstLightDirector.syncVisibility()` before its pause, Tactical draft and Onslaught milestone returns. Those returns skip the director's normal combat update. Visibility handling stopped the contact sound group, but only Counterweight reset its warning. Reactor Tow retained both a nearly complete warning and its "already cued" flag. Resuming could immediately discharge without another charge cue.

The source regression reproduced all three interruptions with 0.01 seconds left in the reactor warning. Before repair, each produced five premature bullets and only the original charge request. Tool chunk `75ce1a` records the failing assertion and values: `cleared=false`, `earlyShots=5`, `chargePlays=1`.

The repair reuses `updateReactorTow(..., 0, {safe:false})` at the existing interruption boundary and resets the stopped cue flag. Its full 1.4-second visual lead-in restarts. Health, lifetime, shot count, projectile ownership and reward formulas are unchanged.

A second concrete contract check found that both machinery contacts treated a rejected sound request as played. The actual AudioManager returns false during the charge sound's 350ms cooldown. A quick pause could therefore still suppress the restarted cue. The regression failed on `reactor: rejected cue must remain retryable` (chunk `651502`). Both callers now remember a cue only when playSfx does not return false; they can retry during the bounded warning phase. Existing cooldown, mute and priority rules are respected, with no force option. A successful cue is not repeated each frame.

## Verification and its limits

New `scripts/check-contact-warning-resume.mjs` evaluates the actual director source with actual Reactor/Counterweight/FirstLight models, following the project's existing isolated audio/combo testing pattern. Only browser rendering, media playback and bullet transport are stubs. It writes no files, network requests, profile data or caches. It does not establish actual decoding, audible mix, browser focus behavior or frame-time performance.

After repair:

- Pause, draft and milestone: zero shots through 1.39 seconds after resume, one five-shot discharge after the full warning, no repeated discharge.
- A new charge request is issued, health is unchanged and no rescue/reward is introduced.
- A refused cue stays retryable; subsequent acceptance produces one successful request, without duplicates. Both machinery contacts are covered.
- Counterweight retains its existing full pause warning; an already spent reactor stays spent.
- Existing Reactor, Counterweight eight-group and encounter-evolution model tests pass. Director syntax passes.

Final source-regression pass is tool chunk `bebf7f`; narrow rollback dry-run passes in `dee02a`. No browser/build/native/Steam test was attempted under the known E: blocker. Existing compiled builds predate this change. Before packaging, repeat actual pause/blur/draft tests with audible playback, including quick pause/resume and muted sound, then all pending compiled/frame-time/native gates.

Reproduce the source test from the established checkout, with compile cache disabled and the established E: TEMP/TMP variables. No output directory is needed:

```powershell
$env:TEMP='E:/Codex/tmp/counterweight-pressure-20261007-53fbe286'
$env:TMP=$env:TEMP
$env:NODE_DISABLE_COMPILE_CACHE='1'
node scripts/check-contact-warning-resume.mjs
node scripts/check-reactor-tow.mjs
node scripts/check-counterweight.mjs
node scripts/check-encounter-evolution.mjs
node --check src/managers/ArcadeFirstLightDirector.js
```

## State, balance and rollback

Only product file changed this continuation: `src/managers/ArcadeFirstLightDirector.js`. Added the regression, this review and `docs/reviews/reactor-warning-resume.patch`; updated HANDOFF, sprint review and progress. No player-facing text or new asset. Existing unrelated Chinese SPEED UP and German menu padding remain. No new translations, spending, generation, persistence or gameplay RNG.

This intentionally changes post-interruption reaction time: the player receives the full warning again. The original five-shot maximum, six-scaled-HP budget and zero component-credit rules remain; the prior bounded graze-opportunity caveat still applies. No scoring compensation or reset.

Same repository `D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920`, branch `codex/sector-leaderboard-unknown-20260928`, HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`, no upstream. No new remote-freshness claim. Director SHA256 before `0da851df59edbea5b0ebb9bba3232e24d5070fc4d29d0c1c22f0db73c98e73f0`, after `a53912822b0ca85f916f9c0bccd66de77f91e67e7262c034787ba3efbb480ee2`.

Narrow product rollback dry-run passed; never applied:

```powershell
git apply --reverse --check --ignore-space-change docs/reviews/reactor-warning-resume.patch
```

Actual reversal requires an explicit request and fresh check. It reverses only this repair while preserving the inherited Counterweight admission/arrival work; the regression is retained as evidence and would correctly fail against the old defect.

No Steam upload, public/Cloud/Steamworks changes, email, player reset or Git publication. Latest historically authenticated delivery remains Build25765088 / manifest3743460415809241959; last verified email04:10:05 /1a1142009d54ae4f. Their E: receipts could not be freshly re-read under the known access restriction, and denied operations were not retried through another route. Nine local completed contact milestones, eight delivered; Counterweight is still pending final admission/build verification, with58 awaiting completion in total.

No disposable outputs were created this continuation. Existing E: jobs/TEMP/caches and held/denied paths remain untouched; prior cleanup/free-space verification remains incomplete. No claim that the lost natural-run process ended cleanly. Old Goal remains last-known usageLimited; no attempt to override it.
