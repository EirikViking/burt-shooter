# Nova Swarm Footage Polish Audit

Date: 2026-08-08

Footage: `E:\video-clips\Misfit-galaxy\Desktop\Desktop 2026.08.08 - 16.42.19.03.mp4`

Footage properties: 1920 x 1080, approximately 60 fps, 166.474 seconds

Source baseline: `20822a41f6d3cb1511605375c86f37c9be9a1c99`

Worktree: `D:\vibe-coding-e\codex\nova-swarm-footage-polish-20260808-7c4e`

Branch: `codex/footage-polish-20260808-7c4e`

## Scope and preservation

This was a surgical presentation pass. It preserves the cyan, magenta, and gold art direction and does not change score rules, damage, ship stats, fire rates, movement, enemy spawning, enemy behavior, RNG, mode rules, collision geometry, unlocks, achievements, leaderboard IDs, or leaderboard submission rules.

The only persistence additions are backward-compatible settings fields for UI volume, flash intensity, and reduced motion. Existing saves without those fields continue to use the prior effective presentation defaults.

Steamworks configuration, Steam branches, external production data, and Steam uploads were untouched.

## Runtime ownership map

| Surface | Actual owner |
| --- | --- |
| Combat scene composition, death flow, vignette, transient events | `src/scenes/PlayScene.js` |
| Player body, aura, precision core, movement presentation | `src/entities/Player.js` and `src/scenes/PlayScene.js` |
| Enemy body, identity plates, ordinary health bars | `src/entities/Enemy.js` and `src/utils/EnemyVisualEnhancer.js` |
| Player and hostile projectile behavior/visuals | `src/entities/Bullet.js`, `src/managers/BulletManager.js`, `src/config/EnemyWeaponProfiles.js` |
| Persistent combat HUD and responsive reservations | `src/ui/HUD.js` |
| Game Over and result composition | `src/scenes/GameOverScene.js` |
| Leaderboard/result deck | `src/scenes/HighscoreScene.js` |
| Mode selection and quick launch | `src/scenes/MenuScene.js` |
| Hangar browse/active/launch semantics | `src/scenes/ShipSelectScene.js`, `src/scenes/ShipDetailsScene.js`, `src/utils/ShipSelectionState.js` |
| Mixer, buses, and stored presentation settings | `src/audio/AudioManager.js`, `src/config/AccessibilitySettings.js`, `src/ui/SettingsOverlay.js`, `src/steamCloudPersistence.js` |

## Footage findings and root causes

| Moment | Finding and root cause | Resolution |
| --- | --- | --- |
| 4.1-4.3 s | Major flash was visually strong. Existing effect controls already bounded motion and screen shake, but flash intensity was not independently adjustable. | Added persisted Flash Intensity and applied it to damage-edge alpha. Existing spectacular effects and balance were preserved. |
| 7-9 s | Tactical Draft was coherent and not the source of a production defect. | Deliberately not redesigned. Existing focused and responsive checks still pass. |
| ~24 s | Pilot Order presentation occupied the upper playfield. The repository already had a centralized three-slot notification manager, but `runContractProgress` was incorrectly normalized from its explicit top lane into the generic corner lane. | Preserved the manager, corrected the contradictory route, retained compact Pilot Order banners, and verified at most two transient surfaces. |
| 41.5-43.5 s | The red vertical seam was not a vignette texture or nine-slice defect. It was frozen boss-wall hazard geometry. Final death stopped scene updates while the boss hazard layer and bullets remained rendered. | Final death now removes boss hazards and enemy bullets before freezing combat. Damage feedback uses one seamless filled edge-band vignette with no repeated strokes. |
| 41.5-44 s | Fatal impact reused less of the normal-life-loss language, live combat remained visually present, and positive messages could compete with death. | Fatal source and exact impact position are retained, the destruction cue runs, low-priority toasts/positive ceremonies are suppressed, hazards and hostile bullets are cleared, and the score snapshot/submission path remains once-only. |
| 44-49.57 s | Game Over and leaderboard scenes awaited asynchronous leaderboard data before drawing their first composed frame. That produced the near-black gap and later background pop-in. | Both scenes draw a synchronous branded placeholder before any asynchronous wait, then replace it atomically with the complete screen. Game Over skip debounce is 750 ms. |
| ~60 s | Leaderboard entry had the same asynchronous first-frame ownership problem. | Added the same immediate branded loading composition to `HighscoreScene`. |
| ~70.5 s | Hangar truncation was intentional code: descriptions and weaknesses were shortened by the old teaser helper. `HULL x/30` also mixed browsing position with active selection. | Full localized descriptions now wrap. The header separately states `VIEWING HULL`, `ACTIVE HULL`, and status. Fleet completion stays in the Career panel. |
| ~77.5 s | Ship Details discarded the Hangar context and rendered over an almost empty black field. It also mutated selection too early. | Ship Details retains a dim Hangar backdrop. Browsing is non-mutating; only launch commits the selected hull. |
| ~96.5 s | Preview and active hull were separate concepts, but the UI did not make the difference explicit enough. | Browsing no longer saves. Preview and active hull labels remain visible when different; launch persists the selected hull. Controller X always opens Details and J jumps to the recommendation. |
| ~104.5 s | The right-side mode briefing had Details but no primary execution control. | Added a localized `LAUNCH RUN` button for launchable modes while preserving Enter/controller quick launch and the existing launch path. |
| ~114 s | Constant ordinary full-health bars and equal-weight persistent HUD elements competed with shots and effects. | Ordinary full-health bars are hidden; damaged, durable, elite, Ace, and boss health remains. Score/combo hierarchy is stronger and the high-score chase panel is capped. Existing projectile taxonomy and focus hitbox core were retained and revalidated. |
| ~132 s | An Ace identity plate could enter the permanent upper-left HUD lane while several events were active. | Ace plates choose a safe above/right/left/below render-only position around the enemy and avoid HUD reservations without changing enemy coordinates or colliders. |
| 136-140 s | The apparent combo/Ace collision was the Ace plate entering the score lane. Life-loss feedback could coexist with graze/lore/rank/wave celebration surfaces. | Added left/center/right HUD reservations, moved combo into a stable score lane, made top notifications avoid the high-score group, and suppresses secondary surfaces during life loss. |

## Implemented changes

### Death, transitions, and results

- Final death records the fatal source and exact impact position.
- The final-death freeze clears boss-wall geometry and hostile bullets immediately.
- Damage feedback is edge-weighted filled geometry, not repeated full-screen outlines.
- Normal and final life loss suppress lower-priority graze, lore, rank, and wave celebrations.
- Game Over accepts skip only after 750 ms and keeps automatic continuation.
- Game Over and leaderboard scenes always draw a branded frame before data loading.
- Combat and result displays no longer duplicate the same value as both Level and Sector.

### Combat readability and event hierarchy

- Permanent HUD reservations expose left, center, and right protected regions.
- Score is primary, combo stays in the score lane, and the high-score chase panel is smaller.
- Ace identity plates avoid all reserved regions using render-only placement.
- Ordinary full-health enemy bars are hidden; meaningful health information remains.
- Existing centralized toast queues remain the authority. Death suppresses low-priority content and directive progress respects its authored top lane.
- First-run guidance now also avoids the high-score target panel.
- The known absent service-worker warning is recorded separately in the enemy-variety test; every other browser warning/error still fails it.

### Menu and Hangar clarity

- Mode briefings have a primary `LAUNCH RUN` control with a distinct locked state.
- Hangar descriptions, traits, and weaknesses wrap instead of truncating.
- Viewing and active hulls are explicit; browsing does not silently equip.
- Launch commits the visible selection, preventing a surprising ship at run start.
- Added `VIEW RECOMMENDED [J]`; controller X consistently opens Details.
- Ship Details retains the dimmed Hangar behind it.
- Compact 1280 x 800 layout removes the redundant overlapping first-flight badge.

### Accessibility and audio controls

- Added persisted UI Volume with its own routing for known UI events.
- Added persisted Flash Intensity.
- Added an explicit persisted Reduced Motion toggle while retaining OS preference as the default for old saves.
- Added all new strings to every supported locale.
- Preserved the prior effective default UI gain: master 0.30 x UI 0.40 = 0.12.

## Verified existing behavior, not rewritten

- Tactical Draft structure and values.
- Friendly/hostile projectile taxonomy and high-contrast projectile option.
- Precision/focus hitbox core.
- Screen-shake setting and intensity behavior.
- UI scale, master, music, SFX, and voice persistence.
- Overrun identity presentation and returning-pilot 1.6-second in-play intro contract.
- Run Report content, leaderboard submission rules, achievements, scoring, and all gameplay/collision values.
- Existing parallax, background drift, particles, banking, and thruster response. No extra combat-time blur or particle system was added.

## Files changed

Runtime changes are limited to:

- `src/audio/AudioManager.js`
- `src/config/AccessibilitySettings.js`
- `src/entities/Enemy.js`
- `src/i18n/newestTyrianFeedbackSourceText.js`
- `src/main.js`
- `src/scenes/GameOverScene.js`
- `src/scenes/HighscoreScene.js`
- `src/scenes/MenuScene.js`
- `src/scenes/PlayScene.js`
- `src/scenes/ShipDetailsScene.js`
- `src/scenes/ShipSelectScene.js`
- `src/steamCloudPersistence.js`
- `src/ui/HUD.js`
- `src/ui/HowToPlayOverlay.js`
- `src/ui/SettingsOverlay.js`

Focused checks were extended under `scripts/`, with one new accessibility contract in `scripts/check-footage-polish-accessibility.mjs` and its package script.

## Deliberately not changed

- No new art direction, broad system, dependency, third-party asset, or tactical redesign.
- No gameplay-number, balance, spawn, behavior, fire-rate, hitbox, collider, or RNG change.
- No audio gain increase was made because controlled analysis did not show a clipping or mixer-headroom defect.
- No Steam upload, Steamworks mutation, public post, deploy, push, or external production action.
