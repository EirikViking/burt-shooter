# Feedback week delivery, 27 September 2026

## Status

Implemented and delivered to private sector-continue-test as BuildID25564137. No public release was made. Validation limits and blocked cleanup are recorded below.

The user published all staged forum replies. No further forum post or edit was made by this task. Only the private sector-continue-test branch is authorized for delivery; the public branch and Steamworks configuration remain outside scope.

## Source provenance

- Workspace: D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920
- Branch: codex/feedback-week-20260927
- Baseline: 60c7f76bef28cee7c1a719459630289f216ebb18
- Packaged source: e22f0e1 (game payload unchanged by later test/documentation commits)
- Build version: v2026-09-27_20-24-58
- Remote: https://github.com/EirikViking/burt-shooter.git
- Baseline fetch succeeded, ahead1191 and behind0 relative to origin/HEAD. No pull, push, reset, stash, history rewrite or Forum129 source edits.
- Inherited D node_modules and dist junctions were preserved. Packaging uses a real isolated E source/dependency copy.

## Changes and causes

| Area | Cause or finding | Delivered response |
| --- | --- | --- |
| Boss input continuity | Boss transition reset held focus until release | Preserve focus across intentional transitions, retaining blur and release safety |
| Extra Shot and support upgrades | Fractional scaling rounded promised counts; clipped capacity still penalized damage; timed support could outlive its slot | Whole counts, eight-shot damage cap, original volley envelope, actual drone/chain reconciliation |
| Draft choice quality | Third levels suppressed while unseen cards remained; capped offers could qualify through an already owned fusion | Useful upgrade lane, recent-offer diversity, real new-fusion exception, effective normal-play support caps; Daily seeded policy retained |
| Defensive upgrades | Impact Foam lost its bonus during forceRespawn; short Ghost windows offered weak benefit | Respawn bonus applied once, Ghost1.5/3/4.5s; verified primary fire remains available during Point Defense |
| Serpent Duel | Final-run totals could hide a legitimate earlier kill; incomplete legacy summaries could fabricate eligibility | Complete defeat event records losses at the kill; zero/one qualifies, two does not; later deaths preserve earned progress; unknown legacy evidence grants nothing new; existing unlocks retained |
| Settings preservation | Prior partial-save defaults could replace absent settings; preservation fix b5a0e23 was already in the verified baseline | Achievement-only and partial Cloud updates preserve preferences; missing legacy Cloud settings retain local preferences. Tyrian's unspecified reset was not reproduced |
| Collection persistence | Electron Cloud sanitizer discarded Onslaught run evidence | Shared normalized evidence and monotonic saved-unlock merge |
| Collection screen | Async reopen could attach stale duplicate backdrop layers; rank milestones crowded task achievements | Generation guard, Challenges/Pilot Ranks/All groups, counted starter hulls and custom loadout combinations in all locales |
| Sector leaderboard | Installed wrapper decoded native detail arrays incorrectly | Raw detail decoding for Sector and Onslaught, correct101 to147 presentation; missing legacy range stays unknown |
| Snake pacing | Frequent waves and extra health factor prolonged encounters |16% to12% wave roll, preserved separation, removed1.35 health multiplier, segment damage trails |
| Orphan brood cleanup | Departing babies still participated in objectives/contact/rewards | Immediate departure guards and verified two-second disposal |
| Encounter variety | Repeated snake pressure, passive challenge targets | More room for swarm waves, Mystery gaps3–5 eligible sectors, five distinct moving challenge formations, reinforcement exclusion during challenges |
| Late lives | Multiple pickup/repair paths bypassed late-loop policy | Shared sector100 cutoff with trusted carried-pickup provenance and deliberate Tactical repair exception |
| Boss variety | Onslaught pool depended on prior reveal progression; finish armor paused mature attacks | Full seeded50-boss bag from51, distinct guests, authored secondary patterns, armor preserves damage without pausing mature attacks |
| Paired bosses | Separation correction could displace telegraphed positions | Bounds before speed limiting; fixed warning geometry through partner arrival/departure |
| Flame and tractor | Stretched texture endpoints, dim flame body/white tip, dense clouds | Stable flame mapping and warm textured body; subdued tractor field with visible source and flash-zero safety guide floors |
| Friendly shots and shards | White Pierce marker and pulsating friendly graphics harmed readability | Compact colored steady Pierce; Rift Shards alone get a larger core and longer tail |
| Repeated sounds and speech | Wing-hit override bypassed quiet catalog mix; independent voice groups overlapped | Quiet throttled hit cue, global voice admission, protected warning priority, exactly-once cancellation/completion |

## Decisions supported by investigation

- Quasar Fan is outside the five Small Wings starter hulls. The UI now names the qualifying hulls. Same Hull accepts different overlapping custom triples, not only presets.
- No separate Point Defense firing defect or sector143 speed discontinuity was established. Existing speed caps remain. Actual volley/cadence checks cover Point Defense.
- Active adult snakes remain objectives; allowing a full fresh wave during that encounter was rejected for readability. Departing juveniles no longer delay progression.
- Chain/Pierce damage and score formulas were not broadly rewritten. Shorter snake fights and useful shot/upgrade interactions improve alternatives while preserving existing records.
- No new separate hard-mode leaderboard or fleet-wide stat rewrite. Later boss variation and tighter original weapon envelopes address the reviewed interactions within existing modes.
- Genre research informed weapon identity, meaningful choices, clear warnings and replay pacing. It does not prove retention, sales or best-in-genre outcomes.

## Verification

Focused regressions cover actual gameplay paths and isolated synthetic storage. No real player save, achievement or score was modified by testing.

- Build:current passed its complete prerequisite suite and production compilation,1044 modules. Existing bundle-size advisory remains.
- check:i18n plus Onslaught localization passed,8 locales. New collection labels cover all15 starting augments in8 locales, and all100 card descriptions fit in8 locales. No new fallback TODOs. Inherited First Ranked Run romanization in Chinese/Japanese and unchanged English achievement titles remain; they were not introduced by this patch.
- Native bridge contract, Cloud save, profile isolation, pending queue and leaderboard reliability passed. Explicit rejection, offline restart, acceptance followed by read failure, rate limits and account switching remain covered.
- Serpent event0/1/2 losses, partial/repeated defeats, later death, voluntary exit, Cloud/reload, final collection cascade and legacy unknown evidence passed. The newly found legacy case failed before its fix.
-400 independently reviewed Draft scenarios retained meaningful third levels and excluded ineffective capped choices. Recorded Daily seed unchanged.
- Actual boss runtime21 checks passed with zero page errors;1200 paired frames respected movement cap and separation.
- Actual challenge/snake/life runtime cases passed in both Onslaught modes, including100/101/143 boundaries and real orphan sprite disposal.
- Voice admission/lifecycle20 deterministic cases passed. This validates routing and completion, not a subjective listening survey.
- Visual inspection covers compact friendly bullets, Rift Shards, flame travel/repeat and flash-zero guides. Tractor field tested with72 actual hostile bullets in normal/reduced-motion/flash-zero settings on a controlled background.
- Production browser smoke passed, zero failures, page errors, warning/errors or bad responses.

- Required eight-language UI screens passed after the final text layout fix, with no page errors, placeholders, detected English leakage or overlaps in reviewed surfaces. Separate card-bound checks passed for all100 achievements in8 locales.
- Packaged launch smoke passed on e22f0e1 with a fresh isolated profile and Steam disabled. Packaged display tests passed windowed/fullscreen/borderless transitions, cursor state and saved window/display preferences after relaunch. They do not establish separate exclusive fullscreen behavior.
- The inherited packaged control harness failed its pause/gamepad checks because it did not establish active native input before injecting controls. Its repeated key overrides could mask the reset path for movement/fire. The old report lacks contemporaneous focus diagnostics, so the precise host focus change cannot be reconstructed. A new external test on the unchanged package passed31/31 checks: inactive input suppression, ordinary release recovery, real renderer keyboard movement/fire/pause/resume and simulated gamepad movement/fire/pause/resume without held-button retrigger. Test-only commit9981cc8 preserves the script. Physical focus/controller/overlay checks remain separate.
- Packaged performance smoke passed:12 samples over64 seconds, minimum59.52 FPS, average59.91 FPS, zero warnings/errors. This is an early gameplay smoke, not proof of every late-game load.
- Settings regressions cover flash intensity, reduced motion, UI volume, tactical voice choice, keyboard bindings, display and menu preferences; achievement-only and partial updates, and legacy missing-setting restoration. The packaged display test additionally verifies a real isolated restart. Tyrian's exact settings reset remains unidentified rather than claimed resolved.

## Remaining live validation boundaries

Serpent Duel now describes and records life losses by the completed snake defeat. Steamworks achievement description text was neither reverified nor updated during this task. Any mismatch requires a separately authorized metadata update. The existing published-ID configuration was retained; this task does not claim new live achievement award verification.

Mock acceptance and decoding do not prove a real Steam upload or award for a genuine player run. This task does not write synthetic scores or unlock real achievements to test that. Physical controller feel, long-session balance, real Steam Overlay/recording and subjective audio comfort require normal player testing where automated evidence is incomplete.

## Cleanup exceptions

Automatic approval review rejected deletion of the following earlier task-owned artifacts. No workaround or retry was attempted:

- D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920/test-results/steam-leaderboard-mock-2026-09-27T16-56-56-413Z
- E:/Codex/tmp/nova-feedback-week/review-encounters/node-cache
- E:/Codex/tmp/nova-feedback-week/review-encounters/survey.json
- E:/Codex/tmp/nova-feedback-week/review-encounters/progress.log
- E:/Codex/tmp/nova-feedback-week/review-encounters/chrome_chrome_url_fetcher_32324_1094640845

- E:/Codex/tmp/nova-feedback-week/packaged-controls-regression/profile

The invalid earlier stale-dist browser runs are excluded from evidence. The final broader cleanup was also rejected, as recorded in Final cleanup outcome.

Additional blocked D test outputs: voice-cadence-2026-09-27T17-51-00-985Z, menu-voice-overlap-2026-09-27T17-51-40-888Z, and colossus-balance, all under the same repository test-results directory. Exact deletion was rejected by automatic approval review; these remain excluded from validation and packaging.

## Rollback

Source rollback without rewriting history, from this branch and a clean worktree:

```powershell
git revert --no-commit 60c7f76..e22f0e1
git commit -m "Revert feedback week gameplay changes"
```

Private Steam rollback target before this task: BuildID25523055. Public/default observed before delivery:25511386. Do not promote a build publicly as part of this task.

## Exact changed files

- `docs/steam/drafts/20260927-feedback-reply.txt`
- `docs/steam/drafts/20260927-next-focus-reply.txt`
- `docs/steam/drafts/20260927-onslaught-reply.txt`
- `docs/steam/drafts/20260927-review-index.md`
- `docs/superpowers/plans/2026-09-27-feedback-week-ledger.md`
- `docs/superpowers/plans/2026-09-27-feedback-week.md`
- `docs/superpowers/specs/2026-09-27-feedback-week-design.md`
- `electron/onslaughtAchievementEvidence.cjs`
- `electron/steamCloudSave.cjs`
- `electron/steamLeaderboardBridge.cjs`
- `package.json`
- `scripts/check-packaged-controls-isolated.mjs`
- `scripts/check-achievement-collections.mjs`
- `scripts/check-achievement-localized-layout.mjs`
- `scripts/check-boss-warning-lifecycle.mjs`
- `scripts/check-challenge-flight.mjs`
- `scripts/check-draft-integer-effects.mjs`
- `scripts/check-draft-runtime-overlap.mjs`
- `scripts/check-encounter-pacing.mjs`
- `scripts/check-feedback-audio.mjs`
- `scripts/check-feedback-boss-runtime.cjs`
- `scripts/check-feedback-bosses.mjs`
- `scripts/check-feedback-encounter-runtime.cjs`
- `scripts/check-feedback-encounters.mjs`
- `scripts/check-feedback-visuals.mjs`
- `scripts/check-focus-lens-spread.mjs`
- `scripts/check-hijacker-voice-exclusivity.mjs`
- `scripts/check-input-state-transitions.mjs`
- `scripts/check-life-grant-policy.mjs`
- `scripts/check-onslaught-achievement-browser.mjs`
- `scripts/check-onslaught-achievements.mjs`
- `scripts/check-onslaught-snake-evidence.mjs`
- `scripts/check-onslaught-steam-details-read.mjs`
- `scripts/check-steam-cloud-save.mjs`
- `scripts/check-super-extra-life-powerup.mjs`
- `scripts/check-tactical-draft.mjs`
- `scripts/check-tactical-warning-voice.mjs`
- `scripts/check-useful-draft.mjs`
- `src/achievements/AchievementManager.js`
- `src/achievements/OnslaughtAchievementDefinitions.js`
- `src/achievements/OnslaughtAchievementProgress.js`
- `src/audio/AudioManager.js`
- `src/audio/MysteryAnnouncer.js`
- `src/audio/SoundCatalog.js`
- `src/config/BossRoster.js`
- `src/config/ChallengeFlights.js`
- `src/config/EncounterPacing.js`
- `src/config/SpaceSnakes.js`
- `src/config/TacticalDraft.js`
- `src/effects/AstraEnergyMaterial.js`
- `src/effects/AstraProjectileMaterial.js`
- `src/effects/ColossusAssaultVfx.js`
- `src/effects/TractorBeamVisual.js`
- `src/entities/Boss.js`
- `src/entities/Bullet.js`
- `src/entities/Enemy.js`
- `src/entities/Player.js`
- `src/entities/SpaceSnake.js`
- `src/entities/SpaceSnakeBaby.js`
- `src/game/Game.js`
- `src/game/LifeGrantPolicy.js`
- `src/game/OnslaughtLoadout.js`
- `src/i18n/achievementModeText.js`
- `src/i18n/onslaughtCollectionNames.js`
- `src/input/InputManager.js`
- `src/leaderboard/LeaderboardTypes.js`
- `src/managers/BossDiscoveryEncounter.js`
- `src/managers/EnemyManager.js`
- `src/managers/PowerupManager.js`
- `src/managers/SnakeBrood.js`
- `src/scenes/AchievementsScene.js`
- `src/scenes/HighscoreScene.js`
- `src/scenes/PlayScene.js`
- `vite.config.js`
- `docs/handoff/nova-swarm-feedback-week-20260927.md`

## Private Steam delivery

- Uploaded and assigned to sector-continue-test: BuildID 25564137.
- App4765070, depot4765071, manifest4177681326648864018.
- SteamCMD exited0 and reported successful completion at20:43:50 Europe/Oslo on27 September2026.
- Authenticated Steamworks Builds page then showed sector-continue-test25564137, default25511386 and test-build23782673. Only the authorized private branch changed.
- Payload:415 regular files plus62 directories,2,712,883,409 bytes. SteamPipe reports477 mapping entries because it includes directories. Its delta changed the executable and app.asar only.
- No additional forum post, public release, achievement definition publication, Steamworks metadata/settings change or GitHub synchronization was performed.
- Current required deliverable: E:/Codex/builds/nova-swarm/feedback-week/win-unpacked.
- Required QA and source/upload manifests: E:/Codex/builds/nova-swarm/feedback-week/evidence.

## Final cleanup outcome

Both owned development servers and all packaged test processes were stopped. The live task/agent/process check found no other active owner of the task staging. Source and scratch scans contained no reparse points.

Automatic approval review rejected the final bounded native PowerShell cleanup of the68 listed task-owned targets with "blocked by policy", before command execution. This was separate from the previously rejected paths above. No alternate deletion method or retry was used. Exact paths are retained in E:/Codex/builds/nova-swarm/feedback-week/evidence/cleanup-plan.json and cleanup-results.json.

The disposable source copy remains at E:/Codex/builds/nova-swarm/feedback-week/source (5,515,683,888 bytes), builder-debug.yml remains beside it, and task scratch remains at E:/Codex/tmp/nova-feedback-week (264,925,527 bytes). The four previously blocked D test directories also remain. Cleanup is not claimed complete.

Free E space after delivery and the rejected cleanup:386,585,329,664 bytes, approximately360.04GiB. Shared caches were inspected and left intact: npm196MB, Electron144MB, electron-builder633MB and SteamCMD146MB. No initial per-cache measurement exists, so no growth claim is made.

## Repeating the packaged control regression

The external regression is committed as scripts/check-packaged-controls-isolated.mjs. It does not alter the package. Use an isolated E output/profile and explicit environment:

```powershell
$env:TEMP = 'E:\Codex\tmp\nova-feedback-controls'
$env:TMP = $env:TEMP
$env:NOVA_SWARM_PACKAGED_EXE = 'E:\Codex\builds\nova-swarm\feedback-week\win-unpacked\Nova Swarm.exe'
$env:NOVA_PACKAGED_CONTROL_QA_OUTPUT_DIR = 'E:\Codex\tmp\nova-feedback-controls\results'
node scripts/check-packaged-controls-isolated.mjs
```

The script asserts packaged mode, isolated profile and Steam write guards. Gamepad snapshots and native focus IPC are simulated; keyboard events run through the actual renderer. It verifies the game is still in active play with the same life/sector state. Do not substitute it for physical controller, Alt+Tab or Steam Overlay testing.
