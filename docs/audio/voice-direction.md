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
- Powerup, combo, wave-clear, and hijacker warnings have cooldowns so the first minute stays clean.
- Global leaderboard qualification is allowed to interrupt with a bigger fanfare and special voice line because it is rare and score-defining.
- Optional intro narration remains exclusive to the `intro_narrator` group and is stopped on panel changes.

## Shipped Event Pools

- `mission_control_launch`: run start.
- `mission_control_level_start`: wave start and level pressure.
- `mission_control_wave_clear`: wave clear and challenge clear.
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

ElevenLabs was checked first, but the environment returned HTTP 401. The current 2026-05-19 pack is a local fallback generated with Windows System.Speech using `Microsoft Zira Desktop`, then processed through local FFmpeg pitch/tempo, EQ, compression, limiter, subtle echo, and loudness normalization via `npm run generate:announcer-voicepack`. Do not describe the current pack as ElevenLabs output unless it is regenerated from a valid ElevenLabs account and the provenance is updated.
