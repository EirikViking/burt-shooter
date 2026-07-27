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
