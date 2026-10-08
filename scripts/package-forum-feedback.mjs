import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {extractAll,extractFile,createPackageWithOptions,listPackage,statFile} from '@electron/asar';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['scripts/check-release-line.mjs'],{stdio:'inherit'});
const runtimeCommit=execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim();
const job='E:/Codex/builds/nova-swarm/forum-feedback-20260913';
const baseline='E:/Codex/builds/nova-swarm/snake-broods/package/win-unpacked';
const source=job+'/package-source',payload=job+'/win-unpacked',dist=job+'/build-dist';
const old=baseline+'/resources/app.asar',archive=payload+'/resources/app.asar';
for(const p of [job,baseline])assert.equal(fs.realpathSync(p).replaceAll('\\','/').toLowerCase(),p.toLowerCase(),'No redirected build roots');
const changed=['index.html',...fs.readdirSync(dist+'/assets').filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f)].map(f=>({name:'dist/'+f,src:dist+'/'+f}));
for(const f of ['version.json','sw.js'])changed.push({name:'dist/'+f,src:'public/'+f});
changed.push({name:'electron/steamAchievementsBridge.cjs',src:'electron/steamAchievementsBridge.cjs'});
const entry=fs.readFileSync(dist+'/index.html','utf8').match(/src="\.\/(assets\/index-[^"]+\.js)"/)[1];
assert.ok(fs.readFileSync(dist+'/'+entry,'utf8').includes(runtimeCommit),'Compiled runtime provenance');
assert.ok(!fs.existsSync(payload)&&!fs.existsSync(source),'Reconcile existing task package before replacement');
fs.cpSync(baseline,payload,{recursive:true,filter:p=>!p.endsWith('app.asar')&&!p.includes('app.asar.unpacked')});
extractAll(old,source);
for(const f of changed){fs.mkdirSync(path.dirname(source+'/'+f.name),{recursive:true});fs.copyFileSync(f.src,source+'/'+f.name);}
await createPackageWithOptions(source,archive,{unpackDir:'node_modules',unpack:'*.dll'});
fs.cpSync(baseline+'/resources/app.asar.unpacked',payload+'/resources/app.asar.unpacked',{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),replaced=new Set(changed.map(f=>f.name));let retained=0,playerAssets=0;
for(const entry of listPackage(old)){
 const rel=entry.replace(/^[/\\]/,'').replaceAll('\\','/');if(statFile(old,path.normalize(rel)).files||replaced.has(rel))continue;
 assert.equal(hash(extractFile(archive,path.normalize(rel))),hash(extractFile(old,path.normalize(rel))),rel);retained++;
 if(/nova-player-ship|fleet-showcase|sparrow-showcase/.test(rel))playerAssets++;
}
for(const f of changed)assert.equal(hash(extractFile(archive,path.normalize(f.name))),hash(fs.readFileSync(f.src)),f.name);
const archiveHash=createHash('sha256');for await(const chunk of fs.createReadStream(archive))archiveHash.update(chunk);
const receipt={runtimeCommit,payload,baseline,retained,playerAssets,changed:changed.map(f=>f.name),bytes:fs.statSync(archive).size,asarSha256:archiveHash.digest('hex'),version:JSON.parse(fs.readFileSync('public/version.json')).version};
fs.writeFileSync(job+'/package.json',JSON.stringify(receipt,null,2));console.log('PASS',JSON.stringify({...receipt,changed:changed.length}));
