# Tractor fleet production notes

15 enemy tractor ships replace the single Hijacker appearance. Each has a separate shape, field behavior and three original ElevenLabs cues: charge, active and break. They appear through the existing encounter cadence. Shooting the ship still interrupts its beam; existing capture payoff, health curve and scoring remain intact.

These are 2D combat enemies, with the same sprite art shown in the Threat Codex. They do not replace or regenerate the playable fleet's combat sprites or interactive showcase models.

## Assets and provenance

- Final hull artwork: built-in OpenAI image generation, one separate prompt per ship. No uploaded project art or external reference asset. Full source images in `sprite-originals/`; prompts and output paths in `sprite-generation.json` and `sprite-prompts.json`.
- Runtime: `public/art/tractor-fleet/`, 15 RGBA PNGs at 512 square; 3,900,292 bytes combined. Transparent padding and proportional resampling only; no painted lighting changes or retouched runtime evidence.
- Initial Blender construction studies: `ships/*/source.blend`. These were rejected for weak construction and replaced by the generated sprite artwork. They are **not** the source of the final sprites. `build-tractor-fleet.py` now writes only blockout inspection renders so it cannot overwrite the final art.
- Audio: original ElevenLabs Sound Effects production using the user's paid account and authorization. 45 completed clips, plus two requests rejected for prompt length before generation. Provider-reported billed credits: 915. `generation.json` records responses and provenance; `mastering.json` records the local mastering pass. Source clips are in `originals/`; final MP3s in `public/audio/sfx/tractor-fleet/`.
- Audio mastering: high-pass at 60 Hz, low-pass at 12 kHz, loudness normalization to -18 LUFS / -2 dBTP, native pitch, bounded durations and short fades. No local oscillator or synthesized substitute SFX.

## Reproduction

Run from the repository root:

```
python scripts/install-tractor-sprites.py
node scripts/master-tractor-audio.mjs
node scripts/check-tractor-fleet.mjs
node scripts/check-tractor-fleet-runtime.mjs
```

The installer uses the retained source PNGs, so regeneration is not required. The original image prompts can be used for artistic revisions, but generative outputs are not byte-reproducible. `generate-tractor-audio.mjs` is the optional paid re-generation path, controlled by the explicit credit ceiling; it is not required for rebuilding existing assets.

`TractorFields.js` defines the 15 time-varying field shapes and forces. `TractorBeamVisual.js` uses that same description for the animated surfaces. All beams use bounded mesh geometry, a shared small texture and normal blending, with hostile projectiles above the field. Visual motion respects reduced-motion settings. No beam is a prerecorded animation.

Codex descriptions and escape advice are in `src/i18n/tractorFleetText.js`, with all eight supported locales. Ship names remain intentional proper names. Encounters add the corresponding entry under Enemies without an extra discovery score award.

Runtime evidence is under `test-results/tractor-runtime/`. The game scene is real; the QA harness places one chosen variant into a controlled combat scene and samples its phases. Source-art sheets and generated images are not presented as runtime captures. Audio playback, levels and overlap can be checked automatically; no human listening assessment is claimed.
