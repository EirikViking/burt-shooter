import {spawn} from 'node:child_process';
import {mkdirSync,openSync,closeSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const [label='baseline',mode='perf-smoke',executable]=process.argv.slice(2);
if(!['perf-smoke','control-smoke','smoke'].includes(mode))throw new Error('Unknown native check');
const out=path.resolve('test-results',`astra-native-${label}-${mode}`);mkdirSync(out,{recursive:true});
const log=openSync(path.join(out,'process.log'),'w');
const env={...process.env,NOVA_SWARM_USER_DATA_DIR:path.join(out,'profile'),NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_CONTROL_READY_TIMEOUT_MS:'120000',
  NOVA_SWARM_ELECTRON_PERF_SMOKE_OUTPUT_DIR:out,NOVA_SWARM_ELECTRON_CONTROL_SMOKE_OUTPUT_DIR:out,NOVA_SWARM_ELECTRON_SMOKE_OUTPUT_DIR:out};
// A GUI executable outlives a PowerShell invocation. Real file handles prevent
// EPIPE dialogs when a console or orchestration cell finishes before Electron.
const child=spawn(executable||path.resolve('node_modules/electron/dist/electron.exe'),[...(executable?[]:[path.resolve('electron/main.cjs')]),`--${mode}`,'--nova-fresh-profile'],{cwd:process.cwd(),env,windowsHide:true,stdio:['ignore',log,log]});
const startedAt=Date.now();
const timeout=setTimeout(()=>child.kill(),300000);
const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
clearTimeout(timeout);closeSync(log);
writeFileSync(path.join(out,'launcher.json'),JSON.stringify({code,elapsedMs:Date.now()-startedAt,executable:executable||'local Electron',mode,profile:env.NOVA_SWARM_USER_DATA_DIR},null,2));
console.log(JSON.stringify({label,mode,code,out}));process.exitCode=code??1;
