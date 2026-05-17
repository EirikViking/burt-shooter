# SteamCMD Local Check - 2026-05-17

Result: local SteamCMD availability is verified.

Install location:

- `tools/steamcmd/steamcmd.exe`

Notes:

- `tools/steamcmd/` is ignored by git and is a local release tool install, not a tracked game artifact.
- The first launch self-updated from Valve's SteamCMD distribution and exited nonzero during the updater restart.
- A second launch succeeded with `tools\steamcmd\steamcmd.exe +quit`.

Successful output excerpt:

```text
Steam Console Client (c) Valve Corporation - version 1778284286
Loading Steam API...OK
Unloading Steam API...OK
```

Remaining Steam-side blockers:

- Real Steamworks app ID and depot ID still need to be configured outside the template files.
- SteamPipe upload still needs Steamworks credentials.
- Steam client install/launch validation still needs to be run after a real upload.
