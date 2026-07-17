# Nova Swarm complete reconciliation - 2026-07-17

Status: release-candidate source ledger
Unresolved intended improvements: **0**
Repository: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
Dedicated integration worktree: `C:\tmp\nova-swarm-complete-release-candidate-20260717`
Dedicated branch: `codex/complete-release-candidate-20260717`
Integration base: `564cf1758eadd1f6e6f82aa1bd3d531e6c8c45e6`
Proven July 13 content baseline: `b4ee0e38e6d6a592508e25af246dc98ddf551de3`

This ledger accounts for source, branches, reflog-only work, stashes, dirty
worktrees, historical release evidence, and the player-visible feature delta.
It is intentionally separate from generated package and Steam-upload evidence.

## Decision summary

The selected base is the latest coherent July integration line. It contains 71
first-parent commits after the proven July 13 content baseline, including all
verified takeover, Daily, Tactical, audiovisual, reliability, competition,
comprehension, and surprise work. The release pass adds the hard-blocker fixes
and narrow regression corrections on top of that line.

No divergent branch required a direct merge or cherry-pick. Five divergent tips
are patch-equivalent to work already integrated. Eleven old tips are superseded
by later implementations and tests. Three tips contain historical release or
store-article artifacts only. One tip is an unimplemented backlog proposal. One
tip contains a boss-healing balance experiment that is unsafe for the current
ranked game.

### Divergent-tip counts

The count unit in this table is a unique non-ancestor local branch-tip SHA.
Twenty-four branch names resolve to 21 unique SHAs.

| Status | Count |
|---|---:|
| INCLUDED by direct merge/cherry-pick | 0 |
| PATCH-EQUIVALENT | 5 |
| SUPERSEDED | 11 |
| ARTIFACT-ONLY | 3 |
| ABANDONED EXPERIMENT / PROPOSAL | 1 |
| UNSAFE/INCOMPATIBLE | 1 |
| **Total unique divergent tips** | **21** |

Separately, the 71-commit July 13-to-integration-base chain is the INCLUDED
source/content line. Historical package/upload-evidence commits in that chain
remain documentation only and are regenerated for the final candidate.

## Evidence and comparison methods

- `git merge-base --is-ancestor` for every local and relevant remote tip
- first-parent and full commit-graph comparison
- stable patch-ID comparison for divergent July feature branches
- file hashes and direct file comparison for dirty/untracked source-like files
- semantic review of gameplay rules and current runtime tests
- current browser/Electron runtime behavior
- focused tests for Daily, narration, Point Defense, bombs, powerups, bosses,
  saves, Cloud, achievements, leaderboards, controller input, and performance
- package/app.asar and Steam-delivered inspection, recorded in later evidence

Ancestry alone was not treated as proof of equivalence.

## Proven release boundary

The strongest available evidence for the officially published July 13
patch-note content is:

- patch: `Nova Swarm Patch Notes: Aces, Nemesis Protocols & Rival Wings`
- BuildID: `24178758`
- source: `b4ee0e38e6d6a592508e25af246dc98ddf551de3`
- build stamp: `v2026-07-13_08-29-30`
- local evidence:
  `release/steamworks/steam_upload_evidence_rival_wings_10000_20260713_24178758.json`
- patch-note source:
  `docs/steam/patch-notes-2026-07-13-aces-nemesis-rival-wings.md`

The historical evidence maps the patch content boundary but records a test
branch assignment, not a proven public/default promotion. The player-facing
scope for this candidate is therefore the content delta from that mapped source
state, including work authored earlier if it was absent from that build.

## Divergent local branch tips

| SHA | Branch name(s) | Candidate content | Status | Evidence and disposition |
|---|---|---|---|---|
| `13a0ff36` | `codex/tactical-augment-tray-20260711` | Tactical augment HUD tray | PATCH-EQUIVALENT | Stable patch-ID matches the integrated Tactical HUD/loadout line. Current Tactical tray and loadout tests pass. Patch notes: Tactical command. |
| `147ac019` | `codex/steam-runtime-gate-hotfix-20260715` | Fail-closed native Steam runtime packaging | PATCH-EQUIVALENT | Stable patch-ID matches the integrated package runtime gate. Package checks are rerun from fresh output. Patch notes: Reliability. |
| `31a336ae` | `codex/feedback-priority-backlog-20260618` | Sector extra-life backlog issue document | ABANDONED EXPERIMENT / PROPOSAL | A backlog proposal, not an implementation. Later life/powerup balance and pacing are materially different and tested. INTERNAL-ONLY. |
| `3941403e` | `codex/cabinet-log-credits-polish-20260526`; `codex/career-intel-gameover-persistence-20260527` | Old cabinet log, career, Game Over and Steam follow-ups | SUPERSEDED | Current Hangar persistence, run report, Game Over, credits, save migration, and Cloud merge systems are later and broader. No unmatched source behavior remains. |
| `4882d10c` | `codex/enemy-bullet-vfx-20260715` | Enemy projectile VFX plus improvement ledger start | PATCH-EQUIVALENT | Stable patch-ID matches the integrated projectile spectacle and ledger work. Projectile lifecycle/readability/stress tests pass. Patch notes: Combat clarity and spectacle. |
| `53da980f` | `codex/leaderboard-player-highlight` | Old boss mercy, trait explanations, and leaderboard highlight line | SUPERSEDED | Current boss mercy/fairness, trait copy, and leaderboard presentation are later. Leaderboard identities and routing remain unchanged. |
| `5c5a9088` | `codex/boss-support-heal-caps-20260702` | Boss-support group healing caps plus stale runtime/upload evidence | UNSAFE/INCOMPATIBLE | See the dedicated boss-healing decision below. The stale release evidence is not reused. |
| `6eefe2cf` | `codex/eirik-fulltest-fixes-20260602`; `codex/marketing-mayhem-director-20260527` | Old Game Over, cleanup, marketing, and Mayhem work | SUPERSEDED | Current Game Over, cleanup, content director, run modes, and Mayhem systems are later and tested. Marketing artifacts are not payload source. |
| `708e0e99` | `codex/content-director-theme-knobs-20260528` | Old content-director knobs plus web evidence | SUPERSEDED | Current seeded RunContentDirector, Daily fixed route, rare encounters, and Cabinet Wonder RNG isolation supersede it. Old deployment evidence is not reused. |
| `7c18110e` | `codex/level50-runtime-fixes-20260528` | Old Level 50 audit/debug tooling | SUPERSEDED | Fifty-stage Tactical Directives and current deep-run diagnostics supersede it. No debug-only scoring behavior is included in ranked runs. |
| `8bd1ffdb` | `codex/run-report-tactical-loadout-20260711` | Tactical loadouts in Run Report | PATCH-EQUIVALENT | Stable patch-ID matches the integrated Run Report/Tactical loadout implementation. Current report checks pass. |
| `92b85d18` | `codex/level50-analysis-20260528` | Human timing analysis and old runtime audit material | SUPERSEDED | Later pacing models and Sector 10/deep-run diagnostics supersede the analysis. INTERNAL-ONLY. |
| `94723a54` | `recovery/performance-rescue-20260616` | Historical Steam upload evidence | ARTIFACT-ONLY | Old BuildID/package metadata; no unique source implementation. Not merged or reused. |
| `a9847fb3` | `rescue/multi-agent-mess-20260525-1549` | Mixed May rescue snapshot | SUPERSEDED | Broad old mixed-source snapshot. Current systems are later; no unique source/config/localization file survives semantic and file comparison. |
| `af8245a8` | `codex/game-gap-audit-20260715` | Daily save-failure localization and gap audit | PATCH-EQUIVALENT | Stable patch-ID matches the integrated Daily localization path. All eight locale/UI checks pass. |
| `d1afdf68` | `codex/final-readable-steam-icon-v1` | Historical release lock for BuildID 23620801 | ARTIFACT-ONLY | Old package/BuildID lock only. It is not source for the candidate and is not reused. |
| `d20e3041` | `codex/post-release-progress-steam-article-20260619`; `codex/snapshot-before-steam-article-polish-20260619-091534` | Steam article image-embed corrections | ARTIFACT-ONLY | Store/news article material is outside the game payload and outside this authorized Steam scope. No backend metadata is touched. |
| `d22d6a65` | `codex/steam-controller-menu-fix-20260526` | Old controller-only menu/pause fixes | SUPERSEDED | Current controller navigation, pause, menu focus restoration, and full-flow tests are later and broader. |
| `deae5519` | `codex/steam-achievements-integration` | Initial Steam achievements integration | SUPERSEDED | Current stable-ID catalog, native sync, deduplication, queueing, and mock/runtime gates supersede it. Achievement IDs are unchanged. |
| `df23c331` | `codex/addictive-loop-polish-20260528` | Old HUD/Game Over retention polish | SUPERSEDED | Later first-session, HUD, personal-best, Game Over, and run-report work supersede it. |
| `f49cd92f` | `backup/pre-cleanup-level50-runtime-20260528-200735` | Safety snapshot before old Level 50 cleanup | SUPERSEDED | Backup snapshot only; later deep-run systems and checks are authoritative. |

## Relevant remote refs and reflog-only work

- Relevant July remote feature/release refs are ancestors of the selected
  integration base. No newer remote player-facing source exists outside it.
- Reflog-only commit
  `a8abed33055875fb09095e65451f602646125de2`
  (`Localize Daily Cabinet Signal`) is SUPERSEDED by the expanded later Daily
  localization source on the integration line.
- Existing release tags were inspected as historical evidence. No tag points
  to a newer unmatched source implementation.

## Stash reconciliation

All 24 stashes remain untouched. None is required for this candidate.

| Stash | Subject | Status | Reason |
|---|---|---|---|
| `stash@{0}` | pre-forum-feedback-steam-push | SUPERSEDED | Later feedback, Steam, and forum audit work is integrated; public/forum mutations are out of scope. |
| `stash@{1}` | pre-steam-deploy-loose-news-art | ARTIFACT-ONLY | Loose news/store art; not runtime source. |
| `stash@{2}` | pre-boss-reinforcement-wave-tuning-menu-barks | SUPERSEDED | Current boss/reinforcement systems and broad bark catalog are later. It does not contain truthful unique per-mode narration. |
| `stash@{3}` | pre-lockin-dirty-achievement-resultscreen-work | SUPERSEDED | Current achievement and result-screen paths are later and tested. |
| `stash@{4}` | pre-visual-polish-untracked-steam-evidence | ARTIFACT-ONLY | Generated visual/Steam evidence. |
| `stash@{5}` | pre-achievements-qa-artifacts | ARTIFACT-ONLY | QA artifacts; no unique runtime source. |
| `stash@{6}` | pre-boss-polish-snapshot | SUPERSEDED | Current boss roster, fairness, support, tether, and spectacle paths are later. |
| `stash@{7}` | pre-existing generated artifacts | ARTIFACT-ONLY | Generated files only. |
| `stash@{8}` | preserve-dirty-root-before-qa-fixes | SUPERSEDED | Old mixed QA snapshot; current source is later. |
| `stash@{9}` | pre-ship-unlock-reveal | SUPERSEDED | Current Hangar unlock/first-flight presentation is later. |
| `stash@{10}` | preserve-unrelated-debug-tooling | SUPERSEDED | Old debug tooling; not release behavior. |
| `stash@{11}` | pre-debug-trait-fix | SUPERSEDED | Current ship traits and explanations are later. |
| `stash@{12}` | pre-steam-leaderboard-write-diagnosis | SUPERSEDED | Current native bridge/diagnostics are later; identities/routing remain unchanged. |
| `stash@{13}` | pre-boss-mercy-trait-explanations | SUPERSEDED | Current boss mercy and trait systems are later. |
| `stash@{14}` | phase-2 generated artifacts | ARTIFACT-ONLY | Generated evidence only. |
| `stash@{15}` | stale Steam generated artifacts | ARTIFACT-ONLY | Explicitly stale release output; never reused. |
| `stash@{16}` | pre-Steam-Cloud untracked artifacts | SUPERSEDED | Current profile-isolated Cloud/save system is later and tested. |
| `stash@{17}` | trailer footage | ARTIFACT-ONLY | Media artifact; not runtime source. |
| `stash@{18}` | pre-premium-presentation-polish | SUPERSEDED | Current presentation/sensory work is later. |
| `stash@{19}` | pre-final-SteamPipe-blocker | SUPERSEDED | Current fail-closed package/Steam runtime gates are later. |
| `stash@{20}` | pre-SteamPipe-setup | SUPERSEDED | Current AppID/depot/package scripts are later; old VDFs are not reused. |
| `stash@{21}` | pre-crew-polish-safety-snapshot | SUPERSEDED | Old safety snapshot. |
| `stash@{22}` | burt-shooter-safety-snapshot | SUPERSEDED | Old repository snapshot. |
| `stash@{23}` | pre-wave-briefing-recovery | SUPERSEDED | Current briefing/transition scheduling is later and tested. |

Stash counts: 8 ARTIFACT-ONLY and 16 SUPERSEDED.

## Other worktrees and dirty/untracked files

Sixty-four worktrees existed at preflight, including the dedicated candidate.
They were inspected read-only and remain untouched.

- The current July worktrees form one ancestry chain ending at `564cf17`.
- Detached July audit worktrees do not add an independent branch tip.
- Older May/June worktrees are QA, marketing, release-recovery, leaderboard,
  controller, Level 50, and generated-art snapshots represented by the branch
  and stash classifications above.
- The dirty reference worktree contained one source-like untracked mismatch:
  `scripts/check-daily-signal-share-card.mjs`. It is an older copy; the
  candidate's later version passes browser download, Electron bridge mock,
  keyboard/controller, all-eight-locale, and visual checks.
- Other untracked source-like files compared from the dirty reference were
  identical to candidate source, or were generated screenshot/trailer/release
  reports. Generated media, old packages, dist folders, app.asar files,
  manifests, and bulk test output are ARTIFACT-ONLY and are not imported.
- No existing worktree was cleaned, reset, moved, deleted, or edited.

## Daily-character hard blocker

### Root cause

- U+25C6 BLACK DIAMOND (`◆`) meant a cleared day.
- U+25C7 WHITE DIAMOND (`◇`) meant an attempted but uncleared day.
- the dot marker meant no attempt.
- source generators: `src/ui/DailySignalCard.js` and
  `src/progression/DailySignalRecords.js`.

The symbols are meaningful in the dedicated, labelled seven-day Flight Log.
An older primary menu briefing reused that symbolic row and showed a line like
`WEEK: · · · ◇ · · · 0/7 CLEARED` without a legend.

The primary source correction existed at `564cf17`, but Steam BuildID
`24249013` was packaged from earlier source `5411b76`. The player therefore
received the old implementation. This is a source-to-package integration
failure, not a font substitution.

### Final behavior

Primary Daily card/briefing text is:

`WEEKLY CLEARS: {clears} / 7`

All eight locales have natural translations. Values 0, 1, 6, and 7 are tested.
The focused guard rejects U+25C6, U+25C7, U+FFFD, `undefined`, the old `WEEK:`
symbol row, and accidental symbolic marker assembly in primary Daily paths.
The dedicated labelled Flight Log retains its detailed history.

Status: INCLUDED in candidate source. Package and Steam-delivered proof are
recorded in release evidence after source freeze.

## Game-mode narration hard blocker

The five actual selectable cards are Mayhem Tactical, Mayhem Pure, Daily
Challenge, Scout Run, and Sector Run. Before this release pass, Tactical, Pure,
and Daily all dispatched `boss_menu_bark_launch`, so Daily could speak a ranked
Mayhem line and shared/global cooldowns could suppress later cards.

The candidate gives every card a unique mode ID, event, localized mechanics
transcript, and audio file. A 360 ms dwell prevents accidental chatter; a
deliberately focused different mode bypasses stale scene/global duplicate
cooldowns; rapid scrubbing cancels pending narration; leaving/re-entering and
same-card cooldown behavior remain bounded.

| Card | Internal card ID | Narration event | Spoken mechanics |
|---|---|---|---|
| Mayhem Tactical | `launchTactical` | `boss_menu_bark_mode_tactical` | Ranked; one permanent Tactical upgrade draft after every boss. |
| Mayhem Pure | `launch` | `boss_menu_bark_mode_pure` | Ranked; original Mayhem rules without Tactical drafts. |
| Daily Challenge | `dailySignal` | `boss_menu_bark_mode_daily` | Local/unranked fixed ship and route with Tactical drafts; clear Sector 10. |
| Scout Run | `scout` | `boss_menu_bark_mode_scout` | Unranked practice with a chosen anomaly; no career progress or leaderboard submission. |
| Sector Run | `sectorStart` | `boss_menu_bark_mode_sector` | Unranked checkpoint practice from an unlocked Mayhem sector; records stay local. |

Forward, reverse, random, quick-scrub, re-entry, within-card movement,
keyboard, controller, and mouse-to-controller sequences pass in browser
runtime. Electron/package/Steam-delivered results are recorded later.

## Included player-facing feature coverage

| Group | Included implementation | Fairness/identity impact | Patch-note section |
|---|---|---|---|
| Major takeover | Tactical-first menu, Daily redesign, canonical Run Report (schema now v15), Swarm Elite stable-ID presentation, personal-best carry, projectile overhaul, Longship chant ownership, forum A-P fixes, controller/navigation work | Existing IDs and leaderboard lanes preserved | Main mode; Hangar and run identity; Reliability |
| Sensory overhaul | Bounded chromatic shockwaves, energy rings, rays/shards/sweeps/curtains, pickups, combo crescendos, reinforcements, procedural bass/stereo layers, mix compression, pitch variation, Reduced Motion, performance caps | Cosmetic only; spectacle RNG isolated | Spectacle and audio |
| Reliability | Native Electron Steam capture surface, Point Defense behavior/range/activation/interception/timer/HUD/audio/expiry/help/report, banked deliberate bombs, valid targeting, transition-safe gameplay timers | No score formula or leaderboard identity change | Combat feedback and control; Reliability |
| Competition learning | Per-ship Mayhem mastery, ranked-only advancement, effective damage/DPS/accuracy/top source, Pause/Flight Report integration, Scout Calibration/Bullet School/Boss Lab, unranked safeguards | Ranked advancement only where intended; Scout remains ineligible | Mastery, records, and practice |
| Comprehension/surprise | Plain Daily clears, unique all-mode narration, calmer Ace Contracts, persistent target marker, separate 2X rewards, cosmetic RNG isolation, Ghost Fleet/Starwhale/Aurora Wonders | Ace ordinary score unchanged; Wonders score/gameplay neutral | Daily; Ace Contracts; Cabinet Wonders |
| Cross-cutting quality | Eight locales, controller/browser/Electron/Steam paths, save/Cloud migration, achievement uniqueness, projectile/pickup cleanup, paused timers, boss-beam/pickup-ring cleanup | Save identity/format/Cloud path unchanged | Localization, accessibility, and reliability |

### Narrow fairness correction found during release validation

Eight mixed weapon bundles (`reactor_redline`, `static_bloom`,
`lucky_reactor`, `packet_storm`, `boss_breaker`, `mirror_palace`,
`afterburner_choir`, and `dead_sun_dividend`) were marked `while_firing` even
though they also provide movement, chain, drone, orbital, score, or sustain
effects. That let autonomous/non-gun benefits persist indefinitely when fire
was released. They now use normal gameplay-clock duration. Mandatory messages,
drafts, pauses, and focus loss still stop that clock. Pure weapon bundles retain
their while-firing duration.

This is a verified ranked-fairness bug correction. It does not change any score
or XP formula, drop rate, leaderboard identity, save data, or achievement ID.

## Boss-healing branch decision

The unmatched branch proposed group support-healing caps of 25%, 40%, and 65%
for one, two, and three-or-more helper ships. Current boss spectacles can field
up to eight support ships, while current per-ship behavior is around 7.5%-9%.
Applying the old caps to the modern roster would materially increase and
reshape boss effective health, especially in ranked runs.

Chronology and surrounding code show that the branch predates the current
support roster, tether readability, cadence, mercy, and performance systems.
Current focused checks pass for support profiles, glyphs, tethers, and fairness
cadence. There is no verified current bug that requires the old balance change.

Decision: **UNSAFE/INCOMPATIBLE - intentionally excluded.**

This is not a silent omission. Including it would violate the release rule to
preserve ranked fairness.

## Identity and safety invariants

The candidate preserves:

- AppID `4765070` and depot `4765071`
- existing public/private branch names
- leaderboard names, lanes, routing, and existing scores
- score formulas and XP formulas
- achievement IDs and stable save identity
- save format compatibility and Steam Cloud paths/configuration
- ranked/unranked eligibility boundaries
- gameplay RNG isolation for cosmetic-only presentation

Steam store metadata, pricing, release date, community posts, forums, and patch
notes are not changed by source integration.

## Final reconciliation conclusion

- Every intended player-facing improvement found in branches, commits, reports,
  dirty worktrees, stashes, and the July integration line is included,
  patch-equivalent, or explicitly classified.
- No old package, dist directory, app.asar, VDF, manifest, or upload evidence is
  reused as release output.
- No candidate change set remains unresolved or uncertain.
- The boss-healing branch is intentionally excluded as unsafe for current
  ranked balance.
- Final package and Steam-delivered evidence must still prove this exact frozen
  source entered the private candidate before any manual release decision.
