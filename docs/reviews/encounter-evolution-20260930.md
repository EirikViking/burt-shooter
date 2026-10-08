# Encounter evolution — local first increment

## Checkout and authorization

- Source: `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`.
- Branch: `codex/sector-leaderboard-unknown-20260928`.
- Baseline / unchanged HEAD: `7e8325e3d9abb09357636bca7e994c0227be02d6`.
- Initial status: only inherited, untracked `HANDOFF.md`; no tracked edits.
- No upstream is configured, and origin has no branch of this name. Fetch completed; no pull or branch/worktree change was made. The handoff's branch/HEAD/path matched. Its remote freshness statement was historical.
- User authorized this bounded source/build/test increment. No commit, push, deploy, upload, Steamworks change, or production player-data reset was performed.

## Existing systems verified before editing

Space Snakes already had real damageable segments, fourteen species, species broods, bounded maternal healing, and orphan retreat. Convoy Breakout already freed two independently locked fighters for ten combat seconds. Rival Strike already had two destructible guns, an exposed core, and one shootable score drone after core destruction. First Light already yielded to major contacts. EncounterPacing already admitted rare intended combinations, with recovery and anti-repeat checks. EncounterScorePacing paid irreversible health progress within an encounter budget; healing/repeated damage could not refill its credit.

The integration uses these systems: one chain-owned Molt controller; one run-local state inside FirstLightModel; the existing side-part hit/presentation path and friendly projectile ownership. No new director, persistence schema, leaderboard identity, achievement identity, or global scoring adjustment was introduced. Onslaught Tactical retains Sector 51, zero score, three selected first-level augments, and its separate leaderboard. Cabinet Wonders and Pure equipment rules remain intact.

## Implemented behavior and tuning hypotheses

### Serpent Molt

Only standalone **Cinder** snakes, from the existing Sector 6 eligibility window, can molt. At age >=3 seconds, with at least two living sections and <=62% of original total health, armor fractures for 0.65 seconds. The same living sections reveal a narrow warm core and move 22% faster with a bounded slalom. They retain their remaining health and original score values. Lethal burst damage can prevent or shorten the transition.

Two plates separate toward 28% / 72% playfield width and drift downward. Each has 9% of original snake health as optional durability and a six-second hard expiry. The central lane remains open. They have no player-contact collision or damage. Both friendly and hostile projectiles stop at solid armor, including Pierce, Chain trigger shots, beam shots, and drones. Bombs use the existing detonation/blast route. Friendly fire can destroy a plate to reopen that lane; hostile impacts do not damage cover. This asymmetry is deliberate: enemy fire uses cover without draining the player's option to retain it. Plates are absent from enemy, objective, graze, kill, XP, loot and achievement accounting. Destroying or expiring cover adds zero score. Mother death/clear/death/retry disposes it promptly; brood ownership and retreat remain unchanged.

Players can move between cover and the open center or side lanes while firing. Actual hull volleys destroyed a deliberately targeted plate within four seconds for weak/rapid, broad, slow, precision, Ghost, permanent Drone, Chain and Pierce configurations. This demonstrates compatibility and lane reopening; it does not establish that retaining cover is sufficiently attractive. Human counterplay checks below remain required. Strong builds may spend the cover quickly, which is an allowed consequence.

Natural snake selection keeps the existing seeded roll and minimum three eligible waves between snakes. At a twelve-wave Molt gap, an existing standalone snake slot prefers Cinder; a maximum twenty-four-wave gap can spend an ordinary standalone slot on Cinder. Boss/mystery/First Light and pending major warnings exclude the new spectacle. Existing designed combinations remain available for other snakes.

### Convoy Payback

A complete two-lock rescue remembers the wing's hull ranks, sides and callsigns. Captivity, normal escort and return share teal/gold side livery. The normal ten-second escort completes before the callback becomes ready. One later normally scheduled Rival Strike can receive the wing after its two-second arrival, with at least 4.2 seconds remaining and a living side weapon. It chooses the left surviving gun, otherwise the right, and marks that gun with teal brackets.

Arrival lasts 0.8 seconds, firing up to 2.4 seconds, departure 0.8 seconds. Actual aimed friendly bullets spend at most 70% of that side weapon's original health, through the existing part-hit lifecycle. They cannot hit the core, normal enemies, or another gun. They cannot award player accuracy hits or create a second bonus drone. Player damage can complete the opening; early gun/core destruction makes the wing leave early. No low-health or performance-based trigger exists.

The ready callback expires after ninety eligible combat seconds or after the rescue sector +11. Pause, drafting, boss fights, unsafe major contacts and sector ceremonies do not consume this clock. Ordinary combat stalling consumes it. It is offered once per run, including if that offer expires. Run end/death/retry/scene destruction clears it.

The text arrival cue communicates with voices off and is localized in all eight languages. Existing rescue/weapon/core effects supply restrained sound cues. No new recorded dialogue or bespoke final audio was produced. Molt reuses cropped existing Cinder art with solid plate backing and fracture seams; human art/audio polish remains possible.

Tuning locations:

- `src/game/SerpentMolt.js`: phase, durability, lifetime, eligibility and gap constants.
- `src/effects/SerpentMolt.js`: positions, sweep collision, plate art and cue mix.
- `src/entities/SpaceSnake.js`: exposed silhouette, speed/slalom and real hit radius.
- `src/managers/EnemyManager.js`: existing snake-slot selection and cleanups.
- `src/game/ArcadeFirstLight.js`: callback clocks, part eligibility and 70% cap.
- `src/managers/ArcadeFirstLightDirector.js`: aimed bullets, ownership and cue.
- `src/effects/ArcadeFirstLightVisual.js`: wing identity, target marker and arrival line.
- `src/i18n/encounterEvolutionText.js`: complete eight-language help/arrival dictionary, included through the existing locale map.

## Opportunity and comparability changes

The 400-seed, 300-eligible-wave survey uses the actual existing hash/roll and snake spacing. A three-eligible-waves-per-sector assumption is explicitly a simulation hypothesis, not measured human sector pace. Existing selection produced a longest snake drought of 76 eligible waves and Molt p95 gap of 31. The bounded candidate gives Molt p95/max gaps of 24; mean snakes rise from 31.475 to 33.425 per 300 eligible waves (~6.2%). Unsafe contacts postpone this bound. This adds potential snake/brood scoring opportunities and changes species distribution; it is a real comparability change even though score formulas stay unchanged.

Cover can remove hostile shots before an existing graze/bullet-clear opportunity, and can delay player damage while a lane is blocked. Exposed movement/hit radius changes difficulty. Earned Payback can make a gun disable and a rival bonus-drone opportunity easier to reach; the one-drone reward remains unchanged. No added credit comes from plates or callback bullets themselves. Special encounter damage pacing remains capped and irreversible. No hidden leaderboard compensation or reset was made.

## Verification and limits

Passed:

- New pure regression: rescue identity, partial rescue, once-only bounded part damage, expiry, suspension/reset, early/mode/deep eligibility, plate deduplication/lifetime, burst/death and combination exclusions.
- New renderer regression: nine groups including actual hull/projectile volleys; hostile absorption/no plate contact/zero extra score; simultaneous mother/brood cleanup; real rival hit path; scene pause/draft/focus-release/death; actual Pure retry; actual Sector 51 entry with three augments and zero score.
- New visual regression: sixteen language/layout cases (all eight languages at 1280x720 and 800x600), four help cards, new detail bounds, Reduced Motion on and Flash Intensity zero. Inspected rendered Molt/Payback and representative German/Chinese/Korean/Japanese screenshots; no obvious glyph loss, overlap or clipping in those inspected images. Native translation quality still needs human QA.
- New natural-run recording: real held fire/key repeat and keyboard target steering; an invulnerable isolated test player; no forced encounters, kills or sector skips. SWIFT/MERLIN were rescued at combat time 10.333, completed escort at 22.551, returned naturally in Sector 2 at 54.906 and finished at 56.951. Ready time consumed was 17.141 eligible seconds. Their bullets contributed 0.546 damage of a 4.368 cap before normal gun destruction. Video duration includes boot and wall-clock timing. This is automated combat evidence, not a claim of fun.
- Existing First Light/model/regression, encounter pacing, encounter score pacing, Onslaught snake window, fourteen brood families, input-state transitions, controller-only flow, Steam Electron bridge, `check:i18n`, all-eight-language `check:i18n-ui`, and `build:current` prerequisites.
- Final production browser `npm run smoke`: zero routine console output, warnings/errors, page errors or bad responses.
- Final native `desktop:smoke:current`: production bundle boot, API/preload and explicit fresh-profile Steam isolation passed in disposable E: staging. This was a smoke run with an adjusted staging-only absolute dist path and shared dependency path because E: does not support junction creation. It was not an installer/package/Steam-client test.
- The develop-web-game input client ran actual keyboard choreography and produced states/screenshots. A disposable adapter used installed Chrome and composited screenshots because its default browser was unavailable and canvas readback was black. No browser was downloaded.
- `git -c core.whitespace=cr-at-eol diff --check` passed. Existing mixed source line endings were preserved.

Known harness limitation: `check-snake-brood-flow.mjs` completed its brood collision, ownership and audio assertions but fails later at line 55, expecting the obsolete `local` leaderboard tab after mocked Steam recovery; the current UI selects `tactical`. The file was left untouched. The initial source-server smoke complained about dev console output; rerunning the same harness against the final production preview passed. Fixture/setup mistakes were corrected; current reports/screenshots replaced earlier attempts. Superseded recordings remain because cleanup was rejected.

Controlled frame-time comparison (1280x720 headless Chrome, same Cinder/three weak shot lanes, 900 fixed steps, 780 post-warmup CPU samples, 180 RAF samples):

| Metric | Ordinary Cinder control | Cinder with Molt |
| --- | ---: | ---: |
| CPU p50 | 1.1 ms | 1.1 ms |
| CPU p95 | 2.0 ms | 2.3 ms |
| CPU p99 | 2.5 ms | 3.1 ms |
| CPU max | 7.6 ms | 5.0 ms |
| RAF p95 | 26.0 ms | 17.8 ms |
| RAF p99 | 29.2 ms | 19.5 ms |

Both retained eight real sections and zero fixture score. A second sequential measurement used the same Rival hull with/without an earned Payback. Control/candidate CPU p50 was 0.9/0.8 ms, p95 1.7/1.5 ms, p99 2.5/2.1 ms and max 3.7/3.8 ms. RAF p95 was 17.5/17.1 ms and p99 18.3/18.1 ms. The callback finished with zero fixture score. This sample shows no Payback tail regression; it does not establish a performance improvement.

The controls disable the new feature in candidate code; they are not separate historical packaged executables. RAF noise and short synthetic samples prevent a shipping-performance conclusion. Human shipping-client, deep pressure, Focus/Phase/controller and repeated-sighting performance/feel checks remain.

## Exact local test/build instructions

Run PowerShell in the existing source checkout. Inspect current status before doing another build; preserve later work. These commands create/reuse task-owned E: output only:

```powershell
$env:TEMP = 'E:\Codex\tmp\encounter-evolution'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null
$env:npm_config_cache = 'E:\dev-cache\npm'
$env:NOVA_SWARM_VITE_CACHE_DIR = 'E:\dev-cache\vite\nova-encounter-evolution'
Get-Item dist,node_modules | Select-Object FullName,LinkType,Target
Get-PSDrive E
npm run dev -- --host 127.0.0.1 --port 4895 --strictPort
```

Open one source-server route in a separate test browser profile:

- `http://127.0.0.1:4895/?autostart=1&offlineLeaderboard=1&encounterEvolution=molt`: normal controls versus a Sector 6 Cinder. Damage it to trigger Molt; it can die before shedding.
- Same query with `encounterEvolution=payback`: shoot both convoy locks; let both fighters finish their service. The test fixture then advances to the next existing rival eligibility window. Shoot the marked gun during the return.
- Same query with `encounterEvolution=natural`: ordinary Sector 1 run, no forced scheduling or sector skip.

These routes are DEV + loopback only, disabled for packaged/desktop URLs, and classified before progression/submission work with every prototype permission off. Cosmetic and gameplay state/timing/input still matter; a matching seed alone is not a complete reproduction. The local seed is `encounter-evolution-local-v1`. No forced query should be used as a ranked comparison.

In another shell in the same source directory:

```powershell
$env:TEMP = 'E:\Codex\tmp\encounter-evolution'
$env:TMP = $env:TEMP
$env:CHECK_URL = 'http://127.0.0.1:4895'
node scripts/check-encounter-evolution.mjs
$env:CHECK_OUTPUT_DIR = 'E:\Codex\builds\nova-swarm\encounter-evolution\evidence\runtime'
node scripts/check-encounter-evolution-runtime.mjs
$env:CHECK_OUTPUT_DIR = 'E:\Codex\builds\nova-swarm\encounter-evolution\evidence\visual'
node scripts/check-encounter-evolution-visual.mjs
$env:CHECK_OUTPUT_DIR = 'E:\Codex\builds\nova-swarm\encounter-evolution\evidence\natural'
node scripts/check-encounter-evolution-natural.mjs
npm run check:i18n
$env:I18N_UI_URL = $env:CHECK_URL
$env:I18N_UI_OUTPUT_DIR = 'E:\Codex\builds\nova-swarm\encounter-evolution\evidence\i18n-ui'
npm run check:i18n-ui
```

For the controlled measurement run `scripts/measure-encounter-evolution.mjs` twice sequentially, changing `CHECK_OUTPUT_DIR` to `evidence\baseline` / `evidence\candidate` and `MEASURE_MOLT` to `0` / `1`. Set `MEASURE_PAYBACK=1` and use `evidence\payback-baseline` / `evidence\payback-candidate` for the Rival comparison; unset it for Cinder. Keep other load, viewport and timing comparable. For selection survey set `CHECK_OUTPUT_DIR` to `evidence\pacing` and run `scripts/survey-encounter-evolution.mjs`; use `SURVEY_BOUNDED=1` with `evidence\pacing-bounded` for the candidate.

Full fresh build (the retained candidate already exists):

```powershell
$env:TEMP = 'E:\Codex\tmp\encounter-evolution'
$env:TMP = $env:TEMP
$env:npm_config_cache = 'E:\dev-cache\npm'
$env:NOVA_SWARM_VITE_CACHE_DIR = 'E:\dev-cache\vite\nova-encounter-evolution'
npm run build:current -- --outDir E:/Codex/builds/nova-swarm/encounter-evolution/current --emptyOutDir
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4896 --strictPort --outDir E:/Codex/builds/nova-swarm/encounter-evolution/current
```

After rebuilding, stop preview before cleanup. The final task build reused already-copied unchanged public assets with a disposable config (`copyPublicDir:false`, `emptyOutDir:false`); its index references `index-CWORuDRZ.js`. Two superseded generated JS chunks remain because cleanup was rejected. The normal source `dist` junction and the previous required packaged executable were not overwritten. The static build retains the existing `v2026-09-28_15-18-56` label; this candidate is identified by its uncommitted source manifest and current asset hash, not by a new release version.

Opt-in diagnostics: DEV test routes set `window.__game.encounterEvolutionDiagnostics=true` and keep at most eighty in-memory rows in `encounterEvolutionLog`, with family, phase/status, sector, combat time, score, identity/budget/damage and cleanup outcome. They add no combat HUD or network telemetry. Copy the relevant scene snapshot, log, input/control settings and timing alongside the seed for a reproduction. Logs reset with the run.

## Human playtest checklist / next gate

1. First Cinder sighting: without reading help, recognize that it is alive, armor separates and plates are solid cover. Hear a restrained cue without warning masking. Test both firing lanes and crossing a plate; identify any surprise death or confusing collision silhouette.
2. Counterplay: compare retaining cover by changing position with deliberately destroying it. Repeat with Toggle/autofire, Quasar Fan, Iron Orbit, Glacier Scope, permanent drones, Pierce, Chain, Ghost and a strong burst build. Verify useful cover time and safe alternate lanes; record phase/plate duration and hull/build.
3. Third sighting: ask which lane/plate choice changed and why. If the answer is always to erase both plates immediately, retune the same mechanic using measured trials before broadening species or combining headlines.
4. Rescue connection: voices off, identify the same wing on its return and its marked gun. Compare rescue and non-rescue runs; confirm the return opens a useful attack without winning the core fight.
5. Natural frequency: record several real early, Sector 51 and deep runs, including failed/partial rescues and missed rivals. Measure eligible-wave gaps and eligible callback time; validate the 24-wave/90-second hypotheses against actual pacing and scoring opportunity.
6. Pause/resume, Focus, Phase, draft, focus loss, death/retry and controller play on the shipping client; low Flash/Reduced Motion and compact layouts. Compare frame-time tails under deep pressure. Human review covers all language glyphs/translation quality.

### Deferred ideas — recorded only

- Veilborn rebuilding one bounded weapon platform from wreckage with a shootable tether.
- A curated snake/Veilborn shed-armor crossover after independent mechanics are verified.
- Dreadnought Breach based on dismantling a vast ship.
- Environment-specific short encounter sequences and new behavioral Fusion evolutions.

## Delivery / rollback

Current required local static build and QA evidence: `E:\Codex\builds\nova-swarm\encounter-evolution`. The previous `sector-leaderboard-fix\win-unpacked\Nova Swarm.exe` remains protected. Source changes are uncommitted. `HANDOFF.md` was preserved and extended.

The generated `rollback.patch` contains this task's tracked changes and newly added source/tests/report. It excludes the inherited handoff; preserve/remove only its appended task section manually when authorized. Review before any rollback, especially after later work:

```powershell
git apply --reverse --check E:/Codex/builds/nova-swarm/encounter-evolution/rollback.patch
# Only after explicit authorization, and after the check passes:
git apply --reverse E:/Codex/builds/nova-swarm/encounter-evolution/rollback.patch
```

No rollback was executed. Cleanup results and final Git state are recorded in `HANDOFF.md`.

### Cleanup blocked by automatic approval review

The task's source/preview servers and QA browsers were stopped. Recent active chats, process ownership, exact E: paths, absence of reparse points and exclusive read access were checked. Automatic approval review rejected the cleanup command with `blocked by policy` before execution. No files were removed or renamed; no alternate deletion mechanism was attempted.

Required retained artifacts: `current` static build, QA reports/screenshots, the verified natural-run video `evidence\natural\a770229e65035fabe565a1f89be6c5c8.webm`, source manifest and rollback patch. These are all under `E:\Codex\builds\nova-swarm\encounter-evolution`.

Disposable paths still present:

- `E:\Codex\tmp\encounter-evolution` — isolated Electron entry/profile, browser scratch, tiny temporary pre-edit manager copy, temporary build config and input-client adapter/actions.
- `E:\dev-cache\vite\nova-encounter-evolution` — this task's Vite cache only; shared npm/dependency caches were preserved.
- `E:\Codex\builds\nova-swarm\encounter-evolution\current\assets\index-S4alaV5y.js` and `index-OH9Lx8XX.js` — superseded generated chunks; the current index references neither.
- `E:\Codex\builds\nova-swarm\encounter-evolution\evidence\natural\5db8a8c542f089f8b231bb9cc27b23c1.webm`, `0ec51407b06c7484026c859b5cc1c25a.webm`, `b7c004b3fb1bd5dc5584617f6bf272bc.webm`, `natural-3.png`, and `natural-11.png` — superseded recording attempts/fixture screenshots.

The newer natural-run harness writes one stable `natural-run.webm` and releases its Playwright temporary video when executed; the existing verified video was not renamed after the rejected action. Cleanup is unfinished. Do not remove inherited deliverables or shared caches when resolving it.
