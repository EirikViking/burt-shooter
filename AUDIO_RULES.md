# Nova Swarm Audio Rules

## General Rules

- All audio must be played through `AudioManager`.
- Use catalog keys, not ad hoc file paths, when a catalog key exists.
- Missing audio must never crash gameplay.
- Audio must never block movement, shooting, pause, restart, or score submission.

## Mix And Identity

- SFX should communicate gameplay first: player fire, enemy fire, damage, powerups, boss phase changes, wave clears, menu actions, and leaderboard moments.
- Music should support the current context: menu, intro, gameplay, boss, victory, or game over.
- Voice and narration must use original public arcade copy.
- Do not add private-person imitation, private jokes, or old internal lore to audio prompts, filenames, or transcripts.

## Verification

- Run `npm run check:audio` after changing catalog keys or audio manifests.
- Run `npm run audit:audio-mix` after adding or replacing audio files.
- For release milestones, verify audio through `npm run smoke`, `npm run playtest:release`, and `npm run audit:release-readiness`.
