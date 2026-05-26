import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_ID = '4765070';
const DEPOT_ID = '4765071';
const LEADERBOARD_NAME = 'nova_swarm_global_score';
const EXPECTED_LATEST_BUILD_ID = '23352036';
const REPORT_PREFIX = 'steamworks-leaderboard-write-diagnose';

const root = process.cwd();
const now = new Date();
const outputDir = path.resolve(root, 'test-results', `${REPORT_PREFIX}-${now.toISOString().replace(/[:.]/g, '-')}`);
const reportPath = path.join(outputDir, 'report.json');

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readText(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function parseVdfScalars(text) {
  const values = {};
  if (!text) return values;
  const pattern = /"([^"]+)"\s+"([^"]*)"/g;
  let match = null;
  while ((match = pattern.exec(text))) {
    values[match[1]] = match[2].replaceAll('\\\\', '\\');
  }
  return values;
}

function gitValue(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function registryValue(key, name) {
  if (process.platform !== 'win32') return null;
  try {
    const stdout = execFileSync('reg', ['query', key, '/v', name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const line = stdout.split(/\r?\n/).find((entry) => entry.includes(name));
    if (!line) return null;
    const match = line.match(/\sREG_\w+\s+(.+?)\s*$/);
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

function candidateSteamRoots() {
  const candidates = [
    process.env.STEAM_PATH,
    process.env.STEAM_DIR,
    registryValue('HKCU\\Software\\Valve\\Steam', 'SteamPath'),
    registryValue('HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'),
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam'
  ].filter(Boolean);
  return [...new Set(candidates.map((candidate) => path.resolve(candidate)))];
}

function parseSteamLibraries(steamRoot) {
  const roots = [steamRoot];
  const libraryVdf = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');
  const text = readText(libraryVdf);
  if (text) {
    const pattern = /"path"\s+"([^"]+)"/g;
    let match = null;
    while ((match = pattern.exec(text))) {
      roots.push(path.resolve(match[1].replaceAll('\\\\', '\\')));
    }
  }
  return [...new Set(roots)].filter((candidate) => existsSync(path.join(candidate, 'steamapps')));
}

function findSteamInstall() {
  for (const steamRoot of candidateSteamRoots()) {
    if (!existsSync(steamRoot)) continue;
    const steamExe = path.join(steamRoot, 'steam.exe');
    const libraries = parseSteamLibraries(steamRoot);
    for (const libraryRoot of libraries) {
      const manifestPath = path.join(libraryRoot, 'steamapps', `appmanifest_${APP_ID}.acf`);
      if (!existsSync(manifestPath)) continue;
      const manifest = parseVdfScalars(readText(manifestPath));
      const installDir = manifest.installdir || manifest.name || 'Nova Swarm';
      const installPath = path.join(libraryRoot, 'steamapps', 'common', installDir);
      const exePath = path.join(installPath, 'Nova Swarm.exe');
      return {
        steamRoot,
        steamExe: existsSync(steamExe) ? steamExe : null,
        libraryRoot,
        manifestPath,
        manifest,
        installPath,
        exePath: existsSync(exePath) ? exePath : null
      };
    }
    if (existsSync(steamExe)) {
      return { steamRoot, steamExe, libraries, manifestPath: null, manifest: null, installPath: null, exePath: null };
    }
  }
  return null;
}

function findReportsIn(rootDir) {
  const reports = [];
  if (!rootDir || !existsSync(rootDir)) return reports;
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('steam-leaderboard-live-') && !entry.name.startsWith('steam-leaderboard-electron-')) continue;
    const report = path.join(rootDir, entry.name, 'report.json');
    if (!existsSync(report)) continue;
    reports.push({
      kind: entry.name.startsWith('steam-leaderboard-live-') ? 'node-live' : 'electron',
      path: report,
      mtimeMs: statSync(report).mtimeMs,
      data: readJson(report)
    });
  }
  return reports;
}

function latestReports() {
  const appData = process.env.APPDATA ? path.join(process.env.APPDATA, 'Nova Swarm', 'test-results') : null;
  const reports = [
    ...findReportsIn(path.join(root, 'test-results')),
    ...findReportsIn(appData)
  ].filter((entry) => entry.data);
  reports.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return reports;
}

function compactRead(step) {
  if (!step) return null;
  return {
    ok: Boolean(step.ok),
    count: step.count ?? null,
    error: step.error?.message || step.error || null
  };
}

function compactSubmit(step, latestUploadDiagnostics = null) {
  if (!step && !latestUploadDiagnostics) return null;
  const rawResult = step?.rawResult || latestUploadDiagnostics?.rawResult || latestUploadDiagnostics?.response || null;
  return {
    callCompleted: Boolean(step?.callCompleted ?? step?.ok ?? rawResult),
    success: Boolean(step?.success),
    interpretedStatus: step?.interpretedStatus || latestUploadDiagnostics?.interpretedStatus || null,
    nativeErrorMessage: step?.nativeErrorMessage || latestUploadDiagnostics?.nativeErrorMessage || null,
    requestCurrentStats: step?.requestCurrentStats || latestUploadDiagnostics?.requestCurrentStats || latestUploadDiagnostics?.diagnostics?.requestCurrentStats || null,
    rawResult,
    diagnostics: step?.diagnostics || latestUploadDiagnostics?.diagnostics || null
  };
}

function summarizeProbeReport(entry) {
  const data = entry?.data;
  if (!data) return null;
  const latestUploadDiagnostics = data.latestUploadDiagnostics || null;
  return {
    kind: entry.kind,
    path: entry.path,
    modifiedAt: new Date(entry.mtimeMs).toISOString(),
    status: data.status || null,
    runtimeInfo: data.runtimeInfo || data.runtime || null,
    launchedBySteamHint: Boolean(data.runtimeInfo?.launchedBySteamHint || data.runtime?.launchedBySteamHint),
    bridgeStatus: data.bridgeStatus || null,
    personaName: data.personaName || null,
    requestCurrentStats: data.requestCurrentStats || null,
    openLeaderboard: data.openLeaderboard || null,
    globalBefore: compactRead(data.globalBefore),
    friendsBefore: compactRead(data.friendsBefore),
    submit: compactSubmit(data.submit, latestUploadDiagnostics),
    globalAfter: compactRead(data.globalAfter),
    friendsAfter: compactRead(data.friendsAfter),
    currentPlayerObservedAfterSubmit: Boolean(data.currentPlayerObservedAfterSubmit),
    warnings: data.warnings || []
  };
}

function hasSuccessfulRead(summary) {
  return Boolean(summary?.globalBefore?.ok || summary?.friendsBefore?.ok || summary?.globalAfter?.ok || summary?.friendsAfter?.ok);
}

function hasBackendWriteRejection(summary) {
  const raw = summary?.submit?.rawResult;
  return summary?.submit?.interpretedStatus === 'steam_callback_m_bSuccess_false' ||
    summary?.submit?.interpretedStatus === 'steam_backend_rejected_unknown_reason' ||
    raw?.m_bSuccess === 0 ||
    raw?.m_bSuccess === '0';
}

function hasLocalSdkReady(summary) {
  const status = summary?.bridgeStatus;
  const diagnostics = summary?.submit?.diagnostics?.rawSdkDiagnostics;
  return Boolean(status?.available && status?.nativeModuleLoaded && (diagnostics?.hasNativeUploadFunction !== false));
}

function buildIdIsExpectedOrNewer(installedBuildId, expectedBuildId) {
  const installed = Number(installedBuildId);
  const expected = Number(expectedBuildId);
  if (!Number.isFinite(installed) || !Number.isFinite(expected)) {
    return installedBuildId === expectedBuildId;
  }
  return installed >= expected;
}

function readLocalState() {
  const version = readJson(path.join(root, 'public', 'version.json'));
  const packageJson = readJson(path.join(root, 'package.json'));
  const desktopReview = readJson(path.join(root, 'release', 'steamworks', 'desktop_package_review_report.json'));
  const payloadManifest = readJson(path.join(root, 'release', 'steamworks', 'steam_payload_manifest.json'));
  const vdfPath = path.join(root, 'release', 'steamworks', 'app_build_LOCAL.vdf');
  const vdf = parseVdfScalars(readText(vdfPath));
  return {
    git: {
      branch: gitValue(['branch', '--show-current']),
      head: gitValue(['rev-parse', '--short', 'HEAD']),
      status: gitValue(['status', '--short', '--branch'])
    },
    packageName: packageJson?.name || null,
    packageVersion: packageJson?.version || null,
    buildVersion: version?.version || null,
    buildTimestamp: version?.timestamp || null,
    localVdf: existsSync(vdfPath) ? {
      path: vdfPath,
      appId: vdf.AppID || null,
      desc: vdf.Desc || null,
      buildOutput: vdf.BuildOutput || null,
      contentRoot: vdf.ContentRoot || null,
      setLive: vdf.SetLive || '',
      depotIds: [...new Set([...readText(vdfPath).matchAll(/"(\d{7,})"\s*\{/g)].map((match) => match[1]))]
    } : null,
    desktopReview: desktopReview ? {
      path: path.join(root, 'release', 'steamworks', 'desktop_package_review_report.json'),
      status: desktopReview.status || null,
      currentBuild: desktopReview.currentBuild || null,
      desktopPayload: desktopReview.desktopPayload || null
    } : null,
    payloadManifest: payloadManifest ? {
      path: path.join(root, 'release', 'steamworks', 'steam_payload_manifest.json'),
      build: payloadManifest.build || null,
      executable: payloadManifest.executable || null,
      fileCount: payloadManifest.fileCount || null,
      totalBytes: payloadManifest.totalBytes || null,
      manifestHash: payloadManifest.manifestHash || null
    } : null
  };
}

function currentRuntimeEnv() {
  const steamEnv = {
    SteamAppId: process.env.SteamAppId || null,
    SteamGameId: process.env.SteamGameId || null,
    SteamOverlayGameId: process.env.SteamOverlayGameId || null,
    STEAM_APP_ID: process.env.STEAM_APP_ID || null,
    NOVA_SWARM_STEAM_APP_ID: process.env.NOVA_SWARM_STEAM_APP_ID || null
  };
  return {
    pid: process.pid,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    launchedBySteamHint: Boolean(steamEnv.SteamAppId || steamEnv.SteamGameId || steamEnv.SteamOverlayGameId),
    steamEnv
  };
}

function requestCurrentStatsOk(summary) {
  const status = summary?.submit?.requestCurrentStats || summary?.requestCurrentStats || null;
  return status?.ok === true && status?.result?.m_eResult === 1;
}

function buildInterpretation(latestSummary, steamInstall) {
  const readPathVerified = hasSuccessfulRead(latestSummary);
  const writeRejectedBySteamBackend = hasBackendWriteRejection(latestSummary);
  const localSdkReady = hasLocalSdkReady(latestSummary);
  const latestProbeWasSteamLaunched = Boolean(latestSummary?.launchedBySteamHint);
  const statsReady = requestCurrentStatsOk(latestSummary);
  const installedBuildId = steamInstall?.manifest?.buildid || null;
  const latestDiagnosticsBuildInstalled = buildIdIsExpectedOrNewer(installedBuildId, EXPECTED_LATEST_BUILD_ID);

  const remainingSuspects = [];
  if (writeRejectedBySteamBackend) {
    remainingSuspects.push('Steam accepted UploadLeaderboardScore and returned LeaderboardScoreUploaded_t, but m_bSuccess was 0. With details=none/score=1, this is not explained by metadata length.');
    remainingSuspects.push('Steamworks screenshot evidence now shows Writer/Skriver "-", so visible Trusted configuration is no longer the leading explanation.');
    if (statsReady) {
      remainingSuspects.push('RequestCurrentStats/UserStatsReceived_t readiness was observed with m_eResult=1 in the latest evidence, so it is no longer the leading explanation.');
      remainingSuspects.push('Steam client launch context, app/package entitlement, wrapper upload behavior, or backend rejection remain the leading explanations.');
    } else {
      remainingSuspects.push('RequestCurrentStats/UserStatsReceived_t readiness, Steam client launch context, app/package entitlement, wrapper upload behavior, or backend rejection remain the leading explanations.');
    }
    remainingSuspects.push('App/package entitlement or unreleased app state may allow reads but reject client writes for this account/build.');
    remainingSuspects.push('Steamworks backend propagation delay remains possible after leaderboard/build/package changes.');
  }
  if (!latestProbeWasSteamLaunched) {
    remainingSuspects.push('Latest local report was not Steam-launched. Use the Steam-installed probe before treating local runtime evidence as authoritative.');
  }
  if (steamInstall?.manifest && !latestDiagnosticsBuildInstalled) {
    remainingSuspects.push(`Steam installed build ${installedBuildId || 'unknown'} is older than expected diagnostics build ${EXPECTED_LATEST_BUILD_ID}.`);
  }
  if (!steamInstall?.manifest) {
    remainingSuspects.push('Steam app manifest for 4765070 was not found locally; installed package/build state could not be verified.');
  }

  return {
    readPathVerified,
    writePathPending: !latestSummary?.currentPlayerObservedAfterSubmit,
    writeRejectedBySteamBackend,
    localSdkReady,
    notSteamLaunched: latestSummary ? !latestProbeWasSteamLaunched : null,
    appPackageEntitlementSuspected: Boolean(writeRejectedBySteamBackend && latestProbeWasSteamLaunched),
    installedBuildId,
    latestDiagnosticsBuildInstalled,
    mostLikelyCause: writeRejectedBySteamBackend
      ? (statsReady
          ? 'Steam client launch context, app/package entitlement, native wrapper upload behavior, or Steam backend rejection'
          : 'RequestCurrentStats readiness, Steam client launch context, app/package entitlement, native wrapper upload behavior, or Steam backend rejection')
      : latestSummary
        ? 'No backend write rejection found in latest report'
        : 'No live/probe report found yet',
    remainingSuspects
  };
}

function manualChecks() {
  return [
    {
      label: 'Leaderboard configuration',
      page: 'Steamworks App Admin -> Nova Swarm (4765070) -> Stats & Achievements -> Leaderboards -> nova_swarm_global_score',
      expected: ['Writer / Skriver = "-"', 'Reader / Leser = "-"', 'Lobby = "-"', 'Sort = Descending / Synkende', 'Display = Numeric / Numerisk', 'Internal name = nova_swarm_global_score'],
      doNotClick: ['Do not delete, reset, or recreate the leaderboard', 'Do not change release/store state']
    },
    {
      label: 'Default branch build',
      page: 'Steamworks App Admin -> Nova Swarm (4765070) -> Builds',
      expected: [`Default branch points to diagnostics build ${EXPECTED_LATEST_BUILD_ID} or a newer diagnostics build`],
      doNotClick: ['Do not release/publish the app publicly', 'Do not change pricing or release date']
    },
    {
      label: 'Package entitlement',
      page: 'Steamworks App Admin -> Nova Swarm (4765070) -> All Associated Packages, DLC, Demos And Tools -> Dev Comp or Beta Testing package used by gaunziman/EvilEirik',
      expected: [`Package includes App ID ${APP_ID}`, `Package includes Windows Depot ID ${DEPOT_ID}`],
      doNotClick: ['Do not distribute keys publicly', 'Do not remove apps or depots from packages']
    },
    {
      label: 'Steam client license console',
      page: 'Launch Steam.exe -dev or -console, then run: licenses_for_app 4765070',
      expected: [`The package shown for the account includes depot ${DEPOT_ID}`],
      doNotClick: ['No store/release action needed for this check']
    }
  ];
}

const reports = latestReports();
const latestReport = reports[0] || null;
const latestSubmitReport = reports.find((entry) => entry.data?.submit || entry.data?.latestUploadDiagnostics) || null;
const latestSummary = summarizeProbeReport(latestReport);
const latestSubmitSummary = summarizeProbeReport(latestSubmitReport);
const steamInstall = findSteamInstall();
const localState = readLocalState();
const runtime = currentRuntimeEnv();
const interpretation = buildInterpretation(latestSubmitSummary || latestSummary, steamInstall);

const report = {
  generatedAt: now.toISOString(),
  expected: {
    appId: APP_ID,
    depotId: DEPOT_ID,
    leaderboardName: LEADERBOARD_NAME,
    writes: 'Client',
    writerUiValue: '-',
    readerUiValue: '-',
    sort: 'Descending',
    display: 'Numeric',
    defaultBranchBuildForCurrentTest: EXPECTED_LATEST_BUILD_ID
  },
  localState,
  runtime,
  steamInstall,
  latestProbeReport: latestSummary,
  latestSubmitProbeReport: latestSubmitSummary,
  recentProbeReports: reports.slice(0, 5).map(summarizeProbeReport),
  interpretation,
  manualChecks: manualChecks(),
  sourceNotes: [
    'Steam docs: UploadLeaderboardScore m_bSuccess=0 is documented for too many details or Trusted leaderboard write mode, but current screenshot evidence shows Writer/Skriver "-".',
    'Steam docs: UploadLeaderboardScore is limited to 10 uploads per 10 minutes and one outstanding call.',
    'Steam user stats readiness is now explicitly reported through requestCurrentStats/UserStatsReceived_t diagnostics.',
    'Steam docs: Dev Comp or testing packages control app/depot entitlement for unreleased testing.'
  ]
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('[steamworks-leaderboard-write-diagnose]');
console.log(`Report: ${rel(reportPath)}`);
console.log('');
console.log('Expected Steamworks values:');
console.log(`- App ID: ${APP_ID}`);
console.log(`- Depot ID: ${DEPOT_ID}`);
console.log(`- Leaderboard: ${LEADERBOARD_NAME}`);
console.log('- Writer / Skriver: "-"');
console.log('- Reader / Leser: "-"');
console.log('- Lobby: "-"');
console.log('- Sort: Descending');
console.log('- Display: Numeric');
console.log(`- Default branch build while testing: ${EXPECTED_LATEST_BUILD_ID} or newer diagnostics build`);
console.log('');
console.log('Local/installed state:');
console.log(`- Git HEAD: ${localState.git.head || 'unknown'} (${localState.git.branch || 'unknown branch'})`);
console.log(`- Local build: ${localState.buildVersion || 'unknown'}`);
console.log(`- VDF app/depot: ${localState.localVdf?.appId || 'missing'} / ${(localState.localVdf?.depotIds || []).join(', ') || 'missing'}`);
console.log(`- Steam manifest build: ${steamInstall?.manifest?.buildid || 'not found'}`);
console.log(`- Steam installed exe: ${steamInstall?.exePath || 'not found'}`);
console.log('');
console.log('Latest probe evidence:');
console.log(`- Report: ${latestSummary?.path || 'none found'}`);
console.log(`- Status: ${latestSummary?.status || 'unknown'}`);
console.log(`- Persona: ${latestSummary?.personaName || 'unknown'}`);
console.log(`- Launched by Steam hint: ${latestSummary?.launchedBySteamHint ?? 'unknown'}`);
console.log(`- Global read: ${latestSummary?.globalBefore?.ok ?? false} count=${latestSummary?.globalBefore?.count ?? 'n/a'}`);
console.log(`- Friends read: ${latestSummary?.friendsBefore?.ok ?? false} count=${latestSummary?.friendsBefore?.count ?? 'n/a'}`);
console.log(`- Submit status: ${latestSummary?.submit?.interpretedStatus || 'not tested'}`);
console.log(`- Raw m_bSuccess: ${latestSummary?.submit?.rawResult?.m_bSuccess ?? 'n/a'}`);
console.log(`- RequestCurrentStats ok: ${latestSummary?.submit?.requestCurrentStats?.ok ?? latestSummary?.requestCurrentStats?.ok ?? 'n/a'}`);
if (latestSubmitSummary && latestSubmitSummary.path !== latestSummary?.path) {
  console.log('');
  console.log('Latest submit evidence:');
  console.log(`- Report: ${latestSubmitSummary.path}`);
  console.log(`- Status: ${latestSubmitSummary.status || 'unknown'}`);
  console.log(`- Persona: ${latestSubmitSummary.personaName || 'unknown'}`);
  console.log(`- Launched by Steam hint: ${latestSubmitSummary.launchedBySteamHint ?? 'unknown'}`);
  console.log(`- Global read: ${latestSubmitSummary.globalBefore?.ok ?? false} count=${latestSubmitSummary.globalBefore?.count ?? 'n/a'}`);
  console.log(`- Friends read: ${latestSubmitSummary.friendsBefore?.ok ?? false} count=${latestSubmitSummary.friendsBefore?.count ?? 'n/a'}`);
  console.log(`- Submit status: ${latestSubmitSummary.submit?.interpretedStatus || 'not tested'}`);
  console.log(`- Raw m_bSuccess: ${latestSubmitSummary.submit?.rawResult?.m_bSuccess ?? 'n/a'}`);
  console.log(`- RequestCurrentStats ok: ${latestSubmitSummary.submit?.requestCurrentStats?.ok ?? latestSubmitSummary.requestCurrentStats?.ok ?? 'n/a'}`);
}
console.log('');
console.log('Interpretation:');
console.log(`- Read path verified: ${interpretation.readPathVerified}`);
console.log(`- Write path pending: ${interpretation.writePathPending}`);
console.log(`- Write rejected by Steam backend: ${interpretation.writeRejectedBySteamBackend}`);
console.log(`- Local SDK failure suspected: ${!interpretation.localSdkReady && latestSummary ? 'yes' : 'no'}`);
console.log(`- Most likely cause: ${interpretation.mostLikelyCause}`);
if (interpretation.remainingSuspects.length) {
  console.log('Remaining suspects:');
  for (const suspect of interpretation.remainingSuspects) console.log(`- ${suspect}`);
}
console.log('');
console.log('Minimum manual Steamworks checks, if still needed:');
for (const check of report.manualChecks) {
  console.log(`- ${check.label}: ${check.page}`);
  console.log(`  Expected: ${check.expected.join('; ')}`);
  console.log(`  Do not click: ${check.doNotClick.join('; ')}`);
}
