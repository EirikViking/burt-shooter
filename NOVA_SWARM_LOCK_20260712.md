# Nova Swarm Lock - 2026-07-12

This lock closes the long retention, Tactical Draft, Steam test-build, and
store-refresh session. The authoritative Git reference is the annotated tag:

`nova-swarm-lock-20260712-tactical-store-refresh`

The tag points to the commit containing this document. The last content commit
before the lock is `4cb50ab Refresh Steam store presentation`.

## Repository State

- Repository: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
- Branch: `codex/steam-store-refresh-20260711`
- Last game source commit: `9bc75ea Record tactical expansion verification`
- Steam test-build evidence commit: `1ea3654 Record Steam test build 24161600`
- Store presentation commit: `4cb50ab Refresh Steam store presentation`
- Tracked worktree state before this lock: clean
- Expected untracked state: generated screenshots, trailer renders, review
  frames, and render work files under `release/steam-screenshots/` and
  `release/steam-trailer/`

Do not delete, revert, or commit the expected generated media merely to make
`git status` empty. Treat any other dirty path as unexpected.

## Steam Build State

### Public/default baseline

- BuildID: `24132596`
- Package: `v2026-07-09_19-41-50`
- Game source: `4268eb6`
- Evidence commit: `a7b72d1`
- Original lock commit: `0cdfaaa`
- Tag: `nova-swarm-release-20260709-build24132596`
- Current status: manually assigned to Steam public/default by the user

The original upload evidence recorded an empty SetLive target. The user later
assigned this BuildID to public/default manually in Steamworks. Treat that user
statement as the current public baseline unless live Steamworks is explicitly
rechecked.

### Latest tested candidate

- BuildID: `24161600`
- Package: `v2026-07-11_15-44-24`
- Game source: `9bc75ea`
- Evidence commit: `1ea3654`
- Steam branch: `sector-continue-test`
- SetLive used for upload: `sector-continue-test`
- Previous test-branch rollback BuildID: `24159806`
- Public/default touched by this upload: no
- Evidence:
  `release/steamworks/steam_upload_evidence_tactical_depth_20260711_24161600.json`

Do not describe BuildID `24161600` as public. It is the latest fully verified
Steam test-branch candidate.

## Locked Game Work

The tested candidate includes the complete retention and Tactical Draft pass:

- stronger first-session guidance, result flow, comeback motivation, and
  readable high-score targeting
- visibly traveling gameplay backgrounds
- Tactical Draft after bosses, with three offers and one rescan
- 32 curated run augments across Offense, Mobility, Defense, and Utility
- 13 new tactical-only mechanics with generated icon art and distinct SFX
- augment stacking, evolved effects, consumed one-shot state, Codex discovery,
  detailed humorous drilldowns, and all-locale text
- active augment HUD in a two-by-four layout with overflow from augment nine
- complete Tactical loadout in pause, readable Run Report build history, and
  consumed markers
- balanced Threat Response that preserves the value and identity of later ships
- corrected permanent Drone/Magnet HUD behavior and countdown formatting
- restored combo feedback and Combo Anchor timing
- integer boss-refuel feedback
- missable, expiring two-life jackpot
- louder Viking Row ritual for Longship Protocol
- distinct non-score milestone celebrations and rewards for deep sectors
- overlap/readability fixes for threat, toast, boss, and combat messages
- updated How To Play and supported-language localization

The package passed source checks, localization checks, browser and Electron
smoke tests, packaged controls, packaged performance, fresh-profile isolation,
and a 215.9-second input-driven starter run reaching Sector 3 with two Draft
choices and zero errors. Exact evidence is in the BuildID `24161600` JSON.

## Steam Store State

- Steamworks revision 34: new Tactical Draft-focused About text and short
  description in all eight supported languages
- Steamworks revision 35: corrected the advertised Chinese interface language
  from Traditional Chinese to Simplified Chinese
- Public verification passed for English, German, Spanish (Spain), Russian,
  Simplified Chinese, Brazilian Portuguese, Korean, and Japanese
- Pricing, leaderboards, score, XP, achievements, Steam Cloud, and Steam build
  assignments were not changed by the store refresh

Store handoff: `release/steam-store-refresh-handoff-20260711.md`

## Media State

Fourteen curated 1920x1080 screenshots are ready locally in:

`release/steam-screenshots/store-refresh-20260711-upload-jpg`

Recommended trailers:

1. `release/steam-trailer/store-refresh-20260711/01-action-cut/nova-swarm-01-action-cut.mp4`
   - SHA-256: `F57E0CEA4CCA6BE61A5E64E33A567C924951EE339CE5728EF5AE41F3E2F968A1`
2. `release/steam-trailer/store-refresh-20260711/02-tactical-draft-cut/nova-swarm-02-tactical-draft-cut.mp4`
   - SHA-256: `586917CB777B6597835555BD9285BAD58CA82B33904D115720139908052A31BE`

Curated contact sheet SHA-256:

`D1305796AE8A51ACDE9F982AD0A5D3B95937929FF9326DF54DF9E114344FDCFA`

The screenshots and trailers were generated and quality-checked locally. They
were not uploaded to the Steam screenshot/trailer slots in the final pass.

## Guardrails

- Do not deploy, upload, publish, change SetLive, or alter Steam metadata unless
  the user explicitly requests it.
- Do not change score, XP, leaderboard identity, achievements, or Steam Cloud
  unless explicitly requested.
- Treat boss and gameplay balance changes as high risk.
- Nova Swarm is PC-only; mobile optimization is not required.
- Update How To Play and all supported locales for player-facing changes.
- Run `npm run check:release-line` before packaging, SteamPipe/VDF work, or upload.
- Never infer public/default status from a successful upload log alone.

## Rollback

Inspect this exact lock:

```powershell
git checkout nova-swarm-lock-20260712-tactical-store-refresh
```

Undo only the lock documentation commit on the working branch:

```powershell
git revert nova-swarm-lock-20260712-tactical-store-refresh
```

Restore the tested game source without the later store tooling:

```powershell
git checkout 9bc75ea
```

Steam test-branch rollback: assign `sector-continue-test` back to BuildID
`24159806`.

Steam public rollback: manually reassign public/default from BuildID `24132596`
to the previous known-good public BuildID in Steamworks. Do not use the test
branch rollback target as a public rollback without explicit verification.

Steam store rollback: restore revision 33 content, or manually restore the prior
texts/language declaration, then publish a new revision. Steam store revisions
34 and 35 are the current intended public state.
