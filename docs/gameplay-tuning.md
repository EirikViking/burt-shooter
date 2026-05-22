# Nova Swarm Gameplay Tuning

## 2026-05-21 Polish Pass

- Boss spacing lives in `src/config/BalanceConfig.js` under `difficulty.MIN_WAVES_BETWEEN_BOSSES` and `difficulty.MIN_SECONDS_BETWEEN_BOSSES`. Current defaults are 2 focused waves and no extra timing spacer before a boss gate can open.
- Early waves use two curated waves for levels 1-4, with 13-17 normal enemies before the boss. The goal is to keep first-boss access readable while still introducing wave variety.
- Boss net/beam fairness is grouped under `difficulty.bossFairness`: signature telegraphs are roughly 1.1-1.2s, regular attack tells are 0.78-0.96s, ring attacks reserve wider safe wedges, and beam/cone hazard hitboxes are slightly smaller than their visuals.
- Game-over runback lines live in `src/config/GameOverCtaVoiceLines.js`. Optional MP3s use `public/audio/voice/cta/one_more_run_01.mp3` through `one_more_run_50.mp3` and can be regenerated with `npm run generate:gameover-cta-voice`.
- The game-over flow is intentionally two-stage: leaderboard/name entry first, then the large voiced `ONE MORE RUN?` runback screen after submit, skip, non-qualification, or fallback.
