# Nova Swarm competition-learning pass

Date: 2026-07-16

## Market read

The goal was not to copy another survivor or shmup. It was to identify feedback loops that nearby games communicate more clearly, then adapt exactly three of them to Nova Swarm without widening ranked scoring or replacing its existing systems.

Official references reviewed:

- Brotato: https://store.steampowered.com/app/1942280/Brotato/?l=english
- Deep Rock Galactic: Survivor: https://store.steampowered.com/app/2321470/Deep_Rock_Galactic_Survivor?l=english
- Deep Rock Galactic: Survivor Masteries and Anomalies update: https://store.steampowered.com/news/posts/?enddate=1719313910&feed=steam_community_announcements
- Halls of Torment: https://store.steampowered.com/app/2218750/Halls_of_Torment/?l=english
- Halls of Torment update covering detailed stats, DPS meters, and Training Grounds: https://store.steampowered.com/news/posts/?enddate=1738768369&feed=steam_community_announcements
- Geometry Wars 3: Dimensions Evolved: https://store.steampowered.com/app/310790/Geometry_Wars_3_Dimensions_Evolved/
- Crimzon Clover World EXplosion: https://store.steampowered.com/app/1718160/Crimzon_Clover_World_EXplosion/
- Super Galaxy Squadron EX Turbo: https://store.steampowered.com/app/345860/Super_Galaxy_Squadron_EX_Turbo/

Three useful gaps emerged:

1. Deep Rock Galactic: Survivor and Halls of Torment make mastery progress legible beyond a single high score. Nova Swarm had broad Career XP and unlocks, but no concise per-hull proof of mastery.
2. Halls of Torment exposes detailed combat statistics and DPS feedback. Nova Swarm's score report was rich in outcomes but weak at explaining weapon performance and shot discipline.
3. Deep Rock Galactic: Survivor's Anomalies and the training/practice affordances common to strong shmups let players isolate a skill. Nova Swarm already had Scout, but only as one fixed lower-pressure preset.

Brotato's build variety and the survivor competitors' larger progression trees were deliberately not copied. Nova Swarm already has Tactical Drafts, Fusion Protocols, Pilot Orders, Codex discovery, Daily Challenge, Sector practice, and distinct ship traits; another broad item or meta-progression layer would add noise instead of feedback.

## Exactly three implemented improvements

### 1. Per-ship Mayhem mastery medals

- Every hull has Bronze, Silver, and Gold medals.
- Bronze: reach Sector 3 in Mayhem Pure or Mayhem Tactical.
- Silver: reach Sector 6 in Mayhem Pure or Mayhem Tactical.
- Gold: clear one ranked Mayhem run.
- The Hangar ship-details screen shows the three-medal strip, current tier, and next goal.
- Flight Report and the result screen show the current tier and a newly earned tier.
- Scout, Sector Run, Daily Challenge, and debug/unranked runs cannot advance mastery.
- Progress reuses the existing `shipSpecificMilestones` field inside `nova.hangarProgress.v1`; storage keys, save version, and Steam Cloud paths are unchanged.

### 2. Local combat telemetry

- Live run state records effective health actually removed rather than requested/overkill damage.
- Pause and Flight Report show total effective damage, average DPS, peak one-second DPS, projectile accuracy, and top damage source.
- Accuracy counts each successfully launched projectile once and each projectile at most once on hit, including piercing projectiles.
- Damage sources distinguish primary fire, bombs, Plasma Lance, Chain Lightning, ship traits, tactical drones, Fusion Protocols, Shockwave, Row Core, Graze Break, Orbital Strike, and other damage.
- Telemetry is local feedback only. It does not enter score, XP, leaderboard payloads, achievements, difficulty, drops, or enemy behavior.

### 3. Scout anomalies

Scout now has three selectable, persistent practice presets. Left/Right cycles the preset while Scout is focused, and the card plus briefing state the exact rule.

- Calibration: the original Scout pressure and Scout bosses.
- Bullet School: ranked-speed hostile projectiles and firing pressure, while retaining Scout sustain and reduced non-projectile pressure.
- Boss Lab: Scout normal waves followed by full-strength Mayhem bosses.

Every anomaly remains Scout:

- unranked;
- no global or local leaderboard submission;
- no achievement unlocks;
- no Career XP or ship mastery;
- no Pilot Order or checkpoint progression;
- no score multiplier change.

## Verification evidence

Focused automated checks:

- `npm run check:competition-learning`
- `npm run check:run-modes`
- `npm run check:run-report`
- `npm run check:pause-context-chips`
- `npm run check:hangar-controller-details`
- `npm run check:how-to-play`
- `npm run check:hangar-unlock-integrity`
- `npm run check:steam-cloud-save`
- `npm run check:scout-local-best`
- `npm run check:mayhem-scout-difficulty-delta`

Visual/runtime evidence is kept under ignored `test-results/`, notably:

- `run-modes-mayhem-scout-sector-2026-07-16T22-24-52-623Z/`
- `how-to-play-2026-07-16T22-00-02-806Z/`
- `pause-context-chips-2026-07-16T22-04-30-833Z/`
- `run-report-2026-07-16T22-04-49-358Z/`
- `hangar-controller-details-2026-07-16T22-04-58-734Z/`
- `develop-web-game-competition-learning-active/`

The How To Play suite covers 1280x720, 1920x1080, 760x640, and 3840x2160 at 100%, 150%, 175%, and 200% UI scale. Localized visual samples cover German, Japanese, Russian, and Simplified Chinese.

## Release boundary

The deployed target is only the private Steam branch `sector-continue-test`: BuildID `24249013`, depot manifest `7112821787605154596`. Independent SteamCMD snapshots prove public/default remained on BuildID `24245709`.

Steamworks settings, store metadata, pricing, community posts, leaderboard identities/routing, score and XP formulas, achievement IDs, save identity/version, and Steam Cloud paths remained outside this pass.
