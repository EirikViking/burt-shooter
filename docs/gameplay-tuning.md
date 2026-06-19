# Nova Swarm Gameplay Tuning

## 2026-05-25 Arcade Score-Attack Revamp

- Default run pacing now lives in `src/config/RunPacingConfig.js` and `src/game/RunPressureDirector.js`. The current arcade target is 10 sectors, 150 seconds per sector, and a good-player climax around 24-30 minutes with sharp overrun pressure after the target.
- `BalanceConfig` now supplies base values and caps; time pressure, sustain tightening, score pressure, projectile pressure, and special-threat pressure should be tuned through the run pressure director first.
- Content rotation lives in `src/config/RunContentDirectorConfig.js` and `src/game/RunContentDirector.js`. Runs choose a theme, boost unseen content, suppress recently seen content, and expose advanced attacks as scaled previews.
- Long-term progression now uses `src/progression/HangarProgressState.js`, `src/progression/ThreatDiscoveryState.js`, `src/config/ShipUnlockConfig.js`, and pilot XP thresholds in `src/shared/RankPolicy.js`. Keep old `bestLevel` compatibility, but new ship/rank tuning should use cross-run milestones.
- Old 75-second pre-boss guards are no longer authoritative. `check:wave-pacing` and `check:progression-tempo` should prevent collapse, one-wave boss routes, and nonsensical values while allowing the director to decide the exact arcade cadence.

## 2026-05-21 Polish Pass

- Boss spacing lives in `src/config/BalanceConfig.js` under `difficulty.MIN_WAVES_BETWEEN_BOSSES`; current defaults are restored to the verified six real waves before a normal boss gate can open. The roughly 75-second boss cadence is an estimate from wave duration, not a hard timing gate; no git/doc evidence was found for a 9-wave default.
- Early waves use six curated waves for levels 1-4, with 46-57 normal enemies before the boss. The goal is more action before pressure spikes while keeping the immediate first-boss path isolated behind the explicit debug boss token.
- Boss net/beam fairness is grouped under `difficulty.bossFairness`: signature telegraphs are roughly 1.1-1.2s, regular attack tells are 0.78-0.96s, ring attacks reserve wider safe wedges, and beam/cone hazard hitboxes are slightly smaller than their visuals.
- Game-over runback lines live in `src/config/GameOverCtaVoiceLines.js`. Optional MP3s use `public/audio/voice/cta/one_more_run_01.mp3` through `one_more_run_50.mp3` and can be regenerated with `npm run generate:gameover-cta-voice`.
- The game-over flow is intentionally two-stage: leaderboard/name entry first, then the large voiced `ONE MORE RUN?` runback screen after submit, skip, non-qualification, or fallback.

## 2026-05-23 Wave Pacing Blocker

- Root cause: commit `2bed30a` intentionally changed the previous six-wave/75-second boss-spacing plan to two focused waves and no timing guard after a first-boss difficulty report. That made normal boss gates arrive much earlier than the May 21 boss-spacing pass promised.
- Restored values: `MIN_WAVES_BETWEEN_BOSSES=6`, `MIN_SECONDS_BETWEEN_BOSSES=0`, `bossIntervalCatchupWaveMax=0`, `wavesPerBossBase=6`, `wavesPerBossPerLevel=0.03`, and `wavesPerBossMax=8`.
- Guard: `npm run check:wave-pacing` verifies generated normal levels do not produce a one-wave boss gate, wave 1 transitions to the next wave instead of `BOSS_GATE`, six-wave pacing estimates near 75 seconds without enforcing a hard seconds rule, and the immediate boss route remains debug-token-only.

## 2026-05-23 Post-First Boss Ease

- Bosses 1-11 also receive `bossEarlyDifficultyScalar=0.9`, a 10% early-boss relief across boss health, boss projectile pressure, and boss regular/phase shooting cadence. Bosses 12+ stay on the previous post-first curve.
- Starting with boss number 2, `bossPostFirstDifficultyScalar=0.8` still applies a 20% overall difficulty reduction across boss health, boss projectile pressure, and boss regular/phase shooting cadence.
- The focused guards are `npm run check:early-boss-difficulty-relief` and `npm run check:boss-post-first-difficulty`; they verify levels 1-11 receive the early 0.9 scalar while level 12+ returns to the accepted post-first curve.
