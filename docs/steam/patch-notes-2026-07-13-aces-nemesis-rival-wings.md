# Nova Swarm Patch Notes - Aces, Nemesis Protocols & Rival Wings

Document timestamp: 2026-07-13 CEST

Status: publish-ready Steam News draft. Do not publish until explicitly approved. The candidate is available only on `sector-continue-test`; the public/default branch has not been changed.

Latest public Steam note reviewed: `Nova Swarm Patch Notes: Tactical Draft & Run-Build Update`, published 2026-07-11.

Candidate build: Steam BuildID `24178758`, packaged from source commit `b4ee0e3` as `v2026-07-13_08-29-30` and assigned only to `sector-continue-test`.

## Steam Event Fields

- Title: `Nova Swarm Patch Notes: Aces, Nemesis Protocols & Rival Wings`
- Subtitle: `Optional directives, elite hunts, coordinated wings, and 22,000 new tactical variants.`
- Summary: `Hunt marked Aces, complete optional directives, and face 22,000 deterministic tactical variants.`
- Event type: `A Game Update`
- Update type: `Small Update / Patch Notes`

## Steam News Draft

Hi pilots,

Tactical Draft gave every run a build. This update gives the battlefield something new to do with it.

Nova Swarm now layers optional Side Directives, marked Ace hunts, Nemesis Protocols, and coordinated Rival Wings into the existing arcade run. Together they add exactly **22,000 deterministic tactical variants** without adding filler enemies or changing what a destroyed enemy is worth.

`{{STEAM_IMAGE_ACE_NEMESIS_WING}}`

[h2]1,000 Tactical Directives[/h2]

One optional Side Directive is active at a time, with live progress and the promised reward visible in Mission Status.

[list]
[*]10 objective families, from hostile quotas and combo peaks to grazes, Phase uses, support hunts, and boss hunts.
[*]10 intensity tiers that open up as the run gets deeper.
[*]10 reward programs, including shields, Drones, Point Defense, speed, firepower, and extra Tactical Draft rescans.
[*]Up to five completed directives per run, with deterministic selection and no immediate repeats.
[/list]

They are optional micro-goals: take the risk when it fits your build, ignore it when staying alive is the better plan.

[h2]1,000 marked Ace Bounties[/h2]

Every sector can promote one existing enemy into a marked Ace. Aces carry a gold threat frame, a four-digit identity, a distinct chassis/flight/weapon package, and a visible hardware reward contract.

The catalog combines 10 chassis, 10 flight patterns, and 10 weapon packages for **1,000 mechanically distinct Ace Bounties**. The Ace replaces an ordinary enemy rather than adding another target, and it preserves that enemy's original score value exactly.

[h2]10,000 Nemesis Protocols[/h2]

An Ace can now arrive with a five-digit Nemesis Protocol built from four real combat axes:

[list]
[*]10 openings that change how it enters the wave.
[*]10 defenses that alter how its armor answers damage.
[*]10 enrage phases with visible hull thresholds and different movement or weapon transformations.
[*]10 bonus rewards that drop alongside the original Ace contract.
[/list]

That creates **10,000 Nemesis Protocols**. Damage guards are bounded, enrages trigger only once, and bonus rewards add no score or XP.

[h2]10,000 coordinated Rival Wing Doctrines[/h2]

The Ace's surviving escorts are no longer a loose crowd. They can receive a shared Rival Wing Doctrine with a formation, combat discipline, synchronized volley, and morale response.

Spearheads, pincers, orbiting formations, crossfire, staggered lances, revenge rushes, fighting retreats, and shield-wall responses now create **10,000 coordinated wing doctrines**. If morale changes while an escort is still entering, it inherits the active response instead of arriving on the wrong page of the battle plan.

Across the Ace, Nemesis, and Wing catalogs, the system supports **100 billion possible complete elite set-pieces**. The important part is not the number by itself: the identity, behavior, danger, and reward are all visible while you play.

`{{STEAM_IMAGE_LATE_SWARM}}`

[h2]Tactical Draft got smarter[/h2]

[list]
[*]Hold one offer for the next boss Draft when the current timing is wrong.
[*]Run Doctrines now name the identity your build is becoming, from focused archetypes to hybrid builds and Nova Synthesis.
[*]Draft cards forecast whether a choice builds, reinforces, evolves, or leaves the current doctrine unchanged.
[*]Repeatable augments gain unique Stack-II evolution identities while preserving the existing bounded stack math.
[/list]

[h2]Readable, persistent, and localized[/h2]

[list]
[*]Mission Status, pause, How To Play, Run Summary, Game Over, and Run Report all expose the new systems.
[*]Run Report v8 records completed Directives, Ace contracts, Nemesis Protocols, and Rival Wing history.
[*]Threat frames, identity labels, rewards, surge warnings, and morale states remain visible in accessible text state.
[*]All player-facing copy is localized in English, German, Spanish, Brazilian Portuguese, Russian, Japanese, Korean, and Simplified Chinese.
[/list]

[h2]Fairness and compatibility[/h2]

This update does not change score or XP formulas, leaderboard identity, achievement IDs, enemy-count score opportunity, save identity, or Steam Cloud paths. Aces and Wings transform existing encounters; they do not manufacture extra scoring targets.

The goal is simple: more runs worth remembering, more tactical stories inside the arcade rhythm, and more reasons to make one dangerous decision before Mission Control notices.

Tiny Foundry

## Selected Screenshots

1. New-system proof, 1920x1080: `test-results/ace-bounties-2026-07-13T00-35-41-404Z/ace-bounty-1920x1080.png`
2. Late-sector action, 1920x1080: `release/steam-screenshots/store-refresh-20260711-curated/01-late-sector-swarm.png`

## Internal Publish Checklist

- Keep the Steam event `Hidden, Unpublished` until approval.
- Upload both selected screenshots and replace the two image placeholders with Steam-hosted `[img]` tags.
- Confirm the preview renders both images, all headings, and all lists cleanly.
- Before publication, deliberately promote BuildID `24178758` or a newer verified candidate to the intended public/default branch.
- Re-run `npm run check:release-line` immediately before any packaging, upload, deploy, or build promotion.
- Confirm Steam's AI disclosure has been corrected before or alongside publication; the current public disclosure is known to be too narrow.
- Do not change score, XP, leaderboard, achievement, Steam Cloud, pricing, AppID, depot, or unrelated Steamworks settings as part of the announcement flow.

## Verification Evidence

- `npm run check:release-line` - PASS on 2026-07-13.
- Candidate BuildID `24178758` uploaded successfully to `sector-continue-test` only.
- Packaged smoke, packaged keyboard/gamepad controls, fresh-profile isolation, desktop package integrity, current Electron smoke, and packaged performance previously passed for the exact candidate.
- Packaged performance: 60.00 average / 60.00 minimum FPS across 12 samples with zero errors.
- Latest public Steam note body verified through the Steam News API before drafting.
- Both screenshots visually inspected at their original 1920x1080 resolution.
