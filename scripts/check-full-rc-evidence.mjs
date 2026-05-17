import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const testRoot = path.resolve(root, 'test-results');
const outputPath = path.resolve(root, 'release/steamworks/full_rc_verification_report.json');
const versionPath = path.resolve(root, 'public/version.json');

const errors = [];
const warnings = [];

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function findLatestReport(prefix, predicate = () => true) {
  if (!existsSync(testRoot)) return null;
  return readdirSync(testRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => {
      const dir = path.join(testRoot, entry.name);
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
    .filter((entry) => predicate(entry.json))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0] || null;
}

function stageOk(report, name) {
  return report?.stages?.some((stage) => stage.name === name && stage.ok === true);
}

function smokeBuild(report) {
  return report?.menuState?.textState?.buildId ||
    report?.gameplayState?.textState?.buildId ||
    report?.bossVictoryState?.textState?.buildId ||
    null;
}

function playtestBuild(report) {
  return report?.finalState?.music ? null : null;
}

function assertZeroList(report, key, label) {
  const count = Array.isArray(report?.[key]) ? report[key].length : Number(report?.[key] || 0);
  if (count !== 0) errors.push(`${label} reported ${count} issue(s)`);
  return count;
}

const currentBuild = existsSync(versionPath) ? readJson(versionPath) : null;
if (!currentBuild?.version || !currentBuild?.timestamp) {
  errors.push('Missing current build metadata in public/version.json');
}

const fullRc = findLatestReport('steam-rc-verify-', (json) => json.mode === 'full');
const smoke = findLatestReport('smoke-', (json) => !String(json.baseUrl || '').startsWith('https://burt.tinyfoundry.app'));
const playtest = findLatestReport('release-playtest-');

if (!fullRc) {
  errors.push('Missing full Steam RC verifier report in test-results/steam-rc-verify-*/report.json');
}

if (!smoke) {
  errors.push('Missing local browser smoke report in test-results/smoke-*/report.json');
}

if (!playtest) {
  errors.push('Missing release playtest report in test-results/release-playtest-*/report.json');
}

const requiredFullStages = [
  'build:current',
  'check:provenance',
  'check:steam-assets',
  'check:steam-store',
  'package:steam:win:current',
  'desktop:smoke:current',
  'desktop:smoke:packaged',
  'check:desktop-package',
  'check:live-deployment',
  'audit:audio-mix',
  'smoke',
  'playtest:release'
];

if (fullRc) {
  const missingStages = requiredFullStages.filter((stage) => !stageOk(fullRc.json, stage));
  if (fullRc.json.ok !== true || missingStages.length) {
    errors.push(`Latest full Steam RC report is not complete; missing/failed stages: ${missingStages.join(', ') || 'unknown'}`);
  }
  if (fullRc.json.audioAudit?.warnings !== 0) {
    errors.push(`Latest full Steam RC audio audit has ${fullRc.json.audioAudit?.warnings ?? 'unknown'} warning(s)`);
  }
}

if (smoke) {
  const build = smokeBuild(smoke.json);
  if (currentBuild?.version && build !== currentBuild.version) {
    errors.push(`Latest local smoke build ${build || 'unknown'} does not match current build ${currentBuild.version}`);
  }
  const summaryStatus = smoke.json.summary?.status || 'passed';
  if (summaryStatus !== 'passed') errors.push(`Latest local smoke status is ${summaryStatus}`);
  assertZeroList(smoke.json, 'consoleEvents', 'Latest local smoke console warnings/errors');
  assertZeroList(smoke.json, 'pageErrors', 'Latest local smoke page errors');
  assertZeroList(smoke.json, 'badResponses', 'Latest local smoke bad responses');
}

if (playtest) {
  const survived = Number(playtest.json.survivedMs || 0);
  const required = Number(playtest.json.requiredSurvivalMs || 599500);
  if (playtest.json.survivedFullDuration !== true || survived < required) {
    errors.push(`Latest release playtest did not survive required duration (${survived}/${required} ms)`);
  }
  if (Number(playtest.json.peakLevel || 0) < 5) {
    errors.push(`Latest release playtest peak level ${playtest.json.peakLevel || 'unknown'} is below level 5`);
  }
  if (playtest.json.finalState?.fatalOverlay === true) {
    errors.push('Latest release playtest ended with fatal overlay');
  }
  if (Number(playtest.json.finalState?.lives || 0) <= 0) {
    errors.push(`Latest release playtest ended with no lives (${playtest.json.finalState?.lives ?? 'unknown'})`);
  }
  assertZeroList(playtest.json, 'routineConsoleEvents', 'Latest release playtest routine console events');
  assertZeroList(playtest.json, 'consoleEvents', 'Latest release playtest console warnings/errors');
  assertZeroList(playtest.json, 'pageErrors', 'Latest release playtest page errors');
  assertZeroList(playtest.json, 'badResponses', 'Latest release playtest bad responses');
  assertZeroList(playtest.json, 'requestFailures', 'Latest release playtest request failures');
}

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  currentBuild: currentBuild ? {
    version: currentBuild.version || null,
    timestamp: currentBuild.timestamp || null
  } : null,
  latestFullRc: fullRc ? {
    reportPath: rel(fullRc.report),
    generatedAt: fullRc.json.generatedAt || null,
    mode: fullRc.json.mode || null,
    ok: fullRc.json.ok === true,
    stageCount: fullRc.json.stages?.length || 0,
    stages: fullRc.json.stages?.map((stage) => ({
      name: stage.name,
      ok: stage.ok === true,
      durationMs: stage.durationMs || null
    })) || [],
    releaseAudit: fullRc.json.releaseAudit || null,
    audioAudit: fullRc.json.audioAudit || null
  } : null,
  latestLocalSmoke: smoke ? {
    reportPath: rel(smoke.report),
    baseUrl: smoke.json.baseUrl || null,
    build: smokeBuild(smoke.json),
    status: smoke.json.summary?.status || 'passed',
    console: {
      warningsOrErrors: smoke.json.consoleEvents?.length || 0,
      pageErrors: smoke.json.pageErrors?.length || 0,
      badResponses: smoke.json.badResponses?.length || 0
    },
    scenes: smoke.json.summary?.scenes || null,
    coverage: smoke.json.summary?.coverage || null
  } : null,
  latestReleasePlaytest: playtest ? {
    reportPath: rel(playtest.report),
    baseUrl: playtest.json.baseUrl || null,
    survivedMs: playtest.json.survivedMs || null,
    requiredSurvivalMs: playtest.json.requiredSurvivalMs || null,
    survivedFullDuration: playtest.json.survivedFullDuration === true,
    peakLevel: playtest.json.peakLevel || null,
    peakScore: playtest.json.peakScore || null,
    finalState: {
      scene: playtest.json.finalState?.scene || null,
      level: playtest.json.finalState?.level || null,
      lives: playtest.json.finalState?.lives ?? null,
      score: playtest.json.finalState?.score ?? null,
      enemyManagerState: playtest.json.finalState?.enemyManagerState || null,
      musicContext: playtest.json.finalState?.music?.currentMusicContext || null,
      musicTrack: playtest.json.finalState?.music?.currentMusicTrack || null,
      fatalOverlay: playtest.json.finalState?.fatalOverlay === true
    },
    console: {
      routineMessages: playtest.json.routineConsoleEvents?.length || 0,
      warningsOrErrors: playtest.json.consoleEvents?.length || 0,
      pageErrors: playtest.json.pageErrors?.length || 0,
      badResponses: playtest.json.badResponses?.length || 0,
      requestFailures: playtest.json.requestFailures?.length || 0
    }
  } : null,
  errors,
  warnings
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  console.error('[full-rc-evidence] failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[full-rc-evidence] ok: ${report.latestFullRc?.reportPath || 'unknown'}`);
if (warnings.length) {
  console.warn(`[full-rc-evidence] warnings: ${warnings.length}`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}
