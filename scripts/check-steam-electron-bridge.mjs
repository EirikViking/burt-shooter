import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {
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
            details: [8, 3, 240, 120, 2, 19]
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
  assert.equal(submit.interpretedStatus, 'steam_callback_m_bSuccess_false');
  assert.equal(submit.diagnostics.selectedUploadPath, 'raw_sdk_diagnostic');
  assert.equal(submit.diagnostics.detailsMode, 'omitted');
  assert.equal(submit.rawResult.m_bSuccess, 0);
  assert.equal(bridge.getLastUploadDiagnostics().rawResult.m_bSuccess, 0);
  bridge.shutdown();
}

function checkPreloadSurface() {
  const preload = readFileSync(path.resolve('electron/preload.cjs'), 'utf8');
  assert.match(preload, /contextBridge\.exposeInMainWorld\('__novaSteamLeaderboard'/);
  assert.doesNotMatch(preload, /fs\.|child_process|shell|process\.env/);
  for (const method of ['isAvailable', 'getPersonaName', 'getTopScores', 'getFriendsScores', 'submitScore', 'submitScoreDetailed', 'getLastUploadDiagnostics']) {
    assert.match(preload, new RegExp(`${method}:`));
  }
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

await checkUnavailableWithoutNative();
await checkMissingAppIdDoesNotInitNative();
await checkNativeBridgeHappyPath();
await checkRawUploadFailureDiagnostics();
checkPreloadSurface();
checkNoRendererNativeImport();

console.log('[steam-electron-bridge] PASS native bridge contract, preload surface, renderer isolation');
