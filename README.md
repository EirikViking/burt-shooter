# BURT SHOOTER

Et klassisk arkade shooter spill inspirert av Galaga, med masse interne referanser til Kurt Edgar og Eirik sitt univers.

## 🎮 SPILL NÅ

**Live Demo:** https://e208f58c.burt-game.pages.dev

Spillet er deployet på Cloudflare Pages og klar til å spilles!

## Kjør lokalt

```bash
npm install
npm run dev
```

Spillet kjører på `http://localhost:3000`

## Build og smoke test

```bash
npm run build
npm run smoke
```

`npm run smoke` starter Vite preview av produksjonsbyggen, bruker Playwright/system-Chrome, tar skjermbilder av meny, gameplay og pause, og lagrer rapporten i `test-results/`.

## Nyeste polish-pass

- Generert arktisk key art og optimalisert WebP-bakgrunn ligger i `public/art/generated/`.
- Meny og gameplay bruker den nye arktiske/aurora-retningen for mer helhetlig uttrykk.
- Pauseflyt har modal med resume, settings og quit-to-menu.
- Settings-panelet har musikk/voice toggles, master/music/SFX/voice volum og fullscreen.
- Produksjonsbundle er splittet i app-, Pixi- og vendor-chunks for bedre caching.
- Pixi v8 tekstflater er ryddet via `src/utils/pixiText.js`.
- `window.render_game_to_text()` og `window.advanceTime(ms)` finnes for automatisert playtest.

## Deploy til Cloudflare Pages

### 1. Opprett D1 Database

```bash
npx wrangler d1 create burt-game-db
```

Kopier database ID fra output og oppdater `wrangler.toml`.

### 2. Kjør migrations

```bash
npx wrangler d1 execute burt-game-db --file=./schema.sql
```

### 3. Deploy

```bash
npm run build
npx wrangler pages deploy dist
```

## Spillkontroller

### Desktop
- **WASD** eller **Piltaster**: Bevegelse
- **SPACE**: Skyt
- **SHIFT**: Dodge (kort invulnerability)
- **P** eller **ESC**: Pause

### Mobil
- Touch joystick for bevegelse
- Auto-fire aktivert

## Powerups

- **Isbjørn Can**: Triple shot
- **Kjøttdeig Boost**: Økt hastighet
- **Rølp Mode**: Rapid fire med ekstra damage
- **Deili Fetta**: Ultimate power (5-shot + damage)

## Fiender

- **Gris**: Basic enemy
- **Mongo**: Tøffere, raskere
- **Tufs**: Zigzag pattern
- **Deili**: Sirkel pattern
- **Rølp**: Drunk pattern
- **Svin**: Aggressiv, følger spilleren

## Boss Fights

Boss hver 5. level med unike navn og progressive faser.

## Arkitektur

- **Frontend**: PixiJS med WebGL rendering
- **Audio**: Web Audio API for synth sounds
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite)
- **Build**: Vite

## Filer

```
src/
  ├── main.js                 # Entry point
  ├── game/
  │   ├── Game.js             # Main game controller
  │   └── GameState.js        # Game states
  ├── scenes/
  │   ├── MenuScene.js        # Main menu
  │   ├── PlayScene.js        # Gameplay scene
  │   ├── GameOverScene.js    # Game over + score input
  │   └── HighscoreScene.js   # Highscore leaderboard
  ├── entities/
  │   ├── Player.js           # Player ship (Eirik)
  │   ├── Enemy.js            # Enemy types
  │   ├── Boss.js             # Boss entities
  │   └── Bullet.js           # Projectiles
  ├── managers/
  │   ├── BulletManager.js    # Bullet pooling
  │   ├── EnemyManager.js     # Enemy spawning
  │   └── PowerupManager.js   # Powerup system
  ├── effects/
  │   ├── ParticleManager.js  # Particle effects
  │   └── ScreenShake.js      # Screen shake juice
  ├── input/
  │   └── InputManager.js     # Keyboard + touch input
  ├── audio/
  │   └── AudioManager.js     # Sound effects + music
  ├── ui/
  │   └── HUD.js              # Score, lives, level
  └── api/
      └── API.js              # Highscore API client

functions/
  └── api/
      └── highscores.js       # Cloudflare Pages Function

schema.sql                    # D1 database schema
```

## Easter Eggs

Spillet er fullpakket med interne referanser:

- Powerup navn
- Fiende typer
- Boss navn
- UI-tekst
- Loading screens
- Location displays

Alt er inspirert av Kurt Edgar og Eirik sitt univers med humor og kameratslighet.
