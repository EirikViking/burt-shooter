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
  'release/steam-screenshots/draft-2026-05-17-post-score-cleanup-1280/report.json',
  'release/steam-screenshots/steam-upload-candidates-2026-05-17/README.md',
  'release/steam-screenshots/steam-upload-candidates-2026-05-17/steam_upload_candidate_sheet.png',
  'release/steam-trailer/draft-2026-05-17-current/report.json',
  'release/steam-trailer/draft-2026-05-17-current/audio-mix-report.json',
  'release/steam-trailer/candidate-2026-05-17-current/report.json',
  'release/steam-trailer/candidate-2026-05-17-current/candidate-contact-sheet.png',
  'release/provenance/asset_provenance_manifest.json',
  'release/provenance/asset_provenance_report.json',
  'release/steamworks/desktop_package_review_report.json',
  'release/steamworks/store_metadata_draft.json',
  'release/steamworks/store_metadata_review_report.json'
];

const forbiddenScanRoots = [
  'README.md',
  'package.json',
  'docs',
  'public',
  'release',
  'src',
  'scripts'
];

const textExtensions = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.txt', '.vdf', '.webmanifest'
]);

const forbiddenSourceTerms = [
  ['Burt', 'Shooter'].join(' '),
  ['K', 'urt'].join(''),
  ['E', 'irik'].join(''),
  ['Stok', 'marknes'].join(''),
  'donald',
  'gris',
  'mongo',
  'tufs',
  'deili',
  'rolp',
  'svin',
  'isbjorn',
  'kjottdeig',
  'VKC',
  'VikingCoin',
  'Klever',
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

function scanForbiddenTerms() {
  const matches = [];
  const files = forbiddenScanRoots.flatMap((entry) => walkTextFiles(entry));
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

function scanForbiddenFilenames() {
  const matches = [];
  const files = forbiddenScanRoots.flatMap((entry) => walkFiles(entry));
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
  const missing = requiredHumanApprovalKeys.filter((key) => !new RegExp(`^${key}:\\s*approved\\b`, 'im').test(text));
  const hasApprover = /^approvedBy:\s*\S+/im.test(text) && !/^approvedBy:\s*TBD\s*$/im.test(text);
  const hasDate = /^approvedAt:\s*\d{4}-\d{2}-\d{2}/im.test(text);

  return {
    ok: missing.length === 0 && hasApprover && hasDate,
    path: relativePath,
    missing,
    hasApprover,
    hasDate
  };
}

function checkSteamClientValidation() {
  return checkJsonReport('release/steamworks/client_validation_report.json', (json) => {
    const checks = json.checks || {};
    const missing = requiredSteamClientChecks.filter((key) => checks[key] !== true);
    return {
      ok: json.status === 'passed' && missing.length === 0 && Boolean(json.steamBuildId || json.steamPipeBuildId),
      status: json.status || null,
      steamBuildId: json.steamBuildId || json.steamPipeBuildId || null,
      missing
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
  ...checkJsonReport('release/steam-screenshots/draft-2026-05-17-post-score-cleanup-1280/report.json', (json) => ({
    ok: Array.isArray(json.shots) && json.shots.length >= 7 &&
      (json.consoleEvents || []).length === 0 &&
      (json.pageErrors || []).length === 0 &&
      (json.badResponses || []).length === 0,
    shotCount: json.shots?.length || 0,
    consoleEvents: json.consoleEvents || [],
    pageErrors: json.pageErrors || [],
    badResponses: json.badResponses || []
  }))
});

checks.push({
  name: 'steam_screenshot_upload_candidates_1280x720',
  ...checkScreenshotCandidates()
});

checks.push({
  name: 'steam_trailer_visual_report_clean',
  ...checkJsonReport('release/steam-trailer/draft-2026-05-17-current/report.json', (json) => ({
    ok: Array.isArray(json.timeline) && json.timeline.length >= 8 &&
      (json.consoleEvents || []).length === 0 &&
      (json.pageErrors || []).length === 0 &&
      (json.badResponses || []).length === 0,
    beatCount: json.timeline?.length || 0,
    consoleEvents: json.consoleEvents || [],
    pageErrors: json.pageErrors || [],
    badResponses: json.badResponses || []
  }))
});

checks.push({
  name: 'steam_trailer_audio_mix_report_present',
  ...checkJsonReport('release/steam-trailer/draft-2026-05-17-current/audio-mix-report.json', (json) => ({
    ok: json.ffprobe?.streams?.some((stream) => stream.codec_name === 'h264') &&
      json.ffprobe?.streams?.some((stream) => stream.codec_name === 'aac') &&
      Number(json.ffprobe?.format?.duration || 0) > 40,
    duration: json.ffprobe?.format?.duration,
    streams: json.ffprobe?.streams || []
  }))
});

checks.push({
  name: 'steam_trailer_editorial_candidate_clean',
  ...checkJsonReport('release/steam-trailer/candidate-2026-05-17-current/report.json', (json) => ({
    ok: json.status === 'passed' &&
      Array.isArray(json.titleCards) &&
      json.titleCards.length === 2 &&
      json.ffprobe?.streams?.some((stream) => stream.codec_name === 'h264' && stream.width === 1280 && stream.height === 720) &&
      json.ffprobe?.streams?.some((stream) => stream.codec_name === 'aac') &&
      Number(json.ffprobe?.format?.duration || 0) >= 48 &&
      existsSync(path.resolve(root, 'release/steam-trailer/candidate-2026-05-17-current/candidate-contact-sheet.png')),
    status: json.status || null,
    duration: json.ffprobe?.format?.duration || null,
    titleCards: json.titleCards || [],
    volume: json.volume || null,
    contactSheet: json.contactSheet || null
  }))
});

checks.push({
  name: 'desktop_package_report_clean',
  ...checkJsonReport('release/steamworks/desktop_package_review_report.json', (json) => ({
    ok: json.status === 'passed' &&
      json.desktopPayload?.path === 'release/desktop/win-unpacked/Nova Swarm.exe' &&
      Number(json.desktopPayload?.sizeBytes || 0) > 0 &&
      json.latestElectronSmoke?.status === 'passed' &&
      json.latestElectronSmoke?.localHighscoreApi?.ok === true &&
      json.latestElectronSmoke?.readyState?.ready === true &&
      (json.latestElectronSmoke?.consoleEvents || []).length === 0,
    status: json.status || null,
    desktopPayload: json.desktopPayload || null,
    latestElectronSmoke: json.latestElectronSmoke || null,
    errors: json.errors || [],
    warnings: json.warnings || []
  }))
});

checks.push({
  name: 'steamcmd_available',
  ...findSteamCmd(),
  requiredForSteamReady: true
});

checks.push({
  name: 'steamworks_ids_configured',
  ok: existsSync(path.resolve(root, 'release/steamworks/app_build_LOCAL.vdf')),
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
