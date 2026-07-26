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
