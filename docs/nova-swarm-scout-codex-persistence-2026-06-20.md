# Nova Swarm Scout Codex Persistence Audit - 2026-06-20

## Scope

Scout Run is unranked practice. It must not grant leaderboard submission, achievements, career XP, checkpoint unlocks, ship unlock progress, ranked bests, global bests, or Mayhem progress.

Scout Run is allowed to persist knowledge/practice state:

- Threat Codex discoveries and seen intel.
- The profile-local Scout Best.

## Root Cause

Scout discoveries were written to the dedicated `nova.threatDiscovery.v1` Codex store, but Scout intentionally does not run ranked Hangar progression. That made the Codex store the only source of truth for Scout discoveries.

The Electron Steam Cloud merge path treated `threatDiscovery` as a replaceable renderer payload. A stale renderer/cloud payload could therefore replace a richer profile Codex store during sync or profile reload. This matched the reported behavior where Scout discoveries appeared during play but later returned to the older 763-discovery count.

Scout Best already used a separate profile-local record key, but the new regression test now verifies it through the same stale-sync and restart path so Scout practice state cannot silently fall back.

## Fix

- Scout starts a fresh Codex discovery window like Mayhem, so result summaries and this-run discovery lists are accurate.
- Renderer Steam Cloud restore merges Threat Codex state using union/max semantics.
- Electron profile save sync merges Threat Codex state using union/max semantics instead of replacement.
- Scout Best remains profile-local and is verified alongside Scout Codex persistence.

## Merge Rules

- Codex categories and IDs are unioned.
- Threat counters use max.
- Best clear time uses the better lower value when both sides have one.
- Highest score during encounter uses max.
- Metadata is merged.
- `Scout Best` uses the existing better-record rule: higher score, then deeper sector, then deeper level, then newer timestamp.

## Explicit Non-Goals

This pass does not change Mayhem balance, Scout balance, boss tuning, wave tuning, leaderboard identity, achievements metadata, Steamworks metadata, save profile isolation, profile rescue, powerup art, Prism Splitter art, or display settings.
