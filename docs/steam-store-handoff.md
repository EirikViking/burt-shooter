# Nova Swarm Steam Store Handoff

This file turns the current release evidence into a Steamworks entry checklist. It is not human approval; it is a structured handoff for the eventual Steam store page.

## Structured Draft

- Metadata draft: `release/steamworks/store_metadata_draft.json`
- Validation report: `release/steamworks/store_metadata_review_report.json`
- Validator: `npm run check:steam-store`

The draft intentionally uses the claims currently accepted for the Steamworks store setup:

- `Full Controller Support` is the recorded Steamworks category for v1.
- The current repo now has local controller-only coverage for menu, hangar/details, gameplay, pause/settings, game-over initials entry, highscores, and return-to-menu via `npm run check:controller-flow`.
- Steam Input tradeoff: Nova Swarm uses native XInput/gamepad input and plain text prompts such as `A/B/X/Y/LB/RB/Start`. No official Steam Input action manifest or custom recommended Steam Input layout is published for v1, and that tradeoff is accepted. Do not claim device-specific glyph polish or a custom Steam Input configuration.
- Steam Cloud deferred for v1 because the current desktop package uses local settings/local leaderboard storage instead of Steam Cloud.
- Avoid public Steam leaderboard wording for now. Steam leaderboard support has an SDK-ready Electron bridge, but do not call it live Steam leaderboard support until the Steam-installed build passes the manual Steam runtime checklist in `docs/steam-leaderboards.md`.
- Steam achievements deferred for v1 because no Steamworks API achievement integration is present. The game now has a local/in-game achievement screen with Steam-ready IDs; see `docs/achievements.md`.
- English only until final public copy is approved.

## Steamworks Entry Checklist

1. Create or open the real Steam app.
2. Enter the title, short description, long description, feature bullets, tags, categories, and system requirements from `store_metadata_draft.json`.
3. Upload capsule art from `release/steam-assets/draft-2026-05-17-nova-swarm/`.
4. Upload screenshots from `release/steam-screenshots/steam-upload-candidates-2026-05-23-action/`.
5. Upload the trailer only after the editorial candidate in `release/steam-trailer/candidate-2026-05-17-current/` has by-ear and store-submission approval.
6. Keep achievements and Steam Cloud disabled unless implementation and validation are added.
7. Set the launch executable to `Nova Swarm.exe`.
8. Keep Steamworks category_28 / Full Controller Support selected, and keep the native XInput/plain-prompt tradeoff recorded in `docs/steam-controller-support-checklist.md`.
9. Run `npm run build:current`, `npm run check:controller-flow`, and the manual checklist in `docs/steam-controller-support-checklist.md` before final release approval.
10. Run the Steam client validation runbook before changing the release readiness verdict.

## Human Approval Still Required

- Screenshot order and captions.
- Capsule thumbnail readability and legal/provenance review.
- Trailer candidate audio/title-card approval.
- Store copy tone and localization stance.
- Final controller QA notes for the release candidate.
- System requirements sanity check on another Windows machine.

References checked on 2026-05-17:

- Steam store page editing: https://partner.steamgames.com/doc/store/page
- Steam graphical assets: https://partner.steamgames.com/doc/store/assets/standard
- Steam graphical asset rules: https://partner.steamgames.com/doc/store/assets/rules
- Steam platform support: https://partner.steamgames.com/doc/store/application/platforms

Additional controller references checked on 2026-05-23:

- Steam Input getting started / full support expectations: https://partner.steamgames.com/doc/features/steam_controller/getting_started_for_devs
- Steam Input action manifest / bundled official configuration: https://partner.steamgames.com/doc/features/steam_controller/action_manifest_file
