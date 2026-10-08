const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const root='E:/Codex/builds/nova-swarm/surprises',old='E:/Codex/builds/nova-swarm/optimization';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}
const html=fs.readFileSync(root+'/current/index.html','utf8');const entry=html.match(/src="\.\/([^" ]+index[^" ]+\.js)"/)?.[1];
if(!entry)throw Error('Cannot find exact candidate entry');
const paths=[...walk('src'),...walk('electron'),'scripts/check-backdrop-load-lifecycle.mjs','scripts/check-no-planet-props.mjs','scripts/check-backdrop-cleanup-runtime.mjs','public/version.json','public/sw.js','public/_headers'];
const manifest={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),entry,entrySHA256:hash(root+'/current/'+entry),version:JSON.parse(fs.readFileSync('public/version.json')).version,files:paths.map(p=>({path:p,currentSHA256:hash(p)})),createdAt:new Date().toISOString()};
fs.writeFileSync(root+'/source-state.json',JSON.stringify(manifest,null,2)+'\n');
for(const name of ['package-current.cjs','native-check.mjs','serve.cjs','performance.mjs','skill-client.mjs','actions.json']){
 let data=fs.readFileSync(old+'/reproduction/'+name,'utf8');
 data=data.replaceAll('E:/Codex/builds/nova-swarm/material-rebuild/win-unpacked','E:/Codex/builds/nova-swarm/optimization/win-unpacked');
 if(name==='serve.cjs')data=data.replaceAll('E:/Codex/builds/nova-swarm/material-rebuild/current','E:/Codex/builds/nova-swarm/optimization/current').replaceAll('4951','4961').replaceAll('4952','4962');
 data=data.replaceAll('E:/Codex/builds/nova-swarm/optimization/source-state.json',root+'/source-state.json');
 if(name==='serve.cjs')data=data.replaceAll("'E:/Codex/builds/nova-swarm/optimization/current',4962",`'${root}/current',4962`);
 else if(name!=='actions.json')data=data.replaceAll('E:/Codex/builds/nova-swarm/optimization',root);
 // The preceding root replacement also touches the chosen rollback runtime;
 // restore it to the already verified optimization package.
 if(name==='package-current.cjs')data=data.replace("const baseline='"+root+"/win-unpacked'","const baseline='"+old+"/win-unpacked'");
 data=data.replaceAll('nova-optimize','nova-surprises');
 fs.writeFileSync(root+'/reproduction/'+name,data);
}
fs.writeFileSync(root+'/reproduction/steam-receipt.cjs',fs.readFileSync('E:/Codex/builds/nova-swarm/material-rebuild/reproduction/steam-receipt.cjs','utf8').replaceAll('E:/Codex/builds/nova-swarm/material-rebuild',root));
console.log(JSON.stringify({entry,version:manifest.version,files:manifest.files.length,head:manifest.head}));
