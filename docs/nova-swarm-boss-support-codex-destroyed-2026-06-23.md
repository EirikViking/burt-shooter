# Nova Swarm Boss Support Codex Destroyed Audit - 2026-06-23

## Problem Report

A player reported that Boss Support Ship entries in Threat Codex could show Encounters while Destroyed stayed at zero. The visible example was Boss Fuel Ship with many Encounters and no Destroyed count.

## Root Cause

Boss Fuel Ships were discovered under both the generic `boss_fuel_ship` Codex entry and the generated support profile entry, such as `boss_support_ship_001`. When the player destroyed one, the normal enemy kill path only queued defeat tracking for the runtime generated enemy type used to draw the ship. It did not queue defeated records for the generic Boss Fuel Ship entry or the specific support profile ID.

## Implementation Summary

- Added a small Boss Support Codex helper that maps killed `boss_fuel_ship` enemies to the generic `boss_fuel_ship` entry plus the exact generated support profile ID when available.
- `PlayScene.onEnemyKilled()` now queues those support Codex defeated records only when a support ship is actually killed.
- Support delivery to the boss still records Encounters only and does not count as Destroyed.
- The extra support-specific defeated records explicitly disable first-defeat score bonuses, preserving existing scoring behavior.
- Boss Support Ship profiles, spawn cadence, HP, movement, healing, visuals, SFX, rewards, boss behavior, and boss balance are unchanged.

## Support Types Covered

The audit covers all 111 generated Boss Support Ship profiles from `BOSS_SUPPORT_SHIPS`, plus the generic Boss Fuel Ship Codex entry. Current support roles include fuel runners, armor menders, shield tugs, spark barges, mercy skiffs, reactor nurses, panic patches, and warranty tows.

Boss chaos support waves and boss adds are not treated as Boss Fuel Ship support profiles; they continue through their existing normal enemy tracking path.

## Evidence

- `npm run check:boss-support-codex`
- Focused report: `test-results/boss-support-codex-2026-06-23T13-57-22-701Z/report.json`

The check verifies:

- generic Boss Fuel Ship exists in Threat Codex
- every generated support profile exists in Threat Codex
- every killed support profile increments both the generic Boss Fuel Ship Destroyed count and its exact profile Destroyed count
- delivery/encounter without player kill does not increment Destroyed
- fallback lookup from `bossFuelProfile.id` works
- unknown support IDs only increment the generic Boss Fuel Ship entry
- large defeated Codex state over 500 entries remains safe
- support-specific accounting does not award extra first-defeat score

## Known Limitations

This pass only fixes Codex Destroyed accounting. It does not change support ship gameplay, boss healing, rewards, score values, wave balance, boss balance, achievements, leaderboard identity, save format, Steam Cloud settings, or Steamworks metadata.
