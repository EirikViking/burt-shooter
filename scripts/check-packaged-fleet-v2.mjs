import {extractFile} from '@electron/asar';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
const archive='release/desktop/win-unpacked/resources/app.asar',rows=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
for(let i=1;i<=30;i++){
 const id=String(i).padStart(2,'0');
 for(const suffix of [`${id}.glb`,`player/${id}.png`,`showroom/${id}.png`,`showroom/${id}.webp`,`showroom/${id}.json`]){
  const relative=`art/solid-fleet-20260908/${suffix}`,actual=extractFile(archive,path.normalize(`dist/${relative}`)),expected=fs.readFileSync(`public/${relative}`);
  assert.equal(hash(actual),hash(expected),relative);rows.push({path:relative,bytes:actual.length,sha256:hash(actual)});
 }
}
const version=JSON.parse(extractFile(archive,path.normalize('dist/version.json')).toString());
assert.deepEqual(version,JSON.parse(fs.readFileSync('public/version.json')));
fs.writeFileSync('docs/fleet-art-v2/packaged-asset-verification.json',JSON.stringify({archive,version,assets:rows,all150FilesMatch:true},null,2));
console.log('PACKAGED_FLEET_PASS',rows.length,version.version);
