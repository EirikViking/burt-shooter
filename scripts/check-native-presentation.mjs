import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';

const nativePresentationSource = readFileSync('electron/nativePresentation.cjs', 'utf8');
assert.match(nativePresentationSource, /if \(e\.kind === 'captureLost'\) \{ clearHeldButtons\(\); return; \}/,
  'Mouse capture loss must preserve held keyboard movement');
assert.doesNotMatch(nativePresentationSource, /if \(e\.kind === 'captureLost'\) \{ clearHeld\(\); return; \}/,
  'Mouse capture loss must not synthesize key-up events');

const wc = new EventEmitter();
const inputs = [], messages = [], copies = [], cursors = [];
Object.assign(wc, { sendInputEvent:e=>inputs.push(e), send:(...a)=>messages.push(a), isDestroyed:()=>false, focus(){}, setFrameRate(){} });
const win = new EventEmitter();
Object.assign(win,{webContents:wc});
for(const name of ['setContentSize','setPosition','destroy','close','show','showInactive','setSkipTaskbar']) win[name]=()=>{};
win.getBounds=()=>({x:-1920,y:0,width:1280,height:720});
win.getContentSize=()=>[1280,720];
const state={rect:{x:-1920,y:0,width:1280,height:720},logicalClientSize:{width:1280,height:720},isForeground:true,visible:true,fullScreen:false};
let events=[], overlayCallback, screenshotCallback, unregisters=0, screenshotUnregisters=0, shots=0, finishShot;
const native={
  open(){},continuous(){},show(){},close(){},pump(){},isOpen:()=>true,
  diagnostics:()=>JSON.stringify(state), events:()=>JSON.stringify(events.splice(0)),
  cursorHidden:v=>cursors.push(v), overlayActive(){},
  bounds(x,y,width,height){state.rect={x,y,width,height};},fullscreen:v=>state.fullScreen=v,
  beginNativeOverlayHostSharedTextureCopy(...args){copies.push(args.at(-1));return true;},
  waitForNativeOverlayHostFrameReady:()=>new Promise(()=>{})
};
const ipcMain=new EventEmitter();
let refresh;
const context={module:{exports:{}},__dirname:'electron',console,performance,setTimeout,clearTimeout,setImmediate,clearImmediate,
  setInterval:f=>{refresh=f;return 1;},clearInterval(){},
  require(name){
    if(name==='electron')return {app:{exit:()=>assert.fail('Unexpected fatal exit')},screen:{screenToDipRect:(_,b)=>b,dipToScreenRect:(_,b)=>b},ipcMain};
    if(name==='node:path')return {join:(...parts)=>parts.join('/')};
    if(name.endsWith('.node'))return native;
    if(name==='./steamOverlayEvents.cjs')return {subscribeOverlay:(_steam,f)=>{overlayCallback=f;return ()=>unregisters++;},subscribeScreenshot:(_steam,f)=>{screenshotCallback=f;return ()=>screenshotUnregisters++;}};
    throw Error(name);
  }
};
vm.runInNewContext(readFileSync('electron/nativePresentation.cjs','utf8'),context);
const host=context.module.exports.attachNativePresentation(win,{steam:{screenshots:{hookScreenshots:v=>assert.equal(v,true)}},captureScreenshot:()=>{shots++;return new Promise(r=>finishShot=r)}});
let releases=0;
const texture=()=>({textureInfo:{handle:{ntHandle:Buffer.alloc(8)},codedSize:{width:1920,height:1080},contentRect:{x:0,y:0,width:1920,height:1080},visibleRect:{x:0,y:0,width:1920,height:1080}},release:()=>releases++});
wc.emit('paint',{texture:texture()}); wc.emit('paint',{texture:texture()});
assert.equal(releases,0,'Producer must survive until GPU acknowledgement');
wc.emit('paint',{texture:texture()});
assert.equal(releases,1,'Bounded queue must immediately release a rejected frame');
copies.shift()({accepted:true,producerReleaseSafe:true});
copies.shift()({accepted:true,producerReleaseSafe:true});
assert.equal(releases,3); assert.equal(host.diagnostics().transport.inFlight,0);
ipcMain.emit('nova-native:cursor',{sender:wc},true); assert.equal(cursors.at(-1),true);
overlayCallback(true); assert.equal(host.inputActive(),false); assert.equal(cursors.at(-1),false);
overlayCallback(false); assert.equal(host.inputActive(),true); assert.equal(cursors.at(-1),true);
state.isForeground=false;refresh(); assert.equal(host.inputActive(),false);
state.isForeground=true;refresh(); assert.equal(host.inputActive(),true);
win.setFullScreen(true);assert.equal(win.isFullScreen(),true);
win.setFullScreen(false);assert.equal(win.isFullScreen(),false);
win.setBounds({x:-2560,y:0,width:1280,height:720});assert.equal(win.getBounds().x,-2560);
const shot=screenshotCallback();await screenshotCallback();assert.equal(shots,1,'Repeated screenshot callbacks must not overlap');finishShot({ok:true});await shot;
host.dispose();host.dispose();assert.equal(unregisters,1);assert.equal(screenshotUnregisters,1);
assert.equal(ipcMain.listenerCount('nova-native:cursor'),0);
console.log('[native-presentation] PASS bounded producer lifetime, overlay/focus/cursor ownership, display state, disposal');
