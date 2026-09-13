import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import crypto from 'node:crypto';
const baseline='e67fe3906950b2eb564e57e698deb3ff9913cf71',root='public/art/solid-fleet-20260908';
const old=p=>execFileSync('git',['show',`${baseline}:${p}`],{maxBuffer:30*1024*1024});
assert.equal(execFileSync('git',['diff',baseline,'--name-only','--','src/config','src/game','src/entities','src/managers','src/progression','src/achievements','src/i18n','src/scenes',':(exclude)src/scenes/ShipSelectScene.js']).toString().trim(),'','gameplay, saves, unlocks, UI layout and text must remain unchanged');
// These protect legacy/fallback and combat assets. The reopened showcase art
// direction uses public/art/sparrow-showcase/model.glb and its dedicated check.
for(const p of [`${root}/01.glb`,`${root}/player/01.png`,`${root}/showroom/01.png`,`${root}/showroom/01.webp`,`${root}/showroom/01.json`])assert.deepEqual(await fs.readFile(p),old(p),'legacy Sparrow bytes');
async function png(b){const{data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});let l=info.width,r=0,t=info.height,bottom=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);bottom=Math.max(bottom,y);}return{width:info.width,height:info.height,bounds:[l,t,r,bottom],center:[(l+r)/2,(t+bottom)/2]};}
const rows=[];
for(let i=1;i<=30;i++){
 const id=String(i).padStart(2,'0'),p=`${root}/player/${id}.png`,before=await png(old(p)),after=await png(await fs.readFile(p));
 assert.equal(after.width,512);assert.equal(after.height,512);assert.ok(after.bounds[0]>=35&&after.bounds[1]>=35&&after.bounds[2]<=477&&after.bounds[3]<=477,`${id} padding`);
 assert.ok(Math.abs(after.center[0]-before.center[0])<=1,`${id} x alignment`);assert.ok(Math.abs(after.center[1]-before.center[1])<=4,`${id} y alignment ${before.center} -> ${after.center}`);
 const data=await fs.readFile(`${root}/${id}.glb`),j=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)));const tris=j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0);
 if(i>1){
  for(const [name,file] of [['Ceramic white painted alloy','white-basecolor.png'],['Sparrow cobalt enamel','cobalt-basecolor.png']]){
   const m=j.materials.find(m=>m.name===name),texture=j.textures[m.pbrMetallicRoughness.baseColorTexture.index],image=j.images[texture.source],view=j.bufferViews[image.bufferView];
   const offset=28+data.readUInt32LE(12)+(view.byteOffset||0),embedded=data.subarray(offset,offset+view.byteLength);
   const hash=async b=>crypto.createHash('sha256').update(await sharp(b).ensureAlpha().raw().toBuffer()).digest('hex');
   assert.equal(await hash(embedded),await hash(await fs.readFile(`docs/fleet-art-v2/ships/${id}/export/textures/${file}`)),`${id}: embedded ${file} must match this ship's authored map, not a neighboring source file`);
  }
 }
 assert.ok(data.length<3*1024*1024,`${id} size budget`);assert.ok(tris<60000,`${id} triangle budget`);assert.ok(j.materials.length<=8,`${id} material budget`);
 for(const p of j.meshes.flatMap(m=>m.primitives)){assert.notEqual(p.attributes.NORMAL,undefined);if(j.materials[p.material].normalTexture){assert.notEqual(p.attributes.TEXCOORD_0,undefined);assert.notEqual(p.attributes.TANGENT,undefined);}}
 rows.push({id,before,after,bytes:data.length,triangles:tris,materials:j.materials.length,images:j.images?.length||0});
}
await fs.writeFile('docs/fleet-art-v2/contracts.json',JSON.stringify({baseline,gameplayUntouched:true,sparrowUnchanged:true,rows},null,2));console.log('PASS 30 fleet assets, approved Sparrow unchanged, gameplay/text/layout unchanged, sprite alignment and budgets');

// The selected hangar model alone may use the authorized larger framing.
const hangarPath='src/scenes/ShipSelectScene.js';
const hangarBefore=execFileSync('git',['show',baseline+':'+hangarPath],{maxBuffer:2e6}).toString();
assert.equal((await fs.readFile(hangarPath,'utf8')).replaceAll('\r\n','\n'),hangarBefore.replace('card.sprite.scale.x * 1.05, card.sprite.scale.y * 1.05','Math.min(card.sprite.scale.x * 1.25, (this.layout.isMobile ? 230 : 420) / (card.turntable.baseSize * this.centerScale))').replaceAll('\r\n','\n').replace('if (card?.sprite && card.showroomEmitters) {\n      if (!card.turntable','if (card?.sprite && card.showroomEmitters) {\n      card.sprite.visible = false;\n      if (!card.turntable'),'Only showcase framing may change');
