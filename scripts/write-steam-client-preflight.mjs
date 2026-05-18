import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.resolve(root, 'release/steamworks');
const jsonPath = path.join(outputDir, 'steam_client_preflight_packet.json');
const mdPath = path.join(outputDir, 'steam_client_preflight_packet.md');

function readJson(relativePath) {
  const full = path.resolve(root, relativePath);
  return existsSync(full) ? JSON.parse(readFileSync(full, 'utf8')) : null;
}

function readText(relativePath) {
  const full = path.resolve(root, relativePath);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
}

function fileInfo(relativePath) {
  const full = path.resolve(root, relativePath);
  return {
    path: relativePath,
    exists: existsSync(full),
    bytes: existsSync(full) ? statSync(full).size : 0,
    modifiedAt: existsSync(full) ? statSync(full).mtime.toISOString() : null
  };
}

const version = readJson('public/version.json');
const desktop = readJson('release/steamworks/desktop_package_review_report.json');
const fullRc = readJson('release/steamworks/full_rc_verification_report.json');
const template = readText('release/steamworks/app_build_TEMPLATE.vdf');
const electronBuilder = readJson('electron-builder.json');

const expectedChecks = [
  'installedFromSteamClient',
  'launchedFromSteamClient',
  'menuReached',
  'introAdvanceAndSkip',
  'keyboardRunControls',
  'gamepadRunControls',
  'audioFromSteamInstall',
  'localHighscoreSave',
  'settingsPersistence',
  'offlineLaunch',
  'steamClientScreenshotCaptured'
];

const errors = [];
const warnings = [];

if (!version?.version) errors.push('Missing public/version.json version');
if (desktop?.status !== 'passed') errors.push('Desktop package report is not passed');
if (desktop?.currentBuild?.version !== version?.version) errors.push('Desktop package report does not match current build');
if (desktop?.latestPackagedExeSmoke?.status !== 'passed') errors.push('Packaged executable smoke is not passed');
if (desktop?.latestPackagedControlsSmoke?.status !== 'passed') errors.push('Packaged controls smoke is not passed');
if (fullRc?.status !== 'passed') errors.push('Full RC evidence is not passed');
if (!template.includes('"ContentRoot" "..\\\\desktop\\\\win-unpacked"')) errors.push('Steam VDF template ContentRoot does not point at desktop win-unpacked payload');
if (!template.includes('"LocalPath" "*"') || !template.includes('"recursive" "1"')) errors.push('Steam VDF template does not map all payload files recursively');
if (electronBuilder?.productName !== 'Nova Swarm') errors.push('electron-builder productName is not Nova Swarm');
if (electronBuilder?.win?.target?.[0]?.target !== 'dir') warnings.push('electron-builder Windows target is not dir; confirm Steam payload path before upload');

const artifacts = [
  fileInfo('release/desktop/win-unpacked/Nova Swarm.exe'),
  fileInfo('release/steamworks/app_build_TEMPLATE.vdf'),
  fileInfo('release/steamworks/client_validation_report.template.json'),
  fileInfo('release/steamworks/desktop_package_review_report.json'),
  fileInfo('release/steamworks/full_rc_verification_report.json'),
  fileInfo('release/steamworks/steam_client_validation_runbook.md'),
  fileInfo('docs/reviews/2026-05-17-steamcmd-local-check.md')
];

if (artifacts.some((artifact) => !artifact.exists || artifact.bytes <= 0)) {
  errors.push('One or more required Steam client preflight artifacts are missing or empty');
}

const packet = {
  generatedAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'ready_for_steam_upload_and_client_validation',
  build: {
    version: version?.version || null,
    timestamp: version?.timestamp || null
  },
  explicitLimit: 'This packet proves local upload preflight only. It is not Steam-client validation evidence.',
  localPayload: {
    executable: artifacts[0],
    productName: electronBuilder?.productName || null,
    appId: electronBuilder?.appId || null,
    packagedExeSmoke: desktop?.latestPackagedExeSmoke || null,
    packagedControlsSmoke: desktop?.latestPackagedControlsSmoke || null,
    fullRc: fullRc ? {
      reportPath: fullRc.latestFullRc?.reportPath || null,
      releasePlaytest: fullRc.latestReleasePlaytest || null
    } : null
  },
  steamPipe: {
    template: artifacts[1],
    contentRoot: '..\\\\desktop\\\\win-unpacked',
    localVdfOutput: 'release/steamworks/app_build_LOCAL.vdf',
    writeCommand: 'STEAM_APP_ID=<id> STEAM_DEPOT_ID=<id> npm run steamworks:write-vdf',
    uploadCommandShape: 'tools\\\\steamcmd\\\\steamcmd.exe +login <steamworks-user> +run_app_build release\\\\steamworks\\\\app_build_LOCAL.vdf +quit'
  },
  clientValidation: {
    template: artifacts[2],
    output: 'release/steamworks/client_validation_report.json',
    requiredChecks: expectedChecks,
    stillRequired: true
  },
  artifacts,
  errors,
  warnings
};

function renderMarkdown(data) {
  const artifactRows = data.artifacts.map((artifact) =>
    `| ${artifact.exists ? 'yes' : 'no'} | \`${artifact.path}\` | ${artifact.bytes} |`
  ).join('\n');
  const checks = data.clientValidation.requiredChecks.map((check) => `- ${check}`).join('\n');
  const warningsText = data.warnings.length ? data.warnings.map((warning) => `- ${warning}`).join('\n') : '- None';

  return `# Nova Swarm Steam Client Preflight Packet

Generated: ${data.generatedAt}
Build: \`${data.build.version || 'unknown'}\`
Status: \`${data.status}\`

${data.explicitLimit}

## Local Payload

- Executable: \`${data.localPayload.executable.path}\`
- Product name: ${data.localPayload.productName || 'unknown'}
- Electron app id: ${data.localPayload.appId || 'unknown'}
- Packaged smoke report: \`${data.localPayload.packagedExeSmoke?.reportPath || 'missing'}\`
- Packaged controls report: \`${data.localPayload.packagedControlsSmoke?.reportPath || 'missing'}\`
- Full RC report: \`${data.localPayload.fullRc?.reportPath || 'missing'}\`

## SteamPipe

- Template: \`${data.steamPipe.template.path}\`
- ContentRoot: \`${data.steamPipe.contentRoot}\`
- Local VDF output: \`${data.steamPipe.localVdfOutput}\`
- Write command: \`${data.steamPipe.writeCommand}\`
- Upload command shape: \`${data.steamPipe.uploadCommandShape}\`

## Steam Client Validation Still Required

Copy \`${data.clientValidation.template.path}\` to \`${data.clientValidation.output}\` only after real SteamPipe upload and Steam-client install.

${checks}

## Artifacts

| Present | Path | Bytes |
| --- | --- | ---: |
${artifactRows}

## Warnings

${warningsText}
`;
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(packet), 'utf8');

if (errors.length) {
  console.error('[steam-client-preflight] failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[steam-client-preflight] wrote ${path.relative(root, jsonPath).replaceAll(path.sep, '/')}`);
console.log(`[steam-client-preflight] wrote ${path.relative(root, mdPath).replaceAll(path.sep, '/')}`);
