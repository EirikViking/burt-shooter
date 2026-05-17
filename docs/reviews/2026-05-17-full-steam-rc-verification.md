# Full Steam RC Verification - 2026-05-17

Command:

```bash
npm run verify:steam-rc -- --full
```

Result: passed all repo-controlled stages.

Summary report:
- `test-results/steam-rc-verify-2026-05-17T12-12-27-110Z/report.json`

Passed stages:
- `npm run build`
- `npm run check:steam-assets`
- `npm run audit:audio-mix`
- `npm run audit:release-readiness`
- `npm run smoke`
- `npm run desktop:smoke`
- `npm run package:steam:win`
- `npm run playtest:release`

Evidence:
- Browser smoke: `test-results/smoke-2026-05-17T12-12-55-257Z/`
- Electron smoke: `test-results/electron-smoke-2026-05-17T12-14-15-301Z/`
- Release playtest: `test-results/release-playtest-2026-05-17T12-15-21-253Z/`
- Windows package output: `release/desktop/win-unpacked/Nova Swarm.exe`

Release playtest result:
- Requested duration: 600,000 ms
- Survived: 599,901 ms
- Survived full duration: true
- Peak level: 4
- Peak score: 36,390
- Final state: level 4 boss active, 1 life, boss music active
- Browser failures: zero routine console events, console warnings/errors, page errors, bad responses, and request failures

Visual spot-check:
- `test-results/release-playtest-2026-05-17T12-15-21-253Z/final.png` shows readable level 4 boss combat with the player visible and HUD intact.
- `test-results/electron-smoke-2026-05-17T12-14-15-301Z/01-electron-menu.png` shows the desktop build opening into the cinematic intro successfully.

Remaining blockers:
- `docs/reviews/release-readiness-audit-2026-05-17.json` still reports `not_steam_ready`.
- SteamCMD is not available on PATH locally.
- Real Steamworks app/depot IDs, SteamPipe upload, Steam client install/launch validation, and human approval of screenshots/capsules/trailer/audio are still required before Steam-ready status.
