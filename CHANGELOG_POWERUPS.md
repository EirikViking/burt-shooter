# Changelog - Powerup Balance Update

## Summary
Implementert et nytt balansert powerup-system for å sikre at spillere alltid får powerups, samtidig som vi unngår spam og "clumping".

## Endringer

### `src/managers/PowerupManager.js`
- **Hybrid Drop Model**: Kombinerer lav tilfeldig sannsynlighet med garanterte "sikkerhetsvinduer".
- **Garanterte drops**:
  - Hvert level genererer 2 tilfeldige progresjonsvinduer (mellom 20% og 80% av level).
  - Hvis spilleren ikke har fått nok powerups når disse punktene nås, tvinges en drop ved neste mulighet.
- **Cooldown**: Innført global cooldown (satt til 15s) for å hindre drops tett inntil hverandre.
- **Max limit**: Standard maks 3 powerups per level.

### `src/config/BalanceConfig.js`
- Opprettet/Oppdatert konfigurasjon:
  - `dropChance`: 0.05 (5%)
  - `cooldownMs`: 15000 (15 sekunder)
  - `maxPerLevel`: 3
  - `minPerLevel`: 2
  - `guaranteeWindowStart`: 0.2
  - `guaranteeWindowEnd`: 0.8
  - `logDrops`: true (for debug)

## Verifikasjon
- Systemet logger drops i konsollen: `[PowerupManager] Dropped ...`
- Logging viser om en drop var `Random` eller `Guarantee`.
- Garanti tester at drops < desired før de trigger.
