# Nova Swarm Project Health Report

Generated: 2026-06-15

## Executive Verdict

Nova Swarm is safe to continue development from this worktree, with one clear caveat: it is not release-ready for a new Steam promotion until the first-boss balance guard is resolved and the stale release-readiness evidence is refreshed.

No release-critical source work appears to be lost. The current development line contains the recent shipped game source, the major recent feature work, and the latest committed Steam upload evidence. The latest Steam-uploaded build is represented in source control by committed evidence; I found no sign that Steam contains gameplay/source changes missing from the repository.

The current working tree now contains audit fixes that are not committed and not shipped:

- Locale placeholder cleanup in four non-English locale files.
- A stricter i18n check for literal question-mark placeholders.
- A Sector Continue test click-target fix.
- A release-hardening source-marker update for the current HUD rank layout.
- A gameplay hold-state fix that defers the guaranteed extra-life spawn during overrun milestone interludes, then preserves it after the interlude clears.
- This health report.

## Current State

- Working directory: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
- Authoritative worktree: yes. This is the latest active Nova Swarm sector-continue prototype worktree, not the older `burt-shooter`, major-overhaul, or release-recovery clones.
- Branch: `codex/hard-achievements-20260612`
- Baseline HEAD before audit changes: `6717bf97e6d1a4a764c07a986cf1a5bcba4c2827`
- Baseline subject: `Record Steam build 23738239`
- Remote tracking: `origin/codex/hard-achievements-20260612`
- Initial status: clean before audit edits.
- Current status: dirty with the audit fixes and this report.
- Steam AppID: `4765070`
- Steam depot: `4765071`
- Main leaderboard identity: `nova_swarm_global_score_v2`
- Steamworks settings touched during this audit: no.
- Deploy or Steam upload performed during this audit: no.

## Branch Audit

### Current development line

`codex/hard-achievements-20260612` is the current active line. It includes the final `feature/sector-continue-prototype-v1` work plus later achievements, boss/audio, score deck, readability, localization, Codex, Steam evidence, and patch-note commits.

Recent branch/commit evidence shows the current branch has the newest recorded work:

- `6717bf9` - Record Steam build 23738239.
- `e35d7d2` - Fix packaged pickup effect warning.
- `1b0bfbf` - Regenerate boss agony with Misfit Galaxy voice.
- `639ae95` - Record Steam patch note publication.
- `e8a8786` - Record Steam build 23736903.
- `452543d` - Record Steam private build 23736399.
- `05163d6` - Fix boss voice and codex progress regressions.
- `82b2956` - Address pilot feedback on readability and menu safety.

### Merged or superseded release branches

The recent RC, fix, tuning, and sector prototype branches are either ancestors of the current line or represented by later equivalent work on the current line:

- `feature/sector-continue-prototype-v1`
- `codex/major-overhaul-feedback-20260611`
- `rc/final-freeze-audit-v1`
- `rc/automated-release-candidate-soak-v1`
- `fix/final-xbox-controller-overlay-v1`
- `fix/final-runtime-blockers-before-release-v1`
- `fix/profile-isolation-progression-pacing-v1`
- `fix/locked-difficulty-overrun-backlog-devgate-v1`
- `tuning/final-release-difficulty-nudge-v1`
- `tuning/early-mid-wave-tighten-v4`
- `tuning/normal-wave-runtime-lethality-v3`
- `tuning/late-overrun-attrition-v1`

I did not find a recent RC branch with source improvements that need to be merged into the current branch.

### Unmerged branches with non-release-critical or superseded work

These branches are not merged by commit ancestry, but the audit did not find release-critical missing work that should block continuing:

| Branch | Finding |
| --- | --- |
| `codex/final-readable-steam-icon-v1` | One unmerged release-lock/evidence doc for old BuildID `23620801`; no missing gameplay source. |
| `codex/steam-achievements-integration` | Original achievement branch is unmerged, but current line has later Steam achievement bridge, catalog, manager, sync, docs, and checks. |
| `codex/leaderboard-player-highlight` | Superseded by current leaderboard/result handling and Steam best-score work. |
| `codex/steam-controller-menu-fix-20260526` | Superseded by current controller flow, `GamepadNavigator`, native gamepad bridge, and controller checks. |
| `codex/eirik-fulltest-fixes-20260602` / `codex/marketing-mayhem-director-20260527` | Contains old game-over/progression fixes mostly superseded. Discord Rich Presence appears unique and is not present now; optional product decision, not a shipped release blocker. |
| `codex/level50-analysis-20260528` / `codex/level50-runtime-fixes-20260528` | Contains old Level 50 analysis/runtime audit tooling not present now. Current line has difficulty checks, but these analysis docs/tools could be archived if still wanted. |
| `codex/content-director-theme-knobs-20260528` | Content director/theme work appears reimplemented or superseded by current run content systems and checks. |
| `codex/addictive-loop-polish-20260528`, `codex/cabinet-log-credits-polish-20260526`, `codex/career-intel-gameover-persistence-20260527` | Old polish/follow-up branches; relevant systems now exist in newer forms. |
| Remote historical branches such as `feat/i18n-english`, `feat/i18n-locale`, January flicker branches, and rollback backups | Historical divergent work, not current-release candidates. |

### Stashes

The current-branch top stash is `pre-visual-polish-untracked-steam-evidence-20260615`. It contains an untracked Steam evidence JSON for private BuildID `23727017`, based on commit `82b2956`. It is superseded by later committed Steam evidence for BuildIDs `23736399`, `23736903`, and `23738239`.

Older stashes are mostly generated QA/artifact snapshots from older work. They should be reviewed before pruning, but none surfaced as obvious current release-critical source loss during this audit.

## Feature Verification

| Feature | Status | Evidence / working path | Missing pieces |
| --- | --- | --- | --- |
| Steam leaderboard integration | Present | `electron/steamLeaderboardBridge.cjs`, `src/leaderboard/*`, `docs/steam-leaderboards.md`, `check:steam-electron-bridge`, `check:steam-leaderboard-mock`, `check:steam-package-runtime` | Real Steam-client write validation still needs explicit release pass before promotion. |
| Steam best-score handling | Present | Game Over score status, retained Steam best score handling, result-screen checks, leaderboard mock checks | No blocker found. |
| Steam persona handling | Present | Electron Steam profile context, preload persona surface, desktop smoke showed Steam profile isolation | No blocker found. |
| Profile isolation and Steam Cloud | Present | `src/steamCloudPersistence.js`, `electron/steamCloudSave.cjs`, `ProfileStorageNamespace`, `check:profile-isolation`, `check:steam-cloud-save` | No blocker found. |
| Overrun milestone announcements | Present | `OverrunMilestoneCelebrations`, overrun checks, sector-aware voice checks | Fixed during audit: guaranteed extra-life spawn now waits until overrun interlude clears. |
| Boss improvements | Present | Boss roster/factory/support ships, boss death voice runtime, boss support checks, boss mercy checks | Release blocker: first-boss balance check currently fails. |
| Threat Codex | Present | `ThreatCodexScene`, `ThreatCodexCatalog`, discovery state, Codex layout/revamp checks | No blocker found. |
| Hangar improvements | Present | `ShipSelectScene`, `ShipDetailsScene`, hangar progression/unlock presentation checks | No blocker found. |
| Controller navigation | Present | `GamepadNavigator`, `InputManager`, native gamepad bridge, controller flow checks | No blocker found. |
| Result screen improvements | Present | `GameOverScene`, result screen flow/status checks, submitted-hold guards | No blocker found. |
| Ship unlock systems | Present | `ShipUnlockConfig`, `HangarProgressState`, ship unlock checks | No blocker found. |
| Sector progression systems | Present | `RunMode`, sector start challenge records, sector result/menu/controller checks | Older docs still describe earlier local-only state; current implementation is broader. |
| Difficulty tuning | Present | `BalanceConfig`, run pacing checks, `check:difficulty-tuning` | Balance gate failure is specific to first-boss automated probe. |
| Visual polish | Present | Generated assets, readability checks, smoke screenshots, Codex/menu/result checks | No blocker found. |
| Audio improvements | Present | `SoundCatalog`, boss agony voices, game-over taunts, level-clear voices, audio catalog checks | Human by-ear Steam-client pass still needed before release. |
| Celebration systems | Present | Game-over ceremony, overrun interludes, achievement/milestone checks | No blocker found after overrun hold fix. |
| Sector challenge systems | Present | Sector Start checkpoint flow, separate records, sector result CTA and board paths | No blocker found. |
| Fuel ships | Present | Boss support/fuel ship paths, Codex and audio coverage | No blocker found. |
| Steam achievements | Present | `electron/steamAchievementsBridge.cjs`, achievement catalog/manager/sync, `check:achievements`, `check:steam-achievements-mock` | Steamworks-side/manual achievement validation still needs release pass if promoting. |

## Steam Build Consistency

Latest committed Steam upload evidence:

- Evidence file: `release/steamworks/steam_upload_evidence_boss_agony_20260615_23738239.json`
- Steam BuildID: `23738239`
- Uploaded at: `2026-06-15T09:07:41Z`
- Steam user: `gaunziman`
- Branch: `codex/hard-achievements-20260612`
- Source commit used for package: `e35d7d290b2f399aa8c67c8158c22feca14fd9f6`
- Current HEAD: `6717bf97e6d1a4a764c07a986cf1a5bcba4c2827`
- Difference from package commit to HEAD before this audit: evidence/documentation only, not gameplay source.
- AppID: `4765070`
- Depot: `4765071`
- SetLive: empty
- Steamworks touched: false
- Live branch changed: false
- Package runtime proof: AppID `4765070`, leaderboard `nova_swarm_global_score_v2`

Conclusion:

- Current source control contains the latest shipped game source represented by Steam BuildID `23738239`.
- I found no evidence that Steam contains gameplay/source changes missing from the repo.
- Before this audit, source control had no gameplay fixes newer than the latest Steam package; HEAD only recorded upload evidence.
- After this audit, the working tree contains new uncommitted fixes that are not shipped to Steam.
- Live Steam backend state was not queried or changed in this audit. This conclusion is based on committed upload evidence, package runtime reports, and local Steam build logs.

## Release Readiness

The project is safe to continue development from, but not ready for a release promotion today.

Blocking or current-release caveats:

1. `npm run check:first-boss-balance` fails repeatedly. The automated probe loses 2 lives against the first boss where the guard allows at most 1. Damage sources were boss cone and fan bullets. I did not tune gameplay because the audit guardrails explicitly said not to change gameplay balance.
2. `npm run check:release-hardening` fails at the first-boss balance step after 13 passing subchecks.
3. `npm run audit:release-readiness` reports `not_steam_ready`: stale May-era screenshot/trailer/package/client-preflight/handoff/human-review evidence, missing Steam-client validation report, missing current human approvals, and a stale privacy/forbidden-term scan that now flags current intentional boss/persona/test identifiers and generated `dist`.
4. Human QA is still needed for by-ear audio, current screenshots/capsules/trailer/store copy, legal/provenance review, and gameplay feel.

## Build Verification

Passed:

- `git fetch --all --prune`
- `git status --short --branch`
- `git branch --show-current`
- `git rev-parse HEAD`
- `git log -1 --decorate --oneline`
- `git worktree list`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:release-line`
- `npm run check:steam-electron-bridge`
- `npm run check:steam-leaderboard-mock`
- `npm run check:steam-achievements-mock`
- `npm run check:profile-isolation`
- `npm run check:steam-cloud-save`
- `npm run check:controller-flow`
- `npm run check:sector-continue-mode`
- `npm run check:sector-start-challenge-records`
- `npm run check:sector-start-result-flow`
- `npm run check:sector-start-menu-layout` on rerun
- `npm run check:threat-codex`
- `npm run check:codex-revamp`
- `npm run check:codex-layout`
- `npm run check:codex-tab-count-layout`
- `npm run check:result-screen-flow`
- `npm run check:result-screen-status`
- `npm run check:overrun-milestones`
- `npm run check:overrun-milestone-sector-voice`
- `npm run check:boss-death-voice-runtime`
- `npm run check:hangar-unlock-presentation`
- `npm run check:ship-unlocks`
- `npm run check:achievements`
- `npm run check:milestone-achievements`
- `npm run check:difficulty-tuning`
- `npm run smoke`
- `npm run desktop:smoke:current`
- `npm run check:steam-package-runtime`

Failed:

- `npm run check:first-boss-balance`: first-boss automated combat probe loses 2 lives, expected max 1.
- `npm run check:release-hardening`: failed at first-boss balance after 13 passing subchecks.
- `npm run audit:release-readiness`: failed because release evidence and manual approvals are stale/missing and the forbidden-term scan policy is out of date for current intentional identifiers.

Transient or corrected during audit:

- `npm run check:sector-continue-mode` initially failed because the test clicked inside the widened Sector Start launch core instead of the arrow selector strip. The test now clicks the exposed arrow/core bounds and passes.
- `npm run check:sector-start-menu-layout` reported an overlap once, but a direct state probe showed valid separation and the check passed immediately on rerun.
- `npm run check:overrun-milestones` initially failed because a guaranteed extra-life drop spawned during the held overrun interlude. The guaranteed spawn is now deferred until gameplay resumes, and the check passes.
- `npm run check:release-hardening` initially had a stale HUD marker for the rank offset. The marker now matches the current responsive HUD expression.

Build warning:

- `build:current` still reports the existing Vite large chunk warning for the main bundle. It does not fail the build.

## Documentation Audit

Updated:

- Added this report as the current factual project health baseline.

Stale or needs refresh before release handoff:

- `README.md` is serviceable for basic setup but does not reflect the current Steam achievements, Sector Start, Threat Codex, Steam Cloud/profile isolation, and latest Steam build state.
- `CLAUDE.md` says `npm run audit:release-readiness` may pass with only known manual Steam blockers; today it fails on hard stale-evidence and policy blockers.
- `release/steamworks/release_handoff_packet.md` is still May 19-era evidence and does not represent BuildID `23738239`.
- `release/steamworks/steam_client_preflight_packet.md` and `.json` are May 23-era evidence.
- Several screenshot/trailer/human approval docs are May-era and fail current-build checks.
- Some June patch-note docs are historical and useful, but not a consolidated current-state handoff.
- Older Sector Start readiness docs describe earlier local/unranked limitations and should be treated as historical unless refreshed.

Still accurate or operationally useful:

- `AGENTS.md` correctly defines the guardrails used in this audit.
- `docs/steam-leaderboards.md` correctly preserves `nova_swarm_global_score_v2`.
- Steam upload evidence JSON files accurately show a sequence of private uploads with Steamworks settings untouched.

Remaining untranslated text:

- No TODO, placeholder, literal `??`, or reported English leak remains according to `check:i18n` and `check:i18n-ui`.
- Proper/stylized names and technical labels remain intentionally English where allowed by `AGENTS.md`.
- Human localization quality QA was not performed; automated coverage only proves no detected placeholders/leaks/layout failures.

## Dead Code And Cleanup Audit

Do not remove these without a separate cleanup branch and proof.

High-confidence cleanup candidates:

- Root rescue/WIP patch files: `RESCUE_500FIX.diff`, `RESCUE_E2E.diff`, `RESCUE_LEADERBOARD.diff`, `RESCUE_polish_from_stash3.patch`, `RESCUE_powerup_hud_beercan.patch`, `WIP_PATCH.diff`.
- Superseded top stash evidence for BuildID `23727017`, after confirming whether the project wants to retain every intermediate private-build record.
- Generated local outputs such as `dist/`, `test-results/`, `release/desktop/`, `release/steam-build-output/`, and `release/steamworks/app_build_LOCAL.vdf` before a clean handoff, if not needed for evidence.
- Stale May-era release readiness/preflight/handoff generated reports, after replacing them with current evidence.

Needs review before cleanup:

- Tracked generated/report artifact: `output/pdf/nova-swarm-state-of-the-art-genre-revolution-2026-06-12.pdf`.
- Old screenshot/trailer/capsule candidate folders under `release/`.
- Historical Steam announcement/forum/patch-note drafts.
- Old non-merged branches after confirming no desired optional work remains.
- Old stashes from May/June after confirming they contain only generated evidence or historical work.

Not cleanup candidates based on this audit:

- Boss-specific audio keys and assets that look legacy but are still referenced by `SoundCatalog`, `assetManifest`, and boss death effects.
- Current Threat Codex, Steam leaderboard, Steam achievement, profile isolation, and Sector Start systems.

## Technical Debt

Highest-value debt:

- Refresh release-readiness automation so it distinguishes historical docs from current evidence and does not hard-fail on intentional current game identifiers without a policy decision.
- Resolve the first-boss balance guard without changing broad gameplay balance blindly.
- Regenerate a current release handoff packet for BuildID `23738239` or the next candidate build.
- Record real Steam-client install/launch validation for the current private build before promotion.

Medium-value debt:

- Consolidate README/current-state documentation.
- Archive or delete superseded local/remote branches after a tagged safety checkpoint.
- Review and prune stale generated artifacts.
- Make release evidence paths less dependent on May-era report names.

Nice-to-have:

- Decide whether old Discord Rich Presence and Level 50 analysis tooling should be revived or archived.
- Add a small stale-doc index that labels historical docs instead of letting old files look current.
- Consider bundle splitting to reduce the existing Vite large chunk warning.

## Recommended Next Tasks

Highest impact:

1. Fix or explicitly retune the first-boss balance gate. Current automated probe loses 2 lives; release-hardening will not pass until this is resolved.
2. Commit the audit fixes and this report on `codex/hard-achievements-20260612` after review.
3. Refresh release handoff/client validation evidence for the next candidate build. Do not claim release readiness from the old May packets.
4. Run a real Steam-client installed-build validation pass before any branch promotion.

Medium impact:

1. Update README and CLAUDE release-readiness notes to reflect the current Steam/feature state.
2. Decide what to do with the optional old-branch work: Discord Rich Presence and Level 50 analysis tooling.
3. Archive/drop superseded stashes and local branches after user approval.
4. Regenerate current screenshots/trailer/contact sheets only if release/public presentation work resumes.

Nice-to-have:

1. Add branch-retirement notes or tags for superseded Codex branches.
2. Produce a fresh localization visual QA PDF if localization work continues.
3. Review generated/media assets for provenance and actual usage.

## Files Changed By This Audit

- `scripts/check-i18n.mjs`
- `scripts/check-release-hardening-ui-flow.mjs`
- `scripts/check-sector-continue-mode.mjs`
- `src/i18n/locales/ja.js`
- `src/i18n/locales/ko.js`
- `src/i18n/locales/ru.js`
- `src/i18n/locales/zh-CN.js`
- `src/managers/PowerupManager.js`
- `docs/nova-swarm-project-health-report-2026-06-15.md`

## Rollback Command

From `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`:

```powershell
git restore -- scripts/check-i18n.mjs scripts/check-release-hardening-ui-flow.mjs scripts/check-sector-continue-mode.mjs src/i18n/locales/ja.js src/i18n/locales/ko.js src/i18n/locales/ru.js src/i18n/locales/zh-CN.js src/managers/PowerupManager.js
Remove-Item -LiteralPath docs\nova-swarm-project-health-report-2026-06-15.md -ErrorAction SilentlyContinue
```

## Final Answer

The project is a trustworthy baseline for the next development phase, but not a trustworthy release-promotion baseline yet. I found no evidence of lost release-critical source work and no evidence that Steam contains newer source than the repository. The main outstanding release blocker is the first-boss balance guard, plus stale human/release evidence that must be regenerated before any Steam promotion.
