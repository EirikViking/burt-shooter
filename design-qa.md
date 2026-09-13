# Gameplay signal polish design QA

## Comparison target

- Source visual truth:
  - `C:\Users\cromk\AppData\Local\Temp\codex-clipboard-f3d076f6-730b-4ca9-9e3c-d1362af75a95.png`
  - `C:\Users\cromk\AppData\Local\Temp\codex-clipboard-e89950a0-8d8f-4cbe-8b56-eb23d89b79a6.png`
- Browser-rendered implementation:
  - `test-results/score-popup-readability-2026-07-26T18-38-41-619Z/score-popup-readability.png`
  - `test-results/wave-clear-effect-2026-07-26T18-38-51-817Z/wave-clear-effect.png`
  - `test-results/rank-up-clarity-2026-07-26T18-39-01-605Z/rank-up-clarity.png`
- Combined comparison evidence:
  - `test-results/design-qa-20260726/combo-comparison.png`
  - `test-results/design-qa-20260726/wave-comparison.png`
- Viewport: source captures 1920 x 1080; implementation captures 1280 x 720 at device scale 1.
- Density normalization: source captures were downsampled to 1280 x 720 before vertical comparison. Both source and implementation are 16:9 gameplay canvases.
- State: active gameplay with floating score/combo feedback and HUD; active wave-clear presentation for the clear comparison.

## Findings

No actionable P0, P1, or P2 differences remain against the requested quality direction.

- Fonts and typography: live text remains crisp, localized, and separate from raster art. Combo tier sizing is stronger without obscuring combat.
- Spacing and layout rhythm: borderless signals occupy less visual mass than the old boxes. The clear flourish stays within the center presentation lane and the Mission Status spine remains inside the existing safe area.
- Colors and visual tokens: cyan, magenta, emerald, and pale-gold accents stay within Nova Swarm's established palette and retain semantic reward/priority colors.
- Image quality and asset fidelity: the two new authored assets are sharp transparent PNGs with no visible chroma fringe. The game renders the assets at measured component sizes rather than stretching them to fill the screen.
- Copy and content: gameplay wording, values, localization keys, timing contracts, and progression semantics are unchanged.
- Accessibility and combat readability: functional telegraphs, meters, hit geometry, target cues, and warnings were preserved. Decorative primitives were the replacement target.

Focused region review was necessary because the transient messages are small in the full frame. The combined comparisons make the combo crest, Near Miss signal, clear flourish, and Mission Status spine readable at the normalized viewport.

## Comparison history

1. Initial wave-clear implementation used the authored flourish but an animation scale assignment overrode its measured width and height, producing an oversized full-native raster.
2. The animation was corrected to preserve the measured sprite dimensions and use only subtle rotational motion.
3. Post-fix evidence `test-results/wave-clear-effect-2026-07-26T18-38-51-817Z/wave-clear-effect.png` shows the flourish contained around the live text with no panel or gameplay occlusion.
4. The deeper follow-up found procedural pips, chevrons, and burst rings in the rank-up card. Those ornaments were replaced with the authored victory flourish and rank artwork/authored fallback signal.

## Primary interactions and runtime checks

- Combo and Near Miss signals were staged through the live Pixi runtime.
- Wave Clear was staged through the production presentation method.
- Rank Up was staged through the production presentation method.
- Message arbitration was sampled across 48 runtime frames.
- No page errors or console errors were reported by the focused checks.

## Follow-up polish

- P3: none required for this release candidate. Further changes to functional gameplay geometry should be treated as mechanics/readability work, not decorative polish.

final result: passed

## 2026-07-28 - Nova Command HUD five-component pilot

### Approval Gate 3 scope

- Gate 2 approved Wave Cleared V2 at `796b2523c9df35017eb8a7bbceb31058c3feb037`. The pilot applies the approved material, typography, line weights, color hierarchy, motion principles, and paired center-axis reactor motif to exactly four additional paths: Mission Status, Flawless side toast, routine Incoming Reinforcements, and Boss Defeated.
- Wave Cleared keeps its approved V2 renderer, dimensions, timing, open-rail occlusion contract, and text hierarchy. Other notification families and the system-wide notification architecture were not migrated.
- No ImageGen output, external asset pack, or new raster asset was added.

### Category-specific results

- Mission Status uses a calm persistent bracket frame, low-opacity central plate, one pressure marker, and no decorative chevron/pip clutter. It is 480 x 74 px at 1920x1080 and 420 x 68 px at 1280x720.
- Flawless is a right-anchored compact rail, 370 x 64 px at 1920x1080 and 342 x 64 px at 1280x720. Its secondary line remains 14/13 px and clears the 48 px edge margin.
- Incoming Reinforcements is an open amber/danger stepped rail with a semantic route cue, not a full-width warning slab. It is 420 x 64 px at 1920x1080 and 360 x 60 px at 1280x720.
- Wave Cleared remains 560 x 96 px at 1920x1080 and 520 x 96 px at 1280x720. The staged German copy expands to 596 x 96 px.
- Boss Defeated uses the restrained major-event variant, 600 x 112 px at 1920x1080 and 520 x 108 px at 1280x720. Prestige reward and neutral repair detail remain at or above the 13 px secondary floor.

### Occlusion and identity

- Each frame defines one deterministic structural half and instantiates it at `scale.x = -1` / `scale.x = 1`. The four categories use different calm-bracket, compact-cap, alert-step, and prestige-step silhouettes rather than copying the Wave Cleared point.
- Dark material is concentrated beneath text. Outer rails remain open and the measured opaque-width coverage is 34.4% for dense compact Mission Status, 57.8% for the compact major event, and below the Wave V2 72% maximum for the transition frame.
- The shared Nova Swarm identifier is the small paired reactor-pulse notch on the exact center axis, supported by `#03111e`/`#09243a` navy material, `#57eaff` primary cyan, `#1d6c83` secondary cyan, semantic amber/danger, prestige gold, and 1.6/1.0 px structural line weights.
- Motion resolves structural rails first and typography immediately afterward from the center. Reduced-motion evidence disables the pulse/scale flourish without changing hierarchy or duration.

### Browser evidence

- Passing 30-capture matrix: `test-results/nova-command-hud-pilot-proposed-2026-07-28T10-12-18-750Z`
- Dense English contact sheet: `test-results/nova-command-hud-pilot-proposed-2026-07-28T10-12-18-750Z/contact-sheet-dense-1280x720-en.png`
- Dense German contact sheet: `test-results/nova-command-hud-pilot-proposed-2026-07-28T10-12-18-750Z/contact-sheet-dense-1280x720-de.png`
- Reduced-motion contact sheet: `test-results/nova-command-hud-pilot-proposed-2026-07-28T10-12-18-750Z/contact-sheet-dense-1280x720-en-reduced.png`
- Real dense overlap case: `test-results/nova-command-hud-pilot-proposed-2026-07-28T10-12-18-750Z/overlap-dense-1280x720-en.png`
- Exact approved-baseline comparisons: `test-results/nova-command-hud-pilot-gate3-comparisons-20260728`

### Packaged evidence and validation

- Packaged executable: `release/desktop/win-unpacked/Nova Swarm.exe`
- Passing packaged report: `test-results/packaged-nova-command-hud-pilot-2026-07-28T10-43-35-882Z/report.json`
- Packaged five-component contact sheet: `test-results/packaged-nova-command-hud-pilot-2026-07-28T10-43-35-882Z/packaged-five-component-contact-sheet.png`
- Packaged 1280x720 H.264 video: `test-results/packaged-nova-command-hud-pilot-2026-07-28T10-43-35-882Z/packaged-five-component-pilot-60fps.mp4` (3.5 seconds, 210 frames, 60 fps)
- Exact Steam runtime package validation: `test-results/steam-package-runtime-2026-07-28T10-40-06-311Z/report.json`
- Full gameplay smoke: `test-results/smoke-2026-07-28T10-44-52-746Z/report.json`
- Passed release-line, localization source/UI checks, current production build, Mission Status, pilot matrix, notification orchestration, reinforcement behavior, controller flow, Steam bridge, browser smoke, local Electron smoke, exact package runtime, and packaged five-component visual validation.
- The generic packaged Steam smoke reports `steam_init_returned_false` because the executable was launched outside the Steam client. Native modules and SDK paths are present; the task did not authorize deployment or Steam state changes.
- Steamworks was untouched. No upload, deployment, branch assignment, Git push, or public/default change occurred.

final result: passed

## 2026-07-27 - Wave Cleared Nova Command HUD prototype

### Approved scope

- This is the Approval Gate 2 prototype for Wave Cleared only. No other notification family, HUD component, gameplay behavior, localization source, Steam setting, or deployment target was changed.
- The supplied 1920x1080 gameplay recordings were reviewed in motion before implementation. The prior treatment used a small, ornate authored flourish whose asymmetric visual weight and low information hierarchy became weak during active combat.

### Design system

- Structural frame: one 300-360 px half is created once and mathematically mirrored with `scale.x = -1` / `scale.x = 1`. Title and secondary typography live in a separate centered layer, so visual symmetry does not depend on the copy length.
- Size contract: 600-720 px wide by 120 px high, inside 48 px viewport margins and at least 18 px below the live Mission Status boundary.
- Timing contract: 180 ms entrance, restrained hold, 300 ms exit, 1320 ms total. The component settles in place and fades without vertical travel or residue.
- Color tokens: dark navy `#03111e`, lifted navy `#09243a`, primary cyan `#57eaff`, secondary cyan `#1d6c83`, reward gold `#ffe58a`, and primary text `#ecfbff`.
- Decorative details: optional deterministic segmented rails, low-alpha technical texture, mirrored reactor notches, and one bounded vector sweep. Typography and structural framing remain complete when decorative accents are disabled.
- Assets: zero new raster or generated assets. The premium result comes from controlled hierarchy, coherent spacing, mirrored engineered geometry, restrained motion, and the existing Nova Swarm type/color system.

### Geometry and localization proof

- Temporary development overlay legend: yellow = component bounds, magenta = rendered alpha bounds, green = typography bounds, white = center axes, red circle = anchor, cyan diamond = pivot.
- Automated assertions require exactly two mirrored structural halves, alpha and typography center offsets no greater than 0.75 px, component dimensions inside 600-740 x 96-145 px, transition-channel ownership, and complete 48 px safe-area containment.
- The final eight-scenario matrix covers quiet, normal, and dense combat; 1920x1080 and 1280x720; English and a long German sample; entrance, hold, and exit; plus decorative accents disabled:
  - `test-results/wave-clear-effect-2026-07-27T15-33-28-407Z`
- The unchanged baseline matrix is preserved outside the repository:
  - `D:\CodexTemp\nova-swarm-wave-cleared-20260727\baseline-matrix-v2`
- Side-by-side baseline/proposed comparisons:
  - `test-results/wave-clear-effect-2026-07-27T15-01-00-016Z/comparisons/before-after-quiet-1920x1080-en-hold.png`
  - `test-results/wave-clear-effect-2026-07-27T15-01-00-016Z/comparisons/before-after-dense-1920x1080-en-hold.png`
  - `test-results/wave-clear-effect-2026-07-27T15-01-00-016Z/comparisons/before-after-quiet-1280x720-en-hold.png`
  - `test-results/wave-clear-effect-2026-07-27T15-01-00-016Z/comparisons/before-after-dense-1280x720-de-long-hold.png`

### Packaged-game proof

- Packaged executable report:
  - `D:\CodexTemp\nova-swarm-wave-cleared-20260727\packaged-wave-clear-2026-07-27T15-36-07-399Z\report.json`
- Dense 1920x1080 hold capture with 15 real level-55 enemies:
  - `D:\CodexTemp\nova-swarm-wave-cleared-20260727\packaged-wave-clear-2026-07-27T15-36-07-399Z\packaged-dense-1920x1080-hold.png`
- 1280x720, 60 fps entrance-hold-exit recording:
  - `D:\CodexTemp\nova-swarm-wave-cleared-20260727\packaged-wave-clear-2026-07-27T15-36-07-399Z\packaged-wave-clear-entrance-hold-exit.mp4`
- Packaged local smoke:
  - `test-results/packaged-exe-smoke-2026-07-27T15-33-17-006Z/report.json`
- Full browser gameplay smoke:
  - `test-results/smoke-2026-07-27T15-23-12-931Z/report.json`

final result: passed

## 2026-07-28 - Wave Cleared Nova Command HUD V2

### Scope and preserved contracts

- V1 remains intact at `cd69db9e76d5be9380160d979e06ff234ad509b3`. V2 changes Wave Cleared only; the other notification renderers and notification timing/orchestration contracts are unchanged.
- Mathematical mirroring, independently centered localized text, 48 px safe margins, strong title type, the 1320 ms duration, clean exit, and deterministic code-built geometry are preserved.
- No ImageGen output or external asset was introduced. No locale source required modification because all dynamic copy continues through the existing i18n path.

### Final geometry and occlusion

- English at 1920x1080: 560 x 96 px overall, with a 398 x 76 px central readability plate and 81 px open rail region per side.
- English at 1280x720: 520 x 96 px overall, with a 360 x 76 px central plate and 80 px open rail region per side.
- Long German at 1280x720: 596 x 96 px overall, with a 492 x 76 px central plate and 52 px open rail region per side. Runtime measurement may expand to the 660 px maximum.
- The full-width opaque slab is gone. Only the text plate carries the stronger dark surface; the mirrored outer rails are open geometry. Measured opaque-width coverage is 56.3% for English at 1920, 54.8% for English at 1280, and 65.4% for the long German sample.

### Nova Swarm signature and hierarchy

- A paired top/bottom reactor-pulse mark sits on the exact center axis. It is a small, mirrored diamond/notch motif rather than a crest or illustration.
- Each side uses one stronger swept energy rail built from the same mirrored half; arbitrary short HUD fragments and low-alpha texture clutter were removed.
- The reward value is a restrained 15/14 px prestige-gold accent. The next-wave detail is neutral cyan at 14/13 px, separated by one clean vertical rule. The title remains 30 px at 1920 and 27 px at 1280 or for the German sample, with a 24 px localization floor.
- During the 180 ms entrance the structural rails resolve first, title and secondary copy begin 38 ms later, and a bounded plate sweep supplies the activation pulse. There is no viewport slide, bounce, extended duration, or residue.
- Optional decorative blade fill and sweep can be disabled while the structural frame, reactor mark, text hierarchy, and safe-area behavior remain complete.

### V1/V2 evidence

- Final nine-scenario V2 matrix:
  - `test-results/wave-clear-effect-2026-07-28T08-40-44-092Z`
- Side-by-side V1/V2 set:
  - `test-results/wave-clear-v1-v2-20260728/v1-v2-quiet-1920x1080-en-hold.png`
  - `test-results/wave-clear-v1-v2-20260728/v1-v2-dense-1920x1080-en-hold.png`
  - `test-results/wave-clear-v1-v2-20260728/v1-v2-quiet-1280x720-en-hold.png`
  - `test-results/wave-clear-v1-v2-20260728/v1-v2-dense-1280x720-en-hold.png`
  - `test-results/wave-clear-v1-v2-20260728/v1-v2-dense-1280x720-de-long-hold.png`
  - `test-results/wave-clear-v1-v2-20260728/v1-v2-quiet-1920x1080-en-entrance.png`
  - `test-results/wave-clear-v1-v2-20260728/v1-v2-quiet-1920x1080-en-exit.png`
- V2 accents-disabled capture:
  - `test-results/wave-clear-effect-2026-07-28T08-40-44-092Z/proposed-quiet-1920x1080-en-no-accents-hold.png`

### Packaged-game proof

- Packaged executable:
  - `release/desktop/win-unpacked/Nova Swarm.exe`
- Packaged validation report:
  - `D:\CodexTemp\nova-swarm-wave-cleared-20260728\packaged-wave-clear-2026-07-28T09-04-11-372Z\report.json`
- Dense 1920x1080 packaged capture with 18 real enemies:
  - `D:\CodexTemp\nova-swarm-wave-cleared-20260728\packaged-wave-clear-2026-07-28T09-04-11-372Z\packaged-dense-1920x1080-hold.png`
- Packaged 1280x720, H.264, 60 fps entrance-hold-exit recording:
  - `D:\CodexTemp\nova-swarm-wave-cleared-20260728\packaged-wave-clear-2026-07-28T09-04-11-372Z\packaged-wave-clear-entrance-hold-exit.mp4`
- Local packaged-executable smoke:
  - `test-results/packaged-exe-smoke-2026-07-28T09-07-45-418Z/report.json`
- Exact-package runtime validation:
  - `test-results/steam-package-runtime-2026-07-28T09-02-55-345Z/report.json`

### Validation

- Passed `check:release-line`, `check:wave-clear-effect`, `check:notification-orchestration`, `check:i18n`, `build:current`, `check:i18n-ui`, `check:steam-electron-bridge`, `smoke`, `package:steam:win:current`, packaged Wave Cleared motion proof, and packaged-executable smoke.
- The all-language UI matrix passed for all eight supported interface languages with no missing translation, overflow, or English-leak failures. Existing ascendant-rank fallback and Rollup chunk-size warnings remain unchanged.
- Steamworks was untouched. No Steam upload, deployment, branch assignment, or Git push occurred.

final result: passed

## Deep HUD and command-surface follow-up — 2026-07-26

### Reviewed evidence

- Mission Status rails and right-side command HUD:
  - `test-results/mission-progress-hud-2026-07-26T22-43-08-685Z/mission-progress-hud.png`
- Localized Cabinet Skill Flight plaque:
  - `test-results/challenge-flight-2026-07-26T22-43-18-839Z/flugpruefung-840x640.png`
- Overrun coronation and confirmation:
  - `test-results/overrun-confirmation-2026-07-26T23-10-22-213Z/overrun-confirmation-held.png`
- Tactical Fusion / Drone Constellation and top-signal safe area:
  - `test-results/tactical-fusions-2026-07-26T23-19-43-291Z/03-drone-constellation.png`
- Forty-eight-frame message placement and clipping sample:
  - `test-results/gameplay-message-overlap-2026-07-26T23-13-06-921Z/report.json`

### Findings

- Flawless Wave is measured from its complete rendered width and remains fully inside the right edge.
- Mission Status progress and directive rails are inset within the authored frame.
- Wave briefing, boss signal, boss phase, boss reward/refuel, Bomb Banked, Near Miss, combo, and related shared signal families use the authored combat flourish with live localized text.
- Lives, Sector, and Trait now form one authored command stack without changing their values, timers, or status behavior.
- Cabinet Skill Flight uses a dedicated targeting plaque while its live objective and progress bar remain functional.
- Drone Constellation has dedicated crest art in both the fusion reveal and HUD chip.
- The Overrun gate uses an authored coronation dais and command capsule while preserving the existing seal, score, hull count, reward values, and confirmation hold.
- Functional attack telegraphs, hit geometry, spawn warnings, target rings, meters, and timers were deliberately retained.
- The final 1280 x 720 capture shows the top signal below Mission Status and all right-side command capsules inside the viewport.

final result: passed
