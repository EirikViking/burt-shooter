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
