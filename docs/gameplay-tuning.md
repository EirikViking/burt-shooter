# Nova Swarm Gameplay Tuning

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
