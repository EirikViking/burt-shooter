# Nova Swarm Tiny Foundry Forum Reply - 2026-07-16

Status: complete draft, not posted.

Target thread:

`https://steamcommunity.com/app/4765070/discussions/0/569288155749142195/`

The text below is ready to post after explicit approval. It deliberately describes the work as being prepared for the next build because no package was uploaded and no public or test Steam branch was changed during this takeover.

## Ready-to-post reply

Thank you again for taking the time to write all of this up and for continuing to test the rough edges. We went back through the full thread point by point and completed a local verification pass for the next build. That build is not live yet, so I do not want to imply that these fixes are already in your copy.

Here is the honest status:

- Upgrade pool / skipping: we kept the third Overdrive stack at 30% effectiveness, the two permanent bans, Hold, and Rescan. We did not add a generic Skip button or a score reward for skipping. In the current scoring architecture that could create another mandatory leaderboard optimization and make an irreversible non-choice look strategic when it is not. Sector 5's score route is now guaranteed and presented as a distinct `NOW OR NEVER` decision that cannot be held, banned, or offered again. Graze Break's counterstrike is also roughly three times larger and much more sparkly while keeping its mechanics unchanged.

- Duplicate achievements: the achievement screen now destroys old rendered rows before rebuilding, deduplicates by stable achievement ID, and exposes integrity diagnostics. Fresh, existing, locked, unlocked, reopened, offline, and Steam-sync cases are covered. The catalog currently resolves to 81 unique achievements with no duplicate IDs.

- Duplicate or unexplained pickups: pickup creation now has one centralized owner, unique spawn IDs, optional logical event keys, bounded spawn history, and duplicate-event blocking. Legitimate multi-reward bundles are preserved. We could not reproduce a second independent Ghost Mode drop after these guards were added.

- Timers during messages, pause, or focus loss: temporary combat effects now use the playable gameplay clock rather than blindly consuming wall-clock time. Mandatory sector introductions, Tactical Drafts, pause, and other suspended-control states no longer spend Point Defense, Bomb feedback, Row Core, or the audited temporary-effect windows.

- Bombs: Bomb charges remain stored until fired, have an arming delay and visible charge rail, and autofire now waits for a useful target lane instead of dumping charges beneath the ship at wave start. Bombs can intentionally detonate on direct enemy or boss impact.

- Panic Engine beam: boss-hazard visuals and damage state now share centralized expiry and cleanup. We verified normal expiry, boss defeat, respawn, retry/transition cleanup, and scene destruction. A harmless orange wall should no longer remain looking dangerous.

- Point Defense: it now autonomously intercepts hostile projectiles inside the visible ring, gives impact feedback, uses the playable clock, and has explicit expiration/cleanup. It was also tested through refresh, pause, focus loss, death, scene transitions, and projectile-heavy play. The large ring should no longer persist for the rest of the run.

- Hangar: newly unlocked and never-launched ships retain a `FIRST FLIGHT` marker until that ship actually launches. Previewing, selecting, hovering, or opening the Hangar does not clear it. The combat readout now shows the ship's local launch count, and the persistent Hangar state keeps unlock information recoverable after alt-tab or focus loss.

- Combo and score visibility: we verified the existing placement rather than moving it blindly. Combo urgency, score popups, personal-best notices, special-enemy signals, and the score lane remain separated in desktop, compact, localized, and dense-combat checks.

- Small freezes / stuck shots: projectile ownership and cleanup are now centralized. Player and enemy bullets are detached, deactivated, pooled, compacted, pruned, or destroyed through one lifecycle, including cap rejection and scene cleanup. Stress checks found no orphaned projectile render objects, and the heavy projectile pass stayed below 30 ms at p99 in the measured scenario.

- Railbreaker sound: Railbreaker now uses a shorter, softer dedicated shot, lower authored volume, and a 145 ms request cadence instead of the old dense heavy-shot overlap. An eight-second firing test reduced projected overlap from seven simultaneous clips to two and reduced the effective peak by about 5 dB without making the weapon inaudible.

- Special-enemy notices: the largest warnings were moved toward transparent edge-aligned signals with shorter occupation of the combat field. Compact and dense-combat layouts were checked so the signal does not sit on top of the HUD or the player.

- Special-enemy presence: elites now have a clearly visible entrance state, a brief entrance-only damage guard, stronger threat arcs/pips, and a short post-entry firing delay. The rule is visible rather than hidden invulnerability, and normal combat health is unchanged after entry.

- Pure/Tactical leaderboard placement: the underlying fallback was unsafe because missing or unknown mode values could silently normalize to Pure. Run identity, reports, submission eligibility, pending submissions, and Pure/Tactical routing now fail closed for unknown or invalid modes. The existing live record still needs a production-data decision: we do not have an unambiguous player/run identity or a supported per-entry Steam deletion/move path, so we did not guess or edit live data. A documented correction procedure is ready if the account and run can be proven.

- Sector 5 score route: Combo Anchor now arrives as a dedicated `NOW OR NEVER` score-route card with unique framing, focus, explanatory text, and one-time behavior. It cannot be held or banned, and passing it closes that route for the run.

Your newer notes:

- Point Defense should now be much clearer in motion because the interceptions happen automatically inside the ring and the effect expires visibly.
- Bombs are allowed to hit bosses; that is intentional, but they should no longer be wasted before a useful target exists.
- We confirmed that the game menu does not claim Steam's F12 key. We could not fully reproduce the Steam recording/screenshot failure in the local non-Steam test environment, so that part still needs a packaged Steam-client check. If it still fails in the next build, the most useful details would be whether the Steam Overlay opens, whether F12 works in another game in the same session, and whether the failure affects screenshots, recording, or both.

We also corrected run-report mode labels, made Mayhem Tactical the unmistakable primary/default mode, simplified the Daily Challenge explanation, extended the personal-best celebration through the result transition, preserved the full Longship “row, row, row” chant under repeated/high-load activation, and replaced `Top Of The Swarm` with `Swarm Elite` for an accepted ranked score of 750,000 or more.

Thank you for being specific about what felt confusing, intrusive, or unfair. That level of detail made it possible to fix the systems instead of just polishing around the symptoms.

Tiny Foundry
