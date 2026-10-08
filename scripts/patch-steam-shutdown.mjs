// steamworks-ffi-node 0.10.3 may resume a pending poll after SteamAPI_Shutdown.
// Keep its API/lifecycle unchanged; cancel before touching the unloaded DLL.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(process.argv[2] || 'node_modules/steamworks-ffi-node');
const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
if(pkg.version!=='0.10.3') throw Error('Revalidate shutdown patch for SDK '+pkg.version);
const file=path.join(root,'dist/internal/SteamCallbackPoller.js');
const source=readFileSync(file,'utf8'), normalized=source.replaceAll('\r\n','\n');
const marker='            if (!this.apiCore.isInitialized()) return null; // Nova: cancel pending polls after shutdown';
const original=normalized.replace(marker+'\n','');
if(createHash('sha256').update(original).digest('hex')!=='c4d53203514e55e919b7e86f997d0c6e8a39afd4fc7f8b7e6999b734ed7713be') throw Error('Unexpected SteamCallbackPoller source; refusing to overwrite');
if(!normalized.includes(marker)) {
 const patched=normalized.replace('            this.apiCore.runCallbacks();',marker+'\n            this.apiCore.runCallbacks();');
 writeFileSync(file,source.includes('\r\n')?patched.replaceAll('\n','\r\n'):patched);
}
console.log('Steam shutdown poll guard verified (SDK 0.10.3).');
