# Rescue surprise batch — 2026-10-02

## Candidate and scope

Eight of the requested 67 new contacts are implemented in the existing checkout. The other 59 remain pending. Private delivery ID and final gate results are recorded in HANDOFF.md and `E:/Codex/builds/nova-swarm/rescue-delivery-20261002-becefac7/delivery.json` after authenticated verification. No public promotion is authorized. Existing build/temp directories are preserved at the user's latest request; the new delivery uses a unique build/temp root.

**Delivered:** private sector-continue-test Build25675532 / depot4765071 manifest2141408636682790097, v2026-10-02_12-12-22. Authenticated public25671489/test23782673/Cloud unchanged. Final source461/payload15568/native4520 hashes, compiled smoke/eight-language UI/controller, actual native keyboard/gamepad/fire/pause and focused regressions pass. Initial native startup screenshot contained boot text; stronger actual packaged control-smoke and inspected gameplay screenshots provide gameplay evidence. Two matched performance pairs show stable RAFp99~17.3–17.4ms; first candidate CPUp99 rise12.3→20.2ms was not reproduced in reverse order(candidate12.0/baseline12.9ms). All captures have zero>50ms samples. Hardware/other-app conditions uncontrolled. Human manual checks below remain outstanding.

Same branch `codex/sector-leaderboard-unknown-20260928`, HEAD/baseline `7e8325e3d9abb09357636bca7e994c0227be02d6`; inherited dirty work preserved. No branch/worktree/directory switch, reset, stash, pull, commit or push. No upstream; the earlier bounded fetch timed out, so remote freshness remains unverified.

## What's new

| Contact | Player action and physical consequence |
|---|---|
| Twin Jailers | Free either captive first; that fighter pressures the other jailer's gun with a capped ally budget. |
| Crossed Chains | Shoot a tether to stop its captive pod at its actual position. |
| Prisoner Exchange | Interrupt the moving transfer relay, or destroy its gun first to extend the rescue window by two seconds. |
| Last Shuttle | Destroy propulsion to freeze the pursuer and fix its firing lane, or destroy its gun directly. |
| Convoy Split | The actual transport texture divides into two moving hull halves; rescue and gun lanes separate. |
| Shielded Evacuation | Break matching projectors to expose locks. Both broken projectors leave two short-lived moving projectile shields. |
| Stolen Callsign | Identify the hostile red emitter; breaking it exposes the captive locks. |
| Rescue Tow | Break the visible tow to release a fighter, or silence the tug first. |

Eight new recorded ElevenLabs effects: arrival, tether release, engine failure, shield fracture, mimic disable, rival arrival, fighter launch and weapon destruction. The user requested substantially stronger sound: a second paid source pass adds layered mechanical transients, turbine/pressure bodies and distinct short release tails, with38Hz high-pass rather than75Hz and stronger controlled masters. Durations0.9–1.8 seconds, true-peak ceiling-3dB, bounded existing priority/cooldowns, sixteen prewarmed reusable audio slots. New body layers also support original convoy/rival arrivals and returning rescued fighters; original variant identity sounds remain. Raw paid sources, prompts and both generation receipts are retained under the owned E: build. Last observed quota: 4,983 credits remaining of 10,000; subscription counter changes are not a monetary billing calculation. Human listening and speaker/headphone mix review remain pending.

Authored physical layouts reuse the existing finished hull/component artwork. Hull splitting uses owned half-texture views; tether positions, gun poses, shields and collision targets share the same model coordinates. This batch does not add eight separately painted hulls or certify AAA quality. Text is complete in all eight supported languages; native-speaker review remains manual.

Also repaired the source asset loader to fetch the premium atlas JSON through its served public URL, and registered all new sound assets in the offline manifest. New projectile cosmetic phases and cue variation do not advance gameplay selection RNG.

Removed idle ordinary wreck sprites/brackets after the user's feedback about lingering ship remains. The capped run-local wreck registry still supports existing reconstruction rules. Only an active salvage claim or actual projectile cover receives a visual, using its machinery/plate artwork. Inactive records cannot recreate a deleted view. Normal short destruction fragments remain; no extra damage, reward or persistence change.

## Scheduling and credit

The existing First Light director remains the sole owner. Original sector1 convoy and sector2 rival remain. New opportunities begin at sector3, every third sector excluding original convoy/rival slots, after 15 seconds of actual ordinary combat recovery. These are initial tuning hypotheses. Shared `rescue_contact` family and existing major-event recovery prevent alias repeats and new overlap with bosses, snakes, mysteries, challenges, environments or headline warnings. Existing deliberately combined encounters are preserved.

Each contact divides the original convoy's six scaled HP across at most four parts. No refill, component score/XP/drop bounty, scripted lock rescue by allies, extra rival bonus drone or persistent quest schema. Contact duration is 16 playable combat seconds, at most18 for gun-first Exchange; cover is capped at two plates and3.2 seconds, does not collide with the player and grants no credit. Friendly and hostile shots both hit the actual cover footprint; the shot breaking a plate is stopped, later shots pass. Bomb snapshots cannot break a projector and hit its newly exposed lock in the same blast.

Scoring opportunity changes: additional earned escort appearances and contact attacks can alter subsequent kill/damage/graze opportunities. Shields can consume shots and close lanes. Zero direct component rewards does not establish total ranked score comparability. No global score compensation, board reset or player data reset was made.

## Local testing and tuning

Existing dependencies are used. Set E: paths before any server/build/test:

```powershell
$env:TEMP='E:\Codex\tmp\nova-rescue-batch'
$env:TMP=$env:TEMP
$env:npm_config_cache='E:\dev-cache\npm'
$env:NOVA_SWARM_VITE_CACHE_DIR='E:\dev-cache\vite\nova-rescue-batch'
npm run dev -- --host 127.0.0.1 --port 4970 --strictPort
```

Create/verify those owned E: directories if cleanup has removed them. Source-only prototype routes:

```text
http://127.0.0.1:4970/?autostart=1&offlineLeaderboard=1&encounterEvolution=rescue-twin-jailers
```

Replace the final ID with crossed-chains, prisoner-exchange, last-shuttle, convoy-split, shielded-evacuation, stolen-callsign or rescue-tow. Use `encounterEvolution=natural` for an ordinary isolated run. Forced routes are rejected in production/desktop builds and disable all ranked submissions, achievements, career/unlocks/rewards and Cloud progress. Do not use production player data for these fixtures.

```powershell
node scripts/check-convoy-surprises.mjs
node scripts/check-premium-art-loading.mjs
node scripts/check-convoy-surprise-audio.mjs
$env:CHECK_URL='http://127.0.0.1:4970'
$manualTask='nova-rescue-manual-'+[Guid]::NewGuid().ToString('N')
$manualRoot='E:\Codex\builds\nova-swarm\'+$manualTask
$manualTemp='E:\Codex\tmp\'+$manualTask
New-Item -ItemType Directory -Path $manualRoot,$manualTemp
$env:TEMP=$manualTemp
$env:TMP=$manualTemp
$env:npm_config_cache='E:\dev-cache\npm'
$env:NOVA_SWARM_VITE_CACHE_DIR='E:\dev-cache\vite\'+$manualTask
$env:CHECK_OUTPUT_DIR=$manualRoot+'\evidence'
node scripts/check-convoy-surprises-runtime.mjs
node scripts/check-convoy-surprise-safety-runtime.mjs
node scripts/check-convoy-builds-runtime.mjs
node scripts/check-convoy-localization-runtime.mjs
node scripts/playtest-opening.mjs
npm run check:release-line
npm run check:i18n
npm run build:current -- --outDir ($manualRoot+'\current')
```

Use a separate owned output for a new build if the current delivered build is in use. Build metadata is generated with `node scripts/update-build.cjs` before packaging. Native reproduction helpers/source hashes and exact release commands are retained in the E: build; package only after fresh applicable gates.

Tuning: `src/config/ConvoySurpriseCatalog.js` (HP, duration, sector predicate), `src/game/ConvoySurprises.js` (transitions, support and cover), `src/game/ArcadeFirstLight.js` (ordinary recovery), `src/config/EncounterPacing.js` (shared family recovery), `src/managers/ArcadeFirstLightDirector.js` (weapon lead-ins/cadence/eligibility), `src/effects/ConvoySurpriseVisual.js` (physical presentation), `src/audio/ConvoySurpriseSounds.js` (mix), `src/i18n/convoySurpriseText.js` (eight-language instructions).

Opt-in existing encounter diagnostics retain at most80 records for selection, duration, outcome, score window and cleanup. No network telemetry or combat HUD logging. Reproduction needs recorded relevant state, inputs and simulation timing as well as seed.

## Verified and remaining checks

Focused model/ownership/selection/reset/expiry checks pass. Actual projectile/configuration matrix64, actual Player hull/powerup matrix72 and contact/language/layout matrix192 pass. Low damage, burst/Ghost, broad and slow hulls, precision, drones, Chain, piercing, beam and bomb fixtures exercise real targeting. New audio/projectile RNG draw count is zero; symmetric physical cover and sixteen pooled audio instances verified. Controlled normal-selection probe reached a new contact in Sector3 at about152 combat seconds with test invulnerability/damage8; no forced contact/kill/sector skip. This proves admission, not finite-life frequency or balance. These controlled fixtures do not establish fun or survival difficulty. Final release evidence and any failures are appended to HANDOFF.

Human checklist: on first sighting, identify the captive and target without voices; understand the consequence after one shot; distinguish friendly escorts from hostiles. On a third sighting, try the opposite target order with broad autofire, precision and drones. Check useful lanes, projectile visibility, Focus/Phase, pause/focus-loss/draft/retry, Flash0/Reduced Motion, controller and supported layouts/languages. Count natural opportunities in multiple finite-life runs. Check all cues on headphones and speakers, hardware frame tails/world transitions, installed Steam online/save/Cloud identity. Automated tests do not establish any of those subjective conclusions.

Future batches9–67 remain defined in the approved production specification. Veilborn/wreck-tether and curated crossover, Breach and behavioral Fusion follow their existing independently verified rules; no unrelated framework rewrite or new hidden profile advantage is introduced here.

Latest subsequent priorities: substantially improve all boss animation/presence, planetary weather/surface alien activity, and42 individually authored beautiful/scary background creatures with42 unique sound identities. Those are pending separate verified milestones, not claims about this rescue package. Creatures must be harmless, behind combat, bounded/prewarmed, pressure/warning dimmed and inaccessible to gameplay selection RNG.

Autonomy recorded in AGENTS.md at the user's explicit request. Runtime standard-access probe created/read/deleted only `E:/Codex/tmp/nova-rescue-batch/standard-access-probe-37010848-7452-4c92-a5dd-c8fe83c3d4f2.txt`, exit0. A subsequent log audit established stored Full access versus stale active-turn workspace-write/on-request/auto_review, including a default cleanup approval and a later Steam network escalation. Fresh turn10:59:44Z records danger-full-access/never; authenticated SteamCMD then succeeded with standard access and no approval. No global security settings changed. Exact evidence in `docs/reviews/codex-permissions-20261002.md`.
