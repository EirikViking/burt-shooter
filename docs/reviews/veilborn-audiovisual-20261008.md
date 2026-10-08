# Veilborn Audio and Animation Upgrade

Request: "the veimborn audio needs a massive upgrade, animation too".

## Delivery and Source

- Integration branch: `codex/veilborn-av-integration-20261008`.
- Preservation baseline: `7bacb502a169573f7307d553bffd68eb8ac83da1`.
- Original D: branch remains `codex/sector-leaderboard-unknown-20260928`, HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`. Its inherited source, index and worktree were not replaced or reverted.
- The preservation baseline contains the 513 current inherited changed files. Fetch, status, branch, log and worktree checks preceded implementation. Audio and review used separate clean worktrees and branches; audio was cherry-picked into this integration branch.
- Current source/work copy: `E:/Codex/builds/nova-swarm/veilborn-20261007/integration`.
- Current compiled web build: `E:/Codex/builds/nova-swarm/veilborn-20261007/integration/dist`.
- Build stamp: `v2026-10-08_00-45-32`. Product build commit: `29014e4`.
- Preview film: `E:/Codex/builds/nova-swarm/veilborn-20261007/Veilborn-Audio-Animation-Preview.mp4`.
- Machine verification, hashes and exact current results: `E:/Codex/builds/nova-swarm/veilborn-20261007/Verification.json`.

This is a local branch/build. It has not been merged into the inherited dirty D: checkout or uploaded to Steam. No Steamworks settings, store media, forum, email, leaderboard, player progress or Cloud configuration was changed. No paid generation, purchase or new external media was used.

## What Changed

The existing multipart atlas rigs now perform preparation, discharge, overlapping recoil, recovery, arrival folding and damage reactions. Eight material/family profiles and per-identity timing vary hinge range, foreshortening and settling. Wings, limbs, weapon assemblies, cores and hulls have different responses. Poses use simulation time, preserve authored anchors and unwind before the next controller update; they cannot accumulate deformation. Cables and dynamically spawned drones are excluded. Morph dimensions survive texture/size changes. Reduced motion disables the new deformation.

Deaths now collapse briefly, release pieces with staggered timing, and dissolve. Spatial/deceiver assemblies withdraw while mechanical/organic pieces separate and fall. Detached parts and whole-actor death sprites preserve the exact skew/anchor from the attack pose. Atlas references remain owned until the bounded 1.45-second aftermath ends.

The 56 existing identity recordings now have per-character pitch/body/clarity shaping, short attack/release envelopes, opposing stereo reflections and local compression/headroom. Warnings remain dry and unshifted. All branches cross one master/SFX control; reflected/death tails respect explicit cancellation and mute. Stale decoded warnings/attacks are rejected. Lower-priority presence cannot replace a warning/death voice. Pending and decoded banks share the same three-entry limit. Maximums are four logical voices, eight sample sources and 42 owned nodes. Global music/dialogue/voice priority is unchanged.

This is animation and audio processing of existing art/recordings, not newly generated character art, a replacement soundtrack, skeletal meshes or new voice performances.

## Files Changed

Product files:

- `src/effects/VeilbornPerformance.js` (new)
- `src/effects/MysteryEffects.js`
- `src/entities/mysteries/MysteryActor.js`
- `src/entities/mysteries/MysteryCombat.js`
- `src/audio/MysteryAudio.js`

Verification and handoff:

- `scripts/check-veilborn-performance.mjs` (new)
- `scripts/check-veilborn-performance-runtime.mjs` (new)
- `scripts/check-veilborn-audio-performance.mjs` (new)
- `scripts/check-mystery-v2-audio.mjs` (WebAudio test mocks and owned output directory)
- `scripts/capture-veilborn-performance.mjs` (new)
- `progress.md`
- This review document

Generated `public/version.json` and `public/sw.js` belong to the isolated build copy. The standard build generator's `_headers` rewrite changed line endings only, with no staged content change.

## Verification

- Animation test first failed for the absent implementation, then passed across all 56 identities: bounded finite transforms, unchanged combat coordinates/radii, exact restoration, morphology, warning cancellation, pause, reduced motion and death lifetime.
- Actual renderer parity test: 480 identical input frames per identity, performance enabled versus disabled, including damage, morphology and life loss. All 56 movement/attack/hitbox/hazard traces are identical.
- Independent review found missing skew transfer into death fragments. Actual Pixi regression reproduced it, then passed after the fix; break fragments also preserve their anchors/skew.
- Existing `check-mystery-v2.mjs`: all 56 actors pass repeated attacks, movement, damage, zero component score, exactly-once kill reward, bullet/sprite caps, escape, repeated destroy and final zero atlas references.
- Ten focused actual-bus audio contract groups pass, covering all 56 identities, rate-correct envelopes, priorities, single-point mute, cache/source/node bounds, asynchronous cancellation and partial-construction cleanup. WebAudio boundaries are stubbed in that unit test.
- Existing `check-mystery-v2-audio.mjs`: all 56 banks, female announcement files, codec/cue bounds, sequencing, no ducking, mute and cleanup pass. Existing voice-mute regression passes.
- `npm run check:release-line`, `npm run check:i18n` and the full `npm run build:current` pass. The standard metadata generator and Vite rebuild produce the current stamped deliverable; final compiled smoke outcome is recorded in `Verification.json`.
- Official web-game input client ran two keyboard bursts through real input mappings. Screenshots and state were inspected; score/damage/lives evolved, practice mode remained unranked, no captured console errors. A task-only adapter selected the existing encounter test and handled WebGL screenshot readback.
- The production smoke suite covers menu/settings/audio audition, desktop gameplay, controller input, pause, compact log, Game Over/return, mobile, level progression, boss and tactical draft. Its first second-window load timed out at the unchanged 15-second limit; an isolated rerun passed. A separate first source load timed out, then passed unchanged after initial loading completed.
- Pre-stamp smoke reported only missing generated service-worker warnings. The standard generator supplies those ignored build files in the clean copy; no application behavior change was made to suppress warnings.
- Final stamped smoke passed with zero failed assertions, page errors or bad responses. It emitted one nonfatal warning that the separate decorative fauna cue `dawn_koi` was unavailable; that cue is not part of this change. This warning remains disclosed, not silently counted as a warning-free run.

No new player-facing strings or untranslated text were added. Existing localization remains unchanged; no localized full-audio or subtitle claim is made. Older localization quality still requires native-speaker review.

## Preview Scope and Limits

The 61-second 1080p/30 preview shows actual actors and live game audio. It is a controlled encounter fixture with invulnerability and scripted component/death demonstrations, not a natural playthrough or balance proof. Music and announcer are excluded to expose the Veilborn cues. Export gain is +4.3 dB; no external sound effects were added. Final AAC measures -18.27 LUFS integrated and -4.46 dBTP, with 1,832 video frames and no detected black interval. Video SHA256: `0555352bafaf0ef30b1daa3d9d44c5d11b894a5dbb4b2fe8458a8a22f0cb2da6`.

An initial capture raced an outstanding level-start timer and missed the first encounter. The capture now waits for completed startup and asserts that every selected actor is still attached, active and firing. The corrected final preview replaces that attempt.

Human listening, subjective animation quality, native Steam playback, real controller hardware and long-session target-hardware performance remain unverified. A passing graph bound is not a claim of audible distinctness, universal performance or perfection.

## Rollback and Cleanup

Source-only rollback patch: `E:/Codex/builds/nova-swarm/veilborn-20261007/Veilborn-source.patch`. It contains only the five product files above and excludes all inherited changes. Reverse application was checked, not performed:

```powershell
git -C E:/Codex/builds/nova-swarm/veilborn-20261007/integration -c safe.directory=E:/Codex/builds/nova-swarm/veilborn-20261007/integration apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/veilborn-20261007/Veilborn-source.patch
```

After a requested rollback and review of any later edits, use the same command without `--check`. Do not reset or overwrite the original D: worktree.

Retain the current compiled build, clean integration source/dependencies needed to serve/rebuild it, final film, baseline provenance, source rollback patch and compact verification evidence. Audio/review worktrees were clean and removed after their agents finished. Task-owned temporary indexes, raw recordings, superseded captures, test browser profiles and Vite cache are disposable after verification. Exact final cleanup status and E: free space are recorded in `Cleanup.json` alongside `Verification.json`. Older tasks' rejected cleanup and shared caches remain untouched.

Final cleanup is partial: the environment rejected removal of `E:/Codex/tmp/nova-veilborn-20261007` after an exact-path, reparse, process and exclusive-file-lock audit. Its 251 files / 331,705,450 bytes remain. No alternate deletion or retry was attempted. Both auxiliary worktrees are verified absent. E: free space after the attempt is 160,598,589,440 bytes (about 149.57 GiB). The compiled preview intentionally remains running on localhost:5013 (PID 19200) with runtime files outside the blocked scratch directory.
