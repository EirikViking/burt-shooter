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
