# ElevenLabs SFX Bake

Nova Swarm uses ElevenLabs only for one-time local SFX generation. The shipped game plays local files from `public/audio/sfx/` and does not make ElevenLabs API calls at runtime.

This workflow is SFX-only. Do not regenerate or modify files under `public/audio/voice/` or `public/audio/music/` for an SFX bake. Voice actors and music assets are protected by separate workflows.

Keep `ELEVENLABS_API_KEY` in the shell environment. Never print it, write it to a file, commit it, or expose it to browser, renderer, Cloudflare, or runtime game code.

## Commands

PowerShell:

```powershell
$env:ELEVENLABS_API_KEY="your key"
npm run generate:nova-sfx -- --dry-run
npm run generate:nova-sfx -- --candidate-dir=public/audio/sfx/nova-swarm-candidates --candidate-count=2
npm run check:audio
npm run audit:audio-mix
npm run build
```

Production replacement is opt-in:

```powershell
npm run generate:nova-sfx -- --only=nova_boss_beam_telegraph.mp3,nova_boss_beam_fire.mp3 --candidate-count=2 --force
```

Without `--force`, the generator writes candidates only and leaves production SFX unchanged. With `--force`, the generator promotes the first technically clean candidate to the exact existing production filename.

## Reports

The bake writes:

- `test-results/elevenlabs-sfx-bake-report.json`
- `docs/reviews/elevenlabs-sfx-bake-report.md`

The report lists candidates, duration, size, loudness data when FFmpeg is available, accepted replacements, unchanged files, and rejection reasons.

## Rollback

```powershell
git checkout -- public/audio/sfx/nova-swarm
git checkout -- scripts/generate-nova-swarm-sfx.mjs docs/elevenlabs-sfx-bake.md docs/reviews/elevenlabs-sfx-bake-report.md
# or revert the final commit
```
