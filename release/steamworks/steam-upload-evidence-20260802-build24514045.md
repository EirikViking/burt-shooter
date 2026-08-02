# Nova Swarm Tyrian and ship-identity Steam upload

- Uploaded: 2026-08-02 01:59 Europe/Oslo
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Steam BuildID: `24514045`
- Tested and packaged source: `583bac969c01d9676a45764933769ccd06153eb1`
- Build version: `v2026-08-02_01-40-28`
- Payload manifest hash: `e920d0a37da10b90835710c58d0671879e19e19482cbf1d5967a7bed35b629cc`
- VDF: `release/steamworks/app_build_LOCAL.vdf` (ignored local file)
- VDF `SetLive`: blank (`"SetLive" ""`)
- Result: uploaded successfully and left unassigned; no Steam branch or public/default assignment was changed.

## Product source

The package retains the completed 21-item Tyrian #93/#94 implementation and the subsequent reinforcement-arrival, Scout tie/result-card, and combat-audio improvements. This source adds dedicated art for Aegis Comet, Railbreaker, Drone Sovereign, and the detailed Eirik v2 Viking flagship; distinct Hangar signatures for all 30 hulls; and a runtime ship-scale guard derived from gameplay-video evidence. Eirik renders at the normal bounded gameplay footprint rather than expanding across the combat field, while the full-resolution Hangar keeps its apex showcase treatment.

## Verification

- `npm run build:current`
- `npm run check:tyrian-responsive-ui` (3 layouts, 27 screenshots; forced Eirik scale corruption repaired to 74.1 px)
- `npm run check:i18n`
- `npm run check:i18n-ui` (8 languages)
- `npm run check:controller-flow`
- `npm run check:steam-electron-bridge`
- `npm run smoke`
- `npm run desktop:smoke:current`
- `npm run desktop:perf:current` (60 FPS)
- `npm run check:release-line`
- `npm run check:steam-sdk-ready`
- `npm run package:steam:win:current`
- `npm run desktop:smoke:packaged`
- `npm run desktop:controls:packaged`
- `npm run desktop:perf:packaged` (58.48 minimum, 60.05 average FPS)
- `npm run check:packaged-steam-runtime-gate`
- `npm run check:fresh-profile-steam-isolation`
- `npm run steamworks:write-vdf`
- `npm run steamworks:payload-manifest`

## SteamPipe proof and caveat

SteamCMD exited `0` and reported: `Successfully finished AppID 4765070 build (BuildID 24514045).`

The established native-runtime staging script copied the full ignored `steam_sdk` tree into the package. SteamCMD warned that `steam_appid.txt`, `steamservice.exe`, `steamclient.dll`, `steamclient64.dll`, and `steamcmd.exe` should not be included in a depot. This did not fail packaging, runtime validation, or upload, but a future packaging-only cleanup should narrow the staged SDK payload to runtime redistributables before any live assignment.

## Rollback

No branch rollback is required because BuildID `24514045` is unassigned. If it is manually assigned later, restore that branch to its prior desired BuildID in Steamworks. Source rollback for the product commit is `git revert 583bac969c01d9676a45764933769ccd06153eb1` from the isolated branch; do not rewrite inherited history.
