# Nova Swarm Improvement Track - 2026-07-06

Goal: implement and verify at least 50 new player-facing improvements while keeping rollback simple and preserving Steam/score/leaderboard/achievement safety boundaries.

Expanded 2026-07-06 request: continue toward 100 additional improvements after batch 4, still in small rollback-friendly batches.

Expanded 2026-07-07 request: continue toward 300 total improvements, researching genre competitors and translating useful ideas into safe, focused Nova Swarm improvements.

## Batch 1 - Pilot Orders Loop Clarity

Source target: `codex/main-menu-run-contracts-20260702`

1. Mayhem briefing now surfaces the next active Pilot Order before launch.
2. In-run Pilot Orders start and pause cues now include overall track progress, such as `49/50`.
3. Pilot Orders completion banners and Run Report now show overall track progress, such as `50/50`.

Verification:

- `npm run check:run-contracts`
- Screenshots: `test-results/run-contracts-2026-07-06T16-00-15-473Z/`
- Steam private build: `24076150`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, public branch, or live branch change.
- Rollback should remain a single source commit for this batch.

## Batch 2 - Pilot Orders Review Follow-Through

Source target: `codex/main-menu-run-contracts-20260702`

4. Hangar Career Intel now shows active Pilot Orders with progress inside the review/archive panel.
5. The shared Pilot Orders state now exposes the next queued order after the current active slots.
6. Run Report can show the next queued Pilot Order after reporting completed or progressed orders.

Verification:

- `npm run check:run-contracts`
- Screenshot proof: `test-results/run-contracts-2026-07-06T16-37-26-157Z/`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Generic `develop-web-game` Playwright client was attempted but blocked by the local missing Chromium headless-shell install; repo-native Playwright checks passed with local Chrome.

## Batch 3 - Pilot Orders Readability Meters

Source target: `codex/main-menu-run-contracts-20260702`

7. Main-menu Pilot Orders rows now include visual progress meters in addition to numeric counters.
8. Hangar Career Intel Pilot Orders review now color-codes active, next, and completed order lines.
9. Run Report Pilot Orders summaries now split multi-item summaries across readable lines instead of one dense comma chain.

Verification:

- `npm run check:run-contracts`
- Screenshot proof: `test-results/run-contracts-2026-07-06T16-56-48-857Z/`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Generic `develop-web-game` Playwright client remains blocked by the local missing Chromium headless-shell install; repo-native Playwright checks passed with local Chrome.

## Batch 4 - Pilot Orders Handoff Cues

Source target: `codex/main-menu-run-contracts-20260702`

10. Pilot Orders completion banners now show the next queued order when the track is not finished.
11. Pilot Orders progress banners now include overall track progress and use a safer left-side framed notice.
12. Run Report now reserves a `NEXT` line after non-final Pilot Order completions so follow-up goals are not crowded out.

Verification:

- `npm run check:run-contracts`
- Screenshot proof: `test-results/run-contracts-2026-07-06T17-30-38-648Z/`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- Steam private build: `24077384`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, public branch, or live branch change in the source pass.
- Rollback should remain one source commit for this batch.

## Batch 5 - Pilot Orders Review Path

Source target: `codex/main-menu-run-contracts-20260702`

13. Fresh Pilot Orders now introduce the board as Mayhem tactics training before anything has been cleared.
14. Once any Pilot Order is cleared, the main-menu board and Ship Hangar dock card point players toward the review/archive path.
15. Career Intel now summarizes active, queued, and completed Pilot Orders in the archive header.

Verification:

- `npm run check:run-contracts`
- Screenshot proof: `test-results/run-contracts-2026-07-06T18-13-30-768Z/`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Rollback should remain one source commit for this batch.

## Batch 6 - Pilot Orders Language Consistency

Source target: `codex/main-menu-run-contracts-20260702`

16. Run Report now uses the consistent `PILOT ORDERS` label instead of mixed-case `Pilot orders`.
17. How To Play now frames Pilot Orders as `OPTIONAL MAYHEM DRILLS`, reducing chore/quest-board feel.
18. How To Play now points completed-order review to Ship Hangar Career Intel, matching the actual UI path.

Verification:

- `npm run check:run-contracts`
- Screenshot proof: `test-results/run-contracts-2026-07-06T18-34-57-724Z/`
- `npm run check:how-to-play`
- Screenshot/report proof: `test-results/how-to-play-2026-07-06T18-36-23-663Z/`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Rollback should remain one source commit for this batch.

## Batch 7 - Pilot Orders Archive Clarity

Source target: `codex/main-menu-run-contracts-20260702`

19. Hangar Career Intel now labels the Pilot Orders review panel as `PILOT ORDERS` instead of implying it only contains cleared orders.
20. The archive count now explicitly reads as a completed-order counter, such as `DONE 3/50`.
21. Active and queued archive rows now put progress first, making long review lists faster to scan.

Verification:

- `npm run check:run-contracts`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Rollback should remain one source commit for this batch.

## Batch 8 - Pilot Orders Run Report Cleanup

Source target: `codex/main-menu-run-contracts-20260702`

22. Run Report Pilot Orders rows no longer repeat the section name inside the value text.
23. Pilot Orders track progress now renders as a concise `DONE x/50` line in Run Report.
24. Run Report now carries Pilot Orders track progress as structured data so Game Over owns the visible formatting.

Verification:

- `npm run check:run-contracts`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Rollback should remain one source commit for this batch.

## Batch 9 - Pilot Orders Status Line Consistency

Source target: `codex/main-menu-run-contracts-20260702`

25. Run-start Pilot Orders nudges now use a compact status separator instead of a sentence-like colon.
26. Pause-menu Pilot Orders lines now use the same compact separator for active orders.
27. Pause-menu fallback lines preserve track progress when showing `NEXT` or `COMPLETE`.

Verification:

- `npm run check:run-contracts`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Rollback should remain one source commit for this batch.

## Batch 10 - Pilot Orders Instrument Panel Polish

Source target: `codex/main-menu-run-contracts-20260702`

28. Main-menu Pilot Orders now draws an overall track progress rail under the board header.
29. Active Pilot Orders rows now include quarter-tick marks so long goals read as measurable progress lanes.
30. Hangar Career Intel now numbers completed Pilot Orders for easier review across the full 50-order history.
31. Mayhem briefing Pilot Orders status now uses the same compact `//` separator as run-start and pause cues.

Verification:

- `npm run check:run-contracts`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Rollback should remain one source commit for this batch.

## Batch 11 - Pilot Orders Review Indexing

Source target: `codex/main-menu-run-contracts-20260702`

32. RunContracts display entries now expose their designed catalog position so review UI can reference the finite 50-order path directly.
33. Hangar Career Intel completed-order rows now show catalog slots such as `14/50 DONE`, making sparse completed history easier to understand.
34. The Ship Hangar dock card now says `PILOT ORDERS DONE x/50` once orders have been cleared, making the completed-order review path more obvious from the main menu.

Verification:

- `npm run check:run-contracts`
- Screenshot proof: `test-results/run-contracts-2026-07-06T19-43-57-948Z/`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Rollback should remain one source commit for this batch.

## Batch 12 - Pilot Orders Path Labels

Source target: `codex/main-menu-run-contracts-20260702`

35. RunContracts now exposes a shared `NN/50` order-slot label so every Pilot Orders surface can reference the same finite path.
36. Main-menu active Pilot Orders rows and the Mayhem briefing now show order slots such as `01/50 Graze x10`.
37. In-run Pilot Orders start, progress, completion, next-order, and pause cues now include the active order slot.
38. Run Report Pilot Orders entries now keep completed/progress/next orders structured with slot labels, preserving localization while improving review clarity.
39. Hangar Career Intel active and next Pilot Orders rows now use the same slot labels as completed rows.

Verification:

- `npm run check:run-contracts`
- Screenshot proof: `test-results/run-contracts-2026-07-06T20-10-40-865Z/`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Rollback should remain one source commit for this batch.

## Batch 13 - HUD Combat Readability

Source target: `codex/main-menu-run-contracts-20260702`

40. Last-life HUD state now uses a stronger emergency backing and pulsing heart/text treatment so `LIVES 1` reads as danger, not ordinary status.
41. Spent Shield/Bomb-style powerup rows now get a visible slash and hatch treatment instead of only showing an empty timer/status.
42. The active powerup panel frame/header now reflects spent/empty and expiring states, not only debuffs.
43. Timed powerups under 25% remaining now get an amber expiring row/bar pulse so the player can feel the timer running out.

Verification:

- `npm run check:hud-readability`
- Screenshot proof: `test-results/hud-readability-2026-07-06T20-41-35-317Z/hud-readability.png`
- `npm run check:trait-hud`
- `npm run check:powerup-visuals`
- `npm run check:gameplay-message-overlap`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only HUD patch plus focused browser proof; rollback should remain one source commit for this batch.

## Batch 14 - Combo Mastery Meter

Source target: `codex/main-menu-run-contracts-20260702`

44. The score panel now shows a compact live combo meter once a kill chain is active, making the hidden combo state readable during play.
45. The combo meter includes a remaining-chain progress rail so players can see when the next kill must happen.
46. The combo meter color shifts into an urgent low-time state, giving mastery feedback without changing score formula or combo rules.

Verification:

- `npm run check:hud-readability`
- Screenshot proof: `test-results/hud-readability-2026-07-06T20-57-32-034Z/hud-readability.png`
- `npm run check:trait-hud`
- `npm run check:gameplay-message-overlap`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Uses existing localized `COMBO` text; no new locale strings were added.

## Batch 15 - High-Score Chase Target Feel

Source target: `codex/main-menu-run-contracts-20260702`

47. The high-score chase bar now draws 50%, 75%, and target tick marks so the personal-best chase has visible structure.
48. The high-score chase bar now gets a stronger near-target frame once the player is closing in.
49. Surpassing the high-score target now adds a gold success frame and endcap on the bar, making the beat-the-best moment read faster.
50. The top-left HUD cluster now gives the high-score chase strip a little more breathing room under the rank/score row.

Verification:

- `npm run check:highscore-chase-target`
- Screenshot proof: `test-results/highscore-chase-target-2026-07-06T21-10-37-674Z/highscore-chase-target.png`
- `npm run check:ui-readability`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only high-score chase polish; personal-best lookup and scoring behavior are unchanged.

## Batch 16 - Boss Health Readability

Source target: `codex/main-menu-run-contracts-20260702`

51. Boss-local health bars now include phase/half-health threshold ticks at 75%, 50%, and 40% HP.
52. Boss health fill color now escalates as the boss reaches later health phases.
53. Boss health bars now show a bright current-health leading edge so damage progress is easier to read during effects.
54. Boss health text now has stronger weight/stroke plus a low-health frame treatment for late-fight clarity.

Verification:

- `npm run check:boss-healthbar-readability`
- `npm run check:boss-vfx-clarity`
- `npm run check:boss-animation`
- Screenshot proof: `test-results/boss-animation-2026-07-06T21-19-23-023Z/boss-animation-level10.png`
- `npm run check:boss-telegraph`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`

Safety notes:

- No boss health, damage, phase timing, attack cadence, score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only boss-local health bar polish.

## Batch 17 - Phase Cooldown Readability

Source target: `codex/main-menu-run-contracts-20260702`

55. Phase cooldown now draws a compact recharge ring around the player ship once the active Phase window ends.
56. The Phase recharge ring includes quarter ticks so its cooldown state reads like a cockpit instrument instead of a vague glow.
57. Phase now gives a brief ready flash when the cooldown reaches zero.
58. The cooldown ring hides during active Phase so the active invulnerability ring stays visually dominant.

Verification:

- `npm run check:phase-cooldown-readability`
- Screenshot proof: `test-results/phase-cooldown-readability-2026-07-06T21-32-48-800Z/phase-cooldown-readability.png`
- `npm run check:player-ring-alignment`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No Phase duration, cooldown timing, invulnerability, score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only player feedback polish with a focused browser guard.

## Batch 18 - Powerup Expiry Readability

Source target: `codex/main-menu-run-contracts-20260702`

59. Falling powerups now get a late-life outer warning cue before they leave the playable area.
60. Powerup expiry cues escalate from amber to red as the pickup becomes urgent.
61. Expiring powerups now use segmented countdown ticks so the warning reads without adding text.
62. Urgent expiring pickups use a controlled blink that stays visible instead of fading almost completely out.

Verification:

- `npm run check:powerup-expiry-readability`
- Screenshot proof: `test-results/powerup-expiry-readability-2026-07-06T21-45-37-125Z/powerup-expiry-readability.png`
- `npm run check:powerup-effects`
- `npm run check:powerup-visuals`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No powerup drop rate, lifetime, movement speed, pickup radius, effect, score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only pickup readability polish with a focused browser guard.

## Batch 19 - Enemy Projectile Danger Glints

Source target: `codex/main-menu-run-contracts-20260702`

63. Enemy bullets now carry a small forward danger glint that marks the leading edge of the projectile.
64. The danger glint pulses lightly with the projectile without changing hitboxes, speed, damage, or firing patterns.
65. Generated enemy projectile sprites keep their unframed art treatment while gaining the glint readability cue.
66. `check:projectile-visuals` now asserts that every active enemy bullet in the visual scenarios has the danger glint.

Verification:

- `npm run check:projectile-visuals`
- Screenshot proof: `test-results/projectile-visuals-2026-07-06T21-54-10-199Z/dense_missile_wave.png`
- `npm run check:enemy-weapons`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No enemy bullet hitbox, speed, damage, spawn cadence, behavior, score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only projectile readability polish with existing projectile screenshot coverage.

## Batch 20 - Mission Progress Rail

Source target: `codex/main-menu-run-contracts-20260702`

67. The in-run Mission Status HUD now includes a compact segmented sector-wave progress rail.
68. The rail marks completed waves separately from the current active wave, so it shows run progress without pretending the current wave is already cleared.
69. Active wave segments now pulse with a pressure color based on existing hostiles/threats counts, adding readable pressure feedback without changing spawns or damage.
70. Boss and sector-clear states now fill the mission rail with distinct boss/clear colors, making phase transitions easier to read at a glance.

Verification:

- `npm run check:mission-progress-hud`
- Screenshot proof: `test-results/mission-progress-hud-2026-07-06T22-13-39-424Z/mission-progress-hud.png`

Safety notes:

- No wave count, enemy spawn, boss timing, projectile behavior, score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only HUD instrumentation based on existing wave/hostile/threat state.

## Batch 21 - Enemy Hit Confirmation

Source target: `codex/main-menu-run-contracts-20260702`

71. Surviving enemies now show a brief local impact ring when damaged, making non-lethal hits easier to read.
72. The hit ring scales subtly with enemy size and damage fraction, so larger/thicker targets communicate impact without changing health values.
73. Non-lethal enemy hits now emit a throttled hit spark through the existing particle helper, avoiding unbounded particle spam.
74. `check:enemy-hit-feedback` now proves a real runtime enemy survives a non-lethal hit while showing the ring/spark debug state.

Verification:

- `npm run check:enemy-hit-feedback`
- Screenshot proof: `test-results/enemy-hit-feedback-2026-07-06T22-23-51-397Z/enemy-hit-feedback.png`

Safety notes:

- No enemy health, damage taken, score, XP, leaderboard, achievement API ID, balance, enemy behavior, projectile behavior, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only hit confirmation with per-enemy spark throttling.

## Batch 22 - Powerup Pickup Guidance

Source target: `codex/main-menu-run-contracts-20260702`

75. Nearby powerups now draw small directional pickup chevrons that point toward the player.
76. Pickup chevrons intensify as the player gets closer, making reachable pickups feel more intentional without changing pickup radius.
77. Far-away and already-inside-radius powerups keep the guide hidden, reducing clutter and avoiding redundant arrows.
78. `check:powerup-pickup-guides` now proves nearby/far/inside-radius guide states with browser screenshot evidence.

Verification:

- `npm run check:powerup-pickup-guides`
- Screenshot proof: `test-results/powerup-pickup-guides-2026-07-06T22-31-52-058Z/powerup-pickup-guides.png`

Safety notes:

- No powerup drop rate, movement speed, lifetime, pickup radius, effect, score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only pickup readability cue using existing player/powerup positions.

## Batch 23 - Critical Hull Edge Warning

Source target: `codex/main-menu-run-contracts-20260702`

79. Final-hull gameplay now has a continuous edge-only critical hull overlay so last life feels dangerous beyond the one-time warning toast.
80. The overlay uses red edge bands, warning corner brackets, and a faint inner cockpit frame while keeping the danger zone and center text clear.
81. The warning hides during pause, intro, game-over, overrun interludes, death, and life recovery so it does not imply danger outside active last-life play.
82. `check:critical-hull-overlay` proves active, recovered, paused, and dead states with browser screenshot evidence.

Verification:

- `npm run check:critical-hull-overlay`

Safety notes:

- No life count, damage, invulnerability, enemy behavior, projectile behavior, score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only last-life readability cue drawn on the existing UI overlay.

## Batch 24 - Bonus Drone Intent Readability

Source target: `codex/main-menu-run-contracts-20260702`

83. Shootable ambient bonus drones now carry red target brackets and a compact crosshair so they read as optional score targets.
84. Collectible bonus cores now carry gold/cyan collection halos and inward chevrons so they read as pickups rather than hostile drones.
85. Both bonus drone types now draw short motion streaks, improving movement readability without changing speed, hitboxes, score, or spawn cadence.
86. `check:bonus-drone-clarity` proves hazard and power-core intent states with side-by-side browser screenshot evidence.

Verification:

- `npm run check:bonus-drone-clarity`

Safety notes:

- No bonus drone health, movement speed, score value, spawn cadence, powerup roll, pickup radius, enemy behavior, projectile behavior, score formula, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only intent chrome owned by the `BonusDrone` entity.

## Batch 25 - Enemy Spawn Arrival Cues

Source target: `codex/main-menu-run-contracts-20260702`

87. Newly visible enemies now get a brief local arrival shimmer so fresh threats are easier to spot.
88. The arrival cue uses enemy accent colors plus a subtle cyan sweep, preserving enemy identity while staying non-textual.
89. Delayed-entry enemies reset the cue when they actually appear, so offscreen wait time cannot consume the readable entrance effect.
90. `check:enemy-spawn-cue` proves the cue appears on a real enemy and clears after its short duration.

Verification:

- `npm run check:enemy-spawn-cue`

Safety notes:

- No enemy spawn timing, movement, health, damage, hitboxes, firing cadence, score value, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only enemy-local entrance feedback owned by the `Enemy` entity.

## Batch 26 - Slow Time Chrono Field

Source target: `codex/main-menu-run-contracts-20260702`

91. Slow Time / Chrono Anchor now draws a subtle full-screen chrono field while active.
92. The field combines low-alpha edge tinting with player-centered time rings and sweep ticks so the slowdown reads as a world state.
93. The chrono field hides on pause, intro, game-over, overrun interlude, effect expiry, and transition states.
94. `check:slow-time-visual-field` proves the field appears/hides correctly and reasserts the strong enemy, bullet, and hazard slowdown scales.

Verification:

- `npm run check:slow-time-visual-field`

Safety notes:

- No Slow Time duration, enemy time scale, bullet time scale, hazard time scale, player control, powerup drop rate, score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only chrono overlay drawn on the existing UI overlay.

## Batch 27 - Pause Resume Context Chips

Source target: `codex/main-menu-run-contracts-20260702`

95. The pause command deck now shows four compact resume-context chips instead of only score and sector.
96. Pause now includes the current lives count in the same quick-scan row.
97. Last-life pause state gets urgent lives-chip text styling.
98. Pause now includes the active powerup summary, including compact remaining seconds or charges where available.
99. The pause debug state now exposes lives and powerup values so pause context is covered by automation.
100. `check:pause-context-chips` proves score, sector, lives, active Slow Time, and Pilot Orders are all visible in one paused-run screenshot.

Verification:

- `npm run check:pause-context-chips`

Safety notes:

- No pause input behavior, gameplay timing, powerup duration, life count, score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- UI-only pause overlay context polish using existing run and player state.

## Batch 28 - Rank-Up Evolution Readability

Source target: `codex/main-menu-run-contracts-20260702`

101. Rank-up badges now include a broadcast-burst ring so promotions read as a bigger evolution moment.
102. Rank-up badges now include bottom signal pips to make the promotion card feel more arcade-instrumented and less like a plain toast.
103. The rank icon inside the promotion badge now gets its own rotating halo for quicker visual recognition.
104. Temporary rank boosts now redraw the player aura by boost type: fire-rate, speed, and damage each get different colors and shapes.
105. `check:rank-up-clarity` proves the rank-up badge clarity elements and type-specific damage aura in a browser screenshot.

Verification:

- `npm run check:rank-up-clarity`

Safety notes:

- No XP, rank thresholds, rank boost duration, boost stats, ship stats, score, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Visual-only rank-up and rank-boost readability polish.

## Batch 29 - High-Score Chase HUD Pressure

Source target: `codex/main-menu-run-contracts-20260702`

106. The high-score chase panel now gets a live pulse when the player is close to beating the target.
107. The chase bar now shows 25%, 50%, 75%, and 100% markers for clearer score-hunt pacing.
108. The chase bar now draws a glint at the current progress edge so score movement is easier to read at a glance.
109. Beating the target now adds a stronger gold double-rail state around the panel without changing any score logic.
110. `check:highscore-chase-hud` proves near-target and surpassed HUD states with browser screenshots.

Verification:

- `npm run check:highscore-chase-hud`

Safety notes:

- No score awards, score formula, leaderboard target retrieval, personal-best persistence, rank, XP, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- HUD-only score-pressure polish using the existing high-score chase state.

## Batch 30 - Combo Meter Urgency

Source target: `codex/main-menu-run-contracts-20260702`

111. The combo meter now draws multiplier tier pips so x2/x3/x4 states read visually before the text is parsed.
112. The meter now draws a bright glint at the active timer edge, making combo decay easier to see.
113. Low-time combo state now adds a subtle hatch warning on the trailing side of the meter.
114. Combo debug state now exposes tier pips, glint position, and low-warning status for focused automation.
115. `check:combo-meter-urgency` proves an x3 low-time combo state with browser screenshot evidence.

Verification:

- `npm run check:combo-meter-urgency`

Safety notes:

- No combo window, combo scoring, milestone bonuses, multiplier thresholds, score formula, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- HUD-only combo urgency readability polish using existing combo state.
