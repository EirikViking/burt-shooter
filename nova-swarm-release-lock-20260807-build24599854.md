# Nova Swarm Stable Release Lock: Build 24599854

Created: 2026-08-07 (Europe/Oslo)

## Locked build identity

- Steam AppID: `4765070`
- Windows depot: `4765071`
- Steam BuildID: `24599854`
- Depot manifest: `4879574498594448776`
- Package version: `v2026-08-06_21-17-26`
- Exact packaged source commit: `f15c76d8b5d4dbc2d7e0f4cb147ef2a76b3164d2`
- Final release evidence tip: `1bb88881668d51f638567ccaae9c75459cb4a3f7`
- Stable Git branch: `codex/stable-build24599854-20260807`
- Immutable source tag: `nova-swarm-release-20260807-build24599854`
- Immutable stable evidence tag: `nova-swarm-stable-20260807-build24599854`
- Leaderboard identity: `nova_swarm_global_score_v2`
- VDF `SetLive`: `""`
- Steam branch assignment: none

The source tag identifies the exact game source packaged for BuildID 24599854. The stable evidence tag identifies the final local handoff containing this lock and the next-chat prompt. No existing commit was rewritten or discarded.

## Preserved ancestry

- Upstream ancestor: `17b4a0195b9f47648b1ae2f239e59aad9152979d`
- Authoritative baseline: `55560f4b15c9904a92a2d1077d8fdb8526d63dd3`
- Intentional local commits preserved: `1b0166d` and `55560f4`
- The stable branch is a descendant of both intentional commits and the authoritative baseline.
- The authoritative worktree at `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720` remains untouched and clean.

The source branch is intentionally two commits ahead of upstream. That difference is part of the release provenance and was not reconciled.

## Included player-facing work

This build contains the complete approved Tyrian #93/#94 work and the later current-version polish that followed it:

- Transition VFX readability and autofire continuity into boss combat are preserved.
- Reinforcement-wave arrival construction is smoothed without changing encounter balance or wave timing.
- Scout Run equal-score local-best ties resolve consistently, and result cards use the corrected compact spacing.
- Combat audio has more distinct enemy fire, pickup, kill, and power-up identities with threat-first mix priority.
- Every hangar ship has a distinct authored visual treatment. Eirik the Viking remains the flagship presentation, with readable Viking inscriptions and a bounded gameplay scale so it is impressive without covering the playfield.
- Ascendant support drones and other authored hulls are scale-bounded and centered consistently in hangar and combat.
- Tactical Draft held-card selection persists correctly through the next draft.
- Cobalt Guard readouts no longer claim unsupported near-miss or wide-shot properties.
- Keyboard controls can be remapped, including Shift for Dodge / Phase, with persistence and reset behavior.
- Settings and keyboard-control panels stay inside the 1920 by 1080 layout bounds.
- Cabinet Wonders use the dedicated four-second ElevenLabs revelation asset. The wordless choir and ceremonial bell begin 1.5 seconds before the Wonder visual event.
- Boss warnings, camera-shake bursts, pickup confirmation, and positional pickup audio remain readable under dense combat.
- Existing score formulas, progression, saves, achievements, leaderboard identity, Steam Cloud paths, controller support, localization, Mayhem Pure rules, and Steamworks configuration are preserved.

## Package and upload evidence

- Payload: 861 files, 1,352,768,892 bytes.
- Payload manifest SHA-256: `d93f48707122c7bd169d69825e095a8f097ced1dbe127ec497d051cbede34de1`.
- Executable SHA-256: `e845b83f828be46d20011ab802422ea58c640579f828fbec538a87fa6a2962e2`.
- Upload result: `Successfully finished AppID 4765070 build (BuildID 24599854).`
- Upload evidence: `release/steamworks/steam-upload-evidence-20260806-build24599854.md`.

The release-line gate passed on 2026-08-07. The upload evidence records passing focused gameplay, notification, Wonder, ship, tactical, keyboard, controller, browser, Steam bridge, fresh-profile, packaged smoke, package-runtime, and performance checks. The current and packaged performance runs each reached 60 FPS minimum and average across eleven samples.

The established SteamCMD warning about development Steam SDK files in the depot remains a packaging-cleanup item for a future release. It did not fail the verified build or upload gates.

## Steam state

BuildID 24599854 is uploaded privately and unassigned. `SetLive` is empty. No public/default branch, beta branch, Steamworks setting, store metadata, achievement metadata, leaderboard identity, or Steam Cloud setting was changed by this lock. “Stable” here means the immutable local Git branch and tags below; no Steam branch target was specified for promotion.

## Rollback and continuation

Do not develop on this stable branch or either immutable tag. Create a new isolated worktree and `codex/` branch from `nova-swarm-stable-20260807-build24599854`.

If the documentation commit must be backed out on another branch, use `git revert <commit>`. Never reset, delete, or rewrite the stable branch or tags. Steam rollback is not required while BuildID 24599854 remains unassigned. If it is later assigned, rollback requires an explicit Steamworks branch reassignment to the intended earlier BuildID.
