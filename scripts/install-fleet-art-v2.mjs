import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import crypto from 'node:crypto';
const cli=process.env.GLTF_TRANSFORM_CLI||'C:/Users/cromk/AppData/Local/Temp/sparrow-gltf-cache-0909/_npx/9ae6225218f85c19/node_modules/@gltf-transform/cli/bin/cli.js';
const ids=/^[\d,]+$/.test(process.argv[2]||'')?process.argv[2].split(',').map(Number):Array.from({length:29},(_,i)=>i+2);
const dst='public/art/solid-fleet-20260908',manifestPath='docs/solid-fleet-20260908/assets.json';
const manifest=JSON.parse(await fs.readFile(manifestPath));
for(const num of ids){
 if(process.argv.includes('--wait-for-refinement')){
  const start=Date.now();
  const readyLogs=(process.env.FLEET_READY_LOG||'docs/fleet-art-v2/refinement-final.log').split(',');
  while(!(await Promise.all(readyLogs.map(file=>fs.readFile(file,'utf8')))).join('\n').includes(`FLEET_V2_COMPLETE ${num} `)){
   if(Date.now()-start>1800000)throw new Error(`Refinement did not finish for ${num}`);
   await new Promise(resolve=>setTimeout(resolve,2000));
  }
 }
 if(num===1)throw new Error('Sparrow is approved and must not be overwritten');
 const id=String(num).padStart(2,'0'),root=`docs/fleet-art-v2/ships/${id}`,src=`${root}/export`;
 const logs=[];for(const args of [['tangents',`${src}/model.glb`,`${src}/tangent.glb`],['optimize',`${src}/tangent.glb`,`${src}/runtime.glb`,'--compress','false','--simplify','false','--palette','false','--texture-compress','false']]){
  logs.push(execFileSync(process.execPath,[cli,...args],{encoding:'utf8',maxBuffer:4*1024*1024}));
 }
 // At collapsed bevel UV corners MikkTSpace can emit a zero tangent. Supply
 // a deterministic normal-orthogonal frame there; never accept invalid vectors.
 const repaired=await repairCollapsedTangents(`${src}/runtime.glb`);
 logs.push(`Collapsed bevel tangent frames repaired: ${repaired}`);
 logs.push(execFileSync(process.execPath,[cli,'validate',`${src}/runtime.glb`],{encoding:'utf8',maxBuffer:4*1024*1024}));
 await fs.writeFile(`${root}/export-validation.log`,logs.join('\n').trimEnd()+'\n');
 await fs.copyFile(`${src}/runtime.glb`,`${dst}/${id}.glb`);
 await fs.copyFile(`${src}/player.png`,`${dst}/player/${id}.png`);
 await fs.copyFile(`${src}/showroom.png`,`${dst}/showroom/${id}.png`);
 await sharp(`${src}/showroom.png`).webp({lossless:true,effort:6}).toFile(`${dst}/showroom/${id}.webp`);
 await fs.copyFile(`${src}/showroom.json`,`${dst}/showroom/${id}.json`);
 const b=await fs.readFile(`${src}/runtime.glb`),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 const positions=j.meshes.flatMap(m=>m.primitives).map(p=>j.accessors[p.attributes.POSITION]);
 const dimensions=[0,1,2].map(k=>Math.max(...positions.map(p=>p.max[k]))-Math.min(...positions.map(p=>p.min[k]))),files=[];
 for(const file of [`${dst}/${id}.glb`,`${dst}/player/${id}.png`,`${dst}/showroom/${id}.webp`,`${dst}/showroom/${id}.json`,`${root}/source.blend`]){
  const data=await fs.readFile(file);files.push({file,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});
 }
 manifest.ships[num-1]={id,dimensions,materials:j.materials.length,triangles:j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0),generator:'scripts/build-fleet-art-v2.py',authoring:'Original local Blender hull design and authored PBR maps; no external assets',files};
 await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log('INSTALLED',id,b.length,manifest.ships[num-1].triangles);
}

async function repairCollapsedTangents(file){
 const b=await fs.readFile(file),len=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+len)),bin=28+len;let count=0;
 const offset=(a,i,n)=>{const v=j.bufferViews[a.bufferView];return bin+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||n*4);};
 for(const p of j.meshes.flatMap(m=>m.primitives)){
  if(p.attributes.TANGENT===undefined)continue;
  const a=j.accessors[p.attributes.TANGENT],normal=j.accessors[p.attributes.NORMAL];
  for(let i=0;i<a.count;i++){
   const o=offset(a,i,4),t=[0,1,2].map(k=>b.readFloatLE(o+k*4));if(Math.hypot(...t)>.5)continue;
   const no=offset(normal,i,3),n=[0,1,2].map(k=>b.readFloatLE(no+k*4));
   const tangent=Math.abs(n[0])<.8?[0,-n[2],n[1]]:[-n[2],0,n[0]],length=Math.hypot(...tangent);
   if(length<.5)throw new Error(`Invalid surface normal in ${file}`);
   tangent.forEach((v,k)=>b.writeFloatLE(v/length,o+k*4));count++;
  }
 }
 if(count)await fs.writeFile(file,b);return count;
}
