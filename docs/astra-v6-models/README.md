# Astra V6 — flagship and milestone presentation

Original V6 baseline: `7358d00757869543df9d1c14110cbea8e256c075`, clean `codex/astra-visual-overhaul`. Fetch/status/branch/log/worktree and AGENTS checks completed. Continue this same experiment; no main-branch substitution, pulls, merges, rebases or unrelated work changes.

The main-menu flagship no longer auto-rotates through baked views. Pointer rotation remains. The small Blender service craft were removed from the menu; the source assets remain preserved. Low-cost gantry lights and illuminated landing rails replace them. Existing Blender flagship and 30 ship portraits are reused.

Overrun milestones and the menu unlock presentation now feature the player's ship in a dimensional coronation portal, staged ring expansion, orbiting light arcs, ascending sparks and milestone-specific palette/geometry. The existing translated reports, bonuses, voices, confirmation gate and simulation pause remain unchanged. A dedicated 384px portrait is released on ceremony teardown. Ordinary combat does not run these graphics.

New players get a short main-menu explanation that three starter ships are available in the Hangar, plus a first-flight hangar cue to compare firepower. Existing contextual movement/fire/phase/focus coaching remains. No forced movie, modal tutorial, new save key, or delay was added; returning players retain the normal copy.

## Original art and audio

- `coronation-source.png`: original built-in ImageGen output, generated for this task. Full prompt in `prompt.txt`. Transparently normalized to `public/art/astra/coronation-v6.webp`, 640px, WebP quality 92/alpha 100, using Sharp. No purchased or imported third-party art. OpenAI output use remains subject to its terms; no exclusivity claim.
- `coronation-original.wav`: original deterministic D-major fanfare composed in `scripts/render-astra-coronation-audio.mjs`, with synthesized harmonics and stereo echoes. Regeneration uses local Node and FFmpeg; no external samples or API charges. Runtime MP3 is mastered to a -20 LUFS target / -2 dBTP ceiling. Existing voices/shockwave and mixer controls remain. Signal checks are not a claim of a human listening review.
- Existing Blender sources, renders, original asset/font rights and commercial-use notes remain in `docs/astra-v5-models/README.md` and the preceding overhaul documentation. No new Blender model was needed for this focused pass; its detailed renders are integrated in the ceremonies.

## Validation and evidence

Baseline confirmation capture: `test-results/astra-v6-baseline-overrun`. Candidate comparisons and seven milestone scenarios: `test-results/astra-v6-presentation-verified` (also German 800x600, Japanese 600x800/reduced motion, and menu unlock). All focused checks pass. Generic skill client ran with installed Chrome, with controls/state output; its raw Pixi canvas readback is black, so actual compositor screenshots above are the visual evidence.

Eight-language UI suite and i18n checks pass. Existing score-bonus source-regex test fails identically against clean `7358d00` under `test-results/astra-v6-baseline-static`; no scoring code changed. Early broader milestone and controller-first-run tests timed out; final packaged verification and any remaining limits are recorded in the delivery report. Tests were not weakened.
