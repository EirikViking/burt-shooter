import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {extractAll,extractFile,createPackageWithOptions,listPackage,statFile} from '@electron/asar';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['scripts/check-release-line.mjs'],{stdio:'inherit'});
const runtimeCommit=execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim();
const baseline=JSON.parse(fs.readFileSync('docs/mysteries/delivery.json')).package.payload;
const root='E:/Codex/builds/nova-swarm/mystery-v2/package',dist='E:/Codex/builds/nova-swarm/mystery-v2/build-dist';
const source=root+'/source',payload=root+'/win-unpacked',old=baseline+'/resources/app.asar',archive=payload+'/resources/app.asar';
const changed=['index.html',...fs.readdirSync(dist+'/assets').filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f)]
  .map(f=>({name:'dist/'+f,src:dist+'/'+f}));
for(const f of ['version.json','sw.js'])changed.push({name:'dist/'+f,src:'public/'+f});
for(const folder of ['audio/sfx/mysteries-v2','audio/voice/mysteries-v2'])for(const f of fs.readdirSync('public/'+folder))changed.push({name:'dist/'+folder+'/'+f,src:'public/'+folder+'/'+f});
const entry=fs.readFileSync(dist+'/index.html','utf8').match(/src="\.\/(assets\/index-[^"]+\.js)"/)[1];
assert.ok(fs.readFileSync(dist+'/'+entry,'utf8').includes(runtimeCommit),'Runtime provenance');
if(!process.env.MYSTERY_PACKAGE_VERIFY_ONLY){
 assert.ok(!fs.existsSync(root),'Package destination already exists; reconcile before replacing');fs.mkdirSync(root,{recursive:true});
 fs.cpSync(baseline,payload,{recursive:true,filter:p=>!p.endsWith('app.asar')&&!p.includes('app.asar.unpacked')});
 extractAll(old,source);
 for(const f of changed){fs.mkdirSync(path.dirname(source+'/'+f.name),{recursive:true});fs.copyFileSync(f.src,source+'/'+f.name);}
 await createPackageWithOptions(source,archive,{unpackDir:'node_modules',unpack:'*.dll'});
 fs.cpSync(baseline+'/resources/app.asar.unpacked',payload+'/resources/app.asar.unpacked',{recursive:true});
}
const hash=b=>createHash('sha256').update(b).digest('hex'),replaced=new Set(changed.map(f=>f.name));let retained=0,playerAssets=0;
for(const entry of listPackage(old)){
 const rel=entry.replace(/^[/\\]/,'').replaceAll('\\','/');if(statFile(old,path.normalize(rel)).files||replaced.has(rel))continue;
 assert.equal(hash(extractFile(archive,path.normalize(rel))),hash(extractFile(old,path.normalize(rel))),rel);retained++;
 if(/nova-player-ship|fleet-showcase|sparrow-showcase/.test(rel))playerAssets++;
}
for(const f of changed)assert.equal(hash(extractFile(archive,path.normalize(f.name))),hash(fs.readFileSync(f.src)),f.name);
const receipt={runtimeCommit,root,payload,baseline,retained,playerAssets,changed:changed.map(f=>f.name),bytes:fs.statSync(archive).size};
fs.writeFileSync('E:/Codex/builds/nova-swarm/mystery-v2/package.json',JSON.stringify(receipt,null,2));console.log('PASS',JSON.stringify({...receipt,changed:changed.length}));
