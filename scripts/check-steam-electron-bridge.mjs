import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {
  DEFAULT_STEAM_APP_ID,
  STEAM_LEADERBOARD_NAME,
  createSteamLeaderboardBridge
} = require('../electron/steamLeaderboardBridge.cjs');

function createFakeSteamNative({ initResult = true, uploadResult = null, rawUploadResult = null } = {}) {
  const calls = [];
  const fakeSteam = {
    calls,
    setSdkPath(value) {
      calls.push(['setSdkPath', value]);
    },
    init(options) {
      calls.push(['init', options]);
      return initResult;
    },
    runCallbacks() {
      calls.push(['runCallbacks']);
    },
    shutdown() {
      calls.push(['shutdown']);
    },
    getStatus() {
      return { steamId: '76561198000000001' };
    },
    friends: {
      getPersonaName() {
        return 'Steam Native Ace';
      },
      getFriendPersonaName(steamId) {
        return String(steamId) === '76561198000000002' ? 'Orbit Friend' : null;
      }
    },
    user: {
      isLoggedOn() {
        return true;
      }
    },
    leaderboards: {
      libraryLoader: {
        SteamAPI_ISteamUserStats_UploadLeaderboardScore(userStatsInterface, handle, method, score, detailsPtr, detailsCount) {
          calls.push(['rawUploadScore', Boolean(userStatsInterface), handle.toString(), method, score, Boolean(detailsPtr), detailsCount]);
          return BigInt(77);
        }
      },
      apiCore: {
        isInitialized() {
          return true;
        },
        getUserStatsInterface() {
          return { fake: 'userStats' };
        },
        getUtilsInterface() {
          return { fake: 'utils' };
        },
        runCallbacks() {
          calls.push(['apiCore.runCallbacks']);
        }
      },
      callbackPoller: {
        async poll(callHandle, _resultStruct, callbackId) {
          calls.push(['callbackPoller.poll', callHandle.toString(), callbackId]);
          return rawUploadResult || {
            m_bSuccess: 1,
            m_hSteamLeaderboard: BigInt(55),
            m_nScore: 55555,
            m_bScoreChanged: 1,
            m_nGlobalRankNew: 3,
            m_nGlobalRankPrevious: 7
          };
        }
      },
      async findLeaderboard(name) {
        calls.push(['findLeaderboard', name]);
        return { handle: BigInt(55), name, entryCount: 2 };
      },
      async downloadLeaderboardEntries(handle, request, start, end) {
        calls.push(['downloadLeaderboardEntries', handle.toString(), request, start, end]);
        return [
          {
            steamId: '76561198000000001',
            globalRank: 1,
            score: 44000,
            level: 1,
            levelReached: 1,
            details: '0x0800000003000000f0000000780000000200000013000000'
          },
          {
            steamId: '76561198000000002',
            globalRank: 2,
            score: 32000,
            details: [6, 1, 190, 80, 1, 12]
          }
        ];
      },
      async uploadScore(handle, score, method, details) {
        calls.push(['uploadScore', handle.toString(), score, method, details]);
        return uploadResult || {
          success: true,
          scoreChanged: true,
          globalRankNew: 3,
          globalRankPrevious: 7,
          score
        };
      }
    }
  };

  return {
    LeaderboardSortMethod: { Ascending: 1, Descending: 2 },
    LeaderboardDisplayType: { Numeric: 1, TimeSeconds: 2, TimeMilliseconds: 3 },
    LeaderboardUploadScoreMethod: { KeepBest: 1, ForceUpdate: 2 },
    LeaderboardDataRequest: { Global: 0, GlobalAroundUser: 1, Friends: 2, Users: 3 },
    SteamworksSDK: {
      getInstance() {
        return fakeSteam;
      }
    },
    fakeSteam
  };
}

async function checkUnavailableWithoutNative() {
  const bridge = createSteamLeaderboardBridge({
    allowNativeLoad: false,
    appId: 480,
    rootDir: process.cwd()
  });
  assert.equal(await bridge.isAvailable(), false);
  assert.equal(bridge.getStatus().available, false);
  assert.equal(bridge.getStatus().reason, 'steamworks-ffi-node_not_installed');
  bridge.shutdown();
}

function checkDefaultNovaSteamAppId() {
  const bridge = createSteamLeaderboardBridge({
    allowNativeLoad: false,
    rootDir: process.cwd()
  });
  assert.equal(DEFAULT_STEAM_APP_ID, 4765070);
  assert.equal(bridge.getStatus().appId, 4765070, 'Nova Swarm Steam packages must default to the real app id');
  assert.equal(bridge.getStatus().leaderboardName, 'nova_swarm_global_score_v2');
  bridge.shutdown();
}

async function checkMissingAppIdDoesNotInitNative() {
  const nativeModule = createFakeSteamNative();
  const bridge = createSteamLeaderboardBridge({
    nativeModule,
    appId: '',
    rootDir: process.cwd()
  });
  assert.equal(await bridge.isAvailable(), false);
  assert.equal(bridge.getStatus().reason, 'steam_app_id_missing');
  assert.equal(nativeModule.fakeSteam.calls.some(call => call[0] === 'init'), false, 'native Steam init must not run without an app id');
  bridge.shutdown();
}

async function checkNativeBridgeHappyPath() {
  const nativeModule = createFakeSteamNative();
  const bridge = createSteamLeaderboardBridge({
    nativeModule,
    appId: 480,
    sdkPath: 'steamworks_sdk',
    rootDir: process.cwd(),
    logger: { warn() {}, error() {} }
  });

  assert.equal(await bridge.isAvailable(), true);
  assert.equal(await bridge.getPersonaName(), 'Steam Native Ace');

  const globalScores = await bridge.getTopScores({
    leaderboardName: STEAM_LEADERBOARD_NAME,
    request: 'global',
    start: 1,
    end: 2,
    limit: 2
  });
  assert.equal(globalScores.length, 2);
  assert.equal(globalScores[0].playerName, 'Steam Native Ace');
  assert.equal(globalScores[0].isCurrentPlayer, true);
  assert.equal(globalScores[0].metadata.levelReached, 8);
  assert.equal(globalScores[0].level, 8, 'Steam hex details must override stale LV1 fields');

  const friendsScores = await bridge.getFriendsScores({
    leaderboardName: STEAM_LEADERBOARD_NAME,
    request: 'friends',
    limit: 20
  });
  assert.equal(friendsScores[1].playerName, 'Orbit Friend');
  assert.equal(friendsScores[1].source, 'steam-friends');

  const submit = await bridge.submitScore({
    leaderboardName: STEAM_LEADERBOARD_NAME,
    score: 55555,
    details: [9, 2, 333, 140, 3, 22],
    uploadMethod: 'keep_best'
  });
  assert.equal(submit.success, true);
  assert.equal(submit.rank, 3);
  assert.deepEqual(submit.details, [9, 2, 333, 140, 3, 22]);
  assert.equal(submit.diagnostics.nativeMethodName, 'SteamAPI_ISteamUserStats_UploadLeaderboardScore');
  assert.equal(submit.diagnostics.selectedUploadPath, 'raw_sdk_diagnostic');
  assert.equal(submit.diagnostics.uploadMethod.key, 'KeepBest');
  assert.equal(submit.diagnostics.uploadMethod.value, 1);
  assert.ok(submit.requestCurrentStats);
  assert.equal(submit.interpretedStatus, 'accepted');

  const uploadCall = nativeModule.fakeSteam.calls.find(call => call[0] === 'rawUploadScore');
  assert.equal(uploadCall[3], 1, 'Steam native upload should use KeepBest');
  assert.equal(uploadCall[4], 55555, 'Steam native upload should pass score after method');
  assert.equal(uploadCall[6], 6, 'Steam native upload should include details count');
  assert.equal(bridge.getLastUploadDiagnostics().success, true);
  bridge.shutdown();
}

async function checkRawUploadFailureDiagnostics() {
  const nativeModule = createFakeSteamNative({
    rawUploadResult: {
      m_bSuccess: 0,
      m_hSteamLeaderboard: BigInt(55),
      m_nScore: 1,
      m_bScoreChanged: 0,
      m_nGlobalRankNew: 0,
      m_nGlobalRankPrevious: 0
    }
  });
  const bridge = createSteamLeaderboardBridge({
    nativeModule,
    appId: 480,
    sdkPath: 'steamworks_sdk',
    rootDir: process.cwd(),
    logger: { warn() {}, error() {} }
  });

  const submit = await bridge.submitScoreDetailed({
    leaderboardName: STEAM_LEADERBOARD_NAME,
    score: 1,
    uploadMethod: 'keep_best'
  });
  assert.equal(submit.success, false);
  assert.equal(submit.interpretedStatus, 'steam_backend_rejected_unknown_reason');
  assert.match(submit.nativeErrorMessage, /Steam accepted the UploadLeaderboardScore call/);
  assert.equal(submit.diagnostics.selectedUploadPath, 'raw_sdk_diagnostic');
  assert.equal(submit.diagnostics.detailsMode, 'omitted');
  assert.equal(submit.rawResult.m_bSuccess, 0);
  assert.equal(bridge.getLastUploadDiagnostics().rawResult.m_bSuccess, 0);
  bridge.shutdown();
}

async function checkUploadInFlightGuard() {
  const nativeModule = createFakeSteamNative();
  const originalPoll = nativeModule.fakeSteam.leaderboards.callbackPoller.poll;
  nativeModule.fakeSteam.leaderboards.callbackPoller.poll = async (...args) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return originalPoll(...args);
  };
  const bridge = createSteamLeaderboardBridge({
    nativeModule,
    appId: 480,
    sdkPath: 'steamworks_sdk',
    rootDir: process.cwd(),
    logger: { warn() {}, error() {} }
  });

  const first = bridge.submitScoreDetailed({
    leaderboardName: STEAM_LEADERBOARD_NAME,
    score: 100,
    uploadMethod: 'keep_best'
  });
  const second = await bridge.submitScoreDetailed({
    leaderboardName: STEAM_LEADERBOARD_NAME,
    score: 101,
    uploadMethod: 'keep_best'
  });
  assert.equal(second.success, false);
  assert.equal(second.interpretedStatus, 'upload_already_in_flight');
  assert.equal(nativeModule.fakeSteam.calls.filter(call => call[0] === 'rawUploadScore').length, 0);
  await first;
  assert.equal(nativeModule.fakeSteam.calls.filter(call => call[0] === 'rawUploadScore').length, 1);
  bridge.shutdown();
}

function checkPreloadSurface() {
  const preload = readFileSync(path.resolve('electron/preload.cjs'), 'utf8');
  assert.match(preload, /contextBridge\.exposeInMainWorld\('__novaSteamLeaderboard'/);
  assert.match(preload, /contextBridge\.exposeInMainWorld\('__novaDisplay'/);
  assert.match(preload, /contextBridge\.exposeInMainWorld\('__novaPerformanceDiagnostics'/);
  assert.match(preload, /contextBridge\.exposeInMainWorld\('__novaApp'/);
  assert.doesNotMatch(preload, /fs\.|child_process|shell|process\.env/);
  for (const method of ['isAvailable', 'getPersonaName', 'getTopScores', 'getFriendsScores', 'submitScore', 'submitScoreDetailed', 'requestCurrentStats', 'getLastUploadDiagnostics', 'getRuntimeInfo']) {
    assert.match(preload, new RegExp(`${method}:`));
  }
  for (const method of ['getSettings', 'getInfo', 'applySettings']) {
    assert.match(preload, new RegExp(`${method}:`));
  }
  assert.match(preload, /writeReport:/);
  assert.match(preload, /saveSignalCard:/);
  assert.match(preload, /copyText:/);
}

function checkDailySignalCardIpcGuard() {
  const main = readFileSync(path.resolve('electron/main.cjs'), 'utf8');
  assert.match(main, /nova-app:saveSignalCard/);
  assert.match(main, /MAX_SIGNAL_CARD_BYTES/);
  assert.match(main, /invalid_png_signature/);
  assert.match(main, /sanitizeSignalCardFilename/);
  assert.match(main, /showSaveDialog/);
  assert.match(main, /nova-app:copyText/);
  assert.match(main, /text\.length > 4096/);
}

function checkNoRendererNativeImport() {
  const files = [
    'src/leaderboard/SteamLeaderboardProvider.js',
    'src/leaderboard/LeaderboardAdapter.js',
    'src/scenes/HighscoreScene.js',
    'src/scenes/GameOverScene.js'
  ];
  for (const file of files) {
    const text = readFileSync(path.resolve(file), 'utf8');
    assert.doesNotMatch(text, /steamworks-ffi-node|require\(['"]steamworks|from ['"]steamworks/);
  }
}

function checkFreshProfileSteamIsolationGuard() {
  const main = readFileSync(path.resolve('electron/main.cjs'), 'utf8');
  assert.match(main, /const isFreshProfile =/);
  assert.match(main, /FRESH_PROFILE_STEAM_REASON = 'fresh_profile_isolated'/);
  assert.match(main, /function getFreshProfileSteamStatus/);
  assert.match(main, /function getFreshProfileSteamResult/);
  assert.match(main, /function registerSteamLeaderboardIpc\(\) \{\s+if \(isFreshProfile\)/);
  assert.match(main, /function registerSteamAchievementsIpc\(\) \{\s+if \(isFreshProfile\)/);
  assert.match(main, /steamIntegrationIsolated: isFreshProfile/);
}

await checkUnavailableWithoutNative();
checkDefaultNovaSteamAppId();
await checkMissingAppIdDoesNotInitNative();
await checkNativeBridgeHappyPath();
await checkRawUploadFailureDiagnostics();
await checkUploadInFlightGuard();
checkPreloadSurface();
checkDailySignalCardIpcGuard();
checkNoRendererNativeImport();
checkFreshProfileSteamIsolationGuard();

console.log('[steam-electron-bridge] PASS native bridge contract, preload surface, renderer isolation');
