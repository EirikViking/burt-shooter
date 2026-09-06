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

## Final build and launch

Runtime source commit: `f61d1b3`. Final delivery-only commit is recorded in `test-results/colossus-delivery/delivery.json`.
Build: `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822\test-results\astra-build-2026-09-06T19-13-59-279Z`.
Double-click its `launch.vbs`, or the desktop **Nova Swarm - Visual Upgrade** shortcut. The executable is `win-unpacked/Nova Swarm.exe`; use the launcher to ensure offline services and the isolated test profile. Normal manual play does not enable QA invulnerability.

Exact rollback launch (same package, separate isolated profile):

```powershell
wscript.exe "D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822\test-results\astra-build-2026-09-06T19-13-59-279Z\previous.vbs"
```

The desktop **Nova Swarm - Previous Bosses** shortcut does the same. The preserved previous package is untouched.

## Validation completed

- 300 paired attack budget/flight-age cases across all 50 profiles and three phases: 1,216 delayed projectiles and 295 moving fields. Thirty family/phase exposure cases passed.
- Ten textured rigs, Reduced Motion, forty field-bound checks, visual RNG isolation, bounded drawing and pending-projectile collision/pause/release checks passed.
- 300 classic rollback parity cases; warning lifecycle; current and previous telegraph and arming readability checks; projectile lifecycle; ranked-policy parity; content director; audio catalog; Steam bridge; controller flow; release-line passed.
- `check:i18n`, source and production `check:i18n-ui`, and `build:current` passed. Production UI QA captured 80 screens across eight languages, without page/console errors, placeholders or English leaks. No player-facing text was added; no new untranslated text remains.
- Packaged native QA passed all twelve checks on the baseline and final executable: menu, controls/firing, pause/resume, Daily, Sector 90 dense combat, boss, destruction, rewards, death, restart and menu relaunch. Isolated profiles, runtime identity and offline services verified. Final-package previous-mode capture also passed.
- Installed web-game skill client ran its input/screenshot loop. No existing test assertions were weakened.

Initial failures are retained in the QA logs: HMR module identity invalidated audio mocks, a staging fixture retained a destroyed boss, new cues initially omitted signature countdown/arming gates, and wall guide drawing exceeded its budget. These were corrected. The final executable includes the fixes.

## Performance

Same PC, 1280 x 720, no recording during timing. Before is the preserved `ed673fc` executable; after is final `f61d1b3`. Daily used the same seed; Sector 90 used the same stress procedure, not an identical replay. Values are before -> after.

| Scene | p95 frame | p99 frame | Retained JS heap |
|---|---|---|---|
| Daily | 17.1 -> 17.1 ms | 17.3 -> 17.2 ms | 46.87 -> 45.46 MiB |
| Sector 90 dense | 17.1 -> 17.0 ms | 17.2 -> 17.2 ms | 44.18 -> 43.08 MiB |
| Boss | 17.0 -> 17.0 ms | 17.2 -> 17.3 ms | 35.23 -> 34.44 MiB |

One 33.1ms boss frame occurred in the final run; no zero-stutter claim is made. Retained JS heap is not total RAM or GPU VRAM; full native reports include process memory samples. Paired new-profile warm-cache startup was 5,692 -> 5,322ms. Menu-to-controllable was 6,684 -> 6,161ms; dense loading 9,758 -> 10,111ms. Initial launches were strongly filesystem-cache dependent (60.0s before / 41.4s after), so those uncontrolled cold-ish runs are not presented as a measured speedup.

## Evidence and remaining limits

Open `test-results/colossus-delivery/index.html` for all ten matched native before/after encounters. Original 1280 x 720 captures are in `colossus-native-before-hd` and `colossus-native-final`; each records executable SHA and viewport.

Actual normal-speed, silent Windows gameplay recordings:

- `test-results/colossus-native-lane-motion/boss-attacks-normal-speed.mp4`: 14.66s, phase-two Lane Eater, scripted alternating dodges.
- `test-results/astra-desktop-colossus-final/gameplay-normal-speed.mp4`: 25.47s dense combat.
- `test-results/astra-desktop-colossus-final/boss-destruction-normal-speed.mp4`: 10.08s boss destruction and reward transition.

These use staged QA state/invulnerability; the defeat is triggered through the damage system. They are actual engine output, not offline renders, human playtests or marketing trailers. Captured sequences and representative full-resolution frames were visually inspected.

Ten family hulls are shared across fifty profiles; this is not fifty unique models or a rewrite of every boss AI. Early boss hazard suppression remains. Human comparison is still necessary for overall difficulty and enjoyment. Existing reinforcement popup/HUD timing and occasional boss-name proximity to the top HUD remain outside this correction; this delivery does not claim every presentation issue is fixed.

Files changed: boss/bullet/play-scene behavior; Colossus configuration, rig and attack effects; hull breakup; RNG-safe audio playback; Codex art selection; Electron rollback flag; eleven sprite assets; focused tests, capture helpers and delivery/provenance documentation. Existing PixiJS/Electron/Vite stack retained.

Steamworks settings, live Cloud/achievements/leaderboards and release outputs were untouched. No Steam upload or deployment performed for this correction.
