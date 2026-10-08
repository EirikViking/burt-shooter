# Creature audio

50 bosses + 14 Space Snakes; 257 original ElevenLabs performances, edited into 64 runtime banks. All recordings and processing recipes remain editable. No project assets were uploaded. Generation used the account's active commercial Creator plan; requests, provider IDs, source hashes and returned credit costs are in `generation.json`.

Open `http://127.0.0.1:5201/docs/creature-audio/review.html` while the local Vite server is running. The combat mix comes from actual staged gameplay in an isolated browser profile; the cue selector is explicitly isolated playback. Audio has been decoded, measured and checked in the game; the assistant session cannot listen to audio, so human judgments of fear, annoyance and recognizability remain a listening review.

- Recreate banks from preserved originals: `python scripts/master-creature-audio.py`
- Check decoded banks: `python scripts/check-creature-recordings.py`
- Check playback lifecycle: `node scripts/check-creature-audio-bus.mjs`
- Run all creature encounters: `node scripts/check-creature-audio-runtime.mjs`
- Capture the combat review: `node scripts/check-creature-audio-runtime.mjs --representative`
- Rebuild the small review page: `node scripts/write-creature-audio-review.mjs`

Requires the repository's Node/Playwright dependencies, Python with NumPy, and FFmpeg. New generation is optional: `scripts/generate-creature-audio.mjs --generate` requires the credential in the environment and an explicitly authorized `CREATURE_AUDIO_CREDIT_CEILING`; existing verified sources are reused. Never commit the credential.

Branch: `codex/creature-audio-redesign`, baseline `db53532d7ea31440aa1791c08604ffcbcb9faa61`. Changes are the creature bus/bank catalog, audio hooks in Boss, SpaceSnake, Enemy, EnemyManager, SpaceSnakeDeath and PlayScene, plus source recordings, banks and production/QA scripts. No player-facing text changed; no new untranslated strings. Roll back the audio source with `git revert 7458271`.

At the user's subsequent request, audio commit `7458271` was packaged and uploaded on 2026-09-10 as Steam build **25226081** to **sector-continue-test**. Public stayed at 25218271 and Cloud configuration was unchanged; see `steam-delivery.json`. Packaged code and all 64 audio banks matched source, isolated launch passed, and the 60-second packaged performance check measured 59.76 average / 58.14 minimum FPS with no reported warnings or errors. Native runtime files were verified; the isolated gameplay test deliberately disabled live Steam services. The later hangar/bracket fixes are not part of this audio build.

Validation: all 64 staged runtime encounters, 11 final combat-mix encounters, decoded cue/level analysis, playback lifecycle tests, audio catalog, voice mute contract, boss roster/death-voice compatibility, i18n, release-line check and production code build passed. The build excludes recopying existing public assets and is not a packaged Steam build. Full-run evidence lives under `test-results/creature-audio-*`; the representative recording is included here. Billed generation: 12,012 credits. Final captured mix peak: −14.1 dBFS, with no clipping; this is a measurement of that staged recording, not a universal mix guarantee.
