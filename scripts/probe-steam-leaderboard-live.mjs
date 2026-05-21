import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {
  STEAM_LEADERBOARD_NAME,
  createSteamLeaderboardBridge
} = require('../electron/steamLeaderboardBridge.cjs');

const root = process.cwd();
const outputDir = path.resolve(root, 'test-results', `steam-leaderboard-live-${timestamp()}`);
const TEST_SCORE = 1;
const TEST_DETAILS = [1, 0, 1, 0, 0, 0];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function jsonSafe(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [key, jsonSafe(entryValue)]));
  }
  return value;
}

function errorSummary(error) {
  return {
    message: error?.message || String(error),
    name: error?.name || 'Error'
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

async function runStep(name, operation) {
  const startedAt = Date.now();
  try {
    const value = await operation();
    return {
      ok: true,
      durationMs: Date.now() - startedAt,
      value
    };
  } catch (error) {
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      error: errorSummary(error)
    };
  }
}

function publicStep(step, mapper = value => value) {
  if (!step) return null;
  if (!step.ok) {
    return {
      ok: false,
      durationMs: step.durationMs,
      error: step.error
    };
  }
  return {
    ok: true,
    durationMs: step.durationMs,
    ...mapper(step.value)
  };
}

function findCurrentPlayerEntry(...entrySets) {
  for (const entries of entrySets) {
    const match = Array.isArray(entries) ? entries.find(entry => entry?.isCurrentPlayer) : null;
    if (match) return match;
  }
  return null;
}

function likelyUnavailableCauses(status) {
  const causes = [
    'Steam client is not running or the account is not logged in',
    'Nova Swarm is not launched in a Steam runtime that can access this app',
    'Steam App ID is missing or invalid',
    'Steamworks SDK redistributables or steamworks-ffi-node are missing',
    'The Steam account does not have access to App ID 4765070',
    'The Steamworks leaderboard is not accessible to the current app/account yet'
  ];
  if (status?.reason) causes.unshift(`Bridge reason: ${status.reason}`);
  return causes;
}

function deriveFinalStatus(report) {
  if (!report.available) return 'bridge_unavailable';
  if (!report.openLeaderboard?.ok) return 'leaderboard_open_failed';
  const globalFailedFriendsWorked = !report.globalBefore?.ok && report.friendsBefore?.ok;
  const friendsFailedGlobalWorked = report.globalBefore?.ok && !report.friendsBefore?.ok;
  if (!report.submit) {
    if (globalFailedFriendsWorked) return 'global_failed_friends_worked';
    if (friendsFailedGlobalWorked) return 'friends_failed_global_worked';
    return 'read_probe_completed_without_submit';
  }
  if (!report.submit?.ok) return 'submit_failed';
  if (!report.globalAfter?.ok && !report.friendsAfter?.ok) return 'submit_succeeded_post_download_failed';
  if (report.currentPlayerObservedAfterSubmit) {
    if (globalFailedFriendsWorked) return 'read_write_verified_current_player_observed_global_failed_friends_worked';
    if (friendsFailedGlobalWorked) return 'read_write_verified_current_player_observed_friends_failed_global_worked';
    return 'read_write_verified_current_player_observed';
  }
  if (globalFailedFriendsWorked) return 'submit_succeeded_entry_not_observed_global_failed_friends_worked';
  if (friendsFailedGlobalWorked) return 'submit_succeeded_entry_not_observed_friends_failed_global_worked';
  return 'submit_succeeded_entry_not_observed';
}

const bridge = createSteamLeaderboardBridge({
  rootDir: root,
  logger: console
});

mkdirSync(outputDir, { recursive: true });

const report = {
  status: 'pending',
  leaderboardName: STEAM_LEADERBOARD_NAME,
  outputDir,
  testSubmission: {
    score: TEST_SCORE,
    details: TEST_DETAILS,
    uploadMethod: 'keep_best',
    note: 'One deliberately low nonzero keep-best probe score. This does not force-overwrite better existing scores.'
  },
  warnings: []
};

try {
  report.initialBridgeStatus = jsonSafe(bridge.getStatus());
  report.available = await bridge.isAvailable();
  report.bridgeStatus = jsonSafe(bridge.getStatus());
  report.personaName = report.available ? await bridge.getPersonaName() : null;

  if (!report.available) {
    report.unavailableLikelyCauses = likelyUnavailableCauses(report.bridgeStatus);
    report.status = deriveFinalStatus(report);
    process.exitCode = 1;
  } else {
    const openStep = await runStep('openLeaderboard', () => bridge.getLeaderboard(STEAM_LEADERBOARD_NAME));
    report.openLeaderboard = publicStep(openStep, value => ({
      leaderboardName: value?.name || STEAM_LEADERBOARD_NAME,
      handlePresent: Boolean(value?.handle),
      entryCount: value?.entryCount ?? null
    }));

    const globalBeforeStep = await runStep('globalBefore', () => bridge.getTopScores({
      leaderboardName: STEAM_LEADERBOARD_NAME,
      request: 'global',
      start: 1,
      end: 10,
      limit: 10
    }));
    report.globalBefore = publicStep(globalBeforeStep, entries => ({
      count: Array.isArray(entries) ? entries.length : 0,
      entries: sanitizeEntries(entries)
    }));

    const friendsBeforeStep = await runStep('friendsBefore', () => bridge.getFriendsScores({
      leaderboardName: STEAM_LEADERBOARD_NAME,
      request: 'friends',
      limit: 10
    }));
    report.friendsBefore = publicStep(friendsBeforeStep, entries => ({
      count: Array.isArray(entries) ? entries.length : 0,
      entries: sanitizeEntries(entries)
    }));

    if (report.openLeaderboard?.ok) {
      const submitStep = await runStep('submit', () => bridge.submitScore({
        leaderboardName: STEAM_LEADERBOARD_NAME,
        score: TEST_SCORE,
        details: TEST_DETAILS,
        uploadMethod: 'keep_best'
      }));
      report.submit = publicStep(submitStep, value => ({
        success: Boolean(value?.success),
        score: value?.score ?? TEST_SCORE,
        rank: value?.rank ?? value?.globalRank ?? null,
        previousRank: value?.previousRank ?? null,
        scoreChanged: value?.scoreChanged ?? null,
        details: value?.details ?? TEST_DETAILS
      }));

      const globalAfterStep = await runStep('globalAfter', () => bridge.getTopScores({
        leaderboardName: STEAM_LEADERBOARD_NAME,
        request: 'global',
        start: 1,
        end: 10,
        limit: 10
      }));
      const globalAfterEntries = globalAfterStep.ok ? globalAfterStep.value : [];
      report.globalAfter = publicStep(globalAfterStep, entries => ({
        count: Array.isArray(entries) ? entries.length : 0,
        entries: sanitizeEntries(entries)
      }));

      const friendsAfterStep = await runStep('friendsAfter', () => bridge.getFriendsScores({
        leaderboardName: STEAM_LEADERBOARD_NAME,
        request: 'friends',
        limit: 10
      }));
      const friendsAfterEntries = friendsAfterStep.ok ? friendsAfterStep.value : [];
      report.friendsAfter = publicStep(friendsAfterStep, entries => ({
        count: Array.isArray(entries) ? entries.length : 0,
        entries: sanitizeEntries(entries)
      }));

      const currentPlayerEntry = findCurrentPlayerEntry(globalAfterEntries, friendsAfterEntries);
      report.currentPlayerObservedAfterSubmit = Boolean(currentPlayerEntry);
      report.currentPlayerEntry = currentPlayerEntry ? sanitizeEntry(currentPlayerEntry) : null;
    }

    if (!report.globalBefore?.ok && report.friendsBefore?.ok) {
      report.warnings.push('Friends download worked while global download failed. Steamworks Reader/visibility may be limiting global reads.');
    }
    if (report.globalBefore?.ok && !report.friendsBefore?.ok) {
      report.warnings.push('Global download worked while friends download failed. Check friends visibility/account data before changing leaderboard setup.');
    }

    report.status = deriveFinalStatus(report);
    const readOk = Boolean(report.globalBefore?.ok || report.friendsBefore?.ok || report.globalAfter?.ok || report.friendsAfter?.ok);
    const submitOk = Boolean(report.submit?.ok && report.submit?.success);
    process.exitCode = report.openLeaderboard?.ok && readOk && submitOk ? 0 : 1;
  }
} finally {
  bridge.shutdown();
  report.finalBridgeStatus = jsonSafe(bridge.getStatus());
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    status: report.status,
    report: path.join(outputDir, 'report.json'),
    bridgeStatus: report.bridgeStatus,
    personaName: report.personaName,
    openLeaderboard: report.openLeaderboard,
    globalBefore: report.globalBefore ? {
      ok: report.globalBefore.ok,
      count: report.globalBefore.count,
      error: report.globalBefore.error || null
    } : null,
    friendsBefore: report.friendsBefore ? {
      ok: report.friendsBefore.ok,
      count: report.friendsBefore.count,
      error: report.friendsBefore.error || null
    } : null,
    submit: report.submit,
    globalAfter: report.globalAfter ? {
      ok: report.globalAfter.ok,
      count: report.globalAfter.count,
      error: report.globalAfter.error || null
    } : null,
    friendsAfter: report.friendsAfter ? {
      ok: report.friendsAfter.ok,
      count: report.friendsAfter.count,
      error: report.friendsAfter.error || null
    } : null,
    currentPlayerObservedAfterSubmit: report.currentPlayerObservedAfterSubmit || false,
    warnings: report.warnings
  }, null, 2));
}
