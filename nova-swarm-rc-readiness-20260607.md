# Nova Swarm RC2 Readiness - 2026-06-07

## Candidate

- Repo: `D:\vibe-coding-e\burt-shooter-cursor-hide-20260604`
- Expected starting branch: `rc/automated-release-candidate-soak-v1`
- Expected starting HEAD: `b029e37ad473ca9d1799a08dfaa7fb07e5d62364`
- Audit branch: `rc/final-freeze-audit-v1`
- Audit base HEAD: `b029e37ad473ca9d1799a08dfaa7fb07e5d62364`
- Steam AppID: `4765070`
- Steam depot: `4765071`
- Steam leaderboard: `nova_swarm_global_score_v2`

## Steam Build Status

- Current private Steam BuildID: `23612264`
- Uploaded package version for BuildID `23612264`: `v2026-06-07_21-32-23`
- Upload evidence: `release/steamworks/steam_upload_evidence_rc_soak_20260607.json`
- `SetLive`: empty
- Steamworks settings touched during this audit: no
- Store metadata, app visibility, live branches, and leaderboard settings changed during this audit: no
- Dummy Steam leaderboard scores submitted: no
- New Steam upload during this audit: no, because no code fix was needed

## Local Package Validation

- Local-only package validation version: `v2026-06-07_22-25-36`
- Payload size: 336 files, 724374578 bytes
- Generated VDF: `release/steamworks/app_build_LOCAL.vdf`
- VDF check: AppID `4765070`, depot `4765071`, description `Nova Swarm RC2 final freeze audit private package validation`, and `"SetLive" ""`
- Packaged executable smoke: passed
- Packaged controls smoke: passed

## Automated Validation

All checks below passed on `rc/final-freeze-audit-v1`.

- `git fetch --all --prune`
- `pwd`
- `git branch --show-current`
- `git rev-parse HEAD`
- `git status --short --branch`
- `git worktree list`
- `git log --oneline -15`
- `npm run build:current`
- `npm run check:i18n`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `npm run check:release-line`
- `npm run smoke`
- `npm run check:release-hardening` - passed 37/37
- `npm run check:difficulty-tuning`
- `npm run check:early-wave-threat`
- `npm run check:early-wave-lethality`
- `npm run check:normal-wave-runtime-lethality`
- `npm run check:early-mid-wave-tighten`
- `npm run check:overrun-clear-score-bonus`
- `npm run check:overrun-milestone-sector-voice`
- `npm run check:profile-isolation`
- `npm run check:progression-pacing`
- `npm run check:threat-codex`
- `npm run check:codex-revamp`
- `npm run check:codex-layout`
- `npm run check:ship-unlocks`
- `npm run check:unlock-rank-pacing`
- `npm run check:ship-unlock-reveal`
- `npm run check:leaderboard-split`
- `npm run check:audio`
- `npm run check:debug-tools`
- `npm run check:score-normalization`
- `npm run check:leaderboard-adapter`
- `npm run check:achievements`
- `npm run check:milestone-achievements`
- `npm run check:steam-achievements-mock`
- `npm run check:announcer-voice`
- `npm run check:music-pack`
- `npm run check:powerup-visuals`
- `npm run check:steam-sdk-ready`
- `npm run check:provenance`
- `npm run check:steam-assets`
- `npm run check:run-pacing`
- `npm run check:rank-progression`
- `npm run check:sector-progression`
- `npm run package:steam:win`
- `npm run desktop:smoke:packaged`
- `npm run desktop:controls:packaged`
- `npm run steamworks:payload-manifest`
- `STEAM_APP_ID=4765070 STEAM_DEPOT_ID=4765071 STEAM_SET_LIVE="" STEAM_BUILD_DESC="Nova Swarm RC2 final freeze audit private package validation" npm run steamworks:write-vdf`

## Specific Guardrail Results

- Release-line guard confirmed latest localization, achievements, Steam Cloud, fullscreen, and marketing hotkey markers are present.
- Maintainer devtools guard passed; debug tools require the hashed launch-arg gate and no key-like plaintext was found.
- Steam package runtime guard confirmed AppID `4765070` and leaderboard `nova_swarm_global_score_v2`.
- Steam Cloud save and profile isolation checks passed with separate profile save paths.
- Progression pacing passed with level 10 at rank 3, 4 hulls, and 36 Codex entries.
- Fresh Codex completion does not auto-discover Powerups or Sectors.
- Direct catalog probe found no `reference` or `alwaysKnown` Powerups or Sectors entries: `{ "powerups": [], "sectors": [] }`.
- Early-wave lethality and early-mid tighten checks reported `powerupsNerfed: false` and `scoreChanged: false`.
- No stale first-run expectation for rank 6, eight hulls, all powerups, or all sectors was found in active checks.

## Manual Checklist Still Needed

- Steam-client combo x10/x20 by-ear pass: softened tick, score bonus unchanged.
- Steam-client SFX by-ear pass: combo, wave clear, sector clear, powerup pickup, boss death all distinct.
- Human boss pass: boss 1 lasts longer and remains readable; sample one later boss if possible.
- Human boss-death pass: bursts, rings, and shockwaves look varied and clear before the next sector.
- Level 8-9 stuck-sprite pass: death, despawn, wave/sector clear, boss transition, support ships, pause/freeze/interlude.
- Steam-client game-over pass: auto-submit status is readable, Continue advances cleanly, One More Run and Top 3 remain readable.
- UI overlap pass: Rank badge, Run Clear, One More Run, Global Score Deck, empty leaderboard, and populated leaderboard.
- Real Steam leaderboard pass: use a real ranked run only; no dummy scores; board stays `nova_swarm_global_score_v2`.
- Full manual checklist: `release/steamworks/release_hardening_manual_test_checklist_20260605.md`

## Remaining Risk

- The automated suite is green, including packaged executable smoke, but final Steam-client by-ear/audio feel checks remain human QA.
- The local package validation version `v2026-06-07_22-25-36` was not uploaded. Steam private BuildID `23612264` remains the current private uploaded RC2 candidate.

## Rollback

- Return to the uploaded private RC candidate commit: `git switch rc/automated-release-candidate-soak-v1 && git reset --hard b029e37ad473ca9d1799a08dfaa7fb07e5d62364`
- Delete this audit branch if needed: `git branch -D rc/final-freeze-audit-v1`
- Delete the RC2 readiness tag if needed: `git tag -d nova-swarm-rc2-20260607-build23612264`
