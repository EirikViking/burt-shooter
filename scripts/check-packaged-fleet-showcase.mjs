import {extractFile} from '@electron/asar';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
const archive='release/desktop/win-unpacked/resources/app.asar',rows=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
for(let i=1;i<=30;i++){
 const id=String(i).padStart(2,'0');
 for(const relative of [`art/fleet-showcase/${id}.glb`,... [`${id}.glb`,`player/${id}.png`,`showroom/${id}.png`,`showroom/${id}.webp`,`showroom/${id}.json`].map(s=>`art/solid-fleet-20260908/${s}`)]){
  const actual=extractFile(archive,path.normalize(`dist/${relative}`)),expected=fs.readFileSync(`public/${relative}`);
  assert.equal(hash(actual),hash(expected),relative);rows.push({path:relative,bytes:actual.length,sha256:hash(actual)});
 }
}
const codeFiles=fs.readdirSync('dist/assets').filter(f=>f.endsWith('.js'));
for(const file of codeFiles)assert.equal(hash(extractFile(archive,path.normalize(`dist/assets/${file}`))),hash(fs.readFileSync(`dist/assets/${file}`)),`Current compiled code ${file}`);
const version=JSON.parse(extractFile(archive,path.normalize('dist/version.json')).toString());
assert.deepEqual(version,JSON.parse(fs.readFileSync('public/version.json')));
fs.writeFileSync('docs/fleet-showcase/packaged-assets.json',JSON.stringify({archive,version,assets:rows,all180FilesMatch:true,compiledCodeFilesMatch:codeFiles.length},null,2));
console.log('PACKAGED_FLEET_PASS',rows.length,version.version);
