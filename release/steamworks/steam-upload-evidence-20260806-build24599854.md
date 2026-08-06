# Steam upload evidence: Tyrian feedback and Wonder revelation

- Date: 2026-08-06 (Europe/Oslo)
- Worktree: `D:\vibe-coding-e\codex\nova-swarm-tyrian-103-20260806-6b7d`
- Branch: `codex/tyrian-103-20260806-6b7d`
- Packaged source: `f15c76d8b5d4dbc2d7e0f4cb147ef2a76b3164d2`
- Package evidence commit before upload: `752c1c5`
- Build: `v2026-08-06_21-17-26`
- Steam AppID / DepotID: `4765070` / `4765071`
- Steam BuildID: `24599854`
- Depot manifest: `4879574498594448776`
- Baseline depot manifest: `2794816507068655357`

## Player visible changes

- Cobalt Guard no longer claims near miss score or wide shot properties it does not provide.
- Tactical Draft preserves a reselected held card across the next draft.
- Drone Constellation Fusion presentation stays compact, and every Ascendant support drone is protected from large source texture dimensions.
- Settings and keyboard control panels remain inside their 1920 by 1080 layout bounds. Shift remains directly rebindable.
- Cabinet Wonders use a dedicated four second ElevenLabs revelation asset. The wordless choir and ceremonial bell begin 1.5 seconds before the visual event.

## Verification

- Release line, localization, eight locale UI, focused gameplay, notification orchestration, Cabinet Wonder runtime, Ascendant ship, tactical draft, keyboard binding, controller, browser smoke, Steam bridge, and fresh profile isolation checks passed.
- The aggregate hardening runner exposed two environmental or timing flakes: restricted shell Electron GPU startup failed until the unchanged gate ran in the real Windows desktop context, and one Overrun pickup sample advanced once during a hold. Both focused gates passed unchanged on immediate real desktop rerun. Every remaining hardening constituent was then run and passed individually.
- Packaged smoke and packaged controls passed.
- Current and packaged performance passed at 60 FPS minimum and 60 FPS average across eleven samples each. Both recovered one screenshot capture retry without a gameplay error.
- Steam package runtime and desktop package integrity passed with AppID `4765070` and leaderboard `nova_swarm_global_score_v2` unchanged.
- Payload manifest: 861 files, 1,352,768,892 bytes, manifest hash `d93f48707122c7bd169d69825e095a8f097ced1dbe127ec497d051cbede34de1`.

## SteamPipe boundary

- VDF: ignored local file `release/steamworks/app_build_LOCAL.vdf`
- `SetLive`: empty string
- SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24599854).`
- Depot log: `release/steam-build-output/depot_build_4765071.log`
- App build log: `release/steam-build-output/app_build_4765070.log`
- The upload is private and unassigned. No public or default branch, Steamworks configuration, store metadata, achievement metadata, leaderboard identity, or Steam Cloud setting changed.
- SteamCMD repeated the existing warning that the established native runtime staging convention includes development Steam SDK files in the depot. The upload and package gates passed, but narrowing this payload remains a separate packaging cleanup task.

## Forum follow up

- Published reply: `https://steamcommunity.com/app/4765070/discussions/0/569288155749142195/?ctp=3#c583930562168924373`
- Steam comment: `#105`
- The reply states what was fixed and separately identifies balance or reproduction dependent items that were deliberately not changed.
