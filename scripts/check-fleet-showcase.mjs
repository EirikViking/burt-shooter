import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';
const baseline='43dc8c7',root='docs/fleet-showcase';
const protectedPaths=['src/config','src/game','src/entities','src/managers','src/progression','src/achievements','src/i18n','src/scenes','electron',':(exclude)src/scenes/ShipSelectScene.js'];
assert.equal(execFileSync('git',['diff',baseline,'--name-only','--',...protectedPaths]).toString().trim(),'','Gameplay and player text remain unchanged');
const scene='src/scenes/ShipSelectScene.js',oldScene=execFileSync('git',['show',`${baseline}:${scene}`],{maxBuffer:2e6}).toString();
assert.equal((await fs.readFile(scene,'utf8')).replaceAll('\r\n','\n'),oldScene.replace('card.sprite.scale.x * 1.05, card.sprite.scale.y * 1.05','Math.min(card.sprite.scale.x * 1.25, (this.layout.isMobile ? 230 : 420) / (card.turntable.baseSize * this.centerScale))').replaceAll('\r\n','\n').replace('if (card?.sprite && card.showroomEmitters) {\n      if (!card.turntable','if (card?.sprite && card.showroomEmitters) {\n      card.sprite.visible = false;\n      if (!card.turntable'),'Only the authorized hangar showcase scale changes');
const originals=execFileSync('git',['ls-tree','-r',baseline,'--','public/art/solid-fleet-20260908','public/art/sparrow-showcase','docs/sparrow-showcase/nova-sparrow-showcase.blend'],{encoding:'utf8'}).trim().split('\n').map(s=>{const[a,file]=s.split('\t');return{file,oid:a.split(' ')[2]};});
const hashes=execFileSync('git',['hash-object','--stdin-paths'],{input:originals.map(r=>r.file).join('\n')+'\n',encoding:'utf8'}).trim().split('\n');
originals.forEach((r,i)=>assert.equal(hashes[i],r.oid,`Preserved source/combat/legacy asset ${r.file}`));
const rows=[],pixelHash=async b=>crypto.createHash('sha256').update(await sharp(b).ensureAlpha().raw().toBuffer()).digest('hex');
for(let n=1;n<=30;n++){
 const id=String(n).padStart(2,'0'),dir=`${root}/ships/${id}`,b=await fs.readFile(`public/art/fleet-showcase/${id}.glb`),len=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+len));
 const triangles=j.meshes.flatMap(m=>m.primitives).reduce((s,p)=>s+j.accessors[p.indices].count/3,0),design=JSON.parse(await fs.readFile(`${dir}/design.json`));
 assert.equal(design.id,n);assert.equal(design.spriteGeneration,false);assert.ok(b.length<64*1024*1024);assert.ok(triangles<650000);assert.ok(j.materials.length<=12);
 assert.ok(j.materials.some(m=>m.alphaMode==='BLEND'),'Canopy glazing must survive export');
 for(const[name,file]of [['Off-white aerospace polyurethane','white-basecolor.png'],['Cobalt blue painted alloy','cobalt-basecolor.png']]){
  const m=j.materials.find(m=>m.name===name),t=j.textures[m.pbrMetallicRoughness.baseColorTexture.index],im=j.images[t.source],v=j.bufferViews[im.bufferView],embedded=b.subarray(28+len+(v.byteOffset||0),28+len+(v.byteOffset||0)+v.byteLength);
  assert.equal(await pixelHash(embedded),await pixelHash(await fs.readFile(`${dir}/export/textures/${file}`)),`${id} correct authored albedo map`);
 }
 const cost=JSON.parse(await fs.readFile(`${dir}/asset-cost.json`));assert.equal(cost.bytes,b.length);assert.equal(cost.triangles,triangles);
 rows.push({id,name:design.name,architecture:design.architecture,bytes:b.length,triangles,materials:j.materials.length,maps:j.images.length,textureSize:design.textureSize});
}
await fs.writeFile(`${root}/contracts.json`,JSON.stringify({baseline,preservedFiles:originals.length,allCombatSpritesUnchanged:true,gameplayUnchanged:true,hangarScale:'1.25 preferred scale; capped at 420 desktop / 230 mobile pixels before viewport scaling',rows},null,2));console.log('FLEET_SHOWCASE_PASS',rows.length,originals.length);
