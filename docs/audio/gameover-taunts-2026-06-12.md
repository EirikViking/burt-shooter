# Game Over Taunts - 2026-06-12

Nova Swarm now ships a 100-file `game_over_taunt` voice pool for the Game Over screen.

- Voice target: Angry AL - Intense Male Space Misfit (`KLZOWyG48RjZkAAjuM89`)
- Direct ElevenLabs generations: `game_over_taunt_001.mp3` through `game_over_taunt_043.mp3`
- Derived variants: `game_over_taunt_044.mp3` through `game_over_taunt_100.mp3`

The ElevenLabs account quota was exhausted after line 43 during this run. To keep the runtime pool at 100 usable files, the remaining files were created from the generated ElevenLabs male-voice source takes using FFmpeg pitch, tempo, echo, and level variation. Regenerate with `npm run generate:gameover-taunts -- --force` after replenishing ElevenLabs quota if every line must be a direct unique read.
