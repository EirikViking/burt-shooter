# Veilborn and encounter pacing

Runtime commit **bf0f741**, branch **codex/discovery-encounter-pacing-20260912**, baseline **0e7a2ae**. This continues the completed 56-enemy combat/audio overhaul in **25d4825**. **Steam build 25272660 is live on private branch sector-continue-test.** Public remains **25237042** and test-build remains **23782673**. [Delivery receipt](D:/vibe-coding-e/nova-swarm-forum-129-improvements-20260822/docs/mysteries/encounter-pacing-delivery.json).

- **Encounter variety:** seeded spacing advances on actual arrivals, with the first encounter within four eligible campaign sectors and subsequent arrivals spaced three to six eligible sectors apart. Continuation runs get an earlier first opportunity. Familiar Veilborn can accompany one boss or snake; first contacts use ordinary waves. Shared admission prevents stacked special-event lotteries, and combined fights receive an ordinary-combat recovery interval.
- **Boss overlap:** guests load off-scene and arrive after a warning at 65% primary health. Both launch tests start with a full-health primary. Earlier arrival increases actual overlap without adding more boss health. Existing projectiles remain in flight; large attack warnings share reservations. Ordinary shots continue.
- **Veilborn durability:** hull and component health now follow light, raider, heavy and colossal roles. Entry no longer absorbs extra damage. Beam weapons briefly commit to a firing position; bombers brace for heavy discharges, giving normal shots an interception window. Existing aggressive attacks and component destruction remain.
- **Score pace:** extended fights compensate against recent ordinary score earnings. Compensation requires new damage progress, counts already-earned points, and has finite damage-based limits. Waiting, healing, repeating damage or quitting cannot generate passive payouts. Three exposed-core opportunities—Vault Crawler, Courier Zero and Rail Cathedral—offer a brief additional finishing bonus.
- **The Veilborn:** all 56 identities now have encounter-gated Codex entries and current combat descriptions in eight languages. Actual arrival reveals an entry; a defeated root unlocks counterplay. Loading artwork or browsing the Codex reveals nothing. Internal IDs and storage format remain compatible.
- **Preserved work:** player ships, sprites, weapons and stats; existing enemy artwork; the 399 bespoke effects and 56 female announcements; music/no-ducking behavior; progression and platform policies. No new paid generation was needed.

## Measured balance evidence

These are wall-clock projectile/collision tests with scripted steering, not human playthroughs. Offense tests use invulnerability only to isolate damage output. The survival tests retain normal lives and damage.

| Test | Duration | Simultaneous opponents |
|---|---:|---:|
| Previous Sparrow dual-boss | 38.9 s | 2.9 s |
| Revised Sparrow dual-boss | 40.3 s | 9.6 s |
| Revised Sparrow boss/snake | 35.0 s | 9.9 s |
| Needle dual-boss | 49.0 s | 11.3 s |
| Eirik dual-boss with tested upgrades | 35.0 s | 9.3 s |
| Sparrow dual-boss, normal damage/dodge/blink | 92.3 s | 31.2 s |

The survival pilot finished the dual-boss fight with two lives and boss/snake with three. Varied-hull relay fixtures kept the same boss-health fixture; they do not claim exhaustive per-ship threat-response balancing.

Same-sector/loadout durability comparisons: unupgraded Sparrow at sector 20 defeated the ordinary boss in 12.9 s, Glass Widow in 9.2 s and Needle Saint in 21.5 s. Needle with damage/rapid-fire upgrades at sector 40 defeated the boss in 17.1 s, Rail Cathedral in 19.8 s and Avalanche Engine in 15.0 s. Eirik's tested four-upgrade sector-60 build defeated the boss in 26.3 s, Choir Unbound in 4.9 s and Worldmolt in 10.5 s. Mobility remains a meaningful part of encounter duration.

The real scoring-path fixture earned 15,340 points during 20 seconds of damage progress against a measured 600 points/second reference, including the existing bounty. Twenty preceding seconds of idle waiting earned zero. This verifies accounting, not a measured guarantee about a human player's time to one million.

## Validation and reproduction

Passed locally: 56 combat/component/retreat/resource fixtures; mixed ordinary/snake/boss coexistence; 56-entry ordered test tour lifecycle; seeded spacing and recovery over 2,000 campaigns; guest loading/cancellation and core windows; score exploitation and actual scoring-path checks; Codex discovery/defeat/lazy-atlas cleanup; eight-language copy and UI checks; controller flow; release-line; Steam bridge; production build.

The native launch tests passed with ordinary controls; the mixed-wave input smoke test passed. Three RTX 2060 1920×1080 samples averaged 60 FPS with P95 intervals of 17.1–17.2 ms and no frame above 33 ms. Each ten-second sample followed 2.5 seconds of warmup beside 17 ordinary enemies, with no concurrent build or capture. Female announcements played to completion before arrival and did not overlap other speech. The package retained 15,401 files byte-for-byte, including 64 protected player-ship assets; all seven integrated build files were checked. Steam delivery and retained-file results are in the receipt. The launch harness now fires through the real health gate instead of incorrectly waiting for an immediate guest.

Editable copy is in `scripts/data/veilborn-codex-copy.json`; regenerate with `node scripts/update-veilborn-copy.mjs`. Set process-local TEMP/TMP to the owned E: task directory. Run `npm run check:release-line`, then `npm run build:current -- --config scripts/vite-encounter-pacing.config.mjs`. Package with `node scripts/package-encounter-pacing.mjs` into an absent, verified task destination; the script hashes all retained baseline files and refuses to overwrite an existing package. Build staging stays on E:.

Actual packaged runtime: [normal-controls mixed combat](E:/Codex/builds/nova-swarm/encounter-pacing/native-input/last.png), [Rail Cathedral](E:/Codex/builds/nova-swarm/encounter-pacing/native-fixtures/rail_cathedral.png), [dual-boss launch](E:/Codex/builds/nova-swarm/encounter-pacing/native-boss/dual-boss.png). The Rail Cathedral image is an invulnerable inspection fixture.

Actual runtime Codex images: [English](E:/Codex/builds/nova-swarm/encounter-pacing/codex/en.png), [German](E:/Codex/builds/nova-swarm/encounter-pacing/codex/de.png), [Japanese](E:/Codex/builds/nova-swarm/encounter-pacing/codex/ja.png). Raw QA receipts are under `E:/Codex/builds/nova-swarm/encounter-pacing/qa`. No screenshots were retouched.

Limits: no full human balance playthrough or measured retention improvement. The existing planetary-ring background artwork is unchanged. All new Veilborn copy is translated; some pre-existing Codex category labels remain English in Asian locales. Audio remains English and does not imply localized subtitles. This pass preserves the prior audio; it does not claim a new subjective listening review.

Changed files are enumerated by `git show --stat bf0f741`: encounter config/managers, Mystery actors/effects/durability, score hooks in Game/PlayScene, Codex/catalog, eight locale copy files, and reproducible checks/build helpers. The delivery commit contains this note, the corrected native test harness and the final Steam receipt. Steamworks store and account settings are outside this change. Runtime rollback: `git revert bf0f741`; previous private Steam build: **25271583**.


**Cleanup blocked:** automatic approval review rejected removal of this task's disposable staging with the reason “blocked by policy.” No deletion executed and no alternate route was attempted. Remaining paths: `E:/Codex/builds/nova-swarm/encounter-pacing/package/source`, `build-dist`, `all-mysteries`, `steam-output` under that same task root; `E:/Codex/tmp/encounter-pacing`; and the task cache `E:/dev-cache/vite-nova-pacing`. Together these are approximately 2.45 GiB. The verified deliverable, current evidence, editable source and prior shared rollback build are retained.
