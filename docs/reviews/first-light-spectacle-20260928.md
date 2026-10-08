# First Light spectacle follow-up

Source checkout: `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`.
Branch: `codex/first-light-spectacle-20260928`.
Baseline: `c373146b773d29c899b59c6227dccec762d301e9`, clean, uniquely owned, zero commits behind fetched `origin/HEAD`.
Remote: `https://github.com/EirikViking/burt-shooter.git`. No pull, push, reset or history rewrite.

## Cause and repair

Wave interruption only lowered the encounter alpha while preserving the model, so Rival Strike appeared to vanish without a clear transition. The director emitted departure audio only when the encounter ended. A real reactor kill set `won`, and the visual hid the hull at once; the shortened lifetime also drove the ordinary departure motion upward during the breakup. Convoy fighters were 43 by 48 pixels and the transport left two seconds after the second lock, making the earned rescue easy to miss. Shared follow-through cues were quiet at the default sound mix.

Rival Strike now has a timed retreat and re-entry with one cue per edge. It retains HP and earned reward, removes its owned bullets during interruption, and is untargetable until visibly back. A core defeat holds the craft in the playfield, ignites a staged textured rupture and separates three pieces of its own hull before they char and fade. Convoy fighters launch at a readable size in an arc, retain their normal support duration and damage, and the empty transport has a visible powered exit. The model grants 3.2 seconds after both locks for this presentation. No leaderboard, save, achievement, Steam Cloud or other run-mode policy changed.

The user requested a score target in place of Rival Strike's shield pickup. Each reactor kill now ejects one shootable bonus drone to the side of the wreck. Its score value varies by rival hull and rises with sector, without advancing gameplay RNG. Ordinary wave cleanup excludes that earned drone; shooting it awards its displayed score once. The encounter no longer grants a shield.

Eleven new sound effects were generated from original descriptive prompts through ElevenLabs. Each of the four convoy designs has its own rescue cue; each of the six Rival designs has its own reactor-breakup cue; weapon detachment has one shared cue. Source MP3s are under `E:\Codex\builds\nova-swarm\first-light-spectacle\audio-source`; mastering details and SHA-256 values are in `docs/audio/first-light-spectacle-elevenlabs.json`. WAVs are mono 44.1 kHz PCM, with measured sample peaks at or below -8 dBFS. This is technical validation, not a claim of human listening approval.

## Checks and delivery

- `node scripts/check-arcade-first-light.mjs`: pass, including completed-rescue presentation window.
- `node scripts/check-first-light-regressions.mjs`: pass, including all hull-specific cue paths.
- `node scripts/check-first-light-runtime.mjs`: pass in the actual rendered game. Natural encounter admission, real projectile hits, two rescues/support shots, powered exit, partial Rival HP across interruption, one retreat and one return cue, on-screen core breakup, one shootable scaling score drone, all ten hulls, compact low-flash German and all eight Codex locales.
- `node scripts/check-audio-catalog.mjs`, `npm run check:i18n`, `npm run check:steam-electron-bridge`, `npm run check:release-line`: pass.
- `npm run build:current`: pass from the isolated E: source copy, version `v2026-09-28_12-22-34`. `npm run check:i18n-ui`: pass in all eight locales, with no page errors, missing placeholders or English leaks.
- `npm run package:steam:win:current`, `npm run check:steam-package-runtime`, and isolated `npm run desktop:smoke:packaged`: pass. The final smoke used an isolated fresh profile and local Steam mode, so it does not prove a live Steam client session.
- Screenshots and the UI QA report are retained under `E:\Codex\builds\nova-swarm\first-light-spectacle\evidence\runtime` and `evidence\i18n-ui-current`. The convoy launch/exit, Rival breakup, and visibly separate score drone were inspected.

The first isolated package omitted the ignored `electron/native/nova_presentation.node` binary and timed out on startup. The exact existing module was copied from the verified D: source into the E: stage (SHA-256 `8F488A0AF7F6C249E2D6D59E69DE149C169A19B2D17554EB4771DBB48C147DCA`), the package was rebuilt, and the final packaged smoke passed. This did not change source logic.

SteamPipe uploaded runtime source commit `9434b02da007ceee3e85f3e3e4e69b159b13c6d5` only to private `sector-continue-test` as BuildID **25575999**, Windows depot manifest **323222155630983487**. Authenticated post-upload app info confirms that assignment; public/default stayed at **25511386** and `test-build` at **23782673**. The previous private branch build was **25573377** and is the Steam rollback target. Steam Cloud `ufs` configuration matched the immediate preupload read. No forum post or other Steamworks setting changed. The current packaged `app.asar` SHA-256 is `6EF86F00F4D1D3A90B19011591C2D4F6DF3DED52D8384B83CBE6945FE9CE567C`.

The automatic approval review rejected recursive cleanup of task-owned E: staging with the message `blocked by policy`; no alternate deletion was attempted. The retained current deliverable is `E:\Codex\builds\nova-swarm\first-light-spectacle\win-unpacked`, with unique raw audio in `audio-source` and QA/Steam evidence in `evidence`. Disposable items still present include `stage` (8.112 GB), `source.tar` (5.109 GB), `steam-build-output` (under 1 MB), and `E:\Codex\tmp\first-light-spectacle-20260928` (0.069 GB), plus failed smoke artifacts under `evidence`. E: had 322.82 GB free after the blocked cleanup. Live Steam download/play and subjective visual/audio approval remain to be tested.
