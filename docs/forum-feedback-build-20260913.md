# Forum feedback repair — 13 September 2026

Source: D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822, branch `codex/space-snake-broods-20260912`. Verified baseline `4663de24b5f04a24d72d88db1220aca77a92dc6b`, milestone `milestone/2026-09-13-encounter-brood-expansion`. Inherited source/assets/evidence preserved. No reset, clean, stash, discard, merge, or remote source push. User approved proposal items 1–5 and later authorized a private Steam test upload. Public posting/release remains unapproved.

## Changes

1. **Achievements, Bombs and results.** Eligible Mayhem finalization reconciles earned ranks even without a new rank crossing; startup recovery requires previous earned awards, an award receipt or the signed-in player's accepted Steam result. Ordinary fire no longer queues saved Bombs. Special Fire retains that role, including Orbital Fusion. Optional results/placement queries and Sector Run submission have bounded waits, with existing failure/retry presentation.
2. **Encounters.** Double-boss health multipliers changed from 2 + 2 to 1.45 + 1.25. Regular attack interval inflation reduced from 1.15 to 1.05. Snake sections have 80% of prior health; the initial head multiplier is 1.25 instead of 2. Snakes slow briefly while committing to a shot, have a lower eligible-wave chance and two intervening eligible-wave opportunities before another normal snake roll. Combined snake duration is bounded at 45 seconds. Broods, warnings, score policy and attack caps remain present.
3. **Readability/navigation.** Continuous world motion across boss transitions; spent lane guides clear behind the actual traveling hazard. Tractor notices use the top and active tractors defer intrusive notices. Hangar mode focus has a strong foreground border. Play remembers the last supported launch mode, defaults new pilots to Tactical, and checks locked-mode availability. Older experimental launch uses the saved valid unlocked hull. The four disputed pickup illustrations were inspected at actual scale; Rail Surge is distinct, while the three detailed circular icons still merit a future art review. Their approved illustrations were preserved; no primitive replacement was reintroduced.
4. **Rift/Chain.** Rift leads moving targets using measured velocity and a bounded intercept; the five-shard cap is preserved. A reproduced Chain interaction could hit three attached components of one Veilborn in one chain. It now visits the shared creature once, while retaining jumps between separate enemies.
5. **Sound/rewards.** Creature bus gain reduced by 6 dB, harsh midrange softened, hunt repetition limited to nine seconds, pause ducking honored. A snake's death sound stays attached to its lifecycle, and late death decodes are rejected. Existing authored recordings/music retained. Escaping drones/cores shrink into a blue shimmer; the hazardous collider shrinks with its body. Core collection can renew a live combo timer but cannot start or raise a combo.

## Tyrian — actual status

Public profile `tyrianmollusk`, SteamID64 `76561198231493012`, displayed Rank 28 **Rank Up: Redline Ghost**, API ID `ACH_RANK_27`. Earlier rank achievements were unlocked; this one remained locked. The user approved temporarily enabling publisher General access to award only that achievement. Steam rejected the write with result 8 / failed validation; readback stayed locked. All four publisher key permissions were disabled and verified after reload. The newly created inactive key remains. No secret was written to evidence or source.

Steamworks defines this as a Client achievement. The build contains a narrowly scoped native correction for the exact account/app/achievement, verified with mock account and app mismatches and repeated/concurrent requests. **The real award has not been delivered yet: Tyrian must launch a build containing this correction with Steam online.** Do not claim that the publisher API succeeded.

## Verification and limits

Passed source release-line, production guard chain/build:current, i18n text checks, all eight language UI checks (no page errors, placeholder hits or detected English leaks), controller navigation, Steam bridge contract, focused five-mode rank/Bomb/timeout/backdrop/launch runtime checks, evidence and exact-account recovery policy checks, 64 creature audio identities/lifecycle, all 14 brood families, core/snake policy, four Tactical fusions including Orbital Fusion, Graze Break, results flows, and 30 Colossus family/phase exposure/safe-corridor cases.

Fixed test expectations that predated approved behavior: visible wing drones are above the hull, Play remembers mode, an outside-top-50 fixture needs 60 prior scores, and Graze clearing is checked against the five seeded bullets rather than unrelated new enemy fire. Initial startup timeouts and failed-attempt receipts are retained; final results above are separate. The skill's Playwright client ran movement/fire bursts with text-state output and inspected composited screenshots; raw WebGL canvas readback was black and was not counted as visual proof.

Matched double-boss probe: 43.83s before, 35.79s candidate, with both opponents attacking. Eight isolated loadout probes (Sparrow/Skater; Pure/Tactical; plain/Chain or Pierce+Chain) completed in 15.70–55.29s, with 6.02–20.10s overlap, 27–85 incoming projectiles and zero page errors. They use an invulnerable automated offense pilot. Off-axis time is a horizontal alignment proxy, not a human measure of opportunity; zero combo breaks in this fixture does not establish late-run combo quality. Most matrix cases are sector 30. A separate late Phase Seraph check is recorded in the delivery receipt.

The exact reported long human run/results hang has not been reproduced. Human balance, actual controller hardware, perceptual listening alongside music, and Tyrian's real Steam receipt remain player checks. No new player-facing strings or untranslated fallbacks were added. Existing proper-name/technical-label allowances remain; automated localization checks do not certify all historical text or replace human QA.

## Exact player checklist

Use Steam Properties → Betas → `sector-continue-test`, update, and verify the menu shows **v2026-09-13_13-28-12**.

1. Start Mayhem Pure, quit to menu, and relaunch Play: it must retain Pure and the selected hull. Repeat Tactical; restart the game and check persistence. In Hangar use arrows/stick and confirm the white outline follows every mode. Locked modes must stay locked.
2. Collect Bomb, hold/release/resume ordinary fire, pause/resume, and lose focus/return. Stock must remain. Press Special Fire (default E, right mouse, controller X) with a valid target: one Bomb should fire. Repeat with Orbital Fusion; Graze Break must still prime on release and fire on the next ordinary volley.
3. Compare a slower hull with a fast hull, in Pure and Tactical. Play ordinary snake waves, double bosses after sector 20, boss/snake overlap after sector 30, and late Overrun with Phase Seraph. Look for usable chances to reach the head and attack, fewer drawn-out chases, and remaining danger. Note sector, hull, powers, approximate duration and any lost combo during unavoidable waiting.
4. Use Rift on crossing/retreating snakes and change/kill its target mid-fight. Shards should lead useful targets without shooting off-screen. Use Chain on multipart Veilborn, then a normal formation: one creature should resist the repeated component cascade while separate targets still chain.
5. Watch tractor encounters for obstructing messages, boss entry/exit for planet jumps, and traveling fire lanes for guides lingering after the tail passes. Let a drone/core escape, then destroy/collect another: departures should look different. Collect a core during an active combo, and again from zero: only the active timer should renew.
6. At your normal music/SFX settings, compare creature arrival, hunt, attack and death sounds. Pause during a call; kill/retreat a snake and enter the next wave. Listen for harshness, excessive repetition, voice/music masking, and a delayed death cue sounding like a new enemy.
7. End a ranked run online, then with Steam offline/temporarily disconnected. Submission or failure/retry should finish; Menu/Hangar/Run Again must remain usable. Confirm earned rank achievements persist across restart. Tyrian specifically needs to run the updated build online and check Redline Ghost both in-game and on Steam.

## Delivery and preservation

Build and QA root: `E:\Codex\builds\nova-swarm\forum-feedback-20260913`. Temporary root: `E:\Codex\tmp\nova-forum-feedback-20260913`; tool caches on E. Retain the final Windows package, small provenance receipts and QA evidence. Preserve the existing `snake-broods` comparison package. Final package/native/upload/cleanup receipt is appended after delivery.

Before upload, Steamworks was freshly verified: default and sector-continue-test both **25274613**, test-build **23782673**. Upload target is private sector-continue-test only. Rollback is to reassign private branch to 25274613 in Steamworks; source rollback is `git revert b53a036` after reconciling any later changes. Never use reset/clean for rollback. No public release or forum publication is authorized.

## Frozen Windows package

Runtime commit **b53a036**, version **v2026-09-13_13-28-12**. The packaging receipt verified all 15,435 retained baseline archive files and all eight replaced/new files, including the native achievement bridge. All 64 identified player/showcase assets match the preserved comparison package. Archive size 2,339,955,352 bytes; SHA-256 `5bb1bf4378f355cf2d884323832f611c1c864d76a8bcb0790f687c43b97ca203`. Later documentation/test-path changes do not change this runtime.

Native package runtime/dependency checks and keyboard/controller movement, firing and pause pass. Initial native smoke reached the correct menu/build without console errors but failed its online gate because Steam was closed. After starting Steam, a separate native smoke passed with actual leaderboard and achievement bridges available. User data was isolated under the QA output directory.

Native 20-baby Grave brood spawn/attack/disposal checks pass, with the actual NVIDIA RTX 2060 renderer and inspected menu/combat screenshots. An initial run alongside other checks recorded combat p95 66.8ms/max 816.3ms. The isolated repeat recorded startup p95 17.0ms/max 17.4ms, combat p95 16.9ms/p99 17.4ms/max 150.1ms over 300 frames. These short probes do not establish sustained late-game performance; both receipts remain available. The separate sector-70 Phase Seraph + snake Pure fixture completed in 32.60s, with 11.98s overlap, 70 incoming projectiles, four boss volleys, nine snake-head volleys, and no page errors.

The unchanged full `npm run smoke` passes against the complete frozen production content: menu, Settings/audio telemetry, credits, gameplay/powerups, gamepad, pause, Cabinet Log, results/return, mobile, level three, wave transition, boss and victory. It reports zero blocking issues, page errors, console warnings/errors or failed asset requests. Earlier source-menu and contended production-autostart timeouts remain recorded; the successful isolated run is `qa/production-smoke-isolated/report.json`.

Visual inspection caught a flaw in the localization harness: its first Settings captures could show the loading overlay even though translated controls already existed underneath. The test now requires the actual loading screen to be hidden before opening Settings. The original automated snapshots remain useful, but their early Settings screenshots are not counted as visual proof; corrected captures are under `qa/i18n-production`.

The corrected production localization run passed all eight languages and all 80 captures, with no detected English leaks, placeholders, page errors or console errors. Actual Chinese/Japanese Settings and German pause/Chinese results were inspected. No new untranslated text was introduced. Native smoke/control tests validate the final packaged executable instead of running `desktop:smoke:current` against an older D: dist directory.

## Forum staging

The seven recent external posts in Feedback & Suggestions are covered by a quoted follow-up staged in the existing discussion reply box. The eighth recent external post is the trailer/announcement feedback; the owner's earlier staged response is now publicly visible as announcement reply #2, so no duplicate was added. The earlier feedback proposal is also publicly visible as developer comment #139. Neither was published by this implementation pass. Original review/reply drafts remain intact.

The separate new-topic form contains **Next Nova Swarm build: feedback fixes and encounter tuning**, matching `docs/steam/drafts/forum-new-build-20260913.txt`, ending with **I hope to have this build live within 24 hours.** The new topic and the new quoted follow-up remain unpublished. The detailed local follow-up is `docs/steam/drafts/forum-feedback-replies-build-20260913.txt`; the browser has a shorter version covering the same seven comments.

## Steam delivery — verified

**BuildID 25282423**, depot **4765071**, manifest **6968141716315948594**, uploaded 13 September 2026 at 13:54 CEST. The release-line check passed immediately before VDF generation and again before upload. SteamCMD used its existing cached account sign-in, returned success, and Steamworks was reloaded to verify the actual branch assignments:

- `sector-continue-test`: **25282423** (this package, runtime b53a036).
- `default`: **25274613**, unchanged.
- `test-build`: **23782673**, unchanged.

SteamPipe compared all 5,134 payload files with the previous manifest: only `resources/app.asar` changed (15.73 MB of changed chunks); zero files were added or removed. Build/depot upload logs and the exact VDF are retained on E. This is a private test deployment, not a public release. Steamworks was touched for this authorized upload and the separately authorized temporary achievement API attempt; all publisher key permissions are off again. No achievement schema, Cloud configuration, store settings or public post was changed in this pass.

The live native check confirms Steam integration for the developer account, not delivery of Tyrian's award. Tyrian's exact-account correction requires him to launch the new build online; his final receipt remains outstanding.

## Final cleanup and source record

Removed this job's package extraction, intermediate browser bundle, disposable native profiles, temporary files and dedicated Vite cache after verifying exact E: paths, absence of reparse points and absence of active task processes. Removed file content totals 2,575,019,413 bytes; E: free space after cleanup is 224,346,243,072 bytes (about 209 GiB). No cleanup is outstanding. Shared SteamCMD/npm/Playwright caches were preserved; SteamCMD produced only small upload logs/VDF in this job's output directory. The final Windows package, all unique test evidence (including failed probes), small reproduction helpers, upload receipts and inherited comparison package remain.

The machine-readable `docs/forum-feedback-delivery-20260913.json` records the exact changed-file list, package hash, source baseline, Steam branch readback and cleanup paths. Runtime source remains b53a036; the follow-up source record changes documentation and QA path/readiness handling only. All source changes are committed; inherited untracked work remains present and is intentionally not imported, so the checkout is not described as globally clean.
