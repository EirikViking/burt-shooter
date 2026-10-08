# Boss mechanical life: first implementation plan

**Goal:** Give the ten existing Colossus families recognizable mechanical breathing/settling during quiet attack intervals, preserving truthful charge poses and collision geometry.

**Architecture:** Extend the existing ColossusRig only. A pure, allocation-free pose sampler fills a reused output object for each existing hull section. Family-specific low-frequency piston/shoulder/rotor movement feeds existing section transforms; charge suppresses idle movement, while actual recoil remains unchanged. Reduced Motion disables the new motion. No new sprites, particles, audio, targeting, director, RNG or gameplay state.

**Spec/design choice:** Ten families already have separate illustrated bodies and charge articulation. Current non-rotor idle motion is nearly identical (opposite 0.007-radius sine); rotors continuously spin. Choose distinct bounded mechanisms over new overlay glows or enlarged charge effects: conductor alternating shoulder intake; forge slow compression/release; mirror opposed glide; needle minimal held tension; vortex orbital vanes; jester paired asymmetric ticks; carrier staggered bay pressure; monolith heavy settling; choir travelling organ rhythm; clock escapement. The new offsets ease to zero during the second half of charge. This is the first movement pass, not completion of all boss art/audio work.

**Tech stack:** Existing Pixi meshes/sprites, JavaScript modules, Node assertions, Chrome/Playwright. Source remains in the established D: checkout. New output/temp roots: E:/Codex/builds/nova-swarm/boss-motion-20261003-23b7a581 and E:/Codex/tmp/boss-motion-20261003-23b7a581. Existing source Vite4973 and verified release-fixed4976 provide candidate/baseline. Current private Steam25683581 remains unchanged until fresh release gates.

## Serial steps and review gates

- [x] Preserve the exact current ColossusRig and capture actual baseline poses.
- [x] Write a pure regression for bounded/finite/full-cycle/unique trajectories, deterministic same-state sampling, zero RNG, exact Reduced Motion and fully charged zero offsets; observe failure before implementation.
- [x] Implement a reusable output sampler in src/effects/BossMechanicalMotion.js and apply it to current halves in ColossusRig.js. Do not move its central collision-covering reactor or change any simulation field.
- [x] Actual Chrome comparison across all ten families: side-by-side baseline/candidate poses, charging pose parity, pause/static-time stability, new motion absent with Reduced Motion, zero added RNG, bounded geometry/entity counts, destruction keeps shared textures alive.
- [x] Run existing Colossus rendering/hazard bounds regression and official input client; inspect actual screenshots and frame-time tails under comparable conditions.
- [x] Record precise local-only status, tests, limitations, source checkpoint and next release gates. Do not upload an incomplete milestone because the six-hour slot elapsed.

October 6 continuation completed the previously interrupted full build, compiled ten-family checks and isolated Windows startup/control tests. Fresh matched compiled frame-tail results, CPU limitations and actual screenshots are in docs/reviews/boss-verification-20261006.md. The earlier source official-input run is documented in the creative sprint report. This completes this first local motion milestone, not the user's entire boss art/audio ambition or a Steam delivery. New candidate root: E:/Codex/builds/nova-swarm/boss-verification-20261006-a3f9c812. Cleanup of job-owned temp was rejected before execution; preserve it and do not retry through another mechanism.

## Review focus

1. Charge aim/muzzle visuals must not wander: new offsets reach exact zero by charge0.55.
2. A paused or repeated identical time input yields identical geometry; no wall-clock sampling.
3. Reduced Motion keeps all new animation static without changing attack cues.
4. Phase changes remain within a small silhouette margin and keep the central collision body visible.
5. Ten distinct motions must be visually inspected; different numerical traces alone do not establish artistic quality.

No new strings/untranslated text, costs or audio generation. Serial self-review follows user instructions; manual design approvals and commits are waived/prohibited respectively. Existing effect budget, private-only publishing gates and inherited build/temp hold remain.
