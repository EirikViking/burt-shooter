# Counterweight: normal rotation and ordinary pressure — October 7, 2026

## Current checkpoint

Verification is incomplete and now blocked by E: access. The local catalog contains Counterweight, but this document does not claim a completed tenth admission milestone or a new Steam delivery. Counts remain nine completed local contacts and eight delivered; 58 still need completion, including this pending candidate. The 42 decorative creatures are separate.

Evidence: `E:/Codex/builds/nova-swarm/counterweight-pressure-20261007-53fbe286`. The previous isolated preview and frozen Windows cut are preserved.

## What changed and why

The existing contact rotation places Counterweight immediately after Reactor Tow, using the next existing eligible opportunity. The eight rescues and Reactor retain their relative order. No new random draw, spawn, director, profile history or shorter recovery was added. Second–fourth eligible opportunity is an introduction hypothesis, not a measured population frequency.

Admission checks both existing `rescue_contact` and `linked_battery` recovery. A blocked opportunity leaves the pending card untouched; actual arrival records both families. Unrelated rescues still require only their existing contact family. This avoids presenting linked weapon hardware under another name during its recovery.

Ordinary-pressure probes exposed a presentation defect: the old sideways entrance swept both guns across one autofire stream, disabling them before the intended target choice mattered. Counterweight now descends vertically over stable horizontal lanes. It remains fully vulnerable, with the same six scaled HP, 3.6-second approach and 16-second lifetime. No second health bar or forced viewing interval.

A separate runtime regression exposed a charge sound that did not replay after pause. Pause/draft visibility handling now clears the stopped cue's flag so the renewed full warning has its sound.

## Observed tests so far

- Failing regression before each fix: normal catalog absent, lateral entry moving gun lanes, and stopped charge cue not replaying.
- 1,000 seeded orders: Counterweight appears second/third/fourth with counts 341/324/335. Three captured prior order fixtures remain identical with Counterweight removed. Reactor still occurs among the first three opportunities.
- Model and actual source-director tests: both family gates, unchanged pending card while blocked, both families recorded exactly once, finite expiry, no rescue/reward, reset, mode eligibility, Sector 51 and deep scaling.
- Source component runtime: sectors 3/51/401, warning/shot geometry, damage ownership, finite bullets/cleanup, pause/draft/major-warning/bomb/death and shared texture lifecycle pass, including the new failing-then-passing assertions.
- Corrected ordinary-pressure substitution: port-gun targeting at 161.64 seconds in Sector 3 left the other gun alive and produced one tilted, warned shot; the contact ended after 9.48 seconds of eligible contact time. Starting damage 1.05, two lives, five ordinary enemies and 30 hostile bullets. No health/damage grants. This replaces one naturally eligible contact; it is not natural selection evidence.
- A second corrected substitution with pivot-seeking input still broke both guns through incidental fire while navigating ordinary threats. It expired with no shot and two lives. Do not call this proof that the pilot successfully chose the pivot.
- The first unsubstituted finite-life run died around 100.80 seconds in Sector 2 before Counterweight; the admission assertion correctly failed. No game error was captured. A second run used a better bullet-predicting test pilot, changing only keyboard decisions. Last observed sample was 257.59 combat seconds in Sector 4 with three lives, without Counterweight yet. Its process handle was lost and the result file became inaccessible. Final outcome is unknown; no natural-admission pass is claimed.

## Scoring and manual limits

Counterweight can emit at most six ordinary hostile bullets, adding up to six possible graze opportunities. Parts grant no score, XP, kill, rescue, achievement, hit credit or drop. Intercepted player shots are consumed without becoming credited accuracy hits. One extra card delays/dilutes later rescues and their assistance/Payback opportunities. There is no global scoring compensation or leaderboard reset.

Automated checks do not establish first-sighting comprehension, third-sighting interest, music/warning mix quality, or fairness across human skill levels. Center aiming may remain the simplest way to disable the encounter; human play must determine whether lateral targeting is appealing. Existing reused audio remains quiet; no premium mix claim.

## Files and tuning

Production edits: `src/config/ConvoySurpriseCatalog.js`, `src/game/ArcadeFirstLight.js`, `src/managers/ArcadeFirstLightDirector.js`, `src/effects/ArcadeFirstLightVisual.js`; the header in `src/game/Counterweight.js` now describes admission. Timing/HP/tilt live in Counterweight.js; order and family membership live in the catalog; vertical entry lives in ArcadeFirstLightVisual.js.

New scheduling regression: `scripts/check-counterweight-admission.mjs`. Existing Counterweight model/integration/runtime, Reactor model/admission, convoy model and three original-rescue runtime fixtures were updated for ten catalog cards and eight rescue-specific recipes. No player-facing string changed.

Repository: `D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920`, branch `codex/sector-leaderboard-unknown-20260928`, baseline HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`, no upstream. Inherited work is preserved. No fresh remote-state claim under restricted network.

## Delivery and cost boundaries

Latest authenticated Steam remains Build 25765088 / manifest 3743460415809241959. No new upload, Windows packaging, Steamworks/Cloud/public change, forum publication, player reset or paid generation occurred. The frozen requested Windows cut was not modified; its native startup and Steam authentication gates remain blocked as previously documented. Standard E: writes worked earlier in this continuation; the fresh test below now fails. This continuation did not retry denied cleanup, network, Gmail or automation operations or change security settings.

No email sent. Last verified successful email remains October 7 at 04:10:05 Oslo, message `1a1142009d54ae4f`. The normal 20-second fauna catalog remains inactive. The unidentified central artifact is still unresolved. Existing Chinese `SPEED UP` and tight German menu subtitle padding remain unrelated follow-ups.

## Tool-host interruption and fresh access failure, 08:51–08:56 Oslo

An image-inspection tool returned `code-mode host exited during handshake`. The subsequent `write_stdin` for the running natural test returned `Unknown process id 36067`. This does not establish whether that process finished or was terminated.

Standard-access read call (no sandbox override):

```powershell
Get-Content -LiteralPath 'E:/Codex/builds/nova-swarm/counterweight-pressure-20261007-53fbe286/natural-predictive.log' -Tail 14
```

Tool output chunk `f24a43`: `Access to the path 'E:\Codex\builds\nova-swarm\counterweight-pressure-20261007-53fbe286\natural-predictive.log' is denied.` The subsequent "cannot find" is a secondary message after denied access, not evidence that the file was deleted.

A single new-file standard-access probe used `[IO.File]::Open(path, CreateNew, Write, None)` at:

`E:\Codex\tmp\counterweight-pressure-20261007-53fbe286\access-probe-64972e98-4cce-4fe6-998b-50fc591f85a9.txt`

Chunk `9e5c26`: `Exception calling "Open" with "4" argument(s): "Access to the path 'E:\Codex\tmp\counterweight-pressure-20261007-53fbe286\access-probe-64972e98-4cce-4fe6-998b-50fc591f85a9.txt' is denied."` No test file was created; no deletion attempted. This is a newly tested access failure, not a claim that earlier successful writes were imaginary.

The active developer-provided permissions are `workspace-write`, `approval_policy=never`, restricted network. The writable project root is D:; the required E: roots are absent from the current writable-root list. Neither failing tool output names a reviewer or gives a more specific ACL/sandbox cause. No claim that config.toml or the UI setting was inspected or repaired. To resume builds, the running tool session needs allowed access to the established E: output/TEMP/cache locations; do not relocate or alter global security settings as a workaround.

Fresh read-only source checks still pass after that interruption: Counterweight eight groups, integration, 1,000 admission orders, convoy ten-card/eight-rescue model, Reactor model/1,000 admission orders, encounter evolution and expansion. Direct release-line, i18n and eight-locale Onslaught checks also pass. They create no build output. Same root/branch/HEAD/no upstream reverified; no new fetch or remote-freshness claim.

**Not run for this revision:** full build, compiled UI/weapon/family checks, matched compiled frame tails, native packaging/startup/controller and authenticated Steam delivery. The prepared E: build script was never launched. Previous preview build checks do not certify this changed source. Current source runtime and substitution evidence above remain valid observations, but cannot substitute for these missing gates.

## Resume, rollback and cleanup

After E: access is restored, read `natural-predictive.log` and `natural-predictive/report.json` before rerunning anything. Check whether the source server at 4993 or an owned browser survived; no orderly shutdown is claimed after the handle loss. Do not terminate unrelated processes. Complete natural admission evidence, existing rescue runtime regressions, full `build-fixed.ps1`, compiled family/18-weapon/UI checks and `measure-revision.mjs` against the previous compiled preview. Helpers are in this job; compiled candidate port is 4994, previous comparison port 4992. The previous frozen Windows package stays separate.

Tuning is still a hypothesis. Before delivery, evaluate first/third-sighting decisions and whether incidental broad autofire makes the pivot/guns trivial. Inspect actual corrected-arrival imagery and warning/music mix. The earlier video shows the prior sideways entrance and must not be mislabeled as final footage of this revision.

Narrow **admission-only** rollback check passed, not applied:

```powershell
git apply --reverse --check --ignore-space-change docs/reviews/counterweight-normal-admission.patch
```

This patch would remove Counterweight from the normal deck while preserving the isolated mechanic, vertical entry and pause-audio fixes. It is not a full restoration of the previous source snapshot; normal-admission tests would then need corresponding revision. Any actual reversal requires an explicit request and fresh check. Full pre-edit snapshots remain under this job's `before/` but cannot currently be read; do not reset HEAD or apply the older milestone's patch blindly.

Retained: current source/tests/docs, current E: pressure evidence and helpers, the previous verified preview build/MP4 and frozen Windows cut. New job TEMP `E:/Codex/tmp/counterweight-pressure-20261007-53fbe286` and Vite cache `E:/dev-cache/vite/counterweight-pressure-53fbe286` remain; cleanup and free-space recheck are incomplete because E: access is now denied. Earlier denied/inherited paths were untouched. No bypass or repeated denied deletion. Final Git count is recorded in HANDOFF. Old Goal remains last-known usageLimited; it was not resumed or replaced.
