# D1 Database Binding - 30 Sekunders Guide

## Hvorfor trenger vi dette?

Spillet fungerer allerede, men highscores lagres ikke ennå fordi Cloudflare Pages trenger eksplisitt tillatelse til å bruke D1 databasen.

## Steg-for-steg (med screenshots)

### 1. Gå til Cloudflare Dashboard
URL: https://dash.cloudflare.com

### 2. Naviger til Pages
- Klikk på "Workers & Pages" i sidebar
- Velg "burt-game" prosjektet

### 3. Åpne Settings
- Klikk på "Settings" tab
- Scroll ned til "Functions" seksjonen

### 4. Legg til D1 Binding
Under "D1 database bindings":
- Klikk **"Add binding"**
- **Variable name:** `DB` (ekstremt viktig, må være nøyaktig dette!)
- **D1 database:** Velg `burt-game-db` fra dropdown
- Klikk **"Save"**

### 5. Ferdig!
Ingen redeploy nødvendig. Neste gang noen åpner spillet, vil highscores fungere.

## Verifiser at det fungerer

### Test 1: API direkte
```bash
curl https://e208f58c.burt-game.pages.dev/api/highscores
```

Skal returnere JSON med test data:
```json
[
  {"id":1,"name":"KURT","score":15000,"level":8,"created_at":"..."},
  {"id":2,"name":"EIRIK","score":12000,"level":7,"created_at":"..."},
  ...
]
```

### Test 2: I spillet
1. Åpne https://e208f58c.burt-game.pages.dev
2. Klikk "START SPILL"
3. La deg bevisst dø
4. Skriv inn et navn (f.eks. "TEST")
5. Trykk ENTER
6. Du skal se highscore listen med ditt navn

## Database Info

- **Database Name:** burt-game-db
- **Database ID:** dec0edd2-9a7c-4dab-8ee3-4224c78c0915
- **Region:** EEUR (Europe East)
- **Status:** ✅ Running med test data

## Hvis det ikke fungerer

### Debug steg:

1. **Sjekk binding:**
   - Gå til Settings → Functions
   - Er "DB" binding der?
   - Er det koblet til riktig database?

2. **Sjekk database:**
   ```bash
   npx wrangler d1 execute burt-game-db --remote --command="SELECT * FROM game_highscores LIMIT 5"
   ```
   Skal vise test data.

3. **Sjekk API uten binding:**
   Hvis du får error, sjekk browser console (F12) for feilmeldinger.

4. **Kontakt Cloudflare Support:**
   Hvis alt ser riktig ut men ikke fungerer, kan det være et midlertidig problem.

## Alternative: Bruk Wrangler

Du kan også legge til binding via wrangler.toml (allerede gjort):

```toml
[[d1_databases]]
binding = "DB"
database_name = "burt-game-db"
database_id = "dec0edd2-9a7c-4dab-8ee3-4224c78c0915"
```

Men for Pages må det også legges til via dashboard.

## Forklaring

### Hvorfor to steder?

- **wrangler.toml:** Brukes for lokal utvikling og Workers
- **Dashboard binding:** Brukes for Pages Functions i produksjon

### Sikkerhet

D1 bindings er sikre fordi:
- Database er ikke eksponert direkte til internett
- Kun Pages Functions har tilgang
- API gjør input validation
- Navn sanitizes (kun A-Z og 0-9)

## Ferdig!

Når binding er lagt til:
✅ Highscores lagres i D1
✅ Leaderboard vises
✅ Alt fungerer som det skal

---

**Spill nå:** https://e208f58c.burt-game.pages.dev
