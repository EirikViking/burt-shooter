# Nova Swarm Enemy Projectile Visual Refresh - 2026-06-23

Branch: `codex/enemy-projectile-visual-refresh-20260623`
Baseline: `f18dbeed7e817ca7f289de2b98a7ad06d84d5b7f`
Snapshot: `snap/pre-enemy-projectile-visual-refresh-20260623`

## Scope

This pass refreshes enemy projectile presentation only. It does not change projectile speed, damage, hitboxes, firing cadence, spawn rates, enemy behavior, boss behavior, score, XP, leaderboard identity, achievements, Steam Cloud, save format, AppID, depot, or Steamworks metadata.

## Projectile Audit

| Type | Source | Prior style | Role | Pooling / density | Collision notes |
| --- | --- | --- | --- | --- | --- |
| Basic enemy bullets | `src/entities/Enemy.js`, `src/config/EnemyWeaponProfiles.js`, `src/entities/Bullet.js` | Generated weapon sprite plus simple shell/trail | Hostile | Existing bullet manager arrays; common density | Radius remains `visualConfig.radius` / bullet radius, independent of sprite size |
| Fast enemy shots | `EnemyWeaponProfiles` profiles such as `cyan_rail_needle` and `white_comet_lance` | Small bright lances | Hostile | Common fast shots | No speed/radius/damage changes |
| White X / comet shots | `white_comet_lance` profile and enemy attack styles | Pale cyan/white projectile language | Hostile | Medium density | Visual colors moved away from pickup-like cyan/white candy read |
| Yellow / fireball shots | `orange_molten_slug`, `amber_plasma_orb`, warning/slow-heavy styles | Round/orb-like generated weapons | Hostile | Medium to high density | Hit radius unchanged |
| Missile waves | `Enemy.fireElitePattern('missile')` | Xtra laser fallback index | Hostile elite pressure | Lower frequency but dangerous | Speed, damage, acceleration, count, and radius unchanged |
| Boss bullets | `src/entities/Boss.js`, `EnemyWeaponProfiles`, `Bullet` | Generated weapon sprites | Hostile premium shots | Pattern/ring bursts | Boss bullet movement and damage unchanged |
| Boss beams | `PlayScene.drawBossHazard()` | Flat graphics beam | Hostile hazard overlay | Low density | Existing hazard geometry unchanged; only extra rails/core strokes |
| Boss hazards | `PlayScene.registerBossHazardFromBoss()`, `drawBossHazard()` | Graphics cones/walls/rings/beams | Hostile hazard telegraphs | Rare | Existing hit area data unchanged |
| Tractor ship / beam effects | `Enemy.applyEliteTractorPull()`, `PlayScene.updateTractorHijack()` | Graphics beam / debuff effect | Hostile/debuff feedback | Rare | Pull/debuff behavior unchanged |
| Support ship shots | Boss support ships use normal `Enemy` / `Bullet` paths when applicable | Shared projectile visuals | Hostile when fired | Low | No separate gameplay path changed |
| Warning cones / telegraphs | `Enemy.drawThreatTelegraph()`, boss telegraphs | Graphics warnings | Warning/decorative hostile info | Low | Telegraph draw only |
| Lasers and beam segments | Boss hazard draw path and legacy xtra fallbacks | Graphics and xtra laser textures | Hostile/fallback | Mixed | New generated art preloaded; no per-frame texture creation |
| Generated enemy projectile visuals | `AssetManifest.generated.enemyWeapons`, `GameAssets.getEnemyWeaponTexture()` | 20260519 weapon art | Hostile | Shared across enemy bullets | Sprite size remains visual-only |

## Generated Assets

Internal Codex image generation was used for the hostile projectile source sheet. The generated sheet was chroma-keyed, normalized into transparent sprites, and kept with the final projectile assets.

Final runtime assets:

- `public/art/generated/nova-swarm/projectiles/nova-basic-enemy-bolt-20260624.png`
- `public/art/generated/nova-swarm/projectiles/nova-fast-enemy-needle-20260624.png`
- `public/art/generated/nova-swarm/projectiles/nova-heavy-enemy-orb-20260624.png`
- `public/art/generated/nova-swarm/projectiles/nova-enemy-fireball-20260624.png`
- `public/art/generated/nova-swarm/projectiles/nova-boss-plasma-bolt-20260624.png`
- `public/art/generated/nova-swarm/projectiles/nova-boss-shard-20260624.png`
- `public/art/generated/nova-swarm/projectiles/nova-boss-laser-core-20260624.png`
- `public/art/generated/nova-swarm/projectiles/nova-boss-laser-edge-20260624.png`
- `public/art/generated/nova-swarm/projectiles/nova-tractor-beam-energy-20260624.png`
- `public/art/generated/nova-swarm/projectiles/nova-warning-hazard-marker-20260624.png`

Source and extraction records:

- `public/art/generated/nova-swarm/source/nova-enemy-projectile-source-sheet-20260624.png`
- `public/art/generated/nova-swarm/projectiles/nova-enemy-projectile-sheet-alpha-20260624.png`
- `public/art/generated/nova-swarm/projectiles/nova-enemy-projectile-assets-20260624.json`

## Implementation Notes

- `AssetManifest.generated.enemyWeapons` now points the 12 existing enemy weapon slots at the compact 20260624 projectile set.
- `AssetManifest.generated.projectiles` and `GameAssets.projectileTextures` preload named projectile art for checks and future explicit mappings.
- `Bullet` animates enemy projectile sprites with transform/alpha changes on the existing core sprite. It does not allocate textures, add shaders, or create filters during update.
- Elite middle-ship projectiles were remapped from xtra laser fallback art to the generated projectile assets while preserving speed, damage, radius, acceleration, and pattern counts.
- Boss beam hazards gained additional rail/core strokes on the existing graphics layer; their collision data is unchanged.

## Focused Evidence

- Art preview: `test-results/projectile-visuals-art-preview-2026-06-24/enemy-projectile-art-preview.png`
- Runtime visual/perf report: `test-results/projectile-visuals-2026-06-24T14-30-26-761Z/report.json`
- Runtime screenshots: `basic_wave.png`, `dense_missile_wave.png`, `fireball_white_x.png`, `boss_bullet_pattern.png`, `boss_beam_tractor.png`, `pickup_comparison.png` in the same report folder.
- Focused dense projectile sample: 180 frames, no frames over 50 ms, no runtime `generateTexture` calls, p95 21.30 ms, p99 22.90 ms, max 23.40 ms in headless browser/dev-server capture.

## Steam Package Evidence

- Source commit: `9906b82531955232606cd93bdfcc55dfbb0fda20`
- Packaged build: `v2026-06-24_16-38-35`
- Packaged gitSha proof: `9906b82` in `test-results/packaged-exe-smoke-2026-06-24T14-42-11-679Z/report.json` and `test-results/packaged-perf-smoke-2026-06-24T14-43-00-108Z/report.json`
- Packaged perf: 60.01 FPS average, 59.52 FPS minimum
- Payload manifest: `release/steamworks/steam_payload_manifest.json`, 336 files, 888,574,529 bytes, manifest hash `fdc42c0f7f4345490cb8a2c6a90db65667f3676fe93bc9a9ae04a5a463dbb518`
- VDF: AppID `4765070`, depot `4765071`, `SetLive ""`
- Private unassigned Steam BuildID: `23895509`
- Evidence record: `release/steamworks/steam_upload_evidence_enemy_projectile_visual_refresh_20260624_23895509.json`

## How To Verify

Run:

```bash
npm run check:enemy-weapons
npm run check:projectile-visuals
```

The focused check stages basic, dense missile, fireball/white-X, boss bullet, boss beam/tractor, and pickup-comparison scenes. It verifies generated sprite use, preload coverage, subtle animation, no chroma-key fringe, no missing textures, and no per-frame texture generation in the dense projectile sample.
