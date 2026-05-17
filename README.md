# NOVA SWARM

Nova Swarm is a browser arcade shooter about readable bullet patterns, cheeky enemy formations, bonus-core chaos, and high-score runs that feel fair enough to replay.

**Live demo:** https://burt.tinyfoundry.app

## Run Locally

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:3000`.

## Build And Smoke Test

```bash
npm run build
npm run check:audio
npm run audit:audio-mix
npm run capture:steam-screenshots
npm run smoke
```

`npm run smoke` starts a production preview, drives the game through menu, settings, desktop gameplay, mobile gameplay, wave transitions, and boss victory checks, then stores screenshots and a JSON report in `test-results/`.

`npm run check:audio` verifies audio manifests, SFX/voice catalogs, music contexts, mix keys, and fallbacks.

`npm run audit:audio-mix` uses FFmpeg `volumedetect` to measure referenced music, SFX, and voice assets. It requires `ffmpeg` on PATH.

`npm run capture:steam-screenshots` captures a repeatable 1280x720 candidate screenshot set from `dist/` or from `STEAM_CAPTURE_URL` when supplied.

## Current Direction

- Original generated backdrops, boss dossier art, and comms portraits live in `public/art/generated/`.
- The first-run story intro uses generated cinematic panels, ElevenLabs narration, custom stingers, and an intro music context.
- Ship select now offers 216 visual ship variants, and enemy waves use a 48-style runtime variant catalog for broader arcade variety without changing hitbox fairness.
- Real-person photos and private-joke assets are not shipped.
- Player-facing text has moved to a public arcade-comedy voice: coin slots, bonus stages, formation swarms, hitboxes, boss patterns, and leaderboard bravado.
- Menus, settings, pause, mobile HUD, boss alerts, and high-score flows are covered by the production smoke harness.
- `window.render_game_to_text()` and `window.advanceTime(ms)` are available for automated playtests.
- Steam/store readiness notes are tracked under `docs/reviews/`.

## Deploy To Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist
```

The high-score API uses Cloudflare Pages Functions and D1. Database setup lives in `schema.sql` and `wrangler.toml`.

## Controls

### Desktop

- **WASD** or **Arrow keys**: Move
- **Space**: Shoot
- **Shift**: Dodge
- **P** or **Esc**: Pause

### Gamepad

- **Left stick / D-pad**: Move
- **A / RB / RT**: Shoot
- **B / LB**: Dodge
- **Start / Select / Home**: Pause

### Mobile

- Touch joystick movement
- Auto-fire enabled

## Powerups

- **Triple Beam**: Wider shot spread
- **Vector Boost**: Faster movement
- **Rapid Cabinet**: Higher fire rate
- **Overdrive Core**: Maximum temporary firepower
- **Bonus Core**: Random special effect such as shields, score boosts, pierce, slow time, or score multiplier

## Enemies

- **Scout Drone**: Basic formation fighter
- **Shield Wasp**: Tougher formation fighter
- **Zigzag Skimmer**: Side-to-side pressure pattern
- **Spiral Ace**: Circular movement pattern
- **Trickster**: Erratic arcade pattern
- **Hunter**: Aggressive pursuit unit
- **Bonus Drone Raid**: Optional high-risk bonus wave

## Boss Fights

Boss encounters escalate with larger health pools, phase shifts, signature movement profiles, and loud dossier-style alerts.

## Architecture

- **Frontend**: PixiJS with WebGL rendering
- **Audio**: Web Audio API plus pooled media playback
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1
- **Build**: Vite

## Project Map

```text
src/
  main.js                 Entry point
  game/                   Main game controller, boss factory, game state
  scenes/                 Menu, play, game over, highscores, ship select
  entities/               Player, enemy, boss, projectile, bonus drone entities
  managers/               Bullet, enemy, powerup, particle, and effects systems
  input/                  Keyboard, touch, and gamepad input
  audio/                  Sound effects, voices, music contexts
  ui/                     HUD, overlays, responsive layout
  api/                    High-score API client

functions/
  api/                    Cloudflare Pages Functions

schema.sql                D1 database schema
```

## Arcade Comedy

The game keeps the humor broad and genre-native: enemy formations complain about choreography, bosses overcommit to dramatic entrances, bonus stages arrive at inconvenient moments, and the leaderboard treats initials like heroic callsigns.
