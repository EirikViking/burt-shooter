import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const reportPath = path.resolve(process.env.RELEASE_AUDIT_REPORT || 'docs/reviews/release-readiness-audit-2026-05-17.json');
const strict = process.argv.includes('--strict') || process.env.RELEASE_AUDIT_STRICT === '1';

const requiredFiles = [
  'docs/reviews/2026-05-17-steam-readiness-checklist.md',
  'docs/reviews/2026-05-17-audio-mix-audit.md',
  'docs/steam-desktop-package.md',
  'docs/steam-trailer-workflow.md',
  'release/steamworks/app_build_TEMPLATE.vdf',
  'release/steamworks/steam_client_validation_runbook.md',
  'docs/reviews/2026-05-17-steamcmd-local-check.md',
  'release/steam-assets/draft-2026-05-17-nova-swarm/review/steam_asset_review_report.json',
  'release/steam-assets/draft-2026-05-17-nova-swarm/review/steam_asset_contact_sheet.png',
  'release/steam-assets/draft-2026-05-17-nova-swarm/review/small_capsule_thumbnail_sheet.png',
  'release/steam-screenshots/draft-2026-05-17-live-1280/report.json',
  'release/steam-screenshots/steam-upload-candidates-2026-05-17/README.md',
  'release/steam-screenshots/steam-upload-candidates-2026-05-17/steam_upload_candidate_sheet.png',
  'release/steam-trailer/draft-2026-05-17-12-46/report.json',
  'release/steam-trailer/draft-2026-05-17-12-46/audio-mix-report.json'
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
  ['Stok', 'marknes'].join('')
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
    ok: candidates.length >= 5 && identify.every((item) => item.ok),
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

checks.push({
  name: 'steam_assets_report_clean',
  ...checkJsonReport('release/steam-assets/draft-2026-05-17-nova-swarm/review/steam_asset_review_report.json', (json) => ({
    ok: Array.isArray(json.failures) && json.failures.length === 0 && Array.isArray(json.assets) && json.assets.length === 9,
    assetCount: json.assets?.length || 0,
    failures: json.failures || []
  }))
});

checks.push({
  name: 'live_screenshot_capture_report_clean',
  ...checkJsonReport('release/steam-screenshots/draft-2026-05-17-live-1280/report.json', (json) => ({
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
  ...checkJsonReport('release/steam-trailer/draft-2026-05-17-12-46/report.json', (json) => ({
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
  ...checkJsonReport('release/steam-trailer/draft-2026-05-17-12-46/audio-mix-report.json', (json) => ({
    ok: json.ffprobe?.streams?.some((stream) => stream.codec_name === 'h264') &&
      json.ffprobe?.streams?.some((stream) => stream.codec_name === 'aac') &&
      Number(json.ffprobe?.format?.duration || 0) > 40,
    duration: json.ffprobe?.format?.duration,
    streams: json.ffprobe?.streams || []
  }))
});

checks.push({
  name: 'desktop_payload_exists',
  ok: existsSync(path.resolve(root, 'release/desktop/win-unpacked/Nova Swarm.exe')),
  path: 'release/desktop/win-unpacked/Nova Swarm.exe'
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
  ok: existsSync(path.resolve(root, 'release/steamworks/client_validation_report.json')),
  requiredForSteamReady: true,
  expectedFile: 'release/steamworks/client_validation_report.json'
});

checks.push({
  name: 'human_release_approvals_recorded',
  ok: existsSync(path.resolve(root, 'docs/reviews/2026-05-17-human-release-approval.md')),
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
