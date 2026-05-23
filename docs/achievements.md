# Nova Swarm Achievements

This is the first-round local/in-game achievement implementation. It proves unlock, save, toast, debug, and player-facing display flow before any native Steamworks achievement API is wired.

## Current Scope

- One achievement for each real rank-up after the starting Cadet rank.
- `ACH_GLOBAL_LEADERBOARD` for a confirmed global leaderboard qualification.
- `ACH_GLOBAL_NUMBER_ONE` for a confirmed global leaderboard rank #1.
- A main-menu Achievements screen that reads local achievement state.

Achievement state is stored in browser/Electron localStorage under `nova_swarm_achievements_v1`.

## Steamworks Boundary

Steamworks achievements are not implemented in this round. The achievement IDs are Steam-ready and can later be mirrored in Steamworks, but the runtime does not call the Steamworks achievement APIs and does not require Steam to be running.

Leaderboard achievements must come from confirmed global/shared leaderboard results. They must not unlock from local-only leaderboard saves, offline fallback, debug/unranked runs, debug boss routes, or near-global voice cues. The current cloud path confirms with a post-submit global board read; if that read is unavailable or stale, the achievement is skipped rather than guessed.
