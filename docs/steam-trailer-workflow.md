# Nova Swarm Steam Trailer Workflow

The repo includes a repeatable visual trailer capture script:

```bash
npm run build
npm run capture:steam-trailer
npm run render:steam-trailer-audio
```

Output:

- Draft footage: `release/steam-trailer/draft-*/nova-swarm-steam-trailer-visual-draft.webm`
- Audio-mixed draft: `release/steam-trailer/draft-*/nova-swarm-steam-trailer-audio-draft.mp4`
- Evidence report: `release/steam-trailer/draft-*/report.json`
- Audio-mix report: `release/steam-trailer/draft-*/audio-mix-report.json`
- Optional visual spot-check frames: `release/steam-trailer/draft-*/frames/frame-*.png`

The script records a deterministic sequence from the release build:

- Story intro art
- Main menu identity
- Ship-select variant carousel
- First-wave combat
- Boss inbound and boss pattern beat
- Game-over/high-score surface

Important limitation: Playwright's video capture records browser pixels only, not the game audio mix. The audio render step builds a trailer-style mix from shipped music, SFX, and voice assets so the result can be reviewed as a draft instead of as final Steam upload media.

## Final Trailer Checklist

- Human-approve the mixed audio from the released music/SFX/voice library.
- Add only minimal title cards if needed; Steam capsules already carry the game name.
- Keep the trailer focused on real gameplay: ships, swarm formations, boss patterns, bonus cores, score flow.
- Export a final upload format accepted by Steam and keep the project/source file under `release/steam-trailer/`.
- Human-review the final trailer for readability at 720p, audio balance, public arcade tone, and absence of private/internal references.

## Current Draft Evidence

Latest visual capture: `release/steam-trailer/draft-2026-05-17-12-46/`

- `report.json` shows zero console warnings/errors, page errors, and bad network responses.
- `ffprobe` confirmed `nova-swarm-steam-trailer-visual-draft.webm` is a 43.88 second 1280x720 VP8 video.
- Sampled frames cover intro art, first-wave combat, and boss combat without blank frames or pause overlays.
- `npm run render:steam-trailer-audio` produced `nova-swarm-steam-trailer-audio-draft.mp4` as a 43.88 second H.264/AAC MP4.
- FFmpeg `volumedetect` measured the audio draft at `mean_volume: -18.5 dB` and `max_volume: -0.4 dB`.
