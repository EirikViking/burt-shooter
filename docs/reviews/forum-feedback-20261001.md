# Forum feedback review — September 24–October 1, 2026

## Audit and scope

Repository: `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`.
Branch: `codex/sector-leaderboard-unknown-20260928`; baseline/HEAD: `7e8325e3d9abb09357636bca7e994c0227be02d6`.
The initial 51 tracked modifications and 85 untracked paths matched HANDOFF. Fetch/status/branch/log/worktree checks and inherited diffs were inspected before editing. No upstream or matching origin branch exists. The user's explicit preserve-dirty-work instruction governs this continuation; no tidy baseline was obtained by resetting, cleaning, stashing, pulling, committing or switching branches/worktrees.

Reviewed all 27 General topic listings and 61 event listings; Trading had none. Read the five threads with recent activity and their surrounding context:

- [Bugs](https://steamcommunity.com/app/4765070/discussions/0/569288155749142073/)
- [Feedback](https://steamcommunity.com/app/4765070/discussions/0/569288155749142195/)
- [Direction](https://steamcommunity.com/app/4765070/discussions/0/562542339336405303/)
- [Convoy event](https://steamcommunity.com/app/4765070/eventcomments/591816596100704155/)
- [Onslaught event](https://steamcommunity.com/app/4765070/eventcomments/591816302688051374/)

Read the complete 18.218667-second convoy clip, preserving the local source and an inspected contact sheet under `E:\Codex\builds\nova-swarm\forum-feedback-20261001\reported-clip`.

## Implemented

The reported convoy retreat/reappearance had three concrete causes. Ordinary reinforcement warnings retired the transport hull; reversing a partly completed retreat used inconsistent position/alpha progress; freeing both locks after departure began changed the duration and moved the transport back into the arena.

`ArcadeFirstLightDirector` now distinguishes headline warnings from ordinary combat warnings. Ordinary warnings keep the hull present while freezing its clock, attacks, support, damage and clearing its owned bullets. Existing headline storms, bosses and incompatible spectacles retain their priority. `ArcadeFirstLightVisual` shares continuous presence progress across approach/retreat/resume, and preserves completed exit progress when a late rescue gives the fighters their normal departure window. Locks remain untargetable until the hull is fully present. Exactly two escorts still launch through normal ownership and lifecycle rules.

The director, visual and notification harness were changed; a focused continuity harness was added. Health, rescue rewards, callback eligibility, scoring formulas and encounter durations were preserved. Geometry and timing of targeting opportunities changed, so competitive opportunity is not claimed identical. No leaderboard compensation or reset was added.

## Existing repairs verified

- Controller focus and backing out of/reopening the Onslaught loadout picker.
- Career attention reflects mission information rather than routine XP/runs.
- Achievement scroll follows visible row order.
- Phase/respawn contact no longer instantly kills snake segments.
- Vector Boost and Vampire Drain remain restored to their existing random pools.
- Steam and offline profiles remain separate, with existing player progress preserved.

The earlier forum explanation about Quasar eligibility was inconsistent. The staged response clarifies that the first five mechanical hull IDs qualify; initially available Quasar ID07 is not an Onslaught starter. No ship eligibility was silently altered.

## Deferred decisions

Defense-start balance, Phase Wake/Reactor start combinations, Quasar spread and drone-cash audio need separate comparative playtesting. No hidden assistance based on low health/poor score, altered ranked start fusion, profile merge or global scoring change was introduced. Reports without a reproduced new fault remain acknowledged in drafts, without invented fixes.

## Verified evidence

`check-first-light-continuity.mjs`: 50 actual-module/renderer groups, including all ten visual variants, reversing partial transitions, bounded late rescue, ordinary warnings freezing HP/score/clock and clearing owned bullets, and genuine storm retreat. Red evidence reproduced the original discontinuities before repair. The notification harness now honors E: output and checks actual inherited Cabinet/showcase geometry rather than obsolete layout constants; five resolution fixtures passed. Cabinet product behavior was unchanged by that harness repair.

The forum candidate passed full build/release-line, i18n/eight-locale UI, Steam bridge, isolated browser smoke, controller flow, encounter/Onslaught ownership and policy checks, and prior forum regressions. One concurrent smoke startup timed out; an isolated repeat passed at the unchanged timeout. The current combined visual/audio candidate has its own final verification recorded in `visual-life-20261001.md`.

## Replies and publication

Five quoted replies are stored under `docs/steam/drafts/20261001-*-reply.txt` and were filled into the actual authenticated Steam comment composers. Each textarea value was checked against its source file. **Post Comment was never pressed.** See `20261001-review-index.md`; closing/reloading those tabs can discard Steam's unsent text. The local text files are the durable copies.

Evidence: `E:\Codex\builds\nova-swarm\forum-feedback-20261001\evidence\steam-drafts\staged.json` and `bugs.jpg`. No community post, store/media edit, Steamworks settings change or player-data reset was performed.

Final refresh: four original drafts became visible as published TinyFoundry comments during this task (Direction11:18, Feedback11:19, Onslaught11:19, Convoy11:50). This agent did not publish or edit them. They add no new player-reported fault. Preserved their original reply files and avoided staging duplicate replies. Three final unposted composers now contain the bug reply and short Convoy/Direction delivery updates, matching source files exactly; `staged-final.json` / `bugs-final.jpg` record them. Public/default remains unchanged. Authorized test upload is BuildID25650189; the two delivery updates correct the earlier published "not uploaded" wording.

## Local reproduction

Use process-local E: TEMP/TMP/cache/output settings shown in the visual-life report. Start the source server on port4932; then:

```powershell
$env:CHECK_URL='http://127.0.0.1:4932'
$env:CHECK_OUTPUT_DIR='E:\Codex\builds\nova-swarm\visual-life\evidence\continuity'
node scripts/check-first-light-continuity.mjs
```

The combined task source-only rollback review command is in the visual-life report. It preserves inherited dirty work; never reset HEAD. Human review should confirm hull continuity during reinforcements, a late double-lock rescue, and normal rescue/payback recognition on repeated sightings.
