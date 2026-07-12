# Nova Swarm - New Chat Handoff Prompt

Paste everything below into a new Codex chat.

---

NOVA SWARM - LOCKED HANDOFF / 2026-07-12

Repo:
`D:\vibe-coding-e\nova-swarm-sector-continue-prototype`

Expected branch:
`codex/steam-store-refresh-20260711`

Authoritative lock tag:
`nova-swarm-lock-20260712-tactical-store-refresh`

Before doing anything, read:

- `AGENTS.md`
- `NOVA_SWARM_LOCK_20260712.md`
- `progress.md`
- `release/steam-store-refresh-handoff-20260711.md`
- `release/steamworks/steam_upload_evidence_tactical_depth_20260711_24161600.json`

Then verify, one command at a time:

```powershell
git fetch --all --prune
git status --short --untracked-files=all
git branch --show-current
git log -1 --oneline
git rev-parse nova-swarm-lock-20260712-tactical-store-refresh^{}
git diff --check
git worktree list
```

Expected state:

- Current HEAD must equal the commit resolved by the lock tag.
- Tracked files must be clean.
- Many untracked generated media files under `release/steam-screenshots/` and
  `release/steam-trailer/` are expected and must not be deleted, reverted, or
  committed unless I explicitly request it.
- Any other dirty path, branch mismatch, or HEAD mismatch is unexpected: STOP
  and report before editing.

Current Steam state:

- Public/default baseline: BuildID `24132596`, manually assigned public by me.
- Latest verified test candidate: BuildID `24161600` on
  `sector-continue-test`, source `9bc75ea`, package
  `v2026-07-11_15-44-24`.
- Do not call BuildID `24161600` public.
- Test-branch rollback target: BuildID `24159806`.
- Public rollback requires manually assigning public/default back to the
  previous verified public BuildID.

Current Steam store state:

- Revision 34 published the rewritten Tactical Draft-focused About and short
  description in all eight supported languages.
- Revision 35 corrected Traditional Chinese to Simplified Chinese.
- Public locale verification passed for English, German, Spanish (Spain),
  Russian, Simplified Chinese, Brazilian Portuguese, Korean, and Japanese.
- Fourteen screenshots and three trailers are prepared locally but have not been
  uploaded to the Steam screenshot/trailer slots.

Major completed game work:

- first-session retention and result-flow improvements
- scrolling/traveling gameplay backgrounds
- post-boss Tactical Draft with 32 augments, stacking, rescan, run identity,
  generated art/SFX, Codex discovery, humorous details, and localization
- two-by-four augment HUD plus overflow, pause loadout, consumed state, and
  readable Run Reports
- balanced Threat Response that does not erase later-ship power
- combo visibility, integer boss refuel text, missable two-life reward, Viking
  Row ritual, and stronger sector milestone celebrations
- extensive browser/Electron/packaged/human-simulated testing

Strict guardrails:

- Do not open Steamworks/Chrome unless the task requires it or I explicitly ask.
- Do not upload, deploy, publish, change metadata, change branch assignments, or
  change SetLive unless I explicitly instruct it.
- Do not change score, XP, leaderboard identity, achievements, pricing, or Steam
  Cloud unless explicitly instructed.
- Be conservative with boss and gameplay balance.
- This is a PC-only game; mobile optimization is unnecessary.
- Update How To Play and all supported locales for player-facing changes.
- Run `npm run check:release-line` before packaging, VDF generation, SteamPipe,
  or upload.
- A successful SteamCMD upload is not proof of public/default status.

When continuing development:

1. Preserve the locked baseline and create a new `codex/` branch for substantive
   work unless I explicitly ask to continue on the lock branch.
2. Inspect existing code and `progress.md` before proposing or implementing more
   retention work; hundreds of improvements were already completed.
3. Prefer substantial, testable batches rather than asking me to manually test
   every tiny adjustment.
4. Simulate human play as deeply as possible, including fresh-profile isolation,
   keyboard/controller flow, screenshots, overlap checks, performance, and
   packaged runtime checks.
5. Only upload a new Steam test build after the batch is coherent, fully checked,
   and I explicitly ask for upload. Never move public/default automatically.

Start by reporting the verified folder, branch, HEAD/tag match, tracked clean
state, expected untracked media state, public BuildID, test BuildID, and the next
safest action. Do not edit anything until those checks pass.

---
