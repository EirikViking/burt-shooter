# Nova Swarm complete release candidate: pre-integration snapshot

Status: immutable source snapshot recorded before functional edits
Timestamp: `2026-07-17T12:29:03.3803257+02:00`
Repository: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
Dedicated worktree: `C:\tmp\nova-swarm-complete-release-candidate-20260717`
Dedicated branch: `codex/complete-release-candidate-20260717`
Integration-base HEAD: `564cf1758eadd1f6e6f82aa1bd3d531e6c8c45e6` (`improve player comprehension and cabinet wonders`)
Working tree before this evidence file: clean
`git diff --check` before this evidence file: pass

## Required preflight

The repository-root `AGENTS.md` was read completely. `git fetch --all --prune`
completed successfully. The required status, branch, HEAD, diff, and worktree
commands were run separately before the dedicated worktree was created and
again inside it:

- `git rev-parse --show-toplevel`
- `git status --short --untracked-files=all`
- `git branch --show-current`
- `git log -1 --oneline`
- `git diff --check`
- `git worktree list --porcelain`
- `git branch --all --verbose --no-abbrev`
- `git tag --list`
- `git stash list`

Repository inventory at snapshot time:

- 64 worktrees, including this dedicated candidate
- 405 local and remote branch refs
- 86 tags
- 24 preserved stashes
- 71 commits in the selected first-parent/content delta from the July 13
  content baseline through the integration base
- no active-agent or process ownership conflict in the dedicated worktree

The dirty reference worktree and every other existing worktree remain
untouched. Two long-running Git processes were verified as legitimate detached
`git fsmonitor--daemon` processes and were not terminated.

## Proven July 13 content baseline

The strongest available mapping for the officially published July 13 patch-note
content is:

- patch title: `Nova Swarm Patch Notes: Aces, Nemesis Protocols & Rival Wings`
- Steam update/BuildID: `24178758`
- source commit: `b4ee0e38e6d6a592508e25af246dc98ddf551de3`
- build stamp: `v2026-07-13_08-29-30`
- evidence: `release/steamworks/steam_upload_evidence_rival_wings_10000_20260713_24178758.json`
- patch-note source: `docs/steam/patch-notes-2026-07-13-aces-nemesis-rival-wings.md`
- external update mapping: `https://steamdb.info/patchnotes/24178758/`

This proves the patch-note content boundary. It does not prove that this exact
source state was public/default at publication; the July 13 evidence explicitly
records assignment to the private test branch. The baseline is an ancestor of
the selected integration base.

## Steam state before integration

Steam was queried read-only through `SteamCMD app_info_update 1` plus
`app_info_print 4765070`. The query log is preserved outside the working tree at
`C:\tmp\nova-swarm-release-evidence-20260717\steam-app-info-preintegration.log`.

- AppID: `4765070`
- depot: `4765071`
- public/default BuildID: `24245709`
- public/default depot manifest: `4910553840876218469`
- public/default depot size: `947329012` bytes
- `sector-continue-test` BuildID: `24249013`
- `sector-continue-test` depot manifest: `7112821787605154596`
- `sector-continue-test` depot size: `957755104` bytes
- locally selected Steam branch: `sector-continue-test`
- locally installed BuildID: `24249013`
- local install root: `E:\SteamLibrary\steamapps\common\Nova Swarm`

No Steam upload, branch assignment, Steamworks edit, or public/default mutation
occurred during preflight.

## Worktree snapshot

The complete porcelain listing was reviewed. Active worktree paths, HEADs, and
branches are grouped below; detached audit worktrees are listed explicitly.

### Current July integration line

| Worktree | HEAD | Branch/state |
|---|---|---|
| `C:\tmp\nova-swarm-complete-release-candidate-20260717` | `564cf17` | `codex/complete-release-candidate-20260717` |
| `C:\tmp\nova-swarm-comprehension-surprises-20260717` | `564cf17` | `codex/comprehension-surprises-patchnotes-20260717` |
| `C:\tmp\nova-swarm-competition-inspired-20260716` | `fd5d9f7` | `codex/competition-inspired-three-20260716` |
| `C:\tmp\nova-swarm-player-feedback-reliability-20260716` | `f796248` | `codex/player-feedback-reliability-20260716` |
| `C:\tmp\nova-swarm-takeover-20260716` | `f116b71` | `codex/sensory-overhaul-20260716` |
| `D:\vibe-coding-e\nova-swarm-sector-continue-prototype` | `a7e6c95` | `codex/preserve-all-improvements-20260714`, dirty reference only |
| nested takeover worktree under the reference folder | `724e3b7` | `codex/takeover-completion-20260716`, locked/initializing and not touched |

### July feature and audit worktrees

| Worktree suffix | HEAD | Branch/state |
|---|---|---|
| `nova-swarm-all-improvements-20260714` | `18ff77e` | `codex/all-improvements-20260714` |
| `nova-swarm-augment-tray-20260711` | `13a0ff3` | `codex/tactical-augment-tray-20260711` |
| `nova-swarm-automation-audit-20260716` | `bc20ea1` | `codex/automation-audit-20260716` |
| `nova-swarm-boss-support-heal-caps-20260702` | `5c5a908` | `codex/boss-support-heal-caps-20260702` |
| `nova-swarm-competition-research-20260715` | `127de13` | `codex/competition-research-20260715` |
| `nova-swarm-competition-retention-20260716` | `724e3b7` | `codex/competition-retention-20260716` |
| `nova-swarm-daily-cabinet-20260715` | `e7208cc` | `codex/daily-flight-log-20260715` |
| `nova-swarm-daily-share-card-20260715` | `b660a20` | `codex/daily-signal-share-card-20260715` |
| `nova-swarm-enemy-bullet-vfx-20260715` | `4882d10` | `codex/enemy-bullet-vfx-20260715` |
| `nova-swarm-first-session-audit-20260716` | `dfbabc5` | `codex/first-session-audit-20260716` |
| `nova-swarm-gameplay-experience-20260714` | `728118c` | `codex/fusion-blueprints-20260715` |
| `nova-swarm-genre-improvement-20260716` | `bc20ea1` | `codex/genre-improvement-20260716` |
| `nova-swarm-next-competition-audit-20260716` | `dfbabc5` | `codex/next-competition-audit-20260716` |
| `nova-swarm-next-gap-audit-20260715` | `af8245a` | `codex/game-gap-audit-20260715` |
| `nova-swarm-post-build-20260715` | `82fb515` | `codex/post-build-improvements-20260715` |
| `nova-swarm-reinforcement-wow-20260715` | `127de13` | `codex/reinforcement-swarm-wow-20260715` |
| `nova-swarm-release-bullet-vfx-20260715` | `85f74e2` | `codex/release-bullet-vfx-20260715` |
| `nova-swarm-rival-feature-audit-20260716` | `bc20ea1` | `codex/rival-feature-audit-20260716` |
| `nova-swarm-run-report-tactical-loadout-20260711` | `8bd1ffd` | `codex/run-report-tactical-loadout-20260711` |
| `nova-swarm-steam-feedback-20260715` | `b660a20` | `codex/steam-feedback-fixes-20260715` |
| `nova-swarm-steam-patch-boundary-audit-20260716` | `724e3b7` | `codex/steam-patch-boundary-audit-20260716` |
| `nova-swarm-steam-runtime-gate-hotfix-20260715` | `147ac01` | `codex/steam-runtime-gate-hotfix-20260715` |
| `nova-swarm-visual-refinement-20260714` | `09ea038` | `codex/how-to-play-complete-20260714` |

Detached July audit worktrees were also reviewed at `b660a20`, `b06c60c`,
`e7208cc`, `82fb515`, and the three historical delta commits. They contain no
independent active branch tip.

### Older worktrees

The remaining worktrees are May/June branches under
`D:\vibe-coding-e\burt-shooter*` plus
`nova-swarm-major-overhaul-20260611`. Their tracked and untracked states were
inspected without modification. They are old QA, marketing, release-recovery,
leaderboard, controller, Level 50, and generated-art snapshots. Any source-like
changes are reconciled in
`docs/release/NOVA_SWARM_COMPLETE_RECONCILIATION_20260717.md`; generated media,
old packages, and release output are not source candidates.

## Non-ancestor local branch tips

Twenty-four local branch names (21 unique SHAs) were not ancestors of
`564cf17` at snapshot time:

- `f49cd92` backup Level 50 cleanup snapshot
- `df23c33` addictive-loop polish
- `5c5a908` boss-support heal caps plus stale Steam evidence/runtime work
- `3941403` Cabinet log/career persistence polish aliases
- `708e0e9` content-director theme knobs
- `6eefe2c` Eirik full-test/marketing aliases
- `4882d10` enemy-bullet VFX branch
- `31a336a` feedback-priority backlog
- `d1afdf6` old readable Steam icon release lock
- `af8245a` game-gap audit
- `53da980` leaderboard player highlight
- `92b85d1` Level 50 analysis
- `7c18110` Level 50 runtime fixes
- `d20e304` post-release Steam article aliases
- `8bd1ffd` tactical loadout run report
- `deae551` Steam achievements integration
- `d22d6a6` controller menu fix
- `147ac01` Steam runtime gate hotfix
- `13a0ff3` tactical augment tray
- `94723a5` performance recovery
- `a9847fb` multi-agent rescue snapshot

Patch-ID comparison already proves `4882d10`, `af8245a`, `8bd1ffd`, `147ac01`,
and `13a0ff3` patch-equivalent to commits in the integration line. Relevant
post-July remote branches are ancestors of the integration base. Older remote
release and recovery refs are retained but do not supersede the July line.

Recent reflog review found one July reflog-only commit:
`a8abed33055875fb09095e65451f602646125de2` (`Localize Daily Cabinet Signal`).
Its source set is present in expanded, later form on the integration line.

## Preserved stashes

All 24 stashes remain unchanged:

| Ref | SHA | Date | Subject |
|---|---|---|---|
| `stash@{0}` | `15ea324` | 2026-06-29 | pre-forum-feedback-steam-push |
| `stash@{1}` | `a97128d` | 2026-06-26 | pre-steam-deploy-loose-news-art |
| `stash@{2}` | `99bf555` | 2026-06-26 | pre-boss-reinforcement-wave-tuning-menu-barks |
| `stash@{3}` | `85be3db` | 2026-06-26 | pre-lockin-dirty-achievement-resultscreen-work |
| `stash@{4}` | `cad26b5` | 2026-06-15 | pre-visual-polish-untracked-steam-evidence |
| `stash@{5}` | `159a9dc` | 2026-06-12 | pre-achievements-qa-artifacts |
| `stash@{6}` | `972263f` | 2026-06-12 | pre-boss-polish-snapshot |
| `stash@{7}` | `a02c539` | 2026-06-08 | pre-existing generated artifacts |
| `stash@{8}` | `d5df1e4` | 2026-05-28 | preserve-dirty-root-before-qa-fixes |
| `stash@{9}` | `f09147f` | 2026-05-25 | pre-ship-unlock-reveal |
| `stash@{10}` | `e47d6a3` | 2026-05-25 | preserve-unrelated-debug-tooling |
| `stash@{11}` | `406414c` | 2026-05-25 | pre-debug-trait-fix |
| `stash@{12}` | `4dfc2f8` | 2026-05-25 | pre-steam-leaderboard-write-diagnosis |
| `stash@{13}` | `6f4b7ab` | 2026-05-25 | pre-boss-mercy-trait-explanations |
| `stash@{14}` | `4f0aacb` | 2026-05-24 | phase-2 generated artifacts |
| `stash@{15}` | `f5d06bb` | 2026-05-24 | stale Steam generated artifacts |
| `stash@{16}` | `551b76c` | 2026-05-24 | pre-Steam-Cloud untracked artifacts |
| `stash@{17}` | `9dd915c` | 2026-05-22 | trailer footage |
| `stash@{18}` | `04d99f3` | 2026-05-22 | pre-premium-presentation polish |
| `stash@{19}` | `9278de0` | 2026-05-21 | pre-final-SteamPipe blocker |
| `stash@{20}` | `eeb63a0` | 2026-05-20 | pre-SteamPipe setup |
| `stash@{21}` | `3a38dd8` | 2026-05-16 | pre-crew-polish safety snapshot |
| `stash@{22}` | `ab228da` | 2026-05-16 | burt-shooter safety snapshot |
| `stash@{23}` | `e997417` | 2026-05-16 | pre-wave-briefing recovery |

The June 26 menu-bark stash contains the already-shipped broad randomized bark
pack and generated audio. It does not contain the final, truthful per-mode
narration required by this release candidate. Other source-like stash content
is old and reconciled semantically against later integrated systems; artifact
stashes remain artifact-only.

## Daily-character source/runtime snapshot

Exact characters found:

- U+25C6 BLACK DIAMOND (`◆`) means a cleared day.
- U+25C7 WHITE DIAMOND (`◇`) means an attempted but uncleared day.
- the dot-like marker means no recorded attempt.

Current dedicated-history source locations:

- `src/ui/DailySignalCard.js`
- `src/progression/DailySignalRecords.js`

Those symbols build the detailed seven-day Flight Log/history row. The old
primary menu path reused that compact row, producing an unexplained line like
`WEEK: · · · ◇ · · · 0/7 CLEARED`. Commit `564cf17` already changed the primary
Daily mission briefing to:

`WEEKLY CLEARS: {clears} / 7`

The dedicated Flight Log may retain day markers because it is a labelled
history; primary Daily card/briefing paths must not. The current source has
natural translations for all eight supported locales, and direct interpolation
was inspected for values 0, 1, 6, and 7 without U+25C6, U+25C7, U+FFFD,
`undefined`, or a symbolic day row.

The player still saw the symbols because the Steam-installed private build
`24249013` was packaged from `5411b76`, while the primary-description change is
in later commit `564cf17`. The source fix therefore did not enter that package
or the Steam-delivered installation.

## Mode-to-narration mapping before integration

Actual selectable cards and pre-integration mappings:

| Card | Internal ID | Ranked state | Current event before integration | Finding |
|---|---|---|---|---|
| Mayhem Tactical | `launchTactical` | ranked, Tactical lane | `boss_menu_bark_launch` | generic randomized Mayhem pool |
| Mayhem Pure | `launch` | ranked, Pure lane | `boss_menu_bark_launch` | same generic pool |
| Daily Challenge | `dailySignal` | local/unranked | `boss_menu_bark_launch` | incorrect shared ranked-Mayhem pool |
| Scout Run | `scout` | unranked practice | `boss_menu_bark_scout` | mode family correct but randomized, not a stable mechanics description |
| Sector Run | `sectorStart` | unranked checkpoint practice | `boss_menu_bark_sector_start` | mode family correct but randomized, not a stable mechanics description |

The scene-level dispatch fix in `564cf17` bypasses the shared event duplicate
cooldown for deliberate run-mode focus, so later cards can emit an event.
However, the three first cards still share one event containing randomized
lines such as “Ranked run,” so Daily can speak inaccurate mechanics and Pure
cannot be distinguished from Tactical. This is a verified release blocker, not
merely an audio-visibility issue.

## Safety state

At snapshot time:

- no source scoring or XP formula was changed
- no leaderboard identity/routing was changed
- no achievement ID or definition was changed
- no save identity, format, key, or Steam Cloud path was changed
- no Steamworks metadata, store metadata, pricing, community, or patch-note
  backend was opened or changed
- no package, upload, deploy, branch assignment, SetLive operation, or public
  release occurred
- public/default remained BuildID `24245709`
