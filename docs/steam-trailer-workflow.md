# Nova Swarm Steam Trailer Workflow

The repo includes a repeatable visual trailer capture script:

```bash
npm run build
npm run capture:steam-trailer
npm run render:steam-trailer-audio
npm run render:steam-trailer-candidate
```

Output:

- Draft footage: `release/steam-trailer/draft-*/nova-swarm-steam-trailer-visual-draft.webm`
- Audio-mixed draft: `release/steam-trailer/draft-*/nova-swarm-steam-trailer-audio-draft.mp4`
- Evidence report: `release/steam-trailer/draft-*/report.json`
- Audio-mix report: `release/steam-trailer/draft-*/audio-mix-report.json`
- Editorial candidate: `release/steam-trailer/candidate-*/nova-swarm-steam-trailer-candidate.mp4`
- Editorial candidate evidence: `release/steam-trailer/candidate-*/report.json` and `candidate-contact-sheet.png`
- Optional visual spot-check frames: `release/steam-trailer/draft-*/frames/frame-*.png`

The script records a deterministic sequence from the release build:

- Story intro art
- Main menu identity
- Ship-select variant carousel
- First-wave combat
- Boss inbound and boss pattern beat
- Game-over/high-score surface

Important limitation: Playwright's video capture records browser pixels only, not the game audio mix. The audio render step builds a trailer-style mix from shipped music, SFX, and voice assets. The candidate render step adds branded title/outro cards and creates review frames, but the result still needs human by-ear and store-submission approval before Steam upload.

## Final Trailer Checklist

- Human-approve the mixed audio from the released music/SFX/voice library.
- Review the generated title and outro cards for Steam tone/readability.
- Keep the trailer focused on real gameplay: ships, swarm formations, boss patterns, bonus cores, score flow.
- Export a final upload format accepted by Steam and keep the project/source file under `release/steam-trailer/`.
- Human-review the final trailer for readability at 720p, audio balance, public arcade tone, and absence of private/internal references.

## Current Draft Evidence

Latest visual capture: `release/steam-trailer/draft-2026-05-17-17-03/`

- `report.json` shows zero console warnings/errors, page errors, and bad network responses.
- `ffprobe` confirmed `nova-swarm-steam-trailer-audio-draft.mp4` is a 43.90 second 1280x720 H.264/AAC MP4.

Latest editorial candidate: `release/steam-trailer/candidate-2026-05-17-editorial/`

- `report.json` passed with a 49.92 second 1280x720 H.264/AAC candidate.
- FFmpeg `volumedetect` measured the candidate at `mean_volume: -19.1 dB` and `max_volume: -0.8 dB`.
- `candidate-contact-sheet.png` covers title card, story intro, ship select, gameplay/boss, and outro without blank frames or pause overlays.
