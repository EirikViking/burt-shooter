# Nova Swarm - full Steam page audit

Timestamp: 2026-05-23, Europe/Oslo
Mode: read-only audit. No Steamworks values were saved, submitted, priced, released, or published in this pass.

## Executive summary

Nova Swarm is in a much better place than the first pass: the short description is now clear, the About text explains the arcade loop, the checklist is broadly complete, the capsule set is readable, and the new local screenshot candidates are dramatically stronger than the live Steam screenshots.

The biggest conversion leak is still visual proof. The live Steam page is selling the old, darker, quieter version of the game while the current build can show dense enemy pressure and much more arcade chaos. The second biggest risk is metadata trust: the live store currently shows Full Controller Support, but the repo handoff and validation docs still say to stay conservative until a controller-only Steam-client pass proves menus, settings, highscore/text entry, glyph expectations, and Steam Input behavior.

Priority order:

1. Replace/reorder screenshots with the new action-heavy set.
2. Resolve the Full Controller Support claim: validate it fully or downgrade to Partial Controller Support.
3. Clean up tags so they attract arcade/shmup players without overpromising.
4. Fix support/contact links without using `https://novaswarm.tinyfoundry.app`.
5. Review language flags and AI disclosure for accuracy.
6. Wait for the new gameplay footage, then replace the trailer with a faster gameplay-first cut.

## Current scorecard

| Category | Current score | After recommended fixes | Main reason |
|---|---:|---:|---|
| First impression | 6.5/10 | 8/10 | Capsules are readable, but current screenshots/trailer do not yet show the best current build. |
| Clarity | 7.5/10 | 8.5/10 | Copy now says arcade score-chaser/shoot 'em up clearly. |
| Visual appeal | 6/10 | 8/10 | Current live screenshots are sparse/dark; new action candidates are much stronger. |
| Trailer effectiveness | 5/10 | 7.5/10 | Existing trailer is acceptable, but first 5-10 seconds are not punchy enough. |
| Screenshot effectiveness | 3.5/10 | 8.5/10 | Live first screenshots undersell action; new candidates solve this. |
| Description quality | 7/10 | 8/10 | Good structure; can be tightened slightly and aligned with exact features. |
| Tag/discoverability quality | 5.5/10 | 7.5/10 | Current tags include useful tags plus risky/noisy ones like Casual and possibly Bullet Hell. |
| Trust/professionalism | 6.5/10 | 8/10 | Checklist is complete, but controller/language/support/AI details need accuracy review. |
| Wishlist conversion potential | 5.5/10 | 8/10 | The game needs action-first media and sharper metadata alignment. |

## Biggest bottlenecks

1. Live screenshots are stale and low-action.
   - Current live set shows dark, sparse scenes and boss telegraphs with little enemy density.
   - The local `steam-upload-candidates-2026-05-23-action` set is much closer to what players need to see.

2. Full Controller Support may be overclaimed.
   - Live Steam preview shows Full Controller Support and Xbox Controllers.
   - Local repo docs still recommend Partial Controller Support until Steam-installed validation proves every required flow.
   - This is a trust/review risk, not just a marketing choice.

3. Tag mix is not tight enough.
   - Arcade, Shoot 'Em Up, Score Attack, Space, Action, 2D, Sci-fi, Top-Down Shooter are on target.
   - Casual can attract the wrong audience if the game is score-chase arcade pressure.
   - Bullet Hell is only safe if the first screenshots/trailer show enough projectile density and dodging.

4. Support/contact setup is not professional enough.
   - Support info currently appears to be an email value in a URL-shaped field.
   - The public playable web URL must not be used as website/support because it gives Steam users access to a free version.

5. Language and AI disclosure need owner verification.
   - English is marked for Interface, Full Audio, and Subtitles. If the game has no voiced dialogue/subtitle system, this should probably be Interface only.
   - The AI disclosure says generative AI was used for code assistance. If art, audio, copy, trailer assets, or store assets used generative AI, the disclosure should be reviewed.

## Full inventory

| Area | Current value / status | Problem or opportunity | Why it matters | Suggested fix | Impact | Effort | Risk | Can I implement directly? |
|---|---|---|---|---|---|---|---|---|
| Store overview | Name `Nova Swarm`; genre Action/Indie; Coming Soon; Windows only. | Overall coherent. Needs media alignment. | Players decide mostly from first media row. | Keep overview, improve screenshots/trailer/tags. | High | Medium | Low | Yes, after approval. |
| Short description | `A fast modern arcade score-chaser...` | Strong and clear. Could be slightly tighter if desired. | This is one of the highest-visibility text fields. | Keep or use one revised variant below. | Medium | Low | Low | Yes. |
| About This Game | Clear headings, loop, bosses, ships, quick restarts, keyboard/controller support. | Good, but a little wordy and controller wording should match final category. | Description should reinforce exact player action, not vague promise. | Optional tightened version below. | Medium | Low | Low | Yes. |
| Screenshots | 5 live screenshots, old/dark/sparse. | Biggest current page weakness. | Steam carousel needs instant gameplay proof. | Upload 8 new action screenshots, first 4 dense swarm shots. | High | Medium | Low/Medium | Yes if upload UI cooperates; otherwise assisted/manual. |
| Trailer | One gameplay trailer, about 38s. | First seconds do not sell the current high-action build hard enough. | Trailer thumbnail/first seconds drive trust. | Defer until today's new gameplay video; cut a fast gameplay-first trailer. | High | High | Medium | Yes after footage and approval. |
| Capsules | Header/main/small/library readable; title legible. | Small capsule is a bit soft; art is more illustrated than actual gameplay. | Capsules must read at tiny size and set genre expectation. | Keep for now; later sharpen small capsule and consider gameplay-aligned variant. | Medium | Medium | Low | Needs asset approval. |
| Tags | Live tags include Arcade, Bullet Hell, Shoot 'Em Up, Action, Retro, Space, Sci-fi, Score Attack, Casual, Shooter, Top-Down Shooter, 2D, Colorful, Top-Down, 1980s, 1990's, Aliens, PvE, Singleplayer. | Some good, some noisy/risky. | Tags drive discovery and expectation matching. | Reorder/trim toward Arcade, Shoot 'Em Up, Score Attack, Space, Top-Down Shooter, Action, 2D, Sci-fi, Retro, Singleplayer. | High | Low | Medium | Yes after approval. |
| Genre/category | Action + Indie; Single-player; Full Controller Support shown live. | Genre is fine. Controller category needs validation. | Overclaiming controller support can trigger refunds/review friction. | Validate full controller support or downgrade to Partial. | High | Medium | Medium | Yes after decision. |
| Feature flags | Single-player, Family Sharing, Profile Features Limited, Full Controller Support, Xbox Controllers. | Missing achievements/cloud/accessibility; controller claim uncertain. | Feature flags affect store trust and filtering. | Add only accurate features; do not add achievements/cloud until implemented. | Medium | Medium | Medium | Some direct, some require implementation. |
| Languages | English marked Interface, Full Audio, Subtitles. Norwegian unsupported, but stale Norwegian text exists in hidden/localized data. | Full Audio/Subtitles may be inaccurate; stale Norwegian should be cleaned or completed. | Language table can mislead players. | Verify audio/subtitle reality; clean Norwegian draft or fully localize later. | Medium | Low/Medium | Medium | Yes after owner decision. |
| Mature content | Generated ratings: Brazil 10, Germany violence; fantasy/cartoon violence style categories. | Seems plausible for arcade fantasy violence. | Incorrect descriptors can block/review-risk. | Owner final review only; no change unless inaccurate. | Medium | Low | Medium | Needs owner judgment. |
| AI disclosure | Says generative AI used as development assistance for some code. | May be incomplete if AI was used for art/audio/copy/assets. | Steam AI disclosure accuracy matters. | Owner/legal review; update disclosure if AI-generated assets/audio are in shipped game. | High | Low | Medium/High | Needs owner judgment. |
| Release date/status | Release date set for 2026-06-08 21:53 CEST; customers see Coming Soon; review queues active. | Do not touch. | Release/review settings are irreversible/high-risk operational controls. | Leave unchanged unless explicitly instructed. | High | Low | High | No. |
| System requirements | Windows 10 min, i3/equiv, 4GB RAM, DX11 GPU, 1GB; recommended Windows 10/11, i5/equiv, 8GB RAM, DX11, 1GB. | Mostly acceptable; notes mention controller. | Prevent mismatch/refunds and storage underclaim. | Keep 1GB; soften controller note if downgraded. | Medium | Low | Low | Yes after approval. |
| Store checklist | Required store checklist appears complete. Store/build submitted for review May 20. | Recommended Cloud Saves, Achievements, Accessibility not configured. | Complete required checklist is good; recommended features can improve trust. | Do not add Cloud/Achievements until implemented; consider Accessibility if verified. | Medium | Medium | Medium | Partly. |
| Community assets | App icon and shortcut icon complete. | No immediate issue. | Required for community/store polish. | Keep. | Low | Low | Low | No change. |
| Library assets | Library capsule, hero, logo present and readable. | Logo placement/art style okay; may need final visual QA after release. | Library assets affect owner/player library presentation. | Keep; optional later polish. | Low | Medium | Low | Needs asset approval. |
| Broadcast/marketing sections | Broadcast config present; no active marketing section issue observed. | No immediate launch blocker. | Broadcast setup is not core conversion unless events are planned. | Leave unchanged. | Low | Low | Low | No change. |
| Developer/publisher | Tiny Foundry. | Looks coherent. | Trust and brand consistency. | Keep. | Low | Low | Low | No change. |
| Links/social/support | Website/social mostly empty; support appears as `cromkake@gmail.com`; do not use free web build URL. | Support field needs professional URL/email handling. | Broken/odd support info reduces trust and can fail QA. | Use dedicated support/contact page or correct support-email field. | Medium | Low/Medium | Medium | Needs URL/decision. |

## Store page quality review

Core fantasy:
Clear enough in text: compact arcade sci-fi score-chaser, dodge swarms, beat bosses, restart quickly. The current media does not make that fantasy obvious fast enough.

Genre within 5 seconds:
Text says it. Capsules imply sci-fi action. Current screenshots are the weak link. The first screenshot should be dense gameplay, not quiet early-wave or empty dark space.

Hook:
The best hook is "fast score-chase runs with dense readable swarms and boss pressure every level." That should be the first visual and the first trailer moment.

First four screenshots:
Current live first four should be replaced. Recommended first four:

1. `01-heavy-grid-swarm.png` - immediate enemy density and readable formation.
2. `02-crossfire-pincer-swarm.png` - movement pressure and screen control.
3. `03-elite-swarm-overload.png` - escalation and elite threat.
4. `04-orbit-ring-chaos.png` - beautiful chaos, bullets, enemies, arcade payoff.

Text:
The copy is now mostly concrete. It talks about runs, waves, bosses, ships, score, restarts. Avoid adding lore-heavy or generic language.

Keywords:
Likely useful: arcade, shoot 'em up, shmup, score attack, top-down shooter, space shooter, boss fights, retro, single-player, controller.

Inconsistencies:

- Live Full Controller Support vs local conservative controller docs.
- Live screenshots vs current build action level.
- Live Bullet Hell tag vs current media not yet strongly showing bullet-hell density.
- English Full Audio/Subtitles flags may overstate localization if no voiced/subtitled dialogue exists.

Wishlist optimization:
Once screenshots are replaced and controller/tags/support are cleaned, the page should feel much more wishlist-ready.

## Copywriting recommendations

The current short description is good. I would only change it if you want slightly cleaner rhythm.

Short description variants:

Safe/polished:

> Dodge dense sci-fi swarms, blast through boss pressure, grab chaotic bonus cores, and restart instantly in a fast arcade score-chaser.

More aggressive:

> Survive readable swarms, melt bosses, cash in chaotic bonus cores, and chase a higher score in a fast arcade shooter built for instant retries.

Indie/personality-driven:

> A neon arcade panic loop: tiny ship, loud swarms, rude bosses, bonus cores, and the dangerous belief that the next run will be cleaner.

Recommended About This Game replacement:

```text
[h2]Fast Arcade Runs, Loud Swarms[/h2]
Nova Swarm is a compact sci-fi arcade shoot 'em up built around quick runs, readable enemy pressure, boss fights, and one-more-run score chasing.

Pick a ship, launch into the swarm, and fight through escalating waves. Every run is easy to start and quick to restart, but staying alive while the screen fills with enemies takes focus.

[h2]Dodge, Fire, Score, Repeat[/h2]
Keep moving, keep shooting, and look for openings. Bonus cores and close-call moments can turn an ordinary run into a new personal target, while clean boss clears keep the pace moving forward.

[h2]Boss Pressure Every Level[/h2]
Boss encounters bring beams, rings, telegraphs, and attack patterns that change the rhythm of each level. Learn the patterns, hold your nerve, and squeeze out a better score.

[h2]Ships And Quick Restarts[/h2]
Try different ships from the hangar, chase a cleaner run, and jump back in fast when everything falls apart.

[h2]Features[/h2]
[list]
[*]Fast sci-fi arcade shoot 'em up runs
[*]Dense but readable enemy swarms
[*]Boss fights with clear telegraphs and escalating pressure
[*]Score-focused bonus moments and quick retries
[*]Different ships to try from the hangar
[*]Keyboard support and controller support
[*]Built for short sessions and one-more-run improvement
[/list]

Wishlist Nova Swarm if you want a compact arcade shooter about dodging swarms, fighting bosses, and chasing a cleaner run.
```

Feature bullet guidance:

- Use "keyboard support and controller support" unless Full Controller Support is fully validated.
- Do not mention Steam achievements, Steam Cloud, global leaderboards, online leaderboards, co-op, roguelite progression, or full controller support unless proven.
- Keep bullets concrete: swarms, bosses, score, ships, restarts, controls.

Localization:

- If only English is supported, remove stale Norwegian localized text or leave Norwegian fully unsupported and hidden.
- If you want Norwegian later, localize short description/About/system strings as a proper complete pass, not partial hidden legacy text.

## Screenshot review

Live screenshots:

- Current screenshot 1: too dark/sparse; does not show the hook.
- Current screenshot 2: boss telegraph but limited action.
- Current screenshot 3: dark boss scene, not enough immediate readability.
- Current screenshot 4: boss circle/single projectile, low density.
- Current screenshot 5: first wave, acceptable as a later screenshot but too quiet for first impression.

Keep/remove/reorder:

- Replace all 5 live screenshots with the 8 new candidates.
- First four should be all action, not menu/story/score.
- Put ship hangar later, not first.

Recommended upload order:

1. `release/steam-screenshots/steam-upload-candidates-2026-05-23-action/01-heavy-grid-swarm.png`
2. `release/steam-screenshots/steam-upload-candidates-2026-05-23-action/02-crossfire-pincer-swarm.png`
3. `release/steam-screenshots/steam-upload-candidates-2026-05-23-action/03-elite-swarm-overload.png`
4. `release/steam-screenshots/steam-upload-candidates-2026-05-23-action/04-orbit-ring-chaos.png`
5. `release/steam-screenshots/steam-upload-candidates-2026-05-23-action/05-first-boss-fight.png`
6. `release/steam-screenshots/steam-upload-candidates-2026-05-23-action/06-vortex-boss-telegraph.png`
7. `release/steam-screenshots/steam-upload-candidates-2026-05-23-action/07-ship-hangar.png`
8. `release/steam-screenshots/steam-upload-candidates-2026-05-23-action/08-first-wave-gameplay.png`

Missing screenshot types after this set:

- A late-run "beautiful chaos" shot with even more bullets/enemies if the build can produce it cleanly.
- A score payoff/game-over screen only if it clearly shows "one more run" motivation and not a failure state.
- A controller/hangar shot only if controller support is kept as a major feature.

## Trailer review

Current trailer:

- Usable, but not optimal.
- The first 5-10 seconds are not as strong as the new screenshot direction.
- It should show gameplay instantly, then boss pressure, then score/restart/ship variety.

Recommendation:

- Do not replace it until the new gameplay footage is ready.
- When footage arrives, create a 35-45 second Steam trailer:
  - 0-3s: dense swarm gameplay, no slow title buildup.
  - 3-12s: dodging, firing, enemies filling screen.
  - 12-22s: boss telegraphs and payoff.
  - 22-32s: bonus cores, ship variety, quick restart/score chase.
  - 32-40s: title/logo/wishlist.

## Asset review

Capsules and library assets are acceptable for now.

Strengths:

- `NOVA SWARM` reads clearly on header/main/library assets.
- Colorful sci-fi art communicates arcade action.
- Library hero/logo set is coherent.

Weaknesses:

- Small capsule is slightly soft at tiny size.
- Art style is more illustrated/space-action than the actual minimal neon gameplay, so the page relies on screenshots to set accurate expectations.

Recommended later asset work:

- Sharpen small capsule title contrast.
- Consider a variant with a small readable player ship/enemy swarm silhouette, but do not replace current capsules unless the new version is clearly better at 231x87 and 616x353.

Exact asset list to keep available:

- Header capsule: 460x215 JPG/PNG.
- Small capsule: 231x87 JPG/PNG.
- Main capsule: 616x353 JPG/PNG.
- Library capsule: 600x900 source / Steam-compatible vertical library capsule.
- Library hero: 3840x1240 source / Steam-compatible hero.
- Library logo: transparent PNG.

## Tags, categories, and discoverability

Recommended tag order:

1. Arcade
2. Shoot 'Em Up
3. Score Attack
4. Space
5. Top-Down Shooter
6. Action
7. 2D
8. Sci-fi
9. Retro
10. Bullet Hell, only if the new screenshots/trailer show enough projectile dodging
11. Singleplayer
12. Controller, only if controller support remains a meaningful selling point
13. Colorful
14. PvE
15. Indie or Shooter

Recommended demotions/removals:

- Casual: risky unless the game is intentionally easy/relaxed. It may attract the wrong player.
- 1980s / 1990's: low-value unless the store copy/media strongly lean on era nostalgia.
- Aliens: only keep if enemies are clearly alien-coded, not just space enemies.
- Top-Down: redundant if Top-Down Shooter is already high.

Controller:

- If the Steam-installed build passes a controller-only QA pass, keeping Full Controller Support is defensible.
- If not, downgrade to Partial Controller Support before public visibility.

Steam Deck:

- Do not claim Steam Deck readiness until the packaged Steam build is tested on Deck or a close Linux/Proton path.

Accessibility:

- Repo evidence shows settings for screen shake, player focus, and color assist.
- Steamworks recommended Accessibility Features are not configured.
- Add only the exact supported accessibility feature flags after checking Steam's field wording and verifying the settings in the shipped build.

## Steamworks checklist and technical completeness

Must fix before launch/review:

1. Screenshots: replace old screenshots with current action-heavy screenshots.
2. Controller category: validate Full Controller Support or downgrade.
3. Support link: use a proper support/contact destination, not the free web build URL.
4. AI disclosure: owner must verify if AI use extends beyond code assistance.
5. Language table: verify whether English Full Audio/Subtitles are truthful.

Nice to improve:

1. Tag cleanup.
2. Optional About text tightening.
3. New gameplay-first trailer when footage arrives.
4. Accessibility feature flags if the Steamworks options match actual settings.
5. Small capsule sharpness pass.
6. Steam Cloud and achievements later, only after implementation and QA.

Do not touch without explicit approval:

- Release date/time.
- Release state or publish/release button.
- Submit/resubmit for review.
- Pricing/discounts/packages.
- Tax, payout, financial, legal account settings.
- Existing assets deletion.
- AI/content descriptor changes unless owner confirms accuracy.

## Prioritized action plan

### A. Critical fixes

- Item: Replace live screenshots with the new action-heavy set.
- Why it matters: Current screenshots undersell the latest build and likely lower wishlists.
- Proposed change: Upload/reorder the 8 files in `release/steam-screenshots/steam-upload-candidates-2026-05-23-action/`.
- Requires my approval? Yes.
- Requires new asset from me? No.

- Item: Resolve Full Controller Support.
- Why it matters: Live Steam page currently claims Full Controller Support, while repo docs still say this is not fully validated.
- Proposed change: Run a controller-only Steam-client QA pass. If it passes, keep Full. If not, downgrade to Partial.
- Requires my approval? Yes.
- Requires new asset from me? No.

- Item: Fix support/contact setup.
- Why it matters: Support info looks unprofessional and the free web build URL must not be used.
- Proposed change: Add an owner-approved support/contact URL or use the correct support-email field if Steamworks supports it.
- Requires my approval? Yes.
- Requires new asset from me? Yes, if no dedicated support URL exists.

- Item: Verify AI disclosure.
- Why it matters: Steam's AI disclosure should match shipped code/assets/audio/store content.
- Proposed change: Owner confirms exact AI use; then update disclosure only if needed.
- Requires my approval? Yes.
- Requires new asset from me? No.

### B. High-impact conversion improvements

- Item: Clean tag order.
- Why it matters: Better tags improve discovery and reduce mismatched expectations.
- Proposed change: Prioritize Arcade, Shoot 'Em Up, Score Attack, Space, Top-Down Shooter, Action, 2D, Sci-fi, Retro, Singleplayer; demote/remove Casual and era tags unless intentionally central.
- Requires my approval? Yes.
- Requires new asset from me? No.

- Item: Trailer replacement after new gameplay footage.
- Why it matters: First 5-10 seconds need immediate action.
- Proposed change: Build a 35-45s gameplay-first Steam trailer from today's new footage.
- Requires my approval? Yes.
- Requires new asset from me? Yes, the new gameplay video.

- Item: Language flag cleanup.
- Why it matters: Full Audio/Subtitles may overpromise if there is no voiced/subtitled English content.
- Proposed change: Set English language flags to only the accurate columns.
- Requires my approval? Yes.
- Requires new asset from me? No.

- Item: Accessibility feature flags.
- Why it matters: The game appears to have real settings for shake/focus/color assist; accurate flags improve trust.
- Proposed change: Verify settings in the shipped build and add matching Steam accessibility metadata.
- Requires my approval? Yes.
- Requires new asset from me? No.

### C. Polish improvements

- Item: Optional About text tightening.
- Why it matters: Current copy is good, but can be cleaner and more direct.
- Proposed change: Use the recommended About version above or a lighter edit.
- Requires my approval? Yes.
- Requires new asset from me? No.

- Item: Remove stale Norwegian localized draft or complete Norwegian localization.
- Why it matters: Hidden stale localized text can create confusing future edits.
- Proposed change: Keep English-only cleanly for now, or do a full Norwegian localization later.
- Requires my approval? Yes.
- Requires new asset from me? No.

- Item: Small capsule sharpening.
- Why it matters: Small capsule readability matters in lists and recommendations.
- Proposed change: Produce/test a sharper small capsule variant.
- Requires my approval? Yes.
- Requires new asset from me? Possibly.

- Item: Steam Cloud and achievements roadmap.
- Why it matters: Both are wishlist/trust boosters, but only if implemented.
- Proposed change: Defer for launch unless you want implementation work now.
- Requires my approval? Yes.
- Requires new asset from me? No.

### D. Things I recommend NOT changing

- Item: Release date/release status/review queue.
- Reason: High-risk operational settings; only change with explicit instruction.

- Item: Pricing/packages/discounts.
- Reason: Commercial settings are outside optimization scope and irreversible enough to require explicit owner action.

- Item: Current capsule set before screenshots are fixed.
- Reason: Capsules are acceptable; screenshots are the higher-impact visual problem.

- Item: Steam Cloud/Achievements feature flags.
- Reason: Do not advertise until code integration and Steam-client validation exist.

- Item: Steam Deck compatibility.
- Reason: Do not claim until tested on Deck/Proton.

## What I can do for you after approval

1. Back up the current Steamworks values and upload/reorder the 8 new screenshots.
2. Run a controller-only validation pass and then either keep Full Controller Support or change it to Partial.
3. Clean the Steam tags to the recommended order.
4. Fix support/contact fields once you provide or approve a safe URL.
5. Clean language flags and stale Norwegian localization.
6. Verify accessibility settings in the current build and add only accurate accessibility metadata.
7. Create the new trailer when you provide today's gameplay video.
8. Re-run Steam preview QA after each approved change and produce a changelog.

## Evidence/artifacts reviewed

- Live Steamworks/store preview data captured from current Steamworks pages and store preview.
- Live screenshot/asset downloads in `test-results/steam-page-audit-2026-05-23/`.
- New local screenshot candidates in `release/steam-screenshots/steam-upload-candidates-2026-05-23-action/`.
- Existing Steam asset contact sheets in `release/steam-assets/draft-2026-05-17-nova-swarm/review/`.
- Existing trailer contact sheet in `release/steam-trailer/candidate-2026-05-17-current/`.
- Store draft metadata in `release/steamworks/store_metadata_draft.json`.
- Prior Steamworks report in `release/steamworks/steamworks_refresh_2026-05-23_followup_report.md`.
- Controller/Steam-feature repo evidence in `docs/steam-store-handoff.md`, `scripts/check-steam-store-metadata.mjs`, `src/config/AccessibilitySettings.js`, `src/ui/SettingsOverlay.js`, and Steam leaderboard bridge docs/code.

