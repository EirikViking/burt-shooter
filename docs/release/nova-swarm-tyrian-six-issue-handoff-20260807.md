# Nova Swarm continuation handoff: six Tyrian issues

Use this handoff to start the next chat from the locked current-version build. The Unity V2 project is out of scope.

## Start point

- Stable evidence tag: `nova-swarm-stable-20260807-build24599854`
- Stable branch: `codex/stable-build24599854-20260807`
- Exact packaged source: `f15c76d8b5d4dbc2d7e0f4cb147ef2a76b3164d2`
- Steam BuildID: `24599854`, private and unassigned, `SetLive` empty
- Authoritative baseline: `55560f4b15c9904a92a2d1077d8fdb8526d63dd3`
- Preserved intentional commits: `1b0166d` and `55560f4`
- Authoritative worktree remains untouched at `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`.

Create a fresh sibling worktree from the stable evidence tag. Prove folder, branch, HEAD, status, and `git diff --check` before edits. Do not reset, clean, stash, rebase, discard, overwrite, or rewrite the stable branch, tags, or authoritative checkout.

## Six remaining Tyrian items

1. **Railbreaker balance**

   Treat as a deliberate balance review. Gather a small comparison set against nearby late-game hulls before changing damage, cadence, spread, or reward. Do not change it from a single anecdote.

2. **Pilot Rank curve**

   Review progression pacing with representative fresh-profile and veteran-profile runs. Preserve saved ranks, migration, achievement IDs, and leaderboard identity unless a measured curve change is explicitly approved.

3. **Tractor and target-drone collisions**

   Reproduce the reported collision behavior in a focused run and packaged build. Inspect hit filtering, target ownership, and the collision hot path. Fix only a confirmed defect and add a focused regression check.

4. **Steam achievement notification timing**

   Verify in the Steam-installed client, including delayed callbacks and offline or reconnect behavior. Keep qualification and achievement IDs unchanged; change only notification timing if the reproduction is reliable.

5. **Leaderboard medal styling**

   This is a bounded visual polish item. Verify the empty, populated, personal-best, and tie states at supported UI scales and locales. Keep leaderboard identity, ordering, and score values unchanged.

6. **Intermittent Focus Lens report**

   Instrument and reproduce before editing. The prior Focus Lens spread-tightening work is already present and verified; the open item is the intermittent report, not a request to duplicate that change. Capture the mode, ship, frame timing, and projectile state for any failure, then add a regression check if confirmed.

## Recommended order

Reproduce Tractor / target-drone collisions first, then reproduce the Focus Lens report, then verify Steam achievement notification timing. Review Railbreaker balance and the Pilot Rank curve only with measured data. Do leaderboard medal styling after the behavior-sensitive items unless it can be isolated cleanly.

## Already completed and must not regress

- The full Tyrian #93/#94 implementation, including reinforcement smoothing, Scout tie handling and result-card spacing, combat audio variety and priority, transition readability, and boss-entry autofire continuity.
- The authored multi-ship visual pass, with Eirik the Viking intentionally remaining the most distinctive ship and gameplay scale capped.
- Configurable keyboard bindings, including Shift rebinding, persistence, reset, controller flow, and settings layout fixes.
- The Cabinet Wonder revelation prelude: dedicated ElevenLabs wordless choir and ceremonial bell starting before every Wonder.
- The focused Tyrian follow-up fixes for Cobalt Guard, Tactical Draft, and Ascendant support-drone presentation.

## Release guardrails

Before any future package or SteamPipe upload, run `npm run check:release-line` and the project’s current release, package, runtime, and performance gates. Keep future uploads private and unassigned unless a specific Steam branch promotion is explicitly requested. Do not change Steamworks settings or publish forum or patch-note content as part of implementation without separate authorization.
