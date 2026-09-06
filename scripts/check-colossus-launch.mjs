import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {_electron as electron} from 'playwright';
const out=path.resolve('test-results/colossus-launch');mkdirSync(out,{recursive:true});
const results=[];
for(const [label,folder,sha]of [['before','astra-build-2026-09-06T16-53-25-326Z','ed673fc'],['after','astra-build-2026-09-06T19-13-59-279Z','f61d1b3']]){
 const profile=path.join(out,label),started=Date.now();
 const app=await electron.launch({executablePath:path.resolve('test-results',folder,'win-unpacked/Nova Swarm.exe'),args:['--nova-fresh-profile','--windowed'],env:{...process.env,NOVA_SWARM_USER_DATA_DIR:profile,NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},timeout:120000});
 try{
  const page=await app.firstWindow();await page.waitForFunction(()=>window.__game?.scenes.menu?.astraMenuShip?.ready&&document.body.dataset.menuReady==='1',null,{timeout:120000});
  const elapsedMs=Date.now()-started;
  const state=await page.evaluate(()=>({sha:JSON.parse(window.render_game_to_text()).gitSha,url:location.href}));
  const runtime=await app.evaluate(({app})=>({packaged:app.isPackaged,userData:app.getPath('userData')}));
  assert.equal(state.sha,sha);assert.ok(state.url.includes('offlineLeaderboard=1'));assert.equal(runtime.userData,profile);assert.equal(runtime.packaged,true);
  results.push({label,elapsedMs,...state,...runtime});
 }finally{await app.close();}
}
writeFileSync(path.join(out,'report.json'),JSON.stringify({ok:true,note:'Paired launches after both package files had already been exercised; warm filesystem cache, new isolated profiles.',results},null,2));
console.log(JSON.stringify(results));
