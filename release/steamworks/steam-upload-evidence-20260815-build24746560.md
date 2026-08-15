# Steam test deployment evidence — BuildID 24746560

- AppID: `4765070`
- Depot: `4765071`
- Depot manifest: `1882932982972971451`
- Live branch: `sector-continue-test`
- Previous test-branch BuildID: `24744996`
- Public/default BuildID after deployment: `24733684` (unchanged)
- Legacy `test-build` BuildID after deployment: `23782673` (unchanged)
- Source branch: `codex/unbounded-career-rank-20260814-7f3a`
- Source commit packaged: `0fe0662ef6e92cbb99fc44720c2f9379e794091b`
- Verified baseline: `d453bdb06ea4f0269f1be874dc892a6878cb31d4`
- Build stamp: `v2026-08-15_04-05-12`
- Steam description: `Contextual first-run controls and overlap-safe menus 0fe0662 v2026-08-15_04-05-12`

## Payload identity

- Files: `410`
- Bytes: `1,178,141,473`
- Payload manifest hash: `3bd28b856cf63028642d80984f9f1d6bb441b46b661c81efc81887dfe9079a89`
- Executable SHA-256: `078351cdbbb3a47ca73b1e4db04d15a21fe19fac251388cc95faf821eab550db`
- Executable bytes: `226,698,752`

The packaged payload contains only the required Steam API runtime DLLs. SteamCMD, Steam service/client tools, `steam_appid.txt`, and the full SDK toolset were not staged in the depot.

## Product behavior

- First-run Phase and Focus teaching is split into two short contextual prompts.
- Phase appears when the first hostile projectile creates a real dodge opportunity.
- Focus appears only after friendly-projectile density is meaningfully compressed for a sustained interval.
- Tactical, no-agency, pause, draft, and higher-priority messages supersede the prompts; Phase and Focus cannot overlap.
- The shipped Settings clearance fixes are included in this payload.
- No combat power, difficulty, scoring, persistence, leaderboard, or experimental-mode behavior changed.

## Validation

- ChatGPT Pro final visual review of exact build captures — `APPROVED 100%`.
- `npm run check:first-run-retention` — passed six deterministic scenarios, keyboard/controller variants, threshold timing, priority deferral, retry behavior, returning-pilot parity, experiment isolation, all eight locales, three layouts, and maximum UI scale.
- Strict Settings clearance matrix — passed all eight languages at 1920×1080, 1280×720, and 960×640 at UI scale 2 (24 layouts).
- `npm run check:menu-overlap-audit` — passed 13 menu states at three supported viewports.
- `npm run check:menu-scrollbars` — passed.
- `npm run check:ui-scale-4k` — passed.
- `npm run check:tyrian-responsive-ui` — passed five layouts and 50 screenshots.
- `npm run check:i18n` — passed all eight supported languages.
- `npm run check:i18n-ui` — passed all eight languages with no console, page, placeholder, or English-leak errors.
- `npm run check:input-state-transitions` — passed.
- `npm run check:control-options-runtime` — passed.
- `npm run check:keyboard-bindings-runtime` — passed.
- `npm run check:late-game-experiment` — passed; experimental behavior unchanged.
- `npm run check:run-mode-identity` — passed.
- `npm run check:controller-flow` — passed after aligning its stale final assertion with the intentional first-flight Y = View Details contract.
- `npm run smoke` — passed full menu, Settings, desktop, controller, pause, compact, game-over, mobile, wave, and boss coverage.
- `npm run desktop:smoke:current` — passed.
- `npm run build` — passed; 899 modules.
- `npm run check:release-line` — passed before packaging and upload.
- `npm run package:steam:win:current` — passed.
- Packaged direct-launch smoke — rendering, local API, native Steam module, AppID, and Cloud identity passed; live leaderboard access correctly reported unavailable because the Steam client was not logged on.
- `npm run desktop:controls:packaged` — passed.
- `npm run desktop:perf:packaged` — passed: minimum 59.5238 FPS, average 59.9550 FPS, 11 samples, zero warnings/errors.
- SteamCMD upload — exited 0 and reported `Successfully finished AppID 4765070 build (BuildID 24746560)`.
- Authenticated Steamworks build-history verification — BuildID `24746560` is live only on `sector-continue-test`; public/default and `test-build` are unchanged.

## Rollback

If the private test build must be rolled back, assign BuildID `24744996` to `sector-continue-test`. Do not change public/default.
