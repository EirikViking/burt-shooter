# Steam Upload Evidence - Cinematic Menu Exact Approved Icons

- Uploaded: 2026-06-18 18:26 local time
- AppID: 4765070
- DepotID: 4765071
- Steam BuildID: 23806583
- Depot manifest: 5359872436936378774
- Source branch: codex/cinematic-hangar-menu-exact-approved-icons-20260618
- Source commit packaged: 75b785203c7e5ef9163064795eaf3939d5f888c0
- Packaged smoke gitSha: 75b7852
- Previous candidate source: 2dbca0ea5ea4d6c5c6139bff14b76b36242dc99c
- SteamPipe VDF: release/steamworks/app_build_LOCAL.vdf
- SetLive: blank (`"SetLive" ""`)
- Branch assignment: none
- Public/default assignment: none
- sector-continue-test assignment: none

## Icon Source

- Exact ZIP used: C:\Users\cromk\Downloads\approved_menu_icons_transparent.zip
- Installed only the ten approved transparent menu PNGs:
  - approved-menu-icon-launch-run.png
  - approved-menu-icon-sector-challenge.png
  - approved-menu-icon-ship-hangar.png
  - approved-menu-icon-leaderboard.png
  - approved-menu-icon-threat-codex.png
  - approved-menu-icon-achievements.png
  - approved-menu-icon-settings.png
  - approved-menu-icon-music.png
  - approved-menu-icon-how-to-play.png
  - approved-menu-icon-exit.png
- No green sheet, cropping, imagegen, powerup icon, or deterministic fallback icon source was used.
- Contact sheet from shipped icon files: test-results/cinematic-hangar-menu-icons-2026-06-18T16-00-21-461Z/approved-icons-used-contact-sheet.png

## Checks

- git diff --check: pass
- npm run check:release-line: pass
- npm run check:i18n: pass
- npm run check:i18n-ui: pass
- npm run check:cinematic-hangar-menu: pass
- npm run check:cinematic-hangar-menu-icons: pass
- npm run check:sector-challenge-selector: pass
- npm run check:controller-flow: pass
- npm run check:steam-electron-bridge: pass
- npm run check:powerup-assets: pass
- npm run check:powerup-visuals: pass
- npm run check:codex-layout: pass
- npm run check:threat-codex: pass
- npm run build:current: pass
- npm run package:steam:win: pass
- npm run package:steam:win:current: pass
- npm run desktop:smoke:packaged: pass
- npm run desktop:smoke:current: pass
- npm run desktop:perf:current: pass
- npm run smoke: pass

## Upload Proof

SteamCMD reported:

```text
[2026-06-18 18:26:37]: Successfully finished AppID 4765070 build (BuildID 23806583).
```

Depot build log reported:

```text
[2026-06-18 18:26:36]: Success! New manifestID 5359872436936378774 created and 15 new chunks uploaded.
```
