# Astra V5 — feedback and presentation decisions

Reviewed 6 September 2026: all four negative store reviews returned by Steam, all 24 General Discussion topics visible in the authenticated forum, the nine-page Feedback thread, three-page Bug Reports thread, both Weird Stuff pages, and the four-page Events index and its nonempty comment threads. Collapsed deleted comments were not restored. No public replies, reactions or store edits were made. Review data is retained in `test-results/astra-v5-research/negative-reviews.json`.

## Changes supported by the feedback

| Concern | Judgment and action |
| --- | --- |
| Recycled hulls and numbered names | Agree. 227 distinct new illustrated hulls now cover the generated fleet. 1,780 enemy display names and 111 support names are unique; stable IDs, stats and discovery records are preserved. Families still have variants; thousands of individually modeled ships would add cost and memory without proportional readability. |
| Flat or indistinguishable collection art | Agree. Codex uses detailed matching dossiers and all 40 actual rank badges. Support dossiers now take precedence over generic hull fallback. |
| Bonus drones lack personality | Agree. Twelve designs distinguish hostile, collectible and companion roles, with readable role-colored framing. Hitboxes and rewards are unchanged. |
| Boss warning line obscures the hull | Agree; an actual Pixi path defect connected successive arcs. Explicit arc starts remove the chords. Radius, progress and release timing are unchanged. See [Feedback page 6](https://steamcommunity.com/app/4765070/discussions/0/569288155749142195/?ctp=6). |
| Combat presentations cover the action | Agree. Pilot Order completion now occupies the side of the combat view, keeping its text/reward and full display duration. |
| Menu needs a stronger identity | Agree. Animated Blender service tugs and controlled gantry light give the dock activity; the detailed flagship retains drag rotation and restrained idle motion. Menu re-entry releases owned graphics resources. |
| Early play feels slow or offers too little agency | Agree with the problem. The preceding V4 already supplies three starters, an earlier first boss and a stronger initial Tactical choice. Existing Overrun gives access to advanced combat. Preserve these rather than add another progression system. |
| Stutter and long-run black screens | Treat as engineering issues, not art complaints. V5 fixes owned menu/drone resource lifetimes; matched packaged performance is measured separately. The [September Pure-run crash report](https://steamcommunity.com/app/4765070/discussions/0/583932755647362492/) is **not reproduced or declared fixed**. A 20-minute Sector-7 soak cannot represent a 400k-score late run. |

The [giveaway feedback](https://steamcommunity.com/app/4765070/eventcomments/570415959124261834/?ctp=2) also reports poor couch readability at 4K and difficulty engaging bosses. Desktop 720p/1080p and 800×600 UI checks do not establish 4K-TV accessibility. This remains a human hardware QA item. Other players disagree with that boss assessment and value the later game; avoid blanket difficulty changes based on one account.

## Choices deliberately retained

Keep the game's humor and audio personality, Pure and Tactical identities, released score boards, and current input mechanics. Several historic reports (input latching, draft statistics, pickup behavior, opening access) already have subsequent fixes; old comments alone do not prove a current regression. Do not add permanent stat grind, arbitrarily increase difficulty, migrate engines, or abandon the game merely because a commenter suggests it. V5 makes no claim that art changes have already increased retention or sales.

The [shared advice](https://chatgpt.com/s/cx_6a9c3ec7cea88191b7ae08d279a7c889) favors immediate agency, an early boss, a quiet HUD and gameplay in the first ten seconds of a trailer. Its historical sales/refund figures are not treated as current verified analytics. The current Steam description still describes one starting ship; propose correcting that with the eventual approved store update, not silently editing the page now.

## Comparable games and media

[Nova Drift](https://store.steampowered.com/app/858210/Nova_Drift/) suggests the value of visible build identity and experimentation. [ZeroRanger](https://store.steampowered.com/app/809020/ZeroRanger/) demonstrates a constrained, recognizable visual language. These are design inferences from their official descriptions, not evidence that copying a mechanic will improve Nova Swarm's sales.

Follow [Steam trailer guidance](https://partner.steamgames.com/doc/store/trailer): gameplay first, understandable without sound, the actual player perspective and HUD, 16:9 1080p video. Follow [screenshot guidance](https://partner.steamgames.com/doc/store/assets/standard): genuine gameplay captures, no concept art presented as gameplay, at least five representative images. New footage is recorded from the packaged game using normal combat rules and an explicitly automated keyboard pilot. It is not a human playtest or a fabricated performance. Store publication awaits the user's media approval.
