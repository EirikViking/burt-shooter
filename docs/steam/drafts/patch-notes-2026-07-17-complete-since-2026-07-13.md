# DRAFT - NOT PUBLISHED

Prepared July 17, 2026. This draft covers the player-visible game delta since
the July 13 update, *Aces, Nemesis Protocols & Rival Wings*. The body below is
ready for manual publication only after the matching Steam BuildID passes the
manual release test.

---

# Nova Swarm Update: Tactical Command, Clearer Combat & Cabinet Wonders

Nova Swarm has changed enormously since the July 13 update. This release makes
the main mode easier to find, the busiest fights easier to read, rewards more
intentional, and the whole cabinet much more alive.

Thank you to everyone testing runs and telling us where the game feels
brilliant, confusing, unfair, or simply too loud to parse. Much of this update
comes directly from that feedback.

## Mayhem Tactical takes command

- Mayhem Tactical now has first position, default focus, the strongest launch
  treatment, and clear `MAIN MODE` and `RECOMMENDED` labels.
- Mayhem Pure remains the ranked alternative for pilots who want the original
  no-Draft ruleset.
- Daily Challenge, Scout Run, and Sector Run now explain their purpose before
  launch instead of competing for attention as if they were identical modes.
- Hover narration now works across every game mode and describes the mode that
  is actually selected. Moving between cards no longer lets a shared voice
  cooldown silence or misidentify the next mode.
- Rapid pointer movement retains a short anti-chatter dwell, while deliberate
  mouse, keyboard, and controller focus speaks reliably.
- Focus now restores correctly after returning from the Hangar, Settings,
  Achievements, Leaderboards, Threat Codex, How to Play, or a completed run.

## Daily Challenge is finally plain English

- The confusing weekly row of dots and diamond symbols is gone from the primary
  Daily briefing. Weekly progress now reads clearly as
  `WEEKLY CLEARS: X / 7`.
- The Daily briefing leads with today's goal, assigned challenge, loaner ship,
  local record, and reset time.
- Failed attempts and clears are tracked separately. Failed runs prioritize
  deepest sector; clears prioritize score and then time.
- A labelled seven-day Flight Log, replay identity, local bests, downloadable
  result card, and share caption make each Daily easier to understand and
  revisit.
- Daily remains explicitly local-only. It does not pretend to have a public
  Daily leaderboard.

## Ace Contracts explain the hunt

- Ace arrivals now show one calmer contract card: destroy the gold-marked Ace,
  read the promised reward, and identify its attack type.
- The contract stays visible longer, uses less moving decoration, and removes
  the dense chassis/flight/weapon spec line from the middle of combat.
- The Ace carries a persistent `DESTROY ACE` marker and reward label after the
  contract card leaves.
- Matching Ace and Nemesis reward rolls now create two separate claimable
  pickups. The old combined path could silently lose the second identical
  reward.
- Ace rewards linger longer, drift more slowly, and have stronger claim assist,
  so winning the contract is less likely to create another frantic mistake.
- Ace kills keep their ordinary score value. The hunt remains optional tactical
  loot, not a leaderboard tax.

## Rare Cabinet Wonders

- Three rare procedural moments can now appear safely between waves: a Ghost
  Fleet Salute, a Starwhale Constellation, or an Aurora Crown.
- Wonders stay behind combat and HUD layers, use a restrained synth accent, and
  respect Reduced Motion.
- They never appear during challenge, boss, message, or overloaded
  reinforcement transitions.
- They are deterministic, limited to at most one per run, score-neutral,
  gameplay-neutral, and isolated from gameplay randomness. Their only job is to
  make the universe capable of surprising you.

## Tactical builds have more bite

- Sector 5's Combo Anchor is now a guaranteed `NOW OR NEVER` score-route
  decision.
- Permanent bans, Hold, Rescan, and a bounded third Overdrive stack give pilots
  more control over late-run builds.
- Four pair-earned Fusion Protocols make compatible augment combinations feel
  like authored builds without adding a score multiplier.
- Tactical Directives now form a fifty-stage campaign, carry unfinished
  progress forward, and recalibrate after a genuine drought.
- Pilot Orders work in Mayhem Tactical while keeping their final endpoint
  hidden.
- Tactical loadouts are easier to read on the HUD, Pause screen, and Flight
  Report.
- Graze Break's counterstrike is larger, brighter, and more legible without
  changing its damage rule.

## Combat feedback and intentional powerups

- Bomb pickups now become three banked charges instead of being spent
  automatically. Release fire, then tap again when a boss, durable target, or
  useful cluster is lined up.
- Bombs stay banked through wave gaps, messages, drafts, and other states where
  they cannot be used intentionally.
- Point Defense now has a visible cyan range ring, activation and expiry cues,
  interception feedback, remaining-time HUD state, audio, help text, and Flight
  Report totals. Its purpose is simple: it destroys hostile shots inside the
  ring; it does not damage enemies.
- Temporary effects now use playable game time, so mandatory messages,
  Tactical Drafts, pauses, and focus loss do not consume their useful duration.
- Pure weapon packages drain while firing. Mixed movement, drone, orbital,
  score, and sustain packages use normal playable-time duration so autonomous
  benefits cannot be preserved indefinitely by releasing fire.
- Twelve hostile projectile families now have distinct cores, halos, wakes,
  afterimages, and movement character while preserving collision truth.
- Pickup ownership and cleanup are centralized, preventing duplicate logical
  rewards and persistent pickup-ring visuals.
- Panic Engine beams and walls keep their visual and damage lifecycles
  synchronized through expiry, boss defeat, respawn, retry, and scene changes.

## Mastery, telemetry, and better practice

- Every ship now earns persistent Mayhem mastery medals from ranked results.
  Practice modes cannot advance those medals.
- Pause and the Flight Report now show effective damage, average and peak DPS,
  projectile accuracy, and the run's top damage source.
- Scout Run now offers three practice presets:
  - **Calibration** for a gentler systems check
  - **Bullet School** for projectile-reading practice
  - **Boss Lab** for focused boss preparation
- Scout remains unranked, local, and ineligible for career advancement,
  achievements, or leaderboard submission.
- Newly unlocked or never-launched ships retain a `FIRST FLIGHT` marker until
  they actually launch, and ship details show local launch counts.
- The Named Rival Ladder turns the next ranked run into a concrete pilot or
  Top-40 target instead of a generic score chase.
- Personal-best celebrations linger longer, pause correctly, avoid HUD overlap,
  and carry into Game Over instead of vanishing during the scene change.
- Flight Reports preserve the actual run mode and fail closed for unknown,
  legacy, debug, Daily, Scout, Sector, and other unranked identities.
- `Top Of The Swarm` is now presented as `Swarm Elite`; its stable achievement
  identity is unchanged.

## A much louder, cleaner universe

- Bounded chromatic shockwaves, segmented energy rings, rays, shards, sweeps,
  boss curtains, pickup celebrations, combo crescendos, and wave-clear effects
  give major combat events a stronger visual signature.
- Reinforcement swarms, Super Storms, Rare Chaos Visitors, Nova Miracle, and
  expanded powerup personalities add authored peaks to long runs.
- Thirty additional elite middle threats bring the elite roster to 50.
- Special-enemy warnings are shorter and edge-aligned, with compact layouts
  that avoid score, player, and critical-status lanes.
- Elite arrivals stage their entrance, show protection clearly, and wait
  briefly before firing.
- Procedural bass impacts, stereo sparkle/noise layers, controlled pitch
  variation, and mix compression make the action hit harder without turning
  every sound into the same wall.
- Longship Row Core now owns one uninterrupted chant, allowing the full ritual
  to survive cold launch and heavy combat audio.
- Railbreaker uses a shorter, quieter firing sample and a saner sustained-fire
  cadence.
- Reinforcement, boss, level-clear, game-over, menu, Tactical, Fusion,
  rare-contact, and powerup voice/SFX catalogs have been expanded and hardened
  against accidental overlap.

## Reliability, accessibility, and performance

- Steam screenshots now use the desktop runtime's native capture surface while
  leaving Steam's F12 hotkey unclaimed.
- The Steam desktop package fails closed if required native runtime files are
  missing.
- Achievement rows rebuild from unique stable IDs, preventing duplicate display
  entries.
- Timed enemy starts no longer continue underneath mandatory Overrun or
  message/interlude screens.
- Numerous small freezes, transition hitches, orphaned projectiles, stuck
  effects, and cleanup paths received focused fixes.
- Heavy spectacle has bounded particle/projectile budgets and stress-tested
  cleanup paths.
- Reduced Motion is honored by the spectacle layer, rare contacts, contracts,
  and Cabinet Wonders.
- Controller navigation, focus restoration, compact HUD layouts, and 4K scaling
  received another full pass.

## Localization

All changed player-facing text is available in English, German, Spanish,
Brazilian Portuguese, Russian, Japanese, Korean, and Simplified Chinese.

Tiny Foundry

---

Internal publication guard:

- Draft only.
- Not posted, submitted, announced, or uploaded to Steam.
- Publish only after the exact matching Steam BuildID passes manual testing.
- Do not add a Steam Game Recording claim unless retained recording playback is
  actually verified.
