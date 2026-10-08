# Private Steam delivery — 12 September 2026

**Build 25274613 is live on `sector-continue-test`.** App 4765070, depot 4765071, manifest `7409834361633953175`. Steam server metadata was checked after uploading. Public remains 25273400; `test-build` remains 23782673. Store, Cloud, language settings and public announcements were untouched.

Source branch: `codex/space-snake-broods-20260912`, baseline `70d892edb3fe75ea71367e0af11a7bd6bcc45faf`. Runtime commits `4f00de4` and `a12badf`; packaged runtime `a12badf`, in-game stamp `v2026-09-12_20-47-59`. Later evidence/test commits do not change the uploaded runtime. Inherited untracked work was preserved.

## What changed

- Fourteen snake families can hatch a 5–20 juvenile brood, with a 25% per-mother roll. Distinct movement, weapons and roles include shields, pincers, mines, plasma, lances, divers and finite healing. Children are independently damageable; mother death and scene exit clean them up. Shared attack admission limits overlapping warnings, especially alongside bosses.
- Fourteen animated juvenile skins and 70 ElevenLabs sound cues, including alien communication. Editable art, original audio and reproduction scripts are retained. Actual ElevenLabs usage: **1,476 credits**, not the full authorized allowance. Audio follows master/SFX/pause controls and does not duck music.
- All 56 mystery announcements remastered to approximately −13.5 LUFS and the normal announcement gain. Their original voices, timing and exclusive speech queue remain intact.
- Steam availability recovers automatically after a failed check. Optional friends retrieval cannot indefinitely block availability. The score page retries and restores Steam tabs while retaining a deliberately selected Local view.
- The selected interactive 3D ship, materials and GPU upload are prepared under the existing loading screen before revealing the main menu. Only the selected showcase ship is resident.

Main code changes: `src/config/SnakeBroods.js`, `src/entities/SpaceSnakeBaby.js`, `src/managers/SnakeBrood.js`, `EnemyManager.js`, `BossDiscoveryEncounter.js`, `EncounterScorePacing.js`, `src/assets/SnakeBroodArt.js`, `src/audio/SnakeBroodAudio.js`, `SnakeBroodSoundBanks.json`, `MysteryAnnouncer.js`, `src/leaderboard/LeaderboardAdapter.js`, `src/scenes/HighscoreScene.js`, `MenuScene.js`, `PlayScene.js`, `src/main.js`, `src/ui/SolidShipView.js`, `src/utils/BootWatchdog.js`, plus owned art/audio, source documentation and scripts. The adjacent delivery JSON records the full changed-file list.

## Checks and measured limits

Passed release-line, production build, eight-language i18n and UI checks, controller flow, package integrity, native Steam bridge packaging, existing leaderboard/pending-submission checks, Steam recovery fixtures, encounter/score/discovery checks, brood collision/score/heal-cap/lifecycle/audio checks, and mystery audio/announcement checks. No new untranslated interface text. Audio remains English.

The package retained **15,348 baseline files** with byte checks and **64 player art assets unchanged**. Packaged archive: 2,334,112,653 bytes. Full evidence lives at `E:/Codex/builds/nova-swarm/snake-broods/`.

Native 1920×1080 RTX 2060 check observed the first startup without reloading: zero visible menu frames missing the 3D model. About 4.05 seconds from observer start to menu reveal; this is not total process-launch time. Over 180 menu frames: median 16.7 ms, p95 17.1 ms, maximum 17.7 ms. Twenty-child combat over 300 frames: median 16.7 ms, p95 17.1 ms; the first two frames after resuming the stepped fixture/foregrounding were 166.6 and 100 ms. Do not interpret the short sample as a hitch-free long-session guarantee. Returning to the menu disposed the brood and left one showcase model resident.

Three genuine packaged mystery arrivals—Glass Widow, Rail Cathedral and Choir Unbound—played and completed their announcements without overlapping other speech. Observed media gain was 0.135 with master 0.3 × voice 0.45 × announcement 1.0, unmuted. All 56 files passed audio checks. There was no human listening or extended balance review; automated fixtures include stepped time and QA invulnerability. Dense broods can still cluster visually around their mother.

**Live Steam limitation:** earlier read-only native probes retrieved ten real Pure leaderboard entries. Later the Steam client recorded `Session Replaced` at 20:36:06 and explicitly stopped automatic reconnection, coinciding with uploader login. A final package probe reported `steam_user_not_logged_on`; a subsequent bounded retry timed out. This is not a successful final live-server recovery check. Restart Steam once before testing. Game-side recovery passed simulated connection-loss/restoration tests, but cannot sign an externally disconnected Steam client back in. No real score, achievement, Cloud or save writes were used for QA.

## Rollback

Source runtime rollback, if requested: `git revert a12badf 4f00de4`. This preserves history; do not reset or discard inherited work. Steam rollback, if requested: assign previous build **25273400** to **sector-continue-test** only. Neither rollback was performed.
