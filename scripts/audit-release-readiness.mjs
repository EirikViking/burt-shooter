import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const reportPath = path.resolve(process.env.RELEASE_AUDIT_REPORT || 'docs/reviews/release-readiness-audit-2026-05-17.json');
const strict = process.argv.includes('--strict') || process.env.RELEASE_AUDIT_STRICT === '1';

const requiredFiles = [
  'docs/reviews/2026-05-17-steam-readiness-checklist.md',
  'docs/reviews/2026-05-17-audio-mix-audit.md',
  'docs/asset-provenance.md',
  'docs/steam-desktop-package.md',
  'docs/steam-store-handoff.md',
  'docs/steam-trailer-workflow.md',
  'release/steamworks/app_build_TEMPLATE.vdf',
  'release/steamworks/steam_client_validation_runbook.md',
  'docs/reviews/2026-05-17-steamcmd-local-check.md',
  'release/steam-assets/draft-2026-05-17-nova-swarm/review/steam_asset_review_report.json',
  'release/steam-assets/draft-2026-05-17-nova-swarm/review/steam_asset_contact_sheet.png',
  'release/steam-assets/draft-2026-05-17-nova-swarm/review/small_capsule_thumbnail_sheet.png',
  'release/steam-screenshots/draft-2026-05-17-current/report.json',
  'release/steam-screenshots/steam-upload-candidates-2026-05-17/README.md',
  'release/steam-screenshots/steam-upload-candidates-2026-05-17/steam_upload_candidate_sheet.png',
  'release/steam-trailer/draft-2026-05-17-current/report.json',
  'release/steam-trailer/draft-2026-05-17-current/audio-mix-report.json',
  'release/steam-trailer/candidate-2026-05-17-current/report.json',
  'release/steam-trailer/candidate-2026-05-17-current/candidate-contact-sheet.png',
  'release/provenance/asset_provenance_manifest.json',
  'release/provenance/asset_provenance_report.json',
  'release/steamworks/desktop_package_review_report.json',
  'release/steamworks/steam_payload_manifest.json',
  'release/steamworks/live_deployment_report.json',
  'release/steamworks/full_rc_verification_report.json',
  'release/steamworks/human_review_packet.json',
  'release/steamworks/human_review_packet.md',
  'release/steamworks/steam_client_preflight_packet.json',
  'release/steamworks/steam_client_preflight_packet.md',
  'release/steamworks/release_handoff_packet.json',
  'release/steamworks/release_handoff_packet.md',
  'release/steamworks/store_metadata_draft.json',
  'release/steamworks/store_metadata_review_report.json'
];

const rootMarkdownDocs = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
  .map((entry) => entry.name);

const forbiddenScanRoots = [
  ...rootMarkdownDocs,
  'package.json',
  'dist',
  'docs',
  'functions',
  'public',
  'release',
  'schema.sql',
  'src',
  'scripts'
];

const textExtensions = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.txt', '.vdf', '.webmanifest'
]);

const forbiddenSourceTerms = [
  ['B', 'urt', ' Shooter'].join(''),
  ['K', 'urt'].join(''),
  ['E', 'irik'].join(''),
  ['Stok', 'marknes'].join(''),
  'donald',
  ['g', 'ris'].join(''),
  ['m', 'ongo'].join(''),
  ['t', 'ufs'].join(''),
  ['d', 'eili'].join(''),
  ['r', 'olp'].join(''),
  ['s', 'vin'].join(''),
  ['is', 'bjorn'].join(''),
  ['kj', 'ottdeig'].join(''),
  ['V', 'KC'].join(''),
  ['Viking', 'Coin'].join(''),
  ['Kle', 'ver'].join(''),
  ['reward', '-', 'wal', 'let'].join(''),
  ['wal', 'let', '_', 'address'].join(''),
  ['wal', 'let', 'Address'].join(''),
  ['E', 'IRIK'].join(''),
  ['K', 'LAUS'].join(''),
  ['F', 'ITTE'].join(''),
  ['K', 'UKEN'].join(''),
  ['FAT', 'MAN'].join(''),
  ['MOR', 'DER'].join(''),
  'valgfri',
  'TILBAKE',
  'AVBRYT',
  'FORTSETT',
  'HOPP OVER'
];
const forbiddenTerms = forbiddenSourceTerms.map((term) => new RegExp(`\\b${term}\\b`, 'i'));

const manualBlockers = [
  'Steamworks app ID and depot ID are still not configured in tracked files.',
  'SteamPipe upload and Steam-client install/launch validation still require credentials and a real app.',
  'User/human approval is still required for final screenshots, capsules, trailer, and by-ear audio mix.'
];

const knownManualBlockerNames = new Set([
  'steamworks_ids_configured',
  'steam_client_validation_evidence',
  'human_release_approvals_recorded'
]);

const requiredHumanApprovalKeys = [
  'screenshots',
  'capsules',
  'trailer',
  'audio',
  'storeCopy',
  'legalProvenance',
  'gameplayFeel'
];

const requiredSteamClientChecks = [
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

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true });
  return {
    command: `${command} ${args.join(' ')}`,
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

function findSteamCmd() {
  const candidates = [
    process.env.STEAMCMD_PATH,
    path.resolve(root, 'tools/steamcmd/steamcmd.exe')
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return { ok: true, source: candidate, command: candidate };
    }
  }

  const lookup = run('powershell', ['-NoProfile', '-Command', '(Get-Command steamcmd -ErrorAction SilentlyContinue).Source']);
  if (lookup.status === 0 && lookup.stdout) {
    return { ok: true, source: lookup.stdout, command: 'steamcmd' };
  }

  return { ok: false, source: null, command: lookup.command, stderr: lookup.stderr };
}

function walkTextFiles(entry, files = []) {
  const full = path.resolve(root, entry);
  if (!existsSync(full)) return files;
  const stats = statSync(full);
  if (stats.isFile()) {
    if (textExtensions.has(path.extname(full).toLowerCase())) files.push(full);
    return files;
  }
  if (!stats.isDirectory()) return files;
  for (const child of readdirSync(full, { withFileTypes: true })) {
    if (child.name === 'node_modules' || child.name === 'dist' || child.name === '.git') continue;
    walkTextFiles(path.join(entry, child.name), files);
  }
  return files;
}

function scanForbiddenTerms(entries = forbiddenScanRoots) {
  const matches = [];
  const files = entries.flatMap((entry) => walkTextFiles(entry));
  for (const file of files) {
    if (shouldSkipForbiddenScan(file)) continue;
    const text = readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const pattern of forbiddenTerms) {
        if (pattern.test(line)) {
          matches.push({ file: rel(file), line: index + 1, text: line.trim().slice(0, 240) });
          break;
        }
      }
    });
  }
  return matches;
}

function shouldSkipForbiddenScan(file) {
  const relative = rel(file);
  return relative === 'scripts/audit-release-readiness.mjs' ||
    relative.startsWith('release/desktop/') ||
    relative === 'package-lock.json' ||
    /^docs\/reviews\/release-readiness-audit-\d{4}-\d{2}-\d{2}\.json$/.test(relative);
}

function walkFiles(entry, files = []) {
  const full = path.resolve(root, entry);
  if (!existsSync(full)) return files;
  const stats = statSync(full);
  if (stats.isFile()) {
    files.push(full);
    return files;
  }
  if (!stats.isDirectory()) return files;
  for (const child of readdirSync(full, { withFileTypes: true })) {
    if (child.name === 'node_modules' || child.name === 'dist' || child.name === '.git') continue;
    walkFiles(path.join(entry, child.name), files);
  }
  return files;
}

function scanForbiddenFilenames(entries = forbiddenScanRoots) {
  const matches = [];
  const files = entries.flatMap((entry) => walkFiles(entry));
  for (const file of files) {
    const relative = rel(file);
    const basename = path.basename(file);
    for (const pattern of forbiddenTerms) {
      if (pattern.test(basename)) {
        matches.push({ file: relative });
        break;
      }
    }
  }
  return matches;
}

function readJson(relativePath) {
  const full = path.resolve(root, relativePath);
  return JSON.parse(readFileSync(full, 'utf8'));
}

function hashFile(file) {
  const hash = createHash('sha256');
  hash.update(readFileSync(file));
  return hash.digest('hex');
}

function currentBuildVersion() {
  try {
    return readJson('public/version.json')?.version || null;
  } catch {
    return null;
  }
}

function checkJsonReport(relativePath, verifier) {
  const full = path.resolve(root, relativePath);
  if (!existsSync(full)) return { path: relativePath, ok: false, reason: 'missing' };
  try {
    const json = readJson(relativePath);
    return verifier(json);
  } catch (error) {
    return { path: relativePath, ok: false, reason: error.message };
  }
}

function checkHumanApprovals() {
  const relativePath = 'docs/reviews/2026-05-17-human-release-approval.md';
  const full = path.resolve(root, relativePath);
  if (!existsSync(full)) return { ok: false, path: relativePath, reason: 'missing' };

  const text = readFileSync(full, 'utf8');
  const expectedBuild = currentBuildVersion();
  const approvedBuild = (text.match(/^build:\s*(.+)$/im)?.[1] || '').trim();
  const missing = requiredHumanApprovalKeys.filter((key) => !new RegExp(`^${key}:\\s*approved\\b`, 'im').test(text));
  const hasApprover = /^approvedBy:\s*\S+/im.test(text) && !/^approvedBy:\s*TBD\s*$/im.test(text);
  const hasDate = /^approvedAt:\s*\d{4}-\d{2}-\d{2}/im.test(text);
  const buildMatches = Boolean(expectedBuild) && approvedBuild === expectedBuild;

  return {
    ok: missing.length === 0 && hasApprover && hasDate && buildMatches,
    path: relativePath,
    expectedBuild,
    approvedBuild: approvedBuild || null,
    buildMatches,
    missing,
    hasApprover,
    hasDate
  };
}

function checkSteamClientValidation() {
  return checkJsonReport('release/steamworks/client_validation_report.json', (json) => {
    const checks = json.checks || {};
    const expectedBuild = currentBuildVersion();
    const missing = requiredSteamClientChecks.filter((key) => checks[key] !== true);
    const steamBuildId = json.steamBuildId || json.steamPipeBuildId || null;
    const screenshotEvidence = json.screenshotEvidence || null;
    const screenshotPath = screenshotEvidence ? path.resolve(root, screenshotEvidence) : null;
    const installPath = json.steamInstallPath ? path.resolve(root, json.steamInstallPath) : null;
    const hasValidator = Boolean(String(json.validatedBy || '').trim()) && !/^TBD$/i.test(String(json.validatedBy || '').trim());
    const hasValidatedAt = /^\d{4}-\d{2}-\d{2}T/.test(String(json.validatedAt || ''));
    const buildMatches = Boolean(expectedBuild) && json.gameBuild?.version === expectedBuild;
    return {
      ok: json.status === 'passed' &&
        missing.length === 0 &&
        Boolean(steamBuildId) &&
        buildMatches &&
        hasValidator &&
        hasValidatedAt &&
        Boolean(installPath && existsSync(installPath)) &&
        Boolean(screenshotPath && existsSync(screenshotPath)),
      status: json.status || null,
      expectedBuild,
      actualBuild: json.gameBuild?.version || null,
      buildMatches,
      steamBuildId,
      validatedBy: json.validatedBy || null,
      validatedAt: json.validatedAt || null,
      steamInstallPath: json.steamInstallPath || null,
      steamInstallPathExists: Boolean(installPath && existsSync(installPath)),
      screenshotEvidence,
      screenshotEvidenceExists: Boolean(screenshotPath && existsSync(screenshotPath)),
      missing
    };
  });
}

function vdfValue(text, key) {
  const match = text.match(new RegExp(`"${key}"\\s+"([^"]*)"`));
  return match ? match[1] : null;
}

function checkSteamworksIdsConfigured() {
  const relativePath = 'release/steamworks/app_build_LOCAL.vdf';
  const full = path.resolve(root, relativePath);
  if (!existsSync(full)) {
    return {
      ok: false,
      path: relativePath,
      reason: 'missing'
    };
  }

  const text = readFileSync(full, 'utf8');
  const appId = vdfValue(text, 'AppID');
  const desc = vdfValue(text, 'Desc');
  const contentRoot = vdfValue(text, 'ContentRoot');
  const localPath = vdfValue(text, 'LocalPath');
  const depotPath = vdfValue(text, 'DepotPath');
  const recursive = vdfValue(text, 'recursive');
  const depotMatch = text.match(/^\s*"(\d+)"\s*\{/m);
  const depotId = depotMatch?.[1] || null;
  const contentRootPath = contentRoot
    ? path.resolve(path.dirname(full), contentRoot.replace(/\\\\/g, path.sep))
    : null;
  const executablePath = contentRootPath ? path.join(contentRootPath, 'Nova Swarm.exe') : null;
  const errors = [];

  if (!appId || !/^\d+$/.test(appId) || appId === '0') errors.push('AppID must be a non-zero numeric Steamworks app ID');
  if (!depotId || !/^\d+$/.test(depotId) || depotId === '0') errors.push('Depot ID must be a non-zero numeric Windows depot ID');
  if (/STEAM_APP_ID_HERE|STEAM_DEPOT_ID_HERE/.test(text)) errors.push('VDF still contains placeholder IDs');
  if (contentRoot !== '..\\\\desktop\\\\win-unpacked') errors.push('ContentRoot must point at ..\\\\desktop\\\\win-unpacked');
  if (localPath !== '*') errors.push('LocalPath must map the full payload with *');
  if (depotPath !== '.') errors.push('DepotPath must be .');
  if (recursive !== '1') errors.push('FileMapping must be recursive');
  if (!desc || /TBD|placeholder/i.test(desc)) errors.push('Desc must identify the release-candidate upload');
  if (!contentRootPath || !existsSync(contentRootPath)) errors.push('ContentRoot directory does not exist');
  if (!executablePath || !existsSync(executablePath)) errors.push('Nova Swarm.exe is missing from the ContentRoot payload');

  return {
    ok: errors.length === 0,
    path: relativePath,
    appId: appId || null,
    depotId,
    desc: desc || null,
    contentRoot: contentRoot || null,
    contentRootExists: Boolean(contentRootPath && existsSync(contentRootPath)),
    executableExists: Boolean(executablePath && existsSync(executablePath)),
    localPath: localPath || null,
    depotPath: depotPath || null,
    recursive: recursive || null,
    errors
  };
}

function checkSteamPayloadManifest() {
  return checkJsonReport('release/steamworks/steam_payload_manifest.json', (json) => {
    const expectedBuild = currentBuildVersion();
    const contentRoot = path.resolve(root, 'release/desktop/win-unpacked');
    const files = Array.isArray(json.files) ? json.files : [];
    const errors = [];
    const seen = new Set();
    const actualFiles = existsSync(contentRoot)
      ? walkFiles('release/desktop/win-unpacked')
        .map((file) => path.relative(contentRoot, file).replaceAll(path.sep, '/'))
        .sort()
      : [];

    if (!expectedBuild || json.build?.version !== expectedBuild) errors.push('manifest build does not match current build');
    if (json.contentRoot !== 'release/desktop/win-unpacked') errors.push('manifest contentRoot must be release/desktop/win-unpacked');
    if (!existsSync(contentRoot)) errors.push('content root is missing');
    if (!Number.isInteger(json.fileCount) || json.fileCount !== files.length || files.length === 0) errors.push('fileCount does not match files length');

    let totalBytes = 0;
    const currentManifestLines = [];
    for (const file of files) {
      if (!file?.path || typeof file.path !== 'string') {
        errors.push('manifest contains a file entry without a path');
        continue;
      }
      if (file.path.includes('..') || path.isAbsolute(file.path)) {
        errors.push(`manifest path is not relative payload content: ${file.path}`);
        continue;
      }
      if (seen.has(file.path)) errors.push(`duplicate manifest path: ${file.path}`);
      seen.add(file.path);

      const full = path.resolve(contentRoot, file.path);
      if (!full.startsWith(contentRoot)) {
        errors.push(`manifest path escapes content root: ${file.path}`);
        continue;
      }
      if (!existsSync(full)) {
        errors.push(`manifest file missing from payload: ${file.path}`);
        continue;
      }

      const stats = statSync(full);
      const currentHash = hashFile(full);
      totalBytes += stats.size;
      currentManifestLines.push(`${file.path}\t${stats.size}\t${currentHash}`);
      if (file.bytes !== stats.size) errors.push(`size mismatch: ${file.path}`);
      if (file.sha256 !== currentHash) errors.push(`sha256 mismatch: ${file.path}`);
      if (!/^[a-f0-9]{64}$/.test(String(file.sha256 || ''))) errors.push(`invalid sha256 format: ${file.path}`);
    }

    const missingFromManifest = actualFiles.filter((file) => !seen.has(file));
    for (const file of missingFromManifest) errors.push(`payload file missing from manifest: ${file}`);

    const executable = files.find((file) => file.path === 'Nova Swarm.exe');
    if (!executable || Number(executable.bytes || 0) <= 0 || !/^[a-f0-9]{64}$/.test(String(executable.sha256 || ''))) {
      errors.push('Nova Swarm.exe is missing or invalid in manifest');
    }
    if (json.totalBytes !== totalBytes) errors.push('totalBytes does not match current payload');

    const manifestHash = createHash('sha256')
      .update(currentManifestLines.join('\n'))
      .digest('hex');
    if (json.manifestHash !== manifestHash) errors.push('manifestHash does not match current payload listing');

    return {
      ok: errors.length === 0,
      expectedBuild,
      actualBuild: json.build?.version || null,
      contentRoot: json.contentRoot || null,
      fileCount: json.fileCount || 0,
      actualFileCount: actualFiles.length,
      totalBytes: json.totalBytes || 0,
      actualTotalBytes: totalBytes,
      executable: executable || null,
      manifestHash: json.manifestHash || null,
      actualManifestHash: manifestHash,
      errors
    };
  });
}

function checkReleaseHandoffPacket() {
  return checkJsonReport('release/steamworks/release_handoff_packet.json', (json) => {
    const expectedBuild = currentBuildVersion();
    const manualSteps = json.remainingManualSteps || [];
    const evidence = json.evidence || {};
    return {
      ok: Boolean(expectedBuild) &&
        json.build?.version === expectedBuild &&
        Array.isArray(json.build?.staleEvidence) &&
        json.build.staleEvidence.length === 0 &&
        json.releaseAudit?.verdict === 'not_steam_ready' &&
        Array.isArray(json.releaseAudit?.failedChecks) &&
        json.releaseAudit.failedChecks.includes('steamworks_ids_configured') &&
        json.releaseAudit.failedChecks.includes('steam_client_validation_evidence') &&
        json.releaseAudit.failedChecks.includes('human_release_approvals_recorded') &&
        evidence.screenshots?.status === 'ready' &&
        evidence.trailer?.status === 'ready' &&
        evidence.desktop?.status === 'ready' &&
        evidence.payloadManifest?.status === 'ready' &&
        evidence.liveDeployment?.status === 'ready' &&
        evidence.fullRc?.status === 'ready' &&
        evidence.humanReview?.status === 'ready' &&
        evidence.steamClientPreflight?.status === 'ready' &&
        evidence.provenance?.status === 'ready' &&
        evidence.storeMetadata?.status === 'ready' &&
        manualSteps.length >= 5 &&
        existsSync(path.resolve(root, 'release/steamworks/release_handoff_packet.md')),
      expectedBuild,
      actualBuild: json.build?.version || null,
      staleEvidence: json.build?.staleEvidence || [],
      failedChecks: json.releaseAudit?.failedChecks || [],
      manualStepCount: manualSteps.length
    };
  });
}

function checkScreenshotCandidates() {
  const dir = path.resolve(root, 'release/steam-screenshots/steam-upload-candidates-2026-05-17');
  const candidates = existsSync(dir)
    ? readdirSync(dir).filter((file) => /^\d\d-.*\.png$/i.test(file)).sort()
    : [];
  const identify = candidates.map((file) => {
    const out = run('magick', ['identify', '-format', '%w %h', path.join(dir, file)]);
    const [width, height] = out.stdout.split(/\s+/).map(Number);
    return { file, width, height, ok: out.status === 0 && width === 1280 && height === 720 };
  });
  return {
    ok: candidates.length >= 5 && candidates.length <= 8 && identify.every((item) => item.ok),
    count: candidates.length,
    candidates: identify
  };
}

function fileExists(relativePath) {
  const full = path.resolve(root, relativePath);
  return {
    path: relativePath,
    ok: existsSync(full),
    bytes: existsSync(full) ? statSync(full).size : 0
  };
}

const checks = [];

checks.push({
  name: 'required_release_artifacts_exist',
  ok: requiredFiles.every((file) => existsSync(path.resolve(root, file))),
  files: requiredFiles.map(fileExists)
});

const forbiddenMatches = scanForbiddenTerms();
checks.push({
  name: 'no_forbidden_private_player_facing_terms_in_text_files',
  ok: forbiddenMatches.length === 0,
  matches: forbiddenMatches
});

const forbiddenFilenameMatches = scanForbiddenFilenames();
checks.push({
  name: 'no_forbidden_private_terms_in_release_filenames',
  ok: forbiddenFilenameMatches.length === 0,
  matches: forbiddenFilenameMatches
});

const distRoot = path.resolve(root, 'dist');
const distForbiddenMatches = scanForbiddenTerms(['dist']);
const distForbiddenFilenameMatches = scanForbiddenFilenames(['dist']);
checks.push({
  name: 'no_forbidden_private_terms_in_built_dist',
  ok: existsSync(distRoot) && distForbiddenMatches.length === 0 && distForbiddenFilenameMatches.length === 0,
  distExists: existsSync(distRoot),
  textMatches: distForbiddenMatches,
  filenameMatches: distForbiddenFilenameMatches
});

checks.push({
  name: 'steam_assets_report_clean',
  ...checkJsonReport('release/steam-assets/draft-2026-05-17-nova-swarm/review/steam_asset_review_report.json', (json) => ({
    ok: Array.isArray(json.failures) && json.failures.length === 0 && Array.isArray(json.assets) && json.assets.length === 9,
    assetCount: json.assets?.length || 0,
    failures: json.failures || []
  }))
});

checks.push({
  name: 'asset_provenance_inventory_clean',
  ...checkJsonReport('release/provenance/asset_provenance_report.json', (json) => ({
    ok: json.status === 'passed' &&
      Array.isArray(json.errors) && json.errors.length === 0 &&
      Number.isFinite(json.assetCount) && json.assetCount > 0 &&
      json.coveredCount === json.assetCount,
    status: json.status,
    assetCount: json.assetCount || 0,
    coveredCount: json.coveredCount || 0,
    uncovered: json.uncovered || [],
    deniedMatches: json.deniedMatches || [],
    warnings: json.warnings || []
  }))
});

checks.push({
  name: 'steam_store_metadata_report_clean',
  ...checkJsonReport('release/steamworks/store_metadata_review_report.json', (json) => ({
    ok: json.status === 'passed' && Array.isArray(json.errors) && json.errors.length === 0,
    status: json.status,
    warnings: json.warnings || [],
    summary: json.summary || {}
  }))
});

checks.push({
  name: 'steam_screenshot_capture_report_clean',
  ...checkJsonReport('release/steam-screenshots/draft-2026-05-17-current/report.json', (json) => {
    const expectedBuild = currentBuildVersion();
    const actualBuild = json.build?.version || null;
    return {
      ok: Array.isArray(json.shots) && json.shots.length >= 7 &&
      Boolean(expectedBuild) &&
      actualBuild === expectedBuild &&
      (json.consoleEvents || []).length === 0 &&
      (json.pageErrors || []).length === 0 &&
      (json.badResponses || []).length === 0,
      shotCount: json.shots?.length || 0,
      expectedBuild,
      actualBuild,
      consoleEvents: json.consoleEvents || [],
      pageErrors: json.pageErrors || [],
      badResponses: json.badResponses || []
    };
  })
});

checks.push({
  name: 'steam_screenshot_upload_candidates_1280x720',
  ...checkScreenshotCandidates()
});

checks.push({
  name: 'steam_trailer_visual_report_clean',
  ...checkJsonReport('release/steam-trailer/draft-2026-05-17-current/report.json', (json) => {
    const expectedBuild = currentBuildVersion();
    const actualBuild = json.build?.version || null;
    return {
      ok: Array.isArray(json.timeline) && json.timeline.length >= 8 &&
      Boolean(expectedBuild) &&
      actualBuild === expectedBuild &&
      (json.consoleEvents || []).length === 0 &&
      (json.pageErrors || []).length === 0 &&
      (json.badResponses || []).length === 0,
      beatCount: json.timeline?.length || 0,
      expectedBuild,
      actualBuild,
      consoleEvents: json.consoleEvents || [],
      pageErrors: json.pageErrors || [],
      badResponses: json.badResponses || []
    };
  })
});

checks.push({
  name: 'steam_trailer_audio_mix_report_present',
  ...checkJsonReport('release/steam-trailer/draft-2026-05-17-current/audio-mix-report.json', (json) => {
    const expectedBuild = currentBuildVersion();
    const actualBuild = json.build?.version || null;
    const duration = Number(json.ffprobe?.format?.duration || 0);
    return {
      ok: json.ffprobe?.streams?.some((stream) => stream.codec_name === 'h264') &&
      json.ffprobe?.streams?.some((stream) => stream.codec_name === 'aac') &&
      Boolean(expectedBuild) &&
      actualBuild === expectedBuild &&
      duration >= 30 &&
      duration <= 45 &&
      Number(json.visualTrimSeconds || 0) > 0,
      expectedBuild,
      actualBuild,
      duration: json.ffprobe?.format?.duration,
      visualTrimSeconds: json.visualTrimSeconds || 0,
      streams: json.ffprobe?.streams || []
    };
  })
});

checks.push({
  name: 'steam_trailer_editorial_candidate_clean',
  ...checkJsonReport('release/steam-trailer/candidate-2026-05-17-current/report.json', (json) => {
    const expectedBuild = currentBuildVersion();
    const actualBuild = json.build?.version || null;
    return {
      ok: json.status === 'passed' &&
      Array.isArray(json.titleCards) &&
      json.titleCards.length >= 1 &&
      json.opening === 'gameplay_first' &&
      json.ffprobe?.streams?.some((stream) => stream.codec_name === 'h264' && stream.width === 1280 && stream.height === 720) &&
      json.ffprobe?.streams?.some((stream) => stream.codec_name === 'aac') &&
      Boolean(expectedBuild) &&
      actualBuild === expectedBuild &&
      Number(json.ffprobe?.format?.duration || 0) >= 30 &&
      Number(json.ffprobe?.format?.duration || 0) <= 45 &&
      existsSync(path.resolve(root, 'release/steam-trailer/candidate-2026-05-17-current/candidate-contact-sheet.png')),
      status: json.status || null,
      expectedBuild,
      actualBuild,
      duration: json.ffprobe?.format?.duration || null,
      opening: json.opening || null,
      titleCards: json.titleCards || [],
      volume: json.volume || null,
      contactSheet: json.contactSheet || null
    };
  })
});

checks.push({
  name: 'desktop_package_report_clean',
  ...checkJsonReport('release/steamworks/desktop_package_review_report.json', (json) => {
    const expectedBuild = currentBuildVersion();
    const actualBuild = json.currentBuild?.version || null;
    return {
      ok: json.status === 'passed' &&
      Boolean(expectedBuild) &&
      actualBuild === expectedBuild &&
      json.desktopPayload?.path === 'release/desktop/win-unpacked/Nova Swarm.exe' &&
      Number(json.desktopPayload?.sizeBytes || 0) > 0 &&
      json.latestElectronSmoke?.status === 'passed' &&
      json.latestElectronSmoke?.localHighscoreApi?.ok === true &&
      json.latestElectronSmoke?.readyState?.ready === true &&
      (json.latestElectronSmoke?.consoleEvents || []).length === 0 &&
      json.latestPackagedExeSmoke?.status === 'passed' &&
      json.latestPackagedExeSmoke?.build === expectedBuild &&
      json.latestPackagedExeSmoke?.localHighscoreApi?.ok === true &&
      json.latestPackagedExeSmoke?.readyState?.ready === true &&
      (json.latestPackagedExeSmoke?.consoleEvents || []).length === 0 &&
      json.latestPackagedControlsSmoke?.status === 'passed' &&
      json.latestPackagedControlsSmoke?.build === expectedBuild &&
      json.latestPackagedControlsSmoke?.checks?.keyboardMovement === true &&
      json.latestPackagedControlsSmoke?.checks?.keyboardFire === true &&
      json.latestPackagedControlsSmoke?.checks?.keyboardPause === true &&
      json.latestPackagedControlsSmoke?.checks?.gamepadMovement === true &&
      json.latestPackagedControlsSmoke?.checks?.gamepadFire === true &&
      json.latestPackagedControlsSmoke?.checks?.gamepadPause === true &&
      (json.latestPackagedControlsSmoke?.consoleEvents || []).length === 0,
      status: json.status || null,
      expectedBuild,
      actualBuild,
      desktopPayload: json.desktopPayload || null,
      latestElectronSmoke: json.latestElectronSmoke || null,
      latestPackagedExeSmoke: json.latestPackagedExeSmoke || null,
      latestPackagedControlsSmoke: json.latestPackagedControlsSmoke || null,
      errors: json.errors || [],
      warnings: json.warnings || []
    };
  })
});

checks.push({
  name: 'steam_payload_manifest_current',
  ...checkSteamPayloadManifest()
});

checks.push({
  name: 'live_deployment_report_clean',
  ...checkJsonReport('release/steamworks/live_deployment_report.json', (json) => {
    const expectedBuild = currentBuildVersion();
    return {
      ok: json.status === 'passed' &&
      json.liveUrl === 'https://burt.tinyfoundry.app' &&
      Boolean(expectedBuild) &&
      json.currentBuild?.version === expectedBuild &&
      Array.isArray(json.versionChecks) &&
      json.versionChecks.length >= 1 &&
      json.versionChecks.every((check) => check.ok === true && check.version === expectedBuild) &&
      json.latestLiveSmoke?.status === 'passed' &&
      json.latestLiveSmoke?.baseUrl === 'https://burt.tinyfoundry.app' &&
      json.latestLiveSmoke?.build === expectedBuild &&
      (json.latestLiveSmoke?.console?.warningsOrErrors || 0) === 0 &&
      (json.latestLiveSmoke?.console?.pageErrors || 0) === 0 &&
      (json.latestLiveSmoke?.console?.badResponses || 0) === 0 &&
      (json.latestLiveSmoke?.screenshots || []).filter((shot) => shot.exists).length >= 6,
      status: json.status || null,
      expectedBuild,
      liveUrl: json.liveUrl || null,
      versionChecks: json.versionChecks || [],
      latestLiveSmoke: json.latestLiveSmoke || null,
      errors: json.errors || [],
      warnings: json.warnings || []
    };
  })
});

checks.push({
  name: 'full_rc_verification_report_clean',
  ...checkJsonReport('release/steamworks/full_rc_verification_report.json', (json) => {
    const expectedBuild = currentBuildVersion();
    const stageNames = new Set((json.latestFullRc?.stages || []).filter((stage) => stage.ok).map((stage) => stage.name));
    const requiredStages = [
      'build:current',
      'check:intro-voice',
      'check:provenance',
      'check:steam-assets',
      'check:steam-store',
      'package:steam:win:current',
      'desktop:smoke:current',
      'desktop:smoke:packaged',
      'desktop:controls:packaged',
      'check:desktop-package',
      'check:live-deployment',
      'audit:audio-mix',
      'smoke',
      'playtest:release'
    ];
    const missingStages = requiredStages.filter((stage) => !stageNames.has(stage));
    return {
      ok: json.status === 'passed' &&
      Boolean(expectedBuild) &&
      json.currentBuild?.version === expectedBuild &&
      json.latestFullRc?.mode === 'full' &&
      json.latestFullRc?.ok === true &&
      missingStages.length === 0 &&
      json.latestFullRc?.audioAudit?.warnings === 0 &&
      json.latestLocalSmoke?.build === expectedBuild &&
      json.latestLocalSmoke?.console?.warningsOrErrors === 0 &&
      json.latestLocalSmoke?.console?.pageErrors === 0 &&
      json.latestLocalSmoke?.console?.badResponses === 0 &&
      json.latestReleasePlaytest?.survivedFullDuration === true &&
      Number(json.latestReleasePlaytest?.survivedMs || 0) >= Number(json.latestReleasePlaytest?.requiredSurvivalMs || 599500) &&
      Number(json.latestReleasePlaytest?.peakLevel || 0) >= 5 &&
      Number(json.latestReleasePlaytest?.finalState?.lives || 0) > 0 &&
      json.latestReleasePlaytest?.finalState?.fatalOverlay === false &&
      json.latestReleasePlaytest?.console?.routineMessages === 0 &&
      json.latestReleasePlaytest?.console?.warningsOrErrors === 0 &&
      json.latestReleasePlaytest?.console?.pageErrors === 0 &&
      json.latestReleasePlaytest?.console?.badResponses === 0 &&
      json.latestReleasePlaytest?.console?.requestFailures === 0,
      status: json.status || null,
      expectedBuild,
      latestFullRc: json.latestFullRc || null,
      latestLocalSmoke: json.latestLocalSmoke || null,
      latestReleasePlaytest: json.latestReleasePlaytest || null,
      missingStages,
      errors: json.errors || [],
      warnings: json.warnings || []
    };
  })
});

checks.push({
  name: 'human_review_packet_current',
  ...checkJsonReport('release/steamworks/human_review_packet.json', (json) => {
    const expectedBuild = currentBuildVersion();
    const requiredAreas = new Set(['screenshots', 'capsules', 'trailer', 'audio', 'storeCopy', 'legalProvenance', 'gameplayFeel']);
    const areas = new Set((json.reviewAreas || []).map((area) => area.key));
    const missingAreas = [...requiredAreas].filter((area) => !areas.has(area));
    return {
      ok: json.status === 'ready_for_human_review' &&
      Boolean(expectedBuild) &&
      json.build?.version === expectedBuild &&
      missingAreas.length === 0 &&
      json.approval?.approved === false &&
      Array.isArray(json.approval?.pending) &&
      json.approval.pending.length === requiredAreas.size &&
      (json.reviewAreas || []).every((area) =>
        area.status === 'ready_for_human_review' &&
        Array.isArray(area.artifacts) &&
        area.artifacts.every((artifact) => artifact.exists === true && Number(artifact.bytes || 0) > 0)
      ) &&
      existsSync(path.resolve(root, 'release/steamworks/human_review_packet.md')),
      status: json.status || null,
      expectedBuild,
      actualBuild: json.build?.version || null,
      approval: json.approval || null,
      missingAreas,
      reviewAreas: json.reviewAreas || []
    };
  })
});

checks.push({
  name: 'steam_client_preflight_packet_current',
  ...checkJsonReport('release/steamworks/steam_client_preflight_packet.json', (json) => {
    const expectedBuild = currentBuildVersion();
    const requiredChecks = [
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
    const missingChecks = requiredChecks.filter((check) => !(json.clientValidation?.requiredChecks || []).includes(check));
    return {
      ok: json.status === 'ready_for_steam_upload_and_client_validation' &&
      Boolean(expectedBuild) &&
      json.build?.version === expectedBuild &&
      json.clientValidation?.stillRequired === true &&
      missingChecks.length === 0 &&
      json.localPayload?.executable?.exists === true &&
      Number(json.localPayload?.executable?.bytes || 0) > 0 &&
      json.localPayload?.payloadManifest?.exists === true &&
      Number(json.localPayload?.payloadManifest?.bytes || 0) > 0 &&
      Number(json.localPayload?.payloadManifestSummary?.fileCount || 0) > 0 &&
      /^[a-f0-9]{64}$/.test(String(json.localPayload?.payloadManifestSummary?.manifestHash || '')) &&
      json.localPayload?.packagedExeSmoke?.status === 'passed' &&
      json.localPayload?.packagedExeSmoke?.build === expectedBuild &&
      json.localPayload?.packagedControlsSmoke?.status === 'passed' &&
      json.localPayload?.packagedControlsSmoke?.build === expectedBuild &&
      json.localPayload?.packagedControlsSmoke?.checks?.keyboardMovement === true &&
      json.localPayload?.packagedControlsSmoke?.checks?.keyboardFire === true &&
      json.localPayload?.packagedControlsSmoke?.checks?.keyboardPause === true &&
      json.localPayload?.packagedControlsSmoke?.checks?.gamepadMovement === true &&
      json.localPayload?.packagedControlsSmoke?.checks?.gamepadFire === true &&
      json.localPayload?.packagedControlsSmoke?.checks?.gamepadPause === true &&
      json.localPayload?.fullRc?.releasePlaytest?.survivedFullDuration === true &&
      json.steamPipe?.contentRoot === '..\\\\desktop\\\\win-unpacked' &&
      (json.errors || []).length === 0 &&
      existsSync(path.resolve(root, 'release/steamworks/steam_client_preflight_packet.md')),
      status: json.status || null,
      expectedBuild,
      actualBuild: json.build?.version || null,
      missingChecks,
      clientValidation: json.clientValidation || null,
      packagedControlsSmoke: json.localPayload?.packagedControlsSmoke || null,
      errors: json.errors || [],
      warnings: json.warnings || []
    };
  })
});

checks.push({
  name: 'steam_release_handoff_packet_current',
  ...checkReleaseHandoffPacket()
});

checks.push({
  name: 'steamcmd_available',
  ...findSteamCmd(),
  requiredForSteamReady: true
});

checks.push({
  name: 'steamworks_ids_configured',
  ...checkSteamworksIdsConfigured(),
  requiredForSteamReady: true,
  expectedFiles: [
    'release/steamworks/app_build_LOCAL.vdf'
  ]
});

checks.push({
  name: 'steam_client_validation_evidence',
  ...checkSteamClientValidation(),
  requiredForSteamReady: true,
  expectedFile: 'release/steamworks/client_validation_report.json'
});

checks.push({
  name: 'human_release_approvals_recorded',
  ...checkHumanApprovals(),
  requiredForSteamReady: true,
  expectedFile: 'docs/reviews/2026-05-17-human-release-approval.md'
});

const passed = checks.filter((check) => check.ok).length;
const failed = checks.filter((check) => !check.ok);
const hardFailures = failed.filter((check) => !knownManualBlockerNames.has(check.name));

const report = {
  generatedAt: new Date().toISOString(),
  verdict: hardFailures.length === 0 && failed.length === 0 ? 'steam_ready_evidence_complete' : 'not_steam_ready',
  summary: {
    passed,
    failed: failed.length,
    hardFailures: hardFailures.length,
    manualBlockers
  },
  checks
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

for (const check of checks) {
  console.log(`[release-audit] ${check.ok ? 'ok' : 'blocker'} ${check.name}`);
}
console.log(`[release-audit] wrote ${rel(reportPath)}`);

if (hardFailures.length) {
  console.error(`[release-audit] failed with ${hardFailures.length} hard failures`);
  process.exit(1);
}

if (failed.length) {
  console.warn(`[release-audit] completed with known manual blockers: ${failed.map((check) => check.name).join(', ')}`);
  if (strict) process.exitCode = 2;
}
