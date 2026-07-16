# Steam capture manual QA

Use this procedure on the current desktop build before release. It changes no Steamworks settings and uploads nothing.

## Automated source-runtime probe

1. Start the Steam client and sign in.
2. Build the current source with `npm run build:current`.
3. If the Steamworks SDK is not present at `steam_sdk/sdk`, set `NOVA_SWARM_STEAMWORKS_SDK_PATH` to a local Steamworks SDK `sdk` folder.
4. Run `npm run check:steam-capture-runtime`.
5. Open the generated `test-results/steam-capture-electron-*/steam-api-screenshot.jpg`.
6. Pass only if it shows a current Nova Swarm frame, is not black or frozen, and `report.json` records:
   - `captureSurface.enabled: true`
   - `screenshot.ok: true`
   - one newly created Steam screenshot
   - a readable image at 640x360 or larger

The probe uses Steam's screenshot API, which exercises the same Steam capture path as the configured screenshot hotkey. It does not replace the physical-hotkey check below.

## Packaged Steam-client screenshot check

1. Launch Nova Swarm from its Steam Library entry, not by double-clicking the executable.
2. Confirm Shift+Tab opens and closes the Steam Overlay.
3. Enter live gameplay and move/fire for at least ten seconds.
4. Press Steam's configured screenshot key (F12 by default).
5. Open Steam's post-game screenshot viewer.
6. Pass only if the captured frame contains the live game at the expected aspect ratio with no black frame, frozen old frame, helper-window chrome, or missing HUD.
7. Repeat once in fullscreen and once in windowed mode.

## Steam Game Recording check

1. In Steam Settings > Game Recording, enable either Background Recording or Record on Demand.
2. Launch Nova Swarm from Steam and enter live gameplay.
3. Record at least 20 seconds containing movement, player fire, enemy fire, Point Defense interception, and one pause/resume.
4. Open the Steam recording timeline or clip viewer.
5. Pass only if:
   - video advances continuously rather than showing black or a frozen frame;
   - gameplay and HUD are both visible;
   - game SFX and music are audible and synchronized;
   - pausing and resuming do not lose capture;
   - fullscreen and windowed capture both work.
6. Save the QA result under `test-results/steam-capture-manual-<date>/report.md`. Do not add the video clip to git.

If recording is disabled or unavailable on the test account, record that exact limitation. Do not claim Game Recording is verified from screenshot evidence alone.
