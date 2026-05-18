import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputPath = path.resolve(root, 'release/steamworks/desktop_package_review_report.json');
const desktopPayload = 'release/desktop/win-unpacked/Nova Swarm.exe';
const versionPath = path.resolve(root, 'public/version.json');
const smokeRoot = path.resolve(root, 'test-results');

const errors = [];
const warnings = [];

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function findLatestSmokeReport(prefix) {
  if (!existsSync(smokeRoot)) return null;
  const dirs = readdirSync(smokeRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
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

function checkSmokeReport(label, latestSmoke) {
  let report = null;
  const labelName = label === 'packaged executable' ? 'packaged executable smoke' : `${label} smoke`;
  if (!latestSmoke) {
    errors.push(`Missing ${labelName} report in test-results/${label === 'Electron' ? 'electron-smoke' : 'packaged-exe-smoke'}-*/report.json`);
    return { report };
  }

  report = readJson(latestSmoke.report);
  const screenshot = path.join(latestSmoke.dir, '01-electron-menu.png');
  if (!existsSync(screenshot)) {
    errors.push(`Missing ${labelName} screenshot: ${rel(screenshot)}`);
  }
  if (report.status !== 'passed') {
    errors.push(`Latest ${labelName} status is ${report.status || 'unknown'}`);
  }
  if (report.state?.apiOk !== true || report.state?.apiStatus !== 200) {
    errors.push(`${labelName} local highscore API did not pass`);
  }
  if (!report.state?.scene) {
    errors.push(`${labelName} did not report a rendered scene`);
  }
  if (report.state?.readyState?.ready !== true) {
    errors.push(`${labelName} did not report ready rendered intro/menu state`);
  }
  if ((report.consoleEvents || []).length) {
    errors.push(`${labelName} reported ${report.consoleEvents.length} console event(s)`);
  }
  if (currentBuild?.version && report.state?.build !== currentBuild.version) {
    errors.push(`Latest ${labelName} build ${report.state?.build || 'unknown'} does not match current build ${currentBuild.version}`);
  }

  const ageHours = (Date.now() - statSync(latestSmoke.report).mtimeMs) / 36e5;
  if (ageHours > 72) {
    warnings.push(`Latest ${labelName} report is ${ageHours.toFixed(1)} hours old`);
  }

  return { report };
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

const currentBuild = existsSync(versionPath) ? readJson(versionPath) : null;
if (!currentBuild?.version || !currentBuild?.timestamp) {
  errors.push('Missing current build metadata in public/version.json');
}

const latestSmoke = findLatestSmokeReport('electron-smoke-');
const latestPackagedSmoke = findLatestSmokeReport('packaged-exe-smoke-');
const latestPackagedControlSmoke = findLatestSmokeReport('packaged-control-smoke-');
const { report: smokeReport } = checkSmokeReport('Electron', latestSmoke);
const { report: packagedSmokeReport } = checkSmokeReport('packaged executable', latestPackagedSmoke);

function checkControlSmokeReport(latestSmoke) {
  if (!latestSmoke) {
    errors.push('Missing packaged controls smoke report in test-results/packaged-control-smoke-*/report.json');
    return null;
  }

  const report = readJson(latestSmoke.report);
  if (report.status !== 'passed') {
    errors.push(`Latest packaged controls smoke status is ${report.status || 'unknown'}`);
  }
  if (currentBuild?.version && report.build !== currentBuild.version) {
    errors.push(`Latest packaged controls smoke build ${report.build || 'unknown'} does not match current build ${currentBuild.version}`);
  }
  const requiredChecks = [
    'keyboardMovement',
    'keyboardFire',
    'keyboardPause',
    'gamepadMovement',
    'gamepadFire',
    'gamepadPause'
  ];
  for (const check of requiredChecks) {
    if (report.checks?.[check] !== true) {
      errors.push(`Packaged controls smoke failed ${check}`);
    }
  }
  for (const screenshot of report.screenshots || []) {
    const full = path.join(latestSmoke.dir, screenshot);
    if (!existsSync(full)) errors.push(`Missing packaged controls screenshot: ${rel(full)}`);
  }
  if ((report.consoleEvents || []).length) {
    errors.push(`Packaged controls smoke reported ${report.consoleEvents.length} console event(s)`);
  }

  const ageHours = (Date.now() - statSync(latestSmoke.report).mtimeMs) / 36e5;
  if (ageHours > 72) {
    warnings.push(`Latest packaged controls smoke report is ${ageHours.toFixed(1)} hours old`);
  }

  return report;
}

const packagedControlSmokeReport = checkControlSmokeReport(latestPackagedControlSmoke);

function smokeSummary(latest, smokeReport) {
  return latest ? {
    reportPath: rel(latest.report),
    screenshotPath: rel(path.join(latest.dir, '01-electron-menu.png')),
    status: smokeReport?.status || null,
    build: smokeReport?.state?.build || null,
    title: smokeReport?.state?.title || null,
    scene: smokeReport?.state?.scene || null,
    introTitle: smokeReport?.state?.introTitle || null,
    localHighscoreApi: {
      ok: smokeReport?.state?.apiOk === true,
      status: smokeReport?.state?.apiStatus || null
    },
    readyState: smokeReport?.state?.readyState || null,
    consoleEvents: smokeReport?.consoleEvents || []
  } : null;
}

function controlSmokeSummary(latest, report) {
  return latest ? {
    reportPath: rel(latest.report),
    screenshotPaths: (report?.screenshots || []).map((screenshot) => rel(path.join(latest.dir, screenshot))),
    status: report?.status || null,
    build: report?.build || null,
    checks: report?.checks || null,
    consoleEvents: report?.consoleEvents || [],
    errors: report?.errors || []
  } : null;
}

if (payload && currentBuild?.timestamp) {
  const packageTime = Date.parse(payload.modifiedAt);
  const buildTime = Date.parse(currentBuild.timestamp);
  if (Number.isFinite(packageTime) && Number.isFinite(buildTime) && packageTime < buildTime) {
    errors.push(`Desktop package is older than current build metadata (${payload.modifiedAt} < ${currentBuild.timestamp})`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  currentBuild: currentBuild ? {
    version: currentBuild.version || null,
    timestamp: currentBuild.timestamp || null
  } : null,
  desktopPayload: payload,
  latestElectronSmoke: smokeSummary(latestSmoke, smokeReport),
  latestPackagedExeSmoke: smokeSummary(latestPackagedSmoke, packagedSmokeReport),
  latestPackagedControlsSmoke: controlSmokeSummary(latestPackagedControlSmoke, packagedControlSmokeReport),
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
