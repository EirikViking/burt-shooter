# Discord Presence

Nova Swarm desktop builds can publish Discord Rich Presence from the Electron main process. This makes Discord show the player as playing the Discord application named Nova Swarm.

## Setup

1. Create a Discord Developer application named `Nova Swarm`.
2. Copy its Application ID.
3. Set it for local runs or direct launches:

```powershell
$env:NOVA_SWARM_DISCORD_CLIENT_ID="YOUR_APPLICATION_ID"
npm run desktop:smoke:current
```

For a permanent shipping build, put the real Application ID in `PACKAGED_DISCORD_CLIENT_ID` inside `electron/discordPresenceConfig.cjs` before packaging. The ID is not a secret.

Optional artwork uses the same Discord application. Upload a Rich Presence asset, then set:

```powershell
$env:NOVA_SWARM_DISCORD_LARGE_IMAGE_KEY="nova_swarm"
```

## Runtime Behavior

If the Application ID is missing, malformed, Discord is not running, or the player has activity sharing disabled, Nova Swarm continues normally and skips presence updates. Smoke and Steam diagnostics modes also skip Discord presence so automated checks do not wait for a local Discord client.

The status updates every 15 seconds and maps the current screen to simple activity text such as `In the menu`, `Sector 7`, `In the hangar`, or `Viewing leaderboard`.
