# BURT SHOOTER - Quick Reference

## 🔗 Important Links

### Play the Game
**https://e208f58c.burt-game.pages.dev**

### Cloudflare Dashboard
- **Pages Project:** https://dash.cloudflare.com/pages/view/burt-game
- **D1 Database:** https://dash.cloudflare.com → D1 → burt-game-db
- **Account:** https://dash.cloudflare.com/9377faad99d4b21f201632ed77ef9d91

### API Endpoints
- **GET Highscores:** https://e208f58c.burt-game.pages.dev/api/highscores
- **POST Score:** https://e208f58c.burt-game.pages.dev/api/highscores

---

## 🚀 Quick Commands

### Local Development
```bash
# Install dependencies
npm install

# Run dev server
npm run dev
# → http://localhost:3000

# Build for production
npm run build
```

### Database Management
```bash
# Create D1 database (already done)
npx wrangler d1 create burt-game-db

# Run migrations
npx wrangler d1 execute burt-game-db --file=./schema.sql --remote

# Query database
npx wrangler d1 execute burt-game-db --remote --command="SELECT * FROM game_highscores ORDER BY score DESC LIMIT 10"

# Insert test score
npx wrangler d1 execute burt-game-db --remote --command="INSERT INTO game_highscores (name, score, level, created_at) VALUES ('TEST', 5000, 3, datetime('now'))"
```

### Deployment
```bash
# Deploy to Cloudflare Pages
npm run build
npx wrangler pages deploy dist --project-name=burt-game

# View deployments
npx wrangler pages deployment list --project-name=burt-game
```

### Testing
```bash
# Test API locally (requires wrangler dev)
npx wrangler pages dev dist --d1 DB=burt-game-db

# Test API in production
curl https://e208f58c.burt-game.pages.dev/api/highscores

# Post test score
curl -X POST https://e208f58c.burt-game.pages.dev/api/highscores \
  -H "Content-Type: application/json" \
  -d '{"name":"CURL","score":9999,"level":5}'
```

---

## 📋 Project Info

### Database
- **Name:** burt-game-db
- **ID:** dec0edd2-9a7c-4dab-8ee3-4224c78c0915
- **Region:** EEUR
- **Table:** game_highscores

### Build Info
- **Node Modules:** 136 packages
- **Bundle Size:** 507 KB (151 KB gzipped)
- **Build Tool:** Vite 5.0.11
- **Framework:** PixiJS 7.3.3

---

## 🎮 Game Controls

### Desktop
- **WASD / Arrows:** Move
- **SPACE:** Shoot
- **SHIFT:** Dodge
- **ESC:** Back/Pause

### Mobile
- **Left side:** Virtual joystick
- **Tap:** Shoot

---

## 📁 File Structure

```
src/
  ├── main.js                    # Entry point
  ├── game/
  │   ├── Game.js                # Main game controller
  │   └── GameState.js           # Game states enum
  ├── scenes/
  │   ├── MenuScene.js           # Main menu
  │   ├── PlayScene.js           # Gameplay
  │   ├── GameOverScene.js       # Game over + input
  │   └── HighscoreScene.js      # Leaderboard
  ├── entities/
  │   ├── Player.js              # Player ship
  │   ├── Enemy.js               # Standard enemies
  │   ├── Boss.js                # Boss entities
  │   └── Bullet.js              # Projectiles
  ├── managers/
  │   ├── BulletManager.js       # Bullet pooling
  │   ├── EnemyManager.js        # Enemy spawning
  │   └── PowerupManager.js      # Powerup system
  ├── effects/
  │   ├── ParticleManager.js     # Particle effects
  │   └── ScreenShake.js         # Screen shake
  ├── input/
  │   └── InputManager.js        # Input handling
  ├── audio/
  │   └── AudioManager.js        # Web Audio API
  ├── ui/
  │   └── HUD.js                 # Heads-up display
  └── api/
      └── API.js                 # API client

functions/
  └── api/
      └── highscores.js          # Cloudflare Function

Config:
  ├── package.json               # Dependencies
  ├── wrangler.toml              # Cloudflare config
  ├── vite.config.js             # Build config
  └── schema.sql                 # Database schema
```

---

## 🎯 Game Entities

### Enemies
| Name   | HP | Score | Pattern    | Color   |
|--------|----| ------|------------|---------|
| Gris   | 1  | 10    | Sine       | Pink    |
| Mongo  | 2  | 20    | Sine Fast  | Brown   |
| Tufs   | 3  | 30    | Zigzag     | Orange  |
| Deili  | 4  | 50    | Circle     | Green   |
| Rølp   | 5  | 75    | Drunk      | Magenta |
| Svin   | 8  | 100   | Chase      | Red     |

### Powerups
| Name           | Effect              | Duration |
|----------------|---------------------|----------|
| Isbjørn Can    | Triple Shot         | 5s       |
| Kjøttdeig      | Speed Boost         | 5s       |
| Rølp Mode      | Rapid Fire + Damage | 3s       |
| Deili Fetta    | 5-way + Damage      | 10s      |

---

## 🛠️ Troubleshooting

### Build Issues
```bash
# Clear cache and rebuild
rm -rf node_modules dist .wrangler
npm install
npm run build
```

### Database Issues
```bash
# Verify database exists
npx wrangler d1 list

# Check table schema
npx wrangler d1 execute burt-game-db --remote --command="PRAGMA table_info(game_highscores)"

# Rebuild table
npx wrangler d1 execute burt-game-db --remote --command="DROP TABLE IF EXISTS game_highscores"
npx wrangler d1 execute burt-game-db --remote --file=./schema.sql
```

### Deployment Issues
```bash
# Check wrangler version
npx wrangler --version

# Update wrangler
npm install -D wrangler@latest

# Force redeploy
npm run build
npx wrangler pages deploy dist --project-name=burt-game --branch=main
```

---

## 📊 API Reference

### GET /api/highscores
Returns top 50 highscores.

**Response:**
```json
[
  {
    "id": 1,
    "name": "EIRIK",
    "score": 15000,
    "level": 8,
    "created_at": "2024-01-11T14:00:00.000Z"
  }
]
```

### POST /api/highscores
Submit a new score.

**Request:**
```json
{
  "name": "PLAYER",
  "score": 5000,
  "level": 5
}
```

**Response:**
```json
{
  "success": true,
  "id": 42
}
```

**Validation:**
- name: 1-10 characters, uppercase A-Z and 0-9 only
- score: positive integer
- level: positive integer

---

## 🔐 Environment Variables

No environment variables needed! Everything is configured in `wrangler.toml`.

---

## 📞 Support

### Issues?
Check these docs in order:
1. `README.md` - Basic info
2. `DEPLOYMENT.md` - Deployment guide
3. `D1_BINDING_GUIDE.md` - Database binding
4. `GAME_FEATURES.md` - Game features
5. `DELIVERY.md` - Complete overview

### Still stuck?
- Check Cloudflare docs: https://developers.cloudflare.com/pages
- Wrangler docs: https://developers.cloudflare.com/workers/wrangler

---

## ✅ Checklist

Before playing:
- [ ] Database created
- [ ] Migrations run
- [ ] Built successfully
- [ ] Deployed to Pages
- [ ] D1 binding added in dashboard

Game should work:
- [ ] Menu loads
- [ ] Can start game
- [ ] Player moves and shoots
- [ ] Enemies spawn
- [ ] Powerups drop
- [ ] Boss fight works
- [ ] Game over shows
- [ ] Highscores load

---

## 🎮 Have Fun!

**Play now:** https://e208f58c.burt-game.pages.dev

---

*Last updated: 2026-01-11*
