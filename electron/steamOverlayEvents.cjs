// Subscribe through the existing SDK instance and its callback pump. No second
// SteamAPI_Init/Shutdown or manual-dispatch owner is introduced here.
const path = require('node:path');

function subscribeCallback(steam, callbackId, callbackSize, receive) {
  if (!steam?.libraryLoader?.SteamAPI_RegisterCallback) return () => {};
  const koffi = require('koffi');
  const sdkDir = path.dirname(require.resolve('steamworks-ffi-node'));
  const types = require(path.join(sdkDir, 'internal', 'SteamLibraryLoader.js'));
  const callbacks = [
    koffi.register(receive, types.FnCallbackRunPtr),
    koffi.register(receive, types.FnCallbackRunResultPtr),
    koffi.register(() => callbackSize, types.FnGetCallbackSizeBytesPtr)
  ];
  const vtable = koffi.alloc('void*', 3);
  koffi.encode(vtable, koffi.array('void*', 3), callbacks);
  const object = koffi.alloc(types.CCallbackBase, 1);
  koffi.encode(object, types.CCallbackBase, {
    vfptr: vtable, m_nCallbackFlags: 0, _pad: [0, 0, 0], m_iCallback: callbackId
  });
  steam.libraryLoader.SteamAPI_RegisterCallback(object, callbackId);
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    steam.libraryLoader.SteamAPI_UnregisterCallback(object);
    for (const callback of callbacks) koffi.unregister(callback);
    koffi.free(object);
    koffi.free(vtable);
  };
}
function subscribeOverlay(steam, onActive) {
  // GameOverlayActivated_t: uint8 active, bool userInitiated, uint32 appId, int overlayPid.
  return subscribeCallback(steam, 331, 12, (_self, data) => {
    try { onActive(Boolean(require('koffi').decode(data, 'uint8'))); }
    catch (error) { console.error('[NativePresentation] overlay callback:', error); }
  });
}
function subscribeScreenshot(steam, onRequested) {
  // ScreenshotRequested_t is an empty C++ structure (sizeof == 1).
  return subscribeCallback(steam, 2302, 1, () => {
    Promise.resolve().then(onRequested).catch(error => console.error('[NativePresentation] screenshot:', error));
  });
}
module.exports = { subscribeOverlay, subscribeScreenshot };
