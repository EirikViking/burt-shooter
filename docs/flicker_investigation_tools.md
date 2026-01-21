# Flicker Investigation Status (AG Deep Dive)

## Current Status
We have instrumented the codebase to deterministically catch the flickers root cause. The previous crash `instrumentDisplayObject is not defined` has been fixed.

## New Tools
1. **VisualWrite**: A safe wrapper around visual property assignments (`alpha`, `visible`, `renderable`).
   - All Player alpha writes are now attributed with specific reasons (e.g. `invuln_pulse`, `dodge_state`).
   - `PlayScene` writes are attributed as `playscene_reset` or `playscene_force`.
2. **Oscillation Detector**: The `PropertyWriteTracer` now uses a windowed history to detect rapid toggles (noise vs true flicker).
3. **TickerSpy**: Tracks all created tickers to identify rogue loops.

## How to Capture
1. Run `npm run dev`.
2. Open with `?trace=1`.
3. Play -> **Die** -> **Respawn**.
4. When flicker starts, press **T**.
5. Check Console:
   - **`[PropertyTracer] FLICKER REPORT`**: Will show if `alpha` toggled rapidly.
   - **`Writer Log`**: Will show *exactly* who wrote the values.
     - Look for "MANUAL_WRITE" entries.
     - If you see `playscene_reset` (from `PlayScene.js`) fighting with `invuln_pulse` (from `Player.js`), that is the bug.
     - If you see `POLL_CHANGE` entries without attribution, it means an external system (Tweens? Particlest?) is touching it.

## Next Steps
Once the log confirms the conflict:
1. If `PlayScene` is fighting `Player`: Remove the `alpha` write from `PlayScene.js` entirely and move logic to `Player.applyVisualState()`.
2. If `TickerSpy` shows duplicate tickers: Kill the rouge ticker.
