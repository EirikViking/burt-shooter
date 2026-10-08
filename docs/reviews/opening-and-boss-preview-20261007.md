# Opening observation and boss audiovisual preview — October 7, 2026

## Scope and verified state

Same D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920 checkout, branch `codex/sector-leaderboard-unknown-20260928`, HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`, no upstream. No competing local writer was found. Preserve inherited changes and output folders. No reset, clean, stash, pull, commit, push, branch/worktree change or Steam upload.

This continuation adds inspection tools and evidence. It does not add another encounter, change gameplay tuning, activate the new fauna recordings, or introduce new boss art/audio. The last delivered private Steam build remains **25683581 / manifest 2117634921635676724**. Its receipt is historical; live authenticated branch/Cloud checks are still needed before delivery. The old Goal remains `usageLimited`; ordinary authorized sprint work continues separately.

Current local compiled candidate remains **v2026-10-06_23-24-30**, entry `assets/index-Dhs4cwBy.js`, SHA256 `b0db2b824aa346d8255bfe3c36a9d1d3a48931a7c446976af123e90eec289b92`. Rechecking 626 source files and 188 public files after this work passed. The inspection-script changes are outside the packaged source checkpoint. Full build/native/performance gates from the preceding report remain applicable; no new product source required another full build in this continuation.

## Two finite-life opening observations

Both runs used the source server on localhost4983, normal starting Ion hull/damage (1.05), keyboard steering/fire/earned Phase, three lives, ordinary pickups and the existing `encounterEvolution=natural` test policy. No forced encounters, skips, kills, extra damage or granted invulnerability. Input is automated and reactive; this is not a human skill/fun assessment. Both observed approximately 180 wall-clock seconds. The same test seed does not reproduce an identical run without matching inputs and simulation timing.

The existing harness checked two obsolete permission names. It now checks the real `allowGlobalLeaderboardSubmission`, `allowAchievements`, `allowPersistentRewards` and every `allow*` permission, records policy before/after, captures console errors as well as uncaught page errors, and records the runtime snapshot. This strengthens test verification; production RunPolicy was already disabling these permissions and was not changed.

| Observation | First run | Second run, strengthened checks |
|---|---:|---:|
| Convoy arrival, run clock | 7.43 s | 9.17 s |
| Both rescued, run clock | 12.95 s | 14.87 s |
| Original assistance completed, run clock | 22.93 s | 24.87 s |
| Rival arrival, run clock | 91.57 s | 93.77 s |
| Payback outcome | Active, then spent; 0 damage | Never active; later expired |
| Final sampled sector / score / lives | 2 / 17112 / 3 | 2 / 18035 / 1 |

First-run screenshots show ordinary opening fire/pickups, the first boss by the 56.98-second wall sample, and later sector2 combat. Astral Cobra arrived through normal cosmetic scheduling, played its existing short cue, faded during the boss, departed and prepared the next creature. The second run lost two lives normally and continued; all progression permissions remained false, with zero page or console errors.

**Concrete gameplay finding:** in the first run, the player destroyed both side weapons during the returning pilots' arrival, before their firing window, so the callback correctly spent zero damage. In the second, both side weapons were gone before callback admission, and the earned callback later expired. No fake damage, replacement target, forced immunity or scripted victory was inserted to manufacture a payoff. The two observations justify a targeted review of callback timing under ordinary/burst builds, not a claim that the callback is broken for every player. Do not silently increase its damage budget or global scoring. Existing focused encounter-evolution tests still pass identity, bounded part damage, expiry/reset, eligibility, fracture, burst kills, plate deduplication and lifetime.

Evidence under `E:/Codex/builds/nova-swarm/boss-verification-20261006-a3f9c812`:

- `opening-observation-01/report.json`, six opening screenshots, fauna screenshot and `opening-playthrough.webm`.
- `opening-observation-02/report.json`, corresponding actual screenshots and video. This run verifies current permission names before/after and console errors.
- Playwright opening videos have **no audio** and are internal inspection evidence, not the requested audiovisual preview.
- The long-running source Vite process reports its earlier startup build label `v2026-10-03_03-12-41`. Current product files match the new compiled checkpoint; do not mislabel source-run evidence as a native or compiled playthrough. The boss video below actually uses the compiled candidate.

## Boss preview with actual game sound

New opt-in harness: `scripts/capture-boss-mechanical-audio.mjs`. It runs against the compiled localhost4984 build and uses the existing isolated boss test bridge. All production policy permissions are checked false; external network requests are blocked. Selected actual Boss constructors use their normal movement, warnings, attacks and damage rules, with an immortal test pilot and explicit cuts between examples. This is a controlled presentation, not natural encounter frequency or difficulty evidence. The preset's sector30 HUD remains visible; selected bosses are constructed at level3 for a bounded demonstration.

The 55.19-second clip shows **conductor, forge and clock**, not all ten families. Existing art and audio accompany the new mechanical-motion pass. Actual HTML media and Web Audio output are tapped into the recording mix; no replacement music or invented postproduction impacts are added. The renderer drew3312 frames; the video exports at30fps. Instrumentation counted24 Web Audio output connections, with zero page/console/capture errors. All three bosses remained alive and took ordinary player damage. The footer labels local preview, new movement, existing audio and immortal test pilot.

Actual screenshots and the twelve-cell contact sheet were inspected. The recording captures only the game canvas and its explicit preview footer; it does not capture the desktop voice-control overlay. This does **not** identify or fix the user's earlier ambiguous central-artifact report. That report remains open.

Initial variable-frame-rate exports produced non-monotonic timestamp warnings when decoded to a null output. Both exports were rebuilt from the retained source with an explicit `fps=30` filter. The final email MP4 fully decodes with an empty error log. H.264 / AAC stereo, 800x496 at30fps, duration55.185675s,2443241 bytes, SHA256 `d74fcbae41c5f5840012fb24f4eb8956829d3c4399352226faf52a3a8c034d44`. The preceding mix measurement was mean -33.9dBFS / maximum -16.5dBFS, without clipping; no human listening verdict is claimed. A larger960x594 current preview and the source WEBM are retained for detailed review/re-edit.

### Verified email delivery

Sent **October7 at00:18:00 Oslo**, personal sender/recipient `cromkake@gmail.com`, subject **Nova Swarm — bossvideo med spilllyd, før Steam**, Gmail message **1a1134b8d99afdcc**. Readback verifies SENT, recipient and the2443241-byte MP4 attachment. The prior matching sent-mail search found only the earlier reports/creature preview; no duplicate boss preview was sent. Chat explicitly announced successful sending. This was new requested review material between hourly reports, not a repeated status attachment.

Latest central receipt: `E:/Codex/builds/nova-swarm/cosmic-fauna-majesty-20261006-6e4c9b2a/email-latest.json`; also mirrored to the boss job's `email-receipt.json`. It retains the previous status and original creature preview references. Count this send toward the approximately hourly cadence; do not send another report immediately at the next heartbeat. Creature audio remains disabled in the normal catalog while review is pending. No new spending or generation requests.

## Reproduction and rollback

Use the existing checkout; set TEMP/TMP to `E:/Codex/tmp/boss-verification-20261006-a3f9c812`, npm cache `E:/dev-cache/npm`, Node cache `E:/dev-cache/node-compile`. Parents/root paths were verified non-reparse and E: space was checked. For opening observation, set CHECK_URL=http://127.0.0.1:4983, PLAYTEST_SECONDS=180 and CHECK_OUTPUT_DIR to a new E: evidence subdirectory, then run `node scripts/playtest-opening.mjs`. For boss video, use CHECK_URL=http://127.0.0.1:4984 and a new CHECK_OUTPUT_DIR, then run `node scripts/capture-boss-mechanical-audio.mjs`. Optional BOSS_CAPTURE_FAMILIES and BOSS_CLIP_SECONDS are validated/bounded. Never overwrite an existing capture.

Export the WEBM with ffmpeg using `-vf fps=30,scale=800:496 -c:v libx264 -preset medium -crf 30 -pix_fmt yuv420p -c:a aac -b:a 112k -movflags +faststart`, then inspect/decode the actual final MP4. Retain the current higher-resolution preview when useful; the small version exists for the verified email transport limit.

Changed files: new capture harness, strengthened existing opening harness, this report, creative sprint report and HANDOFF. No product strings changed; no untranslated additions. Steamworks was untouched and deployment was not performed. A narrow optional rollback of only the harness edit is `Copy-Item -LiteralPath 'E:/Codex/builds/nova-swarm/boss-verification-20261006-a3f9c812/playtest-opening.before.mjs' -Destination 'D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920/scripts/playtest-opening.mjs'`; this has **not** been executed. The new capture harness is inert unless explicitly run. Do not reset the accumulated source work.

## Retention and next step

Preserve the compiled/native deliverable, both natural-run observations for comparing timing/outcomes, and the current full/email boss previews plus original capture for review. Failed timestamp exports were overwritten by the corrected current versions. The previous policy rejection of package-source/native-profile/node-compile cleanup was not retried or bypassed; those recorded disposable folders and inherited output folders remain untouched. Existing local servers remain available for the continuing sprint. Cleanup is still incomplete.

Final checkpoint:63 modified tracked files/374 untracked individual files; E: free236298174464bytes. New files are the capture harness and this review. Existing untracked opening harness and notes were edited without discarding earlier work. Syntax checks for both harnesses passed; the strengthened opening run, compiled audio capture, final MP4 decode, source/public hash parity and focused encounter-evolution regression passed. No new full-build claim is substituted for the preceding verified build.

Next: examine the payback admission/arrival window with the existing representative-build fixture before choosing a small gameplay change; preserve strong-build kills and the one-weapon70% budget. Continue independent quality work while the user has an opportunity to review actual boss/creature media. Human checks remain first-sighting comprehension, third-sighting decisions, warning readability, laptop/headphone/mono mix, native live Steam behavior, and long-session frame tails. Neither this preview nor passing automated observations proves the game is fun or premium.
