# Nova Swarm Next Update: Tactical Command, Spectacle & Feedback Fixes

Draft only - not published and not assigned to a Steam branch.

This draft begins after the published July 13, 2026 note, `Nova Swarm Patch Notes: Aces, Nemesis Protocols & Rival Wings`. It includes active player-facing work inherited after that boundary and the verified takeover work completed on July 16.

## Mayhem Tactical takes command

- Mayhem Tactical is now the primary Nova Swarm mode, with first position, default focus, the largest launch treatment, and clear `MAIN MODE` / `RECOMMENDED` language.
- Mayhem Pure remains a ranked alternative for the original no-Draft ruleset.
- Daily Challenge, Scout Run, and Sector Run now read as rotating, practice, and checkpoint activities rather than competing primary modes.
- Controller, keyboard, and mouse navigation follow the new hierarchy and restore focus correctly after returning from the Hangar, Settings, Achievements, Leaderboards, Threat Codex, How to Play, and completed runs.
- Pure and Tactical keep separate ranked leaderboard identities.

## Daily Challenge is easier to understand

- The menu now leads with today's goal, assigned challenge, loaner ship, reset timing, personal best, and local-only status.
- Dense procedural copy and repeated separators were replaced with a shorter purpose-first briefing.
- Daily attempts distinguish best attempt from best clear and use survival time as the tie-break where appropriate.
- Seven-day Flight Log history, retry identity, local records, downloadable result cards, and share captions remain available.
- Missing, malformed, expired, offline, abandoned, replayed, completed, and new-best states fail safely and explain what happened.

## Run identity and result reporting

- Run Report is now version 13 and records the actual canonical mode when known.
- Legacy aliases remain readable, while missing legacy values are identified as legacy and unknown values are shown as unknown instead of silently becoming Mayhem Pure.
- Unknown, invalid, debug, Scout, Daily, Sector, and other ineligible runs now fail closed for ranked submission and achievement eligibility.
- Pending Steam submissions retain their original mode and eligibility identity when retried.
- Mayhem Pure, Mayhem Tactical, Daily Challenge, Scout Run, Sector Run, unranked practice, legacy aliases, missing legacy data, and unknown modes have dedicated verification coverage.

## Swarm Elite

- `Top Of The Swarm` has been replaced by `Swarm Elite`.
- The stable achievement ID remains `ACH_GLOBAL_NUMBER_ONE`, preserving existing unlocks and Steam integration.
- Swarm Elite unlocks after an accepted ranked submission of 750,000 points or more.
- A score of 749,999 does not unlock it.
- Rejected submissions, queued offline submissions, Scout runs, unranked/debug runs, invalid modes, and achievement-disabled runs do not unlock it.
- Reliable historical accepted Steam best scores can backfill the achievement.

## Tactical Draft and score-route clarity

- Sector 5's Combo Anchor is now a guaranteed `NOW OR NEVER` score-route decision.
- The one-time card has distinct framing, copy, focus, and arrival treatment.
- It cannot be held or banned and will not return after being passed.
- Two permanent per-run bans, Hold, Rescan, and the 30%-strength third Overdrive stack remain the late-run control tools.
- Generic upgrade skipping was deliberately not added because rewarding skips would create another leaderboard optimization instead of a clear tactical choice.
- Graze Break's counterstrike is roughly three times larger, brighter, and more sparkly without changing its damage rules.
- Tactical Draft choices, Fusion Protocols, doctrines, evolutions, consumed state, and loadout results remain visible in the HUD and Run Report.

## Combat feedback fixes

- Temporary combat effects now use playable gameplay time so mandatory messages, Tactical Drafts, pauses, focus loss, and other suspended-control states do not consume useful duration.
- Bomb charges remain stored until fired, include an arming delay and charge rail, and wait for a useful target lane under autofire.
- Bombs intentionally detonate on direct enemy or boss impact.
- Point Defense autonomously intercepts hostile shots inside its visible radius, gives impact feedback, and expires/cleans up correctly.
- Panic Engine wall/beam hazards now keep visual and damage lifecycles synchronized through expiry, boss defeat, respawn, retry, and scene transitions.
- Pickup spawns now have centralized ownership, unique IDs, optional logical event keys, duplicate-event blocking, and bounded diagnostics while preserving legitimate bundled rewards.
- Achievements are rendered from unique stable IDs and old display rows are destroyed before the screen is rebuilt.

## Hangar and personal records

- Newly unlocked or never-launched ships show a persistent `FIRST FLIGHT` marker.
- Previewing, hovering, selecting, or opening the Hangar does not clear the marker.
- The marker clears only after a real launch, including a valid Scout launch.
- Ship browsing now shows the local launch count in the combat readout.
- Unlock information remains recoverable after focus loss through persistent Hangar state and summaries.
- Personal-best celebrations now linger longer, pause with gameplay, avoid HUD overlap, and carry into Game Over instead of disappearing during the scene change.

## Enemy projectile spectacle

- Twelve hostile projectile families now use distinct cores, halos, wakes, afterimages, flare language, and movement character.
- Rail needles, plasma orbs, mines, lances, slugs, darts, disruptors, saws, shards, and boss spears retain readable collision truth despite the larger presentation.
- Projectile render ownership is centralized so rejected, expired, pooled, capped, interrupted, and scene-cleared shots cannot leave harmless visuals behind.
- Dense 96-projectile verification kept collision-radius parity and stayed below 30 ms at p99 in the measured browser scenario.

## Special enemies and warnings

- Special-enemy warnings use shorter, more transparent edge-aligned signals that preserve the combat field and HUD.
- Compact and dense-combat layouts keep warnings away from the score, player, and critical status lanes.
- Elite arrivals now include visible threat arcs/pips, a clearly staged entrance, entrance-only damage resistance, and a brief post-entry firing delay.
- Rare Contact staging is less intrusive while retaining its identity and dread.
- Reinforcement swarms, Rare Chaos Visitors, 50 elite middle threats, and Tactical Fusion Protocols retain their expanded visuals, mechanics, rewards, and authored audio.

## Audio

- Longship Row Core now owns one complete chant so all three “row” beats survive cold launch, repeated activation, and heavy audio load without being cut off by generic pickup/voice events.
- Railbreaker uses a shorter dedicated firing sample, lower authored volume, and a 145 ms request cadence.
- The prolonged-fire mix reduces projected overlap from seven clips to two and lowers the measured effective peak by about 5 dB while remaining audible.
- Reinforcement, boss, level-clear, game-over, menu, Tactical banter, rare visitor, Fusion, and powerup audio catalogs remain complete.

## More inherited improvements since the July 13 note

- Faster first-session combat momentum.
- 297 Tactical boss inspection barks.
- Nova Miracle rare board-clear reward.
- Rare Chaos Visitors and adaptive encounter directives.
- Expanded powerup visuals and personalities.
- Thirty additional elite middle threats, bringing the roster to 50.
- Stronger Rare Contact staging and Tactical fairness.
- Larger, clearer reinforcement swarms and Super Storm presentation.
- Four pair-earned Tactical Fusion Protocols.
- Charge weapons retain their exact stored shots through non-play transitions.
- Tactical build payoff, doctrine, evolution, and loadout explanations are clearer.
- Named Rival Ladder targets the next real pilot or top-40 gate.
- Pilot Orders remain available in Tactical without revealing their hidden endpoint.
- Tactical Directives continue through Sector 50.
- Rewritten Threat Codex lore and broader Nova humor.
- Complete six-page How to Play coverage for current modes, combat, Tactics, Intel, and Career.
- Compact sector signals and reduced transition hitching.
- Pickup-ring lifecycle cleanup.
- A hardened Steam package gate prevents shipping without the required native leaderboard runtime.

## Known remaining issues

- One previously reported Pure/Tactical score still requires an unambiguous player/run identity and a supported production-data correction path. The underlying future-submission fallback is fixed, but the live record was not changed.
- Steam screenshot/recording behavior still needs verification in a packaged Steam-client build; local browser/Electron tests cannot reproduce the full Steam Overlay path.
- The five Ascendant ships that already relied on fallback artwork still produce the existing build warnings.
- The production JavaScript bundle still produces the existing large-chunk warning.

Tiny Foundry
