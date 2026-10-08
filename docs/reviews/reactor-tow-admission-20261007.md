# Reactor Tow: ordinary combat and local admission — 2026-10-07

## What changed

Reactor Tow is now the ninth card in the local normal contact rotation. Eight existing rescue interactions are retained; the ninth is a freight hazard with a relocate-or-cancel decision, not a new rescue. Latest delivered Steam still has eight. Do not count the 42 decorative creatures as encounters.

- Cutting the cheaper coupling shifts one five-shot discharge sideways. Destroying the four-HP vent cancels it. Six total scaled HP, one discharge, full1.4s warning,16 active-second cap and inherited transition/death/retry cleanup.
- Uses an existing contact opportunity, no extra wave/spawn clock. A separate seeded hash inserts it within the first three eligible contact opportunities. Earliest sector3, potentially6/9 if earlier eligible opportunities occurred; unavailable opportunities do not advance the deck. The original eight rescues keep their relative order. This is an initial introduction hypothesis.
- reactor_freight aliases rescue_contact for shared recovery, so labels cannot bypass anti-repeat. All existing mode boundaries remain, including original Sector51 convoy.
- Four preallocated armour quadrants open around the existing core. Cut cables recoil briefly; a vented core visibly cools. No additional asset/network request, per-frame sprite creation, new purchased/generated audio or graphics. Reduced Motion removes oscillation; Flash Intensity scales core brightness. Shared atlas sources survive disposal.

## Observed pressure

Two explicitly substituted opportunities, then one genuinely normal catalog admission, finite lives/damage1.05, actual keyboard/autofire/earned Phase/draft inputs, no granted invulnerability, forced kills/sector skips or production progression:

| Run | Contact start | Result | Ordinary enemies / hostile bullets peak | Lives during contact |
|---|---:|---|---|---|
| Coupler substitution |127.24s|Cut; five shots shifted|10 /17|3→2|
| Vent substitution |133.62s|Vented; zero shots|5 /20|2→2|
| Normal catalog |159.30s|Sector3, cut; five shots, cleanup168.12s|7 /29|2→1|

These are different state/input/timing trajectories despite sharing a seed. They are not a paired survival comparison or proof of fun. The automated steering can move back into a displaced lane. Death source was not instrumented; do not claim a Reactor Tow hit caused or did not cause either life loss. Human first/third-sighting comprehension, meaningful choice and more natural finite-life runs remain.

Scoring opportunity changes: one extra card dilutes rescue opportunities within the same contact frequency, delays later cards, and can add at most five ordinary graze opportunities. Parts add no accuracy, active-damage, kill, XP, drop, Payback, achievement or reward-drone credit. No global scoring compensation or reset. Normal selection changes with this content revision; cosmetic animation does not consume ranked RNG.

## Verification so far

- New admission regression failed before integration, now passes1000 seeded rotations with insertion histogram341/324/335, existing eligibility/recovery/pause/mode/reset/51/deep-sector assertions.
- Reactor model/no-credit and all nine contact models pass; all eight original rescue behavior assertions retained.
- Actual source runtime: nine volley builds, sector3/51/401, pause/draft/major warning/bomb/death/expiry/cleanup pass.
- Eight original rescue runtime groups and50 First Light continuity checks pass.
- New visual lifecycle verifies articulation, static reduced-motion pose, nonzero low-flash warning, bounded child count, no health mutation and shared/owned texture disposal.24 locale/layout cases pass. Initial boundary hypothesis was not a bug: gameplay uses fixed1920×1080 coordinates; targets stayed in bounds at four display layouts. No boundary fix claimed.
- Full build, compiled UI/runtime, matched compiled frame-tail comparison and official input evidence: pending final record below.

## Media

Current isolated actual animation+game-audio preview is under E:/Codex/builds/nova-swarm/reactor-pressure-20261007-6cf834a2/preview-clean. It excludes unrelated ambient pickups only in the capture fixture; ordinary-pressure runs kept normal systems. First capture had distracting bonus pickups and is superseded. No OS overlay in inspected exported frame; this does not resolve the user's earlier unidentified central artifact. Original fauna catalog and20-second candidate hold remain unchanged.

## Reproduce and undo

Source remains D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920, branch codex/sector-leaderboard-unknown-20260928, HEAD7e8325e3d9abb09357636bca7e994c0227be02d6, no upstream. Initial63 modified tracked/388untracked. Existing work preserved, no branch/worktree switch/reset/clean/stash/pull/commit/push. Other tasks idle. Fetch dry-run advertised the separate one-more-run branch; not integrated.

Set TEMP/TMP to E:/Codex/tmp/reactor-pressure-20261007-6cf834a2 and cache npm E:/dev-cache/npm. All parents verified E: and non-reparse; source/node_modules/dist junctions preserved. Use CHECK_URL=http://127.0.0.1:4983, CHECK_OUTPUT_DIR to an owned E: result directory. Pure: node scripts/check-reactor-admission.mjs; node scripts/check-reactor-tow.mjs; node scripts/check-convoy-surprises.mjs. Browser: check-reactor-tow-runtime.mjs, check-reactor-rig.mjs, check-reactor-tow-layouts.mjs. Natural: REACTOR_NATURAL=1 REACTOR_CHOICE=coupler then node scripts/playtest-reactor-pressure.mjs. The natural URL uses progression-disabled encounterEvolution=natural. Debug route reactor-tow is DEV/loopback only.

Owned build: E:/Codex/builds/nova-swarm/reactor-pressure-20261007-6cf834a2/release-fixed. Existing previous local release-fixed is the explicit active comparison baseline. Current source hashes and build recipe stored in this job; native packaging/upload not performed.

Narrow product rollback dry-run passed (not applied): git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/reactor-pressure-20261007-6cf834a2/reactor-admission.patch. Five product files only, preserves inherited prototype/boss/Payback/notice work. Actual reversal only after explicit instruction and a fresh check. Tests/docs would also need corresponding expectation changes; never reset HEAD.

No new untranslated text. Existing unrelated Chinese directive SPEED UP remains outside this change. No Steamworks, public, Cloud, forum, player-data or save-schema changes. Native checks and authenticated before/after branch/Cloud checks remain required before delivery. No purchases/generation charges. The old Goal still reports usageLimited; ordinary authorized sprint work does not change that.

## Review checkpoint

Serial self-review against the requesting-code-review checklist (the user's self-review/no-concurrent-agent instruction takes precedence over that skill's delegation step): checked catalog dependency direction, shared-family alias both readiness/recording, health/reward ownership, ordinary and Sector51 eligibility, exactly-once bullets, no cosmetic RNG calls, visual preallocation/disposal, accessibility, and source/production test policy. No blocking product issue found in that review; human balance/audio judgment and native release work remain. Before-state and narrow patch preserve existing edits.

The first compiled performance harness attempt failed because its boss bootstrap still held the spawning guard, leaving the contact null. Test setup corrected, no product fix attributed. An initial edit-script syntax error and newline anchor mismatch were caught before/at bounded edits and resolved; no lost inherited work. The first natural/pressure reports are retained as observed, including life losses.

## Final local verification — 04:10 Oslo

Complete web build v2026-10-07_03-47-09,1098modules,7m29s. Entry assets/index-CvqV46Wf.js SHA2566eb60baa4158358af87ffff42dda4fe7359d332d31b0cd458058e56075f21e2c.629source/188public hashes freshly verified04:06:17. Full compiled nine-volley/3/51/401/lifecycle tests and eight-language UI pass with no console/page errors or covered text leaks. Actual source keyboard-input screenshot inspected; its long-running source server retains an older build label, so do not call that image native/compiled evidence. Actual browser blur releases fire, holds the event, resumes correctly; Pure retry destroys the old director and resets sector/score/ordinal/Payback.

Final compiled A/B/B/A against previous local web candidate, same Chrome/phase/background/160bullets: baseline CPU p99 5.9/7.4ms, candidate6.1/6.3ms; baseline RAF p99 17.3/17.2ms, candidate17.3/17.3ms. No CPU or RAF samples above50ms, no entity/HP/score change. Comparable bounded tails, no universal optimization claim. Two failed measurement starts were incomplete boss-bootstrap state in the harness (spawning guard, then wave state); corrected to the same ordinary-wave fixture already verified by compiled mechanics tests. No game change attributed to these harness errors.

Actual27.622833s H.264960×594/AAC48kHz stereo video fully decoded;2,898,648bytes, SHA25649ffaa630982e7b9f329f7b243b1bf9ff2e5427dc0fd95bd50c7efb57e3dfa0e. Mean-38.4dBFS/peak-19.3dBFS, no clipping; human combat-mix judgment remains. Source/compiled reactor shots, natural pressure, German Settings/portrait and exported clean video frame inspected.

Status/preview email SENT and full readback verified04:10:05Oslo, message1a1142009d54ae4f, personal sender/recipient; exact video attachment bytes verified. User explicitly notified. Next report around05:10, check Sent and central receipt first. Nine of67 playable contacts locally verified,58unimplemented; Steam still eight/59notdelivered. No native package/upload this increment.

Cleanup: owned read-only servers4989/PID23356 and restarted baseline4988/PID37264 stopped and confirmed. Automatic policy rejected the cleanup command before execution with only blocked by policy; no more specific reason/reviewer. No deletion, retry/bypass/escalation. Remain: E:/Codex/builds/nova-swarm/reactor-pressure-20261007-6cf834a2/preview (superseded cluttered capture), E:/Codex/tmp/reactor-pressure-20261007-6cf834a2/node-compile and node-compile-cache. Current release-fixed, preview-clean and reproducibility/QA retained. Every inherited path preserved. Cleanup receipt in job root. Final free-space check recorded in HANDOFF.

Product files changed this continuation: src/config/ConvoySurpriseCatalog.js, src/config/EncounterPacing.js, src/game/ReactorTow.js, src/effects/ReactorTowVisual.js, src/effects/ConvoySurpriseVisual.js. Updated model/rescue runtime/build/localization/capture test expectations, added pressure/admission/bounds/rig/focus-retry/compiled-comparison scripts. No new player-facing strings. Final Git63modified tracked/395untracked, samebranch/HEAD/no upstream.
