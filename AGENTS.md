# Nova Swarm Agent Instructions

## Baseline safety

- Always run git fetch/status/branch/log/worktree checks before coding.
- Do not work from stale, behind, dirty, or unexplained branches.
- Start from a clean branch based on the verified authoritative baseline.
- Before localization, deploy, or build work, verify that German localization, top3 localization polish, and temporary marketing hotkeys are present.
- Do not deploy unless explicitly instructed.
- Do not change Steamworks settings unless explicitly instructed.

## Localization rules

- English is the source language.
- Player-facing strings must go through the i18n system under `src/i18n/`.
- Do not add hardcoded player-facing English strings in scenes, UI, HUD, menus, score screens, leaderboard, Settings, achievements UI, tutorial/story text, diagnostics visible to players, or phrase pools.
- If a gameplay/UI change adds or changes player-facing text, update all supported locale files in the same task.
- If high-quality translation is not possible in the moment, add a clear temporary fallback/TODO that is detected by `npm run check:i18n`, and report it.
- Do not silently leave English fallback in non-English locales except for explicitly whitelisted proper names and technical labels.
- Proper/stylized names may remain English when intentional: Nova Swarm, ship names, boss names, rank names, Cabinet when used as a stylized arcade object, and keyboard/controller labels such as ENTER, ESC, WASD, SPACE, and SFX.
- Audio remains English unless a task explicitly adds complete localized audio.
- Do not claim subtitles unless complete subtitles exist for all voice lines.
- Steam language support should only mark Interface after human QA.
- Never mark Full Audio or Subtitles for non-English languages unless actually implemented.

## Required checks after text/UI changes

Run:

```bash
npm run check:i18n
npm run build:current
npm run check:i18n-ui
```

Also run when relevant:

```bash
npm run check:steam-electron-bridge
npm run smoke
npm run desktop:smoke:current
npm run check:controller-flow
npm run build
```

## Visual QA

For localization tasks, generate screenshots or a PDF QA report covering Settings, main menu, HUD/gameplay, pause, Game Over / score submission, leaderboard empty state, and leaderboard populated state.

Check for no tofu boxes, no missing glyphs, no overlapping text, no obvious clipping, no untranslated player-facing English except whitelist, and no regression in English/German/top3 languages.

## Final report requirements

Always report: branch, baseline commit, files changed, tests run, remaining untranslated text and why, whether Steamworks was untouched, whether deploy was not performed, and rollback command.

Codex reads repo-root `AGENTS.md` before work. To verify in a future session, start Codex from this repo root and ask: "Summarize the active project instructions."
