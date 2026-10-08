# Arcade / Onslaught implementation

Source: current D: checkout, HEAD 9ad207d plus inherited runtime fixes, preserved as c2c6cb6. Original checkout/index remain untouched. Remote f429939 is an older independently rooted snapshot, not the release baseline. Source worktree: codex/arcade-onslaught-20260920. Build/temp/cache on E: only.

The supplied user brief is the specification and explicitly authorizes implementation and one Steam leaderboard. Keep the existing visual language. Arcade Tactical is the first home action, Onslaught Tactical the second, Other Modes the third. Explicit launches determine remembered focus and natural leaderboard entry. A leaderboard tab inspection does not become a mode choice.

Implementation sequence:
1. Separate global submission permission from gameplay ranked permissions; preserve difficulty, 85% career XP, achievements/checkpoint policy. Shared renderer/main validation for the fixed sector-51 Tactical start. Reject unknown routing. Test fresh access, modes, debug/prototype, bad starts and unchanged progression.
2. Persist new-ruleset personal bests and earned Flight Targets separately from historical Overrun records. Preserve run identity/start contract through result and retry. Test legacy save isolation, repeated recording, queue failure/recovery and KeepBest.
3. Update Astra home and Other Modes, keep controller/back navigation and explicit mode memory. First boss milestone (Arcade sector 11) enables a secondary invitation, once/session; dismissal persists and trying Onslaught ends recruitment.
4. Add Onslaught in the shared leaderboard structure, with personal best, nearest real higher score or earned-sector/boss target, compact real rows, play action and full ranking pagination. Keep failed reads distinct from confirmed empty results. No CPU rows in global ranks.
5. Rename player-facing modes in the existing localization system, update rules/briefings and eight languages. Use current ElevenLabs pipeline if available; otherwise suppress obsolete voice lines and document missing replacements.
6. Create and read back nova_swarm_overrun_tactical_score_v1 for AppID 4765070; finish Community Name and public/client-write configuration in App Admin. No synthetic live score, build publication or branch change.
7. Run focused behavioral checks, release/i18n/UI/controller checks, build, packaged isolated runtime and representative pacing check. Capture current runtime screenshots and clean task-owned intermediate files; retain current test build.

Review focus: metadata crossing IPC/retry; historical records accidentally becoming ranked; startup sector causing unearned rewards; offline/default routing; controller focus and small-player-count layouts.

Evidence ledger:
- Baseline release-line and 16 leaderboard-reliability cases PASS.
- New policy tests failed before changes: fresh access, Tactical submission, unknown-mode rejection.
- Live Steam creation and independent FindLeaderboard verified handle 21037871, Descending=2, Numeric=1, empty download; no score submitted. App Admin reloaded after saving: Community Name Onslaught — Ranked Challenge; Reads -, Writes -, Numeric, Descending. Other boards unchanged; no Publish action.
