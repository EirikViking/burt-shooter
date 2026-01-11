# BURT SHOOTER - Deployment Guide

## Live URL

🎮 **SPILL NÅ:** https://e208f58c.burt-game.pages.dev

## Siste Steg: Koble D1 Database til Pages

For at highscores skal fungere, må du manuelt koble D1 databasen til Pages prosjektet:

### Via Cloudflare Dashboard:

1. Gå til: https://dash.cloudflare.com/9377faad99d4b21f201632ed77ef9d91/pages/view/burt-game
2. Klikk på **Settings** → **Functions**
3. Scroll ned til **D1 database bindings**
4. Klikk **Add binding**
5. Variable name: `DB`
6. D1 database: Velg `burt-game-db`
7. Klikk **Save**

### Database Info:
- **Database Name:** burt-game-db
- **Database ID:** dec0edd2-9a7c-4dab-8ee3-4224c78c0915
- **Region:** EEUR (Europe East)

## Verifisering

### Test at spillet fungerer:
1. Åpne https://e208f58c.burt-game.pages.dev
2. Klikk **START SPILL**
3. Spill litt
4. Når du dør, test highscore:
   - Skriv inn navn
   - Trykk ENTER
   - Sjekk at du kommer til highscore listen

### Test highscore API direkte:
```bash
# Hent highscores
curl https://e208f58c.burt-game.pages.dev/api/highscores

# Send score
curl -X POST https://e208f58c.burt-game.pages.dev/api/highscores \
  -H "Content-Type: application/json" \
  -d '{"name":"TEST","score":1000,"level":3}'
```

## Oppdatere Spillet

Når du vil deploye nye endringer:

```bash
# 1. Bygg
npm run build

# 2. Deploy
npx wrangler pages deploy dist --project-name=burt-game
```

## Database Migrations

Kjør nye migrations på production:

```bash
npx wrangler d1 execute burt-game-db --remote --file=./schema.sql
```

## Lokal Utvikling

### Med Vite dev server (kun frontend):
```bash
npm run dev
# Åpne http://localhost:3000
```

### Med Cloudflare Pages dev (med D1):
```bash
npx wrangler pages dev dist --d1 DB=burt-game-db
```

## Produksjon URL Oversikt

- **Main URL:** https://burt-game.pages.dev (når production branch er satt)
- **Preview URL:** https://e208f58c.burt-game.pages.dev
- **Dashboard:** https://dash.cloudflare.com/pages/view/burt-game

## Troubleshooting

### Highscores fungerer ikke:
1. Sjekk at D1 binding er lagt til i Pages Settings
2. Sjekk at database_id i wrangler.toml matcher D1 database
3. Test API endpoint direkte med curl

### Build feiler:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database problemer:
```bash
# List alle D1 databases
npx wrangler d1 list

# Query database direkte
npx wrangler d1 execute burt-game-db --remote --command="SELECT * FROM game_highscores LIMIT 10"
```

## Alternative Deploy Metoder

### GitHub Actions (anbefalt for prod):

1. Push kode til GitHub
2. Koble GitHub repo til Cloudflare Pages
3. Set build command: `npm run build`
4. Set build output: `dist`
5. Legg til D1 binding i settings

### Manuel upload:
```bash
# Zip dist folder og last opp via dashboard
cd dist && zip -r ../dist.zip . && cd ..
```

## Performance Tips

- Spillet er optimalisert for WebGL
- Ingen tunge assets, kun code
- D1 database er ultra-rask (edge compute)
- Total bundle size: ~507 KB (151 KB gzipped)

## Neste Steg

Når D1 binding er lagt til:
1. Test full game loop
2. Få noen til å spille
3. Sjekk at highscores lagres
4. Nyt spillet!

---

**Ha det gøy i Stokmarknes!** 🎮🚀
