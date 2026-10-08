# Recording Follow-up Steam Release

## Delivery Status

Delivered and authenticated October 8 at 15:23 Oslo: **Build25804727 / manifest1522691908505213588**, version **v2026-10-08_14-53-03**, on private `sector-continue-test`. User explicitly requested this new build and upload. Receipt: `E:/Codex/builds/nova-swarm/recording-release-20261008/delivery.json`; source/package/test seal: `verification.json` in the same directory.

Target: App4765070, Windows depot4765071, existing private `sector-continue-test`. No public promotion or Steamworks settings changes are authorized by this release.

Authenticated initial Steam state: public25791160, private25791160, test-build25778573. Public was promoted before this job; author and exact action are not established here. Preserve this current state outside the private target, not the older receipt's public assignment. Cloud configuration hash remains2baeb1acdb90a31ddae4f907711cc6d4ba9bb4724500617046036c93c41d334f.

Fresh authenticated before/after comparison confirms only the private target changed. Public25791160, test-build25778573, other branch/depot metadata and Cloud are unchanged. Steamworks settings untouched; no public promotion, player-state changes, email or spending. The exact uploaded local Windows executable was tested; a new Steam-client download/install was NOT tested.

## Changes Since Build25791160

- Compact HUD: separate score/lives and objective/upgrade regions, constrained upgrade rows with an overflow count, improved rank/chase spacing, and better placement of active tools and ship-trait panels. Existing letterbox space is used when the complete panel stack clears touch controls.
- Release-stage HUD fixes: bound the high-scale compact combo to its lane; remove excess empty tool-row padding without reducing text size; make lower-letterbox docking clear mission/upgrade reservations. These repair new portrait200-percent regressions found during matched native testing, rather than shipping the earlier candidates.
- Completed rivals: the existing finite result/wreckage presentation now finishes during later warnings. Unfinished contacts and paused encounters still freeze, and rewards remain once-only.
- Hangar graphics recovery: retain the last genuine ship image during WebGL context loss, including loss inside a draw; retry the pending pose after restoration. A stationary ship no longer remains blank merely because a failed render was recorded as successful.

Product files: `src/ui/HUD.js`, `src/game/ArcadeFirstLight.js`, `src/ui/SolidShipView.js`, `src/ui/AstraTurntable.js`. Exact source comparison against the previous delivery snapshot identifies only these four modified existing runtime files. Added `PlayerHullSilhouette.js` is isolated and unimported, NOT an implemented feature. Version/service-worker stamping is build metadata.

Planetfall, Veilborn articulation/audio, Reactor Tow, Counterweight and the first-collapse shader fix are retained from the previous delivered package. They are not new improvements in this release. No new audio recordings or mix change is claimed.

## Gates And Limits

Fresh release-line, source i18n/Overrun eight-locale, Steam Electron bridge and rival-result expiry checks pass. Full prebuild initially stopped because the isolated staging copy omitted the existing achievement-icon manifest; copying the canonical206-file icon directory fixes that staging omission, and the complete prebuild and build:current pass1110modules. Existing large-chunk warnings remain.

Final-version compiled eight-locale UI, FULL gameplay smoke, controller-only flow and all four actual WebGL showroom recovery cases PASS. Native structure, SDK gate, startup, keyboard/gamepad controls, all four showroom recovery cases and three Planetfall gameplay/context-loss cases PASS. Final release-line and452-file source/electron seal PASS. Native packaging verifies4515retained dependency files and15695archive entries. Entry SHA256: `d35ab75c88da847ab74c5e6c69d22a778da6ae92a6219fe058e3b8e037c8ad39`; app.asar SHA256: `86f94bf4ac554774704d9e36b8b2209ff60c934abbff6438edcba28522ea41b1`.

Matched compiled/native HUD checks compare against actual Build25791160 at960x540,1280x720 and390x844, scales1and2. All normal-scale cases and200-percent390x844 have zero measured failures. Inherited200-percent960/1280 failures remain unchanged or improved; checks also compare clipping distance and overlap fraction, not merely failure identities. Native screenshot fixture now yields between renders after its synchronous timing sample so Pixi text uploads reach the captured pixels. Final portrait and normal desktop pixels inspected. Native HUD600-sample per-case mean below0.8ms and p99 below2ms; these scoped measurements are NOT an overall performance gain claim.

Planetfall current native admission1528-1629ms; desktop/portrait collapse CPU maxima11.9/16.3ms, zero above50ms. Once-only kill/reward, next boss, pause, context fallback and owned cleanup pass. These are controlled eligible-sector tests, not whole-run reachability or target-machine soak. First earlier controller trial completed its checkpoints but had one unattributed resource failure; added diagnostics without relaxing assertions, then diagnostic recheck and final controller tests passed. Cause of that initial failure is unestablished.

Blocked/unintegrated work remains outside this release: player silhouette integration, redundant projectile allocation removal and the Onslaught warning/boss identity mismatch. Do not retry failed writes to Bullet.js, Player.js or PlayScene.js through another route. Whole-run Planetfall reachability, natural Counterweight frequency, cold admission, target-hardware soak, human sound/fun judgment and the unidentified central artifact remain open. No full accessibility or general performance-improvement claim.

## Reproduction And Ownership

Same sole writer, branch `codex/sector-leaderboard-unknown-20260928`, baseline/HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`; inherited changes preserved. No reset, clean, stash, pull, switch, commit or push. Git checks and fetch dry-run completed before work. No new untranslated strings; inherited German clipping and Chinese SPEED UP polish remain.

Owned release root: `E:/Codex/builds/nova-swarm/recording-release-20261008`; temporary root: `E:/Codex/tmp/nova-recording-release-20261008`; Vite cache: `E:/dev-cache/vite/nova-recording-release-20261008`. Reused verified staging `E:/Codex/tmp/nova-steam-current-20261007/source`.12522source/staging files were hash-checked before the build; explicit build stamping affects staging metadata, not D: source. Current web/native deliverables are `final/web-current` and `final/win-unpacked`. Previous combined Windows package is the required comparison/rollback.

Native packaging reuses the byte-verified installed runtime/dependencies from the previous package only after dependency manifest equality checks; replaces all dist/electron files; verifies every archive entry and retained native dependency. The staging copy's asar tooling lacked concat-map, so the existing functioning project asar tool is used read-only as in the previous release; no dependency download or purchase.

A compound source-server/HUD diagnostic command was rejected before execution. Its5018server and diagnostics were not started or retried. Final compiled preview5019 was separately started and tested, then stopped with process-ownership verification after delivery. All build/test/upload/cleanup sessions finished. Prior preview5017 and all inherited cleanup holds remain untouched. The automation was alreadyPAUSED when inspected; its delivery snapshot was refreshed while preservingPAUSED, four-hour cadence, failed-runs-only and no email/periodic reports.

Cleanup receipt: `E:/Codex/builds/nova-swarm/recording-release-20261008/cleanup.json`. Superseded web builds, most package staging, isolated native/browser profiles and own Vite/Node caches removed after ownership/reparse/process/lock checks; absence verified. Final native/web and previous combined native rollback retained. E:free134333988864bytes, about22.2GB reclaimed relative to pre-cleanup free space. Cleanup is NOT fully complete: repeated Windows directory-not-empty errors leave the superseded root `win-unpacked` (2844162749bytes), `current/win-unpacked` (zero files), and temporary `package-source`, `package-current`, `package-final` (zero files). Exact absolute paths are in cleanup.json/HANDOFF. These paths are held without further retry; all inherited policy-rejected holds remain. No underlying security rejection is asserted for this Windows error.

Test-code changes include `scripts/check-compact-hud.mjs`, `scripts/check-rival-result-expiry.mjs`, `scripts/check-showroom-recovery.mjs` and request-failure diagnostics in `scripts/check-controller-only-flow.mjs`; reproduction scripts/receipts remain in the E: release root. See source-delta.json for the runtime inventory. Review/HANDOFF/progress are documentation changes. The isolated PlayerHullSilhouette helper and expected-red combat-followup tests are not delivered fixes.

Rollback reference: previous private Build25791160, preserved at `E:/Codex/builds/nova-swarm/combined-20261008/win-unpacked`. Narrow source rollback patches: `docs/reviews/recording-release-hud.patch`, `docs/reviews/rival-result-expiry.patch`, `docs/reviews/showroom-context-recovery.patch`. Dry-run command: `git apply --reverse --check --ignore-space-change docs/reviews/recording-release-hud.patch` (substitute each other patch separately). Actual reversal only on explicit request after a fresh check, by omitting `--check`; never reset inherited work. This does not roll back Steam. No rollback executed.
