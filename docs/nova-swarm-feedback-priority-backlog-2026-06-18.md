# Nova Swarm Feedback Priority Backlog - 2026-06-18

Baseline: `b3a0c8cccd0fa204be57a0d10534e3ed03a30ba8` (`codex/build-forward-from-menu-legibility-accepted-20260618`)

Snapshot before edits: `snap/pre-feedback-priority-backlog-20260618`

Working branch: `codex/feedback-priority-backlog-20260618`

Steamworks touched: no. Deploy/upload/SetLive/package work performed: no.

## Executive Summary

The next patch lane should stay focused on player comprehension and late-run fairness, not broad new systems. Steam forum, review, email, and local QA notes all converge on the same theme: players like the score-chase, bosses, unlocks, Codex, and run loop, but still need clearer feedback around display/readability, dodge semantics, boss hazards, Sector Challenge purpose, and late-game deaths.

Several launch-week issues are already fixed or accepted, including menu/focus accidental quit paths, powerup visibility, scrollbar dragging, first readability passes, the extra-achievement request, sector Codex expansion, and the accepted menu legibility milestone. Those should stay marked done so the next patch does not churn solved surfaces.

Recommended next public-facing patch: a "readability and late-run trust" patch with 3 to 5 narrow changes: GUI/list scaling, dodge/help clarity, late-game chain-death investigation, sector-practice leaderboard/explanation, and display/window options planning.

## Sources Checked

- Steam Community hub and forum index for Nova Swarm, AppID `4765070`.
- Steam forum: Bug Reports, Feedback & Suggestions, Sector Challenges, Known Issues, French Localization, Weird, and current community hub excerpts.
- Steam reviews/top-rated review page and store page language/feature claims.
- Gmail search for `("Nova Swarm" OR "Tiny Foundry" OR "4765070") -in:spam -in:trash newer_than:60d`.
- Gmail threads/notices: Gaming Gods dodge/difficulty follow-up, Gaming Gods balancing follow-up, Mental Health Gaming coverage link, and Jim player feedback thread.
- Local docs: accepted menu legibility milestone, difficulty QA review, project health report, sector Codex asset audit, leaderboard clarity note, and recent Steam patch notes.

## P0 - Next Patch Must Address

### 1. Late-game chain deaths and Gravity Comedian / sector 19-21 fairness

- Category: bugs, balance, UX/readability
- Evidence/source: Gmail self-notes from 2026-06-18 record public Steam follow-ups about sector 19-21, roughly 160k-168k score, Gravity Comedian around sector 21, rapid life-wipe after respawn, and missiles returning from behind. Earlier QA already flagged boss life attrition and boss overlap as the primary run killer in `docs/DIFFICULTY_QA_REVIEW.md`.
- Player impact: high. Deep players are hitting the most valuable retention surface and reporting deaths that may feel unreadable or not recoverable.
- Likely fix area: `src/entities/Boss.js`, `src/scenes/PlayScene.js`, `src/config/BalanceConfig.js`, respawn/invulnerability handling, missile return/homing behavior, late boss roster entry for Gravity Comedian.
- Risk: medium-high. Broad nerfs could flatten the high-skill loop or invalidate leaderboard feel.
- Recommended next action: reproduce with a seeded/debug late-sector route, capture damage-source logs/video, then tune the smallest specific issue: respawn grace, missile turn/return readability, Gravity Comedian cadence, or hazard overlap. Keep ranked rules unchanged until proven.

### 2. Dodge still reads like "nothing happened" for some players

- Category: UX/readability, onboarding, balance
- Evidence/source: Steam Bug Reports and Sector Challenges posts describe Shift/Dodge as greying the ship without moving or avoiding the boss grid. Gmail follow-up clarifies Dodge is currently invulnerability, not a thrust dash. Memory-backed prior code read says the input layer recognizes both Shift keys, while the gameplay trigger previously used only `ShiftLeft`.
- Player impact: high. If Dodge is misunderstood, boss hazards feel impossible even when the mechanic is technically active.
- Likely fix area: input helper, `Player.update()`, How To Play/controls text, dodge VFX/audio, boss hazard tutorial copy.
- Risk: medium. Changing Dodge from invulnerability to motion dash would be a design change; explaining/binding it is lower risk.
- Recommended next action: implement or verify symmetric Shift handling, add a player-facing "short invulnerability, not movement dash" explanation, and add a tiny boss-danger practice prompt or challenge hint. Decide separately whether a thrust-away mechanic belongs in a later feature patch.

### 3. GUI/list readability on large displays and leaderboard lists

- Category: UX/readability, Steam/page/community issues
- Evidence/source: Steam Feedback & Suggestions reports small UI on ultrawide/4K, requests GUI scaling, and asks for larger text plus scrolling rather than squeezing everything into one window. Gmail from Jim independently says leaderboard lists/placements should be larger and easier to read. The accepted menu legibility milestone is done, but it does not close global UI/list scaling.
- Player impact: high. Multiple players with different contexts report readability strain, especially for lists, Codex, HUD/help text, and leaderboards.
- Likely fix area: shared Pixi UI layout constants, leaderboard scene, Codex/list rows, settings/options, responsive font sizing.
- Risk: medium. UI scaling can cause clipping/localization regressions and needs screenshot QA.
- Recommended next action: add a conservative "Large UI/List Text" setting or targeted leaderboard/Codex list scale pass, then run `check:i18n-ui`, UI layout checks, and visual screenshots for 1080p, ultrawide/4K-like, and smaller windows.

## P1 - High Value, Next 1-2 Patches

### 4. Display/window/resolution options

- Category: UX/readability, performance, Steam/page/community issues
- Evidence/source: Steam Feedback & Suggestions asks whether the game can only be played fullscreen with no resolution options; another player repeats resolution support as an issue.
- Player impact: medium-high. Display inflexibility hurts streamers, multi-monitor players, accessibility, and Steam Deck/windowed workflows.
- Likely fix area: Electron window settings, Settings scene, persisted preferences, fullscreen/windowed behavior, Steam overlay behavior.
- Risk: medium-high. Window/fullscreen changes can regress focus, controller flow, and Steam overlay.
- Recommended next action: design a minimal display-options slice: windowed/fullscreen toggle, resolution/window scale if technically safe, and exact regression tests for focus-loss auto-pause and controller navigation.

### 5. Sector Challenges need stronger explanation and maybe separate leaderboards

- Category: onboarding, content requests, Steam/page/community issues
- Evidence/source: Steam Sector Challenges thread asks what benefits Sector 5/10/15 challenges provide, whether they are training, why leaderboard shuts off, and whether a separate leaderboard stat system should exist. Developer reply says practice leaderboards are in the works.
- Player impact: medium-high for engaged players. Practice modes are valuable, but confusion can make them feel unrewarding or broken.
- Likely fix area: Sector Start menu copy, result screen, leaderboard model, Steam leaderboard identities if new boards are approved.
- Risk: high if Steam leaderboard identities change; low for explanatory UI. Steamworks settings must remain untouched unless explicitly approved.
- Recommended next action: first improve in-game explanation and result messaging without changing Steamworks. Treat separate Sector Challenge leaderboards as a scoped feature requiring explicit leaderboard-ID policy and Steamworks approval.

### 6. Boss attack clarity after current fixes

- Category: bugs, UX/readability, balance
- Evidence/source: Steam review by VALIS says one boss style, especially large beam/fakeout attacks, still needs tuning despite improvements. Forum feedback also calls out boss #4 chunky movement, warning cones, hit clarity, and tractor/scan clarity.
- Player impact: medium-high. Reviews are positive but repeatedly mention boss clarity as the remaining rough edge.
- Likely fix area: boss telegraphs, hazard timing, boss movement interpolation, warning labels/cones, boss-specific QA.
- Risk: medium. Boss identity is praised, so this should be readability tuning, not broad simplification.
- Recommended next action: create a boss-readability matrix for the top complained-about archetypes: beam/fakeout/grid/scan/Gravity Comedian. Use video and automation evidence before tuning.

### 7. Onboarding/tutorial and pickup/HUD explanation

- Category: onboarding, UX/readability
- Evidence/source: Steam Feedback & Suggestions says new players are thrown in, one initially thought the game was mouse-controlled, asks for HUD/control explanations, target practice, a small boss encounter, and clearer pickup explanations. Another player asks whether there is a menu for pickups and what they do.
- Player impact: medium. This reduces early confusion and improves conversion from first run to repeat runs.
- Likely fix area: How To Play, tutorial/practice mode, Threat Codex/powerup Codex, pause/help overlay.
- Risk: medium. New text must go through i18n and all locale files.
- Recommended next action: do not build a full tutorial first. Add a compact "First Run Brief" and pickup/controls help page, then evaluate whether a training boss mode is still needed.

### 8. Early waves can feel too easy / not enough dodge prep

- Category: balance, onboarding
- Evidence/source: Steam Feedback & Suggestions says first waves are simple and enemies barely move; local `docs/DIFFICULTY_QA_REVIEW.md` independently says normal enemies die quickly and may not teach dodge rhythm before boss pressure.
- Player impact: medium. The first boss may feel like a sudden skill spike because earlier waves do not teach enough movement pressure.
- Likely fix area: early curated waves, enemy movement/cadence, tutorial prompts.
- Risk: medium-high. Prior local QA says a small early speed/fire buff caused no-debug playtest deaths in normal level 2 waves.
- Recommended next action: avoid broad global buffs. Add one or two readable early pattern-teaching moments or practice prompts, then test no-debug level 1-3 survival.

## P2 - Backlog / Design Decisions

### 9. Long-term progression: upgrades, collectibles, permanent ship boosts

- Category: content requests, balance
- Evidence/source: Steam Sector Challenges asks about collectables, upgrades, ship boosts, shields, weapons, and permanent improvements. Developer reply frames this as a larger design topic because Nova Swarm is currently ship unlocks, score chasing, and mastery.
- Player impact: medium. Strong appetite from grinders, but not essential for the next stability/readability patch.
- Likely fix area: progression model, profile save, balance policy, UI, Steam achievements.
- Risk: high. Permanent power can damage leaderboard trust and change the arcade identity.
- Recommended next action: keep as a design RFC, not a quick patch. If pursued, separate ranked arcade from meta-upgraded modes or keep upgrades cosmetic/practice-only.

### 10. Trading cards

- Category: Steam/page/community issues, content requests
- Evidence/source: Steam review lists no trading cards as the only explicit negative besides a boss attack; forum player asks for trading cards. Developer reply notes trading cards are a separate Steamworks decision.
- Player impact: medium-low for gameplay, medium for Steam store/community appeal.
- Likely fix area: Steamworks/store metadata and asset preparation.
- Risk: medium due to Steamworks/public metadata dependency.
- Recommended next action: defer until after gameplay patch. Requires explicit approval before any Steamworks metadata action.

### 11. Additional modes: Practice Run, Fatal Error, Light Jump, Arcade Mode

- Category: content requests, onboarding, balance
- Evidence/source: Steam Feedback & Suggestions proposes replayable bosses/practice, one-life hardcore, timed score-goal mode, and bottom-screen arcade mode.
- Player impact: medium. Practice has direct onboarding value; the others are content expansions.
- Likely fix area: mode selection, run mode policy, scoring/leaderboard isolation, UI/localization.
- Risk: high if modes share scoreboards or ranked progression.
- Recommended next action: split Practice/Boss Replay from the more speculative modes. Practice supports current pain; Fatal Error/Light Jump/Arcade Mode should wait.

### 12. French localization offer

- Category: onboarding, Steam/page/community issues
- Evidence/source: Steam French Localization thread includes a translator offering to help; developer reply says localization should wait until the text workflow is clean.
- Player impact: medium-low short term, potentially higher for reach.
- Likely fix area: `src/i18n/`, localization QA workflow, Steam language settings.
- Risk: high if rushed. `AGENTS.md` requires all player-facing text through i18n and human QA before Steam language claims.
- Recommended next action: do not start French until core text settles after readability/onboarding patch. Keep contact warm.

### 13. Audio/music polish

- Category: content requests, UX/readability
- Evidence/source: Steam top review says sound effects are nice and music is "so-so"; other reviews praise energetic soundtrack.
- Player impact: low-medium. Not a consensus blocker.
- Likely fix area: music variety, mix, settings.
- Risk: low-medium, but by-ear QA is required.
- Recommended next action: defer unless more reviews repeat it.

## Done / Accepted / Already Addressed

- Accepted menu legibility milestone: `release/milestones/nova_swarm_menu_legibility_accepted_20260618.md` marks the cinematic hangar menu, dock icon safe-area, Sector Challenge text containment, compact exit, checkpoint starts, Threat Codex unread marker, Prism Splitter/powerup visuals, Steam bridge, and leaderboard identity as accepted.
- Menu accidental quit / Leaderboard Back path: Steam Weird thread says the fix landed in development and the player later reported the issue had calmed down.
- Multi-monitor focus-loss auto-pause: same Steam thread and local notes mark this as implemented.
- Powerup visibility: Steam Feedback & Suggestions follow-up says stronger halos/sparkles/readability were implemented.
- Extra-life cadence: Steam follow-up says hearts are still rare but no longer feel mythical.
- Leaderboard invisible/control-character names: Steam follow-up says leaderboard names were hardened.
- Draggable scrollbars in Achievements and Threat Codex: Steam Bug Reports says the issue should be fixed in the live build and the player confirmed it helped.
- Sector Codex 12/12 and repeated sector art: local sector asset audit and 2026-06-17 patch notes say Codex sector entries now expand and use unique sector signal art.
- Achievement/challenge expansion: Steam forum follow-up and patch notes say 81 achievements are live, including ultra-hard legendary goals.
- Boss voice setting: 2026-06-15 patch notes say Boss Voices can be disabled separately in Settings.

## Bugs

- P0: Late-game chain deaths / Gravity Comedian sector 19-21.
- P0/P1: Dodge feedback may be technically active but still reads as non-functional.
- P1: Boss fakeout/beam/grid/hazard clarity still not fully trusted by at least one reviewer/player.
- Done: Leaderboard Back accidental quit, focus-loss auto-pause, scrollbar dragging, invisible leaderboard names.

## UX / Readability

- P0: GUI/list scaling, especially leaderboard, Codex, help/HUD, 4K/ultrawide.
- P0/P1: Dodge and boss-danger semantics.
- P1: Display/window/resolution options.
- Done: accepted menu legibility milestone, powerup visibility, sector Codex art/count readability.

## Onboarding

- P1: First-run controls/HUD/pickup explanation.
- P1/P2: Boss/practice teaching route.
- P1: Sector Challenges explanation.
- P2: French/localization workflow after text stabilizes.

## Balance

- P0: Late-run chain-death and respawn fairness.
- P1: Boss clarity and late boss-specific tuning.
- P1: Early waves need to teach more without becoming level-2 attrition.
- P2: Permanent upgrades require ranked-mode policy before implementation.

## Performance

- P1: Display/window settings should include focus and overlay regression coverage.
- Done/monitor: 2026-06-17 notes say sector asset prewarming and wave construction chunking reduced transition hitches.
- Open: no new player-sourced hard performance complaint found in the checked sources.

## Content Requests

- P1/P2: Practice/boss replay mode.
- P2: Permanent ship upgrades/collectibles.
- P2: Fatal Error, Light Jump, and bottom-screen Arcade modes.
- P2: Trading cards.
- Done: more Steam achievements/challenges.

## Steam / Page / Community Issues

- P1: Sector Challenge leaderboard messaging and possible separate leaderboard policy.
- P2: Trading cards require explicit Steamworks decision.
- P2: French localization contact should be preserved but not rushed.
- Done: Steam store page currently lists 81 achievements and interface-only support for non-English languages; no Steamworks metadata was changed in this task.

## Recommended Next Patch Plan

1. Build a late-run fairness investigation harness for sector 19-21 / Gravity Comedian and capture damage-source evidence before any tuning.
2. Ship a small Dodge clarity/accessibility pass: symmetric Shift verification, clearer How To Play copy, and a visible invulnerability-window explanation.
3. Add a targeted Large UI/List Text pass for leaderboard, Codex/list rows, and help text, with screenshot QA at common and large-display sizes.
4. Improve Sector Challenge explanation in the menu/result flow without changing Steam leaderboard identities yet.
5. Write the scoped display-options plan and only implement it after focus-loss, Steam overlay, and controller-flow risks are mapped.

## Open Questions

- Can the 2026-06-18 Gaming Gods Steam thread be opened directly in a signed-in browser to capture the full player posts, not only Gmail mirrors of replies?
- Does the current accepted branch already contain symmetric Right Shift dodge behavior, or does it still need a tiny input helper patch?
- Is Gravity Comedian a single boss/archetype issue, a late-sector scaling issue, or a respawn protection issue?
- Should Sector Challenge leaderboards be Steam global boards, local-only records, or unranked practice history?
- Is a UI scaling setting preferred over targeted larger leaderboard/Codex/help text?
- Should display options include true resolution selection, borderless/windowed toggle only, or a simpler scale/window mode first?

## Sources Not Fully Checked

- Signed-in Steam admin/community moderation surfaces were not used.
- Direct Steam thread page for the newest `Gaming Gods...` topic did not surface through public web search during this pass; Gmail mirrors of the posted replies were checked instead.
- Mental Health Gaming coverage was identified from Gmail, but the external article/podcast page content was not analyzed for gameplay criticism in this pass.
- No private Discord, analytics, crash reports, or Steamworks backend data were checked.
