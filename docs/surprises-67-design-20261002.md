# Nova Swarm: 67 playable surprises

## Brief and status

The user rejected the submarine/whale/tool planet decorations and requested 67 convoy-like gameplay surprises with strong visual and sound production. Earlier design decisions were explicitly delegated to the agent. This document records those decisions; it is **a production specification, not evidence that the encounters are implemented**. The ongoing development goal remains active. Remove the rejected decorative layer immediately, preserving the finished planets and combat.

Success: a player can identify what arrived, choose a target or route, observe a physical consequence, and make a different decision on a third sighting. Each catalog entry below requires a distinct interaction/sequence and trace. Recolours, names, more HP, random overlapping enemies, notifications and decorative prop motion do not count as additional encounters.

## Existing equivalents and integration

- Existing FirstLightModel/ArcadeFirstLightDirector/ArcadeFirstLightVisual own Convoy Breakout and Rival Strike, targeting, finite service/departure, part damage, once-only bonus drone and rescued-wing Payback. Extend this contact flow; do not add an independent spawn director.
- MysteryPart/EncounterComponent already provide owner-bound parts; CombatWrecks, SerpentMolt, AuthoredEnvironment and Wreckweaver implement specific cover/rebuild/relay interactions. Reuse their rules where relevant. Existing encounters are not counted toward the new 67.
- Existing EncounterPacing is seeded and run-local. New contacts share mechanic-family anti-repeat and recovery. They do not overlap new headline content, boss introductions, mysteries, snake Molt, challenges, or timed reinforcement warnings. Old intentional combinations remain intact.
- Preserve all existing work in the current checkout and branch; serial execution only. No commits, resets, worktrees or Git publication. Build, staging, profiles, caches and outputs stay on E:.

## Content and scheduling contract

One new contact at a time; maximum six interactive components and two friendly fighters. Movement, Focus, Phase, autofire and pause remain responsive. Every damaging weapon uses hostile projectile art, a warning lead-in and normal damage rules. No harmless character miniature is promoted to a combat target. No forced death, refill, invulnerability cinematic, player-data reset or persistent quest schema.

Earned actions and consequences stay within the run. Rewards replace budgeted opportunities; there is no automatic extra score/drop/XP per component. Repaired/rebuilt parts cannot repay active-damage credit. Ally fire retains ownership and cannot satisfy player-only achievement conditions. Covers absorb friendly and hostile shots consistently, never collide with the player, and expire independently of wave completion.

Use eligible ordinary-wave contact opportunities through the existing director. First new introduction uses the earliest safe opening after the existing first convoy/rival; do not conceal the library behind Sector 51. Measure opportunity frequency and combat-time gaps before choosing intervals. Initial maximum contact duration 12–18 playable seconds, one contact per eligible sector and at least 15 ordinary combat seconds after departure are hypotheses to test, not fixed spawn percentages. Paused/draft/focus-loss/stalled time does not earn opportunities. Sector 51 starts keep zero score and the selected level-one augments, with their existing leaderboard. No Tactical content enters Pure.

A shuffled, seeded run-local library avoids immediate entry and family repeats; failed art admission does not consume an encounter. Cosmetic/audio choice consumes no gameplay RNG. Reproduction records the seed plus relevant state, inputs, simulation timing, selection/skip reason, duration, outcome, reward delta and cleanup. Keep opt-in logs bounded and out of the combat HUD.

## The 67 new contacts

Names are provisional proper names. Player instructions and cues must be complete in all eight locales. Each row is a gameplay brief, requiring its own trace, timing and component layout; rows are not yet available in the game.

| # | Contact | Readable decision and consequence |
|---:|---|---|
| 1 | Twin Jailers | Two captives travel on separate hulls; choose the first rescue lane. Breaking its clamp releases a fighter that pressures the other jailer's gun. |
| 2 | Crossed Chains | Captive pods cross behind two locks; shooting the exposed tether stops that pod's crossing and opens a predictable rescue lane. |
| 3 | Prisoner Exchange | Two haulers attempt to hand off one pod; disabling a transfer relay interrupts the handoff, while destroying the carrying gun first gives a longer rescue window. |
| 4 | Last Shuttle | A departing rescue shuttle has one armed pursuer; cut the pursuer's propulsion or its gun to determine where the return fire stops. |
| 5 | Convoy Split | A transport forks into two physical halves sharing its original budget; choose the half carrying the hostage or silence the other half's covering gun first. |
| 6 | Shielded Evacuation | Two shield projectors protect a captive transport; disabling one opens its matching lock, while both projectors leave a temporary moving shelter. |
| 7 | Stolen Callsign | A hostile mimic flies beside a real captive craft; the mimic visibly charges a red weapon. Expose its emitter before freeing the genuine fighter. |
| 8 | Rescue Tow | A disabled friendly fighter is tethered to an enemy tug; cut the tow to free it, or stop the tug's weapon first for a quieter extraction. |
| 9 | Armour Freight | A hauler carries two armor containers; release a container as moving cover, or destroy it to reopen the lane beneath the hauler. |
| 10 | Rolling Bulkhead | A cargo drum rolls across the upper field after its clamp breaks; choose a rolling shelter or a clear lane by shooting its exposed hub. |
| 11 | Split Cargo | A carrier opens two bays sequentially; disable the hinge to keep the second cover plate attached, or release both while preserving a central lane. |
| 12 | Shield Shipment | Two shielding pods protect different enemy escorts; sever a pod link to turn it into neutral cover, then decide which firing lane to reopen. |
| 13 | Empty Freighter | A visibly empty hold conceals a gun on the carrier's rear; break the rotating hinge to lock the gun's direction, or destroy the emitter directly. |
| 14 | Reactor Tow | A tug tows a hot reactor; disconnect it before the marked discharge or destroy its vent to make the discharge harmless. No unmarked screen clear or new score. |
| 15 | Cargo Carousel | Three freight mounts rotate around a central hub; removing one stops the carousel and exposes a lane, while hub-first causes a finite scatter into harmless cover. |
| 16 | Salvage Sled | An armed sled collects real ordinary wrecks; interrupt its scoop before rebuilding or destroy the rebuilt gun, with no regenerated reward/credit. |
| 17 | Relay Crossing | Two crossing gunships power each other; shoot the visible cable endpoint nearest your lane to silence the opposite gun, or attack a gun through its normal armor. |
| 18 | Battery Swap | A depleted cannon trades batteries with a second hull; interrupt the transfer relay to stop the loaded cannon, or destroy the battery's exposed mount. |
| 19 | Blind Broadside | An armored hull has a rotating side cannon; hitting its steering servo freezes the broadside and makes a stable attack lane. |
| 20 | Folded Battery | A gun platform physically unfolds from a cargo bay; destroy the hinge during deployment or use the opened center to hit the generator afterward. |
| 21 | Counterweight | Two guns share a swinging mount; destroying a gun tilts the remaining gun's warning/firing direction. Destroy the pivot for simultaneous disable. |
| 22 | Cable Ferry | A small gunship rides a visible cable between two pylons; cut a pylon to stop travel, or exploit its exposed transit position. |
| 23 | Rotating Bulwark | A shield vane alternates protection between two gun sockets; shoot the uncovered socket or stop the vane's motor to hold the current opening. |
| 24 | Emergency Rewire | A craft attempts one bounded reroute after losing its first relay; a visible cable is shootable during rerouting, while the hull remains damageable. |
| 25 | Interceptor Escort | A carrier launches a single interceptor to protect an exposed bay; disable the launch arm early or shoot the interceptor while opening the bay. |
| 26 | Spent Missile Train | Three visibly empty missile cars precede an armed engine; detach a car as projectile shelter or silence the engine to end the owner's shots. |
| 27 | Decoy Tug | A tug tows a false armored bow; sever the joint to expose the tug, or destroy the decoy's marked weak hub instead. |
| 28 | Pursuit Reversal | A pursuer fires backward until its stabilizer breaks; breaking it turns the craft and changes the next clearly warned firing lane. |
| 29 | Boarding Skiff | A skiff physically approaches a convoy docking arm; destroy the arm to prevent boarding or free the fighter that interrupts the skiff. |
| 30 | Sentry Capsule | A capsule opens once to deploy a gun; shoot its visible latch during opening or attack the deployed emitter. Its HP/reward budget is shared. |
| 31 | Masked Wing | An escort leaves the carrier's silhouette as its gun begins charging; target the charging emitter or the carrier's exposed power socket. |
| 32 | Returning Harpoon | A gun fires one tethered projectile along a marked route; destroy the winch to end its return attack, or move outside the return lane and shoot the gun. |
| 33 | Vent Corridor | Two hull vents alternate pressure volleys and create a clear central corridor; destroy one vent to widen that side, or attack the center during vent recovery. |
| 34 | Mine Tender | A tender deploys two armed mines with visible arming timers; interrupt the release racks or shoot individual mines. No contact trap or unbounded chain reaction. |
| 35 | Beam Lattice | Two emitters form a warned, finite crossing beam; destroy either endpoint to break that beam, leaving the other gun's ordinary fire. |
| 36 | Scrambler Convoy | A projector shields only its owner's two gun targets; shoot the exposed antenna to restore normal vulnerability. It never changes controls or hides hostile shots. |
| 37 | Pulse Reservoir | A reservoir stores visibly incoming hostile energy; destroy the vent to cancel its marked release, or attack the gun controlling the charge. |
| 38 | Shutter Wall | Three shutters on one hull open in a visible sequence; stop the timing motor to preserve an opening, or hit each briefly exposed gun. |
| 39 | Wake Gates | A passing hull leaves two finite projectile barriers; destroy their marked anchors to reopen chosen lanes. Player motion/contact is unaffected. |
| 40 | Fuse Runner | A fuse burns along a visible hull cable toward an armed turret; break the cable before arming or attack the turret through normal damage after it arms. |
| 41 | Repair Escort | A hostile repair craft restores a linked gun once, within the initial HP budget; destroy the repair arm or silence the gun before the connection completes. |
| 42 | Patchwork Hauler | One missing armor panel is carried by a drone; shoot the docking clamp to deny reattachment, or use the gap before docking. No health refill or duplicate credit. |
| 43 | Coolant Courier | Two coolant tanks suppress a visibly overheating gun; puncturing one changes the next warned attack into a shorter vent cycle, exposing its core. |
| 44 | Salvage Auction | Two hostile salvagers compete for one real wreck; choose which claim tether to sever, leaving one bounded reconstruction attempt and no recursive wreck yields. |
| 45 | Exhaust Collector | A collector trails an exposed intake behind a gunship; break the intake to remove its power supply or destroy the gun while it is fed. |
| 46 | Broken Compass | A craft's damaged steering thruster exposes alternating sockets; destroy the working thruster to stop its sweep, or time shots through the current exposed socket. |
| 47 | Spare Barrel | A carrier carries a single replacement barrel; cut its rack to prevent a gun swap, or destroy the active barrel and hit the exposed mount during the swap. |
| 48 | Leaking Foundry | A foundry hull sheds two physical panels as its gun overheats; preserve them as cover or destroy them for firing lanes. Gun heat/health are finite, not another bar. |
| 49 | Rival Salute | A rival wing exposes a charging gun while its partner shields it; disabling the partner's shield socket opens the gun, or attack it through reduced normal armor. |
| 50 | Crossfire Duel | Two rivals face each other before turning toward the player; destroy a steering socket to lock that rival's direction and break the later crossfire. |
| 51 | Hollow Crown | A rival's outer crown is an armored frame around an exposed generator; break a frame mount to swing it away or aim through the existing gap. |
| 52 | Gunboat Feint | A gunboat retracts one visible gun before deploying another from the opposite side; shoot the deployment hinge to prevent the swap or commit to the original gun. |
| 53 | Twin-Core Rival | Two visible core sockets share one health budget and alternately conduct power; stop a relay to hold the current socket open, or time shots between them. |
| 54 | Shield Debt | A rival borrows shields from a small escort; breaking the visible link returns that escort to ordinary vulnerability and exposes the rival's gun. |
| 55 | Overloaded Guard | A rival's shield arm catches hostile fire from its own escort; destroy the escort to stop charging or vent the shield arm before its warned pulse. |
| 56 | Disarmed Challenger | After both guns break, a rival attempts a clearly marked retreat rather than a fake kill; hit its exposed core now or let it leave, without another reward/source. |
| 57 | Wing Extraction | A friendly pair crosses a hostile gunship's retreat lane; disable the interception gun or the carrier engine to create different escape openings. |
| 58 | Beacon Under Tow | A hostile tug carries a friendly beacon; cut the tow to move the beacon out of fire, then disable the gun attempting to recapture it. |
| 59 | Surveyors' Return | Previously rescued survey craft return only if their earlier extraction succeeded; their finite marked beam exposes one shield relay, with bounded ally ownership. |
| 60 | Freight Guard Mutiny | Breaking an exposed command antenna causes one guard to fire a capped burst at its owner's side gun and depart. It cannot kill the core or award scripted achievements. |
| 61 | Docking Escape | Two friendly craft are stuck on a docking ring; destroy one ring hinge to swing it out of a marked gun lane and free the craft on that side. |
| 62 | Signal Courier | A friendly courier carries an exposed jamming device targeted by an enemy; destroy the enemy's tracking antenna or its gun. Earned disable changes later contact pressure once. |
| 63 | Abandoned Arsenal | A wrecked transport retains two powered guns linked to a reactor; destroy the reactor link or each gun, leaving finite nonhazardous wreck cover without kill farming. |
| 64 | Silent Guardian | A damaged friendly shield craft is held by an enemy clamp; release it to create a brief moving shelter, or disable the enemy's side gun before release. |
| 65 | Jailbreak Interception | After both independent mechanics pass compatibility QA, combine transfer rescue with one boarding skiff under one shared contact budget; choose rescue or interruption first. |
| 66 | Freight Reclamation | After independent armor freight and reassembly QA, an enemy attempts to reclaim one real cover container; sever its claim before it becomes a gun. Both owners share credit. |
| 67 | Squadron Payback | An earned run-local callback to an actual earlier rescue: the same recognizable pilots interrupt a twin relay exchange, opening one attack route once, then depart. No forced rival or adaptive rescue. |

## Visual and audio production gates

Use coherent spacecraft material, scale, engines and lighting matching the current polished hulls. Contact silhouettes need to communicate transport, exposed clamp, powered relay, shield and gun before text. At least one unique authored layout and animation sequence per entry, with identifiable component state changes. Reuse prewarmed material textures and finite effect pools; no 67 huge texture atlases loaded synchronously in combat. Check at 720p/1080p/ultrawide and supported mobile layouts, low Flash, Reduced Motion, voices off and supported languages.

ElevenLabs is authorized for recorded arrival/lock/release/relay/weapon/exit cues; inspect current quota before paid generation and tell the user if exhausted. Produce short, mastered families first and reserve distinguishable warnings. Do not claim new audio until files, finite samples, mastering receipts, runtime mix/priority/RNG checks and listening are verified. No unimplemented subtitle claim. AAA+ is the visual/audio direction, not a certification from tests.

## Acceptance and delivery

Each contact needs eligibility/admission, damage ownership, exactly-once kill/reward/progression, pause/draft/focus, death/retry, simultaneous destruction, expiry and recovery tests. Exercise real weak, broad/slow, precision, burst/Ghost, drone, Chain, piercing, beam and bomb builds. Strong builds may legitimately skip/shorten a transformation. Run seeded opportunity surveys plus natural input captures; inspect actual screenshots/footage and human first/third sightings. Compare matched baseline/candidate frame-time tails, startup, teardown and memory.

Current release work is prop removal + reproduced backdrop race + the previous verified optimization. It does not include any of rows 1–67. Future milestones must report exact implemented rows and leave the remaining rows explicitly pending. Six-hour private test uploads are conditional on verified improvements and all release gates; never publish incomplete claims or promote public/settings/forum/email.
