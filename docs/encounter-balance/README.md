# Combined boss encounter balance

Delivered: **Steam Build 25237042**, live on **sector-continue-test**, runtime **cfa5f0c**, version **v2026-09-10_19-54-03**. Both launch options verified in the packaged executable. Public build **25233377** unchanged. [Verified delivery receipt](delivery.json).

Branch: `codex/mystery-encounters-20260910`. Baseline: `b22ea81`.

The same Steam launch options now practice full-health opponents:

```text
--nova-encounter-test=dual-boss
--nova-encounter-test=boss-snake
```

The original test began with 29%/64% primary health, a second boss with only 12% ordinary health, or a snake whose sections each had less health than one player shot. Bosses alternated; the snake disabled boss fire. Accurate continuous fire finished those setups in 10.3/9.3 seconds.

Selected rare encounters now give the primary and reinforcing boss twice the ordinary sector boss's health. The snake has a total 120% ordinary boss-health budget (80% for the later three-enemy chain). Health is assigned at spawn, with no mid-fight healing or artificial damage floor. The normal campaign still waits for the existing health thresholds; the isolated launch presets bring reinforcements immediately so both opponents can be practiced from full health.

Both enemies attack. New windups are separated by at least 1.1 seconds, existing warnings retain their full length, and attack starts wait when 72 hostile projectiles are already present. Boss routine intervals are 15% longer to leave space for crossfire. Projectiles are no longer erased every six seconds. Losing a life gives both bosses a short recovery; player speed, damage, hitboxes, dodge and ordinary mercy rules are unchanged.

A surviving snake must still be fought after the boss dies. It can retreat after 55 seconds, preserving a bounded encounter. Announced arrivals, both boss death orders and final completion are checked. Rewards/drafts occur once. Ordinary single-boss fights, early sectors, authored support and Daily Signal retain their existing rules.

Verification uses real game projectiles, collision, movement and attack warnings at 1920×1080. The separate offense probe ignores incoming player damage only to measure time-to-kill: **37.7 seconds for two bosses; 27.2 seconds for boss plus snake**. With normal damage enabled, an automated pilot cleared boss plus snake in **43.4 seconds**, and two bosses in **76.8 seconds** using two ordinary Blink activations. The less capable bullet-only pilot lost both fights; the warning-aware pilot without Blink lost the dual fight. These are automated measurements, not a claim of human difficulty or playthrough time. Detailed results and frame samples are under `test-results/encounter-balance`.

In the separate offense runs, mean frame times were 16.70/16.67 ms and p95 17.2/17.1 ms respectively on the available RTX 2060 at 1080p. One dual-boss frame reached 66.5 ms. No build or other capture ran concurrently; these are browser-runtime observations, not a worst-case fleet-wide performance guarantee.

Changed areas: encounter tuning and coordination, Boss/SpaceSnake attack-start permission, EnemyManager test setup, two warnings in all eight languages, and focused runtime/launch/balance checks. No combat sprite, model, sound-bank or player-stat asset changes. No untranslated additions.

Checks: `check:release-line`, `check:i18n`, `build:current`, `check:i18n-ui`, `check:steam-electron-bridge`; discovery probabilities/stat preservation, boss warning lifecycle/fairness, combined-encounter runtime, sustained-fire calibration, and packaged launch/profile isolation. Delivery receipt records the actual final check results and Steam build. No public Steam branch or Steamworks settings changes; no Git push.

Rollback: revert the runtime commit identified in `delivery.json`; the previous Steam test build is **25235979**. Inherited untracked work is preserved.
