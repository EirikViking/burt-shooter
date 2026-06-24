# Nova Swarm Voice Direction

Updated: 2026-05-19

Nova Swarm's announcer should feel like the arcade cabinet is daring the player into one more run: confident female arcade announcer, mission-control hype woman, score-chasing accomplice, boss-fight instigator, stylish sci-fi cabinet personality.

## Style

- Energetic, premium, playful, slightly flirty, and sharp.
- Short lines that land between gameplay beats.
- No explicit content, slow lounge delivery, celebrity imitation, real-person cloning, lore dumps, or repeated chatter during dense dodging.
- The voice should make score, bosses, global leaderboard qualification, clutch survival, and instant restart feel more alive without slowing play.

## Runtime Rules

- Mission-control lines use the exclusive `announcer` voice group to prevent overlapping chatter.
- Repeated events use variation pools with per-event no-repeat bags in `AudioManager`.
- High-frequency moments use event-level cooldowns in addition to the global voice cooldown. Fast restart does not bypass launch/restart replay guards unless a call explicitly opts into `bypassEventCooldown`.
- Powerup, combo, wave-clear, and hijacker warnings have cooldowns so the first minute stays clean.
- Reinforcement warnings use the same mission-control female voice as the rest of the in-game announcer.
- Game-over delayed voice callbacks are cleared before instant restart so leaderboard, near-miss, personal-best, and retry prompts do not bleed into the next run.
- Global leaderboard qualification is allowed to interrupt with a bigger fanfare and special voice line because it is rare and score-defining.
- Optional intro narration remains exclusive to the `intro_narrator` group and is stopped on panel changes.

## Shipped Event Pools

- `mission_control_launch`: run start.
- `mission_control_level_start`: wave start and level pressure.
- `mission_control_wave_clear`: wave clear and challenge clear.
- `mission_control_reinforcements_incoming`: Mayhem reinforcement warnings, with a 100-line no-repeat pool.
- `mission_control_boss_inbound`: boss gate and boss entry.
- `mission_control_victory`: boss defeat.
- `mission_control_combo`: combo multiplier spikes.
- `mission_control_life_low`: low-life and clutch warnings.
- `mission_control_powerup`: powerup pickup.
- `mission_control_global_highscore`: global leaderboard qualification.
- `mission_control_local_highscore`: local/offline leaderboard fallback.
- `mission_control_personal_best`: personal best when global qualification does not fire.
- `mission_control_game_over`: death/retry temptation.
- `mission_control_restart`: instant restart.
- `mission_control_hijacker`: tractor-beam threat.
- `mission_control_tractor_hijack`: rare tractor-beam reversal payoff.

## Current Provenance

The current 2026-05-19 pack is ElevenLabs output generated from the approved Misfit Galaxy `Female misfit` voice (`SIbt9DJkaY96v2K2fQyQ`) using `eleven_v3`. The voice was selected because the previous local fallback sounded too generic for Nova Swarm's arcade-cabinet identity. Keep `Microsoft Zira Desktop` only as an emergency local fallback via `npm run generate:local-announcer-voicepack`.

The current Ralph-loop verification checked that `ELEVENLABS_API_KEY` is present and accepted by ElevenLabs `/v1/user` with HTTP 200, without printing, logging, or committing the key.

The 2026-05-19 voice-cadence loop did not regenerate the voice pack. It added runtime guards and automated proof that first-run launch chatter, instant restart, and rapid restart spam stay separated: `npm run check:voice-cadence` passed at `test-results/voice-cadence-2026-05-19T21-48-17-458Z/report.json`.
