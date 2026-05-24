const { contextBridge, ipcRenderer } = require('electron');

const STEAM_CLOUD_CHANNELS = {
  getDiagnostics: 'nova-steam-cloud:getDiagnostics',
  readSave: 'nova-steam-cloud:readSave',
  mergeRendererState: 'nova-steam-cloud:mergeRendererState'
};

function safePayload(payload) {
  if (payload == null) return {};
  return JSON.parse(JSON.stringify(payload));
}

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, safePayload(payload));
}

contextBridge.exposeInMainWorld('__novaSteamCloud', Object.freeze({
  getDiagnostics: () => invoke(STEAM_CLOUD_CHANNELS.getDiagnostics),
  readSave: () => invoke(STEAM_CLOUD_CHANNELS.readSave),
  mergeRendererState: (payload) => invoke(STEAM_CLOUD_CHANNELS.mergeRendererState, payload)
}));
