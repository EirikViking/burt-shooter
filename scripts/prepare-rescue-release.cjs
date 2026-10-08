const fs=require('node:fs'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const root='E:/Codex/builds/nova-swarm/rescue-batch',old='E:/Codex/builds/nova-swarm/surprises';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}
const html=fs.readFileSync(root+'/current/index.html','utf8'),entry=html.match(/src="\.\/([^" ]+index[^" ]+\.js)"/)?.[1];
if(!entry)throw Error('Candidate entry missing');
const extra=fs.readdirSync('scripts').filter(n=>/^(check-convoy-|check-premium-art-loading|prepare-rescue-|generate-convoy-|playtest-opening)/.test(n)).map(n=>'scripts/'+n);
const paths=[...walk('src'),...walk('electron'),...extra,'scripts/check-visual-life-lifecycle.mjs','scripts/check-wreck-visibility-runtime.mjs','scripts/generate-encounter-weight-audio.mjs',...walk('public/audio/sfx/convoy-surprises'),'docs/audio/convoy-surprises-20261002.json','public/version.json','public/sw.js','public/_headers'];
const manifest={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),entry,entrySHA256:hash(root+'/current/'+entry),version:JSON.parse(fs.readFileSync('public/version.json')).version,files:paths.map(p=>({path:p,currentSHA256:hash(p)})),createdAt:new Date().toISOString()};
fs.writeFileSync(root+'/source-state.json',JSON.stringify(manifest,null,2)+'\n');fs.mkdirSync(root+'/reproduction',{recursive:true});
for(const name of ['package-current.cjs','native-check.mjs','serve.cjs','performance.mjs','steam-receipt.cjs']){
 let data=fs.readFileSync(old+'/reproduction/'+name,'utf8').replaceAll(old,root).replaceAll('nova-surprises','nova-rescue-batch');
 if(name==='package-current.cjs')data=data.replace("const baseline='E:/Codex/builds/nova-swarm/optimization/win-unpacked'",`const baseline='${old}/win-unpacked'`).replace("lastVerifiedPrivate:'25660369'","lastVerifiedPrivate:'25671489'");
 if(name==='serve.cjs')data=data.replaceAll('E:/Codex/builds/nova-swarm/optimization/current',old+'/current').replaceAll('4961','4971').replaceAll('4962','4972');
 fs.writeFileSync(root+'/reproduction/'+name,data);
}
console.log(JSON.stringify({entry,version:manifest.version,files:paths.length,head:manifest.head}));
