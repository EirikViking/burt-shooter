# Nova Swarm Near Miss Readability And Leaderboard Polish - 2026-06-23

## Problem

Players could miss Near Miss feedback in real play because the mechanic awarded small normalized score values and the in-world score popup showed only a number. Steam leaderboard fetch/submit failures could also feel like missing data rather than a temporary unavailable state.

## Near Miss Findings

- Trigger: an enemy bullet passing within `player radius + bullet radius + 12px`, while still outside direct collision, marks one near miss on that bullet.
- Cooldown: one near miss can award every `450ms`.
- Score formula: `round((min(100, 25 + streak * 15) * comboMult * traitNearMissMult) * scoreMultipliers * 0.1)`.
- At normal `1x`, visible awards are intentionally small: about `+4`, `+6`, `+7`, up to about `+10` at the streak cap before multipliers.
- Scoring was left unchanged in this pass to avoid leaderboard impact.

## Implementation Summary

- In-world Near Miss score popups now include `NEAR MISS +score` or `NEAR MISS xN +score` near the player.
- The existing top toast remains, but the mechanic no longer relies on that toast being noticed.
- Hostile bullets now draw a small red hazard mark over their existing warning shell so bright generated projectile art reads less like a pickup.
- Steam leaderboard submissions that fail through the Steam path are queued in profile-scoped local storage under `novaSwarm.pendingSteamLeaderboardSubmits.v1`.
- Pending Steam submits retry when Steam availability is refreshed and can be retried explicitly by leaderboard/result flows.
- Fetch failures now show `Steam leaderboard unavailable. Local score is saved.` instead of empty-board wording.
- Friends empty state now explains that Steam friends who play Nova Swarm and submit scores will appear there.

## Scope

No hitboxes, collision, difficulty, projectile speed, spawn rate, score formula, XP formula, rewards, enemy behavior, boss behavior, leaderboard identity, achievements metadata, Steam Cloud settings, save format, AppID, depot ID, or Steamworks metadata were changed.

## Evidence

- Near Miss forced runtime proof: `test-results/danger-dodge-2026-06-22T23-15-10-624Z/report.json`
- Near Miss screenshot: `test-results/danger-dodge-2026-06-22T23-15-10-624Z/danger-dodge.png`
- Steam pending queue proof: `npm run check:leaderboard-pending-steam`
