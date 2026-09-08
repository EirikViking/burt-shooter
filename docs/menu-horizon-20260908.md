# Main menu: Horizon launch bay

User authorized a substantial visual upgrade of the clean main menu. Baseline: `047fc68d39aa054695dc385996a5ef7079292b43`, verified clean on `codex/astra-visual-overhaul` in the requested D: worktree after fetch and ownership checks.

## Delivered design

- Image-generated orbital hangar, amber sunrise, planetary atmosphere, fractured ring and reflective launch platform. Dark space on the left preserves title and button readability.
- Menu-owned animated stars, three distant patrol ships with trails, drifting particles, soft light shafts, sunrise glow and travelling platform lights. Pointer parallax adds depth. All geometry is bounded; no gameplay random state, input capture, timers or new full-screen filters.
- Existing selected-ship turntable, engine lights and music retained. A luminous title signature, polished dark Play panel and moving edge accents provide a clearer visual hierarchy. Play remains immediately available.
- Reduced-motion preference stops new animation and hides flight traffic. Modal overlays dim the new background layer and retain their input priority. Backdrop disposal owns the decorative layer, including asynchronous asset-load guards.
- Compact landscape text/button width and ship plaque placement improved. Portrait keeps the existing stacked layout.

No gameplay, rewards, balance, save formats or new player-facing text. Existing translations and ElevenLabs audio are retained; no new or synthesized sound was introduced.

## Asset provenance

Generated using the built-in image-generation tool on 2026-09-08. Original retained at `C:/Users/cromk/.codex/generated_images/01a07c7f-68cf-7f50-a0f4-45ce84e71f3a/exec-57ade534-2d74-40fe-9011-1c86dafbe4f0.png`. Runtime asset: `public/art/menu-horizon-20260908/launch-bay.webp`, 1672 × 941, 351422 bytes, quality-94 WebP conversion. No external stock asset or new dependency.

## Validation and boundaries

Focused source check: animated clock, modes/Codex/settings returns, modal input, screenshots at 1920×1080, 1280×720, 800×600 and 390×844, and stopped reduced-motion clock passed without page errors. Full-size, compact and portrait screenshots inspected. Controller-only flow and i18n text checks passed. Evidence: `test-results/menu-wow/`.

Initial broad i18n UI run timed out entering gameplay while source files were being finalized and the public asset snapshot was being prepared; preserve this failure, then record the final frozen-build run separately. Build/package/delivery status is appended after verification. No human claim of improved sales or first-launch delight; visual quality remains a player judgment. Prior performance observation and gameplay test limitations in the handoff remain unresolved and unchanged.

Steamworks settings and public deployment are outside this visual change. Source rollback is a revert of this pass's runtime commit from a verified clean checkout; it does not change a Steam branch assignment.

## Final candidate verification

Runtime commit: `7ab0116`. `check:i18n`, `build:current`, `check:i18n-ui` (all eight languages, 80 screenshots), `check:controller-flow`, `check:release-line`, `check:steam-electron-bridge`, Steam native staging and package-runtime verification passed. The final frozen production i18n run had zero page errors, placeholder hits or English-leak hits; it supersedes the earlier timed-out source run without erasing that evidence.

The isolated packaged native check verified the artwork SHA256, first launch, modes/Codex/settings mouse and Escape returns, exactly one owned horizon after re-entry and no page errors. Five-second frame sample: 300 frames, median 16.7 ms, p95 16.9 ms. This is a short menu observation, not a broad performance guarantee. Inspected the packaged screenshot. Fresh test profile was isolated and the executable closed after QA.

Executable: `test-results/astra-build-2026-09-08T10-05-32-078Z/win-unpacked/Nova Swarm.exe`. Preserved previous package. Source rollback: `git revert 7ab0116` after ownership/status checks. New artwork SHA256: `5291e0d0fe22af1ffb306d1524aa4fc2312a9bbcce535961872af54b523e6db4`.

Files: `src/scenes/MenuScene.js`, `src/ui/AstraLaunchHome.js`, new `src/ui/AstraHorizon.js`, new versioned backdrop and this delivery documentation. No newly untranslated strings; all existing localized strings reused. No Steamworks setting changes, public release or announcement.

## Steam delivery

Server verified 2026-09-08 10:30:47 UTC: **sector-continue-test Build 25184837**, depot 4765071 manifest **4905702832297288373**. Public remains 25169120; test-build remains 23782673; Cloud settings unchanged. Payload: 410 regular files, 1,687,919,305 bytes. ASAR SHA256: `0029e9bfe722460e8712d55042aaf36ebd87482338233bfbfca82644b8fda71c`. Complete receipt: `docs/menu-horizon-steam-delivery-20260908.json`; hashes/VDF/Steam logs: `test-results/menu-horizon-steam-7ab0116/`.

The prior testing build is 25183937. A Steam rollback is a separate explicitly authorized action; the source revert does not perform it. Temporary source/preview servers and isolated native QA were closed. Animated preview: `test-results/menu-wow/menu-preview.webm`; native screenshot: `test-results/menu-wow/native/menu.png`.
