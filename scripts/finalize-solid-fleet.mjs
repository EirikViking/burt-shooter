import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const root = 'public/art/solid-fleet-20260908';
const rows = [];
for (let i=1;i<=30;i++) {
  const id=String(i).padStart(2,'0');
  await sharp(`${root}/showroom/${id}.png`).webp({lossless:true,effort:6}).toFile(`${root}/showroom/${id}.webp`);
  const glb=fs.readFileSync(`${root}/${id}.glb`);
  assert.equal(glb.toString('ascii',0,4),'glTF');
  assert.equal(glb.readUInt32LE(4),2);
  const json=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));
  assert.ok(json.meshes.length>0);
  assert.equal(json.images?.length||0,0,'Hull must not depend on raster relief artwork');
  const positions=json.meshes.flatMap(mesh=>mesh.primitives.map(p=>json.accessors[p.attributes.POSITION]));
  const low=[0,1,2].map(k=>Math.min(...positions.map(p=>p.min[k])));
  const high=[0,1,2].map(k=>Math.max(...positions.map(p=>p.max[k])));
  const dimensions=high.map((v,k)=>v-low[k]);
  assert.ok(dimensions[1]>.45,'Hull needs actual vertical depth');
  const files=[`${root}/${id}.glb`,`${root}/player/${id}.png`,`${root}/showroom/${id}.webp`,`${root}/showroom/${id}.json`,`docs/solid-fleet-20260908/${id}.blend`].map(file=>{
    const bytes=fs.readFileSync(file);return {file:path.posix.normalize(file),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  });
  rows.push({id,dimensions,materials:json.materials.length,files});
}
fs.writeFileSync('docs/solid-fleet-20260908/assets.json',JSON.stringify({generator:'scripts/build-solid-fleet.py',authoring:'Blender 4.5.4; original solid geometry; no external models or raster hull textures',ships:rows},null,2)+'\n');
console.log(`PASS ${rows.length} complete solid ships, depth, geometry-only materials, lossless portraits and asset hashes`);
