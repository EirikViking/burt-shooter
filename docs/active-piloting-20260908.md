# Active piloting and Cabinet Wonders — 2026-09-08

Approved scope: Tyrian feedback items 1, 2 and 4 only. Baseline 830fc3b9e4315bc7f48cca844ca60e62f900e7f2, branch codex/astra-visual-overhaul, verified clean and uniquely owned before editing. No boss personality, directional shard aiming, legacy-art mode or unrelated changes.

## Behavior

- Vulnerable bullet grazing has a 22px margin beyond combined collision radii (previously 12px). Distinct bullets count individually; each bullet rewards once. Protected flight and ship grazes retain the 450ms limit. Feedback bursts are limited without dropping streak credit. The existing precise hitbox appears as a bullet approaches; collision radii are unchanged.
- Phase Reactor retains instant reload and charges the next normal volley for 1.8 gameplay seconds, with 50% more damage. The charge is consumed once; Bombs do not consume it. Interrupted dodge/life loss clears it.
- Rift retains its five-shard cap and score-neutral targeting. Per-shard damage is max(weapon damage * 1.25, 2 + (clamped sector - 1) * 0.3); sector scaling caps at 200. Innate and Phase pulse support are preserved.
- Cabinet Wonders use a larger adaptive footprint and luminous screen blending instead of an opaque framed card. HUD reservations and the lower 35% player lane remain clear. Cadence, transition timing, reduced-motion support and input release are unchanged. Existing authored artwork and audio are reused.
- Five changed descriptions/help strings are translated across all eight supported languages. No new untranslated text or audio.

## Verification

Passed focused distinct/duplicate/protected graze and collision fixtures, Reactor one-volley/cancel/expiry checks, five-shard scaling through sectors 6/50/100/200/300, existing dodge-pulse contracts, Graze Break input/pause/re-earn checks, and all 60 Wonder variants plus eight-language captures and transition/input comparisons. The graze harness was corrected to use three distinct bullets. Initial enlarged Wonder layout exposed insufficient space under transition messages; adaptive height corrected this and the final suite passed.

Evidence: test-results/active-piloting. Production, native packaging and Steam delivery receipts will be recorded after completion. These checks establish mechanical behavior, not human balance or enjoyment. Earlier isolated sector-90 stall and inherited pacing/Overrun test limitations remain unresolved. No full campaign, real leaderboard submission or Cloud round trip is claimed.

Steam target remains sector-continue-test only; no public promotion, Steamworks settings or announcements are authorized by this pass. Source rollback is a git revert of this runtime commit after checking ownership and clean status; it does not roll Steam back.

## Final candidate validation

Runtime commit: **78a41f0**. Production `build:current` and its guard chain passed; `check:release-line`, `check:i18n`, 80 final production i18n UI captures, controller-only flow and Steam bridge checks passed. Sixteen additional production captures cover Reactor/Rift details across all eight languages; inspected German Reactor and Japanese Rift for layout. Native package staging/runtime checks and isolated packaged mechanics checks passed, including Bomb charge preservation; no page errors. Source, production-preview and packaged QA sessions were closed.

The skill input client was run. Its bundled browser was absent, so a local copy used installed Chrome. Its canvas extraction produced a black image despite live gameplay state; compositor screenshot capture showed gameplay correctly. This was a capture-method limitation, not evidence of a black game screen. Input-client evidence is under `input-client-page`; no full playthrough or human balance claim.

Exact executable: `test-results/astra-build-2026-09-08T11-13-35-722Z/win-unpacked/Nova Swarm.exe`. Upload payload: 410 files, 1,687,926,381 bytes. The archive was verified to contain runtime 78a41f0. Payload hashes and Steam upload material: `test-results/active-piloting-steam-78a41f0/`.

Changed files: Player.js, PlayScene.js, TacticalDraft.js, HowToPlayOverlay.js, activePilotingText.js and all eight locale files, plus three existing graze/Wonder checks and this delivery documentation. No public artwork/audio files changed. No newly untranslated strings; existing proper names remain intentional. Source rollback from a verified clean checkout: `git revert 78a41f0`.

## Steam delivery

Server verified **2026-09-08 11:30:37 UTC**: `sector-continue-test` **25185903**, depot 4765071 manifest **2395758064661931684**. Public remains **25169120**, `test-build` remains **23782673**, Cloud configuration unchanged. No public promotion, announcements or Steamworks settings changes. ASAR SHA256: `78228970c23b9db309d8e049d09601b0ab95640610c1d800ebbb02469c246cfa`. See `docs/active-piloting-steam-delivery-20260908.json` for the verified receipt. Previous test build **25184837** remains the Steam rollback reference; changing Steam back is a separate deployment action.
