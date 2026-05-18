# Nova Swarm Steam Release Handoff Packet

Generated: 2026-05-18T11:57:52.777Z

Build: `v2026-05-18_11-49-26`
Build timestamp: `2026-05-18T09:49:26.907Z`

This packet summarizes the current release evidence for the final Steamworks/manual handoff. It is not a release approval.

## Audit State

- Verdict: `not_steam_ready`
- Automated checks passed: 19
- Failed checks: 3
- Hard failures: 0

Current blockers:

- steamworks_ids_configured
- steam_client_validation_evidence
- human_release_approvals_recorded

## Evidence

| Area | Status | Report |
| --- | --- | --- |
| screenshots | ready | `release/steam-screenshots/draft-2026-05-17-current/report.json` |
| trailer | ready | `release/steam-trailer/candidate-2026-05-17-current/report.json` |
| desktop | ready | `release/steamworks/desktop_package_review_report.json` |
| liveDeployment | ready | `release/steamworks/live_deployment_report.json` |
| fullRc | ready | `release/steamworks/full_rc_verification_report.json` |
| humanReview | ready | `release/steamworks/human_review_packet.json` |
| steamClientPreflight | ready | `release/steamworks/steam_client_preflight_packet.json` |
| audio | ready | `docs/reviews/audio-mix-audit-2026-05-17.json` |
| provenance | ready | `release/provenance/asset_provenance_report.json` |
| storeMetadata | ready | `release/steamworks/store_metadata_review_report.json` |

## Required Artifacts

| Present | Path | Bytes |
| --- | --- | ---: |
| yes | `release/desktop/win-unpacked/Nova Swarm.exe` | 226666496 |
| yes | `release/steam-screenshots/steam-upload-candidates-2026-05-17/steam_upload_candidate_sheet.png` | 2181504 |
| yes | `release/steam-trailer/candidate-2026-05-17-current/nova-swarm-steam-trailer-candidate.mp4` | 11192790 |
| yes | `release/steam-trailer/candidate-2026-05-17-current/candidate-contact-sheet.png` | 564706 |
| yes | `release/steam-assets/draft-2026-05-17-nova-swarm/review/steam_asset_contact_sheet.png` | 3226184 |
| yes | `release/steamworks/store_metadata_draft.json` | 4458 |
| yes | `release/steamworks/app_build_TEMPLATE.vdf` | 359 |
| yes | `release/steamworks/client_validation_report.template.json` | 994 |
| yes | `docs/reviews/2026-05-17-human-release-approval.md` | 1553 |

## Remaining Manual Steps

1. Create or open the real Steamworks app and record the numeric app ID plus Windows depot ID.
2. Run `STEAM_APP_ID=<id> STEAM_DEPOT_ID=<id> npm run steamworks:write-vdf` to create `release/steamworks/app_build_LOCAL.vdf`.
3. Upload the Windows payload with SteamCMD using the generated local VDF.
4. Install and launch the uploaded build from the Steam client, then run `npm run steamworks:write-client-validation` with the required confirmation environment variables to create `release/steamworks/client_validation_report.json`.
5. Review and approve screenshots, capsules, trailer, audio, store copy, legal/provenance posture, and gameplay feel, then run `npm run steamworks:write-human-approval` with the required confirmation environment variables.

## Commands

- fastRc: `npm run verify:steam-rc`
- fullRc: `npm run verify:steam-rc -- --full`
- writeVdf: `STEAM_APP_ID=<id> STEAM_DEPOT_ID=<id> npm run steamworks:write-vdf`
- writeHumanApproval: `HUMAN_RELEASE_APPROVAL_CONFIRM=I_REVIEWED_NOVA_SWARM_RELEASE_CANDIDATE HUMAN_RELEASE_ALL_GATES_APPROVED=YES HUMAN_RELEASE_APPROVED_BY=<name> npm run steamworks:write-human-approval`
- writeClientValidation: `STEAM_CLIENT_VALIDATION_CONFIRM=I_REVIEWED_STEAM_CLIENT_BUILD STEAM_CLIENT_ALL_CHECKS_PASSED=YES STEAM_BUILD_ID=<steam build id> STEAM_VALIDATED_BY=<name> STEAM_INSTALL_PATH=<steam install path> STEAM_SCREENSHOT_EVIDENCE=<screenshot path> npm run steamworks:write-client-validation`
- upload: `tools\steamcmd\steamcmd.exe +login <steamworks-user> +run_app_build release\steamworks\app_build_LOCAL.vdf +quit`
- releaseAudit: `npm run audit:release-readiness`

## Notes

- This packet is a current-build handoff summary, not human approval.
- The release audit must still report not_steam_ready until Steamworks IDs, Steam client validation, and human approval evidence are present.
