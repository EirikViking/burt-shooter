import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';
const baseline='dd16b81030a092e7a8942a69e80753f65f2fbaf8',root='docs/sparrow-showcase';
assert.equal(execFileSync('git',['diff',baseline,'--name-only','--','src/config','src/game','src/entities','src/managers','src/progression','src/achievements','src/i18n','src/scenes','electron',':(exclude)src/scenes/ShipSelectScene.js']).toString().trim(),'','Gameplay, saves, progression, menus and text must not change');
const originals=execFileSync('git',['ls-tree','-r',baseline,'--','public/art/solid-fleet-20260908'],{encoding:'utf8'}).trim().split('\n').map(s=>{const[a,file]=s.split('\t');return{file,oid:a.split(' ')[2]};});
const hashes=execFileSync('git',['hash-object','--stdin-paths'],{input:originals.map(r=>r.file).join('\n')+'\n',encoding:'utf8'}).trim().split('\n');
originals.forEach((r,i)=>assert.equal(hashes[i],r.oid,`Legacy model/sprite/showroom contract: ${r.file}`));
const b=await fs.readFile('public/art/sparrow-showcase/model.glb'),len=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+len));
const triangles=j.meshes.flatMap(m=>m.primitives).reduce((s,p)=>s+j.accessors[p.indices].count/3,0);
assert.ok(triangles<500000);assert.ok(b.length<64*1024*1024);assert.ok(j.materials.length<=16);
assert.ok(j.materials.some(m=>m.alphaMode==='BLEND'),'Real glazing export');
const pixelHash=async b=>crypto.createHash('sha256').update(await sharp(b).ensureAlpha().raw().toBuffer()).digest('hex');
for(const[name,file]of [['Off-white aerospace polyurethane','white-basecolor.png'],['Cobalt blue painted alloy','cobalt-basecolor.png']]){
 const m=j.materials.find(m=>m.name===name),t=j.textures[m.pbrMetallicRoughness.baseColorTexture.index],im=j.images[t.source??t.extensions?.EXT_texture_webp?.source],v=j.bufferViews[im.bufferView],embedded=b.subarray(28+len+(v.byteOffset||0),28+len+(v.byteOffset||0)+v.byteLength);
 assert.equal(await pixelHash(embedded),await pixelHash(await fs.readFile(`${root}/export/textures/${file}`)),`${name} authored/exported pixel match`);
}
await fs.writeFile(`${root}/contracts.json`,JSON.stringify({baseline,legacyAssetFilesUnchanged:originals.length,gameplayCodeUnchanged:true,combatSpritesUnchanged:true,showcaseBytes:b.length,triangles,materials:j.materials.length,authoredAlbedoPixelsMatch:true},null,2));
console.log('SHOWCASE_CONTRACT_PASS',originals.length,triangles,b.length);

// The selected hangar model alone may use the authorized larger framing.
const hangarPath='src/scenes/ShipSelectScene.js';
const hangarBefore=execFileSync('git',['show',baseline+':'+hangarPath],{maxBuffer:2e6}).toString();
assert.equal((await fs.readFile(hangarPath,'utf8')).replaceAll('\r\n','\n'),hangarBefore.replace('card.sprite.scale.x * 1.05, card.sprite.scale.y * 1.05','Math.min(card.sprite.scale.x * 1.25, (this.layout.isMobile ? 230 : 420) / (card.turntable.baseSize * this.centerScale))').replaceAll('\r\n','\n').replace('if (card?.sprite && card.showroomEmitters) {\n      if (!card.turntable','if (card?.sprite && card.showroomEmitters) {\n      card.sprite.visible = false;\n      if (!card.turntable'),'Only showcase framing may change');
