// Showcase-only export. There is intentionally no sprite-render/install path.
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root='docs/sparrow-showcase',src=`${root}/export`,dst='public/art/sparrow-showcase';
const cli=process.env.GLTF_TRANSFORM_CLI||'C:/Users/cromk/AppData/Local/Temp/sparrow-gltf-cache-0909/_npx/9ae6225218f85c19/node_modules/@gltf-transform/cli/bin/cli.js';
const log=[];
for(const args of [['tangents',`${src}/sparrow-showcase.glb`,`${src}/tangent.glb`],['optimize',`${src}/tangent.glb`,`${src}/runtime.glb`,'--compress','false','--simplify','false','--palette','false','--texture-compress','false']])log.push(execFileSync(process.execPath,[cli,...args],{encoding:'utf8',maxBuffer:8*1024*1024}));
// MikkTSpace may emit zero vectors at collapsed bevel UV corners. Repair only
// these degenerate frames to the normal's orthogonal unit vector, then validate.
const b=await fs.readFile(`${src}/runtime.glb`),len=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+len)),bin=28+len;let repaired=0;
const offset=(a,i,n)=>{const v=j.bufferViews[a.bufferView];return bin+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||n*4);};
for(const p of j.meshes.flatMap(m=>m.primitives)){
 if(p.attributes.TANGENT===undefined)continue;const a=j.accessors[p.attributes.TANGENT],normal=j.accessors[p.attributes.NORMAL];
 for(let i=0;i<a.count;i++){
  const o=offset(a,i,4),t=[0,1,2].map(k=>b.readFloatLE(o+k*4));if(Math.hypot(...t)>.5)continue;
  const n=[0,1,2].map(k=>b.readFloatLE(offset(normal,i,3)+k*4)),v=Math.abs(n[0])<.8?[0,-n[2],n[1]]:[-n[2],0,n[0]],l=Math.hypot(...v);
  if(l<.5)throw Error('Invalid normal');v.forEach((x,k)=>b.writeFloatLE(x/l,o+k*4));repaired++;
 }
}
if(repaired)await fs.writeFile(`${src}/runtime.glb`,b);
log.push(`Collapsed tangent frames repaired: ${repaired}`);
log.push(execFileSync(process.execPath,[cli,'validate',`${src}/runtime.glb`],{encoding:'utf8',maxBuffer:8*1024*1024}));
await fs.writeFile(`${root}/export-validation.log`,log.join('\n').trimEnd()+'\n');
await fs.mkdir(dst,{recursive:true});await fs.copyFile(`${src}/runtime.glb`,`${dst}/model.glb`);
const stats={bytes:b.length,triangles:j.meshes.flatMap(m=>m.primitives).reduce((s,p)=>s+j.accessors[p.indices].count/3,0),materials:j.materials.map(m=>m.name),images:j.images.length,repaired};
await fs.writeFile(`${root}/asset-cost.json`,JSON.stringify(stats,null,2));console.log(stats);
