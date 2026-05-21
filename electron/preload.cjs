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

contextBridge.exposeInMainWorld('__novaSteamLeaderboard', leaderboards);
contextBridge.exposeInMainWorld('__novaSteamBridge', Object.freeze({
  leaderboards,
  getStatus: () => invoke(CHANNELS.getStatus),
  getRuntimeInfo: () => invoke(CHANNELS.getRuntimeInfo)
}));
