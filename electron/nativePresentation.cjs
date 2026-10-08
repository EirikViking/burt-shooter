const { app, screen, ipcMain } = require('electron');
const path = require('node:path');
const { subscribeOverlay, subscribeScreenshot } = require('./steamOverlayEvents.cjs');

// Key conversion follows steam-bridge v0.4.6 (MIT); see native/presentation/UPSTREAM.md.
const KEYS = { 8:'Backspace',9:'Tab',13:'Enter',16:'Shift',17:'Control',18:'Alt',19:'Pause',20:'Capslock',27:'Escape',32:'Space',33:'PageUp',34:'PageDown',35:'End',36:'Home',37:'Left',38:'Up',39:'Right',40:'Down',45:'Insert',46:'Delete',91:'Super',92:'Super',160:'Shift',161:'Shift',162:'Control',163:'Control',164:'Alt',165:'Alt',186:';',187:'=',188:',',189:'-',190:'.',191:'/',192:'`',219:'[',220:'\\',221:']',222:"'" };
function keyCode(vk) {
  return KEYS[vk] || (vk >= 48 && vk <= 90 ? String.fromCharCode(vk) : vk >= 112 && vk <= 135 ? `F${vk - 111}` : vk >= 96 && vk <= 105 ? `num${vk - 96}` : null);
}

function attachNativePresentation(win, { steam, captureScreenshot, startupBounds, fullscreen = false }) {
  // Fail visibly on load/graphics failure. Never silently select a different renderer.
  const native = require(path.join(__dirname, 'native', 'nova_presentation.node'));
  const wc = win.webContents;
  const original = Object.fromEntries(['getBounds','getContentSize','setContentSize','setPosition','destroy','close','show','showInactive','setSkipTaskbar'].map(key => [key, win[key].bind(win)]));
  let closed = false, overlay = false, focused = false, hiddenCursor = false;
  let physicalBounds = null, contentSize = original.getContentSize(), lastDiagnostic = null;
  let inFlight = 0, accepted = 0, dropped = 0, produced = 0;
  const quarantinedTextures = new Set();
  const heldKeys = new Set(), heldButtons = new Set();
  let pointer = { x: 0, y: 0 };
  let lastPump = performance.now(), pendingWindowUpdate = true;
  const timings = [];
  const send = event => { if (!closed && !wc.isDestroyed()) wc.sendInputEvent(event); };
  const clearHeldKeys = () => {
    for (const key of heldKeys) send({ type:'keyUp', keyCode:key });
    heldKeys.clear();
  };
  const clearHeldButtons = () => {
    for (const button of heldButtons) send({ type:'mouseUp', button, ...pointer, clickCount:1 });
    heldButtons.clear();
  };
  const clearHeld = () => {
    clearHeldKeys();
    clearHeldButtons();
  };
  const notifyFocus = () => {
    const active = focused && !overlay;
    if (!active) clearHeld();
    wc.send('nova-native:focus', active);
    wc.send(active ? 'nova-app:window-focus' : 'nova-app:window-blur');
    native.cursorHidden(active && hiddenCursor);
    if (active) wc.focus();
  };
  const fatal = error => {
    console.error('[NativePresentation] fatal; terminating without releasing unsafe producer:', error);
    // A timed-out GPU copy does not establish safe reuse. Keep the producer alive
    // until process exit instead of recycling it into Chromium's finite pool.
    app.exit(1);
  };
  native.open('Nova Swarm', contentSize[0], contentSize[1]);
  native.continuous(true, 60);
  const readState = () => {
    lastDiagnostic = JSON.parse(native.diagnostics() || 'null');
    const d = lastDiagnostic;
    if (!d) return;
    const b = d.rect;
    if (b) physicalBounds = {x:b.x ?? b.left,y:b.y ?? b.top,width:b.width ?? b.right-b.left,height:b.height ?? b.bottom-b.top};
    const size = d.logicalClientSize;
    if (size && size.width > 0 && size.height > 0 && (size.width !== contentSize[0] || size.height !== contentSize[1])) {
      contentSize = [size.width, size.height];
      // Keep the hidden surface on the host's monitor so Chromium uses its DPI.
      const dip = screen.screenToDipRect(null, physicalBounds);
      original.setPosition(dip.x, dip.y);
      original.setContentSize(...contentSize);
    }
    const active = Boolean(d.isForeground && !d.minimized);
    if (active !== focused) { focused = active; notifyFocus(); }
  };
  win.nativePresentation = {
    diagnostics: () => ({ ...lastDiagnostic, transport:{produced,accepted,dropped,inFlight,quarantined:quarantinedTextures.size}, overlayActive:overlay, pumpIntervals:timings.slice() }),
    inputActive: () => focused && !overlay,
    native
  };
  win.getBounds = () => physicalBounds ? screen.screenToDipRect(null, physicalBounds) : original.getBounds();
  win.getContentSize = () => contentSize.slice();
  win.setBounds = bounds => {
    const b = screen.dipToScreenRect(null, bounds);
    native.bounds(b.x,b.y,b.width,b.height); readState(); pendingWindowUpdate = true;
  };
  win.setFullScreen = value => { native.fullscreen(Boolean(value)); readState(); pendingWindowUpdate = true; };
  win.isFullScreen = () => Boolean(lastDiagnostic?.fullScreen);
  win.isFocused = () => focused;
  win.isVisible = () => Boolean(lastDiagnostic?.visible);
  win.setResizable = () => {};
  win.unmaximize = () => {};
  win.setSkipTaskbar = () => {};
  win.show = win.showInactive = () => native.show();
  if (startupBounds) win.setBounds(startupBounds);
  if (fullscreen) native.fullscreen(true);
  native.show();
  readState();
  wc.setFrameRate(60);
  wc.on('paint', event => {
    const texture = event.texture;
    if (!texture) return fatal(new Error('Offscreen shared GPU texture missing'));
    produced++;
    if (closed || inFlight >= 2) { dropped++; texture.release(); return; }
    const info = texture.textureInfo;
    const rect = info.contentRect;
    const visible = info.visibleRect;
    inFlight++;
    let retained = false;
    try {
      retained = native.beginNativeOverlayHostSharedTextureCopy(
        info.handle.ntHandle, info.codedSize.width, info.codedSize.height,
        rect.x, rect.y, rect.width, rect.height, visible.x, visible.y, visible.width, visible.height,
        result => {
          inFlight--;
          if (result.producerReleaseSafe === true) texture.release();
          else quarantinedTextures.add(texture);
          if (result.producerReleaseSafe !== true || result.error) { fatal(new Error(result.error || 'Invalid GPU completion acknowledgement')); return; }
          if (result.accepted) accepted++; else dropped++;
        }
      );
      if (!retained) { inFlight--; dropped++; texture.release(); }
    } catch (error) { inFlight--; quarantinedTextures.add(texture); fatal(error); }
    if (retained && !closed) {
      // Copy and draw share the GPU command queue; no CPU fence wait is needed.
      try { native.pump(); } catch (error) { fatal(error); }
    }
  });
  const unsubscribe = subscribeOverlay(steam, active => {
    overlay = active; native.overlayActive(active); notifyFocus();
    console.log(`[NativePresentation] Steam overlay active=${active}`);
  });
  let screenshotPending = false;
  const unsubscribeScreenshot = captureScreenshot && steam?.screenshots?.hookScreenshots
    ? subscribeScreenshot(steam, async () => {
      if (closed || screenshotPending) return;
      screenshotPending = true;
      try {
        const result = await captureScreenshot();
        if (!result.ok) console.error('[NativePresentation] Steam screenshot failed:', result.reason);
      } finally { screenshotPending = false; }
    }) : () => {};
  // Retain the existing reliable one-shot capture, triggered only by Steam's
  // screenshot request. This is never used to present game frames.
  if (captureScreenshot) steam?.screenshots?.hookScreenshots?.(true);
  const cursorListener = (event, hidden) => {
    if (event.sender !== wc || typeof hidden !== 'boolean') return;
    hiddenCursor = hidden; native.cursorHidden(hidden && focused && !overlay);
  };
  ipcMain.on('nova-native:cursor', cursorListener);
  function forward(e) {
    if (e.kind === 'close') { win.close(); return; }
    if (e.kind === 'windowChanged') { pendingWindowUpdate = true; return; }
    if (e.kind === 'focus' || e.kind === 'blur') { focused = e.kind === 'focus'; notifyFocus(); return; }
    // Win32 sends WM_CAPTURECHANGED after the normal ReleaseCapture that
    // follows a mouse-up. Mouse capture says nothing about keyboard focus, so
    // clearing held keys here interrupts movement while firing with the mouse.
    if (e.kind === 'captureLost') { clearHeldButtons(); return; }
    if (!focused || overlay) return;
    const modifiers = [e.shift && 'shift',e.control && 'control',e.alt && 'alt',e.capsLock && 'capsLock',e.numLock && 'numLock'].filter(Boolean);
    if (e.kind === 'keyDown' || e.kind === 'keyUp') {
      const key = keyCode(e.wparam); if (!key) return;
      if (e.kind === 'keyDown') heldKeys.add(key); else heldKeys.delete(key);
      send({type:e.kind,keyCode:key,modifiers,isAutoRepeat:Boolean(e.lparam & 0x40000000)});
    } else if (e.kind === 'char') {
      send({type:'char',keyCode:String.fromCodePoint(e.wparam),modifiers});
    } else if (e.x != null && e.y != null) {
      pointer = {x:Math.round(e.x*contentSize[0]/e.clientWidth),y:Math.round(e.y*contentSize[1]/e.clientHeight)};
      if (e.kind === 'mouseMove') send({type:'mouseMove',...pointer,modifiers});
      else if (e.kind === 'mouseWheel') send({type:'mouseWheel',...pointer,deltaX:e.deltaX||0,deltaY:e.deltaY||0,canScroll:true,modifiers});
      else {
        const match = /^(left|right|middle)Mouse(Down|Up)$/.exec(e.kind);
        if (match) {
          if (match[2] === 'Down') heldButtons.add(match[1]); else heldButtons.delete(match[1]);
          send({type:`mouse${match[2]}`,button:match[1],...pointer,clickCount:1,modifiers});
        }
      }
    }
  }
  // Nonblocking message pump; DXGI's waitable object supplies presentation pacing.
  let timer = null;
  const pump = async () => {
    if (closed) return;
    try {
      const now = performance.now();
      if (timings.length < 36000) timings.push(now-lastPump);
      lastPump = now;
      native.pump();
      for (const event of JSON.parse(native.events())) forward(event);
      if (!native.isOpen()) { win.close(); return; }
      if (pendingWindowUpdate) { pendingWindowUpdate = false; readState(); }
      const frameReady = await native.waitForNativeOverlayHostFrameReady(32);
      // An unused ready permit means we are waiting for Chromium's next paint.
      // Paint wakes presentation directly; avoid a 1 kHz idle polling loop.
      if (!closed) timer = setTimeout(pump, frameReady ? 0 : 8);
    } catch (error) { fatal(error); }
  };
  const diagnosticsTimer = setInterval(() => { if (!closed) readState(); }, 250);
  wc.once('did-finish-load', notifyFocus);
  win.nativePresentation.dispose = () => {
    if (closed) return;
    closed = true; clearTimeout(timer); clearInterval(diagnosticsTimer);
    unsubscribeScreenshot(); unsubscribe(); ipcMain.removeListener('nova-native:cursor',cursorListener); native.close();
  };
  win.once('closed', win.nativePresentation.dispose);
  pump();
  return win.nativePresentation;
}
module.exports = { attachNativePresentation, keyCode };
