# Bomb control follow-up

Status: design note only. No Bomb input or deployment behavior changes are part of the Tyrian feedback patch.

## Player-triggered stored charges

- Gives the player exact timing and preserves charges for planned boss or bullet-density moments.
- Makes the resource legible and skill-expressive when the HUD, controller binding, and empty-charge feedback are clear.
- Adds input and tutorial load, especially on compact controllers, and can encourage hoarding.

## Context-aware automatic deployment

- Keeps controls simple and guarantees that a collected charge produces visible value.
- Can react to bounded danger signals such as lethal bullet density, a trapped player, or a high-value boss window.
- Risks firing at a moment the player did not choose, obscuring why a charge was spent, and feeling inconsistent unless the trigger rules are extremely readable.

## Decision needed before implementation

Prototype the two approaches separately against the same scenarios: dense normal wave, boss pattern, one-life recovery, controller play, and an intentionally saved charge. Compare charge waste, player comprehension, accidental activations, and survivability. Do not ship either approach until the control surface and trigger policy are explicitly approved.
