# Nova Swarm Agent Contract

## Canonical Identity

Nova Swarm is a public arcade shooter about clean bullet readability, comic swarm formations, boss pattern pressure, bonus-core chaos, ship-trait choices, and leaderboard bravado.

The game must not use private jokes, real-person references, private place references, person-photo assets, or legacy internal lore in player-facing text, filenames, release assets, store material, screenshots, trailers, or documentation intended for release handoff.

## Tone Rules

- Write in an original coin-slot arcade voice.
- Prefer jokes about hitboxes, formations, bonus stages, boss tells, medals, high-score initials, and overconfident cabinet energy.
- Do not reference existing shooter brands in player-facing copy.
- Do not reintroduce old private-era names, places, photo concepts, reward prompts, or non-public banter.

## Assets

- Runtime asset loading is defined in `src/assets/assetManifest.js`.
- Asset provenance is tracked in `release/provenance/asset_provenance_manifest.json`.
- Generated art should live under public Nova Swarm paths such as `public/art/generated/nova-swarm/`.
- Release screenshots, capsules, and trailers must be reviewed for originality, text readability, and absence of private/internal material.
- Scene files should use asset manifest keys rather than hardcoded asset URLs when a manifest key exists.

## Audio

- All audio playback must go through `AudioManager`.
- All audio calls must be guarded; missing audio must never crash gameplay.
- Prefer distinct SFX for distinct game events when the mix remains readable.
- Voice, narration, music, and SFX must remain public arcade material with no private-person imitation or private joke references.

## Rank, Score, And Ship Trait Architecture

- `Game.addScore` is the score source of truth.
- `PlayScene.onRankUp` is an idempotent safety hook, not a second rank calculator.
- Total ranks remain 20 unless explicitly redesigned.
- Leaderboard badges represent player progression rank, not placement.
- Ship variants must have bounded, verifiable gameplay traits; traits should affect feel without breaking hitbox fairness or score balance.

## Release Gates

- `npm run build` must pass before deploys.
- `npm run smoke` covers core menu, settings, controls, gameplay, boss, and high-score flows.
- `npm run audit:release-readiness` is the top-level evidence gate; it may pass with only the known manual Steam blockers.
- The goal is not complete until Steamworks IDs, Steam-client install/launch validation, and human approval evidence are all present and current.
