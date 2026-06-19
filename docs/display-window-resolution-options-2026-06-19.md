# Display, Window, And Resolution Settings

Added June 19, 2026 on `codex/display-window-resolution-options-20260619`.

## Player Options

- Display Mode: Fullscreen, Windowed, Borderless.
- Window Size: detected Native and Current sizes when available, plus 1280 x 720, 1366 x 768, 1600 x 900, and 1920 x 1080.
- Safe Reset: restores Fullscreen with a 1280 x 720 window-size fallback.

Changing Display Mode or Window Size applies immediately. Selecting a Window Size also switches to Windowed mode so the size is visible and recoverable.

## Persistence

Renderer storage keys:

- `nova_display_mode_v1`
- `nova_display_window_size_v1`

Steam Cloud persistence includes `settings.display.mode` and `settings.display.windowSize`. Missing or malformed display settings fall back to Fullscreen and 1280 x 720, so older saves stay compatible.

## Electron And Browser Behavior

Packaged Electron reads `display-settings.json` from `app.getPath('userData')` before creating the window, then exposes a narrow `window.__novaDisplay` preload bridge for getting display info and applying settings.

Browser/dev mode falls back to the standard Fullscreen API where available and otherwise keeps the setting saved without crashing. Native window sizing is skipped when the Electron bridge is unavailable.

Borderless uses a borderless-sized desktop window at startup when persisted before launch. During an already-running framed Electron window, it applies the safest available borderless-sized window behavior without changing Steamworks or packaging state.
