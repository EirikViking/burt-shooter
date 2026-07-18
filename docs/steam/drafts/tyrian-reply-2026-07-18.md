# Direct reply to Tyrian

Status: ready to post, not posted.

Target thread:

`https://steamcommunity.com/app/4765070/discussions/0/569288155749142195/?ctp=5#c577173259728047030`

## Reply

Tyrian, thank you again for taking the time to give us concrete examples. We treated your follow-up as a focused development pass, reproduced the reported behavior, and uploaded the resulting build to Steam. It is currently staged privately, so I do not want to claim that every change is already live in your copy.

Here is what changed directly from your feedback:

- Dodge Pulse now resolves when the phase ends instead of when the dodge begins. That preserves the invulnerable graze window, and a Dodge Pulse ship paired with Phase Wake now gets a modest combined benefit instead of making one choice feel wasted. Rift Reprisal shards are preserved.
- We reproduced the Double Shot problem with a permanent four-shot Tactical build. The timed pickup could reduce it instead of helping. It now goes from four shots to five while active and restores exactly to four on expiry.
- Focus Lens still gives its focused-damage bonus, but Focus now also tightens shot spread by 25%. This gives narrow, standard, and naturally wide weapons a real precision option without adding another Draft card.
- The game no longer follows a life loss with a sarcastic compliment or celebratory wave-clear quip. Necessary clear information, score, progression, and boss/sector transitions still happen normally.
- The Tractor/Hijacker can now participate in Chain Lightning as both a source and a target. Its ordinary-hit and lightning-hit feedback are clearer, and its health bar has been moved into a safer HUD lane.
- Tactical offers now surface an eligible missing Fusion partner before crowding the Draft with a third stack. Unseen valid choices also take priority over Stack III, while Doctrines remain descriptive and never lock a build out of future offers.

The Steam screenshot and Game Recording capture fix is included from the current build line and was left intact during this pass.

We did not sneak in a Bomb-control redesign. We documented the two serious options—player-triggered stored charges versus context-aware automatic deployment—but that needs a separate decision and testing pass. Screen-edge wrapping was also left unchanged.

None of this changes score formulas, leaderboard identities or stored scores, achievement IDs, unlock requirements, save data, or Steam Cloud paths.

Your feedback was specific enough that we could turn it into reproducible cases and permanent automated checks rather than guesses. That was genuinely useful. Thank you.

Tiny Foundry
