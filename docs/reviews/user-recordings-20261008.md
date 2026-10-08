# User Recordings: Arcade And Onslaught

## Scope And Evidence

User supplied two original, untouched recordings under `E:/video-clips/Nova Swarm/`:

| Recording | Duration | Review coverage |
| --- | --- | --- |
| Nova Swarm 2026.10.08 - 11.58.17.01.mp4 | 13:02.113 | Entire timeline at 2 fps, selected events at 12 fps, full-resolution details and final frame |
| Nova Swarm 2026.10.08 - 12.39.45.02.mp4 | 13:08.941 | Entire timeline at 2 fps, selected damage sequence at 12 fps, full-resolution details and final frame |

This is chronological sampled visual review, not continuous playback or inspection of every source frame. Root reviewed each recording's first 22 sheets; two image-only reviewers covered sheets 23-44 and 45-66. Reviewers did not access/edit the repository. Audio input is unsupported in this session: signal measurements cover both entire files, but there is no direct listening judgment. Capture timestamps do not measure engine CPU/GPU frame times.

Evidence: `E:/Codex/builds/nova-swarm/video-review-20261008` and `E:/Codex/builds/nova-swarm/video-review-onslaught-20261008`. Each contains metadata, loudness analysis, 66 chronological contact sheets and selected detail/motion images. Original recordings are not modified or disposable.

## Main Findings

1. **Onslaught rival aftermath freezes across later waves.** At 05:36 the rival is breaking apart; at 05:49 and 05:53 its faded wreckage and `RIVAL DOWN` result still occupy the central playfield. The model only advanced encounter time while admission/attack conditions were safe. Completed encounters therefore froze during warnings intended to protect unfinished encounters. A failing regression reproduced this independently of the recording. Local fix lets a won rival finish its existing 1.8-second aftermath while preserving pause and unfinished-contact clocks. It changes no health, attack, reward amount or random selection. Actual director/model/visual test confirms the contact disappears while an ordinary warning remains active, with exactly one reward.

2. **Onslaught preview selects a different boss from the fight.** At 07:06 the card says CROWN OF LANES with blue art; at 07:09 the arriving enemy is RINGMASTER ZERO with red/gold art. Source confirms the warning omitted Onslaught's sector-51 shuffle and fixed 50-boss pool, while spawning uses them. The new identity regression fails at sector51. The two-option correction is prepared but NOT applied: the editing tool failed writing PlayScene.js. Do not describe this as fixed. Special Planetfall/Dreadnought preview identity also needs dedicated work, beyond ordinary roster parity.

3. **Player/background hierarchy needs targeted work.** Arcade 11:00.5 puts the small pale hull over a bright ice planet. Onslaught 04:23/04:26 and 09:16 put detailed giant fauna and orbital lines behind bullets. Existing projectile outlines are present; this is not a missing-outline diagnosis. Preserve the spectacle, but prioritize the hull/hitbox and urgent threats. A bounded four-copy shared-texture player silhouette helper passes isolated transform/lifecycle tests but is UNINTEGRATED because Player.js writes failed. It is not a playable or visually verified improvement.

4. **The menu can show an empty selected-ship area.** Arcade 12:59.833 to approximately13:00.25 shows a delayed reveal. Onslaught's final frame13:08.85 still has no visible Phase Seraph. Correction after source investigation: the visible `DRAG TO ROTATE` belongs to AstraLaunchHome and is drawn independently of model readiness. It does NOT establish a renderer failure or rule out loading. Phase Seraph's ship key ends in29, but its actual textureIndex is25 and showroom model is26.glb. An independent, real WebGL context-loss reproduction did erase the last ship frame and leave a settled pose blank after recovery. The local fix preserves the last complete frame and retries only unsuccessful rendering after restoration. Desktop/mobile pixel tests pass for Sparrow and Phase Seraph. This does not establish the recording's cause; ordinary return-to-menu loading, first-load failure and native recovery remain separate checks. No flat placeholder, fade or model-cache change was applied.

5. **Some animation transitions need better recovery.** Arcade 06:37.833 to06:37.917 shows an abrupt wide/fanned boss pose returning to a narrow pose. Confirm the actual animation state before changing collision geometry or calling the narrow art erroneous. Onslaught segmented bodies do visibly articulate, and capital death already includes timed explosions, separating hulls and rotating debris. These existing strengths must not be misreported as absent.

6. **Information competes with action.** A moving boss name overlaps the fixed header near Arcade06:36.8-06:37.6; Onslaught11:52-12:08 combines boss states, reinforcements and pickup notices. Reserve prominent messaging for immediate decisions. The rival aftermath fix removes one demonstrated long-lived obstruction; other message-priority work remains.

7. **Pacing changes should target repetition, not density.** Onslaught10:16-11:44 repeatedly uses green curved upper-edge formations with short cleanup gaps. Later dives, winged elites, segmented enemies, rival/core exposure and Skill Flight provide meaningful variety. Use those contrasts in future composition. Do not simply add enemies or inflate boss HP: Onslaught bosses around04:45-05:10,09:44-10:10 and11:48-12:14 last roughly24-26seconds and show multiple states. The first Arcade recording's short boss fights do not establish a universal balance problem.

## Timeline Notes

### Arcade

- 00:00-04:23.5: combat, upgrades and transitions covered chronologically; compact HUD improvements were already underway and are retained.
- 05:03: lava-world detail and armored segmented enemy; hostile projectiles already have edge treatment.
- 06:35-06:38: boss banking/recovery and name/header overlap, inspected at12fps.
- 07:57-08:00: capital breakup is staged, not one unanimated disappearance.
- 08:48-12:10: continued wave/boss progression; some backgrounds reduce player contrast.
- 12:10.667-12:10.750: life loss already produces impact, red feedback, hostile-bullet clear and respawn.
- 12:39.917-12:40: descending orange boss flame reaches the player before final defeat. The meaning of the blue halo is unverified; no shield-bug claim.
- 12:41: the white AA panel is the OS `Caps Lock aktivert` notification, not game UI.
- 12:52.2: run report already records cause/advice and detailed performance. Arcade Tactical, Nova Sparrow, sector13, score183635,12boss kills,69waves,1050kills,19%accuracy,5lives lost and4respawns. The15:34active/17:35total run is longer than the recording; its beginning is not in this clip.
- 12:59.5-end: menu return and delayed ship reveal.

### Onslaught

- 00:00-00:17: mode/loadout selection and Phase Seraph launch.
- 00:17-02:34.5: wide purple player volley, gold elite attacks, contacts, giant background fauna and a bending armored segmented enemy. First run ends during the boss arrival/fight.
- 02:37-02:39: result/retry-same-loadout transition; this recording contains two runs, not one uninterrupted run.
- 02:39-04:23.5: restarted sector51; segmented enemy loses armor progressively, convoy rescue and repeated ring/formation waves. Gold segment circles precede the later Target Paint selection, so not all segment circles can be attributed to that upgrade.
- 04:24-05:23.5: giant winged background fauna, first boss, staged defeat and draft.
- 05:24-05:53.5: rival/core exposure, defeat and incorrectly lingering result/wreckage.
- 05:54-07:03.5: ring and curved formations, orbital detail behind player fire, next transition.
- 07:04-07:35.5: mismatched preview, boss, defeat, Target Paint selection and next segmented enemy.
- 07:57.5-08:00: another damage transition merits frame-level profiling; sampled darkness does not establish blackout duration or cause.
- 08:12-08:18: Skill Flight and PERFECT FLIGHT result provide useful pacing contrast.
- 08:19-08:38.5: bronze segmented enemy with exposed-chain appearance. Need source ownership checks before changing segment indicators.
- 09:01.5-09:28: giant pale fauna crossing; full-resolution09:16 confirms high scenic prominence behind active combat.
- 09:44-10:10.5: capital encounter, opening center/core and existing separated-hull payoff.
- 10:16-11:44: repeated green formations, with some lower diving attacks and support arrivals.
- 11:48.5-12:14.5: multi-state boss with tethers, flame and reinforcements; player life loss around12:13.5.
- 12:24-12:36.5: winged elite changes the preceding formation silhouette.
- 12:39-12:54: articulated bronze segmented enemy; life-loss events about12:50.5 and12:54 need dense collision/protection review before balance changes.
- 12:55-end: defeat/results/menu. Final frame13:08.85 still shows an empty ship area; no later behavior is available.

## Performance And Sound

Both files are1920x1080, nominal60fps H264 with48kHz stereo AAC. Arcade capture median/p99/max packet gaps are16.667/17.189/17.622ms. Onslaught median/p99 are16.667/17.034ms, but maximum is328.689ms at12:13.4741-12:13.8028. Nearby90/103ms gaps cluster at the same life-loss event. Dense visual extraction shows Lives2 becomingLives1, impact, cleared enemy bullets and respawn; boss defeat occurs later. Repeated extracted frames across the capture gap are not independent proof of an engine stall. Next profiling target: nonfinal death/respawn, bullet cleanup, effects, synchronous saves/platform hooks and frame timing in a matched native run.

Whole-file loudness: Arcade-26.9LUFS,6.4LU range,-7.5dBTP; Onslaught-27.4LUFS,5.0LU range,-7.4dBTP. No clipping is indicated, but recording gain is unknown. Do not indiscriminately raise the game master volume from these values. Subjective Veilborn timbre, repetition, layering and warning audibility still require listening. No new recordings were activated and no paid provider was called.

A source regression finds2160legacy projectile lookups/constructions for2160browser shots, immediately replaced by cached Astra graphics. Proposed removal preserves final materials and headless fallback, but Bullet.js edits failed. No delivered allocation/FPS optimization claim.

Matched synthetic HUD CPU timing,600samples/run after60warmup,1280x720,14upgrades and active tools, ABBA order: baseline means0.609/0.569ms, candidate0.619/0.682ms. Candidate is slightly more expensive, not a measured speedup. This isolates HUD update work, not GPU/full-game performance. Stable tactical-tray geometry rebuilding is a future profiling target; it has not been cached in this pass.

## Local Changes And Verification

- `src/ui/HUD.js`: retained compact rank/score/lives separation, bounded/wrapped upgrade tray, active-tool/trait avoidance and letterbox docking above touch hints. Added a narrow side tray when large-scale landscape layout would otherwise push upgrades below the screen. No world/collision/score changes or new strings.
- `src/game/ArcadeFirstLight.js`: completed rivals finish their bounded aftermath during subsequent warnings, preserving paused and unfinished encounters.
- `src/effects/PlayerHullSilhouette.js`: isolated pending helper only; no integration or visual-quality claim.
- New checks: compact-HUD matrix/timing, recorded-combat allocation regression, silhouette unit test, rival-result expiry/runtime and boss-preview identity. Video extraction helper and implementation plan retained for reproducibility.

PASS: release-line, source i18n, existing First Light model/regression and contact-warning recovery checks, rival-result unit and actual browser integration, isolated silhouette ownership/transform checks. Final HUD matrix40/40 passes across eight locales and five sizes, with active tools and letterbox assertions. Fresh build:current v2026-10-08_13-13-32 succeeds (1110modules); entry `assets/index-gLREweHn.js`. Current compiled full smoke and eight-locale UI pass, with zero reported browser errors. Full smoke covers gamepad, pause, mobile, Game Over, wave transition and boss victory. Previous v12-41-20 smoke failed a15second second-page play-ready wait; the unchanged suite passed on the fresh current build, but the old failure evidence remains and its cause is not established.

Source review after independent correctness review confirms only normal rivals set won=true. Surprise updates return without a recipe. Expiry preserves escorts/payback and does not destroy the separately owned reward drone. PlayScene returns for pause/draft/milestone before updating the director. At960x540/200%, the side tray is actually180x83 at23,303 with3shown+12hidden=15entries and no tray overlap/outside failure. These checks do not close unrelated200%issues.

Current dedicated compiled controller-only flow also PASSES, including movement/fire, pause/loadout, controller-disconnect pause and returnmenu. Preview: http://127.0.0.1:5017 (current compiled version); the temporary source5016 server is stopped. No live browser test or build session remains running.

OPEN: scale2 still has trait overflow/mission overlap and portrait score/combo overlap. The new offscreen upgrade-tray regression at960x540 is repaired, but this is not complete accessibility validation. Boss-preview correction, player silhouette integration and projectile allocation fix remain blocked by file-write errors. Native packaging/tests and a new Steam release remain outstanding despite the passing compiled browser gates.

Editing failures expose only `Failed to write file` for Bullet.js, Player.js and PlayScene.js; underlying cause is unknown. Other source/doc edits succeed. No ACL/security setting, alternative writer or source replacement bypass was used.

## Ownership And Delivery

Branch `codex/sector-leaderboard-unknown-20260928`; baseline/HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`. Inherited dirty work preserved, root sole writer. No reset, clean, stash, pull, switch, commit or push. Earlier read-only fetch dry-run timed out, so remote connectivity is not freshly proven.

Steam remains last authenticated private Build25791160 / manifest8962155408365970631, versionv2026-10-08_01-19-48, receipt `E:/Codex/builds/nova-swarm/combined-20261008/delivery.json`. No upload or Steamworks/settings/Cloud/public/player-state change in this pass. No email or spending. Existing longer20second fauna stays inactive. Known inherited German menu clipping and Chinese SPEED UP polish are not claimed solved; no newly untranslated text introduced.

Current candidate/evidence root `E:/Codex/builds/nova-swarm/hud-layout-20261008`; TEMP `E:/Codex/tmp/nova-hud-layout-20261008`; Vite cache `E:/dev-cache/vite/nova-hud-layout-20261008`; reusable E: source staging remains `E:/Codex/tmp/nova-steam-current-20261007/source`. Retain current deliverable, necessary comparison/rollback and review evidence, not obsolete iterations. Cleanup receipt and final free space are recorded in HANDOFF. Never remove original videos or inherited/rejected cleanup holds.

Rollback dry-runs passed, no reversal performed:

```powershell
git apply --reverse --check --ignore-space-change docs/reviews/recording-hud.patch
git apply --reverse --check --ignore-space-change docs/reviews/rival-result-expiry.patch
```

These patches isolate this pass's HUD and rival edits, preserving inherited work. Actual reversal requires a fresh check and explicit request, never a Git reset. Pending unintegrated helper/tests are documented separately.

## Cleanup Limitation

An ordinary guarded cleanup command was rejected before execution with `blocked by policy`. No cleanup through another route was attempted; no removal is claimed. The exact rejected directories, all under `E:/Codex/builds/nova-swarm/hud-layout-20261008/`, remain under hold: `after-check`, `boundary-before`, `dock-before`, `dock-final`, `locale-check`, `scale-before`, `tools-after`, `tools-before`, `tools-final`, `current-full`, `current-scale2`. The command included resolved-root, ancestor/nested reparse, process and exclusive file-handle checks, but rejection means these checks did not execute as part of that command. Earlier path checks showed the job roots were ordinary E: directories.

Other replaced evidence (`compiled-i18n`, `compiled-controller`), job cache/TEMP and the unsupported audio-input experiment are also retained pending allowed cleanup. Unknown-owner `E:/Codex/tmp/nova-hud-layout-20261008/chrome_chrome_url_fetcher_32428_946594720` must not be removed by assumption. Original videos, delivered Windows package and rollback25778573 are untouched. E: free space after compiled UI verification:145272078336bytes (about135.3GiB). Current `web-current` replaced the previous web candidate in place during the successful build; no extra archived build was created.
