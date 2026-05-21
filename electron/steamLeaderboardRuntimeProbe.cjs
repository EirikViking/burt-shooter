const fs = require('node:fs');
const path = require('node:path');

const STEAM_LEADERBOARD_NAME = 'nova_swarm_global_score';
const TEST_SCORE = 1;
const TEST_DETAILS = [1, 0, 1, 0, 0, 0];
const DETAILS_MODES = new Set(['basic', 'none', 'empty']);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function readArgValue(args, name, fallback = null) {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  return fallback;
}

function parseSteamLeaderboardProbeOptions(args) {
  if (args.includes('--force-update')) {
    throw new Error('The Electron Steam leaderboard probe does not support --force-update.');
  }
  const score = Math.max(0, Math.min(2147483647, Math.floor(Number(readArgValue(args, '--score', TEST_SCORE)) || TEST_SCORE)));
  const detailsMode = String(readArgValue(args, '--details', 'basic')).toLowerCase();
  if (!DETAILS_MODES.has(detailsMode)) {
    throw new Error(`Unsupported --details mode "${detailsMode}". Use basic, none, or empty.`);
  }
  return {
    submit: !args.includes('--no-submit') || args.includes('--submit'),
    score,
    detailsMode,
    uploadMethod: 'keep_best'
  };
}

function detailsForMode(mode) {
  if (mode === 'none') return undefined;
  if (mode === 'empty') return [];
  return [...TEST_DETAILS];
}

function waitForLoad(window) {
  if (!window.webContents.isLoadingMainFrame()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Steam leaderboard probe load timeout')), 20000);
    window.webContents.once('did-finish-load', () => {
      clearTimeout(timeout);
      resolve();
    });
    window.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
      clearTimeout(timeout);
      reject(new Error(`Steam leaderboard probe failed to load: ${errorCode} ${errorDescription}`));
    });
  });
}

function publicSummary(report) {
  return {
    status: report.status,
    report: report.reportPath,
    runtime: report.runtimeInfo,
    bridgePresent: report.bridgePresent,
    bridgeStatus: report.bridgeStatus,
    personaName: report.personaName,
    globalBefore: compactRead(report.globalBefore),
    friendsBefore: compactRead(report.friendsBefore),
    submit: report.submit ? compactSubmit(report.submit) : null,
    latestUploadDiagnostics: report.latestUploadDiagnostics || null,
    globalAfter: compactRead(report.globalAfter),
    friendsAfter: compactRead(report.friendsAfter),
    currentPlayerObservedAfterSubmit: report.currentPlayerObservedAfterSubmit || false,
    warnings: report.warnings || []
  };
}

function compactRead(step) {
  if (!step) return null;
  if (!step.ok) return { ok: false, error: step.error };
  return { ok: true, count: step.count };
}

function compactSubmit(step) {
  if (!step) return null;
  if (!step.ok) return { ok: false, error: step.error };
  return {
    ok: true,
    success: Boolean(step.success),
    accepted: Boolean(step.accepted),
    interpretedStatus: step.interpretedStatus || null,
    nativeErrorMessage: step.nativeErrorMessage || null,
    score: step.score ?? null,
    scoreChanged: step.scoreChanged ?? null,
    rank: step.rank ?? null
  };
}

function deriveProcessExitCode(report, options) {
  if (!report.bridgePresent) return 1;
  if (!report.available) return 1;
  if (!report.globalBefore?.ok && !report.friendsBefore?.ok) return 1;
  if (options.submit && !report.submit?.success) return 1;
  return 0;
}

async function runSteamLeaderboardRuntimeProbe({ window, args, baseUrl, runtimeInfo = {}, outputDir, outputRoot }) {
  const options = parseSteamLeaderboardProbeOptions(args || []);
  const selectedDetails = detailsForMode(options.detailsMode);
  const rootDir = outputRoot || process.cwd();
  const reportDir = path.resolve(
    outputDir ||
    process.env.NOVA_SWARM_STEAM_LEADERBOARD_PROBE_OUTPUT_DIR ||
    path.join(rootDir, 'test-results', `steam-leaderboard-electron-${timestamp()}`)
  );
  const reportPath = path.join(reportDir, 'report.json');
  fs.mkdirSync(reportDir, { recursive: true });

  const consoleEvents = [];
  window.webContents.on('console-message', (_event, level, message) => {
    const text = String(message);
    if (text.includes('Electron Security Warning') && text.includes('will not show up')) return;
    if (level >= 2) consoleEvents.push({ level, message: text.slice(0, 500) });
  });

  await waitForLoad(window);
  await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');

  const rendererReport = await window.webContents.executeJavaScript(`
    (async () => {
      const leaderboardName = ${JSON.stringify(STEAM_LEADERBOARD_NAME)};
      const options = ${JSON.stringify(options)};
      const selectedDetails = ${JSON.stringify(selectedDetails ?? null)};
      const hasDetails = ${JSON.stringify(selectedDetails !== undefined)};

      function errorSummary(error) {
        return {
          message: error?.message || String(error),
          name: error?.name || 'Error',
          steamUpload: error?.steamUpload || null
        };
      }

      function steamIdSuffix(steamId) {
        const text = String(steamId || '');
        return text ? text.slice(-4) : null;
      }

      function sanitizeEntry(entry = {}) {
        return {
          rank: entry.rank ?? entry.globalRank ?? null,
          playerName: entry.playerName || null,
          score: entry.score ?? null,
          levelReached: entry.levelReached ?? entry.level ?? entry.metadata?.levelReached ?? null,
          shipId: entry.shipId ?? entry.metadata?.shipId ?? null,
          runTimeSeconds: entry.runTimeSeconds ?? entry.metadata?.runTimeSeconds ?? null,
          kills: entry.kills ?? entry.metadata?.kills ?? null,
          bossKills: entry.bossKills ?? entry.metadata?.bossKills ?? null,
          wavesCleared: entry.wavesCleared ?? entry.metadata?.wavesCleared ?? null,
          source: entry.source || null,
          isCurrentPlayer: Boolean(entry.isCurrentPlayer),
          steamIdSuffix: steamIdSuffix(entry.steamId)
        };
      }

      function sanitizeEntries(entries, count = 5) {
        return Array.isArray(entries) ? entries.slice(0, count).map(sanitizeEntry) : [];
      }

      async function runStep(operation) {
        const startedAt = Date.now();
        try {
          const value = await operation();
          return { ok: true, durationMs: Date.now() - startedAt, value };
        } catch (error) {
          return { ok: false, durationMs: Date.now() - startedAt, error: errorSummary(error) };
        }
      }

      function publicReadStep(step) {
        if (!step.ok) return { ok: false, durationMs: step.durationMs, error: step.error };
        const entries = Array.isArray(step.value) ? step.value : [];
        return {
          ok: true,
          durationMs: step.durationMs,
          count: entries.length,
          entries: sanitizeEntries(entries)
        };
      }

      function publicSubmitStep(step) {
        if (!step.ok) return {
          ok: false,
          success: false,
          callCompleted: false,
          durationMs: step.durationMs,
          error: step.error
        };
        const value = step.value || {};
        return {
          ok: true,
          success: Boolean(value.success),
          accepted: Boolean(value.accepted),
          callCompleted: true,
          durationMs: step.durationMs,
          interpretedStatus: value.interpretedStatus || null,
          nativeErrorMessage: value.nativeErrorMessage || null,
          score: value.score ?? null,
          rank: value.rank ?? value.globalRank ?? null,
          previousRank: value.previousRank ?? null,
          scoreChanged: value.scoreChanged ?? null,
          details: value.details ?? [],
          diagnostics: value.diagnostics || null,
          rawResult: value.rawResult || null
        };
      }

      function findCurrentPlayerEntry(...entrySets) {
        for (const entries of entrySets) {
          const match = Array.isArray(entries) ? entries.find(entry => entry?.isCurrentPlayer) : null;
          if (match) return match;
        }
        return null;
      }

      function deriveStatus(report) {
        if (!report.bridgePresent) return 'preload_bridge_missing';
        if (!report.available) return 'bridge_unavailable';
        if (!report.globalBefore?.ok && !report.friendsBefore?.ok) return 'leaderboard_download_failed';
        if (!report.submit) return 'read_probe_completed_without_submit';
        if (!report.submit.callCompleted) return 'submit_call_failed';
        if (!report.submit.success) return report.submit.interpretedStatus || 'submit_failed';
        if (report.currentPlayerObservedAfterSubmit) return 'read_write_verified_current_player_observed';
        return 'submit_succeeded_entry_not_observed';
      }

      const api = window.__novaSteamLeaderboard;
      const bridge = window.__novaSteamBridge;
      const report = {
        status: 'pending',
        leaderboardName,
        options,
        testSubmission: {
          enabled: options.submit,
          score: options.score,
          detailsMode: options.detailsMode,
          details: hasDetails ? selectedDetails : null,
          uploadMethod: options.uploadMethod,
          note: 'Electron/preload/IPC path probe. Uses keep-best only and never force-updates.'
        },
        bridgePresent: Boolean(api),
        secondaryBridgePresent: Boolean(bridge?.leaderboards),
        warnings: []
      };

      if (!api) {
        report.status = deriveStatus(report);
        return report;
      }

      report.initialBridgeStatus = bridge?.getStatus ? await bridge.getStatus().catch(error => ({ error: errorSummary(error) })) : null;
      report.available = await api.isAvailable().catch(() => false);
      report.bridgeStatus = bridge?.getStatus ? await bridge.getStatus().catch(error => ({ error: errorSummary(error) })) : null;
      report.personaName = report.available ? await api.getPersonaName().catch(() => null) : null;

      if (report.available) {
        const globalBeforeStep = await runStep(() => api.getTopScores({
          leaderboardName,
          request: 'global',
          start: 1,
          end: 10,
          limit: 10
        }));
        const globalBeforeEntries = globalBeforeStep.ok ? globalBeforeStep.value : [];
        report.globalBefore = publicReadStep(globalBeforeStep);

        const friendsBeforeStep = await runStep(() => api.getFriendsScores({
          leaderboardName,
          request: 'friends',
          limit: 10
        }));
        const friendsBeforeEntries = friendsBeforeStep.ok ? friendsBeforeStep.value : [];
        report.friendsBefore = publicReadStep(friendsBeforeStep);

        report.openLeaderboard = {
          ok: Boolean(report.globalBefore?.ok || report.friendsBefore?.ok),
          mode: 'implicit_via_download',
          handlePresent: null
        };

        if (options.submit && report.openLeaderboard.ok) {
          const payload = {
            leaderboardName,
            score: options.score,
            uploadMethod: options.uploadMethod
          };
          if (hasDetails) payload.details = selectedDetails;
          const submitter = api.submitScoreDetailed || bridge?.leaderboards?.submitScoreDetailed || api.submitScore;
          const submitStep = await runStep(() => submitter(payload));
          report.submit = publicSubmitStep(submitStep);
          report.latestUploadDiagnostics = bridge?.leaderboards?.getLastUploadDiagnostics
            ? await bridge.leaderboards.getLastUploadDiagnostics().catch(() => null)
            : null;

          const globalAfterStep = await runStep(() => api.getTopScores({
            leaderboardName,
            request: 'global',
            start: 1,
            end: 10,
            limit: 10
          }));
          const globalAfterEntries = globalAfterStep.ok ? globalAfterStep.value : [];
          report.globalAfter = publicReadStep(globalAfterStep);

          const friendsAfterStep = await runStep(() => api.getFriendsScores({
            leaderboardName,
            request: 'friends',
            limit: 10
          }));
          const friendsAfterEntries = friendsAfterStep.ok ? friendsAfterStep.value : [];
          report.friendsAfter = publicReadStep(friendsAfterStep);

          const currentPlayerEntry = findCurrentPlayerEntry(globalAfterEntries, friendsAfterEntries);
          report.currentPlayerObservedAfterSubmit = Boolean(currentPlayerEntry);
          report.currentPlayerEntry = currentPlayerEntry ? sanitizeEntry(currentPlayerEntry) : null;
        } else {
          report.submit = null;
          report.currentPlayerObservedAfterSubmit = findCurrentPlayerEntry(globalBeforeEntries, friendsBeforeEntries) ? true : false;
        }

        if (!report.globalBefore?.ok && report.friendsBefore?.ok) {
          report.warnings.push('Friends download worked while global download failed. Check Steamworks Reader/visibility.');
        }
        if (report.globalBefore?.ok && !report.friendsBefore?.ok) {
          report.warnings.push('Global download worked while friends download failed. Check account/friends visibility.');
        }
      }

      report.status = deriveStatus(report);
      return report;
    })()
  `, true);

  const report = {
    ...rendererReport,
    reportPath,
    outputDir: reportDir,
    baseUrl,
    runtimeInfo,
    consoleEvents
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(publicSummary(report), null, 2));
  process.exitCode = deriveProcessExitCode(report, options);
  return report;
}

module.exports = {
  parseSteamLeaderboardProbeOptions,
  runSteamLeaderboardRuntimeProbe
};
