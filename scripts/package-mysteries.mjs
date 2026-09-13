import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {extractAll,extractFile,createPackageWithOptions,listPackage,statFile} from '@electron/asar';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['scripts/check-release-line.mjs'],{stdio:'inherit'});
const runtimeCommit=execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim();
const prior=process.env.MYSTERY_BASELINE_PAYLOAD || JSON.parse(fs.readFileSync('docs/mysteries/delivery.json')).package.payload;
const root=process.env.MYSTERY_PACKAGE_ROOT || `E:/Codex/builds/nova-swarm/mysteries-${runtimeCommit}`,source=root+'/source',payload=root+'/win-unpacked';
const old=prior+'/resources/app.asar',archive=payload+'/resources/app.asar';
const changed=['dist/index.html','dist/version.json','dist/sw.js',...fs.readdirSync('dist/assets').filter(f=>/\.(js|css)$/.test(f)).map(f=>'dist/assets/'+f),
 'electron/main.cjs','electron/preload.cjs','electron/bossEncounterTest.cjs','electron/mysteryTestIds.json',
 ...fs.readdirSync('dist/art/mysteries').map(f=>'dist/art/mysteries/'+f),
 ...fs.readdirSync('dist/audio/sfx/mysteries').map(f=>'dist/audio/sfx/mysteries/'+f)];
const entry=fs.readFileSync('dist/index.html','utf8').match(/src="\.\/(assets\/index-[^"]+\.js)"/)[1];
assert.ok(fs.readFileSync('dist/'+entry,'utf8').includes(runtimeCommit),'Compiled runtime provenance');
if(!process.env.MYSTERY_PACKAGE_VERIFY_ONLY){
 assert.ok(!fs.existsSync(root),'Use a fresh package destination');fs.mkdirSync(root,{recursive:true});
 fs.cpSync(prior,payload,{recursive:true,filter:p=>!p.endsWith('app.asar')&&!p.includes('app.asar.unpacked')});
 console.log('Extracting previous verified Steam package into',source);extractAll(old,source);
 for(const file of changed){fs.mkdirSync(path.dirname(source+'/'+file),{recursive:true});fs.copyFileSync(file,source+'/'+file);}
 console.log('Packing Mystery runtime, trusted desktop selector, original art and audio');
 await createPackageWithOptions(source,archive,{unpackDir:'node_modules',unpack:'*.dll'});
 fs.cpSync(prior+'/resources/app.asar.unpacked',payload+'/resources/app.asar.unpacked',{recursive:true});
}
const hash=b=>createHash('sha256').update(b).digest('hex'),replaced=new Set(changed);
let unchanged=0,unchangedPlayerAssets=0;
for(const entry of listPackage(old)){
 const relative=entry.replace(/^[/\\]/,'').replaceAll('\\','/');
 if(statFile(old,path.normalize(relative)).files||replaced.has(relative))continue;
 assert.equal(hash(extractFile(archive,path.normalize(relative))),hash(extractFile(old,path.normalize(relative))),relative);
 unchanged++;if(/nova-player-ship|fleet-showcase|sparrow-showcase/.test(relative))unchangedPlayerAssets++;
}
for(const file of changed)assert.equal(hash(extractFile(archive,path.normalize(file))),hash(fs.readFileSync(file)),file);
const receipt={runtimeCommit,root,payload,unchangedFiles:unchanged,unchangedPlayerAssets,changed,compiledCodeMatches:true,
 buildVersion:JSON.parse(fs.readFileSync('dist/version.json','utf8')),archiveBytes:fs.statSync(archive).size};
fs.mkdirSync('test-results/mysteries',{recursive:true});fs.writeFileSync('test-results/mysteries/package.json',JSON.stringify(receipt,null,2));console.log('PASS',JSON.stringify({...receipt,changed:changed.length}));
