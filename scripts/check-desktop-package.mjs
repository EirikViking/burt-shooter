import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputPath = path.resolve(root, 'release/steamworks/desktop_package_review_report.json');
const desktopPayload = 'release/desktop/win-unpacked/Nova Swarm.exe';
const smokeRoot = path.resolve(root, 'test-results');

const errors = [];
const warnings = [];

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function findLatestElectronSmokeReport() {
  if (!existsSync(smokeRoot)) return null;
  const dirs = readdirSync(smokeRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('electron-smoke-'))
    .map((entry) => {
      const dir = path.join(smokeRoot, entry.name);
      const report = path.join(dir, 'report.json');
      return {
        dir,
        report,
        mtimeMs: statSync(dir).mtimeMs
      };
    })
    .filter((entry) => existsSync(entry.report))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return dirs[0] || null;
}

function fileInfo(relativePath) {
  const full = path.resolve(root, relativePath);
  if (!existsSync(full)) return null;
  const stats = statSync(full);
  return {
    path: relativePath,
    sizeBytes: stats.size,
    modifiedAt: stats.mtime.toISOString()
  };
}

const payload = fileInfo(desktopPayload);
if (!payload) {
  errors.push(`Missing ${desktopPayload}`);
}

const latestSmoke = findLatestElectronSmokeReport();
let smokeReport = null;

if (!latestSmoke) {
  errors.push('Missing Electron smoke report in test-results/electron-smoke-*/report.json');
} else {
  smokeReport = readJson(latestSmoke.report);
  const screenshot = path.join(latestSmoke.dir, '01-electron-menu.png');
  if (!existsSync(screenshot)) {
    errors.push(`Missing Electron smoke screenshot: ${rel(screenshot)}`);
  }
  if (smokeReport.status !== 'passed') {
    errors.push(`Latest Electron smoke status is ${smokeReport.status || 'unknown'}`);
  }
  if (smokeReport.state?.apiOk !== true || smokeReport.state?.apiStatus !== 200) {
    errors.push('Electron local highscore API did not pass');
  }
  if (!smokeReport.state?.scene) {
    errors.push('Electron smoke did not report a rendered scene');
  }
  if (smokeReport.state?.readyState?.ready !== true) {
    errors.push('Electron smoke did not report ready rendered intro/menu state');
  }
  if ((smokeReport.consoleEvents || []).length) {
    errors.push(`Electron smoke reported ${smokeReport.consoleEvents.length} console event(s)`);
  }

  const ageHours = (Date.now() - statSync(latestSmoke.report).mtimeMs) / 36e5;
  if (ageHours > 72) {
    warnings.push(`Latest Electron smoke report is ${ageHours.toFixed(1)} hours old`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  desktopPayload: payload,
  latestElectronSmoke: latestSmoke ? {
    reportPath: rel(latestSmoke.report),
    screenshotPath: rel(path.join(latestSmoke.dir, '01-electron-menu.png')),
    status: smokeReport?.status || null,
    title: smokeReport?.state?.title || null,
    scene: smokeReport?.state?.scene || null,
    introTitle: smokeReport?.state?.introTitle || null,
    localHighscoreApi: {
      ok: smokeReport?.state?.apiOk === true,
      status: smokeReport?.state?.apiStatus || null
    },
    readyState: smokeReport?.state?.readyState || null,
    consoleEvents: smokeReport?.consoleEvents || []
  } : null,
  errors,
  warnings
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  console.error('[desktop-package] failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[desktop-package] ok: ${desktopPayload}`);
if (warnings.length) {
  console.warn(`[desktop-package] warnings: ${warnings.length}`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}
