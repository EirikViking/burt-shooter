// Local asset installation only. Does not package, upload, or change game rules.
import fs from 'node:fs/promises';
import sharp from 'sharp';
import crypto from 'node:crypto';
const src='docs/ship-art-v2/export',dst='public/art/solid-fleet-20260908';
await fs.copyFile(`${src}/nova-sparrow-runtime.glb`,`${dst}/01.glb`);
await fs.copyFile(`${src}/player.png`,`${dst}/player/01.png`);
await fs.copyFile(`${src}/showroom.png`,`${dst}/showroom/01.png`);
await sharp(`${src}/showroom.png`).webp({lossless:true,effort:6}).toFile(`${dst}/showroom/01.webp`);
await fs.copyFile(`${src}/showroom.json`,`${dst}/showroom/01.json`);
const manifest=JSON.parse(await fs.readFile('docs/solid-fleet-20260908/assets.json','utf8'));
const b=await fs.readFile(`${dst}/01.glb`);const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
const positions=j.meshes.flatMap(m=>m.primitives).map(p=>j.accessors[p.attributes.POSITION]);
const dimensions=[0,1,2].map(k=>Math.max(...positions.map(p=>p.max[k]))-Math.min(...positions.map(p=>p.min[k])));
const files=[];
for(const file of [`${dst}/01.glb`,`${dst}/player/01.png`,`${dst}/showroom/01.webp`,`${dst}/showroom/01.json`,'docs/ship-art-v2/nova-sparrow-v2.blend']){
 const data=await fs.readFile(file);files.push({file,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});
}
manifest.ships[0]={id:'01',dimensions,materials:j.materials.length,triangles:j.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+j.accessors[p.indices].count/3,0),generator:'scripts/build-sparrow-v2.py',authoring:'Original Blender geometry and authored PBR maps; no external assets',files};
await fs.writeFile('docs/solid-fleet-20260908/assets.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest.ships[0],null,2));
