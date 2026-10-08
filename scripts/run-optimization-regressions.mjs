import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,openSync,closeSync} from 'node:fs';
import path from 'node:path';
const root=process.env.CHECK_OUTPUT_DIR;
if(!root?.startsWith('E:'))throw Error('E: evidence required');
const scripts=process.argv.slice(2);
const results=[];
for(const name of scripts){
  const out=path.join(root,name.replace(/\.(mjs|cjs)$/,''));mkdirSync(out,{recursive:true});
  const log=openSync(path.join(out,'process.log'),'w'),started=Date.now();
  const p=spawn(process.execPath,[path.resolve('scripts',name)],{env:{...process.env,CHECK_OUTPUT_DIR:out},windowsHide:true,stdio:['ignore',log,log]});
  const timer=setTimeout(()=>p.kill(),360000);
  const code=await new Promise((resolve,reject)=>{p.once('error',reject);p.once('exit',resolve);});
  clearTimeout(timer);closeSync(log);
  results.push({script:name,code,elapsedMs:Date.now()-started,out});
  console.log(JSON.stringify(results.at(-1)));
}
writeFileSync(path.join(root,'regressions.json'),JSON.stringify(results,null,2));
process.exitCode=results.some(r=>r.code!==0)?1:0;
