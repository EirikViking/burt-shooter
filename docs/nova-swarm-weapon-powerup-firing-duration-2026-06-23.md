# Nova Swarm Weapon Powerup Firing Duration

## Problem

Weapon upgrade powerups felt wasted during wave gaps, boss invulnerability windows, dodging, repositioning, and tactical pauses because their timers depleted on wall-clock time even when the player was not firing.

## Implementation Summary

Weapon-enhancing timed powerups now use a `while_firing` duration mode. Their remaining duration is stored as usable firing milliseconds and only drains while the unified firing input is active. Non-weapon powerups remain wall-clock based.

The drain intentionally follows held fire input, not exact bullet-spawn frames. This keeps rapid-fire cooldown gaps from stretching powerups too far and treats mouse, keyboard, and controller firing consistently.

## While-Firing Powerups

- `triple_beam`
- `rapid_cabinet`
- `overdrive_core`
- `rapid_fire`
- `double_shot`
- `damage_up`
- `pierce`
- `prism_splitter`
- `rail_surge`
- `plasma_lance`
- `mirror_shots`
- `target_paint`

## Wall-Clock Powerups

Movement, defensive, scoring, pickup, drone, orbital, vampire, spectacle, instant, charge, and mixed utility powerups remain wall-clock or existing charge/instant behavior. Ambiguous mixed-value powerups such as `chrono_anchor` and `void_crown` intentionally remain wall-clock for this pass because preserving their non-weapon value for free would be a broader balance change.

## Edge Cases

- Pause: unchanged; player updates do not advance during pause, so weapon timers do not drain.
- Wave transition with no firing: weapon timers do not drain.
- Boss invulnerability: firing into the boss still drains because the player is actively using the upgraded weapon; stopping fire preserves time.
- Death/respawn: existing reset/preserve behavior is unchanged.
- Save data: active powerups are not persisted as live save state, so no save format change was required.

## Balance Sanity

The focused check estimates real-time duration from firing duty cycle:

- 100% firing: 1.00x old duration
- 85% firing: 1.18x old duration
- 70% firing: 1.43x old duration
- 55% firing: 1.82x old duration
- 40% firing: 2.50x old duration

The typical 70% sample stays under the 1.5x guardrail. Very low firing-duty play can preserve weapon powerups much longer, but only by giving up weapon output during that preserved time.

## Evidence

Focused runtime evidence:

- `test-results/weapon-powerup-firing-duration-2026-06-24T09-49-37-235Z/report.json`

The report proves no-fire preservation, keyboard fire drain, mouse/pointer fire drain, controller fire drain, pause preservation, wave-gap preservation, wall-clock non-weapon timer behavior, and HUD remaining-time exposure.

## Known Limitations

The visible HUD timer still shows seconds remaining as before; it does not add extra player-facing copy explaining "firing time." That avoids new localization/UI churn in this pass.
