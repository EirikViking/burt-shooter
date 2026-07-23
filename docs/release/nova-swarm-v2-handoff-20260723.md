# Nova Swarm V2 handoff

## Identity

- Repository: `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`
- Remote: `https://github.com/EirikViking/burt-shooter.git`
- Source branch: `codex/post-stable-authoritative-20260720`
- V2 source commit: `90f532e124f48ec15689db64b91c3554eb0b3cd6`
- V2 source tag: `nova-swarm-v2-source-20260723-build24339078`
- Evidence baseline before this handoff: `91e551b9cbf2f8a2b99bed3441ba46c97339f58a`
- V2 handoff branch: `release/nova-swarm-v2-20260723`
- V2 handoff tag: `nova-swarm-v2-handoff-20260723`
- V2 handoff commit: resolve the immutable handoff tag with `git rev-parse nova-swarm-v2-handoff-20260723^{commit}`
- Lock date: 2026-07-23

The source commit is deliberately `90f532e`, not the later evidence commit
`91e551b`: the packaged executable embeds `90f532e`, while `91e551b` adds only
the final Steam upload receipt, progress ledger entry, and payload manifest.

## What V2 includes

This checkpoint contains every committed player-facing improvement between
`nova-swarm-stable-20260720-build24295917` and the source commit above:

- A clearer combat-HUD hierarchy that prioritizes lives, immediate danger,
  bosses, and the active objective while calming secondary score and record
  information.
- Prioritized and deduplicated HUD/toast queues, protected center-lane
  serialization for Flawless Streak, Sector Clear, and Rank Up, and placement
  guards for Ace Contract versus multi-row Active Augments.
- A rebuilt Tactical Draft with compact cards, authoritative before/after stat
  previews, honest contextual-effect descriptions, stack/permanence/synergy/
  Fusion badges, a four-category Active Build command deck, and preserved
  keyboard/gamepad controls.
- Direct return to combat after choosing an augment, a clearer Pause screen,
  improved Ace introductions, and cancellation of menu narration before
  in-game pilot speech begins.
- Premium organic plasma explosions and boss impacts replacing the old stars,
  concentric circles, target rings, simple diamonds, and pixel debris; distinct
  Fusion reveals and multiple non-repeating explosion families.
- Ten Cabinet Wonders with distinct Nova Swarm hero artwork and presentation.
- Thirty unique animated Final Transmission celebrations in a persistent
  no-repeat shuffle, followed by a direct full-frame handoff to the existing
  Game Over results screen.
- Clearer `No Repair Receipts` wording in Steam and all eight in-game
  languages without changing its achievement ID or qualification rules.
- Reduced Tractor-beam whiteout, improved projectile visibility, gentler late
  health scaling, and an 85 HP cap from Sector 20 onward.
- The associated localization, overlap protection, controller, runtime,
  package, and release-evidence updates documented under `docs/release/`.

Scoring, save formats, leaderboard identities, Steamworks identity, Tactical
Draft RNG, upgrade effects, and achievement IDs remain unchanged.

## Validation

The build uploaded as BuildID `24339078` was produced from source commit
`90f532e` as `v2026-07-22_19-34-29`; its embedded Git SHA is `90f532e`.
The committed upload receipt records successful checks for:

- `check:gameover-final-transmissions`
- `check:i18n` and all-eight-language `check:i18n-ui`
- `build:current`, production build, and Windows Electron packaging
- `check:release-line`, Steam SDK readiness, native runtime staging,
  package-runtime contract, payload manifest, and VDF generation
- `git diff --check`

The preceding V2 upload receipts additionally record successful browser,
Electron, controller, packaged-runtime, fresh-profile, and packaged-performance
passes for the HUD, Tactical Draft, Wonders, Pause, Ace, achievement, Tractor,
and VFX changes. The final 30-transmission upload intentionally skipped those
smoke suites at the user's explicit instruction; it changed only the final
transmission assets/configuration and their direct result-screen handoff.

2026-07-23 lock revalidation:

- `git fetch origin --prune --verbose`: pass (initial all-remote fetch timed out;
  the controlled origin retry completed).
- clean tracked/untracked status and `git diff --check`: pass.
- German, top-three localization polish, and production marketing-hotkey
  ancestry: present.
- `npm run check:release-line`: pass.
- `npm run check:i18n`: pass.
- `npm run check:hud-readability`: pass, including normal and boss-priority
  screenshots.
- `npm run check:gameplay-message-overlap`: functional pass with 48 samples and
  a generated report; the wrapper process did not terminate before the outer
  timeout and is recorded as an environment limitation rather than hidden.

No generated test output, credentials, local profiles, caches, `node_modules`,
desktop packages, or other artifacts are included by the handoff commit.

## Steam status and rollback

- AppID: `4765070`
- Windows depot: `4765071`
- Upload target at build creation: `sector-continue-test`
- V2 BuildID: `24339078`
- V2 depot manifest: `7475394859305636484`
- Payload manifest: `410` files, `1,057,951,560` bytes,
  `4a869b310d8db0bc9acbc10a44106b5b08baed56d59fa225adeeda0cd94b2797`
- Executable SHA-256:
  `a9aec18c547f889dffa1b03b920d7f356be8a948f308773cb15abad77b967a22`
- Previous rollback BuildID: `24336526`
- Previous depot manifest: `3787235155057868337`
- Current public/default: BuildID `24339078`, last read-only verified on
  2026-07-22 after its external promotion; the 2026-07-23 anonymous SteamCMD
  refresh timed out and made no state change.
- `test-build`: BuildID `23782673` in the latest read-only evidence.

This V2 lock task performs no Steam upload, branch assignment, Steamworks
setting change, patch-note publication, web deployment, or GitHub Release.

## Continue safely in a new Codex chat

1. Fetch `origin`.
2. Create a new `codex/` development branch and a new isolated worktree from
   `origin/release/nova-swarm-v2-20260723`.
3. Verify exact path, branch, HEAD, clean status, and `git diff --check`.
4. Read repository `AGENTS.md` and this handoff before editing.
5. Treat older Nova Swarm worktrees only as historical evidence, never as
   authority without verification.
6. Preserve achievements, saves, leaderboards, Steam App/Depot identity, and
   public/default Steam state unless explicitly instructed otherwise.
7. Use small focused commits and run the relevant release, localization,
   controller, runtime, package, and performance checks before deployment.

### Paste-ready startup prompt

> Continue Nova Swarm from the immutable V2 handoff at
> `origin/release/nova-swarm-v2-20260723`. Create a new isolated worktree and a
> new `codex/` branch from that exact remote branch. Before editing, fetch and
> report the worktree path, branch, HEAD, clean status, and `git diff --check`;
> read `AGENTS.md` and
> `docs/release/nova-swarm-v2-handoff-20260723.md`. Preserve achievements,
> saves, leaderboards, Steamworks identity, and existing player behavior unless
> I explicitly request a change. Do not touch older Nova Swarm worktrees or
> Steam/public state without explicit authorization. Keep commits focused and
> validate before any build or deployment.
