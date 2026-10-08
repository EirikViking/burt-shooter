# Planetfall Local Preview, 2026-10-07

## State

Playable local candidate with normal admission implemented and manager-tested, not yet delivered to Steam. Unforced full-run reachability and the latest compiled/native gates remain pending. Latest authenticated private Steam build remains 25778573, delivered at 15:22 Oslo. Public, other branches, Cloud and Steamworks settings were unchanged by that delivery; no further upload or settings change occurred during this work. No paid media or service was used. Automatic reports and emails remain cancelled.

Source branch: `codex/sector-leaderboard-unknown-20260928`. Baseline: `7e8325e3d9abb09357636bca7e994c0227be02d6`. Existing dirty source and inherited work were preserved. Fresh fetch/status/branch/log/worktree inspection passed. No reset, switch, stash, commit or push.

## Changes

New product files: `src/game/Planetfall.js`, `src/entities/PlanetfallBoss.js`, `src/effects/PlanetfallVisual.js`, `src/audio/PlanetfallAudio.js`, `src/i18n/planetfallText.js`, `public/art/encounter-premium/planetfall.png`.

Integration files: `src/managers/EnemyManager.js`, `src/scenes/PlayScene.js`, `src/config/EncounterEvolutionTest.js`, `src/config/EncounterExpansionTest.js`, `src/i18n/firstLightText.js`, `src/config/EncounterPacing.js`, `src/config/ThreatCodexCatalog.js`.

The 32-section ring has four optional anchors and a timed central iris. Both routes use the existing scaled boss health and reward budget. Shared frozen geometry connects warnings to actual projectiles. Powered conduits, depth-weighted plates, mechanical recoil and finite breakup use existing licensed artwork. The latest pass adds dark textured undersides, sparse braces and seams, anchor-centered fracture waves, bounded local rupture sparks, and an iris-first collapse. All quadrant fragments retain the original 2.2-second deadline; the whole collapse ends within 3.8 seconds. Reduced Motion suppresses drift/spin and Flash 0 suppresses bursts/sparks. Owned machinery, warning and destruction cues use existing recordings. Pause, focus, draft, death and teardown interrupt safely without banked attacks or delayed orphan audio.

Normal admission uses a deterministic first threshold from sectors 14-18, deferring blocked opportunities rather than promising an appearance in that range. At most one per run, with existing encounter exclusions/recovery and reciprocal six-sector Breach spacing. The once-per-run flag lives in the existing resettable pacing object. Failed/stale loads do not consume it; pending request ownership survives overlapping old/new run loads. Planetfall has its own discovery/defeat identity and a localized eight-language Codex entry with extracted actual game art, outside the ordinary boss roster.

## Evidence

Owned evidence/build directory: `E:/Codex/builds/nova-swarm/planetfall-20261007`.

Latest source evidence: spectacle/runtime/lifecycle and 12 visual configurations pass; 1,000-seed admission assertions and actual manager discovery/budget/victory/reset/concurrency tests pass. The sector-18 manager fixture preserves 84 HP and 1,000 scoreValue; it is not an unforced survival run. Eight actual localized Codex layouts pass. Latest isolated A/B/B/A full-ring CPU p99 7.3/6.9 ms, RAF p99 17.0/17.3 ms, zero frames over 50 ms. A new isolated E: build copy avoids modifying the source preview during the unforced run. The following compiled/video results predate this latest visual/admission pass and must not be treated as current-candidate verification:

- Model: eight assertion groups, including health budget, optional anchors, timed exposure, interruption, finite volleys, deterministic replay and once-only defeat.
- Actual Player weapon matrix: 22 core/anchor routes, including bomb/splash, with zero closed-core damage and exactly one victory each. Hostile shots are removed in this fixture; it does not prove survival balance.
- Runtime/lifecycle: actual manager completion without fast-kill revival, no generic reinforcement, full fresh warnings after interruptions, owned projectile/audio/effect/listener cleanup, delayed audio cancellation and shared texture survival.
- Visual: 12 configurations covering eight locales, desktop/ultrawide/portrait, Reduced Motion and Flash 0. Final screen-space warning width test passed.
- Performance: A/B/B/A isolated scene with 160 fixed hostile projectiles; full-ring RAF p99 17.3/17.1 ms, CPU p99 6.9/9.0 ms, no frames over 50 ms. Not a whole-game, compiled-baseline or native performance claim.
- Fresh `build:current`: v2026-10-07_17-23-23, entry `assets/index-CsZdEJA1.js`, output `web-final`. Release-line and i18n checks passed before the build.
- Final compiled production containment, eight-locale UI and controller flow passed. The DEV URL and forged runtime prototype flags cannot force Planetfall in the compiled build.
- Fresh full compiled smoke passed with zero failures, console warnings/errors, page errors or bad responses. Menu/settings/audio, desktop/controller/mobile input, wave transition, boss defeat and continuation are covered in `smoke/report.json`.
- Fresh supplied-source reviewer found no actionable defect; reviewer did not independently execute runtime or inspect all inherited contracts.

Video: `capture/planetfall-with-game-audio.mp4`, 23.966 seconds, 1280x720 H.264/AAC stereo, 8,413,602 bytes. Actual ordinary-damage gameplay with emulated controller input mapping; core defeated at 20.517 seconds, three lives remained. Video duration is not time-to-victory. Actual game audio mean -32.4 dBFS, peak -12.3 dBFS. Independent decode and frame inspection passed. This is the latest addition within the user's requested nine-hour window, not a montage of every change. Attached in chat; not emailed or published.

## Limits And Next Step

Verify actual unforced progression, victory and continuation before private Steam delivery. Finish the current compiled/native gates and refresh actual gameplay video to include the new depth/fracture/collapse visuals. A fresh review identified the remaining caller-level load failure/rejection recovery gap; a focused regression and fix are in progress.

Human fun and sound-mix judgments remain open. Focused routes take 4-12 seconds and recorded ordinary input about 20 seconds, not the initial 75-100-second aspiration; do not inflate health or force waiting to meet that aspiration. Existing German menu clipping, portrait HUD overlap and Chinese SPEED UP polish remain unresolved. No new untranslated phase text; Planetfall is an intentional proper name, audio remains existing English/nonverbal material.

## Retention And Rollback

Retain `web-final`, current MP4 and QA/reproduction evidence; retain delivered Steam build 25778573 as the current shipping baseline. Cleanup is incomplete: policy rejected removal of obsolete `E:/Codex/builds/nova-swarm/planetfall-20261007/web-check` before execution. Preserve it under hold and do not retry through another route. The raw capture and task scratch also remain pending ownership-safe cleanup. E: free space was 174,371,504,128 bytes at this checkpoint. No C: project/build/temp output was created.

The original prototype integration rollback passed, but is now stale after natural admission. Refresh and dry-run it before using the following command; no rollback applied:

```powershell
git apply --reverse --ignore-space-change docs/reviews/planetfall-integration.patch
```

The patch must remove only this milestone's integration deltas and leave the new modules/tests inert, preserving inherited work. Do not reset the entire branch or delete inherited files.
