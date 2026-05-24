# Nova Swarm Controller Support Checklist

Last updated: 2026-05-23

## Current Verdict

- Runtime controller-only flow: implemented and locally validated with `npm run check:controller-flow`.
- Steam store category: `Full Controller Support` is the recorded Steamworks category for v1.
- Steam Input tradeoff: Nova Swarm uses native XInput/gamepad input and plain text prompts such as `A/B/X/Y/LB/RB/Start`. No official Steam Input action manifest or custom recommended Steam Input layout is published for v1, and that tradeoff is intentionally accepted.
- External dashboard rule: keep Steamworks `category_28` / Full Controller Support selected. Do not also select `Partial Controller Support`.

## Local Automated Check

Run after a current build:

```powershell
npm run build:current
npm run check:controller-flow
```

The check uses a virtual gamepad and validates:

- Main menu focus, controller prompts, settings open/close, and slider adjustment.
- Hangar navigation, ship details open/back, and launch.
- Gameplay movement, firing, pause, resume, and pause settings.
- Game-over controller initials entry, score save, highscore screen, and return to menu.

Latest passing evidence from this run: `test-results/controller-only-flow-2026-05-23T18-52-21-852Z/report.json`.

## Manual Controller Test

Use the Steam-installed Windows build launched from the Steam client with a physical Xbox/XInput controller. Do not use keyboard or mouse after launch.

1. Launch Nova Swarm from Steam.
2. Main menu: move focus through every visible option, confirm each reversible option, and back out predictably.
3. Settings from main menu: toggle music/voice/CTA voice, switch music set, test SFX/voice, adjust every volume/accessibility slider, open/close credits, close settings.
4. Ship hangar: move between ships, jump model families with shoulder buttons, open details with X, return with B, open/close hangar menu, and launch an unlocked ship.
5. Gameplay: move, fire, dodge, pause with Start, resume, and confirm keyboard/mouse still works afterward.
6. Pause menu: focus Resume/Settings/Quit, open settings, adjust sliders/toggles, close settings with B, resume with B, then pause again and quit to menu.
7. Game over: enter initials with D-pad/stick, change character slots, submit with A/Y, verify the score appears on the local board, open highscores with Y, and return to menu with B.
8. Reconnect test: unplug/reconnect or disable/re-enable the controller on menu, gameplay, pause, and game-over screens; verify input resumes without trapping focus.
9. Prompt test: use controller and keyboard/mouse alternately; verify prompts switch truthfully and never say a controller action is available where it is not.

## Expected Controller Mapping

- Left stick / D-pad: movement and menu navigation.
- A / right trigger: confirm and fire.
- B / left bumper: back/cancel and dodge in gameplay.
- Start / Back: pause/menu where appropriate.
- X: ship details / secondary game-over helper where shown.
- Y: random ship in hangar and leaderboard from runback.
- LB/RB: model-family jump in hangar and initials slot movement on game over.

## Steamworks Dashboard Steps

1. In Steamworks App Admin, keep `category_28` / Full Controller Support selected.
2. Do not select `category_18` / Partial Controller Support at the same time.
3. In the Steam Input area, leave v1 as native XInput/gamepad input unless a future official Steam Input action manifest/custom recommended layout is created and tested.
4. Keep the controller glyph/prompt policy honest: the runtime uses plain text prompts such as `A/B/X/Y/LB/RB/Start`; do not claim controller-specific glyph polish beyond that.
5. Record the Steam-installed build ID, controller model, OS, Steam client branch, tester, date, and pass/fail notes before final release approval and after any material input-flow change.

## References

- Steam Input getting started / full support expectations: https://partner.steamgames.com/doc/features/steam_controller/getting_started_for_devs
- Steam Input action manifest / official configuration: https://partner.steamgames.com/doc/features/steam_controller/action_manifest_file
