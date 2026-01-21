# Render Lifecycle Probe

## Purpose
Diagnostic tool to identify the root cause of screen flicker by tracking render and scene lifecycle anomalies.

## What It Detects
- **Multiple render calls per frame** (double-render bug)
- **Multiple active PlayScene instances** (scene lifecycle leak)
- **Container mount churn** (excessive addChild/removeChild operations)
- **Stage and key container state** per frame

## How to Enable
Add `?trace=1` to the URL:
```
https://burt-game.pages.dev/?trace=1
```

Or set the runtime flag:
```javascript
window.__renderProbe = true;
```

## How to Use
1. **Enable trace mode** with `?trace=1`
2. **Play the game** until flicker appears (especially after respawn)
3. **Press R key** to dump the diagnostic report to console

## What to Look For

### Double Render Detection
If any frame shows `renderCalls > 1`, this indicates multiple render calls per frame.

### Multiple PlayScene Instances
If more than one PlayScene instance is alive, this indicates a scene lifecycle leak.

### Mount Churn
If mount churn is detected, check the stacks to identify which code is rapidly adding/removing containers.

## Report Sections
- **Summary**: Total frames recorded, current frame ID
- **Double Render Frames**: Table of frames with multiple render calls
- **PlayScene Instances**: Registry of all PlayScene instances (alive and destroyed)
- **Container Mount Churn**: Detection of excessive mount operations with stack traces
- **Last 20 Frames**: Detailed frame-by-frame breakdown

## Auto-Dump
The probe will automatically dump a report when it first detects a double-render condition.
