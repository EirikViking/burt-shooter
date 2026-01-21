# Flicker Notes

## Audit of Alpha Writers

### src/entities/Player.js
- Line 586: Spawn fade in (`spawn_fade_in`)
- Line 685: Dodge state (`dodge_state`)
- Line 689: Dodge end (`dodge_end`)
- Line 699: Invulnerable pulse (`invuln_pulse`)
- Line 703: Invulnerable end (`invuln_end`)

### src/scenes/PlayScene.js
- Line 576, 577: Force visible/renderable (`playscene_force`)
- Line 581: Force alpha 1 if not special state (`playscene_reset`)
