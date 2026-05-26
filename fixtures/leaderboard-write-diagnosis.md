# Steam Leaderboard Write Diagnosis

App ID: `4765070`

Leaderboard API name: `nova_swarm_global_score`

Current Steamworks visual evidence from 2026-05-25:

- Sort: Descending / Synkende
- Display: Numeric / Numerisk
- Writer / Skriver: `-`
- Reader / Leser: `-`
- Lobby: `-`

## Upload Path Audit

The exact native upload path is `electron/steamLeaderboardBridge.cjs` -> `submitScoreDetailed()` -> `uploadScoreViaRawSdk()` -> `SteamAPI_ISteamUserStats_UploadLeaderboardScore(userStats, leaderboardHandle, method, score, detailsPtr, detailsCount)`.

Findings before this diagnosis pass:

1. `RequestCurrentStats` was not explicitly gated before upload in `submitScoreDetailed()`.
2. The wrapper init path requested stats indirectly, but the leaderboard bridge did not observe the callback before upload.
3. `UserStatsReceived_t` was not observed before upload.
4. `m_eResult` from `UserStatsReceived_t` was not captured.
5. Upload could be attempted before the bridge had proved stats readiness.
6. No separate cached ready flag was found in the leaderboard bridge, but `steamworks-ffi-node` initialization could give a false sense that stats were ready.
7. There was no explicit one-upload-in-flight guard in the leaderboard bridge.
8. The wrapper callback poller did not expose `bIOFailure`; the bridge now tries a detailed raw `ISteamUtils` poll first and records `bIOFailure` when those functions are available.
9. The raw upload method is `KeepBest = 1` unless `force_update` is explicitly requested.
10. `detailsPtr` is `null` when `detailsCount` is `0`.

Important wrapper detail: `steamworks-ffi-node@0.10.3` exposes `SteamAPI_ISteamUserStats_RequestCurrentStats`, but the loaded symbol is `SteamAPI_ISteamUserStats_RequestUserStats` with a `SteamAPICall_t` return. The Steam flat API in the local SDK exposes `RequestUserStats` and `UploadLeaderboardScore`, but not a flat `RequestCurrentStats` function. The safest observable gate available from this wrapper is therefore `RequestUserStats(currentSteamId)` plus a `UserStatsReceived_t` call result check.

## Added Diagnostics

Every submit report now includes:

```json
{
  "requestCurrentStats": {
    "attempted": true,
    "available": true,
    "returned": true,
    "callbackObserved": true,
    "ok": true,
    "result": {
      "m_eResult": 1
    },
    "durationMs": 0,
    "error": null
  }
}
```

The upload path now rejects a second simultaneous upload before calling Steam and classifies it as `upload_already_in_flight`.

If `LeaderboardScoreUploaded_t.m_bSuccess` is `0` after a valid raw callback, valid handle, `detailsCount <= 64`, and `KeepBest = 1`, the bridge classifies the result as `steam_backend_rejected_unknown_reason` because visible Steamworks settings now show Writer/Skriver `-`.

## Next Isolation Test

Use one Steam-client-launched probe after waiting 10 to 15 minutes since the last upload attempt:

```powershell
--steam-leaderboard-probe --submit --details=none --score=1
```

If the original leaderboard still returns `m_bSuccess = 0`, create `nova_swarm_global_score_v2_test` with the same settings and run:

```powershell
npm run probe:steam-leaderboard-live -- --details=none --score=1 --leaderboard=nova_swarm_global_score_v2_test
```

If v2 also fails, the fastest escalation packet is the latest probe report JSON with `requestCurrentStats`, raw callback JSON, Steam client launch evidence, and package/build entitlement evidence.
