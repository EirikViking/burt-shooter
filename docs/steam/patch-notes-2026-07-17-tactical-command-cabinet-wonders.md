# Nova Swarm Update: Tactical Command, Clearer Contracts & Cabinet Wonders

Draft only - prepared July 17, 2026. Do not publish until the matching build is available to players.

Coverage boundary: player-facing work completed after the published July 13 update, `Nova Swarm Patch Notes: Aces, Nemesis Protocols & Rival Wings`.

## Steam post copy

Nova Swarm has changed enormously since the July 13 update. This release makes the strongest mode easier to find, the busiest fights easier to read, rewards more intentional, and the whole cabinet much more alive.

Thank you to everyone who has been testing, recording runs, and telling us where the game feels brilliant, confusing, unfair, or simply too loud to parse. A lot of this update comes directly from that feedback.

### Mayhem Tactical is now the main mode

- Mayhem Tactical now has first position, default focus, the strongest launch treatment, and clear `MAIN MODE` / `RECOMMENDED` language.
- Mayhem Pure remains the ranked alternative for pilots who want the original no-Draft ruleset.
- Daily Challenge, Scout Run, and Sector Run now explain their purpose before launch instead of competing for attention as if they were identical modes.
- Mouse, keyboard, and controller focus now restore correctly when returning from Hangar, Settings, Achievements, Leaderboards, Threat Codex, How to Play, or a completed run.
- Every run-mode card now gets its intended hover voice. Moving between modes no longer causes a shared voice cooldown to silence the next card.

### Daily Challenge is clearer

- The Daily briefing leads with today's goal, assigned challenge, loaner ship, local record, and reset time.
- The confusing row of weekly status symbols has been replaced by a plain `WEEKLY CLEARS: X / 7` readout.
- Failed attempts and clears are tracked separately. Failed runs prioritize deepest sector; clears prioritize score, then time.
- The seven-day Flight Log, replay identity, local bests, downloadable result card, and share caption remain available.
- Daily remains explicitly local-only: it does not pretend to have a public Daily leaderboard.

### Ace Contracts now explain the hunt

- Ace arrivals now show one calm contract card: destroy the gold-marked Ace, read its promised reward, and identify its attack type.
- The contract stays visible longer, uses less moving decoration, and removes the chassis/flight/weapon spec line from the middle of combat.
- The Ace itself carries a persistent `DESTROY ACE` marker and reward label.
- Matching Ace and Nemesis reward rolls now pay two separate pickups. The old combined pickup could silently discard the second identical reward.
- Ace reward pickups linger longer, drift more slowly, and have a larger claim assist so winning the contract is less likely to create another frantic mistake.
- Ace kills keep their ordinary score value. The hunt remains optional tactical loot, not a leaderboard tax.

### New rare Cabinet Wonders

- The cabinet can now produce three rare, procedural moments between waves: a Ghost Fleet Salute, a Starwhale Constellation, or an Aurora Crown.
- Wonders use their own restrained synth accent, stay behind the HUD, respect Reduced Motion, and never appear during challenge or overloaded reinforcement transitions.
- They are deterministic, score-neutral, gameplay-neutral, and limited to at most one per run. They exist only to make the universe feel capable of surprising you.

### Tactical command has more bite

- Sector 5's Combo Anchor is now a guaranteed `NOW OR NEVER` score-route decision.
- Two permanent bans, Hold, Rescan, and the reduced third Overdrive stack remain the bounded tools for shaping a late-run build.
- Four pair-earned Fusion Protocols make compatible augment combinations feel like authored builds without adding a score multiplier.
- Tactical Directives now form a fifty-stage campaign, carry unfinished progress forward, and recalibrate after a genuine drought.
- Pilot Orders remain available in Mayhem Tactical without revealing their hidden final endpoint.
- Graze Break's counterstrike is much larger, brighter, and more sparkly without changing its damage rule.

### Combat feedback and control

- Bomb pickups now become stored charges instead of being wasted the instant they are collected. Autofire waits for a useful target lane, while direct enemy and boss impact remains intentional.
- Point Defense now visibly intercepts hostile shots inside its radius, reports remaining state, and cleans up correctly on expiry.
- Temporary combat effects use playable game time, so mandatory messages, Tactical Drafts, pauses, and focus loss do not consume their useful duration.
- Twelve hostile projectile families now have distinct cores, halos, wakes, afterimages, and movement character while keeping collision truth readable.
- Pickup ownership and cleanup are centralized, preventing duplicate logical rewards and persistent pickup-ring visuals.
- Panic Engine beams and walls now keep visual and damage lifecycles synchronized through expiry, boss defeat, respawn, retry, and scene changes.

### More spectacle, less visual ambush

- Special-enemy warnings are shorter and edge-aligned, with compact layouts that stay away from score, player, and critical-status lanes.
- Elite arrivals now stage their entrance, show protection clearly, and wait briefly before firing.
- Reinforcement swarms, Super Storms, Rare Chaos Visitors, Nova Miracle, and expanded powerup personalities add more authored peaks to long runs.
- Thirty additional elite middle threats bring the elite roster to 50.
- The backdrop, impacts, combo peaks, boss phases, major pickups, and wave clears now share a bounded spectacle layer with reduced-motion and performance limits.

### Hangar, records, and run identity

- Newly unlocked or never-launched ships keep a `FIRST FLIGHT` marker until they actually launch.
- Ship browsing now shows local launch counts.
- The Named Rival Ladder turns the next ranked run into a concrete pilot or Top-40 target instead of a generic score chase.
- Personal-best celebrations linger longer, pause correctly, avoid HUD overlap, and carry into Game Over instead of vanishing during the scene change.
- Run Report now preserves the actual mode and fails closed for unknown, legacy, debug, Daily, Scout, Sector, and other unranked identities.
- `Top Of The Swarm` is now `Swarm Elite`; its stable achievement ID is unchanged.

### Audio and reliability

- Longship Row Core now owns one uninterrupted chant, so its full ritual survives cold launch and heavy combat audio.
- Railbreaker has a shorter, quieter firing sample and a saner sustained-fire cadence.
- Reinforcement, boss, level-clear, game-over, menu, Tactical, Fusion, rare-contact, and powerup audio catalogs have been expanded and hardened against accidental overlap.
- The Steam desktop package gate now fails closed if the required native leaderboard runtime is missing.
- Achievement rows are rebuilt from unique stable IDs, and stale display rows are destroyed before the list is rendered again.
- Numerous small freezes, transition hitches, orphaned projectiles, and interrupted-effect cleanup paths received focused fixes.

All changed player-facing text is available in English, German, Spanish, Brazilian Portuguese, Russian, Japanese, Korean, and Simplified Chinese.

Tiny Foundry

## Internal publication guard

- Draft only; not posted.
- No build assignment or Steam branch state is implied by this text.
- Before posting, replace this guard with the exact shipped build/branch evidence and remove any claim not present in that build.
