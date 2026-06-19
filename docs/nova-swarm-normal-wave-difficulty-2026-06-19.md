# Nova Swarm Normal Wave Difficulty - 2026-06-19

## Change

Normal wave generation now applies a +9 difficulty-level offset before selecting normal-wave counts, pressure tuning, tactics, danger moments, threat actions, elite middle ships, projectile pressure, and normal enemy spawn level.

This means new Sector 1 normal waves use the old Sector 10 normal-wave intensity. Sector 2 continues as old Sector 11, Sector 5 as old Sector 14, and so on.

## Bosses

Boss difficulty is unchanged. Boss phase enemy pressure, boss support ships, boss adds, boss timing, boss HP, boss projectile settings, boss rewards, and boss voice paths continue to use the real sector number.

The targeted test guards the current boss metric hash:

```text
8a39603efe2e2bf49c421a2b4e419623d0b4842876d9261db18066449a49010d
```

## Test Evidence

Run:

```bash
npm run check:normal-wave-difficulty-shift
```

The check verifies:

- new Sector 1 normal-wave metrics match old Sector 10 with deterministic variance
- new Sector 5 is harder than old Sector 5
- normal waves still generate for Sectors 1, 5, 10, 20, and 30
- boss metric hash is unchanged
- Sector Challenge starts remain 5, 11, 21, and 31
- save, achievement, and leaderboard identity files remain untouched

## Manual Test Advice

Start a fresh Launch Run and play Sector 1 through the first boss gate. Normal waves should pressure the player much sooner than before, with denser formations and earlier danger moments. Then use a Sector Challenge checkpoint and confirm checkpoint starts still use their displayed sector start behavior.

For boss verification, compare the first boss and any checkpoint boss against the previous build: boss health, support pacing, projectile feel, voice behavior, and rewards should feel unchanged.

## Rollback

Rollback this balance pass with:

```bash
git revert <source-commit>
```
