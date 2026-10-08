# Sector discoveries, boss encounters and victory presentation

The original balance below is historical. The user's subsequent difficulty feedback is implemented in the [combined encounter revision](../encounter-balance/README.md).

Delivered: Steam Build **25235979**, live on **sector-continue-test**, source **8291d9c**, version **v2026-09-10_18-40-35**. Both launch options passed in the packaged executable. All eight UI languages and all 18 milestone/viewport combinations passed. The public build remained **25233377**. [Exact delivery receipt](delivery.json).

Steam launch options (use one at a time):

```text
--nova-encounter-test=dual-boss
--nova-encounter-test=boss-snake
```

Steam > Nova Swarm > Properties > General > Launch Options. These require the updated test build. Remove the option to return to normal play and the usual profile. Restarting the game, or starting another run, repeats the preset.

Both presets jump directly to sector 31's boss, just below the reinforcement threshold: 29% health for two bosses, 64% for boss plus Snake. A fixed loadout supplies Damage Up, Rapid Fire, Blink Drive, Focus Lens and Double Shot. These are playable encounters with normal damage, three starting lives and no invincibility. The existing warning, arrival, attacks and reinforcement health rules still apply. They are not two full-health independent bosses.

The desktop creates a separate temporary profile before any game services initialize. Steam leaderboard and achievement requests are blocked; run policy also disables career, Codex, unlock, reward and Cloud progression. Normal startup does not activate these presets. No developer key is needed.

## New normal-run pacing

- Every enemy family keeps at least half its identities for sector 20 onward, with further reveals through sector 60. Authored combat stats remain intact; the eligibility schedule changes.
- After 15: 10% chance of a Snake reinforcement below 65% primary boss health. Its total health is 6% of the primary boss, it departs after 12 seconds, and boss fire pauses during its visit.
- After 20: a separate 10% chance of a second boss below 30% primary health. Reinforcement health is 12% of the primary. The pair separates into lanes and alternates attack windows.
- After 30: a separate 5% chance of that relay followed by a Snake below 20% reinforcement health. This Snake has a 3% health budget.
- Events are mutually exclusive and replace ordinary boss support rolls. Final completion, sector rewards and the draft occur once, after the boss encounter ends. Daily Signal and authored experimental boss support retain their existing rules.

These limits constrain pressure; they do not prove that human-perceived difficulty changes by an exact percentage. Full campaign balance still needs player feedback. Pacing draws on [Valve's discussion of peaks and recovery](https://cdn.fastly.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf).

## Celebrations

The old trophy/flat portrait presentation becomes an open cinematic scene: the actual selected showcase model flies into the palace, with authored energy bursts, milestone typography, a score count-up and staged rewards. Mouse, keyboard and controller continuation remain supported. Reduced motion and flash settings apply. Combat waits for confirmation. Existing premium ElevenLabs audio is reused; no generation credits were spent.

## Verification and scope

Baseline: `66255de`. Branch: `codex/sector-discoveries-and-celebrations-20260910`.

Changed areas: enemy eligibility configuration; `BossDiscoveryEncounter`, `EnemyManager`, `Boss` and `SpaceSnake`; `AstraCoronation`, `CelebrationArt`, Menu/PlayScene; desktop launch/preload, game startup and its test policy; two translated warning strings in all eight locales; targeted validators and runtime checks. Existing player sprites, showcase models, audio files and gameplay-facing player contracts are retained.

Reproducible checks:

```text
npm run check:release-line
npm run check:i18n
npm run build:current
npm run check:i18n-ui
npm run check:steam-electron-bridge
node scripts/check-discovery-progression.mjs
node scripts/check-boss-discoveries-runtime.mjs
node scripts/check-discovery-celebrations-runtime.mjs
node scripts/check-boss-encounter-launch.mjs
node scripts/check-overrun-confirmation.mjs
node scripts/check-overrun-milestones.mjs
node scripts/check-controller-only-flow.mjs
```

The two discovery runtime scripts use the existing local Vite server or `CHECK_URL`; the launch check uses the actual desktop runtime and optionally `NOVA_SWARM_PACKAGED_EXE`. Checks write genuine runtime evidence under `test-results/discovery-celebrations`. Forced milestones and encounter setups are test captures, not claimed normal campaign accomplishments.

Measured victory presentation: 170 frames at 1920×1080, mean 16.67 ms, p95 16.8 ms on the available RTX 2060 machine, without concurrent builds/captures. This is not a worst-case combat measurement. Repeated victory disposal returned resident showcase count from zero to zero. All 1,780 authored normal-enemy stat records compare exactly against baseline; roster eligibility and seeded encounter probabilities are tested separately.

No added untranslated text; proper names and English audio remain intentional. A separate existing rare-visitor validator has a stale text assertion already absent at baseline (`SURVIVE THREE ESCALATION PHASES`); new visitor eligibility checks pass.

Only the previously authorized `sector-continue-test` branch was updated. Public build and Steamworks configuration stayed unchanged. No Git push. Rollback: `git revert 8291d9c 5f35e39`; the preceding Steam test build is `25233377`. Inherited untracked work is preserved.
