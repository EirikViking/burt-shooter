# Audio Pipeline Notes

## Mission-control voicepack

The current mission-control lines were generated with ElevenLabs TTS and are stored in:

```text
public/audio/voice/mission-control/
```

To regenerate them, set `ELEVENLABS_API_KEY` in the shell environment and run:

```bash
node scripts/generate-mission-control-voicepack.mjs
```

Do not put the API key in `.env` unless `.env` is confirmed ignored by git, and never commit generated logs or screenshots that contain secrets. The script reads the key only from `process.env.ELEVENLABS_API_KEY` and does not print it.

Optional environment overrides:

```bash
ELEVENLABS_VOICE_ID=<voice id>
ELEVENLABS_MODEL_ID=<model id>
```

## Runtime behavior

- `src/assets/assetManifest.js` lists all voice assets for catalog lookup.
- `src/audio/SoundCatalog.js` maps mission-control events to generated MP3 files.
- `src/audio/AudioManager.js` applies short music ducking while voice lines play.
- Pause uses `AudioManager.setPauseDucked(true)` so music stays continuous but quieter.

## Current voice events

- `mission_control_launch`
- `mission_control_level_start`
- `mission_control_wave_clear`
- `mission_control_boss_inbound`
- `mission_control_life_low`
- `mission_control_powerup`
- `mission_control_victory`
- `mission_control_game_over`
