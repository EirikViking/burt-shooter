# Nova Swarm Steam Store Handoff

This file turns the current release evidence into a Steamworks entry checklist. It is not human approval; it is a structured handoff for the eventual Steam store page.

## Structured Draft

- Metadata draft: `release/steamworks/store_metadata_draft.json`
- Validation report: `release/steamworks/store_metadata_review_report.json`
- Validator: `npm run check:steam-store`

The draft intentionally uses conservative claims:

- `Partial Controller Support`, not full controller support, until the Steam-installed build validates text entry, pause/menu flow, and Steam Input metadata.
- Steam Cloud deferred for v1 because the current desktop package uses local settings/local leaderboard storage instead of Steam Cloud.
- Global leaderboard copy is currently supportable as an online/shared leaderboard claim on web. Steam leaderboard support now has an SDK-ready Electron bridge, but do not call it live Steam leaderboard support until the Steam-installed build passes the manual Steam runtime checklist in `docs/steam-leaderboards.md`.
- Steam achievements deferred for v1 because no Steamworks API achievement integration is present.
- English only until final public copy is approved.

## Steamworks Entry Checklist

1. Create or open the real Steam app.
2. Enter the title, short description, long description, feature bullets, tags, categories, and system requirements from `store_metadata_draft.json`.
3. Upload capsule art from `release/steam-assets/draft-2026-05-17-nova-swarm/`.
4. Upload screenshots from `release/steam-screenshots/steam-upload-candidates-2026-05-17/`.
5. Upload the trailer only after the editorial candidate in `release/steam-trailer/candidate-2026-05-17-current/` has by-ear and store-submission approval.
6. Keep achievements and Steam Cloud disabled unless implementation and validation are added.
7. Set the launch executable to `Nova Swarm.exe`.
8. Run the Steam client validation runbook before changing the release readiness verdict.

## Human Approval Still Required

- Screenshot order and captions.
- Capsule thumbnail readability and legal/provenance review.
- Trailer candidate audio/title-card approval.
- Store copy tone and localization stance.
- Controller-support category after a real Steam client install.
- System requirements sanity check on another Windows machine.

References checked on 2026-05-17:

- Steam store page editing: https://partner.steamgames.com/doc/store/page
- Steam graphical assets: https://partner.steamgames.com/doc/store/assets/standard
- Steam graphical asset rules: https://partner.steamgames.com/doc/store/assets/rules
- Steam platform support: https://partner.steamgames.com/doc/store/application/platforms
