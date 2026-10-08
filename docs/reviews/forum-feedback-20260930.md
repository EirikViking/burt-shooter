# Latest forum feedback — local implementation and reply review

Reviewed live September 30, 2026. Nothing posted, uploaded or deployed. Four quoted Steam-format replies are staged as local text files under `docs/steam/drafts/20260930-*`; [review index](../steam/drafts/20260930-review-index.md) links their exact destinations. Drafts consistently describe unreleased work and make no release-date promises.

## Repository and preservation

- Source: `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`, verified existing non-junction worktree.
- Branch: `codex/sector-leaderboard-unknown-20260928`; baseline/HEAD: `7e8325e3d9abb09357636bca7e994c0227be02d6`. No upstream; origin has no branch of this name. Fetch succeeded for audit, without pull or integration.
- Read AGENTS, HANDOFF, current development/review notes, recent fixes and September 28 patch context before editing. The prior Cinder Molt/Convoy Payback increment was already dirty and was preserved. Nine affected files were recorded byte-for-byte before this pass; rollback is against that dirty state, not Git HEAD.
- Existing `dist` points into `E:\Codex\builds\nova-swarm\arcade-onslaught-repair\source-dist`; existing `node_modules` points into the shared D: forum workspace. Neither was rebuilt, installed into or relocated.
- No source-directory, branch or worktree switch; no reset, clean, stash, commit, push, player-data reset, Steamworks setting change or publication.

## Feedback coverage

Enumerated all 27 General threads and all 61 announcement threads, including both announcement listing pages at 50/page. Latest activity is September 29 in General, September 28 in announcements. Other threads show older activity than the previous September 27 review. Read all newer feedback plus preceding replies needed for context:

| Source | Reviewed subjects |
| --- | --- |
| [Feedback & Suggestions, posts 151–154](https://steamcommunity.com/app/4765070/discussions/0/569288155749142195/?ctp=11) and preceding page | Phase deletes mother/segments, defensive-upgrade usefulness, missing pickups, Phase starter pool; Graze Break confirmation |
| [Bug Reports, posts 35–38](https://steamcommunity.com/app/4765070/discussions/0/569288155749142073/?ctp=3) | Offline/Steam settings clarification, achievement scrolling, XP-triggered Career attention, invisible controller focus and cancelled-launch lock |
| [What should I focus on next?, post 5](https://steamcommunity.com/app/4765070/discussions/0/562542339336405303/) | Preserve movement/bullet play, weapon references, passing-convoy opportunity, positive swarm/Veilborn feedback |
| [Convoy announcement, post 1](https://steamcommunity.com/app/4765070/eventcomments/591816596100704155/) | Repeated wave entrances, static convoy/rival, Serpent Duel/Onslaught achievement confirmation |
| [Onslaught announcement, through post 12](https://steamcommunity.com/app/4765070/eventcomments/591816302688051374/) | Career attention repeated; Small Wings interpretation and Quasar spread context |

Inspected both [pickup screenshot 1](https://steamcommunity.com/sharedfiles/filedetails/?id=3784529691) and [pickup screenshot 2](https://steamcommunity.com/sharedfiles/filedetails/?id=3784529255). Weapon-reference games/guide are suggestions to examine, not claimed research or copied designs. Previous September 27 replies were already published by the user; this batch does not republish them. Quotes are short verified excerpts, at most 25 words per source thread across its draft.

## Actions and evidence

| Change | Root cause and bounded fix |
| --- | --- |
| Snake Phase/protected contact | Generic ram contact set a segment inactive without health accounting. Ignore protected mother/baby contact. Explicit Pulse/Rift damage paths remain available. Baseline runtime deleted all eight active sections with unchanged HP; candidate preserved active count, HP, lives and score. |
| Hangar cancellation/rejection | `startGame` returning false retained `launchInProgress`; Hangar also consumed Escape before the picker. Unlock on false/rejection and route picker keyboard input to the picker. Actual B, inner-chooser Escape, dialog Escape and Start reopening pass. |
| Controller focus | Programmatic/gamepad focus did not reliably match `:focus-visible`. Use a restrained explicit `:focus` outline; hover only changes background. Final screenshot has one focused slot outline. |
| Achievement layout | Column-first viewport ordering moved the same achievements between columns as scrolling advanced. Render row order, align scroll offsets/dragging to rows, update directional navigation. Includes one-column and odd-count final-row checks. Earned state/IDs unchanged. |
| Career attention | Signature included XP, runs, score/rank/discoveries. Compare active/completed mission IDs; ordinary progress and XP do not blink. Existing signature is acknowledged once on migration; profile-scoped storage and acknowledgement remain. No unlock/save merge. |
| Convoy/rival continuity | Ordinary briefings suspended the same unfinished encounter, replaying exits/entrances. Keep hull presentation through ordinary briefings, freeze combat age/health, retain owned-projectile clearing/recharge safety, block shot/bomb interception during breaks. Incompatible major threats still suspend. Actual director/renderer preserved hull pose, health and resume state; cleared its hostile bullet and suspended for a snake. |
| Missing pickups | Vector Boost and Vampire Drain had catalogue/effect/collection entries but no normal random-drop route. Restore them to existing standard/combat pools. Actual selection method now reaches every catalogue type; category probability and drop caps unchanged. |

Changed existing files: `src/scenes/PlayScene.js`, `src/scenes/ShipSelectScene.js`, `src/scenes/AchievementsScene.js`, `src/ui/OnslaughtLoadoutPicker.js`, `src/progression/CareerSignalState.js`, `src/game/ArcadeFirstLight.js`, `src/managers/ArcadeFirstLightDirector.js`, `src/managers/PowerupManager.js`, `scripts/check-personal-best-career.cjs`. Added two `scripts/check-forum-feedback-20260930*.mjs` regressions, this report and five draft/index files; appended HANDOFF and progress. Earlier encounter files remain intentionally uncommitted.

## Deferred decisions / comparability

- Do not change ranked Onslaught's three-augment starting pool to enable Rift Reprisal without opening-build comparisons and contract work. Sector 51, zero starting score, Pure/Tactical eligibility, leaderboard identifiers and achievement rules remain intact.
- Defensive-upgrade activation/Point Defense interaction needs a real earned opportunity experiment. No duration inflation or low-health adaptive assistance was added.
- Quasar/weapon-family rebalance and more deliberate convoy travel/timing require separate interaction playtests. No equipment framework or major new encounter system.
- Offline and Steam-account namespaces remain separate; cross-account merging can transfer another player's unlocks. No persistent data alteration or cloud identity change.
- Graze Break softening was already in September 28 (`89e08d1`) and confirmed by the player. No extra speculative flash change; confirmed achievement/display fixes were preserved.
- Restoring two pickups changes relative selection within their pools and therefore builds/scoring opportunity. Removing the Phase-contact exploit changes snake outcomes. Briefing continuity grants no additional combat time, attacks or rewards. No global scoring compensation or leaderboard reset. Prior encounter-increment opportunity changes are recorded separately in its report.

## Verification

- Before fixes: new pure regression groups failed; renderer baseline reported all three original groups failing (eight snake sections deleted, launch lock retained, column-first layout). Baseline failure JSON retained.
- Final candidate: five pure groups and four actual renderer groups pass, no page errors. Forced encounter runtime uses existing DEV/loopback prototype isolation with progression/submission permissions disabled.
- Existing personal-best/Career suite: 13 pass; First Light core and six regressions pass; encounter evolution pure and nine real-renderer groups pass; Onslaught v1/v2 contract and Steam Electron bridge pass.
- `npm run check:i18n`: pass; no new player-facing sentences or untranslated game text in this pass. German/top3 localization and marketing hotkeys verified by the required checks.
- Full `npm run build:current` including prerequisites: pass to task-owned E output. Final incremental Vite compilation also passed after the last transition-safety guard. Existing large-chunk warning remains.
- `npm run check:i18n-ui`: eight locales pass, no placeholder/English-leak hits, console/page errors. Inspected final controller focus and achievement layout, plus representative German Settings and Chinese gameplay captures. Complete locale screenshot set retained.
- `npm run check:controller-flow`: pass on production preview. `npm run smoke`: pass with zero console/page/network errors on isolated rerun. Initial concurrent run timed out starting its second game page at the menu; do not treat the first failed attempt as a pass.
- `git -c core.whitespace=cr-at-eol diff --check`: pass; forum-only rollback reverse-check: pass, not applied.
- Physical controller feel, player-side Steam/offline account switching, natural pickup frequency and first/third encounter enjoyment remain human checks. These tests do not establish fun. No new full shipping-client performance benchmark in this forum pass; prior encounter frame-tail controls remain in its report.

## Local reproduction

From the existing source directory (E paths are real task-owned directories, not source junction targets):

```powershell
$env:TEMP='E:\Codex\tmp\forum-feedback-20260930'
$env:TMP=$env:TEMP
$env:npm_config_cache='E:\dev-cache\npm'
$env:NOVA_SWARM_VITE_CACHE_DIR='E:\dev-cache\vite\nova-forum-feedback-20260930'
New-Item -ItemType Directory -Force -Path $env:TEMP,$env:NOVA_SWARM_VITE_CACHE_DIR | Out-Null
node scripts/check-forum-feedback-20260930.mjs
node scripts/check-personal-best-career.cjs
npm run build:current -- --outDir E:/Codex/builds/nova-swarm/forum-feedback-20260930/current --emptyOutDir
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4897 --strictPort
```

In a second shell with the same E temp/cache settings:

```powershell
$env:CHECK_URL='http://127.0.0.1:4897'
$env:CHECK_OUTPUT_DIR='E:\Codex\builds\nova-swarm\forum-feedback-20260930\candidate'
node scripts/check-forum-feedback-runtime-20260930.mjs
```

For production UI: `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4898 --strictPort --outDir E:/Codex/builds/nova-swarm/forum-feedback-20260930/current`. Set `I18N_UI_URL`, `SMOKE_URL` and `CHECK_URL` to `http://127.0.0.1:4898`, and their corresponding output variables to task-owned E subdirectories before running their npm checks. Browser checks use disposable automation profiles, not the player's native profile.

Current retained static build: `E:\Codex\builds\nova-swarm\forum-feedback-20260930\current`, final asset `index-DklpRu7n.js`. Build label remains `v2026-09-28_15-18-56` at unchanged dirty HEAD; identify this candidate using `source-state.json`, not that older label alone. This is not a Steam package/release.

Rollback review: `git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/forum-feedback-20260930/rollback.patch`. After explicit rollback authorization and a fresh passing check, use the same command without `--check`. It restores the nine pre-forum files and removes only the two new tests. Documentation/history are excluded; preserve earlier encounter changes. No rollback was executed.

Native smoke passed against the final production bundle in task-owned E staging with an explicit fresh profile. API/preload boot and rejected Steam score/achievement probes confirm isolation. No console errors. The first staging attempt failed because a forward-slash absolute override did not match the native resolver's backslash containment check; correcting only the disposable staging override to `path.resolve(...)` fixed it. Shipping Electron source is unchanged. Dependencies were read through the shared D node_modules path, not patched/installed. This is a boot check, not a Steam-client install or physical-controller playtest.

## Final cleanup / retained output

Stopped both task-owned Vite servers; browser/native test processes exited. Active task inventory showed this source task as the only active Codex task in the relevant workspace. Verified exact E paths, no nested reparse points, no owned active process and the final HTML reference before cleanup. Automatic approval review rejected the removal command with `blocked by policy` before execution. No removal occurred and no alternate API/method was used to bypass it.

Retain the current build, unique baseline/candidate regression evidence, locale/controller/browser/native evidence, `source-state.json` and forum-only `rollback.patch`. Prior encounter/current packaged deliverables and shared caches remain untouched. Disposable paths still present because removal was rejected:

- `E:\Codex\tmp\forum-feedback-20260930` (task staging, test profiles, logs, source snapshot and compile cache)
- `E:\dev-cache\vite\nova-forum-feedback-20260930`
- `E:\Codex\builds\nova-swarm\forum-feedback-20260930\current\assets\index-DE3U-e6f.js`
- `E:\Codex\builds\nova-swarm\forum-feedback-20260930\current\assets\index-CQfN8ZtG.js`
- `E:\Codex\builds\nova-swarm\forum-feedback-20260930\smoke\failure-1.png`
- `E:\Codex\builds\nova-swarm\forum-feedback-20260930\smoke\failure-2.png`
- `E:\Codex\builds\nova-swarm\forum-feedback-20260930\smoke\failure-state.json`

Final free-space recheck and unchanged Git state are recorded in HANDOFF. Cleanup is incomplete; no publication/release is authorized by this report.
