import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const smokeRoot = path.resolve(root, 'test-results');
const outputPath = path.resolve(root, 'release/steamworks/live_deployment_report.json');
const versionPath = path.resolve(root, 'public/version.json');
const liveUrl = process.env.NOVA_SWARM_LIVE_URL || 'https://burt.tinyfoundry.app';
const extraUrls = (process.env.NOVA_SWARM_DEPLOYMENT_URLS || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const errors = [];
const warnings = [];

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/$/, '');
}

async function fetchVersion(baseUrl) {
  const url = `${normalizeBaseUrl(baseUrl)}/version.json`;
  try {
    const response = await fetch(url, { cache: 'no-store' });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      errors.push(`Live version response was not JSON at ${url}`);
    }
    return {
      url,
      ok: response.ok,
      status: response.status,
      version: json?.version || null,
      timestamp: json?.timestamp || null
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: null,
      version: null,
      timestamp: null,
      error: error.message
    };
  }
}

function findLatestLiveSmokeReport() {
  if (!existsSync(smokeRoot)) return null;
  return readdirSync(smokeRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('smoke-'))
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
    .map((entry) => ({
      ...entry,
      json: readJson(entry.report)
    }))
    .filter((entry) => normalizeBaseUrl(entry.json?.baseUrl) === normalizeBaseUrl(liveUrl))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0] || null;
}

function smokeBuild(report) {
  return report?.menuState?.textState?.buildId ||
    report?.gameplayState?.textState?.buildId ||
    report?.bossVictoryState?.textState?.buildId ||
    null;
}

const currentBuild = existsSync(versionPath) ? readJson(versionPath) : null;
if (!currentBuild?.version || !currentBuild?.timestamp) {
  errors.push('Missing current build metadata in public/version.json');
}

const versionChecks = await Promise.all([liveUrl, ...extraUrls].map(fetchVersion));
for (const check of versionChecks) {
  if (!check.ok) {
    errors.push(`Could not fetch live version at ${check.url}: status ${check.status || check.error || 'unknown'}`);
  }
  if (currentBuild?.version && check.version !== currentBuild.version) {
    errors.push(`Live version ${check.version || 'unknown'} at ${check.url} does not match current build ${currentBuild.version}`);
  }
}

const liveSmoke = findLatestLiveSmokeReport();
const liveSmokeReport = liveSmoke?.json || null;
if (!liveSmoke) {
  errors.push(`Missing live-domain smoke report for ${liveUrl}`);
} else {
  const summary = liveSmokeReport.summary || {};
  const build = smokeBuild(liveSmokeReport);
  if (summary.status && summary.status !== 'passed') {
    errors.push(`Latest live smoke summary status is ${summary.status}`);
  }
  if ((liveSmokeReport.consoleEvents || []).length) {
    errors.push(`Latest live smoke has ${liveSmokeReport.consoleEvents.length} console warning/error event(s)`);
  }
  if ((liveSmokeReport.pageErrors || []).length) {
    errors.push(`Latest live smoke has ${liveSmokeReport.pageErrors.length} page error(s)`);
  }
  if ((liveSmokeReport.badResponses || []).length) {
    errors.push(`Latest live smoke has ${liveSmokeReport.badResponses.length} bad response(s)`);
  }
  if (currentBuild?.version && build !== currentBuild.version) {
    errors.push(`Latest live smoke build ${build || 'unknown'} does not match current build ${currentBuild.version}`);
  }

  const requiredScreenshots = [
    '01-menu.png',
    '01-settings.png',
    '02-gameplay.png',
    '03-gamepad-pause.png',
    '08-mobile-intro.png',
    '14-boss-defeated.png'
  ];
  for (const screenshot of requiredScreenshots) {
    const screenshotPath = path.join(liveSmoke.dir, screenshot);
    if (!existsSync(screenshotPath)) {
      errors.push(`Latest live smoke is missing screenshot ${rel(screenshotPath)}`);
    }
  }

  const ageHours = (Date.now() - statSync(liveSmoke.report).mtimeMs) / 36e5;
  if (ageHours > 72) {
    warnings.push(`Latest live smoke report is ${ageHours.toFixed(1)} hours old`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  currentBuild: currentBuild ? {
    version: currentBuild.version || null,
    timestamp: currentBuild.timestamp || null
  } : null,
  liveUrl,
  versionChecks,
  latestLiveSmoke: liveSmoke ? {
    reportPath: rel(liveSmoke.report),
    baseUrl: liveSmokeReport?.baseUrl || null,
    status: liveSmokeReport?.summary?.status || (errors.length ? null : 'passed'),
    build: smokeBuild(liveSmokeReport),
    screenshots: [
      '01-menu.png',
      '01-settings.png',
      '01-credits.png',
      '02-gameplay.png',
      '02-powerup-hud.png',
      '03-gamepad-pause.png',
      '06-game-over.png',
      '08-mobile-intro.png',
      '10-level3-gameplay.png',
      '14-boss-defeated.png',
      '15-level-2-start.png'
    ].map((file) => ({
      file,
      exists: existsSync(path.join(liveSmoke.dir, file))
    })),
    console: {
      warningsOrErrors: liveSmokeReport?.consoleEvents?.length || 0,
      pageErrors: liveSmokeReport?.pageErrors?.length || 0,
      badResponses: liveSmokeReport?.badResponses?.length || 0
    },
    scenes: liveSmokeReport?.summary?.scenes || null,
    coverage: liveSmokeReport?.summary?.coverage || null
  } : null,
  errors,
  warnings
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  console.error('[live-deployment] failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[live-deployment] ok: ${liveUrl}`);
if (warnings.length) {
  console.warn(`[live-deployment] warnings: ${warnings.length}`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}
