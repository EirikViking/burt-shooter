# Nova Swarm Deployment Guide

## Live URLs

- Primary custom domain: https://novaswarm.tinyfoundry.app
- Previous custom domain: https://burt.tinyfoundry.app
- Cloudflare Pages production URL: https://burt-game.pages.dev
- Latest verified production deploy: https://b5082e39.burt-game.pages.dev
- Latest deployed build ID: `v2026-05-19_20-17-31`

## Cloudflare Pages Project

- Project name: `burt-game`
- Build output: `dist`
- D1 database binding: `DB`
- D1 database name: `burt-game-db`
- D1 database ID: `dec0edd2-9a7c-4dab-8ee3-4224c78c0915`

## Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=burt-game --branch main
```

## Verify

```bash
Invoke-WebRequest -Uri https://novaswarm.tinyfoundry.app/version.json -UseBasicParsing
Invoke-WebRequest -Uri https://burt-game.pages.dev/version.json -UseBasicParsing
```

Both endpoints should report the same build ID as `public/version.json`.

## Highscore API Checks

```bash
Invoke-WebRequest -Uri https://novaswarm.tinyfoundry.app/api/highscores -UseBasicParsing
```

If highscore writes fail, confirm the Pages project still has the `DB` D1 binding attached to `burt-game-db`.

## Database Migration

```bash
npx wrangler d1 execute burt-game-db --remote --file=./schema.sql
```

## Local Development

```bash
npm run dev
npm run build
npx wrangler pages dev dist --d1 DB=burt-game-db
```
