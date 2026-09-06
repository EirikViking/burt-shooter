# Colossus boss reinvention — experimental

Baseline: `ed673fcc1dfb3064117c8e1eabad0426509e0e6d`. Branch: `codex/astra-visual-overhaul`.
The rejected presentation-only build remains at `test-results/astra-build-2026-09-06T16-53-25-326Z`.

## What changed

- Ten replacement hulls: cannon crown, furnace jaws, prism wings, rail predator, scythe turbine, asymmetric executioner, carrier fortress, siege monolith, pipe-organ battery and clockwork star. Full-resolution alpha sprites are articulated in Pixi; no new engine or 3D runtime.
- Actual moving damaging fronts replace instantaneous full fields. Forge and Monolith close inward; Mirror splits opposing fronts; Vortex and Clock stagger angular sectors; Carrier alternates banks; Choir uses offset chords; late Needle/Choir/Clock attacks make two passes.
- Existing projectile ammunition is launched in family-specific sequences instead of one simultaneous burst. Counts, health, damage, speed, summons and gameplay RNG remain unchanged in 300 paired test cases. Shot trajectories match at equal flight age; launch time intentionally differs by up to 270ms.
- The aim stays locked during windup. New hulls open, shift, recoil and change stance with phase. The signature countdown remains, alongside new lane/ring charge cues.
- Detailed plasma material, mipmapped hull textures, correct new-hull wreckage, Codex portraits and arrival art. The prior ElevenLabs charging cues also accompany regular weapon deployment without additional gameplay RNG draws. No new audio was synthesized or purchased.

## Balance limits

All thirty family/phase combinations preserve the original per-point hazard exposure in sampled numerical tests (within 2ms); safe corridors, prearming gates and outer spatial limits remain. These are constraints, not proof of identical perceived difficulty. Staggered salvos, movement locks and moving fronts change dodge timing. Human comparative playtesting is still required before treating this experimental ruleset as balanced for public ranked release.

## Rollback

Use `--nova-boss-previous` (or `NOVA_SWARM_BOSS_ENCOUNTER=previous`) for the exact previous encounter logic/presentation. Browser equivalent: `?bossEncounter=previous`.
The older pre-arsenal mode also remains: `--nova-boss-classic` / `?bossArsenal=classic`.
Preserved source tag: `codex/boss-reinvention-before-20260906`. No reset, stash or destructive checkout is necessary.

## Tools and provenance

Eleven new PNGs (ten hulls and one plasma texture), approximately 21.4MiB total, created using the built-in OpenAI image generation tool. No external asset pack, font or paid API was added. Runtime articulation, crop frames, mesh sectors and mipmaps use the existing PixiJS stack. Blender was not used for these assets: the production sprites are generated rasters, not claimed Blender renders.
Prompts and source generation IDs are in `colossus-art-prompts.json`; source files remain in the Codex generated-images folder. Commercial use is based on the output ownership provision in [OpenAI Europe Terms of Use](https://openai.com/policies/terms-of-use/), checked 2026-09-06. This is generated output, not exclusive commissioned copyright; no third-party attribution was imported.

## Validation in progress

Source captures and actual short scripted gameplay recordings are in `test-results/colossus-*`. They are staged QA with isolated services/invulnerability, not a human playtest or trailer.
Passed: 300 classic rollback parity cases; 300 reinvented budget/flight-age cases; thirty exposure cases; warning lifecycle; current and previous telegraph checks; previous arming readability; projectile lifecycle; ranked-policy parity; content director; audio catalog; Steam bridge; i18n; release-line; installed web-game skill input loop.
Initial QA failures are retained: HMR module identity invalidated audio mocks, a staging fixture retained a destroyed boss, new cues initially omitted the countdown, and wall guide drawing exceeded its budget. These were corrected rather than relaxing existing assertions.
Separate Windows packaging, native comparison, final evidence and launch handoff are pending. Steamworks and live services have not been changed.
