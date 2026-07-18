# Nova Swarm Patch Notes: Better Dodges, Builds & Tactical Choices

Status: publish-ready draft, not posted.

Matching Steam upload: private/unassigned BuildID `24274142`.

## Steam post copy

Hi pilots,

This is a focused feedback patch built directly from recent player testing. It makes dodge builds less self-defeating, prevents Double Shot from becoming a downgrade, adds a tighter firing option, and improves several moments where the game was technically working but communicating the wrong thing.

### What changed

- **Dodge Pulse now fires at phase exit.** The invulnerable dodge and graze window stays intact, while Dodge Pulse and Phase Wake now combine into one bounded clear instead of competing with each other. Rift Reprisal still creates shards from eligible Phase Wake clears.
- **Double Shot always adds firepower.** The timed pickup now adds one shot to the current permanent build instead of replacing it. A four-shot build becomes five shots while active, then returns exactly to four when it expires.
- **Focus Lens now tightens spread.** Holding Focus keeps the existing focused-damage bonus and also narrows the current ship's firing spread by 25%, without changing projectile count or unfocused firing.
- **No celebratory sarcasm after losing a life.** Positive wave-clear compliments and celebratory quips are suppressed when a life was lost during that wave or immediately beforehand. Score, progression, and clear-state information are unchanged.
- **The Tractor joins Chain Lightning.** An active Tractor/Hijacker can now be a Chain Lightning source or target, with clearer ordinary-hit and lightning-hit feedback and a more readable health bar.
- **Tactical offers respect build direction.** Eligible Fusion-completing choices and unseen valid augments are prioritized ahead of third stacks. Run Doctrines remain descriptive only and never restrict future offers.

The Steam screenshot and Game Recording capture fix from the current build line is included unchanged.

Score formulas, leaderboard identities and stored scores, achievement IDs and requirements, save data, Steam Cloud paths, and Steamworks settings were not changed.

Special thanks to Tyrian for the detailed testing and concrete examples. The swarm gets better when feedback gives us something precise to reproduce.

Tiny Foundry

## Publication guard

- The text is final and has matching packaged-build evidence.
- BuildID `24274142` is currently private and unassigned because its upload VDF used `SetLive ""`.
- Before publishing this note as a live update, verify that this exact BuildID has been assigned to the intended player-facing branch.
- Do not imply that the Bomb-control redesign or screen-edge wrapping shipped; neither is part of this build.
