# Nova Swarm stable GitHub handoff

## Stable identity

- Stable branch: `codex/stable-build24274850-20260718`
- Exact packaged source: `4c27594136aa0b74f1c55ca98a20a1a6fe25af44`
- Upload evidence commit: `a7adf0fa93b68d3a2587acbec0cd033eae02a005`
- Source tag: `nova-swarm-release-20260718-build24274850`
- Evidence tag: `nova-swarm-stable-20260718-build24274850`
- Steam BuildID: `24274850`
- Package: `v2026-07-18_17-04-21`

## Summary

This handoff locks the complete verified Nova Swarm source containing the approved checkpoint, Steam frame pacing and capture rescue, all confirmed Tyrian feedback fixes, and the Hangar Mayhem Tactical launch correction.

The stable branch adds only evidence, lock, and continuation documentation above the uploaded source. No gameplay files are changed by the lock commit.

## Verification

The release line, focused Tyrian behavior checks, Tractor checks, Tactical Draft checks, all eight localization catalogs and UI surfaces, Hangar launch routes, controller flow, production build, browser smoke, Electron smoke, exact Steam package runtime, and `git diff --check` pass.

Focus Lens, Tractor feedback, ordinary hit feedback, Hangar Tactical launch, German Settings, and Japanese HUD evidence were manually inspected.

Two initial browser checks had nonreproducible timing or resource failures. Their immediate clean reruns passed completely and are preserved beside the passing evidence.

## Scope guard

This GitHub handoff does not upload to Steam, assign BuildID `24274850` to any Steam branch, call SetLive, modify Steamworks settings, change production data, or publish new community text.

Score formulas, leaderboard identities and scores, achievements, save format, Steam Cloud paths, AppID and depot identities, and Steam capture integration remain unchanged.

## Review

Review the root lock document:

`nova-swarm-release-lock-20260718-build24274850.md`

Review the upload receipt:

`docs/release/nova-swarm-hangar-tactical-upload-20260718.md`

Future work must start in a new branch and worktree from `nova-swarm-stable-20260718-build24274850`. The stable branch and both tags should remain untouched.
