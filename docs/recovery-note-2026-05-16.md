# Recovery Note - 2026-05-16

## Completed Work To Keep

- Main is up to date with `origin/main` at `92f133a` (`art: add storm gameplay backdrop`).
- The previous session left a strong playable baseline: generated arctic/storm art, cockpit HUD, settings overlay, mobile smoke coverage, early campaign wave scripts, mission-control voicepack wiring, Vite bundle splitting, and repeatable Playwright/system-Chrome smoke tests.
- `npm run build` succeeds.
- `npm run smoke` succeeds with no console errors, page errors, bad responses, or fatal overlay.
- Existing generated art/audio assets are referenced by manifests and should be preserved.

## Half-Finished Work

- Two uncommitted files were present at recovery: `src/managers/EnemyManager.js` and `scripts/smoke-playtest.mjs`.
- The WIP adds a `WAVE_BRIEFING` state between normal waves and extends smoke coverage to force and verify a wave transition.
- The feature works, but the screenshot shows visual clutter during the transition: cleared-wave panel, incoming-wave messaging, mission strip, and particles compete for attention.

## Broken Or Risky Areas

- No build or smoke blocker was found.
- The first wave-clear reward currently reads as `+0`, which feels unfinished in play.
- The between-wave HUD reports `HOSTILES 0` during briefing instead of saying the next wave is incoming.
- There are many debug `console.log` calls throughout the game. They are not a current smoke failure, but they should be reduced before a public release pass.

## Needs Testing

- Real first-minute play feel after polishing the wave transition.
- Audio audibility in an interactive browser session, especially menu music, gameplay music, wave-clear voice, incoming-wave cue, SFX volume, mute, and ducking.
- Mobile touch feel under continuous dodge/move pressure, not only smoke screenshots.
- Boss gate and game-over/victory flow after the current wave pacing changes.

## Remove Or Finish

- Keep the WIP wave-briefing state and smoke coverage, but finish its presentation.
- Keep generated art and voicepack assets.
- Do not delete tracked rescue/diff artifacts in this pass; they predate recovery and may be useful historical rescue material.
