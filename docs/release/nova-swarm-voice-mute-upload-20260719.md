# Nova Swarm voice mute Steam upload

Date: 2026-07-19

Source folder: `C:\tmp\nova-swarm-post-stable-development-20260718`

Branch: `codex/achievement-integrity-audit-20260719`

Locked stable baseline: `ae1d2e82accf20859da172f636907a11c965cf3d`

Voice mute fix commit: `a643b7ff19072dddd5de4a680a4e620035f12f1c`

Packaged source commit: `d4cb3d19ee164d78c64c13508ef3498cfe507e5a`

Package evidence commit: `5f562b9ed5c37ab2cc61239a19d1660ee3cbdfa0`

Package version: `v2026-07-19_18-13-25`

Package folder: `E:\Codex\nova-swarm-steam-package-voice-mute-20260719\desktop\win-unpacked`

Packaged executable SHA-256: `8aa0801d55c13ce84602c1a7a433be67ee7b86134be0cd771a0eaabb125164d5`

Payload manifest SHA-256: `203c2b24b4fb049e315467b93c0decfd1832a06f7a3483a468542be70e50851b`

Steam AppID: `4765070`

Windows depot: `4765071`

Steam BuildID: `24284685`

Steam branch assignment: none

VDF `SetLive`: `""`

Upload description: `Nova Swarm voice mute routing fix v2026-07-19_18-13-25`

SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24284685).`

Upload log: `test-results/steam-upload-voice-mute-20260719/steamcmd.stdout.log`

## Correction

`playDiegeticVoice()` routed female level-clear lines, tactical boss banter, and boss-death vocals through the SFX volume while bypassing the global Voice switch. Those spoken tracks now always obey the global Voice switch and Voice-volume bus. Disabling Voice or setting Voice volume to zero immediately stops active and delayed speech; active voices also follow later Voice-volume changes.

No player-facing text, balance, score formula, leaderboard identity or stored score, achievement ID or requirement, save format, Steam Cloud path, AppID, or depot ID changed.

## Surgical verification

- `npm run check:voice-mute-contract` passed Voice-off, zero-volume, active-volume-update, and immediate-stop cases.
- Level-clear, boss-death, and tactical-boss voice catalog checks passed.
- The built in-game muted level-clear reproduction passed with `voiceEnabled: false`, `lastVoiceEvent: null`, and `activeVoiceCount: 0`.
- The runtime screenshot was inspected at `test-results/level-clear-voice-runtime-2026-07-19T16-14-05-467Z/level-clear-voice-runtime.png`.
- `npm run check:release-line` passed before packaging and again before upload evidence was committed.
- Steam native-runtime staging and `npm run check:steam-package-runtime` passed.
- The exact packaged executable passed Steam-backed smoke and its menu screenshot was inspected.
- The payload contains 417 files and 958,422,459 bytes.

The generic web-game client was attempted as required but its bundled `chromium_headless_shell-1208` executable is absent on this machine. The repo-native installed-Chrome gameplay reproduction and packaged Electron smoke both passed.

The upload did not move a Steam branch, call SetLive, change Steamworks metadata, or modify production data.
