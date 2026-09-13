export const MAINTAINER_DEVTOOLS_KEY_SHA256 = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
export const LOCAL_DEVTOOLS_HASH_PARAM = 'nova-devtools-hash';

let devtoolsState = Object.freeze({
  enabled: false,
  source: 'none'
});

function isValidSha256(value) {
  return /^[0-9a-f]{64}$/i.test(String(value || '').trim());
}

function fixedHexEqual(left, right) {
  const a = String(left || '').trim().toLowerCase();
  const b = String(right || '').trim().toLowerCase();
  if (!isValidSha256(a) || !isValidSha256(b) || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function isLocalBrowserRuntime({ location = window.location, desktop = false } = {}) {
  if (desktop) return false;
  const hostname = String(location?.hostname || '').toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

async function readPreloadState(preloadState) {
  if (preloadState?.enabled === true) return preloadState;
  if (typeof preloadState?.getState === 'function') {
    try {
      const state = await preloadState.getState();
      if (state?.enabled === true) return state;
    } catch {
      return null;
    }
  }
  return null;
}

export async function initializeMaintainerDevtools({
  location = globalThis.window?.location,
  params = new URLSearchParams(location?.search || ''),
  preloadState = globalThis.window?.__novaMaintainerDevtools || null
} = {}) {
  const trustedPreloadState = await readPreloadState(preloadState);
  if (trustedPreloadState?.enabled === true) {
    devtoolsState = Object.freeze({
      enabled: true,
      source: trustedPreloadState.source || 'launch_arg'
    });
    return devtoolsState;
  }

  const desktop = params.get('desktop') === '1' || globalThis.window?.__NOVA_SWARM_DESKTOP__ === true;
  const localHash = params.get(LOCAL_DEVTOOLS_HASH_PARAM);
  if (
    isLocalBrowserRuntime({ location, desktop }) &&
    fixedHexEqual(localHash, MAINTAINER_DEVTOOLS_KEY_SHA256)
  ) {
    devtoolsState = Object.freeze({
      enabled: true,
      source: 'local_browser_hash'
    });
    return devtoolsState;
  }

  devtoolsState = Object.freeze({
    enabled: false,
    source: 'none'
  });
  return devtoolsState;
}

export function isMaintainerDevtoolsEnabled() {
  return devtoolsState.enabled === true;
}

export function getMaintainerDevtoolsState() {
  return devtoolsState;
}
