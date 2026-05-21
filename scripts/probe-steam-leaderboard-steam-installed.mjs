import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const APP_ID = '4765070';
const DEFAULT_SCORE = '1';
const DEFAULT_DETAILS = 'none';
const TIMEOUT_MS = 150000;
const root = process.cwd();
const args = process.argv.slice(2);

function readArgValue(name, fallback = null) {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  return fallback;
}

function registryValue(key, name) {
  if (process.platform !== 'win32') return null;
  try {
    const stdout = execFileSync('reg', ['query', key, '/v', name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const line = stdout.split(/\r?\n/).find((entry) => entry.includes(name));
    const match = line?.match(/\sREG_\w+\s+(.+?)\s*$/);
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

function steamExeCandidates() {
  return [
    process.env.STEAM_EXE,
    process.env.STEAM_PATH ? path.join(process.env.STEAM_PATH, 'steam.exe') : null,
    registryValue('HKCU\\Software\\Valve\\Steam', 'SteamExe'),
    registryValue('HKCU\\Software\\Valve\\Steam', 'SteamPath') ? path.join(registryValue('HKCU\\Software\\Valve\\Steam', 'SteamPath'), 'steam.exe') : null,
    'C:\\Program Files (x86)\\Steam\\steam.exe',
    'C:\\Program Files\\Steam\\steam.exe'
  ].filter(Boolean).map((candidate) => path.resolve(candidate));
}

function findSteamExe() {
  return steamExeCandidates().find((candidate) => existsSync(candidate)) || null;
}

function reportRoot() {
  return path.join(process.env.APPDATA || path.join(process.env.USERPROFILE || root, 'AppData', 'Roaming'), 'Nova Swarm', 'test-results');
}

function latestProbeReport(startedAtMs) {
  const dir = reportRoot();
  if (!existsSync(dir)) return null;
  const reports = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('steam-leaderboard-electron-'))
    .map((entry) => {
      const reportPath = path.join(dir, entry.name, 'report.json');
      if (!existsSync(reportPath)) return null;
      const mtimeMs = statSync(reportPath).mtimeMs;
      return { reportPath, mtimeMs };
    })
    .filter(Boolean)
    .filter((entry) => entry.mtimeMs >= startedAtMs - 1000)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return reports[0] || null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function probeArgs() {
  if (args.includes('--force-update')) {
    throw new Error('This Steam-installed probe never supports --force-update.');
  }
  const details = String(readArgValue('--details', DEFAULT_DETAILS)).toLowerCase();
  const score = String(readArgValue('--score', DEFAULT_SCORE));
  const submitArgs = args.includes('--no-submit') ? ['--no-submit'] : ['--submit'];
  return [
    '--steam-leaderboard-probe',
    ...submitArgs,
    `--details=${details}`,
    `--score=${score}`
  ];
}

const dryRun = args.includes('--dry-run');
const steamExe = findSteamExe();
const launchArgs = ['-applaunch', APP_ID, ...probeArgs()];
const startedAtMs = Date.now();

if (!steamExe) {
  console.error('[steam-installed-probe] Steam executable not found.');
  console.error(`Manual equivalent: <Steam.exe> ${launchArgs.join(' ')}`);
  process.exit(1);
}

console.log('[steam-installed-probe]');
console.log(`Steam: ${steamExe}`);
console.log(`Command: "${steamExe}" ${launchArgs.join(' ')}`);
console.log(`Report root: ${reportRoot()}`);
console.log('This launches through Steam and submits at most one keep-best score unless --no-submit is passed.');

if (dryRun) {
  console.log('[steam-installed-probe] dry run only; not launching Steam.');
  process.exit(0);
}

mkdirSync(reportRoot(), { recursive: true });
const child = spawn(steamExe, launchArgs, {
  cwd: path.dirname(steamExe),
  detached: true,
  stdio: 'ignore',
  windowsHide: false
});
child.unref();

let report = null;
const deadline = Date.now() + TIMEOUT_MS;
while (Date.now() < deadline) {
  report = latestProbeReport(startedAtMs);
  if (report) break;
  await sleep(2500);
}

if (!report) {
  console.error(`[steam-installed-probe] No new report found within ${Math.round(TIMEOUT_MS / 1000)}s.`);
  console.error('If Steam opened a normal game window instead, set the same launch args manually in Steam client Properties -> Launch Options, then run once.');
  console.error(`Launch options: ${probeArgs().join(' ')}`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(report.reportPath, 'utf8'));
console.log(JSON.stringify({
  status: data.status,
  report: report.reportPath,
  runtimeInfo: data.runtimeInfo || data.runtime || null,
  bridgeStatus: data.bridgeStatus || null,
  personaName: data.personaName || null,
  globalBefore: data.globalBefore ? { ok: data.globalBefore.ok, count: data.globalBefore.count, error: data.globalBefore.error || null } : null,
  friendsBefore: data.friendsBefore ? { ok: data.friendsBefore.ok, count: data.friendsBefore.count, error: data.friendsBefore.error || null } : null,
  submit: data.submit || null,
  latestUploadDiagnostics: data.latestUploadDiagnostics || null,
  currentPlayerObservedAfterSubmit: Boolean(data.currentPlayerObservedAfterSubmit),
  warnings: data.warnings || []
}, null, 2));

process.exitCode = data.submit?.success && data.currentPlayerObservedAfterSubmit ? 0 : 1;
