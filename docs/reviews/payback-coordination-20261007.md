# Convoy Payback: make an earned rescue useful

## Scope and evidence

This is a small improvement to the existing Convoy Payback, not another playable contact. The total remains eight of 67 rescue variants; 59 remain. Existing boss motion and fauna candidate work is preserved.

Checkout: D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920. Branch codex/sector-leaderboard-unknown-20260928, HEAD 7e8325e3d9abb09357636bca7e994c0227be02d6, no upstream. Initial state: 63 tracked modifications / 374 untracked individual files. Fetch dry-run succeeded; the advertised remote one-more-run branch was not integrated. No competing local writer, directory/branch/worktree switch, reset, clean, stash, pull, commit or push. The older Goal still reports usageLimited; it has not been resumed or replaced.

The previous two finite-life opening observations found zero useful callback damage: one wing arrived after the side guns were broken; in the other, both guns died before admission. Strong players are allowed to do that. A fixed-step comparison then tested whether a modest timing change could make the existing earned help more useful without withholding kills.

## Implemented locally

- The wing begins its existing 0.8-second flight when the rival has been present for 0.8 seconds, previously 2 seconds. This is an initial tuning hypothesis grounded in the opening observations and real-volley comparisons. The rival's existing entrance takes 1.4 seconds; friendly fire begins after that entrance.
- At admission, the wing commits to the living side gun farthest horizontally from the player. Its existing bracket identifies that gun. This lets the player work on the other side or concentrate fire to finish the marked gun faster.
- Selection uses the existing actual target positions, with a stable tie and a living-gun fallback. It consumes no RNG and does not inspect player health, deaths, score, performance, profile history or purchases. It does not retarget when the player moves later.
- The same two rescued identities, normal initial service, later-rival eligibility, combat-time expiry, once-per-run limit and existing warning/cleanup rules remain. No extra rival is spawned.
- The same finite flight/fire/departure, physical projectiles and 70% maximum damage to one original side gun remain. No core damage, forced kill, invulnerability, health refill, extra reward or achievement bypass. Destroying the marked gun early still ends the attack; a burst kill can prevent it altogether.

Product files: src/game/ArcadeFirstLight.js and src/managers/ArcadeFirstLightDirector.js. Tuning: CONVOY_PAYBACK.rivalAdmissionAge in the model. New focused regression: scripts/check-payback-coordination.mjs. New comparison harness: scripts/measure-payback-opening.mjs. scripts/playtest-opening.mjs adds optional three-frame callback capture. No new player-facing strings or untranslated text; existing localized callouts and audio are reused.

## Measurements and rejected approaches

Evidence root: E:/Codex/builds/nova-swarm/payback-timing-20261007-3e61a904. Same actual Player volleys, actual moving rival targets, 600 fixed simulation steps, bounded target-following movement, no ordinary enemies. Test-only setup earns both rescues and waits out their normal service before the rival. Production progression permissions are all false. These are component integration comparisons, not whole-run performance or fun tests.

| Case | Old wing damage | Earlier arrival alone | Earlier + complementary targeting |
|---|---:|---:|---:|
| Normal / weak rapid / slow hull | 1.092 | 0 | 2.730 |
| Broad hull | 1.638 | 0.546 | 3.276 |
| Precision hull | 0.546 | 0 | 2.184 |
| Ghost / permanent drones / Chain / piercing | 1.092 | 0 | 2.730 |
| Allies alone | 4.368 | 4.368 | 4.368 |

Each side gun starts with 6.24 HP. First ally hit moves from 2.983 to 1.767 seconds after rival creation. Allies alone leave the selected gun at 1.872 HP, the other gun and core intact, with zero victory/reward. Every firing case has actual player damage and exactly one model victory reward; drone case includes 75 actual drone projectiles. Ghost/Chain are enabled through actual powerups, but this fixture does not establish secondary arcs against surrounding enemies.

Earlier arrival alone was **rejected**: it made the wing commit to the same gun the player was already destroying. The coordinated prototype was then implemented in product code. The candidate run uses the actual source with no browser overrides and reproduces the prototype results.

The first harness run is invalid: a mistaken test property player.moveSpeed made its position non-finite, so player shots missed. It was corrected to player.speed; finite position and positive real player damage are asserted. baseline/INVALID.json excludes that run. Use baseline-validated/report.json, hypothesis-08/report.json, hypothesis-08-coordinated/report.json and candidate/report.json. Failed hypotheses are retained as small diagnostic evidence, not successes.

## Verification

- New focused test failed first on the old admission timing, then passed after the change. Covers admission, complementary/stable targeting, invalid/dead-target fallback, no RNG, no retargeting, duplicate rejection, one-gun budget, untouched core, legitimate burst skip and early departure. Also exercises rescues at sectors 1, 51 and 401 and a suspended transition before admission.
- check-encounter-evolution.mjs passed: identity, expiry/reset, modes, Molt compatibility and reward/fragment bounds.
- check-arcade-first-light.mjs and check-first-light-regressions.mjs passed.
- Actual browser check-encounter-evolution-runtime.mjs passed all nine groups: real cover/hull volleys, callback identity and bounded part damage, pause, draft, focus loss, death, actual Pure retry, and Sector 51 Tactical entry with zero score / three augments. Actual callback screenshot inspected.
- check-first-light-continuity.mjs passed 50 checks / zero failures / zero page errors, covering all existing convoy/rival designs and warning/transition presentation. Its first invocation lacked CHECK_OUTPUT_DIR and correctly stopped before browser work; the properly configured E: run passed.
- Fresh check:release-line and check:i18n passed. No new text or save schema. Full build status is recorded below and must be distinguished from the prior boss candidate.
- Self-review of the narrow checkpoint diff found no new score/drop/persistence path, RNG use, attack addition, or change to target collision geometry. Existing Reduced Motion changes decoration, not the horizontal target positions used here.

## Natural run and visual inspection

One new ordinary source-server run used normal damage, three finite lives, keyboard firing/steering and earned Phase; no forced contact, kill, score, invulnerability or skipped sector. It ended naturally in game over after 115.948 wall seconds, sector 2 / score 5638. Zero page/console errors; all production progression permissions remained false. It is not a claim that the opening is balanced or fun.

Convoy arrived at 12.317 run seconds; both pilots rescued by 17.867; initial service finished at 27.851. Rival arrived at 78.952; the wing returned at 79.768, selected the right gun and finished its bounded pass at 83.768 with 4.368 damage. At intermediate samples the player was on the other side while the wing weakened the marked gun. The core stayed protected; the rescue did not guarantee survival. The earlier baseline observations had different inputs/timing and cannot be used as a controlled score/difficulty comparison merely because the seed matched.

Actual natural payback-0.png and payback-2.png inspected: recognizable two fighters beneath the marked right gun, existing callsign line visible, hostile bullets and player remain visible. An ordinary directive-complete notice overlaps the rival's upper hull in the later frame; no new notice was added here. Human checks still need to judge visual competition, first-sighting clarity and sound priorities in combat. natural-01/opening-playthrough.webm is **silent** Playwright evidence, not an audiovisual preview for the user.

## Balance, release and manual checks

This does alter ranked opportunity: an earned wing can contribute more of its existing damage budget before the player destroys a gun, shortening the fight and changing player-versus-ally hit credit opportunities. No scoring formula, budget, reward count, global balance or leaderboard was adjusted. The effect needs human comparison across builds; do not label unchanged formulas as unchanged balance.

Last verified private Steam delivery remains Build25683581 / manifest2117634921635676724. No upload, public promotion, Steamworks setting, forum publication, player reset, purchase or paid audio generation in this continuation. The prior local boss Windows candidate predates this gameplay change. New 20-second fauna recordings remain inactive in the normal catalog; the user's central-artifact complaint is still unidentified, not claimed fixed.

Before private delivery: fresh complete build, compiled/current native tests, matched frame-time tails and authenticated before/after branch/Cloud verification. Human checklist: recognize the rescued pilots without explanation; read which gun they attack; choose whether to finish that gun or work the other; assess third-sighting value; hear hostile cues over the earlier arrival cue; inspect a low-power and a burst run. No automated test establishes fun or premium audiovisual quality.

## Reproduction and rollback

Use the existing checkout and source server http://127.0.0.1:4983. Set process TEMP and TMP to E:/Codex/tmp/payback-timing-20261007-3e61a904, npm_config_cache to E:/dev-cache/npm and NODE_COMPILE_CACHE to an E: cache. Set CHECK_URL to that source URL and CHECK_OUTPUT_DIR to a new owned E: subdirectory for each browser test.

Run node scripts/check-payback-coordination.mjs, node scripts/check-encounter-evolution.mjs, node scripts/check-arcade-first-light.mjs and node scripts/check-first-light-regressions.mjs. Browser checks: node scripts/measure-payback-opening.mjs (leave PAYBACK_ADMISSION_SECONDS and PAYBACK_COORDINATE unset for product verification), node scripts/check-encounter-evolution-runtime.mjs and node scripts/check-first-light-continuity.mjs. Natural observation: set PLAYTEST_PAYBACK_CAPTURE=1, then node scripts/playtest-opening.mjs. All routes are isolated from production progression.

The task-local build-fixed.ps1 runs fresh release-line, asset and complete build:current checks, with verified E: output/cache paths and source hashes before/after. It refuses an existing release-fixed output rather than overwriting a baseline. Build metadata is regenerated by the existing update-build script; original version/sw/header checkpoints are retained.

Narrow rollback command, **dry-run verified, not applied**: git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/payback-timing-20261007-3e61a904/payback-source.patch. For an explicitly requested reversal, remove --check after rechecking against then-current files. It preserves all inherited changes and leaves inert new test/report files. Never reset HEAD to undo this increment.

Retain the validated baseline/candidate measurements, rejected-hypothesis evidence, natural recording/screenshots, new regression/source hashes and narrow rollback checkpoints for review and reproduction. Existing source/comparison servers remain owned by their earlier tasks. Inherited build/temp hold and prior cleanup policy rejection are untouched; no rejected cleanup has been retried through another command.

## Delivery checkpoint, 01:45 Oslo

Build **25765088 / manifest 3743460415809241959** is authenticated on private sector-continue-test. All pending gates in the historical 01:23 checkpoint below passed on this exact payload. Current delivery.json records hashes, package verification, branch/Cloud comparison and performance. Public was already 25683581 before upload and stays unchanged; test-build stays 23782673, unrelated branch/depot metadata and Cloud unchanged. No public promotion/settings changes. Ten-family boss motion and coordinated Payback are active; the 42 twenty-second fauna candidates remain inactive in the unchanged normal catalog.

Current payload passed compiled all-ten firing cases, ten-family boss runtime, all-eight-language UI, controller/Steam bridge, native structure/startup and actual keyboard/gamepad movement/fire/pause. app.asar SHA256 ba8801df5d5d90592c5a5f1aade66132fbe0e9bf92b9fd918f7a56b306d225ad; 15,694 archive files and 4,520 native files verified. Matched compiled conductor/clock render comparisons, both orders, 160 hostile projectile visuals: candidate RAF p99 17.3–17.4 ms versus baseline 16.9–17.5 ms, all CPU/RAF >50 ms counts zero. CPU p99 clock 6.4→8.4 ms forward but 7.4→6.0 reversed; conductor 6.4→5.9 and 7.0→5.4. This is bounded rendering/animation evidence, not a whole-game guarantee. Exact conditions/figures are in performance-forward/report.json and performance-reverse/report.json.

Current job cleanup was rejected before execution, with only `blocked by policy`. No deletion or bypass/escalation occurred. package-source, native-profile and node-compile under E:/Codex/tmp/payback-timing-20261007-3e61a904 remain; cleanup-blocked.json records paths and 225166098432 bytes free. Required release-fixed, win-unpacked, evidence, rollback and server 4986 remain. Inherited output hold preserved. Delivery announced in chat; no delivery email yet, latest sent still 01:19:45 below. Same branch/HEAD, 63 tracked modifications / 377 untracked files. No new text/untranslated strings or costs. Narrow rollback remains dry-run only; manual checks above still apply.

## Complete local build and email checkpoint, 01:23 Oslo

Full build:current succeeded: 1095 modules, Vite 6m42s. Version **v2026-10-07_01-12-16**, entry assets/index-BBvlKTSv.js, SHA256 **74500510ddeec33992d79b53466e93dc966e08bfd36b8256506433f647723b1c**. The post-build checkpoint verified 626 source files and 188 public files. Existing large-chunk/dynamic-import warnings remain visible. public/version.json and public/sw.js were regenerated by the existing build tool; public/_headers remained hash-identical. Output is this job's release-fixed; existing dist junction and previous Windows package are untouched.

Compiled real-volley matrix passed all ten cases including allies-only, with the same damage/part/reward results as the source candidate. The harness now supports PAYBACK_COMPILED=1: it uses the existing isolated native-test bootstrap and actual compiled model/Player constructors, not source module imports. Every production permission remains false. Compiled fixture mode is unranked; source fixture uses ranked mechanics under prototype policy. Evidence: compiled-matrix/report.json. Read-only candidate server is http://127.0.0.1:4986, owned serve-fixed.cjs; the prior 4983/4984/4985 servers are preserved.

This new candidate still needs current Windows packaging/native gates, relevant compiled UI/Steam/controller checks and matched frame-time tails before any upload. Prior boss-only Windows evidence is not mislabeled as proof for this newer payload. No delivery occurred. Final Git state: same branch/HEAD, 63 tracked modifications / 377 untracked files. E: free 232845869056 bytes at this checkpoint. New output remains the required current comparison/delivery candidate; no new superseded build exists. Required logs/checkpoints/media and the continuing job's temporary compiler cache are retained. Inherited cleanup hold and the previous policy-blocked cleanup remain unresolved, with no bypass attempted.

Hourly email **sent and readback verified October7 at01:19:45 Oslo**, personal sender and recipient, message **1a11384150b835dd**, subject “Nova Swarm — status: pilotene hjelper nå der du trenger dem”. A new actual natural-run PNG is attached (877997 bytes); no large video is repeated. At send time the build was still finishing; the email correctly labels it in progress and all changes local. The user was explicitly notified. This job's email-receipt.json and the central fauna-job email-latest.json record the receipt and retain boss/fauna preview references. Do not send another report immediately; next roughly 02:20 unless meaningful new delivery warrants it.
