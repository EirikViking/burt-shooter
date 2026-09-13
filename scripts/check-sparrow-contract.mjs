import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
const baseline='0439b1f1064416416d255bc1fef881412c568927';
const old=p=>execFileSync('git',['show',`${baseline}:${p}`],{maxBuffer:30*1024*1024});
const manifestPath='docs/solid-fleet-20260908/assets.json';
const previous=JSON.parse(old(manifestPath)),current=JSON.parse(await fs.readFile(manifestPath,'utf8'));
assert.deepEqual(current.ships.slice(1),previous.ships.slice(1),'fleet receipts except Sparrow must be unchanged');
const changed=execFileSync('git',['diff',baseline,'--name-only','--','src/config','src/game','src/entities','src/managers','src/progression','src/achievements','src/i18n']).toString().trim();
assert.equal(changed,'','gameplay and player-facing text contracts must remain unchanged');
const root='public/art/solid-fleet-20260908';
const artChanges=execFileSync('git',['diff',baseline,'--name-only','--',root]).toString().trim().split('\n').filter(Boolean);
assert.ok(artChanges.every(p=>/\/01\.(glb|png|webp|json)$/.test(p)),'only benchmark artwork may change');
async function pngInfo(buffer){const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});let minX=info.width,minY=info.height,maxX=0,maxY=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>32){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}return {width:info.width,height:info.height,bounds:{minX,minY,maxX,maxY},center:[(minX+maxX)/2,(minY+maxY)/2]};}
const spritePath=`${root}/player/01.png`;const before=await pngInfo(old(spritePath)),after=await pngInfo(await fs.readFile(spritePath));
assert.equal(after.width,before.width);assert.equal(after.height,before.height);
assert.ok(after.bounds.minX>=40&&after.bounds.maxX<=472,'transparent safety border must remain');
assert.ok(Math.abs(after.center[0]-before.center[0])<=1,'horizontal center must stay aligned');
assert.ok(Math.abs(after.center[1]-before.center[1])<=4,'vertical center must stay within four source pixels');
function glb(b){const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));return {bytes:b.length,triangles:j.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+j.accessors[p.indices].count/3,0),materials:j.materials.length,images:j.images?.length||0,primitives:j.meshes.flatMap(m=>m.primitives).length,extensions:j.extensionsUsed,json:j};}
const b=glb(old(`${root}/01.glb`)),a=glb(await fs.readFile(`${root}/01.glb`));
for(const p of a.json.meshes.flatMap(m=>m.primitives)){assert.ok(p.attributes.NORMAL!==undefined);if(a.json.materials[p.material].normalTexture){assert.ok(p.attributes.TEXCOORD_0!==undefined);assert.ok(p.attributes.TANGENT!==undefined);}}
assert.ok(a.triangles<60000&&a.bytes<3*1024*1024);assert.ok(a.images>=3);
delete a.json;delete b.json;
await fs.writeFile('docs/ship-art-v2/contract-check.json',JSON.stringify({baseline,onlySparrow:true,gameplayUntouched:true,sprite:{before,after},asset:{before:b,after:a}},null,2));
console.log('PASS Sparrow-only files, unchanged gameplay/text contracts, sprite size/padding/centering, geometry and material map attributes');
