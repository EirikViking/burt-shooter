# Hangar controls, active ship, menu audio and pickup artwork

Baseline 841f0391337ac284ed74ce721bcbf8c67cfb9436, branch codex/astra-visual-overhaul, uniquely owned requested D: checkout. Fetch, branch/log/status/worktree checks completed. The only inherited untracked files are the two task-owned Tyrian forum drafts from the preceding turn; they remain untouched and excluded from this commit.

## Changes

- Hangar pointer Back still called openHangarMenu, while keyboard/controller used returnToMenu. The pointer handler now uses the same direct return path. This explains why the earlier test, which called returnToMenu directly, missed the bug. The pointer-down/release guard remains.
- Returning from Hangar commits the selected unlocked hull to the session, shared selection state and existing saved selection. Locked previews cannot replace the active ship. No run must be launched to apply a selection.
- The existing Music/Ambience control is now the first row in Settings Audio, rather than beneath the volume sliders or near the bottom. Ambience remains default and the existing audio preference/persistence engine is preserved. Actual button clicks were verified to start music. No new sounds or strings.
- Companion drones now fly in alternating left/right wing positions outside the hull, with limited idle motion, and draw above the ship artwork. Their 34px detailed hulls remain; no enlarged collider or damage change. One drone no longer sits directly behind the player. Temporary four-drone formations use a second staggered rank.
- Removed the runtime primitive icon override for Stasis Net, Void Crown and Chrono Anchor. All pickup texture requests now use their illustrated assets, matching Codex. The existing Hyper Rail correction remains. Full 79-texture sheet was reviewed at gameplay scale.
- Replaced the remaining flat Row Core RO badge with transparent Imagegen artwork: crossed mechanical oars around a cyan reactor with red, gold and titanium materials. Original generation: C:/Users/cromk/.codex/generated_images/01a07c7f-68cf-7f50-a0f4-45ce84e71f3a/exec-9c512c8b-05a5-478e-8da3-f4a1ebe36ab1.png. Shipping asset replaces public/art/generated/nova-swarm/powerups/nova-powerup-row_core-20260613.png; stable ID/path retained.

## Validation

Passed release-line (German, top-three localization and marketing markers), check:i18n, production guard chain/build:current, eight-language/80-screen check:i18n-ui, and controller-only flow. No untranslated player-facing text was introduced. Existing large-bundle warning remains.

Focused source test clicks the actual Hangar Back and Settings Audio controls, verifies saved/active selection, checks home return from Other Modes, confirms Music playback, captures one/two/four wingmen, and checks all 79 powerup texture requests resolve to valid illustrated originals. Actual rendered art sheet and audio layout were inspected. Test file: scripts/check-hangar-wingmen-20260909.mjs; evidence: test-results/hangar-wingmen-20260909/.

The initial focused harness incorrectly captured drones during the intro, then omitted their expiry and allowed the normal runtime to remove the injected fixture. Neither run was counted as visual proof. Corrected fixtures apply the real drone upgrade, retain a bounded formation fixture for four drones and capture live gameplay. Another harness-only failure came from a bare browser import of pixi.js; the sheet now uses live renderer constructors.

The installed web-game skill client was attempted; its bundled browser is missing. A task-local copy selecting installed Chrome completed. Its screenshot is supplemental, not a substitute for the focused control/visual checks. Initial controller preview startup timed out while the production build was copying assets; the same suite passed against the running source server.

The production build completed before final Row Core replacement. That image was copied identically into dist, then the production bundle was refreshed with runtime ed3f925 while retaining the already copied static assets. Native package validation verifies the runtime stamp and every powerup artwork hash, including Row Core. No full campaign, human balance claim, live leaderboard submission or live Cloud round trip.

The actual Windows executable passed pointer Back from Other Modes, active/saved hull selection, selection after reload and direct Play, actual Settings Music clicks and persistence, and an actual tactical drone upgrade. No renderer errors. Evidence: test-results/hangar-wingmen-20260909/native/report.json. The fresh profile isolates Steam services and user saves. Runtime-only staging removed developer SDK files from the package; check-steam-package-runtime passed afterward. A repeat native navigation timed out at the harness's 30-second load deadline while payload hashing was running; this failed attempt is retained separately in native-final/report.json and is not counted as a pass.

The staged package subsequently passed the same complete native check with a fresh isolated profile and a 120-second navigation deadline, after payload hashing finished. Evidence: test-results/hangar-wingmen-20260909/native-staged/report.json and its music-choice/tactical-drone screenshots. All QA instances and the task-owned source server are closed. The upload payload manifest covers 410 regular files, 2,014,387,043 bytes, with ASAR SHA256 a42dde8fca2f5d3bd49eb85a2e7bc35d747f263a91e52e1590225ca0e984cb64.

## Delivery boundary

Steam Build 25203769 is verified on sector-continue-test, depot 4765071 manifest 9091888197591386203. Receipt: docs/hangar-wingmen-steam-delivery-20260909.json. Public was already 25197058 at this task's live preflight and remains there; test-build 23782673 and the full Cloud settings block are unchanged. No public deployment, Steamworks configuration change or forum publication. The upload used the existing cached C:/steamcmd login; an earlier attempt with the repository SDK's separate SteamCMD instance lacked cached credentials and did not upload anything.

Runtime is ed3f925 on codex/astra-visual-overhaul. Files changed: src/scenes/ShipSelectScene.js, src/ui/SettingsOverlay.js, src/entities/Player.js, src/utils/GameAssets.js, public/art/generated/nova-swarm/powerups/nova-powerup-row_core-20260613.png, scripts/check-hangar-wingmen-20260909.mjs, progress.md and this report, plus the delivery receipt and continuation handoff. No new untranslated text. Historical performance observations and the unsupplied testing bot remain unchanged. No further implementation or upload remains in this batch. Verification covers the actual isolated package and Steam server assignment, not a Steam-client download or human playtest.

Source rollback: git revert ed3f925. Prior Steam test build 25197058 is a separate test-branch deployment rollback. Preserve the two untracked Tyrian drafts when reverting or continuing.
