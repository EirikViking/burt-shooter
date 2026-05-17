import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.resolve('release/steamworks');
const jsonPath = path.join(outputDir, 'release_handoff_packet.json');
const mdPath = path.join(outputDir, 'release_handoff_packet.md');

function readJson(relativePath) {
  const full = path.resolve(root, relativePath);
  return existsSync(full) ? JSON.parse(readFileSync(full, 'utf8')) : null;
}

function existsInfo(relativePath) {
  const full = path.resolve(root, relativePath);
  return {
    path: relativePath,
    exists: existsSync(full),
    bytes: existsSync(full) ? statSync(full).size : 0
  };
}

function lineForStatus(ok) {
  return ok ? 'ready' : 'pending';
}

const version = readJson('public/version.json');
const audit = readJson('docs/reviews/release-readiness-audit-2026-05-17.json');
const audio = readJson('docs/reviews/audio-mix-audit-2026-05-17.json');
const screenshots = readJson('release/steam-screenshots/draft-2026-05-17-current/report.json');
const trailer = readJson('release/steam-trailer/candidate-2026-05-17-current/report.json');
const desktop = readJson('release/steamworks/desktop_package_review_report.json');
const liveDeployment = readJson('release/steamworks/live_deployment_report.json');
const provenance = readJson('release/provenance/asset_provenance_report.json');
const store = readJson('release/steamworks/store_metadata_review_report.json');

const buildVersion = version?.version || null;
const currentBuildEvidence = [
  screenshots?.build?.version,
  trailer?.build?.version,
  desktop?.currentBuild?.version,
  liveDeployment?.currentBuild?.version
].filter(Boolean);
const staleEvidence = currentBuildEvidence.filter((item) => item !== buildVersion);
const auditChecks = audit?.checks || [];
const failedChecks = auditChecks.filter((check) => !check.ok).map((check) => check.name);

const artifacts = [
  existsInfo('release/desktop/win-unpacked/Nova Swarm.exe'),
  existsInfo('release/steam-screenshots/steam-upload-candidates-2026-05-17/steam_upload_candidate_sheet.png'),
  existsInfo('release/steam-trailer/candidate-2026-05-17-current/nova-swarm-steam-trailer-candidate.mp4'),
  existsInfo('release/steam-trailer/candidate-2026-05-17-current/candidate-contact-sheet.png'),
  existsInfo('release/steam-assets/draft-2026-05-17-nova-swarm/review/steam_asset_contact_sheet.png'),
  existsInfo('release/steamworks/store_metadata_draft.json'),
  existsInfo('release/steamworks/app_build_TEMPLATE.vdf'),
  existsInfo('release/steamworks/client_validation_report.template.json'),
  existsInfo('docs/reviews/2026-05-17-human-release-approval.md')
];

const remainingManualSteps = [
  'Create or open the real Steamworks app and record the numeric app ID plus Windows depot ID.',
  'Run `STEAM_APP_ID=<id> STEAM_DEPOT_ID=<id> npm run steamworks:write-vdf` to create `release/steamworks/app_build_LOCAL.vdf`.',
  'Upload the Windows payload with SteamCMD using the generated local VDF.',
  'Install and launch the uploaded build from the Steam client, then fill `release/steamworks/client_validation_report.json` from the template.',
  'Review and approve screenshots, capsules, trailer, audio, store copy, legal/provenance posture, and gameplay feel in `docs/reviews/2026-05-17-human-release-approval.md`.'
];

const packet = {
  generatedAt: new Date().toISOString(),
  build: {
    version: buildVersion,
    timestamp: version?.timestamp || null,
    evidenceVersions: currentBuildEvidence,
    staleEvidence
  },
  releaseAudit: audit ? {
    verdict: audit.verdict,
    passed: audit.summary?.passed ?? null,
    failed: audit.summary?.failed ?? null,
    hardFailures: audit.summary?.hardFailures ?? null,
    failedChecks,
    manualBlockers: audit.summary?.manualBlockers || []
  } : null,
  evidence: {
    screenshots: {
      status: lineForStatus(screenshots?.build?.version === buildVersion && (screenshots?.consoleEvents || []).length === 0),
      path: 'release/steam-screenshots/draft-2026-05-17-current/report.json',
      shotCount: screenshots?.shots?.length || 0
    },
    trailer: {
      status: lineForStatus(trailer?.build?.version === buildVersion && trailer?.status === 'passed'),
      path: 'release/steam-trailer/candidate-2026-05-17-current/report.json',
      duration: trailer?.ffprobe?.format?.duration || null,
      volume: trailer?.volume || null
    },
    desktop: {
      status: lineForStatus(desktop?.status === 'passed' && desktop?.currentBuild?.version === buildVersion),
      path: 'release/steamworks/desktop_package_review_report.json',
      exeBytes: desktop?.desktopPayload?.sizeBytes || 0,
      electronSmoke: desktop?.latestElectronSmoke?.reportPath || null,
      packagedExeSmoke: desktop?.latestPackagedExeSmoke?.reportPath || null
    },
    liveDeployment: {
      status: lineForStatus(liveDeployment?.status === 'passed' && liveDeployment?.currentBuild?.version === buildVersion),
      path: 'release/steamworks/live_deployment_report.json',
      liveUrl: liveDeployment?.liveUrl || null,
      liveSmoke: liveDeployment?.latestLiveSmoke?.reportPath || null
    },
    audio: {
      status: lineForStatus(Boolean(audio) && (audio.decodeErrors || []).length === 0),
      path: 'docs/reviews/audio-mix-audit-2026-05-17.json',
      warnings: audio?.warnings?.length ?? null
    },
    provenance: {
      status: lineForStatus(provenance?.status === 'passed'),
      path: 'release/provenance/asset_provenance_report.json',
      covered: `${provenance?.coveredCount || 0}/${provenance?.assetCount || 0}`
    },
    storeMetadata: {
      status: lineForStatus(store?.status === 'passed'),
      path: 'release/steamworks/store_metadata_review_report.json',
      warnings: store?.warnings?.length ?? null
    }
  },
  artifacts,
  remainingManualSteps,
  commands: {
    fastRc: 'npm run verify:steam-rc',
    fullRc: 'npm run verify:steam-rc -- --full',
    writeVdf: 'STEAM_APP_ID=<id> STEAM_DEPOT_ID=<id> npm run steamworks:write-vdf',
    upload: 'tools\\steamcmd\\steamcmd.exe +login <steamworks-user> +run_app_build release\\steamworks\\app_build_LOCAL.vdf +quit',
    releaseAudit: 'npm run audit:release-readiness'
  },
  notes: [
    'This packet is a current-build handoff summary, not human approval.',
    'The release audit must still report not_steam_ready until Steamworks IDs, Steam client validation, and human approval evidence are present.'
  ]
};

function renderMarkdown(data) {
  const blockers = data.releaseAudit?.failedChecks?.length
    ? data.releaseAudit.failedChecks.map((name) => `- ${name}`).join('\n')
    : '- None';
  const artifactRows = data.artifacts.map((item) =>
    `| ${item.exists ? 'yes' : 'no'} | \`${item.path}\` | ${item.bytes} |`
  ).join('\n');
  const evidenceRows = Object.entries(data.evidence).map(([name, item]) =>
    `| ${name} | ${item.status} | \`${item.path}\` |`
  ).join('\n');
  const steps = data.remainingManualSteps.map((step, index) => `${index + 1}. ${step}`).join('\n');
  const commands = Object.entries(data.commands).map(([name, command]) => `- ${name}: \`${command}\``).join('\n');

  return `# Nova Swarm Steam Release Handoff Packet

Generated: ${data.generatedAt}

Build: \`${data.build.version || 'unknown'}\`
Build timestamp: \`${data.build.timestamp || 'unknown'}\`

This packet summarizes the current release evidence for the final Steamworks/manual handoff. It is not a release approval.

## Audit State

- Verdict: \`${data.releaseAudit?.verdict || 'missing'}\`
- Automated checks passed: ${data.releaseAudit?.passed ?? 'unknown'}
- Failed checks: ${data.releaseAudit?.failed ?? 'unknown'}
- Hard failures: ${data.releaseAudit?.hardFailures ?? 'unknown'}

Current blockers:

${blockers}

## Evidence

| Area | Status | Report |
| --- | --- | --- |
${evidenceRows}

## Required Artifacts

| Present | Path | Bytes |
| --- | --- | ---: |
${artifactRows}

## Remaining Manual Steps

${steps}

## Commands

${commands}

## Notes

${data.notes.map((note) => `- ${note}`).join('\n')}
`;
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
writeFileSync(mdPath, renderMarkdown(packet), 'utf8');

if (!buildVersion) {
  console.error('[steam-handoff] missing public/version.json version');
  process.exit(1);
}

if (staleEvidence.length) {
  console.error(`[steam-handoff] stale evidence versions: ${staleEvidence.join(', ')}`);
  process.exit(1);
}

console.log(`[steam-handoff] wrote ${path.relative(root, jsonPath).replaceAll(path.sep, '/')}`);
console.log(`[steam-handoff] wrote ${path.relative(root, mdPath).replaceAll(path.sep, '/')}`);
