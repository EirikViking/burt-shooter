const { contextBridge, ipcRenderer } = require('electron');

const CHANNELS = {
  isAvailable: 'nova-steam-leaderboard:isAvailable',
  getPersonaName: 'nova-steam-leaderboard:getPersonaName',
  getTopScores: 'nova-steam-leaderboard:getTopScores',
  getFriendsScores: 'nova-steam-leaderboard:getFriendsScores',
  submitScore: 'nova-steam-leaderboard:submitScore',
  submitScoreDetailed: 'nova-steam-leaderboard:submitScoreDetailed',
  getLastUploadDiagnostics: 'nova-steam-leaderboard:getLastUploadDiagnostics',
  getStatus: 'nova-steam-leaderboard:getStatus',
  getRuntimeInfo: 'nova-steam-leaderboard:getRuntimeInfo'
};

const APP_CHANNELS = {
  exitGame: 'nova-app:exitGame'
};

const INPUT_CHANNELS = {
  getNativeGamepads: 'nova-input:getNativeGamepads'
};

const STEAM_CLOUD_CHANNELS = {
  getDiagnostics: 'nova-steam-cloud:getDiagnostics',
  readSave: 'nova-steam-cloud:readSave',
  getPersistenceSummary: 'nova-steam-cloud:getPersistenceSummary',
  mergeRendererState: 'nova-steam-cloud:mergeRendererState'
};

const ACHIEVEMENT_CHANNELS = {
  getStatus: 'nova-steam-achievements:getStatus',
  requestCurrentStats: 'nova-steam-achievements:requestCurrentStats',
  getAchievement: 'nova-steam-achievements:getAchievement',
  unlockAchievement: 'nova-steam-achievements:unlockAchievement',
  syncUnlockedAchievements: 'nova-steam-achievements:syncUnlockedAchievements',
  getUnlockedAchievements: 'nova-steam-achievements:getUnlockedAchievements'
};

function safePayload(payload) {
  if (payload == null) return {};
  return JSON.parse(JSON.stringify(payload));
}

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, safePayload(payload));
}

const leaderboards = Object.freeze({
  isAvailable: async () => {
    try {
      return Boolean(await invoke(CHANNELS.isAvailable));
    } catch {
      return false;
    }
  },
  getPersonaName: async () => {
    try {
      return String(await invoke(CHANNELS.getPersonaName) || 'STEAM PILOT');
    } catch {
      return 'STEAM PILOT';
    }
  },
  getTopScores: (payload) => invoke(CHANNELS.getTopScores, payload),
  getFriendsScores: (payload) => invoke(CHANNELS.getFriendsScores, payload),
  submitScore: (payload) => invoke(CHANNELS.submitScore, payload),
  submitScoreDetailed: (payload) => invoke(CHANNELS.submitScoreDetailed, payload),
  getLastUploadDiagnostics: () => invoke(CHANNELS.getLastUploadDiagnostics),
  getRuntimeInfo: () => invoke(CHANNELS.getRuntimeInfo)
});

const achievements = Object.freeze({
  getStatus: () => invoke(ACHIEVEMENT_CHANNELS.getStatus),
  requestCurrentStats: () => invoke(ACHIEVEMENT_CHANNELS.requestCurrentStats),
  getAchievement: (id) => invoke(ACHIEVEMENT_CHANNELS.getAchievement, { id }),
  unlockAchievement: (id) => invoke(ACHIEVEMENT_CHANNELS.unlockAchievement, { id }),
  syncUnlockedAchievements: (payload) => invoke(ACHIEVEMENT_CHANNELS.syncUnlockedAchievements, payload),
  getUnlockedAchievements: (payload) => invoke(ACHIEVEMENT_CHANNELS.getUnlockedAchievements, payload)
});

contextBridge.exposeInMainWorld('__novaSteamLeaderboard', leaderboards);
contextBridge.exposeInMainWorld('__novaSteamAchievements', achievements);
contextBridge.exposeInMainWorld('__novaSteamBridge', Object.freeze({
  leaderboards,
  achievements,
  getStatus: () => invoke(CHANNELS.getStatus),
  getRuntimeInfo: () => invoke(CHANNELS.getRuntimeInfo)
}));

contextBridge.exposeInMainWorld('__novaApp', Object.freeze({
  exitGame: () => invoke(APP_CHANNELS.exitGame)
}));

contextBridge.exposeInMainWorld('__novaSteamCloud', Object.freeze({
  getDiagnostics: () => invoke(STEAM_CLOUD_CHANNELS.getDiagnostics),
  readSave: () => invoke(STEAM_CLOUD_CHANNELS.readSave),
  getPersistenceSummary: () => invoke(STEAM_CLOUD_CHANNELS.getPersistenceSummary),
  mergeRendererState: (payload) => invoke(STEAM_CLOUD_CHANNELS.mergeRendererState, payload)
}));

let nativeGamepadCache = [];
let nativeGamepadStatus = { available: false, reason: 'not_polled' };

async function refreshNativeGamepads() {
  try {
    const result = await ipcRenderer.invoke(INPUT_CHANNELS.getNativeGamepads);
    nativeGamepadStatus = safePayload(result?.status || {});
    nativeGamepadCache = Array.isArray(result?.gamepads) ? safePayload(result.gamepads) : [];
  } catch (error) {
    nativeGamepadStatus = { available: false, reason: 'ipc_error', error: error?.message || String(error) };
    nativeGamepadCache = [];
  }
}

refreshNativeGamepads();
setInterval(refreshNativeGamepads, 16);

contextBridge.exposeInMainWorld('__novaNativeGamepads', Object.freeze({
  getGamepads: () => safePayload(nativeGamepadCache),
  getStatus: () => safePayload(nativeGamepadStatus)
}));
