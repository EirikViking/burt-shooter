# Astra visual overhaul

Original prompt: Transform Nova Swarm's actual PixiJS/Electron/Vite presentation; preserve all gameplay and deterministic/ranked rules; capture baseline, iterate in-game, validate and deliver an isolated Windows test build. No publication or Steam activity.

- Original branch: `codex/forum-129-improvements-20260822`
- Starting commit: `a0b88d064c31dbc879948babd7751bf52fe7be77`
- Experimental branch: `codex/astra-visual-overhaul`
- Preflight: clean worktree; fetch completed; current branch has no upstream. Current checkout explicitly chosen by owner as baseline. Root AGENTS.md read. Stay in this folder; no other agents.
- Tools: installed Node, npm, Python 3.12, FFmpeg, local Playwright, Electron and Vite. Blender not on PATH. No paid services or asset purchases.
- Isolation: browser contexts block external requests; Electron fresh-profile mode plus explicit task-local user data disables Steam services.
- Baseline capture complete: `test-results/astra-baseline/` contains loaded menu, opening, ordinary combat, Sector 30, pause, boss, destruction, Tactical Draft and death. Browser requests restricted to localhost. Boss death and test invulnerability are harness staging, not normal-play claims. Query seed is not a supported general run seed; scenes are matched scenarios, not identical replays.
- Baseline browser 1280x720: median 16.7 ms, p95 ordinary 17.1 ms / dense 17.0 ms / boss 17.0 ms; heap 121.6 / 149.6 / 127.9 MiB. Short 6-second samples, not a sustained stress verdict.
- Baseline release-line, localization, policy, backdrop and boss-roster checks passed. Production `build:current` passed (6m47s, existing oversized chunk warning). Vite dev server failed its local CommonJS policy import; capture used an export-syntax-only transport adapter. Narrow development-server adapter added afterward; no policy behavior changes.
- Direction: orbital foundry; cool alloy hulls with restrained colored markings, coherent planetary depth, quiet negative space, reduced decorative auras. Prototype is now being captured in the game before extending to menus and effects.
