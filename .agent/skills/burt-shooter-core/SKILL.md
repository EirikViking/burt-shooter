---
name: burt-shooter-core
description: Burt Shooter project guardrails and workflow. Use for any task touching PixiJS scenes, gameplay loop, rank system, leaderboard, UI HUD, assets, audio, Cloudflare deploy steps, or bugfixes that risk regressions.
---

# Burt Shooter Core Skill

You are working in the Burt Shooter codebase, a PixiJS arcade shooter. This skill defines non negotiable rules, safe workflows, and verification requirements.

## Non negotiable rules

1. Preserve gameplay and feel
- Do not change game balance, timings, controls, scoring, spawn logic, difficulty, or UI layout unless explicitly requested.
- Prefer minimal diffs over refactors. Fix the bug, do not redesign systems.

2. No surprise removals
- Never remove existing features, animations, audio cues, UI elements, debug toggles, or configuration without explicit instructions.
- If something appears unused, keep it unless the task explicitly says to delete it.

3. Regression paranoia
- Assume the thing that currently works will break if you touch it.
- Treat leaderboard, rank logic, and scene update loops as fragile. Modify with surgical changes.

4. Keep the project style consistent
- Match existing file patterns, naming, and code style.
- Avoid introducing new libraries or architectural layers unless explicitly asked.

5. No manual user fixes
- Do not ask the user to do manual edits as part of the solution.
- The agent must implement changes fully in code, including wiring, UI, and assets usage when relevant.

## Standard workflow for any task

Follow these steps in order:

1. Scope and risk check
- Identify which subsystem is involved: leaderboard, rank, scenes, audio, assets, HUD, input, API, Cloudflare.
- List the top 3 regression risks in one short section.

2. Locate source of truth
- Find the exact file and functions responsible.
- Confirm how data flows, for example API response shape to render, rank state to HUD, or game state to submit.

3. Implement minimal fix
- Change as little as possible while solving the issue.
- Prefer adding guards, normalizers, and idempotency protections over changing logic.

4. Verify locally when possible
- Run the project build, and any existing checks that are typical in this repo.
- If there is a dev run command commonly used, run it briefly and confirm no runtime crash on the relevant scene.

5. Summarize
Provide:
- What changed and why
- Files touched
- How it was verified
- Any remaining risks

## Subsystem specific rules

### Leaderboard rules
- Do not alter ranking criteria unless requested.
- Do not reduce entries shown. If a regression caused top 3 only, restore prior behavior.
- Always handle API response robustly:
  - Accept direct arrays
  - Accept wrapped objects with common keys: highscores, scores, entries, results, data
  - Guard against undefined, null, and unexpected shapes
- Never break visuals to plain text. Preserve the “living leaderboard” look if it exists, and improve it only if asked.

### Rank system rules
- Rank up must be idempotent:
  - Never spam rank up notifications
  - Never re trigger for the same rank
- If rank is shown in leaderboard and in game HUD:
  - Ensure it is readable and visible at normal play resolution
  - Ensure sprite is not too small or too transparent
- If rank has names:
  - Names must be stable, deterministic, and tied to rank index
  - Show rank name in HUD near the rank sprite

### PixiJS scene safety
- Update loops must never hard crash the game.
- Guards must be lightweight. Avoid heavy logging in hot paths.
- Any try catch crash guard must be last resort and must not spam logs.

### Assets and rendering
- Sprite scaling must be relative and clamped for different resolutions.
- Never render giant blocking sprites. Use sensible anchors, scaling, and z ordering.
- Avoid debug overlays and build numbers in production UI unless requested.

### Audio
- New cues must not overlap or spam.
- One shot effects must have cooldown or idempotency guard if triggered by state change.

## Cloudflare and deployment rules

- Deployment may happen without GitHub commits.
- Do not assume changes are committed unless explicitly stated.
- Focus on runtime behavior and live verification, not repository state.

### Frontend (Pages)
- Frontend may be deployed via GitHub auto deploy OR manual deployment.
- Always verify by checking live behavior in the browser, not by assuming deploy success.

### Backend (Workers)
- Workers do not auto deploy.
- If any file under apps/worker changes, you must explicitly deploy the Worker.
- After deployment, verify:
  - Cloudflare dashboard shows recent modification
  - The live endpoint reflects the change

## Definition of done

A task is only done when:
- The requested behavior is implemented
- Build passes OR runtime verification confirms no crash
- No runtime crash is introduced on the relevant scene
- Changes are minimal and consistent with repo patterns
