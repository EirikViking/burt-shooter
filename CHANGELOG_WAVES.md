# Changelog - Wave System Update

## Summary
Implementert et "Galaga-artet" wave-system der fiender ankommer i formasjoner stedet for tilfeldig spawning. Dette gir spillet mer struktur og belønner taktisk spill.

## Endringer

### `src/managers/EnemyManager.js`
- **Wave Logic**: Erstattet kontinuerlig spawning med en definert liste av "Waves" per level.
- **Formasjoner**: Implementer støtte for `GRID`, `V_SHAPE` og `ARC` formasjoner.
- **Wave Completion**: Spilleren belønnes nå med poeng og tekst ("WAVE CLEARED") når en formasjon er utslettet.
- **Boss Integration**: Bosser er nå implementert som egne waves på hvert 5. level.

### `src/entities/Enemy.js`
- **State Machine**: Innført tilstander `ENTERING` (innflyvning) og `FORMATION` (idle).
- **Smooth Entry**: Fiender bruker nå Bezier-kurver for å fly elegant inn fra siden av skjermen til sin plass i formasjonen.
- **Formation Hover**: Når fiender er på plass, svaijer de lett ("idle float") i stedet for å drifte nedover skjermen.

### `src/config/BalanceConfig.js`
- (Ingen endringer kreves i config da logikken nå genereres dynamisk i `EnemyManager`, men systemet respekterer eksisterende vanskelighetsgradparametre).

## Verifikasjon
- Spillet genererer waves ved level start.
- Fiender flyr inn i mønster.
- "WAVE CLEARED" vises når siste fiende i en wave dør.
- Boss fungerer fortsatt som forventet.
