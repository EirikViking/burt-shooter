# Nova Swarm animation and imagegen audit - 2026-07-22

## Decision

Use image generation as a material layer for organic, non-semantic effects and high-value presentation surfaces. Keep gameplay telegraphs, collision-aligned geometry, text, focus, input prompts, and live values code-native so they remain deterministic and readable.

## Implemented in this pass

- Expanded the shared additive explosion material from one bloom to four event-compatible variants: nova plasma, ion shear, solar corona, and void collapse.
- Added color-aware selection and immediate-repeat avoidance to normal explosions. Boss deaths deliberately combine two different variants while retaining the existing event timing, particle budget, audio, and gameplay behavior.
- Added a text-free Tactical Draft command-field material to the full screen, Active Build deck, and card surfaces. Dynamic text, localized descriptions, category state, stat previews, Fusion state, focus, and controls remain Pixi UI.
- Rebuilt Active Build as four category modules with state counts and segmented meters plus the existing doctrine/Fusion signature bay.
- Replaced the Draft fallback icon circles and lock-in tracer/starburst with angular modules, a tapered perimeter trace, and asymmetric plasma fragments.

## Animation review

### High-value next candidates

1. Boss phase transitions and elite ability identities: use small event-specific plasma/rift overlays while preserving their existing warning shapes and timing.
2. Player bomb, miracle, dodge, and powerup pickup ceremonies: add restrained organic energy materials behind the existing gameplay-readable core.
3. Run Report, hangar selection, pause, and Codex reveal transitions: use quiet generated panels and surface light sweeps, never rasterized labels.
4. Menu and boss-intro transitions: add short texture-driven wipes tied to the already generated environment/boss art.

### Keep code-native

- Enemy attack telegraphs, tractor capture bounds, boss safe zones, projectile silhouettes, dodge timing, and collision indicators.
- HUD text, health bars, objective state, current stacks, stat before/after values, keyboard/gamepad focus, and localization.
- Performance-degradation paths and reduced-motion fallbacks.

### Already strong or already imagegen-led

- Player ships, bosses, generated enemy roster, powerup/augment icons, sector environments, menu hangar, leaderboard hall, and game-over ceremony.
- These benefit more from animation/compositing polish than from another broad asset replacement.

## Generated project assets

- `public/art/generated/nova-swarm/vfx/plasma/nova-plasma-ion-shear-20260722.png`
- `public/art/generated/nova-swarm/vfx/plasma/nova-plasma-solar-corona-20260722.png`
- `public/art/generated/nova-swarm/vfx/plasma/nova-plasma-void-collapse-20260722.png`
- `public/art/generated/nova-swarm/ui/tactical-draft/nova-tactical-draft-command-field-20260722.png`

The three VFX prompts requested one isolated asymmetrical organic plasma event on pure black for additive blending, explicitly excluding text, logos, stars, circles, concentric rings, spokes, diamonds, polygons, ships, lens flare, and pixel art. The Tactical Draft prompt requested a text-free dark 16:9 command-deck material with quiet central/card lanes, cyan/magenta energy seams, restrained gold accents, and no labels, icons, ships, complete circles, stars, diamonds, or target reticles. Generation used Codex's built-in imagegen mode.

## Validation evidence

- Tactical Draft: `test-results/tactical-draft-2026-07-22T07-08-40-690Z`
- Explosion variants and boss cascade: `test-results/sensory-overhaul-2026-07-22T07-10-27-513Z`
- The deterministic VFX fixture staged all four plasma variants and reported zero primitive circle/diamond explosion geometry.

