# Continue Nova Swarm Here

## Workspace And Ownership

- Continue in exactly `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`, in Local mode. Do not create a replacement checkout or worktree.
- Preserve branch `codex/sector-leaderboard-unknown-20260928`. Exact pre-checkpoint parent: `7e8325e3d9abb09357636bca7e994c0227be02d6`. Read the current commit from `git rev-parse HEAD`; the major checkpoint commit subject is `Major Nova Swarm build: Planetfall, Veilborn and presentation upgrades`.
- The new chat becomes the sole writer after this handoff. Do not run development in both chats. Read-only reasoning review is fine; do not launch another source writer.
- The user explicitly authorized committing and pushing this major checkpoint on October 8. Earlier no-commit/no-push notes describe the previous development phase, not this authorized publication. No force push, main merge, reset, clean, stash, pull, branch switch or deletion is authorized by the handoff.
- GitHub target: `https://github.com/EirikViking/burt-shooter`, public repository, release snapshot branch `codex/major-build-25804727-20261008`. The user approved this clean-snapshot approach after the ordinary history audit found a124205516-byte review video above GitHub's100MiB limit. Original local history and video are preserved; no paid LFS or history rewriting.
- The GitHub snapshot excludes only `docs/fleet-art-v2/evidence/rotation/fleet-rotation.mp4` from the local source checkpoint's tree and uses an already-published parent. It is NOT the development branch's full unpublished ancestry. Do not push the development branch as-is, change its upstream to the snapshot, pull/merge the different histories, or switch the working folder to the publication branch by assumption.
- Verify actual publication from `E:/Codex/builds/nova-swarm/github-handoff-20261008/github-delivery.json` and the release branch tip; a missing receipt is not evidence of a successful push. The receipt records both local source checkpoint and GitHub snapshot commits.

Read in order: `AGENTS.md`, this file, the newest section of `HANDOFF.md`, `docs/releases/2026-10-08-major-build.md`, then the active plans below. Historical HANDOFF entries are retained for evidence and do not override the newest checkpoint.

This is an existing sparse checkout. Some new review/plan documents sit outside its sparse definition; the audited documents are included with Git's `add --sparse` option, without changing sparse patterns or removing files. This is unrelated to the earlier failed product-file edits and does not establish that those failures are resolved.

## Current Delivered Game

Private Steam `sector-continue-test`: **Build25804727**, manifest **1522691908505213588**, version **v2026-10-08_14-53-03**. Authenticated October 8, 15:23 Oslo.

- Receipt: `E:/Codex/builds/nova-swarm/recording-release-20261008/delivery.json`.
- Verification/source seal: `verification.json` and `source-seal-final.json` beside that receipt.
- Current Windows package: `E:/Codex/builds/nova-swarm/recording-release-20261008/final/win-unpacked`.
- Current compiled web: `E:/Codex/builds/nova-swarm/recording-release-20261008/final/web-current`.
- Required previous native rollback: `E:/Codex/builds/nova-swarm/combined-20261008/win-unpacked`, Build25791160.
- At delivery, public25791160, test-build25778573, all other branch/depot metadata and Cloud were authenticated unchanged. Authenticate again before any later delivery; never restore an older public assignment by assumption.

Latest patch: compact HUD/support panels; portrait high-scale combo/padding/docking repairs; finite completed-rival aftermath under warnings; genuine Three.js hangar image preservation and retry after WebGL loss. The latest patch adds no new audio mix.

Already retained from earlier shipped builds: normal-admission Three.js Planetfall with articulated armor/reactor shutters/eight-section breakup; the 56-identity Veilborn articulation/audio increment; Reactor Tow, Counterweight and the existing rescue encounters; ten-family boss motion and the first-collapse shader-hitch correction. Do not redo these as unfinished or describe them as new again.

## What To Continue

The user wants sustained, ambitious improvement across gameplay, content, graphics, animation, sound, presentation and performance. Visuals and sound are highest priority. Work in tested, meaningful increments; do not promise perfection, literal quality doubling, guaranteed success or uninterrupted execution.

1. Verify the new chat's folder, branch, status, remote checkpoint and active processes. Preserve any new user changes. Inspect the current receipt before editing or publishing.
2. Continue `docs/superpowers/plans/2026-10-08-recording-followup.md`, preserving `docs/superpowers/plans/2026-10-07-planetfall.md`. Finish the outstanding presentation/performance work without dropping the broader audiovisual upgrade.
3. Concrete independent starting work: reproduce remaining 200-percent desktop HUD issues at960x540 and1280x720; profile Planetfall's first admission/loading separately from collapse animation. The final native admission measured about1.53-1.63seconds. Preserve score/mode/RNG ownership when changing loading or presentation.
4. Use actual current native footage/pixels/audio for the next animation and sound increment. The user rejected primitive motion. Do not substitute more decorative props or a plan for playable improvements. Keep new changes visually readable, finite, accessibility-aware and measurable against a matched baseline.
5. Obtain normal whole-run Planetfall reachability and natural Counterweight frequency evidence. Controlled replacement/admission fixtures do not establish frequency or an unassisted campaign.

## Unfinished And Blocked

- `src/effects/PlayerHullSilhouette.js` is isolated and unimported, not a playable improvement. Redundant legacy projectile allocation and ordinary Onslaught preview/spawn boss-identity mismatch remain unfixed.
- Prior apply_patch writes to `src/entities/Bullet.js`, `src/entities/Player.js` and `src/scenes/PlayScene.js` failed. Do not blindly retry or bypass security/file controls. Diagnose exact limitations, record them and continue independent work.
- Intentionally red research checks: `scripts/check-boss-preview-identity.mjs` and `scripts/check-recording-combat-followup.mjs`. They are not wired into the standard package build gates. The isolated silhouette helper test is not integration proof. Do not claim every script in the repository is green.
- Remaining inherited UI polish: 200-percent desktop HUD overlaps/clipping, German menu clipping and Chinese SPEED UP. No new untranslated strings were introduced in the last release.
- The central-artifact complaint is still unidentified. Death-associated video capture gaps are not established engine stalls.
- Human sound/fun judgment, target-hardware soak and cold first-machine loading remain open. No Steam-client re-download/install verification was performed; the exact uploaded local executable was tested.
- Keep the new 20-second fauna recordings inactive until the user has had an opportunity to review the specifically authorized audiovisual preview. Do not repeat previews already sent. Do not claim to have listened to audio that tools did not let you hear.

## User Recordings

- Arcade: `E:/video-clips/Nova Swarm/Nova Swarm 2026.10.08 - 11.58.17.01.mp4`.
- Onslaught: `E:/video-clips/Nova Swarm/Nova Swarm 2026.10.08 - 12.39.45.02.mp4`.
- Findings: `docs/reviews/user-recordings-20261008.md`.
- Both entire timelines were sampled at2fps, with selected12fps/full-resolution inspection and full-file loudness measurement. This was not continuous every-frame playback or successful direct listening. Original user recordings are not disposable.

## Validation And Release Rules

Latest final release passed full build/release-line, eight-locale compiled UI, full gameplay/controller smoke, native startup/keyboard/gamepad/structure, four showroom recovery cases and three actual native Planetfall/context-loss cases. Matched old/new HUD checks show no new or worsened measured failures; normal scale and200-percent390x844 have zero measured failures. This is not a universal accessibility or overall performance improvement claim.

The GitHub checkpoint rechecks non-mutating prebuild/build:current gates and release-specific regressions, and compares runtime/assets against the delivered snapshot. Read `E:/Codex/builds/nova-swarm/github-handoff-20261008/checks-final.json`, `audit-staged.json` and `snapshot-audit.json` for final results. Original checks.json retains two browser fixtures that initially stopped for missing setup; both passed after supplying the source server and E: outputs. Original history-audit.json records why direct development-history publication was blocked. This checkpoint does not create a different Steam binary.

For new changes, rerun appropriate source regressions, `npm run check:release-line`, `npm run check:i18n`, current build, compiled UI/gameplay/controller checks and actual packaged native tests. Do all disk-intensive build work in verified E: staging, not the D: source tree. Use existing `E:/Codex/tmp/nova-steam-current-20261007/source` only after fresh source/staging hash verification and ownership checks. Scripts/build dependencies are already installed; do not install or generate paid content by assumption.

Future authorized Steam target remains App4765070 / Windows depot4765071 / existing private `sector-continue-test`. Authenticate non-target branches/Cloud before and after. Never upload unchanged, failing or unverified content merely to meet a timer. No public promotion, Steamworks settings changes, forum posts, player resets or unsupported quality claims.

## Automation, Cost And Storage

- **Existing automation is PAUSED.** `nova-swarm-six-hour-research-and-builds` is named `Nova Swarm four-hour Steam delivery`, configured every four hours, failed-runs-only. Do not resume, duplicate or retarget it implicitly. Keep the old chat quiet; no emails or periodic status reports.
- Routine design/implementation approval is waived. Cost, publication, destructive-action and security restrictions remain. Never buy, incur overage or new charges without asking. Confirm included/no-charge capacity before generation; otherwise use existing local resources.
- Source stays in the exact D: folder. Build/output: `E:/Codex/builds/nova-swarm`; task TEMP/TMP: `E:/Codex/tmp/<owned-task>`; tool cache: `E:/dev-cache/<tool>`. Set process-local TEMP/TMP and output/cache paths before disk-intensive work. Never fall back to C:.
- Preserve precision controls, Focus/Phase, scoring ownership, eligible modes, pause/focus/draft recovery, readable projectiles, eight locales, accessibility and cleanup. Cosmetic RNG/loading cannot affect ranked gameplay selection. Do not restore rejected miniature submarine/tool-planet props.

## Cleanup And Session State

No new server/build/test/upload session should survive the completed handoff. Check any existing listener/version before reuse; old compiled previews are not current-source evidence. The preceding job retained inherited5017/5011/5013 instead of assuming ownership or deleting their files.

All inherited/policy-rejected cleanup holds remain protected. Latest additional holds from Windows directory-not-empty errors:

- `E:/Codex/builds/nova-swarm/recording-release-20261008/win-unpacked`: superseded native tree,2844162749bytes at final audit.
- `E:/Codex/builds/nova-swarm/recording-release-20261008/current/win-unpacked`: residual directories, zero files.
- `E:/Codex/tmp/nova-recording-release-20261008/package-source`, `package-current`, `package-final`: residual directories, zero files.

Do not retry held deletions through another route. Read the full prior hold list in HANDOFF and `recording-release-20261008/cleanup.json`; it includes old HUD outputs and an old entry bundle. Never empty that inherited web directory. Keep only the current deliverable and expressly needed rollback/comparison for future jobs; clean only newly owned disposable outputs after path/reparse/process/lock checks. Do not touch shared caches, other worktrees, original recordings or application state.

## Rollback

No rollback is requested. Preserve the Steam25791160 native package. The major checkpoint's previous Git parent is7e8325e; never reset to it because that would discard many shipped features. Narrow source reverse-check commands are recorded in `docs/reviews/recording-release-20261008.md`; old patches require fresh checks after later edits. A public Git rollback should be a reviewed revert, not a history rewrite, and requires an explicit request.
