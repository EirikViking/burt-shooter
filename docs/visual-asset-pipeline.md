# Visual Asset Pipeline

This project keeps generated visual assets in `public/art/generated/` when they are used by the game. Keep the original generated source alongside the optimized runtime asset so later passes can crop, recompress, or replace it without hunting through local Codex caches.

## 2026-05-23 Elite Middle Ships

- Source sheet: `public/art/generated/nova-swarm/source/nova-elite-middle-ships-20-sheet-20260523-source.png`
- Runtime assets: `public/art/generated/nova-swarm/elites/nova-elite-middle-01-tractor-puller-20260523.png` through `nova-elite-middle-20-late-game-elite-hunter-20260523.png`
- Review sheet: `public/art/generated/nova-swarm/elites/nova-elite-middle-ships-contact-sheet-20260523.jpg`
- Optimization: built-in Codex imagegen produced a 5x4 atlas on flat chroma green; the atlas was split into 20 transparent PNGs, trimmed, padded, and normalized for the existing Pixi loader.
- Usage: `src/config/EliteMiddleShips.js`, `src/assets/assetManifest.js`, `src/utils/GameAssets.js`, `src/entities/Enemy.js`, and `src/managers/EnemyManager.js` use these as rare priority threats between normal waves and bosses.
- Verification: `npm run check:elite-ships`, `npm run build:current`, and evidence capture under `test-results/elite-middle-ships/`.

Prompt summary:

> Original `5x4` atlas of twenty Nova Swarm sci-fi elite middle ships on flat `#00ff00`, no text/logos/watermarks, readable silhouettes for tractor, shield, drone, mine, sniper, jammer, healer, splitter, barrier, vortex, artillery, phase, lane, orb, missile, mirror, EMP, turret, commander, and hunter roles.

## 2026-05-16 Storm Gameplay Backdrop

- Source: `public/art/generated/nova-swarm/nova-swarm-storm-keyart-source.png`
- Runtime asset: `public/art/generated/nova-swarm/nova-swarm-storm-gameplay-backdrop.webp`
- Optimization: ImageMagick resize/crop to `1920x1080`, WebP quality `82`.
- Usage: `src/scenes/PlayScene.js` crossfades this storm layer in from level 3 upward while keeping a dark shade over the playfield for bullet readability.

Prompt summary:

> Original 16:9 arctic space battle over a Norwegian fjord at night, red-magenta aurora storms, teal ion clouds, distant snowy mountains, edge sci-fi wreckage silhouettes, dark uncluttered center, no text, no logos, no UI.

## 2026-05-16 Boss Threat Dossier

- Source: `public/art/generated/nova-swarm/nova-swarm-boss-dossier-source.png`
- Runtime asset: `public/art/generated/nova-swarm/nova-swarm-boss-dossier.png`
- Optimization: ImageMagick resize to `640x640`, stripped PNG metadata.
- Usage: `src/scenes/PlayScene.js` uses this original generated art inside the boss inbound dossier card instead of legacy portrait assets.
- Cleanup: removed the tracked `public/donaldtru.jpg` celebrity/third-party-looking asset from shipped public assets.

Prompt summary:

> Original square boss threat dossier UI illustration for a retro arcade sci-fi shooter, fictional enemy battleship silhouette over arctic aurora, red/cyan holographic scan accents, no real people, no celebrities, no logos, no text.

## 2026-05-16 Crew Comms Portraits

- Sources: `public/art/generated/nova-swarm/nova-swarm-comms-navigator-source.png`, `public/art/generated/nova-swarm/nova-swarm-comms-pilot-source.png`
- Runtime assets: `public/art/generated/nova-swarm/nova-swarm-comms-navigator.png`, `public/art/generated/nova-swarm/nova-swarm-comms-pilot.png`
- Optimization: ImageMagick resize to `512x512`, stripped PNG metadata.
- Usage: `src/utils/GameAssets.js` loads these original generated crew portraits for comms banners and legendary flybys, and `src/scenes/MenuScene.js` reuses them in the main-menu mission-console comm cards. Real-person portrait assets are not shipped.

Prompt summary:

> Original square pixel-adjacent radio crew portrait for a retro arcade sci-fi shooter, headset and flight jacket inside a cockpit, aurora outside, coherent with the Nova Swarm comms-console art direction, no real people, no celebrities, no logos, no text.

## 2026-05-19 Story Comms Transmission Art

- Source sheet: `public/art/generated/nova-swarm/story-comms/nova-swarm-story-comms-sheet-20260519.png`
- Runtime assets: `public/art/generated/nova-swarm/story-comms/nova-swarm-story-comms-01-20260519.webp` through `nova-swarm-story-comms-04-20260519.webp`
- Optimization: built-in Codex imagegen output copied from `C:\Users\cromk\.codex\generated_images\019e3f5d-8da5-7583-bcf4-99a3482a04bd`; cropped into four `384x384` WebP panels at quality `92`.
- Usage: `src/assets/assetManifest.js`, `src/text/phrasePool.js`, and `src/scenes/PlayScene.js` use these as quiet level-progress story transmissions. The old rotating/flying background portrait behavior is removed; story art appears only in small low-priority comms popups.

Prompt summary:

> Four-panel game UI transmission art sheet for Nova Swarm: lonely pilot and last coin, intelligent swarm spiral, pilot/drone pattern readout, and boss-gate signal flare; premium painterly sci-fi concept art, no text, no logos, no watermark.

## 2026-05-22 Generated Leaderboard Rank Badges

- Source atlas: `public/art/generated/nova-swarm/source/nova-rank-badge-atlas-20260522-source.png`
- Runtime assets: `public/art/generated/nova-swarm/ranks/nova-rank-badge-00-20260522.png` through `nova-rank-badge-19-20260522.png`
- Optimization: built-in Codex imagegen output copied from `C:\Users\cromk\.codex\generated_images\019e4ca4-8508-7b52-adaf-13db37a41d56`, split into 20 cells, chroma-keyed from green, trimmed, and padded to transparent `192x192` PNGs.
- Usage: `src/assets/assetManifest.js` maps leaderboard rank sprites to these Nova Swarm badges, and `src/scenes/HighscoreScene.js` displays them with a small neon badge aura in each row.

Prompt summary:

> Single `5x4` atlas of 20 premium sci-fi arcade rank badges on flat `#00ff00`: no text, no numbers, cohesive neon metal medallions progressing from cadet to elite champion, cyan/magenta/gold energy trims, strong silhouettes, no logos, no watermark.

## 2026-05-16 Menu Mission Console

- Runtime assets reused: current `AssetManifest.generated.crewPortraits` story/comms panels.
- No new generated files were added in this pass because `OPENAI_API_KEY` was not present in the local environment.
- Usage: `src/scenes/MenuScene.js` layers a non-interactive holographic radar, scan blips, and generated crew comm cards behind the menu controls while keeping the settings overlay and buttons above the decorative layer.

## 2026-05-18 Menu Typography And Operator Cards

- Runtime font assets: `public/fonts/orbitron-700.ttf`, `public/fonts/orbitron-800.ttf`, `public/fonts/orbitron-900.ttf`, `public/fonts/rajdhani-600.ttf`, `public/fonts/rajdhani-700.ttf`
- Source: Google Fonts downloads for Orbitron and Rajdhani.
- License: SIL Open Font License, bundled as `public/fonts/OFL-Orbitron.txt` and `public/fonts/OFL-Rajdhani.txt`, pending the same final human provenance/legal approval as the rest of the Steam package.
- Usage: `src/styles.css` defines local `@font-face` rules, and `src/scenes/MenuScene.js` uses the fonts for the title, menu buttons, subtitle, and now-clickable Navigator/Pilot operator cards.

## 2026-05-18 Story Intro And Boss Atlas Regeneration

- Intro source atlas: `public/art/generated/nova-swarm/nova-swarm-intro-story-atlas-20260518-source.png`
- Intro runtime assets: `public/art/generated/nova-swarm/nova-swarm-intro-last-arcade.webp`, `public/art/generated/nova-swarm/nova-swarm-intro-swarm-awakens.webp`, `public/art/generated/nova-swarm/nova-swarm-intro-small-ship.webp`, `public/art/generated/nova-swarm/nova-swarm-intro-boss-chorus.webp`
- Boss source atlases: `public/art/generated/nova-swarm/bosses/sheets/nova-boss-atlas-01-source.png` through `nova-boss-atlas-05-source.png`
- Boss runtime assets: `public/art/generated/nova-swarm/bosses/nova-boss-01.png` through `nova-boss-50.png`, plus `nova-boss-contact-sheet-20260518.jpg` for human review.
- Optimization: built-in Codex imagegen outputs copied from `C:\Users\cromk\.codex\generated_images\019e34df-5e3d-7ff1-a55a-261de494a1e9`; intro atlas cropped to four `1920x1080` WebP panels at quality `86`; boss sheets split into 50 cells, chroma-keyed with `C:\Users\cromk\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py`, trimmed, and padded to `512x512` PNG with alpha.
- Usage: `src/scenes/IntroScene.js` uses the regenerated story panels; `src/config/BossRoster.js`, `src/assets/assetManifest.js`, `src/game/BossFactory.js`, and `src/entities/Boss.js` use the 50 generated bosses as the primary boss visual set with distinct roster profiles.

Prompt summary:

> Four-panel original sci-fi story atlas for Nova Swarm: lost arcade cabinet in space, the swarm learning formation, a small ship breaking rank, and a boss chorus around a scoreboard monolith; no text, no logos, no real people, no existing game branding. Five boss atlas prompts requested exactly ten original alien arcade shooter bosses each on flat `#00ff00`, in strict `5x2` grids, with distinct silhouettes, readable weapon ports, and no labels or copyrighted branding.

## 2026-05-19 Generated Enemy Weapon Redesign

- Source atlas: `public/art/generated/nova-swarm/source/nova-enemy-weapons-atlas-20260519-source.png`
- Runtime assets: `public/art/generated/nova-swarm/weapons/nova-enemy-weapon-01-crimson-shard-20260519.png` through `nova-enemy-weapon-12-purple-boss-spear-20260519.png`
- Review sheet: `public/art/generated/nova-swarm/weapons/nova-enemy-weapons-contact-sheet-20260519.png`
- Optimization: built-in Codex imagegen output copied from `C:\Users\cromk\.codex\generated_images\019e3f5d-8da5-7583-bcf4-99a3482a04bd`, chroma-keyed from green, split into twelve centered transparent `192x192` PNG projectile sprites, and wired through `src/config/EnemyWeaponProfiles.js`.
- Usage: normal enemies and bosses now use generated weapon profiles with different projectile art, hit radii, trail colors, warning rings, pulse speeds, spin, wobble, speed multipliers, and damage multipliers. `render_game_to_text().enemyWeapons` exposes active projectile profiles for verification.
- Verification: `npm run check:enemy-weapons`, `npm run build:current`, staged all-profile runtime capture at `test-results/enemy-weapons-2026-05-19/enemy-weapon-showcase-final.png`, and full smoke at `test-results/smoke-2026-05-19T10-41-57-594Z/` passed.

Prompt summary:

> Twelve spectacular Nova Swarm enemy projectile sprites in a `4x3` atlas on chroma green: crimson shard, amber plasma orb, cyan rail needle, magenta crescent blade, toxic splinter seed, violet star mine, white-blue comet lance, orange molten slug, teal fork dart, pink spiral disruptor, lime saw disc, and purple boss spear; no text, no logos, readable at small gameplay sizes.

## 2026-05-19 Generated Start Screen Key Art

- Source: `public/art/generated/nova-swarm/menu/nova-swarm-start-screen-20260519-source.png`
- Runtime asset: `public/art/generated/nova-swarm/menu/nova-swarm-start-screen-20260519.webp`
- Optimization: built-in Codex imagegen output copied from `C:\Users\cromk\.codex\generated_images\019e3f5d-8da5-7583-bcf4-99a3482a04bd`, preserved as source PNG, cropped/resized to `1920x1080`, and exported as WebP quality `88`.
- Usage: `src/assets/assetManifest.js` now maps the menu backdrop to the new full-bleed Nova Swarm launch-deck art, and `src/scenes/MenuScene.js` composes the start screen as a left-side command deck over the generated cockpit/swarm scene.
- Verification: `npm run build:current`, `npm run smoke`, and dedicated desktop/mobile screenshot review passed with final captures in `test-results/smoke-2026-05-19T10-08-31-390Z/01-menu.png` and `test-results/menu-mobile-2026-05-19/mobile-menu-final.png`.

Prompt summary:

> Full-screen 16:9 Nova Swarm arcade space-shooter key art: neon cockpit command deck, heroic player ship launching toward a vast alien swarm and boss silhouettes around a nova rift, clean negative space for rendered title/menu UI, cyan/magenta/amber accents, no text, no logo, no watermark.

## 2026-05-18 Generated Ship And Enemy Rosters

- Player ship source sheet: `public/art/generated/nova-swarm/source/nova-player-ships-25-sheet-20260518-source.png`
- Player runtime assets: `public/art/generated/nova-swarm/ships/nova-player-ship-01.png` through `nova-player-ship-25.png`, plus `nova-player-ships-contact-sheet-20260518.jpg` for human review.
- Enemy source sheet: `public/art/generated/nova-swarm/source/nova-enemies-50-sheet-20260518-source.png`
- Enemy runtime assets: `public/art/generated/nova-swarm/enemies/nova-enemy-01.png` through `nova-enemy-50.png`, plus `nova-enemies-contact-sheet-20260518.jpg` for human review.
- Optimization: built-in Codex imagegen outputs copied from `C:\Users\cromk\.codex\generated_images\019e34df-5e3d-7ff1-a55a-261de494a1e9`; sheets split with ImageMagick, chroma-keyed against the green background, trimmed, and padded to transparent PNGs at `256x256` for player ships and `192x192` for enemies.
- Usage: `src/config/ShipData.js` defines the 25 playable generated ships with real trait/stat differences and progression locks; `src/config/GeneratedEnemyProfiles.js`, `src/entities/Enemy.js`, and `src/managers/EnemyManager.js` use the 50 generated enemies as the default wave roster with distinct behavior profiles.
- Verification: `npm run check:generated-rosters`, `npm run check:ship-traits`, `npm run check:ship-trait-combat`, `npm run build:current`, and `npm run smoke` passed on 2026-05-18 after integration. Visual review screenshots are in `test-results/generated-roster-visual-20260518/` and the latest smoke run is `test-results/smoke-2026-05-18T13-14-15-501Z/`.

Prompt summary:

> Two original sprite-sheet prompts: a `5x5` transparent-background-ready sheet of 25 sleek playable Nova Swarm ships with rising tech tiers, and a `10x5` sheet of 50 varied alien arcade enemies with distinct silhouettes, weapon ports, readable top-down forms, no logos, no text, no real people, and no existing game branding.

## 2026-05-18 Generated Hijacker Tractor Craft

- Source: `public/art/generated/nova-swarm/source/nova-hijacker-tractor-craft-20260518-source.png`
- Runtime asset: `public/art/generated/nova-swarm/enemies/nova-hijacker-tractor-craft-20260518.png`
- Optimization: built-in Codex imagegen output copied from `C:\Users\cromk\.codex\generated_images\019e3c8d-67c5-7660-a43a-291d5635e772`, chroma-keyed with `C:\Users\cromk\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py`, stripped, and resized to `384x384` PNG with alpha.
- Usage: `src/entities/Hijacker.js` loads this original generated interceptor as the tractor-beam hijacker visual instead of the old bundled UFO sprites.

Prompt summary:

> Original Nova Swarm hijacker craft for a tractor-beam arcade enemy: angular crescent prow, split claw-like fins, dark gunmetal armor, cyan and magenta energy accents, underside emitter lens, no active beam, no text, no logo, no existing IP resemblance, generated on a flat green chroma-key background for alpha extraction.

## 2026-05-19 Generated Powerup Icon Redesign

- Main source atlas: `public/art/generated/nova-swarm/source/nova-powerups-20-atlas-20260519-source.png`
- Supplemental source atlas: `public/art/generated/nova-swarm/source/nova-powerups-supplemental-20260519-source.png`
- Speed replacement source: `public/art/generated/nova-swarm/source/nova-powerup-speed-up-20260519-source.png`
- Runtime assets: `public/art/generated/nova-swarm/powerups/nova-powerup-*-20260519.png`
- Review sheet: `public/art/generated/nova-swarm/powerups/nova-powerups-contact-sheet-20260519.jpg`
- Optimization: built-in Codex imagegen outputs copied from `C:\Users\cromk\.codex\generated_images\019e3c8d-67c5-7660-a43a-291d5635e772`, chroma-keyed with `C:\Users\cromk\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py`, split, trimmed, resized, and padded to `192x192` PNGs with alpha.
- Usage: `src/assets/assetManifest.js` maps every spawned powerup plus the bonus core to generated Nova Swarm icons, and `src/managers/PowerupManager.js` now renders the art directly without first-letter overlays.
- Verification: `npm run check:powerup-assets` validates manifest coverage and icon dimensions.

Prompt summary:

> Premium Nova Swarm arcade powerup icon atlas with distinct collectible icons for triple beam, vector boost, rapid cabinet, overdrive core, slow time, ghost phase, extra life, shield, rapid fire, double shot, damage up, speed up, pierce shot, score x2, magnet field, side drones, shockwave, chain lightning, orbital strike, vampire drain, plus supplemental bomb, point-defense, and bonus-core icons; flat chroma-key backgrounds, no text, no logos, no old UFO/saucer art, readable at small gameplay sizes.

## 2026-06-17 Latest Powerup Icon Refresh

- Runtime assets: `public/art/generated/nova-swarm/powerups/nova-powerup-*-20260613.png` for the 20 latest powerups.
- Review sheet: `public/art/generated/nova-swarm/powerups/nova-powerups-contact-sheet-20260617-new-batch.png`.
- Repro script: `scripts/generate-powerup-icon-refresh-20260617.py`.
- Optimization: internal Codex imagegen was used for the 20-icon art direction and no-text/no-letter constraints; the shipped PNGs were normalized through the local generator so every refreshed asset remains a deterministic `192x192` transparent circular badge under the existing manifest slots.
- Usage: `src/assets/assetManifest.js` keeps the existing 2026-06-13 paths, while `src/utils/GameAssets.js` now preloads powerup art directly so early gameplay and debug/capture flows do not fall back to the bonus-core texture.
- Verification: `npm run check:powerup-assets`, `npm run build:current`, `npm run check:powerup-visuals`, and `npm run check:codex-layout`.

Prompt summary:

> Twenty distinct Nova Swarm neon sci-fi arcade powerup icons in a `5x4` sheet: prism splitter, rail surge, chrono anchor, blink drive, nano patch, score fever, gravity well, drone carousel, plasma lance, stasis net, aegis burst, jackpot lens, ion dash, saw matrix, mirror shots, mercy protocol, target paint, void crown, swarm contract, and pulse refund. Crisp silhouettes, dark badge backgrounds, high contrast, no text, no words, no letters, no numerals, no `P` symbol, no labels, no watermarks, readable at small gameplay size.

## 2026-05-19 Generated Credits Artwork

- Source: `public/art/generated/nova-swarm/source/nova-swarm-credits-20260519-source.png`
- Runtime asset: `public/art/generated/nova-swarm/menu/nova-swarm-credits-20260519.png`
- Optimization: built-in Codex imagegen output copied from `C:\Users\cromk\.codex\generated_images\019e3f5d-8da5-7583-bcf4-99a3482a04bd` and shipped as a 16:9 credits splash with runtime PIXI overlays.
- Usage: `src/ui/SettingsOverlay.js` uses the art inside the credits modal, with Tinyfoundry Games story credits, cabinet jokes, and the new mission-control credits voice line.
- Verification: `npm run check:menu-credits-layout` validates that the credits title, body, art, footer, and back button stay inside the modal frame.

Prompt summary:

> Spectacular 16:9 pixel-art-meets-painted sci-fi credits screen artwork for Nova Swarm by Tinyfoundry Games: heroic player ship, haunted arcade cabinet, tractor beams, boss dossiers, complaint forms, coins, mission-control screens, cyan/magenta/gold highlights, no readable text except abstract labels, dark area for overlay text.

## 2026-05-17 Nova Swarm Asset Path Cleanup

- Public runtime art paths now live under `public/art/generated/nova-swarm/`.
- Legacy-generated menu, storm, boss-dossier, and comms portrait files were copied to Nova Swarm filenames, and `src/assets/assetManifest.js` now references only the Nova Swarm paths.
- This was a path/provenance cleanup, not a visual regeneration pass, because `OPENAI_API_KEY` was not present in the current shell for the local imagegen CLI.

## 2026-05-17 Nova Swarm Cinematic Intro And Hangar

- Sources: `public/art/generated/nova-swarm/nova-swarm-intro-launch-source.png`, `public/art/generated/nova-swarm/nova-swarm-intro-formations-source.png`, `public/art/generated/nova-swarm/nova-swarm-intro-hero-run-source.png`, `public/art/generated/nova-swarm/nova-swarm-intro-boss-arena-source.png`, `public/art/generated/nova-swarm/nova-swarm-ship-hangar-source.png`
- Runtime assets: matching `.webp` files in `public/art/generated/nova-swarm/`
- Optimization: ImageMagick resize/crop to `1920x1080`, WebP quality `84`, method `6`.
- Usage: `src/scenes/IntroScene.js` presents the four intro panels with narration, stingers, skip/next controls, and first-run persistence; `src/scenes/ShipSelectScene.js` uses the hangar art as the ship-select backdrop.
- Verification: `magick identify public\art\generated\nova-swarm\*.webp` confirms all runtime assets are `1920x1080`; smoke screenshots live in `test-results/smoke-nova-intro-20260517-1022/`, and manual panel/hangar captures live in `test-results/manual-nova-visuals-20260517-1027/`.

Prompt summary:

> Original cinematic 16:9 retro arcade space-shooter key art for Nova Swarm, luminous cabinet-era sci-fi colors, crisp readable composition, heroic pilot ship, comedic alien formations and boss arena energy, no text, no logos, no real people, no existing game branding.

## 2026-05-17 Steam Store Art Refresh

- Source: `release/steam-assets/draft-2026-05-17-nova-swarm/key_art_source.png`
- Draft outputs: `release/steam-assets/draft-2026-05-17-nova-swarm/`
- Review outputs: `release/steam-assets/draft-2026-05-17-nova-swarm/review/`
- Cleanup: removed the tracked `release/steam-assets/draft-2026-05-16/` capsule set because those images still showed the old private-era title and were unsafe as release candidates.
- Verification: `npm run check:steam-assets` validates 9 asset dimensions, checks `library_logo_1280x720.png` transparency, and regenerates contact sheets for visual review.

Prompt summary:

> Magnificent original key art for an arcade space shooter called Nova Swarm, no text or logos, deep space arcade battlefield with a luminous coin-slot portal, neon starfield, colorful swarm formations, stylized enemy drones, a heroic player ship firing clean laser streams, and a huge boss silhouette in the far background. Polished high-end 2D/3D hybrid game key art, cinematic arcade poster, varied neon arcade palette, no real people, no existing game branding, no internal jokes, no private-name references.

## 2026-05-17 Generated Bonus Core Drone

- Source: `public/art/generated/nova-bonus-core-drone-source-20260517.png`
- Runtime asset: `public/sprites/generated/nova-bonus-core-drone-20260517.png`
- Optimization: built-in Codex imagegen source on a green chroma-key background, local chroma-key removal, ImageMagick trim/resize to `256x256` PNG with alpha.
- Usage: `src/assets/assetManifest.js` now points the bonus core sprite to this generated sci-fi pickup so menu decorations, highscore background drones, hazard drones, and collectible power cores share a more polished original visual.

Prompt summary:

> Polished 2D arcade collectible sprite for Nova Swarm: glowing golden bonus core drone, star-shaped energy inside a rounded sci-fi capsule, cyan rim lights, tiny thrusters, high contrast, readable at small size, chroma-key background, no text, no logos, no people.
