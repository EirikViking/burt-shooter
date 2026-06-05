# Nova Swarm Release Hardening Manual Test Checklist

Date: 2026-06-05
Branch: `codex/fix-dead-enemy-pixels-20260604`
Baseline before result-screen status pass: `2cfcd8b261345440d0d3d689911394ada15f8f84`

## Build Under Test

- Steam package version: `v2026-06-05_15-51-39`
- Steam BuildID: `23586841`
- SetLive: empty
- AppID: `4765070`
- Windows depot: `4765071`
- Steam leaderboard name: `nova_swarm_global_score_v2`

Use private Steam BuildID `23586841` for this checklist.

## Automated Gate Before Manual Testing

Run this once after pulling the branch:

```powershell
npm run check:release-hardening
```

That command runs the automated guard suite and prints the short list below that still needs human judgment.

## Optional Local Debug Shortcut For Level 8-9 Sprite Testing

This shortcut is already gated and should be used only in local browser/dev testing, not as a Steam leaderboard run:

```text
http://127.0.0.1:5173/?autostart=1&debugBossToken=NOVA_DEBUG_2026&startLevel=8
```

Safe-use rules:

- Start it from local dev or preview only.
- Confirm the run is unranked/debug before trusting score behavior.
- Do not use it to submit Steam leaderboard scores.
- Use it only to reach later enemy cleanup scenarios faster.

## Manual Checklist

1. Combo milestone SFX
   - In a normal Steam run, build combo to x10 and x20.
   - Confirm the x10 milestone sound is softened and not a sharp beep.
   - Confirm combo score bonus still applies and the score/leaderboard score scale does not change.
   - Confirm combo text is not constantly flashing during tiny combos.

2. Distinct SFX identity
   - Collect a powerup, clear a normal wave, clear a sector, trigger a combo milestone, and kill a boss.
   - Confirm combo, wave clear, sector clear, powerup pickup, and boss death each sound clearly different.
   - Confirm boss death does not end with a generic powerup-pickup feeling.

3. Boss duration and difficulty
   - Fight boss 1 from a normal Steam run.
   - Confirm the fight lasts long enough to read, but does not feel much harder than before.
   - Confirm average play is not losing multiple lives from stacked surprises.
   - Repeat one later boss if time allows.

4. Boss death spectacle
   - Kill at least two bosses.
   - Confirm deaths have larger bursts/rings/shockwaves and vary between bosses.
   - Confirm the spectacle clears cleanly before the next sector starts.

5. Stuck enemy sprite cleanup around levels 8-9
   - In Steam, play naturally to level 8-9 if possible.
   - Optional faster local-only route: use the debug URL above with `startLevel=8`.
   - Watch death, despawn, wave clear, sector clear, boss transition, support ships, pause/freeze/interlude, and late-run accumulation.
   - Confirm no dead enemy pixels or frozen sprites remain after enemies are inactive or the wave/sector advances.

6. Game Over Continue flow
   - End a ranked Steam run with a nonzero score.
   - Confirm Steam auto-submit starts without pilot-name entry.
   - Confirm the first `SCORE SUBMITTED` status screen is readable.
   - Press Enter, Space, controller confirm, or click Continue.
   - Confirm it advances to One More Run / Top 3 / leaderboard flow without losing Steam autosubmit status.

7. UI overlap and readability
   - Check HUD Rank badge beside Score/Level at desktop and smaller window sizes.
   - Check Run Clear, One More Run, Global Score Deck, leaderboard empty state, and leaderboard populated state.
   - Confirm no obvious clipping, duplicate text, tofu boxes, or ugly text collisions.

8. Steam leaderboard autosubmit
   - Launch through Steam.
   - Finish a real ranked run; do not submit dummy scores.
   - Confirm no manual Steam name entry is requested.
   - Confirm Global Score Deck uses Steam Global / Steam Friends wording when Steam is available.
   - Confirm the leaderboard remains `nova_swarm_global_score_v2`.

## Notes From Low-Risk Audit

- Existing debug start-level routing is already gated behind `debugBossToken=NOVA_DEBUG_2026`.
- Automated checks cover the mock autosubmit path only; real Steam submission still requires the manual Steam run above.
- Store metadata, AppID, depot IDs, SetLive, release/live branches, and secrets must remain untouched.
