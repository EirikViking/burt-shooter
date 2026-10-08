import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const root='E:/Codex/builds/nova-swarm/forum-feedback-20260913/qa/matrix';
fs.mkdirSync(root,{recursive:true});
const rows=[];
for(const ship of ['NOVA SPARROW','MINT SKATER'])for(const mode of ['pure','tactical'])for(const weapon of ['plain','upgraded']){
  const id=`${ship.toLowerCase().replaceAll(' ','-')}-${mode}-${weapon}`;
  const preset=weapon==='plain'?'dual-boss':'boss-snake';
  const env={...process.env,CHECK_URL:'http://127.0.0.1:5223',CHECK_OUTPUT_DIR:`${root}/${id}`,BALANCE_SHIP:ship,BALANCE_RULESET:mode,BALANCE_PRESET:preset,BALANCE_PILOTS:'offense',BALANCE_MEASURE_ONLY:'1',BALANCE_AUGMENTS:mode==='tactical'&&weapon==='upgraded'?'pierce,chain_lightning':'',BALANCE_PICKUP:mode==='pure'&&weapon==='upgraded'?'chain_lightning':''};
  const r=spawnSync(process.execPath,['scripts/check-boss-encounter-balance.mjs'],{env,encoding:'utf8',timeout:300000,maxBuffer:4*1024*1024});
  fs.mkdirSync(env.CHECK_OUTPUT_DIR,{recursive:true});fs.writeFileSync(`${env.CHECK_OUTPUT_DIR}/run.log`,r.stdout+'\n'+r.stderr);
  let result=null;try{result=JSON.parse(fs.readFileSync(`${env.CHECK_OUTPUT_DIR}/results.json`))[0];}catch{}
  const row={id,ship,mode,weapon,preset,status:r.status,...(result?{complete:result.complete,elapsed:result.elapsed,overlapSeconds:result.overlapSeconds,offAxisSeconds:result.offAxisSeconds,comboBreaks:result.comboBreaks,incoming:result.incoming,errors:result.errors}: {error:String(r.error||r.stderr)})};
  rows.push(row);console.log(JSON.stringify(row));fs.writeFileSync(`${root}/summary.json`,JSON.stringify(rows,null,2));
  if(r.status!==0)process.exitCode=1;
}
