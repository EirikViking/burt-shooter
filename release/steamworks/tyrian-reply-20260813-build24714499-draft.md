# Staged reply to Tyrian

Status: staged; not posted

Thank you again, Tyrian. I went through the new recordings and your notes carefully.

> The explosion/static hiss is frequent in Overrun.

I reproduced the sustained high-frequency tail in all three supplied clips. The cause was a long spawn-style sound being reused in the routine enemy-death palette, so dense kills could stack several five-second layers. That sound has been removed from routine deaths; the remaining death sounds are short, bounded effects. The new test build also passed a 64-second packaged performance run at an average of 60.08 FPS with no warnings or errors.

> Overrun completion adds clutter; one simple veteran count would be clearer.

Agreed. The Hangar now shows `TOURS` as the simple ship veteran count. One Tour means a legitimate ten-sector flight in ranked Mayhem, Overrun, or Sector Run. Ranked Bronze, Silver, and Gold mastery medals remain separate, so this does not turn Overrun into ranked mastery.

> I would like to keep a finished Tactical build instead of seeing more Drafts.

Implemented. Tap Pass to skip one Draft as before; hold Pass to lock the current build and disable all later Drafts for that run. The hold progress and permanent consequence are shown directly on the control before it commits.

> I expected the target-wave ships to be impactable.

Those targets were intentionally contact-safe, but the presentation did not communicate that well enough. They now use a full cyan/magenta hologram treatment, and both the HUD and How to Play explicitly say `HOLOGRAM TARGETS // CONTACT SAFE`.

I left Active Time unchanged because, as you clarified, it was not a complaint. I also did not make speculative Tractor or ship-collision changes from the older recording without reproducing a current-build defect.

The full update is now available on the private Steam test branch as BuildID `24714499`. Thank you for the precise evidence and for continuing to push the game toward a better version of itself.

