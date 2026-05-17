# Nova Swarm Asset Provenance Inventory

The Steam release needs a human legal/provenance approval pass before it can be called ready. This inventory makes that pass concrete and keeps future assets from slipping in uncatalogued.

## Files

- Manifest: `release/provenance/asset_provenance_manifest.json`
- Generated report: `release/provenance/asset_provenance_report.json`
- Validator: `npm run check:provenance`

## What The Gate Proves

- Every scanned shipped asset under `public/`, Steam screenshot drafts, Steam capsule drafts, marketing drafts, and trailer drafts matches a provenance rule.
- The manifest still says `inventory_pending_human_legal_approval`.
- The manifest does not claim legal clearance by itself.
- Denied private/internal path terms are not present in scanned asset paths.

## What Still Requires Human Approval

- Confirm the license/use rights for existing bundled sprite and audio packs.
- Confirm generated OpenAI visual assets are acceptable for Steam use.
- Confirm ElevenLabs generated voice/SFX/music are acceptable for Steam use under the user's account and plan.
- Confirm no real-person likeness, private joke, third-party brand, or unsafe capsule/trailer/screenshot asset remains.

Do not mark the human release approval template as approved until this review is completed outside the automated inventory gate.
